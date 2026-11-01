# Prime Pintura — Site Institucional

Site institucional em uma página (one-page) para a **Prime Pintura**, empresa de
pintura residencial e comercial que atende a região da Guilhermina e toda a
capital de São Paulo.

🔗 **Produção:** [pinturaprime.com.br](https://pinturaprime.com.br/)

---

## Stack

HTML, CSS e JavaScript **puros** — sem framework, sem build step, sem
dependências externas de JS. Só Google Fonts é carregado via CDN. Isso
mantém o site leve, rápido de carregar em 3G/4G, e fácil de hospedar em
qualquer lugar (Netlify, Vercel, GitHub Pages, etc).

```
index.html          → toda a estrutura e conteúdo da página
css/style.css       → design tokens, layout e todas as animações
js/script.js        → toda a interatividade (vanilla JS, sem libs)
flandao/            → widget de chat IA "Flandão" (flandao-widget.js e flandao-widget.css)
netlify/functions/  → função serverless (flandao.js) integrada com a API do Google Gemini
assets/             → vídeos, imagens, logo e fontes locais
robots.txt          → diretivas de indexação para buscadores
sitemap.xml         → mapa do site para SEO
```

## Estrutura de pastas

```
assets/
├── frames-hero/     80 frames extraídos do vídeo do Hero (scroll-scrubbing)
├── gallery/          5 fotos reais de projetos (seção "Fotos")
├── img/               logo do preloader + imagem de capa (Open Graph)
├── logo/               logo em 3 versões: colorida, clara (header) e favicon
└── video/                3 vídeos em loop (mp4 + webm) + capas (poster)
```

## Como rodar localmente

Não precisa de instalação nem build — é só servir os arquivos estáticos.
Abrir o `index.html` direto no navegador (`file://`) **não funciona bem**
por causa do `fetch` dos frames do Hero (bloqueado por CORS em `file://`),
então suba um servidor local simples:

```bash
# Python (já vem instalado na maioria dos sistemas)
python3 -m http.server 8000

# ou, com Node instalado
npx serve .
```

Depois acesse `http://localhost:8000`.

## Deploy

O site é 100% estático — qualquer host de arquivos estáticos serve.
Hospedado atualmente na **Netlify**: basta conectar este repositório e
fazer deploy sem nenhuma configuração de build (publish directory = raiz
do projeto).

---

## Principais funcionalidades

- **Assistente Virtual com IA "Flandão"** — chat inteligente integrado via Netlify
  Function com o Google Gemini (`gemini-3.5-flash`), respondendo dúvidas sobre preparação
  de paredes, tintas, umidade/mofo e serviços da empresa em São Paulo/Guilhermina,
  direcionando orçamentos para o WhatsApp. Possui histórico em `sessionStorage`,
  perguntas frequentes rápidas, rate limiting em memória, corte de segurança em 500 caracteres
  e total acessibilidade (`role="dialog"`, `role="log"`, `aria-live`, controle por `Esc`).
- **Hero cinematográfico com scroll-scrubbing** — 80 frames extraídos de um
  vídeo são desenhados num `<canvas>` conforme o usuário rola a página,
  criando o efeito de "vídeo controlado pelo scroll" sem o travamento comum
  de `<video>.currentTime` em Safari/mobile. Combinado com um leve efeito
  de perspectiva 3D (`rotateX` + escala) sincronizado ao scroll.
- **Textos narrativos no Hero** — frases aparecem e "sobem" pela tela
  conforme o progresso do scroll dentro da cena, sem sobrepor o título.
- **3 seções de vídeo em loop** (laranja, amarelo, azul) — cada uma com
  parallax sutil no vídeo e o texto surgindo/sumindo suavemente conforme a
  seção passa pelo centro da tela.
- **Indicador de "rolo de tinta"** — trilha lateral fixa que se preenche
  com gradiente conforme o progresso de leitura da página inteira.
- **Tema claro/escuro** — alternável, com preferência salva em
  `localStorage`. O header é sempre um "chrome" escuro fixo (não muda de
  tema) para garantir contraste do logo sobre o vídeo; o tema afeta as
  seções de conteúdo e o menu mobile.
- **Preloader com efeito neon** — tela de carregamento com o logo, anel
  giratório, brilho pulsante, anéis de pulso (sonar) e um reflexo de luz
  que atravessa o logo, inspirado no site do GTA VI.
- **Galeria com lightbox** — fotos reais dos projetos, com navegação entre
  fotos abertas (setas e teclado) e efeito de brilho no hover.
- **Avaliações do Google** — baseadas nas avaliações reais do perfil da
  empresa (nota e volume reais), com conteúdo reescrito.
- **Menu mobile** — overlay com fundo translúcido (glassmorphism), links
  numerados, botão de fechar e tema/hambúrguer agrupados.
- **Botões flutuantes** — WhatsApp e Instagram, fixos na lateral, com
  pulso periódico chamando atenção.
- **SEO** — meta tags completas, Open Graph, dados estruturados JSON-LD
  (`LocalBusiness`, endereço, área de atendimento, nota de avaliação),
  `robots.txt` e `sitemap.xml`.
- **Acessibilidade** — navegação por teclado, `prefers-reduced-motion`
  respeitado em todas as animações, skip link, `aria-label`s.

## Convenções de código

- Todo o CSS usa **design tokens** (variáveis CSS em `:root`) para cor,
  tipografia e espaçamento — evite valores soltos, use as variáveis
  existentes.
- JS organizado em **módulos por função** (um `init...()` por
  funcionalidade), todos chamados a partir do único listener
  `DOMContentLoaded` no topo do arquivo.
- Comentários em português explicando o **porquê** das decisões técnicas,
  não só o *o quê* — especialmente em trechos não óbvios (scroll-scrubbing,
  cálculo de progresso, máscaras de CSS).

## Pendências conhecidas

- Um card da seção "Fotos" ainda está com placeholder genérico (sem foto

---

Desenvolvido por [Bruno Carvalho](https://www.linkedin.com/in/bruno-carvalho-silvaa).
