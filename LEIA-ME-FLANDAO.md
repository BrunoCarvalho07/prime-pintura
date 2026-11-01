# Flandão - Assistente com IA da Prime Pintura

O **Flandão** é o assistente virtual inteligente da Prime Pintura, focado em tirar dúvidas de clientes sobre tintas, acabamentos, preparação de superfícies e direcionar contatos para orçamento via WhatsApp.

---

## 📁 Arquivos Criados e Estrutura

- `flandao/flandao-widget.js`: Widget em JavaScript puro (vanilla JS), sem bibliotecas externas. Controla histórico em `sessionStorage`, sugestões de perguntas, envio assíncrono para a função serverless, acessibilidade (`dialog`, `aria-live`, `aria-expanded`, controle por teclado `Esc`) e eventos no GA4.
- `flandao/flandao-widget.css`: Folha de estilo escopada no seletor `.flandao` e variáveis CSS (`:root`). Design escuro alinhado à identidade da Prime Pintura, gradiente amarelo/laranja, totalmente responsivo (adaptado para mobile a partir de 375px) e respeitando `prefers-reduced-motion`.
- `netlify/functions/flandao.js`: Função serverless da Netlify (Node 18+ nativo com `fetch`). Responsável por intermediar com a API do Google Gemini (`gemini-2.5-flash`), aplicando proteção de CORS, timeout de 8,5 s, rate limiting em memória por IP (20/hora e 400/dia), corte seguro de mensagens em 500 caracteres e envio da chave no header `x-goog-api-key`.
- `test/flandao.test.js`: Bateria de testes automatizados locais (validações 200, 400, 403, 405, 429, 500, 503 e segurança da chave).
- `.env.example`: Exemplo de variáveis de ambiente do projeto.
- `.gitignore`: Protege `.env` e arquivos locais contra commit indesejado.

---

## 🚀 Como Rodar Localmente

### 1. Testes Automatizados da Função
Para testar a lógica do backend localmente:
```bash
node test/flandao.test.js
```

### 2. Rodar o Site e as Functions com Netlify Dev
Se você tiver o Netlify CLI instalado globalmente:
```bash
netlify dev --offline
```
Ou usando `npx`:
```bash
npx netlify-cli dev --offline
```
O site estará acessível em: `http://localhost:8888`.

---

## ⚙️ O que falta você fazer (Passos para Ativação)

1. **Obtenha a chave de API gratuita do Gemini:**
   - Acesse [Google AI Studio](https://aistudio.google.com/apikey) e crie uma nova chave.
2. **Configure o `.env` local para testar respostas reais:**
   - Crie um arquivo chamado `.env` na raiz do projeto (ele já está no `.gitignore` e não será versionado):
     ```env
     GEMINI_API_KEY=sua_chave_aqui
     GEMINI_MODEL=gemini-2.5-flash
     FLANDAO_ATIVO=sim
     ```
3. **Publicação / Produção no Netlify:**
   - No painel da sua conta Netlify, acesse seu site **Prime Pintura**.
   - Vá em **Site configuration** > **Environment variables**.
   - Adicione a variável `GEMINI_API_KEY` com o valor da sua chave.
   - Publique as alterações do projeto.
