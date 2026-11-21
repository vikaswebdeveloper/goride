import { ArrowRight, Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { BookingStatus, PaymentStatus } from "@prisma/client";
import { formatDateDisplay, formatTimeDisplay, fromDateOnly } from "@/utils/dates";
import { formatINR } from "@/utils/money";
import { BookingStatusBadge, PaymentStatusBadge } from "./status-badge";

export type BookingCardData = {
  id: string; bookingReference: string; pickupLocation: string; dropLocation: string; pickupDate: Date | string; pickupTime: string;
  totalAmount: { toString(): string } | number | string; bookingStatus: BookingStatus; paymentStatus: PaymentStatus;
  car: { brand: string; model: string };
};

export function BookingCard({ b }: { b: BookingCardData }) {
  const date = formatDateDisplay(fromDateOnly(new Date(b.pickupDate)));
  return (
    <Link href={`/bookings/${b.id}`} className="group block rounded-2xl border bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {b.pickupLocation.split(",")[0]} <ArrowRight className="size-4 text-primary" /> {b.dropLocation.split(",")[0]}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="size-3.5" /> {date}, {formatTimeDisplay(b.pickupTime)}</span>
            <span>{b.car.brand} {b.car.model}</span>
          </p>
        </div>
        <p className="text-lg font-bold">{formatINR(b.totalAmount.toString(), { decimals: true })}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <BookingStatusBadge status={b.bookingStatus} />
          <PaymentStatusBadge status={b.paymentStatus} />
          <span className="font-mono text-xs text-muted-foreground">{b.bookingReference}</span>
        </div>
        <span className="flex items-center text-sm font-medium text-primary">Details <ChevronRight className="size-4 transition group-hover:translate-x-0.5" /></span>
      </div>
    </Link>
  );
}
