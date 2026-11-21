import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDuration } from "@/utils/dates";
import { formatINR } from "@/utils/money";

type Props = { route: { fromCity: string; toCity: string; distanceKm: number; durationMins: number; startingPrice: number | null; fromId: string | null; toId: string | null } };

export function RouteCard({ route }: Props) {
  const href = route.fromId && route.toId ? `/?fromId=${route.fromId}&toId=${route.toId}#book` : "/#book";
  return (
    <Link href={href} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift">
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/5 transition group-hover:scale-150" />
      <div className="relative flex items-center gap-2 text-lg font-semibold">
        {route.fromCity} <ArrowRight className="size-4 text-primary transition group-hover:translate-x-1" /> {route.toCity}
      </div>
      <p className="relative mt-1 text-sm text-muted-foreground">{route.distanceKm} km · ~{formatDuration(route.durationMins)}</p>
      <div className="relative mt-5 flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Indicative price from</p>
          <p className="text-xl font-bold text-primary">{route.startingPrice ? formatINR(route.startingPrice) : "—"}</p>
        </div>
        <span className="text-sm font-medium text-primary opacity-0 transition group-hover:opacity-100">Book now →</span>
      </div>
    </Link>
  );
}
