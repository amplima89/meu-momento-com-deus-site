"use strict";

(() => {
  const CHAVE_HISTORICO = "historico_series_ingles_v1";

  const esc = valor => window.MMCDUI?.esc
    ? window.MMCDUI.esc(valor)
    : String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      })[caractere]);

  const texto = valor => String(valor ?? "").trim();

  function familiaGramatical(valor = "") {
    const original = texto(valor);
    const normal = original
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("en-US");

    if (normal.includes("simple present")) return "Simple Present";
    if (normal.includes("present perfect")) return "Present Perfect";
    if (normal.includes("present continuous") || normal.includes("present progressive")) return "Present Continuous";
    if (normal.includes("simple past")) return "Simple Past";
    if (normal.includes("verb to be")) return "Verb to be";
    if (/^\s*can\b/.test(normal) || normal.includes("modal can")) return "Can";
    if (normal.includes("adverbs of frequency") || normal.includes("adverb of frequency")) return "Adverbs of frequency";
    return original.replace(/\s+[—–-]\s+.+$/, "").trim() || "Estrutura do dia";
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
    const grammarBruto = container.querySelector('[data-lesson-kind="grammar"] .english-block-main-title')?.textContent?.trim()
      || container.querySelector('[data-lesson-kind="grammar"] .english-block-body')?.textContent?.trim()
      || "Estrutura do dia";

    const nivel = document.querySelector("#ingles-nivel")?.textContent
      ?.replace(/^Nível de hoje:\s*/i, "")
      .trim() || "—";

    const foco = document.querySelector("#english-summary-focus");
    const nivelEl = document.querySelector("#english-summary-level");
    const cenaEl = document.querySelector("#english-summary-scene");

    if (foco) foco.textContent = familiaGramatical(grammarBruto);
    if (nivelEl) nivelEl.textContent = nivel;
    if (cenaEl) cenaEl.textContent = cena ? cena.titulo || "Cena escolhida" : "Sem cena hoje";
  }

  function organizarBlocos(container) {
    const grid = container.querySelector(".english-lesson-grid");
    if (!grid) return;

    grid.querySelectorAll("[data-lesson-kind]").forEach(bloco => {
      bloco.classList.add("english-course-block");
    });

    const grammar = grid.querySelector('[data-lesson-kind="grammar"]');
    const concept = grid.querySelector('[data-lesson-kind="concept"]');
    const examples = grid.querySelector('[data-lesson-kind="examples"]');
    const reading = grid.querySelector('[data-lesson-kind="reading"]');
    const expressions = grid.querySelector('[data-lesson-kind="expressions"]');
    const writing = grid.querySelector('[data-lesson-kind="writing"]');

    if (grammar) {
      const kicker = grammar.querySelector(".english-block-kicker");
      if (kicker) kicker.textContent = "1 · Entenda";
      const titulo = grammar.querySelector(".english-block-main-title");
      if (titulo) titulo.textContent = familiaGramatical(titulo.textContent);
    }

    if (concept) {
      const kicker = concept.querySelector(".english-block-kicker");
      if (kicker) kicker.textContent = "Como funciona";
    }

    if (examples) {
      const kicker = examples.querySelector(".english-block-kicker");
      if (kicker) kicker.textContent = "Exemplos do foco";
    }

    if (reading) {
      const kicker = reading.querySelector(".english-block-kicker");
      if (kicker) kicker.textContent = "2 · Leia e pratique";
    }

    if (expressions) {
      const kicker = expressions.querySelector(".english-block-kicker");
      if (kicker) kicker.textContent = "Expressões úteis da leitura";
    }

    if (writing) {
      const kicker = writing.querySelector(".english-block-kicker");
      if (kicker) kicker.textContent = "4 · Produza";
    }
  }

  function htmlExpressoes(expressoes = []) {
    const itens = (Array.isArray(expressoes) ? expressoes : [])
      .filter(item => typeof item === "string" ? texto(item) : texto(item?.english))
      .slice(0, 3);

    if (!itens.length) {
      return '<p class="english-scene-empty-note">Observe o tempo verbal e a construção das frases durante a cena.</p>';
    }

    return `<div class="english-scene-expressions">${itens.map((item, indice) => {
      const english = typeof item === "string" ? texto(item) : texto(item.english);
      const meaning = typeof item === "string" ? "" : texto(item.meaningPt || item.meaning_pt);
      return `<div class="english-scene-expression">
        <div><span>Pista ${indice + 1}</span><strong>${esc(english)}</strong></div>
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
            ${item?.grammarFocus ? `<span>${esc(familiaGramatical(item.grammarFocus))}</span>` : ""}
            ${scoreHtml}
          </div>
        </div>
      </header>

      <div class="english-block-body english-scene-body">
        ${item?.motivo ? `<div class="english-scene-why"><span>Por que esta cena</span><p>${esc(item.motivo)}</p></div>` : ""}
        ${item?.resumo ? `<p class="english-scene-summary">${esc(item.resumo)}</p>` : ""}

        <div class="english-scene-study-grid">
          <section>
            <span class="english-scene-mini-title">O que reconhecer</span>
            ${sinais.length
              ? `<ul>${sinais.map(sinal => `<li>${esc(sinal)}</li>`).join("")}</ul>`
              : `<p>Procure ${esc(familiaGramatical(item?.grammarFocus || "a estrutura de hoje"))} em uso natural, sem tentar traduzir cada frase.</p>`}
          </section>
          <section>
            <span class="english-scene-mini-title">Pistas curtas da cena</span>
            ${htmlExpressoes(item?.expressoes)}
          </section>
        </div>

        <div class="english-scene-method">
          <span class="english-scene-mini-title">Como estudar este trecho</span>
          <ol>
            <li><b>Assista uma vez.</b> Entenda o contexto sem interromper.</li>
            <li><b>Assista de novo.</b> Procure o tempo verbal trabalhado hoje.</li>
            <li><b>Faça sua versão.</b> Explique com suas palavras o que entendeu.</li>
          </ol>
        </div>

        <p class="english-scene-source">Timestamp aproximado; pode variar entre versões da plataforma. A IA escolheu a cena a partir de legenda inglesa real.</p>
      </div>

      <div class="english-response-workspace english-scene-speaking" data-speaking-workspace>
        <div class="english-scene-speaking-intro">
          <strong>Speaking da cena</strong>
          <span>Depois de assistir, grave de 30 a 90 segundos. Não repita o diálogo: conte o que entendeu com o inglês que você já consegue usar.</span>
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
          <h2>Sem cena selecionada para esta data</h2>
        </div>
      </header>
      <div class="english-block-body english-scene-body">
        <p class="english-scene-summary">A aula continua completa. A série só aparece quando a rotina encontra uma legenda e a IA aprova um trecho para a família gramatical do dia.</p>
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
        document.querySelector(mapa[botao.dataset.englishStep])
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  async function render({ container, data, db, usuario }) {
    if (!container || !data || !db || !usuario) return null;

    document.body.classList.remove("english-v6");
    document.body.classList.add("english-v7");
    ligarRota();

    container.querySelector('[data-lesson-kind="scene"]')?.remove();
    organizarBlocos(container);

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

  window.MMCDEnglishExperience = { render, familiaGramatical };
})();
