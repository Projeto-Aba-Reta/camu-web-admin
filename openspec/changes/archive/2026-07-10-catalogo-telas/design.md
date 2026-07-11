## Context

O schema (`catalogo-schema`) e o motor de cálculo de preço (`precificacao-schema-motor-calculo`/`precificacao-telas`) já existem. A UI de precificação já estabeleceu o padrão de tela única com formulário + resultado, e o shell/design system já está fixado por `fundacao-sidebar-e-shell`. Este change é o primeiro a cruzar duas capabilities de domínio (catálogo e precificação) na mesma tela — o cadastro de peça precisa buscar ou disparar um cálculo de preço sem duplicar a lógica de cálculo já implementada.

## Goals / Non-Goals

**Goals:**
- Fluxo de cadastro de peça que reaproveita o cálculo de preço existente (buscar um cálculo já feito ou calcular na hora), nunca duplicando a fórmula na UI de catálogo.
- Contagem de peças ativas por categoria visível na listagem, como apoio visual ao critério de maturidade do catálogo do roadmap de negócio.
- Upload de fotos com reordenação e capa, sem processamento de imagem no cliente além do necessário para preview.
- Disponibilidade por canal com preço pré-preenchido pelo cálculo vinculado, mas editável com motivo de divergência.

**Non-Goals:**
- Reimplementar o motor de cálculo de preço na tela de catálogo — sempre delega para `pricing-service`.
- Otimização/transformação de imagem (resize, compressão) além do necessário para não estourar limite de upload — tratado como melhoria futura.
- Edição em massa de peças (bulk edit) — fora do escopo desta primeira versão.
- Fila de produção ou cruzamento com estoque — fica para `estoque-telas`.

## Decisions

### 1. Vínculo de preço como etapa dentro do próprio formulário de peça, não uma tela separada
O formulário de cadastro/edição de peça tem uma seção "Precificação" com duas opções: (a) buscar um cálculo já existente no histórico de `precificacao/historico` (autocomplete por data/porte), ou (b) abrir um formulário inline idêntico ao de `calculo-form.tsx` (reaproveitado como componente compartilhado) para calcular e salvar um novo `price_calculations` sem sair da tela de peça. **Alternativa considerada**: obrigar o usuário a ir primeiro em Financeiro > Precificação, calcular, depois voltar ao catálogo para vincular pelo ID. Rejeitada por adicionar fricção alta ao fluxo mais comum (cadastrar peça nova já com preço).

### 2. Reaproveitamento do componente de resultado de cálculo
`resultado-calculo.tsx` (de `precificacao-telas`) é promovido para um local compartilhado (ex.: `src/components/shared/` ou mantido em `precificacao` e importado) e reaproveitado tanto na tela de precificação quanto no formulário de peça — evita duas implementações divergentes do mesmo breakdown visual. **Trade-off aceito**: acopla `catalogo-telas` a um componente de `precificacao-telas`; aceitável porque ambos pertencem ao mesmo painel interno e já compartilham o mesmo backend de cálculo.

### 3. Contagem por categoria como indicador simples, não meta configurável
A listagem exibe um contador "X/20 peças ativas" por categoria, com 20 como referência fixa vinda do critério do roadmap de negócio (`fase-4-assinatura-recorrente.md`) — não um campo configurável pelo usuário nesta fase, já que o valor é uma decisão de negócio documentada, não um parâmetro operacional do dia a dia. **Alternativa considerada**: meta editável por categoria. Adiado — não há pedido explícito para isso, e criar configuração adicional aqui seria antecipar necessidade não confirmada.

### 4. Upload de foto direto para Supabase Storage via Server Action assinada
O upload usa uma Server Action que gera uma URL assinada de upload para o bucket de peças, e o client faz o upload direto ao Storage (não passa o binário pelo servidor Next.js) — mesmo padrão recomendado pelo Supabase para arquivos de mídia. Após confirmação do upload, a Server Action grava o `storage_path` em `product_media`. **Alternativa considerada**: upload via Route Handler intermediário no Next.js. Rejeitada por adicionar carga desnecessária no servidor da aplicação para simples repasse de bytes.

### 5. Reordenação de fotos por drag-and-drop com escrita otimista
A lista de fotos usa drag-and-drop (biblioteca já disponível no ecossistema shadcn/Radix) atualizando `display_order` de forma otimista na UI e persistindo em lote ao soltar — evita uma chamada de rede por posição durante o arraste.

## Risks / Trade-offs

- **[Risco]** Formulário de peça acoplado ao componente de cálculo de precificação aumenta o acoplamento entre duas áreas de domínio (Produção e Financeiro) na camada de UI. → **Mitigação**: aceito conscientemente — reflete que, no negócio real, uma peça sempre nasce de um cálculo de custo; a alternativa (duplicar a lógica) é pior.
- **[Risco]** Contador fixo "X/20" pode ficar desatualizado se o critério de negócio mudar (registrado no log de decisões do `camu-docs`). → **Mitigação**: valor isolado em uma constante nomeada (`CATALOG_MATURITY_TARGET`), fácil de ajustar sem migração de schema.
- **[Risco]** Upload direto ao Storage exige policy de bucket correta para não abrir escrita pública indevida. → **Mitigação**: task explícita de configurar a policy do bucket equivalente à de escrita de `product_media` (só `producao`/Owner/Sócio).

## Migration Plan

1. Criar o bucket de Storage para fotos de peça (fora de migration SQL — configuração de projeto Supabase) com policy correspondente.
2. Implementar as telas consumindo os services já existentes (nenhuma migration de banco além da configuração de bucket).
3. Registrar a rota de área para `producao` no registro consumido por `navegacao-por-area`.

## Open Questions

- Se o volume de fotos por peça crescer muito, avaliar CDN/otimização de entrega — não necessário na escala atual (catálogo autoral pequeno).
