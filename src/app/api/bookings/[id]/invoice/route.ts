import { route } from "@/lib/api";
import { requireUserApi } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { getOwnedBooking } from "@/services/booking.service";
import { renderInvoiceHtml } from "@/services/invoice";

export const GET = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUserApi();
  const { id } = await params;
  const b = await getOwnedBooking(user, id);
  if (b.bookingStatus === "PENDING_PAYMENT" || b.paymentStatus === "PENDING") throw new AppError("CONFLICT", "An invoice is available after payment.");
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(renderInvoiceHtml(b), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
      ...(download ? { "Content-Disposition": `attachment; filename="invoice-${b.bookingReference}.html"` } : {}),
    },
  });
});
