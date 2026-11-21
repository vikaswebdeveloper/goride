import type { Metadata } from "next";
import { AdminCars } from "@/components/dashboard/admin-cars";

export const metadata: Metadata = { title: "Cars" };
export default function Page() {
  return <AdminCars />;
}
