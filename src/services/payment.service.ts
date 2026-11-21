import type { Prisma } from "@prisma/client";
import { businessConfig } from "@/config/site";
import type { SessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { fromDateOnly } from "@/utils/dates";
import { toPaise } from "@/utils/money";
import { lockCategory, remainingByCategory } from "./availability.service";
import { issueRefund } from "./booking.service";
import { sendBookingConfirmation } from "./email.service";
import { getPaymentProvider } from "./payment/provider";

/**
 * Step 5-6: create (or reuse) a gateway order for an existing pending booking.
 * The amount is ALWAYS the server-stored booking total; the client never supplies it.
 */
export async function createOrderForBooking(user: SessionUser, bookingId: string) {
  const provider = getPaymentProvider();

  const prepared = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const b = await tx.booking.findUnique({ where: { id: bookingId }, include: { car: true, payments: { orderBy: { createdAt: "desc" } } } });
    if (!b || b.userId !== user.id) throw new AppError("NOT_FOUND", "Booking not found.");
    if (b.paymentStatus === "PAID" || b.bookingStatus === "CONFIRMED") throw new AppError("CONFLICT", "This booking is already paid.");
    if (b.bookingStatus === "CANCELLED" || b.bookingStatus === "COMPLETED") throw new AppError("CONFLICT", "This booking can no longer be paid.");

    // Retry support: re-validate availability and refresh the hold (also revives an EXPIRED hold if still free).
    await lockCategory(tx, b.car.category);
    const remaining = await remainingByCategory(tx, fromDateOnly(b.pickupDate), b.returnDate ? fromDateOnly(b.returnDate) : null, { excludeBookingId: b.id });
    if (remaining[b.car.category] < 1) {
      await tx.booking.update({ where: { id: b.id }, data: { bookingStatus: "EXPIRED", holdExpiresAt: null } });
      throw new AppError("UNAVAILABLE", "This vehicle is no longer available for your dates. Please search again.");
    }
    await tx.booking.update({
      where: { id: b.id },
      data: { bookingStatus: "PENDING_PAYMENT", holdExpiresAt: new Date(Date.now() + businessConfig.holdMinutes * 60_000) },
    });
    return b;
  });

  const amountPaise = toPaise(prepared.totalAmount.toString());
  const reusable = prepared.payments.find((p) => (p.paymentStatus === "PENDING" || p.paymentStatus === "FAILED") && toPaise(p.amount.toString()) === amountPaise);

  let orderId: string;
  if (reusable) {
    orderId = reusable.razorpayOrderId;
    if (reusable.paymentStatus === "FAILED") {
      await prisma.$transaction([
        prisma.payment.update({ where: { id: reusable.id }, data: { paymentStatus: "PENDING", failureReason: null } }),
        prisma.booking.update({ where: { id: prepared.id }, data: { paymentStatus: "PENDING" } }),
      ]);
    }
  } else {
    const order = await provider.createOrder({ amountPaise, receipt: prepared.bookingReference, notes: { bookingId: prepared.id } });
    orderId = order.orderId;
    await prisma.$transaction([
      prisma.payment.create({
        data: { bookingId: prepared.id, provider: provider.name, razorpayOrderId: order.orderId, amount: prepared.totalAmount, currency: "INR" },
      }),
      prisma.booking.update({ where: { id: prepared.id }, data: { paymentStatus: "PENDING" } }),
    ]);
  }

  return {
    orderId,
    amountPaise,
    currency: "INR" as const,
    keyId: provider.publicKey, // public key id only; the secret never leaves the server
    provider: provider.name,
    bookingId: prepared.id,
    bookingReference: prepared.bookingReference,
    prefill: { name: prepared.customerName, email: prepared.customerEmail, contact: prepared.customerPhone },
  };
}

export type SettleOutcome = "confirmed" | "already_confirmed" | "refund_required" | "ignored";
type SettleResult = { outcome: SettleOutcome; bookingId?: string; paymentRowId?: string; gatewayPaymentId?: string; amount?: number };

/**
 * Single idempotent success path used by BOTH client verification and the webhook.
 * Must run inside a transaction. Locks booking -> category (same order everywhere, so no deadlocks).
 */
export async function settlePaymentSuccess(
  tx: Prisma.TransactionClient,
  args: { orderId: string; paymentId: string; method?: string | null; amountPaise?: number },
): Promise<SettleResult> {
  const payment = await tx.payment.findUnique({ where: { razorpayOrderId: args.orderId } });
  if (!payment) {
    logger.warn("Payment success for unknown order", { orderId: args.orderId });
    return { outcome: "ignored" };
  }
  if (args.amountPaise !== undefined && args.amountPaise !== toPaise(payment.amount.toString())) {
    logger.error("Paid amount does not match order amount – not confirming", { orderId: args.orderId, got: args.amountPaise });
    return { outcome: "ignored" };
  }

  await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${payment.bookingId} FOR UPDATE`;
  const fresh = await tx.payment.findUniqueOrThrow({ where: { id: payment.id } });
  const booking = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId }, include: { car: true } });

  // Idempotency: this exact payment was already applied.
  if (fresh.paymentStatus === "PAID" || fresh.paymentStatus === "REFUNDED" || fresh.paymentStatus === "REFUND_PENDING") {
    return { outcome: booking.bookingStatus === "CONFIRMED" || booking.bookingStatus === "COMPLETED" ? "already_confirmed" : "ignored", bookingId: booking.id };
  }

  const markPaid = { razorpayPaymentId: args.paymentId, paymentStatus: "PAID" as const, paymentMethod: args.method ?? null, failureReason: null };

  // Re-check availability at confirmation time (rule 11), excluding this booking's own hold.
  let canConfirm = booking.bookingStatus === "PENDING_PAYMENT" || booking.bookingStatus === "EXPIRED";
  if (canConfirm) {
    await lockCategory(tx, booking.car.category);
    const remaining = await remainingByCategory(tx, fromDateOnly(booking.pickupDate), booking.returnDate ? fromDateOnly(booking.returnDate) : null, { excludeBookingId: booking.id });
    canConfirm = remaining[booking.car.category] >= 1;
  }

  if (!canConfirm) {
    // Money was taken but we cannot honour the booking (cancelled / sold out): record payment and refund in full.
    await tx.payment.update({ where: { id: payment.id }, data: { ...markPaid, paymentStatus: "REFUND_PENDING" } });
    await tx.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: "REFUND_PENDING", refundAmount: booking.totalAmount, bookingStatus: booking.bookingStatus === "CANCELLED" ? "CANCELLED" : "EXPIRED", holdExpiresAt: null },
    });
    await tx.auditLog.create({ data: { action: "PAYMENT_REFUND_REQUIRED", entity: "Booking", entityId: booking.id, metadata: { orderId: args.orderId } } });
    return { outcome: "refund_required", bookingId: booking.id, paymentRowId: payment.id, gatewayPaymentId: args.paymentId, amount: Number(booking.totalAmount) };
  }

  await tx.payment.update({ where: { id: payment.id }, data: markPaid });
  await tx.booking.update({ where: { id: booking.id }, data: { bookingStatus: "CONFIRMED", paymentStatus: "PAID", holdExpiresAt: null } });
  await tx.auditLog.create({ data: { actorId: booking.userId, action: "PAYMENT_CONFIRMED", entity: "Booking", entityId: booking.id, metadata: { orderId: args.orderId, paymentId: args.paymentId } } });
  return { outcome: "confirmed", bookingId: booking.id };
}

export async function settlePaymentFailure(tx: Prisma.TransactionClient, args: { orderId: string; reason?: string | null }) {
  const payment = await tx.payment.findUnique({ where: { razorpayOrderId: args.orderId } });
  if (!payment || payment.paymentStatus !== "PENDING") return; // never downgrade a paid/refunded payment
  await tx.payment.update({ where: { id: payment.id }, data: { paymentStatus: "FAILED", failureReason: args.reason?.slice(0, 250) ?? null } });
  // Booking stays PENDING_PAYMENT so the customer can retry until the hold expires.
  await tx.booking.updateMany({ where: { id: payment.bookingId, bookingStatus: "PENDING_PAYMENT" }, data: { paymentStatus: "FAILED" } });
}

/** Runs the side effects that must happen AFTER the DB transaction commits. */
export async function afterSettle(r: SettleResult) {
  if (r.outcome === "confirmed" && r.bookingId) void sendBookingConfirmation(r.bookingId);
  if (r.outcome === "refund_required" && r.paymentRowId && r.gatewayPaymentId && r.bookingId && r.amount) {
    await issueRefund(r.bookingId, r.paymentRowId, r.gatewayPaymentId, r.amount);
  }
}

/** Client-callback verification. Signature is checked server-side; booking is confirmed only from here/webhook. */
export async function verifyPayment(user: SessionUser, args: { orderId: string; paymentId: string; signature: string }) {
  const provider = getPaymentProvider();
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: args.orderId }, include: { booking: true } });
  if (!payment || payment.booking.userId !== user.id) throw new AppError("NOT_FOUND", "Payment not found.");

  if (!provider.verifyPaymentSignature(args.orderId, args.paymentId, args.signature)) {
    logger.warn("Invalid payment signature", { orderId: args.orderId });
    throw new AppError("PAYMENT_ERROR", "Payment verification failed.");
  }

  const result = await prisma.$transaction((tx) => settlePaymentSuccess(tx, { orderId: args.orderId, paymentId: args.paymentId }));
  await afterSettle(result);
  if (result.outcome === "refund_required") {
    throw new AppError("UNAVAILABLE", "Your payment was received but the vehicle is no longer available. A full refund has been initiated.");
  }
  return { bookingId: payment.bookingId, outcome: result.outcome };
}

/** Customer reports a failed/cancelled checkout; allows immediate retry state. (Webhook is authoritative for failures.) */
export async function reportPaymentFailure(user: SessionUser, orderId: string, reason?: string) {
  const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId }, include: { booking: true } });
  if (!payment || payment.booking.userId !== user.id) throw new AppError("NOT_FOUND", "Payment not found.");
  await prisma.$transaction((tx) => settlePaymentFailure(tx, { orderId, reason }));
}

type WebhookPayload = {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id?: string; method?: string; amount?: number; error_description?: string } } };
};

/** Webhook processing. Idempotent via the WebhookEvent ledger, which commits atomically with the state change. */
export async function processWebhook(rawBody: string, signature: string | null, eventId: string | null): Promise<{ status: "processed" | "duplicate" | "ignored" }> {
  const provider = getPaymentProvider();
  if (!provider.verifyWebhookSignature(rawBody, signature)) throw new AppError("FORBIDDEN", "Invalid webhook signature.");

  let evt: WebhookPayload;
  try {
    evt = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    throw new AppError("BAD_REQUEST", "Malformed webhook body.");
  }
  const id = eventId ?? `body:${(await import("node:crypto")).createHash("sha256").update(rawBody).digest("hex")}`;
  const entity = evt.payload?.payment?.entity;

  let result: SettleResult | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.webhookEvent.create({ data: { id, provider: provider.name, eventType: evt.event } }); // unique PK => duplicate throws P2002
      if (!entity?.order_id) return;
      if (evt.event === "payment.captured" || evt.event === "order.paid") {
        result = await settlePaymentSuccess(tx, { orderId: entity.order_id, paymentId: entity.id, method: entity.method, amountPaise: entity.amount });
      } else if (evt.event === "payment.failed") {
        await settlePaymentFailure(tx, { orderId: entity.order_id, reason: entity.error_description });
      }
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") return { status: "duplicate" };
    throw e;
  }
  if (result) await afterSettle(result);
  return { status: entity?.order_id ? "processed" : "ignored" };
}
