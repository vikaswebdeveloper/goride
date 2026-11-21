import { z } from "zod";
import { randomBytes } from "node:crypto";
import { ok, parseBody, route } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { MockPaymentProvider } from "@/services/payment/mock.provider";
import { isMockPayments } from "@/services/payment/provider";

/**
 * DEV ONLY (PAYMENT_PROVIDER=mock, never in production): produces the callback payload Razorpay Checkout would
 * return, signed with the mock secret, so the verify flow can be exercised without a gateway.
 */
export const POST = route(async (req) => {
  if (!isMockPayments()) throw new AppError("NOT_FOUND", "Not found.");
  const user = await requireUserApi();
  const { orderId } = await parseBody(req, z.object({ orderId: z.string().min(1) }));
  const p = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId }, include: { booking: true } });
  if (!p || p.booking.userId !== user.id) throw new AppError("NOT_FOUND", "Payment not found.");
  const paymentId = `pay_mock_${randomBytes(7).toString("hex")}`;
  return ok({
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: new MockPaymentProvider().sign(orderId, paymentId),
  });
});
