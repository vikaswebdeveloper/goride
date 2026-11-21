import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerSchema } from "@/lib/validations/auth";
import { bookingCreateSchema, tripSchema } from "@/lib/validations/trip";
import { addDays, nowIST } from "@/utils/dates";

const NOW = new Date("2030-06-15T06:30:00Z"); // 12:00 IST
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

const today = () => nowIST().date;
const trip = (o: Record<string, unknown> = {}) => ({
  fromId: "delhi", toId: "jaipur", journeyType: "ONE_WAY", pickupDate: addDays(today(), 3), pickupTime: "09:00", ...o,
});

describe("trip validation", () => {
  it("accepts a valid one-way trip", () => expect(tripSchema.safeParse(trip()).success).toBe(true));
  it("rejects past dates", () => expect(tripSchema.safeParse(trip({ pickupDate: addDays(today(), -1) })).success).toBe(false));
  it("rejects a pickup time too close to now on the same day", () => {
    expect(tripSchema.safeParse(trip({ pickupDate: today(), pickupTime: "13:00" })).success).toBe(false);
    expect(tripSchema.safeParse(trip({ pickupDate: today(), pickupTime: "15:00" })).success).toBe(true);
  });
  it("requires a return date on round trips and forbids it on one-way", () => {
    expect(tripSchema.safeParse(trip({ journeyType: "ROUND_TRIP" })).success).toBe(false);
    expect(tripSchema.safeParse(trip({ returnDate: addDays(today(), 5) })).success).toBe(false);
  });
  it("rejects a return date before pickup", () => {
    expect(tripSchema.safeParse(trip({ journeyType: "ROUND_TRIP", returnDate: addDays(today(), 2) })).success).toBe(false);
    expect(tripSchema.safeParse(trip({ journeyType: "ROUND_TRIP", returnDate: addDays(today(), 5) })).success).toBe(true);
  });
  it("rejects identical pickup and drop", () => expect(tripSchema.safeParse(trip({ toId: "delhi" })).success).toBe(false));
});

describe("booking validation", () => {
  const body = (o: Record<string, unknown> = {}) => ({
    ...trip(), carId: "c1", passengerCount: 3, customerName: "Asha Rao", customerPhone: "98765 43210",
    customerEmail: "Asha@Example.com", acceptTerms: true, ...o,
  });
  it("normalises phone & email", () => {
    const r = bookingCreateSchema.parse(body());
    expect(r.customerPhone).toBe("+919876543210");
    expect(r.customerEmail).toBe("asha@example.com");
  });
  it("rejects invalid phones", () => {
    expect(bookingCreateSchema.safeParse(body({ customerPhone: "12345" })).success).toBe(false);
    expect(bookingCreateSchema.safeParse(body({ customerPhone: "5876543210" })).success).toBe(false);
  });
  it("requires terms acceptance", () => expect(bookingCreateSchema.safeParse(body({ acceptTerms: false })).success).toBe(false));
});

describe("register validation", () => {
  it("rejects weak passwords", () => {
    expect(registerSchema.safeParse({ name: "Asha", email: "a@b.co", password: "abcdefgh" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Asha", email: "a@b.co", password: "abcdefg1" }).success).toBe(true);
  });
  it("ignores role escalation attempts", () => {
    const r = registerSchema.parse({ name: "Asha", email: "a@b.co", password: "abcdefg1", role: "ADMIN" });
    expect("role" in r).toBe(false);
  });
});
