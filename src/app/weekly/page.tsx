"use client";

// ─── Weekly Planner ───────────────────────────────────────────────────────────

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ClipboardCheck, ListChecks, Library, CalendarRange } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { addDays, formatShort, startOfWeek, todayStr } from "@/lib/dates";
import { effectiveStatus, STATUS_META } from "@/lib/status";
import { Card, CourseDot, ProgressBar } from "@/components/ui";

const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function WeeklyPlannerPage() {
  const { agendas, courses } = useApp();
  const today = todayStr();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = addDays(startOfWeek(today), weekOffset * 7);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDate = useMemo(() => {
    const map = new Map<string, typeof agendas>();
    agendas.forEach((a) => {
      if (!a.date) return;
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    });
    map.forEach((l) => l.sort((x, y) => ((x.startTime || "99") < (y.startTime || "99") ? -1 : 1)));
    return map;
  }, [agendas]);

  const courseOf = (cid: string) => courses.find((c) => c.id === cid);

  const stats = useMemo(() => {
    const inWeek = agendas.filter((a) => a.date >= weekStart && a.date <= days[6]);
    const courseSet = new Set(inWeek.map((a) => a.courseId));
    const prepPending = inWeek.filter((a) => a.completion !== "completed" && a.preparation.some((p) => !p.done)).length;
    const completed = inWeek.filter((a) => a.completion === "completed").length;
    const due = inWeek.filter((a) => a.date <= today).length;
    return {
      sessions: inWeek.length,
      courses: courseSet.size,
      prepPending,
      reviewsPending: agendas.filter((a) => a.completion === "completed" && !a.review).length,
      completion: due === 0 ? (inWeek.length === 0 ? 0 : 1) : completed / due,
    };
  }, [agendas, weekStart, days, today]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Weekly Planner</h1>
          <p className="text-[13px] text-ink-faint">
            {formatShort(days[0])} – {formatShort(days[6])}
            {weekOffset === 0 && <span className="ml-2 rounded bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">THIS WEEK</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(0)}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold ring-1 ring-line transition hover:ring-accent/40"
          >
            This Week
          </button>
          <div className="flex rounded-lg ring-1 ring-line">
            <button onClick={() => setWeekOffset((o) => o - 1)} className="rounded-l-lg bg-white px-2.5 py-2 hover:bg-slate-50" aria-label="Previous week">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setWeekOffset((o) => o + 1)} className="rounded-r-lg border-l border-line bg-white px-2.5 py-2 hover:bg-slate-50" aria-label="Next week">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {days.map((date, i) => {
          const list = byDate.get(date) ?? [];
          const isToday = date === today;
          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={clsx(
                "flex min-h-[220px] flex-col rounded-2xl border p-3",
                isToday ? "border-blue-300 bg-blue-50/40 shadow-card" : "border-line bg-white"
              )}
            >
              <div className="mb-2.5 flex items-center justify-between">
                <span className={clsx("font-mono text-[10px] font-bold tracking-[0.14em]", isToday ? "text-blue-600" : "text-ink-faint")}>
                  {DOW[i]}
                </span>
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-full font-display text-base font-bold",
                    isToday ? "bg-blue-600 text-white" : "text-ink"
                  )}
                >
                  {date.split("-")[2].replace(/^0/, "")}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                {list.map((a) => {
                  const c = courseOf(a.courseId);
                  const st = effectiveStatus(a, today);
                  return (
                    <Link
                      key={a.id}
                      href={`/agenda/${a.id}`}
                      className={clsx(
                        "block rounded-xl border-l-[3px] bg-slate-50 p-2.5 transition hover:bg-slate-100 hover:shadow-card",
                        st === "completed" && "bg-teal-50/70",
                        st === "missed" && "bg-red-50/50"
                      )}
                      style={{ borderLeftColor: c?.color }}
                    >
                      <div className="flex items-center gap-1.5">
                        <CourseDot course={c} size="h-2 w-2" />
                        <span className="text-xs font-bold">{c?.shortName}</span>
                        {a.meetingNumber != null && (
                          <span className="font-mono text-[9px] text-ink-faint">P{a.meetingNumber}</span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-soft">{a.material}</p>
                      <span className={clsx("mt-1.5 inline-block rounded px-1 py-0.5 font-mono text-[8px] font-bold", STATUS_META[st].bg, STATUS_META[st].text)}>
                        {isToday && st !== "completed" ? "TODAY" : STATUS_META[st].label.toUpperCase()}
                      </span>
                    </Link>
                  );
                })}
                {list.length === 0 && <p className="pt-6 text-center text-[10px] text-ink-faint/50">No sessions</p>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* This Week summary */}
      <Card className="p-5">
        <p className="eyebrow mb-4 !text-ink">This Week</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { icon: CalendarRange, label: "Teaching Sessions", value: stats.sessions },
            { icon: Library, label: "Courses", value: stats.courses },
            { icon: ListChecks, label: "Preparation Pending", value: stats.prepPending },
            { icon: ClipboardCheck, label: "Reviews Pending (total)", value: stats.reviewsPending },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-line">
              <s.icon size={17} className="shrink-0 text-ink-faint" />
              <div>
                <p className="font-display text-xl font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-[10px] font-medium leading-tight text-ink-faint">{s.label}</p>
              </div>
            </div>
          ))}
          <div className="col-span-2 flex items-center gap-4 rounded-xl bg-slate-50 p-3.5 ring-1 ring-line md:col-span-1">
            <div className="flex-1">
              <p className="text-[10px] font-medium text-ink-faint">Completion</p>
              <p className="font-display text-xl font-bold">{Math.round(stats.completion * 100)}%</p>
            </div>
            <ProgressBar value={stats.completion} className="!h-2 w-16" color={stats.completion >= 0.99 ? "#059669" : "#4338ca"} />
          </div>
        </div>
      </Card>
    </div>
  );
}
