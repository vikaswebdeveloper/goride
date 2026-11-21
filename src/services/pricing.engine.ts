// Pure fare calculation. No I/O, no framework imports => trivially unit-testable.
// All arithmetic in integer paise; outputs are rupee numbers with 2 decimals.
import { fromPaise, toPaise } from "@/utils/money";
import { inclusiveDays } from "@/utils/dates";

export type JourneyType = "ONE_WAY" | "ROUND_TRIP";

export type RuleInput = {
  baseFare: number | string;
  pricePerKm: number | string;
  driverAllowance: number | string; // per day
  minimumFare: number | string;
  minKmPerDay: number;
  oneWayReturnFactor: number | string;
};

export type FareInput = {
  journeyType: JourneyType;
  distanceKm: number;
  pickupDate: string;
  returnDate?: string | null;
  crossesState: boolean;
  rule: RuleInput;
  gstRatePercent: number;
  interstateChargePerState: number;
  coupon?: { code: string; percentOff: number; maxDiscount: number | string } | null;
};

export type FareLine = { key: string; label: string; amount: number; note?: string };

export type FareBreakdown = {
  journeyType: JourneyType;
  distanceKm: number;
  billableKm: number;
  days: number;
  includedKm: number;
  extraKmRate: number;
  baseFare: number;
  distanceCharge: number;
  driverAllowance: number;
  stateCharges: number;
  additionalCharges: number; // driver allowance + state charges
  subtotal: number;
  discount: number;
  couponCode: string | null;
  taxableAmount: number;
  gstRatePercent: number;
  taxes: number;
  totalAmount: number;
  minimumFareApplied: boolean;
  lines: FareLine[];
  tollsIncluded: false;
  currency: "INR";
};

export function calculateFare(input: FareInput): FareBreakdown {
  const { rule, journeyType, distanceKm } = input;
  if (distanceKm <= 0) throw new Error("distanceKm must be positive");

  const isRound = journeyType === "ROUND_TRIP";
  const days = isRound ? inclusiveDays(input.pickupDate, input.returnDate ?? input.pickupDate) : 1;
  if (days < 1) throw new Error("Return date cannot be before pickup date");

  const perKmP = toPaise(rule.pricePerKm);
  const baseP = toPaise(rule.baseFare);
  const minP = toPaise(rule.minimumFare);

  const billableKm = isRound
    ? Math.max(distanceKm * 2, rule.minKmPerDay * days)
    : Math.round(distanceKm * Number(rule.oneWayReturnFactor));

  const kmChargeP = Math.round(billableKm * perKmP);
  const fareP = Math.max(minP, baseP + kmChargeP);
  const minimumFareApplied = minP > baseP + kmChargeP;
  const distanceChargeP = fareP - baseP;

  const allowanceP = toPaise(rule.driverAllowance) * days;
  const stateP = input.crossesState ? toPaise(input.interstateChargePerState) : 0;
  const subtotalP = fareP + allowanceP + stateP;

  let discountP = 0;
  if (input.coupon) {
    discountP = Math.min(Math.round((subtotalP * input.coupon.percentOff) / 100), toPaise(input.coupon.maxDiscount));
  }
  const taxableP = subtotalP - discountP;
  const gstP = Math.round((taxableP * input.gstRatePercent) / 100);
  const totalP = taxableP + gstP;

  const lines: FareLine[] = [
    { key: "base", label: "Base fare", amount: fromPaise(baseP) },
    {
      key: "distance",
      label: `Distance charge (${billableKm} km × ₹${fromPaise(perKmP)}/km)`,
      amount: fromPaise(distanceChargeP),
      note: minimumFareApplied ? "Minimum fare applied" : isRound ? `Billed on ${billableKm} km (min ${rule.minKmPerDay} km/day)` : undefined,
    },
    {
      key: "allowance",
      label: `Driver allowance${days > 1 ? ` (${days} days)` : ""}`,
      amount: fromPaise(allowanceP),
    },
  ];
  if (stateP) lines.push({ key: "state", label: "Interstate permit / state tax", amount: fromPaise(stateP) });
  if (discountP) lines.push({ key: "discount", label: `Discount (${input.coupon!.code})`, amount: -fromPaise(discountP) });
  lines.push({ key: "gst", label: `GST @ ${input.gstRatePercent}%`, amount: fromPaise(gstP) });

  return {
    journeyType, distanceKm, billableKm, days,
    includedKm: billableKm,
    extraKmRate: fromPaise(perKmP),
    baseFare: fromPaise(baseP),
    distanceCharge: fromPaise(distanceChargeP),
    driverAllowance: fromPaise(allowanceP),
    stateCharges: fromPaise(stateP),
    additionalCharges: fromPaise(allowanceP + stateP),
    subtotal: fromPaise(subtotalP),
    discount: fromPaise(discountP),
    couponCode: input.coupon && discountP ? input.coupon.code : null,
    taxableAmount: fromPaise(taxableP),
    gstRatePercent: input.gstRatePercent,
    taxes: fromPaise(gstP),
    totalAmount: fromPaise(totalP),
    minimumFareApplied,
    lines,
    tollsIncluded: false,
    currency: "INR",
  };
}
