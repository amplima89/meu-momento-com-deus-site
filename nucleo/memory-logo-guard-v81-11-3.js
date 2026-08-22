"use strict";

(() => {
  const VERSION = "20260822-v81-11-3";
  const CANONICAL =
    `assets/imagens/memory-mark-official-v81-11-3.png?v=20260822-v81-11-3

  const isMemoryLogo = img => {
    if (!(img instanceof HTMLImageElement)) return false;

    const src = String(
      img.getAttribute("src") || ""
    );

    const alt = String(
      img.getAttribute("alt") || ""
    ).toLowerCase();

    return (
      /memory-mark(?:-official)?/i.test(src)
      || img.closest?.(".sidebar-brand__mark")
      || img.closest?.(".memory-topbar-brand")
      || img.closest?.(".sidebar-memory-mobile__icon")
      || (
        alt === "memory"
        && (
          img.closest?.(".sidebar-brand")
          || img.closest?.(".app-topbar")
        )
      )
    );
  };

  const applyCanonical = img => {
    if (!isMemoryLogo(img)) return;

    const current = String(
      img.getAttribute("src") || ""
    );

    if (!current.includes("memory-mark-official-v81-11-3.png?v=20260822-v81-11-3")) {
      img.setAttribute("src", CANONICAL);
    }

    img.addEventListener(
      "load",
      () => {
        const fallback =
          img.parentElement?.querySelector?.(
            ".sidebar-brand__fallback"
          );

        if (fallback) {
          fallback.style.display = "none";
        }
      },
      { once: true }
    );

    img.addEventListener(
      "error",
      () => {
        // Segunda tentativa: remove query string, útil em PWA/browser agressivo.
        const plain =
          "assets/imagens/memory-mark-official-v81-11-3.png?v=20260822-v81-11-3";

        if (img.getAttribute("src") !== plain) {
          img.setAttribute("src", plain);
        }
      },
      { once: true }
    );
  };

  const scan = root => {
    if (root instanceof HTMLImageElement) {
      applyCanonical(root);
    }

    root?.querySelectorAll?.("img").forEach(
      applyCanonical
    );
  };

  scan(document);

  const observer = new MutationObserver(
    records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node instanceof Element) {
            scan(node);
          }
        });
      }
    }
  );

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

  window.addEventListener(
    "pageshow",
    () => scan(document),
    { passive: true }
  );

  window.addEventListener(
    "online",
    () => scan(document),
    { passive: true }
  );

  window.MemoryLogoGuard = {
    version: "v81.11.3",
    refresh: () => scan(document)
  };
})();
