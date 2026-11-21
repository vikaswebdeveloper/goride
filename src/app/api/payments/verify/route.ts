import { z } from "zod";
import { ok, parseBody, route } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPayment } from "@/services/payment.service";

const schema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

export const POST = route(async (req) => {
  const user = await requireUserApi();
  rateLimit(`pay:verify:${user.id}`, 20, 5 * 60_000);
  const b = await parseBody(req, schema);
  const r = await verifyPayment(user, { orderId: b.razorpay_order_id, paymentId: b.razorpay_payment_id, signature: b.razorpay_signature });
  return ok(r);
});
