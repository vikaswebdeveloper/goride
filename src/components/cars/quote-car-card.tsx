import { ChevronDown, Clock, Gauge } from "lucide-react";
import Link from "next/link";
import { FareBreakdownView } from "@/components/booking/fare-breakdown";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { categoryLabels } from "@/config/site";
import type { CarQuote } from "@/services/pricing.service";
import { formatDuration } from "@/utils/dates";
import { formatINR } from "@/utils/money";
import { CarImage } from "./car-image";
import { CarSpecs } from "./car-specs";

export function QuoteCarCard({ quote, durationMins, bookHref, isEstimate }: { quote: CarQuote; durationMins: number; bookHref: string; isEstimate: boolean }) {
  const { car, fare, unitsLeft } = quote;
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:shadow-lift">
      <div className="grid gap-0 md:grid-cols-[260px_1fr_auto]">
        <CarImage src={car.imageUrl} alt={`${car.brand} ${car.model}`} className="aspect-[18/11] md:aspect-auto md:h-full md:min-h-44" />
        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{car.brand} {car.model} <span className="text-sm font-normal text-muted-foreground">or similar</span></h3>
            <Badge variant="secondary">{categoryLabels[car.category]}</Badge>
            {unitsLeft <= 2 && <Badge variant="destructive">Only {unitsLeft} left</Badge>}
          </div>
          <CarSpecs car={car} />
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Gauge className="size-4 text-primary/80" />{fare.billableKm} km included · extra ₹{fare.extraKmRate}/km</span>
            <span className="flex items-center gap-1.5"><Clock className="size-4 text-primary/80" />~{formatDuration(durationMins)} one way</span>
          </div>
          <details className="group text-sm">
            <summary className="flex w-fit cursor-pointer list-none items-center gap-1 font-medium text-primary">
              Fare breakdown <ChevronDown className="size-4 transition group-open:rotate-180" />
            </summary>
            <FareBreakdownView fare={fare} isEstimate={isEstimate} className="mt-3 max-w-md rounded-xl border bg-background p-4" />
          </details>
        </div>
        <div className="flex items-center justify-between gap-3 border-t p-4 sm:p-5 md:min-w-48 md:flex-col md:items-end md:justify-center md:border-l md:border-t-0">
          <div className="md:text-right">
            <p className="text-xs text-muted-foreground">{isEstimate ? "Estimated total" : "Total"}</p>
            <p className="text-2xl font-bold tracking-tight">{formatINR(fare.totalAmount)}</p>
            <p className="text-xs text-muted-foreground">incl. GST · excl. tolls</p>
          </div>
          <Link href={bookHref} className={buttonVariants({ size: "lg" }) + " h-10 rounded-xl px-5"}>Book Now</Link>
        </div>
      </div>
    </article>
  );
}
