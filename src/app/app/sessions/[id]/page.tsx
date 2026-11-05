"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LiveSession } from "@/components/session/LiveSession";
import { SessionReview } from "@/components/session/SessionReview";
import { Spinner } from "@/components/ui";
import { db } from "@/lib/db";
import type { Session } from "@/lib/types";

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const session = useLiveQuery(() => (Number.isFinite(id) ? db.sessions.get(id).then((s) => s ?? null) : null), [id]);

  if (session === undefined) {
    return (
      <div className="grid h-dvh place-items-center bg-ink-950 text-stone-400">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (session === null) {
    return (
      <div className="grid h-dvh place-items-center text-center">
        <div>
          <p className="font-medium">Session introuvable.</p>
          <Link href="/app/sessions" className="mt-2 inline-block text-sm underline">
            Retour aux entretiens
          </Link>
        </div>
      </div>
    );
  }

  const withId = session as Session & { id: number };
  return session.status === "ended" ? <SessionReview session={withId} /> : <LiveSession key={withId.id} session={withId} />;
}
