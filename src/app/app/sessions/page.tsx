"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Mic, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, ButtonLink, Card, EmptyState, Input, PageHeader, formatDate, formatDuration } from "@/components/ui";
import { db, deleteSession } from "@/lib/db";
import type { SessionStatus } from "@/lib/types";
import { plural } from "@/lib/utils";

const STATUS: Record<SessionStatus, { label: string; tone: "neutral" | "spot" | "green" }> = {
  ready: { label: "Prête", tone: "neutral" },
  live: { label: "En cours", tone: "spot" },
  ended: { label: "Terminée", tone: "green" },
};

export default function SessionsPage() {
  const [query, setQuery] = useState("");
  const sessions = useLiveQuery(() => db.sessions.orderBy("createdAt").reverse().toArray());
  const counts = useLiveQuery(async () => {
    const all = await db.answers.toArray();
    const map = new Map<number, number>();
    for (const a of all) map.set(a.sessionId, (map.get(a.sessionId) ?? 0) + 1);
    return map;
  });

  const q = query.trim().toLowerCase();
  const filtered = (sessions ?? []).filter(
    (s) => !q || [s.title, s.company, s.role].some((v) => v.toLowerCase().includes(q)),
  );

  return (
    <div>
      <PageHeader
        title="Entretiens"
        description="Toutes vos sessions : transcriptions et réponses suggérées, stockées dans ce navigateur."
        actions={
          <ButtonLink href="/app/sessions/new" variant="spot">
            <Plus className="size-4" /> Nouvel entretien
          </ButtonLink>
        }
      />

      {sessions && sessions.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="pl-9!" />
        </div>
      )}

      {sessions === undefined ? null : sessions.length === 0 ? (
        <EmptyState
          icon={<Mic className="size-5" />}
          title="Aucun entretien pour l'instant"
          description="Préparez une session avant votre prochain entretien : Souffleur écoute et suggère des réponses en direct."
          action={
            <ButtonLink href="/app/sessions/new" variant="spot">
              <Plus className="size-4" /> Préparer un entretien
            </ButtonLink>
          }
        />
      ) : (
        <Card className="divide-y divide-stone-100">
          {filtered.map((s) => (
            <div key={s.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-stone-50">
              <Link href={`/app/sessions/${s.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-spot-50 text-spot-600">
                  <Mic className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-sm text-stone-500">
                    {formatDate(s.startedAt ?? s.createdAt)}
                    {s.startedAt && s.endedAt ? ` · ${formatDuration(s.endedAt - s.startedAt)}` : ""}
                    {` · ${plural(counts?.get(s.id!) ?? 0, "suggestion")}`}
                  </p>
                </div>
                <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                <ChevronRight className="size-4 text-stone-400" />
              </Link>
              <button
                type="button"
                className="rounded-lg p-2 text-stone-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                aria-label={`Supprimer ${s.title}`}
                onClick={() => {
                  if (confirm(`Supprimer « ${s.title} » et toutes ses données ?`)) void deleteSession(s.id!);
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {filtered.length === 0 && <p className="px-5 py-8 text-center text-sm text-stone-500">Aucun résultat.</p>}
        </Card>
      )}
    </div>
  );
}
