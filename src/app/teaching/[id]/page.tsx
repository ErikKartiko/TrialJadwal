"use client";

// ─── Teaching Mode: focused live session ──────────────────────────────────────

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FlaskConical,
  Layers,
  Pencil,
  Play,
  RotateCcw,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { formatFull, pad2, todayStr } from "@/lib/dates";
import { prepStats } from "@/lib/status";
import { CourseDot, ProgressBar, btn } from "@/components/ui";

function useElapsed(startedAt: string | null, running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  if (!startedAt) return "00:00:00";
  const start = new Date(startedAt).getTime();
  const s = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

export default function TeachingModePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getAgenda, getCourse, startTeaching, revertToPlanned, completeTeaching, toast } = useApp();
  const agenda = getAgenda(params.id);
  const course = agenda ? getCourse(agenda.courseId) : undefined;
  const today = todayStr();
  const running = agenda?.completion === "in-progress";
  const elapsed = useElapsed(agenda?.startedAt ?? null, running);

  const materialPoints = useMemo(() => {
    if (!agenda) return [];
    const src = agenda.subMaterial ? `${agenda.material}, ${agenda.subMaterial}` : agenda.material;
    return src
      .split(/[,;\n•\-–]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
      .slice(0, 8);
  }, [agenda]);

  if (!agenda) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-faint">Agenda tidak ditemukan.</p>
        <Link href="/" className={clsx(btn.primary, "mt-4")}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>
    );
  }

  const handleStart = () => {
    startTeaching(agenda.id);
    toast("Sesi mengajar dimulai");
  };

  const handleComplete = () => {
    completeTeaching(agenda.id);
    toast("Sesi selesai — isi Teaching Review");
    router.push(`/agenda/${agenda.id}?review=1`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href={`/agenda/${agenda.id}`} className={btn.ghost}>
          <ArrowLeft size={15} /> Detail Agenda
        </Link>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
          Teaching Mode
        </span>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="overflow-hidden rounded-3xl border border-line bg-ink text-white shadow-float">
          <div className="relative px-7 pb-7 pt-8 md:px-10">
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: course?.color ?? "#4338ca" }}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CourseDot course={course} size="h-3 w-3" />
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                  {formatFull(today)}
                </p>
              </div>
              {running && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300 ring-1 ring-blue-400/30">
                  <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-blue-400" /> Live
                </span>
              )}
            </div>

            <h1 className="mt-5 font-display text-3xl font-bold tracking-tight md:text-4xl">{course?.name}</h1>
            {agenda.meetingNumber != null && (
              <p className="mt-1 text-sm font-semibold text-white/60">Pertemuan {agenda.meetingNumber}</p>
            )}

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/90">{agenda.material}</p>

            {materialPoints.length > 1 && (
              <div className="mt-5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {materialPoints.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-[13px] text-white/70">
                    <span className="h-1 w-1 shrink-0 rounded-full bg-white/40" />
                    {p}
                  </div>
                ))}
              </div>
            )}

            {/* Timer + actions */}
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-6">
              {running ? (
                <>
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                      Start Time {agenda.startedAt ? new Date(agenda.startedAt).toTimeString().slice(0, 5) : ""}
                    </p>
                    <p className="font-display text-4xl font-bold tabular-nums tracking-tight md:text-5xl">{elapsed}</p>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        revertToPlanned(agenda.id);
                        toast("Sesi dibatalkan", "info");
                        router.push(`/agenda/${agenda.id}`);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold text-white/70 ring-1 ring-white/20 transition hover:bg-white/10"
                    >
                      <RotateCcw size={14} /> Cancel
                    </button>
                    <button
                      onClick={handleComplete}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-400 active:scale-[0.98]"
                    >
                      <CheckCircle2 size={16} /> Complete Session
                    </button>
                  </div>
                </>
              ) : agenda.completion === "completed" ? (
                <div className="flex w-full flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-4 py-2 text-sm font-bold text-teal-300 ring-1 ring-teal-400/30">
                    <Check size={15} /> Session Completed
                  </span>
                  <button
                    onClick={() => router.push(`/agenda/${agenda.id}?review=1`)}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[13px] font-bold text-ink transition hover:bg-slate-100"
                  >
                    <ClipboardCheck size={15} /> {agenda.review ? "Lihat Review" : "Isi Teaching Review"}
                  </button>
                </div>
              ) : (
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <p className="max-w-sm text-[13px] leading-relaxed text-white/60">
                    Tekan tombol di bawah saat Anda mulai mengajar. Timer berjalan, dan setelah selesai Anda akan
                    langsung mengisi Teaching Review.
                  </p>
                  <button
                    onClick={handleStart}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-ink shadow-lg transition hover:bg-slate-100 active:scale-[0.98]"
                  >
                    <Play size={16} className="fill-ink" /> Start Teaching
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reference: prep + practical */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-cream p-5 shadow-card">
          <p className="eyebrow mb-3">Preparation Status</p>
          {(() => {
            const p = prepStats(agenda);
            return (
              <>
                <ProgressBar value={p.pct} color={p.pct === 1 ? "#059669" : course?.color} />
                <p className="mt-2 text-xs font-semibold text-ink-soft">
                  {p.done}/{p.total} prepared
                </p>
                <ul className="mt-2 space-y-1">
                  {agenda.preparation.filter((x) => !x.done).slice(0, 4).map((x) => (
                    <li key={x.id} className="flex items-center gap-2 text-xs text-ink-faint">
                      <span className="h-1 w-1 rounded-full bg-amber-500" /> {x.label}
                    </li>
                  ))}
                </ul>
              </>
            );
          })()}
        </div>
        <div className="rounded-2xl border border-line bg-cream p-5 shadow-card">
          <p className="eyebrow mb-3">Session References</p>
          <div className="space-y-2.5 text-[13px]">
            {agenda.practical && (
              <p className="flex gap-2">
                <FlaskConical size={14} className="mt-0.5 shrink-0 text-ink-faint" />
                <span><span className="font-semibold">Praktikum:</span> {agenda.practical}</span>
              </p>
            )}
            {agenda.assignment && (
              <p className="flex gap-2">
                <Pencil size={14} className="mt-0.5 shrink-0 text-ink-faint" />
                <span><span className="font-semibold">Tugas:</span> {agenda.assignment}</span>
              </p>
            )}
            {agenda.subMaterial && (
              <p className="flex gap-2">
                <Layers size={14} className="mt-0.5 shrink-0 text-ink-faint" />
                <span><span className="font-semibold">Sub materi:</span> {agenda.subMaterial}</span>
              </p>
            )}
            {!agenda.practical && !agenda.assignment && !agenda.subMaterial && (
              <p className="text-ink-faint">Tidak ada referensi tambahan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
