import type { NextRequest } from "next/server";

// Next.js (dev, Turbopack) normaliza request.url/request.nextUrl.href para
// "localhost:<porta>" independentemente do host real usado pelo cliente
// (ex.: 127.0.0.1) — só os headers Host/X-Forwarded-Host preservam o valor
// correto. Usar request.url/nextUrl como base para redirecionar quebra a
// continuidade de cookies host-only (sem Domain=) quando o cliente acessou
// por um host diferente de "localhost".
export function resolveRequestOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return `${request.nextUrl.protocol}//${host}`;
}
