"use client";

// ─── Dashboard ────────────────────────────────────────────────────────────────

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  Flame,
  Library,
  Play,
  Plus,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import {
  addDays,
  diffDays,
  formatFull,
  formatLong,
  formatShort,
  relativeLabel,
  startOfWeek,
  todayStr,
} from "@/lib/dates";
import { effectiveStatus, prepStats } from "@/lib/status";
import { AgendaRow } from "@/components/AgendaItems";
import {
  Card,
  CourseDot,
  EmptyState,
  ProgressBar,
  SectionTitle,
  StatusBadge,
  btn,
} from "@/components/ui";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 15) return "Good afternoon";
  if (h < 19) return "Good evening";
  return "Good night";
}

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { agendas, courses, settings } = useApp();
  const router = useRouter();
  const today = todayStr();

  const courseOf = (cid: string) => courses.find((c) => c.id === cid);

  const todays = useMemo(
    () =>
      agendas
        .filter((a) => a.date === today)
        .sort((x, y) => (x.startTime || "99") < (y.startTime || "99") ? -1 : 1),
    [agendas, today]
  );

  const upcoming = useMemo(
    () =>
      agendas
        .filter((a) => diffDays(today, a.date) >= 0 && a.completion !== "completed")
        .sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : (x.startTime || "") < (y.startTime || "") ? -1 : 1)),
    [agendas, today]
  );

  const nextClass = upcoming.find((a) => a.completion !== "in-progress") ?? upcoming[0] ?? null;
  const upcomingFive = upcoming.slice(0, 5);

  // Preparation: today + next 3 days uncompleted sessions with pending items
  const prepFocus = useMemo(
    () =>
      upcoming
        .filter((a) => diffDays(today, a.date) <= 3)
        .filter((a) => a.preparation.some((p) => !p.done))
        .slice(0, 5),
    [upcoming, today]
  );

  // My week
  const week = useMemo(() => {
    const start = startOfWeek(today);
    const end = addDays(start, 6);
    const inWeek = agendas.filter((a) => a.date >= start && a.date <= end);
    const sessions = inWeek.length;
    const courseSet = new Set(inWeek.map((a) => a.courseId));
    const prepPending = inWeek.filter((a) => a.completion !== "completed" && a.preparation.some((p) => !p.done)).length;
    const reviewsPending = agendas.filter(
      (a) => a.completion === "completed" && !a.review && diffDays(a.date, today) <= 14
    ).length;
    const completed = inWeek.filter((a) => a.completion === "completed").length;
    const due = inWeek.filter((a) => diffDays(today, a.date) <= 0).length;
    const rate = due === 0 ? (sessions === 0 ? 0 : 1) : completed / Math.max(1, due);
    return { sessions, courses: courseSet.size, prepPending, reviewsPending, rate, start, end };
  }, [agendas, today]);

  const noData = courses.length === 0;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div {...fadeUp} transition={{ duration: 0.3 }} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            {settings.semesterName}
          </p>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight md:text-3xl">
            {greeting()}, Lecturer
          </h1>
          <p className="mt-0.5 text-sm text-ink-faint">{formatFull(today)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/agenda/new" className={btn.primary}>
            <Plus size={15} strokeWidth={2.5} /> New Agenda
          </Link>
          <Link href="/import" className={btn.ghost}>
            <FileSpreadsheet size={15} /> Import Excel
          </Link>
          <Link href="/calendar" className={btn.ghost}>
            <CalendarDays size={15} /> Calendar
          </Link>
          <Link href="/courses" className={btn.ghost}>
            <Library size={15} /> Courses
          </Link>
        </div>
      </motion.div>

      {noData ? (
        <EmptyState
          icon={<Sparkles size={20} />}
          title="No courses yet. Import your Excel file to get started."
          hint="Unggah Matkul.xlsx Anda — aplikasi akan membaca seluruh worksheet, mendeteksi kolom secara otomatis, dan menyiapkan seluruh agenda semester Anda."
          action={{ label: "Buka Import Data", href: "/import" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* ── Left column (today + upcoming) ── */}
          <div className="space-y-4 xl:col-span-2">
            {/* TODAY */}
            <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }}>
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                      <Flame size={16} />
                    </span>
                    <div>
                      <p className="eyebrow !text-ink">Today</p>
                      <p className="text-[11px] text-ink-faint">{formatLong(today)}</p>
                    </div>
                  </div>
                  <p className="font-display text-xl font-bold">
                    {todays.length}
                    <span className="ml-1.5 text-xs font-semibold text-ink-faint">
                      {todays.length === 1 ? "Class" : "Classes"} Today
                    </span>
                  </p>
                </div>
                <div className="space-y-2 p-3.5">
                  {todays.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-ink-faint">
                      Tidak ada agenda pada tanggal ini. Nikmati harimu — atau lihat agenda mendatang di bawah.
                    </p>
                  ) : (
                    todays.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3"
                      >
                        <div className="flex w-[52px] shrink-0 flex-col items-center rounded-lg bg-slate-50 py-1 ring-1 ring-line">
                          <Clock size={11} className="text-ink-faint" />
                          <span className="mt-0.5 font-mono text-[11px] font-bold text-ink">{a.startTime || "—"}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CourseDot course={courseOf(a.courseId)} />
                            <span className="text-[13px] font-bold">{courseOf(a.courseId)?.name}</span>
                            {a.meetingNumber != null && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-soft">
                                Pertemuan {a.meetingNumber}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-[13px] text-ink-soft">{a.material}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="hidden sm:block"><StatusBadge agenda={a} today={today} /></span>
                          {a.completion === "none" && (
                            <button
                              onClick={() => router.push(`/teaching/${a.id}`)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-2.5 text-xs font-semibold text-white transition hover:bg-accent"
                            >
                              <Play size={12} /> <span className="hidden md:inline">Teach</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>

            {/* NEXT CLASS hero */}
            {nextClass && (
              <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }}>
                <Card className="relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 w-1.5"
                    style={{ backgroundColor: courseOf(nextClass.courseId)?.color ?? "#4338ca" }}
                  />
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between">
                      <p className="eyebrow">Next Class</p>
                      <StatusBadge agenda={nextClass} today={today} />
                    </div>
                    <Link href={`/agenda/${nextClass.id}`} className="group mt-3 block">
                      <div className="flex items-center gap-2.5">
                        <CourseDot course={courseOf(nextClass.courseId)} size="h-3.5 w-3.5" />
                        <h2 className="font-display text-2xl font-bold tracking-tight group-hover:text-accent">
                          {courseOf(nextClass.courseId)?.name}
                        </h2>
                        {nextClass.meetingNumber != null && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-ink-soft">
                            Pertemuan {nextClass.meetingNumber}
                          </span>
                        )}
                        <ArrowUpRight size={18} className="text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-accent" />
                      </div>
                      <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-soft">{nextClass.material}</p>
                    </Link>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-soft">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-ink-faint" /> {formatLong(nextClass.date)}
                      </span>
                      {(nextClass.startTime || nextClass.endTime) && (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <Clock size={14} className="text-ink-faint" />
                          {nextClass.startTime}{nextClass.endTime ? ` – ${nextClass.endTime}` : ""}
                        </span>
                      )}
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                        {relativeLabel(nextClass.date, today)}
                      </span>
                    </div>
                    {(() => {
                      const p = prepStats(nextClass);
                      return (
                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between text-xs font-semibold">
                            <span className="text-ink-soft">Preparation</span>
                            <span className="text-ink-faint">{p.done}/{p.total}</span>
                          </div>
                          <ProgressBar value={p.pct} color={p.pct === 1 ? "#059669" : courseOf(nextClass.courseId)?.color} />
                        </div>
                      );
                    })()}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={`/agenda/${nextClass.id}`} className={btn.primary}>
                        Open Agenda <ArrowRight size={14} />
                      </Link>
                      {nextClass.completion === "none" && (
                        <button onClick={() => router.push(`/teaching/${nextClass.id}`)} className={btn.accent}>
                          <Play size={14} /> Start Teaching
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* UPCOMING */}
            <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.15 }}>
              <SectionTitle
                right={
                  <Link href="/agenda" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                    Lihat semua <ArrowRight size={12} />
                  </Link>
                }
              >
                Upcoming
              </SectionTitle>
              <div className="space-y-2">
                {upcomingFive.length === 0 ? (
                  <EmptyState
                    icon={<CalendarDays size={18} />}
                    title="Tidak ada agenda mendatang"
                    hint="Semua agenda sudah selesai, atau tambahkan agenda baru untuk minggu-minggu berikutnya."
                    action={{ label: "+ New Agenda", href: "/agenda/new" }}
                  />
                ) : (
                  upcomingFive.map((a) => (
                    <AgendaRow key={a.id} agenda={a} course={courseOf(a.courseId)} today={today} />
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* ── Right column (prep + my week) ── */}
          <div className="space-y-4">
            {/* WHAT SHOULD I PREPARE? */}
            <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.12 }}>
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="eyebrow !text-ink">What Should I Prepare?</p>
                  <Link href="/preparation" className="text-xs font-semibold text-accent hover:underline">
                    Semua
                  </Link>
                </div>
                {prepFocus.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                      <Check size={17} strokeWidth={2.5} />
                    </span>
                    <p className="text-sm font-semibold">All preparation complete.</p>
                    <p className="text-xs text-ink-faint">Tidak ada persiapan mendesak 3 hari ke depan.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prepFocus.map((a) => {
                      const pend = a.preparation.filter((p) => !p.done);
                      return (
                        <div key={a.id}>
                          <div className="flex items-center justify-between gap-2">
                            <Link href={`/agenda/${a.id}`} className="flex min-w-0 items-center gap-2 hover:text-accent">
                              <CourseDot course={courseOf(a.courseId)} />
                              <span className="truncate text-[13px] font-bold">{courseOf(a.courseId)?.name}</span>
                              {a.meetingNumber != null && (
                                <span className="font-mono text-[10px] text-ink-faint">P{a.meetingNumber}</span>
                              )}
                            </Link>
                            <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                              {relativeLabel(a.date, today)}
                            </span>
                          </div>
                          <ul className="mt-1.5 space-y-1 pl-1">
                            {pend.slice(0, 3).map((p) => (
                              <li key={p.id} className="flex items-center gap-2 text-xs text-ink-soft">
                                <span className="h-3.5 w-3.5 shrink-0 rounded border-2 border-slate-300" />
                                <span className="truncate">{p.label}</span>
                              </li>
                            ))}
                            {pend.length > 3 && (
                              <li className="pl-6 text-[11px] text-ink-faint">+{pend.length - 3} lainnya</li>
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* MY WEEK */}
            <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.18 }}>
              <Card className="p-5">
                <div className="mb-1 flex items-center justify-between">
                  <p className="eyebrow !text-ink">My Week</p>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {formatShort(week.start)} – {formatShort(week.end)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Teaching Sessions", value: week.sessions },
                    { label: "Courses", value: week.courses },
                    { label: "Preparation Pending", value: week.prepPending },
                    { label: "Reviews Pending", value: week.reviewsPending },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-slate-50 p-3 ring-1 ring-line">
                      <p className="font-display text-[22px] font-bold leading-none">{s.value}</p>
                      <p className="mt-1.5 text-[11px] font-medium leading-tight text-ink-faint">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5">
                  <div className="mb-1.5 flex justify-between text-xs font-semibold">
                    <span className="text-ink-soft">Completion Rate</span>
                    <span className="font-mono text-ink">{Math.round(week.rate * 100)}%</span>
                  </div>
                  <ProgressBar value={week.rate} color={week.rate >= 0.99 ? "#059669" : "#4338ca"} />
                </div>
                <Link
                  href="/weekly"
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-2 text-xs font-semibold text-ink transition hover:bg-slate-200"
                >
                  <ClipboardList size={13} /> Buka Weekly Planner
                </Link>
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
