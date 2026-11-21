import { ok, parseBody, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { popularRouteSchema } from "@/lib/validations/admin";
import { invalidateCatalog } from "@/services/admin.service";

export const GET = route(async () => {
  await requireAdminApi();
  return ok(await prisma.popularRoute.findMany({ orderBy: { sortOrder: "asc" } }));
});

export const POST = route(async (req) => {
  await requireAdminApi();
  const data = await parseBody(req, popularRouteSchema);
  const dup = await prisma.popularRoute.findUnique({ where: { fromCity_toCity: { fromCity: data.fromCity, toCity: data.toCity } } });
  if (dup) throw new AppError("CONFLICT", "This route already exists.");
  const r = await prisma.popularRoute.create({ data });
  invalidateCatalog();
  return ok(r, undefined, 201);
});
