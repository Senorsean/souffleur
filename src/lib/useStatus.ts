"use client";

import { useEffect, useState } from "react";

export interface ServerStatus {
  anthropic: boolean;
  deepgram: boolean;
  defaultModel: string;
}

let pending: Promise<ServerStatus | null> | null = null;

function load() {
  pending ??= fetch("/api/status")
    .then((r) => (r.ok ? (r.json() as Promise<ServerStatus>) : null))
    .catch(() => null);
  return pending;
}

/** Which API keys the server has (never the keys themselves). */
export function useServerStatus(): ServerStatus | null {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  useEffect(() => {
    let alive = true;
    load().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}
