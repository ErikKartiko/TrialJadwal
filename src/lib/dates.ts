// ─── Timezone-safe calendar date utilities ──────────────────────────────────
// All dates are handled as plain calendar days ("yyyy-mm-dd"), never as UTC
// timestamps, so a day never "shifts" because of timezone offsets.

export const ID_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export const ID_MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
export const ID_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export const ID_DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Today's calendar date (local) as yyyy-mm-dd */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function nowTime(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** "yyyy-mm-dd" -> [y, m, d] */
export function parts(s: string): [number, number, number] {
  const [y, m, d] = s.split("-").map(Number);
  return [y || 0, m || 1, d || 1];
}

export function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = parts(s);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Serial-day number for civil-date arithmetic (no DST issues) */
function serial(s: string): number {
  const [y, m, d] = parts(s);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function fromSerial(n: number): string {
  const dt = new Date(n * 86400000);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function addDays(s: string, n: number): string {
  return fromSerial(serial(s) + n);
}

/** Days from `a` to `b` (b - a). Positive when b is in the future. */
export function diffDays(a: string, b: string): number {
  return serial(b) - serial(a);
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(s: string): number {
  const dt = new Date(serial(s) * 86400000);
  return dt.getUTCDay();
}

/** Monday-first index 0..6 */
export function weekdayMonFirst(s: string): number {
  return (weekdayOf(s) + 6) % 7;
}

export function startOfWeek(s: string): string {
  return addDays(s, -weekdayMonFirst(s));
}

export function startOfMonth(s: string): string {
  const [y, m] = parts(s);
  return `${y}-${pad2(m)}-01`;
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/** "2026-09-03" -> "3 September 2026" */
export function formatLong(s: string): string {
  if (!isValidDateStr(s)) return s || "—";
  const [y, m, d] = parts(s);
  return `${d} ${ID_MONTHS[m - 1]} ${y}`;
}

/** "2026-09-03" -> "3 Sep 2026" */
export function formatShort(s: string): string {
  if (!isValidDateStr(s)) return s || "—";
  const [y, m, d] = parts(s);
  return `${d} ${ID_MONTHS_SHORT[m - 1]} ${y}`;
}

/** "2026-09-03" -> "Kamis, 3 September 2026" */
export function formatFull(s: string): string {
  if (!isValidDateStr(s)) return s || "—";
  return `${ID_DAYS[weekdayOf(s)]}, ${formatLong(s)}`;
}

export function dayName(s: string): string {
  return ID_DAYS[weekdayOf(s)] ?? "";
}

/** "2026-09" -> "September 2026" */
export function formatMonth(s: string): string {
  const [y, m] = parts(`${s}-01`);
  return `${ID_MONTHS[m - 1]} ${y}`;
}

/** Human relationship to today: TODAY / TOMORROW / YESTERDAY / IN N DAYS / N DAYS AGO */
export function relativeLabel(s: string, today = todayStr()): string {
  const d = diffDays(today, s);
  if (d === 0) return "TODAY";
  if (d === 1) return "TOMORROW";
  if (d === -1) return "YESTERDAY";
  if (d > 1) return `IN ${d} DAYS`;
  return `${-d} DAYS AGO`;
}

export function timeRange(a: AgendaLike): string {
  if (a.startTime && a.endTime) return `${a.startTime} – ${a.endTime}`;
  if (a.startTime) return a.startTime;
  return "";
}

interface AgendaLike {
  startTime: string;
  endTime: string;
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
