import type { Metadata } from "next";
import { AdminBookings } from "@/components/dashboard/admin-bookings";

export const metadata: Metadata = { title: "Bookings" };

export default function AdminBookingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
      <AdminBookings />
    </div>
  );
}
