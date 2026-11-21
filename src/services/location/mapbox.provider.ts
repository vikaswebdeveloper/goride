import type { LocationProvider, Place, RouteInfo } from "./types";

type GeoFeature = {
  id: string; text: string; place_name: string; center: [number, number];
  context?: { id: string; text: string }[];
};

/**
 * Mapbox adapter (Geocoding v5 + Directions v5). Enabled when MAPBOX_ACCESS_TOKEN is set.
 * Server-side only: the token never reaches the browser; the client talks to /api/locations/*.
 * Place ids are "mb:<lng>,<lat>|<name>|<state>" so resolve() works without another network call.
 */
export class MapboxLocationProvider implements LocationProvider {
  readonly name = "mapbox";
  constructor(private readonly token: string) {}

  private encode(f: GeoFeature): Place {
    const state = f.context?.find((c) => c.id.startsWith("region"))?.text ?? "India";
    const [lng, lat] = f.center;
    return {
      id: `mb:${lng.toFixed(5)},${lat.toFixed(5)}|${f.text}|${state}`,
      name: f.text, state, label: f.place_name.replace(/, India$/, ""), lat, lng,
    };
  }

  async search(query: string, limit = 8): Promise<Place[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?country=in&types=place,locality,district&autocomplete=true&limit=${limit}&access_token=${this.token}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Mapbox geocoding failed (${res.status})`);
    const json = (await res.json()) as { features: GeoFeature[] };
    return json.features.map((f) => this.encode(f));
  }

  async resolve(id: string): Promise<Place | null> {
    const m = /^mb:(-?\d+\.\d+),(-?\d+\.\d+)\|([^|]+)\|(.+)$/.exec(id);
    if (!m) return null;
    return { id, name: m[3], state: m[4], label: `${m[3]}, ${m[4]}`, lng: Number(m[1]), lat: Number(m[2]) };
  }

  async route(from: Place, to: Place): Promise<RouteInfo> {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&access_token=${this.token}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`Mapbox directions failed (${res.status})`);
    const json = (await res.json()) as { routes: { distance: number; duration: number }[] };
    const r = json.routes[0];
    if (!r) throw new Error("No route found");
    return { distanceKm: Math.round(r.distance / 1000), durationMins: Math.round(r.duration / 60), isEstimate: false };
  }
}
