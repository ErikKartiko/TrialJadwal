"use client";

// ─── Courses: progress cards with On Track / Attention / Behind ───────────────

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BookMarked, Plus, X } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { formatLong, todayStr } from "@/lib/dates";
import { courseProgress, HEALTH_META } from "@/lib/status";
import { Card, CourseDot, EmptyState, ProgressBar, btn, inputCls } from "@/components/ui";

export default function CoursesPage() {
  const { agendas, courses, addCourse, toast } = useApp();
  const today = todayStr();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const progress = useMemo(
    () => courses.map((c) => courseProgress(c, agendas, today)).sort((a, b) => a.course.name.localeCompare(b.course.name)),
    [courses, agendas, today]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-[13px] text-ink-faint">
            {courses.length} mata kuliah · {agendas.length} total sesi
          </p>
        </div>
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              addCourse(newName.trim());
              toast(`Course "${newName.trim()}" ditambahkan`);
              setNewName("");
              setAdding(false);
            }}
            className="flex items-center gap-2"
          >
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama mata kuliah…" className={clsx(inputCls, "w-56")} />
            <button type="submit" className={btn.primary}>Tambah</button>
            <button type="button" onClick={() => setAdding(false)} className={btn.ghost}><X size={14} /></button>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className={btn.primary}>
            <Plus size={15} strokeWidth={2.5} /> New Course
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookMarked size={18} />}
          title="No courses yet. Import your Excel file to get started."
          hint="Setiap worksheet di Matkul.xlsx akan otomatis menjadi satu mata kuliah."
          action={{ label: "Import Data", href: "/import" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {progress.map((p, i) => {
            const health = HEALTH_META[p.health];
            return (
              <motion.div
                key={p.course.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/courses/${p.course.id}`}>
                  <Card className="group relative overflow-hidden p-5 transition hover:shadow-float">
                    <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: p.course.color }} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: p.course.color }}>
                          <BookMarked size={16} />
                        </span>
                        <div>
                          <h2 className="font-display text-[17px] font-bold leading-tight tracking-tight group-hover:text-accent">
                            {p.course.name}
                          </h2>
                          <p className="text-[11px] text-ink-faint">{p.course.lecturer || "—"}</p>
                        </div>
                      </div>
                      <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1", health.cls)}>
                        <span className={clsx("h-1.5 w-1.5 rounded-full", health.dot)} />
                        {health.label}
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-ink-soft">Progress</span>
                        <span className="font-mono text-xs font-bold">
                          {p.completed} / {p.total} <span className="font-sans font-medium text-ink-faint">Meetings</span>
                        </span>
                      </div>
                      <ProgressBar value={p.pct} color={p.pct >= 1 ? "#059669" : p.course.color} height="h-2" />
                      <p className="mt-1 text-right font-mono text-[11px] font-bold text-ink-faint">{Math.round(p.pct * 100)}%</p>
                    </div>

                    {p.next ? (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-line">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">Next</p>
                        <p className="mt-1 text-[13px] font-bold">
                          {p.next.meetingNumber != null ? `Pertemuan ${p.next.meetingNumber} · ` : ""}
                          <span className="font-medium text-ink-soft">{formatLong(p.next.date)}</span>
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{p.next.material}</p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl bg-teal-50 p-3 text-center text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                        Semua pertemuan selesai ✓
                      </div>
                    )}

                    <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition group-hover:opacity-100">
                      Buka detail <ArrowRight size={12} />
                    </span>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
