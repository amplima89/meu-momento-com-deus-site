"use strict";

(() => {
  const VERSION = "v81.14.1";
  const KEY = "memory:comfort-palette-enabled";

  // Limpa apenas o modo antigo criado pela V81.14.
  // As paletas originais do Memory não são tocadas.
  document.documentElement.removeAttribute("data-memory-vision");
  document.documentElement.removeAttribute("data-memory-text-size");
  document.documentElement.removeAttribute("data-memory-vision-preference");

  try {
    localStorage.removeItem("memory:vision:mode");
    localStorage.removeItem("memory:vision:text-size");
  } catch {}

  let enabled = false;

  try {
    enabled = localStorage.getItem(KEY) === "1";
  } catch {}

  let button = null;

  function apply() {
    const html = document.documentElement;

    if (enabled) {
      html.setAttribute("data-memory-comfort-palette", "on");
    } else {
      html.removeAttribute("data-memory-comfort-palette");
    }

    if (button) {
      button.setAttribute("aria-pressed", String(enabled));
      button.title = enabled
        ? "Desativar paleta Conforto Visual"
        : "Ativar paleta Conforto Visual";
    }

    try {
      localStorage.setItem(KEY, enabled ? "1" : "0");
    } catch {}

    window.dispatchEvent(
      new CustomEvent("memory:comfort-palette-changed", {
        detail: {
          enabled,
          version: VERSION
        }
      })
    );
  }

  function toggle() {
    enabled = !enabled;
    apply();
  }

  function buildButton() {
    if (document.querySelector("[data-memory-comfort-palette-toggle]")) {
      return;
    }

    button = document.createElement("button");
    button.type = "button";
    button.className = "memory-comfort-palette-toggle";
    button.setAttribute("data-memory-comfort-palette-toggle", "");
    button.innerHTML = `
      <span class="memory-comfort-palette-toggle__icon" aria-hidden="true">◐</span>
      <span class="memory-comfort-palette-toggle__label">Conforto visual</span>
    `;

    button.addEventListener("click", toggle);
    document.body.appendChild(button);
    apply();
  }

  function init() {
    apply();

    if (document.body) {
      buildButton();
      return;
    }

    window.addEventListener(
      "DOMContentLoaded",
      buildButton,
      { once: true }
    );
  }

  window.MemoryComfortPalette = {
    version: VERSION,
    get enabled() { return enabled; },
    enable() { enabled = true; apply(); },
    disable() { enabled = false; apply(); },
    toggle
  };

  init();
})();
