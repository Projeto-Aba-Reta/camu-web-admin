-- Fundação: log de auditoria e configurações do sistema, exclusivos do Owner.
-- Ver openspec/changes/fundacao-admin-features-owner/design.md, decisões 2 e 3.

-- =============================================================================
-- 1. audit_log (append-only: sem policy de update/delete, só select/insert)
-- =============================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Registro append-only de ações administrativas sensíveis. Alimentado pelos services (não por triggers), para capturar o autor autenticado da ação.';

create index audit_log_created_at_idx on public.audit_log (created_at desc);

-- =============================================================================
-- 2. system_settings (chave/valor simples, editável só pelo Owner)
-- =============================================================================

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.system_settings is 'Parâmetros globais do painel administrativo, chave/valor. Alterações são auditadas em audit_log pelo SystemSettingsService.';

-- =============================================================================
-- 3. Row Level Security
-- =============================================================================

alter table public.audit_log enable row level security;
alter table public.system_settings enable row level security;

-- audit_log: só select + insert para authenticated; sem update/delete (append-only).
grant select, insert on public.audit_log to authenticated;
grant select, insert on public.audit_log to service_role;

-- system_settings: select/insert/update para authenticated; sem delete.
grant select, insert, update on public.system_settings to authenticated;
grant select, insert, update on public.system_settings to service_role;

create policy "audit_log_select" on public.audit_log
  for select using (public.is_owner());

create policy "audit_log_insert" on public.audit_log
  for insert with check (public.is_owner());

create policy "system_settings_select" on public.system_settings
  for select using (public.is_owner());

create policy "system_settings_write" on public.system_settings
  for insert with check (public.is_owner());

create policy "system_settings_update" on public.system_settings
  for update using (public.is_owner()) with check (public.is_owner());

-- =============================================================================
-- 4. Revogação de sessões — supabase-js não expõe um método admin para
--    invalidar sessões por user_id (só signOut(jwt), que exige o token da
--    própria sessão). auth.sessions/auth.refresh_tokens são tabelas reais do
--    schema auth com FK on delete cascade entre elas; apagar as sessões do
--    usuário força a próxima renovação de token a falhar, exigindo novo
--    login. Ver openspec/changes/fundacao-admin-features-owner/design.md,
--    decisão 4 (atualizada).
-- =============================================================================

create function public.revoke_user_sessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_owner() then
    raise exception 'Apenas Owners podem revogar sessões.' using errcode = '42501';
  end if;

  delete from auth.sessions where user_id = p_user_id;
end;
$$;

grant execute on function public.revoke_user_sessions(uuid) to authenticated;

-- =============================================================================
-- 5. Parâmetros iniciais de system_settings (idempotente: on conflict do nothing)
-- =============================================================================

insert into public.system_settings (key, value) values
  ('fundacao.nome', '"Camu 3D"'),
  ('financeiro.teto_mei_anual_centavos', '8100000'),
  ('contato.padrao', '""')
on conflict (key) do nothing;
