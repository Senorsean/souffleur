import { fallbackParams, jsonError, resolveModel, streamTextResponse } from "@/server/claude";
import { ANSWER_SYSTEM, answerStyle, jobToText, profileToText } from "@/server/prompts";
import { AnswerRequestSchema } from "@/server/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = AnswerRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Requête invalide : question vide ou trop longue.");
  const body = parsed.data;
  const model = resolveModel(body.model);

  const transcript = body.transcript
    .slice(-24)
    .map((t) => `${t.speaker === "interviewer" ? "Recruteur" : "Candidat"} : ${t.text}`)
    .join("\n");

  return streamTextResponse(
    {
      model,
      max_tokens: 8000,
      ...fallbackParams(model),
      // Live answers: latency matters more than depth.
      output_config: { effort: "low" },
      system: [
        { type: "text", text: ANSWER_SYSTEM },
        {
          type: "text",
          // Stable for the whole session, so it is cached after the first question.
          text: `<candidate_profile>\n${profileToText(body.profile)}\n</candidate_profile>\n\n<job_context>\n${jobToText(body.job)}\n</job_context>`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `<transcript>\n${transcript || "(vide)"}\n</transcript>\n\n<latest_question>\n${body.question}\n</latest_question>\n\n${answerStyle(body.language, body.length, body.tone)}`,
        },
      ],
    },
    request,
  );
}
