-- Fundação: identidade (profiles) e controle de acesso (roles/sub-roles).
-- Ver openspec/changes/fundacao-schema-auth/design.md para o racional das decisões.

-- =============================================================================
-- 1. profiles
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  user_type text not null default 'member' check (user_type in ('owner', 'socio', 'member')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil 1:1 com auth.users, populado automaticamente pelo trigger on_auth_user_created.';

-- =============================================================================
-- 2. Sincronização profiles <-> auth.users
-- =============================================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_email_updated();

-- =============================================================================
-- 3. roles / sub_roles (catálogo dinâmico de áreas de negócio, sem seed)
-- =============================================================================

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sub_roles (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, slug)
);

-- =============================================================================
-- 4. user_roles / user_sub_roles (atribuições rastreáveis)
-- =============================================================================

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.user_sub_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  sub_role_id uuid not null references public.sub_roles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, sub_role_id)
);

-- Atribuir uma sub-role sempre implica a role pai: garante (upsert) o
-- user_roles correspondente para evitar inconsistência.
create function public.handle_sub_role_granted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_role_id uuid;
begin
  select role_id into parent_role_id from public.sub_roles where id = new.sub_role_id;

  insert into public.user_roles (user_id, role_id, granted_by, granted_at)
  values (new.user_id, parent_role_id, new.granted_by, new.granted_at)
  on conflict (user_id, role_id) do nothing;

  return new;
end;
$$;

create trigger on_user_sub_role_granted
  after insert on public.user_sub_roles
  for each row execute function public.handle_sub_role_granted();

-- =============================================================================
-- 5. Row Level Security
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.sub_roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_sub_roles enable row level security;

-- Tabelas expostas via API de dados só para usuários autenticados; RLS
-- restringe ainda mais o que cada um enxerga/escreve.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.roles to authenticated;
grant select, insert, update, delete on public.sub_roles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.user_sub_roles to authenticated;

-- =============================================================================
-- 6. Funções SECURITY DEFINER — contrato de autorização para todas as fases
-- =============================================================================

create function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and user_type = 'owner'
  );
$$;

create function public.is_socio_or_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and user_type in ('owner', 'socio')
  );
$$;

create function public.has_role(role_slug text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.slug = role_slug
  );
$$;

create function public.has_sub_role(sub_role_slug text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.user_sub_roles usr
    join public.sub_roles sr on sr.id = usr.sub_role_id
    where usr.user_id = auth.uid() and sr.slug = sub_role_slug
  );
$$;

-- =============================================================================
-- 7. Policies — leitura para o próprio usuário + bypass total Owner/Sócio;
--    escrita restrita a Owner (os triggers acima usam SECURITY DEFINER e
--    contornam RLS para popular profiles/user_roles automaticamente).
-- =============================================================================

create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_socio_or_owner());

create policy "profiles_insert" on public.profiles
  for insert with check (public.is_owner());

create policy "profiles_update" on public.profiles
  for update using (public.is_owner()) with check (public.is_owner());

create policy "profiles_delete" on public.profiles
  for delete using (public.is_owner());

create policy "roles_select" on public.roles
  for select using (
    public.is_socio_or_owner()
    or exists (
      select 1 from public.user_roles ur
      where ur.role_id = roles.id and ur.user_id = auth.uid()
    )
  );

create policy "roles_write" on public.roles
  for all using (public.is_owner()) with check (public.is_owner());

create policy "sub_roles_select" on public.sub_roles
  for select using (
    public.is_socio_or_owner()
    or exists (
      select 1 from public.user_sub_roles usr
      where usr.sub_role_id = sub_roles.id and usr.user_id = auth.uid()
    )
  );

create policy "sub_roles_write" on public.sub_roles
  for all using (public.is_owner()) with check (public.is_owner());

create policy "user_roles_select" on public.user_roles
  for select using (user_id = auth.uid() or public.is_socio_or_owner());

create policy "user_roles_write" on public.user_roles
  for all using (public.is_owner()) with check (public.is_owner());

create policy "user_sub_roles_select" on public.user_sub_roles
  for select using (user_id = auth.uid() or public.is_socio_or_owner());

create policy "user_sub_roles_write" on public.user_sub_roles
  for all using (public.is_owner()) with check (public.is_owner());
