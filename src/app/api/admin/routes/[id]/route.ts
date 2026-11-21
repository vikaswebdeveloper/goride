import { ok, parseBody, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { popularRouteSchema } from "@/lib/validations/admin";
import { invalidateCatalog } from "@/services/admin.service";

export const PATCH = route<{ id: string }>(async (req, { params }) => {
  await requireAdminApi();
  const { id } = await params;
  const data = await parseBody(req, popularRouteSchema.partial());
  if (!(await prisma.popularRoute.findUnique({ where: { id }, select: { id: true } }))) throw new AppError("NOT_FOUND", "Route not found.");
  const r = await prisma.popularRoute.update({ where: { id }, data });
  invalidateCatalog();
  return ok(r);
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  await requireAdminApi();
  const { id } = await params;
  if (!(await prisma.popularRoute.findUnique({ where: { id }, select: { id: true } }))) throw new AppError("NOT_FOUND", "Route not found.");
  await prisma.popularRoute.delete({ where: { id } });
  invalidateCatalog();
  return ok({ id });
});
