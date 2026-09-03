"use client";

// ─── Add Agenda ───────────────────────────────────────────────────────────────

import React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { useApp } from "@/lib/store";
import { AgendaForm, emptyForm, AgendaFormValues } from "@/components/AgendaForm";

export default function NewAgendaPage() {
  const { courses, addAgenda, toast } = useApp();
  const router = useRouter();

  const handleSubmit = (v: AgendaFormValues, courseId: string) => {
    const agenda = addAgenda({
      courseId,
      meetingNumber: v.meetingNumber ? parseInt(v.meetingNumber, 10) : null,
      date: v.date,
      startTime: v.startTime,
      endTime: v.endTime,
      material: v.material.trim(),
      subMaterial: v.subMaterial.trim(),
      practical: v.practical.trim(),
      assignment: v.assignment.trim(),
      caseStudy: v.caseStudy.trim(),
      lecturer: v.lecturer.trim(),
      className: v.className.trim(),
      assessment: v.assessment.trim(),
      notes: v.notes.trim(),
    });
    toast("Agenda baru tersimpan");
    router.push(`/agenda/${agenda.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
          <PlusCircle size={19} />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">New Agenda</h1>
          <p className="text-[13px] text-ink-faint">Tambahkan sesi perkuliahan baru ke kalender Anda.</p>
        </div>
      </div>
      <AgendaForm initial={emptyForm(courses)} onSubmit={handleSubmit} submitLabel="Save" />
    </div>
  );
}
