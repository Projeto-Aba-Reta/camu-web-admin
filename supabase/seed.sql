-- Seed local: cria um usuário owner padrão para desenvolvimento.
-- Aplicado automaticamente pelo Supabase CLI em todo `npx supabase db reset`
-- (via `make dev` na 1a vez, ou `make db-reset`). Não roda em produção.
--
-- Login: owner@camu.local / owner123456

do $$
declare
  owner_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    owner_id,
    'authenticated',
    'authenticated',
    'owner@camu.local',
    crypt('owner123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Owner"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    owner_id,
    owner_id::text,
    jsonb_build_object('sub', owner_id::text, 'email', 'owner@camu.local'),
    'email',
    now(),
    now(),
    now()
  );

  -- O trigger on_auth_user_created já populou public.profiles com
  -- user_type='member' (default); promove para owner.
  update public.profiles set user_type = 'owner' where id = owner_id;
end $$;
