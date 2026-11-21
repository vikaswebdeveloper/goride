import { ok, route } from "@/lib/api";
import { requireAdminApi } from "@/lib/auth";
import { getAnalytics } from "@/services/admin.service";

export const GET = route(async () => {
  await requireAdminApi();
  return ok(await getAnalytics());
});
