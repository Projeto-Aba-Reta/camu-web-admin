-- Catálogo: bucket de Storage para fotos de peça e policies de acesso.
-- Ver openspec/changes/catalogo-telas/design.md, decisão 4: upload direto ao
-- Storage via URL assinada, sem repassar o binário pelo servidor Next.js.

-- product-media: fotos de peças do catálogo autoral (ver Requirement
-- "Upload de foto vinculada a uma peça" em gestao-de-midia-de-peca). Leitura
-- pública (URLs de foto usadas na listagem/detalhe da peça); escrita
-- restrita por policy. Sem `comment on` aqui: a migration roda como
-- `postgres`, que não é dono de storage.buckets (owner é
-- supabase_storage_admin) e não tem permissão para comentar a coluna.
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

-- Mesma regra de escrita de product_media (Owner/Sócio/Produção). Leitura
-- pública dispensa policy de select — bucket é public=true.
create policy "product_media_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-media'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );

create policy "product_media_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'product-media'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  )
  with check (
    bucket_id = 'product-media'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );

create policy "product_media_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-media'
    and (public.is_socio_or_owner() or public.has_role('producao'))
  );
