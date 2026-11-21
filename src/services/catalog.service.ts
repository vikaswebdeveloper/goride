import { unstable_cache } from "next/cache";
import { businessConfig } from "@/config/site";
import { prisma } from "@/lib/prisma";
import { nowIST } from "@/utils/dates";
import { calculateFare } from "./pricing.engine";
import { CITIES } from "./location/cities";

const cityId = (name: string) => CITIES.find((c) => c.name === name)?.id ?? null;
const cityState = (name: string) => CITIES.find((c) => c.name === name)?.state;

/** Popular routes with an indicative one-way starting price (cheapest active category), computed by the pricing engine. */
async function loadPopularRoutes() {
  const [routes, rules] = await Promise.all([
    prisma.popularRoute.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.pricingRule.findMany({ where: { isActive: true } }),
  ]);
  const today = nowIST().date;
  return routes.map((r) => {
    const fares = rules.map((rule) =>
      calculateFare({
        journeyType: "ONE_WAY", distanceKm: r.distanceKm, pickupDate: today, crossesState: cityState(r.fromCity) !== cityState(r.toCity),
        rule: {
          baseFare: rule.baseFare.toString(), pricePerKm: rule.pricePerKm.toString(), driverAllowance: rule.driverAllowance.toString(),
          minimumFare: rule.minimumFare.toString(), minKmPerDay: rule.minKmPerDay, oneWayReturnFactor: rule.oneWayReturnFactor.toString(),
        },
        gstRatePercent: businessConfig.gstRatePercent, interstateChargePerState: businessConfig.interstateChargePerState,
      }).totalAmount,
    );
    return {
      id: r.id, fromCity: r.fromCity, toCity: r.toCity, distanceKm: r.distanceKm, durationMins: r.durationMins,
      imageUrl: r.imageUrl, fromId: cityId(r.fromCity), toId: cityId(r.toCity),
      startingPrice: fares.length ? Math.min(...fares) : null,
    };
  });
}

export const getPopularRoutes = unstable_cache(loadPopularRoutes, ["popular-routes"], { revalidate: 300, tags: ["popular-routes"] });

async function loadCatalogCars() {
  const [cars, rules] = await Promise.all([
    prisma.car.findMany({ where: { isActive: true }, orderBy: [{ category: "asc" }, { brand: "asc" }] }),
    prisma.pricingRule.findMany({ where: { isActive: true } }),
  ]);
  const ruleBy = new Map(rules.map((r) => [r.carCategory, r]));
  return cars.map((c) => {
    const r = ruleBy.get(c.category);
    const start = r ? Math.round(((Math.max(Number(r.minimumFare), Number(r.baseFare)) + Number(r.driverAllowance)) * (100 + businessConfig.gstRatePercent)) / 100) : null;
    return { ...c, pricePerKm: r ? Number(r.pricePerKm) : null, startingPrice: start };
  });
}

export const getCatalogCars = unstable_cache(loadCatalogCars, ["catalog-cars"], { revalidate: 300, tags: ["catalog-cars"] });
