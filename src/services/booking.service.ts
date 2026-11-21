import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { businessConfig } from "@/config/site";
import type { SessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { BookingCreateInput } from "@/lib/validations/trip";
import { fromDateOnly, pickupInstant, toDateOnly } from "@/utils/dates";
import { toPaise } from "@/utils/money";
import { lockCategory, remainingByCategory } from "./availability.service";
import { canTransition, computeRefund } from "./booking-rules";
import { resolveRoute } from "./location.service";
import { getPaymentProvider } from "./payment/provider";
import { fareFor, getRule, loadCoupon } from "./pricing.service";

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export function generateBookingReference(now = new Date()): string {
  const bytes = randomBytes(6);
  const rand = Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  const ymd = now.toISOString().slice(2, 10).replace(/-/g, "");
  return `GR${ymd}${rand}`;
}

/**
 * Creates a PENDING_PAYMENT booking and holds one unit of fleet inventory for `holdMinutes`.
 * The fare is recomputed here from server-side data; nothing price-related is read from the client.
 */
export async function createBooking(user: SessionUser, input: BookingCreateInput) {
  const resolved = await resolveRoute(input.fromId, input.toId);
  const car = await prisma.car.findUnique({ where: { id: input.carId } });
  if (!car || !car.isActive) throw new AppError("NOT_FOUND", "This vehicle is no longer available.");
  if (input.passengerCount > car.seatingCapacity) {
    throw new AppError("VALIDATION_ERROR", `${car.brand} ${car.model} seats up to ${car.seatingCapacity} passengers.`, { passengerCount: [`Maximum ${car.seatingCapacity} passengers`] });
  }

  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + businessConfig.holdMinutes * 60_000);

  return prisma.$transaction(async (tx) => {
    const rule = await getRule(tx, car.category);
    const coupon = await loadCoupon(tx, input.couponCode);
    const fare = fareFor(input, resolved, rule, coupon);

    await lockCategory(tx, car.category); // serialises concurrent bookings of the same category
    const remaining = await remainingByCategory(tx, input.pickupDate, input.returnDate ?? null, { now });
    if (remaining[car.category] < 1) {
      throw new AppError("UNAVAILABLE", "Sorry, this vehicle category just sold out for your dates. Please choose another car or date.");
    }

    return tx.booking.create({
      data: {
        bookingReference: generateBookingReference(now),
        userId: user.id,
        carId: car.id,
        pickupLocation: resolved.from.label,
        dropLocation: resolved.to.label,
        pickupLatitude: resolved.from.lat, pickupLongitude: resolved.from.lng,
        dropLatitude: resolved.to.lat, dropLongitude: resolved.to.lng,
        journeyType: input.journeyType,
        pickupDate: toDateOnly(input.pickupDate),
        returnDate: input.returnDate ? toDateOnly(input.returnDate) : null,
        pickupTime: input.pickupTime,
        estimatedDistance: resolved.route.distanceKm,
        estimatedDuration: resolved.route.durationMins,
        passengerCount: input.passengerCount,
        customerName: input.customerName, customerPhone: input.customerPhone, customerEmail: input.customerEmail,
        notes: input.notes,
        baseFare: fare.baseFare + fare.distanceCharge,
        additionalCharges: fare.additionalCharges,
        taxes: fare.taxes,
        discount: fare.discount,
        totalAmount: fare.totalAmount,
        fareSnapshot: fare as unknown as Prisma.InputJsonValue, // immutable record of what the customer agreed to
        couponCode: fare.couponCode,
        holdExpiresAt,
      },
      include: { car: true },
    });
  });
}

/** Marks stale unpaid holds as EXPIRED (inventory is already ignored for them in availability queries). */
export async function expireStaleHolds(): Promise<number> {
  const r = await prisma.booking.updateMany({
    where: { bookingStatus: "PENDING_PAYMENT", holdExpiresAt: { lt: new Date() }, paymentStatus: { not: "PAID" } },
    data: { bookingStatus: "EXPIRED", holdExpiresAt: null },
  });
  return r.count;
}

export async function getOwnedBooking(user: SessionUser, id: string) {
  const b = await prisma.booking.findUnique({ where: { id }, include: { car: true, payments: { orderBy: { createdAt: "desc" } }, review: true } });
  // Same error for "missing" and "someone else's" so ids can't be probed.
  if (!b || (b.userId !== user.id && user.role !== "ADMIN")) throw new AppError("NOT_FOUND", "Booking not found.");
  return b;
}

export type BookingScope = "upcoming" | "completed" | "cancelled" | "all";

/** A customer's own bookings (userId always comes from the session, never from request input). */
export async function listUserBookings(userId: string, opts: { scope: BookingScope; page: number; pageSize: number }) {
  await expireStaleHolds();
  const statuses: Record<BookingScope, Prisma.BookingWhereInput["bookingStatus"]> = {
    upcoming: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
    completed: "COMPLETED",
    cancelled: { in: ["CANCELLED", "EXPIRED"] },
    all: undefined,
  };
  const where: Prisma.BookingWhereInput = { userId, bookingStatus: statuses[opts.scope] };
  const [total, items] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (opts.page - 1) * opts.pageSize, take: opts.pageSize,
      include: { car: { select: { brand: true, model: true, category: true, imageUrl: true } } },
    }),
  ]);
  return { items, total, totalPages: Math.max(1, Math.ceil(total / opts.pageSize)) };
}

export function cancellationQuote(b: { totalAmount: Prisma.Decimal; pickupDate: Date; pickupTime: string }, now = new Date()) {
  return computeRefund(b.totalAmount.toString(), pickupInstant(fromDateOnly(b.pickupDate), b.pickupTime), now);
}

export async function cancelBooking(user: SessionUser, id: string) {
  const existing = await getOwnedBooking(user, id);
  if (existing.userId !== user.id) throw new AppError("FORBIDDEN", "Only the customer can cancel this booking.");

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;
    const b = await tx.booking.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    if (!canTransition(b.bookingStatus, "CANCELLED")) {
      throw new AppError("CONFLICT", `A ${b.bookingStatus.toLowerCase().replace("_", " ")} booking cannot be cancelled.`);
    }
    const pickupAt = pickupInstant(fromDateOnly(b.pickupDate), b.pickupTime);
    if (pickupAt <= new Date()) throw new AppError("CONFLICT", "This trip has already started and cannot be cancelled online.");

    const wasPaid = b.paymentStatus === "PAID";
    const quote = wasPaid ? cancellationQuote(b) : null;
    const paidPayment = b.payments.find((p) => p.paymentStatus === "PAID" && p.razorpayPaymentId);
    const needsRefund = Boolean(quote && quote.refundAmount > 0 && paidPayment);

    const updated = await tx.booking.update({
      where: { id },
      data: {
        bookingStatus: "CANCELLED", cancelledAt: new Date(), holdExpiresAt: null,
        refundAmount: quote ? quote.refundAmount : null,
        paymentStatus: needsRefund ? "REFUND_PENDING" : b.paymentStatus,
      },
    });
    await tx.auditLog.create({ data: { actorId: user.id, action: "BOOKING_CANCELLED", entity: "Booking", entityId: id, metadata: { refund: quote?.refundAmount ?? 0 } } });
    return { updated, quote, paidPayment: needsRefund ? paidPayment! : null };
  });

  if (result.paidPayment && result.quote) {
    await issueRefund(id, result.paidPayment.id, result.paidPayment.razorpayPaymentId!, result.quote.refundAmount);
  }
  return { booking: await prisma.booking.findUniqueOrThrow({ where: { id } }), refund: result.quote };
}

/** Calls the gateway; on failure leaves REFUND_PENDING so an admin can retry. Never throws. */
export async function issueRefund(bookingId: string, paymentRowId: string, gatewayPaymentId: string, amount: number): Promise<boolean> {
  try {
    await getPaymentProvider().refund(gatewayPaymentId, toPaise(amount), { bookingId });
    await prisma.$transaction([
      prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "REFUNDED" } }),
      prisma.payment.update({ where: { id: paymentRowId }, data: { paymentStatus: "REFUNDED" } }),
    ]);
    return true;
  } catch (e) {
    logger.error("Refund failed – needs manual attention", { bookingId, err: e instanceof Error ? e.message : String(e) });
    return false;
  }
}
