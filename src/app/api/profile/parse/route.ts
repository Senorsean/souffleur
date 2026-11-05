import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type Anthropic from "@anthropic-ai/sdk";
import mammoth from "mammoth";
import { describeError, fallbackParams, getClient, jsonError, resolveModel } from "@/server/claude";
import { ProfileSchema } from "@/server/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 4.5 * 1024 * 1024;

const INSTRUCTIONS = `Extract the candidate's CV into the requested JSON structure.
- Copy facts exactly; never invent or embellish. Use "" or [] when a field is absent.
- Keep the CV's original language for all text.
- One experience per role (split a company into several roles if the CV does). Keep every number and result in the bullets.
- skills: individual skills and tools, deduplicated. achievements: the most notable quantified results or awards.`;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Envoi invalide.");
  const file = form.get("file");
  const pasted = form.get("text");
  const model = resolveModel(form.get("model"));

  let rawText = "";
  let sourceFileName = "";
  let content: Anthropic.Beta.BetaContentBlockParam[];

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return jsonError("Fichier trop lourd (4 Mo maximum).");
    sourceFileName = file.name;
    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type === "application/pdf" || name.endsWith(".pdf")) {
      // Claude reads PDFs natively (text and page images), so scanned CVs work too.
      content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") } },
        { type: "text", text: INSTRUCTIONS },
      ];
    } else if (name.endsWith(".docx")) {
      try {
        rawText = (await mammoth.extractRawText({ buffer })).value;
      } catch {
        return jsonError("Impossible de lire ce fichier Word. Réessayez en PDF.");
      }
      content = [{ type: "text", text: `${INSTRUCTIONS}\n\n<cv>\n${rawText}\n</cv>` }];
    } else if (name.endsWith(".doc")) {
      return jsonError("L'ancien format .doc n'est pas pris en charge : enregistrez le CV en .docx ou en PDF.");
    } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      rawText = buffer.toString("utf8");
      content = [{ type: "text", text: `${INSTRUCTIONS}\n\n<cv>\n${rawText}\n</cv>` }];
    } else {
      return jsonError("Format non pris en charge. Utilisez PDF, DOCX ou TXT.");
    }
  } else if (typeof pasted === "string" && pasted.trim().length > 30) {
    rawText = pasted.trim();
    content = [{ type: "text", text: `${INSTRUCTIONS}\n\n<cv>\n${rawText}\n</cv>` }];
  } else {
    return jsonError("Déposez un fichier ou collez le texte de votre CV.");
  }

  if (rawText && rawText.trim().length < 30) {
    return jsonError("Ce fichier ne contient presque pas de texte.");
  }

  try {
    const response = await getClient().beta.messages.parse({
      model,
      max_tokens: 16000,
      ...fallbackParams(model),
      output_config: { effort: "low", format: betaZodOutputFormat(ProfileSchema) },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return jsonError("Le modèle a refusé d'analyser ce document.", 422);
    if (response.stop_reason === "max_tokens") return jsonError("CV trop long pour être analysé en une fois.", 422);
    if (!response.parsed_output) return jsonError("Analyse du CV impossible. Réessayez.", 502);
    return Response.json({ profile: response.parsed_output, rawText, sourceFileName });
  } catch (error) {
    return jsonError(describeError(error), 502);
  }
}
