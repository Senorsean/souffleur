"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, Copy, Download, FileText, Mail, Pencil, Printer, Save, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { useToast } from "@/components/Toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  cn,
  downloadFile,
  formatDate,
  slugify,
} from "@/components/ui";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { errorMessage, isAbort, streamText } from "@/lib/stream";
import { LANGUAGES, profileData, type DocKind, type DocumentItem, type LangCode } from "@/lib/types";

type Target = DocKind | "both";
const KIND_LABEL: Record<DocKind, string> = { cv: "CV ATS", letter: "Lettre de motivation" };

export default function DocumentsPage() {
  const toast = useToast();
  const [settings] = useSettings();
  const profile = useLiveQuery(() => db.profile.get("me").then((p) => p ?? null));
  const documents = useLiveQuery(() => db.documents.orderBy("createdAt").reverse().toArray());

  const [target, setTarget] = useState<Target>("both");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extra, setExtra] = useState("");
  const [language, setLanguage] = useState<LangCode | null>(null);
  const [generating, setGenerating] = useState<{ kind: DocKind; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const languageValue = language ?? settings.defaultLanguage;
  const selected = documents?.find((d) => d.id === selectedId) ?? null;

  async function generate() {
    setError(null);
    setEditing(null);
    const kinds: DocKind[] = target === "both" ? ["cv", "letter"] : [target];
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const p = await db.profile.get("me");
      for (const kind of kinds) {
        setGenerating({ kind, text: "" });
        const content = await streamText(
          "/api/documents",
          {
            model: settings.model,
            kind,
            language: languageValue,
            profile: p ? profileData(p) : null,
            company: company.trim(),
            jobTitle: jobTitle.trim(),
            jobDescription: jobDescription.trim(),
            extra: extra.trim(),
          },
          (text) => setGenerating({ kind, text }),
          controller.signal,
        );
        const now = Date.now();
        const doc: DocumentItem = {
          kind,
          title: `${KIND_LABEL[kind]} — ${[jobTitle, company].filter(Boolean).join(" · ") || "offre"}`,
          company: company.trim(),
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          language: languageValue,
          content,
          createdAt: now,
          updatedAt: now,
        };
        const id = await db.documents.add(doc);
        setSelectedId(id ?? null);
      }
      toast(kinds.length > 1 ? "CV et lettre générés." : `${KIND_LABEL[kinds[0]]} généré.`);
    } catch (e) {
      if (!isAbort(e)) setError(errorMessage(e));
    } finally {
      setGenerating(null);
      abortRef.current = null;
    }
  }

  async function saveEdit() {
    if (!selected?.id || editing === null) return;
    await db.documents.update(selected.id, { content: editing, updatedAt: Date.now() });
    setEditing(null);
    toast("Document enregistré.");
  }

  const viewed = generating ? { kind: generating.kind, content: generating.text } : selected;

  return (
    <div>
      <PageHeader
        title="CV & lettres"
        description="Collez une offre : Souffleur adapte votre CV (format lisible par les ATS) et rédige une lettre, sans inventer de faits."
      />

      {profile === null && (
        <Alert tone="warn" className="mb-6">
          Importez d&apos;abord votre CV dans{" "}
          <Link href="/app/profile" className="font-medium underline">
            Profil & CV
          </Link>{" "}
          : les documents sont rédigés uniquement à partir de votre profil.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1 text-sm">
              {(
                [
                  ["both", "Les deux"],
                  ["cv", "CV ATS"],
                  ["letter", "Lettre"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTarget(id)}
                  aria-pressed={target === id}
                  className={cn(
                    "rounded-md py-1.5 font-medium transition",
                    target === id ? "bg-white shadow-sm" : "text-stone-500 hover:text-ink-900",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entreprise">
                <Input value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>
              <Field label="Poste">
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </Field>
            </div>
            <Field label="Offre d'emploi">
              <Textarea
                rows={9}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Collez le texte complet de l'annonce…"
              />
            </Field>
            <Field label="Consignes (facultatif)" hint="Ex. « mettre en avant le management », « une page max »">
              <Input value={extra} onChange={(e) => setExtra(e.target.value)} />
            </Field>
            <Field label="Langue">
              <Select value={languageValue} onChange={(e) => setLanguage(e.target.value as LangCode)}>
                {Object.entries(LANGUAGES).map(([code, l]) => (
                  <option key={code} value={code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex gap-2">
              <Button
                variant="spot"
                className="flex-1"
                loading={Boolean(generating)}
                disabled={jobDescription.trim().length < 20 || !profile}
                onClick={generate}
              >
                <Sparkles className="size-4" /> Générer
              </Button>
              {generating && (
                <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
                  Arrêter
                </Button>
              )}
            </div>
          </Card>

          {documents && documents.length > 0 && (
            <Card className="divide-y divide-stone-100">
              <p className="px-5 py-3 text-sm font-medium">Documents enregistrés</p>
              {documents.map((d) => (
                <div
                  key={d.id}
                  className={cn("group flex items-center gap-3 px-5 py-3", d.id === selectedId && !generating && "bg-spot-50")}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => {
                      setSelectedId(d.id!);
                      setEditing(null);
                    }}
                  >
                    {d.kind === "cv" ? <FileText className="size-4 shrink-0 text-spot-600" /> : <Mail className="size-4 shrink-0 text-spot-600" />}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{d.title}</span>
                      <span className="text-xs text-stone-500">{formatDate(d.createdAt)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer ${d.title}`}
                    className="rounded-md p-1.5 text-stone-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                    onClick={() => {
                      if (confirm("Supprimer ce document ?")) {
                        void db.documents.delete(d.id!);
                        if (selectedId === d.id) setSelectedId(null);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div>
          {viewed ? (
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-5 py-3">
                <Badge tone="spot">{KIND_LABEL[viewed.kind]}</Badge>
                {generating && <span className="text-sm text-stone-500">Rédaction en cours…</span>}
                {selected && !generating && (
                  <div className="ml-auto flex flex-wrap gap-1">
                    {editing === null ? (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(selected.content)}>
                        <Pencil className="size-4" /> Éditer
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="size-4" /> Enregistrer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                          Annuler
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void navigator.clipboard.writeText(selected.content);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} Copier
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadFile(`${slugify(selected.title)}.md`, selected.content)}
                    >
                      <Download className="size-4" /> .md
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => window.print()}>
                      <Printer className="size-4" /> PDF
                    </Button>
                  </div>
                )}
              </div>
              {editing !== null ? (
                <Textarea
                  value={editing}
                  onChange={(e) => setEditing(e.target.value)}
                  className="min-h-[70vh] rounded-none! font-mono text-[13px] ring-0!"
                />
              ) : (
                <article className="print-area bg-white px-8 py-8 sm:px-12">
                  <Markdown className="prose-sm sm:prose-base prose-h1:mb-1 prose-h2:mt-6 prose-h2:border-b prose-h2:border-stone-200 prose-h2:pb-1">
                    {viewed.content || "…"}
                  </Markdown>
                </article>
              )}
            </Card>
          ) : (
            <EmptyState
              icon={<FileText className="size-5" />}
              title="Aucun document sélectionné"
              description="Collez une offre puis « Générer ». Pour un PDF, utilisez « PDF » puis « Enregistrer au format PDF » dans la fenêtre d'impression."
            />
          )}
        </div>
      </div>
    </div>
  );
}
