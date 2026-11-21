import { z } from "zod";
import { ok, parseQuery, route } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { searchPlaces } from "@/services/location.service";

export const GET = route(async (req) => {
  rateLimit(`loc:${clientIp(req)}`, 120, 60_000);
  const { q } = parseQuery(req, z.object({ q: z.string().max(80).default("") }));
  return ok(await searchPlaces(q));
});
