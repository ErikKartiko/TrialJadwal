"use client";

// ─── Application store ──────────────────────────────────────────────────────
// Single source of truth, persisted to localStorage so nothing is lost on
// refresh (requirement: data persistence without a backend).

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Agenda,
  AppState,
  Course,
  PrepItem,
  Settings,
  TeachingReview,
} from "./types";
import { uid } from "./dates";
import { generateDemoData } from "./demo";
import { defaultPrepItems } from "./status";

const LS_KEY = "academic-teaching-planner/v1";

export const DEFAULT_SETTINGS: Settings = {
  semesterName: "2026/2027 Ganjil",
  reminders: { h7: true, h3: true, h1: true, h0: true, prep: true, review: true },
  defaultView: "dashboard",
  dateFormat: "long",
};

const COURSE_COLORS = [
  "#4F46E5", "#0891C2", "#D97706", "#059669", "#DC2626",
  "#DB2777", "#7C3AED", "#0D9488", "#65A30D", "#9333EA",
  "#B45309", "#0284C7",
];

export interface Toast {
  id: string;
  message: string;
  kind: "success" | "info" | "error";
}

interface StoreValue extends AppState {
  ready: boolean;
  toasts: Toast[];
  toast: (message: string, kind?: Toast["kind"]) => void;
  // courses
  addCourse: (name: string, lecturer?: string) => Course;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  deleteCourse: (id: string, alsoAgendas: boolean) => void;
  findOrCreateCourse: (name: string) => Course;
  // agendas
  getAgenda: (id: string) => Agenda | undefined;
  getCourse: (id: string) => Course | undefined;
  addAgenda: (data: Omit<Agenda, "id" | "createdAt" | "preparation" | "completion" | "review" | "startedAt" | "completedAt" | "metadata"> & { metadata?: Record<string, string>; preparation?: PrepItem[] }) => Agenda;
  updateAgenda: (id: string, patch: Partial<Agenda>) => void;
  deleteAgenda: (id: string) => void;
  duplicateAgenda: (id: string) => Agenda | null;
  // preparation
  togglePrep: (agendaId: string, prepId: string) => void;
  addPrepItem: (agendaId: string, label: string) => void;
  removePrepItem: (agendaId: string, prepId: string) => void;
  // teaching lifecycle
  startTeaching: (id: string) => void;
  revertToPlanned: (id: string) => void;
  completeTeaching: (id: string) => void;
  markCompleted: (id: string) => void;
  reopenAgenda: (id: string) => void;
  saveReview: (id: string, review: TeachingReview) => void;
  // bulk / data
  importAgendas: (courses: Course[], agendas: Agenda[], existingAsUpdate?: boolean) => number;
  replaceAll: (state: Pick<AppState, "courses" | "agendas" | "settings" | "dismissedNotifIds">) => void;
  resetDemo: () => void;
  clearAll: () => void;
  // settings & notifications
  updateSettings: (patch: Partial<Settings>) => void;
  dismissNotification: (id: string) => void;
  dismissAllNotifications: (ids: string[]) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.courses) || !Array.isArray(parsed.agendas)) return null;
    return {
      courses: parsed.courses,
      agendas: parsed.agendas,
      dismissedNotifIds: Array.isArray(parsed.dismissedNotifIds) ? parsed.dismissedNotifIds : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      seededAt: parsed.seededAt ?? null,
    };
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    courses: [],
    agendas: [],
    dismissedNotifIds: [],
    settings: DEFAULT_SETTINGS,
    seededAt: null,
  });
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage (or seed the demo dataset once).
  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      setState(loaded);
    } else {
      const demo = generateDemoData();
      setState((s) => ({ ...s, courses: demo.courses, agendas: demo.agendas, seededAt: new Date().toISOString() }));
    }
    setReady(true);
  }, []);

  // Persist on every change (debounced).
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } catch {
        /* storage full — ignore */
      }
    }, 150);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, ready]);

  const toast = useCallback((message: string, kind: Toast["kind"] = "success") => {
    const id = uid();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const patch = useCallback(
    <K extends keyof AppState>(key: K, value: AppState[K]) =>
      setState((s) => ({ ...s, [key]: value })),
    []
  );

  // ── Courses ──────────────────────────────────────────────────────────────
  const addCourse = useCallback(
    (name: string, lecturer = ""): Course => {
      const course: Course = {
        id: uid(),
        name: name.trim(),
        shortName: name.trim(),
        color: COURSE_COLORS[state.courses.length % COURSE_COLORS.length],
        totalMeetings: 16,
        lecturer,
        createdAt: new Date().toISOString(),
      };
      patch("courses", [...state.courses, course]);
      return course;
    },
    [state.courses, patch]
  );

  const updateCourse = useCallback(
    (id: string, p: Partial<Course>) =>
      patch("courses", state.courses.map((c) => (c.id === id ? { ...c, ...p } : c))),
    [state.courses, patch]
  );

  const deleteCourse = useCallback(
    (id: string, alsoAgendas: boolean) => {
      patch("courses", state.courses.filter((c) => c.id !== id));
      if (alsoAgendas) patch("agendas", state.agendas.filter((a) => a.courseId !== id));
    },
    [state.courses, state.agendas, patch]
  );

  const findOrCreateCourse = useCallback(
    (name: string): Course => {
      const existing = state.courses.find(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      return existing ?? addCourse(name);
    },
    [state.courses, addCourse]
  );

  // ── Agendas ──────────────────────────────────────────────────────────────
  const getAgenda = useCallback((id: string) => state.agendas.find((a) => a.id === id), [state.agendas]);
  const getCourse = useCallback((id: string) => state.courses.find((c) => c.id === id), [state.courses]);

  const addAgenda: StoreValue["addAgenda"] = useCallback(
    (data) => {
      const courseName = state.courses.find((c) => c.id === data.courseId)?.name ?? "";
      const agenda: Agenda = {
        ...data,
        id: uid(),
        completion: "none",
        startedAt: null,
        completedAt: null,
        preparation: data.preparation ?? defaultPrepItems({ practical: data.practical, assignment: data.assignment, courseName }),
        review: null,
        metadata: data.metadata ?? {},
        createdAt: new Date().toISOString(),
      };
      patch("agendas", [...state.agendas, agenda]);
      return agenda;
    },
    [state.agendas, state.courses, patch]
  );

  const updateAgenda = useCallback(
    (id: string, p: Partial<Agenda>) =>
      patch("agendas", state.agendas.map((a) => (a.id === id ? { ...a, ...p } : a))),
    [state.agendas, patch]
  );

  const deleteAgenda = useCallback(
    (id: string) => patch("agendas", state.agendas.filter((a) => a.id !== id)),
    [state.agendas, patch]
  );

  const duplicateAgenda = useCallback(
    (id: string): Agenda | null => {
      const src = state.agendas.find((a) => a.id === id);
      if (!src) return null;
      const copy: Agenda = {
        ...src,
        id: uid(),
        meetingNumber: src.meetingNumber != null ? src.meetingNumber + 1 : null,
        completion: "none",
        startedAt: null,
        completedAt: null,
        review: null,
        preparation: src.preparation.map((p) => ({ ...p, id: uid(), done: false })),
        createdAt: new Date().toISOString(),
      };
      patch("agendas", [...state.agendas, copy]);
      return copy;
    },
    [state.agendas, patch]
  );

  // ── Preparation ──────────────────────────────────────────────────────────
  const togglePrep = useCallback(
    (agendaId: string, prepId: string) =>
      patch(
        "agendas",
        state.agendas.map((a) =>
          a.id === agendaId
            ? { ...a, preparation: a.preparation.map((p) => (p.id === prepId ? { ...p, done: !p.done } : p)) }
            : a
        )
      ),
    [state.agendas, patch]
  );

  const addPrepItem = useCallback(
    (agendaId: string, label: string) => {
      if (!label.trim()) return;
      patch(
        "agendas",
        state.agendas.map((a) =>
          a.id === agendaId
            ? { ...a, preparation: [...a.preparation, { id: uid(), label: label.trim(), done: false }] }
            : a
        )
      );
    },
    [state.agendas, patch]
  );

  const removePrepItem = useCallback(
    (agendaId: string, prepId: string) =>
      patch(
        "agendas",
        state.agendas.map((a) =>
          a.id === agendaId ? { ...a, preparation: a.preparation.filter((p) => p.id !== prepId) } : a
        )
      ),
    [state.agendas, patch]
  );

  // ── Teaching lifecycle ───────────────────────────────────────────────────
  const startTeaching = useCallback(
    (id: string) => updateAgenda(id, { completion: "in-progress", startedAt: new Date().toISOString() }),
    [updateAgenda]
  );

  const revertToPlanned = useCallback(
    (id: string) => updateAgenda(id, { completion: "none", startedAt: null }),
    [updateAgenda]
  );

  const completeTeaching = useCallback(
    (id: string) => updateAgenda(id, { completion: "completed", completedAt: new Date().toISOString() }),
    [updateAgenda]
  );

  const markCompleted = useCallback(
    (id: string) => updateAgenda(id, { completion: "completed", completedAt: new Date().toISOString() }),
    [updateAgenda]
  );

  const reopenAgenda = useCallback(
    (id: string) => updateAgenda(id, { completion: "none", startedAt: null, completedAt: null }),
    [updateAgenda]
  );

  const saveReview = useCallback(
    (id: string, review: TeachingReview) => updateAgenda(id, { review }),
    [updateAgenda]
  );

  // ── Bulk import / backup ────────────────────────────────────────────────
  const importAgendas = useCallback(
    (newCourses: Course[], newAgendas: Agenda[]): number => {
      const courseIds = new Set(state.courses.map((c) => c.id));
      const coursesToAdd = newCourses.filter((c) => !courseIds.has(c.id));
      patch("courses", [...state.courses, ...coursesToAdd]);
      patch("agendas", [...state.agendas, ...newAgendas]);
      return newAgendas.length;
    },
    [state.courses, state.agendas, patch]
  );

  const replaceAll = useCallback(
    (s: Pick<AppState, "courses" | "agendas" | "settings" | "dismissedNotifIds">) =>
      setState((prev) => ({ ...prev, ...s })),
    []
  );

  const resetDemo = useCallback(() => {
    const demo = generateDemoData();
    setState((s) => ({ ...s, courses: demo.courses, agendas: demo.agendas, dismissedNotifIds: [], seededAt: new Date().toISOString() }));
    toast("Demo data dimuat ulang");
  }, [toast]);

  const clearAll = useCallback(() => {
    setState((s) => ({ ...s, courses: [], agendas: [], dismissedNotifIds: [] }));
    toast("Semua data dihapus", "info");
  }, [toast]);

  const updateSettings = useCallback(
    (p: Partial<Settings>) => patch("settings", { ...state.settings, ...p }),
    [state.settings, patch]
  );

  const dismissNotification = useCallback(
    (id: string) =>
      patch("dismissedNotifIds", state.dismissedNotifIds.includes(id) ? state.dismissedNotifIds : [...state.dismissedNotifIds, id]),
    [state.dismissedNotifIds, patch]
  );

  const dismissAllNotifications = useCallback(
    (ids: string[]) => patch("dismissedNotifIds", Array.from(new Set([...state.dismissedNotifIds, ...ids]))),
    [state.dismissedNotifIds, patch]
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      ready,
      toasts,
      toast,
      addCourse,
      updateCourse,
      deleteCourse,
      findOrCreateCourse,
      getAgenda,
      getCourse,
      addAgenda,
      updateAgenda,
      deleteAgenda,
      duplicateAgenda,
      togglePrep,
      addPrepItem,
      removePrepItem,
      startTeaching,
      revertToPlanned,
      completeTeaching,
      markCompleted,
      reopenAgenda,
      saveReview,
      importAgendas,
      replaceAll,
      resetDemo,
      clearAll,
      updateSettings,
      dismissNotification,
      dismissAllNotifications,
    }),
    [
      state, ready, toasts, toast, addCourse, updateCourse, deleteCourse, findOrCreateCourse,
      getAgenda, getCourse, addAgenda, updateAgenda, deleteAgenda, duplicateAgenda,
      togglePrep, addPrepItem, removePrepItem, startTeaching, revertToPlanned, completeTeaching,
      markCompleted, reopenAgenda, saveReview, importAgendas, replaceAll, resetDemo, clearAll,
      updateSettings, dismissNotification, dismissAllNotifications,
    ]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useApp(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
