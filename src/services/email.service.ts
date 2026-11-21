import { Resend } from "resend";
import { siteConfig } from "@/config/site";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { formatDateDisplay, formatTimeDisplay, fromDateOnly } from "@/utils/dates";
import { formatINR } from "@/utils/money";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Best-effort: never throws. If RESEND_API_KEY is not configured the email is skipped (and logged). */
export async function sendBookingConfirmation(bookingId: string): Promise<void> {
  try {
    const key = process.env.RESEND_API_KEY;
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, include: { car: true } });
    if (!b) return;
    if (!key) {
      logger.info("Email skipped (RESEND_API_KEY not set)", { bookingReference: b.bookingReference });
      return;
    }
    const date = formatDateDisplay(fromDateOnly(b.pickupDate));
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#12203a">
      <h2 style="color:#2f5bea">${esc(siteConfig.name)} – Booking confirmed</h2>
      <p>Hi ${esc(b.customerName)}, your ride is confirmed.</p>
      <table style="width:100%;border-collapse:collapse" cellpadding="6">
        <tr><td>Booking ID</td><td><b>${esc(b.bookingReference)}</b></td></tr>
        <tr><td>Route</td><td>${esc(b.pickupLocation)} → ${esc(b.dropLocation)}</td></tr>
        <tr><td>Pickup</td><td>${esc(date)}, ${esc(formatTimeDisplay(b.pickupTime))}</td></tr>
        <tr><td>Car</td><td>${esc(b.car.brand)} ${esc(b.car.model)}</td></tr>
        <tr><td>Amount paid</td><td><b>${esc(formatINR(b.totalAmount.toString(), { decimals: true }))}</b></td></tr>
      </table>
      <p style="font-size:12px;color:#667">Toll and parking charges, if any, are payable to the driver. Need help? ${esc(siteConfig.supportEmail)}</p></div>`;
    const resend = new Resend(key);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? `${siteConfig.name} <onboarding@resend.dev>`,
      to: b.customerEmail,
      subject: `Booking confirmed – ${b.bookingReference}`,
      html,
    });
  } catch (e) {
    logger.error("Confirmation email failed", { bookingId, err: e instanceof Error ? e.message : String(e) });
  }
}
