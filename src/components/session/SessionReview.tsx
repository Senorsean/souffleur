"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Download, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db, deleteSession } from "@/lib/db";
import { LANGUAGES, type Answer, type Session, type Utterance } from "@/lib/types";
import { plural } from "@/lib/utils";
import { Markdown } from "../Markdown";
import { Badge, Button, Card, EmptyState, downloadFile, formatDate, formatDuration, slugify } from "../ui";
import { Bubble } from "./Bubble";

type Item = { type: "u"; at: number; u: Utterance } | { type: "a"; at: number; a: Answer };

export function sessionToMarkdown(session: Session, utterances: Utterance[], answers: Answer[]) {
  const lines = [
    `# ${session.title}`,
    "",
    `- Date : ${formatDate(session.startedAt ?? session.createdAt)}`,
    session.startedAt && session.endedAt ? `- Durée : ${formatDuration(session.endedAt - session.startedAt)}` : "",
    `- Langue : ${LANGUAGES[session.language].label}`,
    session.company ? `- Entreprise : ${session.company}` : "",
    session.role ? `- Poste : ${session.role}` : "",
    "",
    "## Transcription",
    "",
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "");
  const items: Item[] = [
    ...utterances.map((u) => ({ type: "u" as const, at: u.at, u })),
    ...answers.map((a) => ({ type: "a" as const, at: a.at, a })),
  ].sort((x, y) => x.at - y.at);
  for (const item of items) {
    if (item.type === "u") {
      lines.push(`**${item.u.speaker === "me" ? "Moi" : "Recruteur"}** : ${item.u.text}`, "");
    } else {
      lines.push(
        `> 💡 Suggestion${item.a.kind === "code" ? " (analyse d'écran)" : ""} pour « ${item.a.question} »`,
        ">",
        ...item.a.answer.split("\n").map((l) => `> ${l}`),
        "",
      );
    }
  }
  return lines.join("\n");
}

export function SessionReview({ session }: { session: Session & { id: number } }) {
  const router = useRouter();
  const utterances = useLiveQuery(() => db.utterances.where("sessionId").equals(session.id).sortBy("at"), [session.id]);
  const answers = useLiveQuery(() => db.answers.where("sessionId").equals(session.id).sortBy("at"), [session.id]);

  const items: Item[] = [
    ...(utterances ?? []).map((u) => ({ type: "u" as const, at: u.at, u })),
    ...(answers ?? []).map((a) => ({ type: "a" as const, at: a.at, a })),
  ].sort((x, y) => x.at - y.at);

  const duration = session.startedAt && session.endedAt ? session.endedAt - session.startedAt : 0;

  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <Link href="/app/sessions" className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-ink-900">
          <ArrowLeft className="size-4" /> Entretiens
        </Link>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{session.title}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-stone-600">
              <Badge>{formatDate(session.startedAt ?? session.createdAt)}</Badge>
              {duration > 0 && <Badge>{formatDuration(duration)}</Badge>}
              <Badge>{LANGUAGES[session.language].label}</Badge>
              <Badge tone="spot">{plural(answers?.length ?? 0, "suggestion")}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(
                  `${slugify(session.title)}.md`,
                  sessionToMarkdown(session, utterances ?? [], answers ?? []),
                )
              }
            >
              <Download className="size-4" /> Exporter
            </Button>
            <Button variant="secondary" onClick={() => db.sessions.update(session.id, { status: "ready", endedAt: undefined })}>
              <RotateCcw className="size-4" /> Rouvrir
            </Button>
            <Button
              variant="dangerGhost"
              onClick={async () => {
                if (!confirm("Supprimer définitivement cette session, sa transcription et ses réponses ?")) return;
                await deleteSession(session.id);
                router.push("/app/sessions");
              }}
            >
              <Trash2 className="size-4" /> Supprimer
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="size-5" />}
            title="Session vide"
            description="Aucune transcription ni réponse n'a été enregistrée pendant cette session."
          />
        ) : (
          <Card className="space-y-4 p-6">
            {items.map((item) =>
              item.type === "u" ? (
                <Bubble key={`u${item.u.id}`} speaker={item.u.speaker} text={item.u.text} light />
              ) : (
                <details key={`a${item.a.id}`} className="rounded-xl bg-ink-900 text-stone-100">
                  <summary className="cursor-pointer px-4 py-2.5 text-sm">
                    <Sparkles className="mr-2 inline size-3.5 text-spot-300" />
                    {item.a.kind === "code" ? "Analyse d'écran" : "Suggestion"} :{" "}
                    <span className="text-stone-400">« {item.a.question} »</span>
                  </summary>
                  <div className="border-t border-ink-700 px-4 py-3">
                    <Markdown dark>{item.a.answer}</Markdown>
                  </div>
                </details>
              ),
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
