import { ok, route } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export const GET = route(async () => ok(await getCurrentUser()));
