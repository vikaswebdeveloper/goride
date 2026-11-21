import type { Metadata } from "next";
import { RouteCard } from "@/components/booking/route-card";
import { getPopularRoutes } from "@/services/catalog.service";

export const metadata: Metadata = { title: "Outstation routes" };

export default async function RoutesPage() {
  const routes = await getPopularRoutes();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Outstation routes</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Pick a popular route to pre-fill your search, or head home and enter any two cities. Prices are indicative one-way starting fares including GST, excluding tolls.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((r) => <RouteCard key={r.id} route={r} />)}
      </div>
    </div>
  );
}
