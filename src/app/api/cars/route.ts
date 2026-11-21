import { ok, parseQuery, route } from "@/lib/api";
import { carListQuery } from "@/lib/validations/trip";
import { quoteTrip } from "@/services/pricing.service";

/** GET /api/cars?fromId&toId&journeyType&pickupDate&returnDate&pickupTime&sort&category&minSeats
 *  Returns available cars with server-computed fares. */
export const GET = route(async (req) => {
  const { sort, category, minSeats, ...trip } = parseQuery(req, carListQuery);
  const result = await quoteTrip(trip, { sort, category, minSeats });
  return ok(result, { count: result.quotes.length });
});
