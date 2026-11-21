import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { businessConfig, siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function Terms() {
  return (
    <ContentPage title="Terms & Conditions" intro={`Please read these terms before booking with ${siteConfig.name}.`}>
      <p className="text-sm text-muted-foreground">Template text for the demo build. Have it reviewed by legal counsel before launch.</p>
      <h2>1. Bookings</h2>
      <p>A booking is confirmed only after successful payment is verified. Fares shown before booking are estimates based on approximate distance. The amount you pay is locked when you book and will not change afterwards.</p>
      <h2>2. Fare inclusions</h2>
      <p>Fares include base fare, distance charges, driver allowance and GST ({businessConfig.gstRatePercent}%). {businessConfig.tollsNote} Kilometres beyond those billed are charged at the per-km rate shown.</p>
      <h2>3. Passengers and luggage</h2>
      <p>Passenger count may not exceed the seating capacity of the vehicle. Vehicle models are indicative (&quot;or similar&quot;).</p>
      <h2>4. Cancellations</h2>
      <p>Cancellations follow our <Link className="text-primary underline" href="/cancellation-policy">Cancellation Policy</Link>.</p>
      <h2>5. Conduct</h2>
      <p>Customers must behave respectfully towards drivers and not carry unlawful goods. The company may refuse service for unsafe conduct.</p>
    </ContentPage>
  );
}
