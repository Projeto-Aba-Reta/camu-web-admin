-- Área "minha conta" do site: o cliente entra por magic link (e-mail) e vê
-- todos os pedidos daquele e-mail — loja (orders.customer_email) e miniaturas
-- de pet (pet_miniature_requests.customer_email). Ver
-- openspec/changes / o plano de "login por magic link + acompanhamento".
--
-- A landing page (repo camu-web-landing-page) escreve/lê via service role
-- (ignora RLS). O ERP camu-web-admin é dono do schema — este arquivo é
-- REFERÊNCIA, não é migration deste repo. Aplicar no admin (ou colar no SQL
-- Editor do projeto Supabase pra testar local).
--
-- Sessão do cliente NÃO tem tabela: é um cookie httpOnly assinado com HMAC
-- (CUSTOMER_SESSION_SECRET). Só o magic link de uso único precisa de storage.

-- =============================================================================
-- 1. E-mail do cliente na encomenda de miniatura de pet
-- =============================================================================

alter table public.pet_miniature_requests
  add column if not exists customer_email text;

comment on column public.pet_miniature_requests.customer_email is
  'E-mail informado no intake do site (junto com nome e WhatsApp). Usado pra o cliente acompanhar a encomenda em /conta via magic link. Copiado pra orders.customer_email na aprovação.';

create index if not exists pet_miniature_requests_customer_email_idx
  on public.pet_miniature_requests (lower(customer_email));

-- =============================================================================
-- 2. Tokens de magic link (uso único, curta duração)
-- =============================================================================

create table if not exists public.customer_magic_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.customer_magic_tokens is
  'Magic links de login do site. O site grava sha256(token) — nunca o token cru — com validade curta (~20min) e marca consumed_at no primeiro uso. Escrita/leitura só pela service role da landing page.';

create index if not exists customer_magic_tokens_email_idx
  on public.customer_magic_tokens (lower(email));
create index if not exists customer_magic_tokens_expires_at_idx
  on public.customer_magic_tokens (expires_at);

-- =============================================================================
-- 3. Row Level Security
--    Landing page escreve via service_role (ignora RLS). Policies só governam a
--    visibilidade dentro do ERP.
-- =============================================================================

alter table public.customer_magic_tokens enable row level security;

grant select, insert, update, delete on public.customer_magic_tokens to service_role;

create policy "customer_magic_tokens_select" on public.customer_magic_tokens
  for select using (public.is_socio_or_owner());
