"use client";

// ─── Semester View: distribution across the whole semester ────────────────────

import React, { useMemo } from "react";
import Link from "next/link";
import { CalendarCheck2 } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { formatLong, formatMonth, monthKey, startOfMonth, addDays, todayStr } from "@/lib/dates";
import { courseProgress, HEALTH_META } from "@/lib/status";
import { Card, CourseDot, EmptyState, ProgressBar } from "@/components/ui";

const SEMESTER_PRESETS = ["2026/2027 Ganjil", "2025/2026 Genap", "2025/2026 Ganjil", "2026/2027 Genap"];

export default function SemesterPage() {
  const { agendas, courses, settings, updateSettings } = useApp();
  const today = todayStr();

  const months = useMemo(() => {
    if (agendas.length === 0) return [];
    const dates = agendas.map((a) => a.date).filter(Boolean).sort();
    let cur = startOfMonth(dates[0]);
    const last = startOfMonth(dates[dates.length - 1]);
    const out: string[] = [];
    while (cur <= last) {
      out.push(monthKey(cur));
      cur = startOfMonth(addDays(cur, 32));
    }
    return out;
  }, [agendas]);

  const byMonth = useMemo(() => {
    const map = new Map<string, typeof agendas>();
    months.forEach((m) => map.set(m, []));
    agendas.forEach((a) => {
      const k = monthKey(a.date);
      if (map.has(k)) map.get(k)!.push(a);
    });
    return map;
  }, [agendas, months]);

  const stats = useMemo(() => {
    const total = agendas.length;
    const completed = agendas.filter((a) => a.completion === "completed").length;
    const progress = courses.map((c) => courseProgress(c, agendas, today));
    return { total, completed, progress };
  }, [agendas, courses, today]);

  const courseOf = (cid: string) => courses.find((c) => c.id === cid);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Semester</h1>
          <p className="text-[13px] text-ink-faint">Distribusi seluruh agenda perkuliahan satu semester.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
          Semester Aktif
          <select
            value={settings.semesterName}
            onChange={(e) => updateSettings({ semesterName: e.target.value })}
            className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold focus:border-accent focus:outline-none"
          >
            {SEMESTER_PRESETS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {agendas.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck2 size={18} />}
          title="Belum ada data semester"
          hint="Import file Excel jadwal mengajar Anda untuk melihat distribusi satu semester penuh."
          action={{ label: "Import Excel", href: "/import" }}
        />
      ) : (
        <>
          {/* Overview strip */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Semester Progress</p>
                <p className="mt-2 font-display text-3xl font-bold">
                  {stats.completed}
                  <span className="text-lg font-semibold text-ink-faint"> / {stats.total} sessions</span>
                </p>
              </div>
              <div className="flex-1 min-w-[200px] max-w-md">
                <ProgressBar value={stats.total ? stats.completed / stats.total : 0} height="h-2.5" />
                <p className="mt-1.5 text-right font-mono text-xs font-bold text-ink-soft">
                  {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>
            {/* month strip */}
            <div className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(months.length, 1)}, minmax(0, 1fr))` }}>
              {months.map((m) => {
                const list = byMonth.get(m) ?? [];
                const completed = list.filter((a) => a.completion === "completed").length;
                const pct = list.length ? completed / list.length : 0;
                return (
                  <div key={m} className="text-center">
                    <div className="flex h-16 items-end overflow-hidden rounded-md bg-slate-100">
                      <div
                        className={clsx("w-full transition-all", m === monthKey(today) ? "bg-blue-500" : "bg-accent/80")}
                        style={{ height: `${Math.max(4, pct * 100)}%` }}
                        title={`${completed}/${list.length} selesai`}
                      />
                    </div>
                    <p className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink-faint">
                      {formatMonth(m).split(" ")[0].slice(0, 3)}
                    </p>
                    <p className="font-mono text-[9px] text-ink-faint/70">{list.length}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Month timeline */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {months.map((m, idx) => {
              const list = (byMonth.get(m) ?? []).sort((a, b) => (a.date < b.date ? -1 : 1));
              const isCurrent = m === monthKey(today);
              return (
                <Card key={m} className={clsx("overflow-hidden", isCurrent && "ring-2 ring-blue-400/60")}>
                  <div className="flex items-center justify-between border-b border-line bg-slate-50/60 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-display text-sm font-bold">{formatMonth(m)}</p>
                      {isCurrent && (
                        <span className="rounded bg-blue-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">NOW</span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-ink-faint">
                      {list.filter((a) => a.completion === "completed").length}/{list.length} selesai
                    </span>
                  </div>
                  <div className="max-h-[320px] divide-y divide-line/60 overflow-y-auto px-2">
                    {list.map((a) => {
                      const c = courseOf(a.courseId);
                      return (
                        <Link key={a.id} href={`/agenda/${a.id}`} className="flex items-center gap-3 px-3 py-2 transition hover:bg-slate-50">
                          <span className="w-10 shrink-0 font-mono text-[10px] font-bold text-ink-faint">
                            {a.date.split("-")[2]} {formatMonth(m).slice(0, 3)}
                          </span>
                          <CourseDot course={c} size="h-2 w-2" />
                          <span className="w-16 shrink-0 truncate text-xs font-bold">{c?.shortName}</span>
                          {a.meetingNumber != null && (
                            <span className="shrink-0 font-mono text-[10px] text-ink-faint">P{a.meetingNumber}</span>
                          )}
                          <span className={clsx("min-w-0 flex-1 truncate text-xs", a.completion === "completed" ? "text-ink-faint line-through" : "text-ink-soft")}>
                            {a.material}
                          </span>
                          {a.completion === "completed" && <span className="text-[10px] font-bold text-teal-600">✓</span>}
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Per-course progress */}
          <Card className="p-5">
            <p className="eyebrow mb-4 !text-ink">Course Progress — {settings.semesterName}</p>
            <div className="space-y-3">
              {stats.progress
                .slice()
                .sort((a, b) => b.pct - a.pct)
                .map((p) => (
                  <Link key={p.course.id} href={`/courses/${p.course.id}`} className="flex items-center gap-4 rounded-xl bg-slate-50/70 px-4 py-3 ring-1 ring-line transition hover:bg-slate-100">
                    <CourseDot course={p.course} />
                    <span className="w-28 truncate text-[13px] font-bold">{p.course.name}</span>
                    <ProgressBar value={p.pct} color={p.course.color} className="flex-1" />
                    <span className="w-16 text-right font-mono text-xs font-bold text-ink-soft">
                      {p.completed}/{p.total} · {Math.round(p.pct * 100)}%
                    </span>
                    <span className={clsx("hidden rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 sm:inline", HEALTH_META[p.health].cls)}>
                      {HEALTH_META[p.health].label}
                    </span>
                  </Link>
                ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
