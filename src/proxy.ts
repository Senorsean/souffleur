import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional password gate. Set SOUFFLEUR_PASSWORD (and optionally SOUFFLEUR_USER)
 * before exposing the app beyond localhost, otherwise anyone reaching the server
 * can spend your API credits.
 */
export function proxy(request: NextRequest) {
  const password = process.env.SOUFFLEUR_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.SOUFFLEUR_USER ?? "souffleur";
  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(":");
    if (sep >= 0 && decoded.slice(0, sep) === user && decoded.slice(sep + 1) === password) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Authentification requise", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Souffleur", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
