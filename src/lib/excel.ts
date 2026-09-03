// ─── Excel import engine (SheetJS) ──────────────────────────────────────────
// Reads a multi-worksheet workbook, detects the header row per sheet, maps
// columns to known fields by alias matching, preserves unknown columns as
// metadata, validates dates and detects duplicates.

import * as XLSX from "xlsx";
import type { Agenda, Course } from "./types";
import { isValidDateStr, pad2, uid } from "./dates";
import { defaultPrepItems } from "./status";

export type FieldKey =
  | "course"
  | "meeting"
  | "week"
  | "day"
  | "date"
  | "time"
  | "material"
  | "subMaterial"
  | "practical"
  | "assignment"
  | "caseStudy"
  | "lecturer"
  | "className"
  | "assessment"
  | "notes";

export const FIELD_DEFS: { key: FieldKey; label: string; aliases: string[] }[] = [
  { key: "course", label: "Mata Kuliah", aliases: ["mata kuliah", "matakuliah", "matkul", "mk", "course", "nama mata kuliah", "subject"] },
  { key: "meeting", label: "Pertemuan", aliases: ["pertemuan", "pertemuan ke", "pert", "meeting", "session", "sesi", "pert. ke", "p", "ke"] },
  { key: "week", label: "Minggu", aliases: ["minggu", "minggu ke", "week", "pekan"] },
  { key: "day", label: "Hari", aliases: ["hari", "day"] },
  { key: "date", label: "Tanggal", aliases: ["tanggal", "date", "tgl", "tgl kuliah"] },
  { key: "time", label: "Waktu", aliases: ["waktu", "jam", "time", "jam kuliah", "pukul"] },
  { key: "material", label: "Materi", aliases: ["materi", "material", "topik", "topic", "pokok bahasan", "materi kuliah", "bahasan", "materi perkuliahan"] },
  { key: "subMaterial", label: "Sub Materi", aliases: ["sub materi", "submateri", "sub-materi", "sub topik", "subtopik", "sub topic", "detail materi", "rincian materi"] },
  { key: "practical", label: "Praktikum", aliases: ["praktikum", "praktek", "praktik", "practical", "lab", "kegiatan praktikum", "responsi"] },
  { key: "assignment", label: "Tugas", aliases: ["tugas", "assignment", "penugasan", "tugas/quiz", "kuis", "quiz"] },
  { key: "caseStudy", label: "Studi Kasus", aliases: ["studi kasus", "case study", "kasus", "latihan"] },
  { key: "lecturer", label: "Dosen", aliases: ["dosen", "lecturer", "pengampu", "pengajar", "dosen pengampu", "tim dosen"] },
  { key: "className", label: "Kelas", aliases: ["kelas", "class", "rombel", "prodi/kelas"] },
  { key: "assessment", label: "Penilaian", aliases: ["penilaian", "assessment", "evaluasi", "bobot", "bobot penilaian", "skema penilaian"] },
  { key: "notes", label: "Catatan", aliases: ["catatan", "notes", "note", "keterangan", "ket", "remark", "remarks"] },
];

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[._\-\/()]/g, " ").replace(/\s+/g, " ").trim();
}

function aliasOf(header: string): FieldKey | null {
  const n = normalize(header);
  if (!n) return null;
  for (const def of FIELD_DEFS)
    for (const a of def.aliases) if (n === normalize(a)) return def.key;
  for (const def of FIELD_DEFS)
    for (const a of def.aliases) {
      const an = normalize(a);
      if (an.length >= 4 && (n.startsWith(an) || n.endsWith(an))) return def.key;
    }
  return null;
}

// ─── Date & time parsing ─────────────────────────────────────────────────────

const MONTH_MAP: Record<string, number> = {
  januari: 1, jan: 1, februari: 2, feb: 2, maret: 3, mar: 3, april: 4, apr: 4,
  mei: 5, juni: 6, jun: 6, juli: 7, jul: 7, agustus: 8, agu: 8, aug: 8,
  september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, oct: 10, november: 11, nov: 11,
  desember: 12, des: 12, dec: 12,
};

export function parseExcelDate(v: unknown): { date: string | null; error?: string } {
  if (v == null || v === "") return { date: null, error: "kosong" };
  if (v instanceof Date && !isNaN(v.getTime()))
    return { date: `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}` };
  if (typeof v === "number" && isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    if (isNaN(d.getTime())) return { date: null, error: "serial tidak valid" };
    return { date: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}` };
  }
  if (typeof v !== "string") return { date: null, error: "tipe tidak dikenal" };
  let s = v.trim();
  if (!s) return { date: null, error: "kosong" };
  s = s.replace(/^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?)[,.\s]+/i, "");

  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const cand = `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
    return isValidDateStr(cand) ? { date: cand } : { date: null, error: "tanggal tidak valid" };
  }
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const cand = `${y}-${pad2(+m[2])}-${pad2(+m[1])}`;
    return isValidDateStr(cand) ? { date: cand } : { date: null, error: "tanggal tidak valid" };
  }
  m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const mon = MONTH_MAP[m[2].toLowerCase()];
    if (!mon) return { date: null, error: `bulan "${m[2]}" tidak dikenali` };
    const cand = `${m[3]}-${pad2(mon)}-${pad2(+m[1])}`;
    return isValidDateStr(cand) ? { date: cand } : { date: null, error: "tanggal tidak valid" };
  }
  return { date: null, error: "format tidak dikenali" };
}

export function parseExcelTime(v: unknown): { startTime: string; endTime: string } {
  if (typeof v !== "string") return { startTime: "", endTime: "" };
  const times = v.match(/(\d{1,2})[:.](\d{2})/g);
  if (!times || times.length === 0) return { startTime: "", endTime: "" };
  const norm = times.map((t) => {
    const [h, mm] = t.split(/[:.]/);
    return `${pad2(+h)}:${mm}`;
  });
  return { startTime: norm[0] ?? "", endTime: norm[1] ?? "" };
}

function parseMeeting(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const m = v.match(/\d{1,2}/);
    return m ? parseInt(m[0], 10) : null;
  }
  return null;
}

// ─── Sheet analysis ──────────────────────────────────────────────────────────

export interface ParsedRow {
  rowNumber: number;
  /** original cell values keyed by header name */
  rawByHeader: Record<string, unknown>;
  metadata: Record<string, string>;
  date: string | null;
  dateError: string | null;
  startTime: string;
  endTime: string;
  meetingNumber: number | null;
  material: string;
  courseName: string;
  isDuplicate: boolean;
  duplicateReason: string | null;
  empty: boolean;
  excluded: boolean;
}

export interface SheetPreview {
  sheetName: string;
  courseName: string;
  headerRowIndex: number;
  headers: string[];
  /** field -> column header ("" = unmapped) */
  mapping: Record<FieldKey, string>;
  rows: ParsedRow[];
  totalRows: number;
}

function duplicateKey(course: string, meeting: number | null, date: string | null, material: string): string {
  return `${normalize(course)}|${meeting ?? "?"}|${date ?? "?"}|${normalize(material).slice(0, 40)}`;
}

function emptyMapping(): Record<FieldKey, string> {
  const m = {} as Record<FieldKey, string>;
  for (const def of FIELD_DEFS) m[def.key] = "";
  return m;
}

/** Interpret one raw grid row under a given mapping. */
function interpretRow(
  rawByHeader: Record<string, unknown>,
  fields: Record<string, FieldKey>, // header -> field
  sheetName: string
): Omit<ParsedRow, "rowNumber" | "rawByHeader" | "metadata"> {
  const byField = {} as Record<FieldKey, unknown>;
  for (const def of FIELD_DEFS) byField[def.key] = undefined;
  Object.entries(fields).forEach(([h, f]) => {
    if (byField[f] === undefined || byField[f] === "") byField[f] = rawByHeader[h];
  });

  const dateParsed = byField.date !== undefined && byField.date !== "" ? parseExcelDate(byField.date) : { date: null, error: undefined };
  const { startTime, endTime } = byField.time ? parseExcelTime(byField.time) : { startTime: "", endTime: "" };
  const meetingNumber = byField.meeting != null && byField.meeting !== "" ? parseMeeting(byField.meeting) : null;
  const material = String(byField.material ?? "").trim();
  const courseName = String(byField.course ?? "").trim() || sheetName.trim();

  const hasAny = Object.values(byField).some((v) => v !== undefined && String(v ?? "").trim() !== "");
  const empty = !material && meetingNumber == null && !dateParsed.date && !hasAny;

  return {
    date: dateParsed.date,
    dateError: dateParsed.error ?? null,
    startTime,
    endTime,
    meetingNumber,
    material,
    courseName,
    isDuplicate: false,
    duplicateReason: null,
    empty,
    excluded: empty,
  };
}

export function analyzeWorkbook(
  wb: XLSX.WorkBook,
  existingAgendas: Agenda[],
  existingCourses: Course[]
): SheetPreview[] {
  const existingKeys = new Set(
    existingAgendas.map((a) => {
      const c = existingCourses.find((x) => x.id === a.courseId);
      return duplicateKey(c?.name ?? "", a.meetingNumber, a.date, a.material);
    })
  );

  return wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      return { sheetName, courseName: sheetName, headerRowIndex: -1, headers: [], mapping: emptyMapping(), rows: [], totalRows: 0 };
    }
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });

    // header row: among the first 6 rows, the one with most alias matches
    let headerRowIndex = 0;
    let best = 0;
    for (let i = 0; i < Math.min(6, grid.length); i++) {
      const row = (grid[i] ?? []) as unknown[];
      const score = row.reduce<number>((acc, cell) => acc + (aliasOf(String(cell ?? "")) ? 1 : 0), 0);
      if (score > best) {
        best = score;
        headerRowIndex = i;
      }
    }
    if (best === 0) headerRowIndex = -1;

    const headers: string[] =
      headerRowIndex >= 0
        ? ((grid[headerRowIndex] ?? []) as unknown[]).map((c, i) => String(c ?? "").trim() || `Kolom ${i + 1}`)
        : [];
    const headerField: Record<string, FieldKey> = {};
    if (headerRowIndex >= 0) {
      const rowArr = (grid[headerRowIndex] ?? []) as unknown[];
      rowArr.forEach((c, i) => {
        const f = aliasOf(String(c ?? ""));
        if (f) headerField[headers[i]] = f;
      });
    }

    // auto mapping: first column per field wins
    const mapping = emptyMapping();
    Object.entries(headerField).forEach(([h, f]) => {
      if (!mapping[f]) mapping[f] = h;
    });

    const dataStart = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
    const rows: ParsedRow[] = [];
    const seen = new Set<string>();

    for (let r = dataStart; r < grid.length; r++) {
      const rowArr = (grid[r] ?? []) as unknown[];
      const rawByHeader: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        rawByHeader[h] = rowArr[i];
      });
      // headerless sheet: keep raw cells under synthetic names
      if (headerRowIndex < 0) {
        rowArr.forEach((v, i) => (rawByHeader[`Kolom ${i + 1}`] = v));
      }

      const base = interpretRow(rawByHeader, mapToFieldRecord(mapping), sheetName);
      const metadata: Record<string, string> = {};
      Object.entries(rawByHeader).forEach(([h, v]) => {
        if (!(h in mapToFieldRecord(mapping)) && v !== "" && v != null) {
          metadata[h] = v instanceof Date ? formatCellDate(v) : String(v);
        }
      });

      const key = duplicateKey(base.courseName, base.meetingNumber, base.date, base.material);
      let isDuplicate = false;
      let duplicateReason: string | null = null;
      if (!base.empty && base.meetingNumber != null) {
        if (existingKeys.has(key)) {
          isDuplicate = true;
          duplicateReason = "Sudah ada di aplikasi";
        } else if (seen.has(key)) {
          isDuplicate = true;
          duplicateReason = "Duplikat di dalam file";
        }
      }
      seen.add(key);

      rows.push({
        rowNumber: r + 1,
        rawByHeader,
        metadata,
        ...base,
        isDuplicate,
        duplicateReason,
        excluded: base.empty || isDuplicate,
      });
    }

    return {
      sheetName,
      courseName: sheetName.trim(),
      headerRowIndex,
      headers,
      mapping,
      rows,
      totalRows: rows.filter((r) => !r.empty).length,
    };
  });
}

function mapToFieldRecord(mapping: Record<FieldKey, string>): Record<string, FieldKey> {
  const out: Record<string, FieldKey> = {};
  (Object.entries(mapping) as [FieldKey, string][]).forEach(([f, h]) => {
    if (h) out[h] = f;
  });
  return out;
}

/** Re-interpret all rows of a preview after the user edits the mapping. */
export function reapplyMapping(preview: SheetPreview): SheetPreview {
  const fields = mapToFieldRecord(preview.mapping);
  const seen = new Set<string>();
  const rows = preview.rows.map((row) => {
    const base = interpretRow(row.rawByHeader, fields, preview.courseName || preview.sheetName);
    const metadata: Record<string, string> = {};
    Object.entries(row.rawByHeader).forEach(([h, v]) => {
      if (!(h in fields) && v !== "" && v != null)
        metadata[h] = v instanceof Date ? formatCellDate(v) : String(v);
    });
    const key = duplicateKey(base.courseName, base.meetingNumber, base.date, base.material);
    const inFile = !base.empty && base.meetingNumber != null && seen.has(key);
    seen.add(key);
    // keep existing duplicate flags only for in-file dup changes; against-app
    // duplicates are re-evaluated at analysis time (mapping doesn't change them)
    const isDuplicate = row.isDuplicate && row.duplicateReason === "Sudah ada di aplikasi" ? row.isDuplicate : inFile;
    return {
      ...row,
      ...base,
      metadata,
      isDuplicate,
      duplicateReason: isDuplicate ? (row.duplicateReason === "Sudah ada di aplikasi" ? row.duplicateReason : "Duplikat di dalam file") : null,
      excluded: base.empty || isDuplicate,
    };
  });
  return { ...preview, rows, totalRows: rows.filter((r) => !r.empty).length };
}

// ─── Build agenda objects from confirmed previews ───────────────────────────

const COLOR_POOL = ["#4F46E5", "#0891C2", "#D97706", "#059669", "#DC2626", "#DB2777", "#7C3AED", "#0D9488"];

export function buildImport(
  previews: SheetPreview[],
  existingCourses: Course[]
): { courses: Course[]; agendas: Agenda[] } {
  const courseByName = new Map<string, Course>();
  existingCourses.forEach((c) => courseByName.set(normalize(c.name), c));
  const newCourses: Course[] = [];
  const agendas: Agenda[] = [];

  for (const pv of previews) {
    const fields = mapToFieldRecord(pv.mapping);
    for (const row of pv.rows) {
      if (row.excluded) continue;
      const byField = {} as Record<FieldKey, unknown>;
      for (const def of FIELD_DEFS) byField[def.key] = undefined;
      Object.entries(fields).forEach(([h, f]) => {
        if (byField[f] === undefined || byField[f] === "") byField[f] = row.rawByHeader[h];
      });

      const material =
        String(byField.material ?? "").trim() ||
        (row.meetingNumber != null ? `Pertemuan ${row.meetingNumber}` : "");
      if (!material && !row.date) continue;

      const courseName = String(byField.course ?? "").trim() || pv.courseName || pv.sheetName;
      const cKey = normalize(courseName);
      let course = courseByName.get(cKey);
      if (!course) {
        course = {
          id: uid(),
          name: courseName,
          shortName: courseName,
          color: COLOR_POOL[courseByName.size % COLOR_POOL.length],
          totalMeetings: 16,
          lecturer: String(byField.lecturer ?? "").trim(),
          createdAt: new Date().toISOString(),
        };
        courseByName.set(cKey, course);
        newCourses.push(course);
      }

      const practical = String(byField.practical ?? "").trim();
      const assignment = String(byField.assignment ?? "").trim();

      agendas.push({
        id: uid(),
        courseId: course.id,
        meetingNumber: row.meetingNumber,
        date: row.date ?? "",
        startTime: row.startTime,
        endTime: row.endTime,
        material,
        subMaterial: String(byField.subMaterial ?? "").trim(),
        practical,
        assignment,
        caseStudy: String(byField.caseStudy ?? "").trim(),
        lecturer: String(byField.lecturer ?? "").trim() || course.lecturer,
        className: String(byField.className ?? "").trim(),
        assessment: String(byField.assessment ?? "").trim(),
        notes: String(byField.notes ?? "").trim(),
        completion: "none",
        startedAt: null,
        completedAt: null,
        preparation: defaultPrepItems({ practical, assignment, courseName }),
        review: null,
        metadata: row.metadata,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const perCourseMax = new Map<string, number>();
  agendas.forEach((a) => {
    if (a.meetingNumber != null)
      perCourseMax.set(a.courseId, Math.max(perCourseMax.get(a.courseId) ?? 0, a.meetingNumber));
  });
  newCourses.forEach((c) => {
    const max = perCourseMax.get(c.id) ?? 0;
    if (max > c.totalMeetings) c.totalMeetings = max;
  });

  return { courses: newCourses, agendas };
}

function formatCellDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array", cellDates: true });
}
