"use client";

// ─── Agenda detail: PLAN → PREPARE → TEACH → REVIEW ─────────────────────────

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
  ClipboardCheck,
  Clock,
  Copy,
  FileText,
  ListChecks,
  Pencil,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { formatFull, formatLong, nowISO, timeRange, todayStr } from "@/lib/dates";
import { coverageFromMaterial, effectiveStatus, prepStats, STATUS_META } from "@/lib/status";
import { ConfirmInline, FieldRow, PrepChecklist } from "@/components/AgendaItems";
import { Card, CourseDot, SectionTitle, StatusBadge, btn } from "@/components/ui";
import type { TeachingReview } from "@/lib/types";

function AgendaDetailInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    getAgenda,
    getCourse,
    courses,
    deleteAgenda,
    duplicateAgenda,
    startTeaching,
    revertToPlanned,
    markCompleted,
    reopenAgenda,
    saveReview,
    toast,
  } = useApp();

  const agenda = getAgenda(params.id);
  const course = agenda ? getCourse(agenda.courseId) : undefined;
  const today = todayStr();
  const reviewRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<TeachingReview | null>(null);

  useEffect(() => {
    if (searchParams.get("review") === "1") {
      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    }
  }, [searchParams]);

  // Initialize review draft when agenda changes
  useEffect(() => {
    if (!agenda) return;
    if (agenda.review) {
      setDraft({ ...agenda.review });
    } else {
      setDraft({
        coverage: coverageFromMaterial(agenda.material, agenda.subMaterial),
        materialsCovered: "",
        obstacles: "",
        studentNotes: "",
        repeatMaterial: "",
        nextSessionNotes: "",
        assignmentGiven: agenda.assignment,
        savedAt: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agenda?.id, agenda?.review?.savedAt]);

  if (!agenda) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-faint">Agenda tidak ditemukan.</p>
        <Link href="/agenda" className={clsx(btn.primary, "mt-4")}>
          <ArrowLeft size={14} /> Kembali ke Agenda
        </Link>
      </div>
    );
  }

  const status = effectiveStatus(agenda, today);
  const covered = draft?.coverage.filter((c) => c.covered).length ?? 0;
  const coverageTotal = draft?.coverage.length ?? 0;

  const handleDuplicate = () => {
    const copy = duplicateAgenda(agenda.id);
    if (copy) {
      toast("Agenda diduplikasi");
      router.push(`/agenda/${copy.id}/edit`);
    }
  };

  const handleDelete = () => {
    deleteAgenda(agenda.id);
    toast("Agenda dihapus", "info");
    router.push("/agenda");
  };

  const handleSaveReview = () => {
    if (!draft) return;
    saveReview(agenda.id, { ...draft, savedAt: nowISO() });
    toast("Teaching review tersimpan");
  };

  const setCov = (id: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      coverage: draft.coverage.map((c) => (c.id === id ? { ...c, covered: !c.covered } : c)),
    });
  };

  return (
    <div className="space-y-5">
      {/* Top nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.back()} className={btn.ghost}>
          <ArrowLeft size={15} /> Kembali
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/agenda/${agenda.id}/edit`} className={btn.ghost}>
            <Pencil size={14} /> Edit
          </Link>
          <button onClick={handleDuplicate} className={btn.ghost}>
            <Copy size={14} /> Duplicate
          </button>
          <ConfirmInline label="Delete" onConfirm={handleDelete} />
        </div>
      </div>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: course?.color ?? "#4338ca" }} />
          <div className="px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <CourseDot course={course} size="h-3.5 w-3.5" />
                  <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{course?.name}</h1>
                </div>
                {agenda.meetingNumber != null && (
                  <p className="mt-1 font-display text-lg font-semibold text-ink-soft">Pertemuan {agenda.meetingNumber}</p>
                )}
              </div>
              <StatusBadge agenda={agenda} today={today} />
            </div>

            <h2 className="mt-4 max-w-2xl text-[17px] font-medium leading-relaxed text-ink">{agenda.material}</h2>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} className="text-ink-faint" /> {formatFull(agenda.date)}
              </span>
              {timeRange(agenda) && (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                  <Clock size={14} className="text-ink-faint" /> {timeRange(agenda)}
                </span>
              )}
              {agenda.completedAt && (
                <span className="inline-flex items-center gap-1.5 text-teal-700">
                  <Check size={14} /> Selesai {formatLong(agenda.completedAt.slice(0, 10))}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {agenda.completion === "none" && (
                <>
                  <button
                    onClick={() => router.push(`/teaching/${agenda.id}`)}
                    className={btn.accent}
                  >
                    <Play size={14} /> Start Teaching
                  </button>
                  <button
                    onClick={() => {
                      markCompleted(agenda.id);
                      toast("Ditandai selesai — jangan lupa isi review");
                    }}
                    className={btn.ghost}
                  >
                    <Check size={14} /> Mark Completed
                  </button>
                </>
              )}
              {agenda.completion === "in-progress" && (
                <button onClick={() => router.push(`/teaching/${agenda.id}`)} className={btn.accent}>
                  <Square size={13} /> Lanjutkan Sesi Mengajar
                </button>
              )}
              {agenda.completion === "completed" && (
                <button
                  onClick={() => {
                    reopenAgenda(agenda.id);
                    toast("Status dikembalikan ke planned", "info");
                  }}
                  className={btn.ghost}
                >
                  <RotateCcw size={14} /> Reopen
                </button>
              )}
              <button
                onClick={() => reviewRef.current?.scrollIntoView({ behavior: "smooth" })}
                className={btn.ghost}
              >
                <ClipboardCheck size={14} /> {agenda.review ? "Lihat Review" : "Isi Review"}
              </button>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* DETAILS */}
        <Card className="p-5">
          <SectionTitle>Detail Perkuliahan</SectionTitle>
          <div className="divide-y divide-line/70">
            <FieldRow icon="material" label="Materi" value={agenda.material} />
            <FieldRow icon="sub" label="Sub Materi" value={agenda.subMaterial} />
            <FieldRow icon="practical" label="Praktikum" value={agenda.practical} />
            <FieldRow icon="assignment" label="Tugas" value={agenda.assignment} />
            <FieldRow label="Studi Kasus" value={agenda.caseStudy} />
            <FieldRow icon="lecturer" label="Dosen" value={agenda.lecturer} />
            <FieldRow icon="className" label="Kelas" value={agenda.className} />
            <FieldRow label="Penilaian" value={agenda.assessment} />
            <FieldRow label="Catatan" value={agenda.notes} />
          </div>
          {Object.keys(agenda.metadata).length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-line">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Metadata (kolom lain dari Excel)</p>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {Object.entries(agenda.metadata).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <dt className="shrink-0 font-semibold text-ink-soft">{k}:</dt>
                    <dd className="truncate text-ink-faint">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          {/* PREPARATION */}
          <Card className="p-5">
            <SectionTitle
              right={<ListChecks size={15} className="text-ink-faint" />}
            >
              Preparation
            </SectionTitle>
            <PrepChecklist agenda={agenda} />
          </Card>

          {/* TEACHING status */}
          <Card className="p-5">
            <SectionTitle right={<Play size={14} className="text-ink-faint" />}>Teaching</SectionTitle>
            <div className="space-y-1.5">
              {(
                [
                  { key: "none", label: "Belum dimulai", active: agenda.completion === "none" },
                  { key: "in-progress", label: "Sedang berlangsung", active: agenda.completion === "in-progress" },
                  { key: "completed", label: "Selesai", active: agenda.completion === "completed" },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    if (s.key === "none") revertToPlanned(agenda.id);
                    if (s.key === "in-progress") {
                      startTeaching(agenda.id);
                      router.push(`/teaching/${agenda.id}`);
                    }
                    if (s.key === "completed") markCompleted(agenda.id);
                  }}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-[13px] font-semibold transition",
                    s.active ? "border-accent bg-accent-soft text-accent-deep" : "border-line bg-white text-ink-soft hover:border-line-strong"
                  )}
                >
                  {s.active ? (
                    <span className="flex h-4.5 w-4.5 items-center justify-center">
                      {s.key === "completed" ? <Check size={15} strokeWidth={3} /> : <Circle size={9} className="fill-accent text-accent" />}
                    </span>
                  ) : (
                    <Circle size={15} className="text-slate-300" />
                  )}
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Status efektif saat ini:{" "}
              <span className={clsx("font-bold", STATUS_META[status].text)}>{STATUS_META[status].label.toUpperCase()}</span>{" "}
              — dihitung dari tanggal, penyelesaian, persiapan, dan review.
            </p>
          </Card>
        </div>
      </div>

      {/* REVIEW */}
      <div ref={reviewRef} className="scroll-mt-20">
        <Card className="overflow-hidden">
          <div className={clsx("flex flex-wrap items-center justify-between gap-2 border-b px-6 py-4", agenda.review ? "border-teal-200 bg-teal-50/60" : "border-line bg-slate-50/60")}>
            <div className="flex items-center gap-2.5">
              <span className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", agenda.review ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-ink-soft")}>
                <ClipboardCheck size={16} />
              </span>
              <div>
                <p className="text-sm font-bold">Teaching Review</p>
                <p className="text-[11px] text-ink-faint">
                  {agenda.review ? `Tersimpan ${formatLong(agenda.review.savedAt.slice(0, 10))}` : "Isi setelah sesi mengajar selesai"}
                </p>
              </div>
            </div>
            {agenda.completion === "completed" && (
              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">
                Session Completed ✓
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
            {/* Coverage */}
            <div>
              <p className="eyebrow mb-2.5">Coverage — Materi yang berhasil disampaikan</p>
              <div className="space-y-1.5">
                {draft?.coverage.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCov(c.id)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition",
                      c.covered ? "border-teal-200 bg-teal-50/60 text-ink" : "border-line bg-white text-ink-soft hover:border-line-strong"
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                        c.covered ? "border-teal-500 bg-teal-500 text-white" : "border-slate-300"
                      )}
                    >
                      {c.covered && <Check size={12} strokeWidth={3.5} />}
                    </span>
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-xs font-semibold text-ink-soft">
                Progress materi: <span className="font-mono">{covered} / {coverageTotal}</span>
              </p>
              <textarea
                value={draft?.materialsCovered ?? ""}
                onChange={(e) => draft && setDraft({ ...draft, materialsCovered: e.target.value })}
                placeholder="Ringkasan materi yang berhasil disampaikan…"
                rows={2}
                className="mt-3 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
              />
            </div>

            {/* Notes fields */}
            <div className="space-y-3.5">
              {(
                [
                  ["obstacles", "Kendala", "Hambatan selama perkuliahan (teknis, waktu, dsb)…"],
                  ["studentNotes", "Catatan Mahasiswa / Class Notes", "Kehadiran, partisipasi, pertanyaan menarik…"],
                  ["repeatMaterial", "Materi yang Perlu Diulang", "Bagian yang belum tuntas / perlu review ulang…"],
                  ["nextSessionNotes", "Catatan untuk Pertemuan Berikutnya / Next Session Notes", "Persiapan khusus, remedial, penyesuaian RPS…"],
                  ["assignmentGiven", "Student Assignment", "Tugas yang diberikan kepada mahasiswa…"],
                ] as const
              ).map(([key, label, ph]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-faint">{label}</span>
                  <textarea
                    value={(draft?.[key] as string) ?? ""}
                    onChange={(e) => draft && setDraft({ ...draft, [key]: e.target.value })}
                    placeholder={ph}
                    rows={2}
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line bg-slate-50/50 px-6 py-3.5">
            {agenda.review && (
              <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700">
                <FileText size={13} /> Review tersimpan — Anda tetap dapat memperbaruinya.
              </span>
            )}
            <button onClick={handleSaveReview} className={btn.primary}>
              Simpan Review <ArrowRight size={14} />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AgendaDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-ink-faint">Memuat agenda…</div>}>
      <AgendaDetailInner />
    </Suspense>
  );
}
