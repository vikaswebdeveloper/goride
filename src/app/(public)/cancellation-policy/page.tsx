import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";
import { businessConfig } from "@/config/site";

export const metadata: Metadata = { title: "Cancellation Policy" };

export default function CancellationPolicy() {
  return (
    <ContentPage title="Cancellation Policy" intro="Plans change. Here is what you get back.">
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr><th className="p-3">When you cancel</th><th className="p-3">Refund</th></tr>
          </thead>
          <tbody>
            {businessConfig.cancellationPolicy.map((t) => (
              <tr key={t.label} className="border-t"><td className="p-3">{t.label}</td><td className="p-3 font-semibold">{t.refundPercent}% of amount paid</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul>
        <li>Unpaid bookings can be cancelled at any time at no charge.</li>
        <li>Refunds go back to the original payment method and typically take 5 to 7 working days.</li>
        <li>Trips that have already started cannot be cancelled online.</li>
        <li>If we cannot provide your vehicle, you receive a full refund.</li>
      </ul>
    </ContentPage>
  );
}
