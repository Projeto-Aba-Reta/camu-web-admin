// Reaplica as etapas do funil de pedidos e as origens de venda em um banco
// já existente.
//
// A migration vendas_funil_e_resultado já cria os dois conjuntos — o funil
// não pode existir sem etapa inicial, então isso é estrutura, não dado de
// conveniência. Este script serve para ambientes que já rodaram a migration e
// perderam (ou nunca tiveram) alguma linha, e para reintroduzir uma etapa que
// o time excluiu e quer de volta.
//
// Idempotente por `slug`: o que já existe é deixado exatamente como está.
// Renomear "Imprimindo" para "Em impressão" ou reordenar as colunas é uma
// decisão do time, e uma reexecução do seed não pode desfazê-la.

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

// Client isolado com a service_role key — mesma justificativa de
// scripts/seed-roles.ts (o módulo admin.ts importa "server-only", que lança
// erro fora do bundler do Next).
function createSeedAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const STAGES = [
  { slug: "pensando_modelagem", name: "Pensando na modelagem", sort_order: 1, color: "violet", is_initial: true, is_final: false, requires_printer: false },
  { slug: "aguardando_impressao", name: "Aguardando impressão", sort_order: 2, color: "amber", is_initial: false, is_final: false, requires_printer: false },
  { slug: "imprimindo", name: "Imprimindo", sort_order: 3, color: "blue", is_initial: false, is_final: false, requires_printer: true },
  { slug: "aguardando_embalagem", name: "Aguardando embalagem", sort_order: 4, color: "amber", is_initial: false, is_final: false, requires_printer: false },
  { slug: "embalando", name: "Embalando", sort_order: 5, color: "cyan", is_initial: false, is_final: false, requires_printer: false },
  { slug: "aguardando_envio", name: "Aguardando envio", sort_order: 6, color: "amber", is_initial: false, is_final: false, requires_printer: false },
  { slug: "enviado", name: "Enviado", sort_order: 7, color: "emerald", is_initial: false, is_final: true, requires_printer: false },
];

const ORIGINS = [
  { slug: "boca_a_boca", name: "Boca-a-boca", sort_order: 1, requires_seller: true },
  { slug: "indicacao", name: "Indicação", sort_order: 2, requires_seller: true },
  { slug: "feira_evento", name: "Feira/evento", sort_order: 3, requires_seller: false },
  { slug: "loja_propria", name: "Loja própria", sort_order: 4, requires_seller: false },
  { slug: "mercado_livre", name: "Mercado Livre", sort_order: 5, requires_seller: false },
  { slug: "shopee", name: "Shopee", sort_order: 6, requires_seller: false },
  { slug: "tiktok_shop", name: "TikTok Shop", sort_order: 7, requires_seller: false },
  { slug: "amazon", name: "Amazon", sort_order: 8, requires_seller: false },
  { slug: "shein", name: "SHEIN", sort_order: 9, requires_seller: false },
];

async function seedStages(supabase: SupabaseClient<Database>): Promise<number> {
  const { data: existing, error } = await supabase.from("order_pipeline_stages").select("slug");
  if (error) throw error;

  const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
  const missing = STAGES.filter((stage) => !existingSlugs.has(stage.slug));
  if (missing.length === 0) return 0;

  // is_initial/is_final têm índice único parcial entre as ativas: se já
  // houver uma etapa inicial, inserir outra com a flag ligada estouraria.
  const hasInitial = (existing ?? []).length > 0;
  const rows = missing.map((stage) => ({
    ...stage,
    is_initial: hasInitial ? false : stage.is_initial,
    is_final: hasInitial ? false : stage.is_final,
  }));

  const { error: insertError } = await supabase.from("order_pipeline_stages").insert(rows);
  if (insertError) throw insertError;
  return rows.length;
}

async function seedOrigins(supabase: SupabaseClient<Database>): Promise<number> {
  const { data: existing, error } = await supabase.from("sale_origins").select("slug");
  if (error) throw error;

  const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
  const missing = ORIGINS.filter((origin) => !existingSlugs.has(origin.slug));
  if (missing.length === 0) return 0;

  const { error: insertError } = await supabase.from("sale_origins").insert(missing);
  if (insertError) throw insertError;
  return missing.length;
}

async function main(): Promise<void> {
  const supabase = createSeedAdminClient();

  const createdStages = await seedStages(supabase);
  const createdOrigins = await seedOrigins(supabase);

  console.log(`Etapas do funil: ${createdStages} criada(s), ${STAGES.length - createdStages} já existiam.`);
  console.log(`Origens de venda: ${createdOrigins} criada(s), ${ORIGINS.length - createdOrigins} já existiam.`);
  console.log(
    "\nEtapas e origens são editáveis pelo time em Vendas > Configurações — nomes, ordem e cores aqui são só o ponto de partida, e uma nova execução deste seed não desfaz os ajustes.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
