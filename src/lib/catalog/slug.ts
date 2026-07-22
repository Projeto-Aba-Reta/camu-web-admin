// Slug da peça na URL da loja do site. Mesmo formato do CHECK de
// products.slug na migration 20260723120000 — o banco é a rede de segurança,
// esta função é a geração amigável (nome → slug) usada no cadastro.
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Peça sem nenhum caractere aproveitável (ex.: nome só com emoji) cairia num
// slug vazio, que o banco rejeita — daí o fallback.
const SLUG_FALLBACK = "peca";

export function slugify(value: string): string {
  // normalize("NFD") separa o acento da letra ("ã" -> "a" + diacrítico) para
  // que a remoção dos diacríticos preserve a letra base.
  const withoutAccents = value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const slug = withoutAccents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || SLUG_FALLBACK;
}

export function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}
