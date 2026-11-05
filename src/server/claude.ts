import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL, isModelId, STREAM_ERROR_MARKER, type ModelId } from "@/lib/types";

let client: Anthropic | null = null;

/** Credentials come from the environment (ANTHROPIC_API_KEY, or an `ant auth login` profile). */
export function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function resolveModel(requested: unknown): ModelId {
  if (isModelId(requested)) return requested;
  const fromEnv = process.env.SOUFFLEUR_MODEL;
  return isModelId(fromEnv) ? fromEnv : DEFAULT_MODEL;
}

type BetaStreamParams = Parameters<Anthropic["beta"]["messages"]["stream"]>[0];

/**
 * Server-side refusal fallback. Opus 5.5 and Sonnet 5.5 accept `fallbacks: "default"`
 * (re-runs a declined request on Anthropic's recommended model). Haiku 5.5 has no
 * server-side fallback, so nothing is added for it.
 */
export function fallbackParams(model: ModelId): Pick<BetaStreamParams, "betas" | "fallbacks"> {
  if (model === "claude-haiku-5-5") return {};
  return { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}

export function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Clé API Anthropic invalide ou absente. Renseignez ANTHROPIC_API_KEY dans .env.local puis relancez le serveur.";
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return "Cette clé API n'a pas accès à ce modèle.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Limite de débit atteinte chez Anthropic. Réessayez dans quelques secondes.";
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `Requête refusée par l'API : ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Impossible de joindre l'API Anthropic (réseau).";
  }
  if (error instanceof Anthropic.APIError) {
    return `Erreur API ${error.status ?? ""} : ${error.message}`;
  }
  if (error instanceof Error && error.message.includes("Could not resolve authentication")) {
    return "Aucune clé API Anthropic trouvée. Renseignez ANTHROPIC_API_KEY dans .env.local puis relancez le serveur.";
  }
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

/**
 * Streams the text deltas of a Claude response as a plain-text HTTP body.
 * Errors after the stream has started are written as STREAM_ERROR_MARKER + message.
 */
export function streamTextResponse(params: BetaStreamParams, request: Request): Response {
  const encoder = new TextEncoder();
  const stream = getClient().beta.messages.stream(params, { signal: request.signal });

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode(`${STREAM_ERROR_MARKER}Le modèle a refusé de répondre à cette demande.`));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_[réponse tronquée]_"));
        }
      } catch (error) {
        if (!request.signal.aborted) {
          controller.enqueue(encoder.encode(`${STREAM_ERROR_MARKER}${describeError(error)}`));
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by an abort
        }
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
