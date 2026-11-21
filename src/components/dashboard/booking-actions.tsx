"use client";

import { Download, Headset, Loader2, Lock, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { usePayment } from "@/components/payment/use-payment";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, errorMessage } from "@/lib/api-client";
import { formatINR } from "@/utils/money";

type Props = {
  bookingId: string;
  description: string;
  canPay: boolean;
  canCancel: boolean;
  hasInvoice: boolean;
  totalAmount: number;
  wasPaid: boolean;
  quote: { refundPercent: number; refundAmount: number; label: string } | null;
  mockPayments: boolean;
};

export function BookingActions({ bookingId, description, canPay, canCancel, hasInvoice, totalAmount, wasPaid, quote, mockPayments }: Props) {
  const router = useRouter();
  const payment = usePayment({ mockPayments });
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function cancel() {
    setCancelling(true);
    try {
      await api(`/api/bookings/${bookingId}/cancel`, { method: "PATCH" });
      toast.success("Booking cancelled");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canPay && (
          <Button size="lg" className="h-10 gap-2" disabled={payment.busy} onClick={() => void payment.pay(bookingId, description).catch(() => {})}>
            {payment.busy ? <Loader2 className="animate-spin" /> : <Lock />} Pay {formatINR(totalAmount)}
          </Button>
        )}
        {hasInvoice && (
          <>
            <a href={`/api/bookings/${bookingId}/invoice?download=1`} className={buttonVariants({ variant: "outline", size: "lg" }) + " h-10 gap-2"}><Download /> Download invoice</a>
            <a href={`/api/bookings/${bookingId}/invoice`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "lg" }) + " h-10"}>View / print</a>
          </>
        )}
        <Link href="/contact" className={buttonVariants({ variant: "ghost", size: "lg" }) + " h-10 gap-2"}><Headset /> Contact support</Link>
        {canCancel && <Button variant="destructive" size="lg" className="h-10 gap-2" onClick={() => setOpen(true)}><XCircle /> Cancel booking</Button>}
      </div>
      {payment.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{payment.error}</p>}
      {payment.dialog}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this booking?</DialogTitle>
            <DialogDescription>
              {wasPaid && quote
                ? <>{quote.label}: you will receive <b>{quote.refundPercent}%</b> ({formatINR(quote.refundAmount, { decimals: true })}) back to your original payment method.</>
                : "This booking is unpaid, so there is no charge."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Keep booking</Button>
            <Button variant="destructive" disabled={cancelling} onClick={cancel}>{cancelling && <Loader2 className="animate-spin" />} Yes, cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
