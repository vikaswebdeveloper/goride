import { ok, parseBody, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pricingRuleSchema } from "@/lib/validations/admin";
import { invalidateCatalog } from "@/services/admin.service";

export const GET = route(async () => {
  await requireAdminApi();
  const [rules, inventory] = await Promise.all([prisma.pricingRule.findMany({ orderBy: { baseFare: "asc" } }), prisma.fleetInventory.findMany()]);
  const cap = new Map(inventory.map((i) => [i.category, i.dailyCapacity]));
  return ok(rules.map((r) => ({ ...r, dailyCapacity: cap.get(r.carCategory) ?? 0 })));
});

/** Upserts the rule for a category (and optionally its daily fleet capacity). Existing bookings keep their stored fare snapshot. */
export const POST = route(async (req) => {
  const admin = await requireAdminApi();
  const { dailyCapacity, ...data } = await parseBody(req, pricingRuleSchema);
  const rule = await prisma.$transaction(async (tx) => {
    const r = await tx.pricingRule.upsert({ where: { carCategory: data.carCategory }, create: data, update: data });
    if (dailyCapacity !== undefined) {
      await tx.fleetInventory.upsert({ where: { category: data.carCategory }, create: { category: data.carCategory, dailyCapacity }, update: { dailyCapacity } });
    }
    await tx.auditLog.create({ data: { actorId: admin.id, action: "PRICING_RULE_SAVED", entity: "PricingRule", entityId: r.id, metadata: { ...data } } });
    return r;
  });
  invalidateCatalog();
  return ok(rule, undefined, 201);
});
