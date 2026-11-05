"use client";

import { Download, KeyRound, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { useToast } from "@/components/Toast";
import { Alert, Badge, Button, Card, Field, PageHeader, Select, downloadFile } from "@/components/ui";
import { exportAll, importAll, wipeAll } from "@/lib/db";
import { useSettings } from "@/lib/settings";
import { useServerStatus } from "@/lib/useStatus";
import {
  LANGUAGES,
  MODEL_OPTIONS,
  type AnswerLength,
  type AnswerTone,
  type LangCode,
  type ModelId,
  type SttProvider,
} from "@/lib/types";

export default function SettingsPage() {
  const toast = useToast();
  const [settings, update] = useSettings();
  const status = useServerStatus();
  const importRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Réglages" description="Préférences enregistrées dans ce navigateur." />

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-4 font-medium">Réponses suggérées</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modèle" hint={MODEL_OPTIONS.find((m) => m.id === settings.model)?.hint}>
              <Select value={settings.model} onChange={(e) => update({ model: e.target.value as ModelId })}>
                {MODEL_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Longueur">
              <Select value={settings.answerLength} onChange={(e) => update({ answerLength: e.target.value as AnswerLength })}>
                <option value="short">Courte (2 puces)</option>
                <option value="medium">Moyenne (2 à 4 puces)</option>
                <option value="long">Détaillée (exemple STAR)</option>
              </Select>
            </Field>
            <Field label="Ton">
              <Select value={settings.tone} onChange={(e) => update({ tone: e.target.value as AnswerTone })}>
                <option value="natural">Naturel</option>
                <option value="formal">Formel</option>
                <option value="confident">Affirmé</option>
              </Select>
            </Field>
            <Field label="Langue par défaut">
              <Select value={settings.defaultLanguage} onChange={(e) => update({ defaultLanguage: e.target.value as LangCode })}>
                {Object.entries(LANGUAGES).map(([code, l]) => (
                  <option key={code} value={code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Transcription par défaut">
              <Select value={settings.sttProvider} onChange={(e) => update({ sttProvider: e.target.value as SttProvider })}>
                <option value="deepgram">Deepgram (micro + onglet visio)</option>
                <option value="browser">Navigateur (gratuit, micro seul)</option>
              </Select>
            </Field>
            <label className="flex items-center gap-3 self-end rounded-lg bg-stone-50 px-3 py-2.5 text-sm ring-1 ring-stone-200">
              <input
                type="checkbox"
                className="size-4 accent-spot-500"
                checked={settings.autoAnswer}
                onChange={(e) => update({ autoAnswer: e.target.checked })}
              />
              Répondre automatiquement aux questions détectées
            </label>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 flex items-center gap-2 font-medium">
            <KeyRound className="size-4" /> Clés API (serveur)
          </h2>
          <p className="mb-4 text-sm text-stone-600">
            Les clés restent côté serveur, dans <code className="rounded bg-stone-100 px-1">.env.local</code>. Elles ne sont jamais
            envoyées au navigateur.
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
              <span>
                <code>ANTHROPIC_API_KEY</code> — réponses, analyse de CV et d&apos;écran, documents
              </span>
              {status ? <Badge tone={status.anthropic ? "green" : "red"}>{status.anthropic ? "OK" : "absente"}</Badge> : null}
            </li>
            <li className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2">
              <span>
                <code>DEEPGRAM_API_KEY</code> — transcription temps réel (facultatif)
              </span>
              {status ? <Badge tone={status.deepgram ? "green" : "neutral"}>{status.deepgram ? "OK" : "non configurée"}</Badge> : null}
            </li>
          </ul>
          {status && !status.anthropic && (
            <Alert tone="warn" className="mt-4">
              Copiez <code>.env.example</code> en <code>.env.local</code>, ajoutez votre clé puis relancez <code>npm run dev</code>. Si
              vous êtes connecté via <code>ant auth login</code>, les requêtes fonctionneront quand même.
            </Alert>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 font-medium">Vos données</h2>
          <p className="mb-4 text-sm text-stone-600">
            Profil, transcriptions, réponses, documents et candidatures sont stockés dans ce navigateur (IndexedDB). Les fichiers
            audio ne sont jamais enregistrés.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () =>
                downloadFile(
                  `souffleur-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(await exportAll(), null, 2),
                  "application/json",
                )
              }
            >
              <Download className="size-4" /> Exporter tout
            </Button>
            <Button variant="secondary" onClick={() => importRef.current?.click()}>
              <Upload className="size-4" /> Importer
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (!confirm("Remplacer toutes les données actuelles par celles de cette sauvegarde ?")) return;
                try {
                  await importAll(JSON.parse(await file.text()));
                  toast("Sauvegarde importée.");
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Import impossible.", "error");
                }
              }}
            />
            <Button
              variant="dangerGhost"
              onClick={async () => {
                if (!confirm("Effacer définitivement toutes vos données Souffleur de ce navigateur ?")) return;
                await wipeAll();
                toast("Toutes les données ont été effacées.");
              }}
            >
              <Trash2 className="size-4" /> Tout effacer
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
