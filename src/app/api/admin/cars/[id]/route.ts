import { ok, parseBody, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { carUpdateSchema } from "@/lib/validations/admin";
import { invalidateCatalog } from "@/services/admin.service";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  const admin = await requireAdminApi();
  const { id } = await params;
  const data = await parseBody(req, carUpdateSchema);
  const exists = await prisma.car.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError("NOT_FOUND", "Car not found.");
  const car = await prisma.car.update({ where: { id }, data });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "CAR_UPDATED", entity: "Car", entityId: id } });
  invalidateCatalog();
  return ok(car);
});

/** Hard-deletes only cars with no booking history; otherwise deactivates (bookings keep their car reference). */
export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const admin = await requireAdminApi();
  const { id } = await params;
  const car = await prisma.car.findUnique({ where: { id }, include: { _count: { select: { bookings: true } } } });
  if (!car) throw new AppError("NOT_FOUND", "Car not found.");
  const softDeleted = car._count.bookings > 0;
  if (softDeleted) await prisma.car.update({ where: { id }, data: { isActive: false } });
  else await prisma.car.delete({ where: { id } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: softDeleted ? "CAR_DEACTIVATED" : "CAR_DELETED", entity: "Car", entityId: id } });
  invalidateCatalog();
  return ok({ id, softDeleted });
});
