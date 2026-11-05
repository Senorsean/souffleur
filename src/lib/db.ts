"use client";

import Dexie, { type EntityTable } from "dexie";
import type { Answer, Application, DocumentItem, Profile, Session, Utterance } from "./types";

/** Everything lives in the browser (IndexedDB). Nothing is stored on a server. */
class SouffleurDB extends Dexie {
  profile!: EntityTable<Profile, "id">;
  sessions!: EntityTable<Session, "id">;
  utterances!: EntityTable<Utterance, "id">;
  answers!: EntityTable<Answer, "id">;
  documents!: EntityTable<DocumentItem, "id">;
  applications!: EntityTable<Application, "id">;

  constructor() {
    super("souffleur");
    this.version(1).stores({
      profile: "id",
      sessions: "++id, status, createdAt, applicationId",
      utterances: "++id, sessionId, at",
      answers: "++id, sessionId, at",
      documents: "++id, kind, createdAt",
      applications: "++id, status, updatedAt",
    });
  }
}

export const db = new SouffleurDB();

export async function deleteSession(id: number) {
  await db.transaction("rw", db.sessions, db.utterances, db.answers, async () => {
    await db.utterances.where("sessionId").equals(id).delete();
    await db.answers.where("sessionId").equals(id).delete();
    await db.sessions.delete(id);
  });
}

export async function exportAll() {
  const [profile, sessions, utterances, answers, documents, applications] = await Promise.all([
    db.profile.toArray(),
    db.sessions.toArray(),
    db.utterances.toArray(),
    db.answers.toArray(),
    db.documents.toArray(),
    db.applications.toArray(),
  ]);
  return { app: "souffleur", version: 1, exportedAt: new Date().toISOString(), profile, sessions, utterances, answers, documents, applications };
}

type Backup = Awaited<ReturnType<typeof exportAll>>;

export async function importAll(data: Backup) {
  if (data?.app !== "souffleur") throw new Error("Ce fichier n'est pas une sauvegarde Souffleur.");
  await db.transaction("rw", [db.profile, db.sessions, db.utterances, db.answers, db.documents, db.applications], async () => {
    await Promise.all([
      db.profile.clear(),
      db.sessions.clear(),
      db.utterances.clear(),
      db.answers.clear(),
      db.documents.clear(),
      db.applications.clear(),
    ]);
    await db.profile.bulkPut(data.profile ?? []);
    await db.sessions.bulkPut(data.sessions ?? []);
    await db.utterances.bulkPut(data.utterances ?? []);
    await db.answers.bulkPut(data.answers ?? []);
    await db.documents.bulkPut(data.documents ?? []);
    await db.applications.bulkPut(data.applications ?? []);
  });
}

export async function wipeAll() {
  await db.delete();
  await db.open();
}
