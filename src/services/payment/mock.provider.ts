import { randomBytes } from "node:crypto";
import { signCheckout, verifyCheckoutSignature, verifyWebhookSignature } from "./signature";
import type { CreateOrderParams, PaymentProvider, ProviderOrder } from "./types";

/**
 * DEV/TEST ONLY. Enabled with PAYMENT_PROVIDER=mock and refused when NODE_ENV=production.
 * Behaves like a gateway locally (orders, HMAC signatures, refunds) so the full flow can be exercised
 * without network access. It is NOT Razorpay and moves no money.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly publicKey = "mock_key";
  private readonly secret = process.env.MOCK_PAYMENT_SECRET ?? "mock_secret_dev_only";

  async createOrder(p: CreateOrderParams): Promise<ProviderOrder> {
    return { orderId: `order_mock_${randomBytes(8).toString("hex")}`, amountPaise: p.amountPaise, currency: "INR" };
  }
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    return verifyCheckoutSignature(orderId, paymentId, signature, this.secret);
  }
  verifyWebhookSignature(rawBody: string, signature: string | null) {
    return verifyWebhookSignature(rawBody, signature, this.secret);
  }
  async refund() {
    return { refundId: `rfnd_mock_${randomBytes(6).toString("hex")}` };
  }
  /** Used by the dev-only simulate endpoint. */
  sign(orderId: string, paymentId: string) {
    return signCheckout(orderId, paymentId, this.secret);
  }
}
