import { ok, parseBody, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { adminBookingUpdateSchema } from "@/lib/validations/admin";
import { updateBookingStatus } from "@/services/admin.service";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  await requireAdminApi();
  const { id } = await params;
  const b = await prisma.booking.findUnique({ where: { id }, include: { car: true, payments: true, user: { select: { id: true, name: true, email: true, phone: true, createdAt: true } } } });
  if (!b) throw new AppError("NOT_FOUND", "Booking not found.");
  return ok(b);
});

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdminApi();
  const { id } = await params;
  const { bookingStatus } = await parseBody(req, adminBookingUpdateSchema);
  const b = await updateBookingStatus(admin.id, id, bookingStatus);
  return ok({ id: b.id, bookingStatus: b.bookingStatus, paymentStatus: b.paymentStatus });
});
