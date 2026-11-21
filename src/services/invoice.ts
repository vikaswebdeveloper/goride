import type { Booking, Car, Payment } from "@prisma/client";
import { siteConfig } from "@/config/site";
import { formatDateDisplay, formatTimeDisplay, fromDateOnly } from "@/utils/dates";
import { formatINR } from "@/utils/money";
import type { FareBreakdown } from "./pricing.engine";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Self-contained, print-friendly invoice (use the browser's "Save as PDF"). All dynamic values are HTML-escaped. */
export function renderInvoiceHtml(b: Booking & { car: Car; payments: Payment[] }): string {
  const fare = b.fareSnapshot as unknown as FareBreakdown;
  const paid = b.payments.find((p) => p.paymentStatus === "PAID" || p.paymentStatus === "REFUNDED" || p.paymentStatus === "REFUND_PENDING");
  const rows = fare.lines
    .map((l) => `<tr><td>${esc(l.label)}</td><td class="r">${esc(formatINR(l.amount, { decimals: true }))}</td></tr>`)
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Invoice ${esc(b.bookingReference)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:Arial,Helvetica,sans-serif;color:#12203a;max-width:760px;margin:32px auto;padding:0 20px}
h1{color:#2f5bea;margin:0}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:8px;border-bottom:1px solid #e5e9f2;text-align:left;font-size:14px}
.r{text-align:right}.tot td{font-weight:700;font-size:16px;border-top:2px solid #12203a}.muted{color:#667085;font-size:12px}
.badge{display:inline-block;padding:2px 10px;border-radius:99px;background:#e8f0ff;color:#2f5bea;font-size:12px;font-weight:600}
@media print{button{display:none}}</style></head><body>
<button onclick="window.print()" style="float:right;padding:8px 14px">Print / Save as PDF</button>
<h1>${esc(siteConfig.name)}</h1><p class="muted">${esc(siteConfig.legalName)} · GSTIN ${esc(siteConfig.gstin)}</p>
<h2>Booking receipt <span class="badge">${esc(b.paymentStatus.replace("_", " "))}</span></h2>
<table><tr><td>Booking ID</td><td class="r"><b>${esc(b.bookingReference)}</b></td></tr>
<tr><td>Customer</td><td class="r">${esc(b.customerName)} · ${esc(b.customerPhone)}</td></tr>
<tr><td>Route</td><td class="r">${esc(b.pickupLocation)} → ${esc(b.dropLocation)} (${b.journeyType === "ROUND_TRIP" ? "Round trip" : "One way"})</td></tr>
<tr><td>Pickup</td><td class="r">${esc(formatDateDisplay(fromDateOnly(b.pickupDate)))}, ${esc(formatTimeDisplay(b.pickupTime))}</td></tr>
${b.returnDate ? `<tr><td>Return</td><td class="r">${esc(formatDateDisplay(fromDateOnly(b.returnDate)))}</td></tr>` : ""}
<tr><td>Vehicle</td><td class="r">${esc(b.car.brand)} ${esc(b.car.model)}</td></tr>
<tr><td>Estimated distance</td><td class="r">${esc(String(b.estimatedDistance))} km</td></tr></table>
<table><thead><tr><th>Fare details</th><th class="r">Amount</th></tr></thead><tbody>${rows}
<tr class="tot"><td>Total ${b.paymentStatus === "PAID" ? "paid" : "payable"}</td><td class="r">${esc(formatINR(b.totalAmount.toString(), { decimals: true }))}</td></tr></tbody></table>
${paid ? `<p class="muted">Payment ref: ${esc(paid.razorpayPaymentId ?? "-")} · Order: ${esc(paid.razorpayOrderId)}${paid.paymentMethod ? ` · ${esc(paid.paymentMethod)}` : ""}</p>` : ""}
<p class="muted">Toll, parking and state-border charges, where applicable, are payable to the driver. Distances are estimates.</p>
</body></html>`;
}
