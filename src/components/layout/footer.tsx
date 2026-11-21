import { Mail, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Logo } from "./logo";

const cols = [
  { title: "Company", links: [["About Us", "/about"], ["Contact", "/contact"], ["Popular routes", "/routes"]] },
  { title: "Legal", links: [["Terms & Conditions", "/terms"], ["Privacy Policy", "/privacy"], ["Cancellation Policy", "/cancellation-policy"]] },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{siteConfig.description}</p>
          <div className="flex gap-2 pt-1">
            {[["WhatsApp", MessageCircle, `https://wa.me/${siteConfig.supportPhone.replace(/\D/g, "")}`], ["Email", Mail, `mailto:${siteConfig.supportEmail}`]].map(([label, Icon, href]) => {
              const I = Icon as typeof Mail;
              return (
                <a key={label as string} href={href as string} aria-label={label as string} className="grid size-9 place-items-center rounded-full border text-muted-foreground transition hover:border-primary hover:text-primary">
                  <I className="size-4" />
                </a>
              );
            })}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="mb-3 text-sm font-semibold">{c.title}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="hover:text-foreground">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="mb-3 text-sm font-semibold">24/7 support</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Phone className="size-4" /> {siteConfig.supportPhone}</li>
            <li className="flex items-center gap-2"><Mail className="size-4" /> {siteConfig.supportEmail}</li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {siteConfig.name}. Prices and fares shown are estimates. Demo build – sample pricing only.
        </p>
      </div>
    </footer>
  );
}
