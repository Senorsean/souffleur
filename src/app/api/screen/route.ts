import { fallbackParams, jsonError, resolveModel, streamTextResponse } from "@/server/claude";
import { SCREEN_SYSTEM } from "@/server/prompts";
import { ScreenRequestSchema } from "@/server/schemas";
import { LANGUAGES } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = ScreenRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Capture d'écran invalide ou trop lourde.");
  const body = parsed.data;
  const model = resolveModel(body.model);

  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(body.image);
  if (!match) return jsonError("Format d'image non supporté.");
  const mediaType = match[1] as "image/png" | "image/jpeg" | "image/webp";

  const context = [
    body.job?.role ? `Poste visé : ${body.job.role}` : "",
    body.job?.company ? `Entreprise : ${body.job.company}` : "",
    body.question ? `Précision du candidat : ${body.question}` : "",
    `Write the explanation in ${LANGUAGES[body.language].promptName}; keep code identifiers in English.`,
  ]
    .filter(Boolean)
    .join("\n");

  return streamTextResponse(
    {
      model,
      max_tokens: 16000,
      ...fallbackParams(model),
      output_config: { effort: "medium" },
      system: SCREEN_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: match[2] } },
            { type: "text", text: context },
          ],
        },
      ],
    },
    request,
  );
}
