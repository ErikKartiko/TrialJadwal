"use client";

// ─── Calendar: Month / Week / Day / Agenda + Daily Teaching Timeline ─────────

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarOff, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import {
  addDays,
  diffDays,
  formatLong,
  formatMonth,
  formatShort,
  ID_DAYS,
  monthKey,
  startOfMonth,
  startOfWeek,
  todayStr,
  weekdayMonFirst,
} from "@/lib/dates";
import { effectiveStatus } from "@/lib/status";
import { CourseDot, EmptyState, StatusBadge } from "@/components/ui";
import type { Agenda } from "@/lib/types";

type ViewMode = "month" | "week" | "day" | "agenda";

const VIEW_LABELS: { key: ViewMode; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "agenda", label: "Agenda" },
];

/** Daily Teaching Timeline — requirement #5 */
export function DayTimeline({ date }: { date: string }) {
  const { agendas, courses } = useApp();
  const today = todayStr();
  const items = useMemo(
    () =>
      agendas
        .filter((a) => a.date === date)
        .sort((x, y) => (x.startTime || "99:99") < (y.startTime || "99:99") ? -1 : 1),
    [agendas, date]
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="eyebrow">{ID_DAYS[weekdayMonFirst(date) === 6 ? 0 : weekdayMonFirst(date) + 1]}</p>
          <h3 className="font-display text-lg font-bold tracking-tight">{formatLong(date)}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-ink-soft">
          {items.length} agenda
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-white/60 py-8 text-center">
          <CalendarOff size={18} className="mx-auto text-ink-faint" />
          <p className="mt-2 text-sm font-medium text-ink-faint">Tidak ada agenda pada tanggal ini.</p>
        </div>
      ) : (
        <div className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line-strong">
          {items.map((a, i) => {
            const c = courses.find((x) => x.id === a.courseId);
            const st = effectiveStatus(a, today);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative"
              >
                <span
                  className="absolute -left-5 top-4 h-[11px] w-[11px] rounded-full border-2 border-cream"
                  style={{ backgroundColor: c?.color ?? "#94a3b8" }}
                />
                <Link
                  href={`/agenda/${a.id}`}
                  className={clsx(
                    "block rounded-xl border bg-white p-4 transition hover:shadow-card",
                    st === "missed" ? "border-red-200" : "border-line hover:border-line-strong"
                  )}
                >
                  {(a.startTime || a.endTime) && (
                    <p className="mb-1 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-ink-faint">
                      <Clock size={11} /> {a.startTime}{a.endTime ? ` – ${a.endTime}` : ""}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{c?.name}</span>
                    {a.meetingNumber != null && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-soft">
                        Pertemuan {a.meetingNumber}
                      </span>
                    )}
                    <StatusBadge agenda={a} today={today} />
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{a.material}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarInner() {
  const searchParams = useSearchParams();
  const { agendas, courses } = useApp();
  const today = todayStr();
  const paramDate = searchParams.get("date");

  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<string>(paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : today);
  const [selected, setSelected] = useState<string>(paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : today);

  const byDate = useMemo(() => {
    const map = new Map<string, Agenda[]>();
    for (const a of agendas) {
      if (!a.date) continue;
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    }
    map.forEach((list) => list.sort((x, y) => ((x.startTime || "99") < (y.startTime || "99") ? -1 : 1)));
    return map;
  }, [agendas]);

  const courseOf = (cid: string) => courses.find((c) => c.id === cid);

  // month grid: 6 rows x 7 cols from Monday of week containing day 1
  const monthGrid = useMemo(() => {
    const first = startOfMonth(cursor);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor]);

  const weekDays = useMemo(() => {
    const ws = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [cursor]);

  const navigate = (dir: -1 | 1) => {
    if (mode === "month") setCursor(addDays(startOfMonth(cursor), dir * 32));
    else if (mode === "week") setCursor(addDays(cursor, dir * 7));
    else if (mode === "day") setSelected(addDays(selected, dir));
    else setCursor(addDays(cursor, dir * 30));
  };

  const goToday = () => {
    setCursor(today);
    setSelected(today);
  };

  const headerLabel =
    mode === "month"
      ? formatMonth(monthKey(cursor))
      : mode === "week"
        ? `${formatShort(weekDays[0])} – ${formatShort(weekDays[6])}`
        : mode === "day"
          ? formatLong(selected)
          : "Semua agenda";

  const dayCellStatus = (date: string): string | null => {
    const list = byDate.get(date);
    if (!list || list.length === 0) return null;
    if (date === today) return "today";
    if (list.every((a) => effectiveStatus(a, today) === "completed")) return "completed";
    if (list.some((a) => effectiveStatus(a, today) === "missed")) return "missed";
    return "upcoming";
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-[13px] text-ink-faint">{headerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg ring-1 ring-line">
            {VIEW_LABELS.map((v) => (
              <button
                key={v.key}
                onClick={() => setMode(v.key)}
                className={clsx(
                  "px-3 py-2 text-xs font-semibold transition",
                  mode === v.key ? "bg-ink text-white" : "bg-white text-ink-soft hover:bg-slate-50"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={goToday} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold ring-1 ring-line transition hover:ring-accent/40">
            Today
          </button>
          <div className="flex rounded-lg ring-1 ring-line">
            <button onClick={() => navigate(-1)} className="rounded-l-lg bg-white px-2.5 py-2 transition hover:bg-slate-50" aria-label="Previous">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => navigate(1)} className="rounded-r-lg border-l border-line bg-white px-2.5 py-2 transition hover:bg-slate-50" aria-label="Next">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-ink-soft">
        {[
          ["bg-teal-500", "Selesai"],
          ["bg-blue-500", "Hari ini"],
          ["bg-slate-400", "Mendatang"],
          ["bg-red-500", "Terlewat"],
        ].map(([cls, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={clsx("h-2 w-2 rounded-full", cls)} /> {label}
          </span>
        ))}
      </div>

      {agendas.length === 0 && (
        <EmptyState
          title="Belum ada agenda"
          hint="Import file Excel Anda atau tambahkan agenda baru untuk melihat kalender."
          action={{ label: "Import Excel", href: "/import" }}
        />
      )}

      {/* ── MONTH VIEW ── */}
      {mode === "month" && agendas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="grid grid-cols-7 border-b border-line bg-slate-50/70">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-2 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGrid.map((date, i) => {
                const list = byDate.get(date) ?? [];
                const inMonth = monthKey(date) === monthKey(cursor);
                const st = dayCellStatus(date);
                const isSelected = date === selected;
                return (
                  <button
                    key={date}
                    onClick={() => setSelected(date)}
                    className={clsx(
                      "relative flex min-h-[86px] flex-col items-stretch gap-1 border-b border-line p-1.5 text-left transition md:min-h-[104px]",
                      (i + 1) % 7 !== 0 && "border-r",
                      !inMonth && "bg-slate-50/50",
                      isSelected ? "bg-accent-soft/60 ring-2 ring-inset ring-accent/50" : "hover:bg-slate-50"
                    )}
                  >
                    <span className="flex items-center justify-between px-0.5">
                      <span
                        className={clsx(
                          "flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-bold",
                          date === today ? "bg-blue-600 text-white" : inMonth ? "text-ink" : "text-ink-faint/50"
                        )}
                      >
                        {date.split("-")[2].replace(/^0/, "")}
                      </span>
                      {st && st !== "today" && date !== today && (
                        <span
                          className={clsx(
                            "h-1.5 w-1.5 rounded-full",
                            st === "completed" ? "bg-teal-500" : st === "missed" ? "bg-red-500" : "bg-slate-400"
                          )}
                        />
                      )}
                    </span>
                    <span className="hidden flex-col gap-0.5 sm:flex">
                      {list.slice(0, 3).map((a) => (
                        <span
                          key={a.id}
                          className={clsx(
                            "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight",
                            a.completion === "completed" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-ink"
                          )}
                        >
                          <CourseDot course={courseOf(a.courseId)} size="h-1.5 w-1.5" />
                          <span className="truncate">{courseOf(a.courseId)?.shortName}</span>
                        </span>
                      ))}
                      {list.length > 3 && (
                        <span className="px-1 text-[9px] font-bold text-ink-faint">+{list.length - 3}</span>
                      )}
                    </span>
                    {list.length > 0 && (
                      <span className="flex gap-0.5 px-0.5 sm:hidden">
                        {list.slice(0, 4).map((a) => (
                          <span key={a.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: courseOf(a.courseId)?.color }} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* side panel: daily teaching timeline */}
          <div className="rounded-2xl border border-line bg-cream p-5 shadow-card">
            <DayTimeline date={selected} />
          </div>
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {mode === "week" && agendas.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
            {weekDays.map((date, i) => {
              const list = byDate.get(date) ?? [];
              return (
                <div key={date} className={clsx("min-h-[180px] border-b border-line p-2.5 lg:border-b-0", i % 7 !== 6 && "lg:border-r", "sm:border-r")}>
                  <button
                    onClick={() => {
                      setSelected(date);
                      setMode("day");
                    }}
                    className="mb-2 flex w-full items-center justify-between rounded-lg px-1.5 py-1 transition hover:bg-slate-50"
                  >
                    <span className={clsx("font-mono text-[10px] font-bold uppercase tracking-widest", date === today ? "text-blue-600" : "text-ink-faint")}>
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                    </span>
                    <span
                      className={clsx(
                        "flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-bold",
                        date === today ? "bg-blue-600 text-white" : "text-ink"
                      )}
                    >
                      {date.split("-")[2].replace(/^0/, "")}
                    </span>
                  </button>
                  <div className="space-y-1.5">
                    {list.map((a) => {
                      const c = courseOf(a.courseId);
                      return (
                        <Link
                          key={a.id}
                          href={`/agenda/${a.id}`}
                          className={clsx(
                            "block rounded-lg border-l-[3px] px-2 py-1.5 text-[11px] font-semibold leading-snug transition hover:shadow-card",
                            a.completion === "completed" ? "bg-teal-50/70 text-teal-800" : "bg-slate-50 text-ink"
                          )}
                          style={{ borderLeftColor: c?.color ?? "#94a3b8" }}
                        >
                          {a.startTime && <span className="mr-1 font-mono text-[9px] text-ink-faint">{a.startTime}</span>}
                          {c?.shortName}
                          {a.meetingNumber != null && <span className="text-ink-faint"> · P{a.meetingNumber}</span>}
                        </Link>
                      );
                    })}
                    {list.length === 0 && <p className="px-1.5 text-[10px] text-ink-faint/50">—</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DAY VIEW ── */}
      {mode === "day" && agendas.length > 0 && (
        <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-cream p-6 shadow-card">
          <DayTimeline date={selected} />
        </div>
      )}

      {/* ── AGENDA VIEW ── */}
      {mode === "agenda" && agendas.length > 0 && (
        <AgendaListView byDate={byDate} today={today} />
      )}
    </div>
  );
}

function AgendaListView({ byDate, today }: { byDate: Map<string, Agenda[]>; today: string }) {
  const { courses } = useApp();
  const dates = Array.from(byDate.keys()).sort();
  return (
    <div className="space-y-5">
      {dates.map((date) => {
        const list = byDate.get(date)!;
        const rel = diffDays(today, date);
        return (
          <div key={date}>
            <div className="mb-2 flex items-center gap-2.5">
              <span
                className={clsx(
                  "rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider",
                  rel === 0 ? "bg-blue-600 text-white" : rel < 0 ? "bg-slate-100 text-ink-faint" : "bg-ink text-white"
                )}
              >
                {formatLong(date)}
              </span>
              <span className="text-[11px] font-semibold text-ink-faint">
                {rel === 0 ? "Hari ini" : rel === 1 ? "Besok" : rel > 1 ? `${rel} hari lagi` : `${-rel} hari lalu`}
              </span>
              <div className="h-px flex-1 bg-line" />
            </div>
            <div className="space-y-1.5">
              {list.map((a) => {
                const c = courses.find((x) => x.id === a.courseId);
                return (
                  <Link
                    key={a.id}
                    href={`/agenda/${a.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 transition hover:border-line-strong hover:shadow-card"
                  >
                    <CourseDot course={c} />
                    <span className="text-[13px] font-bold">{c?.name}</span>
                    {a.meetingNumber != null && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-soft">P{a.meetingNumber}</span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{a.material}</span>
                    <StatusBadge agenda={a} today={today} />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-ink-faint">Memuat kalender…</div>}>
      <CalendarInner />
    </Suspense>
  );
}
