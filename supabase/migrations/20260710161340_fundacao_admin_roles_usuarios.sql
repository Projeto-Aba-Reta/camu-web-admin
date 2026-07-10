-- Fundação: regra de negócio "nunca ficar sem Owner" + acesso de service_role
-- às tabelas de identidade/acesso.
-- Ver openspec/changes/fundacao-admin-roles-usuarios/design.md, decisão 3 e risco 2.

-- A migration de fundacao-schema-auth só concedeu privilégios de tabela ao
-- role `authenticated`; `service_role` bypassa RLS mas ainda precisa do GRANT
-- de base para poder ler/escrever essas tabelas. Sem isso, scripts/seed-roles.ts
-- (que usa exclusivamente o client service_role, sem sessão de usuário) falha
-- com "permission denied" ao chamar os mesmos repositórios da aplicação.
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.roles to service_role;
grant select, insert, update, delete on public.sub_roles to service_role;
grant select, insert, update, delete on public.user_roles to service_role;
grant select, insert, update, delete on public.user_sub_roles to service_role;

-- Conta quantos usuários têm user_type = 'owner'. Exposta como utilitário
-- reaproveitável (ex.: diagnósticos), além de usada por change_user_type.
create function public.count_owners()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*) from public.profiles where user_type = 'owner';
$$;

-- Único caminho permitido para alterar user_type: substitui o UPDATE direto
-- em profiles para essa coluna, pois RLS (profiles_update) sozinha não
-- consegue expressar "impede remover o último Owner" nem serializar a
-- checagem contra updates concorrentes. `for update` trava as linhas de
-- owner lidas, então duas chamadas concorrentes tentando rebaixar owners
-- diferentes serializam nessa checagem em vez de ambas passarem.
create function public.change_user_type(p_user_id uuid, p_new_type text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_type text;
  owner_count bigint;
  updated_row public.profiles;
begin
  if not public.is_owner() then
    raise exception 'Apenas Owners podem alterar o tipo de usuário.' using errcode = '42501';
  end if;

  if p_new_type not in ('owner', 'socio', 'member') then
    raise exception 'user_type inválido: %', p_new_type using errcode = '22023';
  end if;

  select user_type into current_type from public.profiles where id = p_user_id for update;
  if current_type is null then
    raise exception 'Usuário % não encontrado.', p_user_id using errcode = 'P0002';
  end if;

  if current_type = 'owner' and p_new_type <> 'owner' then
    -- FOR UPDATE não é permitido diretamente com count(*); trava as linhas
    -- de owner numa subquery e agrega o resultado já travado por fora.
    select count(*) into owner_count
    from (select id from public.profiles where user_type = 'owner' for update) as locked_owners;
    if owner_count <= 1 then
      raise exception 'Não é possível remover o último Owner do sistema.';
    end if;
  end if;

  update public.profiles set user_type = p_new_type, updated_at = now()
  where id = p_user_id
  returning * into updated_row;

  return updated_row;
end;
$$;

grant execute on function public.count_owners() to authenticated;
grant execute on function public.change_user_type(uuid, text) to authenticated;
