// All money maths is done in integer paise to avoid floating-point drift.
import type { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string;

export function toPaise(value: DecimalLike): number {
  return Math.round(Number(value.toString()) * 100);
}

export function fromPaise(paise: number): number {
  return Math.round(paise) / 100;
}

export function formatINR(value: DecimalLike, opts: { decimals?: boolean } = {}): string {
  const n = Number(value.toString());
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(n);
}
