"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { siteConfig } from "@/config/site";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { MockPaymentDialog } from "./mock-payment-dialog";
import { useRazorpay } from "./use-razorpay";

type Verify = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type Order = { orderId: string; amountPaise: number; currency: string; keyId: string; provider: string; prefill: { name: string; email: string; contact: string } };

/**
 * Drives: create-order -> Razorpay Checkout (or dev simulator) -> server-side verify -> redirect.
 * The booking is only confirmed by the server after signature verification; this hook never decides that.
 */
export function usePayment({ mockPayments }: { mockPayments: boolean }) {
  const router = useRouter();
  const openRazorpay = useRazorpay();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState<{ orderId: string; amount: number; bookingId: string } | null>(null);

  async function verify(r: Verify, bookingId: string) {
    try {
      await api("/api/payments/verify", { method: "POST", body: r });
      router.push(`/bookings/${bookingId}?confirmed=1`);
      router.refresh();
    } catch (e) {
      setBusy(false);
      setError(errorMessage(e));
      if (e instanceof ApiError && e.code === "UNAVAILABLE") router.push(`/bookings/${bookingId}`);
    }
  }

  async function pay(bookingId: string, description: string) {
    setBusy(true);
    setError(null);
    try {
      const { data: order } = await api<Order>("/api/payments/create-order", { method: "POST", body: { bookingId } });
      if (mockPayments) {
        setMock({ orderId: order.orderId, amount: order.amountPaise / 100, bookingId });
        return;
      }
      await openRazorpay({
        key: order.keyId, amount: order.amountPaise, currency: order.currency, name: siteConfig.name, description,
        order_id: order.orderId, prefill: order.prefill,
        handler: (r) => void verify(r, bookingId),
        modal: { ondismiss: () => { setBusy(false); toast.message("Payment window closed. You can retry any time while your slot is held."); } },
        onFailed: (reason) => {
          setBusy(false);
          setError(`Payment failed: ${reason}. You can retry.`);
          void api("/api/payments/report-failure", { method: "POST", body: { orderId: order.orderId, reason } }).catch(() => {});
        },
      });
    } catch (e) {
      setBusy(false);
      setError(errorMessage(e));
      throw e;
    }
  }

  async function resolveMock(success: boolean) {
    if (!mock) return;
    const m = mock;
    setMock(null);
    if (!success) {
      setBusy(false);
      setError("Payment failed (simulated). You can retry.");
      await api("/api/payments/report-failure", { method: "POST", body: { orderId: m.orderId, reason: "Simulated failure" } });
      return;
    }
    const { data } = await api<Verify>("/api/payments/dev-simulate", { method: "POST", body: { orderId: m.orderId } });
    await verify(data, m.bookingId);
  }

  const dialog = (
    <MockPaymentDialog open={!!mock} amount={mock?.amount ?? 0} onPay={() => void resolveMock(true)} onFail={() => void resolveMock(false)} onClose={() => { setMock(null); setBusy(false); }} />
  );
  return { pay, busy, error, setError, dialog };
}
