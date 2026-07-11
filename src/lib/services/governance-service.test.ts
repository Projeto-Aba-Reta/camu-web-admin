import { describe, it, expect, vi } from "vitest";
import { GovernanceService, calculateCeilingPercentage } from "./governance-service";
import type { Repositories } from "@/lib/repositories";
import { TitularRequiredForMeiError } from "@/lib/errors/domain-errors";
import type { LegalEntityStatus } from "@/types/governance";

type GovernanceRepositories = Pick<
  Repositories,
  | "partnershipAgreements"
  | "capitalContributions"
  | "legalEntityStatus"
  | "legalMigrationTriggers"
  | "revenueSnapshots"
  | "decisionLogEntries"
  | "auditLog"
>;

function makeRepositories(
  overrides: Partial<GovernanceRepositories> = {},
): GovernanceRepositories {
  return {
    partnershipAgreements: { getCurrent: vi.fn(), listHistory: vi.fn(), create: vi.fn() },
    capitalContributions: { listAll: vi.fn(), listByPartner: vi.fn(), create: vi.fn() },
    legalEntityStatus: { getCurrent: vi.fn(), listHistory: vi.fn(), create: vi.fn() },
    legalMigrationTriggers: { listAll: vi.fn(), updateStatus: vi.fn() },
    revenueSnapshots: {
      listAll: vi.fn(),
      findByMonth: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      getCeilingForYear: vi.fn(),
      upsertCeilingParameter: vi.fn(),
      getCeilingStatus: vi.fn(),
    },
    decisionLogEntries: { listAll: vi.fn(), create: vi.fn() },
    auditLog: { record: vi.fn().mockResolvedValue(undefined), listRecent: vi.fn() },
    ...overrides,
  } as unknown as GovernanceRepositories;
}

describe("GovernanceService.recordLegalEntityStatus", () => {
  it("rejeita entity_type = mei sem titular", async () => {
    const repositories = makeRepositories();
    const service = new GovernanceService(repositories);

    await expect(
      service.recordLegalEntityStatus({ entityType: "mei", createdBy: null }),
    ).rejects.toThrow(TitularRequiredForMeiError);

    expect(repositories.legalEntityStatus.create).not.toHaveBeenCalled();
  });

  it("aceita entity_type = mei com titular", async () => {
    const created: LegalEntityStatus = {
      id: "status-1",
      entityType: "mei",
      cnpj: null,
      titularProfileId: "partner-1",
      validFrom: "2026-07-10T00:00:00.000Z",
      createdBy: null,
    };
    const repositories = makeRepositories({
      legalEntityStatus: {
        getCurrent: vi.fn(),
        listHistory: vi.fn(),
        create: vi.fn().mockResolvedValue(created),
      },
    });
    const service = new GovernanceService(repositories);

    const result = await service.recordLegalEntityStatus({
      entityType: "mei",
      titularProfileId: "partner-1",
      createdBy: null,
    });

    expect(result).toEqual(created);
    expect(repositories.legalEntityStatus.create).toHaveBeenCalledOnce();
  });

  it("aceita entity_type = me sem titular", async () => {
    const created: LegalEntityStatus = {
      id: "status-2",
      entityType: "me",
      cnpj: null,
      titularProfileId: null,
      validFrom: "2026-07-10T00:00:00.000Z",
      createdBy: null,
    };
    const repositories = makeRepositories({
      legalEntityStatus: {
        getCurrent: vi.fn(),
        listHistory: vi.fn(),
        create: vi.fn().mockResolvedValue(created),
      },
    });
    const service = new GovernanceService(repositories);

    const result = await service.recordLegalEntityStatus({ entityType: "me", createdBy: null });
    expect(result).toEqual(created);
  });
});

describe("calculateCeilingPercentage", () => {
  it("com histórico parcial (menos de 12 meses), soma apenas os meses existentes", () => {
    const result = calculateCeilingPercentage([1000, 2000, 3000], 10000);
    expect(result).toBeCloseTo(0.6);
  });

  it("com histórico completo de 12 meses, soma os 12 valores", () => {
    const revenues = Array.from({ length: 12 }, () => 1000);
    const result = calculateCeilingPercentage(revenues, 10000);
    expect(result).toBeCloseTo(1.2);
  });

  it("com mais de 12 lançamentos, considera só os 12 primeiros (mais recentes)", () => {
    const revenues = Array.from({ length: 15 }, () => 1000);
    const result = calculateCeilingPercentage(revenues, 10000);
    expect(result).toBeCloseTo(1.2);
  });

  it("retorna null quando o teto configurado é zero", () => {
    expect(calculateCeilingPercentage([100], 0)).toBeNull();
  });

  it("retorna 0 quando não há nenhum lançamento", () => {
    expect(calculateCeilingPercentage([], 10000)).toBe(0);
  });
});
