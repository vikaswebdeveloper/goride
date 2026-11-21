import { ok, parseQuery, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paginationQuery } from "@/lib/validations/common";
import { z } from "zod";

export const GET = route(async (req) => {
  await requireAdminApi();
  const { page, pageSize, q } = parseQuery(req, paginationQuery.extend({ q: z.string().trim().max(80).optional() }));
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] } : {};
  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, _count: { select: { bookings: true } } },
    }),
  ]);
  return ok(items, { page, pageSize, total, totalPages: Math.ceil(total / pageSize) });
});
