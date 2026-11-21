import { createHmac } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { addDays, nowIST } from "@/utils/dates";
import { cancelBooking, createBooking, getOwnedBooking } from "@/services/booking.service";
import { createOrderForBooking, processWebhook, verifyPayment } from "@/services/payment.service";
import { MockPaymentProvider } from "@/services/payment/mock.provider";
import { updateBookingStatus } from "@/services/admin.service";
import type { BookingCreateInput } from "@/lib/validations/trip";

const mock = new MockPaymentProvider();
const SECRET = process.env.MOCK_PAYMENT_SECRET ?? "mock_secret_dev_only";

let alice: SessionUser, bob: SessionUser, admin: SessionUser;
let sedanId: string, luxuryId: string;

const date = (n: number) => addDays(nowIST().date, n);
const input = (o: Partial<BookingCreateInput> = {}): BookingCreateInput => ({
  fromId: "delhi", toId: "jaipur", journeyType: "ONE_WAY", pickupDate: date(10), pickupTime: "09:00",
  carId: sedanId, passengerCount: 3, customerName: "Asha Rao", customerPhone: "+919876543210",
  customerEmail: "asha@example.com", acceptTerms: true, ...o,
});

async function mkUser(email: string, role: "CUSTOMER" | "ADMIN" = "CUSTOMER"): Promise<SessionUser> {
  const u = await prisma.user.upsert({ where: { email }, update: {}, create: { email, name: email.split("@")[0], passwordHash: "x", role } });
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role };
}

async function pay(user: SessionUser, bookingId: string) {
  const order = await createOrderForBooking(user, bookingId);
  const paymentId = `pay_${Math.random().toString(36).slice(2)}`;
  return { order, paymentId, signature: mock.sign(order.orderId, paymentId) };
}

beforeAll(async () => {
  expect(process.env.DATABASE_URL).toContain("goride_test"); // never run destructive tests against dev data
  alice = await mkUser("alice@test.local");
  bob = await mkUser("bob@test.local");
  admin = await mkUser("admin@test.local", "ADMIN");
  sedanId = (await prisma.car.findFirstOrThrow({ where: { category: "SEDAN" } })).id;
  luxuryId = (await prisma.car.findFirstOrThrow({ where: { category: "LUXURY" } })).id;
});

beforeEach(async () => {
  await prisma.webhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.fleetInventory.updateMany({ where: { category: "LUXURY" }, data: { dailyCapacity: 2 } });
});

afterAll(() => prisma.$disconnect());

describe("booking creation", () => {
  it("creates a PENDING_PAYMENT booking with a server-computed fare snapshot", async () => {
    const b = await createBooking(alice, input());
    expect(b.bookingStatus).toBe("PENDING_PAYMENT");
    expect(b.paymentStatus).toBe("PENDING");
    expect(Number(b.totalAmount)).toBeGreaterThan(1000);
    expect(b.fareSnapshot).toMatchObject({ currency: "INR" });
    expect(b.holdExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });
  it("rejects more passengers than the car seats", async () => {
    await expect(createBooking(alice, input({ passengerCount: 7 }))).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("rejects an unknown location", async () => {
    await expect(createBooking(alice, input({ toId: "atlantis" }))).rejects.toBeInstanceOf(AppError);
  });
  it("does not oversell under concurrent requests", async () => {
    // Luxury capacity = 2 for that day; fire 6 simultaneous bookings.
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => createBooking(alice, input({ carId: luxuryId }))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected).toHaveLength(4);
    expect(rejected.every((r) => (r.reason as AppError).code === "UNAVAILABLE")).toBe(true);
  });
  it("blocks overlapping round trips but frees capacity on other dates", async () => {
    await prisma.fleetInventory.update({ where: { category: "LUXURY" }, data: { dailyCapacity: 1 } });
    await createBooking(alice, input({ carId: luxuryId, journeyType: "ROUND_TRIP", pickupDate: date(10), returnDate: date(12) }));
    await expect(createBooking(bob, input({ carId: luxuryId, pickupDate: date(11) }))).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(createBooking(bob, input({ carId: luxuryId, pickupDate: date(13) }))).resolves.toBeTruthy();
  });
});

describe("payment flow", () => {
  it("never trusts a client amount: the order amount equals the stored booking total", async () => {
    const b = await createBooking(alice, input());
    const order = await createOrderForBooking(alice, b.id);
    expect(order.amountPaise).toBe(Math.round(Number(b.totalAmount) * 100));
    expect(order).not.toHaveProperty("keySecret");
  });
  it("does not confirm on order creation – only after verified payment", async () => {
    const b = await createBooking(alice, input());
    await createOrderForBooking(alice, b.id);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).bookingStatus).toBe("PENDING_PAYMENT");
  });
  it("confirms after a valid signature", async () => {
    const b = await createBooking(alice, input());
    const { order, paymentId, signature } = await pay(alice, b.id);
    const r = await verifyPayment(alice, { orderId: order.orderId, paymentId, signature });
    expect(r.outcome).toBe("confirmed");
    const after = await prisma.booking.findUniqueOrThrow({ where: { id: b.id }, include: { payments: true } });
    expect(after.bookingStatus).toBe("CONFIRMED");
    expect(after.paymentStatus).toBe("PAID");
    expect(after.payments[0].razorpayPaymentId).toBe(paymentId);
  });
  it("rejects a forged signature and leaves the booking unconfirmed", async () => {
    const b = await createBooking(alice, input());
    const order = await createOrderForBooking(alice, b.id);
    await expect(verifyPayment(alice, { orderId: order.orderId, paymentId: "pay_x", signature: "0".repeat(64) })).rejects.toMatchObject({ code: "PAYMENT_ERROR" });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).bookingStatus).toBe("PENDING_PAYMENT");
  });
  it("is idempotent: verifying twice (even concurrently) yields one payment", async () => {
    const b = await createBooking(alice, input());
    const { order, paymentId, signature } = await pay(alice, b.id);
    const rs = await Promise.all(Array.from({ length: 4 }, () => verifyPayment(alice, { orderId: order.orderId, paymentId, signature })));
    expect(rs.filter((r) => r.outcome === "confirmed")).toHaveLength(1);
    expect(await prisma.payment.count({ where: { bookingId: b.id } })).toBe(1);
  });
  it("another customer cannot verify someone else's payment", async () => {
    const b = await createBooking(alice, input());
    const { order, paymentId, signature } = await pay(alice, b.id);
    await expect(verifyPayment(bob, { orderId: order.orderId, paymentId, signature })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("failed payment leaves the booking retryable and a retry reuses the order and succeeds", async () => {
    const b = await createBooking(alice, input());
    const order = await createOrderForBooking(alice, b.id);
    const body = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "pay_f", order_id: order.orderId, error_description: "bank declined" } } } });
    await processWebhook(body, createHmac("sha256", SECRET).update(body).digest("hex"), "evt_fail_1");
    let row = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(row.bookingStatus).toBe("PENDING_PAYMENT");
    expect(row.paymentStatus).toBe("FAILED");

    const retry = await createOrderForBooking(alice, b.id);
    expect(retry.orderId).toBe(order.orderId);
    const paymentId = "pay_retry_ok";
    await verifyPayment(alice, { orderId: retry.orderId, paymentId, signature: mock.sign(retry.orderId, paymentId) });
    row = await prisma.booking.findUniqueOrThrow({ where: { id: b.id } });
    expect(row.bookingStatus).toBe("CONFIRMED");
  });
  it("re-checks availability at confirmation and refunds when sold out", async () => {
    await prisma.fleetInventory.update({ where: { category: "LUXURY" }, data: { dailyCapacity: 1 } });
    const first = await createBooking(alice, input({ carId: luxuryId }));
    const { order, paymentId, signature } = await pay(alice, first.id);
    // The hold lapses and someone else takes the only unit before payment lands.
    await prisma.booking.update({ where: { id: first.id }, data: { holdExpiresAt: new Date(Date.now() - 1000) } });
    await createBooking(bob, input({ carId: luxuryId }));
    await expect(verifyPayment(alice, { orderId: order.orderId, paymentId, signature })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: first.id } });
    expect(row.bookingStatus).toBe("EXPIRED");
    expect(row.paymentStatus).toBe("REFUNDED");
  });
  it("fare changes never alter an existing booking's amount", async () => {
    const b = await createBooking(alice, input());
    const original = Number(b.totalAmount);
    const rule = await prisma.pricingRule.findUniqueOrThrow({ where: { carCategory: "SEDAN" } });
    await prisma.pricingRule.update({ where: { id: rule.id }, data: { pricePerKm: Number(rule.pricePerKm) * 2 } });
    try {
      const order = await createOrderForBooking(alice, b.id);
      expect(order.amountPaise).toBe(Math.round(original * 100));
    } finally {
      await prisma.pricingRule.update({ where: { id: rule.id }, data: { pricePerKm: rule.pricePerKm } });
    }
  });
});

describe("webhooks", () => {
  const evt = (orderId: string, paymentId: string, amount: number, event = "payment.captured") =>
    JSON.stringify({ event, payload: { payment: { entity: { id: paymentId, order_id: orderId, method: "upi", amount } } } });
  const sign = (b: string) => createHmac("sha256", SECRET).update(b).digest("hex");

  it("rejects a bad signature", async () => {
    await expect(processWebhook("{}", "deadbeef", "e1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("confirms on payment.captured and treats a replay as duplicate", async () => {
    const b = await createBooking(alice, input());
    const order = await createOrderForBooking(alice, b.id);
    const body = evt(order.orderId, "pay_wh1", order.amountPaise);
    expect((await processWebhook(body, sign(body), "evt_1")).status).toBe("processed");
    expect((await processWebhook(body, sign(body), "evt_1")).status).toBe("duplicate");
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: b.id }, include: { payments: true } });
    expect(row.bookingStatus).toBe("CONFIRMED");
    expect(row.payments).toHaveLength(1);
    expect(row.payments[0].paymentMethod).toBe("upi");
  });
  it("is safe when the client verify and the webhook race", async () => {
    const b = await createBooking(alice, input());
    const { order, paymentId, signature } = await pay(alice, b.id);
    const body = evt(order.orderId, paymentId, order.amountPaise);
    await Promise.all([verifyPayment(alice, { orderId: order.orderId, paymentId, signature }), processWebhook(body, sign(body), "evt_race")]);
    expect(await prisma.payment.count({ where: { bookingId: b.id, paymentStatus: "PAID" } })).toBe(1);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).bookingStatus).toBe("CONFIRMED");
  });
  it("refuses to confirm when the paid amount does not match the order", async () => {
    const b = await createBooking(alice, input());
    const order = await createOrderForBooking(alice, b.id);
    const body = evt(order.orderId, "pay_short", 100);
    await processWebhook(body, sign(body), "evt_amt");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).bookingStatus).toBe("PENDING_PAYMENT");
  });
  it("a late failure event never downgrades a paid booking", async () => {
    const b = await createBooking(alice, input());
    const { order, paymentId, signature } = await pay(alice, b.id);
    await verifyPayment(alice, { orderId: order.orderId, paymentId, signature });
    const body = evt(order.orderId, paymentId, order.amountPaise, "payment.failed");
    await processWebhook(body, sign(body), "evt_late_fail");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: b.id } })).paymentStatus).toBe("PAID");
  });
});

describe("authorization", () => {
  it("customers cannot read other customers' bookings", async () => {
    const b = await createBooking(alice, input());
    await expect(getOwnedBooking(bob, b.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getOwnedBooking(alice, b.id)).resolves.toBeTruthy();
  });
  it("customers cannot create an order for, or cancel, someone else's booking", async () => {
    const b = await createBooking(alice, input());
    await expect(createOrderForBooking(bob, b.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(cancelBooking(bob, b.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("admin cannot confirm an unpaid booking by hand", async () => {
    const b = await createBooking(alice, input());
    await expect(updateBookingStatus(admin.id, b.id, "CONFIRMED")).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("cancellation", () => {
  it("refunds 90% when cancelling > 24h before pickup", async () => {
    const b = await createBooking(alice, input({ pickupDate: date(10) }));
    const { order, paymentId, signature } = await pay(alice, b.id);
    await verifyPayment(alice, { orderId: order.orderId, paymentId, signature });
    const r = await cancelBooking(alice, b.id);
    expect(r.refund?.refundPercent).toBe(90);
    expect(r.booking.bookingStatus).toBe("CANCELLED");
    expect(r.booking.paymentStatus).toBe("REFUNDED");
    expect(Number(r.booking.refundAmount)).toBeCloseTo(Number(b.totalAmount) * 0.9, 1);
  });
  it("cannot cancel twice", async () => {
    const b = await createBooking(alice, input());
    await cancelBooking(alice, b.id);
    await expect(cancelBooking(alice, b.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("frees inventory after cancellation", async () => {
    await prisma.fleetInventory.update({ where: { category: "LUXURY" }, data: { dailyCapacity: 1 } });
    const b = await createBooking(alice, input({ carId: luxuryId }));
    await expect(createBooking(bob, input({ carId: luxuryId }))).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await cancelBooking(alice, b.id);
    await expect(createBooking(bob, input({ carId: luxuryId }))).resolves.toBeTruthy();
  });
});
