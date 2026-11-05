import "server-only";
import { z } from "zod";
import { LANGUAGES, MODEL_OPTIONS, type LangCode } from "@/lib/types";

const langCodes = Object.keys(LANGUAGES) as [LangCode, ...LangCode[]];
const modelIds = MODEL_OPTIONS.map((m) => m.id) as [string, ...string[]];

/** Structured CV extraction target (all fields required, empty when unknown). */
export const ProfileSchema = z.object({
  fullName: z.string(),
  headline: z.string().describe("Current title or target role, one line"),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  summary: z.string().describe("2-4 sentence professional summary, from the CV only"),
  experiences: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      start: z.string().describe("e.g. 2021-03 or 2021"),
      end: z.string().describe("e.g. 2023-06, or 'présent'"),
      location: z.string(),
      bullets: z.array(z.string()).describe("Responsibilities and results, one per bullet, keep numbers"),
    }),
  ),
  skills: z.array(z.string()),
  achievements: z.array(z.string()).describe("Notable quantified results or awards"),
  education: z.array(z.object({ school: z.string(), degree: z.string(), year: z.string() })),
  languages: z.array(z.string()).describe("Spoken languages with level"),
  certifications: z.array(z.string()),
  links: z.array(z.string()),
});

const ProfileInput = z
  .object({
    fullName: z.string(),
    headline: z.string(),
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    summary: z.string(),
    experiences: z.array(
      z.object({
        company: z.string(),
        role: z.string(),
        start: z.string(),
        end: z.string(),
        location: z.string(),
        bullets: z.array(z.string()),
      }),
    ),
    skills: z.array(z.string()),
    achievements: z.array(z.string()),
    education: z.array(z.object({ school: z.string(), degree: z.string(), year: z.string() })),
    languages: z.array(z.string()),
    certifications: z.array(z.string()),
    links: z.array(z.string()),
  })
  .nullable();

const Job = z.object({
  company: z.string().max(300),
  role: z.string().max(300),
  jobDescription: z.string().max(40_000),
  notes: z.string().max(10_000),
});

export const AnswerRequestSchema = z.object({
  model: z.enum(modelIds).optional(),
  language: z.enum(langCodes),
  length: z.enum(["short", "medium", "long"]),
  tone: z.enum(["natural", "formal", "confident"]),
  profile: ProfileInput,
  job: Job,
  transcript: z
    .array(z.object({ speaker: z.enum(["interviewer", "me"]), text: z.string().max(5_000) }))
    .max(200),
  question: z.string().min(1).max(5_000),
});

export const ScreenRequestSchema = z.object({
  model: z.enum(modelIds).optional(),
  language: z.enum(langCodes),
  image: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,/)
    .max(12_000_000),
  question: z.string().max(5_000).default(""),
  job: Job.partial().optional(),
});

export const DocumentRequestSchema = z.object({
  model: z.enum(modelIds).optional(),
  kind: z.enum(["cv", "letter"]),
  language: z.enum(langCodes),
  profile: ProfileInput,
  company: z.string().max(300),
  jobTitle: z.string().max(300),
  jobDescription: z.string().min(20).max(40_000),
  extra: z.string().max(5_000).default(""),
});
