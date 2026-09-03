"use client";

// ─── Course detail: progress + full meeting timeline ─────────────────────────

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock,
  Play,
  Settings2,
  Trash2,
  User,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { formatLong, todayStr } from "@/lib/dates";
import { courseProgress, effectiveStatus, HEALTH_META, STATUS_META } from "@/lib/status";
import { Card, CourseDot, ProgressBar, SegmentedBar, btn, inputCls } from "@/components/ui";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getCourse, agendas, updateCourse, deleteCourse, toast } = useApp();
  const course = getCourse(params.id);
  const today = todayStr();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [totalMeetings, setTotalMeetings] = useState("16");
  const [lecturer, setLecturer] = useState("");

  const cp = useMemo(() => (course ? courseProgress(course, agendas, today) : null), [course, agendas, today]);

  if (!course || !cp) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-faint">Course tidak ditemukan.</p>
        <Link href="/courses" className={clsx(btn.primary, "mt-4")}>
          <ArrowLeft size={14} /> Kembali
        </Link>
      </div>
    );
  }

  const health = HEALTH_META[cp.health];
  // chronological (date order) for the timeline
  const timeline = cp.meetings
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.meetingNumber ?? 0) - (b.meetingNumber ?? 0)));
  const next = cp.next;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => router.push("/courses")} className={btn.ghost}>
          <ArrowLeft size={15} /> Courses
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditing((e) => !e);
              setName(course.name);
              setTotalMeetings(String(course.totalMeetings));
              setLecturer(course.lecturer);
            }}
            className={btn.ghost}
          >
            <Settings2 size={14} /> Atur Course
          </button>
          <button
            onClick={() => {
              deleteCourse(course.id, true);
              toast("Course beserta agendanya dihapus", "info");
              router.push("/courses");
            }}
            className={btn.danger}
          >
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: course.color }} />
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: course.color }}>
                    <BookMarked size={19} />
                  </span>
                  <div>
                    <h1 className="font-display text-2xl font-bold uppercase tracking-tight md:text-3xl">{course.name}</h1>
                    {course.lecturer && (
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-ink-faint">
                        <User size={13} /> {course.lecturer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1", health.cls)}>
                <span className={clsx("h-1.5 w-1.5 rounded-full", health.dot)} /> {health.label}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="eyebrow">Progress</p>
                  <p className="font-display text-2xl font-bold">
                    {cp.completed}
                    <span className="text-base font-semibold text-ink-faint"> / {cp.total}</span>
                  </p>
                </div>
                <SegmentedBar value={cp.total ? cp.completed / cp.total : 0} segments={16} />
                <p className="mt-2 text-xs font-semibold text-ink-faint">
                  {Math.round(cp.pct * 100)}% selesai · {cp.missed > 0 ? `${cp.missed} terlewat · ` : ""}{cp.due} seharusnya sudah berlangsung
                </p>
              </div>
              {next && (
                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-line">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">Upcoming</p>
                  <p className="mt-1.5 font-display text-base font-bold">
                    {next.meetingNumber != null && `Pertemuan ${next.meetingNumber} · `}
                    <span className="font-sans text-sm font-semibold text-ink-soft">{formatLong(next.date)}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">{next.material}</p>
                  <Link href={`/agenda/${next.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    Buka agenda <ChevronRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Edit settings */}
      {editing && (
        <Card className="p-5">
          <p className="eyebrow mb-3">Pengaturan Course</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">Nama</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">Total Pertemuan</span>
              <input type="number" min={1} value={totalMeetings} onChange={(e) => setTotalMeetings(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">Dosen</span>
              <input value={lecturer} onChange={(e) => setLecturer(e.target.value)} className={inputCls} />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className={btn.ghost}>Batal</button>
            <button
              onClick={() => {
                updateCourse(course.id, {
                  name: name.trim() || course.name,
                  shortName: name.trim() || course.shortName,
                  lecturer,
                  totalMeetings: Math.max(1, parseInt(totalMeetings, 10) || 16),
                });
                setEditing(false);
                toast("Course diperbarui");
              }}
              className={btn.primary}
            >
              Simpan
            </button>
          </div>
        </Card>
      )}

      {/* Meeting timeline */}
      <Card className="p-5 md:p-6">
        <p className="eyebrow mb-4">Timeline Pertemuan ({timeline.length})</p>
        <div className="relative space-y-1 pl-7 before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-line-strong">
          {timeline.map((a, i) => {
            const st = effectiveStatus(a, today);
            const isNext = next?.id === a.id;
            const Icon = st === "completed" ? Check : isNext || st === "in-progress" ? Play : Circle;
            return (
              <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }} className="relative">
                <span
                  className={clsx(
                    "absolute -left-7 top-4 flex h-[23px] w-[23px] items-center justify-center rounded-full border-2 border-cream",
                    st === "completed"
                      ? "bg-teal-500 text-white"
                      : isNext || st === "in-progress"
                        ? "bg-accent text-white"
                        : st === "missed"
                          ? "bg-red-100 text-red-500"
                          : "bg-slate-200 text-slate-400"
                  )}
                >
                  <Icon size={11} strokeWidth={3} />
                </span>
                <Link
                  href={`/agenda/${a.id}`}
                  className={clsx(
                    "block rounded-xl border px-4 py-3 transition hover:shadow-card",
                    isNext ? "border-accent/40 bg-accent-soft/40" : st === "missed" ? "border-red-200 bg-red-50/30" : "border-line bg-white hover:border-line-strong"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink-soft">
                      {a.meetingNumber != null ? `Pertemuan ${a.meetingNumber}` : "Sesi"}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-faint">
                      <CalendarDays size={11} /> {formatLong(a.date)}
                    </span>
                    {(a.startTime || a.endTime) && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-faint">
                        <Clock size={11} /> {a.startTime}{a.endTime ? `–${a.endTime}` : ""}
                      </span>
                    )}
                    <span className={clsx("ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ring-1", STATUS_META[st].bg, STATUS_META[st].text, STATUS_META[st].ring)}>
                      {a.date === today && st !== "completed" ? "TODAY" : STATUS_META[st].label.toUpperCase()}
                    </span>
                  </div>
                  <p className={clsx("mt-1.5 text-sm font-medium", st === "completed" ? "text-ink-faint" : "text-ink")}>
                    {a.material}
                  </p>
                  {a.review && (
                    <p className="mt-1 text-[11px] font-semibold text-teal-600">Review tersimpan ✓</p>
                  )}
                </Link>
              </motion.div>
            );
          })}
          {timeline.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm text-ink-faint">Belum ada pertemuan untuk course ini.</p>
              <Link href="/agenda/new" className={clsx(btn.primary, "mt-3 inline-flex")}>+ Tambah Agenda</Link>
            </div>
          )}
        </div>

        {cp.meetings.length < course.totalMeetings && (
          <div className="mt-4 rounded-xl border border-dashed border-line-strong bg-slate-50/60 p-4 text-center text-xs text-ink-faint">
            {course.totalMeetings - cp.meetings.length} pertemuan lagi belum dijadwalkan dari total {course.totalMeetings}.
            <Link href="/agenda/new" className="ml-1 font-semibold text-accent hover:underline">
              Jadwalkan sekarang <ArrowRight size={11} className="inline" />
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
