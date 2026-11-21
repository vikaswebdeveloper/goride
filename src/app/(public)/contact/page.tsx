import { Clock, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Contact" };

const items = [
  { Icon: Phone, title: "Call us", value: siteConfig.supportPhone, href: `tel:${siteConfig.supportPhone.replace(/\s/g, "")}` },
  { Icon: Mail, title: "Email", value: siteConfig.supportEmail, href: `mailto:${siteConfig.supportEmail}` },
  { Icon: Clock, title: "Hours", value: "24 × 7", href: "" },
];

export default function Contact() {
  return (
    <ContentPage title="Contact us" intro="We are here 24/7 for bookings, changes and trip support.">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ Icon, title, value, href }) => (
          <div key={title} className="rounded-2xl border bg-card p-5 shadow-soft">
            <Icon className="mb-2 size-5 text-primary" />
            <p className="text-sm text-muted-foreground">{title}</p>
            {href ? <a href={href} className="font-semibold hover:text-primary">{value}</a> : <p className="font-semibold">{value}</p>}
          </div>
        ))}
      </div>
      <p>When contacting support about a booking, please quote your booking ID (for example GR261118ABC123) so we can help faster.</p>
    </ContentPage>
  );
}
