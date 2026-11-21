import { CalendarCheck, CircleCheck, IndianRupee, Mail, Phone, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookingCard } from "@/components/dashboard/booking-card";
import { PaymentStatusBadge } from "@/components/dashboard/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUserPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expireStaleHolds } from "@/services/booking.service";
import { formatINR } from "@/utils/money";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUserPage("/dashboard");
  await expireStaleHolds();
  const [bookings, payments, spent] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id }, orderBy: { pickupDate: "desc" }, take: 60,
      include: { car: { select: { brand: true, model: true, category: true, imageUrl: true } } },
    }),
    prisma.payment.findMany({ where: { booking: { userId: user.id } }, orderBy: { createdAt: "desc" }, take: 30, include: { booking: { select: { id: true, bookingReference: true } } } }),
    prisma.booking.aggregate({ where: { userId: user.id, paymentStatus: "PAID" }, _sum: { totalAmount: true } }),
  ]);

  const upcoming = bookings.filter((b) => b.bookingStatus === "CONFIRMED" || b.bookingStatus === "PENDING_PAYMENT");
  const completed = bookings.filter((b) => b.bookingStatus === "COMPLETED");
  const cancelled = bookings.filter((b) => b.bookingStatus === "CANCELLED" || b.bookingStatus === "EXPIRED");

  const stats = [
    { icon: CalendarCheck, label: "Upcoming trips", value: String(upcoming.length) },
    { icon: CircleCheck, label: "Completed trips", value: String(completed.length) },
    { icon: IndianRupee, label: "Total spent", value: formatINR(spent._sum.totalAmount?.toString() ?? 0) },
  ];

  const list = (items: typeof bookings, empty: string) =>
    items.length ? <div className="space-y-3">{items.map((b) => <BookingCard key={b.id} b={b} />)}</div> : <p className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hello, {user.name.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground">Here is everything about your trips.</p>
        </div>
        <Link href="/" className={buttonVariants({ size: "lg" })}>Book a ride</Link>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: I, label, value }) => (
          <div key={label} className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-soft">
            <div className="grid size-11 place-items-center rounded-xl bg-accent text-primary"><I className="size-5" /></div>
            <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4 h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">{list(upcoming, "No upcoming trips. Time to plan one!")}</TabsContent>
        <TabsContent value="completed">{list(completed, "Completed trips will appear here.")}</TabsContent>
        <TabsContent value="cancelled">{list(cancelled, "No cancelled bookings.")}</TabsContent>
        <TabsContent value="payments">
          {payments.length === 0 ? <p className="rounded-2xl border border-dashed bg-card px-6 py-12 text-center text-sm text-muted-foreground">No payments yet.</p> : (
            <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-secondary text-left"><tr><th className="p-3">Date</th><th className="p-3">Booking</th><th className="p-3">Method</th><th className="p-3">Status</th><th className="p-3 text-right">Amount</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{p.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</td>
                      <td className="p-3"><Link className="font-mono text-primary hover:underline" href={`/bookings/${p.booking.id}`}>{p.booking.bookingReference}</Link></td>
                      <td className="p-3 capitalize">{p.paymentMethod ?? "—"}</td>
                      <td className="p-3"><PaymentStatusBadge status={p.paymentStatus} /></td>
                      <td className="p-3 text-right font-medium tabular-nums">{formatINR(p.amount.toString(), { decimals: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
        <TabsContent value="profile">
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <dl className="grid gap-5 sm:grid-cols-3">
              {[[User, "Name", user.name], [Mail, "Email", user.email], [Phone, "Mobile", user.phone ?? "Not added"]].map(([I, l, v]) => {
                const Icon = I as typeof User;
                return <div key={l as string} className="flex items-start gap-3"><Icon className="mt-0.5 size-4 text-primary" /><div><dt className="text-xs text-muted-foreground">{l as string}</dt><dd className="font-medium break-all">{v as string}</dd></div></div>;
              })}
            </dl>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
