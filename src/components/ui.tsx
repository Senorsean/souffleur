"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export { cn };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dangerGhost" | "spot" | "dark" | "darkGhost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink-900 text-paper hover:bg-ink-700 disabled:bg-ink-600",
  spot: "bg-spot-400 text-ink-950 hover:bg-spot-300 disabled:bg-spot-200",
  secondary: "bg-white text-ink-900 ring-1 ring-inset ring-stone-300 hover:bg-stone-50 disabled:text-stone-400",
  ghost: "text-ink-800 hover:bg-stone-200/60 disabled:text-stone-400",
  danger: "bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300",
  dangerGhost: "text-red-600 hover:bg-red-50 disabled:text-red-300",
  // For dark surfaces (live session screen).
  dark: "bg-ink-800 text-stone-100 ring-1 ring-inset ring-ink-700 hover:bg-ink-700 disabled:text-stone-500",
  darkGhost: "text-stone-300 hover:bg-ink-800 hover:text-stone-100 disabled:text-stone-600",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

function buttonClass(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl bg-white ring-1 ring-stone-200/80 shadow-sm", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium text-ink-800">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-stone-500">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const control =
  "w-full rounded-lg bg-white px-3 text-sm text-ink-900 ring-1 ring-inset ring-stone-300 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-spot-400 disabled:bg-stone-100";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-10 pr-8", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "spot" | "green" | "red" | "blue" }) {
  const tones = {
    neutral: "bg-stone-100 text-stone-700 ring-stone-200",
    spot: "bg-spot-50 text-spot-700 ring-spot-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    blue: "bg-sky-50 text-sky-700 ring-sky-200",
  };
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-stone-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-spot-50 text-spot-600">{icon}</div>
      <h3 className="font-medium text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "warn" | "error";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-sky-50 text-sky-900 ring-sky-200",
    warn: "bg-spot-50 text-spot-700 ring-spot-200",
    error: "bg-red-50 text-red-800 ring-red-200",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl px-4 py-3 text-sm ring-1 ring-inset", tones[tone], className)}>
      {children}
    </div>
  );
}

export function formatDate(ts: number | undefined, withTime = true) {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(ts);
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function downloadFile(filename: string, content: string, type = "text/markdown;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "souffleur"
  );
}
