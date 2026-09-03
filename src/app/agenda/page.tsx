"use client";

// ─── Agenda list: search + filters + export ──────────────────────────────────

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { formatFull, todayStr } from "@/lib/dates";
import { effectiveStatus, prepLevel } from "@/lib/status";
import { agendasToRows, exportCSV, exportJSON, exportXLSX, stamp } from "@/lib/exporter";
import { AgendaRow } from "@/components/AgendaItems";
import { Card, EmptyState, btn, inputCls } from "@/components/ui";
import type { EffectiveStatus } from "@/lib/types";

type PrepFilter = "all" | "ready" | "partial" | "not-ready";
type ReviewFilter = "all" | "reviewed" | "not-reviewed";
type WhenFilter = "all" | "today" | "week" | "upcoming" | "past";

function AgendaListInner() {
  const searchParams = useSearchParams();
  const { agendas, courses, toast } = useApp();
  const today = todayStr();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EffectiveStatus>("all");
  const [prepFilter, setPrepFilter] = useState<PrepFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [whenFilter, setWhenFilter] = useState<WhenFilter>("all");
  const [showFilters, setShowFilters] = useState(Boolean(searchParams.get("q")));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return agendas
      .filter((a) => {
        const c = courses.find((x) => x.id === a.courseId);
        if (courseFilter !== "all" && a.courseId !== courseFilter) return false;
        if (statusFilter !== "all" && effectiveStatus(a, today) !== statusFilter) return false;
        if (prepFilter !== "all" && prepLevel(a) !== prepFilter) return false;
        if (reviewFilter === "reviewed" && !a.review) return false;
        if (reviewFilter === "not-reviewed" && a.review) return false;
        if (whenFilter === "today" && a.date !== today) return false;
        if (whenFilter === "upcoming" && a.date < today) return false;
        if (whenFilter === "past" && a.date >= today) return false;
        if (whenFilter === "week") {
          const d = Math.round((new Date(`${a.date}T12:00`).getTime() - new Date(`${today}T12:00`).getTime()) / 86400000);
          if (d < 0 || d > 7) return false;
        }
        if (needle) {
          const hay = [
            c?.name, c?.shortName, a.material, a.subMaterial, a.practical, a.assignment,
            a.caseStudy, a.lecturer, a.className, a.assessment, a.notes, a.date,
            formatFull(a.date), a.meetingNumber != null ? `pertemuan ${a.meetingNumber}` : "",
            ...Object.values(a.metadata),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.startTime || "") < (b.startTime || "") ? -1 : 1));
  }, [agendas, courses, q, courseFilter, statusFilter, prepFilter, reviewFilter, whenFilter, today]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((a) => {
      const k = a.date || "Tanpa tanggal";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const activeFilterCount = [courseFilter, statusFilter, prepFilter, reviewFilter, whenFilter].filter((f) => f !== "all").length;

  const resetFilters = () => {
    setCourseFilter("all");
    setStatusFilter("all");
    setPrepFilter("all");
    setReviewFilter("all");
    setWhenFilter("all");
  };

  const exportRows = () => agendasToRows(filtered, courses);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Agenda</h1>
          <p className="text-[13px] text-ink-faint">
            {filtered.length} dari {agendas.length} agenda
            {activeFilterCount > 0 && ` · ${activeFilterCount} filter aktif`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg ring-1 ring-line">
            <button
              onClick={() => {
                exportCSV(exportRows(), `agenda-${stamp()}.csv`);
                toast("CSV diekspor");
              }}
              title="Export CSV"
              className="flex items-center gap-1.5 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            >
              <FileText size={13} /> CSV
            </button>
            <button
              onClick={() => {
                exportXLSX(exportRows(), `agenda-${stamp()}.xlsx`);
                toast("Excel diekspor");
              }}
              title="Export Excel"
              className="flex items-center gap-1.5 border-l border-line bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button
              onClick={() => {
                exportJSON(exportRows(), `agenda-${stamp()}.json`);
                toast("JSON diekspor");
              }}
              title="Export JSON"
              className="flex items-center gap-1.5 border-l border-line bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            >
              <FileJson size={13} /> JSON
            </button>
          </div>
          <Link href="/agenda/new" className={btn.primary}>
            <Plus size={15} strokeWidth={2.5} /> New Agenda
          </Link>
        </div>
      </div>

      {/* Search + filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search agenda, course, material, dosen, kelas, praktikum, tugas…"
              className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={clsx("inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold ring-1 transition", showFilters || activeFilterCount > 0 ? "bg-accent-soft text-accent ring-accent/30" : "bg-white text-ink ring-line hover:bg-slate-50")}
          >
            <SlidersHorizontal size={14} /> Filter
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-line pt-3.5 md:grid-cols-5">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-faint">Course</span>
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={inputCls}>
                <option value="all">Semua course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-faint">Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={inputCls}>
                <option value="all">Semua status</option>
                <option value="planned">Planned</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-faint">Date</span>
              <select value={whenFilter} onChange={(e) => setWhenFilter(e.target.value as WhenFilter)} className={inputCls}>
                <option value="all">Kapan saja</option>
                <option value="today">Hari ini</option>
                <option value="week">7 hari ke depan</option>
                <option value="upcoming">Mendatang</option>
                <option value="past">Lampau</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-faint">Preparation</span>
              <select value={prepFilter} onChange={(e) => setPrepFilter(e.target.value as PrepFilter)} className={inputCls}>
                <option value="all">Semua</option>
                <option value="ready">Ready</option>
                <option value="partial">Partially Ready</option>
                <option value="not-ready">Not Ready</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-faint">Review</span>
              <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value as ReviewFilter)} className={inputCls}>
                <option value="all">Semua</option>
                <option value="reviewed">Sudah direview</option>
                <option value="not-reviewed">Belum direview</option>
              </select>
            </label>
            <button onClick={resetFilters} className="col-span-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-ink md:col-span-5">
              <RotateCcw size={12} /> Reset filter
            </button>
          </div>
        )}
      </Card>

      {/* Results grouped by date */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={18} />}
          title={agendas.length === 0 ? "Belum ada agenda" : "Tidak ada agenda yang cocok"}
          hint={agendas.length === 0 ? "Import file Excel atau buat agenda baru untuk memulai." : "Coba ubah kata kunci pencarian atau reset filter."}
          action={agendas.length === 0 ? { label: "Import Excel", href: "/import" } : { label: "+ New Agenda", href: "/agenda/new" }}
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, list]) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-2.5 px-1">
                <span className={clsx("rounded-lg px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider", date === today ? "bg-blue-600 text-white" : "bg-slate-100 text-ink-soft")}>
                  {date === today ? "TODAY" : date}
                </span>
                <span className="text-[11px] font-semibold text-ink-faint">{list.length} agenda</span>
                <div className="h-px flex-1 bg-line" />
              </div>
              <div className="space-y-2">
                {list.map((a) => (
                  <AgendaRow key={a.id} agenda={a} course={courses.find((c) => c.id === a.courseId)} today={today} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-ink-faint">Memuat agenda…</div>}>
      <AgendaListInner />
    </Suspense>
  );
}
