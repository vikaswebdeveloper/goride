import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { processWebhook } from "@/services/payment.service";

export const runtime = "nodejs";

/**
 * Razorpay webhook. Signature is verified against the RAW body, so do not parse before verifying.
 * Called server-to-server (no browser origin), hence skipOriginCheck. Always answers 200 for
 * valid-but-duplicate events so Razorpay stops retrying.
 */
export const POST = route(
  async (req) => {
    const raw = await req.text();
    const r = await processWebhook(raw, req.headers.get("x-razorpay-signature"), req.headers.get("x-razorpay-event-id"));
    return NextResponse.json({ success: true, status: r.status });
  },
  { skipOriginCheck: true },
);
