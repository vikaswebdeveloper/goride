// Dates are business-local (India, IST = UTC+05:30, no DST). Booking dates are plain "YYYY-MM-DD" strings.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function nowIST(now: Date = new Date()): { date: string; minutes: number } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const date = ist.toISOString().slice(0, 10);
  return { date, minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes() };
}

export function parseHHmm(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Absolute instant of pickup (date + HH:mm interpreted in IST). */
export function pickupInstant(dateStr: string, time: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const mins = parseHHmm(time);
  return new Date(Date.UTC(y, mo - 1, d, 0, 0) + mins * 60_000 - IST_OFFSET_MS);
}

/** Inclusive number of calendar days between two YYYY-MM-DD strings (same day => 1). */
export function inclusiveDays(from: string, to: string): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000) + 1;
}

export function addDays(dateStr: string, days: number): string {
  return new Date(Date.parse(dateStr + "T00:00:00Z") + days * 86_400_000).toISOString().slice(0, 10);
}

export function toDateOnly(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00Z");
}

export function fromDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
}

export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m ? m + "m" : ""}`.trim() : `${m}m`;
}

/** Whole minutes from now until `date` (0 if past). */
export function minutesUntil(date: Date): number {
  return Math.max(0, Math.round((date.getTime() - Date.now()) / 60_000));
}
