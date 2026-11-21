"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { categoryLabels } from "@/config/site";
import { api, errorMessage } from "@/lib/api-client";

type Rule = {
  carCategory: keyof typeof categoryLabels; baseFare: string; pricePerKm: string; driverAllowance: string; minimumFare: string;
  minKmPerDay: number; oneWayReturnFactor: string; isActive: boolean; dailyCapacity: number;
};

export function AdminPricing() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-pricing"], queryFn: () => api<Rule[]>("/api/admin/pricing-rules") });
  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4">
      {(data?.data ?? []).map((r) => <RuleRow key={r.carCategory} rule={r} />)}
      <p className="text-xs text-muted-foreground">Changes apply to new searches and bookings only. Existing bookings keep the fare they were quoted.</p>
    </div>
  );
}

function RuleRow({ rule }: { rule: Rule }) {
  const qc = useQueryClient();
  const [v, setV] = useState({
    baseFare: rule.baseFare, pricePerKm: rule.pricePerKm, driverAllowance: rule.driverAllowance, minimumFare: rule.minimumFare,
    minKmPerDay: String(rule.minKmPerDay), oneWayReturnFactor: rule.oneWayReturnFactor, dailyCapacity: String(rule.dailyCapacity), isActive: rule.isActive,
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function save() {
    setBusy(true);
    try {
      await api("/api/admin/pricing-rules", { method: "POST", body: { carCategory: rule.carCategory, ...v } });
      toast.success(`${categoryLabels[rule.carCategory]} pricing saved`);
      await qc.invalidateQueries({ queryKey: ["admin-pricing"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const fields: [keyof typeof v, string, string][] = [
    ["baseFare", "Base fare (₹)", "1"], ["pricePerKm", "Per km (₹)", "0.5"], ["driverAllowance", "Driver allowance / day (₹)", "1"], ["minimumFare", "Minimum fare (₹)", "1"],
    ["minKmPerDay", "Round-trip min km/day", "1"], ["oneWayReturnFactor", "One-way km factor", "0.05"], ["dailyCapacity", "Fleet units / day", "1"],
  ];
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{categoryLabels[rule.carCategory]}</h2>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.isActive} onChange={set("isActive")} /> Active</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(([k, label, step]) => (
          <label key={k} className="space-y-1 text-xs font-medium text-muted-foreground">
            {label}
            <input type="number" min={0} step={step} value={String(v[k])} onChange={set(k)} className="h-9 w-full rounded-lg border bg-background px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-3 focus:ring-ring/30" />
          </label>
        ))}
        <div className="flex items-end"><Button onClick={save} disabled={busy} className="w-full">{busy ? <Loader2 className="animate-spin" /> : <Save />} Save</Button></div>
      </div>
    </section>
  );
}
