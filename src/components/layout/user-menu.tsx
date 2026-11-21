"use client";

import { ChevronDown, LayoutDashboard, LogOut, Shield, Ticket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api-client";

export function UserMenu({ name, email, isAdmin }: { name: string; email: string; isAdmin: boolean }) {
  const router = useRouter();
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-2.5 text-sm shadow-soft outline-none transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Account menu">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initial}</span>
        <span className="hidden max-w-24 truncate font-medium sm:block">{name.split(" ")[0]}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard" />}><LayoutDashboard /> Dashboard</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/bookings" />}><Ticket /> My Bookings</DropdownMenuItem>
        {isAdmin && <DropdownMenuItem render={<Link href="/admin/dashboard" />}><Shield /> Admin panel</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}><LogOut /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
