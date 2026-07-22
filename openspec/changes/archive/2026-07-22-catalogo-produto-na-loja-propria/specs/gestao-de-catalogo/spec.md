## ADDED Requirements

### Requirement: Campos de loja no cadastro de peça
A tela de cadastro/edição de peça SHALL expor os campos usados pela loja do site: `slug` (pré-preenchido a partir do nome, editável, com aviso de que trocá-lo quebra links já publicados) e o prazo de produção estimado (dias mínimo/máximo). A tela SHALL deixar explícito que a descrição da peça é o texto exibido pro cliente na loja.

#### Scenario: Slug pré-preenchido ao digitar o nome
- **WHEN** um usuário digita o nome de uma nova peça no formulário
- **THEN** a tela sugere um slug derivado do nome, que o usuário pode aceitar ou editar

#### Scenario: Aviso ao trocar o slug de peça publicada
- **WHEN** um usuário edita o slug de uma peça já publicada na loja própria
- **THEN** a tela avisa que links existentes para o slug antigo deixarão de funcionar antes de confirmar

### Requirement: Publicar na loja própria pela tela de cadastro
A tela de cadastro/edição de peça SHALL oferecer uma seção "Vender na loja própria (site)" com um controle de publicar/despublicar e o campo de preço do site, que cria ou atualiza a listagem `loja_propria` da peça. O controle de publicar SHALL ficar bloqueado, com indicação do que falta, enquanto a peça não estiver pronta (status `ativo`, slug, foto de capa e preço).

#### Scenario: Publicar peça pronta
- **WHEN** uma peça `ativo` com slug, capa e preço tem a publicação na loja própria ativada na tela
- **THEN** a tela cria/ativa a listagem `loja_propria` e passa a indicar a peça como publicada no site

#### Scenario: Publicar bloqueado por falta de capa
- **WHEN** um usuário abre a seção de loja própria de uma peça sem foto de capa
- **THEN** a tela mantém o controle de publicar desabilitado e sinaliza que falta a foto de capa

### Requirement: Indicação de peças publicadas no site na listagem
A listagem do catálogo SHALL indicar quais peças estão publicadas na loja própria (listagem `loja_propria` ativa), permitindo distinguir de relance o que está no site.

#### Scenario: Badge de publicada no site
- **WHEN** um usuário abre a listagem do catálogo
- **THEN** as peças com listagem `loja_propria` ativa exibem uma indicação de que estão publicadas no site
