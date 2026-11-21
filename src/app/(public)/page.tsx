import { BadgeCheck, CalendarCheck, Headset, Quote, ShieldCheck, Sofa, Star, Tag, UserCheck, Wallet } from "lucide-react";
import { SearchCard } from "@/components/booking/search-card";
import { RouteCard } from "@/components/booking/route-card";
import { CatalogCarCard } from "@/components/cars/catalog-car-card";
import { siteConfig } from "@/config/site";
import { getCatalogCars, getPopularRoutes } from "@/services/catalog.service";
import { getLocationProvider } from "@/services/location.service";

const why = [
  { icon: Tag, title: "Transparent pricing", text: "Full fare breakdown upfront. No hidden charges, ever." },
  { icon: UserCheck, title: "Verified drivers", text: "Background-checked, experienced highway drivers." },
  { icon: Sofa, title: "Comfortable vehicles", text: "Clean, well-maintained, air-conditioned cars." },
  { icon: ShieldCheck, title: "Secure payments", text: "Pay safely with UPI, cards or netbanking via Razorpay." },
  { icon: Headset, title: "24/7 support", text: "Real people on call whenever you need help on the road." },
];

const steps = [
  { icon: CalendarCheck, title: "Enter journey details", text: "Pick your route, date and time." },
  { icon: BadgeCheck, title: "Select your car", text: "Compare fares, seats and features." },
  { icon: Wallet, title: "Make payment", text: "Confirm instantly with secure checkout." },
  { icon: Star, title: "Enjoy your journey", text: "Your driver arrives on time. Relax." },
];

const testimonials = [
  { name: "Priya S.", city: "Delhi", text: "Booked Delhi to Jaipur in two minutes. The fare matched exactly what was quoted and the driver was on time." },
  { name: "Rahul M.", city: "Pune", text: "Clean Ertiga, polite driver, smooth highway drive with the family. Will use again for Mumbai trips." },
  { name: "Ananya K.", city: "Bengaluru", text: "Loved the clear breakdown before paying. Mysore weekend trip was hassle-free." },
];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ fromId?: string; toId?: string }> }) {
  const sp = await searchParams;
  const provider = getLocationProvider();
  const [routes, cars, from, to] = await Promise.all([
    getPopularRoutes(),
    getCatalogCars(),
    sp.fromId ? provider.resolve(sp.fromId) : null,
    sp.toId ? provider.resolve(sp.toId) : null,
  ]);
  // One card per category for the "Popular cars" row.
  const popular = Object.values(Object.fromEntries(cars.map((c) => [c.category, c]))).slice(0, 4);

  return (
    <>
      <section className="relative isolate overflow-visible">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent via-background to-background" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_50%_at_70%_0%,oklch(0.55_0.21_262/0.12),transparent)]" />
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pt-20">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-primary shadow-soft">
              <span className="size-1.5 rounded-full bg-primary" /> Outstation cabs across India
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">{siteConfig.tagline}</h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">{siteConfig.description}</p>
          </div>
          <div id="book" className="mt-10 scroll-mt-24">
            <SearchCard key={`${from?.id}-${to?.id}`} defaults={{ from, to }} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6" aria-labelledby="routes-h">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 id="routes-h" className="text-2xl font-bold tracking-tight sm:text-3xl">Popular routes</h2>
            <p className="mt-1 text-muted-foreground">Most-booked outstation journeys. Prices are indicative one-way starting fares.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routes.slice(0, 6).map((r) => <RouteCard key={r.id} route={r} />)}
        </div>
      </section>

      <section className="bg-card py-16" aria-labelledby="why-h">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="why-h" className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Why choose {siteConfig.shortName}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {why.map(({ icon: I, title, text }) => (
              <div key={title} className="text-center">
                <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-accent text-primary"><I className="size-6" /></div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="cars-h">
        <h2 id="cars-h" className="text-2xl font-bold tracking-tight sm:text-3xl">Popular cars</h2>
        <p className="mt-1 text-muted-foreground">From hatchbacks to premium SUVs — the right ride for every trip.</p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((c) => <CatalogCarCard key={c.id} car={c} />)}
        </div>
      </section>

      <section className="bg-brand-gradient py-16 text-primary-foreground" aria-labelledby="how-h">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="how-h" className="text-center text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: I, title, text }, i) => (
              <li key={title} className="rounded-2xl bg-white/10 p-5 backdrop-blur">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-primary">{i + 1}</span>
                  <I className="size-5 opacity-80" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-white/80">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="t-h">
        <h2 id="t-h" className="text-2xl font-bold tracking-tight sm:text-3xl">Loved by travellers</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="rounded-2xl border bg-card p-6 shadow-soft">
              <Quote className="mb-3 size-6 text-primary/40" />
              <blockquote className="text-sm leading-relaxed">{t.text}</blockquote>
              <figcaption className="mt-4 flex items-center justify-between text-sm">
                <span className="font-semibold">{t.name} <span className="font-normal text-muted-foreground">· {t.city}</span></span>
                <span className="flex text-amber-500" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-3.5 fill-current" />)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Sample testimonials shown for demonstration.</p>
      </section>
    </>
  );
}
