"use client";

// ─── Shared agenda form (New / Edit / Duplicate) ─────────────────────────────

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, X } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Agenda } from "@/lib/types";
import { Field, btn, inputCls, Card } from "./ui";

export interface AgendaFormValues {
  courseId: string;
  newCourseName: string;
  meetingNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  material: string;
  subMaterial: string;
  practical: string;
  assignment: string;
  caseStudy: string;
  lecturer: string;
  className: string;
  assessment: string;
  notes: string;
}

export function emptyForm(courses: { id: string }[]): AgendaFormValues {
  return {
    courseId: courses[0]?.id ?? "",
    newCourseName: "",
    meetingNumber: "",
    date: "",
    startTime: "",
    endTime: "",
    material: "",
    subMaterial: "",
    practical: "",
    assignment: "",
    caseStudy: "",
    lecturer: "",
    className: "",
    assessment: "",
    notes: "",
  };
}

export function formFromAgenda(a: Agenda): AgendaFormValues {
  return {
    courseId: a.courseId,
    newCourseName: "",
    meetingNumber: a.meetingNumber != null ? String(a.meetingNumber) : "",
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    material: a.material,
    subMaterial: a.subMaterial,
    practical: a.practical,
    assignment: a.assignment,
    caseStudy: a.caseStudy,
    lecturer: a.lecturer,
    className: a.className,
    assessment: a.assessment,
    notes: a.notes,
  };
}

export function AgendaForm({
  initial,
  onSubmit,
  submitLabel = "Simpan Agenda",
}: {
  initial: AgendaFormValues;
  onSubmit: (values: AgendaFormValues, courseId: string) => void;
  submitLabel?: string;
}) {
  const { courses, findOrCreateCourse } = useApp();
  const router = useRouter();
  const [v, setV] = useState<AgendaFormValues>(initial);
  const [error, setError] = useState("");

  const set = <K extends keyof AgendaFormValues>(k: K, val: AgendaFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.courseId && !v.newCourseName.trim()) {
      setError("Pilih course atau buat course baru.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) {
      setError("Tanggal wajib diisi dengan benar.");
      return;
    }
    if (!v.material.trim()) {
      setError("Materi wajib diisi.");
      return;
    }
    let cid = v.courseId;
    if (!cid && v.newCourseName.trim()) {
      cid = findOrCreateCourse(v.newCourseName.trim()).id;
    }
    onSubmit(v, cid);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="p-5 md:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Course">
            <select value={v.courseId} onChange={(e) => set("courseId", e.target.value)} className={inputCls}>
              <option value="">— Pilih course / buat baru —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Atau Course Baru">
            <div className="relative">
              <input
                value={v.newCourseName}
                onChange={(e) => {
                  set("newCourseName", e.target.value);
                  if (e.target.value.trim()) set("courseId", "");
                }}
                placeholder="Nama mata kuliah baru…"
                className={inputCls}
              />
              <Plus size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            </div>
          </Field>
          <Field label="Meeting Number">
            <input
              type="number"
              min={1}
              value={v.meetingNumber}
              onChange={(e) => set("meetingNumber", e.target.value)}
              placeholder="mis. 3"
              className={inputCls}
            />
          </Field>
          <Field label="Date">
            <input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Start Time (opsional)">
            <input type="time" value={v.startTime} onChange={(e) => set("startTime", e.target.value)} className={inputCls} />
          </Field>
          <Field label="End Time (opsional)">
            <input type="time" value={v.endTime} onChange={(e) => set("endTime", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Material" span>
            <textarea
              value={v.material}
              onChange={(e) => set("material", e.target.value)}
              rows={2}
              placeholder="Topik utama pertemuan ini…"
              className={inputCls}
            />
          </Field>
          <Field label="Sub Material" span>
            <textarea
              value={v.subMaterial}
              onChange={(e) => set("subMaterial", e.target.value)}
              rows={2}
              placeholder="Rincian sub topik, dipisah koma…"
              className={inputCls}
            />
          </Field>
          <Field label="Practical / Praktikum">
            <textarea value={v.practical} onChange={(e) => set("practical", e.target.value)} rows={2} className={inputCls} />
          </Field>
          <Field label="Assignment / Tugas">
            <textarea value={v.assignment} onChange={(e) => set("assignment", e.target.value)} rows={2} className={inputCls} />
          </Field>
          <Field label="Case Study / Studi Kasus">
            <input value={v.caseStudy} onChange={(e) => set("caseStudy", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Assessment / Penilaian">
            <input value={v.assessment} onChange={(e) => set("assessment", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Lecturer / Dosen">
            <input value={v.lecturer} onChange={(e) => set("lecturer", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Class / Kelas">
            <input value={v.className} onChange={(e) => set("className", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notes / Catatan" span>
            <textarea value={v.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={inputCls} />
          </Field>
        </div>

        {error && <p className="mt-3 text-[13px] font-semibold text-red-600">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={() => router.back()} className={btn.ghost}>
            <X size={14} /> Cancel
          </button>
          <button type="submit" className={btn.primary}>
            <Save size={14} /> {submitLabel}
          </button>
        </div>
      </Card>
    </form>
  );
}
