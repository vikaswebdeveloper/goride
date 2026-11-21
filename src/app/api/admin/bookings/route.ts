import { ok, parseQuery, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { adminBookingsQuery } from "@/lib/validations/admin";
import { expireStaleHolds } from "@/services/booking.service";
import { listAdminBookings } from "@/services/admin.service";

export const GET = route(async (req) => {
  await requireAdminApi();
  const q = parseQuery(req, adminBookingsQuery);
  await expireStaleHolds();
  const { items, total } = await listAdminBookings(q);
  return ok(items, { page: q.page, pageSize: q.pageSize, total, totalPages: Math.ceil(total / q.pageSize) });
});
