// ─── Demo dataset ───────────────────────────────────────────────────────────
// Mirrors the structure of the lecturer's Matkul.xlsx: one worksheet per
// course, 16 meetings per semester. Dates are anchored relative to the user's
// real "today" so the app is immediately usable: 3 classes happen today,
// meetings 1–2 already happened (completed), the rest lie ahead.

import type { Agenda, Course } from "./types";
import { addDays, todayStr, uid } from "./dates";
import { coverageFromMaterial, defaultPrepItems } from "./status";

interface MeetingDef {
  material: string;
  sub?: string;
  practical?: string;
  assignment?: string;
  caseStudy?: string;
  assessment?: string;
}

interface CourseDef {
  name: string;
  short: string;
  color: string;
  className: string;
  lecturer: string;
  /** days from today on which "Pertemuan 3" falls */
  m3Offset: number;
  startTime: string;
  endTime: string;
  meetings: MeetingDef[];
  /** how many prep items of "today's" meeting are pre-checked */
  todayPrepDone: number;
}

const M = (material: string, extra?: Partial<MeetingDef>): MeetingDef => ({ material, ...extra });

const COURSE_DEFS: CourseDef[] = [
  {
    name: "GrafKom",
    short: "GrafKom",
    color: "#4F46E5",
    className: "TI-3A",
    lecturer: "Dr. Andi Wijaya, M.Kom.",
    m3Offset: 0,
    startTime: "08:00",
    endTime: "09:40",
    todayPrepDone: 2,
    meetings: [
      M("Kontrak Kuliah & Pengantar Grafika Komputer", { assessment: "Tugas 20% • Quiz 15% • UTS 30% • UAS 35%" }),
      M("Sejarah dan Perkembangan Grafika Komputer"),
      M("Menggambar dengan Pycairo", {
        sub: "Fill and stroke, Open and closed shape, Circle and curves, Line style",
        practical: "Praktikum 3a: Menggambar objek Geom dan tekstur dengan Pycairo",
        assignment: "Buat gambar pemandangan sederhana dengan Pycairo (PDF)",
      }),
      M("Paths, Lines, Polygons, Arcs, Bezier Curves", { practical: "Praktikum 4: Kurva Bezier interaktif" }),
      M("Quiz 1", { assessment: "Quiz 1 — 15%" }),
      M("Transformasi 2D: Translasi, Rotasi, Skala"),
      M("Clipping dan Windowing", { caseStudy: "Cohen–Sutherland line clipping" }),
      M("UTS — Ujian Tengah Semester", { assessment: "UTS — 30%" }),
      M("Grafika 3D: Representasi Objek"),
      M("Transformasi 3D"),
      M("Proyeksi: Orthographic dan Perspective"),
      M("Warna, Shading, dan Pencahayaan"),
      M("Rasterisasi: Scanline dan Flood Fill"),
      M("Animasi Komputer", { caseStudy: "12 Prinsip Animasi Disney" }),
      M("Presentasi Proyek Akhir", { assignment: "Proyek akhir: mini render engine" }),
      M("UAS — Ujian Akhir Semester", { assessment: "UAS — 35%" }),
    ],
  },
  {
    name: "RS",
    short: "RS",
    color: "#0891B2",
    className: "TI-3A",
    lecturer: "Dr. Sari Rahayu, M.Sc.",
    m3Offset: 0,
    startTime: "10:00",
    endTime: "11:40",
    todayPrepDone: 1,
    meetings: [
      M("Kontrak Kuliah & Pengantar Penginderaan Jauh"),
      M("Sistem Satelit dan Sensor Remote Sensing"),
      M("Digital Satellite Imagery & Radiometric Correction", {
        sub: "Karakteristik citra digital, Kesalahan radiometrik, Koreksi radiometrik",
        practical: "Praktikum: Koreksi radiometrik citra Landsat 9 di SNAP",
        assignment: "Laporan koreksi radiometrik (min. 2 band)",
      }),
      M("Geometric Correction dan Image Registration"),
      M("Quiz 1"),
      M("Image Enhancement", { practical: "Praktikum: Contrast stretching & histogram equalization" }),
      M("Image Classification: Supervised", { caseStudy: "Maximum Likelihood vs Minimum Distance" }),
      M("UTS — Ujian Tengah Semester"),
      M("Image Classification: Unsupervised"),
      M("NDVI dan Vegetation Indices", { practical: "Praktikum: Hitung NDVI dengan QGIS" }),
      M("Land Use / Land Cover Mapping"),
      M("Change Detection", { caseStudy: "Perubahan tutupan lahan pesisir 2015–2025" }),
      M("Integrasi RS dan SIG"),
      M("Studi Kasus: Pemetaan Sebaran Bencana"),
      M("Presentasi Proyek Akhir"),
      M("UAS — Ujian Akhir Semester"),
    ],
  },
  {
    name: "PBO",
    short: "PBO",
    color: "#D97706",
    className: "TI-3B",
    lecturer: "Ir. Budi Santoso, M.T.",
    m3Offset: 0,
    startTime: "13:00",
    endTime: "14:40",
    todayPrepDone: 2,
    meetings: [
      M("Kontrak Kuliah & Pengantar Pemrograman Berorientasi Objek"),
      M("Class dan Object", { practical: "Praktikum: Membuat class Mahasiswa" }),
      M("Inheritance — Class Diagram & Implementation", {
        sub: "Superclass & subclass, super(), overriding, UML class diagram",
        practical: "Praktikum 3a: Implementasi hierarki Kendaraan -> Mobil, Motor",
        assignment: "Rancang class diagram sistem perpustakaan + implementasi",
        caseStudy: "Studi kasus: hierarki pegawai PT",
      }),
      M("Polymorphism dan Abstract Class"),
      M("Quiz 1"),
      M("Interface dan Package"),
      M("Exception Handling", { practical: "Praktikum: try-catch-finally & custom exception" }),
      M("UTS — Ujian Tengah Semester"),
      M("Collection Framework: List, Set, Map"),
      M("Generics"),
      M("GUI dengan JavaFX"),
      M("MVC Pattern", { caseStudy: "Refactor aplikasi kasir ke MVC" }),
      M("Database Connectivity (JDBC)"),
      M("Design Patterns: Singleton, Factory, Observer"),
      M("Presentasi Proyek Akhir", { assignment: "Proyek akhir: aplikasi desktop CRUD" }),
      M("UAS — Ujian Akhir Semester"),
    ],
  },
  {
    name: "BaPro",
    short: "BaPro",
    color: "#059669",
    className: "TI-2A",
    lecturer: "Drs. Hendra Gunawan, M.Kom.",
    m3Offset: 4,
    startTime: "08:00",
    endTime: "09:40",
    todayPrepDone: 0,
    meetings: [
      M("Kontrak Kuliah & Review Bahasa C"),
      M("Array dan Pointer", { practical: "Praktikum: pointer aritmetika" }),
      M("Struct dan Tipe Data Buatan", {
        sub: "Deklarasi struct, Nested struct, Array of struct, typedef",
        practical: "Praktikum: struct DataMahasiswa + sorting",
        assignment: "Tugas: program database nilai dengan struct (individu)",
      }),
      M("File Processing: Text dan Binary"),
      M("Quiz 1"),
      M("Rekursi", { caseStudy: "Fibonacci, faktorial, Tower of Hanoi" }),
      M("Sorting dan Searching"),
      M("UTS — Ujian Tengah Semester"),
      M("Linked List"),
      M("Stack dan Queue"),
      M("Tree dan Binary Search Tree"),
      M("Graph: Representasi dan Traversal"),
      M("Hash Table"),
      M("Review dan Latihan Soal"),
      M("Presentasi Proyek Akhir"),
      M("UAS — Ujian Akhir Semester"),
    ],
  },
  {
    name: "GI",
    short: "GI",
    color: "#DC2626",
    className: "TI-4A",
    lecturer: "Dr. Rina Marlina, M.Kom.",
    m3Offset: 4,
    startTime: "10:00",
    endTime: "11:40",
    todayPrepDone: 0,
    meetings: [
      M("Kontrak Kuliah & Pengantar Game Intelligence"),
      M("Agen dan Environment dalam Game"),
      M("MinMax Game", {
        sub: "Game tree, Nilai minimax, Implementasi pada Tic-Tac-Toe",
        practical: "Praktikum: Minimax untuk Tic-Tac-Toe tak terkalahkan",
        assignment: "Tugas: analisis kompleksitas minimax pada Connect Four",
      }),
      M("Alpha-Beta Pruning"),
      M("Quiz 1"),
      M("Pathfinding: BFS dan DFS"),
      M("Pathfinding: A* dan Heuristik", { practical: "Praktikum: A* pada grid map" }),
      M("UTS — Ujian Tengah Semester"),
      M("Finite State Machine untuk NPC"),
      M("Behavior Trees"),
      M("Fuzzy Logic dalam Game", { caseStudy: "Fuzzy difficulty adjustment" }),
      M("Genetic Algorithm untuk Game"),
      M("Machine Learning untuk Game AI"),
      M("Studi Kasus: AI pada Game Populer"),
      M("Presentasi Proyek Akhir"),
      M("UAS — Ujian Akhir Semester"),
    ],
  },
  {
    name: "IMK",
    short: "IMK",
    color: "#DB2777",
    className: "TI-2B",
    lecturer: "Dr. Dewi Anggraini, M.T.I.",
    m3Offset: 1,
    startTime: "13:00",
    endTime: "14:40",
    todayPrepDone: 0,
    meetings: [
      M("Kontrak Kuliah & Pengantar Interaksi Manusia dan Komputer"),
      M("Prinsip-prinsip Desain Interaksi"),
      M("User Research dan Persona", { practical: "Praktikum: wawancara pengguna & pembuatan persona" }),
      M("Information Architecture"),
      M("Quiz 1"),
      M("Wireframing dan Prototyping", { practical: "Praktikum: low-fi prototype dengan Figma" }),
      M("Usability Principles — 10 Heuristic Nielsen"),
      M("UTS — Ujian Tengah Semester"),
      M("Visual Design: Layout, Warna, Tipografi"),
      M("Interaction Design Patterns"),
      M("Usability Testing", { assignment: "Tugas: rencana usability testing (SUS)" }),
      M("Accessibility dan Inclusive Design"),
      M("Mobile UX Design"),
      M("Evaluasi Heuristik — Studi Kasus"),
      M("Presentasi Proyek Akhir"),
      M("UAS — Ujian Akhir Semester"),
    ],
  },
  {
    name: "SBD",
    short: "SBD",
    color: "#7C3AED",
    className: "TI-3C",
    lecturer: "Prof. Dr. Bambang Riyanto, M.Sc.",
    m3Offset: 2,
    startTime: "08:00",
    endTime: "09:40",
    todayPrepDone: 0,
    meetings: [
      M("Kontrak Kuliah & Pengantar Sistem Basis Data"),
      M("Entity Relationship Diagram", { practical: "Praktikum: ERD studi kasus klinik" }),
      M("Model Relasional dan Normalisasi", { sub: "1NF, 2NF, 3NF, BCNF" }),
      M("SQL: DDL dan DML", { practical: "Praktikum: CREATE TABLE & INSERT di PostgreSQL" }),
      M("Quiz 1"),
      M("SQL: Join dan Subquery"),
      M("Indexing dan Query Optimization", { caseStudy: "EXPLAIN ANALYZE pada query lambat" }),
      M("UTS — Ujian Tengah Semester"),
      M("Transaction dan Concurrency Control"),
      M("Recovery System"),
      M("NoSQL Overview: Document, Key-Value, Graph"),
      M("Distributed Database"),
      M("Data Warehouse dan OLAP"),
      M("Pengantar Big Data"),
      M("Presentasi Proyek Akhir"),
      M("UAS — Ujian Akhir Semester"),
    ],
  },
  {
    name: "SIG dan PSIG",
    short: "SIG",
    color: "#0D9488",
    className: "TI-4B",
    lecturer: "Dr. Sari Rahayu, M.Sc.",
    m3Offset: 2,
    startTime: "10:00",
    endTime: "11:40",
    todayPrepDone: 0,
    meetings: [
      M("Kontrak Kuliah & Pengantar Sistem Informasi Geografis"),
      M("Data Spasial: Vektor dan Raster"),
      M("Sistem Koordinat dan Proyeksi Peta", { practical: "Praktikum: reprojeksi data di QGIS" }),
      M("Digitasi dan Editing Data Spasial"),
      M("Quiz 1"),
      M("Analisis Buffer dan Overlay"),
      M("Geoprocessing Tools"),
      M("UTS — Ujian Tengah Semester"),
      M("Pengantar PSIG — SIG Terapan"),
      M("Studi Kasus: Perencanaan Tata Ruang Wilayah"),
      M("WebGIS: Leaflet dan GeoServer"),
      M("Analisis Jaringan dan Routing"),
      M("Integrasi Remote Sensing untuk SIG"),
      M("Studi Kasus: Sistem Informasi Kebencanaan"),
      M("Presentasi Proyek Akhir"),
      M("UAS — Ujian Akhir Semester"),
    ],
  },
  {
    name: "GD",
    short: "GD",
    color: "#65A30D",
    className: "TI-4A",
    lecturer: "Dr. Rina Marlina, M.Kom.",
    m3Offset: -2,
    startTime: "13:00",
    endTime: "14:40",
    todayPrepDone: 0,
    meetings: [
      M("Kontrak Kuliah & Pengantar Game Design"),
      M("Game Design Document (GDD)", { assignment: "Tugas: draft GDD 2 halaman" }),
      M("Game Mechanics dan Core Loop", {
        sub: "Mechanics, Dynamics, Aesthetics (MDA), Core loop",
        caseStudy: "Bedah core loop Stardew Valley",
      }),
      M("Level Design", { practical: "Praktikum: paper prototyping level" }),
      M("Quiz 1"),
      M("Game Balancing dan Difficulty Curve"),
      M("Narrative Design"),
      M("UTS — Ujian Tengah Semester"),
      M("Character Design"),
      M("UI/UX dalam Game"),
      M("Monetization dan Game Economy"),
      M("Playtesting dan Iterasi", { practical: "Praktikum: sesi playtest terstruktur" }),
      M("Game Audio dan Sound Design"),
      M("Porting dan Publishing"),
      M("Presentasi Proyek Akhir"),
      M("UAS — Ujian Akhir Semester"),
    ],
  },
];

export function generateDemoData(today = todayStr()): { courses: Course[]; agendas: Agenda[] } {
  const courses: Course[] = COURSE_DEFS.map((d) => ({
    id: uid(),
    name: d.name,
    shortName: d.short,
    color: d.color,
    totalMeetings: 16,
    lecturer: d.lecturer,
    createdAt: new Date().toISOString(),
  }));

  const agendas: Agenda[] = [];

  COURSE_DEFS.forEach((d, ci) => {
    const course = courses[ci];
    const m3Date = addDays(today, d.m3Offset);
    d.meetings.forEach((md, mi) => {
      const meetingNumber = mi + 1;
      const date = addDays(m3Date, (meetingNumber - 3) * 7);
      const isPast = date < today;
      const isTodayMeeting = date === today;

      // Past meetings are completed; meeting 1 always reviewed,
      // meeting 2 reviewed for ~half of the courses (keeps analytics honest).
      const completed = isPast && !(d.short === "GD" && meetingNumber === 3);
      const reviewed = completed && (meetingNumber === 1 || (meetingNumber === 2 && ci % 2 === 0));

      const prep = defaultPrepItems({
        practical: md.practical,
        assignment: md.assignment,
        courseName: d.name,
      });
      if (isTodayMeeting) {
        prep.forEach((p, i) => { if (i < d.todayPrepDone) p.done = true; });
      }
      if (completed) prep.forEach((p) => (p.done = true));

      const coverage = coverageFromMaterial(md.material, md.sub ?? "");
      agendas.push({
        id: uid(),
        courseId: course.id,
        meetingNumber,
        date,
        startTime: d.startTime,
        endTime: d.endTime,
        material: md.material,
        subMaterial: md.sub ?? "",
        practical: md.practical ?? "",
        assignment: md.assignment ?? "",
        caseStudy: md.caseStudy ?? "",
        lecturer: d.lecturer,
        className: d.className,
        assessment: md.assessment ?? "",
        notes: completed ? "Sesi berjalan sesuai RPS." : "",
        completion: completed ? "completed" : "none",
        startedAt: completed ? `${date}T${d.startTime}:00` : null,
        completedAt: completed ? `${date}T${d.endTime}:00` : null,
        preparation: prep,
        review: reviewed
          ? {
              coverage: coverage.map((c) => ({ ...c, covered: true })),
              materialsCovered: `Seluruh cakupan materi "${md.material}" tersampaikan.`,
              obstacles: "",
              studentNotes: "Mahasiswa aktif bertanya dan mengikuti diskusi.",
              repeatMaterial: "",
              nextSessionNotes: "Lanjutkan sesuai RPS.",
              assignmentGiven: md.assignment ?? "",
              savedAt: `${date}T${d.endTime}:00`,
            }
          : null,
        metadata: {},
        createdAt: new Date().toISOString(),
      });
    });
  });

  return { courses, agendas };
}
