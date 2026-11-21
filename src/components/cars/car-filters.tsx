"use client";

import { SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { categoryLabels } from "@/config/site";

const sel = "h-10 rounded-xl border bg-card px-3 text-sm font-medium outline-none focus:border-primary focus:ring-3 focus:ring-ring/30";

/** Filters live in the URL so results stay server-rendered, shareable and back-button friendly. */
export function CarFilters() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  function set(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value); else p.delete(key);
    start(() => router.replace(`${path}?${p}`, { scroll: false }));
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${pending ? "opacity-60" : ""}`} role="group" aria-label="Filter and sort cars">
      <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
      <label className="sr-only" htmlFor="f-sort">Sort by</label>
      <select id="f-sort" className={sel} value={sp.get("sort") ?? "price_asc"} onChange={(e) => set("sort", e.target.value)}>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="seats">Seating capacity</option>
      </select>
      <label className="sr-only" htmlFor="f-cat">Category</label>
      <select id="f-cat" className={sel} value={sp.get("category") ?? ""} onChange={(e) => set("category", e.target.value)}>
        <option value="">All categories</option>
        {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label className="sr-only" htmlFor="f-seats">Minimum seats</label>
      <select id="f-seats" className={sel} value={sp.get("minSeats") ?? ""} onChange={(e) => set("minSeats", e.target.value)}>
        <option value="">Any seats</option>
        {[4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}+ seats</option>)}
      </select>
    </div>
  );
}
