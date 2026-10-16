/**
 * API de CONTATOS DOS ELABORADORES — Painel de Avaliações SGGE
 *
 * Projeto Apps Script SEPARADO da API principal (não altera a BD_SGGE nem a API de avaliações).
 * Guarda o WhatsApp de cada elaborador numa aba "CONTATOS_ELABORADORES" da planilha onde este
 * script estiver vinculado (Extensões → Apps Script, a partir da planilha escolhida).
 *
 * Implantação (feita por quem administra o painel — nada é publicado automaticamente):
 *   1. Abrir a planilha que vai guardar os contatos → Extensões → Apps Script → colar este arquivo.
 *   2. Implantar → Nova implantação → Tipo "App da Web"
 *        Executar como: "Eu"   ·   Quem pode acessar: "Qualquer pessoa"
 *   3. Copiar a URL /exec e colar em CONTATOS_API_URL no script.js do painel.
 *
 * Endpoints:
 *   GET  ?action=listar                         → { success, contatos: [...] }
 *   POST (corpo JSON, Content-Type text/plain)  { action: "salvar", contato: {...} }
 *                                               → { success, contato }
 *
 * Contato: id, nome, telefone (55DDDNUMERO), situacao (Ativo|Inativo), atualizadoEm, atualizadoPor
 *
 * Atenção: com acesso "Qualquer pessoa", quem tiver a URL consegue ler e gravar contatos. Não
 * divulgue a URL fora do painel. Para restringir, troque o acesso para usuários do domínio.
 */

const ABA_CONTATOS = 'CONTATOS_ELABORADORES';
const COLUNAS_CONTATOS = ['id', 'nome', 'telefone', 'situacao', 'atualizadoEm', 'atualizadoPor'];

function obterAbaContatos_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(ABA_CONTATOS);
  if (!aba) {
    aba = planilha.insertSheet(ABA_CONTATOS);
    aba.getRange(1, 1, 1, COLUNAS_CONTATOS.length).setValues([COLUNAS_CONTATOS]).setFontWeight('bold');
    aba.setFrozenRows(1);
    // Telefone como texto, para não perder dígitos nem virar notação científica
    aba.getRange('C:C').setNumberFormat('@');
  }
  return aba;
}

function lerContatos_(aba) {
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];
  const valores = aba.getRange(2, 1, ultimaLinha - 1, COLUNAS_CONTATOS.length).getValues();
  return valores
    .filter((linha) => String(linha[0]).trim() !== '')
    .map((linha) => {
      const contato = {};
      COLUNAS_CONTATOS.forEach((coluna, i) => {
        contato[coluna] = linha[i] instanceof Date ? linha[i].toISOString() : String(linha[i]).trim();
      });
      return contato;
    });
}

function chaveNome_(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarTelefone_(telefone) {
  let digitos = String(telefone || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digitos.length === 10 || digitos.length === 11) digitos = '55' + digitos;
  return /^55\d{10,11}$/.test(digitos) ? digitos : '';
}

function respostaJson_(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const acao = (e && e.parameter && e.parameter.action) || 'listar';
    if (acao !== 'listar') return respostaJson_({ success: false, message: 'Ação inválida.' });
    return respostaJson_({ success: true, contatos: lerContatos_(obterAbaContatos_()) });
  } catch (erro) {
    return respostaJson_({ success: false, message: String(erro) });
  }
}

function doPost(e) {
  const trava = LockService.getScriptLock();
  try {
    trava.waitLock(10000);
    const corpo = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (corpo.action !== 'salvar' || !corpo.contato) {
      return respostaJson_({ success: false, message: 'Ação inválida.' });
    }

    const entrada = corpo.contato;
    const nome = String(entrada.nome || '').trim();
    const telefone = normalizarTelefone_(entrada.telefone);
    if (!nome) return respostaJson_({ success: false, message: 'Nome do elaborador obrigatório.' });
    if (!telefone) return respostaJson_({ success: false, message: 'Telefone inválido (informe DDD + número).' });

    const aba = obterAbaContatos_();
    const contatos = lerContatos_(aba);
    // Atualiza pelo id; se não houver, pelo nome normalizado (1 contato por elaborador)
    let indice = contatos.findIndex((c) => entrada.id && c.id === entrada.id);
    if (indice === -1) indice = contatos.findIndex((c) => chaveNome_(c.nome) === chaveNome_(nome));

    const contato = {
      id: indice >= 0 ? contatos[indice].id : entrada.id || Utilities.getUuid(),
      nome: nome,
      telefone: telefone,
      situacao: entrada.situacao === 'Inativo' ? 'Inativo' : 'Ativo',
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: String(entrada.atualizadoPor || '').trim()
    };
    const linha = COLUNAS_CONTATOS.map((coluna) => contato[coluna]);

    if (indice >= 0) {
      aba.getRange(indice + 2, 1, 1, COLUNAS_CONTATOS.length).setValues([linha]);
    } else {
      aba.appendRow(linha);
    }
    return respostaJson_({ success: true, contato: contato });
  } catch (erro) {
    return respostaJson_({ success: false, message: String(erro) });
  } finally {
    trava.releaseLock();
  }
}
