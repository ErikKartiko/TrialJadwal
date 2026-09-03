"use client";

// ─── Small UI primitives ─────────────────────────────────────────────────────

import React from "react";
import Link from "next/link";
import clsx from "clsx";
import { Inbox } from "lucide-react";
import type { Agenda, Course } from "@/lib/types";
import { effectiveStatus, prepLevel, STATUS_META } from "@/lib/status";
import { todayStr } from "@/lib/dates";

// ── Status badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ agenda, today = todayStr(), showToday = true }: { agenda: Agenda; today?: string; showToday?: boolean }) {
  const st = effectiveStatus(agenda, today);
  const meta = STATUS_META[st];
  const isToday = agenda.date === today && st !== "completed";
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", meta.bg, meta.text, meta.ring)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {showToday && isToday ? "TODAY" : meta.label.toUpperCase()}
    </span>
  );
}

export function StatusPill({ status }: { status: keyof typeof STATUS_META }) {
  const meta = STATUS_META[status];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", meta.bg, meta.text, meta.ring)}>
      <span className={clsx("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label.toUpperCase()}
    </span>
  );
}

export function PrepBadge({ agenda }: { agenda: Agenda }) {
  const level = prepLevel(agenda);
  const map = {
    ready: { label: "Ready", cls: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
    partial: { label: "Partially Ready", cls: "text-amber-700 bg-amber-50 ring-amber-200" },
    "not-ready": { label: "Not Ready", cls: "text-slate-600 bg-slate-100 ring-slate-200" },
    none: { label: "No Checklist", cls: "text-slate-500 bg-slate-50 ring-slate-200" },
  } as const;
  const m = map[level];
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1", m.cls)}>
      {m.label}
    </span>
  );
}

// ── Relative date chip (TODAY / TOMORROW / …) ───────────────────────────────

export function RelChip({ date, today }: { date: string; today: string }) {
  if (date === today)
    return <span className="rounded bg-blue-600 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white">TODAY</span>;
  if (date === addOne(today))
    return <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-indigo-700">TOMORROW</span>;
  return null;
}

function addOne(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  const t = Math.floor(Date.UTC(y, m - 1, d) / 86400000) + 1;
  const dt = new Date(t * 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

// ── Progress bar ─────────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  color,
  className,
  height = "h-1.5",
}: {
  value: number; // 0..1
  color?: string;
  className?: string;
  height?: string;
}) {
  return (
    <div className={clsx("w-full overflow-hidden rounded-full bg-slate-200/70", height, className)}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color ?? "#4338ca" }}
      />
    </div>
  );
}

/** ASCII-style segmented bar "████░░░" look used on course progress */
export function SegmentedBar({ value, segments = 12, className }: { value: number; segments?: number; className?: string }) {
  const filled = Math.round(value * segments);
  return (
    <div className={clsx("flex gap-[3px]", className)} aria-label={`progress ${Math.round(value * 100)}%`}>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={clsx("h-2 flex-1 rounded-[2px] transition-colors", i < filled ? "bg-accent" : "bg-slate-200")}
        />
      ))}
    </div>
  );
}

// ── Course color dot ─────────────────────────────────────────────────────────

export function CourseDot({ course, size = "h-2.5 w-2.5" }: { course: Course | undefined; size?: string }) {
  return (
    <span
      className={clsx("inline-block shrink-0 rounded-[4px]", size)}
      style={{ backgroundColor: course?.color ?? "#94a3b8" }}
    />
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-cream/60 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-ink-faint shadow-card ring-1 ring-line">
        {icon ?? <Inbox size={20} />}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[13px] leading-relaxed text-ink-faint">{hint}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-2 rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-accent"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ── Section header ───────────────────────────────────────────────────────────

export function SectionTitle({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-3 flex items-end justify-between gap-3", className)}>
      <h2 className="eyebrow">{children}</h2>
      {right}
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────

export const btn = {
  primary:
    "inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-accent active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
  accent:
    "inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-deep active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
  ghost:
    "inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-line transition hover:bg-slate-50 hover:ring-line-strong active:scale-[0.98]",
  danger:
    "inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 active:scale-[0.98]",
  iconGhost:
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-slate-100 hover:text-ink",
};

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-2xl border border-line bg-cream shadow-card", className)}>{children}</div>
  );
}

// ── Field wrappers for forms ─────────────────────────────────────────────────

export function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <label className={clsx("block", span && "sm:col-span-2")}>
      <span className="mb-1.5 block text-xs font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";
