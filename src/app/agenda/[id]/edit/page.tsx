"use client";

// ─── Edit Agenda ──────────────────────────────────────────────────────────────

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PencilLine } from "lucide-react";
import { useApp } from "@/lib/store";
import { AgendaForm, formFromAgenda, AgendaFormValues } from "@/components/AgendaForm";
import { btn } from "@/components/ui";

export default function EditAgendaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getAgenda, updateAgenda, toast } = useApp();
  const agenda = getAgenda(params.id);

  if (!agenda) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-faint">Agenda tidak ditemukan.</p>
        <Link href="/agenda" className={`${btn.primary} mt-4`}>Kembali</Link>
      </div>
    );
  }

  const handleSubmit = (v: AgendaFormValues, courseId: string) => {
    const dateChanged = v.date !== agenda.date;
    updateAgenda(agenda.id, {
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
    toast(dateChanged ? "Agenda diperbarui — kalender & reminder mengikuti tanggal baru" : "Agenda diperbarui");
    router.push(`/agenda/${agenda.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white">
          <PencilLine size={18} />
        </span>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Edit Agenda</h1>
          <p className="text-[13px] text-ink-faint">
            Perubahan tanggal otomatis memperbarui kalender dan reminder.
          </p>
        </div>
      </div>
      <AgendaForm initial={formFromAgenda(agenda)} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  );
}
