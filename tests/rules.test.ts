import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canTransition, computeRefund } from "@/services/booking-rules";
import { generateBookingReference } from "@/services/booking.service";
import { signCheckout, verifyCheckoutSignature, verifyWebhookSignature } from "@/services/payment/signature";

describe("booking status transitions", () => {
  it("allows the happy path", () => {
    expect(canTransition("PENDING_PAYMENT", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
  });
  it("blocks illegal moves", () => {
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "COMPLETED")).toBe(false);
  });
});

describe("cancellation refund policy", () => {
  const now = new Date("2030-01-10T00:00:00Z");
  const at = (h: number) => new Date(now.getTime() + h * 3_600_000);
  it("90% over 24h", () => expect(computeRefund(1000, at(48), now).refundAmount).toBe(900));
  it("50% between 6 and 24h", () => expect(computeRefund(1000, at(10), now).refundAmount).toBe(500));
  it("0% under 6h", () => expect(computeRefund(1000, at(3), now).refundAmount).toBe(0));
  it("boundaries are inclusive", () => {
    expect(computeRefund(1000, at(24), now).refundPercent).toBe(90);
    expect(computeRefund(1000, at(6), now).refundPercent).toBe(50);
  });
});

describe("payment signatures", () => {
  it("verifies a valid checkout signature", () => {
    const sig = signCheckout("order_1", "pay_1", "sekret");
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, "sekret")).toBe(true);
  });
  it("rejects tampered ids, wrong secret, empty and wrong-length signatures", () => {
    const sig = signCheckout("order_1", "pay_1", "sekret");
    expect(verifyCheckoutSignature("order_2", "pay_1", sig, "sekret")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", sig, "other")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "", "sekret")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "abc", "sekret")).toBe(false);
  });
  it("verifies webhook signature over the raw body", () => {
    const body = '{"event":"payment.captured"}';
    const sig = createHmac("sha256", "wh").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, "wh")).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, "wh")).toBe(false);
    expect(verifyWebhookSignature(body, null, "wh")).toBe(false);
  });
});

describe("booking reference", () => {
  it("is unique-ish, readable and well-formed", () => {
    const refs = new Set(Array.from({ length: 500 }, () => generateBookingReference()));
    expect(refs.size).toBe(500);
    for (const r of refs) expect(r).toMatch(/^GR\d{6}[A-HJKMNP-Z2-9]{6}$/);
  });
});
