import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FareBreakdownView } from "@/components/booking/fare-breakdown";
import { CarSpecs } from "@/components/cars/car-specs";
import { BookingActions } from "@/components/dashboard/booking-actions";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/dashboard/status-badge";
import { categoryLabels } from "@/config/site";
import { requireUserPage } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { cancellationQuote, getOwnedBooking } from "@/services/booking.service";
import { isMockPayments } from "@/services/payment/provider";
import type { FareBreakdown } from "@/services/pricing.engine";
import { formatDateDisplay, formatDuration, formatTimeDisplay, fromDateOnly, minutesUntil } from "@/utils/dates";
import { formatINR } from "@/utils/money";

export const metadata: Metadata = { title: "Booking details" };

export default async function BookingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ confirmed?: string }> }) {
  const { id } = await params;
  const { confirmed } = await searchParams;
  const user = await requireUserPage(`/bookings/${id}`);

  let b;
  try {
    b = await getOwnedBooking(user, id); // 404s for other customers' bookings
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const fare = b.fareSnapshot as unknown as FareBreakdown;
  const paid = b.paymentStatus === "PAID";
  const payment = b.payments.find((p) => p.paymentStatus === "PAID" || p.paymentStatus === "REFUNDED" || p.paymentStatus === "REFUND_PENDING") ?? b.payments[0];
  const showSuccess = confirmed === "1" && b.bookingStatus === "CONFIRMED";
  const holdLeftMins = b.holdExpiresAt ? minutesUntil(b.holdExpiresAt) : 0;
  const canPay = (b.bookingStatus === "PENDING_PAYMENT" && !paid) || (b.bookingStatus === "EXPIRED" && b.paymentStatus !== "PAID" && b.paymentStatus !== "REFUNDED" && b.paymentStatus !== "REFUND_PENDING");
  const canCancel = (b.bookingStatus === "CONFIRMED" || b.bookingStatus === "PENDING_PAYMENT");
  const quote = canCancel && paid ? cancellationQuote(b) : null;
  const pickup = `${formatDateDisplay(fromDateOnly(b.pickupDate))}, ${formatTimeDisplay(b.pickupTime)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/bookings" className="text-sm text-muted-foreground hover:text-foreground">← My bookings</Link>

      {showSuccess && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
          <div>
            <h2 className="text-lg font-bold">Booking confirmed!</h2>
            <p className="text-sm">Payment received. Your booking reference is <b className="font-mono">{b.bookingReference}</b>. A confirmation email is sent if email is configured.</p>
          </div>
        </div>
      )}
      {b.bookingStatus === "PENDING_PAYMENT" && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Clock3 className="mt-0.5 size-5 shrink-0" />
          <p>{b.paymentStatus === "FAILED" ? "Your last payment attempt failed. " : "Payment is pending. "}Complete payment to confirm — your slot is held for about <b>{holdLeftMins} min</b>.</p>
        </div>
      )}
      {b.bookingStatus === "EXPIRED" && b.paymentStatus === "REFUNDED" && (
        <p className="mt-4 rounded-2xl border bg-card p-4 text-sm">The vehicle became unavailable before your payment could be confirmed, so it has been refunded in full.</p>
      )}

      <div className="mt-4 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-muted-foreground">{b.bookingReference}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
              {b.pickupLocation.split(",")[0]} <ArrowRight className="size-5 text-primary" /> {b.dropLocation.split(",")[0]}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2"><BookingStatusBadge status={b.bookingStatus} /><PaymentStatusBadge status={b.paymentStatus} /></div>
        </div>

        <dl className="mt-6 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <Row label="Customer" value={`${b.customerName} · ${b.customerPhone}`} />
          <Row label="Email" value={b.customerEmail} />
          <Row label="Pickup" value={pickup} />
          {b.returnDate && <Row label="Return date" value={formatDateDisplay(fromDateOnly(b.returnDate))} />}
          <Row label="Pickup location" value={b.pickupLocation} />
          <Row label="Drop location" value={b.dropLocation} />
          <Row label="Journey" value={`${b.journeyType === "ROUND_TRIP" ? "Round trip" : "One way"} · ~${Number(b.estimatedDistance)} km · ~${formatDuration(b.estimatedDuration)}`} />
          <Row label="Passengers" value={String(b.passengerCount)} />
          {b.notes && <Row label="Instructions" value={b.notes} />}
        </dl>

        <div className="mt-6 border-t pt-5">
          <p className="font-semibold">{b.car.brand} {b.car.model} <span className="text-sm font-normal text-muted-foreground">or similar · {categoryLabels[b.car.category]}</span></p>
          <CarSpecs car={b.car} className="mt-2" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-4 font-semibold">Fare breakdown</h2>
          <FareBreakdownView fare={fare} isEstimate={false} totalLabel={paid ? "Total paid" : "Total payable"} />
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-4 font-semibold">Payment</h2>
          {payment ? (
            <dl className="space-y-3 text-sm">
              <Row label="Status" value={<PaymentStatusBadge status={b.paymentStatus} />} />
              <Row label="Amount" value={formatINR(b.totalAmount.toString(), { decimals: true })} />
              <Row label="Method" value={payment.paymentMethod ?? "—"} />
              <Row label="Order ID" value={<span className="font-mono text-xs">{payment.razorpayOrderId}</span>} />
              {payment.razorpayPaymentId && <Row label="Payment ID" value={<span className="font-mono text-xs">{payment.razorpayPaymentId}</span>} />}
              {b.refundAmount && <Row label="Refund" value={formatINR(b.refundAmount.toString(), { decimals: true })} />}
            </dl>
          ) : <p className="text-sm text-muted-foreground">No payment started yet.</p>}
        </section>
      </div>

      <div className="mt-6">
        <BookingActions
          bookingId={b.id}
          description={`${b.pickupLocation} → ${b.dropLocation}`}
          canPay={canPay}
          canCancel={canCancel}
          hasInvoice={paid || b.paymentStatus === "REFUNDED" || b.paymentStatus === "REFUND_PENDING"}
          totalAmount={Number(b.totalAmount)}
          wasPaid={paid}
          quote={quote}
          mockPayments={isMockPayments()}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
