"use client";

// ─── Import Excel: multi-worksheet, auto column mapping, preview, import ─────

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  FileSpreadsheet,
  FileUp,
  Import as ImportIcon,
  Loader2,
  Table2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import clsx from "clsx";
import * as XLSX from "xlsx";
import { useApp } from "@/lib/store";
import {
  analyzeWorkbook,
  buildImport,
  FIELD_DEFS,
  readWorkbook,
  reapplyMapping,
  type FieldKey,
  type SheetPreview,
} from "@/lib/excel";
import { Card, EmptyState, SectionTitle, btn, inputCls } from "@/components/ui";

export default function ImportPage() {
  const { agendas, courses, importAgendas, toast } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [previews, setPreviews] = useState<SheetPreview[]>([]);
  const [openSheet, setOpenSheet] = useState<string | null>(null);
  const [imported, setImported] = useState<number | null>(null);

  const processFile = async (file: File) => {
    setLoading(true);
    setImported(null);
    try {
      const wb = await readWorkbook(file);
      const pv = analyzeWorkbook(wb, agendas, courses);
      setWorkbook(wb);
      setPreviews(pv);
      setFileName(file.name);
      setOpenSheet(pv[0]?.sheetName ?? null);
      toast(`${pv.length} worksheet terdeteksi`, "info");
    } catch (err) {
      console.error(err);
      toast("Gagal membaca file Excel", "error");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updateMapping = (sheetName: string, field: FieldKey, header: string) => {
    setPreviews((prev) =>
      prev.map((p) =>
        p.sheetName === sheetName ? reapplyMapping({ ...p, mapping: { ...p.mapping, [field]: header } }) : p
      )
    );
  };

  const renameCourse = (sheetName: string, courseName: string) => {
    setPreviews((prev) => prev.map((p) => (p.sheetName === sheetName ? { ...p, courseName } : p)));
  };

  const reset = () => {
    setWorkbook(null);
    setPreviews([]);
    setFileName("");
    setImported(null);
  };

  const totals = previews.reduce(
    (acc, p) => {
      p.rows.forEach((r) => {
        if (r.empty) return;
        if (r.isDuplicate) acc.duplicates += 1;
        else acc.valid += 1;
        if (r.dateError && !r.empty) acc.badDates += 1;
      });
      return acc;
    },
    { valid: 0, duplicates: 0, badDates: 0 }
  );

  const doImport = () => {
    if (!workbook) return;
    const { courses: newCourses, agendas: newAgendas } = buildImport(previews, courses);
    const n = importAgendas(newCourses, newAgendas);
    setImported(n);
    toast(`${n} agenda berhasil diimport dari ${previews.length} worksheet`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Import Data</h1>
          <p className="text-[13px] text-ink-faint">
            Upload <span className="font-mono font-semibold">Matkul.xlsx</span> — semua worksheet dibaca, kolom dideteksi & dipetakan otomatis.
          </p>
        </div>
        {previews.length > 0 && (
          <button onClick={reset} className={btn.ghost}>
            <Trash2 size={14} /> Reset
          </button>
        )}
      </div>

      {/* Upload zone */}
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) processFile(f);
        }}
        className={clsx(
          "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 transition",
          dragOver ? "border-accent bg-accent-soft/50" : "border-line-strong bg-cream hover:border-accent/50 hover:bg-accent-soft/20"
        )}
      >
        <span className={clsx("flex h-14 w-14 items-center justify-center rounded-2xl shadow-card ring-1 ring-line", loading ? "bg-accent text-white" : "bg-white text-accent")}>
          {loading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
        </span>
        <div className="text-center">
          <p className="font-display text-base font-bold">{loading ? "Membaca workbook…" : "Upload Excel"}</p>
          <p className="mt-1 text-[13px] text-ink-faint">
            Klik untuk memilih file, atau drag & drop <span className="font-mono">.xlsx / .xls / .csv</span> ke sini
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-ink ring-1 ring-line">
          <FileSpreadsheet size={14} className="text-emerald-600" /> Pilih File
        </span>
      </button>

      {imported != null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 px-5 py-4">
          <CheckCircle2 size={20} className="text-teal-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-teal-800">{imported} agenda berhasil diimport.</p>
            <p className="text-xs text-teal-700/80">Course, kalender, reminder, dan analytics sudah diperbarui otomatis.</p>
          </div>
          <Link href="/courses" className={btn.primary}>Lihat Courses</Link>
          <button onClick={() => router.push("/calendar")} className={btn.ghost}>Kalender</button>
        </motion.div>
      )}

      {/* Preview */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
            <div>
              <p className="eyebrow">Import Preview</p>
              <p className="mt-1 text-sm font-semibold">
                <span className="font-mono">{fileName}</span> · {previews.length} worksheet
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">{totals.valid} agenda siap</span>
              {totals.duplicates > 0 && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">{totals.duplicates} duplikat (diskip)</span>
              )}
              {totals.badDates > 0 && (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-red-200">{totals.badDates} tanggal bermasalah</span>
              )}
            </div>
            <div className="ml-auto">
              <button onClick={doImport} className={btn.accent}>
                <ImportIcon size={15} /> Import All ({totals.valid})
              </button>
            </div>
          </Card>

          {previews.map((pv) => {
            const sheetValid = pv.rows.filter((r) => !r.excluded).length;
            const sheetDup = pv.rows.filter((r) => r.isDuplicate).length;
            const open = openSheet === pv.sheetName;
            return (
              <Card key={pv.sheetName} className="overflow-hidden">
                <button
                  onClick={() => setOpenSheet(open ? null : pv.sheetName)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50/70"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    <Table2 size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-bold">{pv.sheetName}</p>
                    <p className="text-xs text-ink-faint">
                      {sheetValid} agenda ditemukan
                      {sheetDup > 0 && <span className="text-amber-600"> · {sheetDup} duplikat</span>}
                      {pv.headerRowIndex < 0 && <span className="text-red-600"> · header tidak terdeteksi</span>}
                    </p>
                  </div>
                  <div className="hidden items-center gap-1.5 md:flex">
                    {FIELD_DEFS.filter((f) => pv.mapping[f.key]).slice(0, 5).map((f) => (
                      <span key={f.key} className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-faint">
                        {f.label}
                      </span>
                    ))}
                  </div>
                  <ChevronDown size={17} className={clsx("shrink-0 text-ink-faint transition-transform", open && "rotate-180")} />
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-line px-5 py-5">
                        {/* course name override */}
                        <label className="mb-4 block max-w-sm">
                          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                            Nama Mata Kuliah (default: nama worksheet)
                          </span>
                          <input value={pv.courseName} onChange={(e) => renameCourse(pv.sheetName, e.target.value)} className={inputCls} />
                        </label>

                        {/* Mapping editor */}
                        <p className="eyebrow mb-2">Column Mapping</p>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                          {FIELD_DEFS.map((f) => (
                            <label key={f.key} className="block">
                              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-faint">{f.label}</span>
                              <select
                                value={pv.mapping[f.key]}
                                onChange={(e) => updateMapping(pv.sheetName, f.key, e.target.value)}
                                className={clsx(inputCls, "py-1.5 text-xs", pv.mapping[f.key] && "border-accent/40 bg-accent-soft/40")}
                              >
                                <option value="">— kosong —</option>
                                {pv.headers.map((h) => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </div>

                        {/* Row preview */}
                        <p className="eyebrow mb-2 mt-5">Data Preview ({pv.rows.filter((r) => !r.empty).length} baris)</p>
                        <div className="overflow-x-auto rounded-xl border border-line">
                          <table className="w-full min-w-[720px] text-left text-xs">
                            <thead>
                              <tr className="border-b border-line bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                                <th className="px-3 py-2">#</th>
                                <th className="px-3 py-2">Pertemuan</th>
                                <th className="px-3 py-2">Tanggal</th>
                                <th className="px-3 py-2">Materi</th>
                                <th className="px-3 py-2">Praktikum</th>
                                <th className="px-3 py-2">Tugas</th>
                                <th className="px-3 py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pv.rows.filter((r) => !r.empty).slice(0, 8).map((r) => (
                                <tr key={r.rowNumber} className={clsx("border-b border-line/60", r.excluded && "opacity-50")}>
                                  <td className="px-3 py-2 font-mono text-ink-faint">{r.rowNumber}</td>
                                  <td className="px-3 py-2 font-mono font-bold">{r.meetingNumber ?? "—"}</td>
                                  <td className="px-3 py-2 font-mono">{r.date ?? <span className="text-ink-faint/60">—</span>}</td>
                                  <td className="max-w-[260px] truncate px-3 py-2 font-medium">{r.material || "—"}</td>
                                  <td className="max-w-[180px] truncate px-3 py-2 text-ink-soft">
                                    {String((r.rawByHeader[pv.mapping.practical] as string) ?? "") || "—"}
                                  </td>
                                  <td className="max-w-[160px] truncate px-3 py-2 text-ink-soft">
                                    {String((r.rawByHeader[pv.mapping.assignment] as string) ?? "") || "—"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {r.isDuplicate ? (
                                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                                        <Copy size={9} /> Duplikat
                                      </span>
                                    ) : r.dateError ? (
                                      <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200" title={r.dateError}>
                                        <AlertTriangle size={9} /> Tgl? 
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                        <CheckCircle2 size={9} /> OK
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {pv.rows.filter((r) => !r.empty).length > 8 && (
                            <p className="bg-slate-50 px-3 py-2 text-center text-[11px] text-ink-faint">
                              +{pv.rows.filter((r) => !r.empty).length - 8} baris lainnya
                            </p>
                          )}
                        </div>
                        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
                          <FileUp size={12} className="mt-0.5 shrink-0" />
                          Kolom yang tidak dikenali tetap disimpan sebagai metadata pada setiap agenda. Baris duplikat otomatis dilewati.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}

          {/* bottom action */}
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="text-sm">
              <p className="font-bold">Total: <span className="font-mono">{totals.valid}</span> agenda dari {previews.length} worksheet</p>
              <p className="text-xs text-ink-faint">
                {previews.map((p) => `${p.sheetName}: ${p.rows.filter((r) => !r.excluded).length}`).join(" · ")}
              </p>
            </div>
            <button onClick={doImport} className={btn.accent}>
              <ImportIcon size={15} /> Import All
            </button>
          </Card>
        </div>
      )}

      {previews.length === 0 && !loading && (
        <EmptyState
          icon={<FileSpreadsheet size={18} />}
          title="Belum ada file yang dipilih"
          hint="Setiap worksheet (mis. GrafKom, RS, PBO, SBD…) akan menjadi satu mata kuliah. Kolom seperti Pertemuan, Tanggal, Materi, Praktikum, Tugas, Studi Kasus, Dosen, Kelas, Penilaian, dan Catatan terdeteksi otomatis."
        />
      )}
    </div>
  );
}
