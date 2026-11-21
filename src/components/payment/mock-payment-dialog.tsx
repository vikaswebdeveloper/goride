"use client";

import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatINR } from "@/utils/money";

/** Local-development stand-in for Razorpay Checkout (only shown when PAYMENT_PROVIDER=mock). */
export function MockPaymentDialog({ open, amount, onPay, onFail, onClose }: { open: boolean; amount: number; onPay: () => void; onFail: () => void; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FlaskConical className="size-5 text-amber-500" /> Payment simulator</DialogTitle>
          <DialogDescription>
            Development mode: no real gateway is configured, so no money moves. Set Razorpay test keys to use real Checkout.
          </DialogDescription>
        </DialogHeader>
        <p className="text-2xl font-bold">{formatINR(amount, { decimals: true })}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={onPay}>Simulate successful payment</Button>
          <Button className="flex-1" variant="outline" onClick={onFail}>Simulate failure</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
