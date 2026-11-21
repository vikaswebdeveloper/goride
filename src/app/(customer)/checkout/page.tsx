import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { CheckoutClient } from "@/components/booking/checkout-client";
import { buttonVariants } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { tripFields, validateTripRules } from "@/lib/validations/trip";
import { isMockPayments, paymentsConfigured } from "@/services/payment/provider";
import { quoteCar } from "@/services/pricing.service";

export const metadata: Metadata = { title: "Review & pay" };

const schema = z.object({ ...tripFields, carId: z.string().min(1) }).superRefine((v, ctx) => validateTripRules(v, ctx));

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const user = await requireUserPage(`/checkout?${new URLSearchParams(raw as Record<string, string>)}`);
  const parsed = schema.safeParse(raw);

  if (!parsed.success) return <Problem message="This booking link is incomplete or has expired. Please search again." />;
  const { carId, ...trip } = parsed.data;

  let q;
  try {
    q = await quoteCar(trip, carId);
  } catch (e) {
    if (e instanceof AppError) return <Problem message={e.message} />;
    throw e;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Review &amp; pay</h1>
      {!paymentsConfigured() && (
        <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Online payments are not configured on this server yet (set the Razorpay test keys). You can review the booking, but payment will not start.
        </p>
      )}
      <CheckoutClient
        trip={{ ...trip, returnDate: trip.returnDate }}
        carId={carId}
        car={q.car}
        fromLabel={q.from.label} toLabel={q.to.label}
        distanceKm={q.route.distanceKm} durationMins={q.route.durationMins} isEstimate={q.route.isEstimate}
        initialFare={q.fare}
        user={{ name: user.name, email: user.email, phone: user.phone }}
        mockPayments={isMockPayments()}
      />
    </div>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Can&apos;t continue with this booking</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <Link href="/" className={buttonVariants({ size: "lg" }) + " mt-6"}>Search again</Link>
    </div>
  );
}
