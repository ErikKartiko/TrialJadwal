"use client";

// ─── Teaching Analytics ──────────────────────────────────────────────────────

import React, { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { monthKey, todayStr } from "@/lib/dates";
import { courseProgress, effectiveStatus, prepStats, HEALTH_META } from "@/lib/status";
import { Card, CourseDot, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";

function Ring({ value, label, color, sub }: { value: number; label: string; color: string; sub: string }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, value)));
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[136px] w-[136px]">
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#e8e6e1" strokeWidth="11" />
          <motion.circle
            cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: off }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[26px] font-bold leading-none">{Math.round(value * 100)}%</span>
        </div>
      </div>
      <p className="mt-2.5 text-[13px] font-bold">{label}</p>
      <p className="text-[11px] text-ink-faint">{sub}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { agendas, courses } = useApp();
  const today = todayStr();

  const s = useMemo(() => {
    const totalSessions = agendas.length;
    const completed = agendas.filter((a) => a.completion === "completed").length;
    const missed = agendas.filter((a) => effectiveStatus(a, today) === "missed").length;
    const upcoming = agendas.filter((a) => a.completion !== "completed" && a.date >= today).length;
    const inProgress = agendas.filter((a) => a.completion === "in-progress").length;

    let prepDone = 0;
    let prepTotal = 0;
    agendas.forEach((a) => {
      const st = prepStats(a);
      prepDone += st.done;
      prepTotal += st.total;
    });

    const reviewDone = agendas.filter((a) => a.completion === "completed" && a.review).length;

    const perCourse = courses
      .map((c) => courseProgress(c, agendas, today))
      .sort((x, y) => y.pct - x.pct);

    // sessions per month bar chart
    const monthCounts = new Map<string, { total: number; completed: number }>();
    agendas.forEach((a) => {
      const k = monthKey(a.date);
      if (!monthCounts.has(k)) monthCounts.set(k, { total: 0, completed: 0 });
      const m = monthCounts.get(k)!;
      m.total += 1;
      if (a.completion === "completed") m.completed += 1;
    });
    const months = Array.from(monthCounts.entries()).sort((x, y) => (x[0] < y[0] ? -1 : 1));
    const maxCount = Math.max(1, ...months.map(([, v]) => v.total));

    return {
      totalSessions, completed, missed, upcoming, inProgress, prepDone, prepTotal,
      reviewDone, perCourse, months, maxCount,
      teaching: totalSessions ? completed / totalSessions : 0,
      prep: prepTotal ? prepDone / prepTotal : 0,
      review: completed ? reviewDone / completed : 0,
    };
  }, [agendas, courses, today]);

  if (agendas.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 size={18} />}
        title="Belum ada data untuk dianalisis"
        hint="Import Excel atau tambahkan agenda untuk melihat analytics."
        action={{ label: "Import Data", href: "/import" }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-[13px] text-ink-faint">Gambaran keseluruhan aktivitas mengajar semester ini.</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total Courses", value: courses.length, cls: "" },
          { label: "Total Sessions", value: s.totalSessions, cls: "" },
          { label: "Completed", value: s.completed, cls: "text-teal-600" },
          { label: "Missed", value: s.missed, cls: s.missed > 0 ? "text-red-600" : "" },
          { label: "In Progress", value: s.inProgress, cls: s.inProgress > 0 ? "text-blue-600" : "" },
          { label: "Upcoming", value: s.upcoming, cls: "" },
        ].map((x, i) => (
          <motion.div key={x.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-4">
              <p className={clsx("font-display text-[26px] font-bold leading-none", x.cls)}>{x.value}</p>
              <p className="mt-1.5 text-[11px] font-semibold text-ink-faint">{x.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Rings */}
      <Card className="p-6">
        <SectionTitle>Key Performance</SectionTitle>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Ring value={s.teaching} label="Teaching Progress" sub={`${s.completed}/${s.totalSessions} sesi selesai`} color="#4338ca" />
          <Ring value={s.prep} label="Preparation Rate" sub={`${s.prepDone}/${s.prepTotal} item checklist`} color="#d97706" />
          <Ring value={s.review} label="Review Completion" sub={`${s.reviewDone}/${s.completed} review tersimpan`} color="#0d9488" />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Course progress */}
        <Card className="p-5">
          <SectionTitle>Course Progress</SectionTitle>
          <div className="space-y-3.5">
            {s.perCourse.map((p) => {
              const behind = p.health === "behind" || p.health === "attention";
              return (
                <Link key={p.course.id} href={`/courses/${p.course.id}`} className="group block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CourseDot course={p.course} size="h-2 w-2" />
                      <span className="text-[13px] font-bold group-hover:text-accent">{p.course.name}</span>
                      {behind && (
                        <span className={clsx("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ring-1", HEALTH_META[p.health].cls)}>
                          {p.health === "behind" ? "Tertinggal" : "Perhatian"}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] font-bold text-ink-soft">
                      {p.completed}/{p.total} · {Math.round(p.pct * 100)}%
                    </span>
                  </div>
                  <ProgressBar value={p.pct} color={behind ? (p.health === "behind" ? "#dc2626" : "#d97706") : p.course.color} />
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Sessions per month */}
        <Card className="p-5">
          <SectionTitle>Sessions per Month</SectionTitle>
          <div className="flex h-[220px] items-end gap-2.5">
            {s.months.map(([m, v]) => (
              <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold text-ink-soft">{v.total}</span>
                <div className="flex w-full max-w-[44px] flex-col justify-end overflow-hidden rounded-md bg-slate-100" style={{ height: "170px" }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(v.total / s.maxCount) * 100}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="flex w-full flex-col justify-end"
                  >
                    <div className="bg-accent/30" style={{ height: `${v.total ? ((v.total - v.completed) / v.total) * 100 : 0}%` }} />
                    <div className="bg-accent" style={{ height: `${v.total ? (v.completed / v.total) * 100 : 0}%` }} />
                  </motion.div>
                </div>
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink-faint">{m.slice(5)}/{m.slice(2, 4)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-center gap-4 text-[11px] font-semibold text-ink-soft">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent" /> Selesai</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent/30" /> Terjadwal</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
