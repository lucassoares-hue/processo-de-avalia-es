# Projeto Avaliações

## Como executar o projeto localmente

**Não abra o `index.html` diretamente pelo caminho `file:///...`.**

Quando o painel é aberto assim (clicando duas vezes no arquivo, por exemplo), o navegador não
tem uma origem HTTP real. Isso causa falhas intermitentes nas requisições (`fetch`) para a API do
Google Apps Script — incluindo erros como `404` que não acontecem ao testar a mesma URL da API
direto no navegador. Use sempre um servidor local para servir os arquivos do projeto.

### Opção recomendada: Live Server (VS Code)

1. Instale a extensão **Live Server** no VS Code.
2. Clique com o botão direito em `index.html`.
3. Selecione **Open with Live Server**.

O endereço esperado deve ser algo como:

```
http://127.0.0.1:5500/index.html
```

### Alternativa via terminal (Python)

```
python -m http.server 5500
```

Depois acesse:

```
http://localhost:5500
```

### Por que isso é necessário

Servir o projeto por `http://` (em vez de `file://`) evita:

- **problemas de origem**: o navegador trata `file://` como uma origem especial, com regras
  inconsistentes para CORS, cache e cabeçalhos de requisição;
- **cache de respostas antigas**: requisições feitas via `file://` podem reaproveitar respostas
  de erro já armazenadas, mascarando quando a API voltou a funcionar;
- **falhas nas requisições externas para o Google Apps Script**: a API de dados (`API_URL`) e a
  API de autenticação (`AUTH_API_URL`) são serviços externos acessados via `fetch` — um servidor
  local garante que essas chamadas se comportem da mesma forma que em produção.
