import { ok, route } from "@/lib/api";
import { getPopularRoutes } from "@/services/catalog.service";

export const GET = route(async () => ok(await getPopularRoutes()));
