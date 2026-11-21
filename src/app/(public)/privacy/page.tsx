import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <ContentPage title="Privacy Policy" intro="How we handle your information.">
      <p className="text-sm text-muted-foreground">Template text for the demo build. Have it reviewed by legal counsel before launch.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, phone.</li>
        <li>Trip details: pickup and drop, dates, passenger count.</li>
        <li>Payment status and references. Card and UPI details are handled by Razorpay and never stored on our servers.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide and support your booking, send confirmations, prevent fraud, and meet legal obligations.</p>
      <h2>Your choices</h2>
      <p>You may request access, correction or deletion of your data by contacting support.</p>
    </ContentPage>
  );
}
