"use strict";

(() => {
  const esc = value => window.MMCDUI?.esc ? MMCDUI.esc(value) : String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  let data = null;
  let busy = false;

  function currentDate() {
    const stored = localStorage.getItem("ultima-data-lida") || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(stored) ? stored : new Date().toISOString().slice(0, 10);
  }

  function meditationMeta(date) {
    if (!data) return null;
    const candidates = (data.metas || []).filter(meta => /medita|devocional/.test(normalize(`${meta.nome} ${meta.descricao || ""}`)));
    return candidates.find(meta => window.MMCD?.ativaNaData?.(meta, date)) || candidates[0] || null;
  }

  function extractVerse() {
    const section = document.querySelector("#conteudo-meditacao .meditacao__secao--versiculo");
    const body = section?.querySelector(".meditacao__corpo") || section;
    const clean = String(body?.innerText || "").replace(/\s+/g, " ").trim();
    if (clean) return clean;
    const fallback = [...document.querySelectorAll("#conteudo-meditacao .meditacao__secao")].find(item => /vers[ií]culo/i.test(item.textContent || ""));
    return String(fallback?.innerText || "").replace(/^.*?vers[ií]culo\s+do\s+dia\s*/i, "").replace(/\s+/g, " ").trim();
  }

  function shortVerse(value, limit = 300) {
    const text = String(value || "").trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 1).replace(/\s+\S*$/, "").trim()}…`;
  }

  function formatDate(iso) {
    try { return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }); }
    catch { return iso; }
  }

  function socialData(date) {
    const verse = shortVerse(extractVerse());
    const title = "Hoje eu parei para cuidar do que importa";
    const caption = [
      "Minha devocional de hoje no Memory 🙏",
      verse ? `“${verse}”` : "Um momento de presença, Palavra e direção.",
      "Pequenos momentos de cuidado também constroem uma vida inteira. #Memory"
    ].filter(Boolean).join("\n\n");
    return {
      variant: "meditation",
      eyebrow: "Devocional concluída",
      title,
      subtitle: formatDate(date),
      quote: verse || "Um momento de presença, Palavra e direção.",
      stats: [{ label: "Jornada", value: "Com Deus" }, { label: "Feito", value: "Hoje" }],
      footer: "Leve a Palavra para o restante do seu dia.",
      caption,
      shareTitle: "Minha devocional no Memory",
      fileName: `memory-meditacao-${date}`
    };
  }

  function ensureZone() {
    let zone = document.querySelector("#meditation-completion-zone");
    if (zone) return zone;
    zone = document.createElement("section");
    zone.id = "meditation-completion-zone";
    zone.className = "card meditation-completion-zone";
    const book = document.querySelector(".devotional-book");
    book?.insertAdjacentElement("afterend", zone);
    return zone;
  }

  function render() {
    const zone = ensureZone();
    if (!zone || !data) return;
    const date = currentDate();
    const meta = meditationMeta(date);
    const row = meta ? MMCD.registro(data, date, meta.id) : null;
    const done = !!row?.concluida && !MMCD.estaAbonada(row);
    const verse = shortVerse(extractVerse(), 230);

    zone.innerHTML = `
      <div class="meditation-completion-head">
        <div><p class="eyebrow">Feche este encontro</p><h2>${done ? "Devocional concluída" : "Concluiu sua devocional?"}</h2><p class="muted">${done ? "Este dia já está marcado nas suas Atividades." : "Ao concluir aqui, o Memory marca automaticamente a atividade de devocional desta data."}</p></div>
        <button type="button" class="btn ${done ? "meditation-complete-done" : "primary"}" data-meditation-complete ${busy ? "disabled" : ""}>${busy ? "Salvando…" : done ? "✓ Concluída" : "Concluir devocional"}</button>
      </div>
      ${done ? `
      <div class="memory-share-block">
        <div class="memory-share-preview memory-share-preview--meditation">
          <div class="memory-share-preview__brand"><img src="assets/imagens/memory-mark-official-v81-11-3.png?v=20260822-v81-11-3" alt=""><div><strong>Memory</strong><small>um momento que vale lembrar</small></div></div>
          <span class="memory-share-preview__eyebrow">Devocional concluída</span>
          <h3>Hoje eu parei para cuidar do que importa.</h3>
          ${verse ? `<div class="memory-share-preview__quote">“${esc(verse)}”</div>` : ""}
          <div class="memory-share-preview__stats"><span>🙏 Um momento com Deus</span><span>✓ Registrado no Memory</span></div>
        </div>
        <div class="memory-share-actions">
          <button type="button" class="btn primary" data-meditation-share>Compartilhar · Instagram / WhatsApp</button>
          <button type="button" class="btn" data-meditation-download>Baixar card</button>
          <button type="button" class="btn" data-meditation-copy>Copiar legenda</button>
        </div>
        <p class="memory-share-note">No celular, Compartilhar abre as opções disponíveis do aparelho, incluindo Instagram ou WhatsApp quando instalados. O Memory não publica nada sem sua confirmação.</p>
      </div>` : ""}`;
  }

  async function complete() {
    if (busy || !data) return;
    const date = currentDate();
    const meta = meditationMeta(date);
    if (!meta) {
      MMCDUI?.toast?.("Não encontrei uma atividade de Devocional para atualizar. Confira suas Metas/Atividades.", 5200);
      return;
    }
    const current = MMCD.registro(data, date, meta.id) || {};
    if (current.concluida && !MMCD.estaAbonada(current)) return;
    busy = true;
    render();
    const previous = { ...current };
    try {
      MMCD.setRegistro(data, date, meta.id, {
        concluida: true,
        abonada: false,
        valor: Math.max(1, Number(current.valor || 0)),
        texto: "",
        observacao: current.observacao || "",
        origem: "meditacao"
      });
      data = await MMCD.salvarRegistroAtividade(data, date, meta.id);
      MMCDUI?.toast?.("Devocional concluída e Atividades atualizadas.", 3800);
      document.dispatchEvent(new CustomEvent("memory:activity-updated", { detail: { date, activityId: meta.id, source: "meditation" } }));
    } catch (error) {
      console.error("Memory: não foi possível concluir a devocional.", error);
      MMCD.setRegistro(data, date, meta.id, previous);
      MMCDUI?.toast?.(error?.message || "Não foi possível atualizar a atividade de devocional.", 5200);
    } finally {
      busy = false;
      render();
    }
  }

  async function doShare(mode) {
    const api = window.MemorySocialCard;
    if (!api) {
      MMCDUI?.toast?.("O card ainda não ficou pronto. Atualize a página e tente novamente.", 4200);
      return;
    }
    const options = socialData(currentDate());
    try {
      if (mode === "share") {
        const result = await api.share(options);
        if (result?.downloaded && !result.shared) MMCDUI?.toast?.("Card baixado. Agora você pode publicar onde quiser.", 4200);
      } else if (mode === "download") {
        await api.download(options);
        MMCDUI?.toast?.("Card salvo como PNG.", 3200);
      } else if (mode === "copy") {
        const ok = await api.copyCaption(options.caption);
        MMCDUI?.toast?.(ok ? "Legenda copiada." : "Não foi possível copiar a legenda.", 3200);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error(error);
        MMCDUI?.toast?.("Não foi possível preparar o compartilhamento agora.", 4200);
      }
    }
  }

  async function refresh() {
    try {
      data ||= await MMCD.carregar();
      render();
    } catch (error) {
      console.error("Memory: conclusão da devocional indisponível.", error);
    }
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-meditation-complete]")) { event.preventDefault(); complete(); }
    else if (event.target.closest("[data-meditation-share]")) { event.preventDefault(); doShare("share"); }
    else if (event.target.closest("[data-meditation-download]")) { event.preventDefault(); doShare("download"); }
    else if (event.target.closest("[data-meditation-copy]")) { event.preventDefault(); doShare("copy"); }
  });

  document.addEventListener("memory:meditation-rendered", refresh);
  document.addEventListener("memory:activity-updated", refresh);
  window.addEventListener("load", () => setTimeout(refresh, 80));
})();
