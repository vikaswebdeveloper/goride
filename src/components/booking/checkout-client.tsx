"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CalendarDays, Check, Loader2, Lock, MapPin, Tag, TicketPercent } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CarSpecs } from "@/components/cars/car-specs";
import { usePayment } from "@/components/payment/use-payment";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { businessConfig, categoryLabels } from "@/config/site";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { customerFields } from "@/lib/validations/trip";
import type { FareBreakdown } from "@/services/pricing.engine";
import { formatDateDisplay, formatDuration, formatTimeDisplay } from "@/utils/dates";
import { formatINR } from "@/utils/money";
import { FareBreakdownView } from "./fare-breakdown";

const formSchema = z.object(customerFields);
type In = z.input<typeof formSchema>;
type Out = z.output<typeof formSchema>;

export type CheckoutTrip = { fromId: string; toId: string; journeyType: "ONE_WAY" | "ROUND_TRIP"; pickupDate: string; returnDate?: string; pickupTime: string };
type Props = {
  trip: CheckoutTrip;
  carId: string;
  car: { brand: string; model: string; category: keyof typeof categoryLabels; seatingCapacity: number; luggageCapacity: number; transmission: string; fuelType: string; isAC: boolean };
  fromLabel: string; toLabel: string; distanceKm: number; durationMins: number; isEstimate: boolean;
  initialFare: FareBreakdown;
  user: { name: string; email: string; phone: string | null };
  mockPayments: boolean;
};

export function CheckoutClient({ trip, carId, car, fromLabel, toLabel, distanceKm, durationMins, isEstimate, initialFare, user, mockPayments }: Props) {
  const payment = usePayment({ mockPayments });
  const [fare, setFare] = useState(initialFare);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | undefined>();
  const [couponBusy, setCouponBusy] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const busy = creating || payment.busy;
  const payError = payment.error;

  const { register, handleSubmit, setValue, control, setError, formState: { errors } } = useForm<In, unknown, Out>({
    resolver: zodResolver(formSchema),
    defaultValues: { customerName: user.name, customerEmail: user.email, customerPhone: user.phone?.replace("+91", "") ?? "", passengerCount: 1, notes: "", acceptTerms: undefined as unknown as true },
  });
  const accepted = useWatch({ control, name: "acceptTerms" }) as boolean | undefined;
  const locked = bookingId !== null;

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    try {
      const { data } = await api<{ fare: FareBreakdown }>("/api/pricing/estimate", { method: "POST", body: { ...trip, carId, couponCode: couponInput.trim() } });
      setFare(data.fare);
      setCoupon(couponInput.trim().toUpperCase());
      toast.success(`Coupon applied – you save ${formatINR(data.fare.discount, { decimals: true })}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCouponBusy(false);
    }
  }

  async function removeCoupon() {
    setCoupon(undefined);
    setCouponInput("");
    const { data } = await api<{ fare: FareBreakdown }>("/api/pricing/estimate", { method: "POST", body: { ...trip, carId } });
    setFare(data.fare);
  }

  async function startPayment(v: Out) {
    setCreating(true);
    payment.setError(null);
    try {
      let id = bookingId;
      if (!id) {
        const { data } = await api<{ id: string }>("/api/bookings", {
          method: "POST",
          body: { ...trip, carId, couponCode: coupon, ...v, customerPhone: v.customerPhone.replace("+91", "") },
        });
        id = data.id;
        setBookingId(id);
      }
      await payment.pay(id, `${fromLabel} → ${toLabel}`);
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        for (const [k, msgs] of Object.entries(e.details)) setError(k as keyof In, { message: msgs[0] });
      }
      payment.setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  const field = "space-y-1.5";
  const err = (m?: string) => m && <p className="text-xs text-destructive" role="alert">{m}</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <form id="checkout-form" onSubmit={handleSubmit(startPayment)} noValidate className="space-y-6">
        <Section title="Journey details">
          <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            <MapPin className="size-5 text-primary" /> {fromLabel} <ArrowRight className="size-4 text-muted-foreground" /> {toLabel}
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Item label="Journey type" value={trip.journeyType === "ROUND_TRIP" ? "Round trip" : "One way"} />
            <Item label="Pickup" value={`${formatDateDisplay(trip.pickupDate)}, ${formatTimeDisplay(trip.pickupTime)}`} />
            {trip.returnDate && <Item label="Return date" value={formatDateDisplay(trip.returnDate)} />}
            <Item label={isEstimate ? "Estimated distance" : "Distance"} value={`~${distanceKm} km`} />
            <Item label={isEstimate ? "Estimated duration" : "Duration"} value={`~${formatDuration(durationMins)} one way`} />
          </dl>
        </Section>

        <Section title="Vehicle">
          <p className="font-semibold">{car.brand} {car.model} <span className="text-sm font-normal text-muted-foreground">or similar · {categoryLabels[car.category]}</span></p>
          <CarSpecs car={car} className="mt-2" />
        </Section>

        <Section title="Passenger details">
          <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2">
            <div className={field}><Label htmlFor="customerName">Full name</Label><Input id="customerName" autoComplete="name" aria-invalid={!!errors.customerName} {...register("customerName")} />{err(errors.customerName?.message)}</div>
            <div className={field}>
              <Label htmlFor="customerPhone">Mobile number</Label>
              <div className="flex gap-2"><span className="grid h-8 place-items-center rounded-lg border bg-muted px-3 text-sm text-muted-foreground">+91</span>
                <Input id="customerPhone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" aria-invalid={!!errors.customerPhone} {...register("customerPhone")} /></div>
              {err(errors.customerPhone?.message)}
            </div>
            <div className={field}><Label htmlFor="customerEmail">Email</Label><Input id="customerEmail" type="email" autoComplete="email" aria-invalid={!!errors.customerEmail} {...register("customerEmail")} />{err(errors.customerEmail?.message)}</div>
            <div className={field}>
              <Label htmlFor="passengerCount">Passengers (max {car.seatingCapacity})</Label>
              <Input id="passengerCount" type="number" min={1} max={car.seatingCapacity} aria-invalid={!!errors.passengerCount} {...register("passengerCount")} />
              {err(errors.passengerCount?.message)}
            </div>
            <div className={`${field} sm:col-span-2`}><Label htmlFor="notes">Additional instructions (optional)</Label><Textarea id="notes" rows={3} maxLength={500} placeholder="Pickup landmark, child seat, extra luggage…" {...register("notes")} />{err(errors.notes?.message)}</div>
          </fieldset>
        </Section>

        <Section title="Cancellation policy & terms">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {businessConfig.cancellationPolicy.map((t) => <li key={t.label} className="flex justify-between gap-4"><span>{t.label}</span><b className="text-foreground">{t.refundPercent}% refund</b></li>)}
          </ul>
          <div className="mt-4 flex items-start gap-3">
            <Checkbox id="acceptTerms" checked={!!accepted} disabled={locked} onCheckedChange={(c) => setValue("acceptTerms", (c === true) as true, { shouldValidate: true })} aria-invalid={!!errors.acceptTerms} />
            <Label htmlFor="acceptTerms" className="text-sm font-normal leading-snug">
              I agree to the <Link href="/terms" target="_blank" className="text-primary underline">Terms</Link> and <Link href="/cancellation-policy" target="_blank" className="text-primary underline">Cancellation Policy</Link>, and understand tolls & parking are payable separately.
            </Label>
          </div>
          {err(errors.acceptTerms?.message)}
        </Section>

        {payError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{payError}</p>}
        <div className="lg:hidden"><PayButton busy={busy} locked={locked} total={fare.totalAmount} /></div>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Fare summary</h2>
          <FareBreakdownView fare={fare} isEstimate={false} totalLabel="Total payable" />
          {isEstimate && <p className="text-xs text-muted-foreground">Distance is estimated. The amount shown here is the amount you pay and is locked once you book.</p>}
          <div className="border-t pt-4">
            {coupon ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <span className="flex items-center gap-2"><Check className="size-4" /> {coupon} applied</span>
                {!locked && <button type="button" onClick={removeCoupon} className="text-xs underline">Remove</button>}
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1"><Tag className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Coupon code" placeholder="Coupon code" value={couponInput} disabled={locked} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} className="pl-8 uppercase" /></div>
                <Button type="button" variant="outline" disabled={couponBusy || locked || !couponInput} onClick={applyCoupon}>{couponBusy ? <Loader2 className="animate-spin" /> : <TicketPercent />} Apply</Button>
              </div>
            )}
          </div>
          <div className="hidden lg:block"><PayButton busy={busy} locked={locked} total={fare.totalAmount} /></div>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" /> Secure payment via Razorpay</p>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> Your slot is held for {businessConfig.holdMinutes} minutes after you proceed</p>
        </div>
      </aside>

      {payment.dialog}
    </div>
  );
}

function PayButton({ busy, locked, total }: { busy: boolean; locked: boolean; total: number }) {
  // Submits the checkout form from anywhere in the page via the HTML `form` attribute.
  return (
    <Button type="submit" form="checkout-form" size="lg" disabled={busy} className="h-12 w-full gap-2 rounded-xl text-base">
      {busy ? <Loader2 className="animate-spin" /> : <Lock />} {locked ? "Retry payment" : "Pay"} {formatINR(total)}
    </Button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}
