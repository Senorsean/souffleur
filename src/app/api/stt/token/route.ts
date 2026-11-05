import { jsonError } from "@/server/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints a short-lived Deepgram JWT so the browser can open the streaming
 * WebSocket without ever seeing the API key. The token only has to be valid
 * when the socket opens; the stream then stays up until it is closed.
 */
export async function POST() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return jsonError(
      "DEEPGRAM_API_KEY absente. Ajoutez-la dans .env.local ou choisissez « Navigateur » comme moteur de transcription.",
      503,
    );
  }
  try {
    const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl_seconds: 60 }),
      cache: "no-store",
    });
    if (res.status === 401) {
      return jsonError("Clé Deepgram invalide. Vérifiez DEEPGRAM_API_KEY dans .env.local.", 502);
    }
    if (res.status === 403) {
      return jsonError(
        "Cette clé Deepgram ne peut pas créer de jetons temporaires. Dans la console Deepgram (Settings → API Keys), créez une clé avec le rôle « Member » ou supérieur, mettez-la dans DEEPGRAM_API_KEY et relancez le serveur. En attendant, choisissez « Navigateur » comme transcription.",
        502,
      );
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return jsonError(`Deepgram a refusé la clé (${res.status}). ${detail.slice(0, 200)}`, 502);
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return jsonError("Réponse Deepgram inattendue.", 502);
    return Response.json({ token: data.access_token, expiresIn: data.expires_in ?? 60 });
  } catch {
    return jsonError("Impossible de joindre Deepgram.", 502);
  }
}
