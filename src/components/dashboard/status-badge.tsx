import type { BookingStatus, PaymentStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const booking: Record<BookingStatus, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "Awaiting payment", cls: "bg-amber-100 text-amber-800" },
  CONFIRMED: { label: "Confirmed", cls: "bg-emerald-100 text-emerald-800" },
  COMPLETED: { label: "Completed", cls: "bg-blue-100 text-blue-800" },
  CANCELLED: { label: "Cancelled", cls: "bg-rose-100 text-rose-800" },
  EXPIRED: { label: "Expired", cls: "bg-slate-200 text-slate-700" },
};
const payment: Record<PaymentStatus, { label: string; cls: string }> = {
  PENDING: { label: "Payment pending", cls: "bg-amber-100 text-amber-800" },
  PAID: { label: "Paid", cls: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "Payment failed", cls: "bg-rose-100 text-rose-800" },
  REFUND_PENDING: { label: "Refund processing", cls: "bg-violet-100 text-violet-800" },
  REFUNDED: { label: "Refunded", cls: "bg-slate-200 text-slate-700" },
};

const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
export const BookingStatusBadge = ({ status }: { status: BookingStatus }) => <span className={cn(base, booking[status].cls)}>{booking[status].label}</span>;
export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => <span className={cn(base, payment[status].cls)}>{payment[status].label}</span>;
