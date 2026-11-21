import Razorpay from "razorpay";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { verifyCheckoutSignature, verifyWebhookSignature } from "./signature";
import type { CreateOrderParams, PaymentProvider, ProviderOrder } from "./types";

export class RazorpayProvider implements PaymentProvider {
  readonly name = "razorpay";
  private readonly client: Razorpay;

  constructor(private readonly keyId: string, private readonly keySecret: string, private readonly webhookSecret: string) {
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  get publicKey() {
    return this.keyId;
  }

  async createOrder(p: CreateOrderParams): Promise<ProviderOrder> {
    try {
      const order = await this.client.orders.create({ amount: p.amountPaise, currency: "INR", receipt: p.receipt, notes: p.notes });
      return { orderId: order.id, amountPaise: Number(order.amount), currency: order.currency };
    } catch (e) {
      logger.error("Razorpay order creation failed", { err: describe(e) });
      throw new AppError("PAYMENT_ERROR", "Could not start the payment. Please try again.");
    }
  }

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    return verifyCheckoutSignature(orderId, paymentId, signature, this.keySecret);
  }

  verifyWebhookSignature(rawBody: string, signature: string | null) {
    return verifyWebhookSignature(rawBody, signature, this.webhookSecret);
  }

  async refund(paymentId: string, amountPaise: number, notes?: Record<string, string>) {
    const r = await this.client.payments.refund(paymentId, { amount: amountPaise, notes, speed: "normal" });
    return { refundId: r.id };
  }
}

function describe(e: unknown) {
  if (e && typeof e === "object" && "error" in e) return JSON.stringify((e as { error: unknown }).error);
  return e instanceof Error ? e.message : String(e);
}
