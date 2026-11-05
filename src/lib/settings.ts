"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, isModelId, type Settings } from "./types";

const KEY = "souffleur.settings";
const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>;
    cache = { ...DEFAULT_SETTINGS, ...stored };
    if (!isModelId(cache.model)) cache.model = DEFAULT_SETTINGS.model;
  } catch {
    cache = { ...DEFAULT_SETTINGS };
  }
  return cache;
}

export function getSettings(): Settings {
  return typeof window === "undefined" ? DEFAULT_SETTINGS : read();
}

export function saveSettings(patch: Partial<Settings>) {
  cache = { ...read(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const settings = useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS);
  const update = useCallback((patch: Partial<Settings>) => saveSettings(patch), []);
  return [settings, update];
}
