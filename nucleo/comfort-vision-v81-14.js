"use strict";

(() => {
  const VERSION = "v81.14";
  const KEY_MODE = "memory:vision:mode";
  const KEY_TEXT = "memory:vision:text-size";

  const MODES = {
    auto: {
      label: "Automático",
      icon: "◐",
      description: "Usa escuro suave de dia e reduz ainda mais brilho/saturação à noite."
    },
    dark: {
      label: "Escuro suave",
      icon: "☾",
      description: "Fundo azul-marinho suave, texto sem branco puro e menos contraste extremo."
    },
    light: {
      label: "Leitura clara",
      icon: "☀",
      description: "Fundo bege claro e texto azul-grafite para Bíblia, Devocional, Inglês e leituras longas."
    },
    original: {
      label: "Memory original",
      icon: "M",
      description: "Volta às cores originais do Memory."
    }
  };

  const TEXT_SIZES = {
    normal: "A",
    plus: "A+",
    plus2: "A++"
  };

  let panel = null;
  let trigger = null;
  let mode = localStorage.getItem(KEY_MODE) || "auto";
  let textSize = localStorage.getItem(KEY_TEXT) || "normal";
  let autoTimer = null;

  if (!MODES[mode]) mode = "auto";
  if (!TEXT_SIZES[textSize]) textSize = "normal";

  function autoPhase(date = new Date()) {
    const minutes = date.getHours() * 60 + date.getMinutes();

    // 18:30 → 06:59 = modo noturno.
    if (minutes >= 18 * 60 + 30 || minutes < 7 * 60) {
      return "comfort-night";
    }

    return "comfort-day";
  }

  function effectiveMode() {
    if (mode === "auto") return autoPhase();
    if (mode === "dark") return "comfort-day";
    if (mode === "light") return "reading-light";
    return "original";
  }

  function phaseLabel() {
    const effective = effectiveMode();

    if (mode !== "auto") {
      return `Modo atual: ${MODES[mode].label}.`;
    }

    if (effective === "comfort-night") {
      return "Automático: modo noturno ativo (18:30–07:00). Menos brilho e menos saturação.";
    }

    return "Automático: modo diurno ativo (07:00–18:30). Escuro suave e confortável.";
  }

  function apply() {
    const html = document.documentElement;
    const effective = effectiveMode();

    html.dataset.memoryVision = effective;
    html.dataset.memoryTextSize = textSize;
    html.dataset.memoryVisionPreference = mode;

    localStorage.setItem(KEY_MODE, mode);
    localStorage.setItem(KEY_TEXT, textSize);

    renderState();

    window.dispatchEvent(
      new CustomEvent("memory:vision-changed", {
        detail: {
          preference: mode,
          effective,
          textSize,
          version: VERSION
        }
      })
    );
  }

  function chooseMode(next) {
    if (!MODES[next]) return;
    mode = next;
    apply();
  }

  function chooseTextSize(next) {
    if (!TEXT_SIZES[next]) return;
    textSize = next;
    apply();
  }

  function renderState() {
    if (!panel) return;

    panel.querySelectorAll("[data-vision-mode]").forEach(button => {
      const active = button.dataset.visionMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));

      const check = button.querySelector(".memory-vision-option__check");
      if (check) check.textContent = active ? "✓" : "";
    });

    panel.querySelectorAll("[data-vision-text]").forEach(button => {
      const active = button.dataset.visionText === textSize;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    const status = panel.querySelector("[data-vision-auto-status]");
    if (status) status.textContent = phaseLabel();

    if (trigger) {
      const meta = MODES[mode] || MODES.auto;
      trigger.title = `Conforto visual · ${meta.label}`;
      trigger.setAttribute(
        "aria-label",
        `Abrir conforto visual. ${phaseLabel()}`
      );
    }
  }

  function optionHtml(key, meta) {
    return `
      <button
        type="button"
        class="memory-vision-option"
        data-vision-mode="${key}"
        aria-pressed="false"
      >
        <span class="memory-vision-option__icon">${meta.icon}</span>
        <span class="memory-vision-option__copy">
          <strong>${meta.label}</strong>
          <small>${meta.description}</small>
        </span>
        <span class="memory-vision-option__check"></span>
      </button>
    `;
  }

  function buildPanel() {
    if (document.querySelector("[data-memory-vision-panel]")) {
      return;
    }

    trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "memory-vision-trigger";
    trigger.setAttribute("data-memory-vision-trigger", "");
    trigger.innerHTML = `
      <span aria-hidden="true">◐</span>
      <i class="memory-vision-trigger__dot" aria-hidden="true"></i>
    `;

    const backdrop = document.createElement("div");
    backdrop.className = "memory-vision-backdrop";
    backdrop.hidden = true;
    backdrop.setAttribute("data-memory-vision-backdrop", "");

    backdrop.innerHTML = `
      <section
        class="memory-vision-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-vision-title"
        data-memory-vision-panel
      >
        <header class="memory-vision-panel__head">
          <div>
            <span class="memory-vision-panel__eyebrow">MEMORY · CONFORTO VISUAL</span>
            <h2 id="memory-vision-title">Escolha como seus olhos descansam melhor</h2>
            <p>Reduzimos branco/preto puros, brilho, contraste extremo e neon sem perder a identidade do Memory.</p>
          </div>
          <button
            type="button"
            class="memory-vision-close"
            data-memory-vision-close
            aria-label="Fechar"
          >×</button>
        </header>

        <div class="memory-vision-options">
          ${Object.entries(MODES).map(([key,meta]) => optionHtml(key,meta)).join("")}
        </div>

        <div class="memory-vision-section">
          <span>Tamanho de leitura</span>
          <div class="memory-vision-text-size">
            ${Object.entries(TEXT_SIZES).map(([key,label]) => `
              <button type="button" data-vision-text="${key}" aria-pressed="false">
                ${label}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="memory-vision-section">
          <span>Automático</span>
          <div class="memory-vision-auto-status" data-vision-auto-status></div>
        </div>

        <p class="memory-vision-note">
          Este recurso é de conforto visual e não substitui avaliação ou correção oftalmológica.
        </p>
      </section>
    `;

    document.body.append(trigger, backdrop);

    panel = backdrop.querySelector("[data-memory-vision-panel]");

    function openPanel() {
      backdrop.hidden = false;
      renderState();
      requestAnimationFrame(() => {
        panel?.querySelector("[data-memory-vision-close]")?.focus();
      });
    }

    function closePanel() {
      backdrop.hidden = true;
      trigger?.focus();
    }

    trigger.addEventListener("click", openPanel);

    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closePanel();
    });

    panel.querySelector("[data-memory-vision-close]")?.addEventListener("click", closePanel);

    panel.querySelectorAll("[data-vision-mode]").forEach(button => {
      button.addEventListener("click", () => {
        chooseMode(button.dataset.visionMode);
      });
    });

    panel.querySelectorAll("[data-vision-text]").forEach(button => {
      button.addEventListener("click", () => {
        chooseTextSize(button.dataset.visionText);
      });
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !backdrop.hidden) {
        closePanel();
      }
    });

    renderState();
  }

  function syncAuto() {
    if (mode !== "auto") return;

    const before = document.documentElement.dataset.memoryVision;
    const after = effectiveMode();

    if (before !== after) {
      apply();
    } else {
      renderState();
    }
  }

  function startAutoClock() {
    if (autoTimer) clearInterval(autoTimer);

    autoTimer = setInterval(
      syncAuto,
      5 * 60 * 1000
    );

    window.addEventListener("focus", syncAuto, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) syncAuto();
    });
  }

  function init() {
    apply();

    if (document.body) {
      buildPanel();
      startAutoClock();
      return;
    }

    window.addEventListener(
      "DOMContentLoaded",
      () => {
        buildPanel();
        startAutoClock();
      },
      { once: true }
    );
  }

  window.MemoryVision = {
    version: VERSION,
    get mode() { return mode; },
    get effectiveMode() { return effectiveMode(); },
    get textSize() { return textSize; },
    setMode: chooseMode,
    setTextSize: chooseTextSize,
    refresh: syncAuto
  };

  init();
})();
