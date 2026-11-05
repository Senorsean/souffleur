"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "./ui";

export function Markdown({ children, className, dark }: { children: string; className?: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-pre:my-2 prose-pre:rounded-lg prose-headings:font-display",
        dark ? "prose-invert prose-pre:bg-ink-950 prose-strong:text-spot-200" : "prose-stone prose-pre:bg-ink-900",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
