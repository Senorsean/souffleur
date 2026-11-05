"use client";

import { CornerDownRight } from "lucide-react";
import type { Speaker } from "@/lib/types";
import { cn } from "../ui";

export function Bubble({
  speaker,
  text,
  live,
  onAnswer,
  light,
}: {
  speaker: Speaker;
  text: string;
  live?: boolean;
  onAnswer?: () => void;
  light?: boolean;
}) {
  const isMe = speaker === "me";
  return (
    <div className={cn("group flex flex-col", isMe ? "items-end" : "items-start")}>
      <span className={cn("mb-1 text-[11px] font-medium uppercase tracking-wider", light ? "text-stone-500" : "text-stone-500")}>
        {isMe ? "Moi" : "Recruteur"}
        {live && " · en cours"}
      </span>
      <div
        className={cn(
          "max-w-[92%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          light
            ? isMe
              ? "rounded-br-md bg-stone-100 text-ink-900"
              : "rounded-bl-md bg-spot-50 text-ink-900 ring-1 ring-spot-200"
            : isMe
              ? "rounded-br-md bg-ink-700 text-stone-100"
              : "rounded-bl-md bg-spot-400/10 text-spot-50 ring-1 ring-spot-400/30",
          live && "italic opacity-70",
        )}
      >
        {text}
      </div>
      {onAnswer && (
        <button
          type="button"
          onClick={onAnswer}
          className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-spot-300 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
        >
          <CornerDownRight className="size-3" /> Répondre à ceci
        </button>
      )}
    </div>
  );
}
