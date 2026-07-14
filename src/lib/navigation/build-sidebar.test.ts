// Manual test cases for buildSidebar.
// Install vitest (npm i -D vitest) and add "test": "vitest" to package.json to run.
import { describe, it, expect } from "vitest";
import { buildSidebar } from "./build-sidebar";
import type { CurrentUser, Role } from "@/types/auth";

const makeUser = (overrides: Partial<CurrentUser>): CurrentUser => ({
  id: "u1",
  email: "test@example.com",
  fullName: "Test User",
  userType: "member",
  status: "active",
  roles: [],
  subRoles: [],
  ...overrides,
});

const financeiro: Role = {
  id: "r1",
  name: "Financeiro",
  slug: "financeiro",
  description: null,
  icon: null,
};

const producao: Role = {
  id: "r2",
  name: "Produção",
  slug: "producao",
  description: null,
  icon: null,
};

const societario: Role = {
  id: "r3",
  name: "Societário",
  slug: "societario",
  description: null,
  icon: null,
};

// Reserva de nome: o domínio de vendas por canal ainda não tem tela, então
// `vendas` não tem entrada em areaRoutes. É hoje a única role nessa situação
// — e por isso o caso de teste do item não-clicável.
const vendas: Role = {
  id: "r4",
  name: "Vendas/Marketplace",
  slug: "vendas",
  description: null,
  icon: null,
};

describe("buildSidebar", () => {
  it("Owner sem roles vê todas as roles do sistema + seção Administração", () => {
    const owner = makeUser({ userType: "owner", roles: [] });
    const sections = buildSidebar(owner, "own", [financeiro, producao]);

    const areaSection = sections.find((s) => s.id === "areas");
    expect(areaSection).toBeDefined();
    expect(areaSection!.items).toHaveLength(2);
    expect(areaSection!.items.map((i) => i.slug)).toContain("financeiro");

    const adminSection = sections.find((s) => s.id === "admin");
    expect(adminSection).toBeDefined();
  });

  it("Member com uma role vê só essa area, sem seção Administração", () => {
    const member = makeUser({ userType: "member", roles: [financeiro] });
    const sections = buildSidebar(member, "own", [financeiro, producao]);

    const areaSection = sections.find((s) => s.id === "areas");
    expect(areaSection).toBeDefined();
    expect(areaSection!.items).toHaveLength(1);
    expect(areaSection!.items[0].slug).toBe("financeiro");

    expect(sections.find((s) => s.id === "admin")).toBeUndefined();
  });

  it("Role sem rota implementada aparece sem href", () => {
    const member = makeUser({ userType: "member", roles: [vendas] });
    const sections = buildSidebar(member, "own", [vendas]);

    const item = sections
      .find((s) => s.id === "areas")!
      .items.find((i) => i.slug === "vendas")!;

    // vendas não tem entrada em areaRoutes → sem href
    expect(item.href).toBeUndefined();
  });

  it("Sócio com scope=all vê todas as roles do sistema", () => {
    const socio = makeUser({ userType: "socio", roles: [financeiro] });
    const sections = buildSidebar(socio, "all", [financeiro, producao]);

    const areaSection = sections.find((s) => s.id === "areas");
    expect(areaSection!.items).toHaveLength(2);
  });

  it("Sócio com scope=own vê apenas suas roles", () => {
    const socio = makeUser({ userType: "socio", roles: [financeiro] });
    const sections = buildSidebar(socio, "own", [financeiro, producao]);

    const areaSection = sections.find((s) => s.id === "areas");
    expect(areaSection!.items).toHaveLength(1);
    expect(areaSection!.items[0].slug).toBe("financeiro");
    expect(sections.find((s) => s.id === "admin")).toBeUndefined();
  });

  it("Home sempre aparece independente do tipo de usuário", () => {
    const member = makeUser({ userType: "member", roles: [] });
    const sections = buildSidebar(member, "own", []);

    const common = sections.find((s) => s.id === "common");
    expect(common).toBeDefined();
    expect(common!.items[0].slug).toBe("home");
  });
});
