import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/dashboard/admin-nav";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };

// Authorization happens here on the server for every /admin page (and again in every /api/admin handler).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3"><Logo /><span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-primary">Admin</span></div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">View site</Link>
            <UserMenu name={user.name} email={user.email} isAdmin />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start"><AdminNav /></aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
