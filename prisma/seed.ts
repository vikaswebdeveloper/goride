// Seeds DEMO data (cars, demo pricing, fleet capacity, popular routes, a coupon and the admin account).
// Safe to re-run (idempotent upserts). Admin credentials come from the environment – nothing is hardcoded.
import bcrypt from "bcryptjs";
import { PrismaClient, type CarCategory, type FuelType, type Transmission } from "@prisma/client";

const prisma = new PrismaClient();

const cars: { brand: string; model: string; category: CarCategory; img: string; seats: number; bags: number; trans: Transmission; fuel: FuelType }[] = [
  { brand: "Maruti Suzuki", model: "Swift", category: "HATCHBACK", img: "swift", seats: 4, bags: 2, trans: "MANUAL", fuel: "PETROL" },
  { brand: "Maruti Suzuki", model: "Dzire", category: "SEDAN", img: "dzire", seats: 4, bags: 3, trans: "MANUAL", fuel: "CNG" },
  { brand: "Hyundai", model: "Aura", category: "SEDAN", img: "aura", seats: 4, bags: 3, trans: "MANUAL", fuel: "PETROL" },
  { brand: "Honda", model: "Amaze", category: "SEDAN", img: "amaze", seats: 4, bags: 3, trans: "AUTOMATIC", fuel: "PETROL" },
  { brand: "Maruti Suzuki", model: "Ertiga", category: "SUV", img: "ertiga", seats: 6, bags: 3, trans: "MANUAL", fuel: "PETROL" },
  { brand: "Kia", model: "Carens", category: "SUV", img: "carens", seats: 6, bags: 3, trans: "MANUAL", fuel: "DIESEL" },
  { brand: "Toyota", model: "Innova Crysta", category: "PREMIUM_SUV", img: "innova", seats: 6, bags: 4, trans: "MANUAL", fuel: "DIESEL" },
  { brand: "Toyota", model: "Fortuner", category: "LUXURY", img: "fortuner", seats: 6, bags: 4, trans: "AUTOMATIC", fuel: "DIESEL" },
];

// DEMO pricing only – not real tariffs.
const rules: { category: CarCategory; base: number; perKm: number; allowance: number; min: number; capacity: number }[] = [
  { category: "HATCHBACK", base: 300, perKm: 9, allowance: 300, min: 1500, capacity: 6 },
  { category: "SEDAN", base: 300, perKm: 11, allowance: 350, min: 1800, capacity: 6 },
  { category: "SUV", base: 450, perKm: 15, allowance: 450, min: 2800, capacity: 4 },
  { category: "PREMIUM_SUV", base: 600, perKm: 19, allowance: 500, min: 3800, capacity: 3 },
  { category: "LUXURY", base: 1200, perKm: 32, allowance: 800, min: 6500, capacity: 2 },
];

const routes: [string, string, number, number][] = [
  ["Delhi", "Jaipur", 280, 300], ["Delhi", "Agra", 230, 225], ["Delhi", "Chandigarh", 250, 245],
  ["Delhi", "Dehradun", 250, 300], ["Mumbai", "Pune", 150, 180], ["Bangalore", "Mysore", 150, 180],
  ["Hyderabad", "Vijayawada", 275, 270],
];

async function main() {
  for (const c of cars) {
    await prisma.car.upsert({
      where: { brand_model: { brand: c.brand, model: c.model } },
      update: {},
      create: {
        brand: c.brand, model: c.model, category: c.category, imageUrl: `/cars/${c.img}.svg`,
        seatingCapacity: c.seats, luggageCapacity: c.bags, transmission: c.trans, fuelType: c.fuel, isAC: true,
      },
    });
  }
  for (const r of rules) {
    await prisma.pricingRule.upsert({
      where: { carCategory: r.category },
      update: {},
      create: { carCategory: r.category, baseFare: r.base, pricePerKm: r.perKm, driverAllowance: r.allowance, minimumFare: r.min, minKmPerDay: 250, oneWayReturnFactor: 1 },
    });
    await prisma.fleetInventory.upsert({ where: { category: r.category }, update: {}, create: { category: r.category, dailyCapacity: r.capacity } });
  }
  for (const [i, [fromCity, toCity, distanceKm, durationMins]] of routes.entries()) {
    await prisma.popularRoute.upsert({
      where: { fromCity_toCity: { fromCity, toCity } },
      update: {},
      create: { fromCity, toCity, distanceKm, durationMins, sortOrder: i },
    });
  }
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", percentOff: 10, maxDiscount: 500, validUntil: new Date("2028-12-31T23:59:59Z") },
  });

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set – skipping admin account.");
  } else if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  } else {
    await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN" },
      create: { email, name: "GoRide Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Admin account ready: ${email}`);
  }
  console.log("Seed complete (demo pricing – replace before launch).");
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
