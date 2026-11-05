"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Briefcase, ExternalLink, Mic, Plus, Trash2, X } from "lucide-react";
import { useState, type DragEvent } from "react";
import { useToast } from "@/components/Toast";
import { Button, ButtonLink, EmptyState, Field, Input, PageHeader, Select, Textarea, cn, formatDate } from "@/components/ui";
import { db } from "@/lib/db";
import { APP_STATUSES, type AppStatus, type Application } from "@/lib/types";

const COLUMN_STYLE: Record<AppStatus, string> = {
  to_apply: "bg-stone-400",
  applied: "bg-sky-500",
  interview: "bg-spot-400",
  offer: "bg-emerald-500",
  rejected: "bg-red-400",
};

const blank = (): Application => ({
  company: "",
  role: "",
  url: "",
  location: "",
  status: "to_apply",
  notes: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export default function ApplicationsPage() {
  const toast = useToast();
  const apps = useLiveQuery(() => db.applications.orderBy("updatedAt").reverse().toArray());
  const [editing, setEditing] = useState<Application | null>(null);
  const [dragOver, setDragOver] = useState<AppStatus | null>(null);

  async function save() {
    if (!editing) return;
    if (!editing.company.trim() && !editing.role.trim()) return;
    const record = { ...editing, company: editing.company.trim(), role: editing.role.trim(), updatedAt: Date.now() };
    await db.applications.put(record);
    setEditing(null);
    toast("Candidature enregistrée.");
  }

  async function move(id: number, status: AppStatus) {
    await db.applications.update(id, { status, updatedAt: Date.now() });
  }

  function onDrop(e: DragEvent, status: AppStatus) {
    e.preventDefault();
    setDragOver(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (id) void move(id, status);
  }

  return (
    <div>
      <PageHeader
        title="Candidatures"
        description="Suivez vos candidatures et préparez l'entretien en un clic. Glissez une carte pour changer son statut."
        actions={
          <Button variant="spot" onClick={() => setEditing(blank())}>
            <Plus className="size-4" /> Ajouter
          </Button>
        }
      />

      {apps && apps.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="size-5" />}
          title="Aucune candidature suivie"
          description="Ajoutez les postes qui vous intéressent pour garder le fil, du premier envoi à l'offre."
          action={
            <Button variant="spot" onClick={() => setEditing(blank())}>
              <Plus className="size-4" /> Ajouter une candidature
            </Button>
          }
        />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4">
          <div className="grid min-w-[1000px] grid-cols-5 gap-4">
            {APP_STATUSES.map((col) => {
              const items = (apps ?? []).filter((a) => a.status === col.id);
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(col.id);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => onDrop(e, col.id)}
                  className={cn(
                    "flex min-h-[60vh] flex-col rounded-2xl bg-stone-100/80 p-3 transition",
                    dragOver === col.id && "bg-spot-50 ring-2 ring-spot-300",
                  )}
                >
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <span className={cn("size-2 rounded-full", COLUMN_STYLE[col.id])} />
                    <h2 className="text-sm font-medium">{col.label}</h2>
                    <span className="ml-auto text-xs text-stone-500">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((a) => (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", String(a.id))}
                        className="group cursor-grab rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-200 active:cursor-grabbing"
                      >
                        <button type="button" className="block w-full text-left" onClick={() => setEditing(a)}>
                          <p className="text-sm font-medium leading-snug">{a.role || "Poste"}</p>
                          <p className="text-sm text-stone-600">{a.company}</p>
                          {a.location && <p className="text-xs text-stone-500">{a.location}</p>}
                          <p className="mt-2 text-[11px] text-stone-400">Mis à jour {formatDate(a.updatedAt, false)}</p>
                        </button>
                        <div className="mt-2 flex items-center gap-1">
                          <ButtonLink
                            href={`/app/sessions/new?application=${a.id}`}
                            size="sm"
                            variant="ghost"
                            className="h-7! px-2! text-xs!"
                          >
                            <Mic className="size-3" /> Entretien
                          </ButtonLink>
                          {a.url && (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-ink-900"
                              aria-label="Ouvrir l'offre"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                          <Select
                            aria-label="Statut"
                            value={a.status}
                            onChange={(e) => void move(a.id!, e.target.value as AppStatus)}
                            className="ml-auto h-7! w-auto! py-0! pl-2! pr-6! text-xs!"
                          >
                            {APP_STATUSES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">{editing.id ? "Modifier" : "Nouvelle candidature"}</h2>
              <button type="button" className="rounded-lg p-1.5 hover:bg-stone-100" onClick={() => setEditing(null)} aria-label="Fermer">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Entreprise">
                  <Input autoFocus value={editing.company} onChange={(e) => setEditing({ ...editing, company: e.target.value })} />
                </Field>
                <Field label="Poste">
                  <Input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lieu">
                  <Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} />
                </Field>
                <Field label="Statut">
                  <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as AppStatus })}>
                    {APP_STATUSES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Lien de l'offre">
                <Input type="url" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://" />
              </Field>
              <Field label="Notes">
                <Textarea rows={4} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </Field>
            </div>
            <div className="mt-6 flex items-center gap-2">
              {editing.id && (
                <Button
                  variant="dangerGhost"
                  onClick={async () => {
                    if (!confirm("Supprimer cette candidature ?")) return;
                    await db.applications.delete(editing.id!);
                    setEditing(null);
                  }}
                >
                  <Trash2 className="size-4" /> Supprimer
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Annuler
                </Button>
                <Button onClick={save} disabled={!editing.company.trim() && !editing.role.trim()}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
