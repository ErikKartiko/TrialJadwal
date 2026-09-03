"use client";

// ─── Reminders page ──────────────────────────────────────────────────────────

import React from "react";
import Link from "next/link";
import { BellOff, CheckCheck, Settings as SettingsIcon } from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { formatFull } from "@/lib/dates";
import { NOTIF_ICON, NOTIF_TONE, useNotifications } from "@/components/Notifications";
import { Card, EmptyState, SectionTitle, btn } from "@/components/ui";

const TYPE_LABEL: Record<string, string> = {
  missed: "Terlewat",
  h0: "Hari H",
  prep: "Persiapan",
  h1: "H-1",
  h3: "H-3",
  h7: "H-7",
  review: "Review",
  digest: "Ringkasan",
};

export default function RemindersPage() {
  const { dismissedNotifIds, dismissNotification, dismissAllNotifications, settings } = useApp();
  const { all, unread } = useNotifications();

  const active = all.filter((n) => !dismissedNotifIds.includes(n.id));
  const done = all.filter((n) => dismissedNotifIds.includes(n.id));

  const reminderOn = Object.entries({
    "H-7": settings.reminders.h7,
    "H-3": settings.reminders.h3,
    "H-1": settings.reminders.h1,
    "Hari H": settings.reminders.h0,
    "Persiapan": settings.reminders.prep,
    "Review pasca mengajar": settings.reminders.review,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Reminders</h1>
          <p className="text-[13px] text-ink-faint">
            Reminder otomatis dari tanggal agenda: H-7, H-3, H-1, Hari H, persiapan, dan review.
          </p>
        </div>
        {unread.length > 0 && (
          <button onClick={() => dismissAllNotifications(unread.map((n) => n.id))} className={btn.ghost}>
            <CheckCheck size={14} /> Tandai semua dibaca ({unread.length})
          </button>
        )}
      </div>

      {/* Reminder rules */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {reminderOn.map(([label, on]) => (
              <span
                key={label}
                className={clsx(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold ring-1",
                  on ? "bg-accent-soft text-accent ring-accent/20" : "bg-slate-100 text-ink-faint line-through ring-line"
                )}
              >
                {label}
              </span>
            ))}
          </div>
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
            <SettingsIcon size={13} /> Atur reminder
          </Link>
        </div>
      </Card>

      <div>
        <SectionTitle>Aktif ({active.length})</SectionTitle>
        {active.length === 0 ? (
          <EmptyState
            icon={<BellOff size={18} />}
            title="You're all caught up."
            hint="Tidak ada reminder aktif. Reminder muncul otomatis mendekati tanggal agenda Anda."
          />
        ) : (
          <div className="space-y-2">
            {active.map((n) => (
              <div key={n.id} className="flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3">
                <span className={clsx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", NOTIF_TONE[n.type])}>
                  {NOTIF_ICON[n.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold">{n.title}</p>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-ink-faint">
                      {TYPE_LABEL[n.type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{n.message}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{formatFull(n.date)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {n.agendaId && (
                    <Link href={`/agenda/${n.agendaId}`} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-center text-[11px] font-semibold text-ink hover:bg-slate-200">
                      Buka
                    </Link>
                  )}
                  <button onClick={() => dismissNotification(n.id)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-ink-faint hover:bg-slate-100">
                    Selesai
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div>
          <SectionTitle>Sudah dibaca ({done.length})</SectionTitle>
          <div className="space-y-1.5 opacity-60">
            {done.slice(0, 10).map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-2.5 ring-1 ring-line">
                <span className={clsx("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", NOTIF_TONE[n.type])}>
                  {NOTIF_ICON[n.type]}
                </span>
                <p className="flex-1 truncate text-xs text-ink-soft">{n.message}</p>
                <CheckCheck size={13} className="shrink-0 text-ink-faint" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
