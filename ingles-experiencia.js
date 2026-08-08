"use strict";

(() => {
  const CHAVE_HISTORICO = "historico_series_ingles_v1";

  const esc = valor => window.MMCDUI?.esc
    ? window.MMCDUI.esc(valor)
    : String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      })[caractere]);

  const texto = valor => String(valor ?? "").trim();

  function formatarData(iso = "") {
    const data = texto(iso).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return data || "—";
    return data.split("-").reverse().join("/");
  }

  function localizacao(item) {
    const trecho = item?.inicio && item?.fim ? `${item.inicio} → ${item.fim}` : "";
    if (item?.tipo === "filme") return trecho || "Filme";
    const episodio = [
      item?.temporada ? `T${item.temporada}` : "",
      item?.episodio ? `E${item.episodio}` : ""
    ].filter(Boolean).join("");
    return [episodio || "Episódio", trecho].filter(Boolean).join(" · ");
  }

  async function lerHistorico(db, usuario) {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", CHAVE_HISTORICO)
      .maybeSingle();
    if (error) throw error;
    return Array.isArray(data?.valor?.itens) ? data.valor.itens : [];
  }

  function cenaDaData(itens, data) {
    return itens
      .filter(item => texto(item?.data) === data)
      .sort((a, b) => texto(b?.confirmadoEm || b?.criadoEm).localeCompare(texto(a?.confirmadoEm || a?.criadoEm)))[0] || null;
  }

  function sinalizarPassos(cena) {
    const mapa = {
      understand: document.querySelector('[data-english-step="understand"]'),
      read: document.querySelector('[data-english-step="read"]'),
      scene: document.querySelector('[data-english-step="scene"]'),
      produce: document.querySelector('[data-english-step="produce"]'),
      review: document.querySelector('[data-english-step="review"]')
    };
    Object.values(mapa).forEach(item => item?.classList.remove("is-muted"));
    mapa.scene?.classList.toggle("is-muted", !cena);
  }

  function atualizarResumo(container, cena) {
    const grammar = container.querySelector('[data-lesson-kind="grammar"] .english-block-main-title')?.textContent?.trim()
      || container.querySelector('[data-lesson-kind="grammar"] .english-block-body')?.textContent?.trim()
      || "Estrutura do dia";
    const nivel = document.querySelector("#ingles-nivel")?.textContent?.replace(/^Nível de hoje:\s*/i, "").trim() || "—";

    const foco = document.querySelector("#english-summary-focus");
    const nivelEl = document.querySelector("#english-summary-level");
    const cenaEl = document.querySelector("#english-summary-scene");
    if (foco) foco.textContent = grammar;
    if (nivelEl) nivelEl.textContent = nivel;
    if (cenaEl) cenaEl.textContent = cena ? cena.titulo || "Cena escolhida" : "Sem cena hoje";
  }

  function classificarBlocos(container) {
    const grid = container.querySelector(".english-lesson-grid");
    if (!grid) return;
    grid.querySelectorAll("[data-lesson-kind]").forEach(bloco => {
      bloco.classList.add("english-course-block");
    });
  }

  function htmlExpressoes(expressoes = []) {
    const itens = (Array.isArray(expressoes) ? expressoes : [])
      .filter(item => typeof item === "string" ? texto(item) : texto(item?.english))
      .slice(0, 3);
    if (!itens.length) {
      return '<p class="english-scene-empty-note">A cena foi validada pelo uso gramatical, sem expressão curta separada.</p>';
    }

    return `<div class="english-scene-expressions">${itens.map((item, indice) => {
      const english = typeof item === "string" ? texto(item) : texto(item.english);
      const meaning = typeof item === "string" ? "" : texto(item.meaningPt || item.meaning_pt);
      return `<div class="english-scene-expression">
        <div><span>Expressão ${indice + 1}</span><strong>${esc(english)}</strong></div>
        ${meaning ? `<button class="btn small" type="button" data-scene-translation>Ver tradução</button><em data-scene-meaning hidden>${esc(meaning)}</em>` : ""}
      </div>`;
    }).join("")}</div>`;
  }

  function criarCena(item) {
    const sinais = (Array.isArray(item?.sinais) ? item.sinais : []).filter(Boolean).slice(0, 3);
    const score = Number(item?.score || 0);
    const scoreHtml = score
      ? `<span class="english-scene-score" title="Aderência pedagógica">${Math.max(0, Math.min(100, score))}/100</span>`
      : "";

    const section = document.createElement("section");
    section.className = "english-lesson-block english-course-block english-scene-lesson is-featured";
    section.dataset.lessonKind = "scene";
    section.innerHTML = `
      <header class="english-scene-head">
        <div class="english-scene-icon" aria-hidden="true">▶</div>
        <div class="english-scene-title">
          <p class="english-block-kicker">3 · Assista e reconheça</p>
          <h2>${esc(item?.titulo || "Cena sugerida")}</h2>
          <div class="english-scene-meta">
            <span>${esc(localizacao(item))}</span>
            ${item?.grammarFocus ? `<span>${esc(item.grammarFocus)}</span>` : ""}
            ${scoreHtml}
          </div>
        </div>
      </header>

      <div class="english-block-body english-scene-body">
        ${item?.motivo ? `<div class="english-scene-why"><span>Por que esta cena</span><p>${esc(item.motivo)}</p></div>` : ""}
        ${item?.resumo ? `<p class="english-scene-summary">${esc(item.resumo)}</p>` : ""}

        <div class="english-scene-study-grid">
          <section>
            <span class="english-scene-mini-title">O que observar</span>
            ${sinais.length
              ? `<ul>${sinais.map(sinal => `<li>${esc(sinal)}</li>`).join("")}</ul>`
              : `<p>Acompanhe principalmente a estrutura gramatical do dia em uso natural.</p>`}
          </section>
          <section>
            <span class="english-scene-mini-title">Expressões da cena</span>
            ${htmlExpressoes(item?.expressoes)}
          </section>
        </div>

        <div class="english-scene-method">
          <span class="english-scene-mini-title">Como estudar este trecho</span>
          <ol>
            <li><b>Assista uma vez.</b> Só acompanhe a conversa e o contexto.</li>
            <li><b>Volte ao início.</b> Procure o Grammar focus e as expressões acima.</li>
            <li><b>Faça sua versão.</b> Diga em inglês o que entendeu ou represente a conversa com suas próprias palavras.</li>
          </ol>
        </div>

        <p class="english-scene-source">Timestamp aproximado. Ele pode variar um pouco entre versões da plataforma. A seleção foi feita a partir de legenda inglesa usada como evidência de estudo.</p>
      </div>

      <div class="english-response-workspace english-scene-speaking" data-speaking-workspace>
        <div class="english-scene-speaking-intro">
          <strong>Speaking da cena</strong>
          <span>Depois de assistir, grave de 30 a 90 segundos sem ler. Não precisa repetir o diálogo original: use o inglês que você conseguiu absorver.</span>
        </div>
      </div>`;

    return section;
  }

  function criarCenaVazia() {
    const section = document.createElement("section");
    section.className = "english-lesson-block english-course-block english-scene-lesson is-empty";
    section.dataset.lessonKind = "scene";
    section.innerHTML = `
      <header class="english-scene-head">
        <div class="english-scene-icon" aria-hidden="true">▶</div>
        <div class="english-scene-title">
          <p class="english-block-kicker">3 · Assista e reconheça</p>
          <h2>Hoje sem cena automática</h2>
        </div>
      </header>
      <div class="english-block-body english-scene-body">
        <p class="english-scene-summary">Nenhuma cena atingiu o critério mínimo ou não havia uma fonte disponível para esta data. A aula continua normalmente sem forçar uma série.</p>
      </div>`;
    return section;
  }

  function ligarTraducoesCena(section) {
    section.querySelectorAll("[data-scene-translation]").forEach(botao => {
      botao.addEventListener("click", () => {
        const significado = botao.parentElement?.querySelector("[data-scene-meaning]");
        if (!significado) return;
        const abrir = significado.hidden;
        significado.hidden = !abrir;
        botao.textContent = abrir ? "Ocultar tradução" : "Ver tradução";
      });
    });
  }

  function ligarRota() {
    document.querySelectorAll("[data-english-step]").forEach(botao => {
      if (botao.dataset.experienceBound === "1") return;
      botao.dataset.experienceBound = "1";
      botao.addEventListener("click", () => {
        const mapa = {
          understand: '[data-lesson-kind="grammar"]',
          read: '[data-lesson-kind="reading"]',
          scene: '[data-lesson-kind="scene"]',
          produce: '[data-lesson-kind="writing"]',
          review: '#revisao-ingles-card'
        };
        document.querySelector(mapa[botao.dataset.englishStep])?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  async function render({ container, data, db, usuario }) {
    if (!container || !data || !db || !usuario) return null;
    document.body.classList.add("english-v6");
    ligarRota();

    container.querySelector('[data-lesson-kind="scene"]')?.remove();
    classificarBlocos(container);

    let cena = null;
    try {
      const itens = await lerHistorico(db, usuario);
      cena = cenaDaData(itens, data);
    } catch (erro) {
      console.warn("Não foi possível carregar a cena automática do inglês.", erro);
    }

    const grid = container.querySelector(".english-lesson-grid");
    if (grid) {
      const section = cena ? criarCena(cena) : criarCenaVazia();
      grid.append(section);
      ligarTraducoesCena(section);
    }

    atualizarResumo(container, cena);
    sinalizarPassos(cena);
    return cena;
  }

  window.MMCDEnglishExperience = { render };
})();
