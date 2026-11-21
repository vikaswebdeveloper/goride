import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { canTransition } from "./booking-rules";

export function invalidateCatalog() {
  revalidateTag("catalog-cars", "max");
  revalidateTag("popular-routes", "max");
}

export async function listAdminBookings(q: {
  page: number; pageSize: number; q?: string; status?: string; paymentStatus?: string; from?: string; to?: string;
}) {
  const where: Prisma.BookingWhereInput = {
    ...(q.status && { bookingStatus: q.status as never }),
    ...(q.paymentStatus && { paymentStatus: q.paymentStatus as never }),
    ...((q.from || q.to) && {
      createdAt: { ...(q.from && { gte: new Date(q.from + "T00:00:00+05:30") }), ...(q.to && { lte: new Date(q.to + "T23:59:59.999+05:30") }) },
    }),
    ...(q.q && {
      OR: [
        { bookingReference: { contains: q.q, mode: "insensitive" } },
        { customerName: { contains: q.q, mode: "insensitive" } },
        { customerPhone: { contains: q.q.replace(/\s/g, "") } },
        { customerEmail: { contains: q.q, mode: "insensitive" } },
      ],
    }),
  };
  const [total, items] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * q.pageSize, take: q.pageSize,
      include: { car: { select: { brand: true, model: true, category: true } }, payments: { orderBy: { createdAt: "desc" } }, user: { select: { id: true, name: true, email: true, phone: true } } },
    }),
  ]);
  return { items, total };
}

export async function updateBookingStatus(adminId: string, id: string, to: "CONFIRMED" | "COMPLETED" | "CANCELLED") {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${id} FOR UPDATE`;
    const b = await tx.booking.findUnique({ where: { id } });
    if (!b) throw new AppError("NOT_FOUND", "Booking not found.");
    if (!canTransition(b.bookingStatus, to)) throw new AppError("CONFLICT", `Cannot move a booking from ${b.bookingStatus} to ${to}.`);
    // Never confirm an unpaid booking by hand: confirmation only follows verified payment.
    if (to === "CONFIRMED" && b.paymentStatus !== "PAID") throw new AppError("CONFLICT", "A booking can only be confirmed after verified payment.");
    const updated = await tx.booking.update({
      where: { id },
      data: {
        bookingStatus: to,
        ...(to === "CANCELLED" && { cancelledAt: new Date(), holdExpiresAt: null, ...(b.paymentStatus === "PAID" && { paymentStatus: "REFUND_PENDING" as const, refundAmount: b.totalAmount }) }),
      },
    });
    await tx.auditLog.create({ data: { actorId: adminId, action: "ADMIN_BOOKING_STATUS", entity: "Booking", entityId: id, metadata: { from: b.bookingStatus, to } } });
    return updated;
  });
}

export async function getAnalytics() {
  const paidWhere: Prisma.BookingWhereInput = { paymentStatus: { in: ["PAID", "REFUND_PENDING", "REFUNDED"] }, bookingStatus: { in: ["CONFIRMED", "COMPLETED"] } };
  const [total, revenue, pending, completed, cancelled, routes, byCar, cars] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.aggregate({ where: { bookingStatus: { in: ["CONFIRMED", "COMPLETED"] }, paymentStatus: "PAID" }, _sum: { totalAmount: true } }),
    prisma.booking.aggregate({ where: { bookingStatus: "PENDING_PAYMENT", holdExpiresAt: { gt: new Date() } }, _sum: { totalAmount: true }, _count: true }),
    prisma.booking.count({ where: { bookingStatus: "COMPLETED" } }),
    prisma.booking.count({ where: { bookingStatus: "CANCELLED" } }),
    prisma.booking.groupBy({ by: ["pickupLocation", "dropLocation"], where: paidWhere, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 5 }),
    prisma.booking.groupBy({ by: ["carId"], where: paidWhere, _count: { _all: true } }),
    prisma.car.findMany({ select: { id: true, category: true } }),
  ]);
  const catOf = new Map(cars.map((c) => [c.id, c.category]));
  const cat = new Map<string, number>();
  for (const r of byCar) cat.set(catOf.get(r.carId) ?? "UNKNOWN", (cat.get(catOf.get(r.carId) ?? "UNKNOWN") ?? 0) + r._count._all);
  return {
    totalBookings: total,
    totalRevenue: Number(revenue._sum.totalAmount ?? 0),
    pendingPayments: { count: pending._count, amount: Number(pending._sum.totalAmount ?? 0) },
    completedTrips: completed,
    cancelledBookings: cancelled,
    popularRoutes: routes.map((r) => ({ route: `${r.pickupLocation.split(",")[0]} → ${r.dropLocation.split(",")[0]}`, bookings: r._count._all })),
    categoryBookings: [...cat].map(([category, bookings]) => ({ category, bookings })).sort((a, b) => b.bookings - a.bookings),
  };
}
