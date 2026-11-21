"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api-client";
import { allowedTransitions } from "@/services/booking-rules";
import { formatDateDisplay, formatTimeDisplay, fromDateOnly } from "@/utils/dates";
import { formatINR } from "@/utils/money";

type Row = {
  id: string; bookingReference: string; customerName: string; customerPhone: string; customerEmail: string;
  pickupLocation: string; dropLocation: string; pickupDate: string; returnDate: string | null; pickupTime: string; passengerCount: number;
  totalAmount: string; bookingStatus: "PENDING_PAYMENT" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUND_PENDING" | "REFUNDED"; createdAt: string; notes: string | null;
  car: { brand: string; model: string }; user: { name: string; email: string; phone: string | null };
  payments: { id: string; razorpayOrderId: string; razorpayPaymentId: string | null; paymentStatus: string; paymentMethod: string | null; amount: string; failureReason: string | null }[];
};

const sel = "h-9 rounded-lg border bg-card px-2.5 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-ring/30";

export function AdminBookings() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(q); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams({ page: String(page), pageSize: "15", ...(debounced && { q: debounced }), ...(status && { status }), ...(paymentStatus && { paymentStatus }), ...(from && { from }), ...(to && { to }) });
  const { data, isFetching, error } = useQuery({
    queryKey: ["admin-bookings", params.toString()],
    queryFn: () => api<Row[]>(`/api/admin/bookings?${params}`),
    placeholderData: (prev) => prev,
  });
  const rows = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  async function setBookingStatus(id: string, bookingStatus: string) {
    setSaving(true);
    try {
      await api(`/api/admin/bookings/${id}`, { method: "PATCH", body: { bookingStatus } });
      toast.success("Booking updated");
      setSelected(null);
      await qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const reset = () => (setPage(1));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search bookings" placeholder="Booking ID, name or phone" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 pl-8" />
        </div>
        <select aria-label="Booking status" className={sel} value={status} onChange={(e) => { setStatus(e.target.value); reset(); }}>
          <option value="">All statuses</option>
          {["PENDING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "EXPIRED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select aria-label="Payment status" className={sel} value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); reset(); }}>
          <option value="">All payments</option>
          {["PENDING", "PAID", "FAILED", "REFUND_PENDING", "REFUNDED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <label className="text-xs text-muted-foreground">From<input type="date" className={sel + " ml-1.5"} value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} /></label>
        <label className="text-xs text-muted-foreground">To<input type="date" className={sel + " ml-1.5"} value={to} onChange={(e) => { setTo(e.target.value); reset(); }} /></label>
        {isFetching && <Loader2 className="mb-2 size-4 animate-spin text-muted-foreground" />}
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{errorMessage(error)}</p>}

      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary text-left"><tr>{["Booking", "Customer", "Route", "Pickup", "Amount", "Status", ""].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">{isFetching ? "Loading…" : "No bookings match."}</td></tr>}
            {rows.map((b) => (
              <tr key={b.id} className="border-t hover:bg-muted/40">
                <td className="p-3"><span className="font-mono text-xs">{b.bookingReference}</span><br /><span className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</span></td>
                <td className="p-3">{b.customerName}<br /><span className="text-xs text-muted-foreground">{b.customerPhone}</span></td>
                <td className="p-3">{b.pickupLocation.split(",")[0]} → {b.dropLocation.split(",")[0]}<br /><span className="text-xs text-muted-foreground">{b.car.brand} {b.car.model}</span></td>
                <td className="p-3 whitespace-nowrap">{formatDateDisplay(fromDateOnly(new Date(b.pickupDate)))}<br /><span className="text-xs text-muted-foreground">{formatTimeDisplay(b.pickupTime)}</span></td>
                <td className="p-3 font-medium tabular-nums">{formatINR(b.totalAmount)}</td>
                <td className="space-y-1 p-3"><BookingStatusBadge status={b.bookingStatus} /><br /><PaymentStatusBadge status={b.paymentStatus} /></td>
                <td className="p-3"><Button size="sm" variant="outline" onClick={() => setSelected(b)}>Manage</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Page {page} of {totalPages} · {data?.meta?.total ?? 0} bookings</span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{selected.bookingReference}</DialogTitle>
                <DialogDescription>{selected.pickupLocation} → {selected.dropLocation}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2"><BookingStatusBadge status={selected.bookingStatus} /><PaymentStatusBadge status={selected.paymentStatus} /></div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Info l="Customer" v={`${selected.customerName} (${selected.passengerCount} pax)`} />
                <Info l="Phone / email" v={`${selected.customerPhone} · ${selected.customerEmail}`} />
                <Info l="Account" v={`${selected.user.name} · ${selected.user.email}`} />
                <Info l="Pickup" v={`${formatDateDisplay(fromDateOnly(new Date(selected.pickupDate)))}, ${formatTimeDisplay(selected.pickupTime)}`} />
                <Info l="Car" v={`${selected.car.brand} ${selected.car.model}`} />
                <Info l="Amount" v={formatINR(selected.totalAmount, { decimals: true })} />
                {selected.notes && <Info l="Notes" v={selected.notes} />}
              </dl>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Payments</h3>
                {selected.payments.length === 0 ? <p className="text-sm text-muted-foreground">No payment attempts.</p> : selected.payments.map((p) => (
                  <div key={p.id} className="mb-2 rounded-lg border p-3 text-xs">
                    <div className="flex justify-between"><b>{p.paymentStatus}</b><span>{formatINR(p.amount, { decimals: true })}{p.paymentMethod ? ` · ${p.paymentMethod}` : ""}</span></div>
                    <p className="mt-1 break-all font-mono text-muted-foreground">Order {p.razorpayOrderId}{p.razorpayPaymentId ? ` · Pay ${p.razorpayPaymentId}` : ""}</p>
                    {p.failureReason && <p className="mt-1 text-destructive">{p.failureReason}</p>}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Update status</h3>
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions(selected.bookingStatus).filter((s) => s !== "EXPIRED" && s !== "PENDING_PAYMENT").map((s) => (
                    <Button key={s} size="sm" variant={s === "CANCELLED" ? "destructive" : "default"} disabled={saving || (s === "CONFIRMED" && selected.paymentStatus !== "PAID")} onClick={() => setBookingStatus(selected.id, s)}>
                      Mark {s.toLowerCase()}
                    </Button>
                  ))}
                  {allowedTransitions(selected.bookingStatus).length === 0 && <p className="text-sm text-muted-foreground">This booking is in a final state.</p>}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Cancelling a paid booking flags a full refund as pending. Bookings are only confirmed by verified payment.</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ l, v }: { l: string; v: string }) {
  return <div><dt className="text-xs text-muted-foreground">{l}</dt><dd className="break-words font-medium">{v}</dd></div>;
}
