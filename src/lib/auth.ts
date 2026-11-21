import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { readSession } from "./session";
import { AppError } from "./errors";

export type SessionUser = { id: string; name: string; email: string; phone: string | null; role: Role };

/** Current user, re-read from the DB so role changes / deletions take effect immediately. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const s = await readSession();
  if (!s) return null;
  return prisma.user.findUnique({
    where: { id: s.userId },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
});

// ---- API guards (throw AppError, converted to JSON by the route wrapper) ----
export async function requireUserApi(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  return u;
}

export async function requireAdminApi(): Promise<SessionUser> {
  const u = await requireUserApi();
  if (u.role !== "ADMIN") throw new AppError("FORBIDDEN", "Admin access required.");
  return u;
}

// ---- Page guards (redirect) ----
export async function requireUserPage(next?: string): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const u = await requireUserPage("/admin/dashboard");
  if (u.role !== "ADMIN") redirect("/");
  return u;
}
