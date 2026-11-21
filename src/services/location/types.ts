export type Place = {
  id: string;
  name: string; // "Jaipur"
  state: string; // "Rajasthan"
  label: string; // "Jaipur, Rajasthan"
  lat: number;
  lng: number;
};

export type RouteInfo = {
  distanceKm: number;
  durationMins: number;
  /** true when computed from straight-line distance (mock provider) rather than a routing API */
  isEstimate: boolean;
};

/** Swap implementations (mock, Mapbox, Google) without touching callers. */
export interface LocationProvider {
  readonly name: string;
  search(query: string, limit?: number): Promise<Place[]>;
  /** Resolve a client-supplied place id to a trusted Place. Never trust client coordinates. */
  resolve(id: string): Promise<Place | null>;
  route(from: Place, to: Place): Promise<RouteInfo>;
}
