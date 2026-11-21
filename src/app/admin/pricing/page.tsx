import type { Metadata } from "next";
import { AdminPricing } from "@/components/dashboard/admin-pricing";

export const metadata: Metadata = { title: "Pricing & fleet" };
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Pricing rules &amp; fleet capacity</h1>
      <p className="text-sm text-muted-foreground">Fare = base + (km × per-km rate) + driver allowance + state charges − discount, plus GST. Fleet units limit how many cars of a category can run on a given day.</p>
      <AdminPricing />
    </div>
  );
}
