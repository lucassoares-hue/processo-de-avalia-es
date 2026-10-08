// URL da API (Google Apps Script)
const API_URL = 'https://script.google.com/macros/s/AKfycbxErj5nbdMxi1GL1upVvVjwA_KpqgdK3RcSf0V49w0MJTC-NCC0hAmWeB28uki3eQzFhA/exec';

// URL da API de autenticação (Google Apps Script), separada da API principal de dados
const AUTH_API_URL = 'https://script.google.com/macros/s/AKfycbybkSN3rv1wm3MatP_vwtze7r6bqjWTAn2v7rJK4YvpDgjozXaDVOdyz6FlC59WnwCHWw/exec';
const CHAVE_USUARIO_LOGADO = 'usuarioLogadoSGGE';

// URL da API da planilha BD_MACRO2 (Google Apps Script), independente da API principal
// (API_URL/BD_SGGE) — alimenta só a seção "GPA" por enquanto. Resposta: { success, total_gpa,
// total_qualidade, gpa: [...], qualidade: [...] }
const API_MACRO2_URL = 'https://script.google.com/macros/s/AKfycbyodkISnkFM63FOWAUt6pZLG3uqSm2GPfCrwfSy0Gi1vAk-BdXi4_bqT5FEXENlp7xE/exec';

// Estado global da aplicação
let allRecords = [];
let processedRecords = [];
let filteredRecords = [];
// Dados da BD_MACRO2 — dadosGPA alimenta a seção "GPA"; dadosQualidade só é armazenado por
// enquanto (uso futuro), não é usado em nenhuma tela ainda
let dadosGPA = [];
let dadosQualidade = [];
let abaAtual = 'geral';
let filtroRapidoElaborador = null;
let visaoElaborador = 'acompanhamento'; // 'acompanhamento' | 'indicadores'
let filtroRapidoCoordenador = null;
let coordenadorExpandido = null;
// Filtro global de tipo de AV da aba Coordenador (barra "Filtrar por avaliação" no topo da
// seção): afeta a tabela principal de coordenadores e, por consequência, as demandas
// exibidas ao expandir qualquer coordenador. Não afeta os cards do topo.
let coordFiltroTipoAvGlobal = null;

// Filtros interativos aplicados ao clicar em itens dos gráficos da seção Indicadores —
// somem à consulta que já vem dos filtros do popover/busca/filtro rápido dos cards
let filtrosIndicadores = {
  elaborador: null,
  tipo_av: null,
  disciplina: null,
  ano: null,
  segmento: null
};

// Referências dos filtros específicos da aba Elaborador
// Filtro rápido de Módulo no cabeçalho (fora do popover) — continua <select> único
const elabSelectFilters = {
  ano: document.getElementById('filterElabAnoRapido'),
  modulo: document.getElementById('filterElabModuloRapido')
};
// Grupos de checkboxes dos demais campos do popover da aba Elaborador
const elabCheckboxGroups = {
  ano: document.getElementById('filterElabAnoGroup'),
  frente: document.getElementById('filterElabDisciplinaGroup'),
  tipoAv: document.getElementById('filterElabTipoAvGroup'),
  statusEncomenda: document.getElementById('filterElabStatusEncomendaGroup'),
  statusPrazo: document.getElementById('filterElabStatusPrazoGroup'),
  statusValidacao: document.getElementById('filterElabStatusValidacaoGroup')
};
// Estado dos filtros multi-seleção do popover da aba Elaborador — só é copiado dos checkboxes
// para cá ao clicar "Aplicar filtros"
const filtrosElaborador = {
  anos: [],
  disciplinas: [],
  tiposAv: [],
  statusEncomenda: [],
  statusPrazo: [],
  statusValidacao: []
};
const elabFilterBusca = document.getElementById('filterElabBusca');
const btnLimparFiltrosElab = document.getElementById('btnLimparFiltrosElab');
const btnAplicarFiltrosElab = document.getElementById('btnAplicarFiltrosElab');
const btnAtualizarElab = document.getElementById('btnAtualizarElab');

// Referências do popover de filtros da seção Indicadores — Elaborador, acionado pelo botão
// de ícone de funil no topo da seção. Filtragem própria, aplicada por cima do recorte já
// filtrado pelo popover/busca/card da aba Elaborador (indicadoresDadosBase)
// filterIndModulo continua o filtro rápido de Módulo (fora do popover, <select> único); os
// demais campos abaixo viraram grupos de checkboxes dentro do popover
const indSelectFilters = {
  modulo: document.getElementById('filterIndModulo')
};
const indCheckboxGroups = {
  ano: document.getElementById('filterIndAnoGroup'),
  disciplina: document.getElementById('filterIndDisciplinaGroup'),
  tipoAv: document.getElementById('filterIndTipoAvGroup'),
  elaborador: document.getElementById('filterIndElaboradorGroup')
};
// Estado dos filtros multi-seleção do popover de Indicadores — Elaborador — só é copiado dos
// checkboxes para cá ao clicar "Aplicar filtros" (ver aplicarCheckboxesIndicadoresTopo)
const filtrosIndicadoresTopo = {
  anos: [],
  disciplinas: [],
  tiposAv: [],
  elaboradores: []
};
const indFilterBusca = document.getElementById('filterIndBusca');
const btnLimparFiltrosInd = document.getElementById('btnLimparFiltrosInd');
const btnAplicarFiltrosInd = document.getElementById('btnAplicarFiltrosInd');
const btnAtualizarInd = document.getElementById('btnAtualizarInd');

// Filtro rápido de Módulo do cabeçalho da seção Indicadores — Elaborador (mesmo <select
// id="filterIndModulo"> referenciado em indSelectFilters.modulo, só o wrapper visual)
const indModuloRapidoWrapper = document.getElementById('indModuloRapidoWrapper');

// Referências do botão de filtro (no topo da seção) e do popover de filtros dos Indicadores
const indFilterPopoverWrapper = document.getElementById('indFilterPopoverWrapper');
const btnAbrirFiltrosInd = document.getElementById('btnAbrirFiltrosInd');
const indFiltersPopover = document.getElementById('indFiltersPopover');
const btnFecharFiltrosInd = document.getElementById('btnFecharFiltrosInd');
const indFilterBadge = document.getElementById('indFilterBadge');

// Referência do wrapper do filtro rápido de Módulo, ao lado do botão de filtro geral
const elabModuloRapidoWrapper = document.getElementById('elabModuloRapidoWrapper');
// Referência do wrapper do filtro rápido de Ano (baseado em data_aplicacao), ao lado esquerdo
// do filtro rápido de Módulo
const elabAnoRapidoWrapper = document.getElementById('elabAnoRapidoWrapper');

// Referência do wrapper dos filtros rápidos (Ano + Módulo) da aba Geral, no topo direito do header
const geralHeaderFiltrosWrapper = document.getElementById('geralHeaderFiltrosWrapper');

// Referências do botão de filtro (no cabeçalho) e do popover da aba Elaborador
const elabFilterPopoverWrapper = document.getElementById('elabFilterPopoverWrapper');
const btnAbrirFiltrosElab = document.getElementById('btnAbrirFiltrosElab');
const elabFiltersPopover = document.getElementById('elabFiltersPopover');
const btnFecharFiltrosElab = document.getElementById('btnFecharFiltrosElab');
const elabFilterBadge = document.getElementById('elabFilterBadge');

// Referências do botão "Indicadores" (no cabeçalho) e das duas visões internas da aba Elaborador
const btnIndicadores = document.getElementById('btnIndicadores');
const btnVoltarAcompanhamento = document.getElementById('btnVoltarAcompanhamento');
const viewElaboradorAcompanhamento = document.getElementById('viewElaboradorAcompanhamento');
const viewElaboradorIndicadores = document.getElementById('viewElaboradorIndicadores');
// Título "Painel de Avaliações SGGE" da barra superior, substituído pelo botão
// "← Voltar ao acompanhamento" enquanto o usuário está na tela Indicadores — Elaborador
const appHeaderTitles = document.getElementById('appHeaderTitles');

// Referências dos filtros específicos da aba Coordenador
// filterCoordModulo continua o filtro rápido de Módulo (<select> único, fora do popover)
const coordSelectFilters = {
  ano: document.getElementById('filterCoordAnoRapido'),
  modulo: document.getElementById('filterCoordModulo')
};
const coordCheckboxGroups = {
  tipoAv: document.getElementById('filterCoordTipoAvGroup'),
  ano: document.getElementById('filterCoordAnoGroup'),
  frente: document.getElementById('filterCoordDisciplinaGroup'),
  coordenador: document.getElementById('filterCoordCoordenadorGroup'),
  statusGeral: document.getElementById('filterCoordStatusGeralGroup'),
  situacaoPrazo: document.getElementById('filterCoordSituacaoPrazoGroup')
};
// Estado dos filtros multi-seleção do popover da aba Coordenador — só é copiado dos checkboxes
// ao clicar "Aplicar filtros"
const filtrosCoordenador = {
  tiposAv: [],
  anos: [],
  disciplinas: [],
  coordenadores: [],
  statusGeral: [],
  situacaoPrazo: []
};
const coordFilterBusca = document.getElementById('filterCoordBusca');
const btnLimparFiltrosCoord = document.getElementById('btnLimparFiltrosCoord');
const btnAplicarFiltrosCoord = document.getElementById('btnAplicarFiltrosCoord');
const btnAtualizarCoord = document.getElementById('btnAtualizarCoord');

// Referência do wrapper do filtro rápido de Módulo, ao lado do botão de filtro geral
const coordModuloRapidoWrapper = document.getElementById('coordModuloRapidoWrapper');
// Referência do wrapper do filtro rápido de Ano (baseado em data_aplicacao), ao lado esquerdo
// do filtro rápido de Módulo
const coordAnoRapidoWrapper = document.getElementById('coordAnoRapidoWrapper');

// Referências do botão de filtro (no cabeçalho) e do popover da aba Coordenador
const coordFilterPopoverWrapper = document.getElementById('coordFilterPopoverWrapper');
const btnAbrirFiltrosCoord = document.getElementById('btnAbrirFiltrosCoord');
const coordFiltersPopover = document.getElementById('coordFiltersPopover');
const btnFecharFiltrosCoord = document.getElementById('btnFecharFiltrosCoord');
const coordFilterBadge = document.getElementById('coordFilterBadge');

// Referências do botão "Indicadores" (no cabeçalho) e das duas visões internas da aba Coordenador
const btnIndicadoresCoord = document.getElementById('btnIndicadoresCoord');
const btnVoltarAcompanhamentoCoord = document.getElementById('btnVoltarAcompanhamentoCoord');
const viewCoordenadorAcompanhamento = document.getElementById('viewCoordenadorAcompanhamento');
const viewCoordenadorIndicadores = document.getElementById('viewCoordenadorIndicadores');
let visaoCoordenador = 'acompanhamento'; // 'acompanhamento' | 'indicadores'

// Filtros interativos da seção "Indicadores — Coordenador" (cliques nos gráficos), isolados
// dos filtros da aba Elaborador (filtrosIndicadores)
let filtrosIndicadoresCoordenador = {
  tipoAv: null,
  coordenador: null,
  classificacao: null
};
let indicadoresCoordenadorDadosBase = [];

// Referências do popover de filtros da seção Indicadores — Coordenador, acionado pelo botão
// de ícone de funil no topo da seção (mesmo padrão da seção Indicadores — Elaborador)
// filterIndCoordModulo continua o filtro rápido de Módulo (<select> único, fora do popover)
const indSelectFiltersCoord = {
  modulo: document.getElementById('filterIndCoordModulo')
};
const indCheckboxGroupsCoord = {
  ano: document.getElementById('filterIndCoordAnoGroup'),
  disciplina: document.getElementById('filterIndCoordDisciplinaGroup'),
  coordenador: document.getElementById('filterIndCoordCoordenadorGroup'),
  tipoAv: document.getElementById('filterIndCoordTipoAvGroup')
};
// Estado dos filtros multi-seleção do popover de Indicadores — Coordenador
const filtrosIndicadoresTopoCoord = {
  anos: [],
  disciplinas: [],
  coordenadores: [],
  tiposAv: []
};
const indFilterBuscaCoord = document.getElementById('filterIndCoordBusca');
const btnLimparFiltrosIndCoord = document.getElementById('btnLimparFiltrosIndCoord');
const btnAplicarFiltrosIndCoord = document.getElementById('btnAplicarFiltrosIndCoord');
const btnAtualizarIndCoord = document.getElementById('btnAtualizarIndCoord');

// Filtro rápido de Módulo do cabeçalho da seção Indicadores — Coordenador (mesmo <select
// id="filterIndCoordModulo"> referenciado em indSelectFiltersCoord.modulo, só o wrapper visual)
const indModuloRapidoWrapperCoord = document.getElementById('indModuloRapidoWrapperCoord');

// Referências do botão de filtro (no topo da seção) e do popover de filtros dos Indicadores — Coordenador
const indFilterPopoverWrapperCoord = document.getElementById('indFilterPopoverWrapperCoord');
const btnAbrirFiltrosIndCoord = document.getElementById('btnAbrirFiltrosIndCoord');

// Botão "2ª Validação" dentro de Indicadores — Coordenador: abre os indicadores da antiga aba
// Assinatura Coordenador (atalho "indicador-segunda-validacao"), reaproveitando a mesma tela —
// ver 2.2 no RESUMO_TECNICO
const btnAbrirSegundaValidacaoIndCoord = document.getElementById('btnAbrirSegundaValidacaoIndCoord');
const indFiltersPopoverCoord = document.getElementById('indFiltersPopoverCoord');
const btnFecharFiltrosIndCoord = document.getElementById('btnFecharFiltrosIndCoord');
const indFilterBadgeCoord = document.getElementById('indFilterBadgeCoord');

// Referências da seção "Processo Editorial" (antiga "Sistema GGE"): cards, tabela e popover
// de filtros no topo, acionado pelo botão de ícone de funil
// filterPEModulo continua o filtro rápido de Módulo (<select> único, fora do popover)
const peSelectFilters = {
  ano: document.getElementById('filterPEAnoRapido'),
  modulo: document.getElementById('filterPEModulo')
};
const peCheckboxGroups = {
  ano: document.getElementById('filterPEAnoGroup'),
  disciplina: document.getElementById('filterPEDisciplinaGroup'),
  tipoAv: document.getElementById('filterPETipoAvGroup'),
  responsavel: document.getElementById('filterPEResponsavelGroup'),
  statusEditorial: document.getElementById('filterPEStatusEditorialGroup')
};
// Estado dos filtros multi-seleção do popover da seção Processo Editorial
const filtrosProcessoEditorial = {
  anos: [],
  disciplinas: [],
  tiposAv: [],
  responsaveis: [],
  statusEditorial: []
};
const peFilterBusca = document.getElementById('filterPEBusca');
const btnLimparFiltrosPE = document.getElementById('btnLimparFiltrosPE');
const btnAplicarFiltrosPE = document.getElementById('btnAplicarFiltrosPE');
const btnAtualizarPE = document.getElementById('btnAtualizarPE');

// Referência do wrapper do filtro rápido de Módulo, ao lado do botão de filtro geral
const peModuloRapidoWrapper = document.getElementById('peModuloRapidoWrapper');
// Referência do wrapper do filtro rápido de Ano (baseado em data_aplicacao), ao lado esquerdo
// do filtro rápido de Módulo
const peAnoRapidoWrapper = document.getElementById('peAnoRapidoWrapper');

const peFilterPopoverWrapper = document.getElementById('peFilterPopoverWrapper');
const btnAbrirFiltrosPE = document.getElementById('btnAbrirFiltrosPE');
const peFiltersPopover = document.getElementById('peFiltersPopover');
const btnFecharFiltrosPE = document.getElementById('btnFecharFiltrosPE');
const peFilterBadge = document.getElementById('peFilterBadge');

const peCardsGrid = document.getElementById('peCardsGrid');
const peTableBody = document.getElementById('peTableBody');
const peEmptyMessage = document.getElementById('peEmptyMessage');
const peTableWrapper = document.getElementById('peTableWrapper');
const peFiltroAvaliacaoTopo = document.getElementById('peFiltroAvaliacaoTopo');

// Referências da seção "Arte-finalização e Envio" (mesmo padrão estrutural da seção Processo
// Editorial — cards + tabela + filtro "Filtrar por avaliação" + filtro rápido de Módulo +
// popover de filtros gerais)
const afeCardsGrid = document.getElementById('afeCardsGrid');
const afeCardAssinadas = document.getElementById('afeCardAssinadas');
const afeCardAndamento = document.getElementById('afeCardAndamento');
const afeCardEnviadas = document.getElementById('afeCardEnviadas');
const afeTableBody = document.getElementById('afeTableBody');
const afeEmptyMessage = document.getElementById('afeEmptyMessage');
const afeTableWrapper = document.getElementById('afeTableWrapper');
const afeFiltroAvaliacaoTopo = document.getElementById('afeFiltroAvaliacaoTopo');
const afeFiltroCardChipWrapper = document.getElementById('afeFiltroCardChipWrapper');
const afeFiltroCardChipTexto = document.getElementById('afeFiltroCardChipTexto');
const btnFecharFiltroCardAFE = document.getElementById('btnFecharFiltroCardAFE');

// Filtro rápido de Módulo + popover de filtros gerais (Ano/Tipo de AV/Status/busca) da seção
// Arte-finalização e Envio — mesmo padrão de peSelectFilters/peModuloRapidoWrapper
const afeModuloRapidoWrapper = document.getElementById('afeModuloRapidoWrapper');
// Referência do wrapper do filtro rápido de Ano (baseado em data_aplicacao), ao lado esquerdo
// do filtro rápido de Módulo
const afeAnoRapidoWrapper = document.getElementById('afeAnoRapidoWrapper');
const afeFilterPopoverWrapper = document.getElementById('afeFilterPopoverWrapper');
const btnAbrirFiltrosAFE = document.getElementById('btnAbrirFiltrosAFE');
const afeFiltersPopover = document.getElementById('afeFiltersPopover');
const btnFecharFiltrosAFE = document.getElementById('btnFecharFiltrosAFE');
const afeFilterBadge = document.getElementById('afeFilterBadge');
const afeFilterBusca = document.getElementById('filterAFEBusca');
const btnLimparFiltrosAFE = document.getElementById('btnLimparFiltrosAFE');
const btnAtualizarAFE = document.getElementById('btnAtualizarAFE');
const btnAplicarFiltrosAFE = document.getElementById('btnAplicarFiltrosAFE');
// filterAFEModulo continua o filtro rápido de Módulo (<select> único, fora do popover)
const afeSelectFilters = {
  ano: document.getElementById('filterAFEAnoRapido'),
  modulo: document.getElementById('filterAFEModulo')
};
const afeCheckboxGroups = {
  ano: document.getElementById('filterAFEAnoGroup'),
  tipoAv: document.getElementById('filterAFETipoAvGroup'),
  status: document.getElementById('filterAFEStatusGroup')
};
// Estado dos filtros multi-seleção do popover da seção Arte-finalização e Envio
const filtrosArteFinalizacaoEnvio = {
  anos: [],
  tiposAv: [],
  status: []
};

// Filtro global "Filtrar por avaliação:" (pills) da seção Arte-finalização e Envio — mesmo
// padrão de peFiltroTipoAvGlobal/coordFiltroTipoAvGlobal: null = "Todas"
let afeFiltroTipoAvGlobal = null;

// Ano (chave normalizada, ex.: '6º') atualmente expandido na tabela principal da seção
// Arte-finalização e Envio, mostrando o detalhamento por registro logo abaixo; null = nenhum
// expandido — mesmo padrão de anoExpandidoProcessoEditorial
let anoExpandidoArteFinalizacaoEnvio = null;

// Filtro rápido (clique em card) da seção Processo Editorial: 'total' | 'concluido' |
// 'andamento' | 'pendente' | null
let filtroRapidoProcessoEditorial = null;

// Filtro rápido (clique em card) da seção Arte-finalização e Envio: 'assinadas' |
// 'em_andamento' | 'enviadas_grafica' | null — mesmo padrão de filtroRapidoProcessoEditorial,
// isolado nesta seção
let filtroCardArteFinalizacao = null;

// Ano (chave normalizada, ex.: '6º') atualmente expandido na tabela principal do Processo
// Editorial, mostrando o detalhamento por registro logo abaixo; null = nenhum expandido
let anoExpandidoProcessoEditorial = null;

// Filtro global "Filtrar por avaliação:" (pills) no cabeçalho da seção Processo Editorial —
// mesmo padrão da aba Coordenador (coordFiltroTipoAvGlobal): null = "Todas"
let peFiltroTipoAvGlobal = null;

// Referências do botão "Indicadores" (no cabeçalho) e das duas visões internas da aba
// Processo Editorial (mesmo padrão de Elaborador/Coordenador)
const btnIndicadoresPE = document.getElementById('btnIndicadoresPE');
const btnVoltarAcompanhamentoPE = document.getElementById('btnVoltarAcompanhamentoPE');
const viewProcessoEditorialAcompanhamento = document.getElementById('viewSistemaGGE');
const viewProcessoEditorialIndicadores = document.getElementById('viewProcessoEditorialIndicadores');

// "Previsto vs. Realizado" — seção própria dentro do grupo "Indicadores do Processo", não é
// atalho de nenhuma aba existente (ver bloco de funções mais abaixo, perto de
// renderizarIndicadoresAssinaturaCoordenador)
const viewPrevistoRealizado = document.getElementById('viewPrevistoRealizado');
const viewGPA = document.getElementById('gpa-section');
let visaoProcessoEditorial = 'acompanhamento'; // 'acompanhamento' | 'indicadores'

// --- "Resumo da Produção" (2026-09-11) — seção própria (não é atalho de nenhuma aba
// existente), mesmo padrão de Previsto vs. Realizado/Análise de Tempo: visão executiva do total
// de avaliações e do andamento de cada etapa do Processo de Produção
const viewResumoProducao = document.getElementById('viewResumoProducao');
const resumoProducaoConteudo = document.getElementById('resumoProducaoConteudo');
const resumoProducaoEmptyMessage = document.getElementById('resumoProducaoEmptyMessage');
const resumoProducaoCardTotal = document.getElementById('resumoProducaoCardTotal');
const resumoProducaoCardM3 = document.getElementById('resumoProducaoCardM3');
const resumoProducaoCardM4 = document.getElementById('resumoProducaoCardM4');
const resumoProducaoEtapasGrid = document.getElementById('resumoProducaoEtapasGrid');
const resumoProducaoTabelaEtapasBody = document.getElementById('resumoProducaoTabelaEtapasBody');
const resumoProducaoEtapaChipWrapper = document.getElementById('resumoProducaoEtapaChipWrapper');
const resumoProducaoEtapaChipTexto = document.getElementById('resumoProducaoEtapaChipTexto');
const btnFecharEtapaChipResumoProducao = document.getElementById('btnFecharEtapaChipResumoProducao');
const resumoProducaoDetalheEtapaCard = document.getElementById('resumoProducaoDetalheEtapaCard');
const resumoProducaoDetalheEtapaTitulo = document.getElementById('resumoProducaoDetalheEtapaTitulo');
const resumoProducaoDetalheEtapaBody = document.getElementById('resumoProducaoDetalheEtapaBody');
const resumoDetalheEtapaStatusWrapper = document.getElementById('resumoDetalheEtapaStatusWrapper');
const filterResumoDetalheEtapaStatus = document.getElementById('filterResumoDetalheEtapaStatus');

const filterResumoAnoAplicacao = document.getElementById('filterResumoAnoAplicacao');
const filterResumoModulo = document.getElementById('filterResumoModulo');
const filterResumoTipoAv = document.getElementById('filterResumoTipoAv');
const filterResumoAnoSerie = document.getElementById('filterResumoAnoSerie');
const filterResumoSegmento = document.getElementById('filterResumoSegmento');
const filterResumoBusca = document.getElementById('filterResumoBusca');

// Etapa de card clicada (destaca o card + mostra a tabela "Detalhamento da etapa" abaixo);
// null = nenhuma etapa selecionada. Mesmo padrão de alternância de filtroCardArteFinalizacao.
let etapaSelecionadaResumoProducao = null;

// Filtro "Status" da tabela "Detalhamento da etapa" — por enquanto só usado quando a etapa
// selecionada é "Processo Editorial" (ver renderizarDetalheEtapaResumoProducao); '' = "Todos".
// Afeta só essa tabela, mantido mesmo ao trocar de etapa (mais simples que resetar).
let filtroStatusDetalheEtapaResumoProducao = '';

// Filtros próprios da seção (isolados do resto do projeto) — mesmo padrão de
// filtrosPrevistoRealizado
let filtrosResumoProducao = { anoAplicacao: '', modulo: '', tipoAv: '', anoSerie: '', segmento: '', busca: '' };

// Filtros interativos da seção "Indicadores — Processo Editorial" (cliques nos gráficos),
// isolados dos demais filtros interativos de Elaborador/Coordenador
let filtrosIndicadoresPE = {
  ano: null,
  tipoAv: null,
  modulo: null,
  etapa: null,
  status: null
};
let indicadoresPEDadosBase = [];

// Referências do popover de filtros da seção Indicadores — Processo Editorial (mesmo padrão
// da seção Indicadores — Coordenador)
// filterIndPEModulo continua o filtro rápido de Módulo (<select> único, fora do popover)
const indSelectFiltersPE = {
  modulo: document.getElementById('filterIndPEModulo')
};
const indCheckboxGroupsPE = {
  ano: document.getElementById('filterIndPEAnoGroup'),
  tipoAv: document.getElementById('filterIndPETipoAvGroup'),
  status: document.getElementById('filterIndPEStatusGroup')
};
// Estado dos filtros multi-seleção do popover de Indicadores — Processo Editorial
const filtrosIndicadoresTopoPE = {
  anos: [],
  tiposAv: [],
  status: []
};
const indFilterBuscaPE = document.getElementById('filterIndPEBusca');
const btnLimparFiltrosIndPE = document.getElementById('btnLimparFiltrosIndPE');
const btnAplicarFiltrosIndPE = document.getElementById('btnAplicarFiltrosIndPE');
const btnAtualizarIndPE = document.getElementById('btnAtualizarIndPE');

// Filtro rápido de Módulo do cabeçalho da seção Indicadores — Processo Editorial (mesmo
// <select id="filterIndPEModulo"> referenciado em indSelectFiltersPE.modulo, só o wrapper visual)
const indModuloRapidoWrapperPE = document.getElementById('indModuloRapidoWrapperPE');

const indFilterPopoverWrapperPE = document.getElementById('indFilterPopoverWrapperPE');
const btnAbrirFiltrosIndPE = document.getElementById('btnAbrirFiltrosIndPE');
const indFiltersPopoverPE = document.getElementById('indFiltersPopoverPE');
const btnFecharFiltrosIndPE = document.getElementById('btnFecharFiltrosIndPE');
const indFilterBadgePE = document.getElementById('indFilterBadgePE');

// DOM da view "Indicadores — Processo Editorial"
const domIndPE = {
  emptyGeral: document.getElementById('indPEEmptyGeral'),
  conteudo: document.getElementById('indPEConteudo'),
  filtrosAtivos: document.getElementById('indPEFiltrosAtivos'),
  filtrosAtivosLista: document.getElementById('indPEFiltrosAtivosLista'),
  cardMediaGeral: document.getElementById('indPECardMediaGeral'),
  cardEtapaLenta: document.getElementById('indPECardEtapaLenta'),
  cardEtapaLentaSub: document.getElementById('indPECardEtapaLentaSub'),
  cardGargalo: document.getElementById('indPECardGargalo'),
  cardGargaloSub: document.getElementById('indPECardGargaloSub'),
  cardAndamento: document.getElementById('indPECardAndamento'),
  cardConcluidas: document.getElementById('indPECardConcluidas'),
  cardTaxaConclusao: document.getElementById('indPECardTaxaConclusao'),
  cardTaxaConclusaoSub: document.getElementById('indPECardTaxaConclusaoSub'),
  resumoBody: document.getElementById('indPEResumoBody')
};

// Referências da seção "Banco de Provas": cards, tabela e popover de filtros no topo,
// acionado pelo botão de ícone de funil (mesmo padrão da seção Processo Editorial)
// filterBPModulo continua um <select> único (filtro rápido, fora do painel de filtros
// avançados) — só os campos abaixo (dentro do painel) viraram grupos de checkboxes
const bpSelectFilters = {
  modulo: document.getElementById('filterBPModulo')
};
// Grupos de checkboxes do painel de filtros avançados do Banco de Provas
const bpCheckboxGroups = {
  ano: document.getElementById('filterBPAnoGroup'),
  segmento: document.getElementById('filterBPSegmentoGroup'),
  tipoAv: document.getElementById('filterBPTipoAvGroup'),
  disciplina: document.getElementById('filterBPDisciplinaGroup')
};
// Estado dos filtros multi-seleção do Banco de Provas — arrays vazios = sem restrição
const filtrosBancoProvas = {
  anos: [],
  segmentos: [],
  tiposAv: [],
  disciplinas: []
};
const bpFilterBusca = document.getElementById('filterBPBusca');
const btnLimparFiltrosBP = document.getElementById('btnLimparFiltrosBP');

const bpFilterPopoverWrapper = document.getElementById('bpFilterPopoverWrapper');
const btnAbrirFiltrosBP = document.getElementById('btnAbrirFiltrosBP');
const bpFiltersPopover = document.getElementById('bpFiltersPopover');
const btnFecharFiltrosBP = document.getElementById('btnFecharFiltrosBP');
const bpFilterBadge = document.getElementById('bpFilterBadge');

const bpTableBody = document.getElementById('bpTableBody');
const bpEmptyMessage = document.getElementById('bpEmptyMessage');
const bpTableWrapper = document.getElementById('bpTableWrapper');
const bpFiltroAnoTopo = document.getElementById('bpFiltroAnoTopo');

// Filtro pill "FILTRAR:" (por Ano) no cabeçalho da tabela do Banco de Provas — mesmo padrão
// visual/comportamento do "Filtrar por avaliação:" da aba Processo Editorial; null = "Todos"
let bpFiltroAnoGlobal = null;

// Referências da seção "Assinatura Coordenador": cards, tabela e popover de filtros no topo
// (mesma estrutura/comportamento da aba Coordenador, trocando os campos por
// envio_assinatura_coord/prazo_assinatura_coord/devolutiva_assinatura_coord/observacao)
// filterAssCoordModuloRapido continua o filtro rápido de Módulo (<select> único, fora do popover)
const assCoordSelectFilters = {
  ano: document.getElementById('filterAssCoordAnoRapido'),
  modulo: document.getElementById('filterAssCoordModuloRapido')
};
const assCoordCheckboxGroups = {
  ano: document.getElementById('filterAssCoordAnoGroup'),
  frente: document.getElementById('filterAssCoordDisciplinaGroup'),
  tipoAv: document.getElementById('filterAssCoordTipoAvGroup'),
  coordenador: document.getElementById('filterAssCoordCoordenadorGroup'),
  status: document.getElementById('filterAssCoordStatusGroup')
};
// Estado dos filtros multi-seleção do popover da aba Assinatura Coordenador
const filtrosAssinaturaCoordenador = {
  anos: [],
  disciplinas: [],
  tiposAv: [],
  coordenadores: [],
  status: []
};
const assCoordFilterBusca = document.getElementById('filterAssCoordBusca');
const btnLimparFiltrosAssCoord = document.getElementById('btnLimparFiltrosAssCoord');
const btnAplicarFiltrosAssCoord = document.getElementById('btnAplicarFiltrosAssCoord');
const btnAtualizarAssCoord = document.getElementById('btnAtualizarAssCoord');

// Referência do wrapper do filtro rápido de Módulo, ao lado do botão de filtro geral
const assCoordModuloRapidoWrapper = document.getElementById('assCoordModuloRapidoWrapper');
// Referência do wrapper do filtro rápido de Ano (baseado em data_aplicacao), ao lado esquerdo
// do filtro rápido de Módulo
const assCoordAnoRapidoWrapper = document.getElementById('assCoordAnoRapidoWrapper');

const assCoordFilterPopoverWrapper = document.getElementById('assCoordFilterPopoverWrapper');
const btnAbrirFiltrosAssCoord = document.getElementById('btnAbrirFiltrosAssCoord');
const assCoordFiltersPopover = document.getElementById('assCoordFiltersPopover');
const btnFecharFiltrosAssCoord = document.getElementById('btnFecharFiltrosAssCoord');
const assCoordFilterBadge = document.getElementById('assCoordFilterBadge');

const domAssCoord = {
  emptyGeral: document.getElementById('assCoordEmptyGeral'),
  conteudo: document.getElementById('assCoordConteudo'),
  cardEnviadas: document.getElementById('cardAssCoordEnviadas'),
  cardEmAssinatura: document.getElementById('cardAssCoordEmAssinatura'),
  cardAssinadas: document.getElementById('cardAssCoordAssinadas'),
  cardAtrasadas: document.getElementById('cardAssCoordAtrasadas'),
  filtroAvaliacaoTopo: document.getElementById('assCoordFiltroAvaliacaoTopo'),
  tableBody: document.getElementById('tableBodyAssinaturaCoordenador')
};

// Filtro rápido (clique em card), coordenador expandido e filtro global "Filtrar por
// avaliação:" da aba Assinatura Coordenador — estado isolado do da aba Coordenador
let filtroRapidoAssCoord = null;
let assCoordExpandido = null;
let assCoordFiltroTipoAvGlobal = null;

// Referências do botão "Indicadores" (no cabeçalho) e das duas visões internas da aba
// Assinatura Coordenador (mesmo padrão de Elaborador/Coordenador/Processo Editorial). A
// visão de Acompanhamento reaproveita a própria section da aba (não precisou de um wrapper
// novo — mesmo truque já usado em Processo Editorial, cujo #viewSistemaGGE é a própria
// section da aba de acompanhamento).
const btnIndicadoresAssCoord = document.getElementById('btnIndicadoresAssCoord');
const btnVoltarAcompanhamentoAssCoord = document.getElementById('btnVoltarAcompanhamentoAssCoord');
const viewAssinaturaCoordenadorAcompanhamento = document.getElementById('assinatura-coordenador-section');
const viewAssinaturaCoordenadorIndicadores = document.getElementById('viewAssinaturaCoordenadorIndicadores');
let visaoAssinaturaCoordenador = 'acompanhamento'; // 'acompanhamento' | 'indicadores'

// Filtro interativo (clique nos gráficos) da seção "Indicadores — Assinatura Coordenador",
// isolado dos demais filtros interativos de Elaborador/Coordenador/Processo Editorial
let filtrosIndicadoresAssCoord = {
  coordenador: null
};
let indicadoresAssCoordDadosBase = [];

const domIndAssCoord = {
  emptyGeral: document.getElementById('indAssCoordEmptyGeral'),
  conteudo: document.getElementById('indAssCoordConteudo'),
  cardTotal: document.getElementById('indAssCoordCardTotal'),
  cardForaPrazo: document.getElementById('indAssCoordCardForaPrazo'),
  cardNoPrazo: document.getElementById('indAssCoordCardNoPrazo'),
  cardMediaAtraso: document.getElementById('indAssCoordCardMediaAtraso')
};

// Definição ordenada das etapas do processo, cada uma com o campo que indica sua conclusão
// e, quando existir, o campo de prazo correspondente
const STAGES = [
  { name: 'Encomenda', doneField: 'devolutiva_encomenda', prazoField: 'prazo_encomenda' },
  { name: 'Validação SGGE', doneField: 'data_validacao_sgge', prazoField: null },
  { name: 'Envio para coordenação', doneField: 'data_envio_coord', prazoField: 'prazo_coord' },
  { name: 'Diagramação', doneField: 'fim_diagramacao', prazoField: null },
  { name: 'Cotejo', doneField: 'fim_cotejo', prazoField: null },
  { name: 'Aplicação do cotejo', doneField: 'fim_aplicacao_cotejo', prazoField: null },
  { name: 'Leitura final', doneField: 'fim_leitura_final', prazoField: null },
  { name: 'Aplicação da leitura', doneField: 'fim_aplicacao_leitura', prazoField: null },
  { name: 'CTJ', doneField: 'fim_ctj', prazoField: null },
  { name: 'Assinatura da coordenação', doneField: 'devolutiva_assinatura_coord', prazoField: 'prazo_assinatura_coord' },
  { name: 'Verificação da validação do coordenador', doneField: 'fim_verificacao_validacao_coord', prazoField: null },
  { name: 'Aplicação da verificação', doneField: 'fim_aplicacao_verificacao_validacao_coord', prazoField: null },
  { name: 'Cotejo da verificação', doneField: 'fim_cotejo_verificacao', prazoField: null },
  { name: 'Arte final', doneField: 'fim_arte_final', prazoField: null },
  { name: 'Cotejo da arte final', doneField: 'fim_cotejo_arte_final', prazoField: null },
  { name: 'Checklist', doneField: 'data_checklist', prazoField: null },
  { name: 'Envio para gráfica', doneField: 'data_envio_grafica', prazoField: null },
  { name: 'Prova em branco', doneField: 'data_prova_em_branco', prazoField: null },
  { name: 'Prova com gabarito', doneField: 'data_prova_com_gabarito', prazoField: null }
];

// Referências de elementos do DOM
const dom = {
  loading: document.getElementById('loadingMessage'),
  error: document.getElementById('errorMessage'),
  empty: document.getElementById('emptyMessage'),
  tableBody: document.getElementById('tableBody'),
  cardsGrid: document.getElementById('cardsGrid'),
  resultsCount: document.getElementById('resultsCount'),
  btnAtualizar: document.getElementById('btnAtualizar'),
  btnLimparFiltros: document.getElementById('btnLimparFiltros'),
  filterBusca: document.getElementById('filterBusca'),
  cardTotal: document.getElementById('cardTotal'),
  cardAndamento: document.getElementById('cardAndamento'),
  cardConcluidas: document.getElementById('cardConcluidas'),
  cardAtrasadas: document.getElementById('cardAtrasadas'),
  cardDiagramacao: document.getElementById('cardDiagramacao'),
  cardGrafica: document.getElementById('cardGrafica'),
  tabsNav: document.getElementById('tabsNav'),
  filtersPanel: document.getElementById('filtersPanel'),
  viewGeral: document.getElementById('viewGeral'),
  geralVazio: document.getElementById('geral-section'),
  viewElaborador: document.getElementById('viewElaborador'),
  viewCoordenador: document.getElementById('viewCoordenador'),
  viewSistemaGGE: document.getElementById('viewSistemaGGE'),
  assinaturaCoordenadorVazio: document.getElementById('assinatura-coordenador-section'),
  arteFinalizacaoEnvioVazio: document.getElementById('arte-finalizacao-envio-section'),
  bancoProvasVazio: document.getElementById('banco-provas-section'),
  tableBodyElaborador: document.getElementById('tableBodyElaborador'),
  tableBodyCoordenador: document.getElementById('tableBodyCoordenador'),
  cardElabTotal: document.getElementById('cardElabTotal'),
  cardElabRealizadas: document.getElementById('cardElabRealizadas'),
  cardElabPendentes: document.getElementById('cardElabPendentes'),
  cardElabAtrasadas: document.getElementById('cardElabAtrasadas'),
  cardElabEntreguesPrazo: document.getElementById('cardElabEntreguesPrazo'),
  cardElabEntreguesForaPrazo: document.getElementById('cardElabEntreguesForaPrazo'),
  cardElabNoPrazo: document.getElementById('cardElabNoPrazo'),
  cardElabValidadas: document.getElementById('cardElabValidadas'),
  cardElabAguardando: document.getElementById('cardElabAguardando'),
  percentElabValidadas: document.getElementById('percentElabValidadas'),
  percentElabAguardando: document.getElementById('percentElabAguardando'),
  barElabValidadas: document.getElementById('barElabValidadas'),
  barElabAguardando: document.getElementById('barElabAguardando'),
  coordEmptyGeral: document.getElementById('coordEmptyGeral'),
  coordConteudo: document.getElementById('coordConteudo'),
  cardCoordEnviadas: document.getElementById('cardCoordEnviadas'),
  cardCoordPendenteEnvio: document.getElementById('cardCoordPendenteEnvio'),
  cardCoordAguardando: document.getElementById('cardCoordAguardando'),
  cardCoordRecebidas: document.getElementById('cardCoordRecebidas'),
  cardCoordPrazoAtrasado: document.getElementById('cardCoordPrazoAtrasado'),
  coordFiltroAvaliacaoTopo: document.getElementById('coordFiltroAvaliacaoTopo')
};

const selectFilters = {
  modulo: document.getElementById('filterModulo'),
  elaborador: document.getElementById('filterElaborador'),
  tipo_av: document.getElementById('filterTipoAv'),
  frente: document.getElementById('filterFrente'),
  ano: document.getElementById('filterAno'),
  coordenador: document.getElementById('filterCoordenador'),
  responsavel: document.getElementById('filterResponsavel')
};

// --- Utilidades ---

// Retorna string vazia para valores nulos/indefinidos, senão o valor em string
function safe(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

// Converte data no formato dd/mm/aaaa para objeto Date; retorna null se vazio ou inválido
function parseBrDate(value) {
  const str = safe(value);
  if (!str) return null;
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return isNaN(date.getTime()) ? null : date;
}

// Verifica se uma data (dd/mm/aaaa) já passou em relação a hoje
function isDateOverdue(value) {
  const date = parseBrDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

// Calcula a diferença em dias entre hoje e uma data (dd/mm/aaaa) já vencida; null se não houver atraso
function diasDeAtraso(value) {
  const date = parseBrDate(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - date.getTime();
  if (diffMs <= 0) return null;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// --- Lógica de negócio ---

// Determina a etapa atual e o prazo atual de um registro, percorrendo as etapas em ordem
function getEtapaAtual(record) {
  for (const stage of STAGES) {
    if (!safe(record[stage.doneField])) {
      const prazo = stage.prazoField ? safe(record[stage.prazoField]) : '';
      return { etapa: stage.name, prazo };
    }
  }
  return { etapa: 'Concluído', prazo: '' };
}

// Determina a situação do registro: Concluído, Atrasado ou Em andamento
function getSituacao(record, prazoAtual) {
  if (safe(record.data_prova_com_gabarito)) {
    return 'Concluído';
  }
  if (prazoAtual && isDateOverdue(prazoAtual)) {
    return 'Atrasado';
  }
  return 'Em andamento';
}

// Enriquece cada registro bruto da API com etapa atual e situação calculadas
function processRecords(records) {
  return records.map((record) => {
    const { etapa, prazo } = getEtapaAtual(record);
    const situacao = getSituacao(record, prazo);
    return { ...record, etapaAtual: etapa, prazoAtual: prazo, situacao };
  });
}

// --- Renderização ---

function renderCards(records) {
  const total = records.length;
  const concluidas = records.filter((r) => r.situacao === 'Concluído').length;
  const atrasadas = records.filter((r) => r.situacao === 'Atrasado').length;
  const andamento = total - concluidas - atrasadas;
  const pendentesDiagramacao = records.filter((r) => !safe(r.fim_diagramacao) && r.situacao !== 'Concluído').length;
  const enviadasGrafica = records.filter((r) => safe(r.data_envio_grafica)).length;

  dom.cardTotal.textContent = total;
  dom.cardAndamento.textContent = andamento;
  dom.cardConcluidas.textContent = concluidas;
  dom.cardAtrasadas.textContent = atrasadas;
  dom.cardDiagramacao.textContent = pendentesDiagramacao;
  dom.cardGrafica.textContent = enviadasGrafica;
}

function badgeClassForSituacao(situacao) {
  if (situacao === 'Concluído') return 'badge-concluido';
  if (situacao === 'Atrasado') return 'badge-atrasado';
  return 'badge-andamento';
}

function renderTable(records) {
  dom.tableBody.innerHTML = '';

  if (records.length === 0) {
    dom.empty.hidden = false;
    dom.resultsCount.textContent = '';
    return;
  }
  dom.empty.hidden = true;

  const fragment = document.createDocumentFragment();

  records.forEach((record) => {
    const tr = document.createElement('tr');
    const cells = [
      safe(record.id),
      safe(record.modulo),
      safe(record.elaborador),
      safe(record.tipo_av),
      safe(record.data_aplicacao),
      safe(record.frente),
      safe(record.ano),
      safe(record.coordenador),
      safe(record.responsavel),
      safe(record.etapaAtual)
    ];

    cells.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });

    // Coluna Situação com badge colorido
    const tdSituacao = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${badgeClassForSituacao(record.situacao)}`;
    badge.textContent = record.situacao;
    tdSituacao.appendChild(badge);
    tr.appendChild(tdSituacao);

    // Coluna Prazo atual
    const tdPrazo = document.createElement('td');
    tdPrazo.textContent = safe(record.prazoAtual);
    tr.appendChild(tdPrazo);

    fragment.appendChild(tr);
  });

  dom.tableBody.appendChild(fragment);
  dom.resultsCount.textContent = `${records.length} registro(s) encontrado(s)`;
}

// Preenche as opções de um <select> com valores únicos e ordenados extraídos dos registros.
// `placeholderLabel` (opcional) troca o texto da opção vazia/"Todos" — usado pelo filtro rápido
// de Módulo da aba Elaboração, cuja opção vazia mostra "Módulo" em vez de "Todos" (ver seção
// própria em script.js); todos os outros selects continuam com o padrão "Todos".
function populateSelectOptions(selectEl, records, field, placeholderLabel = 'Todos') {
  const currentValue = selectEl.value;
  const uniqueValues = Array.from(
    new Set(records.map((r) => safe(r[field])).filter((v) => v !== ''))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

  selectEl.innerHTML = `<option value="">${placeholderLabel}</option>`;
  uniqueValues.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });

  if (uniqueValues.includes(currentValue)) {
    selectEl.value = currentValue;
  }
}

function populateAllFilterOptions(records) {
  populateSelectOptions(selectFilters.modulo, records, 'modulo');
  populateSelectOptions(selectFilters.elaborador, records, 'elaborador');
  populateSelectOptions(selectFilters.tipo_av, records, 'tipo_av');
  populateSelectOptions(selectFilters.frente, records, 'frente');
  populateSelectOptions(selectFilters.ano, records, 'ano');
  populateSelectOptions(selectFilters.coordenador, records, 'coordenador');
  populateSelectOptions(selectFilters.responsavel, records, 'responsavel');
}

// --- Filtragem ---

function applyFilters() {
  const busca = safe(dom.filterBusca.value).toLowerCase();
  const filtroValores = {
    modulo: selectFilters.modulo.value,
    elaborador: selectFilters.elaborador.value,
    tipo_av: selectFilters.tipo_av.value,
    frente: selectFilters.frente.value,
    ano: selectFilters.ano.value,
    coordenador: selectFilters.coordenador.value,
    responsavel: selectFilters.responsavel.value
  };

  filteredRecords = processedRecords.filter((record) => {
    for (const field in filtroValores) {
      const filterValue = filtroValores[field];
      if (filterValue && safe(record[field]) !== filterValue) {
        return false;
      }
    }

    if (busca) {
      const matchesBusca = Object.values(record).some((value) =>
        safe(value).toLowerCase().includes(busca)
      );
      if (!matchesBusca) return false;
    }

    return true;
  });

  renderCards(filteredRecords);
  renderAbaAtual();
}

function clearFilters() {
  Object.values(selectFilters).forEach((select) => (select.value = ''));
  dom.filterBusca.value = '';
  applyFilters();
}

// --- Navegação por abas ---

// Caso o ícone "ativo" não exista, usa o ícone normal como fallback e destaca via CSS.
// Subitens do grupo "Processo de Produção" (.sidebar-subitem) não têm <img> próprio (só texto
// recuado), então `icon` pode ser null aqui — só liga o fallback quando o botão tiver ícone.
dom.tabsNav.querySelectorAll('.sidebar-btn').forEach((btn) => {
  const icon = btn.querySelector('.sidebar-icon');
  if (!icon) return;
  icon.addEventListener('error', () => {
    if (icon.src !== btn.dataset.iconNormal) {
      icon.src = btn.dataset.iconNormal;
    }
  });
});

// Mesmo fallback para o ícone do botão de filtro da aba Elaborador
(function () {
  const icon = btnAbrirFiltrosElab.querySelector('.filter-header-btn-icon');
  icon.addEventListener('error', () => {
    if (icon.src !== btnAbrirFiltrosElab.dataset.iconNormal) {
      icon.src = btnAbrirFiltrosElab.dataset.iconNormal;
    }
  });
})();

// Mesmo fallback para o ícone do botão de filtro da seção Indicadores — Elaborador
(function () {
  const icon = btnAbrirFiltrosInd.querySelector('.filter-header-btn-icon');
  icon.addEventListener('error', () => {
    if (icon.src !== btnAbrirFiltrosInd.dataset.iconNormal) {
      icon.src = btnAbrirFiltrosInd.dataset.iconNormal;
    }
  });
})();

// Mesmo fallback para o ícone do botão de filtro da seção Indicadores — Coordenador
(function () {
  const icon = btnAbrirFiltrosIndCoord.querySelector('.filter-header-btn-icon');
  icon.addEventListener('error', () => {
    if (icon.src !== btnAbrirFiltrosIndCoord.dataset.iconNormal) {
      icon.src = btnAbrirFiltrosIndCoord.dataset.iconNormal;
    }
  });
})();

// Mesmo fallback para o ícone do botão de filtro da seção Processo Editorial
(function () {
  const icon = btnAbrirFiltrosPE.querySelector('.filter-header-btn-icon');
  icon.addEventListener('error', () => {
    if (icon.src !== btnAbrirFiltrosPE.dataset.iconNormal) {
      icon.src = btnAbrirFiltrosPE.dataset.iconNormal;
    }
  });
})();

// O botão de filtros avançados da seção Banco de Provas agora usa um SVG inline estático (sem
// <img>/PNG normal-ativo), então não precisa mais do fallback de ícone acima.

// Mesmo fallback para o ícone do botão de filtro da seção Assinatura Coordenador
(function () {
  const icon = btnAbrirFiltrosAssCoord.querySelector('.filter-header-btn-icon');
  icon.addEventListener('error', () => {
    if (icon.src !== btnAbrirFiltrosAssCoord.dataset.iconNormal) {
      icon.src = btnAbrirFiltrosAssCoord.dataset.iconNormal;
    }
  });
})();

// Mesmo fallback para o ícone do botão de filtro da seção Arte-finalização e Envio
(function () {
  const icon = btnAbrirFiltrosAFE.querySelector('.filter-header-btn-icon');
  icon.addEventListener('error', () => {
    if (icon.src !== btnAbrirFiltrosAFE.dataset.iconNormal) {
      icon.src = btnAbrirFiltrosAFE.dataset.iconNormal;
    }
  });
})();

// Mesmo fallback para o ícone do botão de filtro da seção Indicadores — Processo Editorial
(function () {
  const icon = btnAbrirFiltrosIndPE.querySelector('.filter-header-btn-icon');
  icon.addEventListener('error', () => {
    if (icon.src !== btnAbrirFiltrosIndPE.dataset.iconNormal) {
      icon.src = btnAbrirFiltrosIndPE.dataset.iconNormal;
    }
  });
})();

// --- Grupo expansível "Processo de Produção" (sidebar) ---
// Agrupa 5 subseções pré-existentes (Elaborador/Coordenador/Processo Editorial/Assinatura dos
// Coordenadores/Arte-finalização e Envio) — só reorganiza o menu lateral, não altera nenhuma
// lógica dessas seções nem seus data-tab.
const TABS_GRUPO_PROCESSO_PRODUCAO = [
  'elaborador',
  'coordenador',
  'sistema-gge',
  'assinatura-coordenador',
  'arte-finalizacao-envio'
];
const sidebarGrupoProcessoProducao = document.getElementById('sidebarGroupProcessoProducao');
const sidebarGroupToggleProcessoProducao = document.getElementById('sidebarGroupToggleProcessoProducao');
// Estado do toggle manual (clique no cabeçalho do grupo); o grupo também abre sozinho sempre
// que a aba ativa for uma das 5 subseções, independente deste estado
let sidebarGrupoProcessoProducaoAberto = false;

function alternarGrupoProcessoProducao() {
  sidebarGrupoProcessoProducaoAberto = !sidebarGrupoProcessoProducaoAberto;
  atualizarEstadoGrupoProcessoProducao();
}

// Sincroniza classe/estado visual do grupo com a aba atual: abre (e destaca o cabeçalho) se a
// aba ativa pertence ao grupo, mesmo que o usuário não tenha clicado para abrir manualmente
function atualizarEstadoGrupoProcessoProducao() {
  const abaEstaNoGrupo = TABS_GRUPO_PROCESSO_PRODUCAO.includes(abaAtual);
  const aberto = sidebarGrupoProcessoProducaoAberto || abaEstaNoGrupo;

  sidebarGrupoProcessoProducao.classList.toggle('open', aberto);
  sidebarGroupToggleProcessoProducao.setAttribute('aria-expanded', String(aberto));
  sidebarGroupToggleProcessoProducao.classList.toggle('is-active', abaEstaNoGrupo);
  // Ícone estático (assets/menu-lateral/engrenagem.png, class="sidebar-icon-img") — sem troca
  // dinâmica de src entre normal/ativo, mesmo ajuste já aplicado aos outros 3 ícones para não
  // piscar a cada re-render (ver atualizarEstadoGrupoIndicadorProcesso)
}

// --- Grupo expansível "Indicadores do Processo" (sidebar; texto renomeado 2026-07-30, era
// "Indicador do Processo") — mesmo padrão do grupo "Processo de Produção" acima. 3 subitens no
// menu (Elaborador/Coordenador/Sistema), cada um abrindo direto na sub-visão de Indicadores já
// existente (reaproveitada, não duplicada — ver trocarAba). O 4º atalho, 'indicador-segunda-
// validacao' (Assinatura Coordenador), continua na lista abaixo mas não tem mais botão próprio
// na sidebar — só é alcançado pelo botão "2ª Validação" dentro de Indicadores — Coordenador;
// fica na lista só para o grupo continuar abrindo/destacando quando essa tela estiver ativa.
const TABS_GRUPO_INDICADOR_PROCESSO = [
  'indicador-elaborador',
  'indicador-coordenador',
  'indicador-segunda-validacao',
  'indicador-sistema',
  'indicador-previsto-realizado'
];
const sidebarGrupoIndicadorProcesso = document.getElementById('sidebarGroupIndicadorProcesso');
const sidebarGroupToggleIndicadorProcesso = document.getElementById('sidebarGroupToggleIndicadorProcesso');
let sidebarGrupoIndicadorProcessoAberto = false;

function alternarGrupoIndicadorProcesso() {
  sidebarGrupoIndicadorProcessoAberto = !sidebarGrupoIndicadorProcessoAberto;
  atualizarEstadoGrupoIndicadorProcesso();
}

function atualizarEstadoGrupoIndicadorProcesso() {
  const abaEstaNoGrupo = TABS_GRUPO_INDICADOR_PROCESSO.includes(abaAtual);
  const aberto = sidebarGrupoIndicadorProcessoAberto || abaEstaNoGrupo;

  sidebarGrupoIndicadorProcesso.classList.toggle('open', aberto);
  sidebarGroupToggleIndicadorProcesso.setAttribute('aria-expanded', String(aberto));
  sidebarGroupToggleIndicadorProcesso.classList.toggle('is-active', abaEstaNoGrupo);
  // Ícone estático (assets/estatisticas.png, class="sidebar-icon-img") — sem troca dinâmica de
  // src entre normal/ativo, para não piscar a cada re-render
}

// Alterna a aba ativa, atualiza o destaque visual dos botões e re-renderiza a visão correspondente
function trocarAba(nomeAba) {
  abaAtual = nomeAba;

  dom.tabsNav.querySelectorAll('.sidebar-btn').forEach((btn) => {
    const isActive = btn.dataset.tab === nomeAba;
    btn.classList.toggle('is-active', isActive);

    // Subitens do grupo "Processo de Produção" não têm <img> (só texto) e o botão de
    // expandir/recolher o grupo não tem data-tab — nada a fazer com ícone nesses casos
    const icon = btn.querySelector('.sidebar-icon');
    if (icon && btn.dataset.tab) {
      icon.src = isActive ? btn.dataset.iconAtivo : btn.dataset.iconNormal;
    }
  });
  atualizarEstadoGrupoProcessoProducao();
  atualizarEstadoGrupoIndicadorProcesso();

  // Aba Geral: temporariamente em branco, apenas com um estado vazio (a desenvolver depois)
  dom.filtersPanel.hidden = true;
  dom.cardsGrid.hidden = true;
  dom.viewGeral.hidden = true;
  dom.geralVazio.hidden = nomeAba !== 'geral';
  // Filtros rápidos (Ano + Módulo) do header: só aparecem na aba Geral
  geralHeaderFiltrosWrapper.hidden = nomeAba !== 'geral';
  // dom.viewElaborador/dom.viewCoordenador/dom.viewSistemaGGE são definidos mais abaixo, junto
  // com o resto da lógica de cada aba (agora também aceitam os atalhos 'indicador-elaborador'/
  // 'indicador-coordenador'/'indicador-sistema')
  dom.viewSistemaGGE.hidden = nomeAba !== 'sistema-gge' || visaoProcessoEditorial !== 'acompanhamento';
  dom.assinaturaCoordenadorVazio.hidden =
    nomeAba !== 'assinatura-coordenador' || visaoAssinaturaCoordenador !== 'acompanhamento';
  // --- Assinatura Coordenador ("2ª Validação"): aba normal ('assinatura-coordenador') +
  // atalho ('indicador-segunda-validacao'), acionado pelo botão "2ª Validação" dentro de
  // Indicadores — Coordenador (não tem mais botão próprio no menu lateral) — abre direto na
  // sub-visão de Indicadores, reaproveitando exatamente a mesma tela/lógica
  // (viewAssinaturaCoordenadorIndicadores, renderizarIndicadoresAssinaturaCoordenador) — mesmo
  // padrão já usado por Elaborador/Coordenador/Processo Editorial.
  const ehAbaAssCoord = nomeAba === 'assinatura-coordenador' || nomeAba === 'indicador-segunda-validacao';
  if (nomeAba === 'indicador-segunda-validacao') {
    visaoAssinaturaCoordenador = 'indicadores';
  } else if (nomeAba !== 'assinatura-coordenador') {
    // Ao sair da aba Assinatura Coordenador, a subvisão volta a ser "Acompanhamento" da próxima vez
    visaoAssinaturaCoordenador = 'acompanhamento';
  }
  const emIndicadoresAssCoord = ehAbaAssCoord && visaoAssinaturaCoordenador === 'indicadores';
  // Botão de filtro (ícone de funil) da seção Assinatura Coordenador — só na visão de acompanhamento
  assCoordFilterPopoverWrapper.hidden = !ehAbaAssCoord || visaoAssinaturaCoordenador !== 'acompanhamento';
  // Filtro rápido de Módulo: visível junto do botão de filtro geral, só na visão de
  // Acompanhamento (mesma regra do próprio botão de filtro)
  assCoordModuloRapidoWrapper.hidden = !ehAbaAssCoord || visaoAssinaturaCoordenador !== 'acompanhamento';
  assCoordAnoRapidoWrapper.hidden = !ehAbaAssCoord || visaoAssinaturaCoordenador !== 'acompanhamento';
  if (!ehAbaAssCoord) {
    fecharPopoverFiltrosAssinaturaCoordenador();
  }

  // O botão "Indicadores" foi removido do cabeçalho da seção 2ª Validação a pedido (o atalho
  // "Indicador do Processo → 2ª Validação" na sidebar já cobre o mesmo caminho) — fica sempre
  // oculto; a lógica interna que ele disparava continua intacta, só não há mais botão para
  // acioná-la a partir daqui
  btnIndicadoresAssCoord.hidden = true;
  btnVoltarAcompanhamentoAssCoord.hidden = !emIndicadoresAssCoord;
  viewAssinaturaCoordenadorIndicadores.hidden = !emIndicadoresAssCoord;
  if (!ehAbaAssCoord) {
    btnIndicadoresAssCoord.classList.remove('is-active');
    btnIndicadoresAssCoord.setAttribute('aria-pressed', 'false');
  }
  // Seção "Arte-finalização e Envio" — mesmo truque de Processo Editorial/Assinatura
  // Coordenador: o próprio elemento referenciado aqui já É a section da aba (não um wrapper
  // de estado vazio), então só alterna o hidden
  dom.arteFinalizacaoEnvioVazio.hidden = nomeAba !== 'arte-finalizacao-envio';
  const ehAbaArteFinalizacaoEnvio = nomeAba === 'arte-finalizacao-envio';
  // Botão de filtro (ícone de funil) + filtro rápido de Módulo, mesmo padrão de Processo
  // Editorial/Assinatura Coordenador
  afeFilterPopoverWrapper.hidden = !ehAbaArteFinalizacaoEnvio;
  afeModuloRapidoWrapper.hidden = !ehAbaArteFinalizacaoEnvio;
  afeAnoRapidoWrapper.hidden = !ehAbaArteFinalizacaoEnvio;
  if (!ehAbaArteFinalizacaoEnvio) {
    fecharPopoverFiltrosArteFinalizacaoEnvio();
  }
  dom.bancoProvasVazio.hidden = nomeAba !== 'banco-provas';
  // "Resumo da Produção": seção própria (BD_SGGE), não é alias de outra aba, só alterna o hidden
  viewResumoProducao.hidden = nomeAba !== 'resumo-producao';
  // "GPA": seção própria (BD_MACRO2), não é alias de outra aba, só alterna o hidden
  viewGPA.hidden = nomeAba !== 'gpa';
  if (nomeAba !== 'gpa') {
    fecharPopoverFiltrosGPA();
  }
  // "Previsto vs. Realizado": seção própria (não é alias de outra aba), só alterna o hidden
  viewPrevistoRealizado.hidden = nomeAba !== 'indicador-previsto-realizado';
  // Botão de filtros avançados (bpFilterPopoverWrapper) agora vive dentro da própria barra de
  // busca da seção Banco de Provas (banco-searchbar-wrapper), então sua visibilidade já segue
  // automaticamente a da section pai (dom.bancoProvasVazio acima) — só fecha o painel ao sair
  if (nomeAba !== 'banco-provas') {
    fecharPopoverFiltrosBancoProvas();
  }
  // --- Processo Editorial: aba normal ('sistema-gge') + atalho direto do grupo "Indicador do
  // Processo" ('indicador-sistema'), que abre direto na sub-visão de Indicadores, reaproveitando
  // exatamente a mesma tela/lógica (viewProcessoEditorialIndicadores,
  // renderizarIndicadoresProcessoEditorial) — mesmo padrão já usado por Elaborador/Coordenador.
  const ehAbaProcessoEditorial = nomeAba === 'sistema-gge' || nomeAba === 'indicador-sistema';
  if (nomeAba === 'indicador-sistema') {
    visaoProcessoEditorial = 'indicadores';
  } else if (nomeAba !== 'sistema-gge') {
    // Ao sair da aba Processo Editorial, a subvisão volta a ser "Acompanhamento" da próxima vez
    visaoProcessoEditorial = 'acompanhamento';
  }
  const emIndicadoresPE = ehAbaProcessoEditorial && visaoProcessoEditorial === 'indicadores';
  // Botão de filtro (ícone de funil) da seção Processo Editorial — só na visão de
  // Acompanhamento da aba normal (o atalho já entra direto na visão de Indicadores, que tem
  // seu próprio popover, indFilterPopoverWrapperPE)
  peFilterPopoverWrapper.hidden = !ehAbaProcessoEditorial || visaoProcessoEditorial !== 'acompanhamento';
  // Filtro rápido de Módulo: visível junto do botão de filtro geral, só na visão de
  // Acompanhamento da aba Processo Editorial (mesma regra do próprio botão de filtro)
  peModuloRapidoWrapper.hidden = !ehAbaProcessoEditorial || visaoProcessoEditorial !== 'acompanhamento';
  peAnoRapidoWrapper.hidden = !ehAbaProcessoEditorial || visaoProcessoEditorial !== 'acompanhamento';
  if (!ehAbaProcessoEditorial) {
    fecharPopoverFiltrosProcessoEditorial();
  }

  // O botão "Indicadores" foi removido do cabeçalho da seção Processo Editorial a pedido (o
  // atalho "Indicador do Processo → Sistema" na sidebar já cobre o mesmo caminho) — fica sempre
  // oculto; a lógica interna que ele disparava continua intacta, só não há mais botão para
  // acioná-la a partir daqui
  btnIndicadoresPE.hidden = true;
  btnIndicadoresPE.classList.toggle('is-active', emIndicadoresPE);
  btnIndicadoresPE.setAttribute('aria-pressed', String(emIndicadoresPE));
  btnVoltarAcompanhamentoPE.hidden = !emIndicadoresPE;
  indFilterPopoverWrapperPE.hidden = !emIndicadoresPE;
  indModuloRapidoWrapperPE.hidden = !emIndicadoresPE;
  viewProcessoEditorialIndicadores.hidden = !emIndicadoresPE;
  if (!ehAbaProcessoEditorial) {
    fecharPopoverFiltrosIndicadoresTopoPE();
  }
  if (emIndicadoresPE) {
    renderizarIndicadoresProcessoEditorial(obterDadosProcessoEditorialFiltrados());
  }

  // --- Elaborador: aba normal ('elaborador') + atalho direto do grupo "Indicador do
  // Processo" ('indicador-elaborador'), que abre direto na sub-visão de Indicadores,
  // reaproveitando exatamente a mesma tela/lógica (viewElaboradorIndicadores,
  // renderizarIndicadoresElaborador) — só a forma de chegar lá muda.
  const ehAbaElaborador = nomeAba === 'elaborador' || nomeAba === 'indicador-elaborador';
  if (nomeAba === 'indicador-elaborador') {
    visaoElaborador = 'indicadores';
  } else if (nomeAba !== 'elaborador') {
    // Ao sair da aba Elaborador, a subvisão volta a ser "Acompanhamento" da próxima vez
    visaoElaborador = 'acompanhamento';
  }
  const emIndicadoresElaborador = ehAbaElaborador && visaoElaborador === 'indicadores';
  dom.viewElaborador.hidden = !ehAbaElaborador;
  viewElaboradorAcompanhamento.hidden = !ehAbaElaborador || emIndicadoresElaborador;
  viewElaboradorIndicadores.hidden = !emIndicadoresElaborador;
  // O botão "Indicadores" foi removido do cabeçalho da aba Elaboração a pedido (o atalho
  // "Indicador do Processo → Elaborador" na sidebar já cobre o mesmo caminho) — fica sempre
  // oculto; a lógica interna que ele disparava (mostrarIndicadoresElaborador) continua intacta,
  // só não há mais botão nenhum para acioná-la a partir daqui
  btnIndicadores.hidden = true;
  btnIndicadores.classList.toggle('is-active', emIndicadoresElaborador);
  btnIndicadores.setAttribute('aria-pressed', String(emIndicadoresElaborador));
  elabFilterPopoverWrapper.hidden = !ehAbaElaborador || visaoElaborador !== 'acompanhamento';
  // Filtro rápido de Módulo: visível junto do botão de filtro geral, só na visão de
  // Acompanhamento da aba Elaborador (mesma regra do próprio botão de filtro)
  elabModuloRapidoWrapper.hidden = !ehAbaElaborador || visaoElaborador !== 'acompanhamento';
  elabAnoRapidoWrapper.hidden = !ehAbaElaborador || visaoElaborador !== 'acompanhamento';
  // Na barra superior: título "Painel de Avaliações SGGE" + botão de filtro dos Indicadores
  // só aparecem quando a aba Elaborador (ou o atalho) está na visão de Indicadores
  btnVoltarAcompanhamento.hidden = !emIndicadoresElaborador;
  indFilterPopoverWrapper.hidden = !emIndicadoresElaborador;
  indModuloRapidoWrapper.hidden = !emIndicadoresElaborador;
  btnRelatorioElaborador.hidden = !emIndicadoresElaborador;
  if (!ehAbaElaborador) {
    fecharPopoverFiltrosElaborador();
    fecharPopoverFiltrosIndicadoresTopo();
    fecharModalRelatorioElaborador();
  }
  if (emIndicadoresElaborador) {
    renderizarIndicadoresElaborador(obterRegistrosFiltradosElaborador());
  }

  // --- Coordenador: mesmo padrão do bloco acima, com o atalho 'indicador-coordenador' ---
  const ehAbaCoordenador = nomeAba === 'coordenador' || nomeAba === 'indicador-coordenador';
  if (nomeAba === 'indicador-coordenador') {
    visaoCoordenador = 'indicadores';
  } else if (nomeAba !== 'coordenador') {
    // Ao sair da aba Coordenador, a subvisão volta a ser "Acompanhamento" da próxima vez
    visaoCoordenador = 'acompanhamento';
  }
  const emIndicadoresCoordenador = ehAbaCoordenador && visaoCoordenador === 'indicadores';
  dom.viewCoordenador.hidden = !ehAbaCoordenador;
  viewCoordenadorAcompanhamento.hidden = !ehAbaCoordenador || emIndicadoresCoordenador;
  viewCoordenadorIndicadores.hidden = !emIndicadoresCoordenador;
  // O botão "Indicadores" foi removido do cabeçalho da seção 1ª Validação a pedido (o atalho
  // "Indicador do Processo → Coordenador" na sidebar já cobre o mesmo caminho) — fica sempre
  // oculto; a lógica interna que ele disparava continua intacta, só não há mais botão para
  // acioná-la a partir daqui
  btnIndicadoresCoord.hidden = true;
  btnIndicadoresCoord.classList.toggle('is-active', emIndicadoresCoordenador);
  btnIndicadoresCoord.setAttribute('aria-pressed', String(emIndicadoresCoordenador));
  coordFilterPopoverWrapper.hidden = !ehAbaCoordenador || visaoCoordenador !== 'acompanhamento';
  // Filtro rápido de Módulo: visível junto do botão de filtro geral, só na visão de
  // Acompanhamento da aba Coordenador (mesma regra do próprio botão de filtro)
  coordModuloRapidoWrapper.hidden = !ehAbaCoordenador || visaoCoordenador !== 'acompanhamento';
  coordAnoRapidoWrapper.hidden = !ehAbaCoordenador || visaoCoordenador !== 'acompanhamento';
  // "← Voltar ao acompanhamento" removido desta tela a pedido: "Indicadores — Coordenador"
  // agora só é acessada pelo menu lateral "Indicadores do Processo", não precisa mais voltar
  // para o acompanhamento — fica sempre oculto (a lógica interna que ele disparava,
  // mostrarAcompanhamentoCoordenador, continua intacta, só não há mais botão para acioná-la
  // a partir daqui)
  btnVoltarAcompanhamentoCoord.hidden = true;
  indFilterPopoverWrapperCoord.hidden = !emIndicadoresCoordenador;
  indModuloRapidoWrapperCoord.hidden = !emIndicadoresCoordenador;
  // Botão "2ª Validação": só aparece junto do filtro de Indicadores — Coordenador
  btnAbrirSegundaValidacaoIndCoord.hidden = !emIndicadoresCoordenador;
  btnRelatorioCoordenador.hidden = !emIndicadoresCoordenador;
  if (!emIndicadoresCoordenador) {
    fecharModalRelatorioCoordenador();
  }
  if (!ehAbaCoordenador) {
    fecharPopoverFiltrosCoordenador();
    fecharPopoverFiltrosIndicadoresTopoCoord();
  }
  if (emIndicadoresCoordenador) {
    renderizarIndicadoresCoordenador(obterRegistrosFiltradosCoordenador());
  }

  // O título "Painel de Avaliações SGGE" da barra superior fica oculto sempre que uma das
  // telas de Indicadores (Elaborador, Coordenador ou Processo Editorial) estiver ativa
  appHeaderTitles.hidden =
    emIndicadoresElaborador || emIndicadoresCoordenador || emIndicadoresPE || emIndicadoresAssCoord;

  renderAbaAtual();
}

// Renderiza a visão correspondente à aba atualmente ativa, usando os registros já filtrados
function renderAbaAtual() {
  if (abaAtual === 'geral') {
    renderizarGeral();
  } else if (abaAtual === 'resumo-producao') {
    renderizarResumoProducao();
  } else if (abaAtual === 'elaborador' || abaAtual === 'indicador-elaborador') {
    renderizarVisaoElaborador();
  } else if (abaAtual === 'coordenador' || abaAtual === 'indicador-coordenador') {
    renderizarVisaoCoordenador();
  } else if (abaAtual === 'sistema-gge' || abaAtual === 'indicador-sistema') {
    // 'indicador-sistema' é o atalho "Indicador do Processo → Sistema" — visaoProcessoEditorial
    // já foi forçado para 'indicadores' dentro de trocarAba(), então cai sempre no primeiro caso
    if (visaoProcessoEditorial === 'indicadores') {
      renderizarIndicadoresProcessoEditorial(obterDadosProcessoEditorialFiltrados());
    } else {
      renderizarProcessoEditorial();
    }
  } else if (abaAtual === 'assinatura-coordenador' || abaAtual === 'indicador-segunda-validacao') {
    // 'indicador-segunda-validacao' é o atalho "Indicador do Processo → 2ª Validação" —
    // visaoAssinaturaCoordenador já foi forçado para 'indicadores' dentro de trocarAba(), e
    // renderizarVisaoAssinaturaCoordenador() já verifica esse estado internamente e renderiza
    // a sub-visão correta
    renderizarVisaoAssinaturaCoordenador();
  } else if (abaAtual === 'arte-finalizacao-envio') {
    renderizarArteFinalizacaoEnvio();
  } else if (abaAtual === 'banco-provas') {
    renderizarBancoProvas();
  } else if (abaAtual === 'gpa') {
    renderizarGPA();
  } else if (abaAtual === 'indicador-previsto-realizado') {
    renderizarIndicadorPrevistoRealizado();
  }
}

// Alterna da visão de acompanhamento para a de indicadores da aba Processo Editorial (mesmo
// padrão de mostrarIndicadoresCoordenador)
function mostrarIndicadoresProcessoEditorial() {
  visaoProcessoEditorial = 'indicadores';
  fecharPopoverFiltrosProcessoEditorial();
  viewProcessoEditorialAcompanhamento.hidden = true;
  viewProcessoEditorialIndicadores.hidden = false;
  peFilterPopoverWrapper.hidden = true;
  btnVoltarAcompanhamentoPE.hidden = false;
  indFilterPopoverWrapperPE.hidden = false;
  indModuloRapidoWrapperPE.hidden = false;
  appHeaderTitles.hidden = true;
  btnIndicadoresPE.classList.add('is-active');
  btnIndicadoresPE.setAttribute('aria-pressed', 'true');
  // O botão "Indicadores" não faz sentido dentro da própria tela de indicadores
  btnIndicadoresPE.hidden = true;
  renderizarIndicadoresProcessoEditorial(obterDadosProcessoEditorialFiltrados());
}

// Retorna da visão de indicadores para a de acompanhamento da aba Processo Editorial
function mostrarAcompanhamentoProcessoEditorial() {
  // Mesmo tratamento do atalho de Elaborador/Coordenador: se veio de "Indicador do Processo →
  // Sistema" (data-tab "indicador-sistema"), o Acompanhamento pertence à aba normal "Processo
  // Editorial" (grupo "Processo de Produção") — reencaminha por trocarAba para manter abaAtual
  // e o destaque do menu lateral coerentes com a tela exibida
  if (abaAtual === 'indicador-sistema') {
    trocarAba('sistema-gge');
    return;
  }

  visaoProcessoEditorial = 'acompanhamento';
  fecharPopoverFiltrosIndicadoresTopoPE();
  viewProcessoEditorialIndicadores.hidden = true;
  viewProcessoEditorialAcompanhamento.hidden = false;
  peFilterPopoverWrapper.hidden = false;
  btnVoltarAcompanhamentoPE.hidden = true;
  indFilterPopoverWrapperPE.hidden = true;
  indModuloRapidoWrapperPE.hidden = true;
  appHeaderTitles.hidden = false;
  btnIndicadoresPE.classList.remove('is-active');
  btnIndicadoresPE.setAttribute('aria-pressed', 'false');
  btnIndicadoresPE.hidden = false;
  renderizarProcessoEditorial();
}

// --- Aba "Geral": tela inicial do sistema — mensagem de boas-vindas + faixa "Dias faltando" +
// calendário mensal de avaliações (coluna data_aplicacao). Base de dados: filteredRecords
// (mesmo recorte global usado por todas as outras abas), com filtros próprios (Ano/Módulo,
// visíveis no topo direito do header; Tipo de AV/busca, ocultos mas ainda funcionais) isolados
// do resto do projeto, no mesmo padrão de estado local das demais seções. Ano/Módulo controlam
// tanto os cards de "Dias faltando" quanto o calendário (e o modal de avaliações do dia).

const domGeral = {
  saudacao: document.getElementById('geralSaudacaoUsuario'),
  filtroTipoAv: document.getElementById('geralFiltroTipoAv'),
  filtroAno: document.getElementById('geralFiltroAno'),
  filtroModulo: document.getElementById('geralFiltroModulo'),
  filtroBusca: document.getElementById('geralFiltroBusca'),
  mesAnterior: document.getElementById('geralCalendarioMesAnterior'),
  mesProximo: document.getElementById('geralCalendarioMesProximo'),
  hoje: document.getElementById('geralCalendarioHoje'),
  mesAno: document.getElementById('geralCalendarioMesAno'),
  grade: document.getElementById('geralCalendarioGrade'),
  modalBackdrop: document.getElementById('geralDiaModalBackdrop'),
  modalFechar: document.getElementById('geralDiaModalFechar'),
  modalTitulo: document.getElementById('geralDiaModalTitulo'),
  modalCorpo: document.getElementById('geralDiaModalCorpo'),
  contagemGrade: document.getElementById('geralContagemGrade'),
  contagemVazio: document.getElementById('geralContagemVazio'),
  contagemDetalhe: document.getElementById('geralContagemDetalhe'),
  contagemDetalheTitulo: document.getElementById('geralContagemDetalheTitulo'),
  contagemDetalheCorpo: document.getElementById('geralContagemDetalheCorpo'),
  contagemDetalheFiltroAno: document.getElementById('geralContagemDetalheFiltroAno')
};

// Mês exibido no calendário (sempre normalizado para o dia 1, sem horário) — começa no mês
// atual do navegador; alterado só pela navegação (anterior/próximo/Hoje)
let geralCalendarioMesAtual = new Date();
geralCalendarioMesAtual.setDate(1);
geralCalendarioMesAtual.setHours(0, 0, 0, 0);

// Filtros próprios do calendário da aba Geral (Tipo de AV/Ano/Módulo/busca), independentes de
// qualquer outro filtro do projeto
let geralFiltrosCalendario = { tipoAv: '', ano: '', modulo: '', busca: '' };

const NOMES_MESES_PT_BR = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

// Retorna o nome (em maiúsculas) do usuário logado, lendo direto do localStorage — a mesma
// chave/formato já usados pelo fluxo de login (ver CHAVE_USUARIO_LOGADO/inicializarAutenticacao).
// Retorna '' quando não há usuário salvo ou o JSON estiver corrompido, para o chamador decidir
// o texto de fallback ("Olá!").
function obterNomeUsuarioLogado() {
  const usuarioSalvo = localStorage.getItem(CHAVE_USUARIO_LOGADO);
  if (!usuarioSalvo) return '';

  try {
    const usuario = JSON.parse(usuarioSalvo);
    return safe(usuario && usuario.nome).toUpperCase();
  } catch (err) {
    return '';
  }
}

// Converte data_aplicacao para um objeto Date válido, aceitando os formatos que a base pode
// trazer: dd/mm/aaaa (padrão do projeto, via parseBrDate), aaaa-mm-dd (ISO) e Date já pronto.
// Retorna null para vazio/inválido — registros sem data válida nunca aparecem no calendário.
function parseDataAplicacao(valor) {
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? null : valor;
  }

  const str = safe(valor);
  if (!str) return null;

  const dataBr = parseBrDate(str);
  if (dataBr) return dataBr;

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, ano, mes, dia] = isoMatch;
    const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
    return isNaN(data.getTime()) ? null : data;
  }

  return null;
}

// Extrai o ano-calendário (string, ex. "2026") de data_aplicacao, usando parseDataAplicacao para
// aceitar os mesmos formatos (dd/mm/aaaa, ISO, Date). Retorna '' quando não há data válida —
// usado pelo filtro rápido de Ano das seções do Processo de Produção (Elaboração, 1ª Validação,
// Processo Editorial, Assinatura do Coordenador, Arte-finalização e Envio).
function obterAnoAplicacao(record) {
  const data = parseDataAplicacao(record.data_aplicacao);
  return data ? String(data.getFullYear()) : '';
}

// Preenche um <select> de Ano com os anos únicos de data_aplicacao presentes em `records`,
// mesmo padrão visual/comportamental de populateSelectOptions, mas usando obterAnoAplicacao em
// vez de um campo direto do registro.
function populateAnoAplicacaoOptions(selectEl, records, placeholderLabel = 'Ano') {
  const currentValue = selectEl.value;
  const uniqueValues = Array.from(new Set(records.map(obterAnoAplicacao).filter((v) => v !== ''))).sort();

  selectEl.innerHTML = `<option value="">${placeholderLabel}</option>`;
  uniqueValues.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });

  if (uniqueValues.includes(currentValue)) {
    selectEl.value = currentValue;
  }
}

// "julho de 2026"
function formatarMesAno(data) {
  return `${NOMES_MESES_PT_BR[data.getMonth()]} de ${data.getFullYear()}`;
}

// "dd/mm/aaaa" a partir de um objeto Date já validado — usado para exibir data_aplicacao de
// forma consistente no modal, independente do formato original (dd/mm/aaaa ou ISO)
function formatarDataAplicacaoExibicao(data) {
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${data.getFullYear()}`;
}

// Chave estável "aaaa-mm-dd" (não usa toISOString, que converte para UTC e pode mudar o dia)
function obterChaveDia(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Popula o select de Módulo do calendário com os valores únicos presentes no recorte atual
// (mesmo padrão de populateSelectOptions, mas isolado — não usa selectFilters/o popover antigo)
function popularFiltroModuloGeral(dados) {
  const valorAtual = domGeral.filtroModulo.value;
  const valoresUnicos = Array.from(new Set(dados.map((r) => safe(r.modulo)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { numeric: true })
  );

  domGeral.filtroModulo.innerHTML = '<option value="">Módulo</option>';
  valoresUnicos.forEach((valor) => {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = valor;
    domGeral.filtroModulo.appendChild(option);
  });

  if (valoresUnicos.includes(valorAtual)) {
    domGeral.filtroModulo.value = valorAtual;
  }
}

// Popula o select de Tipo de AV com a ordem fixa do projeto (só precisa rodar uma vez, mas é
// idempotente — chamado toda vez que a aba abre, sem custo)
function popularFiltroTipoAvGeral() {
  if (domGeral.filtroTipoAv.options.length > 1) return;
  ORDEM_TIPO_AV_PERFORMANCE.forEach((tipoAv) => {
    const option = document.createElement('option');
    option.value = tipoAv;
    option.textContent = tipoAv;
    domGeral.filtroTipoAv.appendChild(option);
  });
}

// Popula o select de Ano com os anos existentes no recorte atual, mantendo a ordem pedagógica
// fixa do projeto (6º→7º→8º→9º→1º→2º→3º), no mesmo padrão de popularFiltroModuloGeral
function popularFiltroAnoGeral(dados) {
  const valorAtual = domGeral.filtroAno.value;
  const anosPresentes = new Set(
    dados
      .map((r) => normalizarAnoSegmento(r.ano))
      .filter((numero) => numero !== null)
      .map((numero) => `${numero}º`)
  );
  const valoresOrdenados = ORDEM_ANO_ESCOLAR_COORD.filter((ano) => anosPresentes.has(ano));

  domGeral.filtroAno.innerHTML = '<option value="">Ano</option>';
  valoresOrdenados.forEach((ano) => {
    const option = document.createElement('option');
    option.value = ano;
    option.textContent = ano;
    domGeral.filtroAno.appendChild(option);
  });

  if (valoresOrdenados.includes(valorAtual)) {
    domGeral.filtroAno.value = valorAtual;
  }
}

// Aplica os filtros da aba Geral (Tipo de AV/Ano/Módulo/busca — busca também em id) sobre
// qualquer recorte — reaproveitado tanto pelo calendário quanto pela Gestão à Vista, para que
// os dois sempre respondam aos mesmos filtros a partir de uma única lógica
function filtrarAvaliacoesGeral(dados) {
  const { tipoAv, ano, modulo, busca } = geralFiltrosCalendario;
  const buscaLower = busca.trim().toLowerCase();

  return dados.filter((record) => {
    if (tipoAv && normalizarTipoAvPerformance(record.tipo_av) !== tipoAv) return false;

    if (ano) {
      const numero = normalizarAnoSegmento(record.ano);
      if (numero === null || `${numero}º` !== ano) return false;
    }

    if (modulo && safe(record.modulo) !== modulo) return false;

    if (buscaLower) {
      const alvo = [record.tipo_av, record.ano, record.frente, record.modulo, record.id]
        .map((v) => safe(v).toLowerCase())
        .join(' ');
      if (!alvo.includes(buscaLower)) return false;
    }

    return true;
  });
}

// Mesmos filtros de filtrarAvaliacoesGeral, mas só mantém registros com data_aplicacao válida
// — o calendário nunca mostra registros sem data; a Gestão à Vista mostra todos (com "-" nas
// colunas de data quando não há data válida), por isso usa filtrarAvaliacoesGeral diretamente
function filtrarAvaliacoesCalendario(dados) {
  return filtrarAvaliacoesGeral(dados).filter((record) => parseDataAplicacao(record.data_aplicacao));
}

// Classe de cor do "tag" do evento por tipo de avaliação (seção 7 do pedido): AV1 azul, AV2
// verde, 2º CHAMADA laranja, REC-SEM roxo, REC-FIM vermelho
function obterClasseCorEventoCalendario(tipoAvNormalizado) {
  const mapa = {
    AV1: 'geral-evento-tag--av1',
    AV2: 'geral-evento-tag--av2',
    '2º CHAMADA': 'geral-evento-tag--2chamada',
    'REC-SEM': 'geral-evento-tag--recsem',
    'REC-FIM': 'geral-evento-tag--recfim'
  };
  return mapa[tipoAvNormalizado] || 'geral-evento-tag--outro';
}

// Monta a grade completa do mês (semanas completas de domingo a sábado, incluindo dias do mês
// anterior/seguinte para preencher a 1ª e a última semana) e agrupa os eventos já filtrados por
// dia. Retorna um array de células { data, foraDoMes, eventos }.
function montarCalendarioMensal(mesAtual, dadosFiltrados) {
  const eventosPorDia = new Map();
  dadosFiltrados.forEach((record) => {
    const data = parseDataAplicacao(record.data_aplicacao);
    if (!data) return;
    const chave = obterChaveDia(data);
    if (!eventosPorDia.has(chave)) eventosPorDia.set(chave, []);
    eventosPorDia.get(chave).push(record);
  });

  const primeiroDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const ultimoDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);

  const inicioGrade = new Date(primeiroDiaMes);
  inicioGrade.setDate(inicioGrade.getDate() - inicioGrade.getDay());

  const fimGrade = new Date(ultimoDiaMes);
  fimGrade.setDate(fimGrade.getDate() + (6 - fimGrade.getDay()));

  const celulas = [];
  const cursor = new Date(inicioGrade);
  while (cursor.getTime() <= fimGrade.getTime()) {
    const chave = obterChaveDia(cursor);
    celulas.push({
      data: new Date(cursor),
      foraDoMes: cursor.getMonth() !== mesAtual.getMonth(),
      eventos: eventosPorDia.get(chave) || []
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return celulas;
}

// Agrupa os eventos (registros) de um dia por "módulo + tipo de AV" — cada grupo carrega o
// rótulo resumido ("M3 - AV1"), o tipoAv normalizado (para cor/ordem) e a lista de registros
function agruparAvaliacoesPorModuloAvaliacao(eventos) {
  const grupos = new Map();

  eventos.forEach((record) => {
    const modulo = safe(record.modulo) || '-';
    const tipoAvNormalizado = normalizarTipoAvPerformance(record.tipo_av);
    const chave = `${modulo}__${tipoAvNormalizado}`;

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        modulo,
        tipoAv: tipoAvNormalizado,
        rotulo: `${modulo} - ${tipoAvNormalizado}`,
        registros: []
      });
    }
    grupos.get(chave).registros.push(record);
  });

  return Array.from(grupos.values()).sort((a, b) => {
    const moduloComp = a.modulo.localeCompare(b.modulo, 'pt-BR', { numeric: true });
    if (moduloComp !== 0) return moduloComp;
    const posA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(a.tipoAv);
    const posB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(b.tipoAv);
    return (posA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posA) - (posB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posB);
  });
}

// Texto "N avaliação"/"N avaliações" com plural correto
function formatarTotalAvaliacoes(total) {
  return `${total} avaliaç${total === 1 ? 'ão' : 'ões'}`;
}

// Cria o resumo clicável de um grupo (módulo + tipo de AV) dentro da célula do dia: rótulo +
// total de avaliações daquele grupo — contagem consolidada por bloco/bloquinho
// (contarAvaliacoesConsolidadas), não a quantidade bruta de linhas/disciplinas da base
function renderizarResumoDiaCalendario(grupo, onClick) {
  const tag = document.createElement('button');
  tag.type = 'button';
  tag.className = `geral-evento-tag ${obterClasseCorEventoCalendario(grupo.tipoAv)}`;

  const totalConsolidado = contarAvaliacoesConsolidadas(grupo.registros);

  const rotulo = document.createElement('span');
  rotulo.className = 'geral-evento-tag-grupo';
  rotulo.textContent = grupo.rotulo;

  const total = document.createElement('span');
  total.className = 'geral-evento-tag-total';
  total.textContent = formatarTotalAvaliacoes(totalConsolidado);

  tag.appendChild(rotulo);
  tag.appendChild(total);
  tag.title = `${grupo.rotulo} — ${formatarTotalAvaliacoes(totalConsolidado)}`;
  tag.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });
  return tag;
}

// Renderiza a grade de 7 colunas com uma célula por dia (mês atual + dias de preenchimento das
// semanas anterior/seguinte). Cada célula mostra no máximo 2 grupos (módulo + tipo de AV) com o
// total de avaliações, e "+ X grupos" quando há mais; clicar no dia ou em qualquer resumo abre
// o modal com a lista completa daquele dia.
function renderizarGradeCalendario(celulas) {
  domGeral.grade.innerHTML = '';

  const hojeChave = obterChaveDia(new Date());
  const fragment = document.createDocumentFragment();
  const LIMITE_GRUPOS_VISIVEIS = 2;

  celulas.forEach((celula) => {
    const diaEl = document.createElement('div');
    diaEl.className = 'geral-calendario-dia';
    if (celula.foraDoMes) diaEl.classList.add('geral-calendario-dia--fora-mes');
    if (obterChaveDia(celula.data) === hojeChave) diaEl.classList.add('geral-calendario-dia--hoje');

    const numero = document.createElement('span');
    numero.className = 'geral-calendario-dia-numero';
    numero.textContent = celula.data.getDate();
    diaEl.appendChild(numero);

    if (celula.eventos.length > 0) {
      diaEl.classList.add('geral-calendario-dia--com-eventos');
      diaEl.addEventListener('click', () => abrirModalAvaliacoesDoDia(celula.data, celula.eventos));

      const grupos = agruparAvaliacoesPorModuloAvaliacao(celula.eventos);
      const listaEventos = document.createElement('div');
      listaEventos.className = 'geral-calendario-eventos';

      const visiveis = grupos.slice(0, LIMITE_GRUPOS_VISIVEIS);
      visiveis.forEach((grupo) => {
        listaEventos.appendChild(renderizarResumoDiaCalendario(grupo, () => abrirModalAvaliacoesDoDia(celula.data, celula.eventos)));
      });

      if (grupos.length > LIMITE_GRUPOS_VISIVEIS) {
        const restantes = grupos.length - LIMITE_GRUPOS_VISIVEIS;
        const botaoMais = document.createElement('button');
        botaoMais.type = 'button';
        botaoMais.className = 'geral-calendario-mais';
        botaoMais.textContent = `+ ${restantes} grupo${restantes === 1 ? '' : 's'}`;
        botaoMais.addEventListener('click', (event) => {
          event.stopPropagation();
          abrirModalAvaliacoesDoDia(celula.data, celula.eventos);
        });
        listaEventos.appendChild(botaoMais);
      }

      diaEl.appendChild(listaEventos);
    }

    fragment.appendChild(diaEl);
  });

  domGeral.grade.appendChild(fragment);
}

// Agrupa os registros de um grupo (módulo + tipo de AV) do modal do calendário por ano
// escolar e, dentro de cada ano, consolida por bloco — reaproveitando a mesma lógica de
// agrupamento do Processo Editorial (agruparRegistrosProcessoEditorialPorAno): BLOCO 1/BLOCO
// 2/REDAÇÃO no Ensino Médio, BLOQUINHO 1..5 no 9º ano na AV2, e 1 linha por registro nos
// demais anos do Fundamental. Retorna [{ ano, grupos: [{ id, registros }] }], ordenado por
// ano na ordem fixa 6º→7º→8º→9º→1º→2º→3º.
function agruparAvaliacoesPorAnoEBlocoParaModalCalendario(registros) {
  const registrosPorAno = new Map();

  registros.forEach((record) => {
    const ano = safe(record.ano) || '-';
    if (!registrosPorAno.has(ano)) registrosPorAno.set(ano, []);
    registrosPorAno.get(ano).push(record);
  });

  return Array.from(registrosPorAno.keys())
    .sort((a, b) => {
      const posA = ORDEM_ANO_ESCOLAR_COORD.indexOf(a);
      const posB = ORDEM_ANO_ESCOLAR_COORD.indexOf(b);
      return (posA === -1 ? ORDEM_ANO_ESCOLAR_COORD.length : posA) - (posB === -1 ? ORDEM_ANO_ESCOLAR_COORD.length : posB);
    })
    .map((ano) => ({
      ano,
      grupos: agruparRegistrosProcessoEditorialPorAno(ano, registrosPorAno.get(ano))
    }));
}

// Conta quantas "provas" (avaliações) um conjunto de registros realmente representa,
// consolidando por bloco/bloquinho igual ao Processo Editorial — em vez de contar 1 por linha
// da base (1 por disciplina/componente), cada BLOCO/BLOQUINHO consolidado conta como 1. Usada
// tanto no resumo do dia no calendário quanto no título de cada grupo dentro do modal, para os
// dois números sempre baterem.
function contarAvaliacoesConsolidadas(registros) {
  const anos = agruparAvaliacoesPorAnoEBlocoParaModalCalendario(registros);
  return anos.reduce((total, grupoAno) => total + grupoAno.grupos.length, 0);
}

// Renderiza, dentro do modal, a lista completa de avaliações do dia agrupada por módulo + tipo
// de AV e, dentro de cada um, por ano escolar → bloco consolidado (mesmo padrão de blocos/
// bloquinhos usado no Processo Editorial), em vez de listar cada disciplina individualmente
function renderizarModalAvaliacoesDoDia(eventos) {
  domGeral.modalCorpo.innerHTML = '';

  const grupos = agruparAvaliacoesPorModuloAvaliacao(eventos);

  grupos.forEach((grupo) => {
    const bloco = document.createElement('div');
    bloco.className = 'geral-dia-modal-grupo';

    const anos = agruparAvaliacoesPorAnoEBlocoParaModalCalendario(grupo.registros);
    const totalConsolidado = anos.reduce((total, grupoAno) => total + grupoAno.grupos.length, 0);

    const titulo = document.createElement('h4');
    titulo.className = 'geral-dia-modal-grupo-titulo';
    titulo.textContent = `${grupo.rotulo} · ${formatarTotalAvaliacoes(totalConsolidado)}`;
    bloco.appendChild(titulo);

    anos.forEach((grupoAno) => {
      const subtitulo = document.createElement('h5');
      subtitulo.className = 'geral-dia-modal-ano-titulo';
      subtitulo.textContent = grupoAno.ano === '-' ? 'Ano não informado' : `${grupoAno.ano} ano`;
      bloco.appendChild(subtitulo);

      const lista = document.createElement('ul');
      lista.className = 'geral-dia-modal-grupo-lista';
      grupoAno.grupos.forEach((grupoBloco) => {
        const item = document.createElement('li');
        item.textContent = grupoBloco.id;
        lista.appendChild(item);
      });
      bloco.appendChild(lista);
    });

    domGeral.modalCorpo.appendChild(bloco);
  });
}

// Abre o modal com todas as avaliações do dia clicado (data ou qualquer resumo/grupo da célula)
function abrirModalAvaliacoesDoDia(data, eventos) {
  domGeral.modalTitulo.textContent = `Avaliações de ${formatarDataAplicacaoExibicao(data)}`;
  renderizarModalAvaliacoesDoDia(eventos);
  domGeral.modalBackdrop.hidden = false;
}

function fecharModalAvaliacoesDoDia() {
  domGeral.modalBackdrop.hidden = true;
}

domGeral.contagemDetalheFiltroAno.addEventListener('change', () => {
  anoSelecionadoContagemDetalhe = domGeral.contagemDetalheFiltroAno.value;
  renderizarDetalheContagemRegressiva();
});

domGeral.modalFechar.addEventListener('click', fecharModalAvaliacoesDoDia);
domGeral.modalBackdrop.addEventListener('click', (event) => {
  if (event.target === domGeral.modalBackdrop) fecharModalAvaliacoesDoDia();
});

// Orquestrador do calendário: recalcula a base filtrada + a grade do mês atual e re-renderiza
function renderizarCalendarioAvaliacoes() {
  domGeral.mesAno.textContent = formatarMesAno(geralCalendarioMesAtual);

  const dadosFiltrados = filtrarAvaliacoesCalendario(filteredRecords);
  const celulas = montarCalendarioMensal(geralCalendarioMesAtual, dadosFiltrados);
  renderizarGradeCalendario(celulas);
}

function voltarMesCalendario() {
  geralCalendarioMesAtual = new Date(geralCalendarioMesAtual.getFullYear(), geralCalendarioMesAtual.getMonth() - 1, 1);
  renderizarCalendarioAvaliacoes();
}

function avancarMesCalendario() {
  geralCalendarioMesAtual = new Date(geralCalendarioMesAtual.getFullYear(), geralCalendarioMesAtual.getMonth() + 1, 1);
  renderizarCalendarioAvaliacoes();
}

function irParaMesAtualCalendario() {
  geralCalendarioMesAtual = new Date();
  geralCalendarioMesAtual.setDate(1);
  geralCalendarioMesAtual.setHours(0, 0, 0, 0);
  renderizarCalendarioAvaliacoes();
}

domGeral.mesAnterior.addEventListener('click', voltarMesCalendario);
domGeral.mesProximo.addEventListener('click', avancarMesCalendario);
domGeral.hoje.addEventListener('click', irParaMesAtualCalendario);

// Recalcula tudo que depende dos filtros da aba Geral (Ano/Módulo, visíveis no header; Tipo de
// AV/busca, ocultos mas ainda funcionais) quando algum deles mudar: a faixa "Dias faltando" e o
// calendário (a lista de avaliações do dia é re-renderizada dentro do próprio calendário, a
// partir dos eventos já filtrados de cada célula)
function atualizarConteudoFiltravelGeral() {
  renderizarContagemRegressivaAvaliacoes();
  renderizarCalendarioAvaliacoes();
}

domGeral.filtroTipoAv.addEventListener('change', () => {
  geralFiltrosCalendario.tipoAv = domGeral.filtroTipoAv.value;
  atualizarConteudoFiltravelGeral();
});
domGeral.filtroAno.addEventListener('change', () => {
  geralFiltrosCalendario.ano = domGeral.filtroAno.value;
  atualizarConteudoFiltravelGeral();
});
domGeral.filtroModulo.addEventListener('change', () => {
  geralFiltrosCalendario.modulo = domGeral.filtroModulo.value;
  atualizarConteudoFiltravelGeral();
});
domGeral.filtroBusca.addEventListener('input', () => {
  geralFiltrosCalendario.busca = domGeral.filtroBusca.value;
  atualizarConteudoFiltravelGeral();
});

// Calcula quantos dias faltam para data_aplicacao em relação a hoje (positivo = futuro,
// negativo = já passou, 0 = hoje); null quando não há data válida
function calcularDiasParaAplicacao(data) {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataSemHora = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  return Math.round((dataSemHora.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

// Tipo de avaliação selecionado na faixa "Dias faltando" (null = nenhum card ativo, painel de
// detalhe oculto)
let tipoAvContagemSelecionado = null;

// Ano selecionado no filtro da tabela de detalhe ('' = todos os anos); resetado sempre que o
// card selecionado (tipoAvContagemSelecionado) muda
let anoSelecionadoContagemDetalhe = '';

// Agrupa os registros por Tipo de AV (normalizado): para cada tipo, conta o TOTAL REAL de
// registros do tipo (totalProvasTipo, independente de data) e, separadamente, localiza a
// próxima data_aplicacao futura (dias >= 0, hoje conta como 0) entre os registros com data
// válida. Tipos sem nenhuma data futura não entram no resultado (mas seu total real é
// calculado sobre TODOS os registros do tipo, não só os que têm data futura). Ordenado da
// data mais próxima para a mais distante.
function obterProximasAvaliacoesPorTipo(dados) {
  const totaisPorTipo = new Map();
  const proximaDataPorTipo = new Map();

  dados.forEach((record) => {
    const tipoAv = normalizarTipoAvPerformance(record.tipo_av);
    totaisPorTipo.set(tipoAv, (totaisPorTipo.get(tipoAv) || 0) + 1);

    const data = parseDataAplicacao(record.data_aplicacao);
    const dias = calcularDiasParaAplicacao(data);
    if (data === null || dias === null || dias < 0) return;

    const atual = proximaDataPorTipo.get(tipoAv);
    if (!atual || data.getTime() < atual.data.getTime()) {
      proximaDataPorTipo.set(tipoAv, { data, dias });
    }
  });

  return Array.from(proximaDataPorTipo.entries())
    .map(([tipoAv, proxima]) => ({
      tipoAv,
      data: proxima.data,
      dias: proxima.dias,
      totalProvasTipo: totaisPorTipo.get(tipoAv) || 0
    }))
    .sort((a, b) => a.data.getTime() - b.data.getTime());
}

// Cria 1 card da contagem regressiva: ícone, nome do tipo de avaliação (AV1/AV2/2º CHAMADA/
// REC-SEM/REC-FIM), número grande de dias + "DIAS FALTANDO", linha "X provas" com o total real
// do tipo no recorte filtrado, rodapé com a data formatada. Clicável: seleciona/desmarca o
// tipo e atualiza a tabela de detalhe abaixo dos cards.
function criarCardContagemRegressiva(item, indice) {
  const card = document.createElement('div');
  const ativo = tipoAvContagemSelecionado === item.tipoAv;
  card.className = `geral-contagem-card-item geral-contagem-card-item--${indice % 5}${ativo ? ' geral-contagem-card-item--ativo' : ''}`;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  const icone = document.createElement('div');
  icone.className = 'geral-contagem-card-icone';
  icone.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.7"/>' +
    '<path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
    '</svg>';
  card.appendChild(icone);

  const label = document.createElement('div');
  label.className = 'geral-contagem-card-label';
  label.textContent = item.tipoAv;
  label.title = item.tipoAv;
  card.appendChild(label);

  const dias = document.createElement('div');
  dias.className = 'geral-contagem-card-dias';
  dias.textContent = item.dias;
  card.appendChild(dias);

  const diasLabel = document.createElement('div');
  diasLabel.className = 'geral-contagem-card-dias-label';
  diasLabel.textContent = 'DIAS FALTANDO';
  card.appendChild(diasLabel);

  const quantidadeLabel = document.createElement('div');
  quantidadeLabel.className = 'geral-contagem-card-quantidade';
  quantidadeLabel.textContent = `${item.totalProvasTipo} prova${item.totalProvasTipo === 1 ? '' : 's'}`;
  card.appendChild(quantidadeLabel);

  const rodape = document.createElement('div');
  rodape.className = 'geral-contagem-card-rodape';
  rodape.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="geral-contagem-card-rodape-icone">' +
    '<rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" stroke-width="1.7"/>' +
    '<path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
    '</svg>' +
    `<span>${item.data ? formatarDataAplicacaoExibicao(item.data) : 'Sem data futura'}</span>`;
  card.appendChild(rodape);

  const selecionar = () => {
    tipoAvContagemSelecionado = tipoAvContagemSelecionado === item.tipoAv ? null : item.tipoAv;
    anoSelecionadoContagemDetalhe = '';
    renderizarContagemRegressivaAvaliacoes();
  };
  card.addEventListener('click', selecionar);
  card.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      selecionar();
    }
  });

  return card;
}

// Rótulo de bloco de um grupo já consolidado por agruparRegistrosProcessoEditorialPorAno: usa
// o campo "bloco" (Ensino Médio: BLOCO 1/BLOCO 2/REDAÇÃO) ou "bloquinho" (9º ano na AV2) quando
// existir; nos demais casos (1 registro por grupo) não há bloco — mostra a própria disciplina
// (mesmo comportamento de antes da consolidação)
function getBlocoRegistro(grupo) {
  if (grupo.bloco) return grupo.bloco;
  if (grupo.bloquinho) return grupo.bloquinho;
  return safe(grupo.registros[0].frente) || '-';
}

// Agrupa os registros do painel "Dias faltando" por módulo + tipo de avaliação + ano + bloco,
// reaproveitando o mesmo modelo de consolidação já usado no Processo Editorial
// (agruparRegistrosProcessoEditorialPorAno: BLOCO 1/BLOCO 2/REDAÇÃO no Ensino Médio, BLOQUINHOs
// no 9º ano na AV2) — assim, várias disciplinas do mesmo bloco viram 1 única linha na tabela.
function agruparRegistrosDetalheContagemPorBloco(registros) {
  const registrosPorAno = new Map();
  registros.forEach((record) => {
    const ano = safe(record.ano);
    if (!registrosPorAno.has(ano)) registrosPorAno.set(ano, []);
    registrosPorAno.get(ano).push(record);
  });

  const grupos = [];
  registrosPorAno.forEach((registrosDoAno, ano) => {
    agruparRegistrosProcessoEditorialPorAno(ano, registrosDoAno).forEach((grupo) => {
      grupos.push(grupo);
    });
  });
  return grupos;
}

// Ordena os grupos (1 linha por bloco/disciplina) por: 1) data_aplicacao crescente (sem data
// por último), 2) ano crescente, 3) tipo de avaliação (ordem fixa AV1→AV2→...), 4) bloco
// (BLOCO 1 → BLOCO 2 → REDAÇÃO / BLOQUINHO 1 → ... → 5, ou disciplina em ordem alfabética
// quando não há bloco)
function ordenarGruposDetalheContagem(grupos) {
  return [...grupos].sort((a, b) => {
    const registroA = a.registros[0];
    const registroB = b.registros[0];

    const dataA = parseDataAplicacao(registroA.data_aplicacao);
    const dataB = parseDataAplicacao(registroB.data_aplicacao);
    if (dataA && dataB && dataA.getTime() !== dataB.getTime()) return dataA.getTime() - dataB.getTime();
    if (dataA && !dataB) return -1;
    if (!dataA && dataB) return 1;

    const anoA = Number(safe(registroA.ano)) || 0;
    const anoB = Number(safe(registroB.ano)) || 0;
    if (anoA !== anoB) return anoA - anoB;

    const tipoAvA = normalizarTipoAvPerformance(registroA.tipo_av);
    const tipoAvB = normalizarTipoAvPerformance(registroB.tipo_av);
    if (tipoAvA !== tipoAvB) {
      const posA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAvA);
      const posB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAvB);
      return (posA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posA) - (posB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posB);
    }

    const blocoA = getBlocoRegistro(a);
    const blocoB = getBlocoRegistro(b);
    const posBlocoA = ORDEM_BLOCO_ENSINO_MEDIO.indexOf(blocoA);
    const posBlocoB = ORDEM_BLOCO_ENSINO_MEDIO.indexOf(blocoB);
    if (posBlocoA !== -1 || posBlocoB !== -1) {
      return (posBlocoA === -1 ? ORDEM_BLOCO_ENSINO_MEDIO.length : posBlocoA) - (posBlocoB === -1 ? ORDEM_BLOCO_ENSINO_MEDIO.length : posBlocoB);
    }
    return blocoA.localeCompare(blocoB, 'pt-BR', { numeric: true });
  });
}

// Popula o filtro de Ano da tabela de detalhe apenas com os anos presentes nos registros do
// tipo de avaliação selecionado (antes do próprio filtro de ano), na ordem fixa
// ORDEM_ANO_ESCOLAR_COORD (6º→7º→8º→9º→1º→2º→3º). Mantém a seleção atual se ainda for válida
// no novo recorte; caso contrário volta para "Ano" (todos).
function popularFiltroAnoAvaliacoesCard(registros) {
  const anosDisponiveis = ORDEM_ANO_ESCOLAR_COORD.filter((ano) =>
    registros.some((record) => safe(record.ano) === ano)
  );

  if (anoSelecionadoContagemDetalhe && !anosDisponiveis.includes(anoSelecionadoContagemDetalhe)) {
    anoSelecionadoContagemDetalhe = '';
  }

  const select = domGeral.contagemDetalheFiltroAno;
  select.innerHTML = '';

  const opcaoTodos = document.createElement('option');
  opcaoTodos.value = '';
  opcaoTodos.textContent = 'Ano';
  select.appendChild(opcaoTodos);

  anosDisponiveis.forEach((ano) => {
    const opcao = document.createElement('option');
    opcao.value = ano;
    opcao.textContent = ano;
    select.appendChild(opcao);
  });

  select.value = anoSelecionadoContagemDetalhe;
}

// Renderiza a tabela de detalhe (ID | Ano | Bloco | Módulo | Data da Aplicação) com os grupos
// do tipo de avaliação selecionado (e do ano selecionado no filtro, se houver), respeitando o
// recorte filtrado atual (filteredRecords). Cada linha é 1 bloco consolidado (BLOCO 1/BLOCO
// 2/REDAÇÃO no Ensino Médio, BLOQUINHO no 9º ano na AV2) em vez de 1 linha por disciplina
// solta; nos demais casos (sem bloco) continua 1 linha por registro. Oculta o painel quando
// nenhum card está selecionado.
function renderizarDetalheContagemRegressiva() {
  if (!tipoAvContagemSelecionado) {
    domGeral.contagemDetalhe.hidden = true;
    domGeral.contagemDetalheCorpo.innerHTML = '';
    return;
  }

  const registrosDoTipo = filtrarAvaliacoesGeral(filteredRecords).filter(
    (record) => normalizarTipoAvPerformance(record.tipo_av) === tipoAvContagemSelecionado
  );

  popularFiltroAnoAvaliacoesCard(registrosDoTipo);

  const registros = anoSelecionadoContagemDetalhe
    ? registrosDoTipo.filter((record) => safe(record.ano) === anoSelecionadoContagemDetalhe)
    : registrosDoTipo;

  const grupos = ordenarGruposDetalheContagem(agruparRegistrosDetalheContagemPorBloco(registros));

  domGeral.contagemDetalheTitulo.textContent = `Avaliações de ${tipoAvContagemSelecionado}`;
  domGeral.contagemDetalheCorpo.innerHTML = '';

  const fragment = document.createDocumentFragment();
  grupos.forEach((grupo) => {
    const registroBase = grupo.registros[0];
    const tr = document.createElement('tr');
    const data = parseDataAplicacao(registroBase.data_aplicacao);
    [
      safe(registroBase.ano) || '-',
      getBlocoRegistro(grupo),
      safe(registroBase.modulo) || '-',
      data ? formatarDataAplicacaoExibicao(data) : '-'
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });
  domGeral.contagemDetalheCorpo.appendChild(fragment);

  domGeral.contagemDetalhe.hidden = false;
}

// Renderiza a faixa "Dias faltando para a aplicação da avaliação" — 1 card por tipo de
// avaliação (nunca por prova individual), com a próxima data futura e o total real de provas
// de cada tipo, a partir do recorte global (filteredRecords) já restrito pelos filtros da aba
// Geral (Ano/Módulo, no header). Também atualiza o painel de detalhe do tipo selecionado, se houver.
function renderizarContagemRegressivaAvaliacoes() {
  domGeral.contagemGrade.innerHTML = '';

  const proximas = obterProximasAvaliacoesPorTipo(filtrarAvaliacoesGeral(filteredRecords));

  if (tipoAvContagemSelecionado && !proximas.some((item) => item.tipoAv === tipoAvContagemSelecionado)) {
    tipoAvContagemSelecionado = null;
  }

  domGeral.contagemVazio.hidden = proximas.length > 0;
  if (proximas.length === 0) {
    renderizarDetalheContagemRegressiva();
    return;
  }

  const fragment = document.createDocumentFragment();
  proximas.forEach((item, indice) => fragment.appendChild(criarCardContagemRegressiva(item, indice)));
  domGeral.contagemGrade.appendChild(fragment);

  renderizarDetalheContagemRegressiva();
}

// Orquestrador da aba Geral: mensagem de boas-vindas + faixa "Dias faltando" + calendário mensal
function renderizarGeral() {
  const nome = obterNomeUsuarioLogado();
  domGeral.saudacao.textContent = nome ? `Olá, ${nome}!` : 'Olá!';

  popularFiltroTipoAvGeral();
  popularFiltroAnoGeral(filteredRecords);
  popularFiltroModuloGeral(filteredRecords);

  renderizarContagemRegressivaAvaliacoes();
  renderizarCalendarioAvaliacoes();
}

// Agrupa uma lista de registros por um campo, retornando um Map: valor do campo -> registros
function agruparPorCampo(dados, campo) {
  const grupos = new Map();

  dados.forEach((record) => {
    const chave = safe(record[campo]) || '(Não informado)';
    if (!grupos.has(chave)) {
      grupos.set(chave, []);
    }
    grupos.get(chave).push(record);
  });

  return grupos;
}

// Renderiza uma tabela de resumo genérica a partir de um Map de grupos e uma lista de colunas
// columns: array de { header, getValue(records) }
function renderSummaryTable(tbodyEl, grupos, columns) {
  tbodyEl.innerHTML = '';

  if (grupos.size === 0) {
    dom.empty.hidden = false;
    dom.resultsCount.textContent = '';
    return;
  }
  dom.empty.hidden = true;

  const nomesOrdenados = Array.from(grupos.keys()).sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { numeric: true })
  );

  const fragment = document.createDocumentFragment();

  nomesOrdenados.forEach((nome) => {
    const records = grupos.get(nome);
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = nome;
    tr.appendChild(tdNome);

    columns.forEach((column) => {
      const td = document.createElement('td');
      td.textContent = column.getValue(records);
      tr.appendChild(td);
    });

    fragment.appendChild(tr);
  });

  tbodyEl.appendChild(fragment);
  dom.resultsCount.textContent = `${nomesOrdenados.length} grupo(s) encontrado(s)`;
}

function contarConcluidas(records) {
  return records.filter((r) => r.situacao === 'Concluído').length;
}

function contarAtrasadas(records) {
  return records.filter((r) => r.situacao === 'Atrasado').length;
}

function contarEmAndamento(records) {
  return records.filter((r) => r.situacao === 'Em andamento').length;
}

function contarPendentes(records, campo) {
  return records.filter((r) => !safe(r[campo]) && r.situacao !== 'Concluído').length;
}

// Indica se a devolutiva foi entregue dentro do prazo (devolutiva <= prazo)
function foiEntregueNoPrazo(record) {
  const devolutiva = parseBrDate(record.devolutiva_encomenda);
  const prazo = parseBrDate(record.prazo_encomenda);
  if (!devolutiva || !prazo) return false;
  return devolutiva.getTime() <= prazo.getTime();
}

// Calcula a diferença em dias entre a referência (devolutiva ou hoje) e o prazo da encomenda.
// Retorna null quando não há prazo definido.
function diferencaParaPrazo(record) {
  const prazo = parseBrDate(record.prazo_encomenda);
  if (!prazo) return null;

  const devolutiva = parseBrDate(record.devolutiva_encomenda);
  let referencia;
  if (devolutiva) {
    referencia = devolutiva;
  } else {
    referencia = new Date();
    referencia.setHours(0, 0, 0, 0);
  }

  const diffMs = referencia.getTime() - prazo.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Formata a diferença em dias no padrão "-2 dias" / "0 dias" / "+4 dias"
function formatarDiferencaParaPrazo(dias) {
  if (dias === null) return '-';
  if (dias > 0) return `+${dias} dias`;
  return `${dias} dias`;
}

// Filtros rápidos de card cujo resultado deve ser ordenado pela coluna "Dias",
// do maior atraso para o menor
const FILTROS_RAPIDOS_ORDENADOS_POR_ATRASO = ['entregues-fora-prazo', 'encomendas-atrasadas'];

// Ordena uma lista de registros pela mesma métrica exibida na coluna "Dias"
// (diferencaParaPrazo), do maior valor para o menor
function ordenarRegistrosPorDiasDecrescente(records) {
  return [...records].sort((a, b) => {
    const diasA = diferencaParaPrazo(a) ?? -Infinity;
    const diasB = diferencaParaPrazo(b) ?? -Infinity;
    return diasB - diasA;
  });
}

// Conta quantos dias úteis (segunda a sexta) existem entre dataInicialBR (exclusiva) e
// dataFinalBR (inclusiva), no formato dd/mm/aaaa. A contagem começa no próximo dia útil
// após dataInicialBR — a data da devolutiva nunca é contada como dia de análise.
function calcularDiasUteisEntreDatas(dataInicialBR, dataFinalBR) {
  const inicio = parseBrDate(dataInicialBR);
  const fim = parseBrDate(dataFinalBR);
  if (!inicio || !fim) return null;

  // Avança para o dia seguinte à devolutiva; se cair em fim de semana, pula para o próximo dia útil
  const cursor = new Date(inicio.getTime());
  cursor.setDate(cursor.getDate() + 1);
  while (cursor.getDay() === 0 || cursor.getDay() === 6) {
    cursor.setDate(cursor.getDate() + 1);
  }

  let diasUteis = 0;
  while (cursor.getTime() <= fim.getTime()) {
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return diasUteis;
}

// Calcula os dias úteis entre devolutiva_encomenda e data_validacao_sgge.
// Retorna null quando algum dos dois campos estiver vazio.
function diasParaValidar(record) {
  const devolutiva = safe(record.devolutiva_encomenda);
  const validacao = safe(record.data_validacao_sgge);
  if (!devolutiva || !validacao) return null;

  return calcularDiasUteisEntreDatas(devolutiva, validacao);
}

// Formata a contagem de dias úteis no padrão "0 dias úteis" / "+1 dia útil" / "+X dias úteis"
function formatarDiasParaValidar(diasUteis) {
  if (diasUteis === null) return '-';
  if (diasUteis === 0) return '0 dias úteis';
  if (diasUteis === 1) return '+1 dia útil';
  return `+${diasUteis} dias úteis`;
}

// Calcula o atraso da validação SGGE: a equipe tem até 2 dias úteis após a devolutiva.
// atraso_validacao = max(0, dias_uteis_para_validar - 2). Retorna null se não houver cálculo.
function calcularAtrasoValidacao(diasUteisParaValidar) {
  if (diasUteisParaValidar === null) return null;
  return Math.max(0, diasUteisParaValidar - 2);
}

// Determina o status do prazo da encomenda, conforme regras da aba Elaborador
function getStatusPrazo(record) {
  const devolutiva = safe(record.devolutiva_encomenda);
  const prazo = safe(record.prazo_encomenda);

  if (!prazo) return 'Sem prazo';
  if (!devolutiva && isDateOverdue(prazo)) return 'Atrasada';
  if (!devolutiva && !isDateOverdue(prazo)) return 'No prazo';
  if (devolutiva && foiEntregueNoPrazo(record)) return 'Entregue no prazo';
  return 'Entregue fora do prazo';
}

function badgeClassForEncomenda(label) {
  const map = {
    Realizada: 'badge-realizada',
    Pendente: 'badge-pendente',
    Validada: 'badge-validada',
    'Sem prazo': 'badge-sem-prazo',
    Atrasada: 'badge-atrasada',
    'No prazo': 'badge-no-prazo',
    'Entregue no prazo': 'badge-entregue-prazo',
    'Entregue fora do prazo': 'badge-entregue-fora-prazo'
  };
  return map[label] || '';
}

function renderBadgeCell(tr, label) {
  const td = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `badge ${badgeClassForEncomenda(label)}`;
  badge.textContent = label;
  td.appendChild(badge);
  tr.appendChild(td);
}

// Badge de classificação de risco (Crítico / Atenção / Controlado) usado na tabela de
// recorrência de atraso por elaborador, na seção Indicadores
function badgeClassForClassificacao(classificacao) {
  const map = {
    Crítico: 'badge-classificacao-critico',
    Atenção: 'badge-classificacao-atencao',
    Controlado: 'badge-classificacao-controlado'
  };
  return map[classificacao] || '';
}

function renderBadgeCellClassificacao(tr, classificacao) {
  const td = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `badge ${badgeClassForClassificacao(classificacao)}`;
  badge.textContent = classificacao;
  td.appendChild(badge);
  tr.appendChild(td);
}

// Calcula todos os totais usados pelos cards da aba Elaborador a partir dos registros filtrados
function calcularTotaisElaborador(records) {
  return {
    total: records.length,
    realizadas: records.filter((r) => safe(r.data_encomenda)).length,
    pendentes: records.filter((r) => !safe(r.data_encomenda)).length,
    atrasadas: records.filter(
      (r) => !safe(r.devolutiva_encomenda) && safe(r.prazo_encomenda) && isDateOverdue(r.prazo_encomenda)
    ).length,
    noPrazo: records.filter(
      (r) => !safe(r.devolutiva_encomenda) && safe(r.prazo_encomenda) && !isDateOverdue(r.prazo_encomenda)
    ).length,
    entreguesPrazo: records.filter((r) => safe(r.devolutiva_encomenda) && foiEntregueNoPrazo(r)).length,
    entreguesForaPrazo: records.filter((r) => safe(r.devolutiva_encomenda) && !foiEntregueNoPrazo(r)).length,
    validadas: records.filter((r) => safe(r.data_validacao_sgge)).length,
    aguardando: records.filter((r) => safe(r.devolutiva_encomenda) && !safe(r.data_validacao_sgge)).length
  };
}

// Verifica se um registro passa no filtro rápido (clique em card) atualmente ativo.
// Cada predicado espelha exatamente o cálculo usado no card correspondente em
// calcularTotaisElaborador, para que o total exibido no card bata com o resultado do filtro.
function passaFiltroRapidoElaborador(record) {
  if (!filtroRapidoElaborador) return true;

  switch (filtroRapidoElaborador) {
    case 'total-encomendas':
      return true;
    case 'encomendas-realizadas':
      return Boolean(safe(record.data_encomenda));
    case 'encomendas-pendentes':
      return !safe(record.data_encomenda);
    case 'entregues-no-prazo':
      return Boolean(safe(record.devolutiva_encomenda)) && foiEntregueNoPrazo(record);
    case 'entregues-fora-prazo':
      return Boolean(safe(record.devolutiva_encomenda)) && !foiEntregueNoPrazo(record);
    case 'encomendas-atrasadas':
      return !safe(record.devolutiva_encomenda) && Boolean(safe(record.prazo_encomenda)) && isDateOverdue(record.prazo_encomenda);
    case 'encomendas-no-prazo':
      return !safe(record.devolutiva_encomenda) && Boolean(safe(record.prazo_encomenda)) && !isDateOverdue(record.prazo_encomenda);
    case 'validadas-sgge':
      return Boolean(safe(record.data_validacao_sgge));
    case 'aguardando-validacao':
      return Boolean(safe(record.devolutiva_encomenda)) && !safe(record.data_validacao_sgge);
    default:
      return true;
  }
}

// Alterna o filtro rápido do card clicado: se já estava ativo, desliga; senão, assume o novo
function aplicarFiltroRapidoElaborador(tipoFiltro) {
  filtroRapidoElaborador = filtroRapidoElaborador === tipoFiltro ? null : tipoFiltro;
  renderizarVisaoElaborador();
}

// Atualiza o destaque visual (borda/sombra) do card correspondente ao filtro rápido ativo
function atualizarDestaqueCardsElaborador() {
  document.querySelectorAll('#viewElaborador [data-quick-filter]').forEach((card) => {
    const isActive = card.dataset.quickFilter === filtroRapidoElaborador;
    card.classList.toggle('is-quick-active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });
}

// Calcula o percentual inteiro de um valor sobre um total (0 quando o total é zero)
function calcularPercentual(valor, total) {
  if (!total) return 0;
  return Math.round((valor / total) * 100);
}

// Atualiza o anel de progresso SVG (círculo + texto) de um card com o percentual informado
function setRingProgress(svgId, percent) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const circle = svg.querySelector('.stat-ring-progress');
  const text = svg.querySelector('.stat-ring-text');
  const raio = Number(circle.getAttribute('r'));
  const circunferencia = 2 * Math.PI * raio;

  circle.style.strokeDasharray = `${(percent / 100) * circunferencia} ${circunferencia}`;
  text.textContent = `${percent}%`;
}

// Renderiza o bloco "Encomendas" (total, realizadas, pendentes) com seus anéis de progresso
function renderizarGrupoEncomendas(totais) {
  dom.cardElabTotal.textContent = totais.total;
  dom.cardElabRealizadas.textContent = totais.realizadas;
  dom.cardElabPendentes.textContent = totais.pendentes;

  setRingProgress('ringElabTotal', calcularPercentual(totais.total, totais.total));
  setRingProgress('ringElabRealizadas', calcularPercentual(totais.realizadas, totais.total));
  setRingProgress('ringElabPendentes', calcularPercentual(totais.pendentes, totais.total));
}

// Renderiza o bloco "Devoluções (Prazos)" (entregues no prazo, fora do prazo, atrasadas, no prazo)
function renderizarGrupoDevolucoes(totais) {
  dom.cardElabEntreguesPrazo.textContent = totais.entreguesPrazo;
  dom.cardElabEntreguesForaPrazo.textContent = totais.entreguesForaPrazo;
  dom.cardElabAtrasadas.textContent = totais.atrasadas;
  dom.cardElabNoPrazo.textContent = totais.noPrazo;

  setRingProgress('ringElabEntreguesPrazo', calcularPercentual(totais.entreguesPrazo, totais.total));
  setRingProgress('ringElabEntreguesForaPrazo', calcularPercentual(totais.entreguesForaPrazo, totais.total));
  setRingProgress('ringElabAtrasadas', calcularPercentual(totais.atrasadas, totais.total));
  setRingProgress('ringElabNoPrazo', calcularPercentual(totais.noPrazo, totais.total));
}

// Renderiza o bloco "Validações" (validadas, aguardando validação) com barras de progresso
function renderizarGrupoValidacoes(totais) {
  const percentValidadas = calcularPercentual(totais.validadas, totais.total);
  const percentAguardando = calcularPercentual(totais.aguardando, totais.total);

  dom.cardElabValidadas.textContent = totais.validadas;
  dom.cardElabAguardando.textContent = totais.aguardando;
  dom.percentElabValidadas.textContent = `${percentValidadas}%`;
  dom.percentElabAguardando.textContent = `${percentAguardando}%`;
  dom.barElabValidadas.style.width = `${percentValidadas}%`;
  dom.barElabAguardando.style.width = `${percentAguardando}%`;
}

// Popula os selects de Ano, Disciplina, Tipo de AV e Módulo (filtro rápido do cabeçalho) da aba Elaborador
// Opções fixas dos campos "Status" do popover da aba Elaborador (não vêm dos registros, mesmas
// <option> estáticas que existiam antes nos <select>)
const OPCOES_ELAB_STATUS_ENCOMENDA = [
  { value: 'Realizada', label: 'Realizada' },
  { value: 'Pendente', label: 'Pendente' }
];
const OPCOES_ELAB_STATUS_PRAZO = [
  { value: 'Sem prazo', label: 'Sem prazo' },
  { value: 'Atrasada', label: 'Atrasada' },
  { value: 'No prazo', label: 'No prazo' },
  { value: 'Entregue no prazo', label: 'Entregue no prazo' },
  { value: 'Entregue fora do prazo', label: 'Entregue fora do prazo' }
];
const OPCOES_ELAB_STATUS_VALIDACAO = [
  { value: 'Validada', label: 'Validada' },
  { value: 'Pendente', label: 'Pendente' }
];

function populateElabFilterOptions(records) {
  populateAnoAplicacaoOptions(elabSelectFilters.ano, records);
  populateSelectOptions(elabSelectFilters.modulo, records, 'modulo', 'Módulo');
  populateCheckboxGroupField(elabCheckboxGroups.ano, records, 'ano', filtrosElaborador.anos);
  populateCheckboxGroupField(elabCheckboxGroups.frente, records, 'frente', filtrosElaborador.disciplinas);
  populateCheckboxGroupTipoAv(elabCheckboxGroups.tipoAv, records, filtrosElaborador.tiposAv);
  renderizarGrupoCheckbox(elabCheckboxGroups.statusEncomenda, OPCOES_ELAB_STATUS_ENCOMENDA, filtrosElaborador.statusEncomenda);
  renderizarGrupoCheckbox(elabCheckboxGroups.statusPrazo, OPCOES_ELAB_STATUS_PRAZO, filtrosElaborador.statusPrazo);
  renderizarGrupoCheckbox(elabCheckboxGroups.statusValidacao, OPCOES_ELAB_STATUS_VALIDACAO, filtrosElaborador.statusValidacao);
}

// Aplica os filtros próprios da aba Elaborador (grupos Encomendas/Devoluções/Validações + busca
// + filtro rápido de Módulo do cabeçalho) sobre os registros já filtrados globalmente
function aplicarFiltrosElaborador(records) {
  const anoAplicacao = elabSelectFilters.ano.value;
  const modulo = elabSelectFilters.modulo.value;
  const busca = safe(elabFilterBusca.value).toLowerCase();

  return records.filter((record) => {
    if (anoAplicacao && obterAnoAplicacao(record) !== anoAplicacao) return false;
    if (!passaFiltroMultiplo(safe(record.ano), filtrosElaborador.anos)) return false;
    if (!passaFiltroMultiplo(safe(record.frente), filtrosElaborador.disciplinas)) return false;
    if (!passaFiltroMultiplo(safe(record.tipo_av), filtrosElaborador.tiposAv)) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;

    const statusEncomenda = safe(record.data_encomenda) ? 'Realizada' : 'Pendente';
    if (!passaFiltroMultiplo(statusEncomenda, filtrosElaborador.statusEncomenda)) return false;

    const statusPrazo = getStatusPrazo(record);
    if (!passaFiltroMultiplo(statusPrazo, filtrosElaborador.statusPrazo)) return false;

    const statusValidacao = safe(record.data_validacao_sgge) ? 'Validada' : 'Pendente';
    if (!passaFiltroMultiplo(statusValidacao, filtrosElaborador.statusValidacao)) return false;

    if (busca) {
      const camposVisiveis = [
        safe(record.modulo),
        safe(record.ano),
        safe(record.frente),
        safe(record.tipo_av),
        safe(record.elaborador),
        safe(record.data_encomenda),
        statusEncomenda,
        safe(record.prazo_encomenda),
        safe(record.devolutiva_encomenda),
        formatarDiferencaParaPrazo(diferencaParaPrazo(record)),
        statusPrazo,
        safe(record.data_validacao_sgge),
        String(calcularAtrasoValidacao(diasParaValidar(record)) ?? '-'),
        statusValidacao
      ];
      const matchesBusca = camposVisiveis.some((valor) => valor.toLowerCase().includes(busca));
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Limpa os filtros próprios da aba Elaborador (popover, busca e filtro rápido) e re-renderiza a visão
function limparFiltrosElaborador() {
  Object.values(elabSelectFilters).forEach((select) => (select.value = ''));
  filtrosElaborador.anos = [];
  filtrosElaborador.disciplinas = [];
  filtrosElaborador.tiposAv = [];
  filtrosElaborador.statusEncomenda = [];
  filtrosElaborador.statusPrazo = [];
  filtrosElaborador.statusValidacao = [];
  Object.values(elabCheckboxGroups).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  elabFilterBusca.value = '';
  filtroRapidoElaborador = null;
  renderizarVisaoElaborador();
}

// --- Popover de filtros da aba Elaborador ---

// Copia o estado marcado dos checkboxes do popover para filtrosElaborador — chamado ao clicar
// "Aplicar filtros" (os checkboxes não filtram ao vivo, diferente do <select> de Módulo)
function aplicarCheckboxesElaborador() {
  filtrosElaborador.anos = lerGrupoCheckbox(elabCheckboxGroups.ano);
  filtrosElaborador.disciplinas = lerGrupoCheckbox(elabCheckboxGroups.frente);
  filtrosElaborador.tiposAv = lerGrupoCheckbox(elabCheckboxGroups.tipoAv);
  filtrosElaborador.statusEncomenda = lerGrupoCheckbox(elabCheckboxGroups.statusEncomenda);
  filtrosElaborador.statusPrazo = lerGrupoCheckbox(elabCheckboxGroups.statusPrazo);
  filtrosElaborador.statusValidacao = lerGrupoCheckbox(elabCheckboxGroups.statusValidacao);
}

// Conta quantos filtros estão ativos (selects preenchidos + busca) e atualiza o badge/destaque do botão
function atualizarIndicadorFiltrosElaborador() {
  const totalAtivos =
    Object.values(elabSelectFilters).filter((select) => select.value !== '').length +
    filtrosElaborador.anos.length +
    filtrosElaborador.disciplinas.length +
    filtrosElaborador.tiposAv.length +
    filtrosElaborador.statusEncomenda.length +
    filtrosElaborador.statusPrazo.length +
    filtrosElaborador.statusValidacao.length +
    (safe(elabFilterBusca.value) !== '' ? 1 : 0);

  elabFilterBadge.hidden = totalAtivos === 0;
  elabFilterBadge.textContent = totalAtivos;
  btnAbrirFiltrosElab.classList.toggle('has-active-filters', totalAtivos > 0);
}

function abrirPopoverFiltrosElaborador() {
  elabFiltersPopover.hidden = false;
  btnAbrirFiltrosElab.classList.add('is-active');
  btnAbrirFiltrosElab.setAttribute('aria-expanded', 'true');
  btnAbrirFiltrosElab.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosElab.dataset.iconAtivo;
}

function fecharPopoverFiltrosElaborador() {
  elabFiltersPopover.hidden = true;
  btnAbrirFiltrosElab.classList.remove('is-active');
  btnAbrirFiltrosElab.setAttribute('aria-expanded', 'false');
  btnAbrirFiltrosElab.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosElab.dataset.iconNormal;
}

// --- Popover de filtros da seção Indicadores — Elaborador ---

// Limpa os filtros do popover de Indicadores e re-renderiza a seção
function limparFiltrosIndicadoresTopo() {
  Object.values(indSelectFilters).forEach((select) => (select.value = ''));
  filtrosIndicadoresTopo.anos = [];
  filtrosIndicadoresTopo.disciplinas = [];
  filtrosIndicadoresTopo.tiposAv = [];
  filtrosIndicadoresTopo.elaboradores = [];
  Object.values(indCheckboxGroups).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  indFilterBusca.value = '';
  renderizarIndicadoresElaborador(indicadoresDadosBase);
}

// Copia o estado marcado dos checkboxes do popover para filtrosIndicadoresTopo — só é chamado
// ao clicar "Aplicar filtros" (os checkboxes, diferente do <select> de Módulo, não filtram ao
// marcar/desmarcar)
function aplicarCheckboxesIndicadoresTopo() {
  filtrosIndicadoresTopo.anos = lerGrupoCheckbox(indCheckboxGroups.ano);
  filtrosIndicadoresTopo.disciplinas = lerGrupoCheckbox(indCheckboxGroups.disciplina);
  filtrosIndicadoresTopo.tiposAv = lerGrupoCheckbox(indCheckboxGroups.tipoAv);
  filtrosIndicadoresTopo.elaboradores = lerGrupoCheckbox(indCheckboxGroups.elaborador);
}

// Conta quantos filtros do popover de Indicadores estão ativos e atualiza o badge/destaque do botão
function atualizarIndicadorFiltrosIndicadoresTopo() {
  const totalAtivos =
    Object.values(indSelectFilters).filter((select) => select.value !== '').length +
    filtrosIndicadoresTopo.anos.length +
    filtrosIndicadoresTopo.disciplinas.length +
    filtrosIndicadoresTopo.tiposAv.length +
    filtrosIndicadoresTopo.elaboradores.length +
    (safe(indFilterBusca.value) !== '' ? 1 : 0);

  indFilterBadge.hidden = totalAtivos === 0;
  indFilterBadge.textContent = totalAtivos;
  btnAbrirFiltrosInd.classList.toggle('has-active-filters', totalAtivos > 0);
}

function abrirPopoverFiltrosIndicadoresTopo() {
  indFiltersPopover.hidden = false;
  btnAbrirFiltrosInd.classList.add('is-active');
  btnAbrirFiltrosInd.setAttribute('aria-expanded', 'true');
  btnAbrirFiltrosInd.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosInd.dataset.iconAtivo;
}

function fecharPopoverFiltrosIndicadoresTopo() {
  indFiltersPopover.hidden = true;
  btnAbrirFiltrosInd.classList.remove('is-active');
  btnAbrirFiltrosInd.setAttribute('aria-expanded', 'false');
  btnAbrirFiltrosInd.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosInd.dataset.iconNormal;
}

function alternarPopoverFiltrosIndicadoresTopo() {
  if (indFiltersPopover.hidden) {
    abrirPopoverFiltrosIndicadoresTopo();
  } else {
    fecharPopoverFiltrosIndicadoresTopo();
  }
}

// --- Popover de filtros da seção Indicadores — Coordenador ---

// Limpa os filtros do popover de Indicadores e re-renderiza a seção
function limparFiltrosIndicadoresTopoCoord() {
  Object.values(indSelectFiltersCoord).forEach((select) => (select.value = ''));
  filtrosIndicadoresTopoCoord.anos = [];
  filtrosIndicadoresTopoCoord.disciplinas = [];
  filtrosIndicadoresTopoCoord.coordenadores = [];
  filtrosIndicadoresTopoCoord.tiposAv = [];
  Object.values(indCheckboxGroupsCoord).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  indFilterBuscaCoord.value = '';
  renderizarIndicadoresCoordenador(indicadoresCoordenadorDadosBase);
}

// Copia o estado marcado dos checkboxes do popover para filtrosIndicadoresTopoCoord — chamado
// ao clicar "Aplicar filtros"
function aplicarCheckboxesIndicadoresTopoCoord() {
  filtrosIndicadoresTopoCoord.anos = lerGrupoCheckbox(indCheckboxGroupsCoord.ano);
  filtrosIndicadoresTopoCoord.disciplinas = lerGrupoCheckbox(indCheckboxGroupsCoord.disciplina);
  filtrosIndicadoresTopoCoord.coordenadores = lerGrupoCheckbox(indCheckboxGroupsCoord.coordenador);
  filtrosIndicadoresTopoCoord.tiposAv = lerGrupoCheckbox(indCheckboxGroupsCoord.tipoAv);
}

// Conta quantos filtros do popover de Indicadores estão ativos e atualiza o badge/destaque do botão
function atualizarIndicadorFiltrosIndicadoresTopoCoord() {
  const totalAtivos =
    Object.values(indSelectFiltersCoord).filter((select) => select.value !== '').length +
    filtrosIndicadoresTopoCoord.anos.length +
    filtrosIndicadoresTopoCoord.disciplinas.length +
    filtrosIndicadoresTopoCoord.coordenadores.length +
    filtrosIndicadoresTopoCoord.tiposAv.length +
    (safe(indFilterBuscaCoord.value) !== '' ? 1 : 0);

  indFilterBadgeCoord.hidden = totalAtivos === 0;
  indFilterBadgeCoord.textContent = totalAtivos;
  btnAbrirFiltrosIndCoord.classList.toggle('has-active-filters', totalAtivos > 0);
}

function abrirPopoverFiltrosIndicadoresTopoCoord() {
  indFiltersPopoverCoord.hidden = false;
  btnAbrirFiltrosIndCoord.classList.add('is-active');
  btnAbrirFiltrosIndCoord.setAttribute('aria-expanded', 'true');
  btnAbrirFiltrosIndCoord.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosIndCoord.dataset.iconAtivo;
}

function fecharPopoverFiltrosIndicadoresTopoCoord() {
  indFiltersPopoverCoord.hidden = true;
  btnAbrirFiltrosIndCoord.classList.remove('is-active');
  btnAbrirFiltrosIndCoord.setAttribute('aria-expanded', 'false');
  btnAbrirFiltrosIndCoord.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosIndCoord.dataset.iconNormal;
}

function alternarPopoverFiltrosIndicadoresTopoCoord() {
  if (indFiltersPopoverCoord.hidden) {
    abrirPopoverFiltrosIndicadoresTopoCoord();
  } else {
    fecharPopoverFiltrosIndicadoresTopoCoord();
  }
}

// --- Popover de filtros da seção Indicadores — Processo Editorial ---

// Limpa os filtros do popover de Indicadores e re-renderiza a seção
function limparFiltrosIndicadoresTopoPE() {
  Object.values(indSelectFiltersPE).forEach((select) => (select.value = ''));
  filtrosIndicadoresTopoPE.anos = [];
  filtrosIndicadoresTopoPE.tiposAv = [];
  filtrosIndicadoresTopoPE.status = [];
  Object.values(indCheckboxGroupsPE).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  indFilterBuscaPE.value = '';
  renderizarIndicadoresProcessoEditorial(indicadoresPEDadosBase);
}

// Copia o estado marcado dos checkboxes do popover para filtrosIndicadoresTopoPE — chamado ao
// clicar "Aplicar filtros"
function aplicarCheckboxesIndicadoresTopoPE() {
  filtrosIndicadoresTopoPE.anos = lerGrupoCheckbox(indCheckboxGroupsPE.ano);
  filtrosIndicadoresTopoPE.tiposAv = lerGrupoCheckbox(indCheckboxGroupsPE.tipoAv);
  filtrosIndicadoresTopoPE.status = lerGrupoCheckbox(indCheckboxGroupsPE.status);
}

// Conta quantos filtros do popover de Indicadores estão ativos e atualiza o badge/destaque do botão
function atualizarIndicadorFiltrosIndicadoresTopoPE() {
  const totalAtivos =
    Object.values(indSelectFiltersPE).filter((select) => select.value !== '').length +
    filtrosIndicadoresTopoPE.anos.length +
    filtrosIndicadoresTopoPE.tiposAv.length +
    filtrosIndicadoresTopoPE.status.length +
    (safe(indFilterBuscaPE.value) !== '' ? 1 : 0);

  indFilterBadgePE.hidden = totalAtivos === 0;
  indFilterBadgePE.textContent = totalAtivos;
  btnAbrirFiltrosIndPE.classList.toggle('has-active-filters', totalAtivos > 0);
}

function abrirPopoverFiltrosIndicadoresTopoPE() {
  indFiltersPopoverPE.hidden = false;
  btnAbrirFiltrosIndPE.classList.add('is-active');
  btnAbrirFiltrosIndPE.setAttribute('aria-expanded', 'true');
  btnAbrirFiltrosIndPE.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosIndPE.dataset.iconAtivo;
}

function fecharPopoverFiltrosIndicadoresTopoPE() {
  indFiltersPopoverPE.hidden = true;
  btnAbrirFiltrosIndPE.classList.remove('is-active');
  btnAbrirFiltrosIndPE.setAttribute('aria-expanded', 'false');
  btnAbrirFiltrosIndPE.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosIndPE.dataset.iconNormal;
}

function alternarPopoverFiltrosIndicadoresTopoPE() {
  if (indFiltersPopoverPE.hidden) {
    abrirPopoverFiltrosIndicadoresTopoPE();
  } else {
    fecharPopoverFiltrosIndicadoresTopoPE();
  }
}

// --- Popover de filtros da seção Processo Editorial ---

// Limpa os filtros do popover do Processo Editorial e re-renderiza a seção
function limparFiltrosProcessoEditorial() {
  Object.values(peSelectFilters).forEach((select) => (select.value = ''));
  filtrosProcessoEditorial.anos = [];
  filtrosProcessoEditorial.disciplinas = [];
  filtrosProcessoEditorial.tiposAv = [];
  filtrosProcessoEditorial.responsaveis = [];
  filtrosProcessoEditorial.statusEditorial = [];
  Object.values(peCheckboxGroups).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  peFilterBusca.value = '';
  renderizarProcessoEditorial();
}

// Copia o estado marcado dos checkboxes do popover para filtrosProcessoEditorial — chamado ao
// clicar "Aplicar filtros"
function aplicarCheckboxesProcessoEditorial() {
  filtrosProcessoEditorial.anos = lerGrupoCheckbox(peCheckboxGroups.ano);
  filtrosProcessoEditorial.disciplinas = lerGrupoCheckbox(peCheckboxGroups.disciplina);
  filtrosProcessoEditorial.tiposAv = lerGrupoCheckbox(peCheckboxGroups.tipoAv);
  filtrosProcessoEditorial.responsaveis = lerGrupoCheckbox(peCheckboxGroups.responsavel);
  filtrosProcessoEditorial.statusEditorial = lerGrupoCheckbox(peCheckboxGroups.statusEditorial);
}

// Conta quantos filtros do popover estão ativos e atualiza o badge/destaque do botão
function atualizarIndicadorFiltrosPE() {
  const totalAtivos =
    Object.values(peSelectFilters).filter((select) => select.value !== '').length +
    filtrosProcessoEditorial.anos.length +
    filtrosProcessoEditorial.disciplinas.length +
    filtrosProcessoEditorial.tiposAv.length +
    filtrosProcessoEditorial.responsaveis.length +
    filtrosProcessoEditorial.statusEditorial.length +
    (safe(peFilterBusca.value) !== '' ? 1 : 0);

  peFilterBadge.hidden = totalAtivos === 0;
  peFilterBadge.textContent = totalAtivos;
  btnAbrirFiltrosPE.classList.toggle('has-active-filters', totalAtivos > 0);
}

function abrirPopoverFiltrosProcessoEditorial() {
  peFiltersPopover.hidden = false;
  btnAbrirFiltrosPE.classList.add('is-active');
  btnAbrirFiltrosPE.setAttribute('aria-expanded', 'true');
  btnAbrirFiltrosPE.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosPE.dataset.iconAtivo;
}

function fecharPopoverFiltrosProcessoEditorial() {
  peFiltersPopover.hidden = true;
  btnAbrirFiltrosPE.classList.remove('is-active');
  btnAbrirFiltrosPE.setAttribute('aria-expanded', 'false');
  btnAbrirFiltrosPE.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosPE.dataset.iconNormal;
}

function alternarPopoverFiltrosProcessoEditorial() {
  if (peFiltersPopover.hidden) {
    abrirPopoverFiltrosProcessoEditorial();
  } else {
    fecharPopoverFiltrosProcessoEditorial();
  }
}

// --- Popover de filtros da seção Banco de Provas ---

// Limpa os filtros do popover do Banco de Provas e re-renderiza a seção
function limparFiltrosBancoProvas() {
  Object.values(bpSelectFilters).forEach((select) => (select.value = ''));
  filtrosBancoProvas.anos = [];
  filtrosBancoProvas.segmentos = [];
  filtrosBancoProvas.tiposAv = [];
  filtrosBancoProvas.disciplinas = [];
  Object.values(bpCheckboxGroups).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  bpFilterBusca.value = '';
  renderizarBancoProvas();
}

// Conta quantos filtros do popover estão ativos e atualiza o badge/destaque do botão
function atualizarIndicadorFiltrosBP() {
  const totalAtivos =
    Object.values(bpSelectFilters).filter((select) => select.value !== '').length +
    filtrosBancoProvas.anos.length +
    filtrosBancoProvas.segmentos.length +
    filtrosBancoProvas.tiposAv.length +
    filtrosBancoProvas.disciplinas.length +
    (safe(bpFilterBusca.value) !== '' ? 1 : 0);

  bpFilterBadge.hidden = totalAtivos === 0;
  bpFilterBadge.textContent = totalAtivos;
  btnAbrirFiltrosBP.classList.toggle('has-active-filters', totalAtivos > 0);
}

// Lê o estado atual de todos os grupos de checkboxes do painel avançado do Banco de Provas para
// filtrosBancoProvas e re-renderiza a seção — chamado a cada 'change' de qualquer checkbox do
// painel (a seção não tem botão "Aplicar filtros" próprio; sempre filtrou ao vivo, como os
// <select> que existiam antes)
function aplicarCheckboxesBancoProvas() {
  filtrosBancoProvas.anos = lerGrupoCheckbox(bpCheckboxGroups.ano);
  filtrosBancoProvas.segmentos = lerGrupoCheckbox(bpCheckboxGroups.segmento);
  filtrosBancoProvas.tiposAv = lerGrupoCheckbox(bpCheckboxGroups.tipoAv);
  filtrosBancoProvas.disciplinas = lerGrupoCheckbox(bpCheckboxGroups.disciplina);
  renderizarBancoProvas();
}

function abrirPopoverFiltrosBancoProvas() {
  bpFiltersPopover.hidden = false;
  btnAbrirFiltrosBP.classList.add('is-active');
  btnAbrirFiltrosBP.setAttribute('aria-expanded', 'true');
}

function fecharPopoverFiltrosBancoProvas() {
  bpFiltersPopover.hidden = true;
  btnAbrirFiltrosBP.classList.remove('is-active');
  btnAbrirFiltrosBP.setAttribute('aria-expanded', 'false');
}

function alternarPopoverFiltrosBancoProvas() {
  if (bpFiltersPopover.hidden) {
    abrirPopoverFiltrosBancoProvas();
  } else {
    fecharPopoverFiltrosBancoProvas();
  }
}

function alternarPopoverFiltrosElaborador() {
  if (elabFiltersPopover.hidden) {
    abrirPopoverFiltrosElaborador();
  } else {
    fecharPopoverFiltrosElaborador();
  }
}

// Retorna os registros da aba Elaborador já com filtros do popover, busca geral e filtro
// rápido do card aplicados — usada tanto pelo Acompanhamento quanto pelos Indicadores
function obterRegistrosFiltradosElaborador() {
  return aplicarFiltrosElaborador(filteredRecords).filter(passaFiltroRapidoElaborador);
}

// --- Navegação interna da aba Elaborador: Acompanhamento <-> Indicadores ---

function mostrarIndicadoresElaborador() {
  visaoElaborador = 'indicadores';
  viewElaboradorAcompanhamento.hidden = true;
  viewElaboradorIndicadores.hidden = false;
  btnIndicadores.classList.add('is-active');
  btnIndicadores.setAttribute('aria-pressed', 'true');
  // O botão "Indicadores" não faz sentido dentro da própria tela de indicadores
  btnIndicadores.hidden = true;

  // Na barra superior, o título "Painel de Avaliações SGGE" dá lugar ao botão
  // "← Voltar ao acompanhamento"; o botão de filtro passa a ser o dos Indicadores
  appHeaderTitles.hidden = true;
  btnVoltarAcompanhamento.hidden = false;
  fecharPopoverFiltrosElaborador();
  elabFilterPopoverWrapper.hidden = true;
  indFilterPopoverWrapper.hidden = false;
  indModuloRapidoWrapper.hidden = false;
  btnRelatorioElaborador.hidden = false;

  renderizarIndicadoresElaborador(obterRegistrosFiltradosElaborador());
}

function mostrarAcompanhamentoElaborador() {
  // Se chegou aqui pelo atalho "Indicador do Processo → Elaborador" (data-tab
  // "indicador-elaborador"), o Acompanhamento pertence à aba normal "Elaborador" (grupo
  // "Processo de Produção") — reencaminha por trocarAba para manter abaAtual e o destaque do
  // menu lateral coerentes com a tela exibida, em vez de só trocar a subvisão no lugar
  if (abaAtual === 'indicador-elaborador') {
    trocarAba('elaborador');
    return;
  }

  visaoElaborador = 'acompanhamento';
  viewElaboradorAcompanhamento.hidden = false;
  viewElaboradorIndicadores.hidden = true;
  btnIndicadores.classList.remove('is-active');
  btnIndicadores.setAttribute('aria-pressed', 'false');
  btnIndicadores.hidden = false;

  // Restaura o título da barra superior e o botão de filtro do Acompanhamento
  appHeaderTitles.hidden = false;
  btnVoltarAcompanhamento.hidden = true;
  fecharPopoverFiltrosIndicadoresTopo();
  indFilterPopoverWrapper.hidden = true;
  indModuloRapidoWrapper.hidden = true;
  btnRelatorioElaborador.hidden = true;
  elabFilterPopoverWrapper.hidden = false;
  renderizarVisaoElaborador();
}

// --- Cálculos da seção Indicadores (painel analítico de atrasos) ---

// Calcula o atraso (em dias corridos) da devolutiva de uma encomenda em relação ao prazo:
// - se há devolutiva: devolutiva - prazo (pode ser negativo, entregue adiantado);
// - se não há devolutiva e o prazo já venceu: hoje - prazo;
// - se não há devolutiva e o prazo ainda não venceu: 0.
// Retorna 0 quando não há prazo definido.
function calcularAtrasoEncomendaEmDias(record) {
  const prazo = parseBrDate(record.prazo_encomenda);
  if (!prazo) return 0;

  const devolutiva = parseBrDate(record.devolutiva_encomenda);
  if (devolutiva) {
    return Math.round((devolutiva.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diff = Math.round((hoje.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

// Retorna apenas as entregas REALIZADAS (devolutiva_encomenda preenchida) com atraso_dias > 0,
// isto é, devolutiva > prazo ("entregue fora do prazo") — pendências sem devolutiva não contam
// mais como atraso nesta seção
function obterDadosComAtraso(dados) {
  return dados.filter((r) => safe(r.devolutiva_encomenda) && calcularAtrasoEncomendaEmDias(r) > 0);
}

// Agrupa registros já filtrados por atraso (atraso_dias > 0) por um campo qualquer,
// somando o atraso e contando ocorrências; ordenado do maior para o menor total
function agruparAtrasosPorCampo(dadosComAtraso, campo) {
  const grupos = new Map();

  dadosComAtraso.forEach((record) => {
    const categoria = safe(record[campo]) || '(Não informado)';
    const atraso = calcularAtrasoEncomendaEmDias(record);
    if (!grupos.has(categoria)) {
      grupos.set(categoria, { categoria, totalAtrasoDias: 0, ocorrencias: 0 });
    }
    const grupo = grupos.get(categoria);
    grupo.totalAtrasoDias += atraso;
    grupo.ocorrencias += 1;
  });

  return Array.from(grupos.values())
    .map((grupo) => ({ ...grupo, mediaAtraso: grupo.totalAtrasoDias / grupo.ocorrencias }))
    .sort((a, b) => {
      if (b.mediaAtraso !== a.mediaAtraso) return b.mediaAtraso - a.mediaAtraso;
      if (b.ocorrencias !== a.ocorrencias) return b.ocorrencias - a.ocorrencias;
      return a.categoria.localeCompare(b.categoria, 'pt-BR');
    });
}

function agruparAtrasosPorElaborador(dadosComAtraso) {
  return agruparAtrasosPorCampo(dadosComAtraso, 'elaborador');
}

function agruparAtrasosPorDisciplina(dadosComAtraso) {
  return agruparAtrasosPorCampo(dadosComAtraso, 'frente');
}

// Agrupa registros com atraso por disciplina-base (nome normalizado do campo frente, consolidando
// variações como "Química 1"/"Química 2" em "Química"), somando o atraso e contando ocorrências.
// Usado apenas pelo gráfico "Disciplinas que mais atrasam".
function agruparAtrasosPorDisciplinaNormalizada(dadosComAtraso) {
  const grupos = new Map();

  dadosComAtraso.forEach((record) => {
    const categoria = normalizarNomeDisciplina(safe(record.frente));
    const atraso = calcularAtrasoEncomendaEmDias(record);
    if (!grupos.has(categoria)) {
      grupos.set(categoria, { categoria, totalAtrasoDias: 0, ocorrencias: 0 });
    }
    const grupo = grupos.get(categoria);
    grupo.totalAtrasoDias += atraso;
    grupo.ocorrencias += 1;
  });

  return Array.from(grupos.values())
    .map((grupo) => ({ ...grupo, mediaAtraso: grupo.totalAtrasoDias / grupo.ocorrencias }))
    .sort((a, b) => {
      if (b.mediaAtraso !== a.mediaAtraso) return b.mediaAtraso - a.mediaAtraso;
      if (b.ocorrencias !== a.ocorrencias) return b.ocorrencias - a.ocorrencias;
      return a.categoria.localeCompare(b.categoria, 'pt-BR');
    });
}

function agruparAtrasosPorAno(dadosComAtraso) {
  return agruparAtrasosPorCampo(dadosComAtraso, 'ano');
}

// --- Gráfico "Taxa de atraso por segmento" (Ensino Fundamental x Ensino Médio) ---

// Extrai o número do "ano" de um registro, tolerando variações de grafia como
// "1", "1º", "1ª série", "1ª Série EM", "6º Ano" etc.
function normalizarAnoSegmento(ano) {
  const texto = safe(ano);
  const match = texto.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

// Classifica o "ano" de um registro em "Ensino Fundamental" (6º a 9º) ou "Ensino Médio"
// (1º a 3º). Retorna null quando o valor não corresponde a nenhum dos dois segmentos.
function identificarSegmentoPorAno(ano) {
  const numero = normalizarAnoSegmento(ano);
  if (numero === null) return null;
  if (numero >= 6 && numero <= 9) return 'Ensino Fundamental';
  if (numero >= 1 && numero <= 3) return 'Ensino Médio';
  return null;
}

// --- Helpers compartilhados pelos popovers de filtro multi-seleção (checkboxes) ---
// Usados por todos os popovers "elab-filters-popover"/"banco-filtros-avancados" convertidos de
// <select> único para grupos de checkboxes: cada campo do estado agora guarda um array de
// valores marcados em vez de um valor único; array vazio = sem restrição (equivalente ao antigo
// value === '').

// "OR dentro do campo, AND entre campos": true se nenhum valor estiver selecionado (sem
// restrição) ou se o valor do registro estiver entre os selecionados
function passaFiltroMultiplo(valor, selecionados) {
  if (!selecionados || selecionados.length === 0) return true;
  return selecionados.includes(valor);
}

// Mesma regra acima, específica para o campo "Segmento" (Ensino Fundamental/Ensino Médio,
// derivado do ano via identificarSegmentoPorAno) — se ambos ou nenhum estiverem marcados, não
// restringe (equivalente a nenhum marcado)
function pertenceAoSegmento(ano, segmentosSelecionados) {
  if (!segmentosSelecionados || segmentosSelecionados.length === 0) return true;
  return segmentosSelecionados.includes(identificarSegmentoPorAno(ano));
}

// Renderiza um grupo de checkboxes dentro de containerEl a partir de uma lista de opções
// [{ value, label }], marcando os que estiverem em valoresSelecionados (array de strings). Não
// dispara nenhum filtro sozinho — a leitura só acontece no clique de "Aplicar filtros"
// (lerGrupoCheckbox), então marcar/desmarcar aqui não re-renderiza a seção.
function renderizarGrupoCheckbox(containerEl, opcoes, valoresSelecionados) {
  if (!containerEl) return;
  const selecionados = valoresSelecionados || [];
  containerEl.innerHTML = '';
  if (opcoes.length === 0) {
    const vazio = document.createElement('span');
    vazio.className = 'elab-filter-checkbox-empty';
    vazio.textContent = 'Nenhuma opção disponível';
    containerEl.appendChild(vazio);
    return;
  }
  opcoes.forEach((opcao) => {
    const label = document.createElement('label');
    label.className = 'elab-filter-checkbox-item';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = opcao.value;
    input.checked = selecionados.includes(opcao.value);
    const span = document.createElement('span');
    span.textContent = opcao.label;
    label.appendChild(input);
    label.appendChild(span);
    containerEl.appendChild(label);
  });
  atualizarLabelMultiSelect(containerEl);
}

// Atualiza o texto do trigger compacto ("Todos" / valor único / "N selecionados") de um
// .multi-select a partir dos checkboxes atualmente marcados dentro de containerEl
function atualizarLabelMultiSelect(containerEl) {
  const wrapper = containerEl.closest('.multi-select');
  if (!wrapper) return;
  const labelEl = wrapper.querySelector('.multi-select-label');
  if (!labelEl) return;

  const checked = Array.from(containerEl.querySelectorAll('input[type="checkbox"]:checked'));
  if (checked.length === 0) {
    labelEl.textContent = 'Todos';
  } else if (checked.length === 1) {
    const item = checked[0].closest('.elab-filter-checkbox-item');
    labelEl.textContent = item ? item.querySelector('span').textContent : checked[0].value;
  } else {
    labelEl.textContent = `${checked.length} selecionados`;
  }
}

// Envolve todo .elab-filter-checkbox-group já presente no DOM em um dropdown compacto
// (.multi-select): campo fechado por padrão mostrando "Todos"/"N selecionados", abre a lista de
// checkboxes só ao clicar no trigger, fecha ao clicar fora. Chamado uma única vez no carregamento
// — os próprios containerEl (ainda vazios nesse momento) são movidos para dentro do wrapper, então
// populações posteriores via renderizarGrupoCheckbox continuam funcionando normalmente.
function inicializarMultiSelects() {
  document.querySelectorAll('.elab-filter-checkbox-group').forEach((containerEl) => {
    if (containerEl.closest('.multi-select')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'multi-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'multi-select-trigger';
    trigger.innerHTML = '<span class="multi-select-label">Todos</span><span class="multi-select-arrow">&#9662;</span>';

    const menu = document.createElement('div');
    menu.className = 'multi-select-menu';
    menu.addEventListener('click', (event) => event.stopPropagation());

    const acoes = document.createElement('div');
    acoes.className = 'multi-select-actions';

    const btnTodos = document.createElement('button');
    btnTodos.type = 'button';
    btnTodos.className = 'multi-select-action-link';
    btnTodos.textContent = 'Selecionar todos';
    btnTodos.addEventListener('click', () => {
      containerEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = true;
      });
      atualizarLabelMultiSelect(containerEl);
    });

    const btnLimpar = document.createElement('button');
    btnLimpar.type = 'button';
    btnLimpar.className = 'multi-select-action-link';
    btnLimpar.textContent = 'Limpar seleção';
    btnLimpar.addEventListener('click', () => {
      containerEl.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = false;
      });
      atualizarLabelMultiSelect(containerEl);
    });

    acoes.appendChild(btnTodos);
    acoes.appendChild(btnLimpar);

    containerEl.parentNode.insertBefore(wrapper, containerEl);
    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    menu.appendChild(acoes);
    menu.appendChild(containerEl);

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const estavaAberto = wrapper.classList.contains('open');
      document.querySelectorAll('.multi-select.open').forEach((el) => el.classList.remove('open'));
      if (!estavaAberto) wrapper.classList.add('open');
    });

    containerEl.addEventListener('change', (event) => {
      if (event.target.matches('input[type="checkbox"]')) {
        atualizarLabelMultiSelect(containerEl);
      }
    });
  });
}

document.addEventListener('click', () => {
  document.querySelectorAll('.multi-select.open').forEach((el) => el.classList.remove('open'));
});

inicializarMultiSelects();

// Lê os valores atualmente marcados de um grupo de checkboxes (usado ao clicar "Aplicar filtros")
function lerGrupoCheckbox(containerEl) {
  if (!containerEl) return [];
  return Array.from(containerEl.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value);
}

// Desmarca todos os checkboxes de um grupo (usado em "Limpar filtros")
function desmarcarGrupoCheckbox(containerEl) {
  if (!containerEl) return;
  containerEl.querySelectorAll('input[type="checkbox"]').forEach((el) => (el.checked = false));
  atualizarLabelMultiSelect(containerEl);
}

// Popula um grupo de checkboxes a partir de um campo cru do registro — mesmo comportamento de
// populateSelectOptions (valores únicos em ordem alfabética, value === label) — usado pelos
// campos que antes populavam um <select> assim dentro de um popover de filtro
function populateCheckboxGroupField(containerEl, records, field, estadoSelecionado) {
  const valoresUnicos = Array.from(
    new Set(records.map((r) => safe(r[field])).filter((v) => v !== ''))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const opcoes = valoresUnicos.map((valor) => ({ value: valor, label: valor }));
  renderizarGrupoCheckbox(containerEl, opcoes, estadoSelecionado);
}

// Popula um grupo de checkboxes "Tipo de AV"/"Avaliação" na ordem fixa AV1 → AV2 → 2º CHAMADA →
// REC-SEM → REC-FIM (nunca alfabética) — value continua o valor bruto do registro, mesmo padrão
// já usado em populateBPTipoAvOptions/populateGPATipoAvOptions
function populateCheckboxGroupTipoAv(containerEl, records, estadoSelecionado, field = 'tipo_av') {
  const valoresUnicos = Array.from(new Set(records.map((r) => safe(r[field])).filter(Boolean)));
  const ordenados = valoresUnicos.sort((a, b) => {
    const posA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(a));
    const posB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(b));
    const posicaoA = posA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posA;
    const posicaoB = posB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posB;
    return posicaoA - posicaoB;
  });
  const opcoes = ordenados.map((valor) => ({ value: valor, label: valor }));
  renderizarGrupoCheckbox(containerEl, opcoes, estadoSelecionado);
}

// Calcula a distribuição percentual de Ensino Fundamental x Ensino Médio sobre as encomendas
// com atraso (atraso > 0) do recorte filtrado atual da seção Indicadores — Elaborador — ou
// seja, responde "dos atrasos existentes, quantos são de cada segmento", não a distribuição
// geral de todos os registros
function calcularDistribuicaoAtrasoPorSegmento(dados) {
  let fundamental = 0;
  let medio = 0;

  obterDadosComAtraso(dados).forEach((record) => {
    const segmento = identificarSegmentoPorAno(record.ano);
    if (segmento === 'Ensino Fundamental') fundamental += 1;
    else if (segmento === 'Ensino Médio') medio += 1;
  });

  const total = fundamental + medio;

  return {
    fundamental,
    medio,
    total,
    pctFundamental: total ? (fundamental / total) * 100 : 0,
    pctMedio: total ? (medio / total) * 100 : 0
  };
}

// Agrupa registros com atraso por tipo de avaliação normalizado (AV1, AV2, 2º CHAMADA,
// REC-SEM, REC-FIM, consolidando as variações de grafia), somando o atraso e contando
// ocorrências. Usado apenas pelo gráfico "Avaliações que mais atrasam".
// Ordem fixa (pedagógica) de exibição do gráfico "Avaliações que mais atrasam": não varia
// conforme o valor da média. O rótulo exibido difere da chave de agrupamento (que continua
// usando normalizarTipoAvPerformance, para não quebrar o filtro por clique já existente).
const ORDEM_FIXA_TIPO_AV = ['AV1', 'AV2', '2º CHAMADA', 'REC-SEM', 'REC-FIM'];
const ROTULOS_TIPO_AV_GRAFICO = {
  'AV1': 'AV1',
  'AV2': 'AV2',
  '2º CHAMADA': '2º CHAM',
  'REC-SEM': 'REC-SEM',
  'REC-FIM': 'REC-FIM'
};

function agruparAtrasosPorTipoAv(dadosComAtraso) {
  const grupos = new Map();

  dadosComAtraso.forEach((record) => {
    const categoria = normalizarTipoAvPerformance(record.tipo_av);
    const atraso = calcularAtrasoEncomendaEmDias(record);
    if (!grupos.has(categoria)) {
      grupos.set(categoria, { categoria, totalAtrasoDias: 0, ocorrencias: 0 });
    }
    const grupo = grupos.get(categoria);
    grupo.totalAtrasoDias += atraso;
    grupo.ocorrencias += 1;
  });

  // Garante que as 5 avaliações fixas sempre apareçam, mesmo sem nenhuma ocorrência atrasada
  ORDEM_FIXA_TIPO_AV.forEach((categoria) => {
    if (!grupos.has(categoria)) {
      grupos.set(categoria, { categoria, totalAtrasoDias: 0, ocorrencias: 0 });
    }
  });

  const calculados = Array.from(grupos.values()).map((grupo) => ({
    ...grupo,
    mediaAtraso: grupo.ocorrencias ? grupo.totalAtrasoDias / grupo.ocorrencias : 0,
    rotulo: ROTULOS_TIPO_AV_GRAFICO[grupo.categoria] || grupo.categoria
  }));

  const fixos = ORDEM_FIXA_TIPO_AV.map((categoria) => calculados.find((g) => g.categoria === categoria));
  const extras = calculados
    .filter((g) => !ORDEM_FIXA_TIPO_AV.includes(g.categoria))
    .sort((a, b) => {
      if (b.mediaAtraso !== a.mediaAtraso) return b.mediaAtraso - a.mediaAtraso;
      return b.ocorrencias - a.ocorrencias;
    });

  return [...fixos, ...extras];
}

// Encontra o elaborador que mais atrasa para o card "Maior impacto em atraso": deve ser
// sempre o mesmo nome exibido em 1º lugar no gráfico "Ranking de elaboradores que mais
// atrasam", que já vem ordenado por maior média de atraso (empate: mais ocorrências, depois
// ordem alfabética) — por isso reaproveita a mesma lista (porElaborador), já ordenada, em
// vez de reordenar por outro critério.
function encontrarElaboradorQueMaisAtrasa(agrupadoPorElaborador) {
  if (agrupadoPorElaborador.length === 0) return null;
  return agrupadoPorElaborador[0];
}

// Formata um número de dias com uma casa decimal e vírgula, no padrão pt-BR (ex.: "8,4 dias")
function formatarDiasComVirgula(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Formata a média de atraso dos gráficos da seção Indicadores — Elaborador: 1 casa decimal
// somente quando houver decimal, sem casas quando o valor for inteiro (ex.: "19,7" / "19")
function formatarMediaAtrasoGrafico(valor) {
  const arredondado = Math.round(valor * 10) / 10;
  const casas = Number.isInteger(arredondado) ? 0 : 1;
  return arredondado.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// Formata um percentual com uma casa decimal e vírgula, no padrão pt-BR (ex.: "11,3")
function formatarPercentualComVirgula(valor) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Classifica o risco de um elaborador conforme taxa de atraso e dias acumulados de atraso
function classificarRiscoElaborador(taxaPct, mediaAtraso) {
  if (taxaPct >= 30 || mediaAtraso >= 15) return 'Crítico';
  if (taxaPct >= 15 || mediaAtraso >= 7) return 'Atenção';
  return 'Controlado';
}

// Consolida o resumo de atrasos do recorte filtrado: base de todos os cards executivos,
// do diagnóstico automático e das ações recomendadas
// Seção Indicadores/Relatório do Elaborador: considera apenas entregas REALIZADAS (com
// devolutiva_encomenda preenchida) — pendências sem devolutiva não entram mais em nenhum dos
// indicadores principais (cards, gráficos, ranking, relatório). "total" aqui já é o total de
// entregas realizadas do recorte, base de todos os percentuais.
function calcularResumoAtrasos(dados) {
  const entregasRealizadas = dados.filter((r) => safe(r.devolutiva_encomenda));
  const total = entregasRealizadas.length;

  const comAtraso = obterDadosComAtraso(entregasRealizadas);
  const qtdComAtraso = comAtraso.length;
  const somaTotalAtrasoDias = comAtraso.reduce((soma, r) => soma + calcularAtrasoEncomendaEmDias(r), 0);
  const mediaAtraso = qtdComAtraso ? somaTotalAtrasoDias / qtdComAtraso : 0;
  const maiorAtraso = qtdComAtraso ? Math.max(...comAtraso.map((r) => calcularAtrasoEncomendaEmDias(r))) : 0;
  // Registro responsável pelo maior atraso individual (o primeiro encontrado em caso de empate),
  // usado para exibir o elaborador no subtítulo do card "Maior atraso individual"
  const registroMaiorAtraso = qtdComAtraso
    ? comAtraso.find((r) => calcularAtrasoEncomendaEmDias(r) === maiorAtraso)
    : null;
  const taxaAtrasoPct = total ? (qtdComAtraso / total) * 100 : 0;

  const entreguesNoPrazoQtd = entregasRealizadas.filter((r) => foiEntregueNoPrazo(r)).length;
  const entreguesForaPrazoQtd = qtdComAtraso;

  const porElaborador = agruparAtrasosPorCampo(comAtraso, 'elaborador');
  const topElaborador = encontrarElaboradorQueMaisAtrasa(porElaborador);

  return {
    total,
    entregasRealizadas,
    comAtraso,
    qtdComAtraso,
    somaTotalAtrasoDias,
    mediaAtraso,
    maiorAtraso,
    registroMaiorAtraso,
    taxaAtrasoPct,
    entreguesNoPrazoQtd,
    entreguesNoPrazoPct: total ? (entreguesNoPrazoQtd / total) * 100 : 0,
    entreguesForaPrazoQtd,
    porElaborador,
    topElaborador
  };
}

// Tabela "Recorrência de atraso por elaborador": para cada elaborador (considerando TODAS as
// suas encomendas no recorte, não só as atrasadas), calcula taxa, média de atraso, maior atraso
// individual e a classificação de risco; ordenada pela maior Taxa de atraso (desempate: qtd
// atrasadas > média de atraso > maior atraso individual > ordem alfabética)
function calcularRecorrenciaPorElaborador(dados) {
  const grupos = agruparPorCampo(dados, 'elaborador');
  const linhas = [];

  grupos.forEach((registros, nome) => {
    // "Total"/"Taxa" consideram apenas entregas realizadas (devolutiva preenchida) — pendências
    // sem devolutiva não entram mais nesta tabela
    const entregasRealizadas = registros.filter((r) => safe(r.devolutiva_encomenda));
    const comAtraso = obterDadosComAtraso(entregasRealizadas);
    const total = entregasRealizadas.length;
    const qtdComAtraso = comAtraso.length;
    const diasAcumulados = comAtraso.reduce((soma, r) => soma + calcularAtrasoEncomendaEmDias(r), 0);
    const mediaAtraso = qtdComAtraso ? diasAcumulados / qtdComAtraso : 0;
    const maiorIndividual = qtdComAtraso
      ? Math.max(...comAtraso.map((r) => calcularAtrasoEncomendaEmDias(r)))
      : 0;
    const taxa = total ? (qtdComAtraso / total) * 100 : 0;

    linhas.push({
      elaborador: nome,
      total,
      qtdComAtraso,
      taxa,
      diasAcumulados,
      mediaAtraso,
      maiorIndividual,
      classificacao: classificarRiscoElaborador(taxa, mediaAtraso)
    });
  });

  return linhas.sort((a, b) => {
    if (b.taxa !== a.taxa) return b.taxa - a.taxa;
    if (b.qtdComAtraso !== a.qtdComAtraso) return b.qtdComAtraso - a.qtdComAtraso;
    if (b.mediaAtraso !== a.mediaAtraso) return b.mediaAtraso - a.mediaAtraso;
    if (b.maiorIndividual !== a.maiorIndividual) return b.maiorIndividual - a.maiorIndividual;
    return a.elaborador.localeCompare(b.elaborador, 'pt-BR');
  });
}

// Normaliza o nome de uma disciplina para fins de agrupamento analítico, removendo sufixos
// numéricos de variação (" 1", " 2", "(1)", "-1"...) para consolidar em uma única disciplina-base.
// Usado apenas no "Resumo por disciplina" — não altera a coluna Disciplina da tabela operacional.
function normalizarNomeDisciplina(nome) {
  if (!nome) return 'Não informado';

  let texto = String(nome).trim();
  texto = texto.replace(/\s*[|｜]+\s*$/, '').trim(); // remove separador final "|" comum na base
  texto = texto.replace(/\s+\d+$/, ''); // remove sufixos como " 1", " 2"
  texto = texto.replace(/\s*\(\d+\)$/, ''); // remove sufixos como "(1)", "(2)"
  texto = texto.replace(/\s*-\s*\d+$/, ''); // remove sufixos como "- 1", "-1"
  texto = texto.replace(/_\d+$/, ''); // remove sufixos como "_1"

  return texto.trim() || 'Não informado';
}

// Agrupa registros pela disciplina normalizada (nome-base), retornando um Map: nome -> registros
function agruparPorDisciplinaNormalizada(dados) {
  const grupos = new Map();

  dados.forEach((record) => {
    const chave = normalizarNomeDisciplina(safe(record.frente));
    if (!grupos.has(chave)) {
      grupos.set(chave, []);
    }
    grupos.get(chave).push(record);
  });

  return grupos;
}

// Tabela "Resumo por disciplina": para cada disciplina-base (nome normalizado do campo frente),
// calcula entregas no prazo/fora do prazo, pendências vencidas, média de atraso e taxa de atraso,
// consolidando variações como "Matemática", "Matemática 1", "Matemática 2"
function calcularResumoPorDisciplina(dados) {
  const grupos = agruparPorDisciplinaNormalizada(dados);
  const linhas = [];

  grupos.forEach((registros, nome) => {
    // Métricas principais (total/entregues/taxa/média) consideram só entregas realizadas
    // (devolutiva preenchida) — pendências vencidas seguem exibidas à parte, como status
    // auxiliar, sem entrar no total nem na taxa de atraso
    const entregasRealizadas = registros.filter((r) => safe(r.devolutiva_encomenda));
    const comAtraso = obterDadosComAtraso(entregasRealizadas);
    const total = entregasRealizadas.length;
    const entreguesNoPrazo = entregasRealizadas.filter((r) => foiEntregueNoPrazo(r)).length;
    const entreguesForaPrazo = comAtraso.length;
    const pendenciasVencidas = registros.filter(
      (r) => !safe(r.devolutiva_encomenda) && calcularAtrasoEncomendaEmDias(r) > 0
    ).length;
    const diasAcumulados = comAtraso.reduce((soma, r) => soma + calcularAtrasoEncomendaEmDias(r), 0);
    const mediaAtraso = comAtraso.length ? diasAcumulados / comAtraso.length : 0;
    const taxa = total ? (comAtraso.length / total) * 100 : 0;

    linhas.push({
      disciplina: nome,
      total,
      entreguesNoPrazo,
      entreguesForaPrazo,
      pendenciasVencidas,
      diasAcumulados,
      mediaAtraso,
      qtdComAtraso: comAtraso.length,
      taxa
    });
  });

  return linhas.sort((a, b) => {
    if (b.mediaAtraso !== a.mediaAtraso) return b.mediaAtraso - a.mediaAtraso;
    if (b.taxa !== a.taxa) return b.taxa - a.taxa;
    return b.pendenciasVencidas - a.pendenciasVencidas;
  });
}

// Renderiza os 6 cards executivos a partir do resumo consolidado de atrasos
function renderizarCardsExecutivos(resumo) {
  document.getElementById('indMediaAtraso').textContent = resumo.qtdComAtraso
    ? `${formatarDiasComVirgula(resumo.mediaAtraso)} dias`
    : '0 dias';
  document.getElementById('indMaiorAtraso').textContent = `${resumo.maiorAtraso} dias`;
  document.getElementById('indMaiorAtrasoSub').textContent = resumo.registroMaiorAtraso
    ? safe(resumo.registroMaiorAtraso.elaborador) || 'Não informado'
    : 'Sem atrasos no recorte';

  const nomeEl = document.getElementById('indElaboradorMaisAtrasa');
  const subEl = document.getElementById('indElaboradorMaisAtrasaSub');
  if (resumo.topElaborador) {
    nomeEl.textContent = resumo.topElaborador.categoria;
    subEl.textContent =
      `${formatarMediaAtrasoGrafico(resumo.topElaborador.mediaAtraso)} dias médios · ` +
      `${resumo.topElaborador.ocorrencias} ocorrência(s)`;
  } else {
    nomeEl.textContent = 'Sem atrasos';
    subEl.textContent = '';
  }

  document.getElementById('indTaxaAtraso').textContent =
    `${resumo.qtdComAtraso} (${formatarPercentualComVirgula(resumo.taxaAtrasoPct)}%)`;
  const cardTaxa = document.getElementById('indCardTaxaAtraso');
  cardTaxa.classList.remove('indicadores-resumo-card--taxa-critica', 'indicadores-resumo-card--taxa-atencao');
  if (resumo.taxaAtrasoPct > 20) {
    cardTaxa.classList.add('indicadores-resumo-card--taxa-critica');
  } else if (resumo.taxaAtrasoPct >= 10) {
    cardTaxa.classList.add('indicadores-resumo-card--taxa-atencao');
  }

  document.getElementById('indEntreguesPrazo').textContent =
    `${resumo.entreguesNoPrazoQtd} (${formatarPercentualComVirgula(resumo.entreguesNoPrazoPct)}%)`;
}


// Renderiza um gráfico de barras horizontais (ranking): rótulo à esquerda, barra proporcional
// ao maior valor do grupo e valor (dias + ocorrências) à direita
function renderizarGraficoBarrasHorizontal(containerId, grupos, opcoes = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.classList.remove('indicadores-chart--scroll');

  if (grupos.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'indicadores-chart-empty';
    vazio.textContent = 'Não há atrasos no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  const semLimite = opcoes.semLimite === true;
  const limite = opcoes.limite || 8;
  const campoFiltro = opcoes.campoFiltro || null;
  const limitados = semLimite ? grupos : grupos.slice(0, limite);
  if (semLimite && limitados.length > limite) {
    container.classList.add('indicadores-chart--scroll');
  }
  const maiorValor = Math.max(...limitados.map((grupo) => grupo.mediaAtraso));
  const filtroAtivo = campoFiltro ? filtrosIndicadores[campoFiltro] : null;

  limitados.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    row.title =
      `${grupo.rotulo || grupo.categoria}\n` +
      `Média de atraso: ${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias\n` +
      `Ocorrências: ${grupo.ocorrencias}\n` +
      `Dias acumulados: ${grupo.totalAtrasoDias}`;

    const label = document.createElement('span');
    label.className = 'chart-bar-label';
    label.textContent = grupo.rotulo || grupo.categoria;

    const track = document.createElement('div');
    track.className = 'chart-bar-track';
    const fill = document.createElement('div');
    fill.className = 'chart-bar-fill';
    fill.style.width = `${maiorValor ? (grupo.mediaAtraso / maiorValor) * 100 : 0}%`;
    track.appendChild(fill);

    const value = document.createElement('span');
    value.className = 'chart-bar-value';
    value.textContent = `${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias médios · ${grupo.ocorrencias} ocorr.`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);

    if (campoFiltro) {
      row.classList.add('chart-bar-row--clicavel');
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      const selecionada = filtroAtivo === grupo.categoria;
      row.classList.toggle('chart-bar-row--ativa', selecionada);
      row.classList.toggle('chart-bar-row--esmaecida', filtroAtivo !== null && !selecionada);
      row.addEventListener('click', () => alternarFiltroIndicador(campoFiltro, grupo.categoria));
      row.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          alternarFiltroIndicador(campoFiltro, grupo.categoria);
        }
      });
    }

    container.appendChild(row);
  });
}

// Renderiza o gráfico "Avaliações que mais atrasam" em blocos empilhados (nome + valor em
// cima, barra logo abaixo, ocorrências como detalhe abaixo da barra) — layout próprio desse
// gráfico, mantendo a mesma métrica (média de atraso) e a ordem fixa já definida em
// agruparAtrasosPorTipoAv. Não reaproveita renderizarGraficoBarrasHorizontal para não afetar
// os demais gráficos (Ranking, Disciplinas, Anos), que continuam com o layout de linha única.
function renderizarGraficoTipoAvBlocos(containerId, grupos, opcoes = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  container.classList.add('tipoav-lista');

  const campoFiltro = opcoes.campoFiltro || null;
  const filtroAtivo = campoFiltro ? filtrosIndicadores[campoFiltro] : null;
  const maiorValor = Math.max(...grupos.map((grupo) => grupo.mediaAtraso));

  grupos.forEach((grupo) => {
    const item = document.createElement('div');
    item.className = 'tipoav-item';
    item.title =
      `${grupo.rotulo || grupo.categoria}\n` +
      `Média de atraso: ${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias\n` +
      `Ocorrências: ${grupo.ocorrencias}\n` +
      `Dias acumulados: ${grupo.totalAtrasoDias}`;

    const topo = document.createElement('div');
    topo.className = 'tipoav-item-topo';

    const nome = document.createElement('span');
    nome.className = 'tipoav-item-nome';
    nome.textContent = grupo.rotulo || grupo.categoria;

    const valor = document.createElement('span');
    valor.className = 'tipoav-item-valor';
    valor.textContent = `${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias médios`;

    topo.appendChild(nome);
    topo.appendChild(valor);

    const track = document.createElement('div');
    track.className = 'tipoav-item-track';
    const fill = document.createElement('div');
    fill.className = 'tipoav-item-fill';
    fill.style.width = `${maiorValor ? (grupo.mediaAtraso / maiorValor) * 100 : 0}%`;
    track.appendChild(fill);

    const detalhe = document.createElement('div');
    detalhe.className = 'tipoav-item-detalhe';
    detalhe.textContent = `${grupo.ocorrencias} ocorr.`;

    item.appendChild(topo);
    item.appendChild(track);
    item.appendChild(detalhe);

    if (campoFiltro) {
      item.classList.add('tipoav-item--clicavel');
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      const selecionada = filtroAtivo === grupo.categoria;
      item.classList.toggle('tipoav-item--ativa', selecionada);
      item.classList.toggle('tipoav-item--esmaecida', filtroAtivo !== null && !selecionada);
      item.addEventListener('click', () => alternarFiltroIndicador(campoFiltro, grupo.categoria));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          alternarFiltroIndicador(campoFiltro, grupo.categoria);
        }
      });
    }

    container.appendChild(item);
  });
}

// Renderiza um gráfico de colunas verticais (usado para "Ano que mais atrasa")
function renderizarGraficoColunas(containerId, grupos, opcoes = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (grupos.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'indicadores-chart-empty';
    vazio.textContent = 'Não há atrasos no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  const campoFiltro = opcoes.campoFiltro || null;
  const filtroAtivo = campoFiltro ? filtrosIndicadores[campoFiltro] : null;
  const maiorValor = Math.max(...grupos.map((grupo) => grupo.mediaAtraso));
  const wrap = document.createElement('div');
  wrap.className = 'chart-col-wrap';

  grupos.forEach((grupo) => {
    const col = document.createElement('div');
    col.className = 'chart-col';
    col.title =
      `${grupo.categoria}\n` +
      `Média de atraso: ${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias\n` +
      `Ocorrências: ${grupo.ocorrencias}\n` +
      `Dias acumulados: ${grupo.totalAtrasoDias}`;

    const valor = document.createElement('span');
    valor.className = 'chart-col-value';
    valor.textContent = formatarMediaAtrasoGrafico(grupo.mediaAtraso);

    const track = document.createElement('div');
    track.className = 'chart-col-track';
    const bar = document.createElement('div');
    bar.className = 'chart-col-bar';
    bar.style.height = `${maiorValor ? (grupo.mediaAtraso / maiorValor) * 100 : 0}%`;
    track.appendChild(bar);

    const label = document.createElement('span');
    label.className = 'chart-col-label';
    label.textContent = grupo.categoria;

    col.appendChild(valor);
    col.appendChild(track);
    col.appendChild(label);

    if (campoFiltro) {
      col.classList.add('chart-col--clicavel');
      col.setAttribute('role', 'button');
      col.setAttribute('tabindex', '0');
      const selecionada = filtroAtivo === grupo.categoria;
      col.classList.toggle('chart-col--ativa', selecionada);
      col.classList.toggle('chart-col--esmaecida', filtroAtivo !== null && !selecionada);
      col.addEventListener('click', () => alternarFiltroIndicador(campoFiltro, grupo.categoria));
      col.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          alternarFiltroIndicador(campoFiltro, grupo.categoria);
        }
      });
    }

    wrap.appendChild(col);
  });

  container.appendChild(wrap);
}

// Liga/desliga o filtro por segmento (Ensino Fundamental/Médio) do gráfico "Taxa de atraso
// por segmento": primeiro clique filtra, clicar de novo no mesmo segmento desfaz
function alternarFiltroSegmentoIndicadoresElaborador(segmento) {
  alternarFiltroIndicador('segmento', segmento);
}

// Monta o texto do tooltip (nome do segmento + quantidade + percentual) exibido ao passar
// o mouse sobre a fatia do donut ou o item da legenda
function montarTooltipSegmento(nomeSegmento, quantidade, percentual) {
  return `${nomeSegmento}\n${quantidade} atrasos\n${formatarPercentualComVirgula(percentual)}% dos atrasos`;
}

// Renderiza o gráfico de rosca (donut) "Taxa de atraso por segmento" (Ensino Fundamental x
// Ensino Médio), com legenda, tooltip e clique para filtrar, a partir do resultado de
// calcularDistribuicaoAtrasoPorSegmento
function renderizarGraficoTaxaAtrasoPorSegmento(containerId, distribuicao) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (distribuicao.total === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'indicadores-chart-empty';
    vazio.textContent = 'Sem atrasos no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  const tamanho = 140;
  const raio = 52;
  const espessura = 20;
  const centro = tamanho / 2;
  const circunferencia = 2 * Math.PI * raio;
  const filtroAtivo = filtrosIndicadores.segmento;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${tamanho} ${tamanho}`);
  svg.setAttribute('class', 'segmento-donut-svg');

  const trilho = document.createElementNS(svgNS, 'circle');
  trilho.setAttribute('cx', centro);
  trilho.setAttribute('cy', centro);
  trilho.setAttribute('r', raio);
  trilho.setAttribute('fill', 'none');
  trilho.setAttribute('class', 'segmento-donut-trilho');
  trilho.setAttribute('stroke-width', espessura);
  svg.appendChild(trilho);

  // Cria uma fatia clicável (fundamental ou médio), com tooltip nativo (<title>), realce do
  // segmento ativo e esmaecimento do segmento não selecionado quando há filtro ativo
  function criarFatia(nomeSegmento, tamanhoFatia, offset, classeModificadora, quantidade, percentual) {
    const fatia = document.createElementNS(svgNS, 'circle');
    fatia.setAttribute('cx', centro);
    fatia.setAttribute('cy', centro);
    fatia.setAttribute('r', raio);
    fatia.setAttribute('fill', 'none');
    fatia.setAttribute('class', `segmento-donut-fatia ${classeModificadora} segmento-donut-fatia--clicavel`);
    fatia.setAttribute('stroke-width', espessura);
    fatia.setAttribute('stroke-dasharray', `${tamanhoFatia} ${circunferencia - tamanhoFatia}`);
    fatia.setAttribute('stroke-dashoffset', -offset);
    fatia.setAttribute('transform', `rotate(-90 ${centro} ${centro})`);
    fatia.setAttribute('role', 'button');
    fatia.setAttribute('tabindex', '0');

    const selecionada = filtroAtivo === nomeSegmento;
    if (selecionada) fatia.classList.add('segmento-donut-fatia--ativa');
    else if (filtroAtivo !== null) fatia.classList.add('segmento-donut-fatia--esmaecida');

    const titulo = document.createElementNS(svgNS, 'title');
    titulo.textContent = montarTooltipSegmento(nomeSegmento, quantidade, percentual);
    fatia.appendChild(titulo);

    const clique = () => alternarFiltroSegmentoIndicadoresElaborador(nomeSegmento);
    fatia.addEventListener('click', clique);
    fatia.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clique();
      }
    });

    return fatia;
  }

  const tamanhoFundamental = (distribuicao.pctFundamental / 100) * circunferencia;
  const tamanhoMedio = (distribuicao.pctMedio / 100) * circunferencia;

  svg.appendChild(
    criarFatia(
      'Ensino Fundamental',
      tamanhoFundamental,
      0,
      'segmento-donut-fatia--fundamental',
      distribuicao.fundamental,
      distribuicao.pctFundamental
    )
  );
  svg.appendChild(
    criarFatia(
      'Ensino Médio',
      tamanhoMedio,
      tamanhoFundamental,
      'segmento-donut-fatia--medio',
      distribuicao.medio,
      distribuicao.pctMedio
    )
  );

  const totalTexto = document.createElementNS(svgNS, 'text');
  totalTexto.setAttribute('x', centro);
  totalTexto.setAttribute('y', centro - 3);
  totalTexto.setAttribute('text-anchor', 'middle');
  totalTexto.setAttribute('class', 'segmento-donut-total-valor');
  totalTexto.textContent = distribuicao.total;
  svg.appendChild(totalTexto);

  const totalLabel = document.createElementNS(svgNS, 'text');
  totalLabel.setAttribute('x', centro);
  totalLabel.setAttribute('y', centro + 13);
  totalLabel.setAttribute('text-anchor', 'middle');
  totalLabel.setAttribute('class', 'segmento-donut-total-label');
  totalLabel.textContent = 'atrasos';
  svg.appendChild(totalLabel);

  const wrapper = document.createElement('div');
  wrapper.className = 'segmento-donut-wrapper';
  wrapper.appendChild(svg);

  const legenda = document.createElement('div');
  legenda.className = 'segmento-legenda';

  // Cria o item de legenda (também clicável, mesmo filtro da fatia correspondente)
  function criarItemLegenda(nomeSegmento, classeDot, quantidade, percentual) {
    const item = document.createElement('div');
    item.className = 'segmento-legenda-item segmento-legenda-item--clicavel';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.title = montarTooltipSegmento(nomeSegmento, quantidade, percentual);
    item.innerHTML =
      `<span class="segmento-legenda-dot ${classeDot}"></span>` +
      `<span class="segmento-legenda-label">${nomeSegmento}</span>` +
      `<span class="segmento-legenda-valor">${quantidade} · ${formatarPercentualComVirgula(percentual)}%</span>`;

    const selecionada = filtroAtivo === nomeSegmento;
    if (selecionada) item.classList.add('segmento-legenda-item--ativa');
    else if (filtroAtivo !== null) item.classList.add('segmento-legenda-item--esmaecida');

    const clique = () => alternarFiltroSegmentoIndicadoresElaborador(nomeSegmento);
    item.addEventListener('click', clique);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clique();
      }
    });

    return item;
  }

  legenda.appendChild(
    criarItemLegenda(
      'Ensino Fundamental',
      'segmento-legenda-dot--fundamental',
      distribuicao.fundamental,
      distribuicao.pctFundamental
    )
  );
  legenda.appendChild(
    criarItemLegenda('Ensino Médio', 'segmento-legenda-dot--medio', distribuicao.medio, distribuicao.pctMedio)
  );

  container.appendChild(wrapper);
  container.appendChild(legenda);
}

// --- Gráfico "Performance da entrega do elaborador" (linha) ---

// Retorna o nome do elaborador quando o recorte filtrado contém exatamente um único
// elaborador; caso contrário, retorna null (o gráfico de performance exige 1 elaborador)
function obterElaboradorUnicoDoRecorte(records) {
  const nomes = new Set(records.map((r) => safe(r.elaborador)).filter((valor) => valor !== ''));
  return nomes.size === 1 ? Array.from(nomes)[0] : null;
}

// Ordem fixa de exibição dos tipos de avaliação no eixo X do gráfico de performance
const ORDEM_TIPO_AV_PERFORMANCE = ['AV1', 'AV2', '2º CHAMADA', 'REC-SEM', 'REC-FIM'];

// Padroniza o texto de exibição do tipo de avaliação (ex.: "2ºCHAM", "2°CHAM", "2CHAM" -> "2º CHAMADA")
function normalizarTipoAvPerformance(tipoAv) {
  const texto = safe(tipoAv).toUpperCase();
  if (/^2\s*[º°]?\s*CHAM/.test(texto)) return '2º CHAMADA';
  if (/^REC[\s-]*SEM/.test(texto)) return 'REC-SEM';
  if (/^REC[\s-]*FIM/.test(texto)) return 'REC-FIM';
  if (texto === 'AV1' || texto === 'AV2') return texto;
  return safe(tipoAv) || 'Não informado';
}

// Agrupa as entregas de um elaborador por Módulo + Tipo de AV e calcula, para cada grupo,
// a média da diferença em dias entre devolutiva e prazo (a mesma métrica da coluna "Dias":
// devolutiva - prazo quando há devolutiva, ou hoje - prazo quando não há).
// O valor médio pode ser negativo (adiantado), zero (no prazo) ou positivo (atrasado).
function calcularGruposPerformanceElaborador(records, elaborador) {
  // Só entregas realizadas (devolutiva preenchida) — pendências sem devolutiva não entram na
  // performance de entrega
  const registros = records.filter(
    (r) => safe(r.elaborador) === elaborador && safe(r.prazo_encomenda) && safe(r.devolutiva_encomenda)
  );

  const grupos = new Map();
  registros.forEach((r) => {
    const modulo = safe(r.modulo) || 'Não informado';
    const tipoAv = normalizarTipoAvPerformance(r.tipo_av);
    const chave = `${modulo}||${tipoAv}`;
    if (!grupos.has(chave)) {
      grupos.set(chave, { categoria: `${modulo} - ${tipoAv}`, modulo, tipoAv, soma: 0, quantidade: 0 });
    }
    const grupo = grupos.get(chave);
    grupo.soma += diferencaParaPrazo(r);
    grupo.quantidade += 1;
  });

  return Array.from(grupos.values())
    .map((grupo) => ({ ...grupo, media: grupo.soma / grupo.quantidade }))
    .sort((a, b) => {
      if (a.modulo !== b.modulo) return a.modulo.localeCompare(b.modulo, 'pt-BR', { numeric: true });
      const posA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(a.tipoAv);
      const posB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(b.tipoAv);
      if (posA !== posB) {
        if (posA === -1) return 1;
        if (posB === -1) return -1;
        return posA - posB;
      }
      return a.tipoAv.localeCompare(b.tipoAv, 'pt-BR', { numeric: true });
    });
}

// Formata um número de dias (média) com uma casa decimal e sinal, no padrão pt-BR
function formatarMediaDias(valor) {
  const arredondado = Math.round(valor * 10) / 10;
  const texto = Math.abs(arredondado).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (arredondado > 0) return `+${texto} dias`;
  if (arredondado < 0) return `-${texto} dias`;
  return `${texto} dias`;
}

// Preenche o tooltip do gráfico de performance com os dados do grupo (Módulo + Tipo de AV) sob o mouse
function preencherTooltipPerformance(elaborador, grupo) {
  const tooltip = document.getElementById('perfTooltip');
  tooltip.innerHTML = '';

  const linhas = [
    ['Elaborador', elaborador],
    ['Grupo', grupo.categoria],
    ['Entregas', String(grupo.quantidade)],
    ['Soma dos dias', `${grupo.soma > 0 ? '+' : ''}${grupo.soma} dias`],
    ['Média', formatarMediaDias(grupo.media)]
  ];

  linhas.forEach(([label, valor]) => {
    const linha = document.createElement('div');
    const forte = document.createElement('strong');
    forte.textContent = `${label}: `;
    linha.appendChild(forte);
    linha.appendChild(document.createTextNode(valor));
    tooltip.appendChild(linha);
  });
}

function posicionarTooltipPerformance(event) {
  const tooltip = document.getElementById('perfTooltip');
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}

function ocultarTooltipPerformance() {
  document.getElementById('perfTooltip').hidden = true;
}

// Renderiza o gráfico de linha de performance de entrega para um único elaborador do recorte
function renderizarGraficoPerformanceElaborador(records) {
  const wrapper = document.getElementById('graficoPerformanceElaborador');
  wrapper.innerHTML = '';

  const elaborador = obterElaboradorUnicoDoRecorte(records);
  if (!elaborador) {
    const msg = document.createElement('p');
    msg.className = 'indicadores-chart-empty';
    msg.textContent = 'Selecione um único elaborador para visualizar a performance individual de entrega.';
    wrapper.appendChild(msg);
    return;
  }

  const pontos = calcularGruposPerformanceElaborador(records, elaborador);
  if (pontos.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'indicadores-chart-empty';
    msg.textContent = 'Não há entregas suficientes para exibir a performance.';
    wrapper.appendChild(msg);
    return;
  }

  const largura = 760;
  const altura = 220;
  const margem = { top: 24, right: 16, bottom: 30, left: 34 };
  const areaW = largura - margem.left - margem.right;
  const areaH = altura - margem.top - margem.bottom;

  const valores = pontos.map((p) => p.media);
  let minY = Math.min(0, ...valores);
  let maxY = Math.max(0, ...valores);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const folga = (maxY - minY) * 0.18;
  minY -= folga;
  maxY += folga;

  const escalaX = (indice) =>
    pontos.length > 1 ? margem.left + (indice / (pontos.length - 1)) * areaW : margem.left + areaW / 2;
  const escalaY = (valor) => margem.top + areaH - ((valor - minY) / (maxY - minY)) * areaH;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
  svg.setAttribute('class', 'perf-chart-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Linhas de grade horizontais discretas + linha de referência em y = 0
  const valoresGrade = Array.from(new Set([Math.round(minY), 0, Math.round(maxY)]));
  valoresGrade.forEach((valor) => {
    const y = escalaY(valor);

    const linha = document.createElementNS(svgNS, 'line');
    linha.setAttribute('x1', margem.left);
    linha.setAttribute('x2', largura - margem.right);
    linha.setAttribute('y1', y);
    linha.setAttribute('y2', y);
    linha.setAttribute('class', valor === 0 ? 'perf-grid-zero' : 'perf-grid-line');
    svg.appendChild(linha);

    const rotulo = document.createElementNS(svgNS, 'text');
    rotulo.setAttribute('x', margem.left - 6);
    rotulo.setAttribute('y', y + 3);
    rotulo.setAttribute('text-anchor', 'end');
    rotulo.setAttribute('class', 'perf-axis-label');
    rotulo.textContent = valor;
    svg.appendChild(rotulo);
  });

  // Linha principal ligando as médias de cada grupo (Módulo + Tipo de AV)
  const pontosPath = pontos.map((p, i) => `${escalaX(i)},${escalaY(p.media)}`).join(' ');
  const polyline = document.createElementNS(svgNS, 'polyline');
  polyline.setAttribute('points', pontosPath);
  polyline.setAttribute('class', 'perf-line');
  svg.appendChild(polyline);

  // Marcadores de cada grupo, com tooltip ao passar o mouse, e rótulo da categoria no eixo X
  pontos.forEach((ponto, i) => {
    const cx = escalaX(i);
    const cy = escalaY(ponto.media);

    const corPonto = ponto.media > 0 ? 'perf-point--vermelho' : 'perf-point--azul';
    const corRotulo = ponto.media > 0 ? 'perf-point-label--vermelho' : 'perf-point-label--azul';

    const circulo = document.createElementNS(svgNS, 'circle');
    circulo.setAttribute('cx', cx);
    circulo.setAttribute('cy', cy);
    circulo.setAttribute('r', 3.5);
    circulo.setAttribute('class', `perf-point ${corPonto}`);
    circulo.addEventListener('mouseenter', (event) => {
      preencherTooltipPerformance(elaborador, ponto);
      document.getElementById('perfTooltip').hidden = false;
      posicionarTooltipPerformance(event);
    });
    circulo.addEventListener('mousemove', posicionarTooltipPerformance);
    circulo.addEventListener('mouseleave', ocultarTooltipPerformance);
    svg.appendChild(circulo);

    // Valor da média exibido junto ao ponto, sem precisar passar o mouse
    const rotuloValor = document.createElementNS(svgNS, 'text');
    rotuloValor.setAttribute('x', cx);
    rotuloValor.setAttribute('y', cy - 8);
    rotuloValor.setAttribute('text-anchor', 'middle');
    rotuloValor.setAttribute('class', `perf-point-label ${corRotulo}`);
    rotuloValor.textContent = Math.round(ponto.media * 10) / 10;
    svg.appendChild(rotuloValor);

    const rotuloX = document.createElementNS(svgNS, 'text');
    rotuloX.setAttribute('x', cx);
    rotuloX.setAttribute('y', altura - 8);
    rotuloX.setAttribute('text-anchor', 'middle');
    rotuloX.setAttribute('class', 'perf-axis-label perf-axis-label--x');
    rotuloX.textContent = ponto.categoria;
    svg.appendChild(rotuloX);
  });

  wrapper.appendChild(svg);
}

// Cria a célula "#" com o badge circular de posição no ranking (1º/2º/3º em vinho, demais em azul)
function criarCelulaRanking(posicao) {
  const td = document.createElement('td');
  td.className = 'rank-cell';

  const badge = document.createElement('span');
  const classeRank = posicao >= 1 && posicao <= 3 ? `rank-${posicao}` : 'rank-default';
  badge.className = `rank-badge ${classeRank}`;
  badge.textContent = String(posicao);

  td.appendChild(badge);
  return td;
}

// Renderiza a tabela "Recorrência de atraso por elaborador", com badge de classificação de risco
function renderizarTabelaRecorrencia(linhas) {
  const tbody = document.getElementById('indicadoresRecorrenciaBody');
  tbody.innerHTML = '';

  if (linhas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'indicadores-tabela-vazia';
    td.textContent = 'Nenhum registro encontrado.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  linhas.forEach((linha, indice) => {
    const tr = document.createElement('tr');
    tr.className = 'indicator-table-row';
    tr.classList.toggle('active', filtrosIndicadores.elaborador === linha.elaborador);
    tr.addEventListener('click', () => alternarFiltroIndicador('elaborador', linha.elaborador));
    tr.appendChild(criarCelulaRanking(linha.posicaoReal));
    [
      linha.elaborador,
      linha.total,
      linha.qtdComAtraso,
      `${formatarPercentualComVirgula(linha.taxa)}%`
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdMedia = document.createElement('td');
    tdMedia.textContent = `${formatarMediaAtrasoGrafico(linha.mediaAtraso)} dias`;
    tdMedia.title =
      `Média de atraso: ${formatarMediaAtrasoGrafico(linha.mediaAtraso)} dias\n` +
      `Ocorrências atrasadas: ${linha.qtdComAtraso}\n` +
      `Dias acumulados: ${linha.diasAcumulados}`;
    tr.appendChild(tdMedia);

    const tdMaiorIndividual = document.createElement('td');
    tdMaiorIndividual.textContent = linha.maiorIndividual;
    tr.appendChild(tdMaiorIndividual);

    renderBadgeCellClassificacao(tr, linha.classificacao);
    tbody.appendChild(tr);
  });
}

// Renderiza a tabela "Resumo por disciplina"
function renderizarTabelaDisciplina(linhas) {
  const tbody = document.getElementById('indicadoresDisciplinaBody');
  tbody.innerHTML = '';

  if (linhas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'indicadores-tabela-vazia';
    td.textContent = 'Nenhum registro encontrado.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  linhas.forEach((linha, indice) => {
    const tr = document.createElement('tr');
    tr.className = 'indicator-table-row';
    tr.classList.toggle('active', filtrosIndicadores.disciplina === linha.disciplina);
    tr.addEventListener('click', () => alternarFiltroIndicador('disciplina', linha.disciplina));
    tr.appendChild(criarCelulaRanking(indice + 1));
    [
      linha.disciplina,
      linha.total,
      linha.entreguesNoPrazo,
      linha.entreguesForaPrazo,
      linha.pendenciasVencidas
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdMedia = document.createElement('td');
    tdMedia.textContent = `${formatarMediaAtrasoGrafico(linha.mediaAtraso)} dias`;
    tdMedia.title =
      `Média de atraso: ${formatarMediaAtrasoGrafico(linha.mediaAtraso)} dias\n` +
      `Ocorrências atrasadas: ${linha.qtdComAtraso}\n` +
      `Dias acumulados: ${linha.diasAcumulados}`;
    tr.appendChild(tdMedia);

    const tdTaxa = document.createElement('td');
    tdTaxa.textContent = `${formatarPercentualComVirgula(linha.taxa)}%`;
    tr.appendChild(tdTaxa);

    tbody.appendChild(tr);
  });
}

// --- Filtros interativos dos gráficos da seção Indicadores ---

// Guarda os registros de base (já com popover + busca + filtro rápido do card) para que os
// filtros interativos dos gráficos possam recalcular a seção sem precisar reconsultar o DOM
let indicadoresDadosBase = [];

// Aplica, sobre os registros de base, os filtros interativos acionados por clique nos gráficos
function aplicarFiltrosIndicadores(dados, { ignorarElaborador = false } = {}) {
  return dados.filter((item) => {
    if (!ignorarElaborador && filtrosIndicadores.elaborador && safe(item.elaborador) !== filtrosIndicadores.elaborador) {
      return false;
    }

    if (filtrosIndicadores.tipo_av && normalizarTipoAvPerformance(item.tipo_av) !== filtrosIndicadores.tipo_av) {
      return false;
    }

    if (filtrosIndicadores.ano && safe(item.ano) !== filtrosIndicadores.ano) {
      return false;
    }

    if (filtrosIndicadores.disciplina) {
      const disciplinaBase = normalizarNomeDisciplina(item.frente);
      if (disciplinaBase !== filtrosIndicadores.disciplina) {
        return false;
      }
    }

    if (filtrosIndicadores.segmento && identificarSegmentoPorAno(item.ano) !== filtrosIndicadores.segmento) {
      return false;
    }

    return true;
  });
}

// Popula os selects de Módulo, Ano, Disciplina, Tipo de AV e Elaborador do bloco de filtros
// no topo da seção Indicadores — Elaborador (a partir do recorte completo da aba)
function populateIndicadoresFilterOptions(records) {
  populateSelectOptions(indSelectFilters.modulo, records, 'modulo', 'Módulo');
  populateCheckboxGroupField(indCheckboxGroups.ano, records, 'ano', filtrosIndicadoresTopo.anos);
  populateCheckboxGroupField(indCheckboxGroups.disciplina, records, 'frente', filtrosIndicadoresTopo.disciplinas);
  populateCheckboxGroupTipoAv(indCheckboxGroups.tipoAv, records, filtrosIndicadoresTopo.tiposAv);
  populateCheckboxGroupField(indCheckboxGroups.elaborador, records, 'elaborador', filtrosIndicadoresTopo.elaboradores);
}

// Aplica os filtros do bloco de topo da seção Indicadores — Elaborador (Módulo, Ano,
// Disciplina, Tipo de AV, Elaborador e busca), por cima do recorte já filtrado pelo
// popover/busca/card da aba Elaborador
function aplicarFiltrosIndicadoresTopo(dados, { ignorarElaborador = false } = {}) {
  const modulo = indSelectFilters.modulo.value;
  const busca = safe(indFilterBusca.value).toLowerCase();

  return dados.filter((record) => {
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (!passaFiltroMultiplo(safe(record.ano), filtrosIndicadoresTopo.anos)) return false;
    if (!passaFiltroMultiplo(safe(record.frente), filtrosIndicadoresTopo.disciplinas)) return false;
    if (!passaFiltroMultiplo(safe(record.tipo_av), filtrosIndicadoresTopo.tiposAv)) return false;
    if (!ignorarElaborador && !passaFiltroMultiplo(safe(record.elaborador), filtrosIndicadoresTopo.elaboradores)) return false;

    if (busca) {
      const matchesBusca = Object.values(record).some((value) =>
        safe(value).toLowerCase().includes(busca)
      );
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Liga/desliga (toggle) um filtro interativo de gráfico e recalcula a seção Indicadores
function alternarFiltroIndicador(campo, valor) {
  filtrosIndicadores[campo] = filtrosIndicadores[campo] === valor ? null : valor;
  renderizarIndicadoresElaborador(indicadoresDadosBase);
}

// Remove todos os filtros interativos dos gráficos, preservando os filtros do popover/busca/card
function limparFiltrosIndicadores() {
  filtrosIndicadores = { elaborador: null, tipo_av: null, disciplina: null, ano: null };
  renderizarIndicadoresElaborador(indicadoresDadosBase);
}

const ROTULOS_FILTROS_INDICADORES = {
  elaborador: 'Elaborador',
  tipo_av: 'Avaliação',
  disciplina: 'Disciplina',
  ano: 'Ano',
  segmento: 'Segmento'
};

// Renderiza a área de badges "Filtros ativos:" acima dos gráficos, com um "x" por badge
// para remoção individual, e mostra/esconde o botão "Limpar filtros dos indicadores"
function renderizarFiltrosAtivosIndicadores() {
  const area = document.getElementById('indicadoresFiltrosAtivos');
  const lista = document.getElementById('indicadoresFiltrosAtivosLista');
  if (!area || !lista) return;

  lista.innerHTML = '';

  const ativos = Object.entries(filtrosIndicadores).filter(([, valor]) => valor);
  area.hidden = ativos.length === 0;

  ativos.forEach(([campo, valor]) => {
    const badge = document.createElement('span');
    badge.className = 'indicadores-filtro-badge';

    const texto = document.createElement('span');
    texto.textContent = `${ROTULOS_FILTROS_INDICADORES[campo]}: ${valor}`;
    badge.appendChild(texto);

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'indicadores-filtro-badge-remover';
    remover.setAttribute('aria-label', `Remover filtro de ${ROTULOS_FILTROS_INDICADORES[campo]}`);
    remover.textContent = '✕';
    remover.addEventListener('click', () => alternarFiltroIndicador(campo, valor));
    badge.appendChild(remover);

    lista.appendChild(badge);
  });
}

// Renderiza toda a seção "Indicadores — Elaborador" (painel analítico executivo de performance
// e atrasos) a partir dos registros de base (popover + busca + filtro rápido do card), aplicando
// por cima os filtros interativos dos gráficos (filtrosIndicadores)
function renderizarIndicadoresElaborador(dadosBase) {
  indicadoresDadosBase = dadosBase;

  const empty = document.getElementById('indicadoresEmptyGeral');
  const conteudo = document.getElementById('indicadoresConteudo');

  renderizarFiltrosAtivosIndicadores();
  atualizarIndicadorFiltrosIndicadoresTopo();

  if (dadosBase.length === 0) {
    empty.hidden = false;
    empty.textContent = 'Não há dados suficientes para gerar indicadores neste recorte.';
    conteudo.hidden = true;
    return;
  }

  const dados = aplicarFiltrosIndicadores(aplicarFiltrosIndicadoresTopo(dadosBase));

  if (dados.length === 0) {
    empty.hidden = false;
    empty.textContent = 'Não há dados para os filtros selecionados.';
    conteudo.hidden = true;
    return;
  }
  empty.hidden = true;
  conteudo.hidden = false;

  const resumo = calcularResumoAtrasos(dados);
  const porDisciplinaAtraso = agruparAtrasosPorDisciplinaNormalizada(resumo.comAtraso);
  const porAnoAtraso = agruparAtrasosPorAno(resumo.comAtraso);
  const porTipoAvAtraso = agruparAtrasosPorTipoAv(resumo.comAtraso);

  renderizarCardsExecutivos(resumo);

  // Linha 2: quem mais atrasa (elaborador) + qual avaliação mais atrasa
  renderizarGraficoBarrasHorizontal('graficoRankingElaboradores', resumo.porElaborador, {
    campoFiltro: 'elaborador',
    limite: 12
  });
  renderizarGraficoTipoAvBlocos('graficoTipoAv', porTipoAvAtraso, { campoFiltro: 'tipo_av' });

  // Linha 3: concentração por disciplina + concentração por ano
  renderizarGraficoBarrasHorizontal('graficoDisciplinas', porDisciplinaAtraso, {
    semLimite: true,
    campoFiltro: 'disciplina'
  });
  renderizarGraficoColunas('graficoAno', porAnoAtraso, { campoFiltro: 'ano' });
  renderizarGraficoTaxaAtrasoPorSegmento('graficoSegmento', calcularDistribuicaoAtrasoPorSegmento(dados));

  // Leitura gerencial de reincidência, antes da leitura individual detalhada.
  // O ranking (posição "#") é calculado sobre o recorte SEM o filtro por elaborador, para que
  // selecionar um elaborador (clique na tabela/gráfico ou select do topo) apenas restrinja a
  // exibição, sem recalcular a posição dele no ranking geral.
  const dadosParaRanking = aplicarFiltrosIndicadores(
    aplicarFiltrosIndicadoresTopo(dadosBase, { ignorarElaborador: true }),
    { ignorarElaborador: true }
  );
  const rankingCompleto = calcularRecorrenciaPorElaborador(dadosParaRanking).map((item, index) => ({
    ...item,
    posicaoReal: index + 1
  }));
  // Com o campo "Elaborador" do popover agora em multi-seleção, só faz sentido restringir a
  // tabela de recorrência a "um elaborador" quando exatamente um estiver marcado (o filtro
  // interativo de clique no gráfico/tabela, filtrosIndicadores.elaborador, continua tendo
  // prioridade — mesmo comportamento de antes)
  const elaboradorSelecionado =
    filtrosIndicadores.elaborador ||
    (filtrosIndicadoresTopo.elaboradores.length === 1 ? filtrosIndicadoresTopo.elaboradores[0] : null);
  const recorrencia = elaboradorSelecionado
    ? rankingCompleto.filter((item) => item.elaborador === elaboradorSelecionado)
    : rankingCompleto;
  renderizarTabelaRecorrencia(recorrencia);

  // Performance individual (exige um único elaborador no recorte)
  renderizarGraficoPerformanceElaborador(dados);

  // Resumo consolidado por disciplina-base (variações numéricas agrupadas)
  renderizarTabelaDisciplina(calcularResumoPorDisciplina(dados));
}

// Renderiza a tabela de acompanhamento de encomendas por elaborador, com seus cards específicos
function renderizarVisaoElaborador() {
  populateElabFilterOptions(filteredRecords);
  populateIndicadoresFilterOptions(filteredRecords);
  atualizarIndicadorFiltrosElaborador();
  atualizarIndicadorFiltrosIndicadoresTopo();
  const records = obterRegistrosFiltradosElaborador();
  const totais = calcularTotaisElaborador(records);

  renderizarGrupoEncomendas(totais);
  renderizarGrupoDevolucoes(totais);
  renderizarGrupoValidacoes(totais);
  atualizarDestaqueCardsElaborador();

  dom.tableBodyElaborador.innerHTML = '';

  if (records.length === 0) {
    dom.empty.hidden = false;
    dom.resultsCount.textContent = '';
    return;
  }
  dom.empty.hidden = true;

  // Nos filtros rápidos "Fora do prazo" e "Pendentes atrasadas", ordenar a tabela
  // pela coluna "Dias" (maior atraso primeiro); nos demais casos, ordem padrão
  const registrosTabela = FILTROS_RAPIDOS_ORDENADOS_POR_ATRASO.includes(filtroRapidoElaborador)
    ? ordenarRegistrosPorDiasDecrescente(records)
    : records;

  const fragment = document.createDocumentFragment();

  registrosTabela.forEach((record) => {
    const statusEncomenda = safe(record.data_encomenda) ? 'Realizada' : 'Pendente';
    const statusPrazo = getStatusPrazo(record);
    const statusValidacao = safe(record.data_validacao_sgge) ? 'Validada' : 'Pendente';

    const tr = document.createElement('tr');

    [
      safe(record.modulo),
      safe(record.ano),
      safe(record.frente),
      safe(record.tipo_av),
      safe(record.elaborador),
      safe(record.data_encomenda)
    ].forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });

    renderBadgeCell(tr, statusEncomenda);

    const tdPrazo = document.createElement('td');
    tdPrazo.textContent = safe(record.prazo_encomenda);
    tr.appendChild(tdPrazo);

    const tdDevolutiva = document.createElement('td');
    tdDevolutiva.textContent = safe(record.devolutiva_encomenda);
    tr.appendChild(tdDevolutiva);

    const tdDiferenca = document.createElement('td');
    tdDiferenca.textContent = formatarDiferencaParaPrazo(diferencaParaPrazo(record));
    tr.appendChild(tdDiferenca);

    renderBadgeCell(tr, statusPrazo);

    const tdValidacao = document.createElement('td');
    tdValidacao.textContent = safe(record.data_validacao_sgge);
    tr.appendChild(tdValidacao);

    const tdAtrasoValidacao = document.createElement('td');
    const atrasoValidacao = calcularAtrasoValidacao(diasParaValidar(record));
    if (atrasoValidacao === null) {
      tdAtrasoValidacao.textContent = '-';
    } else {
      const badge = document.createElement('span');
      badge.className = `badge ${atrasoValidacao > 0 ? 'badge-atrasada' : 'badge-realizada'}`;
      badge.textContent = atrasoValidacao;
      tdAtrasoValidacao.appendChild(badge);
    }
    tr.appendChild(tdAtrasoValidacao);

    renderBadgeCell(tr, statusValidacao);

    fragment.appendChild(tr);
  });

  dom.tableBodyElaborador.appendChild(fragment);
  dom.resultsCount.textContent = `${records.length} registro(s) encontrado(s)`;
}

// --- Aba Coordenador: acompanhamento de envio, análise e devolutiva pelo coordenador ---

// Calcula a diferença em dias entre a devolutiva do coordenador e o prazo (mesma lógica de
// diferencaParaPrazo, mas usando prazo_coord/devolutiva_coord): devolutiva - prazo quando há
// devolutiva, ou hoje - prazo quando não há. Retorna null quando não há prazo_coord definido.
function calcularDiasCoordenador(record) {
  const prazo = parseBrDate(record.prazo_coord);
  if (!prazo) return null;

  const devolutiva = parseBrDate(record.devolutiva_coord);
  let referencia;
  if (devolutiva) {
    referencia = devolutiva;
  } else {
    referencia = new Date();
    referencia.setHours(0, 0, 0, 0);
  }

  const diffMs = referencia.getTime() - prazo.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Formata a diferença em dias no padrão compacto "-3 dias" / "0 dias" / "+5 dias"
function formatarDiasCoordenador(dias) {
  if (dias === null) return '-';
  if (dias > 0) return `+${dias} dias`;
  return `${dias} dias`;
}

// Determina o status geral do processo de coordenação de um registro. Quando ainda não foi
// enviado ao coordenador, diferencia se a causa é a devolutiva do elaborador (ainda não
// aconteceu) ou se já pode seguir mas simplesmente ainda não foi enviado para validação.
function identificarStatusCoordenador(record) {
  const envio = safe(record.data_envio_coord);
  const devolutiva = safe(record.devolutiva_coord);
  const prazoStr = safe(record.prazo_coord);

  if (!envio) {
    return safe(record.devolutiva_encomenda) ? 'Não enviado para validação do coordenador' : 'Aguardando elaborador';
  }

  if (!devolutiva) {
    return prazoStr && isDateOverdue(prazoStr) ? 'Prazo atrasado' : 'Aguardando análise';
  }

  const prazo = parseBrDate(prazoStr);
  const dataDevolutiva = parseBrDate(devolutiva);
  if (prazo && dataDevolutiva && dataDevolutiva.getTime() > prazo.getTime()) {
    return 'Devolvida com atraso';
  }
  return 'Devolvida no prazo';
}

// Texto de apoio (title) explicando o motivo de cada um dos dois status de "não enviado"
const DICA_STATUS_COORDENADOR = {
  'Aguardando elaborador': 'A avaliação ainda não teve devolutiva do elaborador.',
  'Não enviado para validação do coordenador': 'A avaliação já voltou do elaborador, mas ainda não foi enviada ao coordenador.'
};

function badgeClassForStatusCoordenador(status) {
  const map = {
    'Aguardando elaborador': 'badge-coord-nao-enviado',
    'Não enviado para validação do coordenador': 'badge-coord-nao-enviado-validacao',
    'Aguardando análise': 'badge-coord-aguardando',
    'Prazo atrasado': 'badge-coord-atrasado',
    'Devolvida no prazo': 'badge-coord-no-prazo',
    'Devolvida com atraso': 'badge-coord-com-atraso'
  };
  return map[status] || '';
}

// Popula os selects de Módulo, Tipo de AV, Ano, Disciplina e Coordenador da aba Coordenador.
// Módulo agora vive no filtro rápido do cabeçalho (mesmo <select>, mesmo estado em
// coordSelectFilters.modulo) — opção vazia mostra "Módulo" em vez de "Todos", mesmo padrão da
// aba Elaboração.
// Opções fixas dos campos "Status geral"/"Situação do prazo" do popover da aba Coordenador —
// mesmas <option> estáticas que existiam antes (valores retornados por identificarStatusCoordenador)
const OPCOES_COORD_STATUS_GERAL = [
  'Aguardando elaborador',
  'Não enviado para validação do coordenador',
  'Aguardando análise',
  'Prazo atrasado',
  'Devolvida no prazo',
  'Devolvida com atraso'
].map((v) => ({ value: v, label: v }));
const OPCOES_COORD_SITUACAO_PRAZO = [
  'Aguardando análise',
  'Prazo atrasado',
  'Devolvida no prazo',
  'Devolvida com atraso',
  'Aguardando elaborador',
  'Não enviado para validação do coordenador'
].map((v) => ({ value: v, label: v }));

function populateCoordFilterOptions(records) {
  populateAnoAplicacaoOptions(coordSelectFilters.ano, records);
  populateSelectOptions(coordSelectFilters.modulo, records, 'modulo', 'Módulo');
  populateCheckboxGroupTipoAv(coordCheckboxGroups.tipoAv, records, filtrosCoordenador.tiposAv);
  populateCheckboxGroupField(coordCheckboxGroups.ano, records, 'ano', filtrosCoordenador.anos);
  populateCheckboxGroupField(coordCheckboxGroups.frente, records, 'frente', filtrosCoordenador.disciplinas);
  populateCheckboxGroupField(coordCheckboxGroups.coordenador, records, 'coordenador', filtrosCoordenador.coordenadores);
  renderizarGrupoCheckbox(coordCheckboxGroups.statusGeral, OPCOES_COORD_STATUS_GERAL, filtrosCoordenador.statusGeral);
  renderizarGrupoCheckbox(coordCheckboxGroups.situacaoPrazo, OPCOES_COORD_SITUACAO_PRAZO, filtrosCoordenador.situacaoPrazo);
}

// Aplica os filtros do popover (Avaliação/Coordenação/Prazo) + busca geral da aba Coordenador
// sobre os registros já filtrados globalmente
function aplicarFiltrosCoordenador(records) {
  const anoAplicacao = coordSelectFilters.ano.value;
  const modulo = coordSelectFilters.modulo.value;
  const busca = safe(coordFilterBusca.value).toLowerCase();

  return records.filter((record) => {
    if (anoAplicacao && obterAnoAplicacao(record) !== anoAplicacao) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (!passaFiltroMultiplo(safe(record.tipo_av), filtrosCoordenador.tiposAv)) return false;
    if (!passaFiltroMultiplo(safe(record.ano), filtrosCoordenador.anos)) return false;
    if (!passaFiltroMultiplo(safe(record.frente), filtrosCoordenador.disciplinas)) return false;
    if (!passaFiltroMultiplo(safe(record.coordenador), filtrosCoordenador.coordenadores)) return false;

    const status = identificarStatusCoordenador(record);
    if (!passaFiltroMultiplo(status, filtrosCoordenador.statusGeral)) return false;
    if (!passaFiltroMultiplo(status, filtrosCoordenador.situacaoPrazo)) return false;

    if (busca) {
      const camposVisiveis = [
        safe(record.modulo),
        safe(record.tipo_av),
        safe(record.ano),
        safe(record.frente),
        safe(record.data_aplicacao),
        safe(record.coordenador),
        safe(record.data_envio_coord),
        safe(record.prazo_coord),
        safe(record.devolutiva_coord),
        formatarDiasCoordenador(calcularDiasCoordenador(record)),
        status,
        safe(record.responsavel)
      ];
      const matchesBusca = camposVisiveis.some((valor) => valor.toLowerCase().includes(busca));
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Verifica se um registro passa no filtro rápido (clique em card) atualmente ativo
function passaFiltroRapidoCoordenador(record) {
  if (!filtroRapidoCoordenador) return true;

  const status = identificarStatusCoordenador(record);

  switch (filtroRapidoCoordenador) {
    case 'enviadas':
      return Boolean(safe(record.data_envio_coord));
    case 'pendente-envio-validacao':
      return Boolean(safe(record.data_validacao_sgge)) && !safe(record.data_envio_coord);
    case 'aguardando':
      return status === 'Aguardando análise';
    case 'recebidas':
      return Boolean(safe(record.devolutiva_coord));
    case 'atraso-devolucao':
      return status === 'Devolvida com atraso';
    case 'prazo-atrasado':
      return status === 'Prazo atrasado';
    case 'validadas-prazo':
      return status === 'Devolvida no prazo';
    default:
      return true;
  }
}

// Retorna os registros da aba Coordenador já com filtros do popover, busca geral e filtro
// rápido do card aplicados
function obterRegistrosFiltradosCoordenador() {
  return aplicarFiltrosCoordenador(filteredRecords).filter(passaFiltroRapidoCoordenador);
}

// Alterna o filtro rápido do card clicado: se já estava ativo, desliga; senão, assume o novo
function alternarFiltroRapidoCoordenador(tipo) {
  filtroRapidoCoordenador = filtroRapidoCoordenador === tipo ? null : tipo;
  renderizarVisaoCoordenador();
}

// Atualiza o destaque visual do card correspondente ao filtro rápido ativo
function atualizarDestaqueCardsCoordenador() {
  document.querySelectorAll('#viewCoordenador [data-quick-filter]').forEach((card) => {
    const isActive = card.dataset.quickFilter === filtroRapidoCoordenador;
    card.classList.toggle('is-quick-active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });
}

// Conta quantos filtros do popover estão ativos (selects preenchidos + busca) e atualiza o badge
function atualizarIndicadorFiltrosCoordenador() {
  const totalAtivos =
    Object.values(coordSelectFilters).filter((select) => select.value !== '').length +
    filtrosCoordenador.tiposAv.length +
    filtrosCoordenador.anos.length +
    filtrosCoordenador.disciplinas.length +
    filtrosCoordenador.coordenadores.length +
    filtrosCoordenador.statusGeral.length +
    filtrosCoordenador.situacaoPrazo.length +
    (safe(coordFilterBusca.value) !== '' ? 1 : 0);

  coordFilterBadge.hidden = totalAtivos === 0;
  coordFilterBadge.textContent = totalAtivos;
  btnAbrirFiltrosCoord.classList.toggle('has-active-filters', totalAtivos > 0);
}

// Copia o estado marcado dos checkboxes do popover para filtrosCoordenador — chamado ao clicar
// "Aplicar filtros"
function aplicarCheckboxesCoordenador() {
  filtrosCoordenador.tiposAv = lerGrupoCheckbox(coordCheckboxGroups.tipoAv);
  filtrosCoordenador.anos = lerGrupoCheckbox(coordCheckboxGroups.ano);
  filtrosCoordenador.disciplinas = lerGrupoCheckbox(coordCheckboxGroups.frente);
  filtrosCoordenador.coordenadores = lerGrupoCheckbox(coordCheckboxGroups.coordenador);
  filtrosCoordenador.statusGeral = lerGrupoCheckbox(coordCheckboxGroups.statusGeral);
  filtrosCoordenador.situacaoPrazo = lerGrupoCheckbox(coordCheckboxGroups.situacaoPrazo);
}

function abrirPopoverFiltrosCoordenador() {
  coordFiltersPopover.hidden = false;
  btnAbrirFiltrosCoord.classList.add('is-active');
  btnAbrirFiltrosCoord.setAttribute('aria-expanded', 'true');
  btnAbrirFiltrosCoord.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosCoord.dataset.iconAtivo;
}

function fecharPopoverFiltrosCoordenador() {
  coordFiltersPopover.hidden = true;
  btnAbrirFiltrosCoord.classList.remove('is-active');
  btnAbrirFiltrosCoord.setAttribute('aria-expanded', 'false');
  btnAbrirFiltrosCoord.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosCoord.dataset.iconNormal;
}

function alternarPopoverFiltrosCoordenador() {
  if (coordFiltersPopover.hidden) {
    abrirPopoverFiltrosCoordenador();
  } else {
    fecharPopoverFiltrosCoordenador();
  }
}

// Limpa os filtros próprios da aba Coordenador (popover, busca e filtro rápido) e re-renderiza
function limparFiltrosCoordenador() {
  Object.values(coordSelectFilters).forEach((select) => (select.value = ''));
  filtrosCoordenador.tiposAv = [];
  filtrosCoordenador.anos = [];
  filtrosCoordenador.disciplinas = [];
  filtrosCoordenador.coordenadores = [];
  filtrosCoordenador.statusGeral = [];
  filtrosCoordenador.situacaoPrazo = [];
  Object.values(coordCheckboxGroups).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  coordFilterBusca.value = '';
  filtroRapidoCoordenador = null;
  renderizarVisaoCoordenador();
}

// Calcula os totais usados pelos 6 cards da aba Coordenador a partir dos registros filtrados
function calcularTotaisCoordenador(records) {
  const totais = {
    enviadas: 0,
    pendenteEnvioValidacao: 0,
    aguardando: 0,
    recebidas: 0,
    atrasoDevolucao: 0,
    prazoAtrasado: 0,
    validadasPrazo: 0
  };

  records.forEach((record) => {
    const status = identificarStatusCoordenador(record);
    if (safe(record.data_envio_coord)) totais.enviadas += 1;
    // Já validada pelo SGGE, mas ainda não enviada para validação do coordenador
    if (safe(record.data_validacao_sgge) && !safe(record.data_envio_coord)) {
      totais.pendenteEnvioValidacao += 1;
    }
    if (safe(record.devolutiva_coord)) totais.recebidas += 1;
    if (status === 'Aguardando análise') totais.aguardando += 1;
    if (status === 'Devolvida com atraso') totais.atrasoDevolucao += 1;
    if (status === 'Prazo atrasado') totais.prazoAtrasado += 1;
    if (status === 'Devolvida no prazo') totais.validadasPrazo += 1;
  });

  return totais;
}

function renderizarCardsCoordenador(records) {
  const totais = calcularTotaisCoordenador(records);
  dom.cardCoordEnviadas.textContent = totais.enviadas;
  dom.cardCoordPendenteEnvio.textContent = totais.pendenteEnvioValidacao;
  dom.cardCoordAguardando.textContent = totais.aguardando;
  dom.cardCoordRecebidas.textContent = totais.recebidas;
  dom.cardCoordPrazoAtrasado.textContent = totais.prazoAtrasado;

  renderizarTooltipPendentesCoordenador(records);
}

// Calcula, por tipo de AV normalizado, o progresso de envio ao coordenador entre as
// avaliações já validadas pelo SGGE (base: data_validacao_sgge preenchida). Responde
// "de cada tipo de avaliação validada pelo SGGE, quantas já foram enviadas para validação?"
// — não a distribuição das pendências entre si. Mantém a ordem fixa AV1/AV2/2º CHAMADA/
// REC-SEM/REC-FIM, inclusive tipos sem nenhum registro validado (total 0).
function calcularProgressoEnvioPorTipoAv(records) {
  const validadosSgge = records.filter((r) => safe(r.data_validacao_sgge));

  const totais = new Map(ORDEM_TIPO_AV_PERFORMANCE.map((tipo) => [tipo, { total: 0, enviadas: 0 }]));
  validadosSgge.forEach((r) => {
    const tipo = normalizarTipoAvPerformance(r.tipo_av);
    if (!totais.has(tipo)) return;
    const grupo = totais.get(tipo);
    grupo.total += 1;
    if (safe(r.data_envio_coord)) grupo.enviadas += 1;
  });

  return ORDEM_TIPO_AV_PERFORMANCE.map((tipo) => {
    const { total, enviadas } = totais.get(tipo);
    return {
      tipoAv: tipo,
      total,
      enviadas,
      pendentes: total - enviadas,
      percentual: total > 0 ? (enviadas / total) * 100 : 0
    };
  });
}

// Renderiza a dica de ferramenta analítica (tooltip) do card "Pendente de Envio": barras
// compactas por tipo de AV mostrando o percentual de envio (enviadas / total validado)
function renderizarTooltipPendentesCoordenador(records) {
  const container = document.getElementById('coordPendenteTooltipChart');
  if (!container) return;
  container.innerHTML = '';

  const grupos = calcularProgressoEnvioPorTipoAv(records);
  const totalValidado = grupos.reduce((soma, g) => soma + g.total, 0);

  if (totalValidado === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-tooltip-empty';
    vazio.textContent = 'Não há avaliações validadas pelo SGGE no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  grupos.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row coord-tooltip-row--clicavel';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '-1');
    row.title =
      `${grupo.tipoAv}: ${grupo.enviadas} de ${grupo.total} enviadas ` +
      `(${formatarPercentualComVirgula(grupo.percentual)}%) · ${grupo.pendentes} pendente(s)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = grupo.tipoAv;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${grupo.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${grupo.enviadas} de ${grupo.total} · ${formatarPercentualComVirgula(grupo.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    // Interação opcional: clicar numa barra filtra a tabela por aquele tipo de AV, reaproveitando
    // o filtro global "Filtrar por avaliação" já existente na aba Coordenador
    row.addEventListener('click', () => selecionarFiltroTipoAvGlobalCoordenador(grupo.tipoAv));

    container.appendChild(row);
  });
}

// Agrupa os registros filtrados por coordenador e calcula, para cada um, a quantidade de
// demandas, devolutivas recebidas, pendentes e atrasadas, além do status geral predominante
// (prioridade: atrasadas > pendentes > recebidas > não enviado)
function calcularResumoPorCoordenador(records) {
  const grupos = new Map();

  records.forEach((record) => {
    const coordenador = safe(record.coordenador) || 'Não informado';
    if (!grupos.has(coordenador)) {
      grupos.set(coordenador, []);
    }
    grupos.get(coordenador).push(record);
  });

  const linhas = [];

  grupos.forEach((registros, coordenador) => {
    let naoEnviadas = 0;
    let aguardandoElaborador = 0;
    let naoEnviadoParaValidacao = 0;
    let emValidacao = 0;
    let devolvidas = 0;
    let atrasadas = 0;

    registros.forEach((record) => {
      const envio = safe(record.data_envio_coord);
      const devolutiva = safe(record.devolutiva_coord);
      const status = identificarStatusCoordenador(record);

      if (!envio) {
        naoEnviadas += 1;
        if (status === 'Aguardando elaborador') aguardandoElaborador += 1;
        if (status === 'Não enviado para validação do coordenador') naoEnviadoParaValidacao += 1;
      }
      if (envio && !devolutiva) emValidacao += 1;
      if (devolutiva) devolvidas += 1;
      // Tabela principal: só conta como atrasada a pendência ainda em aberto (sem devolutiva)
      // com prazo vencido. Devoluções fora do prazo já concluídas não contam aqui — elas
      // continuam aparecendo como "Devolvida com atraso" apenas no detalhamento.
      if (status === 'Prazo atrasado') atrasadas += 1;
    });

    const quantidade = registros.length;

    let status;
    if (atrasadas > 0) {
      status = 'Com atrasos';
    } else if (emValidacao > 0) {
      status = 'Em validação';
    } else if (aguardandoElaborador > 0) {
      status = 'Aguardando elaborador';
    } else if (naoEnviadoParaValidacao > 0) {
      status = 'Não enviado para validação do coordenador';
    } else if (devolvidas === quantidade) {
      status = 'Concluído';
    } else {
      status = 'Em andamento';
    }

    linhas.push({ coordenador, quantidade, naoEnviadas, emValidacao, devolvidas, atrasadas, status, registros });
  });

  return linhas.sort((a, b) => {
    if (b.atrasadas !== a.atrasadas) return b.atrasadas - a.atrasadas;
    if (b.emValidacao !== a.emValidacao) return b.emValidacao - a.emValidacao;
    if (b.naoEnviadas !== a.naoEnviadas) return b.naoEnviadas - a.naoEnviadas;
    if (b.quantidade !== a.quantidade) return b.quantidade - a.quantidade;
    return a.coordenador.localeCompare(b.coordenador, 'pt-BR');
  });
}

// Classe do badge para o status geral do coordenador na tabela principal (distinto do status
// por demanda usado no detalhamento, que continua usando badgeClassForStatusCoordenador)
function badgeClassForStatusGeralCoordenador(status) {
  const map = {
    'Com atrasos': 'badge-coord-atrasado',
    'Em validação': 'badge-coord-aguardando',
    'Aguardando elaborador': 'badge-coord-nao-enviado',
    'Não enviado para validação do coordenador': 'badge-coord-nao-enviado-validacao',
    Concluído: 'badge-coord-no-prazo',
    'Em andamento': 'badge-coord-andamento'
  };
  return map[status] || '';
}

// Ordena as demandas de um coordenador para a lista expandida: primeiro por tipo de AV, na
// ordem fixa AV1 > AV2 > 2º CHAMADA > REC-SEM > REC-FIM (normalizado via
// normalizarTipoAvPerformance/ORDEM_TIPO_AV_PERFORMANCE, já usados em outros pontos do
// painel); depois, dentro do mesmo tipo de AV, por prioridade de status (Prazo atrasado >
// Devolvida com atraso > Aguardando análise > Devolvida no prazo), e por fim pelo prazo
// mais antigo primeiro
const PRIORIDADE_STATUS_DETALHE_COORDENADOR = {
  'Prazo atrasado': 1,
  'Devolvida com atraso': 2,
  'Aguardando análise': 3,
  'Devolvida no prazo': 4,
  'Não enviado para validação do coordenador': 5,
  'Aguardando elaborador': 6
};

function ordenarDetalheCoordenador(registros) {
  return [...registros].sort((a, b) => {
    const tipoAvA = normalizarTipoAvPerformance(a.tipo_av);
    const tipoAvB = normalizarTipoAvPerformance(b.tipo_av);
    const ordemTipoAvA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAvA);
    const ordemTipoAvB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAvB);
    const posicaoA = ordemTipoAvA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : ordemTipoAvA;
    const posicaoB = ordemTipoAvB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : ordemTipoAvB;
    if (posicaoA !== posicaoB) return posicaoA - posicaoB;

    const prioridadeA = PRIORIDADE_STATUS_DETALHE_COORDENADOR[identificarStatusCoordenador(a)] || 99;
    const prioridadeB = PRIORIDADE_STATUS_DETALHE_COORDENADOR[identificarStatusCoordenador(b)] || 99;
    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

    const prazoA = parseBrDate(a.prazo_coord);
    const prazoB = parseBrDate(b.prazo_coord);
    if (!prazoA && !prazoB) return 0;
    if (!prazoA) return 1;
    if (!prazoB) return -1;
    return prazoA.getTime() - prazoB.getTime();
  });
}

// Alterna a expansão da lista de demandas de um coordenador: se já estava aberto, fecha;
// senão, abre o novo (fechando qualquer outro que estivesse aberto). O filtro por tipo de AV
// é global à aba Coordenador e não é afetado por essa troca.
function alternarDetalheCoordenador(coordenador) {
  coordenadorExpandido = coordenadorExpandido === coordenador ? null : coordenador;
  renderizarVisaoCoordenador();
}

// Seleciona o filtro global de tipo de AV da aba Coordenador ("Todas" = null): afeta a
// tabela principal de coordenadores e, por consequência, as demandas do coordenador expandido
function selecionarFiltroTipoAvGlobalCoordenador(tipoAv) {
  coordFiltroTipoAvGlobal = tipoAv;
  renderizarVisaoCoordenador();
}

// Opções do filtro "Filtrar por avaliação" da aba Coordenador, na ordem de exibição pedida
// ("Todas" primeiro, seguida da ordem fixa de tipo de AV já usada na aba Elaborador)
const OPCOES_FILTRO_TIPO_AV_COORDENADOR = ['Todas', ...ORDEM_TIPO_AV_PERFORMANCE];

// Renderiza a barra de filtro global "Filtrar por avaliação:" no topo da seção (acima da
// tabela principal), com um botão pill por tipo de AV (normalizado)
function renderizarFiltroAvaliacaoCoordenador() {
  const container = dom.coordFiltroAvaliacaoTopo;
  container.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'coord-detail-filter-label';
  label.textContent = 'Filtrar por avaliação:';
  container.appendChild(label);

  OPCOES_FILTRO_TIPO_AV_COORDENADOR.forEach((opcao) => {
    const valor = opcao === 'Todas' ? null : opcao;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'coord-detail-filter-btn';
    btn.classList.toggle('active', coordFiltroTipoAvGlobal === valor);
    btn.textContent = opcao;
    btn.addEventListener('click', () => selecionarFiltroTipoAvGlobalCoordenador(valor));
    container.appendChild(btn);
  });
}

// Monta a linha expandida com as demandas de um coordenador (título + tabela de detalhe).
// "registros" já vem filtrado pelo filtro global de tipo de AV, aplicado na tabela principal.
function criarLinhaDetalheCoordenador(coordenador, registros) {
  const trDetalhe = document.createElement('tr');
  trDetalhe.className = 'coord-detail-row';

  const tdDetalhe = document.createElement('td');
  tdDetalhe.colSpan = 7;

  const painel = document.createElement('div');
  painel.className = 'coord-detail-panel';

  const titulo = document.createElement('h4');
  titulo.className = 'coord-detail-title';
  titulo.textContent = `Pendências de ${coordenador}`;
  painel.appendChild(titulo);

  const registrosFiltrados = registros;

  if (registrosFiltrados.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-detail-empty';
    vazio.textContent = 'Nenhuma demanda encontrada para este tipo de avaliação.';
    painel.appendChild(vazio);
    tdDetalhe.appendChild(painel);
    trDetalhe.appendChild(tdDetalhe);
    return trDetalhe;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper coord-detail-table-scroll';

  const table = document.createElement('table');
  table.className = 'data-table data-table-compact';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  ['Módulo', 'Ano', 'Disciplina', 'Tipo de AV', 'Data de envio', 'Prazo', 'Data da devolutiva', 'Dias', 'Status'].forEach(
    (texto) => {
      const th = document.createElement('th');
      th.textContent = texto;
      trHead.appendChild(th);
    }
  );
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbodyDetalhe = document.createElement('tbody');
  const ordenados = ordenarDetalheCoordenador(registrosFiltrados);

  ordenados.forEach((record) => {
    const trItem = document.createElement('tr');
    const dias = calcularDiasCoordenador(record);
    const status = identificarStatusCoordenador(record);

    [
      safe(record.modulo),
      safe(record.ano),
      safe(record.frente),
      safe(record.tipo_av),
      safe(record.data_envio_coord),
      safe(record.prazo_coord),
      safe(record.devolutiva_coord)
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor || '-';
      trItem.appendChild(td);
    });

    const tdDias = document.createElement('td');
    tdDias.className = 'coord-dias-cell';
    if (dias !== null && dias > 0) tdDias.classList.add('coord-dias-cell--atraso');
    if (dias !== null && dias < 0) tdDias.classList.add('coord-dias-cell--folga');
    tdDias.textContent = formatarDiasCoordenador(dias);
    trItem.appendChild(tdDias);

    const tdStatus = document.createElement('td');
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `badge ${badgeClassForStatusCoordenador(status)}`;
    // Apenas o texto exibido no detalhe muda: "Aguardando análise" aparece como "Em validação",
    // sem afetar o valor de status usado em cálculos, ordenação, filtros ou na tabela principal
    badgeStatus.textContent = status === 'Aguardando análise' ? 'Em validação' : status;
    if (DICA_STATUS_COORDENADOR[status]) {
      badgeStatus.title = DICA_STATUS_COORDENADOR[status];
    }
    tdStatus.appendChild(badgeStatus);
    trItem.appendChild(tdStatus);

    tbodyDetalhe.appendChild(trItem);
  });

  table.appendChild(tbodyDetalhe);
  wrapper.appendChild(table);
  painel.appendChild(wrapper);
  tdDetalhe.appendChild(painel);
  trDetalhe.appendChild(tdDetalhe);

  return trDetalhe;
}

// Renderiza a tabela operacional da aba Coordenador: uma linha por coordenador, com os
// totais de demandas/recebidas/pendentes/atrasadas e o status geral predominante. Clicar no
// nome do coordenador expande, logo abaixo, a lista de demandas daquele coordenador.
function renderizarTabelaCoordenador(records) {
  const tbody = dom.tableBodyCoordenador;
  tbody.innerHTML = '';

  if (records.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'indicadores-tabela-vazia';
    td.textContent = 'Nenhum registro encontrado.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const linhas = calcularResumoPorCoordenador(records);
  const fragment = document.createDocumentFragment();

  linhas.forEach((linha) => {
    const expandido = coordenadorExpandido === linha.coordenador;

    const tr = document.createElement('tr');
    tr.className = 'coord-table-row';
    tr.classList.toggle('coord-table-row--ativa', expandido);

    const tdCoordenador = document.createElement('td');
    tdCoordenador.className = 'coord-col-td--planejamento';
    const nomeClicavel = document.createElement('button');
    nomeClicavel.type = 'button';
    nomeClicavel.className = 'coord-coordenador-nome';
    nomeClicavel.setAttribute('aria-expanded', String(expandido));

    const chevron = document.createElement('span');
    chevron.className = 'coord-coordenador-chevron';
    chevron.textContent = expandido ? '▾' : '▸';
    chevron.setAttribute('aria-hidden', 'true');

    nomeClicavel.appendChild(chevron);
    nomeClicavel.appendChild(document.createTextNode(linha.coordenador));
    nomeClicavel.addEventListener('click', () => alternarDetalheCoordenador(linha.coordenador));
    tdCoordenador.appendChild(nomeClicavel);
    tr.appendChild(tdCoordenador);

    const tdQuantidade = document.createElement('td');
    tdQuantidade.className = 'coord-col-td--planejamento';
    tdQuantidade.textContent = linha.quantidade;
    tr.appendChild(tdQuantidade);

    const tdNaoEnviadas = document.createElement('td');
    tdNaoEnviadas.className = 'coord-col-td--planejamento coord-col-td--divisor';
    tdNaoEnviadas.textContent = linha.naoEnviadas;
    tr.appendChild(tdNaoEnviadas);

    [linha.emValidacao, linha.devolvidas, linha.atrasadas].forEach((valor) => {
      const td = document.createElement('td');
      td.className = 'coord-col-td--validacao';
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdStatus = document.createElement('td');
    tdStatus.className = 'coord-col-td--validacao';
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `badge ${badgeClassForStatusGeralCoordenador(linha.status)}`;
    badgeStatus.textContent = linha.status;
    tdStatus.appendChild(badgeStatus);
    tr.appendChild(tdStatus);

    fragment.appendChild(tr);

    if (expandido) {
      fragment.appendChild(criarLinhaDetalheCoordenador(linha.coordenador, linha.registros));
    }
  });

  tbody.appendChild(fragment);
}

// Renderiza toda a aba Coordenador (cards + tabela) a partir dos registros já filtrados
// (globais + popover + busca + filtro rápido do card)
function renderizarVisaoCoordenador() {
  populateCoordFilterOptions(filteredRecords);
  populateIndicadoresFilterOptionsCoord(filteredRecords);
  atualizarIndicadorFiltrosCoordenador();
  atualizarDestaqueCardsCoordenador();
  renderizarFiltroAvaliacaoCoordenador();

  const records = obterRegistrosFiltradosCoordenador();

  // Filtro "Filtrar por avaliação" (Todas/AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM): uma única base
  // filtrada, usada tanto pelos cards do topo quanto pela tabela e pelos detalhes expandidos
  // dos coordenadores, para que tudo fique sempre consistente entre si.
  const baseFiltradaPorTipoAv = coordFiltroTipoAvGlobal
    ? records.filter((record) => normalizarTipoAvPerformance(record.tipo_av) === coordFiltroTipoAvGlobal)
    : records;

  if (records.length === 0 && filteredRecords.length > 0) {
    dom.coordEmptyGeral.hidden = false;
    dom.coordConteudo.hidden = true;
    renderizarCardsCoordenador(baseFiltradaPorTipoAv);
    return;
  }
  dom.coordEmptyGeral.hidden = true;
  dom.coordConteudo.hidden = false;

  renderizarCardsCoordenador(baseFiltradaPorTipoAv);
  renderizarTabelaCoordenador(baseFiltradaPorTipoAv);
}

// --- Aba Coordenador: Indicadores (painel analítico do fluxo de validação) ---

const domIndCoord = {
  emptyGeral: document.getElementById('indCoordEmptyGeral'),
  conteudo: document.getElementById('indCoordConteudo'),
  filtrosAtivos: document.getElementById('indCoordFiltrosAtivos'),
  filtrosAtivosLista: document.getElementById('indCoordFiltrosAtivosLista'),
  btnLimparFiltros: document.getElementById('btnLimparFiltrosIndicadoresCoord'),
  mediaAtraso: document.getElementById('indCoordMediaAtraso'),
  maiorAtraso: document.getElementById('indCoordMaiorAtraso'),
  maiorAtrasoSub: document.getElementById('indCoordMaiorAtrasoSub'),
  maisAtrasa: document.getElementById('indCoordMaisAtrasa'),
  maisAtrasaSub: document.getElementById('indCoordMaisAtrasaSub'),
  pctForaPrazo: document.getElementById('indCoordPctForaPrazo'),
  pctNoPrazo: document.getElementById('indCoordPctNoPrazo')
};

// Navegação interna da aba Coordenador: Acompanhamento <-> Indicadores
function mostrarIndicadoresCoordenador() {
  visaoCoordenador = 'indicadores';
  viewCoordenadorAcompanhamento.hidden = true;
  viewCoordenadorIndicadores.hidden = false;
  btnIndicadoresCoord.classList.add('is-active');
  btnIndicadoresCoord.setAttribute('aria-pressed', 'true');
  // O botão "Indicadores" não faz sentido dentro da própria tela de indicadores
  btnIndicadoresCoord.hidden = true;

  // Na barra superior, o título "Painel de Avaliações SGGE" dá lugar ao botão
  // "← Voltar ao acompanhamento"
  appHeaderTitles.hidden = true;
  btnVoltarAcompanhamentoCoord.hidden = false;

  // O botão de filtro do Acompanhamento some; o botão de filtro dos Indicadores aparece
  fecharPopoverFiltrosCoordenador();
  coordFilterPopoverWrapper.hidden = true;
  indFilterPopoverWrapperCoord.hidden = false;
  indModuloRapidoWrapperCoord.hidden = false;

  renderizarIndicadoresCoordenador(obterRegistrosFiltradosCoordenador());
}

function mostrarAcompanhamentoCoordenador() {
  // Mesmo tratamento do atalho de Elaborador acima: se veio de "Indicador do Processo →
  // Coordenador" (data-tab "indicador-coordenador"), reencaminha para a aba normal
  // "Coordenador" via trocarAba, mantendo abaAtual/menu lateral coerentes com a tela mostrada
  if (abaAtual === 'indicador-coordenador') {
    trocarAba('coordenador');
    return;
  }

  visaoCoordenador = 'acompanhamento';
  viewCoordenadorAcompanhamento.hidden = false;
  viewCoordenadorIndicadores.hidden = true;
  btnIndicadoresCoord.classList.remove('is-active');
  btnIndicadoresCoord.setAttribute('aria-pressed', 'false');
  btnIndicadoresCoord.hidden = false;

  // Restaura o título da barra superior
  appHeaderTitles.hidden = false;
  btnVoltarAcompanhamentoCoord.hidden = true;

  fecharPopoverFiltrosIndicadoresTopoCoord();
  indFilterPopoverWrapperCoord.hidden = true;
  indModuloRapidoWrapperCoord.hidden = true;
  coordFilterPopoverWrapper.hidden = false;
  renderizarVisaoCoordenador();
}

// Calcula o atraso em dias de uma validação de coordenador para os Indicadores:
// - devolutiva preenchida: devolutiva - prazo (pode ser negativo, validado adiantado);
// - devolutiva vazia e prazo já vencido: hoje - prazo;
// - devolutiva vazia e prazo ainda não vencido: 0.
// Atraso, para fins de média/ranking, só existe quando o resultado é > 0.
function calcularDiasAtrasoCoordenador(record) {
  const prazo = parseBrDate(record.prazo_coord);
  if (!prazo) return 0;

  const devolutiva = parseBrDate(record.devolutiva_coord);
  if (devolutiva) {
    return Math.round((devolutiva.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (hoje.getTime() <= prazo.getTime()) return 0;
  return Math.round((hoje.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
}

// Alias com nome próprio da aba Coordenador para a mesma lógica de atraso usada nos cards,
// reaproveitada pelo gráfico "Desempenho do coordenador"
function calcularAtrasoValidacaoCoordenador(record) {
  return calcularDiasAtrasoCoordenador(record);
}

// Padroniza o tipo de AV para o gráfico "Total de provas enviadas para validação" (mesma
// lógica de normalização já usada na aba Elaborador, com nome próprio para a aba Coordenador)
function normalizarTipoAvaliacao(tipo) {
  return normalizarTipoAvPerformance(tipo);
}

// Popula os selects de Ano, Disciplina, Coordenador e Tipo de AV do popover de filtros
// no topo da seção Indicadores — Coordenador (a partir do recorte completo da aba)
function populateIndicadoresFilterOptionsCoord(records) {
  populateCheckboxGroupField(indCheckboxGroupsCoord.ano, records, 'ano', filtrosIndicadoresTopoCoord.anos);
  populateCheckboxGroupField(indCheckboxGroupsCoord.disciplina, records, 'frente', filtrosIndicadoresTopoCoord.disciplinas);
  populateCheckboxGroupField(indCheckboxGroupsCoord.coordenador, records, 'coordenador', filtrosIndicadoresTopoCoord.coordenadores);
  populateCheckboxGroupTipoAv(indCheckboxGroupsCoord.tipoAv, records, filtrosIndicadoresTopoCoord.tiposAv);
  populateSelectOptions(indSelectFiltersCoord.modulo, records, 'modulo', 'Módulo');
}

// Aplica os filtros do popover de topo da seção Indicadores — Coordenador (Ano, Disciplina,
// Coordenador, Tipo de AV e busca), por cima do recorte já filtrado pelo popover/busca/card
// da aba Coordenador
function aplicarFiltrosIndicadoresTopoCoord(dados, { ignorarCoordenador = false } = {}) {
  const modulo = indSelectFiltersCoord.modulo.value;
  const busca = safe(indFilterBuscaCoord.value).toLowerCase();

  return dados.filter((record) => {
    if (!passaFiltroMultiplo(safe(record.ano), filtrosIndicadoresTopoCoord.anos)) return false;
    if (!passaFiltroMultiplo(safe(record.frente), filtrosIndicadoresTopoCoord.disciplinas)) return false;
    if (
      !ignorarCoordenador &&
      !passaFiltroMultiplo(safe(record.coordenador), filtrosIndicadoresTopoCoord.coordenadores)
    ) {
      return false;
    }
    if (!passaFiltroMultiplo(safe(record.tipo_av), filtrosIndicadoresTopoCoord.tiposAv)) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;

    if (busca) {
      const matchesBusca = Object.values(record).some((value) =>
        safe(value).toLowerCase().includes(busca)
      );
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Aplica os filtros interativos ativados ao clicar em itens dos gráficos
function aplicarFiltrosIndicadoresCoordenador(dados, { ignorarCoordenador = false } = {}) {
  return dados.filter((item) => {
    if (
      filtrosIndicadoresCoordenador.tipoAv &&
      normalizarTipoAvaliacao(item.tipo_av) !== filtrosIndicadoresCoordenador.tipoAv
    ) {
      return false;
    }
    if (
      !ignorarCoordenador &&
      filtrosIndicadoresCoordenador.coordenador &&
      safe(item.coordenador) !== filtrosIndicadoresCoordenador.coordenador
    ) {
      return false;
    }
    if (
      filtrosIndicadoresCoordenador.classificacao &&
      classificarDevolutivaCoordenador(item) !== filtrosIndicadoresCoordenador.classificacao
    ) {
      return false;
    }
    return true;
  });
}

// Liga/desliga (toggle) um filtro interativo (clique em gráfico) e recalcula a seção
function alternarFiltroIndicadorCoordenador(campo, valor) {
  filtrosIndicadoresCoordenador[campo] = filtrosIndicadoresCoordenador[campo] === valor ? null : valor;
  renderizarIndicadoresCoordenador(indicadoresCoordenadorDadosBase);
}

// Remove todos os filtros internos dos Indicadores — Coordenador
function limparFiltrosIndicadoresCoordenador() {
  filtrosIndicadoresCoordenador = { tipoAv: null, coordenador: null, classificacao: null };
  renderizarIndicadoresCoordenador(indicadoresCoordenadorDadosBase);
}

const ROTULOS_FILTROS_INDICADORES_COORDENADOR = {
  tipoAv: 'Avaliação',
  coordenador: 'Coordenador',
  classificacao: 'Classificação'
};

// Renderiza a área de badges "Filtros ativos:" dos Indicadores — Coordenador
function renderizarFiltrosAtivosIndicadoresCoordenador() {
  const lista = domIndCoord.filtrosAtivosLista;
  lista.innerHTML = '';

  const ativos = Object.entries(filtrosIndicadoresCoordenador).filter(([, valor]) => valor);
  domIndCoord.filtrosAtivos.hidden = ativos.length === 0;

  ativos.forEach(([campo, valor]) => {
    const badge = document.createElement('span');
    badge.className = 'indicadores-filtro-badge';

    const texto = document.createElement('span');
    texto.textContent = `${ROTULOS_FILTROS_INDICADORES_COORDENADOR[campo]}: ${valor}`;
    badge.appendChild(texto);

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'indicadores-filtro-badge-remover';
    remover.setAttribute('aria-label', `Remover filtro de ${ROTULOS_FILTROS_INDICADORES_COORDENADOR[campo]}`);
    remover.textContent = '✕';
    remover.addEventListener('click', () => alternarFiltroIndicadorCoordenador(campo, valor));
    badge.appendChild(remover);

    lista.appendChild(badge);
  });
}

// Calcula os indicadores usados pelos cards executivos a partir dos registros já filtrados.
// Considera apenas devolutivas do coordenador já REALIZADAS (devolutiva_coord preenchida) —
// pendências sem devolutiva_coord, mesmo com prazo_coord vencido, não entram em nenhum card.
function calcularIndicadoresCoordenador(dados) {
  const atrasados = [];
  let foraDoPrazo = 0;
  let noPrazo = 0;
  const rankingMap = new Map();
  let maiorAtraso = 0;
  let registroMaiorAtraso = null;

  const entregasRealizadas = dados.filter((record) => safe(record.devolutiva_coord));

  entregasRealizadas.forEach((record) => {
    const dias = calcularDiasAtrasoCoordenador(record);

    if (dias > 0) {
      foraDoPrazo += 1;
      atrasados.push(dias);

      const coordenador = safe(record.coordenador) || 'Não informado';
      if (!rankingMap.has(coordenador)) {
        rankingMap.set(coordenador, { categoria: coordenador, totalAtrasoDias: 0, ocorrencias: 0 });
      }
      const grupo = rankingMap.get(coordenador);
      grupo.totalAtrasoDias += dias;
      grupo.ocorrencias += 1;

      if (dias > maiorAtraso) {
        maiorAtraso = dias;
        registroMaiorAtraso = record;
      }
    } else {
      noPrazo += 1;
    }
  });

  const mediaAtraso = atrasados.length ? Math.round(atrasados.reduce((a, b) => a + b, 0) / atrasados.length) : 0;

  const ranking = Array.from(rankingMap.values())
    .map((grupo) => ({ ...grupo, mediaAtraso: grupo.totalAtrasoDias / grupo.ocorrencias }))
    .sort((a, b) => {
      if (b.totalAtrasoDias !== a.totalAtrasoDias) return b.totalAtrasoDias - a.totalAtrasoDias;
      if (b.ocorrencias !== a.ocorrencias) return b.ocorrencias - a.ocorrencias;
      return b.mediaAtraso - a.mediaAtraso;
    });
  const coordenadorTop = ranking.length ? ranking[0] : null;

  const totalRealizado = entregasRealizadas.length;
  const pctForaPrazo = totalRealizado ? (foraDoPrazo / totalRealizado) * 100 : 0;
  const pctNoPrazo = totalRealizado ? (noPrazo / totalRealizado) * 100 : 0;

  return {
    mediaAtraso,
    maiorAtraso,
    coordenadorMaiorAtraso: registroMaiorAtraso ? safe(registroMaiorAtraso.coordenador) || 'Não informado' : null,
    coordenadorTop,
    qtdForaPrazo: foraDoPrazo,
    qtdNoPrazo: noPrazo,
    pctForaPrazo,
    pctNoPrazo
  };
}

function renderizarCardsIndicadoresCoordenador(indicadores) {
  domIndCoord.mediaAtraso.textContent = indicadores.qtdForaPrazo ? `${indicadores.mediaAtraso} dias` : '0 dias';
  domIndCoord.maiorAtraso.textContent = `${indicadores.maiorAtraso} dias`;
  domIndCoord.maiorAtrasoSub.textContent = indicadores.coordenadorMaiorAtraso || 'Sem atrasos no recorte';

  if (indicadores.coordenadorTop) {
    domIndCoord.maisAtrasa.textContent = indicadores.coordenadorTop.categoria;
    domIndCoord.maisAtrasaSub.textContent =
      `${indicadores.coordenadorTop.totalAtrasoDias} dias acumulados · ` +
      `${indicadores.coordenadorTop.ocorrencias} ocorrência(s)`;
  } else {
    domIndCoord.maisAtrasa.textContent = 'Sem atrasos';
    domIndCoord.maisAtrasaSub.textContent = 'Nenhuma validação atrasada no recorte';
  }

  domIndCoord.pctForaPrazo.textContent =
    `${indicadores.qtdForaPrazo} (${formatarPercentualComVirgula(indicadores.pctForaPrazo)}%)`;
  domIndCoord.pctNoPrazo.textContent =
    `${indicadores.qtdNoPrazo} (${formatarPercentualComVirgula(indicadores.pctNoPrazo)}%)`;
}

// Agrupa por coordenador (vazio -> "Não informado") e soma os dias de atraso positivos
// (mesma regra de calcularAtrasoValidacaoCoordenador), a quantidade de ocorrências atrasadas
// e a média de atraso (diasAcumulados / ocorrências). Base compartilhada pelos dois rankings
// de atraso por coordenador (por média e por ocorrências).
// Agrupa TODAS as devolutivas realizadas do coordenador (não só as atrasadas) — a média inclui
// atrasos (dias > 0), entregas no prazo (dias = 0) e antecipações (dias < 0). Só entram
// registros com devolutiva_coord E prazo_coord preenchidos e válidos.
function agruparAtrasoPorCoordenador(dados) {
  const grupos = new Map();

  dados.forEach((record) => {
    const devolutiva = safe(record.devolutiva_coord);
    const prazoStr = safe(record.prazo_coord);
    if (!devolutiva || !prazoStr) return;

    const dataDevolutiva = parseBrDate(devolutiva);
    const dataPrazo = parseBrDate(prazoStr);
    if (!dataDevolutiva || !dataPrazo) return;

    const dias = Math.round((dataDevolutiva.getTime() - dataPrazo.getTime()) / (1000 * 60 * 60 * 24));

    const coordenador = safe(record.coordenador) || 'Não informado';
    if (!grupos.has(coordenador)) {
      grupos.set(coordenador, { coordenador, diasAcumulados: 0, ocorrencias: 0, ocorrenciasAtraso: 0 });
    }
    const grupo = grupos.get(coordenador);
    grupo.diasAcumulados += dias;
    grupo.ocorrencias += 1;
    // "ocorrencias" = total de devolutivas realizadas (base da média); "ocorrenciasAtraso" =
    // só as fora do prazo (dias > 0) — exibido como "N ocorr." no gráfico de ranking
    if (dias > 0) grupo.ocorrenciasAtraso += 1;
  });

  return Array.from(grupos.values()).map((grupo) => ({
    ...grupo,
    mediaAtraso: grupo.ocorrencias ? grupo.diasAcumulados / grupo.ocorrencias : 0
  }));
}

// Ranking "Ranking de atraso por coordenador": ordenado pela maior MÉDIA de atraso >
// maior quantidade de ocorrências > ordem alfabética
function calcularRankingMediaAtrasoCoordenador(dados) {
  return agruparAtrasoPorCoordenador(dados).sort((a, b) => {
    if (b.mediaAtraso !== a.mediaAtraso) return b.mediaAtraso - a.mediaAtraso;
    if (b.ocorrencias !== a.ocorrencias) return b.ocorrencias - a.ocorrencias;
    return a.coordenador.localeCompare(b.coordenador, 'pt-BR');
  });
}

// Classifica a devolutiva da 1ª Validação de um registro (devolutiva_coord vs. prazo_coord) em
// 'Atrasado'/'No Prazo'/'Antecipado', ou null quando não há devolutiva_coord/prazo_coord válidos
// para classificar. Usada pelo gráfico de pizza e pelo filtro de classificação da aba Coordenador.
function classificarDevolutivaCoordenador(record) {
  const devolutiva = safe(record.devolutiva_coord);
  const prazoStr = safe(record.prazo_coord);
  if (!devolutiva || !prazoStr) return null;

  const dataDevolutiva = parseBrDate(devolutiva);
  const dataPrazo = parseBrDate(prazoStr);
  if (!dataDevolutiva || !dataPrazo) return null;

  const dias = Math.round((dataDevolutiva.getTime() - dataPrazo.getTime()) / (1000 * 60 * 60 * 24));
  if (dias > 0) return 'Atrasado';
  if (dias < 0) return 'Antecipado';
  return 'No Prazo';
}

// Distribuição das devolutivas da 1ª Validação por classificação (Atrasado/No Prazo/Antecipado).
// Base do gráfico "Distribuição das devolutivas da 1ª Validação".
function calcularDistribuicaoPrimeiraValidacaoCoordenador(dados) {
  let atrasado = 0;
  let noPrazo = 0;
  let antecipado = 0;

  dados.forEach((record) => {
    const classificacao = classificarDevolutivaCoordenador(record);
    if (classificacao === 'Atrasado') atrasado += 1;
    else if (classificacao === 'No Prazo') noPrazo += 1;
    else if (classificacao === 'Antecipado') antecipado += 1;
  });

  const total = atrasado + noPrazo + antecipado;
  const itens = [
    { categoria: 'Atrasado', ocorrencias: atrasado },
    { categoria: 'No Prazo', ocorrencias: noPrazo },
    { categoria: 'Antecipado', ocorrencias: antecipado }
  ].map((item) => ({ ...item, percentual: total ? (item.ocorrencias / total) * 100 : 0 }));

  return { total, itens };
}

// Gráfico "Ranking de atraso por coordenador": barras horizontais pela MÉDIA de atraso,
// clicável por coordenador como filtro rápido (reaproveita filtrosIndicadoresCoordenador.coordenador)
function renderizarGraficoRankingMediaAtrasoCoordenador(ranking) {
  const container = document.getElementById('graficoRankingMediaAtrasoCoord');
  container.innerHTML = '';

  if (ranking.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-chart-empty';
    vazio.textContent = 'Não há devolutivas realizadas no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  // Escala pelo maior valor absoluto (a média agora pode ser negativa, quando o coordenador
  // antecipa em média) — nunca pelo maior valor "bruto", que esconderia barras negativas maiores
  const maiorAbsoluto = Math.max(...ranking.map((grupo) => Math.abs(grupo.mediaAtraso)), 0);
  const filtroAtivo = filtrosIndicadoresCoordenador.coordenador;

  ranking.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-ranking-row';
    const selecionada = filtroAtivo === grupo.coordenador;
    row.classList.toggle('coord-ranking-row--ativa', selecionada);
    row.classList.toggle('coord-ranking-row--esmaecida', filtroAtivo !== null && !selecionada);
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.title =
      `${grupo.coordenador}: ${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias médios · ` +
      `${grupo.ocorrenciasAtraso} ocorrência(s) fora do prazo`;

    const label = document.createElement('span');
    label.className = 'coord-ranking-label';
    label.textContent = grupo.coordenador;

    const track = document.createElement('div');
    track.className = 'coord-ranking-track';
    const fill = document.createElement('div');
    // Positivo = tendência de atraso (vermelho); zero = neutro; negativo = tendência de
    // antecipação (verde)
    const corFill =
      grupo.mediaAtraso > 0 ? 'coord-ranking-fill--atraso'
      : grupo.mediaAtraso < 0 ? 'coord-ranking-fill--antecipado'
      : 'coord-ranking-fill--noprazo';
    fill.className = `coord-ranking-fill ${corFill}`;
    fill.style.width = `${maiorAbsoluto ? (Math.abs(grupo.mediaAtraso) / maiorAbsoluto) * 100 : 0}%`;
    track.appendChild(fill);

    // "ocorr." = só as devolutivas fora do prazo (dias > 0); a média ao lado continua
    // considerando todas as devolutivas realizadas (atrasadas + no prazo + antecipadas)
    const value = document.createElement('span');
    value.className = 'coord-ranking-value';
    value.textContent =
      `${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias médios · ${grupo.ocorrenciasAtraso} ocorr.`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);

    const clique = () => alternarFiltroIndicadorCoordenador('coordenador', grupo.coordenador);
    row.addEventListener('click', clique);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clique();
      }
    });

    container.appendChild(row);
  });
}

// Classes CSS de cor por categoria, usadas nas fatias do donut e nos pontos da legenda de
// "Distribuição das devolutivas da 1ª Validação"
const CORES_DONUT_PRIMEIRA_VALIDACAO = {
  'Atrasado': 'coord-donut-tipoav-fatia--atrasado',
  'No Prazo': 'coord-donut-tipoav-fatia--noprazo',
  'Antecipado': 'coord-donut-tipoav-fatia--antecipado'
};

// Monta o texto do tooltip (categoria + quantidade + percentual) exibido ao passar o mouse
// sobre a fatia do donut ou o item da legenda
function montarTooltipPrimeiraValidacao(categoria, quantidade, percentual) {
  return `${categoria}\n${quantidade} devolutiva(s)\n${formatarPercentualComVirgula(percentual)}% do total`;
}

// Gráfico "Distribuição das devolutivas da 1ª Validação": donut com 3 fatias fixas
// (Atrasado/No Prazo/Antecipado), a partir do resultado de
// calcularDistribuicaoPrimeiraValidacaoCoordenador. Centro do donut mostra o total de
// devolutivas classificadas. Reaproveita a estrutura visual (prefixo coord-donut-tipoav-) do
// antigo donut "Distribuição dos atrasos por avaliação" — clicável por fatia/legenda, mesmo
// filtro (filtrosIndicadoresCoordenador.classificacao via alternarFiltroIndicadorCoordenador).
function renderizarGraficoPrimeiraValidacaoCoordenador(distribuicao) {
  const container = document.getElementById('graficoPrimeiraValidacaoCoord');
  container.innerHTML = '';

  if (distribuicao.total === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-chart-empty';
    vazio.textContent = 'Não há devolutivas da 1ª Validação no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  const tamanho = 220;
  const raio = 78;
  const espessura = 34;
  const centro = tamanho / 2;
  const circunferencia = 2 * Math.PI * raio;
  const filtroAtivo = filtrosIndicadoresCoordenador.classificacao;
  // Fatias menores que esse limite não recebem o rótulo % interno (não há espaço legível),
  // mas continuam aparecendo normalmente na legenda
  const LIMITE_PCT_ROTULO_INTERNO = 6;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${tamanho} ${tamanho}`);
  svg.setAttribute('class', 'coord-donut-tipoav-svg');

  const trilho = document.createElementNS(svgNS, 'circle');
  trilho.setAttribute('cx', centro);
  trilho.setAttribute('cy', centro);
  trilho.setAttribute('r', raio);
  trilho.setAttribute('fill', 'none');
  trilho.setAttribute('class', 'coord-donut-tipoav-trilho');
  trilho.setAttribute('stroke-width', espessura);
  svg.appendChild(trilho);

  // Cria uma fatia clicável, com tooltip nativo (<title>), realce da fatia ativa e
  // esmaecimento das demais quando há filtro de classificação ativo
  function criarFatia(categoria, tamanhoFatia, offset, quantidade, percentual) {
    const fatia = document.createElementNS(svgNS, 'circle');
    fatia.setAttribute('cx', centro);
    fatia.setAttribute('cy', centro);
    fatia.setAttribute('r', raio);
    fatia.setAttribute('fill', 'none');
    fatia.setAttribute(
      'class',
      `coord-donut-tipoav-fatia ${CORES_DONUT_PRIMEIRA_VALIDACAO[categoria]} coord-donut-tipoav-fatia--clicavel`
    );
    fatia.setAttribute('stroke-width', espessura);
    fatia.setAttribute('stroke-dasharray', `${tamanhoFatia} ${circunferencia - tamanhoFatia}`);
    fatia.setAttribute('stroke-dashoffset', -offset);
    fatia.setAttribute('transform', `rotate(-90 ${centro} ${centro})`);
    fatia.setAttribute('role', 'button');
    fatia.setAttribute('tabindex', '0');

    const selecionada = filtroAtivo === categoria;
    if (selecionada) fatia.classList.add('coord-donut-tipoav-fatia--ativa');
    else if (filtroAtivo !== null) fatia.classList.add('coord-donut-tipoav-fatia--esmaecida');

    const titulo = document.createElementNS(svgNS, 'title');
    titulo.textContent = montarTooltipPrimeiraValidacao(categoria, quantidade, percentual);
    fatia.appendChild(titulo);

    const clique = () => alternarFiltroIndicadorCoordenador('classificacao', categoria);
    fatia.addEventListener('click', clique);
    fatia.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clique();
      }
    });

    return fatia;
  }

  // Rótulo percentual centralizado dentro do arco da fatia (ponto médio do ângulo ocupado)
  function criarRotuloPercentual(offset, tamanhoFatia, percentual) {
    const anguloInicial = -90 + (offset / circunferencia) * 360;
    const anguloMedio = anguloInicial + ((tamanhoFatia / circunferencia) * 360) / 2;
    const radianos = (anguloMedio * Math.PI) / 180;
    const x = centro + raio * Math.cos(radianos);
    const y = centro + raio * Math.sin(radianos);

    const texto = document.createElementNS(svgNS, 'text');
    texto.setAttribute('x', x);
    texto.setAttribute('y', y);
    texto.setAttribute('text-anchor', 'middle');
    texto.setAttribute('dominant-baseline', 'middle');
    texto.setAttribute('class', 'coord-donut-tipoav-percent');
    texto.textContent = `${formatarPercentualComVirgula(percentual)}%`;
    return texto;
  }

  let offsetAcumulado = 0;
  const rotulos = [];
  distribuicao.itens.forEach((item) => {
    const tamanhoFatia = (item.percentual / 100) * circunferencia;
    if (item.ocorrencias > 0) {
      svg.appendChild(criarFatia(item.categoria, tamanhoFatia, offsetAcumulado, item.ocorrencias, item.percentual));
      if (item.percentual >= LIMITE_PCT_ROTULO_INTERNO) {
        rotulos.push(criarRotuloPercentual(offsetAcumulado, tamanhoFatia, item.percentual));
      }
    }
    offsetAcumulado += tamanhoFatia;
  });
  // Rótulos por cima de todas as fatias, para nunca ficarem cobertos
  rotulos.forEach((rotulo) => svg.appendChild(rotulo));

  const donutWrapper = document.createElement('div');
  donutWrapper.className = 'coord-donut-tipoav-donut';
  donutWrapper.appendChild(svg);

  const centroTexto = document.createElement('div');
  centroTexto.className = 'coord-donut-tipoav-center';
  centroTexto.innerHTML = `<strong>${distribuicao.total}</strong><span>DEVOLUTIVAS</span>`;
  donutWrapper.appendChild(centroTexto);

  const legenda = document.createElement('div');
  legenda.className = 'coord-donut-tipoav-legend';

  // Cria o card de legenda (também clicável, mesmo filtro da fatia correspondente)
  function criarItemLegenda(item) {
    const el = document.createElement('div');
    el.className = 'coord-donut-tipoav-legend-item';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.title = montarTooltipPrimeiraValidacao(item.categoria, item.ocorrencias, item.percentual);
    el.innerHTML =
      `<span class="coord-donut-tipoav-legend-dot ${CORES_DONUT_PRIMEIRA_VALIDACAO[item.categoria].replace('fatia', 'dot')}"></span>` +
      `<span class="coord-donut-tipoav-legend-label">${item.categoria}</span>` +
      `<span class="coord-donut-tipoav-legend-value">${item.ocorrencias} · ${formatarPercentualComVirgula(item.percentual)}%</span>`;

    const selecionada = filtroAtivo === item.categoria;
    if (selecionada) el.classList.add('coord-donut-tipoav-legend-item--ativa');
    else if (filtroAtivo !== null) el.classList.add('coord-donut-tipoav-legend-item--esmaecida');

    const clique = () => alternarFiltroIndicadorCoordenador('classificacao', item.categoria);
    el.addEventListener('click', clique);
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clique();
      }
    });

    return el;
  }

  distribuicao.itens.forEach((item) => legenda.appendChild(criarItemLegenda(item)));

  container.appendChild(donutWrapper);
  container.appendChild(legenda);
}

// Ordem pedagógica do "Ano" (6º→7º→8º→9º→1º→2º→3º), reaproveitada por várias seções/tabelas
const ORDEM_ANO_ESCOLAR_COORD = ['6º', '7º', '8º', '9º', '1º', '2º', '3º'];

// Tabela "Recorrência de atraso por coordenador": para cada coordenador (agrupado pelo campo
// coordenador), volume de atividades = TODOS os registros atribuídos a ele no recorte (não só
// os já devolvidos); enviadas com atraso = só devolutivas já enviadas (devolutiva_coord
// preenchida) cuja calcularAtrasoValidacaoCoordenador(item) > 0 — pendências ainda sem
// devolutiva NÃO entram aqui, mesmo que o prazo já tenha vencido. Média/maior atraso
// individual calculados só sobre essas devolutivas enviadas com atraso. Ordenada pela maior
// taxa de atraso (sem coluna/badge de classificação nesta tabela).
function gerarRecorrenciaAtrasoCoordenador(dados) {
  const grupos = agruparPorCampo(dados, 'coordenador');
  const linhas = [];

  grupos.forEach((registros, nome) => {
    const total = registros.length;
    const comAtraso = registros.filter((r) => safe(r.devolutiva_coord) && calcularAtrasoValidacaoCoordenador(r) > 0);
    const qtdComAtraso = comAtraso.length;
    const diasAcumulados = comAtraso.reduce((soma, r) => soma + calcularAtrasoValidacaoCoordenador(r), 0);
    const mediaAtraso = qtdComAtraso ? diasAcumulados / qtdComAtraso : 0;
    const maiorIndividual = qtdComAtraso
      ? Math.max(...comAtraso.map((r) => calcularAtrasoValidacaoCoordenador(r)))
      : 0;
    const taxa = total ? (qtdComAtraso / total) * 100 : 0;

    linhas.push({
      coordenador: nome,
      total,
      qtdComAtraso,
      taxa,
      diasAcumulados,
      mediaAtraso,
      maiorIndividual
    });
  });

  return linhas.sort((a, b) => {
    if (b.taxa !== a.taxa) return b.taxa - a.taxa;
    if (b.qtdComAtraso !== a.qtdComAtraso) return b.qtdComAtraso - a.qtdComAtraso;
    if (b.mediaAtraso !== a.mediaAtraso) return b.mediaAtraso - a.mediaAtraso;
    if (b.maiorIndividual !== a.maiorIndividual) return b.maiorIndividual - a.maiorIndividual;
    return a.coordenador.localeCompare(b.coordenador, 'pt-BR');
  });
}

// Renderiza a tabela "Recorrência de atraso por coordenador", no mesmo padrão visual (coluna
// "#" com ranking) da tabela "Recorrência de atraso por elaborador" — sem coluna/badge de
// classificação
function renderizarTabelaRecorrenciaCoordenador(linhas) {
  const tbody = document.getElementById('indicadoresRecorrenciaCoordBody');
  tbody.innerHTML = '';

  if (linhas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'indicadores-tabela-vazia';
    td.textContent = 'Nenhum registro encontrado.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  linhas.forEach((linha, indice) => {
    const tr = document.createElement('tr');
    tr.className = 'indicator-table-row';
    tr.classList.toggle('active', filtrosIndicadoresCoordenador.coordenador === linha.coordenador);
    tr.addEventListener('click', () => alternarFiltroIndicadorCoordenador('coordenador', linha.coordenador));
    tr.appendChild(criarCelulaRanking(linha.posicaoReal));
    [
      linha.coordenador,
      linha.total,
      linha.qtdComAtraso,
      `${formatarPercentualComVirgula(linha.taxa)}%`
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdMedia = document.createElement('td');
    tdMedia.textContent = `${formatarMediaAtrasoGrafico(linha.mediaAtraso)} dias`;
    tdMedia.title =
      `Média de atraso: ${formatarMediaAtrasoGrafico(linha.mediaAtraso)} dias\n` +
      `Ocorrências atrasadas: ${linha.qtdComAtraso}\n` +
      `Dias acumulados: ${linha.diasAcumulados}`;
    tr.appendChild(tdMedia);

    const tdMaiorIndividual = document.createElement('td');
    tdMaiorIndividual.textContent = linha.maiorIndividual;
    tr.appendChild(tdMaiorIndividual);

    tbody.appendChild(tr);
  });
}

// Calcula a diferença real (dias) entre devolutiva_coord e prazo_coord para uma demanda já
// validada pelo coordenador. Retorna null quando a demanda ainda não foi devolvida (sem
// devolutiva_coord) — nesse caso ela não entra na média, em vez de usar a data de hoje como
// proxy (o que inflava artificialmente a média com pendências antigas ainda em aberto).
function calcularDiasAtrasoValidacaoCoordenadorReal(record) {
  const prazo = parseBrDate(record.prazo_coord);
  const devolutiva = parseBrDate(record.devolutiva_coord);
  if (!prazo || !devolutiva) return null;
  return Math.round((devolutiva.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
}

// Calcula, por coordenador, o atraso médio real (soma dos dias de atraso/antecipação das
// demandas já validadas, dividida pela quantidade de demandas validadas — nunca a soma bruta)
// e o volume total de atividades. Valores negativos (devolução antes do prazo) são mantidos
// como estão, nunca zerados. Ordenado por maior média de atraso primeiro e, em empate, maior
// volume — inclui TODOS os coordenadores do recorte, mesmo com volume baixo ou sem nenhum atraso.
function calcularDesempenhoCoordenadores(dados) {
  const grupos = new Map();

  dados.forEach((record) => {
    const coordenador = safe(record.coordenador) || 'Não informado';
    if (!grupos.has(coordenador)) {
      grupos.set(coordenador, { categoria: coordenador, somaDias: 0, qtdComData: 0, qtdAtrasos: 0, volume: 0 });
    }
    const grupo = grupos.get(coordenador);
    grupo.volume += 1;

    const dias = calcularDiasAtrasoValidacaoCoordenadorReal(record);
    if (dias === null) return;

    grupo.somaDias += dias;
    grupo.qtdComData += 1;
    if (dias > 0) grupo.qtdAtrasos += 1;
  });

  return Array.from(grupos.values())
    .map((grupo) => ({
      categoria: grupo.categoria,
      atrasoMedio: grupo.qtdComData ? grupo.somaDias / grupo.qtdComData : 0,
      volume: grupo.volume,
      qtdAtrasos: grupo.qtdAtrasos,
      taxaAtraso: grupo.volume ? (grupo.qtdAtrasos / grupo.volume) * 100 : 0
    }))
    .sort((a, b) => (b.atrasoMedio !== a.atrasoMedio ? b.atrasoMedio - a.atrasoMedio : b.volume - a.volume));
}

// Gráfico "Desempenho do coordenador": combinação de barras (atraso médio, eixo esquerdo) e
// linha (volume de atividades, eixo direito), clicável por coordenador como filtro rápido
// Arredonda um valor máximo para um limite "confortável" de escala (com folga acima do
// maior valor real), usando um passo de grade proporcional à magnitude do valor
function arredondarLimiteEscala(valorMaximo) {
  if (valorMaximo <= 0) return { limite: 10, passo: 2 };
  let passo;
  if (valorMaximo <= 10) passo = 2;
  else if (valorMaximo <= 25) passo = 5;
  else if (valorMaximo <= 60) passo = 10;
  else if (valorMaximo <= 150) passo = 20;
  else passo = Math.ceil(valorMaximo / 5 / 50) * 50;

  const limite = Math.ceil((valorMaximo * 1.15) / passo) * passo;
  return { limite: Math.max(limite, passo), passo };
}

// Passo de grade "confortável" para uma dada magnitude de referência (mesma escolha de step
// usada em arredondarLimiteEscala, extraída para ser reaproveitada pelo cálculo assimétrico
// abaixo, que não pode usar arredondarLimiteEscala diretamente por precisar arredondar o
// mínimo para baixo e o máximo para cima de forma independente).
function definirPassoEscala(valorReferencia) {
  if (valorReferencia <= 10) return 2;
  if (valorReferencia <= 25) return 5;
  if (valorReferencia <= 60) return 10;
  if (valorReferencia <= 150) return 20;
  return Math.ceil(valorReferencia / 5 / 50) * 50;
}

// Calcula os limites do eixo esquerdo (Dias médios) a partir dos valores REAIS das barras
// (mínimo e máximo da série de atrasoMedio), com uma pequena margem de respiro — em vez da
// escala simétrica anterior (baseada no maior valor absoluto), que inflava o limite inferior
// para muito abaixo do menor valor real sempre que havia uma barra positiva grande (ex.: menor
// valor -10,3 virando eixo de -160 só porque outra barra tinha +123).
//
// Regra: se não há valores negativos, o piso fica em 0 (igual ao modo padrão); se há, o piso
// fica um pouco abaixo do menor valor real (não do maior valor absoluto). O teto sempre fica um
// pouco acima do maior valor real. Ambos são arredondados para múltiplos do passo de grade, só
// que para lados opostos (piso arredondado para baixo, teto para cima), preservando a linha do
// zero visível quando aplicável.
function calcularLimitesEscalaAtraso(valores) {
  const minReal = Math.min(...valores, 0);
  const maxReal = Math.max(...valores, 0);
  const passo = definirPassoEscala(Math.max(Math.abs(minReal), Math.abs(maxReal), 10));

  const margemMin = Math.max(Math.abs(minReal) * 0.15, passo * 0.5);
  const margemMax = Math.max(Math.abs(maxReal) * 0.15, passo * 0.5);

  const yMin = minReal < 0 ? Math.floor((minReal - margemMin) / passo) * passo : 0;
  let yMax = Math.ceil((maxReal + margemMax) / passo) * passo;
  if (yMax <= yMin) yMax = yMin + passo;

  return { yMin, yMax, passo };
}

// Renderer genérico do gráfico misto "Desempenho por Coordenador" (barras = atraso médio,
// linha = volume de atividades), compartilhado entre "Desempenho do coordenador" (aba
// Coordenador/validação) e "Desempenho por Coordenador – Assinatura" (aba Assinatura
// Coordenador), para que os dois fiquem visual e estruturalmente idênticos — só trocam o
// container, os dados e o callback de clique/filtro.
//
// Visual "premium": legenda no topo, barras mais espessas, cor condicional (vermelho quando
// há atraso médio > 0, verde quando <= 0), rótulos do eixo X inclinados (não sobrepõem com
// muitos coordenadores), tooltip nativo completo (nome, média de atraso, volume, registros
// atrasados e % de atraso) tanto na barra quanto no ponto da linha.
//
// opcoes.permitirNegativo (2026-07-29): quando true, o eixo esquerdo (atraso médio) aceita
// valores negativos — usado pelo gráfico da Assinatura, cujo "atrasoMedio" pode ser negativo
// (devolução antes do prazo). Nesse modo a escala fica simétrica em torno de 0 (linha de zero
// visível no meio do gráfico) e as barras crescem para cima (positivo/vermelho) ou para baixo
// (negativo/verde) a partir dessa linha. Quando false (gráfico de validação, inalterado), o
// comportamento é exatamente o de antes: escala de 0 até o maior valor, barras sempre "para
// cima" a partir da base.
function renderizarGraficoDesempenhoPorCoordenador(containerId, dados, filtroAtivo, onCliqueCoordenador, opcoes = {}) {
  const permitirNegativo = Boolean(opcoes.permitirNegativo);
  // Por padrão, o modo negativo também exibe a 3ª linha explicativa da legenda (comportamento
  // original, usado pela Assinatura). O gráfico "Desempenho do Coordenador" desliga essa linha
  // explicitamente (opcoes.legendaExplicativa: false) para manter a legenda simples/limpa.
  const legendaExplicativa = opcoes.legendaExplicativa !== undefined ? Boolean(opcoes.legendaExplicativa) : permitirNegativo;
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (dados.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-chart-empty';
    vazio.textContent = 'Não há dados de coordenadores no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  const largura = Math.max(760, dados.length * 100);
  const altura = 340;
  const margem = { top: 40, right: 56, bottom: 74, left: 56 };
  const areaW = largura - margem.left - margem.right;
  const areaH = altura - margem.top - margem.bottom;
  const passo = areaW / dados.length;
  const larguraBarra = Math.min(56, passo * 0.62);

  // Modo negativo: limites assimétricos calculados a partir do menor/maior valor REAL da série
  // de barras (ver calcularLimitesEscalaAtraso) — não mais uma escala simétrica baseada no
  // maior valor absoluto, que distorcia o piso do eixo. Modo padrão: comportamento original,
  // limite único de 0 até o maior valor.
  let yMinAtraso;
  let yMaxAtrasoFinal;
  let passoAtraso;
  if (permitirNegativo) {
    const limites = calcularLimitesEscalaAtraso(dados.map((grupo) => grupo.atrasoMedio));
    yMinAtraso = limites.yMin;
    yMaxAtrasoFinal = limites.yMax;
    passoAtraso = limites.passo;
  } else {
    const limites = arredondarLimiteEscala(Math.max(...dados.map((grupo) => grupo.atrasoMedio), 0));
    yMinAtraso = 0;
    yMaxAtrasoFinal = limites.limite;
    passoAtraso = limites.passo;
  }
  const { limite: limiteVolume, passo: passoVolume } = arredondarLimiteEscala(
    Math.max(...dados.map((grupo) => grupo.volume))
  );

  const escalaX = (indice) => margem.left + passo * indice + passo / 2;
  // Escala linear do eixo esquerdo: mapeia [yMinAtraso, yMaxAtrasoFinal] para a área do
  // gráfico (yMin embaixo, yMax em cima) — funciona tanto para o modo negativo (piso pode ser
  // < 0) quanto para o modo padrão (piso sempre 0), sem precisar de dois cálculos separados.
  const escalaAtraso = (valor) =>
    margem.top + areaH - ((valor - yMinAtraso) / (yMaxAtrasoFinal - yMinAtraso)) * areaH;
  const yZero = escalaAtraso(0);
  // Volume (linha) é sempre >= 0 e não pode "compartilhar" a parte negativa do eixo de atraso:
  // o 0 do volume fica alinhado com a linha de zero do atraso (yZero) e o máximo fica no topo —
  // a linha ocupa só a área acima de yZero. No modo padrão, yZero já é a base do gráfico, então
  // o comportamento é idêntico ao original (0 embaixo, máximo em cima).
  const escalaVolume = (valor) => yZero - (valor / limiteVolume) * (yZero - margem.top);

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
  svg.setAttribute('class', 'coord-performance-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Gradientes das barras: vermelho (atraso médio > 0) e verde (atraso médio <= 0)
  const defs = document.createElementNS(svgNS, 'defs');
  const criarGradiente = (id, corTopo, corBase) => {
    const gradient = document.createElementNS(svgNS, 'linearGradient');
    gradient.setAttribute('id', id);
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y2', '1');
    const stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', corTopo);
    const stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', corBase);
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
  };
  const idGradienteVermelho = `${containerId}BarGradientVermelho`;
  const idGradienteVerde = `${containerId}BarGradientVerde`;
  criarGradiente(idGradienteVermelho, '#e0574f', '#b91c1c');
  criarGradiente(idGradienteVerde, '#3fae6a', '#15803d');
  svg.appendChild(defs);

  // Malha horizontal discreta + marcações do eixo esquerdo (Dias médios), do piso (yMinAtraso)
  // ao teto (yMaxAtrasoFinal) da escala, em passos de passoAtraso. No modo padrão, yMinAtraso é
  // sempre 0, então o comportamento é idêntico ao original (só de 0 até o limite).
  const primeiroMultiplo = Math.ceil(yMinAtraso / passoAtraso) * passoAtraso;
  for (let valor = primeiroMultiplo; valor <= yMaxAtrasoFinal + 0.001; valor += passoAtraso) {
    const y = escalaAtraso(valor);
    const ehValorZero = Math.abs(valor) < 0.001;
    const ehLinhaZero = permitirNegativo && ehValorZero;

    // No modo padrão, pula a grade no valor 0 (coincide com a linha de base já desenhada
    // embaixo); no modo negativo, o valor 0 sempre é desenhado (mesmo quando não coincide com
    // o meio da área, já que a escala agora é assimétrica) e ganha um traço mais forte (linha
    // de referência do zero), já que as barras crescem para os dois lados a partir dela
    if (!ehValorZero || permitirNegativo) {
      const grade = document.createElementNS(svgNS, 'line');
      grade.setAttribute('x1', margem.left);
      grade.setAttribute('x2', largura - margem.right);
      grade.setAttribute('y1', y);
      grade.setAttribute('y2', y);
      grade.setAttribute('class', ehLinhaZero ? 'coord-performance-grid coord-performance-grid--zero' : 'coord-performance-grid');
      svg.appendChild(grade);
    }

    const tickEsquerdo = document.createElementNS(svgNS, 'text');
    tickEsquerdo.setAttribute('x', margem.left - 8);
    tickEsquerdo.setAttribute('y', y + 3);
    tickEsquerdo.setAttribute('text-anchor', 'end');
    tickEsquerdo.setAttribute('class', 'coord-performance-eixo-tick');
    tickEsquerdo.textContent = Math.round(valor);
    svg.appendChild(tickEsquerdo);
  }

  // Marcações do eixo direito (Volume, sempre inteiro), na mesma grade de posições Y
  // (proporcional ao volume)
  const passosGradeVolume = Math.round(limiteVolume / passoVolume);
  for (let i = 0; i <= passosGradeVolume; i += 1) {
    const valor = i * passoVolume;
    const y = escalaVolume(valor);

    const tickDireito = document.createElementNS(svgNS, 'text');
    tickDireito.setAttribute('x', largura - margem.right + 8);
    tickDireito.setAttribute('y', y + 3);
    tickDireito.setAttribute('text-anchor', 'start');
    tickDireito.setAttribute('class', 'coord-performance-eixo-tick');
    tickDireito.textContent = Math.round(valor);
    svg.appendChild(tickDireito);
  }

  const linhaBase = document.createElementNS(svgNS, 'line');
  linhaBase.setAttribute('x1', margem.left);
  linhaBase.setAttribute('x2', largura - margem.right);
  linhaBase.setAttribute('y1', margem.top + areaH);
  linhaBase.setAttribute('y2', margem.top + areaH);
  linhaBase.setAttribute('class', 'coord-performance-eixo');
  svg.appendChild(linhaBase);

  const tituloEixoEsquerdo = document.createElementNS(svgNS, 'text');
  tituloEixoEsquerdo.setAttribute('x', -(margem.top + areaH / 2));
  tituloEixoEsquerdo.setAttribute('y', 14);
  tituloEixoEsquerdo.setAttribute('text-anchor', 'middle');
  tituloEixoEsquerdo.setAttribute('transform', 'rotate(-90)');
  tituloEixoEsquerdo.setAttribute('class', 'coord-performance-eixo-titulo coord-performance-eixo-titulo--esquerdo');
  tituloEixoEsquerdo.textContent = 'Dias médios';
  svg.appendChild(tituloEixoEsquerdo);

  const tituloEixoDireito = document.createElementNS(svgNS, 'text');
  tituloEixoDireito.setAttribute('x', margem.top + areaH / 2);
  tituloEixoDireito.setAttribute('y', -(largura - 16));
  tituloEixoDireito.setAttribute('text-anchor', 'middle');
  tituloEixoDireito.setAttribute('transform', 'rotate(90)');
  tituloEixoDireito.setAttribute('class', 'coord-performance-eixo-titulo coord-performance-eixo-titulo--direito');
  tituloEixoDireito.textContent = 'Volume';
  svg.appendChild(tituloEixoDireito);

  // Texto da linha de "média" no tooltip: no modo negativo, distingue atraso/antecipação/no
  // prazo; no modo padrão (validação), mantém o texto original (atrasoMedio nunca é negativo
  // ali, então o resultado é idêntico ao de antes)
  const construirLinhaMedia = (valor) => {
    if (!permitirNegativo) return `Média de atraso: ${formatarMediaAtrasoGrafico(valor)} dias`;
    if (valor > 0) return `Atraso médio: ${formatarMediaAtrasoGrafico(valor)} dias`;
    if (valor < 0) return `Antecipação média: ${formatarMediaAtrasoGrafico(Math.abs(valor))} dias`;
    return 'No prazo';
  };

  dados.forEach((grupo, indice) => {
    const cx = escalaX(indice);
    const valorBarra = grupo.atrasoMedio;
    const yValor = escalaAtraso(valorBarra);
    const yTopoBarra = Math.min(yValor, yZero);
    const alturaBarra = Math.abs(yValor - yZero);
    const selecionada = filtroAtivo === grupo.categoria;
    const emAtraso = valorBarra > 0;
    const qtdAtrasos = grupo.qtdAtrasos || 0;
    const taxaAtraso = grupo.taxaAtraso !== undefined
      ? grupo.taxaAtraso
      : (grupo.volume ? (qtdAtrasos / grupo.volume) * 100 : 0);

    const tooltipTexto =
      `${grupo.categoria}\n` +
      `${construirLinhaMedia(valorBarra)}\n` +
      `Volume de atividades: ${grupo.volume}\n` +
      `Registros atrasados: ${qtdAtrasos}\n` +
      `% de atraso: ${formatarPercentualComVirgula(taxaAtraso)}%`;

    const barra = document.createElementNS(svgNS, 'rect');
    barra.setAttribute('x', cx - larguraBarra / 2);
    barra.setAttribute('y', yTopoBarra);
    barra.setAttribute('width', larguraBarra);
    barra.setAttribute('height', alturaBarra);
    barra.setAttribute('rx', 6);
    barra.setAttribute('class', 'coord-performance-bar');
    barra.style.setProperty('--bar-fill', `url(#${emAtraso ? idGradienteVermelho : idGradienteVerde})`);
    barra.setAttribute('role', 'button');
    barra.setAttribute('tabindex', '0');
    if (selecionada) barra.classList.add('coord-performance-bar--ativa');
    else if (filtroAtivo !== null) barra.classList.add('coord-performance-bar--esmaecida');
    const clique = () => onCliqueCoordenador(grupo.categoria);
    barra.addEventListener('click', clique);
    barra.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clique();
      }
    });
    const tituloBarra = document.createElementNS(svgNS, 'title');
    tituloBarra.textContent = tooltipTexto;
    barra.appendChild(tituloBarra);
    svg.appendChild(barra);

    // Rótulo numérico da barra: acima quando >= 0, abaixo quando negativa (a barra desce da
    // linha de zero para baixo nesse caso) — sempre exibido, inclusive "0,0" e valores negativos
    const rotuloBarra = document.createElementNS(svgNS, 'text');
    rotuloBarra.setAttribute('x', cx);
    rotuloBarra.setAttribute('y', valorBarra < 0 ? yValor + 14 : yValor - 8);
    rotuloBarra.setAttribute('text-anchor', 'middle');
    rotuloBarra.setAttribute('class', 'coord-performance-valor-barra');
    rotuloBarra.style.fill = emAtraso ? 'var(--ind-vermelho, #b91c1c)' : 'var(--ind-verde, #15803d)';
    rotuloBarra.textContent = valorBarra.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    svg.appendChild(rotuloBarra);

    // Rótulo do eixo X inclinado (evita sobreposição com muitos coordenadores no recorte)
    const rotuloX = document.createElementNS(svgNS, 'text');
    const yRotuloX = altura - margem.bottom + 18;
    rotuloX.setAttribute('x', cx);
    rotuloX.setAttribute('y', yRotuloX);
    rotuloX.setAttribute('text-anchor', 'end');
    rotuloX.setAttribute('transform', `rotate(-20 ${cx} ${yRotuloX})`);
    rotuloX.setAttribute('class', 'coord-performance-eixo-label');
    rotuloX.textContent = grupo.categoria;
    svg.appendChild(rotuloX);
  });

  const pontosLinha = dados.map((grupo, indice) => `${escalaX(indice)},${escalaVolume(grupo.volume)}`).join(' ');
  const linha = document.createElementNS(svgNS, 'polyline');
  linha.setAttribute('points', pontosLinha);
  linha.setAttribute('class', 'coord-performance-linha');
  svg.appendChild(linha);

  dados.forEach((grupo, indice) => {
    const cx = escalaX(indice);
    const cy = escalaVolume(grupo.volume);
    const qtdAtrasos = grupo.qtdAtrasos || 0;
    const taxaAtraso = grupo.taxaAtraso !== undefined
      ? grupo.taxaAtraso
      : (grupo.volume ? (qtdAtrasos / grupo.volume) * 100 : 0);

    const ponto = document.createElementNS(svgNS, 'circle');
    ponto.setAttribute('cx', cx);
    ponto.setAttribute('cy', cy);
    ponto.setAttribute('r', 5.5);
    ponto.setAttribute('class', 'coord-performance-ponto');

    // Sem rótulo numérico fixo sobre o ponto (sobrepunha o valor da barra quando só havia 1
    // coordenador no recorte) — o valor de volume e o restante do detalhe continuam
    // acessíveis via tooltip nativo completo (mesmo texto usado na barra)
    const titulo = document.createElementNS(svgNS, 'title');
    titulo.textContent =
      `${grupo.categoria}\n` +
      `${construirLinhaMedia(grupo.atrasoMedio)}\n` +
      `Volume de atividades: ${grupo.volume}\n` +
      `Registros atrasados: ${qtdAtrasos}\n` +
      `% de atraso: ${formatarPercentualComVirgula(taxaAtraso)}%`;
    ponto.appendChild(titulo);

    svg.appendChild(ponto);
  });

  // Legenda no topo (antes do gráfico), padrão "premium" pedido. No modo negativo, a legenda
  // ganha uma 3ª linha explicando o significado das cores (pedido explicitamente)
  const legenda = document.createElement('div');
  legenda.className = 'coord-performance-legenda coord-performance-legenda--topo';

  const itemBarra = document.createElement('span');
  itemBarra.className = 'coord-performance-legenda-item';
  itemBarra.innerHTML = '<span class="coord-performance-legenda-dot coord-performance-legenda-dot--barra"></span>Média de atraso (dias)';
  legenda.appendChild(itemBarra);

  const itemLinha = document.createElement('span');
  itemLinha.className = 'coord-performance-legenda-item';
  itemLinha.innerHTML = '<span class="coord-performance-legenda-dot coord-performance-legenda-dot--linha"></span>Volume de atividade (registros)';
  legenda.appendChild(itemLinha);

  if (legendaExplicativa) {
    const itemExplicacao = document.createElement('span');
    itemExplicacao.className = 'coord-performance-legenda-item coord-performance-legenda-item--explicacao';
    itemExplicacao.textContent = 'Vermelho = devolução com atraso · Verde = devolução antes do prazo';
    legenda.appendChild(itemExplicacao);
  }

  container.appendChild(legenda);

  const wrapper = document.createElement('div');
  wrapper.className = 'coord-performance-svg-wrapper';
  wrapper.appendChild(svg);
  container.appendChild(wrapper);
}

function renderizarGraficoDesempenhoCoordenador(dados) {
  renderizarGraficoDesempenhoPorCoordenador(
    'graficoDesempenhoCoordenador',
    dados,
    filtrosIndicadoresCoordenador.coordenador,
    (categoria) => alternarFiltroIndicadorCoordenador('coordenador', categoria),
    { permitirNegativo: true, legendaExplicativa: false }
  );
}

// Renderiza toda a seção "Indicadores — Coordenador" a partir dos registros de base (já
// filtrados pelo popover/busca/filtro rápido da aba Coordenador), aplicando por cima os
// filtros interativos ativados ao clicar em itens dos gráficos
function renderizarIndicadoresCoordenador(dadosBase) {
  indicadoresCoordenadorDadosBase = dadosBase;

  renderizarFiltrosAtivosIndicadoresCoordenador();
  atualizarIndicadorFiltrosIndicadoresTopoCoord();

  if (dadosBase.length === 0) {
    domIndCoord.emptyGeral.hidden = false;
    domIndCoord.emptyGeral.textContent = 'Não há dados suficientes para gerar indicadores neste recorte.';
    domIndCoord.conteudo.hidden = true;
    return;
  }

  const dados = aplicarFiltrosIndicadoresCoordenador(aplicarFiltrosIndicadoresTopoCoord(dadosBase));

  if (dados.length === 0) {
    domIndCoord.emptyGeral.hidden = false;
    domIndCoord.emptyGeral.textContent = 'Não há dados para os filtros selecionados.';
    domIndCoord.conteudo.hidden = true;
    return;
  }
  domIndCoord.emptyGeral.hidden = true;
  domIndCoord.conteudo.hidden = false;

  const indicadores = calcularIndicadoresCoordenador(dados);
  renderizarCardsIndicadoresCoordenador(indicadores);
  renderizarGraficoRankingMediaAtrasoCoordenador(calcularRankingMediaAtrasoCoordenador(dados));
  renderizarGraficoPrimeiraValidacaoCoordenador(calcularDistribuicaoPrimeiraValidacaoCoordenador(dados));

  // "Recorrência de atraso por coordenador": a posição "#" é calculada sobre o recorte SEM o
  // filtro por coordenador (multi-select do popover + clique no gráfico/tabela), para que
  // selecionar coordenador(es) só restrinja a exibição, sem recalcular a posição no ranking geral
  const dadosParaRankingCoord = aplicarFiltrosIndicadoresCoordenador(
    aplicarFiltrosIndicadoresTopoCoord(dadosBase, { ignorarCoordenador: true }),
    { ignorarCoordenador: true }
  );
  const rankingCompletoCoord = gerarRecorrenciaAtrasoCoordenador(dadosParaRankingCoord).map((item, index) => ({
    ...item,
    posicaoReal: index + 1
  }));
  const coordenadoresSelecionados = filtrosIndicadoresTopoCoord.coordenadores.length
    ? filtrosIndicadoresTopoCoord.coordenadores
    : filtrosIndicadoresCoordenador.coordenador
    ? [filtrosIndicadoresCoordenador.coordenador]
    : null;
  const recorrenciaCoord = coordenadoresSelecionados
    ? rankingCompletoCoord.filter((item) => coordenadoresSelecionados.includes(item.coordenador))
    : rankingCompletoCoord;
  renderizarTabelaRecorrenciaCoordenador(recorrenciaCoord);

  renderizarGraficoDesempenhoCoordenador(calcularDesempenhoCoordenadores(dados));
}

// --- Processo Editorial (antiga "Sistema GGE") ---
// Matriz de acompanhamento das etapas do processo editorial pós-validação: para cada
// avaliação/módulo/ano/frente, mostra o status (concluído/em andamento/pendente) de cada
// etapa e um status geral consolidado.

// Etapas do processo editorial atualmente exibidas como coluna na matriz, na mesma ordem das
// colunas da tabela. Cada etapa é um par [campo de início, campo de fim]; a etapa "Envio
// assinatura coord." usa envio/devolutiva no lugar de início/fim, mas segue a mesma lógica de
// 3 estados. O "Status do Processo" é calculado só a partir destas etapas.
const ETAPAS_PROCESSO_EDITORIAL = [
  { titulo: 'Diagramação', inicio: 'inicio_diagramacao', fim: 'fim_diagramacao' },
  { titulo: 'Cotejo', inicio: 'inicio_cotejo', fim: 'fim_cotejo' },
  { titulo: 'Diagramação do Cotejo', inicio: 'inicio_aplicacao_cotejo', fim: 'fim_aplicacao_cotejo' },
  { titulo: 'Início Leitura Final', inicio: 'inicio_leitura_final', fim: 'fim_leitura_final' },
  { titulo: 'Diagramação da Leitura', inicio: 'inicio_aplicacao_leitura', fim: 'fim_aplicacao_leitura' },
  { titulo: 'Cotejo Final', inicio: 'inicio_ctj', fim: 'fim_ctj' },
  { titulo: 'Envio Assinatura Coord.', inicio: 'envio_assinatura_coord', fim: 'devolutiva_assinatura_coord' }
];

// Etapas que já existem na base (cotejo da arte final) mas que, por ora, não são exibidas na
// tabela nem entram no cálculo do "Status do Processo" — mantida aqui só para uso futuro,
// quando essa coluna for reintroduzida na matriz.
const ETAPAS_PROCESSO_EDITORIAL_FUTURAS = [
  { titulo: 'Cotejo Arte Final', inicio: 'inicio_cotejo_arte_final', fim: 'fim_cotejo_arte_final' }
];

// Rótulos de coluna com quebra de linha controlada (<br>), para cabeçalhos maiores que
// ficariam apertados numa única linha na tabela detalhada por registro
const ROTULOS_COLUNA_ETAPA_HTML = {
  'Diagramação do Cotejo': 'Diagramação<br>do Cotejo',
  'Início Leitura Final': 'Início Leitura<br>Final',
  'Diagramação da Leitura': 'Diagramação<br>da Leitura',
  'Envio Assinatura Coord.': 'Envio Assinatura<br>Coord.'
};

const ROTULOS_STATUS_ETAPA = {
  completed: 'Concluído',
  'in-progress': 'Em andamento',
  pending: 'Pendente'
};

// Lê um campo do registro tentando vários nomes possíveis (aliases), na ordem dada — usado
// quando a API pode devolver a coluna com nomes abreviados/variados dependendo da planilha de
// origem (ex.: "inicio_diagr" em vez de "inicio_diagramacao"). Retorna o primeiro valor não
// vazio encontrado, ou '' se nenhum alias tiver valor.
function obterValorPorAliases(item, aliases) {
  for (const alias of aliases) {
    const valor = item[alias];
    if (valor !== undefined && valor !== null && String(valor).trim() !== '') return valor;
  }
  return '';
}

// Aliases conhecidos dos campos de início/fim de cada etapa do Processo Editorial, além do
// nome "canônico" usado em ETAPAS_PROCESSO_EDITORIAL — cobre variações encurtadas que já
// apareceram na base (ex.: "inicio_diagr", "fim_diagram")
const ALIASES_CAMPOS_ETAPA_PROCESSO_EDITORIAL = {
  inicio_diagramacao: ['inicio_diagramacao_preparo', 'inicio_diagramacao', 'inicio_diagr', 'inicio_diag', 'inicio_diagramação', 'inicio_diagram'],
  fim_diagramacao: ['fim_diagramacao_preparo', 'fim_diagramacao', 'fim_diagram', 'fim_diagr', 'fim_diag', 'fim_diagramação'],
  inicio_cotejo: ['inicio_cotejo'],
  fim_cotejo: ['fim_cotejo'],
  inicio_aplicacao_cotejo: ['inicio_aplicacao_cotejo', 'inicio_aplica', 'inicio_aplicacao'],
  fim_aplicacao_cotejo: ['fim_aplicacao_cotejo', 'fim_aplicaca', 'fim_aplicacao'],
  inicio_leitura_final: ['inicio_leitura_final'],
  fim_leitura_final: ['fim_leitura_final'],
  inicio_aplicacao_leitura: ['inicio_aplicacao_leitura'],
  fim_aplicacao_leitura: ['fim_aplicacao_leitura'],
  inicio_ctj: ['inicio_ctj'],
  fim_ctj: ['fim_ctj'],
  envio_assinatura_coord: ['envio_assinatura_coord', 'envio_assinatura'],
  devolutiva_assinatura_coord: ['devolutiva_assinatura_coord']
};

// Lê o valor de um campo de etapa do Processo Editorial considerando seus aliases conhecidos
// (ALIASES_CAMPOS_ETAPA_PROCESSO_EDITORIAL); campos sem aliases cadastrados caem no próprio
// nome do campo, sem mudança de comportamento
function obterValorCampoEtapaProcessoEditorial(item, campo) {
  return obterValorPorAliases(item, ALIASES_CAMPOS_ETAPA_PROCESSO_EDITORIAL[campo] || [campo]);
}

// true quando o valor não é vazio (mesmo critério de obterValorPorAliases: undefined/null/
// string em branco contam como vazio)
function temValor(valor) {
  return valor !== undefined && valor !== null && String(valor).trim() !== '';
}

// Calcula o status de UM registro para UMA etapa, a partir dos campos de início/fim
// (com aliases): fim preenchido = concluído; início preenchido e fim vazio = em andamento;
// ambos vazios = pendente. Mesma regra para todas as etapas, incluindo "Envio Assinatura
// Coord." (início = envio_assinatura_coord, fim = devolutiva_assinatura_coord) — a conclusão
// dessa etapa depende da devolutiva, não do próprio envio.
function calcularStatusEtapa(item, inicioCampo, fimCampo) {
  // Log temporário de depuração da coluna Diagramação — descomente para conferir, por
  // registro, quais aliases estão realmente vindo preenchidos pela API
  // if (fimCampo === 'fim_diagramacao') {
  //   console.log('DIAGRAMAÇÃO DEBUG', {
  //     id: item.id,
  //     inicioDiagramacao: obterValorCampoEtapaProcessoEditorial(item, inicioCampo),
  //     fimDiagramacao: obterValorCampoEtapaProcessoEditorial(item, fimCampo)
  //   });
  // }

  if (temValor(obterValorCampoEtapaProcessoEditorial(item, fimCampo))) return 'completed';
  if (temValor(obterValorCampoEtapaProcessoEditorial(item, inicioCampo))) return 'in-progress';
  return 'pending';
}

// Aplica a mesma regra de 3 estados (todos "completed" -> completed; todos "pending" ->
// pending; qualquer outra mistura, inclusive com "in-progress" -> in-progress) sobre uma
// lista de status de etapa. Usada tanto para consolidar as etapas de UM registro quanto para
// consolidar o status de UMA etapa entre VÁRIOS registros (linhas de bloco do Ensino Médio)
function consolidarStatusEtapas(statusEtapas) {
  if (statusEtapas.every((status) => status === 'completed')) return 'completed';
  if (statusEtapas.every((status) => status === 'pending')) return 'pending';
  return 'in-progress';
}

// Status de uma etapa (ex.: Diagramação) consolidado entre TODOS os registros de um bloco —
// usado para montar a linha de um BLOCO do Ensino Médio ou BLOQUINHO do 9º ano na AV2 (várias
// frentes viram 1 linha): Concluído só se TODOS os registros do grupo concluíram essa etapa
// (fim preenchido); Pendente só se NENHUM registro tem início nem fim; qualquer mistura entre
// os dois é Em andamento — nunca calculado a partir de só o primeiro registro do grupo.
function calcularStatusEtapaAgregado(registros, inicioCampo, fimCampo) {
  return consolidarStatusEtapas(registros.map((record) => calcularStatusEtapa(record, inicioCampo, fimCampo)));
}

// Status geral do processo editorial (Concluído/Em andamento/Pendente) de um grupo de 1 ou
// mais registros, a partir do status agregado de cada etapa (calcularStatusEtapaAgregado)
function calcularStatusConsolidado(registros) {
  const statusPorEtapa = ETAPAS_PROCESSO_EDITORIAL.map((etapa) =>
    calcularStatusEtapaAgregado(registros, etapa.inicio, etapa.fim)
  );
  const rotulos = { completed: 'Concluído', pending: 'Pendente', 'in-progress': 'Em andamento' };
  return rotulos[consolidarStatusEtapas(statusPorEtapa)];
}

// Calcula o status geral do processo editorial de UM registro — caso particular de
// calcularStatusConsolidado com um grupo de um único registro
function calcularStatusProcesso(item) {
  return calcularStatusConsolidado([item]);
}

// Disciplinas do BLOCO 1 e do BLOCO 2 por ano do Ensino Médio — a composição varia entre
// 1º/2º/3º ano (ex.: Educação Física só entra no bloco 1 do 1º e 2º ano; Geografia/História se
// desdobram em 1/2 só no 3º ano), por isso cada ano tem sua própria lista, em vez de listas
// únicas compartilhadas entre os 3 anos.
const BLOCO_1_1_ANO = [
  'INGLES',
  'LITERATURA',
  'ARTE',
  'PORTUGUES',
  'GEOGRAFIA',
  'HISTORIA',
  'SOCIOLOGIA',
  'FILOSOFIA',
  'EDUCACAO FISICA'
];
const BLOCO_2_1_ANO = [
  'MATEMATICA 1',
  'MATEMATICA 2',
  'FISICA 1',
  'FISICA 2',
  'QUIMICA 1',
  'QUIMICA 2',
  'BIOLOGIA 1',
  'BIOLOGIA 2'
];

const BLOCO_1_2_ANO = [
  'INGLES',
  'LITERATURA',
  'PORTUGUES',
  'GEOGRAFIA',
  'HISTORIA 1',
  'HISTORIA 2',
  'SOCIOLOGIA',
  'EDUCACAO FISICA',
  'FILOSOFIA'
];
const BLOCO_2_2_ANO = [
  'FISICA 1',
  'FISICA 2',
  'QUIMICA 1',
  'QUIMICA 2',
  'BIOLOGIA 1',
  'BIOLOGIA 2',
  'MATEMATICA 1',
  'MATEMATICA 2',
  'MATEMATICA 3'
];

// No 3º ano, REDAÇÃO faz parte do BLOCO 1 (ver identificarGrupoEnsinoMedio) — por isso não
// entra nesta lista (é tratada à parte, junto com REDACAO_ENSINO_MEDIO)
const BLOCO_1_3_ANO = [
  'INGLES',
  'LITERATURA',
  'PORTUGUES',
  'GEOGRAFIA 1',
  'GEOGRAFIA 2',
  'HISTORIA 1',
  'HISTORIA 2',
  'FILOSOFIA',
  'SOCIOLOGIA',
  'ARTE'
];
const BLOCO_2_3_ANO = [
  'MATEMATICA 1',
  'MATEMATICA 2',
  'MATEMATICA 3',
  'FISICA 1',
  'FISICA 2',
  'QUIMICA 1',
  'QUIMICA 2',
  'BIOLOGIA 1',
  'BIOLOGIA 2'
];

// Ponto único de consulta das listas de bloco por ano do Ensino Médio
const BLOCOS_POR_ANO_ENSINO_MEDIO = {
  '1º': { bloco1: BLOCO_1_1_ANO, bloco2: BLOCO_2_1_ANO },
  '2º': { bloco1: BLOCO_1_2_ANO, bloco2: BLOCO_2_2_ANO },
  '3º': { bloco1: BLOCO_1_3_ANO, bloco2: BLOCO_2_3_ANO }
};

// Redações e variações de nome tratadas como o grupo "REDAÇÃO" (1º/2º ano) — ou incorporadas
// ao BLOCO 1 no 3º ano
const REDACAO_ENSINO_MEDIO = ['REDACAO', 'PROD TEXTUAL', 'PRODUCAO TEXTUAL'];

// Ordem de exibição dos grupos consolidados do Ensino Médio na tabela detalhada
const ORDEM_BLOCO_ENSINO_MEDIO = ['BLOCO 1', 'BLOCO 2', 'REDAÇÃO'];

// Remove acentos/diacríticos de um texto (ex.: "Química" -> "Quimica")
function removerAcentos(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Concatenações conhecidas sem separador (grudadas) na base, que não dá pra resolver só com
// espaço/underscore/dígito — mapeadas explicitamente para a forma normalizada
const CONCATENACOES_DISCIPLINA_CONHECIDAS = {
  'EDUCACAOFISICA': 'EDUCACAO FISICA'
};

// Normaliza o nome de uma disciplina/frente para comparação com as listas de bloco: remove
// acento, deixa em caixa alta, troca "_" e pontuação por espaço, separa letra+dígito grudados
// ("HISTORIA1" -> "HISTORIA 1"), remove zero à esquerda em número ("GEOGRAFIA 01" ->
// "GEOGRAFIA 1") e colapsa espaços duplicados/pontas. Cobre variações como "EDUCAÇÃOFÍSICA" /
// "EDUCAÇÃO FÍSICA" / "EDUCACAO_FISICA" -> "EDUCACAO FISICA", ou "MATEMÁTICA 1" /
// "MATEMATICA1" -> "MATEMATICA 1".
function normalizarDisciplinaParaBloco(valor) {
  let texto = removerAcentos(valor)
    .toUpperCase()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (CONCATENACOES_DISCIPLINA_CONHECIDAS[texto]) {
    texto = CONCATENACOES_DISCIPLINA_CONHECIDAS[texto];
  }

  texto = texto.replace(/([A-ZÇ])(\d)/g, '$1 $2');
  texto = texto.replace(/\b0+(\d)\b/g, '$1');
  return texto.replace(/\s+/g, ' ').trim();
}

// Mantida como alias por compatibilidade — mesma normalização usada em toda a montagem de
// blocos/bloquinhos do Processo Editorial
function normalizarFrenteProcessoEditorial(valor) {
  return normalizarDisciplinaParaBloco(valor);
}

// Identifica o grupo do Ensino Médio de um registro (BLOCO 1 / BLOCO 2 / REDAÇÃO), a partir
// das listas de disciplina do ano correspondente (BLOCOS_POR_ANO_ENSINO_MEDIO) — por lista
// EXATA de frentes (sem aproximação por "includes"/substring). REDAÇÃO (e variações como
// "Prod. Textual") forma linha própria no 1º/2º ano, mas entra no BLOCO 1 no 3º ano. Se a
// frente não estiver em nenhuma lista do ano (ou o ano não for 1º/2º/3º), registra um aviso no
// console e retorna null — quem chama esta função é responsável por NÃO gerar uma linha "BLOCO
// NÃO IDENTIFICADO" para esse caso.
function identificarGrupoEnsinoMedio(item) {
  const numeroAno = normalizarAnoSegmento(item.ano);
  const ano = numeroAno !== null ? `${numeroAno}º` : null;
  const frente = normalizarDisciplinaParaBloco(item.frente);
  const blocosDoAno = BLOCOS_POR_ANO_ENSINO_MEDIO[ano];

  if (!blocosDoAno) {
    console.warn('Ano do Ensino Médio sem regra de bloco cadastrada:', { ano, id: item.id });
    return null;
  }

  if (REDACAO_ENSINO_MEDIO.includes(frente)) {
    return ano === '3º' ? 'BLOCO 1' : 'REDAÇÃO';
  }

  if (blocosDoAno.bloco1.includes(frente)) return 'BLOCO 1';
  if (blocosDoAno.bloco2.includes(frente)) return 'BLOCO 2';

  console.warn('Frente do Ensino Médio não mapeada no Processo Editorial:', {
    ano,
    frenteOriginal: item.frente,
    frenteNormalizada: frente,
    tipo_av: item.tipo_av,
    modulo: item.modulo,
    id: item.id
  });

  return null;
}

// Agrupa os registros de um ano do Ensino Médio por Módulo + Avaliação + Grupo (BLOCO 1 /
// BLOCO 2 / REDAÇÃO), consolidando várias frentes em 1 única linha/prova — ex.: "M3-AV1-1º-
// BLOCO 1" reúne Inglês, Literatura, Português etc. Registros cuja frente não é reconhecida
// (identificarGrupoEnsinoMedio retorna null) são ignorados aqui — já geraram um console.warn.
// Ordenado por módulo → avaliação (ordem fixa AV1→AV2→2º CHAMADA→REC-SEM→REC-FIM) → grupo
// (BLOCO 1 → BLOCO 2 → REDAÇÃO)
function agruparRegistrosPorBlocoEnsinoMedio(registros) {
  const grupos = new Map();

  registros.forEach((record) => {
    const grupo = identificarGrupoEnsinoMedio(record);
    if (grupo === null) return;

    const tipoAv = normalizarTipoAvaliacao(record.tipo_av);
    const chave = `${safe(record.modulo)}||${tipoAv}||${grupo}`;

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        id: `${safe(record.modulo)}-${tipoAv}-${safe(record.ano)}-${grupo}`,
        modulo: record.modulo,
        tipoAv,
        bloco: grupo,
        registros: []
      });
    }
    grupos.get(chave).registros.push(record);
  });

  return Array.from(grupos.values()).sort((a, b) => {
    const modulo = safe(a.modulo).localeCompare(safe(b.modulo), 'pt-BR', { numeric: true });
    if (modulo !== 0) return modulo;

    const posTipoAvA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(a.tipoAv);
    const posTipoAvB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(b.tipoAv);
    const posicaoTipoAvA = posTipoAvA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posTipoAvA;
    const posicaoTipoAvB = posTipoAvB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posTipoAvB;
    if (posicaoTipoAvA !== posicaoTipoAvB) return posicaoTipoAvA - posicaoTipoAvB;

    return ORDEM_BLOCO_ENSINO_MEDIO.indexOf(a.bloco) - ORDEM_BLOCO_ENSINO_MEDIO.indexOf(b.bloco);
  });
}

// Regra especial do 9º ano na AV2: as frentes são organizadas em 5 "bloquinhos" (por lista
// exata, sem aproximação) — só se aplica a ano === '9º' && tipo_av normalizado === 'AV2'; as
// demais avaliações do 9º ano (e os demais anos do Fundamental) continuam 1 linha por registro.
const BLOQUINHO_1_NONO_AV2 = ['REDACAO', 'PORTUGUES', 'LITERATURA'];
const BLOQUINHO_2_NONO_AV2 = ['BIOLOGIA', 'GEOGRAFIA'];
const BLOQUINHO_3_NONO_AV2 = ['MATEMATICA 1', 'MATEMATICA 2', 'MATEMATICA BASICA'];
const BLOQUINHO_4_NONO_AV2 = ['FISICA', 'INGLES', 'ARTE'];
const BLOQUINHO_5_NONO_AV2 = ['HISTORIA', 'QUIMICA'];
const ORDEM_BLOQUINHO_NONO_AV2 = ['BLOQUINHO 1', 'BLOQUINHO 2', 'BLOQUINHO 3', 'BLOQUINHO 4', 'BLOQUINHO 5'];

// Identifica o bloquinho (1 a 5) de uma frente do 9º ano na AV2, por lista EXATA (sem
// aproximação por includes/substring). Se a frente não estiver em nenhuma lista, registra um
// aviso no console e retorna null — quem chama é responsável por não criar uma linha
// "BLOQUINHO NÃO IDENTIFICADO" para esse caso.
function identificarBloquinhoNonoAnoAV2(item) {
  const frente = normalizarFrenteProcessoEditorial(item.frente);

  if (BLOQUINHO_1_NONO_AV2.includes(frente)) return 'BLOQUINHO 1';
  if (BLOQUINHO_2_NONO_AV2.includes(frente)) return 'BLOQUINHO 2';
  if (BLOQUINHO_3_NONO_AV2.includes(frente)) return 'BLOQUINHO 3';
  if (BLOQUINHO_4_NONO_AV2.includes(frente)) return 'BLOQUINHO 4';
  if (BLOQUINHO_5_NONO_AV2.includes(frente)) return 'BLOQUINHO 5';

  console.warn('Frente do 9º ano AV2 não mapeada em bloquinho:', {
    frenteOriginal: item.frente,
    frenteNormalizada: frente,
    modulo: item.modulo,
    id: item.id
  });

  return null;
}

// Agrupa os registros do 9º ano na AV2 por Módulo + Bloquinho, consolidando várias frentes em
// 1 única linha/prova — ex.: "M3-AV2-9º-BLOQUINHO 1". Registros cuja frente não é reconhecida
// (identificarBloquinhoNonoAnoAV2 retorna null) são ignorados aqui — já geraram um console.warn.
// Ordenado por módulo → bloquinho (BLOQUINHO 1 → 2 → 3 → 4 → 5)
function agruparRegistrosPorBloquinhoNonoAnoAV2(registros) {
  const grupos = new Map();

  registros.forEach((record) => {
    const bloquinho = identificarBloquinhoNonoAnoAV2(record);
    if (bloquinho === null) return;

    const chave = `${safe(record.modulo)}||${bloquinho}`;
    if (!grupos.has(chave)) {
      grupos.set(chave, {
        id: `${safe(record.modulo)}-AV2-${safe(record.ano)}-${bloquinho}`,
        modulo: record.modulo,
        bloquinho,
        registros: []
      });
    }
    grupos.get(chave).registros.push(record);
  });

  return Array.from(grupos.values()).sort((a, b) => {
    const modulo = safe(a.modulo).localeCompare(safe(b.modulo), 'pt-BR', { numeric: true });
    if (modulo !== 0) return modulo;
    return ORDEM_BLOQUINHO_NONO_AV2.indexOf(a.bloquinho) - ORDEM_BLOQUINHO_NONO_AV2.indexOf(b.bloquinho);
  });
}

// Ponto único que decide como um ano do Processo Editorial é dividido em "provas" (grupos
// {id, registros}), na ordem final de exibição:
// - Ensino Médio (1º/2º/3º): consolidado por BLOCO 1/BLOCO 2/REDAÇÃO (agruparRegistrosPorBlocoEnsinoMedio);
// - 9º ano: os registros da AV2 são consolidados em até 5 BLOQUINHOs, inseridos na posição da
//   AV2 dentro da ordem fixa de avaliação; os demais tipos de avaliação do 9º ano continuam
//   1 linha por registro;
// - demais anos do Fundamental (6º/7º/8º): 1 linha por registro, como sempre foi.
function agruparRegistrosProcessoEditorialPorAno(ano, registros) {
  if (identificarSegmentoPorAno(ano) === 'Ensino Médio') {
    return agruparRegistrosPorBlocoEnsinoMedio(registros);
  }

  if (ano === '9º') {
    const registrosAV2 = registros.filter((record) => normalizarTipoAvaliacao(record.tipo_av) === 'AV2');
    const registrosOutros = registros.filter((record) => normalizarTipoAvaliacao(record.tipo_av) !== 'AV2');

    const gruposBloquinho = agruparRegistrosPorBloquinhoNonoAnoAV2(registrosAV2);
    const gruposIndividuais = ordenarTabelaProcessoEditorial(registrosOutros).map((record) => ({
      id: obterIdProcessoEditorial(record),
      registros: [record]
    }));

    const posAV2 = ORDEM_TIPO_AV_PERFORMANCE.indexOf('AV2');
    const antesDaAV2 = gruposIndividuais.filter(
      (grupo) => ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvaliacao(grupo.registros[0].tipo_av)) < posAV2
    );
    const depoisDaAV2 = gruposIndividuais.filter(
      (grupo) => ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvaliacao(grupo.registros[0].tipo_av)) >= posAV2
    );

    return [...antesDaAV2, ...gruposBloquinho, ...depoisDaAV2];
  }

  return registros.map((record) => ({ id: obterIdProcessoEditorial(record), registros: [record] }));
}

function badgeClassForStatusProcesso(status) {
  const map = {
    'Concluído': 'badge-pe-status-concluido',
    'Em andamento': 'badge-pe-status-andamento',
    'Pendente': 'badge-pe-status-pendente'
  };
  return map[status] || '';
}

// Renderiza o ícone de uma célula de etapa (quadrado verde com check / círculo azul / círculo
// vermelho), com tooltip nativo indicando a etapa e o status
function renderizarIconeStatusProcesso(status, tituloEtapa) {
  const span = document.createElement('span');
  span.className = `status-step ${status}`;
  span.title = `${tituloEtapa}: ${ROTULOS_STATUS_ETAPA[status]}`;
  if (status === 'completed') span.textContent = '✓';
  return span;
}

// Popula os selects de Módulo, Ano, Disciplina, Tipo de AV e Responsável do popover de
// filtros da seção Processo Editorial. Módulo agora vive no filtro rápido do cabeçalho (mesmo
// <select>, mesmo estado em peSelectFilters.modulo) — opção vazia mostra "Módulo" em vez de
// "Todos", mesmo padrão da aba Elaboração.
// Opções fixas do campo "Status do processo" do popover — mesmas <option> estáticas de antes
const OPCOES_PE_STATUS_EDITORIAL = [
  { value: 'Concluído', label: 'Concluído' },
  { value: 'Em andamento', label: 'Em andamento' },
  { value: 'Pendente', label: 'Pendente' }
];

function populatePEFilterOptions(records) {
  populateAnoAplicacaoOptions(peSelectFilters.ano, records);
  populateSelectOptions(peSelectFilters.modulo, records, 'modulo', 'Módulo');
  populateCheckboxGroupField(peCheckboxGroups.ano, records, 'ano', filtrosProcessoEditorial.anos);
  populateCheckboxGroupField(peCheckboxGroups.disciplina, records, 'frente', filtrosProcessoEditorial.disciplinas);
  populateCheckboxGroupTipoAv(peCheckboxGroups.tipoAv, records, filtrosProcessoEditorial.tiposAv);
  populateCheckboxGroupField(peCheckboxGroups.responsavel, records, 'responsavel', filtrosProcessoEditorial.responsaveis);
  renderizarGrupoCheckbox(peCheckboxGroups.statusEditorial, OPCOES_PE_STATUS_EDITORIAL, filtrosProcessoEditorial.statusEditorial);
}

// Aplica os filtros do popover (Módulo, Ano, Disciplina, Tipo de AV, Responsável, Status do
// processo e busca) sobre o recorte global já filtrado (filteredRecords)
function aplicarFiltrosProcessoEditorial(dados) {
  const anoAplicacao = peSelectFilters.ano.value;
  const modulo = peSelectFilters.modulo.value;
  const busca = safe(peFilterBusca.value).toLowerCase();

  return dados.filter((record) => {
    if (anoAplicacao && obterAnoAplicacao(record) !== anoAplicacao) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (!passaFiltroMultiplo(safe(record.ano), filtrosProcessoEditorial.anos)) return false;
    if (!passaFiltroMultiplo(safe(record.frente), filtrosProcessoEditorial.disciplinas)) return false;
    if (!passaFiltroMultiplo(safe(record.tipo_av), filtrosProcessoEditorial.tiposAv)) return false;
    if (!passaFiltroMultiplo(safe(record.responsavel), filtrosProcessoEditorial.responsaveis)) return false;

    const status = calcularStatusProcesso(record);
    if (!passaFiltroMultiplo(status, filtrosProcessoEditorial.statusEditorial)) return false;

    if (busca) {
      const camposBusca = [record.modulo, record.ano, record.frente, record.tipo_av, record.responsavel, status];
      const matchesBusca = camposBusca.some((value) => safe(value).toLowerCase().includes(busca));
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Base filtrada da seção Processo Editorial (popover + busca), a partir do recorte global
// já filtrado pelo header (filteredRecords) — mesma base usada pelos cards e pela tabela
function obterDadosProcessoEditorialFiltrados() {
  return aplicarFiltrosProcessoEditorial(filteredRecords);
}

// Seleciona o filtro global "Filtrar por avaliação:" do cabeçalho da seção Processo Editorial
// (mesmo padrão do filtro equivalente na aba Coordenador — coordFiltroTipoAvGlobal): afeta a
// tabela principal (resumo por ano), as linhas expandidas e os cards, pois todos derivam da
// mesma base filtrada em renderizarProcessoEditorial
function selecionarFiltroTipoAvGlobalProcessoEditorial(tipoAv) {
  peFiltroTipoAvGlobal = tipoAv;
  renderizarProcessoEditorial();
}

// Renderiza a barra "Filtrar por avaliação:" no cabeçalho da seção Processo Editorial, com um
// botão pill por tipo de AV — mesmo componente visual/opções (OPCOES_FILTRO_TIPO_AV_COORDENADOR)
// já usado na aba Coordenador
function renderizarFiltroAvaliacaoProcessoEditorial() {
  const container = peFiltroAvaliacaoTopo;
  container.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'coord-detail-filter-label';
  label.textContent = 'Filtrar por avaliação:';
  container.appendChild(label);

  OPCOES_FILTRO_TIPO_AV_COORDENADOR.forEach((opcao) => {
    const valor = opcao === 'Todas' ? null : opcao;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'coord-detail-filter-btn';
    btn.classList.toggle('active', peFiltroTipoAvGlobal === valor);
    btn.textContent = opcao;
    btn.addEventListener('click', () => selecionarFiltroTipoAvGlobalProcessoEditorial(valor));
    container.appendChild(btn);
  });
}

// Verifica se um registro passa no filtro rápido (clique em card) atualmente ativo
function passaFiltroRapidoProcessoEditorial(record) {
  if (!filtroRapidoProcessoEditorial) return true;

  const status = calcularStatusProcesso(record);
  switch (filtroRapidoProcessoEditorial) {
    case 'concluido':
      return status === 'Concluído';
    case 'andamento':
      return status === 'Em andamento';
    default:
      return true;
  }
}

// Alterna o filtro rápido do card clicado: se já estava ativo, desliga; senão, assume o novo
function alternarFiltroRapidoProcessoEditorial(tipo) {
  filtroRapidoProcessoEditorial = filtroRapidoProcessoEditorial === tipo ? null : tipo;
  renderizarProcessoEditorial();
}

// Atualiza o destaque visual (borda/sombra) do card correspondente ao filtro rápido ativo
function atualizarDestaqueCardsProcessoEditorial() {
  peCardsGrid.querySelectorAll('[data-quick-filter]').forEach((card) => {
    const tipo = card.dataset.quickFilter;
    card.classList.toggle('is-quick-active', tipo === filtroRapidoProcessoEditorial);
    card.setAttribute('aria-pressed', String(tipo === filtroRapidoProcessoEditorial));
  });
}

// Agrupa TODOS os registros do recorte filtrado em "provas" consolidadas, aplicando por ano
// as mesmas regras de bloco/bloquinho já usadas na tabela principal (ver
// agruparRegistrosProcessoEditorialPorAno) — usado pelos cards executivos, para que os totais
// batam com a tabela (ex.: uma prova de Ensino Médio com 8 frentes conta 1 vez, não 8)
function agruparTodosOsRegistrosProcessoEditorial(dados) {
  const porAno = new Map();

  dados.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!porAno.has(chave)) porAno.set(chave, []);
    porAno.get(chave).push(record);
  });

  const grupos = [];
  porAno.forEach((registrosDoAno, ano) => {
    grupos.push(...agruparRegistrosProcessoEditorialPorAno(ano, registrosDoAno));
  });
  return grupos;
}

// Calcula e renderiza os cards executivos a partir do recorte filtrado pelo popover/busca
// (sem o filtro rápido, para que os totais continuem batendo com o que cada card representa):
// Em andamento, Concluídas.
// Usam a base consolidada por bloco/bloquinho (uma "prova" = 1 linha da tabela, não 1 registro
// por frente).
function atualizarCardsProcessoEditorial(dados) {
  const grupos = agruparTodosOsRegistrosProcessoEditorial(dados);
  let concluidas = 0;
  let andamento = 0;
  let validadas = 0;

  grupos.forEach((grupo) => {
    const status = calcularStatusConsolidado(grupo.registros);
    if (status === 'Concluído') concluidas += 1;
    else if (status === 'Em andamento') andamento += 1;

    if (grupo.registros.every((record) => Boolean(safe(record.devolutiva_coord)))) {
      validadas += 1;
    }
  });

  document.getElementById('peCardAndamento').textContent = andamento;
  document.getElementById('peCardConcluidas').textContent = concluidas;
  document.getElementById('peCardValidada').textContent = validadas;

  renderizarTooltipConcluidasProcessoEditorial(dados);
  renderizarTooltipValidadaProcessoEditorial(dados);
  atualizarDestaqueCardsProcessoEditorial();
}

// Calcula, por tipo de AV normalizado, o progresso de conclusão do processo editorial a partir
// de uma lista já pronta de grupos consolidados (bloco/bloquinho — ver
// agruparTodosOsRegistrosProcessoEditorial/agruparRegistrosProcessoEditorialPorAno): quantos
// grupos estão com status Concluído (calcularStatusConsolidado) sobre o total de grupos daquele
// tipo. Por padrão mantém a ordem fixa AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM, inclusive tipos sem
// nenhum grupo (total 0); quando `filtroTipoAv` é informado (ex.: filtro "Filtrar por
// avaliação:" ativo), restringe o resultado a apenas esse tipo. Base compartilhada pela tooltip
// do card "Concluídas" e pela tooltip do badge de status por ano na tabela "Fluxo do Processo
// Editorial".
function calcularProgressoConclusaoPorGrupos(grupos, filtroTipoAv = null) {
  const tiposConsiderados = filtroTipoAv ? [filtroTipoAv] : ORDEM_TIPO_AV_PERFORMANCE;

  const totais = new Map(tiposConsiderados.map((tipo) => [tipo, { total: 0, concluidas: 0 }]));
  grupos.forEach((grupo) => {
    const tipo = normalizarTipoAvPerformance(grupo.registros[0].tipo_av);
    if (!totais.has(tipo)) return;
    const grupoTotais = totais.get(tipo);
    grupoTotais.total += 1;
    if (calcularStatusConsolidado(grupo.registros) === 'Concluído') grupoTotais.concluidas += 1;
  });

  return tiposConsiderados.map((tipo) => {
    const { total, concluidas } = totais.get(tipo);
    return {
      tipoAv: tipo,
      total,
      concluidas,
      percentual: total > 0 ? (concluidas / total) * 100 : 0
    };
  });
}

// Progresso de conclusão por tipo de AV no recorte inteiro (todos os anos) — usado pela tooltip
// do card "Concluídas"
function calcularProgressoConclusaoPorTipoAv(dados) {
  return calcularProgressoConclusaoPorGrupos(agruparTodosOsRegistrosProcessoEditorial(dados));
}

// Progresso de conclusão por tipo de AV restrito a um único ano escolar — usado pela tooltip do
// badge de status de cada linha da tabela "Fluxo do Processo Editorial". `filtroTipoAv` é o
// filtro global "Filtrar por avaliação:" da seção (peFiltroTipoAvGlobal); quando ativo, a
// tooltip mostra só aquele tipo, em vez das 5 avaliações fixas.
function calcularProgressoConclusaoPorAnoETipoAv(ano, registrosDoAno, filtroTipoAv = null) {
  return calcularProgressoConclusaoPorGrupos(
    agruparRegistrosProcessoEditorialPorAno(ano, registrosDoAno),
    filtroTipoAv
  );
}

// Calcula, por tipo de AV normalizado, o progresso de VALIDAÇÃO (devolutiva_coord preenchida em
// TODOS os componentes do bloco/bloquinho) a partir de uma lista já pronta de grupos consolidados
// (bloco/bloquinho — ver agruparTodosOsRegistrosProcessoEditorial/agruparRegistrosProcessoEditorialPorAno)
// — mesmo padrão de calcularProgressoConclusaoPorGrupos, mas usando a regra de validação do card
// "Total de Prova Validada" em vez do status consolidado. Por padrão mantém a ordem fixa
// AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM, inclusive tipos sem nenhum grupo (total 0); quando
// `filtroTipoAv` é informado (filtro "Filtrar por avaliação:" ativo), restringe o resultado a
// apenas esse tipo. Base da tooltip do card "Total de Prova Validada".
function calcularProgressoValidacaoPorGrupos(grupos, filtroTipoAv = null) {
  const tiposConsiderados = filtroTipoAv ? [filtroTipoAv] : ORDEM_TIPO_AV_PERFORMANCE;

  const totais = new Map(tiposConsiderados.map((tipo) => [tipo, { total: 0, validadas: 0 }]));
  grupos.forEach((grupo) => {
    const tipo = normalizarTipoAvPerformance(grupo.registros[0].tipo_av);
    if (!totais.has(tipo)) return;
    const grupoTotais = totais.get(tipo);
    grupoTotais.total += 1;
    if (grupo.registros.every((record) => Boolean(safe(record.devolutiva_coord)))) {
      grupoTotais.validadas += 1;
    }
  });

  return tiposConsiderados.map((tipo) => {
    const { total, validadas } = totais.get(tipo);
    return {
      tipoAv: tipo,
      total,
      validadas,
      percentual: total > 0 ? (validadas / total) * 100 : 0
    };
  });
}

// Progresso de validação por tipo de AV no recorte inteiro (todos os anos) — usado pela tooltip
// do card "Total de Prova Validada". `filtroTipoAv` restringe às linhas de um único tipo quando
// o filtro global "Filtrar por avaliação:" da seção está ativo.
function calcularProgressoValidacaoPorTipoAv(dados, filtroTipoAv = null) {
  return calcularProgressoValidacaoPorGrupos(agruparTodosOsRegistrosProcessoEditorial(dados), filtroTipoAv);
}

// Preenche um container de tooltip analítica com 1 linha por tipo de AV (label + barra de
// progresso + "concluídas de total · percentual"), no mesmo padrão visual/funcional já usado
// pela tooltip do card "Pendente de Envio" da aba Coordenador (renderizarTooltipPendentesCoordenador).
// Clicar numa linha aplica o filtro global "Filtrar por avaliação:" da seção Processo Editorial.
// Quando `grupos` já vem restrito a um único tipo de AV (filtro "Filtrar por avaliação:" ativo),
// a linha é exibida mesmo com total 0 — a mensagem de vazio só aparece quando a lista completa
// (mais de um tipo) está toda zerada.
function renderizarLinhasTooltipProgressoConclusao(container, grupos, mensagemVazia) {
  container.innerHTML = '';

  const totalGeral = grupos.reduce((soma, g) => soma + g.total, 0);

  if (totalGeral === 0 && grupos.length > 1) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-tooltip-empty';
    vazio.textContent = mensagemVazia;
    container.appendChild(vazio);
    return;
  }

  grupos.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row coord-tooltip-row--clicavel';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '-1');
    row.title =
      `${grupo.tipoAv}: ${grupo.concluidas} de ${grupo.total} concluídas ` +
      `(${formatarPercentualComVirgula(grupo.percentual)}%)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = grupo.tipoAv;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${grupo.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${grupo.concluidas} de ${grupo.total} · ${formatarPercentualComVirgula(grupo.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    row.addEventListener('click', () => selecionarFiltroTipoAvGlobalProcessoEditorial(grupo.tipoAv));

    container.appendChild(row);
  });
}

// Renderiza a dica de ferramenta analítica (tooltip) do card "Concluídas": barras compactas por
// tipo de AV mostrando o percentual de conclusão do processo editorial — mesmo padrão visual/
// funcional da tooltip do card "Pendente de Envio" da aba Coordenador
function renderizarTooltipConcluidasProcessoEditorial(dados) {
  const container = document.getElementById('peConcluidasTooltipChart');
  if (!container) return;

  const grupos = calcularProgressoConclusaoPorTipoAv(dados);
  renderizarLinhasTooltipProgressoConclusao(container, grupos, 'Não há provas no recorte atual.');
}

// Preenche um container de tooltip analítica com 1 linha por tipo de AV (label + barra de
// progresso + "validadas de total · percentual") — mesma estrutura de
// renderizarLinhasTooltipProgressoConclusao, trocando apenas o dado exibido (validadas em vez de
// concluídas). Clicar numa linha aplica o filtro global "Filtrar por avaliação:" da seção.
function renderizarLinhasTooltipProgressoValidacao(container, grupos, mensagemVazia) {
  container.innerHTML = '';

  const totalGeral = grupos.reduce((soma, g) => soma + g.total, 0);

  if (totalGeral === 0 && grupos.length > 1) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-tooltip-empty';
    vazio.textContent = mensagemVazia;
    container.appendChild(vazio);
    return;
  }

  grupos.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row coord-tooltip-row--clicavel';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '-1');
    row.title =
      `${grupo.tipoAv}: ${grupo.validadas} de ${grupo.total} validadas ` +
      `(${formatarPercentualComVirgula(grupo.percentual)}%)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = grupo.tipoAv;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${grupo.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${grupo.validadas} de ${grupo.total} · ${formatarPercentualComVirgula(grupo.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    row.addEventListener('click', () => selecionarFiltroTipoAvGlobalProcessoEditorial(grupo.tipoAv));

    container.appendChild(row);
  });
}

// Renderiza a dica de ferramenta analítica (tooltip) do card "Total de Prova Validada": barras
// compactas por tipo de AV mostrando o percentual de validação (devolutiva_coord preenchida em
// todos os componentes do bloco) — mesmo padrão visual/funcional da tooltip do card "Concluídas".
// Respeita o filtro global "Filtrar por avaliação:" da seção: quando ativo, mostra só aquele
// tipo em vez das 5 avaliações fixas.
function renderizarTooltipValidadaProcessoEditorial(dados) {
  const container = document.getElementById('peValidadaTooltipChart');
  if (!container) return;

  const grupos = calcularProgressoValidacaoPorTipoAv(dados, peFiltroTipoAvGlobal);
  renderizarLinhasTooltipProgressoValidacao(container, grupos, 'Não há provas no recorte atual.');
}

// Ordena os registros da tabela detalhada (expansão do ano): 1) avaliação/tipo de AV (ordem
// fixa AV1→AV2→2º CHAMADA→REC-SEM→REC-FIM, via normalizarTipoAvaliacao), 2) módulo,
// 3) frente/disciplina, 4) ano (ordem pedagógica 6º→7º→8º→9º→1º→2º→3º, via
// normalizarAnoSegmento — na prática já constante, pois a tabela é sempre de um único ano)
function ordenarTabelaProcessoEditorial(dados) {
  return [...dados].sort((a, b) => {
    const tipoAvA = normalizarTipoAvaliacao(a.tipo_av);
    const tipoAvB = normalizarTipoAvaliacao(b.tipo_av);
    const posTipoAvA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAvA);
    const posTipoAvB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAvB);
    const posicaoTipoAvA = posTipoAvA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posTipoAvA;
    const posicaoTipoAvB = posTipoAvB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posTipoAvB;
    if (posicaoTipoAvA !== posicaoTipoAvB) return posicaoTipoAvA - posicaoTipoAvB;

    const modulo = safe(a.modulo).localeCompare(safe(b.modulo), 'pt-BR', { numeric: true });
    if (modulo !== 0) return modulo;

    const frente = safe(a.frente).localeCompare(safe(b.frente), 'pt-BR', { numeric: true });
    if (frente !== 0) return frente;

    const numeroAnoA = normalizarAnoSegmento(a.ano);
    const numeroAnoB = normalizarAnoSegmento(b.ano);
    const chaveAnoA = numeroAnoA !== null ? `${numeroAnoA}º` : null;
    const chaveAnoB = numeroAnoB !== null ? `${numeroAnoB}º` : null;
    const posAnoA = ORDEM_ANO_ESCOLAR_COORD.indexOf(chaveAnoA);
    const posAnoB = ORDEM_ANO_ESCOLAR_COORD.indexOf(chaveAnoB);
    const posicaoAnoA = posAnoA === -1 ? ORDEM_ANO_ESCOLAR_COORD.length : posAnoA;
    const posicaoAnoB = posAnoB === -1 ? ORDEM_ANO_ESCOLAR_COORD.length : posAnoB;
    return posicaoAnoA - posicaoAnoB;
  });
}

// Formata a data/hora atual no padrão "dd/mm/aaaa HH:MM", para o texto "Última atualização"
function formatarDataHoraAtual() {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
}

// Para um ano do Ensino Fundamental (exceto a AV2 do 9º), cada registro conta como 1 prova;
// no Ensino Médio, as frentes são consolidadas por BLOCO (cada bloco/REDAÇÃO conta como 1
// prova); na AV2 do 9º ano, as frentes são consolidadas em até 5 BLOQUINHOs. Ver
// agruparRegistrosProcessoEditorialPorAno para a regra completa.
function agruparRegistrosParaContagemProcessoEditorial(ano, registros) {
  return agruparRegistrosProcessoEditorialPorAno(ano, registros).map((grupo) => grupo.registros);
}

// Agrupa os registros filtrados por ano escolar (ordem pedagógica 6º→7º→8º→9º→1º→2º→3º) e
// calcula, para cada ano com pelo menos 1 registro: total de provas, total em processo (mesma
// regra do card "Em andamento": só status === 'Em andamento', não "tudo que não terminou"),
// total finalizada (calcularStatusConsolidado === 'Concluído') e o status consolidado do ano.
// No Ensino Médio, "prova" já considera os BLOCOs consolidados (ver
// agruparRegistrosParaContagemProcessoEditorial).
function calcularResumoPorAnoProcessoEditorial(dados) {
  const grupos = new Map(ORDEM_ANO_ESCOLAR_COORD.map((ano) => [ano, []]));

  dados.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!grupos.has(chave)) return;
    grupos.get(chave).push(record);
  });

  return ORDEM_ANO_ESCOLAR_COORD.map((ano) => {
    const registros = grupos.get(ano);
    const gruposContabilizados = agruparRegistrosParaContagemProcessoEditorial(ano, registros);
    const total = gruposContabilizados.length;
    const statusPorGrupo = gruposContabilizados.map((grupo) => calcularStatusConsolidado(grupo));
    const totalFinalizada = statusPorGrupo.filter((status) => status === 'Concluído').length;
    // "Total em Processo" = mesma lógica do card "Em andamento": só conta grupos com status
    // geral "Em andamento", não tudo que ainda não foi concluído
    const totalEmProcesso = statusPorGrupo.filter((status) => status === 'Em andamento').length;

    let status;
    if (total === 0) status = 'Não iniciado';
    else if (statusPorGrupo.every((s) => s === 'Concluído')) status = 'Finalizado';
    else if (statusPorGrupo.every((s) => s === 'Pendente')) status = 'Não iniciado';
    else status = 'Em processo';

    return { ano, total, totalEmProcesso, totalFinalizada, status, registros };
  }).filter((linha) => linha.total > 0);
}

// Classe do badge para o status consolidado do ano na tabela principal (mesmas cores já
// usadas para o "Status do Processo" por registro: verde/azul/vermelho)
function badgeClassForStatusAno(status) {
  const map = {
    Finalizado: 'badge-pe-status-concluido',
    'Em processo': 'badge-pe-status-andamento',
    'Não iniciado': 'badge-pe-status-pendente'
  };
  return map[status] || '';
}

// Posiciona (position: fixed) uma tooltip analítica próxima ao elemento-alvo, sem deixá-la
// cortar nas bordas da viewport — usada pelos badges de status por ano, cuja tooltip precisa
// escapar do container com overflow-x:auto da tabela (.pe-ano-table-scroll), diferente das
// tooltips estáticas dos cards (posicionadas via CSS :hover, fora de qualquer scroll container).
function posicionarTooltipFixa(tooltip, rectAlvo) {
  const margem = 10;
  const distanciaBorda = 8;

  tooltip.style.left = '0px';
  tooltip.style.top = '0px';
  const rectTooltip = tooltip.getBoundingClientRect();

  let left = rectAlvo.left;
  if (left + rectTooltip.width > window.innerWidth - distanciaBorda) {
    left = Math.max(distanciaBorda, window.innerWidth - rectTooltip.width - distanciaBorda);
  }

  let top = rectAlvo.bottom + margem;
  if (top + rectTooltip.height > window.innerHeight - distanciaBorda) {
    top = Math.max(distanciaBorda, rectAlvo.top - rectTooltip.height - margem);
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

// Monta o badge de status de uma linha de ano da tabela "Fluxo do Processo Editorial", com uma
// dica de ferramenta (tooltip) mostrando o progresso de conclusão daquele ano por tipo de AV —
// mesmo padrão visual/funcional das tooltips dos cards "Pendente de Envio"/"Concluídas". Os
// registros considerados (linha.registros) já vêm do recorte filtrado atual (módulo, avaliação
// e demais filtros da seção), então a tooltip respeita os mesmos filtros da tela.
//
// A tooltip é anexada a document.body (não ao wrapper) e posicionada via JS
// (posicionarTooltipFixa) porque o wrapper vive dentro de um container com overflow-x:auto
// (.pe-ano-table-scroll), que cortaria uma tooltip posicionada de forma absoluta/relativa ao
// wrapper. Por isso a exibição (mouseenter/focus/click) e o ocultamento também são controlados
// via JS, em vez do :hover em CSS usado pelas tooltips estáticas dos cards.
function criarBadgeStatusAnoComTooltip(linha) {
  const wrapper = document.createElement('span');
  wrapper.className = 'coord-card-tooltip-wrapper pe-status-tooltip-wrapper';

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = `badge ${badgeClassForStatusAno(linha.status)} pe-status-badge-interativo`;
  badge.textContent = linha.status;

  const tooltipId = `peAnoStatusTooltip-${linha.ano.replace(/[^0-9a-zA-Z]/g, '')}`;
  badge.setAttribute('aria-describedby', tooltipId);

  const tooltip = document.createElement('div');
  tooltip.className = 'coord-analytic-tooltip pe-status-tooltip-fixa';
  tooltip.id = tooltipId;
  tooltip.setAttribute('role', 'tooltip');

  const titulo = document.createElement('h4');
  titulo.className = 'coord-tooltip-title';
  titulo.textContent = `Progresso do ${linha.ano} ano por avaliação`;

  const subtitulo = document.createElement('p');
  subtitulo.className = 'coord-tooltip-subtitle';
  subtitulo.textContent = 'Percentual das provas do processo editorial por tipo de avaliação neste ano escolar.';

  const chart = document.createElement('div');
  chart.className = 'coord-tooltip-chart';

  tooltip.appendChild(titulo);
  tooltip.appendChild(subtitulo);
  tooltip.appendChild(chart);

  const grupos = calcularProgressoConclusaoPorAnoETipoAv(linha.ano, linha.registros, peFiltroTipoAvGlobal);
  renderizarLinhasTooltipProgressoConclusao(chart, grupos, `Não há provas do ${linha.ano} ano no recorte atual.`);

  document.body.appendChild(tooltip);
  wrapper._peStatusTooltip = tooltip;

  let ocultarPendente = null;

  function mostrar() {
    if (ocultarPendente) {
      clearTimeout(ocultarPendente);
      ocultarPendente = null;
    }
    document
      .querySelectorAll('.pe-status-tooltip-fixa.is-visible')
      .forEach((t) => {
        if (t !== tooltip) t.classList.remove('is-visible');
      });
    posicionarTooltipFixa(tooltip, badge.getBoundingClientRect());
    tooltip.classList.add('is-visible');
  }

  function ocultar() {
    ocultarPendente = setTimeout(() => tooltip.classList.remove('is-visible'), 120);
  }

  badge.addEventListener('mouseenter', mostrar);
  badge.addEventListener('focus', mostrar);
  badge.addEventListener('mouseleave', ocultar);
  badge.addEventListener('blur', () => tooltip.classList.remove('is-visible'));

  tooltip.addEventListener('mouseenter', () => {
    if (ocultarPendente) {
      clearTimeout(ocultarPendente);
      ocultarPendente = null;
    }
  });
  tooltip.addEventListener('mouseleave', ocultar);

  badge.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    document.querySelectorAll('.pe-status-tooltip-fixa.is-visible').forEach((t) => t.classList.remove('is-visible'));
    if (abrindo) mostrar();
  });

  wrapper.appendChild(badge);
  return wrapper;
}

// Alterna a expansão do detalhamento de um ano: se já estava aberto, fecha; senão, abre o
// novo (fechando qualquer outro que estivesse aberto)
function alternarDetalheAnoProcessoEditorial(ano) {
  anoExpandidoProcessoEditorial = anoExpandidoProcessoEditorial === ano ? null : ano;
  renderizarProcessoEditorial();
}

// Obtém o identificador do registro para a coluna "ID" da tabela detalhada: usa sempre o
// campo real item.id quando preenchido; se estiver vazio, monta um ID provisório com
// módulo + tipo_av (normalizado) + ano + frente (ex.: "M3-AV1-6º-MATEMÁTICA")
function obterIdProcessoEditorial(item) {
  if (safe(item.id)) return safe(item.id);
  return `${safe(item.modulo)}-${normalizarTipoAvaliacao(item.tipo_av)}-${safe(item.ano)}-${safe(item.frente)}`;
}

// Monta uma linha (ID + 1 coluna por etapa + Status do Processo) da tabela detalhada, a
// partir de um grupo de 1 ou mais registros — 1 registro no caso do Ensino Fundamental, ou
// vários registros (frentes) consolidados em 1 bloco no caso do Ensino Médio
function criarLinhaRegistroDetalheProcessoEditorial(idExibido, registrosDoGrupo) {
  const tr = document.createElement('tr');

  const tdId = document.createElement('td');
  tdId.className = 'col-id-processo';
  tdId.textContent = idExibido;
  tdId.title = idExibido;
  tr.appendChild(tdId);

  ETAPAS_PROCESSO_EDITORIAL.forEach((etapa) => {
    const statusEtapa = calcularStatusEtapaAgregado(registrosDoGrupo, etapa.inicio, etapa.fim);
    const td = document.createElement('td');
    td.className = 'pe-status-cell';
    td.appendChild(renderizarIconeStatusProcesso(statusEtapa, etapa.titulo));
    tr.appendChild(td);
  });

  const tdStatus = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `badge ${badgeClassForStatusProcesso(calcularStatusConsolidado(registrosDoGrupo))}`;
  badge.textContent = calcularStatusConsolidado(registrosDoGrupo);
  tdStatus.appendChild(badge);
  tr.appendChild(tdStatus);

  return tr;
}

// Monta a linha expandida com o detalhamento por registro (ID + 1 coluna por etapa + Status
// do Processo) dos registros do ano selecionado
function criarLinhaDetalheAnoProcessoEditorial(ano, registros) {
  const trDetalhe = document.createElement('tr');
  trDetalhe.className = 'pe-ano-detail-row';

  const tdDetalhe = document.createElement('td');
  tdDetalhe.colSpan = 5;

  const painel = document.createElement('div');
  painel.className = 'pe-ano-detail-panel';

  const titulo = document.createElement('h4');
  titulo.className = 'pe-ano-detail-title';
  titulo.textContent = `Processos do ${ano} ano`;
  painel.appendChild(titulo);

  if (registros.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'pe-ano-detail-empty';
    vazio.textContent = 'Nenhum registro encontrado para este ano.';
    painel.appendChild(vazio);
    tdDetalhe.appendChild(painel);
    trDetalhe.appendChild(tdDetalhe);
    return trDetalhe;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper pe-ano-detail-table-scroll';

  const table = document.createElement('table');
  table.className = 'data-table pe-matrix-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const thId = document.createElement('th');
  thId.textContent = 'ID';
  thId.className = 'col-id-processo';
  trHead.appendChild(thId);
  ETAPAS_PROCESSO_EDITORIAL.forEach((etapa) => {
    const th = document.createElement('th');
    th.innerHTML = ROTULOS_COLUNA_ETAPA_HTML[etapa.titulo] || etapa.titulo;
    trHead.appendChild(th);
  });
  const thStatus = document.createElement('th');
  thStatus.textContent = 'Status do Processo';
  trHead.appendChild(thStatus);
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbodyDetalhe = document.createElement('tbody');

  // Ensino Médio: frentes consolidadas por BLOCO 1/BLOCO 2/REDAÇÃO; 9º ano na AV2: frentes
  // consolidadas em até 5 BLOQUINHOs; demais casos: 1 linha por registro (ver
  // agruparRegistrosProcessoEditorialPorAno)
  const gruposExibidos = agruparRegistrosProcessoEditorialPorAno(ano, registros);

  gruposExibidos.forEach((grupo) => {
    tbodyDetalhe.appendChild(criarLinhaRegistroDetalheProcessoEditorial(grupo.id, grupo.registros));
  });

  table.appendChild(tbodyDetalhe);
  wrapper.appendChild(table);
  painel.appendChild(wrapper);
  tdDetalhe.appendChild(painel);
  trDetalhe.appendChild(tdDetalhe);

  return trDetalhe;
}

// Renderiza a tabela principal do Processo Editorial (já com popover/busca/card aplicados),
// resumida por ano escolar: ANO / TOTAL DE PROVAS / TOTAL EM PROCESSO / TOTAL FINALIZADA /
// STATUS. Clicar no ano expande, logo abaixo, o detalhamento por registro daquele ano.
// Também atualiza o texto de última atualização.
function renderizarTabelaProcessoEditorial(dados) {
  peTableBody.innerHTML = '';
  // As tooltips dos badges de status por ano são anexadas a document.body (ver
  // criarBadgeStatusAnoComTooltip), fora da árvore do tbody, então precisam ser removidas
  // manualmente aqui antes de recriar as linhas — senão ficam órfãs a cada re-renderização.
  document.querySelectorAll('.pe-status-tooltip-fixa').forEach((el) => el.remove());

  const linhas = calcularResumoPorAnoProcessoEditorial(dados);

  if (linhas.length === 0) {
    peEmptyMessage.hidden = false;
    peTableWrapper.hidden = true;
    return;
  }
  peEmptyMessage.hidden = true;
  peTableWrapper.hidden = false;

  const fragment = document.createDocumentFragment();

  linhas.forEach((linha) => {
    const expandido = anoExpandidoProcessoEditorial === linha.ano;

    const tr = document.createElement('tr');
    tr.className = 'pe-ano-row';
    tr.classList.toggle('pe-ano-row--ativa', expandido);

    const tdAno = document.createElement('td');
    const nomeClicavel = document.createElement('button');
    nomeClicavel.type = 'button';
    nomeClicavel.className = 'pe-ano-nome';
    nomeClicavel.setAttribute('aria-expanded', String(expandido));

    const chevron = document.createElement('span');
    chevron.className = 'pe-ano-chevron';
    chevron.textContent = expandido ? '▾' : '▸';
    chevron.setAttribute('aria-hidden', 'true');

    nomeClicavel.appendChild(chevron);
    nomeClicavel.appendChild(document.createTextNode(`${linha.ano} ano`));
    nomeClicavel.addEventListener('click', () => alternarDetalheAnoProcessoEditorial(linha.ano));
    tdAno.appendChild(nomeClicavel);
    tr.appendChild(tdAno);

    [linha.total, linha.totalEmProcesso, linha.totalFinalizada].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdStatus = document.createElement('td');
    tdStatus.appendChild(criarBadgeStatusAnoComTooltip(linha));
    tr.appendChild(tdStatus);

    fragment.appendChild(tr);

    if (expandido) {
      fragment.appendChild(criarLinhaDetalheAnoProcessoEditorial(linha.ano, linha.registros));
    }
  });

  peTableBody.appendChild(fragment);

  const elUltimaAtualizacao = document.getElementById('peUltimaAtualizacao');
  if (elUltimaAtualizacao) elUltimaAtualizacao.textContent = formatarDataHoraAtual();
}

// Renderiza toda a seção Processo Editorial a partir do recorte global (filteredRecords)
function renderizarProcessoEditorial() {
  populatePEFilterOptions(filteredRecords);
  atualizarIndicadorFiltrosPE();
  renderizarFiltroAvaliacaoProcessoEditorial();

  const dadosPopover = obterDadosProcessoEditorialFiltrados();

  // Filtro global "Filtrar por avaliação:" do cabeçalho — mesmo padrão da aba Coordenador:
  // uma única base filtrada alimenta cards, tabela por ano e linhas expandidas
  const dadosFiltradosPorTipoAv = peFiltroTipoAvGlobal
    ? dadosPopover.filter((record) => normalizarTipoAvaliacao(record.tipo_av) === peFiltroTipoAvGlobal)
    : dadosPopover;

  atualizarCardsProcessoEditorial(dadosFiltradosPorTipoAv);

  const dadosTabela = dadosFiltradosPorTipoAv.filter(passaFiltroRapidoProcessoEditorial);
  renderizarTabelaProcessoEditorial(dadosTabela);
}

// --- Indicadores — Processo Editorial ---
// Sub-visão de análise do fluxo editorial (andamento/gargalos/conclusão), acessada pelo botão
// "Indicadores" da aba Processo Editorial. Usa a mesma base consolidada por bloco/bloquinho já
// usada pela tabela de acompanhamento (agruparRegistrosProcessoEditorialPorAno) — cada "prova"
// consolidada conta como 1 processo, nunca 1 linha por frente/disciplina bruta.

// DOM da view "Indicadores — Processo Editorial" já declarado em domIndPE (topo do arquivo)

// Etapas consideradas pelos Indicadores — Processo Editorial: as 6 etapas centrais do fluxo,
// sem "Envio Assinatura Coord." (nem qualquer outra etapa de apoio — checklist, envio
// gráfica, banco de provas). Reaproveita os mesmos objetos de ETAPAS_PROCESSO_EDITORIAL (só
// filtra), então qualquer ajuste de campo feito lá continua valendo aqui automaticamente.
const ETAPAS_INDICADORES_PROCESSO_EDITORIAL = ETAPAS_PROCESSO_EDITORIAL.filter(
  (etapa) => etapa.titulo !== 'Envio Assinatura Coord.'
);

// Status geral de um processo consolidado para os Indicadores — Processo Editorial: mesma
// regra de calcularStatusConsolidado, mas considerando só as 6 etapas de
// ETAPAS_INDICADORES_PROCESSO_EDITORIAL (a tabela de acompanhamento continua usando as 7
// etapas de ETAPAS_PROCESSO_EDITORIAL, incluindo Envio Assinatura Coord. — não alterada)
function calcularStatusProcessoEditorialIndicadores(registros) {
  const statusPorEtapa = ETAPAS_INDICADORES_PROCESSO_EDITORIAL.map((etapa) =>
    calcularStatusEtapaAgregado(registros, etapa.inicio, etapa.fim)
  );
  const rotulos = { completed: 'Concluído', pending: 'Pendente', 'in-progress': 'Em andamento' };
  return rotulos[consolidarStatusEtapas(statusPorEtapa)];
}

// Duração (em dias corridos) de 1 etapa para um processo consolidado: diferença entre a
// menor data de início e a maior data de fim encontradas entre os registros do grupo para
// essa etapa específica. Retorna null quando não há início e fim válidos (não calculável).
function calcularDuracaoEtapaProcesso(registros, etapa) {
  let menorInicio = null;
  let maiorFim = null;

  registros.forEach((record) => {
    const inicio = parseBrDate(record[etapa.inicio]);
    const fim = parseBrDate(record[etapa.fim]);
    if (inicio && (!menorInicio || inicio < menorInicio)) menorInicio = inicio;
    if (fim && (!maiorFim || fim > maiorFim)) maiorFim = fim;
  });

  if (!menorInicio || !maiorFim || maiorFim < menorInicio) return null;
  return Math.round((maiorFim.getTime() - menorInicio.getTime()) / (1000 * 60 * 60 * 24));
}

// Duração geral (em dias) de um processo consolidado, considerando a primeira data de início
// e a última data de fim entre TODAS as etapas informadas (não uma etapa isolada) — usada
// para a "Média geral do processo". Retorna null quando não há início e fim válidos.
function calcularDuracaoProcessoEditorial(registros, etapas) {
  let menorInicio = null;
  let maiorFim = null;

  registros.forEach((record) => {
    etapas.forEach((etapa) => {
      const inicio = parseBrDate(record[etapa.inicio]);
      const fim = parseBrDate(record[etapa.fim]);
      if (inicio && (!menorInicio || inicio < menorInicio)) menorInicio = inicio;
      if (fim && (!maiorFim || fim > maiorFim)) maiorFim = fim;
    });
  });

  if (!menorInicio || !maiorFim || maiorFim < menorInicio) return null;
  return Math.round((maiorFim.getTime() - menorInicio.getTime()) / (1000 * 60 * 60 * 24));
}

// Duração média de cada etapa (dias), na mesma ordem de `etapas` — usada pelo gráfico "Média
// de tempo por etapa" e pelo card "Etapa mais lenta". Só considera processos com início e fim
// válidos para aquela etapa específica (amostras); etapas sem nenhuma amostra ficam com média 0.
function calcularDuracaoMediaPorEtapa(processos, etapas) {
  return etapas.map((etapa) => {
    const duracoes = processos
      .map((processo) => calcularDuracaoEtapaProcesso(processo.registros, etapa))
      .filter((duracao) => duracao !== null);
    const media = duracoes.length ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length : 0;
    return { etapa: etapa.titulo, media, amostras: duracoes.length };
  });
}

// Consolida o recorte filtrado (registros brutos) na mesma base de "processos" usada pela
// tabela do Acompanhamento: 1 item por prova/bloco/bloquinho já consolidado, com o status
// geral (calcularStatusProcessoEditorialIndicadores, só as 6 etapas centrais) e a duração
// geral do processo (calcularDuracaoProcessoEditorial) pré-calculados.
function obterBaseConsolidadaProcessoEditorial(dados) {
  return agruparTodosOsRegistrosProcessoEditorial(dados).map((grupo) => {
    const primeiro = grupo.registros[0];
    const numeroAno = normalizarAnoSegmento(primeiro.ano);
    return {
      id: grupo.id,
      ano: numeroAno !== null ? `${numeroAno}º` : safe(primeiro.ano),
      tipoAv: normalizarTipoAvaliacao(primeiro.tipo_av),
      modulo: safe(primeiro.modulo),
      registros: grupo.registros,
      status: calcularStatusProcessoEditorialIndicadores(grupo.registros),
      duracao: calcularDuracaoProcessoEditorial(grupo.registros, ETAPAS_INDICADORES_PROCESSO_EDITORIAL)
    };
  });
}

// Rótulo de exibição do status geral de 1 processo consolidado: mesma regra de
// calcularStatusConsolidado, só troca "Pendente" por "Não iniciado" nesta sub-visão
function rotuloStatusGeralPE(status) {
  return status === 'Pendente' ? 'Não iniciado' : status;
}

// Popula os selects de Ano, Módulo e Tipo de AV do popover de filtros no topo da seção
// Indicadores — Processo Editorial (a partir do recorte completo já filtrado da aba)
// Opções fixas do campo "Status do processo" do popover — mesmos value/rótulo das <option>
// estáticas de antes
const OPCOES_INDPE_STATUS = [
  { value: 'Pendente', label: 'Não iniciado' },
  { value: 'Em andamento', label: 'Em processo' },
  { value: 'Concluído', label: 'Concluído' }
];

function populateIndicadoresFilterOptionsPE(records) {
  populateCheckboxGroupField(indCheckboxGroupsPE.ano, records, 'ano', filtrosIndicadoresTopoPE.anos);
  populateSelectOptions(indSelectFiltersPE.modulo, records, 'modulo', 'Módulo');
  populateCheckboxGroupTipoAv(indCheckboxGroupsPE.tipoAv, records, filtrosIndicadoresTopoPE.tiposAv);
  renderizarGrupoCheckbox(indCheckboxGroupsPE.status, OPCOES_INDPE_STATUS, filtrosIndicadoresTopoPE.status);
}

// Aplica os filtros do popover de topo (Ano, Módulo, Tipo de AV, Status do processo e busca)
// sobre a base consolidada de processos (obterBaseConsolidadaProcessoEditorial)
function aplicarFiltrosIndicadoresTopoPE(processos) {
  const modulo = indSelectFiltersPE.modulo.value;
  const busca = safe(indFilterBuscaPE.value).toLowerCase();

  // Os valores de "ano" marcados vêm no formato bruto dos registros — convertidos para a
  // mesma chave normalizada (ex.: "6º") usada em processo.ano, igual à conversão que já
  // existia para o valor único do <select>
  const chavesAnoSelecionadas = filtrosIndicadoresTopoPE.anos.map((anoValor) => {
    const numeroAno = normalizarAnoSegmento(anoValor);
    return numeroAno !== null ? `${numeroAno}º` : anoValor;
  });
  const tiposAvSelecionados = filtrosIndicadoresTopoPE.tiposAv.map((v) => normalizarTipoAvaliacao(v));

  return processos.filter((processo) => {
    if (!passaFiltroMultiplo(processo.ano, chavesAnoSelecionadas)) return false;
    if (modulo && processo.modulo !== modulo) return false;
    if (!passaFiltroMultiplo(processo.tipoAv, tiposAvSelecionados)) return false;
    if (!passaFiltroMultiplo(processo.status, filtrosIndicadoresTopoPE.status)) return false;

    if (busca) {
      const camposBusca = [processo.id, processo.ano, processo.tipoAv, processo.modulo, processo.status];
      const matchesBusca = camposBusca.some((value) => safe(value).toLowerCase().includes(busca));
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Aplica os filtros interativos ativados ao clicar em itens dos gráficos (ano, avaliação,
// módulo, etapa de gargalo e status)
function aplicarFiltrosIndicadoresPE(processos) {
  return processos.filter((processo) => {
    if (filtrosIndicadoresPE.ano && processo.ano !== filtrosIndicadoresPE.ano) return false;
    if (filtrosIndicadoresPE.tipoAv && processo.tipoAv !== filtrosIndicadoresPE.tipoAv) return false;
    if (filtrosIndicadoresPE.modulo && processo.modulo !== filtrosIndicadoresPE.modulo) return false;
    if (filtrosIndicadoresPE.status && processo.status !== filtrosIndicadoresPE.status) return false;
    if (filtrosIndicadoresPE.etapa) {
      const etapa = ETAPAS_INDICADORES_PROCESSO_EDITORIAL.find((e) => e.titulo === filtrosIndicadoresPE.etapa);
      const statusEtapa = etapa ? calcularStatusEtapaAgregado(processo.registros, etapa.inicio, etapa.fim) : null;
      if (statusEtapa !== 'pending') return false;
    }
    return true;
  });
}

// Liga/desliga (toggle) um filtro interativo (clique em gráfico) e recalcula a seção
function alternarFiltroIndicadorPE(campo, valor) {
  filtrosIndicadoresPE[campo] = filtrosIndicadoresPE[campo] === valor ? null : valor;
  renderizarIndicadoresProcessoEditorial(indicadoresPEDadosBase);
}

// Remove todos os filtros internos dos Indicadores — Processo Editorial
function limparFiltrosIndicadoresPE() {
  filtrosIndicadoresPE = { ano: null, tipoAv: null, modulo: null, etapa: null, status: null };
  renderizarIndicadoresProcessoEditorial(indicadoresPEDadosBase);
}

const ROTULOS_FILTROS_INDICADORES_PE = {
  ano: 'Ano',
  tipoAv: 'Avaliação',
  modulo: 'Módulo',
  etapa: 'Etapa',
  status: 'Status'
};

// Renderiza a área de badges "Filtros ativos:" dos Indicadores — Processo Editorial
function renderizarFiltrosAtivosIndicadoresPE() {
  const lista = domIndPE.filtrosAtivosLista;
  lista.innerHTML = '';

  const ativos = Object.entries(filtrosIndicadoresPE).filter(([, valor]) => valor);
  domIndPE.filtrosAtivos.hidden = ativos.length === 0;

  ativos.forEach(([campo, valor]) => {
    const badge = document.createElement('span');
    badge.className = 'indicadores-filtro-badge';

    const texto = document.createElement('span');
    texto.textContent = `${ROTULOS_FILTROS_INDICADORES_PE[campo]}: ${campo === 'status' ? rotuloStatusGeralPE(valor) : valor}`;
    badge.appendChild(texto);

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'indicadores-filtro-badge-remover';
    remover.setAttribute('aria-label', `Remover filtro de ${ROTULOS_FILTROS_INDICADORES_PE[campo]}`);
    remover.textContent = '✕';
    remover.addEventListener('click', () => alternarFiltroIndicadorPE(campo, valor));
    badge.appendChild(remover);

    lista.appendChild(badge);
  });
}

// Calcula os indicadores dos cards executivos + gargalo/duração por etapa + gráficos, a
// partir dos processos consolidados já filtrados
function calcularIndicadoresProcessoEditorial(processos) {
  const totalProcessos = processos.length;
  const concluidas = processos.filter((p) => p.status === 'Concluído').length;
  const emAndamento = processos.filter((p) => p.status === 'Em andamento').length;
  const taxaConclusao = totalProcessos ? (concluidas / totalProcessos) * 100 : 0;

  // Média geral do processo: soma das durações gerais (início mais cedo → fim mais tarde,
  // entre as 6 etapas) / quantidade de processos com duração calculável
  const duracoesGerais = processos.map((p) => p.duracao).filter((d) => d !== null);
  const mediaGeralDias = duracoesGerais.length
    ? duracoesGerais.reduce((a, b) => a + b, 0) / duracoesGerais.length
    : 0;

  // Etapa mais lenta: maior duração média entre as 6 etapas (só entre as que têm amostra)
  const duracaoPorEtapa = calcularDuracaoMediaPorEtapa(processos, ETAPAS_INDICADORES_PROCESSO_EDITORIAL);
  const etapasComAmostra = duracaoPorEtapa.filter((item) => item.amostras > 0);
  const etapaMaisLenta = etapasComAmostra.length
    ? etapasComAmostra.reduce((maior, atual) => (atual.media > maior.media ? atual : maior))
    : null;

  const gargalos = ETAPAS_INDICADORES_PROCESSO_EDITORIAL.map((etapa) => ({
    etapa: etapa.titulo,
    pendencias: processos.filter(
      (p) => calcularStatusEtapaAgregado(p.registros, etapa.inicio, etapa.fim) === 'pending'
    ).length
  })).sort((a, b) => b.pendencias - a.pendencias);

  const maiorGargalo = gargalos.length && gargalos[0].pendencias > 0 ? gargalos[0] : null;

  return {
    totalProcessos,
    concluidas,
    emAndamento,
    taxaConclusao,
    mediaGeralDias,
    etapaMaisLenta,
    duracaoPorEtapa,
    gargalos,
    maiorGargalo
  };
}

function renderizarCardsIndicadoresPE(indicadores) {
  domIndPE.cardMediaGeral.textContent = `${formatarMediaAtrasoGrafico(indicadores.mediaGeralDias)} dias`;

  if (indicadores.etapaMaisLenta) {
    domIndPE.cardEtapaLenta.textContent = indicadores.etapaMaisLenta.etapa.toUpperCase();
    domIndPE.cardEtapaLentaSub.textContent = `${formatarMediaAtrasoGrafico(indicadores.etapaMaisLenta.media)} dias médios`;
  } else {
    domIndPE.cardEtapaLenta.textContent = 'Sem dados';
    domIndPE.cardEtapaLentaSub.textContent = '0 dias médios';
  }

  if (indicadores.maiorGargalo) {
    domIndPE.cardGargalo.textContent = indicadores.maiorGargalo.etapa.toUpperCase();
    domIndPE.cardGargaloSub.textContent = `${indicadores.maiorGargalo.pendencias} pendência(s)`;
  } else {
    domIndPE.cardGargalo.textContent = 'Sem gargalos';
    domIndPE.cardGargaloSub.textContent = '0 pendências';
  }

  domIndPE.cardAndamento.textContent = `${indicadores.emAndamento} provas`;
  domIndPE.cardConcluidas.textContent = `${indicadores.concluidas} provas`;
  domIndPE.cardTaxaConclusao.textContent = `${formatarPercentualComVirgula(indicadores.taxaConclusao)}%`;
  domIndPE.cardTaxaConclusaoSub.textContent = `${indicadores.concluidas} de ${indicadores.totalProcessos} provas concluídas`;
}

// Gráfico "Média de tempo por etapa" (barras horizontais, mesmo padrão visual dos rankings) —
// mantém a ordem fixa das etapas (não ordena por valor)
function renderizarGraficoTempoPorEtapaPE(duracaoPorEtapa) {
  const container = document.getElementById('graficoTempoPorEtapaPE');
  container.innerHTML = '';

  if (duracaoPorEtapa.every((item) => item.amostras === 0)) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem dados no recorte atual.</p>';
    return;
  }

  const maiorValor = Math.max(...duracaoPorEtapa.map((item) => item.media), 1);

  duracaoPorEtapa.forEach((item) => {
    const linha = document.createElement('div');
    linha.className = 'coord-ranking-row';

    const label = document.createElement('span');
    label.className = 'coord-ranking-label';
    label.textContent = item.etapa;
    linha.appendChild(label);

    const track = document.createElement('span');
    track.className = 'coord-ranking-track';
    const fill = document.createElement('span');
    fill.className = 'coord-ranking-fill';
    fill.style.width = `${(item.media / maiorValor) * 100}%`;
    track.appendChild(fill);
    linha.appendChild(track);

    const valor = document.createElement('span');
    valor.className = 'coord-ranking-value';
    valor.textContent = `${formatarMediaAtrasoGrafico(item.media)} dias`;
    linha.appendChild(valor);

    container.appendChild(linha);
  });
}

// Status predominante de 1 etapa entre os processos de 1 ano, para o Mapa de calor: conta
// quantos processos estão completed/in-progress/pending naquela etapa e devolve o de maior
// contagem; em caso de empate, prioriza Em andamento → Pendente → Concluído (ordem de checagem)
function calcularStatusPredominanteCelulaPE(processosDoAno, etapa) {
  const contagem = { completed: 0, 'in-progress': 0, pending: 0 };
  processosDoAno.forEach((processo) => {
    const status = calcularStatusEtapaAgregado(processo.registros, etapa.inicio, etapa.fim);
    contagem[status] += 1;
  });

  const maior = Math.max(contagem.completed, contagem['in-progress'], contagem.pending);
  if (contagem['in-progress'] === maior) return 'in-progress';
  if (contagem.pending === maior) return 'pending';
  return 'completed';
}

// Gráfico "Mapa de calor do processo": tabela Ano × Etapa, cor = status predominante
// (verde = concluído, azul = em andamento, vermelho = pendente)
function renderizarMapaCalorProcessoEditorial(processos) {
  const container = document.getElementById('graficoMapaCalorPE');
  container.innerHTML = '';

  const anos = ORDEM_ANO_ESCOLAR_COORD.filter((ano) => processos.some((p) => p.ano === ano));
  if (anos.length === 0) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem dados no recorte atual.</p>';
    return;
  }

  const tabela = document.createElement('table');
  tabela.className = 'pe-heatmap-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  trHead.appendChild(document.createElement('th'));
  ETAPAS_INDICADORES_PROCESSO_EDITORIAL.forEach((etapa) => {
    const th = document.createElement('th');
    th.innerHTML = ROTULOS_COLUNA_ETAPA_HTML[etapa.titulo] || etapa.titulo;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  tabela.appendChild(thead);

  const tbody = document.createElement('tbody');
  anos.forEach((ano) => {
    const processosDoAno = processos.filter((p) => p.ano === ano);
    const tr = document.createElement('tr');

    const thAno = document.createElement('th');
    thAno.textContent = ano;
    tr.appendChild(thAno);

    ETAPAS_INDICADORES_PROCESSO_EDITORIAL.forEach((etapa) => {
      const status = calcularStatusPredominanteCelulaPE(processosDoAno, etapa);
      const td = document.createElement('td');
      td.className = `pe-heatmap-cell pe-heatmap-cell--${status}`;
      td.title = `${ano} · ${etapa.titulo}: ${ROTULOS_STATUS_ETAPA[status]}`;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  tabela.appendChild(tbody);
  container.appendChild(tabela);
}

// Gráfico 1 — Distribuição do status do processo (donut/pizza), mesmo padrão visual SVG
// manual do donut "Distribuição dos atrasos por avaliação" da aba Coordenador
const CORES_DONUT_STATUS_PE = {
  'Não iniciado': '#b91c1c',
  'Em andamento': '#1f4775',
  'Concluído': '#15803d'
};

function renderizarGraficoStatusProcessoPE(processos) {
  const container = document.getElementById('graficoStatusProcessoPE');
  container.innerHTML = '';

  const total = processos.length;
  if (total === 0) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem processos no recorte atual.</p>';
    return;
  }

  const categorias = ['Não iniciado', 'Em andamento', 'Concluído'];
  const contagem = categorias.map((categoria) => ({
    categoria,
    statusReal: categoria === 'Não iniciado' ? 'Pendente' : categoria,
    quantidade: processos.filter((p) => rotuloStatusGeralPE(p.status) === categoria).length
  }));

  const wrapper = document.createElement('div');
  wrapper.className = 'pe-donut-status-wrapper';

  const raio = 60;
  const centro = 70;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 140 140');
  svg.setAttribute('class', 'pe-donut-status-svg');

  const trilho = document.createElementNS(svgNS, 'circle');
  trilho.setAttribute('cx', centro);
  trilho.setAttribute('cy', centro);
  trilho.setAttribute('r', raio);
  trilho.setAttribute('class', 'pe-donut-status-trilho');
  svg.appendChild(trilho);

  contagem.forEach((item) => {
    if (item.quantidade === 0) return;
    const fracao = item.quantidade / total;
    const tamanho = fracao * circunferencia;

    const fatia = document.createElementNS(svgNS, 'circle');
    fatia.setAttribute('cx', centro);
    fatia.setAttribute('cy', centro);
    fatia.setAttribute('r', raio);
    fatia.setAttribute('class', 'pe-donut-status-fatia');
    fatia.style.stroke = CORES_DONUT_STATUS_PE[item.categoria];
    fatia.style.strokeDasharray = `${tamanho} ${circunferencia - tamanho}`;
    fatia.style.strokeDashoffset = -acumulado;
    fatia.style.cursor = 'pointer';
    const tituloEl = document.createElementNS(svgNS, 'title');
    tituloEl.textContent = `${item.categoria}: ${item.quantidade} (${formatarPercentualComVirgula((item.quantidade / total) * 100)}%)`;
    fatia.appendChild(tituloEl);
    fatia.addEventListener('click', () => alternarFiltroIndicadorPE('status', item.statusReal));
    svg.appendChild(fatia);

    acumulado += tamanho;
  });

  wrapper.appendChild(svg);

  const centroTexto = document.createElement('div');
  centroTexto.className = 'pe-donut-status-centro';
  centroTexto.innerHTML = `<span class="pe-donut-status-centro-valor">${total}</span><span class="pe-donut-status-centro-label">PROCESSOS</span>`;
  wrapper.appendChild(centroTexto);

  container.appendChild(wrapper);

  const legenda = document.createElement('div');
  legenda.className = 'pe-donut-status-legenda';
  contagem.forEach((item) => {
    const linha = document.createElement('button');
    linha.type = 'button';
    linha.className = 'pe-donut-status-legenda-item';
    linha.classList.toggle('is-ativo', filtrosIndicadoresPE.status === item.statusReal);
    linha.innerHTML =
      `<span class="pe-donut-status-legenda-dot" style="background:${CORES_DONUT_STATUS_PE[item.categoria]}"></span>` +
      `<span>${item.categoria}</span>` +
      `<span class="pe-donut-status-legenda-valor">${item.quantidade} (${formatarPercentualComVirgula(total ? (item.quantidade / total) * 100 : 0)}%)</span>`;
    linha.addEventListener('click', () => alternarFiltroIndicadorPE('status', item.statusReal));
    legenda.appendChild(linha);
  });
  container.appendChild(legenda);
}

// Gráfico 2 — Gargalos por etapa (barras horizontais, mesmo padrão visual dos rankings)
function renderizarGraficoGargalosPE(gargalos) {
  const container = document.getElementById('graficoGargalosPE');
  container.innerHTML = '';

  if (gargalos.every((g) => g.pendencias === 0)) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem gargalos no recorte atual.</p>';
    return;
  }

  const maiorValor = Math.max(...gargalos.map((g) => g.pendencias), 1);

  gargalos.forEach((item) => {
    const linha = document.createElement('div');
    linha.className = 'coord-ranking-row';
    linha.classList.toggle('coord-ranking-row--ativa', filtrosIndicadoresPE.etapa === item.etapa);
    linha.style.cursor = 'pointer';
    linha.addEventListener('click', () => alternarFiltroIndicadorPE('etapa', item.etapa));

    const label = document.createElement('span');
    label.className = 'coord-ranking-label';
    label.textContent = item.etapa;
    linha.appendChild(label);

    const track = document.createElement('span');
    track.className = 'coord-ranking-track';
    const fill = document.createElement('span');
    fill.className = 'coord-ranking-fill';
    fill.style.width = `${(item.pendencias / maiorValor) * 100}%`;
    track.appendChild(fill);
    linha.appendChild(track);

    const valor = document.createElement('span');
    valor.className = 'coord-ranking-value';
    valor.textContent = `${item.pendencias} pendência(s)`;
    linha.appendChild(valor);

    container.appendChild(linha);
  });
}

// Gráfico 3 — Andamento por ano escolar (barras horizontais com percentual de conclusão)
function renderizarGraficoAndamentoAnoPE(processos) {
  const container = document.getElementById('graficoAndamentoAnoPE');
  container.innerHTML = '';

  const dados = ORDEM_ANO_ESCOLAR_COORD.map((ano) => {
    const doAno = processos.filter((p) => p.ano === ano);
    const concluidos = doAno.filter((p) => p.status === 'Concluído').length;
    const pct = doAno.length ? (concluidos / doAno.length) * 100 : 0;
    return { ano, total: doAno.length, concluidos, pct };
  }).filter((item) => item.total > 0);

  if (dados.length === 0) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem dados no recorte atual.</p>';
    return;
  }

  dados.forEach((item) => {
    const linha = document.createElement('div');
    linha.className = 'coord-ranking-row';
    linha.classList.toggle('coord-ranking-row--ativa', filtrosIndicadoresPE.ano === item.ano);
    linha.style.cursor = 'pointer';
    linha.addEventListener('click', () => alternarFiltroIndicadorPE('ano', item.ano));

    const label = document.createElement('span');
    label.className = 'coord-ranking-label';
    label.textContent = item.ano;
    linha.appendChild(label);

    const track = document.createElement('span');
    track.className = 'coord-ranking-track';
    const fill = document.createElement('span');
    fill.className = 'coord-ranking-fill';
    fill.style.width = `${item.pct}%`;
    track.appendChild(fill);
    linha.appendChild(track);

    const valor = document.createElement('span');
    valor.className = 'coord-ranking-value';
    valor.textContent = `${item.concluidos} de ${item.total} — ${formatarPercentualComVirgula(item.pct)}%`;
    linha.appendChild(valor);

    container.appendChild(linha);
  });
}

// Gráfico 4 — Andamento por avaliação (barras horizontais com percentual de conclusão)
function renderizarGraficoAndamentoAvaliacaoPE(processos) {
  const container = document.getElementById('graficoAndamentoAvaliacaoPE');
  container.innerHTML = '';

  const dados = ORDEM_TIPO_AV_PERFORMANCE.map((tipoAv) => {
    const doTipo = processos.filter((p) => p.tipoAv === tipoAv);
    const concluidos = doTipo.filter((p) => p.status === 'Concluído').length;
    const pct = doTipo.length ? (concluidos / doTipo.length) * 100 : 0;
    return { tipoAv, total: doTipo.length, concluidos, pct };
  }).filter((item) => item.total > 0);

  if (dados.length === 0) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem dados no recorte atual.</p>';
    return;
  }

  dados.forEach((item) => {
    const linha = document.createElement('div');
    linha.className = 'coord-ranking-row';
    linha.classList.toggle('coord-ranking-row--ativa', filtrosIndicadoresPE.tipoAv === item.tipoAv);
    linha.style.cursor = 'pointer';
    linha.addEventListener('click', () => alternarFiltroIndicadorPE('tipoAv', item.tipoAv));

    const label = document.createElement('span');
    label.className = 'coord-ranking-label';
    label.textContent = item.tipoAv;
    linha.appendChild(label);

    const track = document.createElement('span');
    track.className = 'coord-ranking-track';
    const fill = document.createElement('span');
    fill.className = 'coord-ranking-fill';
    fill.style.width = `${item.pct}%`;
    track.appendChild(fill);
    linha.appendChild(track);

    const valor = document.createElement('span');
    valor.className = 'coord-ranking-value';
    valor.textContent = `${item.concluidos} de ${item.total} — ${formatarPercentualComVirgula(item.pct)}%`;
    linha.appendChild(valor);

    container.appendChild(linha);
  });
}

// Tabela — Resumo por ano e avaliação: agrupa a base consolidada por Ano + Tipo de AV,
// ordenado pela menor taxa de conclusão primeiro (desempate: maior total de provas)
function gerarResumoAnoAvaliacaoPE(processos) {
  const grupos = new Map();

  processos.forEach((processo) => {
    const chave = `${processo.ano}||${processo.tipoAv}`;
    if (!grupos.has(chave)) {
      grupos.set(chave, { ano: processo.ano, tipoAv: processo.tipoAv, processos: [] });
    }
    grupos.get(chave).processos.push(processo);
  });

  const linhas = Array.from(grupos.values()).map((grupo) => {
    const total = grupo.processos.length;
    const concluidas = grupo.processos.filter((p) => p.status === 'Concluído').length;
    const emAndamento = grupo.processos.filter((p) => p.status === 'Em andamento').length;
    const taxaConclusao = total ? (concluidas / total) * 100 : 0;

    const duracoesGrupo = grupo.processos.map((p) => p.duracao).filter((d) => d !== null);
    const mediaProcesso = duracoesGrupo.length
      ? duracoesGrupo.reduce((a, b) => a + b, 0) / duracoesGrupo.length
      : 0;

    const gargalosGrupo = ETAPAS_INDICADORES_PROCESSO_EDITORIAL.map((etapa) => ({
      etapa: etapa.titulo,
      pendencias: grupo.processos.filter(
        (p) => calcularStatusEtapaAgregado(p.registros, etapa.inicio, etapa.fim) === 'pending'
      ).length
    })).sort((a, b) => b.pendencias - a.pendencias);
    const principalGargalo = gargalosGrupo.length && gargalosGrupo[0].pendencias > 0 ? gargalosGrupo[0] : null;

    return {
      ano: grupo.ano,
      tipoAv: grupo.tipoAv,
      total,
      emAndamento,
      concluidas,
      taxaConclusao,
      mediaProcesso,
      principalGargalo: principalGargalo ? `${principalGargalo.etapa} (${principalGargalo.pendencias})` : '—'
    };
  });

  return linhas.sort((a, b) => {
    if (a.taxaConclusao !== b.taxaConclusao) return a.taxaConclusao - b.taxaConclusao;
    return b.total - a.total;
  });
}

function renderizarTabelaResumoPE(linhas) {
  const tbody = domIndPE.resumoBody;
  tbody.innerHTML = '';

  if (linhas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="indicadores-chart-empty">Sem dados no recorte atual.</td></tr>';
    return;
  }

  linhas.forEach((linha, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-cell">${index + 1}</td>
      <td>${linha.ano}</td>
      <td>${linha.tipoAv}</td>
      <td>${linha.total}</td>
      <td>${linha.emAndamento}</td>
      <td>${linha.concluidas}</td>
      <td>${formatarPercentualComVirgula(linha.taxaConclusao)}%</td>
      <td>${formatarMediaAtrasoGrafico(linha.mediaProcesso)} dias</td>
      <td>${linha.principalGargalo}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Renderiza toda a seção "Indicadores — Processo Editorial" a partir dos registros de base
// (já filtrados pelo popover/busca/filtro rápido da aba Processo Editorial), aplicando por
// cima os filtros do popover de indicadores e os filtros interativos ativados via gráficos
function renderizarIndicadoresProcessoEditorial(dadosBase) {
  indicadoresPEDadosBase = dadosBase;

  populateIndicadoresFilterOptionsPE(filteredRecords);
  renderizarFiltrosAtivosIndicadoresPE();
  atualizarIndicadorFiltrosIndicadoresTopoPE();

  if (dadosBase.length === 0) {
    domIndPE.emptyGeral.hidden = false;
    domIndPE.emptyGeral.textContent = 'Não há dados suficientes para gerar indicadores neste recorte.';
    domIndPE.conteudo.hidden = true;
    return;
  }

  const processosBase = obterBaseConsolidadaProcessoEditorial(dadosBase);
  const processos = aplicarFiltrosIndicadoresPE(aplicarFiltrosIndicadoresTopoPE(processosBase));

  if (processos.length === 0) {
    domIndPE.emptyGeral.hidden = false;
    domIndPE.emptyGeral.textContent = 'Não há dados para os filtros selecionados.';
    domIndPE.conteudo.hidden = true;
    return;
  }
  domIndPE.emptyGeral.hidden = true;
  domIndPE.conteudo.hidden = false;

  const indicadores = calcularIndicadoresProcessoEditorial(processos);
  renderizarCardsIndicadoresPE(indicadores);
  renderizarGraficoTempoPorEtapaPE(indicadores.duracaoPorEtapa);
  renderizarGraficoGargalosPE(indicadores.gargalos);
  renderizarGraficoStatusProcessoPE(processos);
  renderizarGraficoAndamentoAvaliacaoPE(processos);
  renderizarGraficoAndamentoAnoPE(processos);
  renderizarMapaCalorProcessoEditorial(processos);
  renderizarTabelaResumoPE(gerarResumoAnoAvaliacaoPE(processos));
}

// --- Banco de Provas ---
// Lista simples (1 linha por registro) com os links de prova em branco/com gabarito de cada
// avaliação, mais os 2 cards de totais. Filtros: Módulo, Ano, Disciplina, Tipo de AV e busca
// geral (popover no topo, mesmo padrão das demais seções).

// Um link é considerado "válido" quando não está vazio e não é um placeholder textual comum
// ("-", "null", "undefined") — comparação case-insensitive
function linkValido(valor) {
  const texto = safe(valor);
  if (!texto) return false;
  const normalizado = texto.toLowerCase();
  return normalizado !== '-' && normalizado !== 'null' && normalizado !== 'undefined';
}

// Popula os selects de Módulo, Ano, Disciplina e Tipo de AV do popover de filtros da seção
// Banco de Provas
function populateBPFilterOptions(records) {
  populateSelectOptions(bpSelectFilters.modulo, records, 'modulo', 'Módulo');
  populateBPAnoCheckboxOptions(bpCheckboxGroups.ano, records);
  populateBPTipoAvOptions(bpCheckboxGroups.tipoAv, records);
  populateBPSegmentoOptions(bpCheckboxGroups.segmento, records);
  populateBPDisciplinaOptions(bpCheckboxGroups.disciplina, records);
}

// Popula o grupo de checkboxes "Série" (ano específico, ex.: 6º...3º) em ordem alfabética,
// mesma fonte de dados que antes ia para populateSelectOptions(bpSelectFilters.ano, ...)
function populateBPAnoCheckboxOptions(containerEl, records) {
  const valoresUnicos = Array.from(new Set(records.map((r) => safe(r.ano)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
  const opcoes = valoresUnicos.map((valor) => ({ value: valor, label: valor }));
  renderizarGrupoCheckbox(containerEl, opcoes, filtrosBancoProvas.anos);
}

// Rótulo (com acentuação) exibido no filtro "Disciplina" para cada chave consolidada — chave
// sempre em maiúsculas sem acento (saída de normalizarDisciplinaFiltro); disciplinas fora deste
// mapa caem no fallback da própria chave (ver obterRotuloDisciplinaFiltro)
const ROTULOS_DISCIPLINA_CONSOLIDADA = {
  ARTE: 'ARTE',
  BIOLOGIA: 'BIOLOGIA',
  CIENCIAS: 'CIÊNCIAS',
  'EDUCACAO FISICA': 'EDUCAÇÃO FÍSICA',
  FILOSOFIA: 'FILOSOFIA',
  FISICA: 'FÍSICA',
  GEOGRAFIA: 'GEOGRAFIA',
  HISTORIA: 'HISTÓRIA',
  INGLES: 'INGLÊS',
  LITERATURA: 'LITERATURA',
  MATEMATICA: 'MATEMÁTICA',
  PORTUGUES: 'PORTUGUÊS',
  QUIMICA: 'QUÍMICA',
  REDACAO: 'REDAÇÃO',
  SOCIOLOGIA: 'SOCIOLOGIA'
};

// Consolida o nome de uma disciplina/frente para o filtro "Disciplina" do Banco de Provas:
// reaproveita normalizarDisciplinaParaBloco (mesma normalização de acentos/caixa/aliases já
// usada para montar os blocos do Ensino Médio) e, por cima dela, remove o sufixo numérico (ex.:
// "MATEMATICA 1" -> "MATEMATICA") e a variação "MATEMATICA BASICA" (agrupada em "MATEMATICA")
// — assim MATEMÁTICA 1/2/3 e MATEMÁTICA BÁSICA caem todas na mesma chave/opção do filtro.
function normalizarDisciplinaFiltro(valor) {
  let chave = normalizarDisciplinaParaBloco(valor);
  chave = chave.replace(/\s+\d+$/, '');
  if (chave === 'MATEMATICA BASICA') chave = 'MATEMATICA';
  return chave;
}

// Rótulo de exibição (com acentuação) de uma chave consolidada de disciplina
function obterRotuloDisciplinaFiltro(chave) {
  return ROTULOS_DISCIPLINA_CONSOLIDADA[chave] || chave;
}

// Popula o select "Disciplina" com as chaves consolidadas (normalizarDisciplinaFiltro)
// presentes no recorte atual, em ordem alfabética pelo rótulo exibido
function populateBPDisciplinaOptions(containerEl, records) {
  const chavesPresentes = new Set(records.map((r) => normalizarDisciplinaFiltro(r.frente)).filter(Boolean));
  const chavesOrdenadas = Array.from(chavesPresentes).sort((a, b) =>
    obterRotuloDisciplinaFiltro(a).localeCompare(obterRotuloDisciplinaFiltro(b), 'pt-BR')
  );
  const opcoes = chavesOrdenadas.map((chave) => ({ value: chave, label: obterRotuloDisciplinaFiltro(chave) }));
  renderizarGrupoCheckbox(containerEl, opcoes, filtrosBancoProvas.disciplinas);
}

// Popula o select "Tipo de AV" na ordem fixa AV1 → AV2 → 2º CHAM → REC-SEM → REC-FIM (em vez da
// ordem alfabética de populateSelectOptions) — mesma ordem de ORDEM_TIPO_AV_PERFORMANCE, usada
// via normalizarTipoAvPerformance apenas para ordenar/rotular; o value da <option> continua o
// valor bruto do registro (record.tipo_av), pois é o que aplicarFiltrosBancoProvas compara
function populateBPTipoAvOptions(containerEl, records) {
  const valoresUnicos = Array.from(new Set(records.map((r) => safe(r.tipo_av)).filter(Boolean)));

  const rotulos = {
    AV1: 'AV1',
    AV2: 'AV2',
    '2º CHAMADA': '2º CHAM',
    'REC-SEM': 'REC-SEM',
    'REC-FIM': 'REC-FIM'
  };

  const ordenados = valoresUnicos.sort((a, b) => {
    const posA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(a));
    const posB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(b));
    const posicaoA = posA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posA;
    const posicaoB = posB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posB;
    return posicaoA - posicaoB;
  });

  const opcoes = ordenados.map((valor) => ({
    value: valor,
    label: rotulos[normalizarTipoAvPerformance(valor)] || valor
  }));
  renderizarGrupoCheckbox(containerEl, opcoes, filtrosBancoProvas.tiposAv);
}

// Popula o select "Ano Escolar" (Ensino Fundamental/Ensino Médio) — não é uma coluna direta da
// base, e sim o segmento derivado do ano de cada registro (identificarSegmentoPorAno, mesma
// função já usada em outras seções); distinto do select "Série" (bpSelectFilters.ano), que
// filtra pelo ano específico (6º...3º)
function populateBPSegmentoOptions(containerEl, records) {
  const segmentosPresentes = new Set(records.map((r) => identificarSegmentoPorAno(r.ano)).filter(Boolean));
  const ordem = ['Ensino Fundamental', 'Ensino Médio'];
  const segmentos = ordem.filter((segmento) => segmentosPresentes.has(segmento));
  const opcoes = segmentos.map((segmento) => ({ value: segmento, label: segmento }));
  renderizarGrupoCheckbox(containerEl, opcoes, filtrosBancoProvas.segmentos);
}

// Aplica os filtros da barra/painel avançado (Módulo, Tipo de AV, Ano Escolar, Série,
// Disciplina e busca) sobre o recorte global já filtrado pelo header (filteredRecords)
function aplicarFiltrosBancoProvas(dados) {
  const modulo = bpSelectFilters.modulo.value;
  const busca = safe(bpFilterBusca.value).toLowerCase();

  return dados.filter((record) => {
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (!passaFiltroMultiplo(safe(record.ano), filtrosBancoProvas.anos)) return false;
    if (!pertenceAoSegmento(record.ano, filtrosBancoProvas.segmentos)) return false;
    if (!passaFiltroMultiplo(safe(record.tipo_av), filtrosBancoProvas.tiposAv)) return false;
    if (!passaFiltroMultiplo(normalizarDisciplinaFiltro(record.frente), filtrosBancoProvas.disciplinas)) return false;

    if (busca) {
      // Além dos campos crus do registro, inclui o rótulo do bloco/bloquinho consolidado (ex.:
      // "BLOCO 1", "BLOQUINHO 2") quando aplicável — mesma regra de agrupamento usada na tabela
      // (identificarGrupoEnsinoMedio/identificarBloquinhoNonoAnoAV2), para a busca encontrar
      // "BLOCO 1"/"REDAÇÃO" mesmo a tabela exibindo a linha já consolidada. As duas funções só
      // são chamadas no segmento/avaliação a que pertencem — fora disso emitem console.warn.
      const numeroAno = normalizarAnoSegmento(record.ano);
      const anoNormalizado = numeroAno !== null ? `${numeroAno}º` : null;
      const ehEnsinoMedio = identificarSegmentoPorAno(anoNormalizado) === 'Ensino Médio';
      const ehNonoAnoAV2 = anoNormalizado === '9º' && normalizarTipoAvaliacao(record.tipo_av) === 'AV2';

      const camposBusca = [
        record.modulo,
        record.ano,
        record.frente,
        record.tipo_av,
        record.id,
        ehEnsinoMedio ? identificarGrupoEnsinoMedio(record) : null,
        ehNonoAnoAV2 ? identificarBloquinhoNonoAnoAV2(record) : null
      ];
      const matchesBusca = camposBusca.some((value) => safe(value).toLowerCase().includes(busca));
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Cria um botão de acesso (S/GABARITO ou C/GABARITO) que abre o link em nova aba
function criarBotaoAcessoBancoProvas(link, rotulo) {
  const botao = document.createElement('a');
  botao.className = 'bp-acesso-btn';
  botao.href = safe(link);
  botao.target = '_blank';
  botao.rel = 'noopener noreferrer';
  botao.textContent = rotulo;
  return botao;
}

// Renderiza a célula "Acesso" de um grupo já consolidado (1 ou mais registros — mais de 1 só
// quando o grupo é um BLOCO do Ensino Médio ou um BLOQUINHO do 9º ano AV2, ver
// agruparRegistrosProcessoEditorialPorAno): até 2 botões (S/GABARITO, C/GABARITO), cada um a
// partir do primeiro registro do grupo que tiver aquele link preenchido — mesmo "usar o
// primeiro registro do grupo como referência" já usado para outras colunas consolidadas por
// bloco (ex.: formatarDataArteFinalizacaoGrupo)
function criarCelulaAcessoBancoProvas(registrosDoGrupo) {
  const td = document.createElement('td');
  td.className = 'bp-acesso-cell col-acesso';

  const comProvaEmBranco = registrosDoGrupo.find((record) => linkValido(record.prova_em_branco));
  if (comProvaEmBranco) {
    td.appendChild(criarBotaoAcessoBancoProvas(comProvaEmBranco.prova_em_branco, 'S/GABARITO'));
  }

  const comProvaComGabarito = registrosDoGrupo.find((record) => linkValido(record.prova_com_gabarito));
  if (comProvaComGabarito) {
    td.appendChild(criarBotaoAcessoBancoProvas(comProvaComGabarito.prova_com_gabarito, 'C/GABARITO'));
  }

  return td;
}

// Registros sem nenhum link válido (nem prova em branco, nem com gabarito) não aparecem na
// tabela — a tabela só existe para dar acesso aos arquivos, não para listar pendências
function possuiLinkBancoProvas(record) {
  return linkValido(record.prova_em_branco) || linkValido(record.prova_com_gabarito);
}

// Mesma verificação acima, mas para um grupo consolidado: o grupo aparece na tabela se QUALQUER
// registro dele tiver pelo menos 1 link válido (ver criarCelulaAcessoBancoProvas)
function possuiLinkBancoProvasGrupo(registrosDoGrupo) {
  return registrosDoGrupo.some(possuiLinkBancoProvas);
}

// Chave de ordenação de um grupo já consolidado (id | registros): Módulo → Tipo de AV → Ano →
// Bloco (ORDEM_BLOCO_ENSINO_MEDIO/ORDEM_BLOQUINHO_NONO_AV2 quando o grupo for um BLOCO/BLOQUINHO;
// nome da frente, em ordem alfabética, para os grupos de 1 registro só — 6º/7º/8º/9º fora da
// AV2 — que não têm noção de bloco)
function obterChaveOrdenacaoGrupoBancoProvas(grupo) {
  const primeiro = grupo.registros[0];
  const numeroAno = normalizarAnoSegmento(primeiro.ano);
  const chaveAno = numeroAno !== null ? `${numeroAno}º` : safe(primeiro.ano);
  const posAno = ORDEM_ANO_ESCOLAR_COORD.indexOf(chaveAno);

  const tipoAv = normalizarTipoAvPerformance(primeiro.tipo_av);
  const posTipoAv = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAv);

  let posBloco = -1;
  if (grupo.bloco) {
    posBloco = ORDEM_BLOCO_ENSINO_MEDIO.indexOf(grupo.bloco);
  } else if (grupo.bloquinho) {
    posBloco = ORDEM_BLOQUINHO_NONO_AV2.length + ORDEM_BLOQUINHO_NONO_AV2.indexOf(grupo.bloquinho);
  }

  return {
    modulo: safe(primeiro.modulo),
    posTipoAv: posTipoAv === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posTipoAv,
    posAno: posAno === -1 ? ORDEM_ANO_ESCOLAR_COORD.length : posAno,
    posBloco,
    frente: safe(primeiro.frente)
  };
}

// Ordena os grupos já consolidados da tabela do Banco de Provas: Módulo → Tipo de AV → Ano →
// Bloco (ou nome da frente, para os grupos sem bloco)
function ordenarGruposBancoProvas(grupos) {
  return [...grupos].sort((a, b) => {
    const chaveA = obterChaveOrdenacaoGrupoBancoProvas(a);
    const chaveB = obterChaveOrdenacaoGrupoBancoProvas(b);

    const modulo = chaveA.modulo.localeCompare(chaveB.modulo, 'pt-BR', { numeric: true });
    if (modulo !== 0) return modulo;

    if (chaveA.posTipoAv !== chaveB.posTipoAv) return chaveA.posTipoAv - chaveB.posTipoAv;
    if (chaveA.posAno !== chaveB.posAno) return chaveA.posAno - chaveB.posAno;
    if (chaveA.posBloco !== chaveB.posBloco) return chaveA.posBloco - chaveB.posBloco;

    return chaveA.frente.localeCompare(chaveB.frente, 'pt-BR', { numeric: true });
  });
}

// Renderiza a tabela do Banco de Provas: 1 linha por "prova" já consolidada por bloco/bloquinho
// (mesma regra/função do Processo Editorial — agruparTodosOsRegistrosProcessoEditorial: BLOCO
// 1/BLOCO 2/REDAÇÃO no Ensino Médio, BLOQUINHOs na AV2 do 9º ano; demais anos continuam 1 linha
// por registro), colunas ID/Acesso — grupos sem nenhum link em nenhum registro são omitidos.
function renderizarTabelaBancoProvas(dadosCompletos) {
  bpTableBody.innerHTML = '';

  const grupos = ordenarGruposBancoProvas(
    agruparTodosOsRegistrosProcessoEditorial(dadosCompletos).filter((grupo) => possuiLinkBancoProvasGrupo(grupo.registros))
  );

  if (grupos.length === 0) {
    bpEmptyMessage.hidden = false;
    bpTableWrapper.hidden = true;
    return;
  }
  bpEmptyMessage.hidden = true;
  bpTableWrapper.hidden = false;

  const fragment = document.createDocumentFragment();
  grupos.forEach((grupo) => {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.textContent = grupo.id;
    tdId.dataset.label = 'ID';
    tr.appendChild(tdId);

    const tdAcesso = criarCelulaAcessoBancoProvas(grupo.registros);
    tdAcesso.dataset.label = 'Acesso';
    tr.appendChild(tdAcesso);

    fragment.appendChild(tr);
  });
  bpTableBody.appendChild(fragment);
}

// Renderiza toda a seção Banco de Provas a partir do recorte global já filtrado pelo header
// (filteredRecords), aplicando por cima os filtros do popover próprio da seção
// Seleciona o filtro pill "FILTRAR:" (por Ano) do cabeçalho da tabela do Banco de Provas —
// mesmo padrão do filtro "Filtrar por avaliação:" da aba Processo Editorial: clicar na opção
// já ativa volta para "Todos"
function selecionarFiltroAnoBancoProvas(ano) {
  bpFiltroAnoGlobal = bpFiltroAnoGlobal === ano ? null : ano;
  renderizarBancoProvas();
}

// Só passam os registros do Ano selecionado no filtro pill; null ("Todos") deixa passar tudo
function passaFiltroAnoBancoProvas(record) {
  if (!bpFiltroAnoGlobal) return true;
  return safe(record.ano) === bpFiltroAnoGlobal;
}

// --- Aba "Arte-finalização e Envio": acompanha a fase final do fluxo editorial, depois que a
// prova já foi assinada pelo coordenador (envio_grafica/data_envio_grafica, arte_final/
// inicio_arte_final/fim_arte_final, checklist/data_checklist). Mesmo padrão visual/estrutural
// da aba Processo Editorial (cards "banco-card" + card de tabela com header/filtro "Filtrar por
// avaliação" + tabela com badges de status), mas SEM agrupamento por bloco/bloquinho — aqui é
// sempre 1 linha por registro (`id`), como pedido. Não altera nenhuma outra seção.

// Verdadeiro quando o valor está preenchido (não vazio/nulo) — helper genérico usado só nesta
// seção para deixar as regras de "preenchido" mais legíveis
function temDataOuValor(valor) {
  return safe(valor) !== '';
}

// Texto da coluna "Data do Envio para a Gráfica": usa data_envio_grafica; se vazia, cai para
// envio_grafica como fallback (aceito como "data válida" só quando não vazio, sem parser extra,
// já que os campos de data do projeto já vêm prontos no formato dd/mm/aaaa); "-" se nenhum dos
// dois estiver preenchido
function formatarDataArteFinalizacao(item) {
  if (temDataOuValor(item.data_envio_grafica)) return safe(item.data_envio_grafica);
  if (temDataOuValor(item.envio_grafica)) return safe(item.envio_grafica);
  return '-';
}

// Status da etapa de Arte-finalização (coluna da tabela): Concluído só quando
// fim_cotejo_arte_final está preenchido — arte_final (e os demais campos intermediários) só
// indicam que a etapa começou/está em andamento, nunca que ela terminou. Em andamento quando
// qualquer um dos campos da etapa está preenchido mas fim_cotejo_arte_final ainda não. Pendente
// quando nenhum campo da etapa está preenchido.
function calcularStatusArteFinalizacao(item) {
  if (temDataOuValor(item.fim_cotejo_arte_final)) return 'completed';
  if (
    temDataOuValor(item.arte_final) ||
    temDataOuValor(item.inicio_arte_final) ||
    temDataOuValor(item.fim_arte_final) ||
    temDataOuValor(item.inicio_cotejo_arte_final)
  ) {
    return 'in-progress';
  }
  return 'pending';
}

// Status da etapa de Checklist (coluna da tabela): só Concluído/Pendente (sem "Em andamento")
function calcularStatusChecklist(item) {
  if (temDataOuValor(item.data_checklist) || temDataOuValor(item.checklist)) return 'completed';
  return 'pending';
}

// Status geral da linha (coluna Status da tabela), prioridade fixa:
// 1) Enviada para gráfica  2) Em andamento  3) Aguardando assinatura  4) Pendente
function calcularStatusGeralArteFinalizacao(item) {
  if (temDataOuValor(item.data_envio_grafica) || temDataOuValor(item.envio_grafica)) {
    return 'Enviada para gráfica';
  }

  const etapaIniciada =
    temDataOuValor(item.arte_final) ||
    temDataOuValor(item.inicio_arte_final) ||
    temDataOuValor(item.fim_arte_final) ||
    temDataOuValor(item.checklist) ||
    temDataOuValor(item.data_checklist);
  if (etapaIniciada) return 'Em andamento';

  if (!temDataOuValor(item.devolutiva_assinatura_coord)) return 'Aguardando assinatura';

  return 'Pendente';
}

function badgeClassForStatusArteFinalizacaoGeral(status) {
  const map = {
    'Enviada para gráfica': 'badge-pe-status-concluido',
    'Em andamento': 'badge-pe-status-andamento',
    'Aguardando assinatura': 'badge-coord-aguardando',
    'Pendente': 'badge-pe-status-pendente'
  };
  return map[status] || '';
}

// Total de provas consolidadas (BLOCO/BLOQUINHO do Ensino Médio e 9º ano AV2, 1 linha por
// registro nos demais anos — mesmo agrupamento por ano usado na tabela desta seção, ver
// calcularResumoPorAnoArteFinalizacaoEnvio/agruparRegistrosProcessoEditorialPorAno) que já
// foram enviadas para a gráfica: um bloco só conta como enviado quando TODOS os registros que o
// compõem têm data_envio_grafica preenchida (fallback para envio_grafica só quando
// data_envio_grafica está vazia), nunca quando só parte das disciplinas do bloco foi enviada.
// Total de provas consolidadas (mesmo agrupamento por bloco/bloquinho usado em
// contarProvasEnviadasGraficaConsolidado) que já passaram pela assinatura do coordenador: um
// bloco só conta como assinado quando TODOS os registros que o compõem têm
// devolutiva_assinatura_coord preenchida, nunca quando só parte das disciplinas do bloco foi
// assinada.
function contarProvasAssinadasConsolidado(dados) {
  const porAno = new Map(ORDEM_ANO_ESCOLAR_COORD.map((ano) => [ano, []]));

  dados.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!porAno.has(chave)) return;
    porAno.get(chave).push(record);
  });

  let total = 0;
  porAno.forEach((registros, ano) => {
    if (registros.length === 0) return;
    const grupos = agruparRegistrosProcessoEditorialPorAno(ano, registros);
    grupos.forEach((grupo) => {
      const assinado = grupo.registros.every((record) => temDataOuValor(record.devolutiva_assinatura_coord));
      if (assinado) total += 1;
    });
  });

  return total;
}

function contarProvasEnviadasGraficaConsolidado(dados) {
  const porAno = new Map(ORDEM_ANO_ESCOLAR_COORD.map((ano) => [ano, []]));

  dados.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!porAno.has(chave)) return;
    porAno.get(chave).push(record);
  });

  let total = 0;
  porAno.forEach((registros, ano) => {
    if (registros.length === 0) return;
    const grupos = agruparRegistrosProcessoEditorialPorAno(ano, registros);
    grupos.forEach((grupo) => {
      const enviado = grupo.registros.every(
        (record) => temDataOuValor(record.data_envio_grafica) || temDataOuValor(record.envio_grafica)
      );
      if (enviado) total += 1;
    });
  });

  return total;
}

// Alterna o filtro rápido (clique em card) da seção Arte-finalização e Envio: se já estava
// ativo, desliga; senão, assume o novo — mesmo padrão de alternarFiltroRapidoProcessoEditorial
function alternarFiltroCardArteFinalizacao(tipo) {
  filtroCardArteFinalizacao = filtroCardArteFinalizacao === tipo ? null : tipo;
  renderizarArteFinalizacaoEnvio();
}

// Regras de bloco usadas pelo filtro dos cards (mesmos critérios já usados pelos cálculos dos
// cards, ver contarProvasAssinadasConsolidado/contarProvasEnviadasGraficaConsolidado/
// calcularCardsArteFinalizacaoEnvio): um bloco só é considerado "assinado"/"enviado para
// gráfica" quando TODOS os registros que o compõem têm o campo preenchido.
function estaAssinada(registrosDoBloco) {
  return registrosDoBloco.every((record) => temDataOuValor(record.devolutiva_assinatura_coord));
}

function estaEnviadaParaGrafica(registrosDoBloco) {
  return registrosDoBloco.every(
    (record) => temDataOuValor(record.data_envio_grafica) || temDataOuValor(record.envio_grafica)
  );
}

// Um bloco está "em andamento" quando ainda não foi totalmente enviado para gráfica e pelo menos
// um dos registros que o compõem satisfaz a mesma condição de "andamento" já usada pelo card (ver
// calcularCardsArteFinalizacaoEnvio: assinada, ainda não enviada para gráfica individualmente e
// com alguma etapa de arte-finalização/checklist já iniciada).
function estaEmAndamentoArteFinalizacao(registrosDoBloco) {
  if (estaEnviadaParaGrafica(registrosDoBloco)) return false;
  return registrosDoBloco.some((record) => {
    const assinada = temDataOuValor(record.devolutiva_assinatura_coord);
    const enviadaParaGrafica = temDataOuValor(record.data_envio_grafica) || temDataOuValor(record.envio_grafica);
    const etapaIniciada =
      temDataOuValor(record.arte_final) ||
      temDataOuValor(record.inicio_arte_final) ||
      temDataOuValor(record.fim_arte_final) ||
      temDataOuValor(record.checklist) ||
      temDataOuValor(record.data_checklist);
    return assinada && !enviadaParaGrafica && etapaIniciada;
  });
}

// Aplica o filtro do card ativo (clique em "Total de provas assinadas"/"Em Andamento"/"Provas
// Enviadas para Gráfica") sobre o recorte já filtrado por Módulo/Tipo de AV/busca — usado só pela
// tabela e pelos detalhes expandidos (os cards continuam mostrando o total do recorte completo,
// sem o filtro do próprio card, mesmo padrão de filtroRapidoProcessoEditorial). Respeita o mesmo
// padrão de consolidação por bloco/bloquinho usado no restante da seção
// (agruparRegistrosProcessoEditorialPorAno): um bloco só entra (ou fica de fora) inteiro, nunca
// parcialmente.
function aplicarFiltroCardArteFinalizacao(dados) {
  if (!filtroCardArteFinalizacao) return dados;

  const porAno = new Map(ORDEM_ANO_ESCOLAR_COORD.map((ano) => [ano, []]));
  dados.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!porAno.has(chave)) return;
    porAno.get(chave).push(record);
  });

  const resultado = [];
  porAno.forEach((registros, ano) => {
    if (registros.length === 0) return;
    agruparRegistrosProcessoEditorialPorAno(ano, registros).forEach((grupo) => {
      let entra;
      if (filtroCardArteFinalizacao === 'assinadas') entra = estaAssinada(grupo.registros);
      else if (filtroCardArteFinalizacao === 'enviadas_grafica') entra = estaEnviadaParaGrafica(grupo.registros);
      else if (filtroCardArteFinalizacao === 'em_andamento') entra = estaEmAndamentoArteFinalizacao(grupo.registros);
      else entra = true;

      if (entra) resultado.push(...grupo.registros);
    });
  });

  return resultado;
}

// Atualiza o destaque visual (borda/sombra) do card correspondente ao filtro rápido ativo —
// mesmo padrão de atualizarDestaqueCardsProcessoEditorial
function atualizarDestaqueCardsArteFinalizacaoEnvio() {
  afeCardsGrid.querySelectorAll('[data-quick-filter]').forEach((card) => {
    const tipo = card.dataset.quickFilter;
    card.classList.toggle('is-quick-active', tipo === filtroCardArteFinalizacao);
    card.setAttribute('aria-pressed', String(tipo === filtroCardArteFinalizacao));
  });
}

// Rótulos exibidos no chip "Filtro ativo:" — 1 por valor possível de filtroCardArteFinalizacao
const ROTULOS_FILTRO_CARD_AFE = {
  assinadas: 'Total de provas assinadas',
  em_andamento: 'Em andamento',
  enviadas_grafica: 'Provas enviadas para gráfica'
};

// Mostra/esconde o chip "Filtro ativo: <rótulo> ×" no cabeçalho da tabela, conforme o filtro de
// card atualmente ativo
function atualizarChipFiltroCardArteFinalizacao() {
  if (!afeFiltroCardChipWrapper) return;

  if (!filtroCardArteFinalizacao) {
    afeFiltroCardChipWrapper.hidden = true;
    return;
  }

  afeFiltroCardChipWrapper.hidden = false;
  afeFiltroCardChipTexto.textContent = `Filtro ativo: ${ROTULOS_FILTRO_CARD_AFE[filtroCardArteFinalizacao]}`;
}

// Calcula os cards do topo a partir do recorte já filtrado (popover inexistente nesta seção
// + pill "Filtrar por avaliação"). "Assinadas"/"Enviadas" usam a contagem consolidada por bloco
// (ver contarProvasAssinadasConsolidado/contarProvasEnviadasGraficaConsolidado); "Em andamento"
// continua por registro (inalterado).
function calcularCardsArteFinalizacaoEnvio(dados) {
  let andamento = 0;

  dados.forEach((record) => {
    const assinada = temDataOuValor(record.devolutiva_assinatura_coord);

    const enviadaParaGrafica = temDataOuValor(record.data_envio_grafica) || temDataOuValor(record.envio_grafica);

    const etapaIniciada =
      temDataOuValor(record.arte_final) ||
      temDataOuValor(record.inicio_arte_final) ||
      temDataOuValor(record.fim_arte_final) ||
      temDataOuValor(record.checklist) ||
      temDataOuValor(record.data_checklist);
    if (assinada && !enviadaParaGrafica && etapaIniciada) andamento += 1;
  });

  const assinadas = contarProvasAssinadasConsolidado(dados);
  const enviadas = contarProvasEnviadasGraficaConsolidado(dados);

  return { assinadas, andamento, enviadas };
}

function atualizarCardsArteFinalizacaoEnvio(dados) {
  const totais = calcularCardsArteFinalizacaoEnvio(dados);
  afeCardAssinadas.textContent = totais.assinadas;
  afeCardAndamento.textContent = totais.andamento;
  afeCardEnviadas.textContent = totais.enviadas;

  renderizarTooltipAssinadasArteFinalizacaoEnvio(dados);
  renderizarTooltipEnviadasGraficaArteFinalizacaoEnvio(dados);
}

// Calcula, por tipo de AV normalizado, o progresso de assinatura da tooltip do card "Total de
// provas assinadas" — EXCEÇÃO ao padrão de bloco/bloquinho usado no restante do painel: aqui
// cada LINHA da base conta individualmente (sem agrupar por BLOCO 1/BLOCO 2/REDAÇÃO/bloquinho),
// diferente do total consolidado do próprio card (ver contarProvasAssinadasConsolidado) e das
// demais tooltips do sistema. total = quantidade de registros daquele tipo de AV no recorte;
// assinadas = quantos desses registros têm devolutiva_assinatura_coord preenchida. Por padrão
// mantém a ordem fixa AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM; quando `filtroTipoAv` é informado
// (filtro "Filtrar por avaliação:" ativo), restringe a lista a apenas esse tipo.
function calcularProgressoAssinaturaPorTipoAv(dados, filtroTipoAv = null) {
  const tiposConsiderados = filtroTipoAv ? [filtroTipoAv] : ORDEM_TIPO_AV_PERFORMANCE;
  const totais = new Map(tiposConsiderados.map((tipo) => [tipo, { total: 0, assinadas: 0 }]));

  dados.forEach((record) => {
    const tipo = normalizarTipoAvPerformance(record.tipo_av);
    if (!totais.has(tipo)) return;
    const grupoTotais = totais.get(tipo);
    grupoTotais.total += 1;
    if (temDataOuValor(record.devolutiva_assinatura_coord)) grupoTotais.assinadas += 1;
  });

  return tiposConsiderados.map((tipo) => {
    const { total, assinadas } = totais.get(tipo);
    return {
      tipoAv: tipo,
      total,
      assinadas,
      percentual: total > 0 ? (assinadas / total) * 100 : 0
    };
  });
}

// Renderiza a dica de ferramenta analítica (tooltip) do card "Total de provas assinadas": barras
// compactas por tipo de AV mostrando o percentual de assinatura — mesmo padrão visual/funcional
// da tooltip do card "Provas Enviadas para Gráfica" (ver
// renderizarTooltipEnviadasGraficaArteFinalizacaoEnvio, logo abaixo). Respeita o filtro "Filtrar
// por avaliação:" da seção: só exibe a avaliação filtrada quando um filtro específico está ativo.
function renderizarTooltipAssinadasArteFinalizacaoEnvio(dados) {
  const container = document.getElementById('afeAssinadasTooltipChart');
  if (!container) return;
  container.innerHTML = '';

  const grupos = calcularProgressoAssinaturaPorTipoAv(dados, afeFiltroTipoAvGlobal);
  const totalGeral = grupos.reduce((soma, g) => soma + g.total, 0);

  if (totalGeral === 0 && grupos.length > 1) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-tooltip-empty';
    vazio.textContent = 'Não há provas no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  grupos.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row coord-tooltip-row--clicavel';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '-1');
    row.title =
      `${grupo.tipoAv}: ${grupo.assinadas} de ${grupo.total} assinadas ` +
      `(${formatarPercentualComVirgula(grupo.percentual)}%)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = grupo.tipoAv;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${grupo.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${grupo.assinadas} de ${grupo.total} · ${formatarPercentualComVirgula(grupo.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    row.addEventListener('click', () => selecionarFiltroTipoAvGlobalArteFinalizacaoEnvio(grupo.tipoAv));

    container.appendChild(row);
  });
}

// Calcula, por tipo de AV normalizado, o progresso de envio para gráfica: quantas provas
// consolidadas (mesmo agrupamento por bloco/ano de contarProvasEnviadasGraficaConsolidado)
// daquele tipo já têm TODOS os registros do bloco com data_envio_grafica ou envio_grafica
// preenchidos, sobre o total de provas consolidadas daquele tipo no recorte atual (`dados` já
// vem filtrado por módulo/popover/filtro por avaliação) — mesma regra usada no card "Provas
// Enviadas para Gráfica", para a tooltip bater com o total do card. Por padrão mantém a ordem
// fixa AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM; quando `filtroTipoAv` é informado (filtro "Filtrar
// por avaliação:" ativo), restringe a lista a apenas esse tipo — mesmo padrão usado nas demais
// tooltips do sistema.
function calcularProgressoEnvioGraficaPorTipoAv(dados, filtroTipoAv = null) {
  const tiposConsiderados = filtroTipoAv ? [filtroTipoAv] : ORDEM_TIPO_AV_PERFORMANCE;
  const totais = new Map(tiposConsiderados.map((tipo) => [tipo, { total: 0, enviadas: 0 }]));

  const porAno = new Map(ORDEM_ANO_ESCOLAR_COORD.map((ano) => [ano, []]));
  dados.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!porAno.has(chave)) return;
    porAno.get(chave).push(record);
  });

  porAno.forEach((registros, ano) => {
    if (registros.length === 0) return;
    agruparRegistrosProcessoEditorialPorAno(ano, registros).forEach((grupo) => {
      const tipo = normalizarTipoAvPerformance(grupo.registros[0].tipo_av);
      if (!totais.has(tipo)) return;
      const grupoTotais = totais.get(tipo);
      grupoTotais.total += 1;
      const enviado = grupo.registros.every(
        (record) => temDataOuValor(record.data_envio_grafica) || temDataOuValor(record.envio_grafica)
      );
      if (enviado) grupoTotais.enviadas += 1;
    });
  });

  return tiposConsiderados.map((tipo) => {
    const { total, enviadas } = totais.get(tipo);
    return {
      tipoAv: tipo,
      total,
      enviadas,
      percentual: total > 0 ? (enviadas / total) * 100 : 0
    };
  });
}

// Renderiza a dica de ferramenta analítica (tooltip) do card "Provas Enviadas para Gráfica":
// barras compactas por tipo de AV mostrando o percentual de envio para gráfica — mesmo padrão
// visual/funcional das demais tooltips do sistema (ver renderizarTooltipEnviadasAssinaturaCoordenador).
// Respeita o filtro "Filtrar por avaliação:" da seção: só exibe a avaliação filtrada quando um
// filtro específico está ativo (grupos.length === 1).
function renderizarTooltipEnviadasGraficaArteFinalizacaoEnvio(dados) {
  const container = document.getElementById('afeEnviadasTooltipChart');
  if (!container) return;
  container.innerHTML = '';

  const grupos = calcularProgressoEnvioGraficaPorTipoAv(dados, afeFiltroTipoAvGlobal);
  const totalGeral = grupos.reduce((soma, g) => soma + g.total, 0);

  if (totalGeral === 0 && grupos.length > 1) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-tooltip-empty';
    vazio.textContent = 'Não há provas no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  grupos.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row coord-tooltip-row--clicavel';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '-1');
    row.title =
      `${grupo.tipoAv}: ${grupo.enviadas} de ${grupo.total} enviadas ` +
      `(${formatarPercentualComVirgula(grupo.percentual)}%)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = grupo.tipoAv;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${grupo.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${grupo.enviadas} de ${grupo.total} · ${formatarPercentualComVirgula(grupo.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    row.addEventListener('click', () => selecionarFiltroTipoAvGlobalArteFinalizacaoEnvio(grupo.tipoAv));

    container.appendChild(row);
  });
}

// Filtro global "Filtrar por avaliação:" (pills) do cabeçalho da seção
function selecionarFiltroTipoAvGlobalArteFinalizacaoEnvio(tipoAv) {
  afeFiltroTipoAvGlobal = tipoAv;
  renderizarArteFinalizacaoEnvio();
}

// Mesmo componente visual/opções (OPCOES_FILTRO_TIPO_AV_COORDENADOR) já usado em
// Coordenador/Processo Editorial/Assinatura Coordenador
function renderizarFiltroAvaliacaoArteFinalizacaoEnvio() {
  const container = afeFiltroAvaliacaoTopo;
  container.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'coord-detail-filter-label';
  label.textContent = 'Filtrar por avaliação:';
  container.appendChild(label);

  OPCOES_FILTRO_TIPO_AV_COORDENADOR.forEach((opcao) => {
    const valor = opcao === 'Todas' ? null : opcao;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'coord-detail-filter-btn';
    btn.classList.toggle('active', afeFiltroTipoAvGlobal === valor);
    btn.textContent = opcao;
    btn.addEventListener('click', () => selecionarFiltroTipoAvGlobalArteFinalizacaoEnvio(valor));
    container.appendChild(btn);
  });
}

// Popula os selects de Ano, Tipo de AV e Módulo (filtro rápido do cabeçalho) da seção
// Arte-finalização e Envio — Status usa opções fixas já definidas no HTML
// Opções fixas do campo "Status" do popover — mesmas <option> estáticas de antes
const OPCOES_AFE_STATUS = [
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Em andamento', label: 'Em andamento' },
  { value: 'Enviada para gráfica', label: 'Enviada para gráfica' }
];

function populateAFEFilterOptions(records) {
  populateCheckboxGroupField(afeCheckboxGroups.ano, records, 'ano', filtrosArteFinalizacaoEnvio.anos);
  populateCheckboxGroupTipoAv(afeCheckboxGroups.tipoAv, records, filtrosArteFinalizacaoEnvio.tiposAv);
  renderizarGrupoCheckbox(afeCheckboxGroups.status, OPCOES_AFE_STATUS, filtrosArteFinalizacaoEnvio.status);
  populateSelectOptions(afeSelectFilters.modulo, records, 'modulo', 'Módulo');
  populateAnoAplicacaoOptions(afeSelectFilters.ano, records);
}

// Aplica os filtros do popover (Ano/Tipo de AV/Status/busca) + filtro rápido de Módulo do
// cabeçalho da seção Arte-finalização e Envio sobre os registros já filtrados globalmente —
// mesmo padrão de aplicarFiltrosProcessoEditorial
function aplicarFiltrosPopoverArteFinalizacaoEnvio(records) {
  const modulo = afeSelectFilters.modulo.value;
  const anoAplicacao = afeSelectFilters.ano.value;
  const busca = safe(afeFilterBusca.value).toLowerCase();

  return records.filter((record) => {
    if (!passaFiltroMultiplo(safe(record.ano), filtrosArteFinalizacaoEnvio.anos)) return false;
    if (!passaFiltroMultiplo(safe(record.tipo_av), filtrosArteFinalizacaoEnvio.tiposAv)) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (anoAplicacao && obterAnoAplicacao(record) !== anoAplicacao) return false;

    const statusRegistro = calcularStatusGeralArteFinalizacao(record);
    if (!passaFiltroMultiplo(statusRegistro, filtrosArteFinalizacaoEnvio.status)) return false;

    if (busca) {
      const camposBusca = [
        obterIdProcessoEditorial(record),
        record.ano,
        record.frente,
        record.tipo_av,
        record.modulo
      ];
      const matchesBusca = camposBusca.some((value) => safe(value).toLowerCase().includes(busca));
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Base filtrada da seção Arte-finalização e Envio (popover + módulo + busca), a partir do
// recorte global já filtrado pelo header (filteredRecords) — mesma base usada pelos cards,
// tooltip e tabela
function obterDadosArteFinalizacaoEnvioFiltrados() {
  return aplicarFiltrosPopoverArteFinalizacaoEnvio(filteredRecords);
}

// Filtro global "Filtrar por avaliação:" (pills) do cabeçalho da seção — combina com a base já
// filtrada pelo popover/módulo/busca (ver renderizarArteFinalizacaoEnvio)
function aplicarFiltrosArteFinalizacaoEnvio(dados) {
  if (!afeFiltroTipoAvGlobal) return dados;
  return dados.filter((record) => normalizarTipoAvaliacao(record.tipo_av) === afeFiltroTipoAvGlobal);
}

// Conta quantos filtros do popover estão ativos (selects preenchidos + busca) e atualiza o badge
function atualizarIndicadorFiltrosArteFinalizacaoEnvio() {
  const totalAtivos =
    Object.values(afeSelectFilters).filter((select) => select.value !== '').length +
    filtrosArteFinalizacaoEnvio.anos.length +
    filtrosArteFinalizacaoEnvio.tiposAv.length +
    filtrosArteFinalizacaoEnvio.status.length +
    (safe(afeFilterBusca.value) !== '' ? 1 : 0);

  afeFilterBadge.hidden = totalAtivos === 0;
  afeFilterBadge.textContent = totalAtivos;
  btnAbrirFiltrosAFE.classList.toggle('has-active-filters', totalAtivos > 0);
}

function abrirPopoverFiltrosArteFinalizacaoEnvio() {
  afeFiltersPopover.hidden = false;
  btnAbrirFiltrosAFE.classList.add('is-active');
  btnAbrirFiltrosAFE.setAttribute('aria-expanded', 'true');
  btnAbrirFiltrosAFE.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosAFE.dataset.iconAtivo;
}

function fecharPopoverFiltrosArteFinalizacaoEnvio() {
  afeFiltersPopover.hidden = true;
  btnAbrirFiltrosAFE.classList.remove('is-active');
  btnAbrirFiltrosAFE.setAttribute('aria-expanded', 'false');
  btnAbrirFiltrosAFE.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosAFE.dataset.iconNormal;
}

function alternarPopoverFiltrosArteFinalizacaoEnvio() {
  if (afeFiltersPopover.hidden) {
    abrirPopoverFiltrosArteFinalizacaoEnvio();
  } else {
    fecharPopoverFiltrosArteFinalizacaoEnvio();
  }
}

// Limpa os filtros próprios da seção (popover, módulo e busca) e re-renderiza
function limparFiltrosArteFinalizacaoEnvio() {
  Object.values(afeSelectFilters).forEach((select) => (select.value = ''));
  filtrosArteFinalizacaoEnvio.anos = [];
  filtrosArteFinalizacaoEnvio.tiposAv = [];
  filtrosArteFinalizacaoEnvio.status = [];
  Object.values(afeCheckboxGroups).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  afeFilterBusca.value = '';
  filtroCardArteFinalizacao = null;
  renderizarArteFinalizacaoEnvio();
}

// Copia o estado marcado dos checkboxes do popover para filtrosArteFinalizacaoEnvio — chamado
// ao clicar "Aplicar filtros"
function aplicarCheckboxesArteFinalizacaoEnvio() {
  filtrosArteFinalizacaoEnvio.anos = lerGrupoCheckbox(afeCheckboxGroups.ano);
  filtrosArteFinalizacaoEnvio.tiposAv = lerGrupoCheckbox(afeCheckboxGroups.tipoAv);
  filtrosArteFinalizacaoEnvio.status = lerGrupoCheckbox(afeCheckboxGroups.status);
}

// Versões "de grupo" das regras por registro acima — usadas quando um bloco/bloquinho do
// Ensino Médio/9º ano AV2 consolida vários registros (frentes) em 1 única linha da tabela
// (ver agruparRegistrosProcessoEditorialPorAno, reaproveitada sem alterações desta seção em
// diante). Mesmo princípio de consolidarStatusEtapas já usado no Processo Editorial: só
// "completed"/"Enviada" quando TODOS os registros do grupo já chegaram lá, só "pending" quando
// NENHUM começou, senão fica no estado intermediário.

// Arte-finalização do grupo: completed só se todos os registros estiverem concluídos, pending
// só se nenhum tiver começado, senão in-progress
function calcularStatusArteFinalizacaoGrupo(registros) {
  const status = registros.map(calcularStatusArteFinalizacao);
  if (status.every((s) => s === 'completed')) return 'completed';
  if (status.every((s) => s === 'pending')) return 'pending';
  return 'in-progress';
}

// Checklist do grupo: só 2 estados (sem "em andamento", mesma exceção de 2 estados usada para
// "Envio Assinatura Coord." no Processo Editorial) — completed só se TODOS os registros do
// grupo tiverem checklist concluído, senão pending
function calcularStatusChecklistGrupo(registros) {
  return registros.every((record) => calcularStatusChecklist(record) === 'completed') ? 'completed' : 'pending';
}

// Data do Envio para a Gráfica do grupo: usa a data do 1º registro já enviado encontrado;
// "-" se nenhum registro do grupo tiver sido enviado ainda
function formatarDataArteFinalizacaoGrupo(registros) {
  const enviado = registros.find(
    (record) => temDataOuValor(record.data_envio_grafica) || temDataOuValor(record.envio_grafica)
  );
  return enviado ? formatarDataArteFinalizacao(enviado) : '-';
}

// Status geral do grupo — mesma prioridade/regras de calcularStatusGeralArteFinalizacao,
// aplicada sobre o conjunto de registros do bloco/bloquinho em vez de 1 registro isolado
function calcularStatusGeralArteFinalizacaoGrupo(registros) {
  const enviados = registros.filter(
    (record) => temDataOuValor(record.data_envio_grafica) || temDataOuValor(record.envio_grafica)
  );
  if (enviados.length === registros.length) return 'Enviada para gráfica';

  const etapaIniciada = registros.some(
    (record) =>
      temDataOuValor(record.arte_final) ||
      temDataOuValor(record.inicio_arte_final) ||
      temDataOuValor(record.fim_arte_final) ||
      temDataOuValor(record.checklist) ||
      temDataOuValor(record.data_checklist)
  );
  if (enviados.length > 0 || etapaIniciada) return 'Em andamento';

  const algumaAssinada = registros.some((record) => temDataOuValor(record.devolutiva_assinatura_coord));
  if (!algumaAssinada) return 'Aguardando assinatura';

  return 'Pendente';
}

// Calcula o resumo por ano escolar (mesmo padrão de calcularResumoPorAnoProcessoEditorial):
// ANO | TOTAL DE PROVAS | TOTAL EM PROCESSO | TOTAL ENVIADA PARA A GRÁFICA | STATUS.
// "Total de Provas" já considera os BLOCOs do Ensino Médio/bloquinhos do 9º ano AV2 consolidados
// (agruparRegistrosProcessoEditorialPorAno, mesma função/regra do Processo Editorial) — uma
// prova de Ensino Médio com várias frentes conta 1 vez por bloco, não 1 vez por frente.
function calcularResumoPorAnoArteFinalizacaoEnvio(dados) {
  const grupos = new Map(ORDEM_ANO_ESCOLAR_COORD.map((ano) => [ano, []]));

  dados.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!grupos.has(chave)) return;
    grupos.get(chave).push(record);
  });

  return ORDEM_ANO_ESCOLAR_COORD.map((ano) => {
    const registros = grupos.get(ano);
    const gruposConsolidados = agruparRegistrosProcessoEditorialPorAno(ano, registros).map((grupo) => grupo.registros);
    const total = gruposConsolidados.length;
    // Mesma função/prioridade da coluna Status da tabela detalhada (calcularStatusArteFinalizacaoEnvioGrupo)
    // — "Total em Processo" conta qualquer etapa que não seja "Pendente" nem "Enviado para
    // Gráfica" (Em Elaboração/Em validação/1ª Validação/Em Processo Editorial/Em Assinatura/Em
    // processo), para a linha-resumo não ficar "Não iniciado" enquanto os blocos já têm
    // movimentação.
    const statusPorGrupo = gruposConsolidados.map(calcularStatusArteFinalizacaoEnvioGrupo);
    const totalEnviada = statusPorGrupo.filter((status) => status === 'Enviado para Gráfica').length;
    const totalEmProcesso = statusPorGrupo.filter(
      (status) => status !== 'Enviado para Gráfica' && status !== 'Pendente'
    ).length;

    let status;
    if (total === 0) status = 'Não iniciado';
    else if (totalEnviada === total) status = 'Enviado para gráfica';
    else if (totalEnviada > 0 || totalEmProcesso > 0) status = 'Em processo';
    else status = 'Não iniciado';

    return { ano, total, totalEmProcesso, totalEnviada, status, registros };
  }).filter((linha) => linha.total > 0);
}

// Classe do badge do status consolidado por ano (mesmas cores de badgeClassForStatusAno)
function badgeClassForStatusAnoArteFinalizacaoEnvio(status) {
  const map = {
    'Enviado para gráfica': 'badge-pe-status-concluido',
    'Em processo': 'badge-pe-status-andamento',
    'Não iniciado': 'badge-pe-status-pendente'
  };
  return map[status] || '';
}

// Calcula, por tipo de AV normalizado, o progresso de envio para gráfica de UM ano escolar: usa
// os mesmos grupos consolidados por bloco/bloquinho da tabela (agruparRegistrosProcessoEditorialPorAno
// — BLOCO 1/BLOCO 2/REDAÇÃO no Ensino Médio, BLOQUINHOs na AV2 do 9º ano), contando "enviada"
// só quando TODOS os registros do grupo têm data_envio_grafica ou envio_grafica preenchidos
// (mesmo critério de calcularStatusGeralArteFinalizacaoGrupo). Por padrão mantém a ordem fixa
// AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM; quando `filtroTipoAv` é informado (filtro "Filtrar por
// avaliação:" ativo), restringe a lista a apenas esse tipo — mesmo padrão da tooltip de status
// por ano do Processo Editorial (calcularProgressoConclusaoPorAnoETipoAv).
function calcularProgressoEnvioGraficaPorAnoETipoAv(ano, registrosDoAno, filtroTipoAv = null) {
  const grupos = agruparRegistrosProcessoEditorialPorAno(ano, registrosDoAno);
  const tiposConsiderados = filtroTipoAv ? [filtroTipoAv] : ORDEM_TIPO_AV_PERFORMANCE;

  const totais = new Map(tiposConsiderados.map((tipo) => [tipo, { total: 0, enviadas: 0 }]));
  grupos.forEach((grupo) => {
    const tipo = normalizarTipoAvPerformance(grupo.registros[0].tipo_av);
    if (!totais.has(tipo)) return;
    const grupoTotais = totais.get(tipo);
    grupoTotais.total += 1;
    const enviado = grupo.registros.every(
      (record) => temDataOuValor(record.data_envio_grafica) || temDataOuValor(record.envio_grafica)
    );
    if (enviado) grupoTotais.enviadas += 1;
  });

  return tiposConsiderados.map((tipo) => {
    const { total, enviadas } = totais.get(tipo);
    return {
      tipoAv: tipo,
      total,
      enviadas,
      percentual: total > 0 ? (enviadas / total) * 100 : 0
    };
  });
}

// Preenche um container de tooltip analítica com 1 linha por tipo de AV (label + barra de
// progresso + "enviadas de total · percentual") — mesmo padrão das demais tooltips do sistema.
// Quando `grupos` já vem restrito a um único tipo de AV (filtro "Filtrar por avaliação:" ativo),
// a linha é exibida mesmo com total 0; a mensagem de vazio só aparece quando a lista completa
// (mais de um tipo) está toda zerada.
function renderizarLinhasTooltipEnvioGraficaPorAno(container, grupos, mensagemVazia) {
  container.innerHTML = '';

  const totalGeral = grupos.reduce((soma, g) => soma + g.total, 0);

  if (totalGeral === 0 && grupos.length > 1) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-tooltip-empty';
    vazio.textContent = mensagemVazia;
    container.appendChild(vazio);
    return;
  }

  grupos.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row coord-tooltip-row--clicavel';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '-1');
    row.title =
      `${grupo.tipoAv}: ${grupo.enviadas} de ${grupo.total} enviadas ` +
      `(${formatarPercentualComVirgula(grupo.percentual)}%)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = grupo.tipoAv;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${grupo.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${grupo.enviadas} de ${grupo.total} · ${formatarPercentualComVirgula(grupo.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    row.addEventListener('click', () => selecionarFiltroTipoAvGlobalArteFinalizacaoEnvio(grupo.tipoAv));

    container.appendChild(row);
  });
}

// Monta o badge de status de uma linha de ano da tabela "Fluxo de Arte-finalização e Envio",
// com uma dica de ferramenta (tooltip) mostrando o progresso de envio para gráfica daquele ano
// por tipo de AV — mesmo padrão visual/funcional/técnico de criarBadgeStatusAnoComTooltip
// (Processo Editorial): a tooltip é anexada a document.body e posicionada via JS
// (posicionarTooltipFixa), pois o badge fica dentro de um container com overflow-x:auto
// (.pe-ano-table-scroll, mesma classe usada em #afeTableWrapper) que a cortaria se fosse
// posicionada de forma absoluta/relativa ao wrapper. Os registros considerados (linha.registros)
// já vêm do recorte filtrado atual (módulo, filtro por avaliação e demais filtros da seção),
// então a tooltip respeita os mesmos filtros da tela.
function criarBadgeStatusAnoArteFinalizacaoEnvioComTooltip(linha) {
  const wrapper = document.createElement('span');
  wrapper.className = 'coord-card-tooltip-wrapper afe-status-tooltip-wrapper';

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = `badge ${badgeClassForStatusAnoArteFinalizacaoEnvio(linha.status)} pe-status-badge-interativo`;
  badge.textContent = linha.status;

  const tooltipId = `afeAnoStatusTooltip-${linha.ano.replace(/[^0-9a-zA-Z]/g, '')}`;
  badge.setAttribute('aria-describedby', tooltipId);

  const tooltip = document.createElement('div');
  tooltip.className = 'coord-analytic-tooltip afe-status-tooltip-fixa';
  tooltip.id = tooltipId;
  tooltip.setAttribute('role', 'tooltip');

  const titulo = document.createElement('h4');
  titulo.className = 'coord-tooltip-title';
  titulo.textContent = `Progresso do envio para gráfica — ${linha.ano} ano`;

  const subtitulo = document.createElement('p');
  subtitulo.className = 'coord-tooltip-subtitle';
  subtitulo.textContent = 'Percentual de provas enviadas para gráfica por tipo de avaliação neste ano escolar.';

  const chart = document.createElement('div');
  chart.className = 'coord-tooltip-chart';

  tooltip.appendChild(titulo);
  tooltip.appendChild(subtitulo);
  tooltip.appendChild(chart);

  const grupos = calcularProgressoEnvioGraficaPorAnoETipoAv(linha.ano, linha.registros, afeFiltroTipoAvGlobal);
  renderizarLinhasTooltipEnvioGraficaPorAno(chart, grupos, `Não há provas do ${linha.ano} ano no recorte atual.`);

  document.body.appendChild(tooltip);
  wrapper._afeStatusTooltip = tooltip;

  let ocultarPendente = null;

  function mostrar() {
    if (ocultarPendente) {
      clearTimeout(ocultarPendente);
      ocultarPendente = null;
    }
    document
      .querySelectorAll('.afe-status-tooltip-fixa.is-visible')
      .forEach((t) => {
        if (t !== tooltip) t.classList.remove('is-visible');
      });
    posicionarTooltipFixa(tooltip, badge.getBoundingClientRect());
    tooltip.classList.add('is-visible');
  }

  function ocultar() {
    ocultarPendente = setTimeout(() => tooltip.classList.remove('is-visible'), 120);
  }

  badge.addEventListener('mouseenter', mostrar);
  badge.addEventListener('focus', mostrar);
  badge.addEventListener('mouseleave', ocultar);
  badge.addEventListener('blur', () => tooltip.classList.remove('is-visible'));

  tooltip.addEventListener('mouseenter', () => {
    if (ocultarPendente) {
      clearTimeout(ocultarPendente);
      ocultarPendente = null;
    }
  });
  tooltip.addEventListener('mouseleave', ocultar);

  badge.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    document.querySelectorAll('.afe-status-tooltip-fixa.is-visible').forEach((t) => t.classList.remove('is-visible'));
    if (abrindo) mostrar();
  });

  wrapper.appendChild(badge);
  return wrapper;
}

// Alterna a expansão do detalhamento de um ano: se já estava aberto, fecha; senão, abre o
// novo (fechando qualquer outro que estivesse aberto) — mesmo padrão de
// alternarDetalheAnoProcessoEditorial
function alternarDetalheAnoArteFinalizacaoEnvio(ano) {
  anoExpandidoArteFinalizacaoEnvio = anoExpandidoArteFinalizacaoEnvio === ano ? null : ano;
  renderizarArteFinalizacaoEnvio();
}

// --- Status da coluna "Status" da tabela DETALHADA (expansão por ano) da seção
// Arte-finalização e Envio: indica em qual etapa do fluxo a prova está (ou já passou),
// da mais avançada para a mais inicial — diferente de calcularStatusGeralArteFinalizacao
// (usado pelos cards/filtro popover) e de calcularResumoPorAnoArteFinalizacaoEnvio (tabela
// principal por ano), que não são alterados por esta regra.

// true se QUALQUER um dos campos (por aliases conhecidos, via
// ALIASES_CAMPOS_ETAPA_PROCESSO_EDITORIAL/obterValorPorAliases quando existir; senão o próprio
// nome do campo) estiver preenchido no registro
function temAlgumValor(item, campos) {
  return campos.some((campo) =>
    temValor(obterValorPorAliases(item, ALIASES_CAMPOS_ETAPA_PROCESSO_EDITORIAL[campo] || [campo]))
  );
}

// true se algum dos aliases informados estiver preenchido no registro (mesmo critério de
// temAlgumValor, só que para um único campo lógico com aliases próprios, não cadastrados em
// ALIASES_CAMPOS_ETAPA_PROCESSO_EDITORIAL)
function temValorPorAliases(item, aliases) {
  return temValor(obterValorPorAliases(item, aliases));
}

const CAMPOS_ENVIADA_GRAFICA = ['data_envio_grafica', 'envio_grafica'];

// Campos da etapa "Em processo": arte-finalização/checklist + verificação/cotejo da validação
// do coordenador — qualquer um preenchido (e ainda sem envio para gráfica) indica que a prova já
// está em processo de arte-finalização/envio
const CAMPOS_EM_PROCESSO_ARTE_FINAL = [
  'verificacao_validacao_coord',
  'inicio_verificacao_validacao_coord',
  'fim_verificacao_validacao_coord',
  'media_comentarios',
  'aplicacao_verificacao_validacao_coord',
  'inicio_aplicacao_verificacao_validacao_coord',
  'fim_aplicacao_verificacao_validacao_coord',
  'cotejo_verificacao',
  'inicio_cotejo_verificacao',
  'fim_cotejo_verificacao',
  'arte_final',
  'inicio_arte_final',
  'fim_arte_final',
  'cotejo_arte_final',
  'inicio_cotejo_arte_final',
  'fim_cotejo_arte_final',
  'checklist',
  'data_checklist',
  'prova_em_branco',
  'data_prova_em_branco',
  'prova_com_gabarito',
  'data_prova_com_gabarito'
];

// Campos da etapa "Em Processo Editorial" — devolutiva_coord entra aqui (e não em "1ª
// Validação") porque, uma vez devolvida pelo coordenador, a prova já seguiu para o processo
// editorial propriamente dito
const CAMPOS_PROCESSO_EDITORIAL = [
  'devolutiva_coord',
  'diagramacao',
  'inicio_diagramacao',
  'fim_diagramacao',
  'cotejo',
  'inicio_cotejo',
  'fim_cotejo',
  'aplicacao_cotejo',
  'inicio_aplicacao_cotejo',
  'fim_aplicacao_cotejo',
  'leitura_final',
  'inicio_leitura_final',
  'fim_leitura_final',
  'aplicacao_leitura',
  'inicio_aplicacao_leitura',
  'fim_aplicacao_leitura',
  'ctj',
  'inicio_ctj',
  'fim_ctj'
];

// Aliases dos campos de "1ª Validação" (envio ao coordenador)
const ALIASES_ENVIO_COORD = ['data_envio_coord'];
const ALIASES_PRAZO_COORD = ['prazo_coord'];

// Aliases da devolutiva/data de encomenda — diferenciam "Em validação" (encomenda já devolvida,
// aguardando envio ao coordenador) de "Em Elaboração" (encomenda feita, ainda sem devolutiva) e
// de "Pendente" (encomenda nem feita)
const ALIASES_DEVOLUTIVA_ENCOMENDA = ['devolutiva_encomenda', 'devolutiva_da_encomenda'];
const ALIASES_DATA_ENCOMENDA = ['data_encomenda', 'data_da_encomenda', 'encomenda'];

// Ordem de prioridade das etapas, da mais avançada para a mais inicial — mesma ordem usada por
// calcularStatusArteFinalizacaoEnvio/calcularStatusArteFinalizacaoEnvioGrupo abaixo (equivalente
// à prioridade numérica 8→1 da etapa mais avançada para a mais inicial: o `.find` abaixo já
// retorna o primeiro status da lista, em ordem decrescente de prioridade, presente no grupo)
const ORDEM_STATUS_ARTE_FINALIZACAO_ENVIO = [
  'Enviado para Gráfica',
  'Em processo',
  'Em Assinatura',
  'Em Processo Editorial',
  '1ª Validação',
  'Em validação',
  'Em Elaboração',
  'Pendente'
];

// Status de UM registro para a coluna "Status" da tabela detalhada: percorre as etapas da mais
// avançada para a mais inicial e retorna a primeira cujo campo (ou grupo de campos) esteja
// preenchido.
function calcularStatusArteFinalizacaoEnvio(item) {
  if (temValorPorAliases(item, CAMPOS_ENVIADA_GRAFICA)) return 'Enviado para Gráfica';
  if (temAlgumValor(item, CAMPOS_EM_PROCESSO_ARTE_FINAL)) return 'Em processo';
  if (temValorPorAliases(item, ['envio_assinatura_coord'])) return 'Em Assinatura';
  if (temAlgumValor(item, CAMPOS_PROCESSO_EDITORIAL)) return 'Em Processo Editorial';
  if (temValorPorAliases(item, ALIASES_ENVIO_COORD) || temValorPorAliases(item, ALIASES_PRAZO_COORD)) return '1ª Validação';
  if (temValorPorAliases(item, ALIASES_DEVOLUTIVA_ENCOMENDA)) return 'Em validação';
  if (temValorPorAliases(item, ALIASES_DATA_ENCOMENDA)) return 'Em Elaboração';
  return 'Pendente';
}

// Versão "de grupo" (BLOCO do Ensino Médio/BLOQUINHO do 9º ano AV2 — mais de 1 registro por
// linha): calcula o status de cada registro do grupo e retorna o mais avançado entre eles
// (nunca usa apenas o primeiro registro), mesma prioridade de calcularStatusArteFinalizacaoEnvio
function calcularStatusArteFinalizacaoEnvioGrupo(registros) {
  const statusPorRegistro = registros.map(calcularStatusArteFinalizacaoEnvio);
  return ORDEM_STATUS_ARTE_FINALIZACAO_ENVIO.find((status) => statusPorRegistro.includes(status));
}

function badgeClassForStatusArteFinalizacaoEnvioDetalhe(status) {
  const map = {
    'Enviado para Gráfica': 'badge-pe-status-concluido',
    'Em processo': 'badge-pe-status-andamento',
    'Em Assinatura': 'badge-coord-com-atraso',
    'Em Processo Editorial': 'badge-coord-andamento',
    '1ª Validação': 'badge-coord-nao-enviado-validacao',
    'Em validação': 'badge-coord-aguardando',
    'Em Elaboração': 'badge-coord-nao-enviado',
    Pendente: 'badge-pe-status-pendente'
  };
  return map[status] || '';
}

// Monta 1 linha da tabela detalhada (ID | Arte-finalização | Checklist | Data do Envio para a
// Gráfica | Status) a partir de um grupo já consolidado (1 ou mais registros — mais de 1 só
// quando o grupo é um BLOCO do Ensino Médio ou um BLOQUINHO do 9º ano AV2, ver
// agruparRegistrosProcessoEditorialPorAno). `idExibido` já vem pronto da função de
// agrupamento (ex.: "M3-AV1-1º-BLOCO 1"), no mesmo padrão textual do Processo Editorial.
function criarLinhaRegistroArteFinalizacaoEnvio(idExibido, registrosDoGrupo) {
  const tr = document.createElement('tr');

  const tdId = document.createElement('td');
  tdId.textContent = idExibido;
  tdId.title = idExibido;
  tr.appendChild(tdId);

  const tdArteFinal = document.createElement('td');
  tdArteFinal.appendChild(
    renderizarIconeStatusProcesso(calcularStatusArteFinalizacaoGrupo(registrosDoGrupo), 'Arte-finalização')
  );
  tr.appendChild(tdArteFinal);

  const tdChecklist = document.createElement('td');
  tdChecklist.appendChild(
    renderizarIconeStatusProcesso(calcularStatusChecklistGrupo(registrosDoGrupo), 'Checklist')
  );
  tr.appendChild(tdChecklist);

  const tdEnvio = document.createElement('td');
  tdEnvio.textContent = formatarDataArteFinalizacaoGrupo(registrosDoGrupo);
  tr.appendChild(tdEnvio);

  const status = calcularStatusArteFinalizacaoEnvioGrupo(registrosDoGrupo);
  const tdStatus = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `badge ${badgeClassForStatusArteFinalizacaoEnvioDetalhe(status)}`;
  badge.textContent = status;
  tdStatus.appendChild(badge);
  tr.appendChild(tdStatus);

  return tr;
}

// Monta a linha expandida com o detalhamento por registro do ano selecionado — mesmo padrão
// visual/estrutural de criarLinhaDetalheAnoProcessoEditorial (título "Processos do Xº ano",
// tabela própria com scroll interno dentro do painel)
function criarLinhaDetalheAnoArteFinalizacaoEnvio(ano, registros) {
  const trDetalhe = document.createElement('tr');
  trDetalhe.className = 'pe-ano-detail-row';

  const tdDetalhe = document.createElement('td');
  tdDetalhe.colSpan = 5;

  const painel = document.createElement('div');
  painel.className = 'pe-ano-detail-panel';

  const titulo = document.createElement('h4');
  titulo.className = 'pe-ano-detail-title';
  titulo.textContent = `Processos do ${ano} ano`;
  painel.appendChild(titulo);

  if (registros.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'pe-ano-detail-empty';
    vazio.textContent = 'Nenhum registro encontrado para este ano.';
    painel.appendChild(vazio);
    tdDetalhe.appendChild(painel);
    trDetalhe.appendChild(tdDetalhe);
    return trDetalhe;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper pe-ano-detail-table-scroll';

  const table = document.createElement('table');
  table.className = 'data-table pe-matrix-table';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  ['ID', 'Arte-finalização', 'Checklist', 'Data do Envio para a Gráfica', 'Status'].forEach((rotulo) => {
    const th = document.createElement('th');
    th.textContent = rotulo;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbodyDetalhe = document.createElement('tbody');

  // Mesma lógica de blocos/bloquinhos do Processo Editorial (agruparRegistrosProcessoEditorialPorAno):
  // Ensino Médio consolida frentes em BLOCO 1/BLOCO 2/REDAÇÃO; 9º ano na AV2 consolida em até 5
  // BLOQUINHOs; demais casos continuam 1 linha por registro. Reaproveitada sem alterações — não
  // duplica a regra de agrupamento, só decide o que fazer com cada grupo já pronto.
  const gruposExibidos = agruparRegistrosProcessoEditorialPorAno(ano, registros);
  gruposExibidos.forEach((grupo) => {
    tbodyDetalhe.appendChild(criarLinhaRegistroArteFinalizacaoEnvio(grupo.id, grupo.registros));
  });
  table.appendChild(tbodyDetalhe);

  wrapper.appendChild(table);
  painel.appendChild(wrapper);
  tdDetalhe.appendChild(painel);
  trDetalhe.appendChild(tdDetalhe);

  return trDetalhe;
}

// Renderiza a tabela principal, resumida por ano escolar: ANO / TOTAL DE PROVAS / TOTAL EM
// PROCESSO / TOTAL ENVIADA PARA A GRÁFICA / STATUS. Clicar no ano expande, logo abaixo, o
// detalhamento por registro daquele ano — mesmo padrão de renderizarTabelaProcessoEditorial
function renderizarTabelaArteFinalizacaoEnvio(dados) {
  afeTableBody.innerHTML = '';
  // As tooltips dos badges de status por ano são anexadas a document.body (ver
  // criarBadgeStatusAnoArteFinalizacaoEnvioComTooltip), fora da árvore do tbody, então precisam
  // ser removidas manualmente aqui antes de recriar as linhas — senão ficam órfãs a cada
  // re-renderização.
  document.querySelectorAll('.afe-status-tooltip-fixa').forEach((el) => el.remove());

  const linhas = calcularResumoPorAnoArteFinalizacaoEnvio(dados);

  if (linhas.length === 0) {
    afeEmptyMessage.hidden = false;
    afeTableWrapper.hidden = true;
    return;
  }
  afeEmptyMessage.hidden = true;
  afeTableWrapper.hidden = false;

  const fragment = document.createDocumentFragment();

  linhas.forEach((linha) => {
    const expandido = anoExpandidoArteFinalizacaoEnvio === linha.ano;

    const tr = document.createElement('tr');
    tr.className = 'pe-ano-row';
    tr.classList.toggle('pe-ano-row--ativa', expandido);

    const tdAno = document.createElement('td');
    const nomeClicavel = document.createElement('button');
    nomeClicavel.type = 'button';
    nomeClicavel.className = 'pe-ano-nome';
    nomeClicavel.setAttribute('aria-expanded', String(expandido));

    const chevron = document.createElement('span');
    chevron.className = 'pe-ano-chevron';
    chevron.textContent = expandido ? '▾' : '▸';
    chevron.setAttribute('aria-hidden', 'true');

    nomeClicavel.appendChild(chevron);
    nomeClicavel.appendChild(document.createTextNode(`${linha.ano} ano`));
    nomeClicavel.addEventListener('click', () => alternarDetalheAnoArteFinalizacaoEnvio(linha.ano));
    tdAno.appendChild(nomeClicavel);
    tr.appendChild(tdAno);

    [linha.total, linha.totalEmProcesso, linha.totalEnviada].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdStatus = document.createElement('td');
    tdStatus.appendChild(criarBadgeStatusAnoArteFinalizacaoEnvioComTooltip(linha));
    tr.appendChild(tdStatus);

    fragment.appendChild(tr);

    if (expandido) {
      fragment.appendChild(criarLinhaDetalheAnoArteFinalizacaoEnvio(linha.ano, linha.registros));
    }
  });

  afeTableBody.appendChild(fragment);
}

// Orquestrador da seção: base = filteredRecords (recorte já filtrado pela busca geral do
// header, se houver) + filtro pill "Filtrar por avaliação" — alimenta cards e tabela a partir
// da mesma base, mesmo padrão de renderizarProcessoEditorial/renderizarVisaoAssinaturaCoordenador
function renderizarArteFinalizacaoEnvio() {
  populateAFEFilterOptions(filteredRecords);
  atualizarIndicadorFiltrosArteFinalizacaoEnvio();
  renderizarFiltroAvaliacaoArteFinalizacaoEnvio();

  const dadosPopover = obterDadosArteFinalizacaoEnvioFiltrados();
  const dados = aplicarFiltrosArteFinalizacaoEnvio(dadosPopover);

  atualizarCardsArteFinalizacaoEnvio(dados);

  const dadosTabela = aplicarFiltroCardArteFinalizacao(dados);
  renderizarTabelaArteFinalizacaoEnvio(dadosTabela);

  atualizarDestaqueCardsArteFinalizacaoEnvio();
  atualizarChipFiltroCardArteFinalizacao();
}

// Renderiza a barra "FILTRAR:" no cabeçalho da tabela do Banco de Provas, com um botão pill
// "Todos" + 1 botão por valor único de Ano presente no recorte atual (já filtrado pelo
// popover), na ordem pedagógica 6º→7º→8º→9º→1º→2º→3º
function renderizarFiltroAnoBancoProvas(dados) {
  const container = bpFiltroAnoTopo;
  container.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'coord-detail-filter-label';
  label.textContent = 'FILTRAR:';
  container.appendChild(label);

  const anosPresentes = new Set(dados.map((record) => safe(record.ano)).filter(Boolean));
  const anosOrdenados = ORDEM_ANO_ESCOLAR_COORD.filter((ano) => anosPresentes.has(ano));

  const opcoes = [{ rotulo: 'Todos', valor: null }, ...anosOrdenados.map((ano) => ({ rotulo: ano, valor: ano }))];

  opcoes.forEach((opcao) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'coord-detail-filter-btn';
    btn.classList.toggle('active', bpFiltroAnoGlobal === opcao.valor);
    btn.textContent = opcao.rotulo;
    btn.addEventListener('click', () => selecionarFiltroAnoBancoProvas(opcao.valor));
    container.appendChild(btn);
  });
}

function renderizarBancoProvas() {
  populateBPFilterOptions(filteredRecords);
  atualizarIndicadorFiltrosBP();

  const dados = aplicarFiltrosBancoProvas(filteredRecords);

  renderizarTabelaBancoProvas(dados);
}

// --- Aba Assinatura Coordenador: acompanhamento do envio, assinatura e devolutiva da
// assinatura da coordenação. Estrutura e comportamento idênticos à aba Coordenador (ver
// funções identificarStatusCoordenador/calcularResumoPorCoordenador/etc.), só trocando os
// campos: data_envio_coord -> envio_assinatura_coord, prazo_coord -> prazo_assinatura_coord,
// devolutiva_coord -> devolutiva_assinatura_coord. Estado (filtroRapidoAssCoord/
// assCoordExpandido/assCoordFiltroTipoAvGlobal) e todas as funções são isolados dos da aba
// Coordenador — não a alteram.

// Calcula a diferença em dias entre a devolutiva da assinatura e o prazo: devolutiva - prazo
// quando há devolutiva, ou hoje - prazo quando não há. Retorna null quando não há
// prazo_assinatura_coord definido (mesma lógica de calcularDiasCoordenador).
function calcularDiasAssinatura(record) {
  const prazo = parseBrDate(record.prazo_assinatura_coord);
  if (!prazo) return null;

  const devolutiva = parseBrDate(record.devolutiva_assinatura_coord);
  let referencia;
  if (devolutiva) {
    referencia = devolutiva;
  } else {
    referencia = new Date();
    referencia.setHours(0, 0, 0, 0);
  }

  const diffMs = referencia.getTime() - prazo.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Formata a diferença em dias no padrão compacto "-3 dias" / "0 dias" / "+5 dias"
function formatarDiasAssinatura(dias) {
  if (dias === null) return '-';
  if (dias > 0) return `+${dias} dias`;
  return `${dias} dias`;
}

// Status individual de uma demanda de assinatura (5 estados): Não enviado para assinatura /
// Em assinatura / Assinatura atrasada / Assinado no prazo / Assinado com atraso
function calcularStatusAssinatura(record) {
  const envio = safe(record.envio_assinatura_coord);
  const devolutiva = safe(record.devolutiva_assinatura_coord);
  const prazoStr = safe(record.prazo_assinatura_coord);

  if (!envio) return 'Não enviado para assinatura';

  if (!devolutiva) {
    return prazoStr && isDateOverdue(prazoStr) ? 'Assinatura atrasada' : 'Em assinatura';
  }

  const prazo = parseBrDate(prazoStr);
  const dataDevolutiva = parseBrDate(devolutiva);
  if (prazo && dataDevolutiva && dataDevolutiva.getTime() > prazo.getTime()) {
    return 'Assinado com atraso';
  }
  return 'Assinado no prazo';
}

function badgeClassForStatusAssinatura(status) {
  const map = {
    'Não enviado para assinatura': 'badge-coord-nao-enviado',
    'Em assinatura': 'badge-coord-aguardando',
    'Assinatura atrasada': 'badge-coord-atrasado',
    'Assinado no prazo': 'badge-coord-no-prazo',
    'Assinado com atraso': 'badge-coord-com-atraso'
  };
  return map[status] || '';
}

// Popula os selects de Ano, Disciplina, Tipo de AV, Coordenador e Módulo (filtro rápido do
// cabeçalho, mesmo padrão da aba Elaboração) da aba Assinatura Coordenador
// Opções fixas do campo "Status da assinatura" do popover — mesmas <option> estáticas de antes
// (value "Atrasadas" mantido igual ao original, mesmo com rótulo "Assinatura atrasada")
const OPCOES_ASSCOORD_STATUS = [
  { value: 'Não enviado para assinatura', label: 'Não enviado para assinatura' },
  { value: 'Em assinatura', label: 'Em assinatura' },
  { value: 'Atrasadas', label: 'Assinatura atrasada' },
  { value: 'Assinado no prazo', label: 'Assinado no prazo' },
  { value: 'Assinado com atraso', label: 'Assinado com atraso' }
];

function populateAssCoordFilterOptions(records) {
  populateCheckboxGroupField(assCoordCheckboxGroups.ano, records, 'ano', filtrosAssinaturaCoordenador.anos);
  populateCheckboxGroupField(assCoordCheckboxGroups.frente, records, 'frente', filtrosAssinaturaCoordenador.disciplinas);
  populateCheckboxGroupTipoAv(assCoordCheckboxGroups.tipoAv, records, filtrosAssinaturaCoordenador.tiposAv);
  populateCheckboxGroupField(assCoordCheckboxGroups.coordenador, records, 'coordenador', filtrosAssinaturaCoordenador.coordenadores);
  renderizarGrupoCheckbox(assCoordCheckboxGroups.status, OPCOES_ASSCOORD_STATUS, filtrosAssinaturaCoordenador.status);
  populateSelectOptions(assCoordSelectFilters.modulo, records, 'modulo', 'Módulo');
  populateAnoAplicacaoOptions(assCoordSelectFilters.ano, records);
}

// Aplica os filtros do popover (Ano/Disciplina/Tipo de AV/Coordenador/Status/busca) + filtro
// rápido de Módulo do cabeçalho da aba Assinatura Coordenador sobre os registros já filtrados
// globalmente
function aplicarFiltrosAssinaturaCoordenador(records) {
  const modulo = assCoordSelectFilters.modulo.value;
  const anoAplicacao = assCoordSelectFilters.ano.value;
  const busca = safe(assCoordFilterBusca.value).toLowerCase();

  return records.filter((record) => {
    if (!passaFiltroMultiplo(safe(record.ano), filtrosAssinaturaCoordenador.anos)) return false;
    if (!passaFiltroMultiplo(safe(record.frente), filtrosAssinaturaCoordenador.disciplinas)) return false;
    if (!passaFiltroMultiplo(safe(record.tipo_av), filtrosAssinaturaCoordenador.tiposAv)) return false;
    if (!passaFiltroMultiplo(safe(record.coordenador), filtrosAssinaturaCoordenador.coordenadores)) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (anoAplicacao && obterAnoAplicacao(record) !== anoAplicacao) return false;

    const statusAssinatura = calcularStatusAssinatura(record);
    if (!passaFiltroMultiplo(statusAssinatura, filtrosAssinaturaCoordenador.status)) return false;

    if (busca) {
      const camposVisiveis = [
        safe(record.modulo),
        safe(record.tipo_av),
        safe(record.ano),
        safe(record.frente),
        safe(record.coordenador),
        safe(record.envio_assinatura_coord),
        safe(record.prazo_assinatura_coord),
        safe(record.devolutiva_assinatura_coord),
        safe(record.observacao),
        statusAssinatura
      ];
      const matchesBusca = camposVisiveis.some((valor) => valor.toLowerCase().includes(busca));
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Verifica se um registro passa no filtro rápido (clique em card) atualmente ativo
function passaFiltroRapidoAssinaturaCoordenador(record) {
  if (!filtroRapidoAssCoord) return true;

  const status = calcularStatusAssinatura(record);

  switch (filtroRapidoAssCoord) {
    case 'enviadas':
      return Boolean(safe(record.envio_assinatura_coord));
    case 'em-assinatura':
      return status === 'Em assinatura';
    case 'assinadas':
      return Boolean(safe(record.devolutiva_assinatura_coord));
    case 'atrasadas':
      return status === 'Assinatura atrasada';
    default:
      return true;
  }
}

// Retorna os registros da aba Assinatura Coordenador já com filtros do popover, busca geral e
// filtro rápido do card aplicados
function obterRegistrosFiltradosAssinaturaCoordenador() {
  return aplicarFiltrosAssinaturaCoordenador(filteredRecords).filter(passaFiltroRapidoAssinaturaCoordenador);
}

// Alterna o filtro rápido do card clicado: se já estava ativo, desliga; senão, assume o novo
function alternarFiltroRapidoAssinaturaCoordenador(tipo) {
  filtroRapidoAssCoord = filtroRapidoAssCoord === tipo ? null : tipo;
  renderizarVisaoAssinaturaCoordenador();
}

// Atualiza o destaque visual do card correspondente ao filtro rápido ativo
function atualizarDestaqueCardsAssinaturaCoordenador() {
  document.querySelectorAll('#assinatura-coordenador-section [data-quick-filter]').forEach((card) => {
    const isActive = card.dataset.quickFilter === filtroRapidoAssCoord;
    card.classList.toggle('is-quick-active', isActive);
    card.setAttribute('aria-pressed', String(isActive));
  });
}

// Conta quantos filtros do popover estão ativos (selects preenchidos + busca) e atualiza o badge
// Copia o estado marcado dos checkboxes do popover para filtrosAssinaturaCoordenador — chamado
// ao clicar "Aplicar filtros"
function aplicarCheckboxesAssinaturaCoordenador() {
  filtrosAssinaturaCoordenador.anos = lerGrupoCheckbox(assCoordCheckboxGroups.ano);
  filtrosAssinaturaCoordenador.disciplinas = lerGrupoCheckbox(assCoordCheckboxGroups.frente);
  filtrosAssinaturaCoordenador.tiposAv = lerGrupoCheckbox(assCoordCheckboxGroups.tipoAv);
  filtrosAssinaturaCoordenador.coordenadores = lerGrupoCheckbox(assCoordCheckboxGroups.coordenador);
  filtrosAssinaturaCoordenador.status = lerGrupoCheckbox(assCoordCheckboxGroups.status);
}

function atualizarIndicadorFiltrosAssinaturaCoordenador() {
  const totalAtivos =
    Object.values(assCoordSelectFilters).filter((select) => select.value !== '').length +
    filtrosAssinaturaCoordenador.anos.length +
    filtrosAssinaturaCoordenador.disciplinas.length +
    filtrosAssinaturaCoordenador.tiposAv.length +
    filtrosAssinaturaCoordenador.coordenadores.length +
    filtrosAssinaturaCoordenador.status.length +
    (safe(assCoordFilterBusca.value) !== '' ? 1 : 0);

  assCoordFilterBadge.hidden = totalAtivos === 0;
  assCoordFilterBadge.textContent = totalAtivos;
  btnAbrirFiltrosAssCoord.classList.toggle('has-active-filters', totalAtivos > 0);
}

function abrirPopoverFiltrosAssinaturaCoordenador() {
  assCoordFiltersPopover.hidden = false;
  btnAbrirFiltrosAssCoord.classList.add('is-active');
  btnAbrirFiltrosAssCoord.setAttribute('aria-expanded', 'true');
  btnAbrirFiltrosAssCoord.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosAssCoord.dataset.iconAtivo;
}

function fecharPopoverFiltrosAssinaturaCoordenador() {
  assCoordFiltersPopover.hidden = true;
  btnAbrirFiltrosAssCoord.classList.remove('is-active');
  btnAbrirFiltrosAssCoord.setAttribute('aria-expanded', 'false');
  btnAbrirFiltrosAssCoord.querySelector('.filter-header-btn-icon').src = btnAbrirFiltrosAssCoord.dataset.iconNormal;
}

function alternarPopoverFiltrosAssinaturaCoordenador() {
  if (assCoordFiltersPopover.hidden) {
    abrirPopoverFiltrosAssinaturaCoordenador();
  } else {
    fecharPopoverFiltrosAssinaturaCoordenador();
  }
}

// Limpa os filtros próprios da aba Assinatura Coordenador (popover, busca e filtro rápido) e
// re-renderiza
function limparFiltrosAssinaturaCoordenador() {
  Object.values(assCoordSelectFilters).forEach((select) => (select.value = ''));
  filtrosAssinaturaCoordenador.anos = [];
  filtrosAssinaturaCoordenador.disciplinas = [];
  filtrosAssinaturaCoordenador.tiposAv = [];
  filtrosAssinaturaCoordenador.coordenadores = [];
  filtrosAssinaturaCoordenador.status = [];
  Object.values(assCoordCheckboxGroups).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  assCoordFilterBusca.value = '';
  filtroRapidoAssCoord = null;
  renderizarVisaoAssinaturaCoordenador();
}

// Calcula os totais usados pelos 4 cards da aba Assinatura Coordenador a partir dos registros
// filtrados (card "Pendente de Envio" foi removido do topo da seção a pedido).
function calcularTotaisAssinaturaCoordenador(records) {
  const totais = { enviadas: 0, emAssinatura: 0, assinadas: 0, atrasadas: 0 };

  records.forEach((record) => {
    const status = calcularStatusAssinatura(record);
    if (safe(record.envio_assinatura_coord)) totais.enviadas += 1;
    if (safe(record.devolutiva_assinatura_coord)) totais.assinadas += 1;
    if (status === 'Em assinatura') totais.emAssinatura += 1;
    if (status === 'Assinatura atrasada') totais.atrasadas += 1;
  });

  return totais;
}

function renderizarCardsAssinaturaCoordenador(records) {
  const totais = calcularTotaisAssinaturaCoordenador(records);
  domAssCoord.cardEnviadas.textContent = totais.enviadas;
  domAssCoord.cardEmAssinatura.textContent = totais.emAssinatura;
  domAssCoord.cardAssinadas.textContent = totais.assinadas;
  domAssCoord.cardAtrasadas.textContent = totais.atrasadas;

  renderizarTooltipEnviadasAssinaturaCoordenador(records);
}

// Calcula, por tipo de AV normalizado, o progresso de envio para assinatura do coordenador
// (envio_assinatura_coord preenchido) sobre o total de demandas daquele tipo no recorte atual
// (`records` já vem filtrado pelo popover/busca/módulo/filtro rápido). Por padrão mantém a
// ordem fixa AV1/AV2/2º CHAMADA/REC-SEM/REC-FIM, inclusive tipos sem nenhuma demanda (total 0);
// quando `filtroTipoAv` é informado (filtro "Filtrar por avaliação:" ativo), restringe a lista a
// apenas esse tipo — mesmo padrão usado na tooltip do status por ano do Processo Editorial
// (calcularProgressoConclusaoPorGrupos).
function calcularProgressoEnvioAssinaturaPorTipoAv(records, filtroTipoAv = null) {
  const tiposConsiderados = filtroTipoAv ? [filtroTipoAv] : ORDEM_TIPO_AV_PERFORMANCE;

  const totais = new Map(tiposConsiderados.map((tipo) => [tipo, { total: 0, enviadas: 0 }]));
  records.forEach((record) => {
    const tipo = normalizarTipoAvPerformance(record.tipo_av);
    if (!totais.has(tipo)) return;
    const grupo = totais.get(tipo);
    grupo.total += 1;
    if (safe(record.envio_assinatura_coord)) grupo.enviadas += 1;
  });

  return tiposConsiderados.map((tipo) => {
    const { total, enviadas } = totais.get(tipo);
    return {
      tipoAv: tipo,
      total,
      enviadas,
      percentual: total > 0 ? (enviadas / total) * 100 : 0
    };
  });
}

// Renderiza a dica de ferramenta analítica (tooltip) do card "Enviadas": barras compactas por
// tipo de AV mostrando o percentual de envio para assinatura do coordenador — mesmo padrão
// visual/funcional das tooltips já usadas nos cards "Pendente de Envio" (aba Coordenador) e
// "Concluídas" (Processo Editorial). Respeita o filtro "Filtrar por avaliação:" da seção: só
// exibe a avaliação filtrada quando um filtro específico está ativo (grupos.length === 1),
// mesma regra da tooltip do status por ano do Processo Editorial.
function renderizarTooltipEnviadasAssinaturaCoordenador(records) {
  const container = document.getElementById('assCoordEnviadasTooltipChart');
  if (!container) return;
  container.innerHTML = '';

  const grupos = calcularProgressoEnvioAssinaturaPorTipoAv(records, assCoordFiltroTipoAvGlobal);
  const totalGeral = grupos.reduce((soma, g) => soma + g.total, 0);

  if (totalGeral === 0 && grupos.length > 1) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-tooltip-empty';
    vazio.textContent = 'Não há demandas no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  grupos.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row coord-tooltip-row--clicavel';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '-1');
    row.title =
      `${grupo.tipoAv}: ${grupo.enviadas} de ${grupo.total} enviadas ` +
      `(${formatarPercentualComVirgula(grupo.percentual)}%)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = grupo.tipoAv;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${grupo.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${grupo.enviadas} de ${grupo.total} · ${formatarPercentualComVirgula(grupo.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    row.addEventListener('click', () => selecionarFiltroTipoAvGlobalAssinaturaCoordenador(grupo.tipoAv));

    container.appendChild(row);
  });
}

// Agrupa os registros filtrados por coordenador e calcula, para cada um, a quantidade de
// demandas, assinadas, em assinatura, não enviadas e atrasadas, além do status geral
// predominante (mesma prioridade da aba Coordenador: atrasadas > em assinatura > não
// enviadas > tudo assinado > em andamento)
function calcularResumoPorCoordenadorAssinatura(records) {
  const grupos = new Map();

  records.forEach((record) => {
    const coordenador = safe(record.coordenador) || 'Não informado';
    if (!grupos.has(coordenador)) {
      grupos.set(coordenador, []);
    }
    grupos.get(coordenador).push(record);
  });

  const linhas = [];

  grupos.forEach((registros, coordenador) => {
    let naoEnviadas = 0;
    let emAssinatura = 0;
    let assinadas = 0;
    let atrasadas = 0;

    registros.forEach((record) => {
      const envio = safe(record.envio_assinatura_coord);
      const devolutiva = safe(record.devolutiva_assinatura_coord);
      const status = calcularStatusAssinatura(record);

      if (!envio) naoEnviadas += 1;
      // "Em assinatura" só conta quando ainda está dentro do prazo — mesma regra do card "Em
      // Assinatura" (status === 'Em assinatura'). Registros com prazo vencido contam só em
      // "Atrasadas", nunca nas duas colunas ao mesmo tempo.
      if (status === 'Em assinatura') emAssinatura += 1;
      if (devolutiva) assinadas += 1;
      if (status === 'Assinatura atrasada') atrasadas += 1;
    });

    const quantidade = registros.length;

    let status;
    if (atrasadas > 0) {
      status = 'Com atrasos';
    } else if (emAssinatura > 0) {
      status = 'Em assinatura';
    } else if (naoEnviadas === quantidade) {
      status = 'Não enviado';
    } else if (assinadas === quantidade) {
      status = 'Assinado';
    } else {
      status = 'Em andamento';
    }

    linhas.push({ coordenador, quantidade, naoEnviadas, emAssinatura, assinadas, atrasadas, status, registros });
  });

  return linhas.sort((a, b) => {
    if (b.atrasadas !== a.atrasadas) return b.atrasadas - a.atrasadas;
    if (b.emAssinatura !== a.emAssinatura) return b.emAssinatura - a.emAssinatura;
    if (b.naoEnviadas !== a.naoEnviadas) return b.naoEnviadas - a.naoEnviadas;
    if (b.quantidade !== a.quantidade) return b.quantidade - a.quantidade;
    return a.coordenador.localeCompare(b.coordenador, 'pt-BR');
  });
}

// Classe do badge para o status geral do coordenador na tabela principal (distinto do status
// individual por demanda, que continua usando badgeClassForStatusAssinatura)
function badgeClassForStatusGeralAssinatura(status) {
  const map = {
    'Com atrasos': 'badge-coord-atrasado',
    'Em assinatura': 'badge-coord-aguardando',
    'Não enviado': 'badge-coord-nao-enviado',
    Assinado: 'badge-coord-no-prazo',
    'Em andamento': 'badge-coord-andamento'
  };
  return map[status] || '';
}

// Calcula, por ano escolar (ordem fixa ORDEM_ANO_ESCOLAR_COORD), o progresso de assinatura das
// demandas de UM coordenador: quantas têm devolutiva_assinatura_coord preenchida (assinadas)
// sobre o total de demandas daquele ano. `registros` já vem filtrado pelo recorte atual da
// seção (módulo, filtro por avaliação, popover/busca) e restrito ao coordenador da linha — ver
// calcularResumoPorCoordenadorAssinatura.
function calcularProgressoAssinaturaPorAnoDoCoordenador(registros) {
  const totais = new Map(ORDEM_ANO_ESCOLAR_COORD.map((ano) => [ano, { total: 0, assinadas: 0 }]));

  registros.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!totais.has(chave)) return;
    const grupo = totais.get(chave);
    grupo.total += 1;
    if (safe(record.devolutiva_assinatura_coord)) grupo.assinadas += 1;
  });

  return ORDEM_ANO_ESCOLAR_COORD.map((ano) => {
    const { total, assinadas } = totais.get(ano);
    return {
      ano,
      total,
      assinadas,
      percentual: total > 0 ? (assinadas / total) * 100 : 0
    };
  });
}

// Preenche um container de tooltip analítica com 1 linha por ano escolar (label + barra de
// progresso + "assinadas de total · percentual") — mesmo padrão visual das demais tooltips do
// sistema (ver renderizarLinhasTooltipProgressoConclusao), com preenchimento verde por
// representar assinatura concluída (ver CSS #assCoordStatusTooltipChart .coord-tooltip-bar-fill).
function renderizarLinhasTooltipAssinaturaPorAno(container, dadosPorAno) {
  container.innerHTML = '';

  dadosPorAno.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row';
    row.title =
      `${item.ano}: ${item.assinadas} de ${item.total} assinadas ` +
      `(${formatarPercentualComVirgula(item.percentual)}%)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = item.ano;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${item.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${item.assinadas} de ${item.total} · ${formatarPercentualComVirgula(item.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    container.appendChild(row);
  });
}

// Monta o badge de status geral de uma linha de coordenador da tabela "Avaliações enviadas para
// assinatura do coordenador", com uma dica de ferramenta (tooltip) mostrando o progresso de
// assinatura daquele coordenador por ano escolar — funciona para qualquer status exibido no
// badge (Em assinatura/Assinado/Com atrasos/Não enviado/Em andamento). `linha.registros` já vem
// do recorte filtrado atual (módulo, filtro por avaliação e demais filtros da seção) e restrito
// a este coordenador, então a tooltip respeita os mesmos filtros da tela.
//
// A tooltip é anexada a document.body e posicionada via JS (posicionarTooltipFixa), pois o
// badge fica dentro de um container com overflow-x:auto (.coord-table-scroll) — mesma técnica
// usada em criarBadgeStatusAnoComTooltip (Processo Editorial).
function criarBadgeStatusAssinaturaComTooltip(linha) {
  const wrapper = document.createElement('span');
  wrapper.className = 'coord-card-tooltip-wrapper assCoord-status-tooltip-wrapper';

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = `badge ${badgeClassForStatusGeralAssinatura(linha.status)} pe-status-badge-interativo`;
  badge.textContent = linha.status;

  const idBase = linha.coordenador.replace(/[^0-9a-zA-Z]/g, '') || 'semnome';
  const tooltipId = `assCoordStatusTooltip-${idBase}`;
  badge.setAttribute('aria-describedby', tooltipId);

  const tooltip = document.createElement('div');
  tooltip.className = 'coord-analytic-tooltip assCoord-status-tooltip-fixa';
  tooltip.id = tooltipId;
  tooltip.setAttribute('role', 'tooltip');

  const titulo = document.createElement('h4');
  titulo.className = 'coord-tooltip-title';
  titulo.textContent = `Progresso de assinatura — ${linha.coordenador}`;

  const subtitulo = document.createElement('p');
  subtitulo.className = 'coord-tooltip-subtitle';
  subtitulo.textContent = 'Percentual de avaliações assinadas por ano escolar neste coordenador.';

  const chart = document.createElement('div');
  chart.className = 'coord-tooltip-chart';

  tooltip.appendChild(titulo);
  tooltip.appendChild(subtitulo);
  tooltip.appendChild(chart);

  const dadosPorAno = calcularProgressoAssinaturaPorAnoDoCoordenador(linha.registros);
  renderizarLinhasTooltipAssinaturaPorAno(chart, dadosPorAno);

  document.body.appendChild(tooltip);
  wrapper._assCoordStatusTooltip = tooltip;

  let ocultarPendente = null;

  function mostrar() {
    if (ocultarPendente) {
      clearTimeout(ocultarPendente);
      ocultarPendente = null;
    }
    document
      .querySelectorAll('.assCoord-status-tooltip-fixa.is-visible')
      .forEach((t) => {
        if (t !== tooltip) t.classList.remove('is-visible');
      });
    posicionarTooltipFixa(tooltip, badge.getBoundingClientRect());
    tooltip.classList.add('is-visible');
  }

  function ocultar() {
    ocultarPendente = setTimeout(() => tooltip.classList.remove('is-visible'), 120);
  }

  badge.addEventListener('mouseenter', mostrar);
  badge.addEventListener('focus', mostrar);
  badge.addEventListener('mouseleave', ocultar);
  badge.addEventListener('blur', () => tooltip.classList.remove('is-visible'));

  tooltip.addEventListener('mouseenter', () => {
    if (ocultarPendente) {
      clearTimeout(ocultarPendente);
      ocultarPendente = null;
    }
  });
  tooltip.addEventListener('mouseleave', ocultar);

  badge.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    document.querySelectorAll('.assCoord-status-tooltip-fixa.is-visible').forEach((t) => t.classList.remove('is-visible'));
    if (abrindo) mostrar();
  });

  wrapper.appendChild(badge);
  return wrapper;
}

// Ordena as demandas de um coordenador para a lista expandida: 1º por tipo de AV (ordem fixa
// AV1→AV2→2º CHAMADA→REC-SEM→REC-FIM), 2º por prioridade de status, 3º pelo prazo mais antigo
const PRIORIDADE_STATUS_DETALHE_ASSINATURA = {
  'Assinatura atrasada': 1,
  'Em assinatura': 2,
  'Não enviado para assinatura': 3,
  'Assinado com atraso': 4,
  'Assinado no prazo': 5
};

function ordenarDetalheAssinaturaCoordenador(registros) {
  return [...registros].sort((a, b) => {
    const tipoAvA = normalizarTipoAvaliacao(a.tipo_av);
    const tipoAvB = normalizarTipoAvaliacao(b.tipo_av);
    const ordemTipoAvA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAvA);
    const ordemTipoAvB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(tipoAvB);
    const posicaoA = ordemTipoAvA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : ordemTipoAvA;
    const posicaoB = ordemTipoAvB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : ordemTipoAvB;
    if (posicaoA !== posicaoB) return posicaoA - posicaoB;

    const prioridadeA = PRIORIDADE_STATUS_DETALHE_ASSINATURA[calcularStatusAssinatura(a)] || 99;
    const prioridadeB = PRIORIDADE_STATUS_DETALHE_ASSINATURA[calcularStatusAssinatura(b)] || 99;
    if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

    const prazoA = parseBrDate(a.prazo_assinatura_coord);
    const prazoB = parseBrDate(b.prazo_assinatura_coord);
    if (!prazoA && !prazoB) return 0;
    if (!prazoA) return 1;
    if (!prazoB) return -1;
    return prazoA.getTime() - prazoB.getTime();
  });
}

// Alterna a expansão da lista de demandas de um coordenador: se já estava aberto, fecha;
// senão, abre o novo (fechando qualquer outro que estivesse aberto)
function alternarDetalheAssinaturaCoordenador(coordenador) {
  assCoordExpandido = assCoordExpandido === coordenador ? null : coordenador;
  renderizarVisaoAssinaturaCoordenador();
}

// Seleciona o filtro global de tipo de AV da aba Assinatura Coordenador ("Todas" = null)
function selecionarFiltroTipoAvGlobalAssinaturaCoordenador(tipoAv) {
  assCoordFiltroTipoAvGlobal = tipoAv;
  renderizarVisaoAssinaturaCoordenador();
}

// Renderiza a barra de filtro global "Filtrar por avaliação:" no topo da tabela principal,
// com um botão pill por tipo de AV (mesmo componente/opções da aba Coordenador)
function renderizarFiltroAvaliacaoAssinaturaCoordenador() {
  const container = domAssCoord.filtroAvaliacaoTopo;
  container.innerHTML = '';

  const label = document.createElement('span');
  label.className = 'coord-detail-filter-label';
  label.textContent = 'Filtrar por avaliação:';
  container.appendChild(label);

  OPCOES_FILTRO_TIPO_AV_COORDENADOR.forEach((opcao) => {
    const valor = opcao === 'Todas' ? null : opcao;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'coord-detail-filter-btn';
    btn.classList.toggle('active', assCoordFiltroTipoAvGlobal === valor);
    btn.textContent = opcao;
    btn.addEventListener('click', () => selecionarFiltroTipoAvGlobalAssinaturaCoordenador(valor));
    container.appendChild(btn);
  });
}

// Monta a linha expandida com as demandas de um coordenador (título + tabela de detalhe),
// com as colunas Módulo/Ano/Disciplina/Tipo de AV/Data de envio/Prazo/Data da devolutiva/
// Dias/Observação/Status
function criarLinhaDetalheAssinaturaCoordenador(coordenador, registros) {
  const trDetalhe = document.createElement('tr');
  trDetalhe.className = 'coord-detail-row';

  const tdDetalhe = document.createElement('td');
  tdDetalhe.colSpan = 7;

  const painel = document.createElement('div');
  painel.className = 'coord-detail-panel';

  const titulo = document.createElement('h4');
  titulo.className = 'coord-detail-title';
  titulo.textContent = `Assinaturas de ${coordenador}`;
  painel.appendChild(titulo);

  if (registros.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-detail-empty';
    vazio.textContent = 'Nenhuma demanda encontrada para este tipo de avaliação.';
    painel.appendChild(vazio);
    tdDetalhe.appendChild(painel);
    trDetalhe.appendChild(tdDetalhe);
    return trDetalhe;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'table-wrapper coord-detail-table-scroll';

  const table = document.createElement('table');
  table.className = 'data-table data-table-compact';

  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  [
    'Módulo', 'Ano', 'Disciplina', 'Tipo de AV', 'Data de envio', 'Prazo',
    'Data da devolutiva', 'Dias', 'Observação', 'Status'
  ].forEach((texto) => {
    const th = document.createElement('th');
    th.textContent = texto;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbodyDetalhe = document.createElement('tbody');
  const ordenados = ordenarDetalheAssinaturaCoordenador(registros);

  ordenados.forEach((record) => {
    const trItem = document.createElement('tr');
    const dias = calcularDiasAssinatura(record);
    const status = calcularStatusAssinatura(record);

    [
      safe(record.modulo),
      safe(record.ano),
      safe(record.frente),
      safe(record.tipo_av),
      safe(record.envio_assinatura_coord),
      safe(record.prazo_assinatura_coord),
      safe(record.devolutiva_assinatura_coord)
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor || '-';
      trItem.appendChild(td);
    });

    const tdDias = document.createElement('td');
    tdDias.className = 'coord-dias-cell';
    if (dias !== null && dias > 0) tdDias.classList.add('coord-dias-cell--atraso');
    if (dias !== null && dias < 0) tdDias.classList.add('coord-dias-cell--folga');
    tdDias.textContent = formatarDiasAssinatura(dias);
    trItem.appendChild(tdDias);

    const tdObservacao = document.createElement('td');
    tdObservacao.className = 'coord-observacao-cell';
    const observacao = safe(record.observacao);
    tdObservacao.textContent = observacao || '-';
    if (observacao) tdObservacao.title = observacao;
    trItem.appendChild(tdObservacao);

    const tdStatus = document.createElement('td');
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `badge ${badgeClassForStatusAssinatura(status)}`;
    badgeStatus.textContent = status;
    tdStatus.appendChild(badgeStatus);
    trItem.appendChild(tdStatus);

    tbodyDetalhe.appendChild(trItem);
  });

  table.appendChild(tbodyDetalhe);
  wrapper.appendChild(table);
  painel.appendChild(wrapper);
  tdDetalhe.appendChild(painel);
  trDetalhe.appendChild(tdDetalhe);

  return trDetalhe;
}

// Renderiza a tabela operacional da aba Assinatura Coordenador: uma linha por coordenador,
// com os totais de demandas/não enviadas/em assinatura/assinadas/atrasadas e o status geral
// predominante. Clicar no nome do coordenador expande a lista de demandas daquele coordenador.
function renderizarTabelaAssinaturaCoordenador(records) {
  const tbody = domAssCoord.tableBody;
  tbody.innerHTML = '';
  // As tooltips dos badges de status por coordenador são anexadas a document.body (ver
  // criarBadgeStatusAssinaturaComTooltip), fora da árvore do tbody, então precisam ser
  // removidas manualmente aqui antes de recriar as linhas — senão ficam órfãs a cada
  // re-renderização.
  document.querySelectorAll('.assCoord-status-tooltip-fixa').forEach((el) => el.remove());

  if (records.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'indicadores-tabela-vazia';
    td.textContent = 'Nenhum registro encontrado.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const linhas = calcularResumoPorCoordenadorAssinatura(records);
  const fragment = document.createDocumentFragment();

  linhas.forEach((linha) => {
    const expandido = assCoordExpandido === linha.coordenador;

    const tr = document.createElement('tr');
    tr.className = 'coord-table-row';
    tr.classList.toggle('coord-table-row--ativa', expandido);

    const tdCoordenador = document.createElement('td');
    const nomeClicavel = document.createElement('button');
    nomeClicavel.type = 'button';
    nomeClicavel.className = 'coord-coordenador-nome';
    nomeClicavel.setAttribute('aria-expanded', String(expandido));

    const chevron = document.createElement('span');
    chevron.className = 'coord-coordenador-chevron';
    chevron.textContent = expandido ? '▾' : '▸';
    chevron.setAttribute('aria-hidden', 'true');

    nomeClicavel.appendChild(chevron);
    nomeClicavel.appendChild(document.createTextNode(linha.coordenador));
    nomeClicavel.addEventListener('click', () => alternarDetalheAssinaturaCoordenador(linha.coordenador));
    tdCoordenador.appendChild(nomeClicavel);
    tr.appendChild(tdCoordenador);

    const tdQuantidade = document.createElement('td');
    tdQuantidade.textContent = linha.quantidade;
    tr.appendChild(tdQuantidade);

    [linha.naoEnviadas, linha.emAssinatura, linha.assinadas, linha.atrasadas].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdStatus = document.createElement('td');
    tdStatus.appendChild(criarBadgeStatusAssinaturaComTooltip(linha));
    tr.appendChild(tdStatus);

    fragment.appendChild(tr);

    if (expandido) {
      fragment.appendChild(criarLinhaDetalheAssinaturaCoordenador(linha.coordenador, linha.registros));
    }
  });

  tbody.appendChild(fragment);
}

// Renderiza toda a aba Assinatura Coordenador (cards + tabela) a partir dos registros já
// filtrados (globais + popover + busca + filtro rápido do card)
function renderizarVisaoAssinaturaCoordenador() {
  populateAssCoordFilterOptions(filteredRecords);
  atualizarIndicadorFiltrosAssinaturaCoordenador();
  atualizarDestaqueCardsAssinaturaCoordenador();
  renderizarFiltroAvaliacaoAssinaturaCoordenador();

  const records = obterRegistrosFiltradosAssinaturaCoordenador();

  // Filtro "Filtrar por avaliação": uma única base filtrada, usada tanto pelos cards do topo
  // quanto pela tabela, os detalhes expandidos e a sub-visão de Indicadores, para que tudo
  // fique consistente entre si
  const baseFiltradaPorTipoAv = assCoordFiltroTipoAvGlobal
    ? records.filter((record) => normalizarTipoAvaliacao(record.tipo_av) === assCoordFiltroTipoAvGlobal)
    : records;

  if (visaoAssinaturaCoordenador === 'indicadores') {
    renderizarIndicadoresAssinaturaCoordenador(baseFiltradaPorTipoAv);
    return;
  }

  if (records.length === 0 && filteredRecords.length > 0) {
    domAssCoord.emptyGeral.hidden = false;
    domAssCoord.conteudo.hidden = true;
    renderizarCardsAssinaturaCoordenador(baseFiltradaPorTipoAv);
    return;
  }
  domAssCoord.emptyGeral.hidden = true;
  domAssCoord.conteudo.hidden = false;

  renderizarCardsAssinaturaCoordenador(baseFiltradaPorTipoAv);
  renderizarTabelaAssinaturaCoordenador(baseFiltradaPorTipoAv);
}

// --- Aba Assinatura Coordenador: Indicadores (painel analítico da etapa de assinatura) ---
// Usa a mesma base filtrada (popover + pill "Filtrar por avaliação") do Acompanhamento —
// ver baseFiltradaPorTipoAv acima. Não possui popover de filtros próprio: respeita os
// filtros já existentes na aba (item 6 do pedido) mais o filtro interativo por coordenador
// (clique nos gráficos), isolado em filtrosIndicadoresAssCoord.

// Diferença em dias entre devolutiva e prazo da assinatura, só quando AMBOS estão
// preenchidos (sem o fallback "hoje - prazo" usado por calcularDiasAssinatura/tabela de
// acompanhamento) — os Indicadores só consideram demandas já respondidas, por definição
function calcularDiasAtrasoAssinaturaIndicadores(record) {
  const prazo = parseBrDate(record.prazo_assinatura_coord);
  const devolutiva = parseBrDate(record.devolutiva_assinatura_coord);
  if (!prazo || !devolutiva) return null;
  return Math.round((devolutiva.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
}

// Cards executivos: Total de Assinatura (2.1) / Fora do prazo (2.2) / Dentro do prazo (2.3) /
// Média de atraso (2.4)
function calcularIndicadoresAssinaturaCoordenador(dados) {
  let total = 0;
  let foraPrazo = 0;
  let noPrazo = 0;
  let somaAtraso = 0;
  let qtdAtrasos = 0;

  dados.forEach((record) => {
    if (!safe(record.envio_assinatura_coord)) return;
    total += 1;

    const dias = calcularDiasAtrasoAssinaturaIndicadores(record);
    if (dias === null) return;

    if (dias > 0) {
      foraPrazo += 1;
      somaAtraso += dias;
      qtdAtrasos += 1;
    } else {
      noPrazo += 1;
    }
  });

  return {
    total,
    foraPrazo,
    noPrazo,
    mediaAtraso: qtdAtrasos ? somaAtraso / qtdAtrasos : 0
  };
}

// Ranking "Atraso médio por coordenador" (2.6): só considera ocorrências atrasadas
// (devolutiva > prazo), ordenado da maior média para a menor (empate: mais ocorrências,
// depois ordem alfabética) — mesmo critério do ranking equivalente da aba Coordenador
function calcularRankingAtrasoPorCoordenadorAssCoord(dados) {
  const grupos = new Map();

  dados.forEach((record) => {
    if (!safe(record.envio_assinatura_coord)) return;
    const dias = calcularDiasAtrasoAssinaturaIndicadores(record);
    if (dias === null || dias <= 0) return;

    const coordenador = safe(record.coordenador) || 'Não informado';
    if (!grupos.has(coordenador)) {
      grupos.set(coordenador, { coordenador, somaAtraso: 0, ocorrencias: 0 });
    }
    const grupo = grupos.get(coordenador);
    grupo.somaAtraso += dias;
    grupo.ocorrencias += 1;
  });

  return Array.from(grupos.values())
    .map((grupo) => ({ ...grupo, mediaAtraso: grupo.ocorrencias ? grupo.somaAtraso / grupo.ocorrencias : 0 }))
    .sort((a, b) => {
      if (b.mediaAtraso !== a.mediaAtraso) return b.mediaAtraso - a.mediaAtraso;
      if (b.ocorrencias !== a.ocorrencias) return b.ocorrencias - a.ocorrencias;
      return a.coordenador.localeCompare(b.coordenador, 'pt-BR');
    });
}

// "Desempenho por Coordenador – Assinatura" (seção 3, linha 3): para cada coordenador,
// atraso médio + volume total de atividades (2.5, envio preenchido), ordenado por maior
// volume e, em empate, maior atraso médio.
//
// IMPORTANTE (2026-07-29): diferente do ranking (calcularRankingAtrasoPorCoordenadorAssCoord,
// que só soma ocorrências ATRASADAS), este "atrasoMedio" é a média de TODOS os dias com
// devolutiva+prazo preenchidos, incluindo valores negativos (devolvido antes do prazo) —
// não trunca em 0 nem usa valor absoluto, para que o gráfico mostre quem entrega adiantado.
// `qtdAtrasos`/`taxaAtraso` continuam contando só as ocorrências com atraso (> 0), usadas no
// tooltip separadamente da média.
function calcularDesempenhoPorCoordenadorAssCoord(dados) {
  const grupos = new Map();

  dados.forEach((record) => {
    if (!safe(record.envio_assinatura_coord)) return;
    const coordenador = safe(record.coordenador) || 'Não informado';
    if (!grupos.has(coordenador)) {
      grupos.set(coordenador, { categoria: coordenador, somaDias: 0, qtdComData: 0, qtdAtrasos: 0, volume: 0 });
    }
    const grupo = grupos.get(coordenador);
    grupo.volume += 1;

    const dias = calcularDiasAtrasoAssinaturaIndicadores(record);
    if (dias === null) return;

    grupo.somaDias += dias;
    grupo.qtdComData += 1;
    if (dias > 0) grupo.qtdAtrasos += 1;
  });

  return Array.from(grupos.values())
    .map((grupo) => ({
      categoria: grupo.categoria,
      atrasoMedio: grupo.qtdComData ? grupo.somaDias / grupo.qtdComData : 0,
      volume: grupo.volume,
      qtdAtrasos: grupo.qtdAtrasos,
      taxaAtraso: grupo.volume ? (grupo.qtdAtrasos / grupo.volume) * 100 : 0
    }))
    .sort((a, b) => (b.volume !== a.volume ? b.volume - a.volume : b.atrasoMedio - a.atrasoMedio));
}

// Filtro interativo por coordenador (clique no ranking ou nas barras do gráfico misto)
function aplicarFiltrosIndicadoresAssCoord(dados) {
  if (!filtrosIndicadoresAssCoord.coordenador) return dados;
  return dados.filter((record) => safe(record.coordenador) === filtrosIndicadoresAssCoord.coordenador);
}

function alternarFiltroIndicadorAssCoord(campo, valor) {
  filtrosIndicadoresAssCoord[campo] = filtrosIndicadoresAssCoord[campo] === valor ? null : valor;
  renderizarIndicadoresAssinaturaCoordenador(indicadoresAssCoordDadosBase);
}

function renderizarCardsIndicadoresAssCoord(indicadores) {
  domIndAssCoord.cardTotal.textContent = indicadores.total;
  domIndAssCoord.cardForaPrazo.textContent = indicadores.foraPrazo;
  domIndAssCoord.cardNoPrazo.textContent = indicadores.noPrazo;
  domIndAssCoord.cardMediaAtraso.textContent = `${formatarMediaAtrasoGrafico(indicadores.mediaAtraso)} dias`;
}

// Gráfico "Distribuição das assinaturas por prazo": donut de 2 fatias (Dentro do prazo /
// Fora do prazo), reaproveitando a técnica/classes visuais do donut "Distribuição do status
// do processo" (pe-donut-status-*, ver renderizarGraficoStatusProcessoPE) — genéricas o
// bastante para servir aqui sem precisar duplicar CSS
const CORES_DONUT_PRAZO_ASS_COORD = {
  'Dentro do prazo': '#15803d',
  'Fora do prazo': '#b91c1c'
};

function renderizarGraficoDonutPrazoAssCoord(indicadores) {
  const container = document.getElementById('graficoDonutPrazoAssCoord');
  container.innerHTML = '';

  const total = indicadores.noPrazo + indicadores.foraPrazo;
  if (total === 0) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem ocorrências no recorte atual.</p>';
    return;
  }

  const itens = [
    { categoria: 'Dentro do prazo', quantidade: indicadores.noPrazo },
    { categoria: 'Fora do prazo', quantidade: indicadores.foraPrazo }
  ];

  const wrapper = document.createElement('div');
  wrapper.className = 'pe-donut-status-wrapper';

  const raio = 60;
  const centro = 70;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 140 140');
  svg.setAttribute('class', 'pe-donut-status-svg');

  const trilho = document.createElementNS(svgNS, 'circle');
  trilho.setAttribute('cx', centro);
  trilho.setAttribute('cy', centro);
  trilho.setAttribute('r', raio);
  trilho.setAttribute('class', 'pe-donut-status-trilho');
  svg.appendChild(trilho);

  itens.forEach((item) => {
    if (item.quantidade === 0) return;
    const fracao = item.quantidade / total;
    const tamanho = fracao * circunferencia;

    const fatia = document.createElementNS(svgNS, 'circle');
    fatia.setAttribute('cx', centro);
    fatia.setAttribute('cy', centro);
    fatia.setAttribute('r', raio);
    fatia.setAttribute('class', 'pe-donut-status-fatia');
    fatia.style.stroke = CORES_DONUT_PRAZO_ASS_COORD[item.categoria];
    fatia.style.strokeDasharray = `${tamanho} ${circunferencia - tamanho}`;
    fatia.style.strokeDashoffset = -acumulado;
    const tituloEl = document.createElementNS(svgNS, 'title');
    tituloEl.textContent = `${item.categoria}: ${item.quantidade} (${formatarPercentualComVirgula((item.quantidade / total) * 100)}%)`;
    fatia.appendChild(tituloEl);
    svg.appendChild(fatia);

    acumulado += tamanho;
  });

  wrapper.appendChild(svg);

  const centroTexto = document.createElement('div');
  centroTexto.className = 'pe-donut-status-centro';
  centroTexto.innerHTML = `<span class="pe-donut-status-centro-valor">${total}</span><span class="pe-donut-status-centro-label">PROVAS</span>`;
  wrapper.appendChild(centroTexto);

  container.appendChild(wrapper);

  const legenda = document.createElement('div');
  legenda.className = 'pe-donut-status-legenda';
  itens.forEach((item) => {
    const linha = document.createElement('div');
    linha.className = 'pe-donut-status-legenda-item';
    linha.innerHTML =
      `<span class="pe-donut-status-legenda-dot" style="background:${CORES_DONUT_PRAZO_ASS_COORD[item.categoria]}"></span>` +
      `<span>${item.categoria}</span>` +
      `<span class="pe-donut-status-legenda-valor">${item.quantidade} (${formatarPercentualComVirgula(total ? (item.quantidade / total) * 100 : 0)}%)</span>`;
    legenda.appendChild(linha);
  });
  container.appendChild(legenda);
}

// Gráfico "Atraso médio por coordenador": barras horizontais, mesmo padrão visual/classes
// (coord-ranking-row) dos rankings da aba Coordenador; rótulo "X dias médios · Y ocorr."
function renderizarGraficoRankingAtrasoAssCoord(ranking) {
  const container = document.getElementById('graficoRankingAtrasoAssCoord');
  container.innerHTML = '';

  if (ranking.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'coord-chart-empty';
    vazio.textContent = 'Não há atrasos no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  const maiorValor = ranking[0].mediaAtraso;
  const filtroAtivo = filtrosIndicadoresAssCoord.coordenador;

  ranking.forEach((grupo) => {
    const row = document.createElement('div');
    row.className = 'coord-ranking-row';
    const selecionada = filtroAtivo === grupo.coordenador;
    row.classList.toggle('coord-ranking-row--ativa', selecionada);
    row.classList.toggle('coord-ranking-row--esmaecida', filtroAtivo !== null && !selecionada);
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.title =
      `${grupo.coordenador}: ${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias médios · ` +
      `${grupo.ocorrencias} ocorrência(s)`;

    const label = document.createElement('span');
    label.className = 'coord-ranking-label';
    label.textContent = grupo.coordenador;

    const track = document.createElement('div');
    track.className = 'coord-ranking-track';
    const fill = document.createElement('div');
    fill.className = 'coord-ranking-fill';
    fill.style.width = `${maiorValor ? (grupo.mediaAtraso / maiorValor) * 100 : 0}%`;
    track.appendChild(fill);

    const value = document.createElement('span');
    value.className = 'coord-ranking-value';
    value.textContent = `${formatarMediaAtrasoGrafico(grupo.mediaAtraso)} dias médios · ${grupo.ocorrencias} ocorr.`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);

    const clique = () => alternarFiltroIndicadorAssCoord('coordenador', grupo.coordenador);
    row.addEventListener('click', clique);
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        clique();
      }
    });

    container.appendChild(row);
  });
}

// Gráfico "Desempenho por Coordenador – Assinatura": mesmo renderer genérico usado por
// "Desempenho do coordenador" (aba Coordenador/validação) — ver
// renderizarGraficoDesempenhoPorCoordenador — garantindo visual e estrutura idênticos entre
// os dois, só trocando o container/dados/filtro/callback de clique. `permitirNegativo: true`
// porque o atrasoMedio da Assinatura pode ser negativo (devolução antes do prazo) — ver
// calcularDesempenhoPorCoordenadorAssCoord.
function renderizarGraficoDesempenhoAssCoord(dados) {
  renderizarGraficoDesempenhoPorCoordenador(
    'graficoDesempenhoAssCoord',
    dados,
    filtrosIndicadoresAssCoord.coordenador,
    (categoria) => alternarFiltroIndicadorAssCoord('coordenador', categoria),
    { permitirNegativo: true }
  );
}

// Orquestrador da sub-visão "Indicadores — Assinatura Coordenador": recebe a mesma base já
// filtrada pelo popover + pill "Filtrar por avaliação" do Acompanhamento (baseFiltradaPorTipoAv)
function renderizarIndicadoresAssinaturaCoordenador(dadosBase) {
  indicadoresAssCoordDadosBase = dadosBase;

  if (dadosBase.length === 0) {
    domIndAssCoord.emptyGeral.hidden = false;
    domIndAssCoord.emptyGeral.textContent = 'Nenhum dado disponível para o filtro selecionado.';
    domIndAssCoord.conteudo.hidden = true;
    return;
  }

  const dados = aplicarFiltrosIndicadoresAssCoord(dadosBase);

  if (dados.length === 0) {
    domIndAssCoord.emptyGeral.hidden = false;
    domIndAssCoord.emptyGeral.textContent = 'Sem ocorrências no recorte atual.';
    domIndAssCoord.conteudo.hidden = true;
    return;
  }
  domIndAssCoord.emptyGeral.hidden = true;
  domIndAssCoord.conteudo.hidden = false;

  const indicadores = calcularIndicadoresAssinaturaCoordenador(dados);
  renderizarCardsIndicadoresAssCoord(indicadores);
  renderizarGraficoDonutPrazoAssCoord(indicadores);
  renderizarGraficoRankingAtrasoAssCoord(calcularRankingAtrasoPorCoordenadorAssCoord(dados));
  renderizarGraficoDesempenhoAssCoord(calcularDesempenhoPorCoordenadorAssCoord(dados));
}

// --- "Previsto vs. Realizado" (dentro do grupo "Indicadores do Processo", 2026-07-30) ---
// Nova seção própria — não é atalho de nenhuma aba existente. A análise trabalha com provas/
// blocos consolidados (mesmo padrão de BLOCO 1/BLOCO 2/REDAÇÃO no Ensino Médio e BLOQUINHOs na
// AV2 do 9º ano já usado no Processo Editorial e na Arte-finalização e Envio — ver
// classificarBlocosPrevistoRealizado/agruparRegistrosProcessoEditorialPorAno), nunca por
// disciplina/registro isolado. Só entram na análise blocos com TODOS os componentes com
// data_envio_grafica preenchida (sem fallback para envio_grafica); compara a maior
// data_envio_grafica do bloco contra a data_aplicacao, em dias úteis (sem contar sábado/domingo;
// feriados não são considerados nesta 1ª versão). Base de dados: filteredRecords (mesmo recorte
// global de todas as outras abas), com filtros próprios isolados do resto do projeto (Módulo/
// Ano/Tipo de AV/busca, sempre visíveis, sem popover — mesmo padrão da aba Geral) aplicados
// ANTES da consolidação por bloco.

const domPrevisto = {
  emptyGeral: document.getElementById('indPrevistoEmptyGeral'),
  conteudo: document.getElementById('indPrevistoConteudo'),
  filtroModulo: document.getElementById('filterPrevistoModulo'),
  filtroAno: document.getElementById('filterPrevistoAno'),
  filtroTipoAv: document.getElementById('filterPrevistoTipoAv'),
  filtroBusca: document.getElementById('filterPrevistoBusca'),
  cardTotal: document.getElementById('indPrevistoCardTotal'),
  cardDentro: document.getElementById('indPrevistoCardDentro'),
  cardFora: document.getElementById('indPrevistoCardFora'),
  cardMediaDias: document.getElementById('indPrevistoCardMediaDias'),
  graficoDistribuicao: document.getElementById('graficoDistribuicaoGeralPrevisto'),
  graficoModulo: document.getElementById('graficoResultadoModuloPrevisto'),
  tabelaDetalheBody: document.getElementById('indPrevistoDetalheTableBody'),
  cardDentroWrapper: document.getElementById('indPrevistoCardDentroWrapper'),
  cardForaWrapper: document.getElementById('indPrevistoCardForaWrapper'),
  filtroStatusChipWrapper: document.getElementById('indPrevistoFiltroStatusChipWrapper'),
  filtroStatusChipTexto: document.getElementById('indPrevistoFiltroStatusChipTexto'),
  filtroStatusChipRemover: document.getElementById('indPrevistoFiltroStatusChipRemover')
};

// Filtros próprios da seção (isolados do resto do projeto)
let filtrosPrevistoRealizado = { modulo: '', ano: '', tipoAv: '', busca: '' };

// Filtro de status aplicado ao clicar nos cards "Dentro do previsto"/"Fora do previsto" (ver
// alternarFiltroStatusPrevistoRealizado) — null quando nenhum filtro de status está ativo
let filtroStatusPrevistoRealizado = null;

// Quantidade mínima de dias úteis de antecedência para uma prova ser considerada "Dentro do
// previsto" (regra central da seção, ver item 2 do pedido)
const LIMITE_DIAS_UTEIS_PREVISTO = 5;

// Se a data_aplicacao cair em sábado ou domingo, usa a segunda-feira seguinte como referência
// para o cálculo de dias úteis de antecedência (só para o cálculo — a data exibida na coluna
// "Data da aplicação" da tabela continua sendo a original, sem ajuste). Retorna null se `data`
// for inválida/nula.
function ajustarAplicacaoParaDiaUtil(data) {
  if (!data) return null;
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return null;

  const diaSemana = d.getDay();
  if (diaSemana === 6) d.setDate(d.getDate() + 2);
  if (diaSemana === 0) d.setDate(d.getDate() + 1);

  return d;
}

// Conta dias úteis (seg-sex, sem feriados nesta 1ª versão) estritamente entre duas datas
// (objetos Date, não strings dd/mm/aaaa — diferente da função homônima já existente no
// projeto, calcularDiasUteisEntreDatas, usada pelo fluxo Elaborador/validação; por isso o nome
// próprio abaixo, para não colidir/sobrescrever aquela) — do dia seguinte a `dataInicio` até
// `dataFim`, inclusive. Se `dataFim` for anterior a `dataInicio` (envio depois da aplicação), o
// resultado é o mesmo cálculo com sinal negativo (nunca positivo), conforme pedido. Retorna
// null se alguma data for inválida.
function calcularDiasUteisEntrePrevistoRealizado(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return null;

  const inicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
  const fim = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate());
  if (inicio.getTime() === fim.getTime()) return 0;

  const sinal = fim > inicio ? 1 : -1;
  const [de, ate] = sinal === 1 ? [inicio, fim] : [fim, inicio];

  let contador = 0;
  const cursor = new Date(de);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor.getTime() <= ate.getTime()) {
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) contador += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  return contador * sinal;
}

// Consolida o recorte já filtrado (Módulo/Ano/Tipo de AV/busca) em provas/blocos — mesmo
// agrupamento por ano/bloco/bloquinho usado no Processo Editorial e na Arte-finalização e Envio
// (agruparRegistrosProcessoEditorialPorAno: BLOCO 1/BLOCO 2/REDAÇÃO no Ensino Médio, BLOQUINHOs
// na AV2 do 9º ano, 1 registro por prova nos demais anos) — e classifica cada bloco: só entram
// na análise blocos "finalizados" (TODOS os registros do bloco com data_envio_grafica
// preenchida); a data de envio do bloco é a maior data_envio_grafica entre os componentes (só
// está pronto quando o último for enviado) e a data de aplicação é a mesma do bloco — se algum
// componente divergir, usa a menor data válida e registra um aviso no console para revisão.
function classificarBlocosPrevistoRealizado(dadosFiltrados) {
  const porAno = new Map(ORDEM_ANO_ESCOLAR_COORD.map((ano) => [ano, []]));

  dadosFiltrados.forEach((record) => {
    const numero = normalizarAnoSegmento(record.ano);
    if (numero === null) return;
    const chave = `${numero}º`;
    if (!porAno.has(chave)) return;
    porAno.get(chave).push(record);
  });

  const classificados = [];

  porAno.forEach((registros, ano) => {
    if (registros.length === 0) return;

    agruparRegistrosProcessoEditorialPorAno(ano, registros).forEach((grupo) => {
      const finalizado = grupo.registros.every((record) => temDataOuValor(record.data_envio_grafica));
      if (!finalizado) return;

      const datasEnvio = grupo.registros
        .map((record) => parseDataAplicacao(record.data_envio_grafica))
        .filter(Boolean);
      const dataEnvio = datasEnvio.reduce((maior, atual) => (!maior || atual > maior ? atual : maior), null);

      const datasAplicacao = grupo.registros
        .map((record) => parseDataAplicacao(record.data_aplicacao))
        .filter(Boolean);
      if (!dataEnvio || datasAplicacao.length === 0) return;

      const chavesUnicas = new Set(datasAplicacao.map((data) => obterChaveDia(data)));
      if (chavesUnicas.size > 1) {
        console.warn(
          `[Previsto vs. Realizado] data_aplicacao divergente entre os componentes do bloco ${grupo.id} — usando a menor data para o cálculo. Revisar cadastro.`
        );
      }
      const dataAplicacao = datasAplicacao.reduce((menor, atual) => (!menor || atual < menor ? atual : menor), null);

      // Se a aplicação cai em sábado/domingo, a antecedência é contada até a segunda-feira
      // seguinte (ver ajustarAplicacaoParaDiaUtil) — só para o cálculo de dias úteis/status; a
      // data exibida na tabela (dataAplicacao) continua sendo a original
      const dataAplicacaoAjustada = ajustarAplicacaoParaDiaUtil(dataAplicacao);
      const dias = calcularDiasUteisEntrePrevistoRealizado(dataEnvio, dataAplicacaoAjustada);
      const status = dias >= LIMITE_DIAS_UTEIS_PREVISTO ? 'Dentro do previsto' : 'Fora do previsto';

      classificados.push({
        id: grupo.id,
        modulo: safe(grupo.registros[0].modulo),
        dataAplicacao,
        dataEnvio,
        diasUteisAntecedencia: dias,
        status,
        registros: grupo.registros
      });
    });
  });

  return classificados;
}

// Popula os selects de Módulo (dinâmico, a partir do recorte atual) — Ano e Tipo de AV usam
// listas fixas do projeto (populadas 1x, idempotente)
function popularFiltrosPrevistoRealizado(records) {
  populateSelectOptions(domPrevisto.filtroModulo, records, 'modulo');

  if (domPrevisto.filtroAno.options.length <= 1) {
    ORDEM_ANO_ESCOLAR_COORD.forEach((ano) => {
      const option = document.createElement('option');
      option.value = ano;
      option.textContent = ano;
      domPrevisto.filtroAno.appendChild(option);
    });
  }

  if (domPrevisto.filtroTipoAv.options.length <= 1) {
    ORDEM_TIPO_AV_PERFORMANCE.forEach((tipoAv) => {
      const option = document.createElement('option');
      option.value = tipoAv;
      option.textContent = tipoAv;
      domPrevisto.filtroTipoAv.appendChild(option);
    });
  }
}

// Aplica os filtros próprios da seção (Módulo/Ano/Tipo de AV/busca em id-modulo-ano-tipoAv-frente)
function aplicarFiltrosPrevistoRealizado(dados) {
  const { modulo, ano, tipoAv, busca } = filtrosPrevistoRealizado;
  const buscaLower = busca.trim().toLowerCase();

  return dados.filter((record) => {
    if (modulo && safe(record.modulo) !== modulo) return false;

    if (ano) {
      const numero = normalizarAnoSegmento(record.ano);
      if (numero === null || `${numero}º` !== ano) return false;
    }

    if (tipoAv && normalizarTipoAvPerformance(record.tipo_av) !== tipoAv) return false;

    if (buscaLower) {
      const alvo = [record.id, record.modulo, record.ano, record.tipo_av, record.frente]
        .map((v) => safe(v).toLowerCase())
        .join(' ');
      if (!alvo.includes(buscaLower)) return false;
    }

    return true;
  });
}

// Calcula os 4 cards a partir da lista já classificada por bloco (1 item por prova/bloco
// consolidado: { id, modulo, dataAplicacao, dataEnvio, diasUteisAntecedencia, status, registros })
function calcularCardsPrevistoRealizado(classificados) {
  const total = classificados.length;
  const dentro = classificados.filter((item) => item.status === 'Dentro do previsto');
  const fora = classificados.filter((item) => item.status === 'Fora do previsto');

  const finalizadas = [...dentro, ...fora];
  const mediaDias = finalizadas.length
    ? finalizadas.reduce((soma, item) => soma + item.diasUteisAntecedencia, 0) / finalizadas.length
    : 0;

  return {
    total,
    dentro: dentro.length,
    fora: fora.length,
    mediaDias
  };
}

function atualizarCardsPrevistoRealizado(classificados) {
  const totais = calcularCardsPrevistoRealizado(classificados);
  const pct = (valor) => (totais.total ? formatarPercentualComVirgula((valor / totais.total) * 100) : '0,0');

  domPrevisto.cardTotal.textContent = totais.total;
  domPrevisto.cardDentro.textContent = `${totais.dentro} (${pct(totais.dentro)}%)`;
  domPrevisto.cardFora.textContent = `${totais.fora} (${pct(totais.fora)}%)`;
  domPrevisto.cardMediaDias.textContent = `${formatarMediaAtrasoGrafico(totais.mediaDias)} dias úteis`;
}

// Gráfico 1 — Distribuição geral (donut), mesmo padrão visual/SVG manual de
// renderizarGraficoStatusProcessoPE (pe-donut-status-*), só trocando as 2 categorias e cores
const CORES_DONUT_PREVISTO_REALIZADO = {
  'Dentro do previsto': '#17365c',
  'Fora do previsto': '#b91c1c'
};

function renderizarGraficoDistribuicaoGeralPrevisto(classificados) {
  const container = domPrevisto.graficoDistribuicao;
  container.innerHTML = '';

  const total = classificados.length;
  if (total === 0) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem provas no recorte atual.</p>';
    return;
  }

  const categorias = ['Dentro do previsto', 'Fora do previsto'];
  const contagem = categorias.map((categoria) => ({
    categoria,
    quantidade: classificados.filter((item) => item.status === categoria).length
  }));

  const wrapper = document.createElement('div');
  wrapper.className = 'pe-donut-status-wrapper';

  const raio = 60;
  const centro = 70;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 140 140');
  svg.setAttribute('class', 'pe-donut-status-svg');

  const trilho = document.createElementNS(svgNS, 'circle');
  trilho.setAttribute('cx', centro);
  trilho.setAttribute('cy', centro);
  trilho.setAttribute('r', raio);
  trilho.setAttribute('class', 'pe-donut-status-trilho');
  svg.appendChild(trilho);

  contagem.forEach((item) => {
    if (item.quantidade === 0) return;
    const fracao = item.quantidade / total;
    const tamanho = fracao * circunferencia;

    const fatia = document.createElementNS(svgNS, 'circle');
    fatia.setAttribute('cx', centro);
    fatia.setAttribute('cy', centro);
    fatia.setAttribute('r', raio);
    fatia.setAttribute('class', 'pe-donut-status-fatia');
    fatia.style.stroke = CORES_DONUT_PREVISTO_REALIZADO[item.categoria];
    fatia.style.strokeDasharray = `${tamanho} ${circunferencia - tamanho}`;
    fatia.style.strokeDashoffset = -acumulado;
    const tituloEl = document.createElementNS(svgNS, 'title');
    tituloEl.textContent = `${item.categoria}: ${item.quantidade} (${formatarPercentualComVirgula((item.quantidade / total) * 100)}%)`;
    fatia.appendChild(tituloEl);
    svg.appendChild(fatia);

    acumulado += tamanho;
  });

  wrapper.appendChild(svg);

  const centroTexto = document.createElement('div');
  centroTexto.className = 'pe-donut-status-centro';
  centroTexto.innerHTML = `<span class="pe-donut-status-centro-valor">${total}</span><span class="pe-donut-status-centro-label">PROVAS</span>`;
  wrapper.appendChild(centroTexto);

  container.appendChild(wrapper);

  const legenda = document.createElement('div');
  legenda.className = 'pe-donut-status-legenda';
  contagem.forEach((item) => {
    const linha = document.createElement('div');
    linha.className = 'pe-donut-status-legenda-item';
    linha.style.cursor = 'default';
    linha.innerHTML =
      `<span class="pe-donut-status-legenda-dot" style="background:${CORES_DONUT_PREVISTO_REALIZADO[item.categoria]}"></span>` +
      `<span>${item.categoria}</span>` +
      `<span class="pe-donut-status-legenda-valor">${item.quantidade} (${formatarPercentualComVirgula(total ? (item.quantidade / total) * 100 : 0)}%)</span>`;
    legenda.appendChild(linha);
  });
  container.appendChild(legenda);
}

// Gráfico 2 — Resultado por módulo (barras horizontais empilhadas): 1 barra por módulo
// presente no recorte, dividida em 2 segmentos proporcionais (Dentro do previsto/Fora do
// previsto), com rótulo de quantidade dentro de cada segmento
function renderizarGraficoResultadoPorModuloPrevisto(classificados) {
  const container = domPrevisto.graficoModulo;
  container.innerHTML = '';

  if (classificados.length === 0) {
    container.innerHTML = '<p class="indicadores-chart-empty">Sem provas no recorte atual.</p>';
    return;
  }

  const categorias = ['Dentro do previsto', 'Fora do previsto'];

  const legenda = document.createElement('div');
  legenda.className = 'prg-stacked-legenda';
  categorias.forEach((categoria) => {
    const item = document.createElement('span');
    item.className = 'prg-stacked-legenda-item';
    item.innerHTML =
      `<span class="prg-stacked-legenda-dot" style="background:${CORES_DONUT_PREVISTO_REALIZADO[categoria]}"></span>${categoria}`;
    legenda.appendChild(item);
  });
  container.appendChild(legenda);

  const modulos = Array.from(new Set(classificados.map((item) => item.modulo).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b, 'pt-BR', { numeric: true })
  );

  if (modulos.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'prg-stacked-vazio';
    vazio.textContent = 'Nenhum módulo identificado no recorte atual.';
    container.appendChild(vazio);
    return;
  }

  modulos.forEach((modulo) => {
    const doModulo = classificados.filter((item) => item.modulo === modulo);
    const total = doModulo.length;

    const bloco = document.createElement('div');
    bloco.className = 'prg-stacked-modulo';

    const header = document.createElement('div');
    header.className = 'prg-stacked-modulo-header';
    const label = document.createElement('span');
    label.className = 'prg-stacked-modulo-label';
    label.textContent = modulo;
    const totalTexto = document.createElement('span');
    totalTexto.className = 'prg-stacked-modulo-total';
    totalTexto.textContent = `${total} prova${total === 1 ? '' : 's'}`;
    header.appendChild(label);
    header.appendChild(totalTexto);
    bloco.appendChild(header);

    const bar = document.createElement('div');
    bar.className = 'prg-stacked-bar';

    categorias.forEach((categoria) => {
      const quantidade = doModulo.filter((item) => item.status === categoria).length;
      if (quantidade === 0) return;

      const segmento = document.createElement('span');
      segmento.className = 'prg-stacked-segmento';
      segmento.style.background = CORES_DONUT_PREVISTO_REALIZADO[categoria];
      segmento.style.width = `${(quantidade / total) * 100}%`;
      segmento.textContent = quantidade;
      segmento.title = `${categoria}: ${quantidade} (${formatarPercentualComVirgula((quantidade / total) * 100)}%)`;
      bar.appendChild(segmento);
    });

    bloco.appendChild(bar);
    container.appendChild(bloco);
  });
}

// Tabela "Detalhamento das provas finalizadas" — 1 linha por prova/bloco consolidado já
// classificado (mesma lista usada nos cards/gráficos: só blocos com TODOS os componentes com
// data_envio_grafica preenchida). CÓD usa o código consolidado do bloco (item.id, mesmo padrão
// "M3-AV1-1º-BLOCO 1" do Processo Editorial); Data do envio usa a maior data_envio_grafica entre
// os componentes do bloco (item.dataEnvio); "Dias úteis" exibe o valor com sinal invertido em
// relação a item.diasUteisAntecedencia (que é sempre >= 0, envio antes da aplicação) — aqui
// aparece negativo, seguindo a convenção pedida (data_aplicacao - data_envio_grafica)
function renderizarTabelaDetalhePrevistoRealizado(classificados) {
  const tbody = domPrevisto.tabelaDetalheBody;
  tbody.innerHTML = '';

  const fragment = document.createDocumentFragment();

  classificados.forEach((item) => {
    const tr = document.createElement('tr');

    const tdCod = document.createElement('td');
    tdCod.textContent = item.id;
    tr.appendChild(tdCod);

    const tdAplicacao = document.createElement('td');
    tdAplicacao.textContent = formatarDataAplicacaoExibicao(item.dataAplicacao);
    tr.appendChild(tdAplicacao);

    const tdEnvio = document.createElement('td');
    tdEnvio.textContent = formatarDataAplicacaoExibicao(item.dataEnvio);
    tr.appendChild(tdEnvio);

    const diasUteisExibicao = -item.diasUteisAntecedencia;
    const tdDias = document.createElement('td');
    tdDias.textContent = diasUteisExibicao;
    tdDias.className = diasUteisExibicao <= -LIMITE_DIAS_UTEIS_PREVISTO ? 'prg-dias-uteis-dentro' : 'prg-dias-uteis-fora';
    tr.appendChild(tdDias);

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${item.status === 'Dentro do previsto' ? 'badge-pe-status-concluido' : 'badge-pe-status-pendente'}`;
    badge.textContent = item.status;
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
}

// Alterna o filtro de status ao clicar/ativar (Enter/Espaço) um dos cards "Dentro do
// previsto"/"Fora do previsto": clicar no card já ativo remove o filtro; clicar em outro card
// troca o filtro ativo
function alternarFiltroStatusPrevistoRealizado(status) {
  filtroStatusPrevistoRealizado = filtroStatusPrevistoRealizado === status ? null : status;
  renderizarIndicadorPrevistoRealizado();
}

// Sincroniza o destaque visual dos 2 cards clicáveis e o chip "Status: ..." com o filtro de
// status atualmente ativo (filtroStatusPrevistoRealizado)
function atualizarIndicadorFiltroStatusPrevistoRealizado() {
  domPrevisto.cardDentroWrapper.classList.toggle(
    'card-active-filter',
    filtroStatusPrevistoRealizado === 'Dentro do previsto'
  );
  domPrevisto.cardDentroWrapper.setAttribute(
    'aria-pressed',
    String(filtroStatusPrevistoRealizado === 'Dentro do previsto')
  );

  domPrevisto.cardForaWrapper.classList.toggle(
    'card-active-filter',
    filtroStatusPrevistoRealizado === 'Fora do previsto'
  );
  domPrevisto.cardForaWrapper.setAttribute(
    'aria-pressed',
    String(filtroStatusPrevistoRealizado === 'Fora do previsto')
  );

  domPrevisto.filtroStatusChipWrapper.hidden = !filtroStatusPrevistoRealizado;
  if (filtroStatusPrevistoRealizado) {
    domPrevisto.filtroStatusChipTexto.textContent = `Status: ${filtroStatusPrevistoRealizado}`;
  }
}

domPrevisto.cardDentroWrapper.addEventListener('click', () => {
  alternarFiltroStatusPrevistoRealizado('Dentro do previsto');
});
domPrevisto.cardForaWrapper.addEventListener('click', () => {
  alternarFiltroStatusPrevistoRealizado('Fora do previsto');
});
[domPrevisto.cardDentroWrapper, domPrevisto.cardForaWrapper].forEach((wrapper) => {
  wrapper.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    wrapper.click();
  });
});
domPrevisto.filtroStatusChipRemover.addEventListener('click', () => {
  filtroStatusPrevistoRealizado = null;
  renderizarIndicadorPrevistoRealizado();
});

// Orquestrador da seção: base = filteredRecords (mesmo recorte global de todas as outras
// abas) + filtros próprios (Módulo/Ano/Tipo de AV/busca) — alimenta cards e os 2 gráficos a
// partir da mesma lista já classificada. Ordem: 1) filtros principais, 2) consolidação por
// bloco, 3) só blocos com data_envio_grafica preenchida (já feito em
// classificarBlocosPrevistoRealizado), 4) status de cada bloco (idem), 5) filtro de status do
// card clicado, se houver, 6) atualiza cards/gráficos/tabela.
function renderizarIndicadorPrevistoRealizado() {
  popularFiltrosPrevistoRealizado(filteredRecords);
  atualizarIndicadorFiltroStatusPrevistoRealizado();

  // Filtros primeiro (Módulo/Ano/Tipo de AV/busca), consolidação por bloco depois — nessa ordem,
  // para não gerar contagens incorretas (ver classificarBlocosPrevistoRealizado)
  const dadosFiltrados = aplicarFiltrosPrevistoRealizado(filteredRecords);
  const classificadosBase = classificarBlocosPrevistoRealizado(dadosFiltrados);

  if (classificadosBase.length === 0) {
    domPrevisto.emptyGeral.hidden = false;
    domPrevisto.emptyGeral.textContent =
      filteredRecords.length === 0
        ? 'Nenhum dado disponível para o filtro selecionado.'
        : 'Nenhuma prova enviada para a gráfica no recorte atual.';
    domPrevisto.conteudo.hidden = true;
    domPrevisto.tabelaDetalheBody.innerHTML = '';
    return;
  }

  // Filtro de status clicado no card (ver alternarFiltroStatusPrevistoRealizado), aplicado por
  // último — depois de filtros principais, consolidação por bloco e cálculo de status
  const classificados = filtroStatusPrevistoRealizado
    ? classificadosBase.filter((item) => item.status === filtroStatusPrevistoRealizado)
    : classificadosBase;

  if (classificados.length === 0) {
    domPrevisto.emptyGeral.hidden = false;
    domPrevisto.emptyGeral.textContent = `Nenhuma prova classificada como "${filtroStatusPrevistoRealizado}" no recorte atual.`;
    domPrevisto.conteudo.hidden = true;
    domPrevisto.tabelaDetalheBody.innerHTML = '';
    return;
  }

  domPrevisto.emptyGeral.hidden = true;
  domPrevisto.conteudo.hidden = false;

  atualizarCardsPrevistoRealizado(classificados);
  renderizarGraficoDistribuicaoGeralPrevisto(classificados);
  renderizarGraficoResultadoPorModuloPrevisto(classificados);
  renderizarTabelaDetalhePrevistoRealizado(classificados);
}

domPrevisto.filtroModulo.addEventListener('change', () => {
  filtrosPrevistoRealizado.modulo = domPrevisto.filtroModulo.value;
  filtroStatusPrevistoRealizado = null;
  renderizarIndicadorPrevistoRealizado();
});
domPrevisto.filtroAno.addEventListener('change', () => {
  filtrosPrevistoRealizado.ano = domPrevisto.filtroAno.value;
  filtroStatusPrevistoRealizado = null;
  renderizarIndicadorPrevistoRealizado();
});
domPrevisto.filtroTipoAv.addEventListener('change', () => {
  filtrosPrevistoRealizado.tipoAv = domPrevisto.filtroTipoAv.value;
  filtroStatusPrevistoRealizado = null;
  renderizarIndicadorPrevistoRealizado();
});
domPrevisto.filtroBusca.addEventListener('input', () => {
  filtrosPrevistoRealizado.busca = domPrevisto.filtroBusca.value;
  filtroStatusPrevistoRealizado = null;
  renderizarIndicadorPrevistoRealizado();
});

// --- "Resumo da Produção" (2026-09-11) ---
// Visão executiva do total de avaliações e do andamento de cada etapa do Processo de Produção
// (Elaboração → 1ª Validação → Processo Editorial → Assinatura do Coordenador → Arte-finalização
// e Envio). Mesma base (filteredRecords) e mesmo padrão de consolidação por bloco
// (agruparTodosOsRegistrosProcessoEditorial/agruparRegistrosProcessoEditorialPorAno) já usado em
// Calendário/Banco de Provas/Processo Editorial/Arte-finalização e Envio/Previsto vs. Realizado —
// nunca conta disciplina isolada quando ela pertence a um bloco/bloquinho.

// Definição das 5 etapas do processo: nome exibido, campo(s) de início (qualquer um preenchido
// indica que a etapa começou) e campo de conclusão (só ele conclui a etapa) — usados por
// calcularStatusEtapaResumoProducao para classificar cada bloco/bloquinho consolidado.
// `usaBloco` decide a granularidade de CADA etapa (só nesta seção — não afeta a regra global de
// blocos do resto do painel): true = consolida por bloco/bloquinho (mesma regra já aprovada,
// via agruparTodosOsRegistrosProcessoEditorial/agruparRegistrosProcessoEditorialPorAno);
// false = conta linha a linha da planilha, sem nenhuma consolidação. Só Processo Editorial e
// Arte-finalização e Envio usam bloco; Elaboração/1ª Validação/Assinatura do Coordenador contam
// por registro.
// `tooltip` traz título/subtítulo do tooltip do card (ver
// calcularProgressoEtapaPorTipoAv/renderizarLinhasProgressoEtapaResumoProducao) — mesmo modelo
// visual das demais tooltips "Progresso de ... por avaliação" do painel (barras por tipo de AV),
// não mais um texto explicativo.
const ETAPAS_RESUMO_PRODUCAO = [
  {
    chave: 'elaboracao',
    nome: 'Elaboração',
    usaBloco: false,
    camposInicio: ['data_encomenda'],
    campoFim: 'devolutiva_encomenda',
    tooltip: {
      titulo: 'Progresso de elaboração por avaliação',
      subtitulo: 'Percentual de avaliações concluídas na elaboração por tipo de avaliação.'
    }
  },
  {
    chave: 'primeira_validacao',
    nome: '1ª Validação',
    usaBloco: false,
    camposInicio: ['data_envio_coord'],
    campoFim: 'devolutiva_coord',
    tooltip: {
      titulo: 'Progresso de 1ª validação por avaliação',
      subtitulo: 'Percentual de avaliações concluídas na 1ª validação por tipo de avaliação.'
    }
  },
  {
    chave: 'processo_editorial',
    nome: 'Processo Editorial',
    usaBloco: true,
    camposInicio: [
      'inicio_diagramacao',
      'diagramacao',
      'inicio_cotejo',
      'inicio_aplicacao_cotejo',
      'inicio_leitura_final',
      'inicio_aplicacao_leitura',
      'inicio_ctj'
    ],
    campoFim: 'fim_ctj',
    tooltip: {
      titulo: 'Progresso do processo editorial por avaliação',
      subtitulo: 'Percentual de avaliações concluídas no processo editorial por tipo de avaliação.'
    }
  },
  {
    chave: 'assinatura_coordenador',
    nome: 'Assinatura do Coordenador',
    usaBloco: false,
    camposInicio: ['envio_assinatura_coord'],
    campoFim: 'devolutiva_assinatura_coord',
    tooltip: {
      titulo: 'Progresso de assinatura por avaliação',
      subtitulo: 'Percentual de avaliações assinadas pelo coordenador por tipo de avaliação.'
    }
  },
  {
    chave: 'arte_finalizacao_envio',
    nome: 'Arte-finalização e Envio',
    usaBloco: true,
    camposInicio: [
      'arte_final',
      'inicio_arte_final',
      'fim_arte_final',
      'inicio_cotejo_arte_final',
      'checklist',
      'data_checklist'
    ],
    campoFim: 'data_envio_grafica',
    tooltip: {
      titulo: 'Progresso de arte-finalização e envio por avaliação',
      subtitulo: 'Percentual de avaliações enviadas para gráfica por tipo de avaliação.'
    }
  }
];

// Retorna os "itens" contados por UMA etapa: 1 item por bloco/bloquinho (etapa.usaBloco = true,
// mesma consolidação de `grupos`) ou 1 item por registro/linha da planilha (etapa.usaBloco =
// false, a partir de `dadosFiltrados`, sem nenhuma consolidação). Cada item expõe {codigo,
// ano, modulo, tipoAv, registros} — `registros` sempre é um array (1 elemento no caso linha a
// linha), para calcularStatusEtapaResumoProducao funcionar igual nos dois casos.
function obterItensEtapaResumoProducao(etapa, grupos, dadosFiltrados) {
  if (etapa.usaBloco) {
    return grupos.map((grupo) => ({
      codigo: grupo.id,
      ano: grupo.registros[0].ano,
      modulo: grupo.registros[0].modulo,
      tipoAv: grupo.registros[0].tipo_av,
      registros: grupo.registros
    }));
  }

  return dadosFiltrados.map((record) => ({
    codigo: obterIdProcessoEditorial(record),
    ano: record.ano,
    modulo: record.modulo,
    tipoAv: record.tipo_av,
    registros: [record]
  }));
}

// Status de UM bloco/bloquinho consolidado para UMA etapa: 'completed' só quando TODOS os
// registros do bloco têm o campo de conclusão preenchido; 'in-progress' quando pelo menos um
// registro tem algum campo de início preenchido mas nem todos concluíram; 'pending' quando
// nenhum registro tem qualquer campo de início preenchido.
function calcularStatusEtapaResumoProducao(registrosDoBloco, camposInicio, campoFim) {
  if (registrosDoBloco.every((record) => temDataOuValor(record[campoFim]))) return 'completed';
  const iniciada = registrosDoBloco.some((record) => camposInicio.some((campo) => temDataOuValor(record[campo])));
  return iniciada ? 'in-progress' : 'pending';
}

const ROTULOS_STATUS_ETAPA_RESUMO_PRODUCAO = {
  completed: 'Concluída',
  'in-progress': 'Em andamento',
  pending: 'Pendente'
};

function badgeClassForStatusEtapaResumoProducao(status) {
  const map = {
    completed: 'badge-pe-status-concluido',
    'in-progress': 'badge-pe-status-andamento',
    pending: 'badge-pe-status-pendente'
  };
  return map[status] || '';
}

// Calcula, para cada uma das 5 etapas, total/concluídas/em andamento/pendentes/progresso — cada
// etapa usa sua própria granularidade (ver etapa.usaBloco/obterItensEtapaResumoProducao):
// Processo Editorial e Arte-finalização e Envio contam por bloco/bloquinho consolidado; as
// demais contam linha a linha da planilha. Os cards superiores (Total de Avaliações/M3/M4)
// continuam usando `grupos` (consolidado por bloco) à parte, em calcularCardsResumoProducao.
function calcularResumoEtapasProducao(grupos, dadosFiltrados) {
  return ETAPAS_RESUMO_PRODUCAO.map((etapa) => {
    const itens = obterItensEtapaResumoProducao(etapa, grupos, dadosFiltrados);

    let concluidas = 0;
    let andamento = 0;
    let pendentes = 0;

    itens.forEach((item) => {
      const status = calcularStatusEtapaResumoProducao(item.registros, etapa.camposInicio, etapa.campoFim);
      if (status === 'completed') concluidas += 1;
      else if (status === 'in-progress') andamento += 1;
      else pendentes += 1;
    });

    const total = itens.length;
    const progresso = total > 0 ? (concluidas / total) * 100 : 0;

    return { ...etapa, total, concluidas, andamento, pendentes, progresso };
  });
}

// Cards executivos superiores: total de avaliações consolidadas + total por Módulo M3/M4 — a
// partir dos mesmos grupos consolidados por bloco (1 grupo = 1 avaliação, nunca 1 por disciplina)
function calcularCardsResumoProducao(grupos) {
  const total = grupos.length;
  const m3 = grupos.filter((grupo) => safe(grupo.registros[0].modulo) === 'M3').length;
  const m4 = grupos.filter((grupo) => safe(grupo.registros[0].modulo) === 'M4').length;
  return { total, m3, m4 };
}

// Popula os selects de Ano de aplicação/Módulo/Ano-Série/Tipo de AV — mesmo padrão de
// popularFiltrosPrevistoRealizado (Tipo de AV e Ano-Série com opções
// fixas na ordem pedagógica; Módulo e Ano de aplicação derivados dos dados)
function popularFiltrosResumoProducao(records) {
  populateSelectOptions(filterResumoModulo, records, 'modulo');
  populateAnoAplicacaoOptions(filterResumoAnoAplicacao, records, 'Todos');

  if (filterResumoAnoSerie.options.length <= 1) {
    ORDEM_ANO_ESCOLAR_COORD.forEach((ano) => {
      const option = document.createElement('option');
      option.value = ano;
      option.textContent = ano;
      filterResumoAnoSerie.appendChild(option);
    });
  }

  if (filterResumoTipoAv.options.length <= 1) {
    ORDEM_TIPO_AV_PERFORMANCE.forEach((tipoAv) => {
      const option = document.createElement('option');
      option.value = tipoAv;
      option.textContent = tipoAv;
      filterResumoTipoAv.appendChild(option);
    });
  }
}

// Aplica os filtros próprios da seção (Ano de aplicação/Módulo/Tipo de AV/Ano-Série/Segmento/
// busca) — sempre ANTES da consolidação por bloco, para não gerar contagens incorretas
// ignorarModulo = true é usado só pelos cards "Total de Avaliações M3/M4", que não devem ser
// afetados pelo filtro de Módulo
function aplicarFiltrosResumoProducao(dados, ignorarModulo = false) {
  const { anoAplicacao, tipoAv, anoSerie, segmento, busca } = filtrosResumoProducao;
  const modulo = ignorarModulo ? '' : filtrosResumoProducao.modulo;
  const buscaLower = busca.trim().toLowerCase();

  return dados.filter((record) => {
    if (anoAplicacao && obterAnoAplicacao(record) !== anoAplicacao) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (tipoAv && normalizarTipoAvPerformance(record.tipo_av) !== tipoAv) return false;

    if (anoSerie) {
      const numero = normalizarAnoSegmento(record.ano);
      if (numero === null || `${numero}º` !== anoSerie) return false;
    }

    if (segmento && identificarSegmentoPorAno(record.ano) !== segmento) return false;

    if (buscaLower) {
      const alvo = [record.id, record.modulo, record.ano, record.tipo_av, record.frente]
        .map((v) => safe(v).toLowerCase())
        .join(' ');
      if (!alvo.includes(buscaLower)) return false;
    }

    return true;
  });
}

// Alterna a etapa selecionada (clique/Enter/Espaço num card de etapa): clicar na etapa já ativa
// remove o destaque; clicar em outra etapa troca. Mesmo padrão de
// alternarFiltroCardArteFinalizacao.
function alternarEtapaResumoProducao(chave) {
  etapaSelecionadaResumoProducao = etapaSelecionadaResumoProducao === chave ? null : chave;
  renderizarResumoProducao();
}

// Última data preenchida entre os campos da etapa (conclusão + início), usada na coluna "Última
// data registrada" da tabela de detalhamento — prioriza a data mais recente já parseável
// (dd/mm/aaaa); cai para o primeiro valor não vazio quando nenhum dos campos é uma data válida
function obterUltimaDataEtapaResumoProducao(registrosDoBloco, camposInicio, campoFim) {
  const campos = [campoFim, ...camposInicio];
  let melhorTexto = null;
  let melhorData = null;

  registrosDoBloco.forEach((record) => {
    campos.forEach((campo) => {
      const valor = safe(record[campo]);
      if (!valor) return;
      const data = parseBrDate(valor);
      if (data) {
        if (!melhorData || data.getTime() > melhorData.getTime()) {
          melhorData = data;
          melhorTexto = valor;
        }
      } else if (!melhorTexto) {
        melhorTexto = valor;
      }
    });
  });

  return melhorTexto || '-';
}

// Renderiza os 3 cards executivos superiores
function renderizarCardsResumoProducao(totais) {
  resumoProducaoCardTotal.textContent = totais.total;
  resumoProducaoCardM3.textContent = totais.m3;
  resumoProducaoCardM4.textContent = totais.m4;
}

// Calcula, por tipo de AV normalizado, o progresso de UMA etapa (mesmo padrão de
// calcularProgressoValidacaoPorTipoAv/calcularProgressoEnvioGraficaPorTipoAv já usados nas
// demais tooltips "Progresso de ... por avaliação" do painel): usa os mesmos itens do card
// (obterItensEtapaResumoProducao — bloco ou linha a linha, conforme etapa.usaBloco) e a mesma
// regra de conclusão do card (todos os registros do item com etapa.campoFim preenchido). Mantém
// sempre as 5 avaliações fixas (mesmo com total 0), para preservar o padrão visual.
function calcularProgressoEtapaPorTipoAv(etapa, grupos, dadosFiltrados) {
  const itens = obterItensEtapaResumoProducao(etapa, grupos, dadosFiltrados);
  const totais = new Map(ORDEM_TIPO_AV_PERFORMANCE.map((tipo) => [tipo, { total: 0, concluidas: 0 }]));

  itens.forEach((item) => {
    const tipo = normalizarTipoAvPerformance(item.tipoAv);
    if (!totais.has(tipo)) return;
    const grupoTotais = totais.get(tipo);
    grupoTotais.total += 1;
    if (item.registros.every((record) => temDataOuValor(record[etapa.campoFim]))) grupoTotais.concluidas += 1;
  });

  return ORDEM_TIPO_AV_PERFORMANCE.map((tipo) => {
    const { total, concluidas } = totais.get(tipo);
    return {
      tipoAv: tipo,
      total,
      concluidas,
      percentual: total > 0 ? (concluidas / total) * 100 : 0
    };
  });
}

// Preenche o container da tooltip de um card de etapa com 1 linha por tipo de AV (label + barra
// de progresso + "concluídas de total · percentual") — mesmo padrão visual/funcional das demais
// tooltips "Progresso de ... por avaliação" do sistema (ver
// renderizarLinhasTooltipProgressoValidacao/renderizarTooltipEnviadasGraficaArteFinalizacaoEnvio),
// só que puramente informativa (sem clique para filtrar), pois esta seção não tem um filtro
// global "Filtrar por avaliação".
function renderizarLinhasProgressoEtapaResumoProducao(container, linhas) {
  container.innerHTML = '';

  linhas.forEach((linha) => {
    const row = document.createElement('div');
    row.className = 'coord-tooltip-row';
    row.title =
      `${linha.tipoAv}: ${linha.concluidas} de ${linha.total} concluídas ` +
      `(${formatarPercentualComVirgula(linha.percentual)}%)`;

    const label = document.createElement('span');
    label.className = 'coord-tooltip-label';
    label.textContent = linha.tipoAv;

    const track = document.createElement('div');
    track.className = 'coord-tooltip-bar-track';
    const fill = document.createElement('div');
    fill.className = 'coord-tooltip-bar-fill';
    fill.style.width = `${linha.percentual}%`;
    track.appendChild(fill);

    const valor = document.createElement('span');
    valor.className = 'coord-tooltip-value';
    valor.textContent = `${linha.concluidas} de ${linha.total} · ${formatarPercentualComVirgula(linha.percentual)}%`;

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(valor);

    container.appendChild(row);
  });
}

// Fecha qualquer tooltip de etapa aberto por clique/toque quando o usuário clica fora do card —
// mesmo padrão (fechar ao clicar fora) já usado pelas demais tooltips analíticas do sistema.
// Registrado 1 única vez (fora da função de render, que recria os cards a cada chamada).
document.addEventListener('click', (event) => {
  if (event.target.closest('.stage-card')) return;
  document.querySelectorAll('.stage-tooltip.is-visible').forEach((el) => el.classList.remove('is-visible'));
});

// Renderiza o grid de cards por etapa (clicáveis: mesmo padrão pe-card[data-quick-filter]/
// is-quick-active já usado em Processo Editorial/Arte-finalização e Envio — só o conteúdo
// interno do card é próprio desta seção). Cada card também recebe o ícone "ⓘ" + tooltip
// "Progresso de ... por avaliação" (barras por tipo de AV, mesmo modelo das demais tooltips do
// painel) no canto superior direito — `grupos`/`dadosFiltrados` alimentam essa tooltip
// (calcularProgressoEtapaPorTipoAv), sem afetar os números do próprio card.
function renderizarEtapasResumoProducao(etapas, grupos, dadosFiltrados) {
  resumoProducaoEtapasGrid.innerHTML = '';

  etapas.forEach((etapa) => {
    const ativo = etapaSelecionadaResumoProducao === etapa.chave;

    const card = document.createElement('article');
    card.className = 'resumo-etapa-card stage-card pe-card';
    card.dataset.quickFilter = etapa.chave;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.classList.toggle('is-quick-active', ativo);
    card.setAttribute('aria-pressed', String(ativo));

    // Tooltip "Progresso de ... por avaliação": sem ícone "i" visível no card (removido a
    // pedido) — continua aberta por hover/focus no próprio card, via
    // .stage-card:hover/.stage-card:focus-within .stage-tooltip (CSS já existente).
    const tooltip = document.createElement('div');
    tooltip.className = 'stage-tooltip';
    tooltip.id = `stageTooltip-${etapa.chave}`;
    tooltip.setAttribute('role', 'tooltip');

    const tooltipTitulo = document.createElement('h4');
    tooltipTitulo.className = 'coord-tooltip-title';
    tooltipTitulo.textContent = etapa.tooltip.titulo;

    const tooltipSubtitulo = document.createElement('p');
    tooltipSubtitulo.className = 'coord-tooltip-subtitle';
    tooltipSubtitulo.textContent = etapa.tooltip.subtitulo;

    const tooltipChart = document.createElement('div');
    tooltipChart.className = 'coord-tooltip-chart';
    renderizarLinhasProgressoEtapaResumoProducao(
      tooltipChart,
      calcularProgressoEtapaPorTipoAv(etapa, grupos, dadosFiltrados)
    );

    tooltip.appendChild(tooltipTitulo);
    tooltip.appendChild(tooltipSubtitulo);
    tooltip.appendChild(tooltipChart);

    const header = document.createElement('div');
    header.className = 'resumo-etapa-card-header';
    const nome = document.createElement('span');
    nome.className = 'resumo-etapa-card-nome';
    nome.textContent = etapa.nome;
    const progresso = document.createElement('span');
    progresso.className = 'resumo-etapa-card-progresso';
    progresso.textContent = `${formatarPercentualComVirgula(etapa.progresso)}%`;
    header.appendChild(nome);
    header.appendChild(progresso);

    const track = document.createElement('div');
    track.className = 'resumo-etapa-progress-track';
    const fill = document.createElement('div');
    fill.className = 'resumo-etapa-progress-fill';
    fill.style.width = `${etapa.progresso}%`;
    track.appendChild(fill);

    const stats = document.createElement('div');
    stats.className = 'resumo-etapa-card-stats';
    stats.innerHTML = `
      <span>Total: <strong>${etapa.total}</strong></span>
      <span class="resumo-stat--concluida">Concluídas: <strong>${etapa.concluidas}</strong></span>
      <span class="resumo-stat--andamento">Em andamento: <strong>${etapa.andamento}</strong></span>
      <span class="resumo-stat--pendente">Pendentes: <strong>${etapa.pendentes}</strong></span>
    `;

    card.appendChild(header);
    card.appendChild(track);
    card.appendChild(stats);
    card.appendChild(tooltip);

    card.addEventListener('click', () => alternarEtapaResumoProducao(etapa.chave));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        alternarEtapaResumoProducao(etapa.chave);
      }
    });

    resumoProducaoEtapasGrid.appendChild(card);
  });
}

// Renderiza a tabela "Detalhamento por etapa" — repete os mesmos dados dos cards em formato direto
function renderizarTabelaEtapasResumoProducao(etapas) {
  resumoProducaoTabelaEtapasBody.innerHTML = '';
  const fragment = document.createDocumentFragment();

  etapas.forEach((etapa) => {
    const tr = document.createElement('tr');

    const tdNome = document.createElement('td');
    tdNome.textContent = etapa.nome;
    tr.appendChild(tdNome);

    [etapa.total, etapa.concluidas, etapa.andamento, etapa.pendentes].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdProgresso = document.createElement('td');
    tdProgresso.textContent = `${formatarPercentualComVirgula(etapa.progresso)}%`;
    tr.appendChild(tdProgresso);

    fragment.appendChild(tr);
  });

  resumoProducaoTabelaEtapasBody.appendChild(fragment);
}

// Mostra/esconde o chip "Filtro ativo: <etapa> ×" e a tabela "Detalhamento da etapa" conforme a
// etapa atualmente selecionada (clique num card) — lista os mesmos itens contados pelo card/
// tabela "Detalhamento por etapa" daquela etapa (bloco ou linha a linha, ver
// obterItensEtapaResumoProducao/etapa.usaBloco), anotados com o status daquela etapa. O filtro
// "Status" do cabeçalho (.stage-detail-header) aparece nas 5 etapas; quando um status específico
// está selecionado, restringe só esta tabela — não afeta os cards, a tabela "Detalhamento por
// etapa" nem os demais filtros da seção.
function renderizarDetalheEtapaResumoProducao(grupos, dadosFiltrados) {
  if (!etapaSelecionadaResumoProducao) {
    resumoProducaoEtapaChipWrapper.hidden = true;
    resumoProducaoDetalheEtapaCard.hidden = true;
    resumoProducaoDetalheEtapaBody.innerHTML = '';
    return;
  }

  const etapa = ETAPAS_RESUMO_PRODUCAO.find((e) => e.chave === etapaSelecionadaResumoProducao);
  if (!etapa) return;

  resumoProducaoEtapaChipWrapper.hidden = false;
  resumoProducaoEtapaChipTexto.textContent = `Filtro ativo: ${etapa.nome}`;

  resumoProducaoDetalheEtapaCard.hidden = false;
  resumoProducaoDetalheEtapaTitulo.textContent = `Detalhamento da etapa — ${etapa.nome}`;
  filterResumoDetalheEtapaStatus.value = filtroStatusDetalheEtapaResumoProducao;

  resumoProducaoDetalheEtapaBody.innerHTML = '';
  const fragment = document.createDocumentFragment();

  const itens = obterItensEtapaResumoProducao(etapa, grupos, dadosFiltrados).map((item) => ({
    ...item,
    status: calcularStatusEtapaResumoProducao(item.registros, etapa.camposInicio, etapa.campoFim)
  }));

  const itensExibidos = filtroStatusDetalheEtapaResumoProducao
    ? itens.filter((item) => item.status === filtroStatusDetalheEtapaResumoProducao)
    : itens;

  if (itensExibidos.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.className = 'pe-ano-detail-empty';
    td.style.textAlign = 'center';
    td.style.padding = '16px';
    td.textContent = 'Nenhuma avaliação encontrada para o status selecionado.';
    tr.appendChild(td);
    fragment.appendChild(tr);
    resumoProducaoDetalheEtapaBody.appendChild(fragment);
    return;
  }

  itensExibidos.forEach((item) => {
    const tr = document.createElement('tr');

    [
      item.codigo,
      safe(item.ano),
      safe(item.modulo),
      normalizarTipoAvPerformance(item.tipoAv),
      etapa.nome
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdStatus = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `badge ${badgeClassForStatusEtapaResumoProducao(item.status)}`;
    badge.textContent = ROTULOS_STATUS_ETAPA_RESUMO_PRODUCAO[item.status];
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    const tdData = document.createElement('td');
    tdData.textContent = obterUltimaDataEtapaResumoProducao(item.registros, etapa.camposInicio, etapa.campoFim);
    tr.appendChild(tdData);

    fragment.appendChild(tr);
  });

  resumoProducaoDetalheEtapaBody.appendChild(fragment);
}

// Orquestrador da seção: base = filteredRecords (mesmo recorte global de todas as outras abas) +
// filtros próprios (Ano de aplicação/Módulo/Tipo de AV/Ano-Série/Segmento/busca) — alimenta os
// cards superiores (sempre consolidados por bloco, via `grupos`), o grid de etapas/tabela
// "Detalhamento por etapa" (cada etapa com sua própria granularidade — ver
// ETAPAS_RESUMO_PRODUCAO/etapa.usaBloco: só Processo Editorial e Arte-finalização e Envio usam
// bloco, as demais contam linha a linha a partir de `dadosFiltrados`) e, quando uma etapa está
// selecionada, a tabela de detalhamento por avaliação daquela etapa.
function renderizarResumoProducao() {
  popularFiltrosResumoProducao(filteredRecords);

  const dadosFiltrados = aplicarFiltrosResumoProducao(filteredRecords);

  // Cards M3/M4: mesmos filtros da seção, exceto Módulo, com a mesma consolidação por bloco
  const cardsSemModulo = calcularCardsResumoProducao(
    agruparTodosOsRegistrosProcessoEditorial(aplicarFiltrosResumoProducao(filteredRecords, true))
  );

  if (dadosFiltrados.length === 0) {
    resumoProducaoEmptyMessage.hidden = false;
    resumoProducaoConteudo.hidden = true;
    renderizarCardsResumoProducao({ total: 0, m3: cardsSemModulo.m3, m4: cardsSemModulo.m4 });
    return;
  }
  resumoProducaoEmptyMessage.hidden = true;
  resumoProducaoConteudo.hidden = false;

  // Consolidação por bloco (mesma regra global já aprovada) — usada só pelos cards superiores e
  // pelas etapas com etapa.usaBloco = true (Processo Editorial/Arte-finalização e Envio)
  const grupos = agruparTodosOsRegistrosProcessoEditorial(dadosFiltrados);

  renderizarCardsResumoProducao({
    total: calcularCardsResumoProducao(grupos).total,
    m3: cardsSemModulo.m3,
    m4: cardsSemModulo.m4,
  });

  const etapas = calcularResumoEtapasProducao(grupos, dadosFiltrados);
  renderizarEtapasResumoProducao(etapas, grupos, dadosFiltrados);
  renderizarTabelaEtapasResumoProducao(etapas);
  renderizarDetalheEtapaResumoProducao(grupos, dadosFiltrados);
}

filterResumoAnoAplicacao.addEventListener('change', () => {
  filtrosResumoProducao.anoAplicacao = filterResumoAnoAplicacao.value;
  renderizarResumoProducao();
});
filterResumoModulo.addEventListener('change', () => {
  filtrosResumoProducao.modulo = filterResumoModulo.value;
  renderizarResumoProducao();
});
filterResumoTipoAv.addEventListener('change', () => {
  filtrosResumoProducao.tipoAv = filterResumoTipoAv.value;
  renderizarResumoProducao();
});
filterResumoAnoSerie.addEventListener('change', () => {
  filtrosResumoProducao.anoSerie = filterResumoAnoSerie.value;
  renderizarResumoProducao();
});
filterResumoSegmento.addEventListener('change', () => {
  filtrosResumoProducao.segmento = filterResumoSegmento.value;
  renderizarResumoProducao();
});
filterResumoBusca.addEventListener('input', () => {
  filtrosResumoProducao.busca = filterResumoBusca.value;
  renderizarResumoProducao();
});
btnFecharEtapaChipResumoProducao.addEventListener('click', () => {
  etapaSelecionadaResumoProducao = null;
  renderizarResumoProducao();
});
// Filtro "Status" da tabela "Detalhamento da etapa" — só afeta essa tabela (ver
// renderizarDetalheEtapaResumoProducao), não os cards nem os demais filtros da seção
filterResumoDetalheEtapaStatus.addEventListener('change', () => {
  filtroStatusDetalheEtapaResumoProducao = filterResumoDetalheEtapaStatus.value;
  renderizarResumoProducao();
});

// Navegação interna da aba Assinatura Coordenador: Acompanhamento <-> Indicadores (mesmo
// padrão de mostrarIndicadoresCoordenador/mostrarIndicadoresProcessoEditorial)
function mostrarIndicadoresAssinaturaCoordenador() {
  visaoAssinaturaCoordenador = 'indicadores';
  fecharPopoverFiltrosAssinaturaCoordenador();
  viewAssinaturaCoordenadorAcompanhamento.hidden = true;
  viewAssinaturaCoordenadorIndicadores.hidden = false;
  assCoordFilterPopoverWrapper.hidden = true;
  btnIndicadoresAssCoord.hidden = true;
  appHeaderTitles.hidden = true;
  btnVoltarAcompanhamentoAssCoord.hidden = false;
  btnIndicadoresAssCoord.classList.add('is-active');
  btnIndicadoresAssCoord.setAttribute('aria-pressed', 'true');

  renderizarVisaoAssinaturaCoordenador();
}

function mostrarAcompanhamentoAssinaturaCoordenador() {
  // O item "2ª Validação" saiu do menu lateral (2026-07-30) — a única forma de chegar na
  // sub-visão de Indicadores da Assinatura Coordenador agora é pelo botão "2ª Validação" dentro
  // de Indicadores — Coordenador (data-tab "indicador-segunda-validacao"). Por isso, "voltar"
  // sempre reencaminha pra lá (não mais para a seção de acompanhamento) via trocarAba, para
  // manter abaAtual e o destaque do menu lateral coerentes com a tela exibida.
  if (abaAtual === 'indicador-segunda-validacao') {
    trocarAba('indicador-coordenador');
    return;
  }

  visaoAssinaturaCoordenador = 'acompanhamento';
  viewAssinaturaCoordenadorAcompanhamento.hidden = false;
  viewAssinaturaCoordenadorIndicadores.hidden = true;
  assCoordFilterPopoverWrapper.hidden = false;
  btnIndicadoresAssCoord.hidden = false;
  appHeaderTitles.hidden = false;
  btnVoltarAcompanhamentoAssCoord.hidden = true;
  btnIndicadoresAssCoord.classList.remove('is-active');
  btnIndicadoresAssCoord.setAttribute('aria-pressed', 'false');

  renderizarVisaoAssinaturaCoordenador();
}

// --- Carregamento de dados ---

// Aviso (só no console, não bloqueia nada) quando o painel é aberto direto do disco
// (file:///...) em vez de servido por um servidor local — nesse cenário o navegador pode tratar
// fetch/cache/redirecionamento de forma inconsistente, o que ajuda a explicar 404s intermitentes
// que não acontecem ao abrir a mesma URL da API direto no navegador.
console.log('Origem atual:', window.location.href);
console.log('Protocolo:', window.location.protocol);
if (window.location.protocol === 'file:') {
  console.warn(
    'Projeto aberto via file://. Recomenda-se usar servidor local, como Live Server ou python -m http.server.'
  );
}

async function loadData() {
  dom.loading.hidden = false;
  dom.btnAtualizar.disabled = true;

  // Parâmetro anti-cache: evita que o navegador reaproveite uma resposta antiga (incluindo um
  // 404 antigo) guardada em cache para a mesma URL da API
  const url = `${API_URL}?t=${Date.now()}`;

  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    console.log('URL final usada:', url);
    console.log('Status da resposta:', response.status);
    console.log('Response URL final:', response.url);

    if (!response.ok) {
      throw new Error(`Falha na requisição (status ${response.status})`);
    }

    const json = await response.json();
    if (!json.success || !Array.isArray(json.data)) {
      throw new Error('Resposta da API em formato inesperado.');
    }

    allRecords = json.data;
    processedRecords = processRecords(allRecords);

    populateAllFilterOptions(processedRecords);
    applyFilters();
    dom.error.hidden = true;
    dom.empty.hidden = true;
  } catch (err) {
    console.error('Erro ao carregar dados:', err);

    // Se já havia dados carregados de uma tentativa anterior, mantém tudo como está (cards,
    // calendário e tabelas continuam mostrando o último recorte válido) e só avisa — uma falha
    // pontual de rede não deve apagar dados que já estavam na tela
    if (allRecords.length > 0) {
      dom.error.hidden = false;
      dom.error.textContent = `Não foi possível atualizar os dados agora (dados já carregados foram mantidos). (${err.message})`;
    } else {
      dom.error.hidden = false;
      dom.error.textContent = `Não foi possível carregar os dados. Verifique sua conexão e tente novamente. (${err.message})`;
      dom.tableBody.innerHTML = '';
      dom.resultsCount.textContent = '';
    }
  } finally {
    dom.loading.hidden = true;
    dom.btnAtualizar.disabled = false;
  }
}

// Carrega os dados da BD_MACRO2 (API_MACRO2_URL), independente do carregamento principal
// (loadData/API_URL/BD_SGGE) — falha aqui não afeta nenhuma outra seção, só a "GPA" fica sem
// dados/mostra o estado vazio. Mesmo padrão anti-cache de loadData (timestamp na URL +
// cache: 'no-store').
async function carregarDadosMacro2() {
  const url = `${API_MACRO2_URL}?t=${Date.now()}`;

  try {
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Falha na requisição (status ${response.status})`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error('Resposta da API BD_MACRO2 em formato inesperado.');
    }

    dadosGPA = Array.isArray(json.gpa) ? json.gpa : [];
    // Armazenado para uso futuro — nenhuma tela usa dadosQualidade ainda
    dadosQualidade = Array.isArray(json.qualidade) ? json.qualidade : [];

    if (abaAtual === 'gpa') {
      renderizarGPA();
    }
  } catch (err) {
    console.error('Erro ao carregar dados da BD_MACRO2:', err);
  }
}

// --- Seção "GPA" ("Guia Para Avaliação", BD_MACRO2/dadosGPA) ---
// NÃO é uma seção de indicadores: o campo "gpa" é o link/referência do PDF do Guia Para
// Avaliação, não uma nota. A seção é uma tabela de consulta/acesso a arquivos — mesmo padrão
// visual/estrutural da seção "Banco de Provas" (barra de busca + botão de filtros avançados +
// tabela com botão de acesso) — e é independente da base principal (allRecords/filteredRecords):
// não usa nem altera filtros globais nem nenhuma outra seção.

const gpaSelectFilters = {
  modulo: document.getElementById('filterGPAModulo')
};
const gpaCheckboxGroups = {
  ano: document.getElementById('filterGPAAnoGroup'),
  tipoAv: document.getElementById('filterGPATipoAvGroup')
};
const filtrosGPA = {
  anos: [],
  tiposAv: []
};
const gpaFilterBusca = document.getElementById('filterGPABusca');
const gpaFilterPopoverWrapper = document.getElementById('gpaFilterPopoverWrapper');
const btnAbrirFiltrosGPA = document.getElementById('btnAbrirFiltrosGPA');
const gpaFiltersPopover = document.getElementById('gpaFiltersPopover');
const btnFecharFiltrosGPA = document.getElementById('btnFecharFiltrosGPA');
const gpaFilterBadge = document.getElementById('gpaFilterBadge');
const btnLimparFiltrosGPA = document.getElementById('btnLimparFiltrosGPA');
const gpaEmptyMessage = document.getElementById('gpaEmptyMessage');
const gpaTableWrapper = document.getElementById('gpaTableWrapper');
const gpaTableBody = document.getElementById('gpaTableBody');

// Popula os selects de Módulo e Ano a partir dos campos da BD_MACRO2 (mod/ano — nomes
// diferentes dos da base principal, que usa modulo/ano). "Tipo de AV" tem população própria
// (populateGPATipoAvOptions), para manter a ordem fixa AV1/AV2/2º CHAM/REC-SEM/REC-FIM.
function populateGPAFilterOptions(dados) {
  populateSelectOptions(gpaSelectFilters.modulo, dados, 'mod', 'Módulo');
  populateGPAAnoCheckboxOptions(gpaCheckboxGroups.ano, dados);
  populateGPATipoAvOptions(gpaCheckboxGroups.tipoAv, dados);
}

// Popula o grupo de checkboxes "Ano" em ordem alfabética — mesma fonte de dados que antes ia
// para populateSelectOptions(gpaSelectFilters.ano, ...)
function populateGPAAnoCheckboxOptions(containerEl, dados) {
  const valoresUnicos = Array.from(new Set(dados.map((r) => safe(r.ano)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
  const opcoes = valoresUnicos.map((valor) => ({ value: valor, label: valor }));
  renderizarGrupoCheckbox(containerEl, opcoes, filtrosGPA.anos);
}

// Popula o select "Tipo de AV" na ordem fixa AV1 → AV2 → 2º CHAM → REC-SEM → REC-FIM — mesmo
// padrão/rótulos de populateBPTipoAvOptions (Banco de Provas), adaptado para o campo "av" da
// BD_MACRO2 em vez de "tipo_av"
function populateGPATipoAvOptions(containerEl, dados) {
  const valoresUnicos = Array.from(new Set(dados.map((r) => safe(r.av)).filter(Boolean)));

  const rotulos = {
    AV1: 'AV1',
    AV2: 'AV2',
    '2º CHAMADA': '2º CHAM',
    'REC-SEM': 'REC-SEM',
    'REC-FIM': 'REC-FIM'
  };

  const ordenados = valoresUnicos.sort((a, b) => {
    const posA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(a));
    const posB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(b));
    const posicaoA = posA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posA;
    const posicaoB = posB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posB;
    return posicaoA - posicaoB;
  });

  const opcoes = ordenados.map((valor) => ({
    value: valor,
    label: rotulos[normalizarTipoAvPerformance(valor)] || valor
  }));
  renderizarGrupoCheckbox(containerEl, opcoes, filtrosGPA.tiposAv);
}

// Aplica os filtros da seção GPA (Módulo, Ano, Tipo de AV, busca geral) sobre dadosGPA — a
// busca procura em mod/ano/av/gpa (o link/referência do arquivo também é pesquisável, ex.: para
// achar por parte do nome do arquivo)
// Código exibido na tabela GPA: MÓDULO-AVALIAÇÃO-ANO (ex.: M3-AV1-6º, M4-REC-SEM-1º).
// Aceita os nomes da BD_GPA (mod/av) e os normalizados (modulo/tipo_av).
function montarCodigoGPA(registro) {
  return [
    safe(registro.mod || registro.modulo),
    safe(registro.av || registro.tipo_av),
    safe(registro.ano)
  ]
    .filter(Boolean)
    .join('-');
}

// Ordenação da tabela: Módulo → Avaliação (AV1, AV2, 2º CHAMADA, REC-SEM, REC-FIM) → Ano
// (ordem pedagógica 6º–9º e depois 1º–3º)
function ordenarRegistrosGPA(dados) {
  const posicaoAv = (registro) => {
    const pos = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(registro.av || registro.tipo_av));
    return pos === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : pos;
  };
  const posicaoAno = (registro) => {
    const numero = normalizarAnoSegmento(registro.ano);
    if (numero === null) return 99;
    return numero >= 6 ? numero - 6 : numero + 4;
  };

  return [...dados].sort(
    (a, b) =>
      safe(a.mod || a.modulo).localeCompare(safe(b.mod || b.modulo), 'pt-BR', { numeric: true }) ||
      posicaoAv(a) - posicaoAv(b) ||
      posicaoAno(a) - posicaoAno(b)
  );
}

function aplicarFiltrosGPA(dados) {
  const modulo = gpaSelectFilters.modulo.value;
  const busca = safe(gpaFilterBusca.value).toLowerCase();

  return dados.filter((registro) => {
    if (modulo && safe(registro.mod) !== modulo) return false;
    if (!passaFiltroMultiplo(safe(registro.ano), filtrosGPA.anos)) return false;
    if (!passaFiltroMultiplo(safe(registro.av), filtrosGPA.tiposAv)) return false;

    if (busca) {
      const camposBusca = [montarCodigoGPA(registro), registro.mod, registro.ano, registro.av, registro.gpa];
      const matchesBusca = camposBusca.some((valor) => safe(valor).toLowerCase().includes(busca));
      if (!matchesBusca) return false;
    }

    return true;
  });
}

// Conta quantos filtros estão ativos (selects preenchidos + busca) e atualiza o badge/destaque
// do botão de filtros avançados
function atualizarIndicadorFiltrosGPA() {
  const totalAtivos =
    Object.values(gpaSelectFilters).filter((select) => select.value !== '').length +
    filtrosGPA.anos.length +
    filtrosGPA.tiposAv.length +
    (safe(gpaFilterBusca.value) !== '' ? 1 : 0);

  gpaFilterBadge.hidden = totalAtivos === 0;
  gpaFilterBadge.textContent = totalAtivos;
  btnAbrirFiltrosGPA.classList.toggle('has-active-filters', totalAtivos > 0);
}

function abrirPopoverFiltrosGPA() {
  gpaFiltersPopover.hidden = false;
  btnAbrirFiltrosGPA.classList.add('is-active');
  btnAbrirFiltrosGPA.setAttribute('aria-expanded', 'true');
}

function fecharPopoverFiltrosGPA() {
  gpaFiltersPopover.hidden = true;
  btnAbrirFiltrosGPA.classList.remove('is-active');
  btnAbrirFiltrosGPA.setAttribute('aria-expanded', 'false');
}

function alternarPopoverFiltrosGPA() {
  if (gpaFiltersPopover.hidden) {
    abrirPopoverFiltrosGPA();
  } else {
    fecharPopoverFiltrosGPA();
  }
}

function limparFiltrosGPA() {
  Object.values(gpaSelectFilters).forEach((select) => (select.value = ''));
  filtrosGPA.anos = [];
  filtrosGPA.tiposAv = [];
  Object.values(gpaCheckboxGroups).forEach((grupo) => desmarcarGrupoCheckbox(grupo));
  gpaFilterBusca.value = '';
  renderizarGPA();
}

// Lê o estado atual dos grupos de checkboxes do painel avançado da GPA e re-renderiza — sem
// botão "Aplicar filtros" próprio, filtra ao vivo como os <select> que existiam antes
function aplicarCheckboxesGPA() {
  filtrosGPA.anos = lerGrupoCheckbox(gpaCheckboxGroups.ano);
  filtrosGPA.tiposAv = lerGrupoCheckbox(gpaCheckboxGroups.tipoAv);
  renderizarGPA();
}

// Cria o botão de acesso "ABRIR GPA" (mesmo padrão visual de criarBotaoAcessoBancoProvas: link
// que abre em nova aba, target="_blank" + rel="noopener noreferrer"). Quando o registro não tem
// link (item.gpa vazio), não cria link nenhum — mostra apenas o texto "Sem arquivo", sem link
// falso e sem tentativa de download.
function criarCelulaAcessoGPA(registro) {
  const td = document.createElement('td');
  td.className = 'bp-acesso-cell col-acesso';

  const temArquivo = linkValido(registro.gpa);

  if (temArquivo) {
    // Mesmo botão/classe (.bp-acesso-btn) dos botões S/GABARITO e C/GABARITO do Banco de
    // Provas — sem ícone, só o texto
    td.appendChild(criarBotaoAcessoBancoProvas(registro.gpa, 'ABRIR GPA'));
  } else {
    const semArquivo = document.createElement('span');
    semArquivo.className = 'gpa-no-file';

    const icone = document.createElement('span');
    icone.className = 'gpa-no-file-icon';
    icone.setAttribute('aria-hidden', 'true');
    icone.innerHTML =
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '</svg>';
    semArquivo.appendChild(icone);

    const texto = document.createElement('span');
    texto.textContent = 'Sem arquivo';
    semArquivo.appendChild(texto);

    td.appendChild(semArquivo);
  }

  return td;
}

function renderizarTabelaGPA(dados) {
  gpaTableBody.innerHTML = '';

  if (dados.length === 0) {
    gpaEmptyMessage.hidden = false;
    gpaTableWrapper.hidden = true;
    return;
  }
  gpaEmptyMessage.hidden = true;
  gpaTableWrapper.hidden = false;

  const fragment = document.createDocumentFragment();
  ordenarRegistrosGPA(dados).forEach((registro) => {
    const tr = document.createElement('tr');

    const tdCodigo = document.createElement('td');
    tdCodigo.className = 'gpa-codigo-cell';
    tdCodigo.textContent = montarCodigoGPA(registro) || '-';
    tdCodigo.dataset.label = 'Código';
    tr.appendChild(tdCodigo);

    const tdAcesso = criarCelulaAcessoGPA(registro);
    tdAcesso.dataset.label = 'Acesso';
    tr.appendChild(tdAcesso);

    fragment.appendChild(tr);
  });
  gpaTableBody.appendChild(fragment);
}

// Renderiza toda a seção GPA a partir de dadosGPA (carregado por carregarDadosMacro2). Se
// dadosGPA estiver vazio (nada carregado ainda/API sem registros), mostra o estado vazio geral;
// se houver dados mas o recorte filtrado ficar vazio, a própria renderizarTabelaGPA mostra a
// mensagem "Nenhum Guia Para Avaliação encontrado."
function renderizarGPA() {
  populateGPAFilterOptions(dadosGPA);
  atualizarIndicadorFiltrosGPA();

  const dados = aplicarFiltrosGPA(dadosGPA);
  renderizarTabelaGPA(dados);
}

btnLimparFiltrosGPA.addEventListener('click', limparFiltrosGPA);
gpaFilterBusca.addEventListener('input', renderizarGPA);
Object.values(gpaSelectFilters).forEach((select) => select.addEventListener('change', renderizarGPA));
Object.values(gpaCheckboxGroups).forEach((grupo) =>
  grupo.addEventListener('change', (event) => {
    if (event.target && event.target.type === 'checkbox') aplicarCheckboxesGPA();
  })
);

btnAbrirFiltrosGPA.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosGPA();
});

btnFecharFiltrosGPA.addEventListener('click', fecharPopoverFiltrosGPA);

document.addEventListener('click', (event) => {
  if (!gpaFiltersPopover.hidden && !gpaFilterPopoverWrapper.contains(event.target)) {
    fecharPopoverFiltrosGPA();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !gpaFiltersPopover.hidden) {
    fecharPopoverFiltrosGPA();
  }
});

// --- Relatório do elaborador (Indicadores — Elaborador) ---
// Modal com filtros próprios (Elaborador/Disciplina/Módulo/Avaliação, independentes dos filtros
// da tela) que gera uma prévia imprimível a partir de indicadoresDadosBase (o mesmo recorte já
// carregado na tela — popover/busca/filtro rápido do card já aplicados, mas SEM os filtros
// interativos dos gráficos). Reaproveita as mesmas regras/funções de cálculo já usadas nos
// cards executivos (calcularResumoAtrasos/calcularAtrasoEncomendaEmDias/foiEntregueNoPrazo) —
// nenhum cálculo novo/divergente.

const btnRelatorioElaborador = document.getElementById('btnRelatorioElaborador');
const relatorioElaboradorModalBackdrop = document.getElementById('relatorioElaboradorModalBackdrop');
const btnFecharRelatorioElaborador = document.getElementById('btnFecharRelatorioElaborador');
const btnCancelarRelatorioElaborador = document.getElementById('btnCancelarRelatorioElaborador');
const btnGerarRelatorioElaborador = document.getElementById('btnGerarRelatorioElaborador');
const btnImprimirRelatorioElaborador = document.getElementById('btnImprimirRelatorioElaborador');
const relatorioElaboradorPreview = document.getElementById('elaborador-report-print-area');
const relatorioElaboradorVazio = document.getElementById('relatorioElaboradorVazio');
const relatorioElaboradorFiltros = {
  elaborador: document.getElementById('filterRelatorioElaborador'),
  coordenador: document.getElementById('filterRelatorioCoordenador'),
  segmento: document.getElementById('filterRelatorioSegmento'),
  disciplina: document.getElementById('filterRelatorioDisciplina'),
  modulo: document.getElementById('filterRelatorioModulo'),
  avaliacao: document.getElementById('filterRelatorioAvaliacao')
};

// Classifica o "ano" no rótulo usado pelo filtro Segmento do relatório do elaborador
// (rótulos "Fundamental II"/"Ensino Médio", diferentes de identificarSegmentoPorAno)
function classificarSegmentoRelatorioElaborador(ano) {
  const numero = normalizarAnoSegmento(ano);
  if (numero === null) return null;
  if (numero >= 6 && numero <= 9) return 'Fundamental II';
  if (numero >= 1 && numero <= 3) return 'Ensino Médio';
  return null;
}

// Popula "Avaliação" na ordem fixa AV1 → AV2 → 2º CHAM → REC-SEM → REC-FIM — mesmo padrão/
// rótulos já usados em populateBPTipoAvOptions/populateGPATipoAvOptions
function populateRelatorioAvaliacaoOptions(selectEl, dados) {
  const currentValue = selectEl.value;
  const valoresUnicos = Array.from(new Set(dados.map((r) => safe(r.tipo_av)).filter(Boolean)));

  const rotulos = {
    AV1: 'AV1',
    AV2: 'AV2',
    '2º CHAMADA': '2º CHAM',
    'REC-SEM': 'REC-SEM',
    'REC-FIM': 'REC-FIM'
  };

  const ordenados = valoresUnicos.sort((a, b) => {
    const posA = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(a));
    const posB = ORDEM_TIPO_AV_PERFORMANCE.indexOf(normalizarTipoAvPerformance(b));
    const posicaoA = posA === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posA;
    const posicaoB = posB === -1 ? ORDEM_TIPO_AV_PERFORMANCE.length : posB;
    return posicaoA - posicaoB;
  });

  selectEl.innerHTML = '<option value="">Todas</option>';
  ordenados.forEach((valor) => {
    const rotulo = rotulos[normalizarTipoAvPerformance(valor)] || valor;
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = rotulo;
    selectEl.appendChild(option);
  });

  if (valoresUnicos.includes(currentValue)) {
    selectEl.value = currentValue;
  }
}

function populateRelatorioElaboradorFiltros(dados) {
  populateSelectOptions(relatorioElaboradorFiltros.elaborador, dados, 'elaborador', 'Todos');
  populateSelectOptions(relatorioElaboradorFiltros.coordenador, dados, 'coordenador', 'Todos');
  populateSelectOptions(relatorioElaboradorFiltros.modulo, dados, 'modulo', 'Todos');
  populateSelectOptions(relatorioElaboradorFiltros.disciplina, dados, 'frente', 'Todas');
  populateRelatorioAvaliacaoOptions(relatorioElaboradorFiltros.avaliacao, dados);
}

// Aplica os filtros próprios do relatório (Elaborador/Coordenador/Segmento/Disciplina/Módulo/
// Avaliação) sobre indicadoresDadosBase — Disciplina compara pelo valor bruto da coluna `frente`
// (sem normalizarNomeDisciplina) e Segmento compara pela classificação derivada do `ano`
function aplicarFiltrosRelatorioElaborador(dados) {
  const elaborador = relatorioElaboradorFiltros.elaborador.value;
  const coordenador = relatorioElaboradorFiltros.coordenador.value;
  const segmento = relatorioElaboradorFiltros.segmento.value;
  const disciplina = relatorioElaboradorFiltros.disciplina.value;
  const modulo = relatorioElaboradorFiltros.modulo.value;
  const avaliacao = relatorioElaboradorFiltros.avaliacao.value;

  return dados.filter((record) => {
    if (elaborador && safe(record.elaborador) !== elaborador) return false;
    if (coordenador && safe(record.coordenador) !== coordenador) return false;
    if (segmento && classificarSegmentoRelatorioElaborador(record.ano) !== segmento) return false;
    if (disciplina && safe(record.frente) !== disciplina) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (avaliacao && safe(record.tipo_av) !== avaliacao) return false;
    return true;
  });
}

function abrirModalRelatorioElaborador() {
  populateRelatorioElaboradorFiltros(indicadoresDadosBase);

  relatorioElaboradorPreview.hidden = true;
  relatorioElaboradorVazio.hidden = true;
  btnImprimirRelatorioElaborador.disabled = true;

  relatorioElaboradorModalBackdrop.hidden = false;
}

function fecharModalRelatorioElaborador() {
  relatorioElaboradorModalBackdrop.hidden = true;
}

// Tabela "Recorrência de atraso por elaborador" da prévia do relatório: mesmo resumo/lógica já
// usada na tela (calcularRecorrenciaPorElaborador) — 1 linha por elaborador, com total de
// encomendas, encomendas com atraso, taxa, média, maior atraso individual e classificação de
// risco (reaproveita renderBadgeCellClassificacao, mesma badge da tabela da tela)
function renderizarTabelaRecorrenciaRelatorio(linhas) {
  const tbody = document.getElementById('relatorioElaboradorRecorrenciaBody');
  tbody.innerHTML = '';

  if (linhas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'indicadores-tabela-vazia';
    td.textContent = 'Nenhum registro encontrado.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const fragment = document.createDocumentFragment();
  linhas.forEach((linha, indice) => {
    const tr = document.createElement('tr');
    tr.appendChild(criarCelulaRanking(indice + 1));

    [
      linha.elaborador,
      linha.total,
      linha.qtdComAtraso,
      `${formatarPercentualComVirgula(linha.taxa)}%`
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });

    const tdMedia = document.createElement('td');
    tdMedia.textContent = `${formatarMediaAtrasoGrafico(linha.mediaAtraso)} dias`;
    tr.appendChild(tdMedia);

    const tdMaiorIndividual = document.createElement('td');
    tdMaiorIndividual.textContent = linha.maiorIndividual;
    tr.appendChild(tdMaiorIndividual);

    renderBadgeCellClassificacao(tr, linha.classificacao);
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
}

// Renderiza o valor da coluna "Dias de atraso" da tabela "Todas as entregas detalhadas": > 0
// em vermelho/negrito, < 0 em verde/negrito, = 0 mostra "0" na cor padrão do texto (sem
// destaque). Só usada nessa tabela — a tabela "Recorrência de atraso por elaborador" continua
// com o texto simples de sempre (formatarMediaAtrasoGrafico etc.), sem esse tratamento.
function renderDiasAtrasoDetalhado(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  const texto = String(valor).replace('dias', '').trim();
  const numero = Number(texto.replace(',', '.'));

  if (Number.isNaN(numero)) {
    return '';
  }

  if (numero > 0) {
    return `<span class="delay-positive">${numero}</span>`;
  }

  if (numero < 0) {
    return `<span class="delay-negative">${numero}</span>`;
  }

  return `<span class="delay-zero">0</span>`;
}

// Tabela detalhada da prévia do relatório: 1 linha por encomenda, ordenada do maior atraso para
// o menor (calcularAtrasoEncomendaEmDias — mesma função dos cards), desempate por elaborador
function renderizarTabelaRelatorioElaborador(dados) {
  const tbody = document.getElementById('relatorioElaboradorTabelaBody');
  tbody.innerHTML = '';

  const linhas = [...dados].sort((a, b) => {
    const diasA = calcularAtrasoEncomendaEmDias(a);
    const diasB = calcularAtrasoEncomendaEmDias(b);
    if (diasB !== diasA) return diasB - diasA;
    return safe(a.elaborador).localeCompare(safe(b.elaborador), 'pt-BR');
  });

  const fragment = document.createDocumentFragment();
  linhas.forEach((record) => {
    const tr = document.createElement('tr');

    [
      safe(record.modulo),
      safe(record.ano),
      safe(record.tipo_av),
      safe(record.frente),
      safe(record.elaborador),
      safe(record.prazo_encomenda),
      safe(record.devolutiva_encomenda)
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor || '-';
      tr.appendChild(td);
    });

    const tdDias = document.createElement('td');
    tdDias.className = 'report-delay-cell';
    tdDias.innerHTML = renderDiasAtrasoDetalhado(calcularAtrasoEncomendaEmDias(record));
    tr.appendChild(tdDias);

    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
}

// Gera a prévia do relatório a partir dos filtros próprios do modal — usa
// calcularResumoAtrasos, a mesma função que já alimenta os cards executivos da tela, então os
// números do relatório sempre batem com os do painel para o mesmo recorte
function gerarRelatorioElaborador() {
  const dadosFiltrados = aplicarFiltrosRelatorioElaborador(indicadoresDadosBase);

  if (dadosFiltrados.length === 0) {
    relatorioElaboradorPreview.hidden = true;
    relatorioElaboradorVazio.hidden = false;
    btnImprimirRelatorioElaborador.disabled = true;
    return;
  }
  relatorioElaboradorVazio.hidden = true;

  const resumo = calcularResumoAtrasos(dadosFiltrados);

  document.getElementById('relatorioMetaElaborador').textContent =
    relatorioElaboradorFiltros.elaborador.value || 'Todos';
  document.getElementById('relatorioMetaCoordenador').textContent =
    relatorioElaboradorFiltros.coordenador.value || 'Todos';
  document.getElementById('relatorioMetaSegmento').textContent =
    relatorioElaboradorFiltros.segmento.value || 'Todos';
  document.getElementById('relatorioMetaDisciplina').textContent =
    relatorioElaboradorFiltros.disciplina.value || 'Todas';
  document.getElementById('relatorioMetaModulo').textContent =
    relatorioElaboradorFiltros.modulo.value || 'Todos';

  const selectAvaliacao = relatorioElaboradorFiltros.avaliacao;
  document.getElementById('relatorioMetaAvaliacao').textContent = selectAvaliacao.value
    ? selectAvaliacao.options[selectAvaliacao.selectedIndex].textContent
    : 'Todas';
  document.getElementById('relatorioMetaData').textContent = formatarDataHoraAtual();

  document.getElementById('relatorioResumoEntreguesPrazo').textContent =
    `${resumo.entreguesNoPrazoQtd} (${formatarPercentualComVirgula(resumo.entreguesNoPrazoPct)}%)`;
  const entreguesForaPrazoPct = resumo.total ? (resumo.entreguesForaPrazoQtd / resumo.total) * 100 : 0;
  document.getElementById('relatorioResumoForaPrazo').textContent =
    `${resumo.entreguesForaPrazoQtd} (${formatarPercentualComVirgula(entreguesForaPrazoPct)}%)`;
  document.getElementById('relatorioResumoMediaAtraso').textContent = resumo.qtdComAtraso
    ? `${formatarDiasComVirgula(resumo.mediaAtraso)} dias`
    : '0 dias';
  document.getElementById('relatorioResumoMaiorAtraso').textContent = `${resumo.maiorAtraso} dias`;

  renderizarTabelaRecorrenciaRelatorio(calcularRecorrenciaPorElaborador(dadosFiltrados));
  // "Todas as entregas detalhadas" lista só entregas realizadas (devolutiva preenchida) — mesmo
  // recorte já usado pelos cards/tabela de recorrência do relatório (resumo.entregasRealizadas)
  renderizarTabelaRelatorioElaborador(resumo.entregasRealizadas);

  relatorioElaboradorPreview.hidden = false;
  btnImprimirRelatorioElaborador.disabled = false;
}

btnRelatorioElaborador.addEventListener('click', abrirModalRelatorioElaborador);
btnFecharRelatorioElaborador.addEventListener('click', fecharModalRelatorioElaborador);
btnCancelarRelatorioElaborador.addEventListener('click', fecharModalRelatorioElaborador);
relatorioElaboradorModalBackdrop.addEventListener('click', (event) => {
  if (event.target === relatorioElaboradorModalBackdrop) fecharModalRelatorioElaborador();
});
btnGerarRelatorioElaborador.addEventListener('click', gerarRelatorioElaborador);
// Antes de chamar window.print(), garante que a prévia já está totalmente renderizada no DOM
// (o pequeno atraso evita imprimir um layout ainda "em construção", que era uma das causas dos
// cortes/sobreposição relatados) — a classe "printing-report" fica disponível caso seja preciso
// algum ajuste visual extra só durante a impressão, sem depender de @media print sozinho
// Estilo injetado na janela de impressão — isolado do resto do sistema (nada de style.css chega
// lá), então precisa trazer tudo que os elementos de #elaborador-report-print-area usam: layout
// do cabeçalho/metadados/cards/seções/tabelas + os badges de classificação de risco (Crítico/
// Atenção/Controlado, ver renderBadgeCellClassificacao) e o círculo de ranking (.rank-badge,
// ver criarCelulaRanking), que também aparecem dentro dessa área.
const RELATORIO_ELABORADOR_PRINT_CSS = `
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0b2f5b;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
  }

  .print-report {
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .report-print-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid #d7dfeb;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }

  .report-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .report-header-left img {
    max-height: 40px;
    width: auto;
    object-fit: contain;
  }

  .report-title {
    flex: 1;
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    color: #123a6d;
    margin: 0;
    padding-top: 4px;
  }

  .report-meta {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #d7dfeb;
  }

  .report-meta-item {
    text-align: center;
  }

  .report-meta-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #667085;
    margin-bottom: 4px;
  }

  .report-meta-value {
    font-size: 12px;
    font-weight: 700;
    color: #0b2f5b;
  }

  .report-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 18px;
  }

  .report-kpis--5 {
    grid-template-columns: repeat(5, 1fr);
  }

  .report-kpi {
    border: 1px solid #d7dfeb;
    border-radius: 10px;
    padding: 12px 14px;
    background: #fff;
    min-height: 84px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .report-kpi-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #667085;
    margin-bottom: 8px;
  }

  .report-kpi-value {
    display: block;
    font-size: 18px;
    font-weight: 800;
    color: #0b2f5b;
    line-height: 1.2;
  }

  .report-section {
    margin-top: 16px;
    /* Fluxo contínuo entre "Recorrência de atraso por elaborador" e "Todas as entregas
       detalhadas" — sem quebra de página forçada entre as duas seções. Cada linha da tabela
       continua protegida individualmente (.report-table tr { page-break-inside: avoid }), então
       isso não corta uma linha no meio, só permite a seção inteira fluir por mais de uma página
       quando necessário. */
    page-break-inside: auto;
    break-inside: auto;
  }

  .report-section-title {
    font-size: 14px;
    font-weight: 800;
    color: #123a6d;
    margin: 0 0 4px;
  }

  .report-section-subtitle {
    font-size: 11px;
    color: #667085;
    margin: 0 0 12px;
  }

  .report-table-wrap {
    width: 100%;
    overflow: visible;
  }

  table.report-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10px;
  }

  .report-delay-cell {
    text-align: center;
  }

  .delay-positive {
    color: #b91c1c !important;
    font-weight: 900 !important;
  }

  .delay-negative {
    color: #15803d !important;
    font-weight: 900 !important;
  }

  .delay-zero {
    color: #0f172a !important;
    font-weight: 500 !important;
  }

  .report-table thead {
    display: table-header-group;
  }

  .report-table th {
    background: #0b315f;
    color: #ffffff;
    padding: 8px 6px;
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    border: 1px solid #0b315f;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .report-table td {
    padding: 7px 6px;
    border: 1px solid #dbe4ef;
    text-align: center;
    vertical-align: middle;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .report-table tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #9b1c1c;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    margin: 0 auto;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .report-closing-note {
    margin-top: 22px;
    padding: 14px 16px;
    border-left: 4px solid #0b315f;
    background: #f8fafc;
    color: #0f172a;
    font-size: 12px;
    line-height: 1.5;
    border-radius: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .badge {
    display: inline-block;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .badge-classificacao-critico {
    background-color: #fee2e2;
    color: #b91c1c;
  }

  .badge-classificacao-atencao {
    background-color: #fef3c7;
    color: #b45309;
  }

  .badge-classificacao-controlado {
    background-color: #dcfce7;
    color: #15803d;
  }

  .text-left {
    text-align: left !important;
  }

  .page-break {
    page-break-before: always;
    break-before: page;
  }

  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
`;

// Impressão em janela separada, só com o HTML do relatório + o CSS acima — evita a abordagem
// antiga (visibility:hidden na página inteira + position:absolute na área do relatório), que
// gerava folhas em branco antes do conteúdo e sobreposição/corte por causa dos containers do
// modal/dashboard por trás. Fluxo esperado: captura o innerHTML de #elaborador-report-print-area,
// abre uma aba/janela em branco, escreve um HTML mínimo com esse conteúdo + o CSS isolado acima,
// espera renderizar e só então chama print() (e fecha a janela em seguida).
// Genérica: usada pelos relatórios do elaborador e do coordenador (mesmo CSS de impressão)
function imprimirAreaRelatorio(areaId, tituloJanela) {
  const reportArea = document.getElementById(areaId);

  if (!reportArea || reportArea.hidden) {
    alert('Gere o relatório antes de imprimir.');
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1200,height=900');

  if (!printWindow) {
    alert('Não foi possível abrir a janela de impressão.');
    return;
  }

  const reportHTML = reportArea.innerHTML;

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${tituloJanela}</title>
      <!-- Resolve caminhos relativos (ex.: a logo em assets/logo/logo-sgge.png) contra a URL
           da página principal — essa janela é um documento novo/vazio (window.open('', ...)),
           então um <img src="assets/..."> sem isso tentaria carregar a partir de about:blank -->
      <base href="${window.location.href}">
      <style>${RELATORIO_ELABORADOR_PRINT_CSS}</style>
    </head>
    <body>
      <div class="print-report">${reportHTML}</div>
    </body>
    </html>
  `);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();

    setTimeout(() => {
      printWindow.close();
    }, 300);
  }, 500);
}

function imprimirRelatorioElaborador() {
  imprimirAreaRelatorio('elaborador-report-print-area', 'Relatório de Desempenho do Elaborador');
}

btnImprimirRelatorioElaborador.addEventListener('click', imprimirRelatorioElaborador);

// Se a prévia já estiver visível e o usuário trocar um filtro, atualiza a prévia na hora; se
// ainda não gerou nada, só espera o clique em "Gerar relatório"
Object.values(relatorioElaboradorFiltros).forEach((select) => {
  select.addEventListener('change', () => {
    if (!relatorioElaboradorPreview.hidden) {
      gerarRelatorioElaborador();
    }
  });
});

// ======================================================================
// Relatório do coordenador (Indicadores — Coordenador): mesma estrutura do relatório do
// elaborador, analisando a 1ª Validação — só registros com prazo_coord e devolutiva_coord
// preenchidos; dias = devolutiva_coord - prazo_coord (negativo = antecipada, 0 = no prazo,
// positivo = fora do prazo). Reaproveita populateRelatorioAvaliacaoOptions,
// classificarSegmentoRelatorioElaborador, criarCelulaRanking, renderDiasAtrasoDetalhado e
// imprimirAreaRelatorio.
// ======================================================================

const btnRelatorioCoordenador = document.getElementById('btnRelatorioCoordenador');
const relatorioCoordenadorModalBackdrop = document.getElementById('relatorioCoordenadorModalBackdrop');
const btnImprimirRelatorioCoordenador = document.getElementById('btnImprimirRelatorioCoordenador');
const relatorioCoordenadorPreview = document.getElementById('coordenador-report-print-area');
const relatorioCoordenadorVazio = document.getElementById('relatorioCoordenadorVazio');
const relatorioCoordenadorFiltros = {
  coordenador: document.getElementById('filterRelCoordCoordenador'),
  segmento: document.getElementById('filterRelCoordSegmento'),
  ano: document.getElementById('filterRelCoordAno'),
  disciplina: document.getElementById('filterRelCoordDisciplina'),
  modulo: document.getElementById('filterRelCoordModulo'),
  avaliacao: document.getElementById('filterRelCoordAvaliacao')
};

function calcularDiasRelatorioCoordenador(record) {
  const prazo = parseBrDate(record.prazo_coord);
  const devolutiva = parseBrDate(record.devolutiva_coord);
  if (!prazo || !devolutiva) return null;
  return Math.round((devolutiva.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));
}

function aplicarFiltrosRelatorioCoordenador(dados) {
  const { coordenador, segmento, ano, disciplina, modulo, avaliacao } = Object.fromEntries(
    Object.entries(relatorioCoordenadorFiltros).map(([chave, select]) => [chave, select.value])
  );

  return dados.filter((record) => {
    if (coordenador && safe(record.coordenador) !== coordenador) return false;
    if (segmento && classificarSegmentoRelatorioElaborador(record.ano) !== segmento) return false;
    if (ano && safe(record.ano) !== ano) return false;
    if (disciplina && safe(record.frente) !== disciplina) return false;
    if (modulo && safe(record.modulo) !== modulo) return false;
    if (avaliacao && safe(record.tipo_av) !== avaliacao) return false;
    return true;
  });
}

// Resumo de uma lista de devolutivas ({ record, dias }): base comum dos cards e da tabela
function resumirDevolutivasRelatorioCoordenador(devolutivas) {
  const total = devolutivas.length;
  const foraPrazo = devolutivas.filter((d) => d.dias > 0).length;
  const somaDias = devolutivas.reduce((soma, d) => soma + d.dias, 0);
  return {
    total,
    noPrazo: total - foraPrazo,
    foraPrazo,
    taxaAtraso: total ? (foraPrazo / total) * 100 : 0,
    mediaDias: total ? somaDias / total : 0,
    maiorAtraso: devolutivas.reduce((maior, d) => Math.max(maior, d.dias), 0)
  };
}

function calcularRecorrenciaRelatorioCoordenador(devolutivas) {
  const porCoordenador = new Map();
  devolutivas.forEach((d) => {
    const nome = safe(d.record.coordenador) || 'Não informado';
    if (!porCoordenador.has(nome)) porCoordenador.set(nome, []);
    porCoordenador.get(nome).push(d);
  });

  return Array.from(porCoordenador, ([coordenador, itens]) => ({
    coordenador,
    ...resumirDevolutivasRelatorioCoordenador(itens)
  })).sort(
    (a, b) =>
      b.foraPrazo - a.foraPrazo ||
      b.taxaAtraso - a.taxaAtraso ||
      a.coordenador.localeCompare(b.coordenador, 'pt-BR')
  );
}

function formatarDiasRelatorioCoordenador(valor) {
  return valor === 0 ? '0 dias' : `${formatarDiasComVirgula(valor)} dias`;
}

function renderizarRecorrenciaRelatorioCoordenador(linhas) {
  const tbody = document.getElementById('relCoordRecorrenciaBody');
  tbody.innerHTML = '';

  const fragment = document.createDocumentFragment();
  linhas.forEach((linha, indice) => {
    const tr = document.createElement('tr');
    tr.appendChild(criarCelulaRanking(indice + 1));
    [
      linha.coordenador,
      linha.total,
      linha.foraPrazo,
      `${formatarPercentualComVirgula(linha.taxaAtraso)}%`,
      formatarDiasRelatorioCoordenador(linha.mediaDias),
      `${linha.maiorAtraso} dias`
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor;
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
}

// 1 linha por devolutiva, do maior atraso para o menor (desempate por coordenador)
function renderizarDetalhadaRelatorioCoordenador(devolutivas) {
  const tbody = document.getElementById('relCoordTabelaBody');
  tbody.innerHTML = '';

  const linhas = [...devolutivas].sort(
    (a, b) =>
      b.dias - a.dias ||
      safe(a.record.coordenador).localeCompare(safe(b.record.coordenador), 'pt-BR')
  );

  const fragment = document.createDocumentFragment();
  linhas.forEach(({ record, dias }) => {
    const tr = document.createElement('tr');
    [
      safe(record.modulo),
      safe(record.ano),
      safe(record.tipo_av),
      safe(record.frente),
      safe(record.coordenador),
      safe(record.prazo_coord),
      safe(record.devolutiva_coord)
    ].forEach((valor) => {
      const td = document.createElement('td');
      td.textContent = valor || '-';
      tr.appendChild(td);
    });

    const tdDias = document.createElement('td');
    tdDias.className = 'report-delay-cell';
    tdDias.innerHTML = renderDiasAtrasoDetalhado(dias);
    tr.appendChild(tdDias);
    fragment.appendChild(tr);
  });
  tbody.appendChild(fragment);
}

function abrirModalRelatorioCoordenador() {
  const dados = indicadoresCoordenadorDadosBase;
  populateSelectOptions(relatorioCoordenadorFiltros.coordenador, dados, 'coordenador', 'Todos');
  populateSelectOptions(relatorioCoordenadorFiltros.ano, dados, 'ano', 'Todos');
  populateSelectOptions(relatorioCoordenadorFiltros.disciplina, dados, 'frente', 'Todos');
  populateSelectOptions(relatorioCoordenadorFiltros.modulo, dados, 'modulo', 'Todos');
  populateRelatorioAvaliacaoOptions(relatorioCoordenadorFiltros.avaliacao, dados);
  relatorioCoordenadorFiltros.avaliacao.options[0].textContent = 'Todos';

  relatorioCoordenadorPreview.hidden = true;
  relatorioCoordenadorVazio.hidden = true;
  btnImprimirRelatorioCoordenador.disabled = true;
  relatorioCoordenadorModalBackdrop.hidden = false;
}

function fecharModalRelatorioCoordenador() {
  relatorioCoordenadorModalBackdrop.hidden = true;
}

function gerarRelatorioCoordenador() {
  const devolutivas = aplicarFiltrosRelatorioCoordenador(indicadoresCoordenadorDadosBase)
    .map((record) => ({ record, dias: calcularDiasRelatorioCoordenador(record) }))
    .filter((d) => d.dias !== null);

  if (devolutivas.length === 0) {
    relatorioCoordenadorPreview.hidden = true;
    relatorioCoordenadorVazio.hidden = false;
    btnImprimirRelatorioCoordenador.disabled = true;
    return;
  }
  relatorioCoordenadorVazio.hidden = true;

  const textoFiltro = (select) =>
    select.value ? select.options[select.selectedIndex].textContent : 'Todos';
  document.getElementById('relCoordMetaCoordenador').textContent = textoFiltro(relatorioCoordenadorFiltros.coordenador);
  document.getElementById('relCoordMetaSegmento').textContent = textoFiltro(relatorioCoordenadorFiltros.segmento);
  document.getElementById('relCoordMetaAno').textContent = textoFiltro(relatorioCoordenadorFiltros.ano);
  document.getElementById('relCoordMetaDisciplina').textContent = textoFiltro(relatorioCoordenadorFiltros.disciplina);
  document.getElementById('relCoordMetaModulo').textContent = textoFiltro(relatorioCoordenadorFiltros.modulo);
  document.getElementById('relCoordMetaAvaliacao').textContent = textoFiltro(relatorioCoordenadorFiltros.avaliacao);
  document.getElementById('relCoordMetaData').textContent = formatarDataHoraAtual();

  const resumo = resumirDevolutivasRelatorioCoordenador(devolutivas);
  const pct = (qtd) => formatarPercentualComVirgula(resumo.total ? (qtd / resumo.total) * 100 : 0);
  document.getElementById('relCoordResumoNoPrazo').textContent = `${resumo.noPrazo} (${pct(resumo.noPrazo)}%)`;
  document.getElementById('relCoordResumoForaPrazo').textContent = `${resumo.foraPrazo} (${pct(resumo.foraPrazo)}%)`;
  document.getElementById('relCoordResumoMediaAtraso').textContent = formatarDiasRelatorioCoordenador(resumo.mediaDias);
  document.getElementById('relCoordResumoMaiorAtraso').textContent = `${resumo.maiorAtraso} dias`;

  const recorrencia = calcularRecorrenciaRelatorioCoordenador(devolutivas);
  const lider = recorrencia[0];
  document.getElementById('relCoordResumoRecorrencia').textContent =
    lider && lider.foraPrazo > 0
      ? `${lider.coordenador} (${lider.foraPrazo} fora do prazo)`
      : 'Nenhum atraso';

  renderizarRecorrenciaRelatorioCoordenador(recorrencia);
  renderizarDetalhadaRelatorioCoordenador(devolutivas);

  relatorioCoordenadorPreview.hidden = false;
  btnImprimirRelatorioCoordenador.disabled = false;
}

btnRelatorioCoordenador.addEventListener('click', abrirModalRelatorioCoordenador);
document.getElementById('btnFecharRelatorioCoordenador').addEventListener('click', fecharModalRelatorioCoordenador);
document.getElementById('btnCancelarRelatorioCoordenador').addEventListener('click', fecharModalRelatorioCoordenador);
relatorioCoordenadorModalBackdrop.addEventListener('click', (event) => {
  if (event.target === relatorioCoordenadorModalBackdrop) fecharModalRelatorioCoordenador();
});
document.getElementById('btnGerarRelatorioCoordenador').addEventListener('click', gerarRelatorioCoordenador);
btnImprimirRelatorioCoordenador.addEventListener('click', () =>
  imprimirAreaRelatorio('coordenador-report-print-area', 'Relatório do Coordenador — 1ª Validação')
);
Object.values(relatorioCoordenadorFiltros).forEach((select) => {
  select.addEventListener('change', () => {
    if (!relatorioCoordenadorPreview.hidden) gerarRelatorioCoordenador();
  });
});

// --- Eventos ---

dom.btnAtualizar.addEventListener('click', loadData);
dom.btnAtualizar.addEventListener('click', carregarDadosMacro2);
dom.btnLimparFiltros.addEventListener('click', clearFilters);
dom.filterBusca.addEventListener('input', applyFilters);
Object.values(selectFilters).forEach((select) => select.addEventListener('change', applyFilters));

dom.tabsNav.querySelectorAll('.sidebar-btn').forEach((btn) => {
  // Botão de expandir/recolher o grupo "Processo de Produção": não tem data-tab, não navega —
  // só alterna a lista de subseções (o próprio grupo já abre sozinho quando uma subseção está
  // ativa, ver atualizarEstadoGrupoProcessoProducao)
  if (btn.id === 'sidebarGroupToggleProcessoProducao') {
    btn.addEventListener('click', alternarGrupoProcessoProducao);
    return;
  }
  if (btn.id === 'sidebarGroupToggleIndicadorProcesso') {
    btn.addEventListener('click', alternarGrupoIndicadorProcesso);
    return;
  }
  btn.addEventListener('click', () => trocarAba(btn.dataset.tab));
});

btnAtualizarElab.addEventListener('click', loadData);
btnLimparFiltrosElab.addEventListener('click', limparFiltrosElaborador);
btnAplicarFiltrosElab.addEventListener('click', () => {
  aplicarCheckboxesElaborador();
  renderizarVisaoElaborador();
  fecharPopoverFiltrosElaborador();
});
elabFilterBusca.addEventListener('input', renderizarVisaoElaborador);
Object.values(elabSelectFilters).forEach((select) =>
  select.addEventListener('change', renderizarVisaoElaborador)
);

btnAbrirFiltrosElab.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosElaborador();
});

btnFecharFiltrosElab.addEventListener('click', fecharPopoverFiltrosElaborador);

// Popover de filtros da seção Indicadores — Elaborador (botão de ícone de funil no topo)
btnAtualizarInd.addEventListener('click', loadData);
btnLimparFiltrosInd.addEventListener('click', limparFiltrosIndicadoresTopo);
btnAplicarFiltrosInd.addEventListener('click', () => {
  aplicarCheckboxesIndicadoresTopo();
  renderizarIndicadoresElaborador(indicadoresDadosBase);
  fecharPopoverFiltrosIndicadoresTopo();
});
indFilterBusca.addEventListener('input', () => renderizarIndicadoresElaborador(indicadoresDadosBase));
Object.values(indSelectFilters).forEach((select) =>
  select.addEventListener('change', () => renderizarIndicadoresElaborador(indicadoresDadosBase))
);

btnAbrirFiltrosInd.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosIndicadoresTopo();
});

btnFecharFiltrosInd.addEventListener('click', fecharPopoverFiltrosIndicadoresTopo);

// Cards da aba Elaborador funcionam como filtros rápidos: clique (ou Enter/Espaço) alterna o filtro
document.querySelectorAll('#viewElaborador [data-quick-filter]').forEach((card) => {
  card.addEventListener('click', () => aplicarFiltroRapidoElaborador(card.dataset.quickFilter));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      aplicarFiltroRapidoElaborador(card.dataset.quickFilter);
    }
  });
});

// Navegação interna da aba Elaborador: Acompanhamento <-> Indicadores
btnIndicadores.addEventListener('click', mostrarIndicadoresElaborador);
btnVoltarAcompanhamento.addEventListener('click', mostrarAcompanhamentoElaborador);

// Botão "Limpar filtros dos indicadores" (remove só os filtros interativos dos gráficos)
document.getElementById('btnLimparFiltrosIndicadores').addEventListener('click', limparFiltrosIndicadores);

btnAtualizarCoord.addEventListener('click', loadData);
btnLimparFiltrosCoord.addEventListener('click', limparFiltrosCoordenador);
btnAplicarFiltrosCoord.addEventListener('click', () => {
  aplicarCheckboxesCoordenador();
  renderizarVisaoCoordenador();
  fecharPopoverFiltrosCoordenador();
});
coordFilterBusca.addEventListener('input', renderizarVisaoCoordenador);
Object.values(coordSelectFilters).forEach((select) =>
  select.addEventListener('change', renderizarVisaoCoordenador)
);

btnAbrirFiltrosCoord.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosCoordenador();
});

btnFecharFiltrosCoord.addEventListener('click', fecharPopoverFiltrosCoordenador);

// Popover de filtros da seção Indicadores — Coordenador (botão de ícone de funil no topo)
btnAtualizarIndCoord.addEventListener('click', loadData);
btnLimparFiltrosIndCoord.addEventListener('click', limparFiltrosIndicadoresTopoCoord);
btnAplicarFiltrosIndCoord.addEventListener('click', () => {
  aplicarCheckboxesIndicadoresTopoCoord();
  renderizarIndicadoresCoordenador(indicadoresCoordenadorDadosBase);
  fecharPopoverFiltrosIndicadoresTopoCoord();
});
indFilterBuscaCoord.addEventListener('input', () => renderizarIndicadoresCoordenador(indicadoresCoordenadorDadosBase));
Object.values(indSelectFiltersCoord).forEach((select) =>
  select.addEventListener('change', () => renderizarIndicadoresCoordenador(indicadoresCoordenadorDadosBase))
);

btnAbrirFiltrosIndCoord.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosIndicadoresTopoCoord();
});

btnFecharFiltrosIndCoord.addEventListener('click', fecharPopoverFiltrosIndicadoresTopoCoord);

// Cards da aba Coordenador funcionam como filtros rápidos: clique (ou Enter/Espaço) alterna o filtro
document.querySelectorAll('#viewCoordenador [data-quick-filter]').forEach((card) => {
  card.addEventListener('click', () => alternarFiltroRapidoCoordenador(card.dataset.quickFilter));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      alternarFiltroRapidoCoordenador(card.dataset.quickFilter);
    }
  });
});

// Dica de ferramenta analítica do card "Pendente de Envio": em telas sem hover (touch),
// alterna a exibição ao tocar no card e fecha ao tocar fora dele. Também ajusta a posição
// horizontal para não cortar na borda direita da tela.
(function () {
  const wrapper = document.getElementById('coordCardPendenteTooltipWrapper');
  if (!wrapper) return;
  const tooltip = document.getElementById('coordPendenteTooltip');
  const card = document.getElementById('coordCardPendenteEnvioArticle');

  function ajustarPosicaoTooltip() {
    tooltip.classList.remove('coord-analytic-tooltip--direita');
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.classList.add('coord-analytic-tooltip--direita');
    }
  }

  card.addEventListener('mouseenter', ajustarPosicaoTooltip);
  card.addEventListener('focus', ajustarPosicaoTooltip);

  card.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    tooltip.classList.toggle('is-visible', abrindo);
    if (abrindo) ajustarPosicaoTooltip();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
})();

// Dica de ferramenta analítica do card "Concluídas" do Processo Editorial: mesmo comportamento
// da tooltip do card "Pendente de Envio" da aba Coordenador (ver IIFE acima) — em telas sem
// hover (touch), alterna a exibição ao tocar no card e fecha ao tocar fora; ajusta a posição
// horizontal para não cortar na borda direita da tela.
(function () {
  const wrapper = document.getElementById('peCardConcluidasTooltipWrapper');
  if (!wrapper) return;
  const tooltip = document.getElementById('peConcluidasTooltip');
  const card = document.getElementById('peCardConcluidasArticle');

  function ajustarPosicaoTooltip() {
    tooltip.classList.remove('coord-analytic-tooltip--direita');
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.classList.add('coord-analytic-tooltip--direita');
    }
  }

  card.addEventListener('mouseenter', ajustarPosicaoTooltip);
  card.addEventListener('focus', ajustarPosicaoTooltip);

  card.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    tooltip.classList.toggle('is-visible', abrindo);
    if (abrindo) ajustarPosicaoTooltip();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
})();

// Dica de ferramenta analítica do card "Total de Prova Validada" do Processo Editorial: mesmo
// comportamento da tooltip do card "Concluídas" (ver IIFE acima) — em telas sem hover (touch),
// alterna a exibição ao tocar no card e fecha ao tocar fora; ajusta a posição horizontal para
// não cortar na borda direita da tela.
(function () {
  const wrapper = document.getElementById('peCardValidadaTooltipWrapper');
  if (!wrapper) return;
  const tooltip = document.getElementById('peValidadaTooltip');
  const card = document.getElementById('peCardValidadaArticle');

  function ajustarPosicaoTooltip() {
    tooltip.classList.remove('coord-analytic-tooltip--direita');
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.classList.add('coord-analytic-tooltip--direita');
    }
  }

  card.addEventListener('mouseenter', ajustarPosicaoTooltip);
  card.addEventListener('focus', ajustarPosicaoTooltip);

  card.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    tooltip.classList.toggle('is-visible', abrindo);
    if (abrindo) ajustarPosicaoTooltip();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
})();

// Dica de ferramenta analítica do card "Enviadas" da 2ª Validação (Assinatura Coordenador):
// mesmo comportamento das tooltips dos cards "Pendente de Envio"/"Concluídas" (ver IIFEs
// acima) — em telas sem hover (touch), alterna a exibição ao tocar no card e fecha ao tocar
// fora; ajusta a posição horizontal para não cortar na borda direita da tela.
(function () {
  const wrapper = document.getElementById('assCoordCardEnviadasTooltipWrapper');
  if (!wrapper) return;
  const tooltip = document.getElementById('assCoordEnviadasTooltip');
  const card = document.getElementById('assCoordCardEnviadasArticle');

  function ajustarPosicaoTooltip() {
    tooltip.classList.remove('coord-analytic-tooltip--direita');
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.classList.add('coord-analytic-tooltip--direita');
    }
  }

  card.addEventListener('mouseenter', ajustarPosicaoTooltip);
  card.addEventListener('focus', ajustarPosicaoTooltip);

  card.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    tooltip.classList.toggle('is-visible', abrindo);
    if (abrindo) ajustarPosicaoTooltip();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
})();

// Dica de ferramenta analítica do card "Total de provas assinadas" da Arte-finalização e Envio:
// mesmo comportamento das tooltips dos demais cards (ver IIFEs acima) — em telas sem hover
// (touch), alterna a exibição ao tocar no card e fecha ao tocar fora; ajusta a posição
// horizontal para não cortar na borda direita da tela.
(function () {
  const wrapper = document.getElementById('afeCardAssinadasTooltipWrapper');
  if (!wrapper) return;
  const tooltip = document.getElementById('afeAssinadasTooltip');
  const card = document.getElementById('afeCardAssinadasArticle');

  function ajustarPosicaoTooltip() {
    tooltip.classList.remove('coord-analytic-tooltip--direita');
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.classList.add('coord-analytic-tooltip--direita');
    }
  }

  card.addEventListener('mouseenter', ajustarPosicaoTooltip);
  card.addEventListener('focus', ajustarPosicaoTooltip);

  card.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    tooltip.classList.toggle('is-visible', abrindo);
    if (abrindo) ajustarPosicaoTooltip();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
})();

// Dica de ferramenta analítica do card "Provas Enviadas para Gráfica" da Arte-finalização e
// Envio: mesmo comportamento das tooltips dos demais cards (ver IIFEs acima) — em telas sem
// hover (touch), alterna a exibição ao tocar no card e fecha ao tocar fora; ajusta a posição
// horizontal para não cortar na borda direita da tela.
(function () {
  const wrapper = document.getElementById('afeCardEnviadasTooltipWrapper');
  if (!wrapper) return;
  const tooltip = document.getElementById('afeEnviadasTooltip');
  const card = document.getElementById('afeCardEnviadasArticle');

  function ajustarPosicaoTooltip() {
    tooltip.classList.remove('coord-analytic-tooltip--direita');
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.classList.add('coord-analytic-tooltip--direita');
    }
  }

  card.addEventListener('mouseenter', ajustarPosicaoTooltip);
  card.addEventListener('focus', ajustarPosicaoTooltip);

  card.addEventListener('click', (event) => {
    const semHover = window.matchMedia('(hover: none)').matches;
    if (!semHover) return;
    event.stopPropagation();
    const abrindo = !tooltip.classList.contains('is-visible');
    tooltip.classList.toggle('is-visible', abrindo);
    if (abrindo) ajustarPosicaoTooltip();
  });

  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
})();

// Fecha a tooltip analítica de um badge de status por ano (criarBadgeStatusAnoComTooltip) ao
// clicar fora dela. Registrado uma única vez em `document` (em vez de a cada renderização da
// tabela, que recria os badges) para não acumular listeners a cada re-render.
document.addEventListener('click', (event) => {
  document.querySelectorAll('.pe-status-tooltip-wrapper').forEach((wrapper) => {
    const tooltip = wrapper._peStatusTooltip;
    if (tooltip && !wrapper.contains(event.target) && !tooltip.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
});

// Fecha a tooltip analítica de um badge de status por coordenador (criarBadgeStatusAssinaturaComTooltip)
// ao clicar fora dela — mesmo padrão do handler acima para os badges de status por ano do
// Processo Editorial.
document.addEventListener('click', (event) => {
  document.querySelectorAll('.assCoord-status-tooltip-wrapper').forEach((wrapper) => {
    const tooltip = wrapper._assCoordStatusTooltip;
    if (tooltip && !wrapper.contains(event.target) && !tooltip.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
});

// Fecha a tooltip analítica de um badge de status por ano da tabela "Fluxo de Arte-finalização e
// Envio" (criarBadgeStatusAnoArteFinalizacaoEnvioComTooltip) ao clicar fora dela — mesmo padrão
// dos handlers acima.
document.addEventListener('click', (event) => {
  document.querySelectorAll('.afe-status-tooltip-wrapper').forEach((wrapper) => {
    const tooltip = wrapper._afeStatusTooltip;
    if (tooltip && !wrapper.contains(event.target) && !tooltip.contains(event.target)) {
      tooltip.classList.remove('is-visible');
    }
  });
});

// Popover de filtros da seção Processo Editorial (botão de ícone de funil no topo)
btnAtualizarPE.addEventListener('click', loadData);
btnLimparFiltrosPE.addEventListener('click', limparFiltrosProcessoEditorial);
btnAplicarFiltrosPE.addEventListener('click', () => {
  aplicarCheckboxesProcessoEditorial();
  renderizarProcessoEditorial();
  fecharPopoverFiltrosProcessoEditorial();
});
peFilterBusca.addEventListener('input', renderizarProcessoEditorial);
Object.values(peSelectFilters).forEach((select) =>
  select.addEventListener('change', renderizarProcessoEditorial)
);

btnAbrirFiltrosPE.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosProcessoEditorial();
});

btnFecharFiltrosPE.addEventListener('click', fecharPopoverFiltrosProcessoEditorial);

// Painel de filtros avançados da seção Banco de Provas (botão na barra de busca)
btnLimparFiltrosBP.addEventListener('click', limparFiltrosBancoProvas);
bpFilterBusca.addEventListener('input', renderizarBancoProvas);
Object.values(bpSelectFilters).forEach((select) => select.addEventListener('change', renderizarBancoProvas));
Object.values(bpCheckboxGroups).forEach((grupo) =>
  grupo.addEventListener('change', (event) => {
    if (event.target && event.target.type === 'checkbox') aplicarCheckboxesBancoProvas();
  })
);

btnAbrirFiltrosBP.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosBancoProvas();
});

btnFecharFiltrosBP.addEventListener('click', fecharPopoverFiltrosBancoProvas);

// Popover de filtros da seção Assinatura Coordenador (botão de ícone de funil no topo)
btnAtualizarAssCoord.addEventListener('click', loadData);
btnLimparFiltrosAssCoord.addEventListener('click', limparFiltrosAssinaturaCoordenador);
btnAplicarFiltrosAssCoord.addEventListener('click', () => {
  aplicarCheckboxesAssinaturaCoordenador();
  renderizarVisaoAssinaturaCoordenador();
  fecharPopoverFiltrosAssinaturaCoordenador();
});
assCoordFilterBusca.addEventListener('input', renderizarVisaoAssinaturaCoordenador);
Object.values(assCoordSelectFilters).forEach((select) =>
  select.addEventListener('change', renderizarVisaoAssinaturaCoordenador)
);

btnAbrirFiltrosAssCoord.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosAssinaturaCoordenador();
});

btnFecharFiltrosAssCoord.addEventListener('click', fecharPopoverFiltrosAssinaturaCoordenador);

// Popover de filtros da seção Arte-finalização e Envio (botão de ícone de funil no topo)
btnAtualizarAFE.addEventListener('click', loadData);
btnLimparFiltrosAFE.addEventListener('click', limparFiltrosArteFinalizacaoEnvio);
btnAplicarFiltrosAFE.addEventListener('click', () => {
  aplicarCheckboxesArteFinalizacaoEnvio();
  renderizarArteFinalizacaoEnvio();
  fecharPopoverFiltrosArteFinalizacaoEnvio();
});
afeFilterBusca.addEventListener('input', renderizarArteFinalizacaoEnvio);
Object.values(afeSelectFilters).forEach((select) =>
  select.addEventListener('change', renderizarArteFinalizacaoEnvio)
);

btnAbrirFiltrosAFE.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosArteFinalizacaoEnvio();
});

btnFecharFiltrosAFE.addEventListener('click', fecharPopoverFiltrosArteFinalizacaoEnvio);

// Cards da aba Assinatura Coordenador funcionam como filtros rápidos: clique (ou Enter/Espaço) alterna o filtro
document.querySelectorAll('#assinatura-coordenador-section [data-quick-filter]').forEach((card) => {
  card.addEventListener('click', () => alternarFiltroRapidoAssinaturaCoordenador(card.dataset.quickFilter));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      alternarFiltroRapidoAssinaturaCoordenador(card.dataset.quickFilter);
    }
  });
});

// Cards da seção Processo Editorial funcionam como filtros rápidos: clique (ou Enter/Espaço) alterna o filtro
document.querySelectorAll('#viewSistemaGGE [data-quick-filter]').forEach((card) => {
  card.addEventListener('click', () => alternarFiltroRapidoProcessoEditorial(card.dataset.quickFilter));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      alternarFiltroRapidoProcessoEditorial(card.dataset.quickFilter);
    }
  });
});

// Cards da seção Arte-finalização e Envio funcionam como filtros rápidos ("Total de provas
// assinadas"/"Em Andamento"/"Provas Enviadas para Gráfica"): clique (ou Enter/Espaço) alterna o
// filtro — mesmo padrão do bloco acima (Processo Editorial)
document.querySelectorAll('#arte-finalizacao-envio-section [data-quick-filter]').forEach((card) => {
  card.addEventListener('click', () => alternarFiltroCardArteFinalizacao(card.dataset.quickFilter));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      alternarFiltroCardArteFinalizacao(card.dataset.quickFilter);
    }
  });
});

// "x" do chip "Filtro ativo:" da seção Arte-finalização e Envio: remove o filtro de card ativo
if (btnFecharFiltroCardAFE) {
  btnFecharFiltroCardAFE.addEventListener('click', () => {
    filtroCardArteFinalizacao = null;
    renderizarArteFinalizacaoEnvio();
  });
}

// Navegação interna da aba Coordenador: Acompanhamento <-> Indicadores
btnIndicadoresCoord.addEventListener('click', mostrarIndicadoresCoordenador);
btnVoltarAcompanhamentoCoord.addEventListener('click', mostrarAcompanhamentoCoordenador);

// Botão "Limpar filtros dos indicadores" (remove os filtros interativos dos gráficos)
domIndCoord.btnLimparFiltros.addEventListener('click', limparFiltrosIndicadoresCoordenador);

// Popover de filtros da seção Indicadores — Processo Editorial (botão de ícone de funil no topo)
btnAtualizarIndPE.addEventListener('click', loadData);
btnLimparFiltrosIndPE.addEventListener('click', limparFiltrosIndicadoresTopoPE);
btnAplicarFiltrosIndPE.addEventListener('click', () => {
  aplicarCheckboxesIndicadoresTopoPE();
  renderizarIndicadoresProcessoEditorial(indicadoresPEDadosBase);
  fecharPopoverFiltrosIndicadoresTopoPE();
});
indFilterBuscaPE.addEventListener('input', () => renderizarIndicadoresProcessoEditorial(indicadoresPEDadosBase));
Object.values(indSelectFiltersPE).forEach((select) =>
  select.addEventListener('change', () => renderizarIndicadoresProcessoEditorial(indicadoresPEDadosBase))
);

btnAbrirFiltrosIndPE.addEventListener('click', (event) => {
  event.stopPropagation();
  alternarPopoverFiltrosIndicadoresTopoPE();
});

btnFecharFiltrosIndPE.addEventListener('click', fecharPopoverFiltrosIndicadoresTopoPE);

// Navegação interna da aba Processo Editorial: Acompanhamento <-> Indicadores
btnIndicadoresPE.addEventListener('click', mostrarIndicadoresProcessoEditorial);
btnVoltarAcompanhamentoPE.addEventListener('click', mostrarAcompanhamentoProcessoEditorial);

// Navegação interna da aba Assinatura Coordenador: Acompanhamento <-> Indicadores
btnIndicadoresAssCoord.addEventListener('click', mostrarIndicadoresAssinaturaCoordenador);
btnVoltarAcompanhamentoAssCoord.addEventListener('click', mostrarAcompanhamentoAssinaturaCoordenador);

// Botão "2ª Validação" dentro de Indicadores — Coordenador: mesmo caminho do antigo atalho de
// sidebar "Indicador do Processo → 2ª Validação" (agora só acessível por aqui)
btnAbrirSegundaValidacaoIndCoord.addEventListener('click', () => trocarAba('indicador-segunda-validacao'));

// Botão "Limpar filtros dos indicadores" (remove os filtros interativos dos gráficos)
document.getElementById('btnLimparFiltrosIndicadoresPE').addEventListener('click', limparFiltrosIndicadoresPE);

// Fecha os popovers de filtro (Elaborador, Indicadores — Elaborador, Coordenador e
// Indicadores — Coordenador) ao clicar fora deles
document.addEventListener('click', (event) => {
  if (!elabFiltersPopover.hidden && !elabFilterPopoverWrapper.contains(event.target)) {
    fecharPopoverFiltrosElaborador();
  }
  if (!indFiltersPopover.hidden && !indFilterPopoverWrapper.contains(event.target)) {
    fecharPopoverFiltrosIndicadoresTopo();
  }
  if (!coordFiltersPopover.hidden && !coordFilterPopoverWrapper.contains(event.target)) {
    fecharPopoverFiltrosCoordenador();
  }
  if (!indFiltersPopoverCoord.hidden && !indFilterPopoverWrapperCoord.contains(event.target)) {
    fecharPopoverFiltrosIndicadoresTopoCoord();
  }
  if (!peFiltersPopover.hidden && !peFilterPopoverWrapper.contains(event.target)) {
    fecharPopoverFiltrosProcessoEditorial();
  }
  if (!indFiltersPopoverPE.hidden && !indFilterPopoverWrapperPE.contains(event.target)) {
    fecharPopoverFiltrosIndicadoresTopoPE();
  }
  if (!bpFiltersPopover.hidden && !bpFilterPopoverWrapper.contains(event.target)) {
    fecharPopoverFiltrosBancoProvas();
  }
  if (!assCoordFiltersPopover.hidden && !assCoordFilterPopoverWrapper.contains(event.target)) {
    fecharPopoverFiltrosAssinaturaCoordenador();
  }
  if (!afeFiltersPopover.hidden && !afeFilterPopoverWrapper.contains(event.target)) {
    fecharPopoverFiltrosArteFinalizacaoEnvio();
  }
});

// Fecha os popovers de filtro ao pressionar ESC
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!elabFiltersPopover.hidden) fecharPopoverFiltrosElaborador();
  if (!indFiltersPopover.hidden) fecharPopoverFiltrosIndicadoresTopo();
  if (!coordFiltersPopover.hidden) fecharPopoverFiltrosCoordenador();
  if (!indFiltersPopoverCoord.hidden) fecharPopoverFiltrosIndicadoresTopoCoord();
  if (!bpFiltersPopover.hidden) fecharPopoverFiltrosBancoProvas();
  if (!assCoordFiltersPopover.hidden) fecharPopoverFiltrosAssinaturaCoordenador();
  if (!peFiltersPopover.hidden) fecharPopoverFiltrosProcessoEditorial();
  if (!indFiltersPopoverPE.hidden) fecharPopoverFiltrosIndicadoresTopoPE();
  if (!afeFiltersPopover.hidden) fecharPopoverFiltrosArteFinalizacaoEnvio();
});

// --- Autenticação ---

const domAuth = {
  loginScreen: document.getElementById('loginScreen'),
  appShell: document.getElementById('appShell'),
  loginCard: document.getElementById('loginCard'),
  loginForm: document.getElementById('loginForm'),
  loginNome: document.getElementById('loginNome'),
  loginSenha: document.getElementById('loginSenha'),
  loginError: document.getElementById('loginError'),
  btnLogin: document.getElementById('btnLogin'),
  loginLogo: document.getElementById('loginLogo'),
  userMenu: document.getElementById('userMenu'),
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
  sidebarFooter: document.getElementById('sidebarFooter'),
  btnLogout: document.getElementById('btnLogout')
};

// Esconde a logo do login caso o arquivo assets/logo/logo-sgge.png não exista
domAuth.loginLogo.addEventListener('error', () => {
  domAuth.loginLogo.style.display = 'none';
});

// Exibe uma mensagem de erro no formulário de login (ou limpa quando texto vazio)
function exibirErroLogin(mensagem) {
  if (!mensagem) {
    domAuth.loginError.hidden = true;
    domAuth.loginError.textContent = '';
    return;
  }
  domAuth.loginError.hidden = false;
  domAuth.loginError.textContent = mensagem;
}

// Renderiza o usuário logado (avatar + nome, centralizados no topo da sidebar) e revela o
// rodapé com o botão "Sair" — dois elementos separados no HTML (sidebar-user/sidebar-footer)
// para o layout pedido, mas escondidos/mostrados sempre juntos, como um único estado de "logado"
function renderizarUsuarioLogado(usuario) {
  domAuth.userName.textContent = usuario.nome;

  const imagem = safe(usuario.imagem);
  if (imagem) {
    domAuth.userAvatar.style.backgroundImage = `url("${imagem}")`;
    domAuth.userAvatar.textContent = '';
  } else {
    domAuth.userAvatar.style.backgroundImage = '';
    domAuth.userAvatar.textContent = usuario.nome.trim().charAt(0).toUpperCase();
  }

  domAuth.userMenu.hidden = false;
  domAuth.sidebarFooter.hidden = false;
}

// Esconde a tela de login e exibe o painel principal já com os dados carregados
function mostrarPainelAutenticado(usuario) {
  renderizarUsuarioLogado(usuario);
  domAuth.loginScreen.classList.add('hidden');
  domAuth.appShell.classList.remove('hidden');
  loadData();
  carregarDadosMacro2();
}

// Esconde o painel e exibe a tela de login, limpando os campos, mensagens e estados visuais
function mostrarTelaLogin() {
  domAuth.appShell.classList.add('hidden');
  domAuth.userMenu.hidden = true;
  domAuth.sidebarFooter.hidden = true;
  domAuth.loginScreen.classList.remove('hidden');
  domAuth.loginForm.reset();
  resetLoginState();
}

// Liga/desliga o estado visual de carregamento do login: desabilita o botão e os campos,
// troca o texto do botão por um spinner + "Entrando..." e destaca levemente o card
function setLoginLoading(ativo) {
  domAuth.loginCard.classList.toggle('loading', ativo);
  domAuth.loginForm.classList.toggle('loading', ativo);
  domAuth.btnLogin.disabled = ativo;
  domAuth.btnLogin.classList.toggle('login-button--loading', ativo);
  domAuth.loginNome.disabled = ativo;
  domAuth.loginSenha.disabled = ativo;

  if (ativo) {
    domAuth.loginSenha.classList.remove('login-input--error');
    exibirErroLogin('');
    domAuth.btnLogin.innerHTML = '<span class="login-spinner" aria-hidden="true"></span><span>Entrando...</span>';
  } else {
    domAuth.btnLogin.textContent = 'Entrar';
  }
}

// Feedback visual de sucesso: card e botão em verde com "Acesso liberado" por um instante
// antes do painel abrir (a troca de tela em si continua a cargo de mostrarPainelAutenticado)
function setLoginSuccess() {
  domAuth.loginCard.classList.remove('loading');
  domAuth.loginCard.classList.add('success');
  domAuth.btnLogin.classList.remove('login-button--loading');
  domAuth.btnLogin.classList.add('login-button--success');
  domAuth.btnLogin.innerHTML = '<span class="login-check" aria-hidden="true">&check;</span><span>Acesso liberado</span>';
}

// Feedback visual de erro: reativa campos/botão, mostra a mensagem e aplica um shake discreto
function setLoginError(mensagem) {
  resetLoginState();
  exibirErroLogin(mensagem);
  domAuth.loginSenha.classList.add('login-input--error');
  domAuth.loginCard.classList.add('error');
  window.setTimeout(() => domAuth.loginCard.classList.remove('error'), 300);
}

// Volta a tela de login ao estado neutro (sem loading/sucesso/erro), pronta para nova tentativa
function resetLoginState() {
  domAuth.loginCard.classList.remove('loading', 'success', 'error');
  domAuth.loginForm.classList.remove('loading');
  domAuth.btnLogin.disabled = false;
  domAuth.btnLogin.classList.remove('login-button--loading', 'login-button--success');
  domAuth.btnLogin.textContent = 'Entrar';
  domAuth.loginNome.disabled = false;
  domAuth.loginSenha.disabled = false;
  domAuth.loginSenha.classList.remove('login-input--error');
  exibirErroLogin('');
}

// Executa o login: valida os campos, chama a API de autenticação e trata o resultado
async function fazerLogin(event) {
  event.preventDefault();

  const nome = safe(domAuth.loginNome.value);
  const senha = safe(domAuth.loginSenha.value);

  if (!nome || !senha) {
    setLoginError('Informe nome e senha.');
    return;
  }

  setLoginLoading(true);

  try {
    const url = `${AUTH_API_URL}?action=login&nome=${encodeURIComponent(nome)}&senha=${encodeURIComponent(senha)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('network');
    }

    const json = await response.json();
    if (!json.success || !json.usuario) {
      setLoginError('Nome ou senha inválidos.');
      return;
    }

    localStorage.setItem(CHAVE_USUARIO_LOGADO, JSON.stringify(json.usuario));
    setLoginSuccess();
    window.setTimeout(() => mostrarPainelAutenticado(json.usuario), 550);
  } catch (err) {
    setLoginError('Não foi possível conectar à API. Tente novamente.');
  }
}

// Efetua logout: remove o usuário salvo e volta para a tela de login
function fazerLogout() {
  localStorage.removeItem(CHAVE_USUARIO_LOGADO);
  mostrarTelaLogin();
}

domAuth.loginForm.addEventListener('submit', fazerLogin);
domAuth.btnLogout.addEventListener('click', fazerLogout);

// Inicialização: só carrega o painel/dados se já houver um usuário salvo no localStorage;
// caso contrário, permanece na tela de login até um login bem-sucedido
function inicializarAutenticacao() {
  const usuarioSalvo = localStorage.getItem(CHAVE_USUARIO_LOGADO);
  if (!usuarioSalvo) {
    mostrarTelaLogin();
    return;
  }

  try {
    const usuario = JSON.parse(usuarioSalvo);
    mostrarPainelAutenticado(usuario);
  } catch (err) {
    localStorage.removeItem(CHAVE_USUARIO_LOGADO);
    mostrarTelaLogin();
  }
}

// --- Tela de abertura (splash) ---

const domSplash = document.getElementById('splashScreen');
const PREFERE_MOVIMENTO_REDUZIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Exibe a splash institucional por um período curto e só então libera o login/painel,
// evitando qualquer flash da tela de login por trás da animação
function iniciarAberturaPremium() {
  const duracaoExibicao = PREFERE_MOVIMENTO_REDUZIDO ? 300 : 1800;
  const duracaoSaida = PREFERE_MOVIMENTO_REDUZIDO ? 0 : 450;

  window.setTimeout(() => {
    domSplash.classList.add('hide');
    window.setTimeout(() => {
      domSplash.hidden = true;
      inicializarAutenticacao();
    }, duracaoSaida);
  }, duracaoExibicao);
}

iniciarAberturaPremium();

// --- Menu mobile (≤ 768px): sidebar como drawer lateral ---
// Abre pelo botão hambúrguer, fecha ao clicar no overlay, ao escolher uma aba (botões com
// data-tab ou "Sair") e ao voltar para largura de desktop. Os botões de grupo (Processo de
// Produção / Indicadores do Processo) só expandem o submenu, sem fechar o drawer.
(function iniciarMenuMobile() {
  const LARGURA_MOBILE = 768;
  const btnMenu = document.getElementById('btnMobileMenu');
  const sidebar = document.getElementById('sidebarNav');
  const overlay = document.getElementById('mobileSidebarOverlay');
  if (!btnMenu || !sidebar || !overlay) return;

  function definirMenuMobileAberto(aberto) {
    sidebar.classList.toggle('mobile-open', aberto);
    overlay.classList.toggle('active', aberto);
    document.body.classList.toggle('mobile-menu-aberto', aberto);
    btnMenu.setAttribute('aria-expanded', String(aberto));
  }

  btnMenu.addEventListener('click', () => definirMenuMobileAberto(!sidebar.classList.contains('mobile-open')));
  overlay.addEventListener('click', () => definirMenuMobileAberto(false));

  sidebar.addEventListener('click', (event) => {
    if (window.innerWidth > LARGURA_MOBILE) return;
    if (event.target.closest('[data-tab], #btnLogout')) definirMenuMobileAberto(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('mobile-open')) definirMenuMobileAberto(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > LARGURA_MOBILE && sidebar.classList.contains('mobile-open')) {
      definirMenuMobileAberto(false);
    }
  });
})();
