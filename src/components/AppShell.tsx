"use client";

// ─── Application shell: responsive sidebar, topbar, mobile nav, toasts ───────

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarRange,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Import,
  Info,
  LayoutDashboard,
  Library,
  ListChecks,
  Menu,
  Plus,
  Search,
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useApp } from "@/lib/store";
import { formatFull, todayStr } from "@/lib/dates";
import { NotificationCenter, useNotifications } from "./Notifications";

const NAV_MAIN = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/weekly", label: "Weekly Planner", icon: CalendarRange },
  { href: "/semester", label: "Semester", icon: CalendarCheck2 },
];

const NAV_TEACHING = [
  { href: "/courses", label: "Courses", icon: Library },
  { href: "/agenda", label: "Agenda", icon: ClipboardList },
  { href: "/preparation", label: "Preparation", icon: ListChecks },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const NAV_DATA = [
  { href: "/import", label: "Import Data", icon: Import },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
        active
          ? "bg-ink text-white shadow-sm"
          : "text-ink-soft hover:bg-slate-200/60 hover:text-ink"
      )}
    >
      <Icon size={16} className={clsx("shrink-0", active ? "text-white" : "text-ink-faint group-hover:text-ink")} />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className={clsx(
            "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold",
            active ? "bg-white/20 text-white" : "bg-red-100 text-red-600"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { unread } = useNotifications();
  const { agendas } = useApp();
  const today = todayStr();
  const pendingPrep = useMemo(
    () =>
      agendas.filter((a) => {
        const d = a.date >= today;
        return d && a.completion !== "completed" && a.preparation.some((p) => !p.done);
      }).length,
    [agendas, today]
  );

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pb-5 pt-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white shadow-sm">
          <GraduationCap size={18} />
        </span>
        <div className="leading-tight">
          <p className="font-display text-[13px] font-bold tracking-tight">Academic Teaching</p>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Planner</p>
        </div>
      </div>

      <div className="px-3 pb-3">
        <Link
          href="/agenda/new"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-accent-deep active:scale-[0.98]"
        >
          <Plus size={15} strokeWidth={2.5} /> New Agenda
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        <div>
          <p className="px-3 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint/70">Plan</p>
          <div className="space-y-0.5">
            {NAV_MAIN.map((n) => (
              <NavItem key={n.href} {...n} active={isActive(n.href)} onClick={onNavigate} />
            ))}
          </div>
        </div>
        <div>
          <p className="px-3 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint/70">Teach & Review</p>
          <div className="space-y-0.5">
            {NAV_TEACHING.map((n) => (
              <NavItem
                key={n.href}
                {...n}
                active={isActive(n.href)}
                badge={n.href === "/reminders" ? unread.length : n.href === "/preparation" ? pendingPrep : undefined}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="px-3 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint/70">Data</p>
          <div className="space-y-0.5">
            {NAV_DATA.map((n) => (
              <NavItem key={n.href} {...n} active={isActive(n.href)} onClick={onNavigate} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-line px-4 py-3">
        <p className="font-mono text-[10px] leading-relaxed text-ink-faint">
          PLAN → PREPARE → TEACH → REVIEW
        </p>
      </div>
    </div>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/agenda?q=${encodeURIComponent(q.trim())}` : "/agenda");
      }}
      className="relative hidden md:block"
    >
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search agenda, course, material…"
        className="h-9 w-64 rounded-lg border border-line bg-white pl-9 pr-12 text-[13px] text-ink placeholder:text-ink-faint/70 transition focus:w-80 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
        ⏎
      </kbd>
    </form>
  );
}

const MOBILE_NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/weekly", label: "Week", icon: CalendarRange },
  { href: "/courses", label: "Courses", icon: Library },
];

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-white shadow-float"
      >
        <GraduationCap size={30} />
      </motion.div>
      <div className="text-center">
        <p className="font-display text-lg font-bold tracking-tight">Academic Teaching Planner</p>
        <p className="mt-1 animate-pulse-soft font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Loading your semester…
        </p>
      </div>
    </div>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-[90] flex w-[min(92vw,340px)] flex-col gap-2 md:bottom-6 md:right-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className={clsx(
              "pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium shadow-float",
              t.kind === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : t.kind === "info"
                  ? "border-line bg-white text-ink"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
            )}
          >
            {t.kind === "error" ? <Info size={15} /> : <CheckCircle2 size={15} className={t.kind === "info" ? "text-ink-faint" : "text-emerald-600"} />}
            <span className="flex-1">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const today = todayStr();

  useEffect(() => {
    setDrawer(false);
  }, [pathname]);

  if (!ready) return <Splash />;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-line bg-cream lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px] lg:hidden"
              onClick={() => setDrawer(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-[70] w-[280px] border-r border-line bg-cream lg:hidden"
            >
              <button
                onClick={() => setDrawer(false)}
                className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-faint hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={() => setDrawer(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-[248px]">
        {/* Topbar */}
        <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-4 md:px-6">
            <button
              onClick={() => setDrawer(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-white lg:hidden">
              <GraduationCap size={14} />
            </span>

            <div className="hidden items-center gap-2 sm:flex">
              <button
                onClick={() => router.push(`/calendar?date=${today}`)}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line transition hover:ring-accent/40"
              >
                Today
              </button>
              <span className="hidden text-[13px] text-ink-faint xl:block">{formatFull(today)}</span>
            </div>

            <div className="flex-1" />
            <GlobalSearch />
            <NotificationCenter />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] px-4 pb-28 pt-6 md:px-6 lg:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition",
                isActive(n.href) ? "text-accent" : "text-ink-faint"
              )}
            >
              <n.icon size={19} strokeWidth={isActive(n.href) ? 2.4 : 2} />
              {n.label}
            </Link>
          ))}
          <button
            onClick={() => setDrawer(true)}
            className={clsx(
              "flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition",
              drawer ? "text-accent" : "text-ink-faint"
            )}
          >
            <Menu size={19} />
            Menu
          </button>
        </div>
      </nav>

      <Toasts />
    </div>
  );
}
