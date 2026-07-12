import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, isAuthorizedCronRequest } from "./route";

describe("isAuthorizedCronRequest", () => {
  it("rejeita quando CRON_SECRET não está configurado", () => {
    expect(isAuthorizedCronRequest("Bearer qualquer-coisa", undefined)).toBe(false);
  });

  it("rejeita quando o header não bate com o segredo configurado", () => {
    expect(isAuthorizedCronRequest("Bearer errado", "segredo-certo")).toBe(false);
  });

  it("rejeita quando não há header de autorização", () => {
    expect(isAuthorizedCronRequest(null, "segredo-certo")).toBe(false);
  });

  it("autoriza quando o header bate com o segredo configurado", () => {
    expect(isAuthorizedCronRequest("Bearer segredo-certo", "segredo-certo")).toBe(true);
  });
});

describe("GET /api/cron/complete-print-queue", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "segredo-de-teste";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("responde 401 sem o segredo correto, sem tentar concluir nenhum item", async () => {
    const request = new NextRequest("http://localhost/api/cron/complete-print-queue");

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("responde 401 com um segredo incorreto", async () => {
    const request = new NextRequest("http://localhost/api/cron/complete-print-queue", {
      headers: { authorization: "Bearer segredo-errado" },
    });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
