"use strict";

(() => {
  const VERSION = "v81.13.4";
  const PROTOCOL_URL = "memory-ingles://corrigir";
  const TRIGGER_ATTR = "data-memory-english-demand-trigger";
  const ACTION_SELECTOR = "[data-daily-finish]";
  const WAIT_SELECTOR = "[data-daily-analysis] .english-ai-wait";
  const PENDING_TEXTS = [
    "Atividade enviada para a IA",
    "Aguardando correção da IA",
    "Atividade enviada para correção"
  ];

  let lastTriggerAt = 0;

  function isWindows() {
    const platform = String(
      navigator.userAgentData?.platform
      || navigator.platform
      || navigator.userAgent
      || ""
    ).toLowerCase();

    return platform.includes("win");
  }

  function pendingSignal() {
    const wait = document.querySelector(WAIT_SELECTOR);
    const button = document.querySelector(ACTION_SELECTOR);

    const text = [
      wait?.textContent || "",
      button?.textContent || ""
    ].join(" ");

    return PENDING_TEXTS.some(item => text.includes(item));
  }

  function fireProtocol() {
    if (!isWindows()) return false;

    const now = Date.now();

    // Evita dois disparos na mesma finalização.
    if (now - lastTriggerAt < 5000) return true;
    lastTriggerAt = now;

    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.setAttribute("aria-hidden", "true");
    iframe.src = `${PROTOCOL_URL}?ts=${now}`;

    document.body.appendChild(iframe);

    setTimeout(() => {
      iframe.remove();
    }, 2500);

    return true;
  }

  function toast(message) {
    window.MMCDUI?.toast?.(message);
  }

  async function waitForSuccessfulSubmission(maxMs = 6500) {
    const started = Date.now();

    while (Date.now() - started < maxMs) {
      if (pendingSignal()) {
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 250));
    }

    return false;
  }

  async function handleFinishClick(event) {
    const button = event.target.closest?.(ACTION_SELECTOR);

    if (!button) return;

    // O submit original do Memory continua responsável por validar e salvar.
    // Esta camada apenas observa se ele realmente entrou em "pendente".
    const success = await waitForSuccessfulSubmission();

    if (!success) {
      return;
    }

    if (fireProtocol()) {
      toast("Atividade finalizada. Iniciando a correção da IA agora.");
    } else {
      toast("Atividade salva. Para corrigir agora, abra o Memory no PC.");
    }
  }

  function makePendingButton() {
    if (!isWindows()) return;

    const finish = document.querySelector(ACTION_SELECTOR);
    const wait = document.querySelector(WAIT_SELECTOR);

    if (!finish || !wait) return;
    if (!pendingSignal()) return;

    if (document.querySelector(`[${TRIGGER_ATTR}]`)) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.setAttribute(TRIGGER_ATTR, "");
    button.textContent = "Corrigir agora com IA";

    button.addEventListener("click", () => {
      if (fireProtocol()) {
        button.disabled = true;
        button.textContent = "Correção iniciada";
        toast("Corretor do Inglês acionado.");
        setTimeout(() => {
          button.disabled = false;
          button.textContent = "Corrigir agora com IA";
        }, 5000);
      }
    });

    finish.insertAdjacentElement("afterend", button);
  }

  function updatePendingHint() {
    const wait = document.querySelector(WAIT_SELECTOR);

    if (!wait) return;

    const paragraph = wait.querySelector("p");

    if (!paragraph) return;

    if (isWindows()) {
      paragraph.textContent =
        "A atividade foi salva. A correção é acionada somente quando você finaliza ou toca em “Corrigir agora com IA”. Não existe mais verificação automática a cada 5 minutos.";
    } else {
      paragraph.textContent =
        "A atividade foi salva. Como a chave da IA continua protegida no PC, a correção será processada quando você abrir esta atividade no PC e tocar em “Corrigir agora com IA”.";
    }
  }

  function refresh() {
    makePendingButton();
    updatePendingHint();
  }

  document.addEventListener(
    "click",
    event => {
      handleFinishClick(event).catch(error => {
        console.warn("Memory Inglês V81.13.4: gatilho sob demanda falhou.", error);
      });
    },
    true
  );

  const observer = new MutationObserver(() => {
    refresh();
  });

  function init() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.MemoryEnglishDemandCorrection = {
    version: VERSION,
    trigger: fireProtocol,
    refresh
  };
})();
