## 1. Consolidar o que já existe (não commitado)

- [ ] 1.1 Revisar e commitar o `Makefile`/`package.json` já modificados (target `seed`, `npm run seed-all`) e `scripts/seed-catalog.ts` (novo, não commitado), confirmando que refletem exatamente o pipeline descrito nesta spec
- [ ] 1.2 Confirmar que `seed-roles`, `seed-pricing`, `seed-inventory`, `seed-catalog`, `seed-governance` continuam idempotentes e na ordem correta de dependência

## 2. Estender seed-roles

- [ ] 2.1 Adicionar a role/sub-role "Ideação de Produtos" (slug `ideacao-produtos`) a `scripts/seed-roles.ts`, com um usuário de exemplo atribuído como responsável/head, seguindo o padrão das 7 roles existentes

## 3. Novo script: seed-fila-impressao

- [ ] 3.1 Criar `scripts/seed-fila-impressao.ts` (depende de `seed-catalog`/`seed-pricing` já terem rodado): cria um item `na_fila` e um item `concluido` de exemplo, este último gerando as movimentações de estoque de peça pronta e de insumo correspondentes
- [ ] 3.2 Adicionar `seed-fila-impressao` a `package.json` (script individual) e ao orquestrador (`make seed`/`seed-all`), na ordem correta (depois de `seed-catalog`)

## 4. Novo script: seed-marketing

- [ ] 4.1 Criar `scripts/seed-marketing.ts`: cria as datas comemorativas nacionais (Natal, Dia das Mães, Dia dos Pais, Black Friday, Dia dos Namorados, Páscoa, Dia das Crianças) e 1-2 posts de exemplo em status variados
- [ ] 4.2 Adicionar `seed-marketing` a `package.json` e ao orquestrador

## 5. Novo script: seed-ideacao-produtos

- [ ] 5.1 Criar `scripts/seed-ideacao-produtos.ts` (depende de `seed-roles` já ter criado a role "Ideação de Produtos"): cria a mesma lista de datas comemorativas nacionais na tabela própria dessa capability, e 1-2 ideias de produto de exemplo vinculadas, com o responsável de exemplo da nova role
- [ ] 5.2 Adicionar `seed-ideacao-produtos` a `package.json` e ao orquestrador, na ordem correta (depois de `seed-roles`)

## 6. Documentação

- [ ] 6.1 Atualizar o `README.md` (seção de setup/seed) e a saída de `make help` para refletir os novos comandos individuais e o que o orquestrador cobre
