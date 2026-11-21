"use client";

import { BarChart3, Car, IndianRupee, Map, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/admin/bookings", label: "Bookings", icon: Ticket },
  { href: "/admin/cars", label: "Cars", icon: Car },
  { href: "/admin/pricing", label: "Pricing & fleet", icon: IndianRupee },
  { href: "/admin/routes", label: "Popular routes", icon: Map },
  { href: "/admin/customers", label: "Customers", icon: Users },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(({ href, label, icon: I }) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
          className={cn("flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition", path === href ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
          <I className="size-4" /> {label}
        </Link>
      ))}
    </nav>
  );
}
