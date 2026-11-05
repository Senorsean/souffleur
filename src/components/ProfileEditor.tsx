"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type ComponentProps } from "react";
import type { Education, Experience, ProfileData } from "@/lib/types";
import { Button, Card, Field, Input, Textarea } from "./ui";

/** Textarea bound to a string[] (one item per line, or comma separated). */
function ListText({
  value,
  onChange,
  sep,
  ...rest
}: { value: string[]; onChange: (v: string[]) => void; sep: "\n" | "," } & Omit<ComponentProps<"textarea">, "value" | "onChange">) {
  const join = (arr: string[]) => arr.join(sep === "," ? ", " : "\n");
  const joined = join(value);
  const [text, setText] = useState(joined);
  const [synced, setSynced] = useState(joined);
  if (joined !== synced) {
    // value changed from outside (e.g. a new CV was parsed)
    setSynced(joined);
    setText(joined);
  }
  return (
    <Textarea
      {...rest}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const arr = e.target.value
          .split(sep === "," ? /[,\n]/ : "\n")
          .map((s) => s.trim())
          .filter(Boolean);
        setSynced(join(arr));
        onChange(arr);
      }}
    />
  );
}

const emptyExperience = (): Experience => ({ company: "", role: "", start: "", end: "", location: "", bullets: [] });
const emptyEducation = (): Education => ({ school: "", degree: "", year: "" });

export function ProfileEditor({ value, onChange }: { value: ProfileData; onChange: (v: ProfileData) => void }) {
  const set = <K extends keyof ProfileData>(key: K, v: ProfileData[K]) => onChange({ ...value, [key]: v });
  const setXp = (i: number, patch: Partial<Experience>) =>
    set("experiences", value.experiences.map((xp, j) => (j === i ? { ...xp, ...patch } : xp)));
  const setEdu = (i: number, patch: Partial<Education>) =>
    set("education", value.education.map((ed, j) => (j === i ? { ...ed, ...patch } : ed)));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 font-medium">Identité</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom complet">
            <Input value={value.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Camille Martin" />
          </Field>
          <Field label="Titre">
            <Input value={value.headline} onChange={(e) => set("headline", e.target.value)} placeholder="Product Manager senior" />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <Input value={value.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Localisation">
            <Input value={value.location} onChange={(e) => set("location", e.target.value)} placeholder="Lyon, France" />
          </Field>
          <Field label="Liens" hint="LinkedIn, GitHub, portfolio… séparés par des virgules">
            <ListText sep="," rows={1} value={value.links} onChange={(v) => set("links", v)} />
          </Field>
        </div>
        <Field label="Résumé" className="mt-4">
          <Textarea rows={4} value={value.summary} onChange={(e) => set("summary", e.target.value)} />
        </Field>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Expériences</h2>
          <Button size="sm" variant="secondary" onClick={() => set("experiences", [...value.experiences, emptyExperience()])}>
            <Plus className="size-4" /> Ajouter
          </Button>
        </div>
        {value.experiences.length === 0 && <p className="text-sm text-stone-500">Aucune expérience pour l&apos;instant.</p>}
        <div className="space-y-4">
          {value.experiences.map((xp, i) => (
            <div key={i} className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Poste">
                  <Input value={xp.role} onChange={(e) => setXp(i, { role: e.target.value })} />
                </Field>
                <Field label="Entreprise">
                  <Input value={xp.company} onChange={(e) => setXp(i, { company: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Début">
                    <Input value={xp.start} onChange={(e) => setXp(i, { start: e.target.value })} placeholder="2021-03" />
                  </Field>
                  <Field label="Fin">
                    <Input value={xp.end} onChange={(e) => setXp(i, { end: e.target.value })} placeholder="présent" />
                  </Field>
                </div>
                <Field label="Lieu">
                  <Input value={xp.location} onChange={(e) => setXp(i, { location: e.target.value })} />
                </Field>
              </div>
              <Field label="Missions et résultats" hint="Une ligne par point. Gardez les chiffres." className="mt-3">
                <ListText sep={"\n"} rows={4} value={xp.bullets} onChange={(v) => setXp(i, { bullets: v })} />
              </Field>
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="dangerGhost"
                  onClick={() => set("experiences", value.experiences.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" /> Retirer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-medium">Compétences & réalisations</h2>
          <Field label="Compétences" hint="Séparées par des virgules">
            <ListText sep="," rows={4} value={value.skills} onChange={(v) => set("skills", v)} />
          </Field>
          <Field label="Réalisations clés" hint="Une par ligne, idéalement chiffrée" className="mt-4">
            <ListText sep={"\n"} rows={4} value={value.achievements} onChange={(v) => set("achievements", v)} />
          </Field>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-medium">Langues & certifications</h2>
          <Field label="Langues" hint="Ex. Anglais (C1), Espagnol (B2)">
            <ListText sep="," rows={2} value={value.languages} onChange={(v) => set("languages", v)} />
          </Field>
          <Field label="Certifications" className="mt-4">
            <ListText sep="," rows={2} value={value.certifications} onChange={(v) => set("certifications", v)} />
          </Field>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Formation</h2>
          <Button size="sm" variant="secondary" onClick={() => set("education", [...value.education, emptyEducation()])}>
            <Plus className="size-4" /> Ajouter
          </Button>
        </div>
        <div className="space-y-3">
          {value.education.map((ed, i) => (
            <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_120px_auto]">
              <Field label="Diplôme">
                <Input value={ed.degree} onChange={(e) => setEdu(i, { degree: e.target.value })} />
              </Field>
              <Field label="École">
                <Input value={ed.school} onChange={(e) => setEdu(i, { school: e.target.value })} />
              </Field>
              <Field label="Année">
                <Input value={ed.year} onChange={(e) => setEdu(i, { year: e.target.value })} />
              </Field>
              <Button
                variant="dangerGhost"
                aria-label="Retirer la formation"
                onClick={() => set("education", value.education.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {value.education.length === 0 && <p className="text-sm text-stone-500">Aucune formation pour l&apos;instant.</p>}
        </div>
      </Card>
    </div>
  );
}

export function profileCompleteness(p: ProfileData | null | undefined): number {
  if (!p) return 0;
  const checks = [
    Boolean(p.fullName),
    Boolean(p.headline),
    Boolean(p.summary),
    p.experiences.length > 0,
    p.experiences.some((x) => x.bullets.length >= 2),
    p.skills.length >= 5,
    p.achievements.length > 0,
    p.education.length > 0,
    p.languages.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
