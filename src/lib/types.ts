// ─── Core domain types ───────────────────────────────────────────────────────

export type CompletionState = "none" | "in-progress" | "completed";

export type EffectiveStatus =
  | "planned"
  | "preparing"
  | "ready"
  | "in-progress"
  | "completed"
  | "missed";

export interface Course {
  id: string;
  name: string;
  shortName: string;
  color: string;
  totalMeetings: number;
  lecturer: string;
  createdAt: string;
}

export interface PrepItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ReviewCoverage {
  id: string;
  label: string;
  covered: boolean;
}

export interface TeachingReview {
  coverage: ReviewCoverage[];
  /** Materi yang berhasil disampaikan */
  materialsCovered: string;
  /** Kendala */
  obstacles: string;
  /** Catatan mahasiswa */
  studentNotes: string;
  /** Materi yang perlu diulang */
  repeatMaterial: string;
  /** Catatan untuk pertemuan berikutnya */
  nextSessionNotes: string;
  /** Tugas yang diberikan */
  assignmentGiven: string;
  savedAt: string;
}

export interface Agenda {
  id: string;
  courseId: string;
  meetingNumber: number | null;
  /** Calendar date, yyyy-mm-dd — never a UTC timestamp (timezone safe) */
  date: string;
  startTime: string; // "HH:mm" or ""
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
  completion: CompletionState;
  startedAt: string | null;
  completedAt: string | null;
  preparation: PrepItem[];
  review: TeachingReview | null;
  /** Unrecognized spreadsheet columns are preserved here */
  metadata: Record<string, string>;
  createdAt: string;
}

export type NotificationType =
  | "h7"
  | "h3"
  | "h1"
  | "h0"
  | "prep"
  | "review"
  | "missed"
  | "digest";

export interface AppNotification {
  id: string;
  type: NotificationType;
  agendaId: string | null;
  title: string;
  message: string;
  date: string; // yyyy-mm-dd the notification relates to
}

export interface ReminderSettings {
  h7: boolean;
  h3: boolean;
  h1: boolean;
  h0: boolean;
  prep: boolean;
  review: boolean;
}

export interface Settings {
  semesterName: string;
  reminders: ReminderSettings;
  defaultView: string;
  dateFormat: "long" | "short";
}

export interface AppState {
  courses: Course[];
  agendas: Agenda[];
  dismissedNotifIds: string[];
  settings: Settings;
  seededAt: string | null;
}

export type CourseHealth = "on-track" | "attention" | "behind" | "completed" | "idle";
