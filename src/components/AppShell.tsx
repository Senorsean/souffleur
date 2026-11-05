"use client";

import {
  Briefcase,
  FileText,
  LayoutDashboard,
  Menu,
  Mic,
  Plus,
  Settings as SettingsIcon,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useServerStatus } from "@/lib/useStatus";
import { Logo } from "./Logo";
import { ToastProvider } from "./Toast";
import { ButtonLink, cn } from "./ui";

const NAV = [
  { href: "/app", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/app/sessions", label: "Entretiens", icon: Mic },
  { href: "/app/profile", label: "Profil & CV", icon: UserRound },
  { href: "/app/documents", label: "CV & lettres", icon: FileText },
  { href: "/app/applications", label: "Candidatures", icon: Briefcase },
  { href: "/app/settings", label: "Réglages", icon: SettingsIcon },
];

function isFocusRoute(pathname: string) {
  // The live session screen takes the whole window.
  return /^\/app\/sessions\/\d+/.test(pathname);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const status = useServerStatus();

  if (isFocusRoute(pathname)) return <ToastProvider>{children}</ToastProvider>;

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href) && !(href === "/app/sessions" && pathname === "/app/sessions/new");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-ink-800 text-paper" : "text-stone-300 hover:bg-ink-800/60 hover:text-paper",
            )}
          >
            <Icon className={cn("size-4", active && "text-spot-300")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-6 bg-ink-900 p-4">
      <Link href="/" className="px-2 pt-1">
        <Logo dark />
      </Link>
      <ButtonLink href="/app/sessions/new" variant="spot" className="w-full" onClick={() => setOpen(false)}>
        <Plus className="size-4" /> Nouvel entretien
      </ButtonLink>
      {nav}
      <div className="mt-auto space-y-2 rounded-xl bg-ink-800/70 p-3 text-xs text-stone-400">
        <p className="font-medium text-stone-300">Serveur</p>
        <p className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", status?.anthropic ? "bg-emerald-400" : "bg-red-400")} />
          Claude {status?.anthropic ? "configuré" : "clé manquante"}
        </p>
        <p className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", status?.deepgram ? "bg-emerald-400" : "bg-stone-500")} />
          Deepgram {status?.deepgram ? "configuré" : "non configuré"}
        </p>
        <p className="pt-1 text-stone-500">Données stockées dans ce navigateur uniquement.</p>
      </div>
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar}</aside>

        <header className="sticky top-0 z-30 flex items-center justify-between bg-ink-900 px-4 py-3 lg:hidden">
          <Logo dark />
          <button className="rounded-lg p-2 text-paper" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="size-5" />
          </button>
        </header>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink-950/60" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72">
              {sidebar}
              <button
                className="absolute right-3 top-4 rounded-lg p-2 text-paper"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
