/**
 * PRIME PINTURA — script.js
 * Vanilla JS, sem dependências externas (mantém o site leve e rápido em 3G/4G).
 *
 * Tema claro/escuro e menu mobile agora são controlados pelo Alpine.js
 * (ver <script> no <head> do index.html, componente ppApp()) — são só
 * toggles de estado simples, mais legíveis como diretivas no HTML.
 *
 * Módulos deste arquivo:
 *  1. Header: muda de transparente para sólido ao rolar
 *  3. Hero scroll-scrubbing: desenha o frame correto do vídeo de tinta laranja
 *     num <canvas> conforme a posição do scroll dentro da seção Hero,
 *     e ativa os textos narrativos (hero-story) por faixa de progresso
 *  4. Indicador de "rolo de tinta": preenche a trilha lateral conforme
 *     o progresso de leitura da página inteira
 *  5. Vídeos em loop (seções de vídeo laranja/amarela/azul): parallax sutil
 *     no vídeo + entrada/saída suave do texto conforme a seção passa pelo
 *     centro da tela (mesmo espírito visual da seção 1)
 *  6. Carrossel de avaliações: arrastável com mouse/touch
 *  7. Lightbox: amplia a foto da galeria ao clicar
 *  8. Reveal on scroll: fade/slide leve para elementos ao entrarem na tela
 *  9. Preloader: tela de carregamento com o logo, some quando a página
 *     termina de carregar (estilo do site do GTA VI)
 */

document.addEventListener("DOMContentLoaded", () => {
  initPreloader();
  initHeader();
  initHeroScrubbing();
  initScrollRoller();
  initVideoParallax();
  initReviewsDrag();
  initRevealOnScroll();
  initLightbox();
  initWhatsAppTracking();
  setYear();
});

/* ---------- 9. PRELOADER ---------- */
/**
 * Fica visível por pelo menos MIN_DISPLAY_MS (pra não "piscar" em conexões
 * rápidas, mesmo carregamento sendo instantâneo) e some assim que a página
 * inteira carregar (window "load" — inclui imagens, vídeos com preload, etc)
 * ou depois de um tempo máximo de segurança, o que vier primeiro, pra nunca
 * travar o visitante numa tela preta caso algum recurso demore demais.
 */
function initPreloader() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  const MIN_DISPLAY_MS = 900;
  const MAX_WAIT_MS = 4000;
  const startedAt = Date.now();
  let done = false;

  function hide() {
    if (done) return;
    done = true;
    const elapsed = Date.now() - startedAt;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    setTimeout(() => preloader.classList.add("is-done"), remaining);
  }

  window.addEventListener("load", hide);
  setTimeout(hide, MAX_WAIT_MS); // rede de segurança
}



/* ---------- 0.1 RASTREAMENTO DE CLIQUE NO WHATSAPP (GA4) ---------- */
/**
 * Dispara um evento "whatsapp_click" no Analytics sempre que alguém clica
 * em qualquer botão/link do WhatsApp do site (hero, CTA final, rodapé,
 * botão flutuante). Assim dá pra ver no GA4 quantos visitantes realmente
 * entraram em contato, não só quantos visitaram a página.
 */
function initWhatsAppTracking() {
  document.querySelectorAll('a[href*="wa.me"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (typeof gtag === "function") {
        gtag("event", "whatsapp_click", {
          event_category: "contato",
          event_label: link.className || link.closest("section")?.id || "whatsapp",
        });
      }
    });
  });
}

/* ---------- 1. HEADER ---------- */
function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- 3. HERO SCROLL-SCRUBBING ---------- */
/**
 * Técnica: uma sequência de imagens (frames extraídos do vídeo de tinta
 * laranja) é pré-carregada. Enquanto a seção .hero-wrapper (400vh) rola,
 * calculamos o progresso (0 a 1) e desenhamos o frame correspondente no
 * canvas. Isso cria o efeito "cinematográfico" de vídeo controlado pelo
 * scroll, sem o travamento comum de <video>.currentTime em mobile/Safari.
 */
function initHeroScrubbing() {
  const wrapper = document.querySelector(".hero-wrapper");
  const canvas = document.getElementById("hero-canvas");
  if (!wrapper || !canvas) return;

  const ctx = canvas.getContext("2d");
  const FRAME_COUNT = 80; // quantidade de frames extraídos do vídeo (mais frames = scrubbing mais suave)
  const framePath = (i) =>
    `assets/frames-hero/frame_${String(i + 1).padStart(3, "0")}.webp`;

  const images = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let ready = false;

  function preload() {
    // Carrega os primeiros frames (cobrem o começo do scroll) imediatamente,
    // e o resto em segundo plano — evita baixar os 80 frames de uma vez só
    // na primeira visita, o que pesava no carregamento inicial da página.
    const PRIORITY_COUNT = 12;

    function loadFrame(i) {
      const img = new Image();
      img.src = framePath(i);
      img.onload = () => {
        loadedCount++;
        if (loadedCount === 1) drawFrame(0); // mostra algo assim que possível
        if (loadedCount === FRAME_COUNT) ready = true;
      };
      images[i] = img;
    }

    const schedule =
      window.requestIdleCallback || ((fn) => setTimeout(fn, 200));

    for (let i = 0; i < Math.min(PRIORITY_COUNT, FRAME_COUNT); i++) loadFrame(i);

    let next = PRIORITY_COUNT;
    function loadNextBatch() {
      const end = Math.min(next + 6, FRAME_COUNT);
      for (; next < end; next++) loadFrame(next);
      if (next < FRAME_COUNT) schedule(loadNextBatch, { timeout: 500 });
    }
    if (next < FRAME_COUNT) schedule(loadNextBatch, { timeout: 500 });
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawFrame(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;

    let dw, dh, dx, dy;
    if (ir > cr) {
      dh = ch; dw = ch * ir; dx = (cw - dw) / 2; dy = 0;
    } else {
      dw = cw; dh = cw / ir; dx = 0; dy = (ch - dh) / 2;
    }
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = wrapper.getBoundingClientRect();
      const total = wrapper.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const progress = total > 0 ? scrolled / total : 0;
      const frameIndex = Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT));
      drawFrame(frameIndex);
      updateHeroStory(progress);
      update3DTilt(canvas, progress);
      ticking = false;
    });
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    if (ready) onScroll();
  });

  resizeCanvas();
  preload();
  updateHeroStory(0); // estado inicial: título visível, textos do scroll ocultos
  update3DTilt(canvas, 0);
  window.addEventListener("scroll", onScroll, { passive: true });
}

/**
 * Efeito 3D do Hero: uma leve rotação em X + escala aplicada ao canvas,
 * decrescendo conforme o progresso do scroll — começa com uma inclinação
 * sutil de "câmera olhando de cima" e assenta reto no fim da cena. Como o
 * .hero-pin tem perspective definida no CSS, esse rotateX gera profundidade
 * real (não é só um efeito 2D), combinando com o vídeo original que já é
 * um render 3D de latas de tinta.
 */
function update3DTilt(canvas, progress) {
  const tilt = 4 * (1 - progress); // graus: começa em 4°, chega a 0°
  const scale = 1.06 - progress * 0.06; // começa levemente ampliado, assenta em 1.0
  canvas.style.transform = `rotateX(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
}

/**
 * Anima o título inicial e os textos do hero-story em função direta do
 * progresso do scroll (0 a 1) — sem depender de transições CSS soltas,
 * pra o movimento ficar exatamente grudado na rolagem (sensação de
 * "puxar" o texto para cima conforme desce a página). Cada elemento com
 * [data-range="inicio,fim"] fica: invisível e 40px abaixo antes do
 * intervalo → sobe e aparece → fica parado e legível durante o intervalo
 * → continua subindo e desaparece depois do intervalo.
 */
function updateHeroStory(progress) {
  const items = document.querySelectorAll(".hero-content[data-range], .hero-story__item[data-range]");
  items.forEach((item) => {
    const [start, end] = item.dataset.range.split(",").map(Number);
    const span = Math.max(end - start, 0.001);
    const fade = Math.min(span * 0.35, 0.045);

    let opacity = 0;
    let travel = 40; // px: desce/sobe fora do intervalo visível

    if (progress < start - fade || progress > end + fade) {
      opacity = 0;
      travel = progress <= start ? 40 : -40;
    } else if (progress < start) {
      const k = (progress - (start - fade)) / fade;
      opacity = k;
      travel = (1 - k) * 40;
    } else if (progress > end) {
      const k = (progress - end) / fade;
      opacity = 1 - k;
      travel = -k * 40;
    } else {
      opacity = 1;
      travel = 0;
    }

    item.style.opacity = opacity.toFixed(3);
    item.style.transform = `translateY(${travel.toFixed(1)}px)`;
    item.style.pointerEvents = opacity > 0.6 ? "auto" : "none";
  });

  // A "role para começar" some assim que a rolagem começa de verdade
  const cue = document.querySelector(".hero-scrollcue");
  if (cue) cue.style.opacity = progress > 0.03 ? "0" : "1";
}

/* ---------- 4. INDICADOR "ROLO DE TINTA" ---------- */
function initScrollRoller() {
  const fill = document.querySelector(".scroll-roller__fill");
  const icon = document.querySelector(".scroll-roller__icon");
  if (!fill || !icon) return;

  let ticking = false;
  function update() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const progress = total > 0 ? window.scrollY / total : 0;
      const pct = Math.min(100, Math.max(0, progress * 100));
      fill.style.height = pct + "%";
      icon.style.bottom = pct + "%";
      ticking = false;
    });
  }
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

/* ---------- 5. PARALLAX DOS VÍDEOS EM LOOP ("Cores sob medida" e "Confiança") ---------- */
/**
 * Suporta múltiplas seções .video-feature na página (amarela e azul) —
 * cada uma tem seu próprio deslocamento calculado de forma independente.
 */
function initVideoParallax() {
  const sections = document.querySelectorAll(".video-feature");
  if (!sections.length) return;

  let ticking = false;
  function update() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      sections.forEach((section) => {
        const video = section.querySelector("video");
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;

        if (video && rect.top < vh && rect.bottom > 0) {
          const progress = 1 - (rect.top + rect.height / 2) / (vh + rect.height / 2);
          const offset = (progress - 0.5) * 60; // desloca até 30px pra cada lado
          video.style.transform = `translateY(${offset}px) scale(1.15)`;
        }

        updateScrollReveal(section);
      });
      ticking = false;
    });
  }
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  // Autoplay costuma exigir vídeo mudo + playsinline; garante que toca
  // mesmo se o navegador pausar por economia de dados.
  sections.forEach((section) => {
    section.querySelector("video")?.play?.().catch(() => {});
  });
}

/**
 * Anima o conteúdo (título + texto) de cada seção de vídeo em função
 * contínua da posição de rolagem — mesmo espírito visual da seção 1: a
 * informação "aparece por cima do vídeo" conforme a seção entra no centro
 * da tela, e desaparece suavemente conforme ela sai, subindo um pouco
 * (translateY) enquanto some. Diferente do hero, aqui não há pin de 400vh:
 * o efeito acompanha o card normal da seção enquanto ele passa pela tela,
 * mantendo a página em um tamanho razoável para navegação e SEO.
 */
function updateScrollReveal(section) {
  const content = section.querySelector("[data-scroll-reveal]");
  if (!content) return;

  const rect = section.getBoundingClientRect();
  const vh = window.innerHeight;
  const sectionCenter = rect.top + rect.height / 2;
  const viewportCenter = vh / 2;
  const maxDist = vh / 2 + rect.height / 2;
  const dist = Math.abs(sectionCenter - viewportCenter);

  // t = 1 quando a seção está centralizada na tela, 0 quando está fora
  const t = Math.max(0, 1 - dist / maxDist);
  const eased = t * t * (3 - 2 * t); // smoothstep — entrada/saída suave, sem "solavanco"

  content.style.opacity = eased.toFixed(3);
  content.style.transform = `translateY(${((1 - eased) * 34).toFixed(1)}px)`;
}

/* ---------- 6. CARROSSEL DE AVALIAÇÕES (arrastável) ---------- */
function initReviewsDrag() {
  const track = document.querySelector(".reviews-track");
  if (!track) return;

  let isDown = false;
  let startX = 0;
  let scrollStart = 0;

  const start = (x) => {
    isDown = true;
    startX = x;
    scrollStart = track.scrollLeft;
    track.classList.add("is-dragging");
  };
  const move = (x) => {
    if (!isDown) return;
    track.scrollLeft = scrollStart - (x - startX);
  };
  const end = () => {
    isDown = false;
    track.classList.remove("is-dragging");
  };

  track.addEventListener("mousedown", (e) => start(e.pageX));
  window.addEventListener("mousemove", (e) => move(e.pageX));
  window.addEventListener("mouseup", end);

  track.addEventListener("touchstart", (e) => start(e.touches[0].pageX), { passive: true });
  track.addEventListener("touchmove", (e) => move(e.touches[0].pageX), { passive: true });
  track.addEventListener("touchend", end);
}

/* ---------- 7. LIGHTBOX (ampliar foto da galeria) ---------- */
function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  const imgEl = document.getElementById("lightbox-img");
  const captionEl = document.getElementById("lightbox-caption");
  const closeBtn = lightbox?.querySelector(".lightbox-close");
  const prevBtn = lightbox?.querySelector(".lightbox-prev");
  const nextBtn = lightbox?.querySelector(".lightbox-next");
  const triggers = Array.from(document.querySelectorAll("[data-lightbox]"));
  if (!lightbox || !imgEl || !triggers.length) return;

  let lastFocused = null;
  let currentIndex = 0;

  // Some as setas de navegação se houver só uma foto na galeria
  const hasMultiple = triggers.length > 1;
  if (!hasMultiple) {
    prevBtn?.setAttribute("hidden", "");
    nextBtn?.setAttribute("hidden", "");
  }

  function render(index) {
    currentIndex = (index + triggers.length) % triggers.length; // navegação circular
    const trigger = triggers[currentIndex];
    imgEl.src = trigger.dataset.lightbox;
    imgEl.alt = trigger.dataset.caption || "";
    captionEl.textContent = trigger.dataset.caption || "";
  }

  function open(index) {
    lastFocused = document.activeElement;
    render(index);
    lightbox.hidden = false;
    // pequeno delay pra permitir a transição de opacidade/escala rodar
    requestAnimationFrame(() => lightbox.classList.add("is-open"));
    document.body.classList.add("menu-open"); // reaproveita o "trava scroll"
    closeBtn?.focus();
  }

  function close() {
    lightbox.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    setTimeout(() => {
      lightbox.hidden = true;
      imgEl.src = "";
    }, 300);
    lastFocused?.focus();
  }

  triggers.forEach((trigger, index) => {
    trigger.addEventListener("click", () => open(index));
  });

  prevBtn?.addEventListener("click", () => render(currentIndex - 1));
  nextBtn?.addEventListener("click", () => render(currentIndex + 1));

  closeBtn?.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close(); // clique fora da imagem fecha
  });
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") close();
    if (hasMultiple && e.key === "ArrowLeft") render(currentIndex - 1);
    if (hasMultiple && e.key === "ArrowRight") render(currentIndex + 1);
  });
}

/* ---------- 8. REVEAL ON SCROLL ---------- */
function initRevealOnScroll() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => io.observe(el));
}

/* ---------- Ano dinâmico no rodapé ---------- */
function setYear() {
  const el = document.getElementById("current-year");
  if (el) el.textContent = new Date().getFullYear();
}
