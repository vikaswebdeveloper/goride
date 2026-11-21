"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api-client";

type R = { id: string; fromCity: string; toCity: string; distanceKm: number; durationMins: number; isActive: boolean; sortOrder: number };

export function AdminRoutes() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-routes"], queryFn: () => api<R[]>("/api/admin/routes") });
  const [f, setF] = useState({ fromCity: "", toCity: "", distanceKm: "", durationMins: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-routes"] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/routes", { method: "POST", body: { ...f, sortOrder: (data?.data.length ?? 0) + 1 } });
      setF({ fromCity: "", toCity: "", distanceKm: "", durationMins: "" });
      toast.success("Route added");
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function act(fn: () => Promise<unknown>, msg: string) {
    try { await fn(); toast.success(msg); await refresh(); } catch (e) { toast.error(errorMessage(e)); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-[1fr_1fr_120px_140px_auto]">
        <Input aria-label="From city" placeholder="From city (e.g. Delhi)" required value={f.fromCity} onChange={(e) => setF({ ...f, fromCity: e.target.value })} />
        <Input aria-label="To city" placeholder="To city (e.g. Jaipur)" required value={f.toCity} onChange={(e) => setF({ ...f, toCity: e.target.value })} />
        <Input aria-label="Distance in km" type="number" min={1} placeholder="km" required value={f.distanceKm} onChange={(e) => setF({ ...f, distanceKm: e.target.value })} />
        <Input aria-label="Duration in minutes" type="number" min={1} placeholder="minutes" required value={f.durationMins} onChange={(e) => setF({ ...f, durationMins: e.target.value })} />
        <Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Plus />} Add</Button>
      </form>
      <p className="text-xs text-muted-foreground">City names should match a searchable city so the card can pre-fill the search form.</p>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-secondary text-left"><tr>{["Route", "Distance", "Duration", "Status", ""].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {(data?.data ?? []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.fromCity} → {r.toCity}</td>
                <td className="p-3">{r.distanceKm} km</td>
                <td className="p-3">{Math.floor(r.durationMins / 60)}h {r.durationMins % 60}m</td>
                <td className="p-3"><button onClick={() => act(() => api(`/api/admin/routes/${r.id}`, { method: "PATCH", body: { isActive: !r.isActive } }), "Route updated")} aria-label="Toggle active">{r.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Hidden</Badge>}</button></td>
                <td className="p-3"><Button size="icon" variant="destructive" aria-label={`Delete ${r.fromCity} to ${r.toCity}`} onClick={() => act(() => api(`/api/admin/routes/${r.id}`, { method: "DELETE" }), "Route removed")}><Trash2 /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
