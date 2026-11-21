"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryLabels } from "@/config/site";
import { api, errorMessage } from "@/lib/api-client";
import { carSchema } from "@/lib/validations/admin";

type Car = z.output<typeof carSchema> & { id: string };
type In = z.input<typeof carSchema>;
const sel = "h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50";
const blank: In = { brand: "", model: "", category: "SEDAN", imageUrl: "/cars/dzire.svg", seatingCapacity: 4, luggageCapacity: 2, transmission: "MANUAL", fuelType: "PETROL", isAC: true, isActive: true };

export function AdminCars() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-cars"], queryFn: () => api<Car[]>("/api/admin/cars") });
  const [editing, setEditing] = useState<Car | "new" | null>(null);
  const [deleting, setDeleting] = useState<Car | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<In, unknown, z.output<typeof carSchema>>({ resolver: zodResolver(carSchema), defaultValues: blank });
  const { register, handleSubmit, reset, formState: { errors } } = form;

  function open(c: Car | "new") {
    reset(c === "new" ? blank : c);
    setEditing(c);
  }

  async function save(v: z.output<typeof carSchema>) {
    setBusy(true);
    try {
      if (editing === "new") await api("/api/admin/cars", { method: "POST", body: v });
      else if (editing) await api(`/api/admin/cars/${editing.id}`, { method: "PATCH", body: v });
      toast.success("Car saved");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["admin-cars"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      const { data: r } = await api<{ softDeleted: boolean }>(`/api/admin/cars/${deleting.id}`, { method: "DELETE" });
      toast.success(r.softDeleted ? "Car has bookings, so it was deactivated instead" : "Car deleted");
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ["admin-cars"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const err = (m?: string) => m && <p className="text-xs text-destructive" role="alert">{m}</p>;
  const cars = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Cars</h1>
        <Button onClick={() => open("new")}><Plus /> Add car</Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary text-left"><tr>{["Car", "Category", "Seats / bags", "Specs", "Status", ""].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Loading…</td></tr>}
            {cars.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3"><div className="flex items-center gap-3"><Image src={c.imageUrl} alt="" width={64} height={40} unoptimized className="h-10 w-16 rounded-md object-cover" /><span className="font-medium">{c.brand} {c.model}</span></div></td>
                <td className="p-3">{categoryLabels[c.category]}</td>
                <td className="p-3">{c.seatingCapacity} / {c.luggageCapacity}</td>
                <td className="p-3 text-muted-foreground">{c.transmission.toLowerCase()} · {c.fuelType.toLowerCase()}{c.isAC ? " · AC" : ""}</td>
                <td className="p-3">{c.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</td>
                <td className="p-3"><div className="flex gap-1.5"><Button size="icon" variant="outline" aria-label={`Edit ${c.model}`} onClick={() => open(c)}><Pencil /></Button><Button size="icon" variant="destructive" aria-label={`Delete ${c.model}`} onClick={() => setDeleting(c)}><Trash2 /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing === "new" ? "Add car" : "Edit car"}</DialogTitle><DialogDescription>Cars appear in search results once their category has an active pricing rule and fleet capacity.</DialogDescription></DialogHeader>
          <form onSubmit={handleSubmit(save)} noValidate className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="brand">Brand</Label><Input id="brand" {...register("brand")} />{err(errors.brand?.message)}</div>
            <div className="space-y-1.5"><Label htmlFor="model">Model</Label><Input id="model" {...register("model")} />{err(errors.model?.message)}</div>
            <div className="space-y-1.5"><Label htmlFor="category">Category</Label><select id="category" className={sel} {...register("category")}>{Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="imageUrl">Image URL</Label><Input id="imageUrl" {...register("imageUrl")} />{err(errors.imageUrl?.message)}</div>
            <div className="space-y-1.5"><Label htmlFor="seatingCapacity">Seats</Label><Input id="seatingCapacity" type="number" {...register("seatingCapacity")} />{err(errors.seatingCapacity?.message)}</div>
            <div className="space-y-1.5"><Label htmlFor="luggageCapacity">Luggage (bags)</Label><Input id="luggageCapacity" type="number" {...register("luggageCapacity")} />{err(errors.luggageCapacity?.message)}</div>
            <div className="space-y-1.5"><Label htmlFor="transmission">Transmission</Label><select id="transmission" className={sel} {...register("transmission")}><option value="MANUAL">Manual</option><option value="AUTOMATIC">Automatic</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="fuelType">Fuel</Label><select id="fuelType" className={sel} {...register("fuelType")}>{["PETROL", "DIESEL", "CNG", "ELECTRIC"].map((f) => <option key={f} value={f}>{f[0] + f.slice(1).toLowerCase()}</option>)}</select></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("isAC")} /> Air conditioned</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("isActive")} /> Active (bookable)</label>
            <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />} Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove {deleting?.brand} {deleting?.model}?</DialogTitle><DialogDescription>Cars with booking history are deactivated instead of deleted so past bookings stay intact.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" disabled={busy} onClick={remove}>{busy && <Loader2 className="animate-spin" />} Remove</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
