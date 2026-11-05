import { cn } from "@/lib/utils";

/** Original mark: a prompter's box (rounded square) with a spotlight cue. */
export function Logo({ className, withText = true, dark }: { className?: string; withText?: boolean; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill={dark ? "#faf8f4" : "#17141f"} />
        <path d="M7 21.5c3-6.5 15-6.5 18 0" fill="none" stroke="#ef9b33" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="16" cy="11.5" r="3.2" fill="#ef9b33" />
        <path d="M16 6.2v-1.4M21.2 8.4l1-1M10.8 8.4l-1-1" stroke="#f6b75b" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {withText && (
        <span className={cn("font-display text-xl font-semibold tracking-tight", dark ? "text-paper" : "text-ink-900")}>
          Souffleur
        </span>
      )}
    </span>
  );
}
