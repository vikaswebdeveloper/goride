import { ok, route } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { cancellationQuote, getOwnedBooking } from "@/services/booking.service";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUserApi();
  const { id } = await params;
  const b = await getOwnedBooking(user, id);
  return ok({ ...b, cancellationQuote: ["CONFIRMED", "PENDING_PAYMENT"].includes(b.bookingStatus) ? cancellationQuote(b) : null });
});
