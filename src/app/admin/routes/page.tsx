import type { Metadata } from "next";
import { AdminRoutes } from "@/components/dashboard/admin-routes";

export const metadata: Metadata = { title: "Popular routes" };
export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Popular routes</h1>
      <AdminRoutes />
    </div>
  );
}
