"use client";

// ─── Reusable agenda presentation components ─────────────────────────────────

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  FlaskConical,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { Agenda, Course } from "@/lib/types";
import { useApp } from "@/lib/store";
import { formatShort, relativeLabel, timeRange, todayStr } from "@/lib/dates";
import { prepStats } from "@/lib/status";
import { CourseDot, RelChip, StatusBadge } from "./ui";

// ── Compact agenda row (used in dashboard/upcoming/search results) ───────────

export function AgendaRow({ agenda, course, today, className }: { agenda: Agenda; course?: Course; today: string; className?: string }) {
  const rel = relativeLabel(agenda.date, today);
  return (
    <Link
      href={`/agenda/${agenda.id}`}
      className={clsx(
        "group flex items-center gap-3.5 rounded-xl border border-line bg-white px-3.5 py-3 transition hover:border-line-strong hover:shadow-card",
        className
      )}
    >
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-slate-50 py-1.5 ring-1 ring-line">
        <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink-faint">
          {formatShort(agenda.date).split(" ")[1] ?? ""}
        </span>
        <span className="font-display text-lg font-bold leading-none text-ink">
          {agenda.date ? agenda.date.split("-")[2] : "—"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CourseDot course={course} />
          <span className="text-[13px] font-bold text-ink">{course?.name ?? "—"}</span>
          {agenda.meetingNumber != null && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-soft">
              P{agenda.meetingNumber}
            </span>
          )}
          <RelChip date={agenda.date} today={today} />
          {rel !== "TODAY" && rel !== "TOMORROW" && (
            <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-faint">{rel}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink-soft">{agenda.material || "—"}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <StatusBadge agenda={agenda} today={today} />
        <ChevronRight size={15} className="text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
    </Link>
  );
}

// ── Preparation checklist (interactive) ──────────────────────────────────────

export function PrepChecklist({ agenda, editable = true }: { agenda: Agenda; editable?: boolean }) {
  const { togglePrep, addPrepItem, removePrepItem } = useApp();
  const [newItem, setNewItem] = useState("");
  const stats = prepStats(agenda);

  return (
    <div>
      <div className="space-y-1">
        {agenda.preparation.map((p) => (
          <div
            key={p.id}
            className={clsx(
              "group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition",
              p.done ? "border-emerald-200 bg-emerald-50/50" : "border-line bg-white hover:border-line-strong"
            )}
          >
            <button
              onClick={() => togglePrep(agenda.id, p.id)}
              className={clsx(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                p.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white hover:border-accent"
              )}
              aria-label={p.done ? "Uncheck" : "Check"}
            >
              {p.done && <Check size={12} strokeWidth={3.5} />}
            </button>
            <button
              onClick={() => togglePrep(agenda.id, p.id)}
              className={clsx("flex-1 text-left text-[13px] font-medium transition", p.done && "text-ink-faint line-through")}
            >
              {p.label}
            </button>
            {editable && (
              <button
                onClick={() => removePrepItem(agenda.id, p.id)}
                className="rounded p-1 text-ink-faint opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                aria-label="Remove item"
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        {agenda.preparation.length === 0 && (
          <p className="py-3 text-center text-xs text-ink-faint">Belum ada checklist.</p>
        )}
      </div>

      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addPrepItem(agenda.id, newItem);
            setNewItem("");
          }}
          className="mt-2 flex gap-2"
        >
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Tambah item checklist…"
            className="h-9 flex-1 rounded-lg border border-dashed border-line-strong bg-white px-3 text-[13px] placeholder:text-ink-faint/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          <button type="submit" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-ink-soft transition hover:bg-accent hover:text-white" aria-label="Add item">
            <Plus size={16} />
          </button>
        </form>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-soft">
          {stats.done} / {stats.total} prepared
        </span>
        {stats.total > 0 && stats.done === stats.total ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
            All preparation complete
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-soft">
            {Math.round(stats.pct * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Description list for agenda detail ───────────────────────────────────────

const FIELD_ICONS: Record<string, React.ReactNode> = {
  material: <BookOpen size={14} />,
  sub: <Layers size={14} />,
  practical: <FlaskConical size={14} />,
  assignment: <Pencil size={14} />,
  lecturer: <User size={14} />,
  className: <Users size={14} />,
  time: <Clock size={14} />,
};

export function FieldRow({ icon, label, value, mono }: { icon?: keyof typeof FIELD_ICONS; label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink-faint">
        {icon ? FIELD_ICONS[icon] : <GraduationCap size={14} />}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
        <p className={clsx("mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink", mono && "font-mono text-[13px]")}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Delete confirm inline ────────────────────────────────────────────────────

export function ConfirmInline({ label, onConfirm, className }: { label: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed)
    return (
      <button onClick={() => setArmed(true)} className={clsx("inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50", className)}>
        <Trash2 size={14} /> {label}
      </button>
    );
  return (
    <span className={clsx("inline-flex items-center gap-1.5", className)}>
      <button onClick={onConfirm} className="rounded-lg bg-red-600 px-3 py-2 text-[13px] font-semibold text-white hover:bg-red-700">
        Ya, hapus
      </button>
      <button onClick={() => setArmed(false)} className="rounded-lg px-2.5 py-2 text-[13px] font-semibold text-ink-soft hover:bg-slate-100">
        Batal
      </button>
    </span>
  );
}
