// Plain helpers usable from server and client components.

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** "1 suggestion", "3 suggestions" (French plural: 0 and 1 are singular). */
export function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}
