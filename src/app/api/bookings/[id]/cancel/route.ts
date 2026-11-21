import { ok, route } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { cancelBooking } from "@/services/booking.service";

export const PATCH = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUserApi();
  const { id } = await params;
  const { booking, refund } = await cancelBooking(user, id);
  return ok({ id: booking.id, bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus, refund });
});
