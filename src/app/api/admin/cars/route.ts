import { ok, parseBody, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { carSchema } from "@/lib/validations/admin";
import { invalidateCatalog } from "@/services/admin.service";

export const GET = route(async () => {
  await requireAdminApi();
  return ok(await prisma.car.findMany({ orderBy: [{ category: "asc" }, { brand: "asc" }] }));
});

export const POST = route(async (req) => {
  const admin = await requireAdminApi();
  const data = await parseBody(req, carSchema);
  const dup = await prisma.car.findUnique({ where: { brand_model: { brand: data.brand, model: data.model } } });
  if (dup) throw new AppError("CONFLICT", "This car model already exists.");
  const car = await prisma.car.create({ data });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "CAR_CREATED", entity: "Car", entityId: car.id } });
  invalidateCatalog();
  return ok(car, undefined, 201);
});
