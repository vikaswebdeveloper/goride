import type { CarCategory, Prisma, PrismaClient } from "@prisma/client";
import { addDays, fromDateOnly, inclusiveDays, toDateOnly } from "@/utils/dates";

type Db = PrismaClient | Prisma.TransactionClient;

export const ALL_CATEGORIES: CarCategory[] = ["HATCHBACK", "SEDAN", "SUV", "PREMIUM_SUV", "LUXURY"];

/**
 * Fleet model (MVP): each category has a configurable `dailyCapacity` of vehicles.
 * A booking occupies one unit for every day in [pickupDate, returnDate ?? pickupDate].
 * Unpaid bookings hold a unit until `holdExpiresAt`.
 * Replace with real Vehicle/Driver assignment later without changing callers.
 */
export async function remainingByCategory(
  db: Db,
  startDate: string,
  endDate: string | null,
  opts: { excludeBookingId?: string; now?: Date } = {},
): Promise<Record<CarCategory, number>> {
  const end = endDate ?? startDate;
  const now = opts.now ?? new Date();
  const [inventory, bookings] = await Promise.all([
    db.fleetInventory.findMany(),
    db.booking.findMany({
      where: {
        id: opts.excludeBookingId ? { not: opts.excludeBookingId } : undefined,
        OR: [{ bookingStatus: "CONFIRMED" }, { bookingStatus: "PENDING_PAYMENT", holdExpiresAt: { gt: now } }],
        pickupDate: { lte: toDateOnly(end) },
        AND: [{ OR: [{ returnDate: { gte: toDateOnly(startDate) } }, { returnDate: null, pickupDate: { gte: toDateOnly(startDate) } }] }],
      },
      select: { pickupDate: true, returnDate: true, car: { select: { category: true } } },
    }),
  ]);

  const dayCount = inclusiveDays(startDate, end);
  const result = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])) as Record<CarCategory, number>;
  for (const inv of inventory) {
    let peak = 0;
    for (let i = 0; i < dayCount; i++) {
      const day = addDays(startDate, i);
      const used = bookings.filter((b) => {
        if (b.car.category !== inv.category) return false;
        const s = fromDateOnly(b.pickupDate);
        const e = b.returnDate ? fromDateOnly(b.returnDate) : s;
        return s <= day && day <= e;
      }).length;
      peak = Math.max(peak, used);
    }
    result[inv.category] = Math.max(0, inv.dailyCapacity - peak);
  }
  return result;
}

/** Serialises concurrent bookings for a category: take this inside a transaction before counting. */
export async function lockCategory(tx: Prisma.TransactionClient, category: CarCategory): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "FleetInventory" WHERE category = ${category}::"CarCategory" FOR UPDATE`;
}
