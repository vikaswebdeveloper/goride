// Pure booking lifecycle rules (status machine + cancellation refund policy).
import type { BookingStatus } from "@prisma/client";
import { businessConfig } from "@/config/site";
import { fromPaise, toPaise } from "@/utils/money";

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  // A payment that lands after the hold expired may revive the booking, but only after an availability re-check.
  EXPIRED: ["CONFIRMED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedTransitions(from: BookingStatus): BookingStatus[] {
  return TRANSITIONS[from];
}

export type RefundQuote = { refundPercent: number; refundAmount: number; label: string; hoursBeforePickup: number };

export function computeRefund(totalAmount: number | string, pickupAt: Date, now: Date = new Date()): RefundQuote {
  const hours = (pickupAt.getTime() - now.getTime()) / 3_600_000;
  const tier = businessConfig.cancellationPolicy.find((t) => hours >= t.minHoursBefore) ?? businessConfig.cancellationPolicy.at(-1)!;
  const refundP = Math.floor((toPaise(totalAmount) * tier.refundPercent) / 100);
  return { refundPercent: tier.refundPercent, refundAmount: fromPaise(refundP), label: tier.label, hoursBeforePickup: Math.max(0, Math.round(hours * 10) / 10) };
}
