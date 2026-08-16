"use strict";

window.MemorySocialCard = (() => {
  const WIDTH = 1080;
  const HEIGHT = 1350;
  const LOGO_SRC = "assets/imagens/memory-mark-official-v80-1.png";

  const escFile = value => String(value || "memory").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "memory";

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

    const variant = options.variant === "workout" ? "workout" : "meditation";
    const accent = variant === "workout" ? "#73d5c5" : "#8fc9ff";
    const accent2 = variant === "workout" ? "#b4f0cf" : "#c8b6ff";

    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#08182d");
    gradient.addColorStop(.58, "#10294a");
    gradient.addColorStop(1, "#0b1f39");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const glow = ctx.createRadialGradient(870, 90, 40, 870, 90, 540);
    glow.addColorStop(0, `${accent}55`);
    glow.addColorStop(.45, `${accent}16`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, 620);

    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 2;
    roundedRect(ctx, 58, 58, WIDTH - 116, HEIGHT - 116, 44);
    ctx.stroke();

    const logo = await loadImage(LOGO_SRC);
    if (logo) {
      const size = 78;
      roundedRect(ctx, 86, 88, 98, 98, 28);
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.fill();
      ctx.save();
      roundedRect(ctx, 96, 98, size, size, 22);
      ctx.clip();
      ctx.drawImage(logo, 96, 98, size, size);
      ctx.restore();
    }

    ctx.fillStyle = "#f7fbff";
    ctx.font = "700 34px Inter, Segoe UI, sans-serif";
    ctx.fillText("Memory", 210, 135);
    ctx.fillStyle = "rgba(235,244,255,.66)";
    ctx.font = "600 19px Inter, Segoe UI, sans-serif";
    ctx.fillText(variant === "workout" ? "movimento que vira memória" : "um momento que vale lembrar", 210, 169);

    ctx.fillStyle = accent;
    ctx.font = "800 20px Inter, Segoe UI, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText(String(options.eyebrow || (variant === "workout" ? "TREINO CONCLUÍDO" : "MEDITAÇÃO CONCLUÍDA")).toUpperCase(), 88, 300);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 66px Inter, Segoe UI, sans-serif";
    const titleLines = linesFor(ctx, options.title || "Hoje eu cuidei do que importa", 850, 4);
    let y = drawLines(ctx, titleLines, 88, 385, 76);

    if (options.subtitle) {
      y += 22;
      ctx.fillStyle = "rgba(235,244,255,.72)";
      ctx.font = "500 28px Inter, Segoe UI, sans-serif";
      y = drawLines(ctx, linesFor(ctx, options.subtitle, 850, 4), 88, y, 41);
    }

    if (options.quote) {
      y += 52;
      roundedRect(ctx, 88, y, 904, 330, 34);
      ctx.fillStyle = "rgba(255,255,255,.065)";
      ctx.fill();
      ctx.strokeStyle = `${accent}50`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = accent2;
      ctx.font = "700 54px Georgia, serif";
      ctx.fillText("“", 126, y + 78);
      ctx.fillStyle = "#f7fbff";
      ctx.font = "600 34px Georgia, serif";
      drawLines(ctx, linesFor(ctx, options.quote, 790, 7), 142, y + 112, 48);
      y += 348;
    }

    const stats = Array.isArray(options.stats) ? options.stats.filter(Boolean).slice(0, 3) : [];
    if (stats.length) {
      y += 32;
      const gap = 18;
      const boxW = (904 - gap * (stats.length - 1)) / stats.length;
      stats.forEach((stat, index) => {
        const x = 88 + index * (boxW + gap);
        roundedRect(ctx, x, y, boxW, 132, 28);
        ctx.fillStyle = "rgba(255,255,255,.055)";
        ctx.fill();
        ctx.fillStyle = "rgba(235,244,255,.58)";
        ctx.font = "700 17px Inter, Segoe UI, sans-serif";
        ctx.fillText(String(stat.label || "").toUpperCase(), x + 24, y + 40);
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 29px Inter, Segoe UI, sans-serif";
        const value = String(stat.value || "");
        const valueLines = linesFor(ctx, value, boxW - 48, 2);
        drawLines(ctx, valueLines, x + 24, y + 82, 34);
      });
      y += 150;
    }

    const footer = options.footer || (variant === "workout" ? "Constância transforma esforço em evolução." : "Leve a Palavra para o restante do seu dia.");
    ctx.fillStyle = "rgba(235,244,255,.72)";
    ctx.font = "600 24px Inter, Segoe UI, sans-serif";
    const footerY = Math.max(y + 42, HEIGHT - 158);
    drawLines(ctx, linesFor(ctx, footer, 790, 2), 88, footerY, 35);

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(948, HEIGHT - 122, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(235,244,255,.55)";
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

  return { buildCanvas, makeBlob, download, share, copyCaption };
})();
