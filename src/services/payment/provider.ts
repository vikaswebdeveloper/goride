import { AppError } from "@/lib/errors";
import { MockPaymentProvider } from "./mock.provider";
import { RazorpayProvider } from "./razorpay.provider";
import type { PaymentProvider } from "./types";

let provider: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  if (process.env.PAYMENT_PROVIDER === "mock") {
    if (process.env.NODE_ENV === "production") throw new Error("PAYMENT_PROVIDER=mock is not allowed in production");
    return (provider = new MockPaymentProvider());
  }
  const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret, RAZORPAY_WEBHOOK_SECRET: wh } = process.env;
  if (!id || !secret) throw new AppError("PAYMENT_ERROR", "Online payments are not configured yet.");
  return (provider = new RazorpayProvider(id, secret, wh ?? ""));
}

export function isMockPayments(): boolean {
  return process.env.PAYMENT_PROVIDER === "mock" && process.env.NODE_ENV !== "production";
}

export function paymentsConfigured(): boolean {
  return isMockPayments() || Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}
