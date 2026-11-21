import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "About us" };

export default function About() {
  return (
    <ContentPage title={`About ${siteConfig.name}`} intro="Outstation travel, made simple and transparent.">
      <p>{siteConfig.name} connects travellers with comfortable, well-maintained cars and verified drivers for city-to-city journeys across India.</p>
      <h2>What we believe</h2>
      <ul>
        <li>Prices should be clear before you pay. Every fare shows its full breakdown.</li>
        <li>Safety and comfort come first: verified drivers, clean vehicles.</li>
        <li>Booking should take minutes, not phone calls.</li>
      </ul>
      <p className="text-sm text-muted-foreground">This is a demonstration build. Sample pricing and fleet data are placeholders.</p>
    </ContentPage>
  );
}
