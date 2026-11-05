import { fallbackParams, jsonError, resolveModel, streamTextResponse } from "@/server/claude";
import { CV_SYSTEM, LETTER_SYSTEM, profileToText } from "@/server/prompts";
import { DocumentRequestSchema } from "@/server/schemas";
import { LANGUAGES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = DocumentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Collez une offre d'emploi d'au moins quelques lignes.");
  const body = parsed.data;
  if (!body.profile) return jsonError("Importez d'abord votre CV dans « Profil ».");
  const model = resolveModel(body.model);

  const prompt = [
    `<candidate_profile>\n${profileToText(body.profile)}\n</candidate_profile>`,
    `<job_offer>\nEntreprise : ${body.company || "(non précisée)"}\nPoste : ${body.jobTitle || "(non précisé)"}\n\n${body.jobDescription}\n</job_offer>`,
    body.extra ? `<candidate_instructions>\n${body.extra}\n</candidate_instructions>` : "",
    `Write it in ${LANGUAGES[body.language].promptName}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return streamTextResponse(
    {
      model,
      max_tokens: 16000,
      ...fallbackParams(model),
      output_config: { effort: "medium" },
      system: body.kind === "cv" ? CV_SYSTEM : LETTER_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    },
    request,
  );
}
