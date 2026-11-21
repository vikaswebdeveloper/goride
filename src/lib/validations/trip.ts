import { z } from "zod";
import { businessConfig } from "@/config/site";
import { addDays, nowIST, parseHHmm } from "@/utils/dates";
import { dateStr, indianPhone, timeStr } from "./common";

const journeyType = z.enum(["ONE_WAY", "ROUND_TRIP"]);

type TripFields = { journeyType: "ONE_WAY" | "ROUND_TRIP"; pickupDate: string; pickupTime: string; returnDate?: string; fromId?: string; toId?: string };

/** Business rules shared by search, estimate and booking creation (1, 2, plus lead time & horizon). */
export function validateTripRules(v: TripFields, ctx: z.RefinementCtx, now: Date = new Date()) {
  const ist = nowIST(now);
  if (v.pickupDate < ist.date) {
    ctx.addIssue({ code: "custom", path: ["pickupDate"], message: "Pickup date cannot be in the past" });
  } else if (v.pickupDate === ist.date && parseHHmm(v.pickupTime) < ist.minutes + businessConfig.minLeadHours * 60) {
    ctx.addIssue({ code: "custom", path: ["pickupTime"], message: `Pickup must be at least ${businessConfig.minLeadHours} hours from now` });
  }
  if (v.pickupDate > addDays(ist.date, businessConfig.maxAdvanceDays)) {
    ctx.addIssue({ code: "custom", path: ["pickupDate"], message: `Bookings open up to ${businessConfig.maxAdvanceDays} days ahead` });
  }
  if (v.journeyType === "ROUND_TRIP") {
    if (!v.returnDate) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Return date is required for round trips" });
    else if (v.returnDate < v.pickupDate) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Return date cannot be before pickup date" });
    else if (v.returnDate > addDays(v.pickupDate, 30)) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Round trips can be at most 30 days" });
  } else if (v.returnDate) {
    ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Return date applies to round trips only" });
  }
  if (v.fromId && v.fromId === v.toId) {
    ctx.addIssue({ code: "custom", path: ["toId"], message: "Pickup and drop locations must be different" });
  }
}

export const tripFields = {
  fromId: z.string().min(1, "Select a pickup location").max(200),
  toId: z.string().min(1, "Select a destination").max(200),
  journeyType,
  pickupDate: dateStr,
  returnDate: dateStr.optional().or(z.literal("").transform(() => undefined)),
  pickupTime: timeStr,
};

export const tripSchema = z.object(tripFields).superRefine((v, ctx) => validateTripRules(v, ctx));

export const customerFields = {
  passengerCount: z.coerce.number().int().min(1, "At least 1 passenger").max(businessConfig.maxPassengersPerBooking),
  customerName: z.string().trim().min(2, "Enter your full name").max(80),
  customerPhone: indianPhone,
  customerEmail: z.email("Enter a valid email").trim().toLowerCase(),
  notes: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  acceptTerms: z.literal(true, { error: "You must accept the terms and cancellation policy" }),
};

export const bookingCreateSchema = z
  .object({
    ...tripFields,
    carId: z.string().min(1),
    ...customerFields,
    couponCode: z.string().trim().toUpperCase().max(32).optional().or(z.literal("").transform(() => undefined)),
  })
  .superRefine((v, ctx) => validateTripRules(v, ctx));

export const carListQuery = z.object({
  ...tripFields,
  sort: z.enum(["price_asc", "price_desc", "seats"]).default("price_asc"),
  category: z.enum(["HATCHBACK", "SEDAN", "SUV", "PREMIUM_SUV", "LUXURY"]).optional(),
  minSeats: z.coerce.number().int().min(1).max(20).optional(),
}).superRefine((v, ctx) => validateTripRules(v, ctx));

export type TripInput = z.infer<typeof tripSchema>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
