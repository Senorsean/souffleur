"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Briefcase, FileText, Mic, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { profileCompleteness } from "@/components/ProfileEditor";
import { Alert, Badge, ButtonLink, Card, formatDate } from "@/components/ui";
import { db } from "@/lib/db";
import { useServerStatus } from "@/lib/useStatus";
import { plural } from "@/lib/utils";

export default function Dashboard() {
  const status = useServerStatus();
  const profile = useLiveQuery(() => db.profile.get("me").then((p) => p ?? null));
  const sessions = useLiveQuery(() => db.sessions.orderBy("createdAt").reverse().limit(5).toArray());
  const counts = useLiveQuery(async () => ({
    sessions: await db.sessions.count(),
    answers: await db.answers.count(),
    documents: await db.documents.count(),
    applications: await db.applications.count(),
    interviews: await db.applications.where("status").equals("interview").count(),
  }));

  const completeness = profileCompleteness(profile);
  const firstName = profile?.fullName.split(" ")[0];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">Tableau de bord</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {firstName ? `Bonjour ${firstName}` : "Bienvenue sur Souffleur"}
          </h1>
        </div>
        <ButtonLink href="/app/sessions/new" variant="spot" size="lg">
          <Plus className="size-4" /> Nouvel entretien
        </ButtonLink>
      </div>

      {status && !status.anthropic && (
        <Alert tone="warn" className="mb-6">
          Clé Anthropic non détectée côté serveur. Ajoutez <code>ANTHROPIC_API_KEY</code> dans <code>.env.local</code> (voir{" "}
          <Link href="/app/settings" className="underline">
            Réglages
          </Link>
          ).
        </Alert>
      )}

      {profile === null && (
        <Card className="mb-8 flex flex-wrap items-center gap-6 bg-ink-900! p-6 text-paper ring-ink-800!">
          <div className="grid size-12 place-items-center rounded-xl bg-spot-400 text-ink-950">
            <UserRound className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold">Commencez par votre CV</p>
            <p className="text-sm text-stone-300">
              Souffleur en extrait vos expériences, résultats et compétences pour des réponses qui vous ressemblent.
            </p>
          </div>
          <ButtonLink href="/app/profile" variant="spot">
            Importer mon CV <ArrowRight className="size-4" />
          </ButtonLink>
        </Card>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Profil complété", value: `${completeness}%`, icon: UserRound, href: "/app/profile" },
          { label: "Entretiens", value: counts?.sessions ?? "—", sub: plural(counts?.answers ?? 0, "suggestion"), icon: Mic, href: "/app/sessions" },
          { label: "Documents", value: counts?.documents ?? "—", sub: "CV et lettres", icon: FileText, href: "/app/documents" },
          {
            label: "Candidatures",
            value: counts?.applications ?? "—",
            sub: `${counts?.interviews ?? 0} en entretien`,
            icon: Briefcase,
            href: "/app/applications",
          },
        ].map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="h-full p-5 transition hover:ring-spot-300">
              <div className="flex items-center justify-between">
                <p className="text-sm text-stone-500">{s.label}</p>
                <s.icon className="size-4 text-spot-500" />
              </div>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{s.value}</p>
              {s.sub && <p className="text-xs text-stone-500">{s.sub}</p>}
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h2 className="font-medium">Derniers entretiens</h2>
            <Link href="/app/sessions" className="text-sm text-stone-500 hover:text-ink-900">
              Tout voir
            </Link>
          </div>
          {sessions && sessions.length > 0 ? (
            <ul className="divide-y divide-stone-100">
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link href={`/app/sessions/${s.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50">
                    <Mic className="size-4 text-spot-500" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.title}</span>
                    <span className="text-xs text-stone-500">{formatDate(s.startedAt ?? s.createdAt, false)}</span>
                    <Badge tone={s.status === "ended" ? "green" : s.status === "live" ? "spot" : "neutral"}>
                      {s.status === "ended" ? "Terminée" : s.status === "live" ? "En cours" : "Prête"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-stone-500">Aucun entretien pour l&apos;instant.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-medium">Avant l&apos;entretien</h2>
          <ol className="space-y-3 text-sm text-stone-600">
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-spot-100 text-xs font-semibold text-spot-700">1</span>
              Complétez votre profil avec des résultats chiffrés.
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-spot-100 text-xs font-semibold text-spot-700">2</span>
              Créez la session avec l&apos;offre d&apos;emploi collée.
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-spot-100 text-xs font-semibold text-spot-700">3</span>
              Testez micro et partage d&apos;onglet quelques minutes avant.
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-spot-100 text-xs font-semibold text-spot-700">4</span>
              Informez vos interlocuteurs si vous transcrivez l&apos;échange.
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
