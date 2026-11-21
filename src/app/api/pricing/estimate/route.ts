import { z } from "zod";
import { ok, parseBody, route } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { tripFields, validateTripRules } from "@/lib/validations/trip";
import { quoteCar } from "@/services/pricing.service";

const schema = z
  .object({ ...tripFields, carId: z.string().min(1), couponCode: z.string().trim().toUpperCase().max(32).optional().or(z.literal("").transform(() => undefined)) })
  .superRefine((v, ctx) => validateTripRules(v, ctx));

/** POST /api/pricing/estimate – server-side fare for one car (used by the booking page to show the breakdown). */
export const POST = route(async (req) => {
  rateLimit(`estimate:${clientIp(req)}`, 60, 60_000);
  const { carId, couponCode, ...trip } = await parseBody(req, schema);
  const q = await quoteCar(trip, carId, couponCode);
  return ok({
    from: q.from, to: q.to, route: q.route, fare: q.fare,
    car: { id: q.car.id, brand: q.car.brand, model: q.car.model, category: q.car.category, seatingCapacity: q.car.seatingCapacity, imageUrl: q.car.imageUrl },
    isEstimate: q.route.isEstimate,
  });
});
