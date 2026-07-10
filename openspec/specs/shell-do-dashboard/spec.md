# Spec: Shell do Dashboard

## Purpose

Define a estrutura de shell comum para todas as telas autenticadas do dashboard, incluindo o layout com sidebar e topbar, a identificação do usuário na topbar, e as diretrizes de design system distintas da landing page pública.

## Requirements

### Requirement: Shell autenticado padrão para todas as telas do dashboard
Toda página dentro do grupo de rotas autenticadas SHALL ser renderizada dentro de um shell comum contendo sidebar, topbar e uma área de conteúdo com cabeçalho de página padronizado.

#### Scenario: Usuário autenticado acessa qualquer página do dashboard
- **WHEN** um usuário autenticado navega para uma página dentro de `(dashboard)`
- **THEN** a página é renderizada com sidebar e topbar visíveis ao redor do conteúdo

### Requirement: Topbar com identificação do usuário e ação de sair
A topbar SHALL exibir o nome/e-mail do usuário logado e uma ação para encerrar a sessão.

#### Scenario: Usuário aciona sign-out pela topbar
- **WHEN** um usuário autenticado aciona a opção de sair no menu da topbar
- **THEN** o sistema encerra a sessão e redireciona para a tela de login

### Requirement: Design system de dashboard distinto da identidade da landing page
Os componentes visuais do dashboard SHALL usar a paleta de marca da Camu com uma linguagem visual densa e utilitária (bordas finas, raios moderados), sem reutilizar os estilos "Sticker Pop" (bordas grossas, sombras de sticker) da landing page pública.

#### Scenario: Renderização de um componente de card no dashboard
- **WHEN** um card é renderizado em qualquer tela do dashboard
- **THEN** ele usa bordas finas e raio moderado, sem sombra estilo sticker nem borda de 3px
