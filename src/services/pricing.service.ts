import type { Car, CarCategory, Prisma, PrismaClient } from "@prisma/client";
import { businessConfig } from "@/config/site";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { TripInput } from "@/lib/validations/trip";
import { remainingByCategory } from "./availability.service";
import { resolveRoute, type Place, type RouteInfo } from "./location.service";
import { calculateFare, type FareBreakdown } from "./pricing.engine";

type Db = PrismaClient | Prisma.TransactionClient;

export type ResolvedTrip = { from: Place; to: Place; route: RouteInfo };

export async function loadCoupon(db: Db, code: string | undefined | null) {
  if (!code) return null;
  const c = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!c || !c.isActive || c.validUntil < new Date()) throw new AppError("VALIDATION_ERROR", "This coupon is invalid or has expired.");
  return { code: c.code, percentOff: c.percentOff, maxDiscount: c.maxDiscount.toString() };
}

export function fareFor(
  trip: Pick<TripInput, "journeyType" | "pickupDate" | "returnDate">,
  resolved: ResolvedTrip,
  rule: Prisma.PricingRuleGetPayload<object>,
  coupon: Awaited<ReturnType<typeof loadCoupon>>,
): FareBreakdown {
  return calculateFare({
    journeyType: trip.journeyType,
    distanceKm: resolved.route.distanceKm,
    pickupDate: trip.pickupDate,
    returnDate: trip.returnDate,
    crossesState: resolved.from.state !== resolved.to.state,
    rule: {
      baseFare: rule.baseFare.toString(), pricePerKm: rule.pricePerKm.toString(),
      driverAllowance: rule.driverAllowance.toString(), minimumFare: rule.minimumFare.toString(),
      minKmPerDay: rule.minKmPerDay, oneWayReturnFactor: rule.oneWayReturnFactor.toString(),
    },
    gstRatePercent: businessConfig.gstRatePercent,
    interstateChargePerState: businessConfig.interstateChargePerState,
    coupon,
  });
}

export async function getRule(db: Db, category: CarCategory) {
  const rule = await db.pricingRule.findUnique({ where: { carCategory: category } });
  if (!rule || !rule.isActive) throw new AppError("UNAVAILABLE", "This vehicle category is not available for pricing right now.");
  return rule;
}

export type CarQuote = {
  car: Pick<Car, "id" | "model" | "brand" | "category" | "imageUrl" | "seatingCapacity" | "luggageCapacity" | "transmission" | "fuelType" | "isAC">;
  fare: FareBreakdown;
  unitsLeft: number;
};

export type TripQuotes = {
  from: Place; to: Place; route: RouteInfo;
  quotes: CarQuote[];
  disclaimer: string;
};

/** Search results: every priced, available car for a trip. One query per table (no N+1). */
export async function quoteTrip(
  trip: TripInput,
  filters: { category?: CarCategory; minSeats?: number; sort?: "price_asc" | "price_desc" | "seats" } = {},
): Promise<TripQuotes> {
  const resolved = await resolveRoute(trip.fromId, trip.toId);
  const [cars, rules, remaining] = await Promise.all([
    prisma.car.findMany({
      where: { isActive: true, category: filters.category, seatingCapacity: filters.minSeats ? { gte: filters.minSeats } : undefined },
    }),
    prisma.pricingRule.findMany({ where: { isActive: true } }),
    remainingByCategory(prisma, trip.pickupDate, trip.returnDate ?? null),
  ]);
  const ruleBy = new Map(rules.map((r) => [r.carCategory, r]));

  const quotes: CarQuote[] = cars
    .filter((c) => ruleBy.has(c.category) && remaining[c.category] > 0)
    .map((c) => ({
      car: {
        id: c.id, model: c.model, brand: c.brand, category: c.category, imageUrl: c.imageUrl,
        seatingCapacity: c.seatingCapacity, luggageCapacity: c.luggageCapacity,
        transmission: c.transmission, fuelType: c.fuelType, isAC: c.isAC,
      },
      fare: fareFor(trip, resolved, ruleBy.get(c.category)!, null),
      unitsLeft: remaining[c.category],
    }));

  const sort = filters.sort ?? "price_asc";
  quotes.sort((a, b) =>
    sort === "price_desc" ? b.fare.totalAmount - a.fare.totalAmount
    : sort === "seats" ? b.car.seatingCapacity - a.car.seatingCapacity || a.fare.totalAmount - b.fare.totalAmount
    : a.fare.totalAmount - b.fare.totalAmount);

  return {
    ...resolved,
    quotes,
    disclaimer: resolved.route.isEstimate
      ? "Distance and fares are estimates based on approximate road distance. Final amount is locked when you book."
      : "Fares are estimates. Tolls and parking are payable separately.",
  };
}

/** Quote for one specific car (checkout page + booking creation). */
export async function quoteCar(trip: TripInput, carId: string, couponCode?: string) {
  const resolved = await resolveRoute(trip.fromId, trip.toId);
  const car = await prisma.car.findUnique({ where: { id: carId } });
  if (!car || !car.isActive) throw new AppError("NOT_FOUND", "Vehicle not found.");
  const rule = await getRule(prisma, car.category);
  const coupon = await loadCoupon(prisma, couponCode);
  return { ...resolved, car, fare: fareFor(trip, resolved, rule, coupon) };
}
