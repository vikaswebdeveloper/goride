"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, CalendarDays, Clock, Flag, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { tripSchema } from "@/lib/validations/trip";
import { cn } from "@/lib/utils";
import type { Place } from "@/services/location/types";
import { addDays, nowIST } from "@/utils/dates";
import { LocationInput } from "./location-input";

type In = z.input<typeof tripSchema>;
type Out = z.output<typeof tripSchema>;

export type SearchDefaults = { from?: Place | null; to?: Place | null; journeyType?: "ONE_WAY" | "ROUND_TRIP"; pickupDate?: string; returnDate?: string; pickupTime?: string };

function defaultTime() {
  const { minutes } = nowIST();
  const next = Math.min(Math.ceil((minutes + 150) / 30) * 30, 23 * 60 + 30);
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

export function SearchCard({ defaults = {}, compact = false }: { defaults?: SearchDefaults; compact?: boolean }) {
  const router = useRouter();
  const today = nowIST().date;
  const [from, setFrom] = useState<Place | null>(defaults.from ?? null);
  const [to, setTo] = useState<Place | null>(defaults.to ?? null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<In, unknown, Out>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      fromId: defaults.from?.id ?? "", toId: defaults.to?.id ?? "",
      journeyType: defaults.journeyType ?? "ONE_WAY",
      pickupDate: defaults.pickupDate ?? addDays(today, 1),
      returnDate: defaults.returnDate ?? "",
      pickupTime: defaults.pickupTime ?? "07:00",
    },
  });
  const { register, control, setValue, handleSubmit, formState: { errors } } = form;
  const journeyType = useWatch({ control, name: "journeyType" });
  const pickupDate = useWatch({ control, name: "pickupDate" });

  function swap() {
    const f = from, t = to;
    setFrom(t); setTo(f);
    setValue("fromId", t?.id ?? "", { shouldValidate: !!t });
    setValue("toId", f?.id ?? "", { shouldValidate: !!f });
  }

  function onSubmit(v: Out) {
    setSubmitting(true);
    const p = new URLSearchParams({ fromId: v.fromId, toId: v.toId, journeyType: v.journeyType, pickupDate: v.pickupDate, pickupTime: v.pickupTime });
    if (v.journeyType === "ROUND_TRIP" && v.returnDate) p.set("returnDate", v.returnDate);
    router.push(`/cars?${p}`);
  }

  const field = "h-12 w-full rounded-xl border bg-background pl-9 pr-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-3 focus:ring-ring/30 aria-invalid:border-destructive";
  const lbl = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className={cn("rounded-3xl border bg-card p-4 shadow-lift sm:p-6", compact && "shadow-soft")} aria-label="Search outstation cabs">
      <div role="tablist" aria-label="Journey type" className="mb-4 inline-flex rounded-xl bg-muted p-1">
        {(["ONE_WAY", "ROUND_TRIP"] as const).map((t) => (
          <button
            key={t} type="button" role="tab" aria-selected={journeyType === t}
            onClick={() => { setValue("journeyType", t, { shouldValidate: true }); if (t === "ONE_WAY") setValue("returnDate", ""); }}
            className={cn("rounded-lg px-4 py-1.5 text-sm font-medium transition", journeyType === t ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
          >
            {t === "ONE_WAY" ? "One Way" : "Round Trip"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <LocationInput label="From" placeholder="Pickup city" value={from} error={errors.fromId?.message}
          onChange={(p) => { setFrom(p); setValue("fromId", p?.id ?? "", { shouldValidate: !!p }); }} />
        <button type="button" onClick={swap} aria-label="Swap pickup and drop locations"
          className="mx-auto grid size-10 place-items-center rounded-full border bg-background text-primary shadow-soft transition hover:rotate-180 hover:bg-accent lg:mb-1 max-lg:-my-1 max-lg:rotate-90 max-lg:hover:rotate-[270deg]">
          <ArrowLeftRight className="size-4" />
        </button>
        <LocationInput label="To" placeholder="Destination city" value={to} icon={<Flag className="size-4" />} error={errors.toId?.message}
          onChange={(p) => { setTo(p); setValue("toId", p?.id ?? "", { shouldValidate: !!p }); }} />
      </div>

      <div className={cn("mt-3 grid gap-3 sm:grid-cols-2", journeyType === "ROUND_TRIP" ? "lg:grid-cols-[1fr_1fr_1fr_auto]" : "lg:grid-cols-[1fr_1fr_auto]")}>
        <div>
          <label htmlFor="pickupDate" className={lbl}>Pickup date</label>
          <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <input id="pickupDate" type="date" min={today} aria-invalid={!!errors.pickupDate} className={field} {...register("pickupDate")} /></div>
          {errors.pickupDate && <p className="mt-1 text-xs text-destructive" role="alert">{errors.pickupDate.message}</p>}
        </div>
        {journeyType === "ROUND_TRIP" && (
          <div>
            <label htmlFor="returnDate" className={lbl}>Return date</label>
            <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <input id="returnDate" type="date" min={pickupDate || today} aria-invalid={!!errors.returnDate} className={field} {...register("returnDate")} /></div>
            {errors.returnDate && <p className="mt-1 text-xs text-destructive" role="alert">{errors.returnDate.message}</p>}
          </div>
        )}
        <div>
          <label htmlFor="pickupTime" className={lbl}>Pickup time</label>
          <div className="relative"><Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
            <Controller control={control} name="pickupTime" render={({ field: f }) => (
              <input id="pickupTime" type="time" step={900} aria-invalid={!!errors.pickupTime} className={field} value={f.value} onChange={f.onChange} onBlur={f.onBlur} onFocus={() => !f.value && f.onChange(defaultTime())} />
            )} /></div>
          {errors.pickupTime && <p className="mt-1 text-xs text-destructive" role="alert">{errors.pickupTime.message}</p>}
        </div>
        <div className="flex items-end">
          <Button type="submit" size="lg" disabled={submitting} className="h-12 w-full gap-2 rounded-xl px-6 text-base lg:w-auto">
            {submitting ? <Loader2 className="animate-spin" /> : <Search />} Search Cabs
          </Button>
        </div>
      </div>
    </form>
  );
}
