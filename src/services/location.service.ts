import { AppError } from "@/lib/errors";
import { MapboxLocationProvider } from "./location/mapbox.provider";
import { MockLocationProvider } from "./location/mock.provider";
import type { LocationProvider, Place, RouteInfo } from "./location/types";

export type { Place, RouteInfo } from "./location/types";

let provider: LocationProvider | undefined;

export function getLocationProvider(): LocationProvider {
  if (!provider) {
    const token = process.env.MAPBOX_ACCESS_TOKEN;
    provider = token ? new MapboxLocationProvider(token) : new MockLocationProvider();
  }
  return provider;
}

export function searchPlaces(query: string, limit?: number): Promise<Place[]> {
  return getLocationProvider().search(query, limit);
}

/** Resolves ids from the client into trusted places and computes the route server-side. */
export async function resolveRoute(fromId: string, toId: string): Promise<{ from: Place; to: Place; route: RouteInfo }> {
  const p = getLocationProvider();
  const [from, to] = await Promise.all([p.resolve(fromId), p.resolve(toId)]);
  if (!from || !to) throw new AppError("VALIDATION_ERROR", "Unknown pickup or drop location.");
  if (from.id === to.id) throw new AppError("VALIDATION_ERROR", "Pickup and drop locations must be different.");
  const route = await p.route(from, to);
  return { from, to, route };
}
