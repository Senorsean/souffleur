"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Headphones, Laptop, Mic, MonitorSpeaker } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea, cn } from "@/components/ui";
import { db } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { browserSttSupported } from "@/lib/stt";
import { useServerStatus } from "@/lib/useStatus";
import { LANGUAGES, type AudioMode, type LangCode, type SttProvider } from "@/lib/types";

const AUDIO_MODES: { id: AudioMode; label: string; detail: string; icon: typeof Mic }[] = [
  {
    id: "tab+mic",
    label: "Onglet visio + mon micro",
    detail: "Recruteur et vous, transcrits séparément. Recommandé.",
    icon: MonitorSpeaker,
  },
  { id: "tab", label: "Onglet visio seulement", detail: "Seule la voix du recruteur est transcrite.", icon: Laptop },
  {
    id: "mic",
    label: "Micro seulement",
    detail: "Entretien sur haut-parleur, téléphone ou application de bureau.",
    icon: Mic,
  },
];

function NewSessionForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [settings] = useSettings();
  const status = useServerStatus();
  const profile = useLiveQuery(() => db.profile.get("me").then((p) => p ?? null));
  const applicationId = Number(params.get("application")) || undefined;
  const application = useLiveQuery(
    async () => (applicationId ? ((await db.applications.get(applicationId)) ?? null) : null),
    [applicationId],
  );

  const [company, setCompany] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState<LangCode | null>(null);
  const [provider, setProvider] = useState<SttProvider | null>(null);
  const [audioMode, setAudioMode] = useState<AudioMode>("tab+mic");
  const [saving, setSaving] = useState(false);
  const [browserOk, setBrowserOk] = useState(true);
  useEffect(() => setBrowserOk(browserSttSupported()), []);

  // Defaults resolved lazily so settings / application data can load first.
  const companyValue = company ?? application?.company ?? "";
  const roleValue = role ?? application?.role ?? "";
  const languageValue = language ?? settings.defaultLanguage;
  const deepgramReady = status?.deepgram ?? false;
  const providerValue: SttProvider = provider ?? (settings.sttProvider === "deepgram" && status && !deepgramReady ? "browser" : settings.sttProvider);
  const effectiveMode: AudioMode = providerValue === "browser" ? "mic" : audioMode;

  async function create() {
    setSaving(true);
    const title = [roleValue, companyValue].filter(Boolean).join(" · ") || "Entretien";
    const id = await db.sessions.add({
      title,
      company: companyValue.trim(),
      role: roleValue.trim(),
      jobDescription: jobDescription.trim(),
      notes: notes.trim(),
      language: languageValue,
      sttProvider: providerValue,
      audioMode: effectiveMode,
      status: "ready",
      createdAt: Date.now(),
      applicationId,
    });
    if (applicationId) await db.applications.update(applicationId, { status: "interview", updatedAt: Date.now() });
    router.push(`/app/sessions/${id}`);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Nouvel entretien"
        description="Donnez le contexte du poste : les réponses suggérées seront alignées sur l'offre et sur votre profil."
      />

      {profile === null && (
        <Alert tone="warn" className="mb-6">
          Aucun profil pour l&apos;instant : les réponses resteront génériques.{" "}
          <Link href="/app/profile" className="font-medium underline">
            Importer mon CV
          </Link>
        </Alert>
      )}
      {status && !status.anthropic && (
        <Alert tone="error" className="mb-6">
          La clé ANTHROPIC_API_KEY n&apos;est pas configurée côté serveur : aucune réponse ne pourra être générée.
        </Alert>
      )}

      <div className="space-y-6">
        <Card className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Entreprise">
              <Input value={companyValue} onChange={(e) => setCompany(e.target.value)} placeholder="Ex. Acme SAS" />
            </Field>
            <Field label="Poste">
              <Input value={roleValue} onChange={(e) => setRole(e.target.value)} placeholder="Ex. Développeur full-stack" />
            </Field>
          </div>
          <Field label="Offre d'emploi" hint="Collez l'annonce : missions, compétences attendues, culture…">
            <Textarea rows={7} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
          </Field>
          <Field label="Notes personnelles" hint="Points à placer, prétentions salariales, questions à poser…">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </Card>

        <Card className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Langue de l'entretien">
              <Select value={languageValue} onChange={(e) => setLanguage(e.target.value as LangCode)}>
                {Object.entries(LANGUAGES).map(([code, l]) => (
                  <option key={code} value={code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Transcription"
              hint={providerValue === "browser" ? "Gratuit, micro uniquement (Chrome / Edge)." : "Deepgram nova-3, faible latence."}
            >
              <Select value={providerValue} onChange={(e) => setProvider(e.target.value as SttProvider)}>
                <option value="deepgram" disabled={!deepgramReady}>
                  Deepgram {deepgramReady ? "" : "(clé non configurée)"}
                </option>
                <option value="browser" disabled={!browserOk}>
                  Navigateur (Web Speech)
                </option>
              </Select>
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-800">Sources audio</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {AUDIO_MODES.map((m) => {
                const disabled = providerValue === "browser" && m.id !== "mic";
                const active = effectiveMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setAudioMode(m.id)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-xl p-4 text-left ring-1 transition",
                      active ? "bg-spot-50 ring-2 ring-spot-400" : "bg-white ring-stone-200 hover:ring-stone-300",
                      disabled && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <m.icon className={cn("mb-2 size-5", active ? "text-spot-600" : "text-stone-500")} />
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="mt-1 text-xs text-stone-500">{m.detail}</p>
                  </button>
                );
              })}
            </div>
            {effectiveMode !== "mic" && (
              <p className="mt-3 flex items-start gap-2 text-xs text-stone-500">
                <Headphones className="mt-0.5 size-3.5 shrink-0" />
                Ouvrez la visio (Meet, Teams, Zoom web…) dans un onglet Chrome ou Edge. Au démarrage, choisissez cet onglet et
                cochez « Partager l&apos;audio de l&apos;onglet ».
              </p>
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" variant="spot" loading={saving} onClick={create}>
            Préparer la session <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense>
      <NewSessionForm />
    </Suspense>
  );
}
