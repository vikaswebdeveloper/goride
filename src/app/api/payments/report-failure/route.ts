import { z } from "zod";
import { ok, parseBody, route } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { reportPaymentFailure } from "@/services/payment.service";

export const POST = route(async (req) => {
  const user = await requireUserApi();
  rateLimit(`pay:fail:${user.id}`, 20, 5 * 60_000);
  const b = await parseBody(req, z.object({ orderId: z.string().min(1).max(100), reason: z.string().max(250).optional() }));
  await reportPaymentFailure(user, b.orderId, b.reason);
  return ok({ recorded: true });
});
