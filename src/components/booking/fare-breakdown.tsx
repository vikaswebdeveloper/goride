import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FareBreakdown } from "@/services/pricing.engine";
import { formatINR } from "@/utils/money";

type Props = { fare: Pick<FareBreakdown, "lines" | "totalAmount">; isEstimate?: boolean; totalLabel?: string; className?: string };

export function FareBreakdownView({ fare, isEstimate = true, totalLabel, className }: Props) {
  return (
    <div className={cn("text-sm", className)}>
      <dl className="space-y-2">
        {fare.lines.map((l) => (
          <div key={l.key} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {l.label}
              {l.note && <span className="block text-xs text-primary">{l.note}</span>}
            </dt>
            <dd className={cn("shrink-0 font-medium tabular-nums", l.amount < 0 && "text-emerald-600")}>
              {l.amount < 0 ? "− " : ""}{formatINR(Math.abs(l.amount), { decimals: true })}
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t pt-3 text-base font-bold">
          <dt>{totalLabel ?? (isEstimate ? "Estimated total" : "Total")}</dt>
          <dd className="tabular-nums">{formatINR(fare.totalAmount, { decimals: true })}</dd>
        </div>
      </dl>
      <p className="mt-3 flex gap-2 rounded-lg bg-secondary p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span><b>Tolls & parking are not included</b> and are payable directly to the driver.</span>
      </p>
    </div>
  );
}
