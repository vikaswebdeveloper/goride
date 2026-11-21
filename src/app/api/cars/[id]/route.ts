import { ok, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const car = await prisma.car.findFirst({ where: { id, isActive: true } });
  if (!car) throw new AppError("NOT_FOUND", "Vehicle not found.");
  return ok(car);
});
