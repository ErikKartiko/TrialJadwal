// ─── Intelligent status engine ──────────────────────────────────────────────
// Status is never derived from the date alone. It combines: calendar date,
// completion state, preparation progress and review state.

import type {
  Agenda,
  AppNotification,
  AppState,
  Course,
  CourseHealth,
  EffectiveStatus,
} from "./types";
import { addDays, diffDays, formatLong, todayStr } from "./dates";

export function prepStats(a: Agenda): { done: number; total: number; pct: number } {
  const total = a.preparation.length;
  const done = a.preparation.filter((p) => p.done).length;
  return { done, total, pct: total === 0 ? 0 : done / total };
}

export type PrepLevel = "ready" | "partial" | "not-ready" | "none";

export function prepLevel(a: Agenda): PrepLevel {
  const { done, total } = prepStats(a);
  if (total === 0) return "none";
  if (done === total) return "ready";
  if (done === 0) return "not-ready";
  return "partial";
}

/** Effective status combining date + completion + preparation. */
export function effectiveStatus(a: Agenda, today = todayStr()): EffectiveStatus {
  if (a.completion === "completed") return "completed";
  if (a.completion === "in-progress") return "in-progress";
  const d = diffDays(today, a.date);
  if (d < 0) return "missed";
  const { done, total } = prepStats(a);
  if (total > 0 && done === total) return "ready";
  if (done > 0) return "preparing";
  return "planned";
}

export const STATUS_META: Record<
  EffectiveStatus,
  { label: string; text: string; bg: string; dot: string; ring: string }
> = {
  planned: {
    label: "Planned",
    text: "text-slate-600",
    bg: "bg-slate-100",
    dot: "bg-slate-400",
    ring: "ring-slate-200",
  },
  preparing: {
    label: "Preparing",
    text: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    ring: "ring-amber-200",
  },
  ready: {
    label: "Ready",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  "in-progress": {
    label: "In Progress",
    text: "text-blue-700",
    bg: "bg-blue-50",
    dot: "bg-blue-500",
    ring: "ring-blue-200",
  },
  completed: {
    label: "Completed",
    text: "text-teal-700",
    bg: "bg-teal-50",
    dot: "bg-teal-500",
    ring: "ring-teal-200",
  },
  missed: {
    label: "Missed",
    text: "text-red-700",
    bg: "bg-red-50",
    dot: "bg-red-500",
    ring: "ring-red-200",
  },
};

// ─── Course progress & health ───────────────────────────────────────────────

export interface CourseProgress {
  course: Course;
  meetings: Agenda[];
  total: number;
  completed: number;
  reviewed: number;
  /** meetings whose date is today or in the past */
  due: number;
  missed: number;
  next: Agenda | null;
  health: CourseHealth;
  pct: number;
}

export function courseProgress(course: Course, agendas: Agenda[], today = todayStr()): CourseProgress {
  const meetings = agendas
    .filter((a) => a.courseId === course.id)
    .sort((x, y) => (x.meetingNumber ?? 999) - (y.meetingNumber ?? 999) || (x.date < y.date ? -1 : 1));
  const total = Math.max(course.totalMeetings, meetings.length);
  const completed = meetings.filter((a) => a.completion === "completed").length;
  const reviewed = meetings.filter((a) => a.completion === "completed" && a.review).length;
  const due = meetings.filter((a) => diffDays(today, a.date) <= 0).length;
  const missed = meetings.filter((a) => effectiveStatus(a, today) === "missed").length;
  const upcoming = meetings
    .filter((a) => a.completion !== "completed" && diffDays(today, a.date) >= 0)
    .sort((x, y) => (x.date < y.date ? -1 : 1));
  let health: CourseHealth = "idle";
  if (meetings.length === 0) health = "idle";
  else if (completed >= total && total > 0) health = "completed";
  else if (missed >= 2 || completed + 1 < due) health = "behind";
  else if (missed === 1 || completed < due) health = "attention";
  else health = "on-track";
  return {
    course,
    meetings,
    total,
    completed,
    reviewed,
    due,
    missed,
    next: upcoming[0] ?? null,
    health,
    pct: total === 0 ? 0 : completed / total,
  };
}

export const HEALTH_META: Record<CourseHealth, { label: string; cls: string; dot: string }> = {
  "on-track": { label: "On Track", cls: "text-emerald-700 bg-emerald-50 ring-emerald-200", dot: "bg-emerald-500" },
  attention: { label: "Attention", cls: "text-amber-700 bg-amber-50 ring-amber-200", dot: "bg-amber-500" },
  behind: { label: "Behind", cls: "text-red-700 bg-red-50 ring-red-200", dot: "bg-red-500" },
  completed: { label: "Completed", cls: "text-teal-700 bg-teal-50 ring-teal-200", dot: "bg-teal-500" },
  idle: { label: "No Sessions", cls: "text-slate-600 bg-slate-100 ring-slate-200", dot: "bg-slate-400" },
};

// ─── Notification engine ────────────────────────────────────────────────────
// Reminders are derived from agenda dates + settings at render time, so they
// can never go stale. Dismissed ids are persisted separately.

export function computeNotifications(state: Pick<AppState, "agendas" | "courses" | "settings" | "dismissedNotifIds">, today = todayStr()): AppNotification[] {
  const out: AppNotification[] = [];
  const { reminders } = state.settings;
  const courseOf = (a: Agenda) => state.courses.find((c) => c.id === a.courseId);
  const upcomingWeek = state.agendas.filter((a) => {
    const d = diffDays(today, a.date);
    return d >= 0 && d <= 7 && a.completion !== "completed";
  });

  for (const a of state.agendas) {
    if (a.completion === "completed") {
      if (reminders.review && !a.review && diffDays(a.date, today) <= 7) {
        const c = courseOf(a);
        out.push({
          id: `${a.id}-review`,
          type: "review",
          agendaId: a.id,
          title: "Isi Teaching Review",
          message: `${c?.name ?? "Kuliah"}${a.meetingNumber ? ` Pertemuan ${a.meetingNumber}` : ""} sudah selesai — jangan lupa mengisi review.`,
          date: a.date,
        });
      }
      continue;
    }
    const c = courseOf(a);
    const name = c?.name ?? "Agenda";
    const label = `${name}${a.meetingNumber ? ` Pertemuan ${a.meetingNumber}` : ""}`;
    const d = diffDays(today, a.date);

    if (d === 7 && reminders.h7)
      out.push({ id: `${a.id}-h7`, type: "h7", agendaId: a.id, title: "7 hari lagi", message: `${label} akan berlangsung dalam 7 hari (${formatLong(a.date)}).`, date: a.date });
    if (d === 3 && reminders.h3)
      out.push({ id: `${a.id}-h3`, type: "h3", agendaId: a.id, title: "Persiapan H-3", message: `Persiapkan materi ${label} — 3 hari lagi.`, date: a.date });
    if (d === 1 && reminders.h1)
      out.push({ id: `${a.id}-h1`, type: "h1", agendaId: a.id, title: "Besok mengajar", message: `Besok Anda mengajar ${label}.`, date: a.date });
    if (d === 0 && reminders.h0)
      out.push({ id: `${a.id}-h0`, type: "h0", agendaId: a.id, title: "Hari ini mengajar", message: `Hari ini Anda mengajar ${label}.`, date: a.date });

    const { done, total } = prepStats(a);
    if (reminders.prep && d >= 0 && d <= 3 && total > 0 && done < total)
      out.push({ id: `${a.id}-prep`, type: "prep", agendaId: a.id, title: "Persiapan belum lengkap", message: `Persiapan ${label} baru ${done}/${total}.`, date: a.date });

    if (d < 0 && d >= -14)
      out.push({ id: `${a.id}-missed`, type: "missed", agendaId: a.id, title: "Agenda terlewat", message: `${label} (${formatLong(a.date)}) belum ditandai selesai.`, date: a.date });
  }

  if (upcomingWeek.length > 0)
    out.push({
      id: `digest-${today}`,
      type: "digest",
      agendaId: null,
      title: "Agenda minggu ini",
      message: `${upcomingWeek.length} agenda dalam 7 hari ke depan.`,
      date: today,
    });

  const order: Record<string, number> = { missed: 0, h0: 1, prep: 2, h1: 3, review: 4, h3: 5, h7: 6, digest: 7 };
  out.sort((x, y) => (order[x.type] ?? 9) - (order[y.type] ?? 9) || (x.date < y.date ? -1 : 1));
  return out;
}

export function agendaSummaryLine(a: Agenda, courses: Course[]): string {
  const c = courses.find((x) => x.id === a.courseId);
  return `${c?.name ?? "?"}${a.meetingNumber != null ? ` — Pertemuan ${a.meetingNumber}` : ""}`;
}

/** Build a sensible default preparation checklist for an agenda. */
export function defaultPrepItems(input: {
  practical?: string;
  assignment?: string;
  courseName?: string;
}): import("./types").PrepItem[] {
  const items: import("./types").PrepItem[] = [
    { id: uidP(), label: "Materi sudah dipelajari", done: false },
    { id: uidP(), label: "Slide sudah disiapkan", done: false },
    { id: uidP(), label: "Source code / demo sudah disiapkan", done: false },
    { id: uidP(), label: "Contoh sudah disiapkan", done: false },
  ];
  const cn = (input.courseName ?? "").toLowerCase();
  if (cn.includes("rs") || cn.includes("remote sensing") || cn.includes("sig") || cn.includes("penginderaan"))
    items.push({ id: uidP(), label: "Dataset sudah disiapkan", done: false });
  if (input.practical) items.push({ id: uidP(), label: "Praktikum sudah disiapkan", done: false });
  if (input.assignment) items.push({ id: uidP(), label: "Tugas sudah disiapkan", done: false });
  return items;
}

let prepCounter = 0;
function uidP(): string {
  prepCounter += 1;
  return `prep-${Date.now().toString(36)}-${prepCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Split material text into coverage checklist items for the review. */
export function coverageFromMaterial(material: string, subMaterial: string): import("./types").ReviewCoverage[] {
  const src = subMaterial ? `${material}, ${subMaterial}` : material;
  const parts = src
    .split(/[,;\n•\-–]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
    .slice(0, 8);
  const list = parts.length > 0 ? parts : [material || "Materi"];
  return list.map((label, i) => ({ id: `cov-${i}-${label.length}`, label, covered: false }));
}

export { addDays };
