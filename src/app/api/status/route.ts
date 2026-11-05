import { resolveModel } from "@/server/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
    deepgram: Boolean(process.env.DEEPGRAM_API_KEY),
    defaultModel: resolveModel(undefined),
  });
}
