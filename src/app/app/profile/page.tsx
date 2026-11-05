"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ClipboardPaste, FileUp, Save, Sparkles } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { ProfileEditor, profileCompleteness } from "@/components/ProfileEditor";
import { useToast } from "@/components/Toast";
import { Alert, Badge, Button, Card, PageHeader, Spinner, Textarea, cn, formatDate } from "@/components/ui";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { emptyProfileData, profileData, type Profile, type ProfileData } from "@/lib/types";

function clean(p: ProfileData): ProfileData {
  const list = (arr: string[]) => arr.map((s) => s.trim()).filter(Boolean);
  return {
    ...p,
    experiences: p.experiences
      .map((x) => ({ ...x, bullets: list(x.bullets) }))
      .filter((x) => x.company || x.role || x.bullets.length),
    education: p.education.filter((e) => e.school || e.degree),
    skills: list(p.skills),
    achievements: list(p.achievements),
    languages: list(p.languages),
    certifications: list(p.certifications),
    links: list(p.links),
  };
}

export default function ProfilePage() {
  const toast = useToast();
  const stored = useLiveQuery(() => db.profile.get("me").then((p) => p ?? null));
  const [draft, setDraft] = useState<ProfileData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasted, setPasted] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // First load: start editing what is stored (or an empty profile).
  if (stored !== undefined && draft === null) {
    setDraft(stored ? profileData(stored) : emptyProfileData());
  }

  async function save(data: ProfileData, meta?: { rawText: string; sourceFileName: string }) {
    const current = await db.profile.get("me");
    const record: Profile = {
      id: "me",
      ...clean(data),
      rawText: meta?.rawText ?? current?.rawText ?? "",
      sourceFileName: meta?.sourceFileName ?? current?.sourceFileName ?? "",
      updatedAt: Date.now(),
    };
    await db.profile.put(record);
    setDirty(false);
  }

  async function parse(form: FormData) {
    setParsing(true);
    setError(null);
    form.set("model", getSettings().model);
    try {
      const res = await fetch("/api/profile/parse", { method: "POST", body: form });
      if (res.status === 413) throw new Error("Fichier trop lourd pour le serveur (4 Mo max).");
      const data = (await res.json().catch(() => ({ error: `Erreur serveur (${res.status}).` }))) as {
        profile?: ProfileData;
        rawText?: string;
        sourceFileName?: string;
        error?: string;
      };
      if (!res.ok || !data.profile) throw new Error(data.error ?? "Analyse impossible.");
      setDraft(data.profile);
      await save(data.profile, { rawText: data.rawText ?? "", sourceFileName: data.sourceFileName || "texte collé" });
      setPasteMode(false);
      setPasted("");
      toast("Profil créé à partir du CV. Vérifiez et complétez si besoin.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse impossible.");
    } finally {
      setParsing(false);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    // Hosting platforms such as Vercel reject request bodies above ~4.5 MB.
    if (file.size > 4 * 1024 * 1024) {
      setError("Fichier trop lourd (4 Mo max). Exportez un PDF plus léger ou utilisez « Coller le texte ».");
      return;
    }
    const form = new FormData();
    form.set("file", file);
    void parse(form);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    onFile(e.dataTransfer.files[0]);
  }

  const completeness = profileCompleteness(draft);

  return (
    <div>
      <PageHeader
        title="Profil & CV"
        description="Votre base de connaissances : Souffleur s'appuie uniquement sur ces informations pour suggérer des réponses et rédiger vos documents."
        actions={
          draft && (
            <Button onClick={() => draft && save(draft).then(() => toast("Profil enregistré."))} disabled={!dirty}>
              <Save className="size-4" /> Enregistrer
            </Button>
          )
        }
      />

      <Card className="mb-8 overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1fr_280px]">
          <div className="p-6">
            {!pasteMode ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                  dragOver ? "border-spot-400 bg-spot-50" : "border-stone-300",
                )}
              >
                {parsing ? (
                  <>
                    <Spinner className="size-6 text-spot-500" />
                    <p className="mt-3 font-medium">Analyse du CV en cours…</p>
                    <p className="text-sm text-stone-500">Extraction des expériences, compétences et réalisations.</p>
                  </>
                ) : (
                  <>
                    <FileUp className="size-8 text-spot-500" />
                    <p className="mt-3 font-medium">Déposez votre CV ici</p>
                    <p className="text-sm text-stone-500">PDF, Word (.docx) ou texte · 4 Mo max · PDF scannés acceptés</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Button variant="spot" onClick={() => inputRef.current?.click()}>
                        <Sparkles className="size-4" /> Choisir un fichier
                      </Button>
                      <Button variant="secondary" onClick={() => setPasteMode(true)}>
                        <ClipboardPaste className="size-4" /> Coller le texte
                      </Button>
                    </div>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => {
                    onFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  rows={10}
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder="Collez ici le contenu de votre CV ou de votre profil LinkedIn…"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="spot"
                    loading={parsing}
                    disabled={pasted.trim().length < 30}
                    onClick={() => {
                      const form = new FormData();
                      form.set("text", pasted);
                      void parse(form);
                    }}
                  >
                    <Sparkles className="size-4" /> Analyser
                  </Button>
                  <Button variant="ghost" onClick={() => setPasteMode(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}
            {error && (
              <Alert tone="error" className="mt-4">
                {error}
              </Alert>
            )}
          </div>
          <div className="border-t border-stone-200 bg-stone-50 p-6 md:border-l md:border-t-0">
            <p className="text-sm font-medium">Complétude du profil</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-spot-400 transition-all" style={{ width: `${completeness}%` }} />
            </div>
            <p className="mt-2 text-2xl font-semibold">{completeness}%</p>
            {stored && (
              <div className="mt-4 space-y-1 text-xs text-stone-500">
                <p>Mis à jour le {formatDate(stored.updatedAt)}</p>
                {stored.sourceFileName && <Badge>{stored.sourceFileName}</Badge>}
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-stone-500">
              Plus le profil est précis (chiffres, projets, résultats), plus les réponses suggérées seront concrètes.
            </p>
          </div>
        </div>
      </Card>

      {draft ? (
        <ProfileEditor
          value={draft}
          onChange={(v) => {
            setDraft(v);
            setDirty(true);
          }}
        />
      ) : (
        <div className="flex justify-center py-10">
          <Spinner className="size-6" />
        </div>
      )}

      {dirty && (
        <div className="sticky bottom-4 mt-6 flex justify-end">
          <Button onClick={() => draft && save(draft).then(() => toast("Profil enregistré."))} className="shadow-lg">
            <Save className="size-4" /> Enregistrer les modifications
          </Button>
        </div>
      )}
    </div>
  );
}
