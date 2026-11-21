import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { email: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q } }] } : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 20, take: 20, select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, _count: { select: { bookings: true } } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
      <form className="flex gap-2"><input name="q" defaultValue={q} aria-label="Search customers" placeholder="Search name, email or phone" className="h-9 w-full max-w-sm rounded-lg border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-3 focus:ring-ring/30" /><Button type="submit">Search</Button></form>
      <div className="overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-secondary text-left"><tr>{["Name", "Email", "Phone", "Role", "Bookings", "Joined"].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3">{u.phone ?? "—"}</td>
                <td className="p-3">{u.role.toLowerCase()}</td><td className="p-3 tabular-nums">{u._count.bookings}</td>
                <td className="p-3">{u.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No customers found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Page {page} of {pages} · {total} users</span>
        <div className="flex gap-2">{page > 1 && <Link href={`?q=${q ?? ""}&page=${page - 1}`} className="rounded-lg border px-3 py-1.5 hover:bg-muted">Previous</Link>}{page < pages && <Link href={`?q=${q ?? ""}&page=${page + 1}`} className="rounded-lg border px-3 py-1.5 hover:bg-muted">Next</Link>}</div></div>
    </div>
  );
}
