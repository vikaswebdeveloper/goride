import { z } from "zod";
import { dateStr, paginationQuery } from "./common";

const category = z.enum(["HATCHBACK", "SEDAN", "SUV", "PREMIUM_SUV", "LUXURY"]);
const money = z.coerce.number().min(0).max(1_000_000);

export const carSchema = z.object({
  brand: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(60),
  category,
  imageUrl: z.string().trim().max(500).refine((v) => v.startsWith("/") || /^https:\/\//.test(v), "Use an https:// URL or a /path"),
  seatingCapacity: z.coerce.number().int().min(2).max(20),
  luggageCapacity: z.coerce.number().int().min(0).max(20),
  transmission: z.enum(["MANUAL", "AUTOMATIC"]),
  fuelType: z.enum(["PETROL", "DIESEL", "CNG", "ELECTRIC"]),
  isAC: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export const carUpdateSchema = carSchema.partial();

export const pricingRuleSchema = z.object({
  carCategory: category,
  baseFare: money,
  pricePerKm: z.coerce.number().min(0).max(1000),
  driverAllowance: money,
  minimumFare: money,
  minKmPerDay: z.coerce.number().int().min(0).max(1000).default(250),
  oneWayReturnFactor: z.coerce.number().min(0.5).max(2).default(1),
  isActive: z.boolean().default(true),
  dailyCapacity: z.coerce.number().int().min(0).max(1000).optional(),
});

export const adminBookingsQuery = paginationQuery.extend({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUND_PENDING", "REFUNDED"]).optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
});

export const adminBookingUpdateSchema = z.object({
  bookingStatus: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED"]),
});

export const popularRouteSchema = z.object({
  fromCity: z.string().trim().min(2).max(60),
  toCity: z.string().trim().min(2).max(60),
  distanceKm: z.coerce.number().int().min(1).max(5000),
  durationMins: z.coerce.number().int().min(1).max(10_000),
  imageUrl: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
