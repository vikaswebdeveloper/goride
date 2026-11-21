import { z } from "zod";
import { ok, parseBody, parseQuery, route } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { paginationQuery } from "@/lib/validations/common";
import { bookingCreateSchema } from "@/lib/validations/trip";
import { createBooking, listUserBookings } from "@/services/booking.service";

export const POST = route(async (req) => {
  const user = await requireUserApi();
  rateLimit(`booking:${user.id}`, 15, 10 * 60_000);
  rateLimit(`booking:ip:${clientIp(req)}`, 40, 10 * 60_000);
  const input = await parseBody(req, bookingCreateSchema);
  const b = await createBooking(user, input);
  return ok(
    { id: b.id, bookingReference: b.bookingReference, totalAmount: Number(b.totalAmount), bookingStatus: b.bookingStatus, paymentStatus: b.paymentStatus, holdExpiresAt: b.holdExpiresAt },
    undefined,
    201,
  );
});

const listQuery = paginationQuery.extend({ scope: z.enum(["upcoming", "completed", "cancelled", "all"]).default("all") });

export const GET = route(async (req) => {
  const user = await requireUserApi();
  const q = parseQuery(req, listQuery);
  const { items, total, totalPages } = await listUserBookings(user.id, q);
  return ok(items, { page: q.page, pageSize: q.pageSize, total, totalPages });
});
