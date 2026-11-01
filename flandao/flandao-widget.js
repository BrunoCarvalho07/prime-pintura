/**
 * Flandão Widget - Assistente de IA da Prime Pintura
 * JavaScript puro (vanilla JS), sem dependências.
 */

(function () {
  'use strict';

  // Configurações do WhatsApp da Prime Pintura
  const WHATSAPP_NUMERO = '5511913415626';
  const WHATSAPP_TEXTO = 'Olá! Vim pelo site e gostaria de um orçamento de pintura.';
  const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(WHATSAPP_TEXTO)}`;
  const API_ENDPOINT = '/.netlify/functions/flandao';
  const STORAGE_KEY = 'primepintura_flandao_historico_v1';
  const MAX_HISTORY = 10;
  const MAX_CHAR_LENGTH = 500;

  const BOAS_VINDAS = 'Oi! Eu sou o Flandão, assistente da Prime Pintura. Tire sua dúvida sobre tintas, acabamentos e preparação de parede, ou peça seu orçamento.';

  const SUGESTOES = [
    'Como preparar a parede para pintar?',
    'Que tinta usar na área externa?',
    'Quero um orçamento'
  ];

  // Estado interno
  let chatHistory = [];
  let isOpen = false;
  let isSending = false;

  // Elementos do DOM
  let containerEl = null;
  let fabEl = null;
  let panelEl = null;
  let messagesEl = null;
  let typingEl = null;
  let suggestionsEl = null;
  let formEl = null;
  let inputEl = null;
  let sendBtnEl = null;
  let closeBtnEl = null;

  // Utilitário de GA4 seguro
  function trackEvent(eventName, params) {
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventName, params || {});
      } catch (e) {
        // Ignora silenciosamente
      }
    }
  }

  // Manipulação de sessionStorage
  function loadHistory() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      // Falha de storage silenciosa
    }
    return null;
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (e) {
      // Ignora erro de quota ou modo privado estrito
    }
  }

  // Renderização de mensagem com textContent (nunca innerHTML)
  function renderMessage(papel, texto, isError) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flandao-msg ${papel === 'user' ? 'flandao-msg-user' : 'flandao-msg-assistant'}`;
    if (isError) {
      msgDiv.classList.add('flandao-msg-error');
    }
    msgDiv.textContent = texto;

    // Insere antes do typing indicator
    if (typingEl && typingEl.parentNode === messagesEl) {
      messagesEl.insertBefore(msgDiv, typingEl);
    } else {
      messagesEl.appendChild(msgDiv);
    }

    scrollToBottom();
  }

  function scrollToBottom() {
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function showTyping(show) {
    if (!typingEl) return;
    if (show) {
      typingEl.classList.add('flandao-visible');
    } else {
      typingEl.classList.remove('flandao-visible');
    }
    scrollToBottom();
  }

  function removeSuggestions() {
    if (suggestionsEl && suggestionsEl.parentNode) {
      suggestionsEl.parentNode.removeChild(suggestionsEl);
      suggestionsEl = null;
    }
  }

  function toggleChat(forceOpen) {
    const nextState = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;
    if (nextState === isOpen) return;

    isOpen = nextState;

    if (isOpen) {
      panelEl.classList.add('flandao-open');
      fabEl.setAttribute('aria-expanded', 'true');
      panelEl.removeAttribute('aria-hidden');
      trackEvent('flandao_aberto');
      setTimeout(() => {
        if (inputEl) inputEl.focus();
      }, 100);
    } else {
      panelEl.classList.remove('flandao-open');
      fabEl.setAttribute('aria-expanded', 'false');
      panelEl.setAttribute('aria-hidden', 'true');
      if (fabEl) fabEl.focus();
    }
  }

  async function handleSend(texto) {
    const cleanText = (texto || '').trim().slice(0, MAX_CHAR_LENGTH);
    if (!cleanText || isSending) return;

    // Remove sugestões no primeiro envio
    removeSuggestions();

    // Renderiza e guarda mensagem do usuário
    renderMessage('user', cleanText, false);
    chatHistory.push({ papel: 'user', texto: cleanText });
    saveHistory();

    trackEvent('flandao_mensagem');

    if (inputEl) {
      inputEl.value = '';
    }

    isSending = true;
    if (sendBtnEl) sendBtnEl.disabled = true;
    showTyping(true);

    try {
      // Envia no máximo as últimas 10 mensagens
      const payloadMensagens = chatHistory.slice(-MAX_HISTORY).map(m => ({
        papel: m.papel,
        texto: m.texto.slice(0, MAX_CHAR_LENGTH)
      }));

      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mensagens: payloadMensagens })
      });

      showTyping(false);

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const data = await res.json();
      const resposta = data && typeof data.resposta === 'string' ? data.resposta.trim() : '';

      if (!resposta) {
        throw new Error('Resposta vazia');
      }

      renderMessage('assistant', resposta, false);
      chatHistory.push({ papel: 'assistant', texto: resposta });
      saveHistory();
    } catch (err) {
      console.warn('[Flandão]', err);
      showTyping(false);
      const msgErroAmigavel = 'Não consegui processar sua dúvida agora, mas nossa equipe pode te atender prontamente! Toque no botão "Pedir orçamento no WhatsApp" logo abaixo para falar direto com a gente.';
      renderMessage('assistant', msgErroAmigavel, true);
    } finally {
      isSending = false;
      if (sendBtnEl) sendBtnEl.disabled = false;
      if (inputEl) inputEl.focus();
    }
  }

  function initUI() {
    containerEl = document.createElement('div');
    containerEl.className = 'flandao';

    // 1. Botão Flutuante (FAB)
    fabEl = document.createElement('button');
    fabEl.type = 'button';
    fabEl.className = 'flandao-fab';
    fabEl.setAttribute('aria-label', 'Abrir chat com o Flandão');
    fabEl.setAttribute('aria-expanded', 'false');
    fabEl.setAttribute('aria-controls', 'flandao-chat-panel');
    fabEl.innerHTML = `
      <span class="flandao-fab-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Zm0 14H5.17L4 17.17V4h16v12Z"/><path d="M7 9h10v2H7zm0-3h10v2H7z"/></svg>
      </span>
      <span class="flandao-badge" aria-hidden="true"></span>
    `;

    fabEl.addEventListener('click', () => toggleChat());

    // 2. Painel de Conversa
    panelEl = document.createElement('div');
    panelEl.id = 'flandao-chat-panel';
    panelEl.className = 'flandao-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'Chat Flandão - Assistente da Prime Pintura');
    panelEl.setAttribute('aria-hidden', 'true');

    // Cabeçalho
    const header = document.createElement('div');
    header.className = 'flandao-header';

    const headerInfo = document.createElement('div');
    headerInfo.className = 'flandao-header-info';

    const avatar = document.createElement('div');
    avatar.className = 'flandao-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = 'F';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'flandao-title-wrap';

    const title = document.createElement('div');
    title.className = 'flandao-title';
    title.textContent = 'Flandão';

    const subtitle = document.createElement('div');
    subtitle.className = 'flandao-subtitle';
    subtitle.innerHTML = '<span class="flandao-status-dot"></span> Assistente da Prime Pintura';

    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    headerInfo.appendChild(avatar);
    headerInfo.appendChild(titleWrap);

    closeBtnEl = document.createElement('button');
    closeBtnEl.type = 'button';
    closeBtnEl.className = 'flandao-close-btn';
    closeBtnEl.setAttribute('aria-label', 'Fechar chat do Flandão');
    closeBtnEl.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtnEl.addEventListener('click', () => toggleChat(false));

    header.appendChild(headerInfo);
    header.appendChild(closeBtnEl);

    // Mensagens (role="log" com aria-live="polite")
    messagesEl = document.createElement('div');
    messagesEl.className = 'flandao-messages';
    messagesEl.setAttribute('role', 'log');
    messagesEl.setAttribute('aria-live', 'polite');
    messagesEl.setAttribute('aria-atomic', 'false');
    messagesEl.setAttribute('aria-relevant', 'additions');

    // Digitando
    typingEl = document.createElement('div');
    typingEl.className = 'flandao-typing';
    typingEl.setAttribute('aria-label', 'Flandão está digitando...');
    typingEl.innerHTML = '<span class="flandao-dot"></span><span class="flandao-dot"></span><span class="flandao-dot"></span>';
    messagesEl.appendChild(typingEl);

    // Barra Fixa WhatsApp
    const ctaBar = document.createElement('div');
    ctaBar.className = 'flandao-cta-bar';

    const whatsappLink = document.createElement('a');
    whatsappLink.className = 'flandao-whatsapp-btn';
    whatsappLink.href = WHATSAPP_URL;
    whatsappLink.target = '_blank';
    whatsappLink.rel = 'noopener';
    whatsappLink.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.03c-.24.68-1.39 1.3-1.92 1.36-.49.06-1.1.09-1.78-.11a16.3 16.3 0 0 1-1.6-.6c-2.82-1.22-4.66-4.06-4.8-4.25-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07.99-2.35.26-.28.57-.35.76-.35h.55c.18 0 .42-.07.65.5.24.58.82 1.99.89 2.13.07.14.12.31.02.5-.09.19-.14.31-.28.47-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.89 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.86-1.06.18-.28.35-.23.6-.14.24.09 1.55.73 1.82.86.26.14.44.2.5.32.07.12.07.68-.17 1.36Z"/></svg>
      <span>Pedir orçamento no WhatsApp</span>
    `;
    whatsappLink.addEventListener('click', () => {
      trackEvent('whatsapp_click', { origem: 'flandao' });
    });
    ctaBar.appendChild(whatsappLink);

    // Formulário de Envio
    formEl = document.createElement('form');
    formEl.className = 'flandao-form';
    formEl.setAttribute('role', 'search'); // ou envio neutro
    formEl.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSend(inputEl.value);
    });

    inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.className = 'flandao-input';
    inputEl.placeholder = 'Pergunte sobre tintas, paredes ou orçamento...';
    inputEl.setAttribute('aria-label', 'Digite sua mensagem para o Flandão');
    inputEl.maxLength = MAX_CHAR_LENGTH;

    sendBtnEl = document.createElement('button');
    sendBtnEl.type = 'submit';
    sendBtnEl.className = 'flandao-send-btn';
    sendBtnEl.setAttribute('aria-label', 'Enviar mensagem');
    sendBtnEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

    formEl.appendChild(inputEl);
    formEl.appendChild(sendBtnEl);

    // Monta o painel
    panelEl.appendChild(header);
    panelEl.appendChild(messagesEl);
    panelEl.appendChild(ctaBar);
    panelEl.appendChild(formEl);

    // Fecha ao pressionar Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        toggleChat(false);
      }
    });

    containerEl.appendChild(fabEl);
    containerEl.appendChild(panelEl);
    document.body.appendChild(containerEl);

    // Carrega histórico ou inicia boas-vindas
    const saved = loadHistory();
    if (saved && saved.length > 0) {
      chatHistory = saved;
      for (const item of chatHistory) {
        renderMessage(item.papel, item.texto, false);
      }
    } else {
      // Inicia com boas-vindas e sugestões
      renderMessage('assistant', BOAS_VINDAS, false);

      suggestionsEl = document.createElement('div');
      suggestionsEl.className = 'flandao-suggestions';

      const sugTitle = document.createElement('div');
      sugTitle.className = 'flandao-suggestions-title';
      sugTitle.textContent = 'Dúvidas frequentes:';
      suggestionsEl.appendChild(sugTitle);

      SUGESTOES.forEach((sugText) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'flandao-chip';
        chip.textContent = sugText;
        chip.addEventListener('click', () => {
          handleSend(sugText);
        });
        suggestionsEl.appendChild(chip);
      });

      messagesEl.insertBefore(suggestionsEl, typingEl);
    }
  }

  // Inicialização no DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
