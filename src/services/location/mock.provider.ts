import { businessConfig } from "@/config/site";
import { CITIES, CITY_BY_ID, type City } from "./cities";
import type { LocationProvider, Place, RouteInfo } from "./types";

const ROAD_FACTOR = 1.22; // road distance ≈ straight line × 1.22 in India (approximation)

function toPlace(c: City): Place {
  return { id: c.id, name: c.name, state: c.state, label: `${c.name}, ${c.state}`, lat: c.lat, lng: c.lng };
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export class MockLocationProvider implements LocationProvider {
  readonly name = "mock";

  async search(query: string, limit = 8): Promise<Place[]> {
    const q = query.trim().toLowerCase();
    const matches = q
      ? CITIES.filter((c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
          .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)))
      : CITIES;
    return matches.slice(0, limit).map(toPlace);
  }

  async resolve(id: string): Promise<Place | null> {
    const c = CITY_BY_ID.get(id);
    return c ? toPlace(c) : null;
  }

  async route(from: Place, to: Place): Promise<RouteInfo> {
    const distanceKm = Math.max(1, Math.round(haversineKm(from, to) * ROAD_FACTOR));
    const durationMins = Math.round((distanceKm / businessConfig.avgSpeedKmph) * 60 / 5) * 5;
    return { distanceKm, durationMins, isEstimate: true };
  }
}
