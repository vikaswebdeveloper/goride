import { CarFront } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookingCard } from "@/components/dashboard/booking-card";
import { buttonVariants } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth";
import { listUserBookings, type BookingScope } from "@/services/booking.service";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Bookings" };

const tabs: { key: BookingScope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const user = await requireUserPage("/bookings");
  const sp = await searchParams;
  const scope = (tabs.find((t) => t.key === sp.tab)?.key ?? "all") as BookingScope;
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, totalPages, total } = await listUserBookings(user.id, { scope, page, pageSize: 10 });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My Bookings</h1>
        <Link href="/" className={buttonVariants({ size: "lg" })}>Book a ride</Link>
      </div>
      <nav className="mb-6 inline-flex max-w-full overflow-x-auto rounded-xl bg-muted p-1" aria-label="Booking filters">
        {tabs.map((t) => (
          <Link key={t.key} href={`/bookings?tab=${t.key}`} aria-current={scope === t.key ? "page" : undefined}
            className={cn("whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium transition", scope === t.key ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
          <CarFront className="mb-3 size-10 text-muted-foreground" />
          <h2 className="font-semibold">No bookings here yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your {scope === "all" ? "" : scope + " "}trips will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">{items.map((b) => <BookingCard key={b.id} b={b} />)}</div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{total} bookings · page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className={buttonVariants({ variant: "outline" })} href={`/bookings?tab=${scope}&page=${page - 1}`}>Previous</Link>}
            {page < totalPages && <Link className={buttonVariants({ variant: "outline" })} href={`/bookings?tab=${scope}&page=${page + 1}`}>Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
