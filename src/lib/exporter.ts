// ─── Export & backup utilities ───────────────────────────────────────────────

import * as XLSX from "xlsx";
import type { Agenda, AppState, Course } from "./types";
import { formatLong } from "./dates";
import { effectiveStatus, prepStats, STATUS_META } from "./status";

export interface FlatRow {
  [key: string]: string | number;
}

export function agendasToRows(agendas: Agenda[], courses: Course[]): FlatRow[] {
  const courseOf = (a: Agenda) => courses.find((c) => c.id === a.courseId);
  const sorted = [...agendas].sort((x, y) => (x.date < y.date ? -1 : 1));
  return sorted.map((a) => {
    const c = courseOf(a);
    const st = STATUS_META[effectiveStatus(a)].label;
    const prep = prepStats(a);
    return {
      Tanggal: a.date ? formatLong(a.date) : "",
      "Mata Kuliah": c?.name ?? "",
      Pertemuan: a.meetingNumber ?? "",
      Hari: "",
      "Jam Mulai": a.startTime,
      "Jam Selesai": a.endTime,
      Materi: a.material,
      "Sub Materi": a.subMaterial,
      Praktikum: a.practical,
      Tugas: a.assignment,
      "Studi Kasus": a.caseStudy,
      Dosen: a.lecturer,
      Kelas: a.className,
      Penilaian: a.assessment,
      Status: st,
      Persiapan: `${prep.done}/${prep.total}`,
      Review: a.review ? "Sudah" : "Belum",
      Catatan: a.notes,
      ...Object.fromEntries(Object.entries(a.metadata).map(([k, v]) => [`meta:${k}`, v])),
    };
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCSV(rows: FlatRow[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(";")),
  ];
  downloadBlob(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }), filename);
}

export function exportXLSX(rows: FlatRow[], filename: string, sheetName = "Agenda") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function exportJSON(obj: unknown, filename: string) {
  downloadBlob(
    new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }),
    filename
  );
}

// ─── Full backup ─────────────────────────────────────────────────────────────

export interface BackupFile {
  app: "academic-teaching-planner";
  version: 1;
  exportedAt: string;
  data: Pick<AppState, "courses" | "agendas" | "settings" | "dismissedNotifIds">;
}

export function makeBackup(state: AppState): BackupFile {
  return {
    app: "academic-teaching-planner",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      courses: state.courses,
      agendas: state.agendas,
      settings: state.settings,
      dismissedNotifIds: state.dismissedNotifIds,
    },
  };
}

export function parseBackup(json: unknown): BackupFile["data"] | null {
  if (
    typeof json === "object" &&
    json !== null &&
    (json as BackupFile).app === "academic-teaching-planner" &&
    Array.isArray((json as BackupFile).data?.courses) &&
    Array.isArray((json as BackupFile).data?.agendas)
  ) {
    return (json as BackupFile).data;
  }
  // tolerate raw state dumps
  const j = json as Partial<AppState>;
  if (Array.isArray(j?.courses) && Array.isArray(j?.agendas)) {
    return {
      courses: j.courses,
      agendas: j.agendas,
      settings: j.settings as AppState["settings"],
      dismissedNotifIds: j.dismissedNotifIds ?? [],
    };
  }
  return null;
}

export function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}
