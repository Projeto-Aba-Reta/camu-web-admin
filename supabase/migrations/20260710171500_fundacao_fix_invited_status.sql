-- Fix: profiles.status nunca era gravado como 'invited' na prática —
-- handle_new_user() sempre usava o default da coluna ('active'), então a
-- feature "Convites & Sessões" (fundacao-admin-features-owner) não tinha
-- nenhum usuário para listar como convite pendente. Descoberto ao testar o
-- fluxo de convite ponta a ponta durante a implementação dessa change.
--
-- GoTrue marca `invited_at` em auth.users quando o convite é enviado via
-- admin.inviteUserByEmail e só preenche `email_confirmed_at` quando o
-- usuário aceita o convite (define senha). Usamos esses dois campos para
-- decidir o status inicial e para reativar o perfil quando o convite é
-- aceito.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, status)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case
      when new.invited_at is not null and new.email_confirmed_at is null then 'invited'
      else 'active'
    end
  );
  return new;
end;
$$;

-- GoTrue popula `invited_at` numa UPDATE separada da INSERT original (a
-- trigger AFTER INSERT via handle_new_user vê a linha ainda sem invited_at),
-- então essa trigger também precisa reagir à chegada de invited_at, além de
-- reagir à confirmação do convite.
create function public.handle_user_invite_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invited_at is not null and old.invited_at is null and new.email_confirmed_at is null then
    update public.profiles set status = 'invited', updated_at = now()
    where id = new.id and status = 'active';
  elsif new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set status = 'active', updated_at = now()
    where id = new.id and status = 'invited';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_invite_accepted
  after update on auth.users
  for each row execute function public.handle_user_invite_accepted();
