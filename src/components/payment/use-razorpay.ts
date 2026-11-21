"use client";

import { useCallback } from "react";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

type RazorpayOptions = {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (r: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = { open: () => void; on: (evt: "payment.failed", cb: (r: { error: { description: string } }) => void) => void };
declare global {
  interface Window { Razorpay?: new (o: RazorpayOptions) => RazorpayInstance }
}

let loading: Promise<boolean> | null = null;
function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  loading ??= new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { loading = null; resolve(false); };
    document.body.appendChild(s);
  });
  return loading;
}

export function useRazorpay() {
  return useCallback(
    async (opts: Omit<RazorpayOptions, "theme"> & { onFailed: (reason: string) => void }) => {
      if (!(await loadScript()) || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection and try again.");
      const { onFailed, ...rest } = opts;
      const rzp = new window.Razorpay({ ...rest, theme: { color: "#3b63e8" } });
      rzp.on("payment.failed", (r) => onFailed(r.error.description));
      rzp.open();
    },
    [],
  );
}
