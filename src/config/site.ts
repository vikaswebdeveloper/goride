// Branding and business-policy configuration. Change here to re-brand / retune.
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "GoRide India",
  shortName: "GoRide",
  tagline: "Your Journey, Your Way.",
  description: "Book comfortable and affordable outstation rides across India.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@goride.example",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "+91 98000 00000",
  legalName: "GoRide Mobility Pvt. Ltd. (demo)",
  gstin: "29ABCDE1234F1Z5 (demo)",
};

export const businessConfig = {
  gstRatePercent: 5, // GST on passenger transport by cab
  interstateChargePerState: 400, // INR flat, state entry / permit charge per cross-border trip
  holdMinutes: 15, // inventory hold for unpaid bookings
  minLeadHours: 2, // earliest pickup from "now"
  maxAdvanceDays: 180,
  avgSpeedKmph: 55,
  maxPassengersPerBooking: 12,
  // Cancellation refunds, evaluated top-to-bottom against hours before pickup.
  cancellationPolicy: [
    { minHoursBefore: 24, refundPercent: 90, label: "More than 24 hours before pickup" },
    { minHoursBefore: 6, refundPercent: 50, label: "6 to 24 hours before pickup" },
    { minHoursBefore: 0, refundPercent: 0, label: "Less than 6 hours before pickup" },
  ],
  tollsNote: "Toll, parking and state-border charges (if any) beyond those listed are payable directly to the driver.",
} as const;

export const categoryLabels = {
  HATCHBACK: "Hatchback",
  SEDAN: "Sedan",
  SUV: "SUV",
  PREMIUM_SUV: "Premium SUV",
  LUXURY: "Luxury",
} as const;
