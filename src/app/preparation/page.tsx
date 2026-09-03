"use client";

// ─── Preparation Tracker ─────────────────────────────────────────────────────

import React, { useMemo } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ChevronRight, ListChecks } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { addDays, diffDays, formatFull, formatLong, relativeLabel, startOfWeek, todayStr } from "@/lib/dates";
import { prepLevel, prepStats } from "@/lib/status";
import { Card, CourseDot, EmptyState, PrepBadge, ProgressBar } from "@/components/ui";
import type { Agenda } from "@/lib/types";

function PrepGroup({ title, list, today }: { title: string; list: Agenda[]; today: string }) {
  const { courses, togglePrep } = useApp();
  if (list.length === 0) return null;
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2.5 px-1">
        <span className={clsx("rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider", title === "TODAY" ? "bg-blue-600 text-white" : title === "TOMORROW" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-ink-soft")}>
          {title}
        </span>
        <span className="text-[11px] font-semibold text-ink-faint">{list.length} sesi</span>
        <div className="h-px flex-1 bg-line" />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {list.map((a) => {
          const c = courses.find((x) => x.id === a.courseId);
          const stats = prepStats(a);
          return (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/agenda/${a.id}`} className="group flex min-w-0 items-center gap-2">
                  <CourseDot course={c} />
                  <span className="truncate text-sm font-bold group-hover:text-accent">{c?.name}</span>
                  {a.meetingNumber != null && (
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-soft">P{a.meetingNumber}</span>
                  )}
                  <ChevronRight size={13} className="shrink-0 text-ink-faint" />
                </Link>
                <PrepBadge agenda={a} />
              </div>
              <p className="mt-1 truncate text-xs text-ink-faint">{a.material}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                {relativeLabel(a.date, today)} · {formatLong(a.date)}
              </p>

              <div className="mt-3 space-y-1">
                {a.preparation.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePrep(a.id, p.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                  >
                    <span className={clsx("flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border-2 transition", p.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-accent")}>
                      {p.done && <Check size={11} strokeWidth={3.5} />}
                    </span>
                    <span className={clsx("text-[13px] font-medium", p.done && "text-ink-faint line-through")}>{p.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <ProgressBar value={stats.pct} color={stats.pct === 1 ? "#059669" : c?.color} className="flex-1" />
                <span className="font-mono text-[11px] font-bold text-ink-faint">{stats.done}/{stats.total}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function PreparationPage() {
  const { agendas } = useApp();
  const today = todayStr();

  const groups = useMemo(() => {
    const pending = agendas.filter(
      (a) => a.completion !== "completed" && diffDays(today, a.date) >= 0 && a.preparation.length > 0
    );
    const by = (pred: (a: Agenda) => boolean) =>
      pending.filter(pred).sort((x, y) => (x.date < y.date ? -1 : 1) || (x.startTime || "") < (y.startTime || "") ? -1 : 1);
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(startOfWeek(today), 6);
    return {
      today: by((a) => a.date === today),
      tomorrow: by((a) => a.date === tomorrow),
      thisWeek: by((a) => a.date > tomorrow && a.date <= weekEnd),
      later: by((a) => a.date > weekEnd && diffDays(today, a.date) <= 14),
    };
  }, [agendas, today]);

  const summary = useMemo(() => {
    const all = agendas.filter((a) => a.completion !== "completed" && diffDays(today, a.date) >= 0 && a.preparation.length > 0);
    const ready = all.filter((a) => prepLevel(a) === "ready").length;
    const partial = all.filter((a) => prepLevel(a) === "partial").length;
    const notReady = all.filter((a) => prepLevel(a) === "not-ready").length;
    return { total: all.length, ready, partial, notReady };
  }, [agendas, today]);

  const allEmpty = summary.total === 0;
  const allDone = !allEmpty && summary.ready === summary.total;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Preparation</h1>
          <p className="text-[13px] text-ink-faint">Semua pekerjaan yang harus dipersiapkan sebelum mengajar.</p>
        </div>
        {summary.total > 0 && (
          <div className="flex gap-2 text-[11px] font-bold">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">{summary.ready} Ready</span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">{summary.partial} Partial</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">{summary.notReady} Not Ready</span>
          </div>
        )}
      </div>

      {allEmpty ? (
        <EmptyState
          icon={<ListChecks size={18} />}
          title="Tidak ada persiapan"
          hint="Belum ada agenda mendatang dengan checklist persiapan."
          action={{ label: "+ New Agenda", href: "/agenda/new" }}
        />
      ) : allDone ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={24} />
          </span>
          <p className="font-display text-lg font-bold">All preparation complete.</p>
          <p className="max-w-sm text-[13px] text-ink-soft">
            Semua {summary.total} sesi mendatang sudah siap. Anda bisa fokus mengajar.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <PrepGroup title="TODAY" list={groups.today} today={today} />
          <PrepGroup title="TOMORROW" list={groups.tomorrow} today={today} />
          <PrepGroup title="THIS WEEK" list={groups.thisWeek} today={today} />
          <PrepGroup title="NEXT 14 DAYS" list={groups.later} today={today} />
        </div>
      )}
    </div>
  );
}
