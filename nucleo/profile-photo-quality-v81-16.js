"use strict";

(() => {
  const VERSION = "v81.16";
  const MARK = "data-memory-profile-photo-v81-16";

  const IMG_SELECTORS = [
    ".profile-avatar img",
    ".profile-photo img",
    ".user-avatar img",
    ".user-photo img",
    ".avatar img",
    ".profile-image img",
    ".profile-picture img",
    ".sidebar-profile-avatar img",
    ".sidebar-profile-photo img",
    "[data-profile-avatar] img",
    "[data-profile-photo] img",
    "[data-user-avatar] img",
    "[data-user-photo] img",
    "img[data-profile-avatar]",
    "img[data-profile-photo]",
    "img[data-user-avatar]",
    "img[data-user-photo]"
  ].join(",");

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function descriptor(element) {
    if (!element) return "";

    const parent = element.closest?.(
      "[id],[class],[data-profile],[data-avatar],[aria-label]"
    );

    return normalizeText([
      element.id,
      element.name,
      element.className,
      element.getAttribute?.("aria-label"),
      element.getAttribute?.("data-profile"),
      element.getAttribute?.("data-avatar"),
      parent?.id,
      parent?.className,
      parent?.getAttribute?.("aria-label")
    ].filter(Boolean).join(" "));
  }

  function isProfileFileInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    if (input.type !== "file") return false;

    const accept = normalizeText(input.accept);
    if (accept && !accept.includes("image")) return false;

    const text = descriptor(input);

    return /\b(perfil|profile|avatar|foto-perfil|foto_perfil|profile-photo|profile_photo)\b/.test(text);
  }

  function isLikelyProfileImage(img) {
    if (!(img instanceof HTMLImageElement)) return false;

    if (img.matches(IMG_SELECTORS)) return true;

    const text = descriptor(img);

    return /\b(perfil|profile|avatar|foto-perfil|foto_perfil|profile-photo|profile_photo)\b/.test(text);
  }

  function markImage(img) {
    if (!isLikelyProfileImage(img)) return;

    img.setAttribute(MARK, "1");

    const evaluate = () => {
      const rendered = Math.max(
        img.clientWidth || 0,
        img.clientHeight || 0
      );

      const natural = Math.min(
        img.naturalWidth || 0,
        img.naturalHeight || 0
      );

      if (rendered > 0 && natural > 0 && natural < rendered * 1.35) {
        img.dataset.memoryProfileLowres = "1";
      } else {
        delete img.dataset.memoryProfileLowres;
      }
    };

    if (img.complete) {
      evaluate();
    } else {
      img.addEventListener("load", evaluate, { once: true });
    }
  }

  function scan(root = document) {
    if (root instanceof HTMLImageElement) {
      markImage(root);
    }

    root.querySelectorAll?.("img").forEach(markImage);
  }

  function loadBitmap(file) {
    if ("createImageBitmap" in window) {
      return createImageBitmap(file, {
        imageOrientation: "from-image"
      }).catch(() => createImageBitmap(file));
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = error => {
        URL.revokeObjectURL(url);
        reject(error);
      };

      image.src = url;
    });
  }

  async function prepareHighQualityProfileFile(file) {
    if (!(file instanceof File)) return file;
    if (!file.type.startsWith("image/")) return file;

    const bitmap = await loadBitmap(file);

    const sourceWidth = bitmap.width || bitmap.naturalWidth || 0;
    const sourceHeight = bitmap.height || bitmap.naturalHeight || 0;

    if (!sourceWidth || !sourceHeight) {
      bitmap.close?.();
      return file;
    }

    const cropSize = Math.min(sourceWidth, sourceHeight);

    // Mantém a área central, levemente mais alta para favorecer o rosto.
    const sourceX = Math.max(0, (sourceWidth - cropSize) / 2);
    const centeredY = Math.max(0, (sourceHeight - cropSize) / 2);
    const sourceY = Math.max(
      0,
      Math.min(
        sourceHeight - cropSize,
        centeredY - cropSize * 0.06
      )
    );

    // Não aumenta artificialmente fotos pequenas.
    // Fotos grandes são normalizadas até 1200x1200.
    const targetSize = Math.min(1200, cropSize);

    // Se a foto já é pequena, não adiciona uma nova compressão.
    if (targetSize < 700) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true
    });

    if (!ctx) {
      bitmap.close?.();
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      bitmap,
      sourceX,
      sourceY,
      cropSize,
      cropSize,
      0,
      0,
      targetSize,
      targetSize
    );

    bitmap.close?.();

    const blob = await new Promise(resolve => {
      canvas.toBlob(
        resolve,
        "image/jpeg",
        0.94
      );
    });

    if (!blob) return file;

    const baseName = String(file.name || "foto-perfil")
      .replace(/\.[^.]+$/, "");

    return new File(
      [blob],
      `${baseName}-memory.jpg`,
      {
        type: "image/jpeg",
        lastModified: Date.now()
      }
    );
  }

  async function interceptProfileUpload(event) {
    const input = event.target;

    if (!isProfileFileInput(input)) return;
    if (input.dataset.memoryProfilePrepared === "1") {
      input.dataset.memoryProfilePrepared = "0";
      return;
    }

    const file = input.files?.[0];

    if (!file || !file.type.startsWith("image/")) return;

    // Segura o handler original só enquanto a imagem é normalizada.
    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const prepared = await prepareHighQualityProfileFile(file);

      if (prepared !== file && typeof DataTransfer !== "undefined") {
        const transfer = new DataTransfer();
        transfer.items.add(prepared);
        input.files = transfer.files;
      }

      input.dataset.memoryProfilePrepared = "1";

      input.dispatchEvent(
        new Event("change", {
          bubbles: true
        })
      );
    } catch (error) {
      console.warn(
        "Memory V81.16: não foi possível normalizar a foto. Usando o arquivo original.",
        error
      );

      input.dataset.memoryProfilePrepared = "1";

      input.dispatchEvent(
        new Event("change", {
          bubbles: true
        })
      );
    }
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node instanceof Element) {
          scan(node);
        }
      });
    }
  });

  document.addEventListener(
    "change",
    event => {
      interceptProfileUpload(event).catch(console.error);
    },
    true
  );

  function init() {
    scan(document);

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    setTimeout(() => scan(document), 150);
    setTimeout(() => scan(document), 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

  window.MemoryProfilePhotoQuality = {
    version: VERSION,
    scan,
    prepareFile: prepareHighQualityProfileFile
  };
})();
