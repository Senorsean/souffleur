import "server-only";
import { LANGUAGES, type AnswerLength, type AnswerTone, type LangCode, type ProfileData } from "@/lib/types";

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

export function profileToText(profile: ProfileData | null): string {
  if (!profile || !profile.fullName && profile.experiences.length === 0 && !profile.summary) {
    return "(Aucun profil fourni. Le candidat n'a pas encore importé son CV.)";
  }
  const lines: string[] = [];
  const header = [profile.fullName, profile.headline, profile.location].filter(Boolean).join(" · ");
  if (header) lines.push(header);
  if (profile.summary) lines.push(`Résumé : ${profile.summary}`);
  if (profile.experiences.length) {
    lines.push("Expériences :");
    for (const xp of profile.experiences) {
      const period = [xp.start, xp.end].filter(Boolean).join(" – ");
      lines.push(`- ${xp.role} @ ${xp.company}${period ? ` (${period})` : ""}${xp.location ? `, ${xp.location}` : ""}`);
      for (const bullet of xp.bullets) lines.push(`  • ${bullet}`);
    }
  }
  if (profile.achievements.length) lines.push(`Réalisations : ${profile.achievements.join(" | ")}`);
  if (profile.skills.length) lines.push(`Compétences : ${profile.skills.join(", ")}`);
  if (profile.education.length) {
    lines.push(
      `Formation : ${profile.education.map((e) => [e.degree, e.school, e.year].filter(Boolean).join(", ")).join(" | ")}`,
    );
  }
  if (profile.certifications.length) lines.push(`Certifications : ${profile.certifications.join(", ")}`);
  if (profile.languages.length) lines.push(`Langues : ${profile.languages.join(", ")}`);
  return clip(lines.join("\n"), 40_000);
}

export function jobToText(job: { company: string; role: string; jobDescription: string; notes: string }): string {
  const lines = [
    `Entreprise : ${job.company || "(non précisée)"}`,
    `Poste : ${job.role || "(non précisé)"}`,
  ];
  if (job.jobDescription.trim()) lines.push(`Offre d'emploi :\n${clip(job.jobDescription.trim(), 20_000)}`);
  if (job.notes.trim()) lines.push(`Notes du candidat :\n${clip(job.notes.trim(), 5_000)}`);
  return lines.join("\n");
}

const LENGTH_RULES: Record<AnswerLength, string> = {
  short: "Very short: one bold key sentence, then at most 2 bullets of under 15 words each.",
  medium: "Concise: one bold key sentence, then 2 to 4 short bullets the candidate can say out loud.",
  long: "Detailed: one bold key sentence, then up to 6 bullets, and a short example or STAR story when relevant.",
};

const TONE_RULES: Record<AnswerTone, string> = {
  natural: "Natural, warm spoken register, as a person talks in a real conversation.",
  formal: "Professional and polished register.",
  confident: "Assertive and confident register, concrete results first.",
};

/** Stable instructions for the live-answer route (kept byte-identical across requests for caching). */
export const ANSWER_SYSTEM = `You are Souffleur, an interview copilot. A job candidate (the user) is in a live interview. You receive the candidate's profile, the job context and the recent transcript. Your job: suggest what the candidate can say in reply to the interviewer's latest question.

Rules:
- Write in the first person, as the candidate, ready to be said out loud.
- Start with the answer itself. No preamble, no restating the question, no "Great question".
- Ground every claim in the candidate's profile (roles, projects, numbers, skills). Never invent an employer, a degree, a project, a date or a number. When the profile lacks the facts, give the structure of a good answer and mark the gaps as [à compléter: ...] in the answer language.
- Behavioural questions ("tell me about a time..."): use a condensed STAR shape (situation, action, measurable result).
- Technical questions: be precise and correct; add a tiny code snippet only when it helps.
- Questions about salary, availability or weaknesses: give a balanced, honest answer the candidate can adapt.
- If the latest transcript is not a question (small talk, the candidate speaking, noise), reply with one short line: a useful follow-up the candidate could say, or "—" if nothing is needed.
- The transcript comes from speech recognition and may contain errors; infer the intended question.
- Format: Markdown. First line in bold = the key message. Then short bullets. No headings.`;

export function answerStyle(language: LangCode, length: AnswerLength, tone: AnswerTone): string {
  return [
    `Answer language: ${LANGUAGES[language].promptName}.`,
    `Length: ${LENGTH_RULES[length]}`,
    `Tone: ${TONE_RULES[tone]}`,
  ].join("\n");
}

export const SCREEN_SYSTEM = `You are Souffleur, a technical interview coach. You receive a screenshot of the candidate's screen during a technical exercise (coding problem, SQL query, system design prompt, bug to fix...).

Do this:
1. **Problème** — restate in one or two sentences what is asked (read it from the screenshot).
2. **Approche** — the idea of the solution, in plain words the candidate can explain out loud, with time and space complexity when it is an algorithm.
3. **Code** — a complete, correct solution in the programming language visible on screen (default: Python), in a fenced code block, with brief comments.
4. **À dire** — 2 or 3 bullets the candidate can say to walk the interviewer through it, plus one edge case to mention.

If the screenshot shows no technical exercise, say what you see in one line and stop. If text is unreadable, say which part. Use Markdown. Keep prose short.`;

export const CV_SYSTEM = `You write ATS-friendly CVs. Using only the facts in the candidate's profile, write a one- or two-page CV tailored to the job offer.

Rules:
- Never invent experience, employers, dates, degrees, certifications or numbers. You may rephrase, reorder, merge and select.
- Mirror the offer's important keywords where the profile genuinely supports them.
- Plain structure an ATS can parse: no tables, no columns, no images, no emojis. Standard section headings.
- Markdown output only, starting with the candidate's name as a level-1 heading, then a one-line headline and contact line, then sections: Profil, Expériences professionnelles, Compétences, Formation, and Langues / Certifications when present (translate headings to the requested language).
- Experience bullets start with an action verb and show impact; quantify only with numbers present in the profile.
- Output the CV only, no commentary before or after.`;

export const LETTER_SYSTEM = `You write cover letters. Using only the facts in the candidate's profile, write a tailored cover letter for the job offer.

Rules:
- 250 to 350 words, 3 to 4 paragraphs: why this company and role, two concrete proofs from the profile matched to the offer's needs, what the candidate will bring, a short call to action.
- Never invent facts. Specific beats generic: name the company and the role.
- Markdown output only: the letter body with a greeting and sign-off with the candidate's name. No address blocks, no commentary before or after.`;
