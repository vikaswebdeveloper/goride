export type CreateOrderParams = { amountPaise: number; receipt: string; notes?: Record<string, string> };
export type ProviderOrder = { orderId: string; amountPaise: number; currency: string };

/** Payment gateway port. Implement this to add Stripe, Cashfree, etc. */
export interface PaymentProvider {
  readonly name: string;
  /** Public key id safe for the browser. */
  readonly publicKey: string;
  createOrder(p: CreateOrderParams): Promise<ProviderOrder>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
  refund(paymentId: string, amountPaise: number, notes?: Record<string, string>): Promise<{ refundId: string }>;
}
