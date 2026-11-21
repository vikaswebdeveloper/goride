import { describe, expect, it } from "vitest";
import { calculateFare, type FareInput } from "@/services/pricing.engine";

const sedan = { baseFare: 300, pricePerKm: 11, driverAllowance: 350, minimumFare: 1800, minKmPerDay: 250, oneWayReturnFactor: 1 };
const base: FareInput = {
  journeyType: "ONE_WAY", distanceKm: 280, pickupDate: "2030-01-10", crossesState: false,
  rule: sedan, gstRatePercent: 5, interstateChargePerState: 400,
};

describe("pricing engine – one way", () => {
  it("computes base + km + allowance + GST", () => {
    const f = calculateFare(base);
    expect(f.distanceCharge).toBe(3080);
    expect(f.subtotal).toBe(300 + 3080 + 350);
    expect(f.taxes).toBe(186.5);
    expect(f.totalAmount).toBe(3916.5);
  });
  it("applies the minimum fare on short trips", () => {
    const f = calculateFare({ ...base, distanceKm: 40 });
    expect(f.minimumFareApplied).toBe(true);
    expect(f.baseFare + f.distanceCharge).toBe(1800);
  });
  it("adds the interstate charge only when crossing states", () => {
    expect(calculateFare({ ...base, crossesState: true }).stateCharges).toBe(400);
    expect(calculateFare(base).stateCharges).toBe(0);
  });
  it("applies a capped coupon before GST", () => {
    const f = calculateFare({ ...base, coupon: { code: "WELCOME10", percentOff: 10, maxDiscount: 100 } });
    expect(f.discount).toBe(100);
    expect(f.taxableAmount).toBe(3730 - 100);
    expect(f.couponCode).toBe("WELCOME10");
  });
  it("never lets lines drift from the total", () => {
    const f = calculateFare({ ...base, crossesState: true, coupon: { code: "X", percentOff: 7, maxDiscount: 9999 } });
    const sum = f.lines.reduce((s, l) => s + l.amount, 0);
    expect(Math.round(sum * 100)).toBe(Math.round(f.totalAmount * 100));
  });
  it("rejects non-positive distance", () => {
    expect(() => calculateFare({ ...base, distanceKm: 0 })).toThrow();
  });
});

describe("pricing engine – round trip", () => {
  const rt = { ...base, journeyType: "ROUND_TRIP" as const, pickupDate: "2030-01-10", returnDate: "2030-01-12" };
  it("bills the larger of 2×distance and min km/day, with allowance per day", () => {
    const f = calculateFare(rt); // 3 days -> min 750km, 2×280=560 => 750
    expect(f.days).toBe(3);
    expect(f.billableKm).toBe(750);
    expect(f.driverAllowance).toBe(1050);
  });
  it("uses 2×distance when it exceeds the daily minimum", () => {
    const f = calculateFare({ ...rt, returnDate: "2030-01-10", distanceKm: 400 });
    expect(f.days).toBe(1);
    expect(f.billableKm).toBe(800);
  });
  it("rejects a return date before pickup", () => {
    expect(() => calculateFare({ ...rt, returnDate: "2030-01-09" })).toThrow();
  });
});
