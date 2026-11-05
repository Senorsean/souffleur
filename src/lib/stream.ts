"use client";

import { STREAM_ERROR_MARKER } from "./types";

export class StreamError extends Error {}

/**
 * POSTs JSON to a streaming route and calls onText with the accumulated text.
 * Resolves with the full text; rejects with StreamError on API errors.
 * An AbortError is rethrown untouched so callers can ignore it.
 */
export async function streamText(
  url: string,
  body: unknown,
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new StreamError(data?.error ?? `Erreur serveur (${res.status}).`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    const errorAt = full.indexOf(STREAM_ERROR_MARKER);
    if (errorAt >= 0) {
      const partial = full.slice(0, errorAt);
      if (partial) onText(partial);
      throw new StreamError(full.slice(errorAt + STREAM_ERROR_MARKER.length));
    }
    onText(full);
  }
  full += decoder.decode();
  return full;
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}
