"use client";

// ─── Settings & data management ──────────────────────────────────────────────

import React, { useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import clsx from "clsx";
import { useApp, DEFAULT_SETTINGS } from "@/lib/store";
import { agendasToRows, exportCSV, exportJSON, exportXLSX, makeBackup, parseBackup, stamp } from "@/lib/exporter";
import { Card, SectionTitle, btn, inputCls } from "@/components/ui";
import type { ReminderSettings } from "@/lib/types";

const REMINDER_ITEMS: { key: keyof ReminderSettings; label: string; desc: string }[] = [
  { key: "h7", label: "H-7", desc: "Agenda akan berlangsung dalam 7 hari" },
  { key: "h3", label: "H-3", desc: "Pengingat persiapan materi 3 hari sebelum" },
  { key: "h1", label: "H-1", desc: "Besok Anda mengajar" },
  { key: "h0", label: "Hari H", desc: "Hari ini Anda mengajar" },
  { key: "prep", label: "Persiapan", desc: "Checklist persiapan belum lengkap menjelang sesi" },
  { key: "review", label: "Review setelah mengajar", desc: "Pengingat mengisi Teaching Review" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-accent" : "bg-slate-300"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const {
    settings, updateSettings, courses, agendas, replaceAll, resetDemo, clearAll, toast,
  } = useApp();
  const backupRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const doExportBackup = () => {
    exportJSON(makeBackup({ courses, agendas, settings, dismissedNotifIds: [], seededAt: null }), `teaching-planner-backup-${stamp()}.json`);
    toast("Backup JSON diunduh");
  };

  const doImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const data = parseBackup(JSON.parse(text));
      if (!data) {
        toast("File backup tidak valid", "error");
        return;
      }
      replaceAll({
        courses: data.courses,
        agendas: data.agendas,
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
        dismissedNotifIds: data.dismissedNotifIds ?? [],
      });
      toast(`Backup dipulihkan: ${data.courses.length} course, ${data.agendas.length} agenda`);
    } catch {
      toast("Gagal membaca file backup", "error");
    } finally {
      if (backupRef.current) backupRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-[13px] text-ink-faint">Semester, reminder, tampilan, dan manajemen data.</p>
      </div>

      {/* Semester */}
      <Card className="p-5">
        <SectionTitle>Semester Aktif</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Nama Semester</span>
            <select
              value={settings.semesterName}
              onChange={(e) => updateSettings({ semesterName: e.target.value })}
              className={inputCls}
            >
              {["2026/2027 Ganjil", "2026/2027 Genap", "2025/2026 Ganjil", "2025/2026 Genap"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">Date Format</span>
            <select
              value={settings.dateFormat}
              onChange={(e) => updateSettings({ dateFormat: e.target.value as "long" | "short" })}
              className={inputCls}
            >
              <option value="long">3 September 2026</option>
              <option value="short">3 Sep 2026</option>
            </select>
          </label>
        </div>
      </Card>

      {/* Reminders */}
      <Card className="p-5">
        <SectionTitle>Reminder</SectionTitle>
        <div className="divide-y divide-line/70">
          {REMINDER_ITEMS.map((r) => (
            <div key={r.key} className="flex items-center gap-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                {r.key === "review" ? <Bell size={14} /> : <CalendarClock size={14} />}
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-bold">{r.label}</p>
                <p className="text-xs text-ink-faint">{r.desc}</p>
              </div>
              <Toggle
                on={settings.reminders[r.key]}
                onChange={(v) => updateSettings({ reminders: { ...settings.reminders, [r.key]: v } })}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Default view */}
      <Card className="p-5">
        <SectionTitle>Default View</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {[
            ["dashboard", "Dashboard"],
            ["calendar", "Calendar"],
            ["weekly", "Weekly Planner"],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => updateSettings({ defaultView: v })}
              className={clsx(
                "rounded-lg px-3.5 py-2 text-[13px] font-semibold ring-1 transition",
                settings.defaultView === v ? "bg-ink text-white ring-ink" : "bg-white text-ink-soft ring-line hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Export / backup */}
      <Card className="p-5">
        <SectionTitle>Backup & Export</SectionTitle>
        <p className="mb-4 text-xs leading-relaxed text-ink-faint">
          Data tersimpan otomatis di browser (localStorage) dan tidak hilang saat refresh. Backup memindahkan
          seluruh data — course, agenda, checklist, review, dan pengaturan — sebagai satu file JSON.
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button onClick={doExportBackup} className={clsx(btn.primary, "justify-center")}>
            <Download size={14} /> Export Backup (JSON)
          </button>
          <button onClick={() => backupRef.current?.click()} className={clsx(btn.ghost, "justify-center")}>
            <Upload size={14} /> Import Backup
          </button>
          <input ref={backupRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doImportBackup(f); }} />
        </div>
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-faint">Export semester agenda</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { exportCSV(agendasToRows(agendas, courses), `semester-${stamp()}.csv`); toast("CSV diekspor"); }}
              className={btn.ghost}
            >
              <FileText size={14} /> CSV
            </button>
            <button
              onClick={() => { exportXLSX(agendasToRows(agendas, courses), `semester-${stamp()}.xlsx`, "Agenda Semester"); toast("Excel diekspor"); }}
              className={btn.ghost}
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              onClick={() => { exportJSON(agendasToRows(agendas, courses), `semester-${stamp()}.json`); toast("JSON diekspor"); }}
              className={btn.ghost}
            >
              <FileJson size={14} /> JSON
            </button>
          </div>
        </div>
      </Card>

      {/* Data management */}
      <Card className="border-red-200/60 p-5">
        <SectionTitle>Data Management</SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={resetDemo} className={btn.ghost}>
            <RotateCcw size={14} /> Muat Ulang Demo Data
          </button>
          {confirmClear ? (
            <span className="inline-flex items-center gap-2">
              <button
                onClick={() => {
                  clearAll();
                  setConfirmClear(false);
                }}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-red-700"
              >
                Ya, hapus semua
              </button>
              <button onClick={() => setConfirmClear(false)} className={btn.ghost}>Batal</button>
            </span>
          ) : (
            <button onClick={() => setConfirmClear(true)} className={btn.danger}>
              <Trash2 size={14} /> Hapus Semua Data
            </button>
          )}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
          <Database size={12} className="mt-0.5 shrink-0" />
          Saat ini: {courses.length} course · {agendas.length} agenda. Demo data dimuat hanya pada kunjungan pertama.
        </p>
      </Card>
    </div>
  );
}
