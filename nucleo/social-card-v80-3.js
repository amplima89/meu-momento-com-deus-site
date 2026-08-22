"use strict";

window.MemorySocialCard = (() => {
  const WIDTH = 1080;
  const HEIGHT = 1350;
  const LOGO_SRC = "assets/imagens/memory-mark-official-v81-11-3.png?v=20260822-v81-11-3";

  const escFile = value => String(value || "memory").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "memory";


  function drawImageContain(ctx, img, x, y, w, h) {
    if (!img?.naturalWidth || !img?.naturalHeight) return;
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }

  function colorTuple(value, fallback = "#000000") {
    const source = String(value || "").trim();
    let match = source.match(/^#([0-9a-f]{3})$/i);
    if (match) return [...match[1]].map(ch => parseInt(ch + ch, 16));
    match = source.match(/^#([0-9a-f]{6})$/i);
    if (match) return [0, 2, 4].map(i => parseInt(match[1].slice(i, i + 2), 16));
    match = source.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (match) return match.slice(1, 4).map(Number);
    try {
      const probe = document.createElement("canvas").getContext("2d");
      probe.fillStyle = fallback; probe.fillStyle = source || fallback;
      const normalized = probe.fillStyle;
      if (normalized && normalized !== source) return colorTuple(normalized, fallback);
    } catch {}
    return [0,0,0];
  }
  function withAlpha(value, alpha) {
    const [r,g,b]=colorTuple(value);
    return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${alpha})`;
  }
  function currentProfilePalette() {
    const style=getComputedStyle(document.documentElement);
    const read=(name,fallback)=>style.getPropertyValue(name).trim()||fallback;
    return {bg:read("--bg","#000717"),surface:read("--surface","#07162D"),surface2:read("--surface-2","#0C203C"),text:read("--text","#F4F6FC"),muted:read("--muted","#9CAAC0"),accent:read("--accent","#A78BFA")};
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function linesFor(ctx, text, maxWidth, maxLines = 10) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return [];
    const words = clean.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test;
      } else {
        lines.push(line);
        line = word;
        if (lines.length >= maxLines) break;
      }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines && words.length) {
      let last = lines[maxLines - 1];
      while (last.length > 4 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      if (!last.endsWith("…") && clean !== lines.join(" ")) lines[maxLines - 1] = `${last.replace(/[.,;:!?\s]+$/g, "")}…`;
    }
    return lines;
  }

  function drawLines(ctx, lines, x, y, lineHeight) {
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    return y + lines.length * lineHeight;
  }

  async function buildCanvas(options = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");

    const variant = options.variant === "workout" ? "workout" : "devotional";
    const palette = { ...currentProfilePalette(), ...(options.palette || {}) };
    const { bg, surface, surface2, text, muted, accent } = palette;

    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, bg);
    gradient.addColorStop(.58, surface);
    gradient.addColorStop(1, surface2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(870, 90, 40, 870, 90, 540);
    glow.addColorStop(0, withAlpha(accent, .36));
    glow.addColorStop(.45, withAlpha(accent, .10));
    glow.addColorStop(1, withAlpha(accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, 620);

    ctx.strokeStyle = withAlpha(text, .13);
    ctx.lineWidth = 2;
    roundedRect(ctx, 58, 58, WIDTH - 116, HEIGHT - 116, 44);
    ctx.stroke();

    const logo = await loadImage(LOGO_SRC);
    if (logo) drawImageContain(ctx, logo, 86, 92, 104, 76);

    ctx.fillStyle = text;
    ctx.font = "700 34px Inter, Segoe UI, sans-serif";
    ctx.fillText("Memory", 210, 135);
    ctx.fillStyle = muted;
    ctx.font = "600 19px Inter, Segoe UI, sans-serif";
    ctx.fillText(variant === "workout" ? "movimento que vira memória" : "não esqueça do que importa", 210, 169);

    ctx.fillStyle = accent;
    ctx.font = "800 20px Inter, Segoe UI, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText(String(options.eyebrow || (variant === "workout" ? "TREINO CONCLUÍDO" : "DEVOCIONAL CONCLUÍDO")).toUpperCase(), 88, 300);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = text;
    ctx.font = "800 66px Inter, Segoe UI, sans-serif";
    const titleLines = linesFor(ctx, options.title || "Hoje eu cuidei do que importa", 850, 4);
    let y = drawLines(ctx, titleLines, 88, 385, 76);

    if (options.subtitle) {
      y += 22;
      ctx.fillStyle = muted;
      ctx.font = "500 28px Inter, Segoe UI, sans-serif";
      y = drawLines(ctx, linesFor(ctx, options.subtitle, 850, 4), 88, y, 41);
    }

    if (options.quote) {
      y += 52;
      roundedRect(ctx, 88, y, 904, 330, 34);
      ctx.fillStyle = withAlpha(text, .055);
      ctx.fill();
      ctx.strokeStyle = withAlpha(accent, .34);
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.font = "700 54px Georgia, serif";
      ctx.fillText("“", 126, y + 78);
      ctx.fillStyle = text;
      ctx.font = "600 34px Georgia, serif";
      drawLines(ctx, linesFor(ctx, options.quote, 790, 7), 142, y + 112, 48);
      y += 348;
    }

    const badges = Array.isArray(options.badges) ? options.badges.filter(Boolean).slice(0, 3) : [];
    if (badges.length) {
      y += 30;
      let badgeX = 88;
      ctx.font = "700 20px Inter, Segoe UI, sans-serif";
      for (const badge of badges) {
        const label = String(badge);
        const badgeW = Math.min(430, Math.max(170, ctx.measureText(label).width + 48));
        if (badgeX + badgeW > 992) { badgeX = 88; y += 62; }
        roundedRect(ctx, badgeX, y, badgeW, 48, 24);
        ctx.fillStyle = withAlpha(accent, .13); ctx.fill();
        ctx.strokeStyle = withAlpha(accent, .34); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = text; ctx.fillText(label, badgeX + 24, y + 31);
        badgeX += badgeW + 12;
      }
      y += 58;
    }

    const stats = Array.isArray(options.stats) ? options.stats.filter(Boolean).slice(0, 3) : [];
    if (stats.length) {
      y += 32;
      const gap = 18;
      const boxW = (904 - gap * (stats.length - 1)) / stats.length;
      stats.forEach((stat, index) => {
        const x = 88 + index * (boxW + gap);
        roundedRect(ctx, x, y, boxW, 132, 28);
        ctx.fillStyle = withAlpha(text, .055);
        ctx.fill();
        ctx.fillStyle = muted;
        ctx.font = "700 17px Inter, Segoe UI, sans-serif";
        ctx.fillText(String(stat.label || "").toUpperCase(), x + 24, y + 40);
        ctx.fillStyle = text;
        ctx.font = "800 29px Inter, Segoe UI, sans-serif";
        const value = String(stat.value || "");
        const valueLines = linesFor(ctx, value, boxW - 48, 2);
        drawLines(ctx, valueLines, x + 24, y + 82, 34);
      });
      y += 150;
    }

    const footer = options.footer || (variant === "workout" ? "Constância transforma esforço em evolução." : "Um encontro com Deus que virou memória.");
    ctx.fillStyle = muted;
    ctx.font = "600 24px Inter, Segoe UI, sans-serif";
    const footerY = Math.max(y + 42, HEIGHT - 158);
    drawLines(ctx, linesFor(ctx, footer, 790, 2), 88, footerY, 35);

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(948, HEIGHT - 122, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = muted;
    ctx.font = "600 17px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("MEMORY", 924, HEIGHT - 115);
    ctx.textAlign = "left";

    return canvas;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível gerar o card.")), "image/png", 0.96));
  }

  async function makeBlob(options) {
    return canvasToBlob(await buildCanvas(options));
  }

  async function download(options = {}) {
    const blob = await makeBlob(options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${escFile(options.fileName || options.title || "memory")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1800);
    return true;
  }

  async function share(options = {}) {
    const blob = await makeBlob(options);
    const file = new File([blob], `${escFile(options.fileName || options.title || "memory")}.png`, { type: "image/png" });
    const text = String(options.caption || options.title || "Memory");
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: options.shareTitle || "Memory", text, files: [file] });
        return { shared: true, downloaded: false };
      }
      if (navigator.share) {
        await navigator.share({ title: options.shareTitle || "Memory", text });
        await download(options);
        return { shared: true, downloaded: true };
      }
    } catch (error) {
      if (error?.name === "AbortError") return { cancelled: true };
      console.warn("Memory: compartilhamento nativo indisponível.", error);
    }
    await download(options);
    return { shared: false, downloaded: true };
  }

  async function copyCaption(caption) {
    const text = String(caption || "").trim();
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
  }

  return { buildCanvas, makeBlob, download, share, copyCaption, currentProfilePalette };
})();
