-- Portes de tamanho personalizados além dos fixos P/M/G.
-- Ver openspec/changes/faixas-de-porte-personalizadas/design.md.

-- =============================================================================
-- 1. size_tiers — registro de portes: código estável, nome editável, ordem
-- =============================================================================

create table public.size_tiers (
  code       text primary key,
  label      text not null,
  sort_order integer not null,
  is_system  boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.size_tiers is
  'Portes de tamanho de uma peça. code é a identidade estável que peças e cálculos guardam; label é o nome de exibição editável; sort_order posiciona o porte na régua de tamanho (usado pela classificação automática). is_system marca P/M/G — não removíveis e com código imutável (ver design.md decisões 1 e 3).';
comment on column public.size_tiers.code is
  'Identidade estável (ex.: P, M, G, GG). Restrito a [A-Z0-9]{1,4} na camada de aplicação — nunca contém "/", que separa portes candidatos ao serializar um cálculo ambíguo (ver design.md decisão 4).';

-- P/M/G como portes de sistema. Ordem com folga (10/20/30) para intercalar
-- portes personalizados no meio depois.
insert into public.size_tiers (code, label, sort_order, is_system) values
  ('P', 'Pequena', 10, true),
  ('M', 'Média',   20, true),
  ('G', 'Grande',  30, true)
on conflict (code) do nothing;

-- =============================================================================
-- 2. Abre size_tier_ranges e products para portes além de P/M/G
-- =============================================================================

-- Remove o conjunto fechado P/M/G; a integridade passa a ser a FK abaixo
-- (size_tier_ranges) e a validação na camada de serviço (products).
alter table public.size_tier_ranges drop constraint if exists size_tier_ranges_tier_check;
alter table public.products drop constraint if exists products_size_tier_check;

-- Todos os valores existentes de size_tier_ranges.tier são portes válidos
-- (P/M/G), então a FK entra sem backfill e passa a barrar faixa para porte
-- inexistente.
alter table public.size_tier_ranges
  add constraint size_tier_ranges_tier_fkey
  foreign key (tier) references public.size_tiers (code);

-- products.size_tier NÃO recebe FK: é nullable/legada e uma FK exigiria
-- validação retroativa. A integridade do porte da peça é garantida na escrita
-- pelo CatalogService (ver design.md decisão 1).

-- =============================================================================
-- 3. Row Level Security — mesma regra de size_tier_ranges
-- =============================================================================

alter table public.size_tiers enable row level security;

grant select, insert, update, delete on public.size_tiers to authenticated, service_role;

-- Leitura ampla (Owner/Sócio/Financeiro/Produção); escrita restrita a
-- Owner/Sócio/Financeiro.
create policy "size_tiers_select" on public.size_tiers
  for select using (
    public.is_socio_or_owner() or public.has_role('financeiro') or public.has_role('producao')
  );

create policy "size_tiers_insert" on public.size_tiers
  for insert with check (public.is_socio_or_owner() or public.has_role('financeiro'));

create policy "size_tiers_update" on public.size_tiers
  for update using (public.is_socio_or_owner() or public.has_role('financeiro'))
  with check (public.is_socio_or_owner() or public.has_role('financeiro'));

create policy "size_tiers_delete" on public.size_tiers
  for delete using (public.is_socio_or_owner() or public.has_role('financeiro'));

-- =============================================================================
-- 4. Proteção dos portes de sistema (P/M/G)
-- =============================================================================

-- Barra remoção e alteração de código de porte de sistema no próprio banco —
-- a UI já não oferece essas ações, mas a garantia fica na fronteira de dados,
-- não só na aplicação.
create or replace function public.protect_system_size_tiers()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_system then
      raise exception 'Porte de sistema "%" não pode ser removido.', old.code;
    end if;
    return old;
  end if;

  -- UPDATE: código e flag de sistema são imutáveis para portes de sistema.
  if old.is_system then
    if new.code <> old.code then
      raise exception 'O código de um porte de sistema não pode ser alterado.';
    end if;
    if new.is_system <> old.is_system then
      raise exception 'A marcação de porte de sistema não pode ser alterada.';
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_system_size_tiers_trigger
  before update or delete on public.size_tiers
  for each row execute function public.protect_system_size_tiers();
