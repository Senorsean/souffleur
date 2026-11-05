// Types shared by the browser and the API routes. No server-only imports here.

export type LangCode = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "zh";

export const LANGUAGES: Record<
  LangCode,
  { label: string; bcp47: string; deepgram: string; promptName: string }
> = {
  fr: { label: "Français", bcp47: "fr-FR", deepgram: "fr", promptName: "French" },
  en: { label: "English", bcp47: "en-US", deepgram: "en", promptName: "English" },
  es: { label: "Español", bcp47: "es-ES", deepgram: "es", promptName: "Spanish" },
  de: { label: "Deutsch", bcp47: "de-DE", deepgram: "de", promptName: "German" },
  it: { label: "Italiano", bcp47: "it-IT", deepgram: "it", promptName: "Italian" },
  pt: { label: "Português", bcp47: "pt-PT", deepgram: "pt", promptName: "Portuguese" },
  nl: { label: "Nederlands", bcp47: "nl-NL", deepgram: "nl", promptName: "Dutch" },
  zh: { label: "中文 (普通话)", bcp47: "zh-CN", deepgram: "zh-CN", promptName: "Mandarin Chinese (Simplified)" },
};

export const MODEL_OPTIONS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "Le plus fiable (défaut)" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: "Plus rapide, moins cher" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", hint: "Le plus rapide, très économique" },
] as const;

export type ModelId = (typeof MODEL_OPTIONS)[number]["id"];
export const DEFAULT_MODEL: ModelId = "claude-opus-5-5";

export function isModelId(value: unknown): value is ModelId {
  return MODEL_OPTIONS.some((m) => m.id === value);
}

export type Speaker = "interviewer" | "me";

export interface Experience {
  company: string;
  role: string;
  start: string;
  end: string;
  location: string;
  bullets: string[];
}

export interface Education {
  school: string;
  degree: string;
  year: string;
}

export interface ProfileData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experiences: Experience[];
  skills: string[];
  achievements: string[];
  education: Education[];
  languages: string[];
  certifications: string[];
  links: string[];
}

export interface Profile extends ProfileData {
  id: "me";
  rawText: string;
  sourceFileName: string;
  updatedAt: number;
}

/** The profile without storage metadata (what the API routes receive). */
export function profileData(p: Profile): ProfileData {
  const { id: _id, rawText: _raw, sourceFileName: _src, updatedAt: _at, ...data } = p;
  return data;
}

export function emptyProfileData(): ProfileData {
  return {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    experiences: [],
    skills: [],
    achievements: [],
    education: [],
    languages: [],
    certifications: [],
    links: [],
  };
}

export type SttProvider = "deepgram" | "browser";
/** tab = audio of the video-call tab (the interviewer); mic = your microphone. */
export type AudioMode = "tab+mic" | "tab" | "mic";
export type SessionStatus = "ready" | "live" | "ended";

export interface Session {
  id?: number;
  title: string;
  company: string;
  role: string;
  jobDescription: string;
  notes: string;
  language: LangCode;
  sttProvider: SttProvider;
  audioMode: AudioMode;
  status: SessionStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  applicationId?: number;
}

export interface Utterance {
  id?: number;
  sessionId: number;
  speaker: Speaker;
  text: string;
  at: number;
}

export type AnswerKind = "answer" | "code";

export interface Answer {
  id?: number;
  sessionId: number;
  question: string;
  answer: string;
  kind: AnswerKind;
  model: string;
  at: number;
}

export type DocKind = "cv" | "letter";

export interface DocumentItem {
  id?: number;
  kind: DocKind;
  title: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  language: LangCode;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export type AppStatus = "to_apply" | "applied" | "interview" | "offer" | "rejected";

export const APP_STATUSES: { id: AppStatus; label: string }[] = [
  { id: "to_apply", label: "À postuler" },
  { id: "applied", label: "Postulé" },
  { id: "interview", label: "Entretien" },
  { id: "offer", label: "Offre" },
  { id: "rejected", label: "Refusé" },
];

export interface Application {
  id?: number;
  company: string;
  role: string;
  url: string;
  location: string;
  status: AppStatus;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export type AnswerLength = "short" | "medium" | "long";
export type AnswerTone = "natural" | "formal" | "confident";

export interface Settings {
  model: ModelId;
  answerLength: AnswerLength;
  tone: AnswerTone;
  defaultLanguage: LangCode;
  sttProvider: SttProvider;
  autoAnswer: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  model: DEFAULT_MODEL,
  answerLength: "medium",
  tone: "natural",
  defaultLanguage: "fr",
  sttProvider: "deepgram",
  autoAnswer: true,
};

/** Shape of the JSON body sent to /api/answer. */
export interface AnswerRequest {
  model: ModelId;
  language: LangCode;
  length: AnswerLength;
  tone: AnswerTone;
  profile: ProfileData | null;
  job: { company: string; role: string; jobDescription: string; notes: string };
  transcript: { speaker: Speaker; text: string }[];
  question: string;
}

/** Marker the API routes write into a text stream when something fails mid-stream. */
export const STREAM_ERROR_MARKER = "\u0000ERR:";
