import { z } from "zod";
import { ok, parseBody, route } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createOrderForBooking } from "@/services/payment.service";

// Only the booking id is accepted. The amount is read from the database, never from the client.
export const POST = route(async (req) => {
  const user = await requireUserApi();
  rateLimit(`pay:order:${user.id}`, 10, 5 * 60_000);
  const { bookingId } = await parseBody(req, z.object({ bookingId: z.string().min(1) }));
  return ok(await createOrderForBooking(user, bookingId));
});
