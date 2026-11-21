import { Ban, CheckCircle2, Hourglass, IndianRupee, Ticket } from "lucide-react";
import { categoryLabels } from "@/config/site";
import { getAnalytics } from "@/services/admin.service";
import { formatINR } from "@/utils/money";

export default async function AdminDashboard() {
  const a = await getAnalytics();
  const stats = [
    { icon: Ticket, label: "Total bookings", value: String(a.totalBookings) },
    { icon: IndianRupee, label: "Total revenue", value: formatINR(a.totalRevenue) },
    { icon: Hourglass, label: "Pending payments", value: `${a.pendingPayments.count}`, sub: formatINR(a.pendingPayments.amount) + " on hold" },
    { icon: CheckCircle2, label: "Completed trips", value: String(a.completedTrips) },
    { icon: Ban, label: "Cancelled", value: String(a.cancelledBookings) },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Business overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ icon: I, label, value, sub }) => (
          <div key={label} className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><I className="size-4 text-primary" /> {label}</div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Bars title="Most popular routes" rows={a.popularRoutes.map((r) => ({ label: r.route, value: r.bookings }))} />
        <Bars title="Most booked categories" rows={a.categoryBookings.map((c) => ({ label: categoryLabels[c.category as keyof typeof categoryLabels] ?? c.category, value: c.bookings }))} />
      </div>
      <p className="text-xs text-muted-foreground">Revenue counts confirmed/completed bookings with verified payment. Refunds are not netted.</p>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No paid bookings yet.</p> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="mb-1 flex justify-between text-sm"><span>{r.label}</span><b className="tabular-nums">{r.value}</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary" role="presentation"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
