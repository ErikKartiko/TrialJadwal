"use client";

// ─── Notification Center (bell + dropdown) ───────────────────────────────────

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  ListTodo,
  TriangleAlert,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { computeNotifications } from "@/lib/status";
import { todayStr, formatShort } from "@/lib/dates";
import type { AppNotification, NotificationType } from "@/lib/types";

export const NOTIF_ICON: Record<NotificationType, React.ReactNode> = {
  h7: <CalendarClock size={15} />,
  h3: <ListTodo size={15} />,
  h1: <AlarmClock size={15} />,
  h0: <BellRing size={15} />,
  prep: <ListTodo size={15} />,
  review: <ClipboardCheck size={15} />,
  missed: <TriangleAlert size={15} />,
  digest: <Bell size={15} />,
};

export const NOTIF_TONE: Record<NotificationType, string> = {
  h7: "bg-slate-100 text-slate-600",
  h3: "bg-amber-50 text-amber-600",
  h1: "bg-indigo-50 text-indigo-600",
  h0: "bg-blue-50 text-blue-600",
  prep: "bg-amber-50 text-amber-600",
  review: "bg-teal-50 text-teal-600",
  missed: "bg-red-50 text-red-600",
  digest: "bg-slate-100 text-slate-600",
};

export function useNotifications() {
  const { agendas, courses, settings, dismissedNotifIds } = useApp();
  const today = todayStr();
  const all = useMemo(
    () => computeNotifications({ agendas, courses, settings, dismissedNotifIds }, today),
    [agendas, courses, settings, dismissedNotifIds, today]
  );
  const unread = all.filter((n) => !dismissedNotifIds.includes(n.id));
  return { all, unread };
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { dismissNotification, dismissAllNotifications, dismissedNotifIds } = useApp();
  const { all, unread } = useNotifications();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const go = (n: AppNotification) => {
    dismissNotification(n.id);
    setOpen(false);
    if (n.agendaId) router.push(`/agenda/${n.agendaId}`);
    else router.push("/reminders");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-slate-100 hover:text-ink"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-line bg-white shadow-float"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="eyebrow">Notifications</p>
              {unread.length > 0 && (
                <button
                  onClick={() => dismissAllNotifications(unread.map((n) => n.id))}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                >
                  <CheckCheck size={13} /> Tandai semua dibaca
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {all.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                    <CheckCheck size={18} />
                  </span>
                  <p className="text-sm font-semibold">You&apos;re all caught up.</p>
                  <p className="text-xs text-ink-faint">Tidak ada reminder saat ini.</p>
                </div>
              ) : (
                all.slice(0, 30).map((n) => {
                  const isUnread = !dismissedNotifIds.includes(n.id);
                  return (
                    <div
                      key={n.id}
                      className={clsx(
                        "group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50",
                        isUnread && "bg-accent-soft/40"
                      )}
                    >
                      <button onClick={() => go(n)} className="flex flex-1 items-start gap-3 text-left">
                        <span className={clsx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", NOTIF_TONE[n.type])}>
                          {NOTIF_ICON[n.type]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={clsx("truncate text-[13px]", isUnread ? "font-bold" : "font-semibold text-ink-soft")}>{n.title}</span>
                            {isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">{n.message}</span>
                          <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-ink-faint">{formatShort(n.date)}</span>
                        </span>
                      </button>
                      {isUnread && (
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="mt-1 rounded p-1 text-ink-faint opacity-0 transition hover:bg-slate-200 group-hover:opacity-100"
                          aria-label="Dismiss"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/reminders");
              }}
              className="block w-full border-t border-line py-2.5 text-center text-xs font-semibold text-accent transition hover:bg-slate-50"
            >
              Lihat semua reminder
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
