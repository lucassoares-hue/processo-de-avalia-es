# Resumo Técnico — Painel de Avaliações SGGE

> Documento de contexto para continuar o desenvolvimento em uma nova conversa.
> Projeto local em `C:\Users\lucas.diego\Documents\projeto-avaliacoes`, sem controle de versão git.

## 1. Estrutura do projeto

Stack: HTML/CSS/JS puro (vanilla), sem frameworks nem build tools.

- `index.html` — toda a estrutura de telas (login, sidebar, header, e as 4 abas).
- `style.css` — todo o CSS do painel (um único arquivo, organizado por seções/comentários).
- `script.js` — toda a lógica JS (um único arquivo, ~4500+ linhas).
- Dados vêm de uma API REST (Google Apps Script) — ver seção 3.
- Preview local: servidor estático Python (`python -m http.server`) via `.claude/launch.json`, nome `static-server`, porta 5500.

Fluxo de telas: Splash → Login (usuário/senha, localStorage `usuarioLogadoSGGE`) → App Shell (sidebar + header + conteúdo da aba ativa).

**Sidebar — largura e quebra de texto (2026-07-29)**: nomes longos ("Assinatura Coordenador", "Arte-finalização e Envio") apareciam cortados com reticências. `.sidebar` passou de 220px → **250px** (`.app-body { margin-left: 250px }` acompanhando); `.sidebar-btn` de altura fixa 42px para `min-height: 44px` + `height: auto` (cresce se o texto quebrar em 2 linhas); `.sidebar-text` perdeu `white-space: nowrap`/`overflow: hidden`/`text-overflow: ellipsis` (agora `white-space: normal`, `overflow: visible`, `line-height: 1.25`, `flex: 1; min-width: 0` para quebrar linha corretamente dentro do flex). Só CSS — não mexeu em `data-tab`, navegação, ícones ou seções. Os breakpoints responsivos (900px = só ícones, 600px = menu horizontal no topo) continuam ocultando `.sidebar-text` como antes, então não são afetados.

**Alinhamento à esquerda (mesmo dia)**: com o texto passando a quebrar em 2 linhas, ficou visível que `.sidebar-btn` é um `<button>` — cujo estilo padrão do navegador inclui `text-align: center`, herdado pelas linhas quebradas de `.sidebar-text` mesmo com o ícone corretamente à esquerda via flex. Corrigido com `text-align: left` explícito em `.sidebar-btn` e `.sidebar-text`, mais `justify-content: flex-start` no botão (redundante com o padrão do flex, mas explícito para não depender do default) e `flex-shrink: 0` em `.sidebar-btn img/svg`. O modo compacto (≤900px, só ícone) continua com `justify-content: center` próprio, sem alteração.

## 2. Abas do menu lateral (`data-tab`)

**Menu reorganizado (2026-07-30)** — o menu lateral agora tem só **4 itens principais**: Geral, "Processo de Produção" (grupo expansível), Banco de Provas, Indicador do Processo. 5 das abas antigas (Elaborador/Coordenador/Processo Editorial/Assinatura Coordenador/Arte-finalização e Envio) viraram **subitens recuados** dentro do grupo "Processo de Produção" — só a organização visual do menu mudou; `data-tab`, funções, cálculos, filtros e cards de cada uma continuam **exatamente os mesmos de antes** (nenhuma lógica interna foi tocada). Ver detalhes de implementação no fim desta seção.

1. **`geral`** — menu principal diz "Geral"; agora é a **tela inicial real do sistema** (2026-07-30): mensagem de boas-vindas com o nome do usuário logado + calendário mensal de avaliações por `data_aplicacao`. `data-tab`/id (`geral-section`) continuam "geral" por herança. Função `renderizarGeralVazio()` foi **removida** (substituída por `renderizarGeral()`) — ver seção 12.15 para todos os detalhes.
2. **`elaborador`** — rótulo do menu **"Elaboração"** (subitem do grupo "Processo de Produção"; era "Elaborador" — troca de texto visual só, 2026-07-30, `data-tab`/funções/variáveis internas continuam `elaborador`/`Elaborador`). Acompanhamento de encomendas por elaborador + sub-visão "Indicadores — Elaborador".
3. **`coordenador`** — rótulo do menu **"1ª Validação"** (subitem; era "Coordenador" — mesma troca de texto visual, `data-tab`/código internos continuam `coordenador`/`Coordenador`). Acompanhamento de validações por coordenador + sub-visão "Indicadores — Coordenador".
4. **`sistema-gge`** — **"Processo Editorial"** (subitem; nome visível não mudou na última troca de rótulos; internamente o `data-tab` continua `sistema-gge` e variáveis internas usam `SistemaGGE`/`PE` por herança, propositalmente mantido para não quebrar nada). Acompanha o fluxo pós-validação (diagramação e assinatura da coordenação) + sub-visão "Indicadores — Processo Editorial".
5. **`assinatura-coordenador`** — rótulo do menu **"2ª Validação"** (subitem; passou por "Assinatura Coordenador" → "Assinatura dos Coordenadores" → **"2ª Validação"** (2026-07-30) — cada troca só no texto/`title`/`aria-label` do botão do menu; `data-tab` e todo o resto do código continuam `assinatura-coordenador`/`AssCoord`). Acompanhamento do envio/assinatura/devolutiva da assinatura da coordenação — mesma estrutura e comportamento da aba Coordenador, usando `envio_assinatura_coord`/`prazo_assinatura_coord`/`devolutiva_assinatura_coord`/`observacao` + sub-visão "Indicadores — Assinatura do Coordenador" (2026-07-29) — ver seção 12.12 e 12.13.
6. **`arte-finalizacao-envio`** — "Arte-finalização e Envio" (subitem; nome visível não mudou na última troca de rótulos). Acompanha a fase final do fluxo editorial, depois da assinatura do coordenador — ver seção 12.14.
7. **`banco-provas`** — "Banco de Provas". Continua item principal do menu (fora do grupo). Lista simples (1 linha por registro, sem agrupamento) dos links de prova em branco/com gabarito de cada avaliação — ver seção 12.11.
8. **"Indicador do Processo"** — deixou de ser uma aba própria com `data-tab="indicador-processo"` e virou um **2º grupo expansível** no menu lateral (2026-07-30, mesmo padrão de "Processo de Produção"), com 3 atalhos que abrem direto nas sub-visões "Indicadores" já existentes (nenhuma é uma aba nova de verdade — ver seção 2.2): `indicador-elaborador`/`indicador-coordenador` (Elaborador/Coordenador) e `indicador-sistema` (Processo Editorial). O antigo `data-tab="indicador-processo"`/`renderizarIndicadorProcessoVazio()`/`#indicador-processo-section` foram **removidos** (o grupo em si não navega, só expande/recolhe, igual "Processo de Produção").

### 2.1 Grupo expansível "Processo de Produção" (sidebar, 2026-07-30)

Markup: `<div class="sidebar-group" id="sidebarGroupProcessoProducao">` contendo o botão de toggle (`#sidebarGroupToggleProcessoProducao`, sem `data-tab` — não navega, só expande/recolhe) e `<div class="sidebar-submenu">` com os 5 botões `.sidebar-btn.sidebar-subitem` (mesmos `data-tab` de sempre, sem `<img>` de ícone próprio — só texto recuado, `margin-left: 28px`).

- **Abrir/fechar**: `alternarGrupoProcessoProducao()` inverte o estado manual `sidebarGrupoProcessoProducaoAberto`; `atualizarEstadoGrupoProcessoProducao()` decide o estado final (`sidebarGrupoProcessoProducaoAberto || TABS_GRUPO_PROCESSO_PRODUCAO.includes(abaAtual)`) — ou seja, o grupo abre sozinho sempre que a aba ativa é uma das 5 subseções, **mesmo que o usuário nunca tenha clicado no cabeçalho**, e continua aberto manualmente depois disso até o usuário clicar de novo para fechar.
- Chamada dentro de `trocarAba()` (toda vez que a aba muda) — sincroniza classe `.open` no grupo, `aria-expanded` e destaque (`.is-active`) no cabeçalho do grupo quando a aba ativa pertence a ele.
- **CSS**: `.sidebar-submenu { display: none }` por padrão, `.sidebar-group.open .sidebar-submenu { display: flex }`; seta `.sidebar-group-arrow` gira 180° quando aberto; `.sidebar-subitem.is-active` com fundo `#2f80ed` (mais claro que o azul `#1e6fd9` do item principal ativo, para diferenciar visualmente nível 1 de nível 2).
- **Responsivo**: nos dois breakpoints que já ocultavam `.sidebar-text` (≤900px ícone-only, ≤600px barra horizontal), `.sidebar-submenu`/`.sidebar-group-arrow` também ficam `display:none` — os subitens não têm ícone próprio, então não haveria como representá-los nesses modos compactos; o botão de toggle continua visível como um ícone normal.
- **Guarda de ícone**: o loop genérico de fallback de ícone (`querySelector('.sidebar-icon')`) e o de destaque `is-active` em `trocarAba()` agora checam `if (icon) ...`/`if (icon && btn.dataset.tab) ...` antes de mexer em `icon.src`, porque os subitens não têm `<img>` — sem essa guarda, o clique em qualquer subitem lançaria `TypeError` (null).

### 2.2 Grupo expansível "Indicadores do Processo" (sidebar, 2026-07-30, renomeado na mesma data)

Mesmo padrão exato do grupo "Processo de Produção" (§2.1) — `#sidebarGroupIndicadorProcesso`/`#sidebarGroupToggleIndicadorProcesso`/`TABS_GRUPO_INDICADOR_PROCESSO`/`sidebarGrupoIndicadorProcessoAberto`/`alternarGrupoIndicadorProcesso()`/`atualizarEstadoGrupoIndicadorProcesso()` — reaproveitando as mesmas classes CSS (`.sidebar-group`/`.sidebar-group-toggle`/`.sidebar-submenu`/`.sidebar-subitem`, todas por classe, não por id, então **zero CSS novo** foi necessário). `atualizarEstadoGrupoIndicadorProcesso()` é chamada logo ao lado de `atualizarEstadoGrupoProcessoProducao()` dentro de `trocarAba()`; o toggle tem seu próprio `if (btn.id === 'sidebarGroupToggleIndicadorProcesso')` no loop de binding de clique da sidebar (mesmo local do de Processo de Produção). Texto visível do grupo: **"Indicadores do Processo"** (era "Indicador do Processo" — só o texto mudou; id/data internos continuam iguais).

**3 subitens no menu** — Elaborador, Coordenador (era "1ª Validação", renomeado de volta), Sistema — **sem duplicar nenhuma lógica de seção existente**, todos seguem o mesmo alias em `trocarAba()`: `ehAba<Seção> = nomeAba === '<aba-normal>' || nomeAba === 'indicador-<atalho>'`; quando `nomeAba` é o atalho, `visao<Seção>` é forçado para `'indicadores'` e a sub-visão correspondente é mostrada/renderizada direto, sem passar pela tela de Acompanhamento. O botão interno "Indicadores" da aba normal (usado para alternar a subvisão por dentro) fica oculto nesse modo, pois não faz sentido ali:
- **`indicador-elaborador`** e **`indicador-coordenador`** — atalho de entrada direta na sub-visão "Indicadores" já existente das abas Elaborador/Coordenador (`viewElaboradorIndicadores`/`viewCoordenadorIndicadores`, `renderizarIndicadoresElaborador`/`renderizarIndicadoresCoordenador`).
- **`indicador-sistema`** — mesmo padrão, para a sub-visão "Indicadores — Processo Editorial" já existente (`viewProcessoEditorialIndicadores`, `renderizarIndicadoresProcessoEditorial`, ver seção 12.10): `ehAbaProcessoEditorial = nomeAba === 'sistema-gge' || nomeAba === 'indicador-sistema'`. Diferente de Elaborador/Coordenador, `renderAbaAtual()` tem o branch **unificado** (`abaAtual === 'sistema-gge' || abaAtual === 'indicador-sistema'`, mesmo `if (visaoProcessoEditorial === 'indicadores') ...`) em vez de só chamar a mesma função de sempre — porque o branch original de `sistema-gge` já decide internamente entre Acompanhamento/Indicadores checando `visaoProcessoEditorial`, então unificar garante que re-renders subsequentes (ex.: `applyFilters()`) continuem atualizando a tela de Indicadores corretamente enquanto o atalho estiver ativo.

**`indicador-segunda-validacao` (Assinatura Coordenador) — sem botão próprio no menu (2026-07-30, 2ª rodada)**: existiu brevemente como um 4º subitem "2ª Validação" na sidebar, mas foi **removido do menu** — agora só é alcançado por um botão **"2ª Validação"** (`#btnAbrirSegundaValidacaoIndCoord`, mesma classe `.header-action-btn` das antigas "Indicadores") colocado dentro da própria tela **"Indicadores — Coordenador"**, ao lado do botão de filtro (`indFilterPopoverWrapperCoord`) — visível só quando `emIndicadoresCoordenador` é verdadeiro, com `onclick` chamando `trocarAba('indicador-segunda-validacao')` diretamente. `TABS_GRUPO_INDICADOR_PROCESSO` continua incluindo `'indicador-segunda-validacao'` mesmo sem botão — só para o grupo "Indicadores do Processo" continuar abrindo/destacando quando essa tela estiver ativa (nenhum subitem individual acende, já que não existe mais botão com esse `data-tab`; aceitável, não foi pedido). O botão "← Voltar" dessa sub-visão (`btnVoltarAcompanhamentoAssCoord`, texto agora **"← Voltar para Coordenador"**) e sua guarda em `mostrarAcompanhamentoAssinaturaCoordenador()` foram atualizados para reencaminhar sempre para `'indicador-coordenador'` (não mais para `'assinatura-coordenador'`), já que esse é o único caminho de entrada possível agora — o botão "Indicadores" da aba Assinatura Coordenador (`btnIndicadoresAssCoord`) já estava permanentemente oculto desde a rodada anterior.

Para os 3 subitens do menu (Elaborador/Coordenador/Sistema): o botão "← Voltar ao acompanhamento" da sub-visão continua visível e funcional — `mostrarAcompanhamentoElaborador()`/`mostrarAcompanhamentoCoordenador()`/`mostrarAcompanhamentoProcessoEditorial()` ganharam uma guarda no topo (ex.: `if (abaAtual === 'indicador-elaborador') { trocarAba('elaborador'); return; }`) que reencaminha para a aba normal do grupo "Processo de Produção" via `trocarAba()`, mantendo `abaAtual` e o destaque do menu lateral sempre coerentes com a tela exibida (sem essa guarda, clicar em "Voltar" trocaria a tela mas deixaria o item errado destacado na sidebar).

Não altera nenhum cálculo, gráfico, card, tabela, filtro, cor ou ícone principal das seções Elaborador/Coordenador/Processo Editorial — só a forma de navegar direto até a sub-visão de Indicadores de cada uma.

Cada aba tem, no header azul escuro, um botão de filtro (ícone de funil) que abre um popover; abas Elaborador/Coordenador/Processo Editorial têm ainda um botão "Indicadores" que troca para a sub-visão de indicadores (e aí o header troca o título "Painel de Avaliações SGGE" pelo botão "← Voltar ao acompanhamento").

## 3. API

- Fonte de dados: **Google Apps Script REST API** (é a única fonte, não há backend próprio).
- Login também passa pela API (usuário/senha), com resultado salvo em `localStorage` (`usuarioLogadoSGGE`).
- **Nunca foi alterada durante todo o desenvolvimento** — todas as tarefas foram só front-end.

## 4. Campos/colunas principais do registro (linha da planilha)

Cada registro (avaliação) tem, entre outros, os campos abaixo — nomes exatamente como usados no código:

- `id`, `modulo`, `elaborador`, `coordenador`, `responsavel`, `tipo_av`, `frente` (disciplina), `ano`, `data_aplicacao`
- Fluxo Elaborador: `data_encomenda`, `devolutiva_encomenda`, `prazo_encomenda`
- Fluxo SGGE: `data_validacao_sgge`
- Fluxo Coordenador: `data_envio_coord`, `devolutiva_coord`, `prazo_coord`
- Fluxo editorial: `diagramacao`, `envio_assinatura_coord`, `fim_diagramacao`, `inicio_diagramacao`, `envio_grafica`, `data_envio_grafica`, `checklist`, `data_checklist`, `prova_em_branco`, `data_prova_em_branco`, `prova_com_gabarito`, `data_prova_com_gabarito`
- Datas no formato `dd/mm/aaaa` (parser `parseBrDate`).

### Normalizações padrão usadas em todo o projeto
- **Tipo de AV** — `normalizarTipoAvPerformance(tipoAv)`, ordem fixa `ORDEM_TIPO_AV_PERFORMANCE = ['AV1','AV2','2º CHAMADA','REC-SEM','REC-FIM']`. Variações como "2ºCHAM", "2°CHAM", "2 CHAM", "2ª CHAMADA" → `"2º CHAMADA"`; "REC SEM"/"REC-SEM" → `"REC-SEM"`; "REC FIM"/"REC-FIM" → `"REC-FIM"`.
- **Disciplina** — `normalizarNomeDisciplina(nome)` remove sufixos " 1", " 2", "(1)", "-1" etc. (ex.: "Química 1"/"Química 2" → "Química").
- **Ano/segmento pedagógico** — `normalizarAnoSegmento(ano)` extrai o número; `identificarSegmentoPorAno(ano)` classifica em `'Ensino Fundamental'` (6º–9º) ou `'Ensino Médio'` (1º–3º); `ORDEM_ANO_ESCOLAR_COORD = ['6º','7º','8º','9º','1º','2º','3º']` (ordem pedagógica).

## 5. Regras de cálculo de atraso (repetidas em vários pontos do projeto)

Regra geral de **dias de atraso** (usada tanto no fluxo Elaborador quanto Coordenador, trocando os campos):

```
Se devolutiva preenchida:
  dias = devolutiva - prazo
Se devolutiva vazia e prazo já passou:
  dias = hoje - prazo
Se devolutiva vazia e prazo não passou:
  dias = 0

Atraso só conta quando dias > 0
```

- Elaborador: `calcularAtrasoEncomendaEmDias(record)` usa `devolutiva_encomenda`/`prazo_encomenda`.
- Coordenador: `calcularDiasAtrasoCoordenador(record)` (alias `calcularAtrasoValidacaoCoordenador`) usa `devolutiva_coord`/`prazo_coord`.
- `obterDadosComAtraso(dados)` filtra só os registros com `dias > 0`.

**Média de atraso** (métrica padrão adotada em toda a seção Indicadores, substituindo "dias acumulados" onde fazia sentido):
```
média = soma dos dias de atraso positivos / quantidade de ocorrências atrasadas
```
Formatação: `formatarMediaAtrasoGrafico(valor)` — 1 casa decimal só quando houver decimal, vírgula como separador (ex.: "19,7" / "19").

## 6. Aba Elaborador — Acompanhamento

Cards de status (Encomendas, Devoluções/Prazos, Validações) + tabela de encomendas, filtráveis por popover (Módulo/Ano/Disciplina/Tipo de AV/Status) + busca + cards clicáveis como filtro rápido (`filtroRapidoElaborador`, `passaFiltroRapidoElaborador`).

## 7. Aba Elaborador — Indicadores (`viewElaboradorIndicadores`)

Acessada pelo botão "Indicadores" no header; troca o título do header por "← Voltar ao acompanhamento" e o botão de filtro do header também troca (popover próprio `#indFiltersPopover`, filtros: Módulo/Ano/Disciplina/Tipo de AV/Elaborador/Busca, estado em `indSelectFilters`).

**Layout atual (2 grids: `.indicadores-grid-top` e `.indicadores-grid-middle`, depois blocos de largura total):**

- **Linha 1** (`.indicadores-grid-top`, altura fixa 360px cada, scroll interno se necessário):
  - **Ranking de elaboradores que mais atrasam** — `renderizarGraficoBarrasHorizontal`, ordenado por **média de atraso** desc (empate: ocorrências desc, depois alfabética); até **12 itens** (`limite: 12`); texto "X,X dias médios · Y ocorr."; clicável (filtro `filtrosIndicadores.elaborador`).
  - **Disciplinas que mais atrasam** — mesmo componente, agrupado por disciplina normalizada, `semLimite: true` (scroll se necessário); clicável (`filtrosIndicadores.disciplina`).
- **Linha 2** (`.indicadores-grid-middle`, `align-items: stretch` — a coluna esquerda acompanha a altura da direita):
  - **Avaliações que mais atrasam** — layout **em blocos empilhados** próprio (`renderizarGraficoTipoAvBlocos`, classes `.tipoav-*`): nome+valor em cima, barra abaixo, ocorrências abaixo. **Ordem fixa** AV1/AV2/2º CHAM/REC-SEM/REC-FIM (não ordena por valor); sempre mostra os 5 mesmo com 0 ocorrências. Clicável (`filtrosIndicadores.tipo_av`).
  - Coluna direita (`.indicadores-side-stack`, empilha 2 cards):
    - **Distribuição por segmento** → renomeado para **"Taxa de atraso por segmento"** — donut/pizza Ensino Fundamental x Ensino Médio, **calculado só sobre encomendas com atraso** (`calcularDistribuicaoAtrasoPorSegmento`, base `obterDadosComAtraso`). Legenda com quantidade+percentual, centro do donut mostra total de atrasos ("N / atrasos"). Clicável por fatia/legenda (`filtrosIndicadores.segmento`, valores `'Ensino Fundamental'`/`'Ensino Médio'`), com tooltip nativo `<title>`. Estado vazio: "Sem atrasos no recorte atual."
    - **Anos que mais atrasam** — gráfico de colunas (`renderizarGraficoColunas`), valor no topo = **média** de atraso; clicável (`filtrosIndicadores.ano`).
- **Recorrência de atraso por elaborador** (tabela) — coluna "Dias acumulados de atraso" **trocada por "Média de atraso"**; classificação Crítico/Atenção/Controlado baseada em média (≥15/≥7 dias) + taxa (≥30%/≥15%) — badge continua existindo, mas **deixou de ser o critério de ordenação**; ordenação atual: **maior Taxa de atraso** → qtd atrasadas → média → maior individual → alfabética.
- **Performance da entrega do elaborador** (gráfico de linha, largura total) — cálculo inalterado; **cor condicional** nos pontos/rótulos/linha: valores `<= 0` (no prazo/adiantado) em azul (`--ind-azul-principal`), valores `> 0` (atraso) em vermelho (`--ind-vermelho`); classes `.perf-point--azul`/`--vermelho` e `.perf-point-label--azul`/`--vermelho`.
- **Resumo por disciplina** (tabela) — mesma troca "Dias acumulados" → "Média de atraso"; ordenação por média → taxa → pendências vencidas.

### Cards executivos (linha 1 do topo, `indicadores-resumo-grid--exec`, 5 cards — "Pendências vencidas" foi removido)
1. **Média de atraso** — `resumo.mediaAtraso`; card com **borda superior + valor em vermelho, fundo branco** (classe `.indicadores-resumo-card--media-atraso`, distinta do padrão de alerta com fundo vermelho claro).
2. **Maior atraso individual** — `resumo.maiorAtraso` dias; subtítulo agora mostra o **nome do elaborador responsável** por esse atraso (`resumo.registroMaiorAtraso.elaborador`).
3. **Maior impacto em atraso** — **mesmo elaborador que aparece em 1º no Ranking** (`resumo.porElaborador[0]`, já ordenado por média); subtítulo "X dias médios · Y ocorrência(s)".
4. **Taxa de atraso** — formato `"X (Y%)"` (quantidade + percentual, mesmo padrão de "Entregas no prazo").
5. **Entregas no prazo** — inalterado, `"X (Y%)"`.

## 8. Aba Coordenador — Acompanhamento

### Cards do topo (`#coordCardsGrid`, `.banco-cards-grid.coordenador-cards-grid`, 5 cards)
Ordem atual: **1. Pendente de Envio · 2. Enviado Para Validação · 3. Em Validação · 4. Validadas · 5. Validações Atrasadas**.

**Visual premium** (mesmo padrão "banco-card" do Processo Editorial/Assinatura Coordenador — ícone + título/subtítulo + métrica grande + "provas"): grid de **5 colunas, uma única linha no desktop** (`repeat(5, minmax(0,1fr))`, sem `grid-column: span` — cada card/wrapper ocupa 1 coluna). Responsivo: 3 colunas ≤1300px, 2 colunas ≤900px (breakpoints antigos de 6 colunas/spans removidos). O card 1 ("Pendente de Envio") continua embrulhado em `#coordCardPendenteTooltipWrapper` (dica analítica em hover, ver seção 10), ocupando normalmente 1 das 5 colunas. Cores: laranja (`.banco-card--orange`) · azul · âmbar (`.banco-card--amber`) · verde · vermelho.

**Tamanho padronizado (2026-07-29)**: o tamanho/proporção visual dos cards foi unificado entre as **3 seções** que usam o modelo "banco-card" com métrica numérica (Coordenador, Processo Editorial e Assinatura Coordenador) — mesma `min-height: 76px`, mesma cor/borda/`border-radius`, mesmo alinhamento, aplicados via seletores escopados por seção (`.coordenador-cards-grid .banco-card`, `.pe-cards-grid .banco-card`, `.assinatura-cards-grid .banco-card` — cada um repete as regras, sem classe utilitária compartilhada, seguindo o padrão já existente no arquivo). Gap entre cards padronizado em 16px e `margin-bottom: 26px` antes da tabela nas 3 seções.

**Ajuste específico do Coordenador (mesmo dia, refinado 2x)**: com 5 cards numa linha só, o ícone/tipografia "padrão" (igual a Processo Editorial/Assinatura Coordenador) truncava títulos como "Pendente de envio"/"Validações atrasadas". Só em `.coordenador-cards-grid .banco-card` (valores finais, após 2ª rodada de redução): ícone **26×26px** (svg 13px; passou por 40→30→26px), `gap` 6px, padding `10px 12px`; título 12.5px e subtítulo 9.5px com `-webkit-line-clamp: 2` (+ `line-clamp: 2` padrão, `word-break: normal`) em vez de `nowrap+ellipsis` — texto quebra em até 2 linhas organizadas, sem cortar no meio da palavra; valor numérico 20px (era 26px original); `.banco-card__metric` com `margin-left: 4px` para não competir espaço com o texto. Processo Editorial e Assinatura Coordenador **não foram alterados** por nenhuma dessas rodadas (continuam com ícone 40×40px/svg 18px/título 16px/valor 26px, 1 linha com ellipsis) — só o Coordenador precisa do ícone/tipografia menor por ter 5 cards na mesma linha.

**Armadilha de especificidade CSS resolvida**: os seletores `.assinatura-cards-grid`/`.coordenador-cards-grid`/`.pe-cards-grid` (grid modifiers, definidos mais cedo no arquivo) tinham a MESMA especificidade que `.banco-cards-grid` (a base, definida mais tarde) — como regras de mesma especificidade, a que vem depois no arquivo vence, então `.banco-cards-grid` (2 colunas) **sobrescrevia silenciosamente** os modifiers. Corrigido para `.assinatura-cards-grid`, `.coordenador-cards-grid` e `.pe-cards-grid` usando seletor composto `.banco-cards-grid.<modifier>` (especificidade maior, sempre vence independente da ordem no arquivo).

**Refino visual dos cards do topo (2026-07-29)**: `.coordenador-cards-grid .banco-card` ganhou `min-height: 108px`, padding maior (`20px 24px`), ícone alinhado ao topo e métrica centralizada verticalmente — mesmo ajuste já aplicado aos cards do Processo Editorial (`.pe-cards-grid .banco-card`), para altura/espaçamento mais equilibrados entre os 5 cards. Cabeçalho da tabela (`#coordTabelaCard .coord-tabela-header`, novo id só na seção Coordenador para não afetar Assinatura Coordenador que reaproveita `.coord-tabela-header`) ganhou padding + `border-bottom` para separar visualmente do bloco de cards, no mesmo padrão do `.pe-tabela-header`.

- **Pendente de Envio** (`coord-card--laranja`, `data-quick-filter="pendente-envio-validacao"`) — `data_validacao_sgge` preenchida **+** `data_envio_coord` vazia. Tem **tooltip analítico** ao passar o mouse (ver seção 10).
- **Enviado Para Validação** — `data_envio_coord` preenchida.
- **Em Validação** — status `'Aguardando análise'`.
- **Validadas** — `devolutiva_coord` preenchida.
- **Validações Atrasadas** — status `'Prazo atrasado'` (pendência em aberto vencida — **não conta devoluções já feitas fora do prazo**, essas são só "Devolvida com atraso" no detalhe).

Cálculo central: `calcularTotaisCoordenador(records)` → `renderizarCardsCoordenador(records)`.

`identificarStatusCoordenador(record)` (status por demanda, usado no detalhe e nos cards):
```
!envio → 'Não enviado para validação' (se devolutiva_encomenda preenchida) ou 'Aguardando elaborador'
envio && !devolutiva → 'Prazo atrasado' (se prazo vencido) ou 'Aguardando análise'
envio && devolutiva → 'Devolvida com atraso' (se devolutiva > prazo) ou 'Devolvida no prazo'
```

### Tabela principal (agrupada por coordenador)
- Coluna **STATUS**: prioridade 1) "Com atrasos" (só se houver pendência em aberto vencida, status `'Prazo atrasado'`) 2) "Em validação" 3) "Não enviadas" 4) "Concluído" 5) "Em andamento". **Não conta mais devolução tardia já concluída como "Com atrasos"**.
- Coluna **ATRASADAS**: conta só `status === 'Prazo atrasado'` (mesma correção acima).
- Ordenação da linha expandida ("detalhe" por coordenador, `ordenarDetalheCoordenador`): **1º critério = Tipo de AV** (ordem fixa AV1→AV2→2º CHAMADA→REC-SEM→REC-FIM), 2º status, 3º prazo mais antigo.

### Filtro global "Filtrar por avaliação" (`coordFiltroTipoAvGlobal`)
Botões pill "Todas/AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM" acima da tabela. **Agora afeta também os 5 cards do topo** (antes só afetava a tabela) — uma única base filtrada (`baseFiltradaPorTipoAv`) alimenta cards + tabela + detalhe, calculada em `renderizarVisaoCoordenador`.

## 9. Aba Coordenador — Indicadores (`viewCoordenadorIndicadores`)

Header próprio: botão "← Voltar ao acompanhamento" (`#btnVoltarAcompanhamentoCoord`) no lugar do título; popover de filtros próprio `#indFiltersPopoverCoord` (Ano/Disciplina/Coordenador/Tipo de AV/Busca).

### Cards executivos (`indicadores-resumo-grid--coord`, 5 cards)
Média de atraso (card com destaque vermelho, `indicadores-resumo-card--alerta`) · Maior atraso individual (subtítulo = **nome do coordenador responsável** por esse atraso) · Coordenador que mais atrasa (agora baseado na **maior média de atraso**, não mais na soma acumulada — mesma correção que já existia no Elaborador) · % Fora do prazo · % No prazo.

### Layout de gráficos (`.coordenador-indicadores-charts`, grid 2 colunas) — **reestruturado**
- **Linha 1**: **Ranking de atraso por coordenador** (métrica = MÉDIA de atraso, `calcularRankingMediaAtrasoCoordenador`) | **Distribuição dos atrasos por avaliação** (donut premium por tipo de AV, `calcularDistribuicaoAtrasosPorAvaliacaoCoordenador`, classes `coord-donut-tipoav-*` — **isoladas** das classes `segmento-*` do donut do Elaborador para não vazar estilo entre as duas seções).
- **Linha 2**: **Total de provas enviadas para validação — por avaliação** (barras de progresso) | **Média de atraso por ano escolar** (`calcularMediaAtrasoPorAnoEscolar` — **substituiu** o antigo "Total de provas por ano escolar"; mesma ordem pedagógica 6º→7º→8º→9º→1º→2º→3º).
- ~~"Ocorrências de atraso por coordenador"~~ foi **removido** (métrica de contagem redundante com o ranking por média).
- Todos os gráficos usam barras/linhas na cor azul padrão do painel (`--ind-azul-principal`), igual ao padrão do Elaborador.

### Tabela "Recorrência de atraso por coordenador" (abaixo dos gráficos, acima do "Desempenho do coordenador")
- **Sem coluna/badge de Classificação** (removida a pedido).
- Ordenada pela **maior Taxa de atraso** (desempate: qtd atrasadas → média → maior individual → alfabética) — mesma lógica de ordenação aplicada também na tabela equivalente do Elaborador (ver seção 7).
- Colunas: Coordenador, Volume de atividades, Enviadas com atraso, Taxa de atraso, Média de atraso, Maior atraso individual.

### Gráfico "Desempenho do coordenador" (linha 4, largura total)
Ver seção 11 — **sem rótulo numérico fixo na linha azul** (só nos pontos, via tooltip nativo), mantendo o rótulo das barras vermelhas.

## 10. Tooltip analítico "Pendente de Envio" (aba Coordenador — Acompanhamento)

Ao passar o mouse (ou focar/tocar) no card "Pendente de Envio", abre um painel flutuante estilo Power BI (`.coord-analytic-tooltip`, wrapper `.coord-card-tooltip-wrapper`):

- Título: **"Progresso de envio por avaliação"**. Subtítulo: **"Percentual de avaliações validadas pelo SGGE já enviadas para validação"**.
- Métrica (⚠️ **já foi corrigida uma vez** — não é distribuição das pendências, é progresso de envio):
  ```
  total = registros do tipo de AV com data_validacao_sgge preenchida
  enviadas = desses, quantos têm data_envio_coord preenchida
  pendentes = total - enviadas
  percentual = enviadas / total * 100   (barra cheia = 100% enviado)
  ```
- Texto por linha: `"X de Y · Z%"`; ordem fixa AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM.
- Clique numa linha aplica `selecionarFiltroTipoAvGlobalCoordenador(tipo)` (mesmo filtro global da tabela/cards).
- Estado vazio: "Não há avaliações validadas pelo SGGE no recorte atual."
- **Bug corrigido**: o atributo HTML `hidden` tem `!important` global (`[hidden]{display:none!important}`) que sobrepunha qualquer CSS de hover — removido o atributo, visibilidade controlada só por `opacity`/`visibility` + classes `:hover`/`:focus-within`/`.is-visible` (fallback touch).

## 11. Gráfico "Desempenho do coordenador" (combinado, largura total)

Barras (atraso médio) + linha (volume de atividades), 2 eixos independentes (esquerdo "Dias médios", direito "Volume"). Dados: `calcularDesempenhoCoordenadores` — **sem limite de 10** (mostra todos os coordenadores do recorte, inclusive com volume baixo); ordenado por maior volume, depois média desc.

**Renderer compartilhado (2026-07-29)**: `renderizarGraficoDesempenhoPorCoordenador(containerId, dados, filtroAtivo, onCliqueCoordenador)` é agora a única implementação do gráfico misto barra+linha, **usada tanto por este gráfico (validação) quanto por "Desempenho por Coordenador – Assinatura"** (seção 12.13) — os dois ficam visual e estruturalmente idênticos, cada um só passando seu próprio container/dados/estado de filtro/callback de clique. `renderizarGraficoDesempenhoCoordenador(dados)` e `renderizarGraficoDesempenhoAssCoord(dados)` são hoje wrappers finos em cima desse renderer. `calcularDesempenhoCoordenadores`/`calcularDesempenhoPorCoordenadorAssCoord` passaram a expor também `qtdAtrasos` e `taxaAtraso` (além de `atrasoMedio`/`volume`), usados no tooltip completo.

Visual **premium**:
- Card com header próprio: ícone em quadrado arredondado + título caixa-alta azul-escuro + subtítulo azul-acinzentado (`.coord-performance-header`).
- **Cor condicional da barra**: gradiente vermelho quando a média de atraso do coordenador é `> 0`, gradiente **verde** quando é `<= 0` — aplicado via custom property inline (`--bar-fill`, lido por `.coord-performance-bar { fill: var(--bar-fill, ...) }`) para não quebrar os modificadores de estado `--ativa`/`--esmaecida` (que continuam sendo classes CSS normais, cascata preservada). IDs de gradiente escopados por `containerId` (`${containerId}BarGradientVermelho/Verde`) para não colidir entre os dois gráficos quando ambos existem no DOM ao mesmo tempo (um deles `hidden`).
- Barras mais espessas (`Math.min(56, passo*0.62)`, era `Math.min(46, passo*0.5)`), cantos arredondados (rx=6).
- Linha mais grossa (stroke-width 3), cor azul-escuro; pontos com centro branco/borda azul (r=5.5).
- **Rótulos do eixo X inclinados** (`rotate(-35 ...)`, `text-anchor: end`) — evita sobreposição com muitos coordenadores no recorte; margem inferior do SVG aumentada (56px → 74px) para caber o texto rotacionado.
- **Tooltip nativo completo** (`<title>`, na barra e no ponto): nome do coordenador, média de atraso, volume de atividades, registros atrasados e % de atraso — antes só a barra tinha rótulo textual fixo e o ponto só "categoria: N atividade(s)".
- Malha horizontal discreta (`.coord-performance-grid`) + marcações numéricas nos dois eixos (`arredondarLimiteEscala` calcula um teto "confortável" acima do maior valor); eixo direito (volume) sempre arredondado para inteiro no rótulo.
- **Legenda no topo** (`.coord-performance-legenda--topo`, antes só embaixo) — mesmo componente, modificador novo inverte borda/margem para separar da área do gráfico que vem abaixo.
- Clicável por coordenador (mesmo filtro do ranking), callback passado pelo chamador (`onCliqueCoordenador`).

**Modo de escala negativa, `opcoes.permitirNegativo` (2026-07-29)**: 5º parâmetro do renderer, `{ permitirNegativo: boolean }`. Quando `true` (só usado por "Desempenho por Coordenador – Assinatura", ver seção 12.13 — **este gráfico de validação continua com `permitirNegativo: false`, comportamento 100% inalterado**):
- Escala do eixo esquerdo fica **simétrica em torno de 0** (`arredondarLimiteEscala` calculado sobre o maior valor absoluto, positivo ou negativo), com uma **linha de zero** visível no meio da área do gráfico (`.coord-performance-grid--zero`, traço mais forte que a malha comum) — as barras crescem para cima (positivo) ou para baixo (negativo) a partir dela, em vez de sempre partir da base.
- Rótulo numérico da barra aparece **acima** quando o valor é `>= 0` e **abaixo** quando é negativo; nunca trunca/usa valor absoluto no rótulo (mostra "-1,4" normalmente).
- Tooltip da linha de "média" muda de texto conforme o sinal (`construirLinhaMedia`): `"Atraso médio: X dias"` (positivo) / `"Antecipação média: X dias"` (negativo, aqui sim com `Math.abs`) / `"No prazo"` (zero) — no modo padrão (`permitirNegativo: false`) o texto continua `"Média de atraso: X dias"` de sempre.
- Legenda ganha uma 3ª linha só nesse modo: `"Vermelho = devolução com atraso · Verde = devolução antes do prazo"` (`.coord-performance-legenda-item--explicacao`).
- Cor da barra continua a mesma regra (`> 0` vermelho, `<= 0` verde) — já valia antes, só passou a ter efeito visível com negativos porque agora eles aparecem na escala em vez de ficarem implícitos.

**Correção — linha do volume não pode entrar na metade negativa (mesmo dia)**: no modo `permitirNegativo`, a escala de atraso (`escalaAtraso`) é simétrica com o 0 no meio da área (`yZero`); a escala de volume (`escalaVolume`), porém, é sempre **unidirecional positiva** — precisa ficar restrita à metade **superior** do gráfico (a mesma metade onde ficam as barras vermelhas/positivas), nunca invadindo a metade inferior (zona negativa/verde), já que volume nunca é negativo. Antes disso ser corrigido, `escalaVolume` usava a área inteira (0 embaixo, máximo em cima, igual ao modo padrão), então qualquer coordenador com volume baixo tinha seu ponto desenhado na metade de baixo do gráfico — visualmente parecia "volume negativo", mesmo os dados estando corretos. Fix: quando `permitirNegativo`, `escalaVolume(valor) = yZero - (valor/limiteVolume) * (areaH/2)` — 0 de volume alinhado exatamente com `yZero` (a linha de zero do atraso, no meio), máximo de volume no topo; a linha inteira fica sempre entre `yZero` e o topo. No modo padrão (validação, `permitirNegativo: false`), `escalaVolume` continua exatamente como antes (área inteira, 0 embaixo) — nenhuma mudança nesse gráfico.

## 12. Aba Processo Editorial (antiga "Sistema GGE") — resumo por ano com expansão (4ª versão)

**Objetivo**: painel resumido por ANO escolar (uma linha por ano, com totais e status consolidado); ao expandir um ano, mostra a tabela detalhada consolidada (ID + etapas + status), já aplicando as regras especiais de agrupamento do Ensino Médio e do 9º ano/AV2.

### 12.1 Estrutura da seção (`#viewSistemaGGE`), de cima para baixo
1. **Cards executivos** (`#peCardsGrid`, `.pe-cards-grid`) — ver 12.2.
2. **Bloco da tabela** (`.pe-matrix-card`), com:
   - **Cabeçalho** (`.pe-tabela-header`, flex `space-between`): título `<h2 class="pe-tabela-titulo">Fluxo do Processo Editorial</h2>` à esquerda + filtro por avaliação à direita (`#peFiltroAvaliacaoTopo`, classe `.coord-detail-filters` — **reaproveitada literalmente** da aba Coordenador, mesmos pills/cores/comportamento).
   - **Tabela principal** (resumo por ano) — ver 12.4.
   - **Rodapé** (`.pe-matrix-footer`): legenda dos 3 ícones + "Última atualização: dd/mm/aaaa HH:MM".
3. Não existe mais nenhum título de página separado acima dos cards (o antigo `.pe-page-header` com "Processo Editorial"/subtítulo foi removido quando esse cabeçalho de tabela foi criado).

### 12.2 Cards executivos (`atualizarCardsProcessoEditorial`) — **apenas 3**, grid `repeat(3, minmax(220px, 1fr))`
1. **Total de provas validadas** (`#peCardValidadas`, verde `--color-success`) — **mesma regra do card "Validadas" da aba Coordenador**: `dados.filter(r => safe(r.devolutiva_coord)).length`, contagem por **registro bruto** (não pelos grupos/blocos), para bater exatamente com aquele card no mesmo recorte.
2. **Em andamento** (`#peCardAndamento`, azul, clicável como filtro rápido `data-quick-filter="andamento"`) — conta os **grupos consolidados** (ver 12.6) cujo `calcularStatusConsolidado === 'Em andamento'`.
3. **Concluídas** (`#peCardConcluidas`, verde forte `--ind-verde`, clicável `data-quick-filter="concluido"`) — conta os grupos consolidados com status `'Concluído'`.

Os cards "Total de avaliações" e "% Concluído" foram **removidos** (nessa ordem, em tarefas separadas). Não há mais botão "total" para resetar o filtro rápido — para desligar, clica-se de novo no card ativo (toggle).

**Visual dos 3 cards**: mesmo padrão "banco-card" da seção Banco de Provas (ícone à esquerda + título/subtítulo + métrica grande à direita) — classes reaproveitadas `.banco-cards-grid`/`.banco-card`/`.banco-card__icon`/`.banco-card__content`/`.banco-card__title`/`.banco-card__subtitle`/`.banco-card__metric`/`.banco-card__value`/`.banco-card__unit`, com `.pe-cards-grid` sobrescrevendo para 3 colunas. Tema: Validadas e Concluídas em verde (`.banco-card--green`), Em andamento em azul (`.banco-card--blue`). Subtítulos: "Provas validadas pelo coordenador." / "Provas em andamento no fluxo editorial." / "Provas concluídas no processo editorial.". Os cards "Em andamento"/"Concluídas" mantêm `data-quick-filter`/`role="button"`/`tabindex` e a classe `.pe-card` (para `is-quick-active` e o seletor `#viewSistemaGGE [data-quick-filter]` continuarem funcionando); só o HTML/CSS interno mudou, ids dos valores e lógica de cálculo (`atualizarCardsProcessoEditorial`) inalterados.

Base dos cards: `agruparTodosOsRegistrosProcessoEditorial(dados)` — agrupa o recorte inteiro por ano e aplica `agruparRegistrosProcessoEditorialPorAno` (mesma função usada pela tabela principal, sem duplicar lógica).

### 12.3 Etapas do fluxo (`ETAPAS_PROCESSO_EDITORIAL`, 8 etapas, na ordem das colunas)
Diagramação (`inicio_diagramacao`/`fim_diagramacao`) · Cotejo (`inicio_cotejo`/`fim_cotejo`) · Diagramação do Cotejo (`inicio_aplicacao_cotejo`/`fim_aplicacao_cotejo`) · Início Leitura Final (`inicio_leitura_final`/`fim_leitura_final`) · Diagramação da Leitura (`inicio_aplicacao_leitura`/`fim_aplicacao_leitura`) · Cotejo Final (`inicio_ctj`/`fim_ctj`) · Envio Assinatura Coord. (`envio_assinatura_coord`/`devolutiva_assinatura_coord`) — **7 etapas** (coluna "Final" removida; `inicio_arte_final`/`fim_arte_final` não são mais usados em lugar nenhum).

`ETAPAS_PROCESSO_EDITORIAL_FUTURAS` — Cotejo Arte Final (`inicio_cotejo_arte_final`/`fim_cotejo_arte_final`), existe no código mas NÃO aparece na tabela nem entra em nenhum cálculo de status; mantida só para reintrodução futura.

**Regra de status de etapa** (`calcularStatusEtapa`, ícone `.status-step`):
```
fim preenchido → completed (quadrado verde + check)
início preenchido, fim vazio → in-progress (círculo azul)
ambos vazios → pending (círculo vermelho)
```
**Exceção — "Envio Assinatura Coord."**: só 2 estados, nunca "in-progress" (sem azul nessa coluna) — usa exclusivamente `envio_assinatura_coord`, ignorando `devolutiva_assinatura_coord`/prazo:
```
envio_assinatura_coord preenchido → completed
envio_assinatura_coord vazio → pending
```

**Consolidação genérica** (`consolidarStatusEtapas`, reaproveitada em vários níveis — 1 registro, 1 etapa entre N registros, ou status geral de um grupo):
```
todos "completed" → completed
todos "pending" → pending
qualquer outra mistura (inclui "in-progress") → in-progress
```
- `calcularStatusEtapaAgregado(registros, inicio, fim)` — aplica a regra acima para 1 etapa específica, entre vários registros (usado para consolidar a etapa de um BLOCO/BLOQUINHO). **Exceção — "Envio Assinatura Coord."**: não usa `consolidarStatusEtapas`; um grupo só é `completed` se TODOS os registros tiverem `envio_assinatura_coord` preenchido, senão `pending` (nunca `in-progress`, mesmo com mistura).
- `calcularStatusConsolidado(registros)` — aplica a regra às 7 etapas restantes e devolve o rótulo final: `Concluído` / `Em andamento` / `Pendente`.
- `calcularStatusProcesso(item)` — caso particular de `calcularStatusConsolidado([item])`, para 1 único registro (usado onde não há agrupamento).

### 12.4 Tabela principal — resumo por ano (`calcularResumoPorAnoProcessoEditorial` + `renderizarTabelaProcessoEditorial`)
Uma linha por ano escolar (ordem pedagógica 6º→7º→8º→9º→1º→2º→3º, só anos com pelo menos 1 "prova" no recorte). Colunas: **Ano** (clicável, expande/recolhe — ícone "▸"/"▾") · **Total de Provas** · **Total em Processo** · **Total Finalizada** · **Status**.

- "Total de Provas" = quantidade de **grupos consolidados** daquele ano (`agruparRegistrosProcessoEditorialPorAno(ano, registros)`), não mais registros brutos — no Ensino Médio e no 9º/AV2 isso já reflete os blocos/bloquinhos (ver 12.6/12.7).
- **Total em Processo** = grupos com `calcularStatusConsolidado === 'Em andamento'` (mesma lógica do card "Em andamento" — não é mais "tudo que não terminou").
- **Total Finalizada** = grupos com status `'Concluído'`.
- **Status** do ano (badge, `badgeClassForStatusAno`):
```
todos os grupos do ano "Concluído" → "Finalizado"
todos os grupos do ano "Pendente" → "Não iniciado"
qualquer outra combinação → "Em processo"
```
Sem separação por cores/blocos visuais na tabela (fluxo único). Estado `anoExpandidoProcessoEditorial` guarda o ano aberto (só um por vez); `alternarDetalheAnoProcessoEditorial(ano)` alterna.

### 12.5 Tabela detalhada expansível (`criarLinhaDetalheAnoProcessoEditorial` + `criarLinhaRegistroDetalheProcessoEditorial`)
Ao clicar no ano, abre um painel "Processos do Xº ano" com uma tabela (`.pe-matrix-table`, `min-width: 1150px`) só com as "provas" daquele ano (já consolidadas por bloco/bloquinho quando aplicável). **Colunas (10 ao todo)**:
```
ID | Diagramação | Cotejo | Diagramação do Cotejo | Início Leitura Final |
Diagramação da Leitura | Cotejo Final | Final | Envio Assinatura Coord. | Status do Processo
```
As antigas colunas Módulo/Ano/Frente/Avaliação **foram removidas** e substituídas por uma única coluna **ID** (`.col-id-processo`, min-width 220px/max-width 320px, ellipsis + `title` com o texto completo):
- `obterIdProcessoEditorial(item)` — usa `item.id` (campo real da API) quando preenchido; senão monta fallback `MÓDULO-TIPOAV-ANO-FRENTE`.
- Para grupos consolidados (bloco/bloquinho), o ID é montado direto na função de agrupamento, ex.: `M3-AV1-1º-BLOCO 1`, `M3-AV2-9º-BLOQUINHO 1`.

Scroll próprio (`.pe-ano-detail-table-scroll`, max-height 420px). Títulos longos usam `<br>` (`ROTULOS_COLUNA_ETAPA_HTML`).

### 12.6 Regra de agrupamento do Ensino Médio (1º/2º/3º ano)
Frentes consolidadas em blocos por Módulo + Avaliação + Grupo (`agruparRegistrosPorBlocoEnsinoMedio`, `identificarGrupoEnsinoMedio`):

- **BLOCO 1** (lista exata, sem aproximação): INGLÊS, LITERATURA, PORTUGUÊS, GEOGRAFIA, HISTÓRIA, SOCIOLOGIA, FILOSOFIA, ARTE.
- **BLOCO 2**: FÍSICA 1, FÍSICA 2, QUÍMICA 1, QUÍMICA 2, BIOLOGIA 1, BIOLOGIA 2, MATEMÁTICA 1, MATEMÁTICA 2, **MATEMÁTICA 3**.
- **REDAÇÃO** (e variações: "Prod. Textual", "Prod Textual", "Produção Textual") — **1º e 2º ano**: forma grupo próprio `REDAÇÃO`; **3º ano**: entra dentro do `BLOCO 1`.
- Se a frente não estiver em nenhuma lista: `identificarGrupoEnsinoMedio` retorna `null` + `console.warn` com os detalhes do registro — **o registro não aparece na tabela** (não existe fallback "BLOCO NÃO IDENTIFICADO"). No dataset atual isso acontece com "EDUCAÇÃO FÍSICA", "HISTÓRIA 1/2", "GEOGRAFIA 1/2" (variações fora da lista fechada pedida).
- Ordem de exibição: módulo → avaliação (ordem fixa) → grupo (`BLOCO 1` → `BLOCO 2` → `REDAÇÃO`).
- Resultado esperado: 1º/2º ano geram até 3 "provas" por avaliação (BLOCO 1, BLOCO 2, REDAÇÃO); 3º ano gera até 2 (BLOCO 1 já com REDAÇÃO dentro, e BLOCO 2).

### 12.7 Regra especial do 9º ano na AV2 (`identificarBloquinhoNonoAnoAV2`, `agruparRegistrosPorBloquinhoNonoAnoAV2`)
Só se aplica quando `ano === '9º' && tipo_av normalizado === 'AV2'`; as demais avaliações do 9º ano (AV1, 2º CHAMADA, REC-SEM, REC-FIM) e os demais anos do Fundamental (6º/7º/8º) continuam **1 linha por registro**, sem agrupamento algum.

- **BLOQUINHO 1**: REDAÇÃO, PORTUGUÊS, LITERATURA.
- **BLOQUINHO 2**: BIOLOGIA, GEOGRAFIA.
- **BLOQUINHO 3**: MATEMÁTICA 1, MATEMÁTICA 2, MATEMÁTICA BÁSICA.
- **BLOQUINHO 4**: FÍSICA, INGLÊS, ARTE.
- **BLOQUINHO 5**: HISTÓRIA, QUÍMICA.
- Frente fora da lista → `console.warn` + registro descartado (mesmo padrão do Ensino Médio, sem "BLOQUINHO NÃO IDENTIFICADO"). No dataset atual as 13 disciplinas do 9º ano cobrem os 5 bloquinhos exatamente, sem sobras.
- ID do grupo: `MÓDULO-AV2-ANO-BLOQUINHO N`.
- `agruparRegistrosProcessoEditorialPorAno(ano, registros)` é o **ponto único** que decide, por ano, qual regra aplicar (Ensino Médio → blocos; 9º ano → separa AV2 em bloquinhos e mantém o resto por registro; demais anos → por registro), reaproveitado tanto pela tabela principal/detalhada quanto pelos cards.

### 12.8 Filtros da seção
1. **Popover** (ícone de funil no header, `aplicarFiltrosProcessoEditorial`): Módulo/Ano/Disciplina/Tipo de AV/Responsável/Status do processo (valores `Concluído`/`Em andamento`/`Pendente`)/Busca geral.
2. **Pills "Filtrar por avaliação:"** (`#peFiltroAvaliacaoTopo`, estado `peFiltroTipoAvGlobal`, `selecionarFiltroTipoAvGlobalProcessoEditorial`) — Todas/AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM, no cabeçalho da tabela; aplicado **depois** do popover, alimentando cards + tabela + expansão (mesmo padrão de `baseFiltradaPorTipoAv` da aba Coordenador).
3. **Cards clicáveis** (filtro rápido, `filtroRapidoProcessoEditorial`): Em andamento / Concluídas — atua sobre os registros brutos antes do agrupamento por ano.

### 12.9 Normalizações específicas do Processo Editorial
- `normalizarFrenteProcessoEditorial(valor)` = `removerAcentos(valor).toUpperCase().replace(/\s+/g,' ').trim()` — usada nas comparações de bloco/bloquinho (ex.: "Química 1" → "QUIMICA 1").
- Tipo de AV e Ano reaproveitam as normalizações já existentes no projeto (`normalizarTipoAvaliacao`/`ORDEM_TIPO_AV_PERFORMANCE`, `normalizarAnoSegmento`/`ORDEM_ANO_ESCOLAR_COORD`/`identificarSegmentoPorAno`) — ver seção 4.

**Nota sobre dados**: no dataset da API, os registros do Fundamental (6º-9º) e a maioria dos campos de etapa costumam estar vazios (linhas aparecem "Pendente") até a planilha ser populada com essas colunas; isso é comportamento normal dos dados, não bug.

## 12.10 Sub-visão "Indicadores — Processo Editorial"

Mesmo padrão de Indicadores — Elaborador/Coordenador: botão "Indicadores" (`btnIndicadoresPE`) no header da aba Processo Editorial alterna para `#viewProcessoEditorialIndicadores`, ocultando `#viewSistemaGGE` (renomeado internamente como `viewProcessoEditorialAcompanhamento`); botão "← Voltar ao acompanhamento" (`btnVoltarAcompanhamentoPE`) retorna. Estado `visaoProcessoEditorial` ('acompanhamento'/'indicadores'), navegação em `mostrarIndicadoresProcessoEditorial()`/`mostrarAcompanhamentoProcessoEditorial()`. Título/subtítulo próprios no topo do conteúdo (`.pe-indicadores-header`): "Indicadores — Processo Editorial" / "Análise do andamento, gargalos e tempo médio do fluxo editorial." — não há bloco de conclusão textual/diagnóstico automático (propositalmente).

**Etapas consideradas** — `ETAPAS_INDICADORES_PROCESSO_EDITORIAL` (filtro de `ETAPAS_PROCESSO_EDITORIAL`, 6 das 7 etapas): Diagramação, Cotejo, Diagramação do Cotejo, Início Leitura Final, Diagramação da Leitura, Cotejo Final — **exclui "Envio Assinatura Coord."** (e não usa checklist/envio gráfica/banco de provas, que nem fazem parte de `ETAPAS_PROCESSO_EDITORIAL`). A tabela de acompanhamento continua usando as 7 etapas normalmente (`ETAPAS_PROCESSO_EDITORIAL`, inalterada).

**Base de dados**: `obterBaseConsolidadaProcessoEditorial(dados)` reaproveita `agruparTodosOsRegistrosProcessoEditorial` (mesma consolidação por bloco/bloquinho da tabela de acompanhamento — nunca 1 linha por frente bruta quando há agrupamento) e calcula, por processo: `status` via `calcularStatusProcessoEditorialIndicadores` (igual a `calcularStatusConsolidado`, mas só com as 6 etapas acima) e `duracao` via `calcularDuracaoProcessoEditorial` (dias entre a menor data de início e a maior data de fim, entre as 6 etapas e todos os registros do grupo; `null` se não houver início/fim válidos).

**Filtros** (popover `#indFiltersPopoverPE`, estado `filtrosIndicadoresPE` + `indSelectFiltersPE`): Ano, Módulo, Tipo de AV, Status do processo (valores internos `Pendente`/`Em andamento`/`Concluído`, rotulados "Não iniciado"/"Em processo"/"Concluído" no select) e busca geral — mesmo padrão de popover genérico (`.elab-filters-popover`). Filtros interativos por clique nos gráficos (ano/avaliação/módulo/etapa/status) via `alternarFiltroIndicadorPE`.

**Cards** (`indicadores-resumo-grid--pe`, agora **6 cards**, `repeat(6, 1fr)`):
1. **Média geral do processo** — média de `duracao` entre os processos com duração calculável (`formatarMediaAtrasoGrafico` + "dias"); "0 dias" se não houver amostra.
2. **Etapa mais lenta** — maior duração média entre as 6 etapas (`calcularDuracaoMediaPorEtapa`); "Sem dados"/"0 dias médios" se nenhuma etapa tiver amostra.
3. **Maior gargalo** — etapa com mais pendências (`início vazio e fim vazio`, só entre as 6 etapas); "Sem gargalos"/"0 pendências" se não houver.
4. **Em andamento** — `"N provas"`.
5. **Concluídas** — `"N provas"`.
6. **Taxa de conclusão** — `concluídas / total de processos * 100` (não mais sobre "total validadas"), subtítulo `"N de M provas concluídas"`.

O card "Total de provas validadas" (existia na versão anterior) **foi removido** desta sub-visão.

**Gráficos** (`renderizarIndicadoresProcessoEditorial`, grid `.pe-indicadores-charts` reaproveitando `.coordenador-indicadores-charts`, layout em 3 linhas de 2 colunas):
1. **Média de tempo por etapa** (`renderizarGraficoTempoPorEtapaPE`) — barras horizontais, ordem fixa das 6 etapas (não ordena por valor), `calcularDuracaoMediaPorEtapa`.
2. Gargalos por etapa — barras horizontais (`.coord-ranking-chart`/`.coord-ranking-row`, reaproveitado), só as 6 etapas, ordenado desc.
3. Distribuição do status do processo — donut SVG manual próprio (`pe-donut-status-*`, isolado de `coord-donut-tipoav-*`/`segmento-*`), centro mostra total + "PROCESSOS".
4. Andamento por avaliação — barras horizontais com % de conclusão, ordem fixa de tipo de AV.
5. Andamento por ano escolar — barras horizontais com % de conclusão, ordem pedagógica.
6. **Mapa de calor do processo** (`renderizarMapaCalorProcessoEditorial`, `.pe-heatmap-table`) — tabela Ano × Etapa (só anos presentes no recorte × as 6 etapas); cada célula colorida pelo status predominante entre os processos daquele ano para aquela etapa (`calcularStatusPredominanteCelulaPE`: conta completed/in-progress/pending por `calcularStatusEtapaAgregado`, desempate prioriza Em andamento → Pendente → Concluído); verde=concluído, azul=em andamento, vermelho=pendente; tooltip nativo (`title`) com o detalhe. Sem texto nas células, só cor (`.pe-heatmap-cell--completed/--in-progress/--pending`).

~~"Conclusão por módulo"~~ (existia na versão anterior) **foi removido** desta sub-visão.

**Tabela "Resumo por ano e avaliação"** (`gerarResumoAnoAvaliacaoPE`): agrupa a base consolidada por Ano+Tipo de AV; colunas #/Ano/Avaliação/Total de provas/Em andamento/Concluídas/Taxa de conclusão/**Média do processo** (nova coluna, média de `duracao` dos processos do grupo)/Principal gargalo (só entre as 6 etapas); ordenada por menor taxa de conclusão primeiro (desempate: maior total).

Não altera a tabela de acompanhamento, as regras de agrupamento (bloco/bloquinho), a API, o login, a sidebar nem as seções Elaborador/Coordenador/Banco de Provas.

## 12.11 Aba "Banco de Provas"

Lista simples (1 linha por registro bruto, **sem** aplicar as regras de bloco/bloquinho do Processo Editorial) dos links de prova, com filtro próprio no header (`bpFilterPopoverWrapper`/`#bpFiltersPopover`: Módulo, Ano, Disciplina, Tipo de AV, busca geral — mesmo padrão de popover genérico `.elab-filters-popover`).

**Validação de link** (`linkValido(valor)`): não vazio e, case-insensitive, diferente de `"-"`, `"null"`, `"undefined"`.

**Cards** (`#bpCardsGrid`, `.bp-cards-grid`, só 2): Total de provas em branco (`bpCardEmBranco`, conta `linkValido(record.prova_em_branco)`) · Total de provas com gabarito (`bpCardComGabarito`, conta `linkValido(record.prova_com_gabarito)`) — calculados sobre o recorte já filtrado (`aplicarFiltrosBancoProvas`).

**Tabela** (`#bpTableBody`, `renderizarTabelaBancoProvas`): 2 colunas exatas — ID (reaproveita `obterIdProcessoEditorial`, sem coluna Status) · **Acesso**. Coluna Acesso (`criarCelulaAcessoBancoProvas`) mostra até 2 botões (`.bp-acesso-btn`, azul-escuro): "S/GABARITO" (link de `prova_em_branco`, se válido) e "C/GABARITO" (link de `prova_com_gabarito`, se válido), cada um abrindo em nova aba (`target="_blank" rel="noopener noreferrer"`). **Registros sem nenhum link válido são omitidos da tabela** (`possuiLinkBancoProvas`, filtro aplicado dentro de `renderizarTabelaBancoProvas` sobre os dados já filtrados por popover+ano) — não existe mais estado "Sem link"; os cards continuam contando sobre o recorte completo (antes desse filtro só-de-exibição), então não são afetados por ele.

**Filtro pill "FILTRAR:"** (`#bpFiltroAnoTopo`): mesmo componente visual/classes `.coord-detail-filters`/`.coord-detail-filter-btn` já usado no "Filtrar por avaliação:" da aba Processo Editorial (ativo = azul-escuro/texto branco, inativo = branco/borda cinza/texto azul-escuro). Coluna usada: **Ano** (`ano`). Opções = "Todos" + valores únicos de `ano` presentes no recorte já filtrado pelo popover, na ordem pedagógica `ORDEM_ANO_ESCOLAR_COORD`. Estado `bpFiltroAnoGlobal` (`null` = "Todos"); `selecionarFiltroAnoBancoProvas(ano)` clicar na opção já ativa desliga o filtro (volta a "Todos"). Aplicado **depois** do popover, alimentando cards + tabela (`renderizarBancoProvas`).

**Layout da seção** (`#banco-provas-section`), de cima para baixo: 1) `.banco-provas-cards` (os 2 cards) 2) `.banco-provas-filtros` — busca visível (`#filterBPBusca`, placeholder "Buscar por nome ou área...", **movida do popover para fora**, sempre visível) + a barra de pills `#bpFiltroAnoTopo` 3) `.banco-provas-table-card` (título "Banco de Provas" + tabela). O popover de filtros (funil no header, `#bpFiltersPopover`/`bpFilterPopoverWrapper`) foi **removido visualmente** (`bpFilterPopoverWrapper.hidden = true` fixo em `trocarAba`, nunca aparece nessa aba) — os campos Módulo/Disciplina/Tipo de AV do popover continuam no DOM/JS mas ficam inacessíveis via UI; únicos filtros usáveis são busca + pills por Ano.

**Cards** (`.banco-cards-grid`, `.banco-card`): modelo "ícone + título/subtítulo + métrica grande", nesta ordem: 1) **"Provas com Gabarito"** (`.banco-card--green`, ícone documento+check `.banco-card__icon--green`, subtítulo "Provas finalizadas e corrigíveis.", valor em `#bpCardComGabarito`) 2) **"Provas sem Gabarito"** (`.banco-card--blue`, ícone documento `.banco-card__icon--blue`, subtítulo "Em elaboração ou revisão.", valor em `#bpCardEmBranco`) — ambos com "provas" abaixo do número (`.banco-card__unit`). Só o HTML/CSS mudou; os IDs dos valores e toda a lógica de contagem (`atualizarCardsBancoProvas`) permanecem os mesmos.

**Coluna "Acesso" alinhada à direita**: `th`/`td.col-acesso` com `text-align: right` + `padding-right: 24px`; `.bp-acesso-cell` com `justify-content: flex-end`, então os botões S/GABARITO e C/GABARITO ficam colados à borda direita da coluna (não mais centralizados).

Orquestrador: `renderizarBancoProvas()`, chamado por `renderAbaAtual()` quando `abaAtual === 'banco-provas'`.

## 12.12 Aba "Assinatura Coordenador"

Estrutura e comportamento **idênticos à aba Coordenador** (mesmas classes CSS globais reaproveitadas 1:1 — `.coord-cards-grid`/`.coord-card`/`.coord-table-scroll`/`.coord-detail-*`/`.badge-coord-*`, nenhuma delas escopada por `#viewCoordenador`, então funcionam sem alteração de CSS), trocando os campos:

| Coordenador (original) | Assinatura Coordenador |
|---|---|
| `data_envio_coord` | `envio_assinatura_coord` |
| `prazo_coord` | `prazo_assinatura_coord` |
| `devolutiva_coord` | `devolutiva_assinatura_coord` |
| — | `observacao` (nova coluna só nesta aba) |

**Status individual** (`calcularStatusAssinatura`, 5 estados — sem os dois sub-estados de "não enviado" que a aba Coordenador tem, por não haver aqui um "elaborador" upstream): `Não enviado para assinatura` / `Em assinatura` / `Assinatura atrasada` (envio preenchido, sem devolutiva, prazo vencido) / `Assinado no prazo` / `Assinado com atraso`. Badges via `badgeClassForStatusAssinatura`, reaproveitando `badge-coord-nao-enviado`/`-aguardando`/`-atrasado`/`-no-prazo`/`-com-atraso`.

**Dias** (`calcularDiasAssinatura`/`formatarDiasAssinatura`): mesma fórmula da aba Coordenador (`devolutiva - prazo` ou `hoje - prazo`), formatado `"+N dias"`/`"-N dias"`/`"0 dias"`, cor vermelha se atraso e verde se dentro do prazo (`.coord-dias-cell--atraso`/`--folga`).

**Cards** (`#assCoordCardsGrid`, `.banco-cards-grid.assinatura-cards-grid`, **4 cards** em `repeat(4, minmax(190px, 1fr))`, breakpoints 2 colunas <1200px / 1 coluna <700px) — visual "banco-card" (mesmo padrão premium do Processo Editorial/Banco de Provas: ícone + título/subtítulo + métrica grande, reaproveitando `.banco-card`/`.banco-card__icon`/`.banco-card__content`/`.banco-card__metric`/`.banco-card__value`/`.banco-card__unit`, unidade "provas"; novo modificador de cor `.banco-card--red`/`.banco-card__icon--red` criado para o card de atraso): "Enviadas para assinatura" (azul, `envio_assinatura_coord` preenchido, subtítulo "Provas enviadas ao coordenador.") · "Em assinatura" (azul, status `'Em assinatura'`, exclui atrasadas — mesmo padrão do card "Em Validação" do Coordenador, subtítulo "Aguardando assinatura do coordenador.") · "Assinadas" (verde, `devolutiva_assinatura_coord` preenchida, subtítulo "Provas já assinadas.") · "Assinaturas atrasadas" (vermelho, status `'Assinatura atrasada'`, só pendência em aberto vencida — não conta devolução já feita fora do prazo, mesma regra do Coordenador, subtítulo "Assinaturas fora do prazo."). Continuam clicáveis como filtro rápido (`data-quick-filter`, `.is-quick-active`) — só a estrutura HTML/CSS mudou (antes usava `.coord-card`), a lógica de cálculo é a mesma. O card "Pendente de Envio" (removido anteriormente) continua fora.

**Tamanho compacto** — regra escopada a esta seção (`.assinatura-cards-grid .banco-card { ... }`): `min-height: 76px`, `padding: 12px 16px`, ícone 40×40px (`border-radius: 12px`), título `16px` (ellipsis), subtítulo `11.5px` (ellipsis), valor `26px`. **Esse mesmo tamanho foi padronizado também em Coordenador e Processo Editorial** (ver seção 8 e 12.2/13) — não é mais exclusivo desta seção, é o tamanho de card padrão sempre que há métrica numérica grande.

**Tabela principal** (`#tableBodyAssinaturaCoordenador`, agrupada por `coordenador`, `calcularResumoPorCoordenadorAssinatura`): colunas Coordenador/Total de demandas/Não enviadas/Em assinatura/Assinadas/Atrasadas/Status. **Coluna "Em assinatura" usa a mesma regra do card** (`status === 'Em assinatura'`, dentro do prazo) — **corrigido**: antes contava qualquer `envio preenchido && devolutiva vazio` (incluindo atrasadas), fazendo um registro aparecer em "Em assinatura" **e** em "Atrasadas" ao mesmo tempo; agora cada registro conta em só uma das duas colunas. Status geral por coordenador (`badgeClassForStatusGeralAssinatura`): `Com atrasos` (atrasadas>0) → `Em assinatura` (em assinatura>0) → `Não enviado` (todas sem envio) → `Assinado` (todas assinadas) → `Em andamento` (fallback). Clicar no nome expande o detalhe (`alternarDetalheAssinaturaCoordenador`, estado `assCoordExpandido`, só 1 aberto por vez).

**Detalhe expandido** (`criarLinhaDetalheAssinaturaCoordenador`): título "Assinaturas de [Coordenador]"; tabela com 10 colunas — Módulo/Ano/Disciplina/Tipo de AV/Data de envio/Prazo/Data da devolutiva/Dias/**Observação**/Status. Observação vazia → "-"; com texto → ellipsis + `title` (`.coord-observacao-cell`, `max-width:220px`). Ordenação (`ordenarDetalheAssinaturaCoordenador`): tipo de AV (ordem fixa) → prioridade de status → prazo mais antigo.

**Filtro "Filtrar por avaliação:"** (`#assCoordFiltroAvaliacaoTopo`, estado `assCoordFiltroTipoAvGlobal`): mesmos pills Todas/AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM (`OPCOES_FILTRO_TIPO_AV_COORDENADOR`, reaproveitado), alimentando cards + tabela + detalhe a partir de uma única base filtrada, exatamente como na aba Coordenador.

**Popover de filtros** (`#assCoordFiltersPopover`/`assCoordFilterPopoverWrapper`, botão funil no header): Ano, Disciplina, Tipo de AV, Coordenador, Status da assinatura (5 valores), busca geral — mesmo padrão genérico `.elab-filters-popover`.

Orquestrador: `renderizarVisaoAssinaturaCoordenador()`, chamado por `renderAbaAtual()` quando `abaAtual === 'assinatura-coordenador'`. Estado (`filtroRapidoAssCoord`, `assCoordExpandido`, `assCoordFiltroTipoAvGlobal`) e todas as funções são isolados dos da aba Coordenador — não a alteram.

## 12.13 Sub-visão "Indicadores — Assinatura do Coordenador" (2026-07-29)

Mesmo padrão de Indicadores — Coordenador/Processo Editorial: botão "Indicadores" (`btnIndicadoresAssCoord`) no header da aba Assinatura Coordenador alterna para `#viewAssinaturaCoordenadorIndicadores`, ocultando a visão de acompanhamento (que reaproveita a própria `#assinatura-coordenador-section` como container — mesmo truque já usado em Processo Editorial, cujo `#viewSistemaGGE` também é a própria section da aba); botão "← Voltar ao acompanhamento" (`btnVoltarAcompanhamentoAssCoord`) retorna. Estado `visaoAssinaturaCoordenador` ('acompanhamento'/'indicadores'), navegação em `mostrarIndicadoresAssinaturaCoordenador()`/`mostrarAcompanhamentoAssinaturaCoordenador()`. Título/subtítulo no topo (`.pe-indicadores-header`, reaproveitado): "Indicadores — Assinatura do Coordenador" / "Prazo de devolutiva e desempenho por coordenador na etapa de assinatura."

**Sem popover de filtros próprio** — diferente de Elaborador/Coordenador/Processo Editorial, esta sub-visão não tem popover de Ano/Disciplina/etc. Ela reaproveita a mesma base já filtrada pelo popover e pela pill "Filtrar por avaliação:" do Acompanhamento (`baseFiltradaPorTipoAv`, calculada dentro de `renderizarVisaoAssinaturaCoordenador`), que passa a ramificar para `renderizarIndicadoresAssinaturaCoordenador(baseFiltradaPorTipoAv)` quando `visaoAssinaturaCoordenador === 'indicadores'`. Único filtro interativo: clique nos gráficos por coordenador (`filtrosIndicadoresAssCoord.coordenador`, `alternarFiltroIndicadorAssCoord`).

**Regras de cálculo** (`calcularDiasAtrasoAssinaturaIndicadores`: `devolutiva_assinatura_coord - prazo_assinatura_coord`, só quando AMBOS preenchidos — sem o fallback "hoje - prazo" que `calcularDiasAssinatura`/a tabela de acompanhamento usam, porque os Indicadores só devem considerar demandas já respondidas):
- **Total de Assinatura** = registros com `envio_assinatura_coord` preenchido.
- **Fora do prazo** = dos acima, `devolutiva_assinatura_coord` preenchida e `> prazo_assinatura_coord`.
- **Dentro do prazo** = dos acima, `devolutiva_assinatura_coord` preenchida e `<= prazo_assinatura_coord`.
- **Média de atraso** = soma dos dias de atraso positivos / quantidade de ocorrências atrasadas (mesma fórmula padrão do projeto, `formatarMediaAtrasoGrafico`); `0 dias` se não houver atraso.
- Por coordenador (gráfico "Desempenho por Coordenador – Assinatura", ver seção 11 para o renderer): volume = registros com `envio_assinatura_coord` preenchido; atraso médio (`calcularDesempenhoPorCoordenadorAssCoord`) = **média de TODOS os dias com devolutiva+prazo preenchidos, incluindo negativos** (devolução antes do prazo) — **não** trunca em 0 nem usa valor absoluto, diferente do ranking "Atraso médio por coordenador" (item 2 abaixo) e dos cards, que só consideram ocorrências com atraso positivo. `qtdAtrasos`/`taxaAtraso` (usados no tooltip) continuam contando só os positivos.

**Cards** (`indicadores-resumo-grid--ass-coord`, 4 cards, `repeat(4, 1fr)`): Total de Assinatura (azul, padrão) · Fora do prazo (vermelho, `.indicadores-resumo-card--alerta`) · Dentro do prazo (verde, `.indicadores-resumo-card--ok`) · Média de atraso (**laranja**, novo modificador `.indicadores-resumo-card--laranja` — diferente do vermelho usado pelo card equivalente do Coordenador, a pedido).

**Gráficos** (grid `.coordenador-indicadores-charts`, reaproveitado sem modificador):
1. **Distribuição das assinaturas por prazo** — donut de 2 fatias (Dentro do prazo verde / Fora do prazo vermelho), reaproveitando a técnica e as classes CSS de `.pe-donut-status-*` (genéricas o bastante para não precisar duplicar CSS; centro mostra o total com o rótulo "PROVAS" em vez de "PROCESSOS").
2. **Atraso médio por coordenador** — barras horizontais reaproveitando `.coord-ranking-row` (mesmo componente visual dos rankings de Elaborador/Coordenador), ordenado da maior média para a menor; rótulo `"X dias médios · Y ocorr."`; clicável por linha.
3. **Desempenho por Coordenador – Assinatura** (largura total, `.coord-performance-card`) — usa o **mesmo renderer** de "Desempenho do coordenador" (`renderizarGraficoDesempenhoPorCoordenador`, ver seção 11), com `opcoes.permitirNegativo: true` (**única diferença de configuração entre os dois gráficos**): escala do eixo esquerdo simétrica em torno de 0, barras vermelhas (atraso) crescendo para cima e barras verdes (antecipação/no prazo) crescendo para baixo a partir da linha de zero, rótulo sempre visível mesmo negativo (ex. "-1,4"), tooltip com "Atraso médio"/"Antecipação média"/"No prazo" conforme o sinal, legenda com linha explicativa das cores. Subtítulo: "Barras = média de atraso (dias) · Linha = volume de registros válidos · clique nas barras para filtrar".

Estados vazios: "Nenhum dado disponível para o filtro selecionado." (sem registros na base) / "Sem ocorrências no recorte atual." (filtro interativo zera o recorte); gráficos individuais têm sua própria mensagem vazia (ex.: "Não há atrasos no recorte atual.").

Não altera a tabela de acompanhamento, os cálculos de status/dias da aba Assinatura Coordenador, a API, nem as seções Elaborador/Coordenador/Processo Editorial/Banco de Provas.

## 12.14 Aba "Arte-finalização e Envio" (2026-07-30)

Acompanha a fase final do fluxo, depois que a prova já foi assinada pelo coordenador. Mesmo padrão visual/estrutural da aba Processo Editorial (cards "banco-card" + card de tabela com header/filtro "Filtrar por avaliação" + `.table-wrapper`/`.data-table`), mas **sem agrupamento por bloco/bloquinho** — sempre 1 linha por registro (`id`), diferente da tabela por ano do Processo Editorial. Sem popover de filtros nem sub-visão de indicadores por enquanto (só a pill "Filtrar por avaliação").

**Campos usados**: `devolutiva_assinatura_coord` (assinatura da coordenação, já usado pela aba Assinatura Coordenador), `arte_final`/`inicio_arte_final`/`fim_arte_final` (etapa de arte-finalização), `checklist`/`data_checklist`, `envio_grafica`/`data_envio_grafica`.

**Cards** (`#afeCardsGrid`, reaproveita `.banco-cards-grid.pe-cards-grid`, 3 colunas):
1. **Provas Assinadas** (verde) — `devolutiva_assinatura_coord` preenchida (mesma regra do card "Assinadas" da aba Assinatura Coordenador).
2. **Em Andamento** (azul) — assinada + `data_envio_grafica`/`envio_grafica` ainda vazios + pelo menos uma etapa de arte-finalização/checklist iniciada (`arte_final`/`inicio_arte_final`/`fim_arte_final`/`checklist`/`data_checklist`).
3. **Provas Enviadas para Gráfica** (azul-escuro, novo modificador `.banco-card--azul-escuro`/`.banco-card__icon--azul-escuro` criado seguindo o mesmo padrão de `.banco-card--red`) — `data_envio_grafica` ou `envio_grafica` preenchido.

**Tabela** (`#afeTableBody`, `renderizarTabelaArteFinalizacaoEnvio`) — colunas **ID | Arte-finalização | Checklist | Data do Envio para a Gráfica | Status**:
- **Arte-finalização**/**Checklist**: reaproveitam o mesmo ícone de etapa do Processo Editorial (`renderizarIconeStatusProcesso`, `.status-step`) — `calcularStatusArteFinalizacao`/`calcularStatusChecklist` (só `completed`/`pending` para Checklist, sem estado intermediário).
- **Data do Envio para a Gráfica** (`formatarDataArteFinalizacao`): `data_envio_grafica`, com fallback para `envio_grafica` se a primeira estiver vazia; "-" se nenhuma preenchida.
- **Status** (`calcularStatusGeralArteFinalizacao`, badge): prioridade fixa 1) Enviada para gráfica (verde, `badge-pe-status-concluido`) 2) Em andamento (azul, `badge-pe-status-andamento`) 3) Aguardando assinatura (amarelo, `badge-coord-aguardando`, quando `devolutiva_assinatura_coord` vazia) 4) Pendente (vermelho, `badge-pe-status-pendente`).

**Filtro** (`#afeFiltroAvaliacaoTopo`, estado `afeFiltroTipoAvGlobal`): mesmos pills Todas/AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM (`OPCOES_FILTRO_TIPO_AV_COORDENADOR`), afetando cards + tabela a partir de uma única base filtrada (`aplicarFiltrosArteFinalizacaoEnvio(filteredRecords)`).

Orquestrador: `renderizarArteFinalizacaoEnvio()`, chamado por `renderAbaAtual()` quando `abaAtual === 'arte-finalizacao-envio'`. Não altera a API, o login, a sidebar (exceto o item do menu já apontar para essa seção, que já existia) nem as seções Elaborador/Coordenador/Processo Editorial/Assinatura Coordenador/Banco de Provas.

**Assunções feitas** (não explicitadas nos dados/planilha, documentar caso precisem de ajuste): `arte_final` é tratado como "preenchido = concluído" (qualquer valor não vazio conta, sem checar um texto específico de conclusão); "Em andamento" dos cards usa a regra mais específica pedida (etapa iniciada, não a alternativa simplificada); a ordem de prioridade do Status geral segue exatamente a lista numerada do pedido (Enviada → Em andamento → Aguardando assinatura → Pendente), então uma linha com etapa de arte-finalização iniciada mas ainda sem assinatura aparece como "Em andamento", não "Aguardando assinatura".

## 13. Padrões visuais consolidados

- Paleta: azul principal `--ind-azul-principal:#1f4775`, azul escuro `--ind-azul-escuro:#17365c`, vermelho `--ind-vermelho:#b91c1c`, verde `--ind-verde:#15803d`, amarelo `--ind-amarelo:#b45309`, laranja `#c2410c` (`coord-card--laranja`).
- Cards: fundo branco, borda 1px cinza clara, borda superior colorida 3px, `border-radius:14px`, sombra suave, padding ~16-18px.
- Gráficos de ranking (linha única): nome à esquerda, barra horizontal ao centro, valor à direita — reaproveitado em Elaborador e Coordenador.
- Botões de filtro por popover: ícone de funil no header azul (translúcido no fundo escuro), badge numérico de filtros ativos, popover branco com grid de 3 colunas (`.elab-filters-groups`/`.elab-filter-fields`), rodapé com Limpar/Atualizar/Aplicar.
- "Filtros ativos" (chips removíveis) acima dos gráficos de Indicadores — mecanismo genérico via `Object.entries(filtrosIndicadores)`, já suporta qualquer campo novo automaticamente (bastando adicionar a chave + rótulo em `ROTULOS_FILTROS_INDICADORES`).

## 14. Armadilhas conhecidas (para não repetir)

- **Cache agressivo do preview local**: o servidor estático + browser do preview frequentemente serve `style.css`/`script.js` **desatualizados** mesmo após editar o arquivo e recarregar. Workaround usado repetidamente: `document.querySelector('link[rel=stylesheet]').href = '/style.css?v=' + Date.now()` para CSS; para JS, buscar o arquivo fresco via `fetch` e `eval` só o trecho da função alterada (funções `function` podem ser redeclaradas sem erro; `let`/`const` do topo do arquivo não podem).
- **Especificidade CSS**: regras genéricas tardias no arquivo (ex.: `.indicadores-chart-block { margin-bottom: 0 }`) podem sobrepor overrides mais específicos por nome de classe se a especificidade for igual — usar seletores compostos (`.classe-base.classe-modificadora`) quando precisar garantir prioridade.
- **`[hidden]{display:none!important}` global** — nunca usar o atributo `hidden` em elementos que precisam de transição CSS (tooltips, popovers animados); controlar visibilidade só via classes/opacity/visibility.
- Screenshot do preview trava/timeout com frequência neste ambiente — validação é feita via `javascript_tool` (leitura de DOM/computed style) em vez de captura visual.
- Classes `.indicadores-resumo-*`, `.indicadores-block-title` etc. são **compartilhadas** entre Elaborador e Coordenador — qualquer ajuste "só para Elaborador" precisa de seletor escopado por `#viewElaboradorIndicadores`/`#viewCoordenadorIndicadores` para não vazar.

## 12.15 Aba "Geral" — boas-vindas + calendário mensal + Gestão à Vista (2026-07-30, 2ª rodada)

Tela inicial do sistema (`abaAtual === 'geral'`, orquestrador `renderizarGeral()`, chamado por `renderAbaAtual()` — substituiu o antigo `renderizarGeralVazio()`, removido). Base de dados: `filteredRecords` (mesmo recorte global de todas as outras abas, ver seção 4), com filtros próprios isolados do resto do projeto.

**Estrutura** (`#geral-section`), nesta ordem: 1) mensagem de boas-vindas (`<h1 id="geralSaudacaoUsuario">`) 2) card `.pe-matrix-card` "Calendário de Avaliações" com filtros + navegação de mês + grade + modal de detalhe 3) card `.pe-matrix-card.geral-gestao-vista-card` **"Gestão à Vista — Avaliações"** — **sem cards-resumo**, só título/subtítulo + tabela, a pedido explícito. Os dois cards reaproveitam `.pe-tabela-header`/`.pe-tabela-titulo`/`.indicadores-chart-subtitle` (mesmo padrão visual do Processo Editorial).

**Boas-vindas** (`obterNomeUsuarioLogado()`): lê `localStorage.getItem(CHAVE_USUARIO_LOGADO)` direto (mesma chave do login, ver seção 3) e devolve `usuario.nome` em maiúsculas; `''` se não houver usuário salvo ou o JSON estiver corrompido — nesse caso o texto cai para `"Olá!"` (sem nome). Não depende do estado interno de `domAuth`, só da mesma fonte (localStorage).

**Parser de data tolerante** (`parseDataAplicacao(valor)` — mais permissivo que `parseBrDate`, que só aceita `dd/mm/aaaa`): aceita `dd/mm/aaaa` (via `parseBrDate`), `aaaa-mm-dd` (ISO, com ou sem horário) e `Date` já pronto; `null` para vazio/inválido. Usado tanto pelo calendário quanto pela Gestão à Vista.

**Calendário mensal** (`montarCalendarioMensal(mesAtual, dados)`): grade de semanas completas (domingo–sábado), incluindo dias do mês anterior/seguinte para preencher a 1ª/última semana (`.geral-calendario-dia--fora-mes`, mais apagados). Estado do mês exibido: `geralCalendarioMesAtual` (sempre normalizado pro dia 1, sem horário); navegação via `voltarMesCalendario()`/`avancarMesCalendario()`/`irParaMesAtualCalendario()` (botões `‹`/`Hoje`/`›`). Dia atual destacado com `.geral-calendario-dia--hoje`. Registros sem `data_aplicacao` válida **nunca** aparecem aqui.

**Filtros compartilhados** (`geralFiltrosCalendario = { tipoAv, ano, modulo, busca }`, todos opcionais — agora afetam **calendário + Gestão à Vista**, não só o calendário): Tipo de AV e Ano usam listas fixas do projeto (`ORDEM_TIPO_AV_PERFORMANCE`/`ORDEM_ANO_ESCOLAR_COORD`); Módulo é populado dinamicamente a partir do recorte atual (`popularFiltroModuloGeral`, mesmo padrão de `populateSelectOptions` mas isolado — não usa `selectFilters`/o popover antigo, que continuam mortos/ocultos, ver "armadilha" abaixo); busca geral varre `tipo_av`/`ano`/`frente`/`modulo`/**`id`**.
- `filtrarAvaliacoesGeral(dados)` — aplica os 4 filtros acima, **sem** exigir `data_aplicacao` válida (usada pela Gestão à Vista, que mostra "-" nas colunas de data quando não há data).
- `filtrarAvaliacoesCalendario(dados)` — `filtrarAvaliacoesGeral(dados)` + descarta registros sem `data_aplicacao` válida (só para o calendário).
- Cada mudança de filtro chama `atualizarConteudoFiltravelGeral()`, que re-renderiza os dois blocos juntos a partir da mesma base.

**Eventos no dia** (`renderizarEventoCalendario`): tag `"MÓDULO · TIPO_AV · ANO · FRENTE"`, cor por tipo de AV (`obterClasseCorEventoCalendario`) — AV1 azul, AV2 verde, 2º CHAMADA laranja, REC-SEM roxo (cor nova no projeto, sem variável CSS prévia), REC-FIM vermelho, outro/não mapeado cinza neutro. Até 3 eventos visíveis por dia; acima disso, botão `"+ N avaliações"` expande a célula. Clique no evento abre `abrirDetalheEventoCalendario(record)` — modal com Módulo/Ano/Disciplina/Tipo de AV/Data de aplicação (`formatarDataAplicacaoExibicao`, sempre `dd/mm/aaaa` na exibição).

**Gestão à Vista — Avaliações** (`renderizarGestaoVistaAvaliacoes()` → `renderizarTabelaGestaoVistaAvaliacoes()`, tabela `#geralGestaoVistaTableBody`, sem agrupamento — 1 linha por registro, mesma base de `filtrarAvaliacoesGeral`): colunas **ID | Data da aplicação | Dias para aplicação | Status da aplicação | Etapa atual | Status do processo**.
- **ID**: reaproveita `obterIdProcessoEditorial(item)` (mesma função da tabela detalhada do Processo Editorial — `item.id` quando preenchido, senão fallback `MÓDULO-TIPOAV-ANO-FRENTE`).
- **Data da aplicação**: `dd/mm/aaaa` via `formatarDataAplicacaoExibicao`; `"-"` se não houver data válida.
- **Dias para aplicação** (`calcularDiasParaAplicacao` + `formatarDiasParaAplicacaoTexto`): `data_aplicacao - hoje` em dias; `"N dias"` (futuro), `"Hoje"` (0), `"Vencida há N dias"` (passado), `"-"` (sem data).
- **Status da aplicação** (`calcularStatusAplicacao`, badge): `> 30` dias → No prazo (verde) · `15–30` → Atenção (amarelo) · `1–14` → Próximo da aplicação (laranja, reaproveita `.badge-coord-com-atraso`) · `0` → Aplicação hoje (azul) · `< 0` → Vencido (vermelho); sem data → célula `"-"` sem badge.
- **Etapa atual** (`identificarEtapaAtual`, texto simples sem badge): hierarquia fixa da mais avançada pra menos avançada — Banco de Provas (`prova_em_branco`/`prova_com_gabarito` válidos, via `linkValido` — mesma validação da aba Banco de Provas) → Enviada para gráfica (`data_envio_grafica`/`envio_grafica`) → Arte-finalização e Envio (`data_checklist`/`checklist`/`arte_final`/`inicio_arte_final`/`fim_arte_final`) → 2ª Validação (`envio_assinatura_coord`/`devolutiva_assinatura_coord`) → Processo Editorial (qualquer um dos 12 campos início/fim de `CAMPOS_PROCESSO_EDITORIAL_GERAL`, mesmas colunas de `ETAPAS_PROCESSO_EDITORIAL`) → 1ª Validação (`data_validacao_sgge` ou `devolutiva_encomenda`) → Elaboração (fallback).
- **Status do processo** (`calcularStatusProcessoGeral`, badge, prioridade fixa): 1) **Atrasado** (vermelho — `data_aplicacao` já passou **e** não concluído) 2) **Concluído** (verde — `prova_em_branco`/`prova_com_gabarito` válidos) 3) **Em andamento** (azul — etapa atual ≠ Elaboração, ou `data_encomenda`/`devolutiva_encomenda` preenchidos) 4) **Não iniciado** (cinza, reaproveita `.badge-coord-nao-enviado` — nenhum sinal de início do fluxo).
- **Ordenação** (`ordenarGestaoVistaAvaliacoes`): 1º data de aplicação mais próxima (ascendente; sem data válida vai pro final) → 2º ano (ordem pedagógica) → 3º tipo de AV (ordem fixa) → 4º frente (alfabética).
- **Assunção não explícita no pedido, documentada aqui para revisão futura**: "Data da aplicação mais próxima primeiro" foi interpretada como ordem cronológica ascendente simples (a mais antiga/próxima primeiro, incluindo já vencidas), não como "menor distância absoluta até hoje" — se o comportamento esperado for outro, é só trocar o critério dentro de `ordenarGestaoVistaAvaliacoes`.

**Nota — `filtersPanel`/`viewGeral`/`cardsGrid` legados**: esses elementos (tabela/filtros da 1ª versão do painel, anterior ao sistema de abas) continuam **permanentemente ocultos** em `trocarAba` (`dom.filtersPanel.hidden = true` etc., para qualquer aba) e não têm relação nenhuma com a aba Geral — `filteredRecords` (a variável, não o painel visual) continua sendo produzida por eles em segundo plano (`applyFilters()`, chamada após `loadData()`), mas como os campos desse painel morto nunca são tocados pelo usuário, `filteredRecords` na prática equivale ao dataset completo. Calendário e Gestão à Vista consomem `filteredRecords` diretamente, com filtros 100% próprios por cima.

## 15. Pendências conhecidas

- **Aba Geral**: agora com boas-vindas + calendário mensal de avaliações — ver seção 12.15. Modal de detalhe do evento é intencionalmente simples (sem edição/ações).
- **Processo Editorial**: cobre as 8 etapas centrais + resumo por ano + regras de bloco/bloquinho (seção 12). Ainda não tem: gráficos, sub-visão "Indicadores — Processo Editorial", nem uso dos campos de apoio que sobraram (`envio_grafica`/`data_envio_grafica`, `checklist`/`data_checklist`, `prova_em_branco`/`data_prova_em_branco`, `prova_com_gabarito`/`data_prova_com_gabarito`, `verificacao_validacao_coord` e variantes, `observacao`).
- **Processo Editorial — frentes não mapeadas**: "EDUCAÇÃO FÍSICA", "HISTÓRIA 1/2", "GEOGRAFIA 1/2" (Ensino Médio) caem fora das listas fechadas de bloco e são descartadas com `console.warn` — se essas variações forem legítimas no currículo, falta decidir o mapeamento exato (ex.: "HISTÓRIA 1"/"HISTÓRIA 2" contam como a mesma frente "HISTÓRIA" do BLOCO 1?) e adicionar às listas.
- ~~**Bug de CSS conhecido — `.pe-cards-grid`**~~ **Corrigido** (mesma correção de especificidade também já estava aplicada a `.coordenador-cards-grid`/`.assinatura-cards-grid`, ver seção 8): o seletor foi trocado para `.banco-cards-grid.pe-cards-grid` (mesmo padrão já aplicado em `.assinatura-cards-grid`/`.coordenador-cards-grid`), então os 3 cards agora renderizam de fato em 3 colunas. Aproveitado para também deixar os cards do topo mais equilibrados (`.pe-cards-grid .banco-card`: `min-height` maior, padding mais generoso, ícone alinhado ao topo, métrica centralizada verticalmente) e dar mais respiro entre os cards e a tabela (`margin-bottom` do grid, header da tabela `.pe-tabela-header` com padding maior + `border-bottom` para separar visualmente do bloco "Fluxo do Processo Editorial").
- Nenhuma dessas pendências foi formalmente pedida ainda — são só lacunas observadas pelo histórico de padrões já aplicados no restante do projeto.

## 16. Resumo rápido das últimas alterações (Elaborador/Coordenador)

- Tabela "Recorrência de atraso por elaborador" reordenada: agora por maior **Taxa de atraso** (era por classificação).
- Gráfico "Performance da entrega do elaborador": pontos/linha/rótulos em **azul** quando valor `<= 0`, **vermelho** quando `> 0`.
- Tabela "Recorrência de atraso por coordenador": coluna **Classificação removida**; ordenada por maior **Taxa de atraso**.
- Card "Coordenador que mais atrasa" (Indicadores — Coordenador): passou a usar a **maior média de atraso** (era soma acumulada).
- Card "Maior atraso individual" (Coordenador): subtítulo agora mostra o **nome do coordenador**.
- Gráfico "Desempenho do coordenador": **sem limite de 10** coordenadores; linha azul (volume) sem rótulo fixo nos pontos.
- Gráficos de Indicadores — Coordenador confirmados **respeitando todos os filtros** ativos (popover + pills + cliques) — investigação não encontrou bug, comportamento já estava correto.
- "Total de provas por ano escolar" (Coordenador) → renomeado para **"Média de atraso por ano escolar"**, métrica trocada de contagem para média.
- "Ocorrências de atraso por coordenador" removido; "Distribuição dos atrasos por avaliação" (donut) e "Atraso por avaliação" (barras) adicionados no lugar.

## 17. Próximos passos sugeridos (checklist de validação do Processo Editorial)

- [ ] Validar os agrupamentos especiais (Ensino Médio por bloco, 9º ano/AV2 por bloquinho) com um usuário que conheça o currículo real, especialmente as frentes hoje descartadas (ver seção 15).
- [ ] Revisar se os totais dos cards do Processo Editorial continuam batendo com os cards equivalentes da aba Coordenador (ex.: "Total de provas validadas" vs "Validadas") conforme a planilha for sendo populada com dados reais de etapas.
- [ ] Testar o filtro "Filtrar por avaliação:" (pills) combinado com o popover (Módulo/Ano/Disciplina/Status) em vários recortes.
- [ ] Testar a expansão de todos os 7 anos (6º-9º e 1º-3º), inclusive alternando entre eles.
- [ ] Conferir periodicamente que não aparecem linhas "BLOCO NÃO IDENTIFICADO"/"BLOQUINHO NÃO IDENTIFICADO" (não deveriam existir mais — checar o console em vez disso).
- [ ] Continuar os ajustes visuais/estruturais da seção Processo Editorial conforme novo feedback.
