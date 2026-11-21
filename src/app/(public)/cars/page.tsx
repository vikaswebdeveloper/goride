import { AlertTriangle, ArrowRight, CarFront, Info } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { SearchCard } from "@/components/booking/search-card";
import { CarFilters } from "@/components/cars/car-filters";
import { QuoteCarCard } from "@/components/cars/quote-car-card";
import { AppError } from "@/lib/errors";
import { carListQuery } from "@/lib/validations/trip";
import { quoteTrip } from "@/services/pricing.service";
import { formatDateDisplay, formatDuration, formatTimeDisplay } from "@/utils/dates";

export const metadata: Metadata = { title: "Available cars" };

type SP = Record<string, string | string[] | undefined>;

export default async function CarsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = carListQuery.safeParse(raw);

  if (!parsed.success) {
    const messages = Object.values(z.flattenError(parsed.error).fieldErrors).flat();
    return (
      <Shell>
        <Notice title="Please check your search" lines={messages.length ? (messages as string[]) : ["Choose pickup, destination, date and time."]} />
        <div className="mt-6"><SearchCard /></div>
      </Shell>
    );
  }

  const { sort, category, minSeats, ...trip } = parsed.data;
  let result;
  try {
    result = await quoteTrip(trip, { sort, category, minSeats });
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    return (
      <Shell>
        <Notice title="We couldn't search that trip" lines={[e.message]} />
        <div className="mt-6"><SearchCard /></div>
      </Shell>
    );
  }

  const { from, to, route, quotes, disclaimer } = result;
  const checkoutBase = new URLSearchParams({ fromId: trip.fromId, toId: trip.toId, journeyType: trip.journeyType, pickupDate: trip.pickupDate, pickupTime: trip.pickupTime });
  if (trip.returnDate) checkoutBase.set("returnDate", trip.returnDate);

  return (
    <Shell>
      <div className="mb-6">
        <SearchCard compact defaults={{ from, to, journeyType: trip.journeyType, pickupDate: trip.pickupDate, returnDate: trip.returnDate, pickupTime: trip.pickupTime }} />
      </div>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            {from.name} <ArrowRight className="size-5 text-primary" /> {to.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trip.journeyType === "ROUND_TRIP" ? "Round trip" : "One way"} · {formatDateDisplay(trip.pickupDate)}
            {trip.returnDate ? ` – ${formatDateDisplay(trip.returnDate)}` : ""} · {formatTimeDisplay(trip.pickupTime)} ·
            ~{route.distanceKm} km · ~{formatDuration(route.durationMins)}
          </p>
        </div>
        <Suspense><CarFilters /></Suspense>
      </div>

      <p className="mb-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">
        <Info className="mt-0.5 size-4 shrink-0" /> {disclaimer}
      </p>

      {quotes.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <CarFront className="mb-3 size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No cars available</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Nothing matches these filters for your dates. Try another date or clear the filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{quotes.length} car{quotes.length > 1 ? "s" : ""} available</p>
          {quotes.map((q) => {
            const p = new URLSearchParams(checkoutBase);
            p.set("carId", q.car.id);
            return <QuoteCarCard key={q.car.id} quote={q} durationMins={route.durationMins} bookHref={`/checkout?${p}`} isEstimate={route.isEstimate} />;
          })}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>;
}

function Notice({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold">{title}</p>
        <ul className="mt-1 list-inside list-disc text-muted-foreground">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
    </div>
  );
}
