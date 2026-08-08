"use strict";

(() => {
  const CHAVE_CENAS_DIARIAS = "cenas_series_ingles_v1";
  const CHAVE_HISTORICO = "historico_series_ingles_v1";
  let contextoAtual = null;

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
    if (normal.includes("verb to be")) return "Verb to be";
    if (normal.includes("adverbs of frequency")) return "Adverbs of frequency";
    if (normal.includes("present continuous") || normal.includes("present progressive")) return "Present Continuous";
    if (normal.includes("simple past")) return "Simple Past";
    if (normal.includes("going to") || /\bwill\b/.test(normal)) return "Future — going to / will";
    if (normal.includes("present perfect")) return "Present Perfect";
    if (normal.includes("modal") || /\b(can|could|should|must|might)\b/.test(normal)) return "Modal verbs";
    if (normal.includes("comparative") || normal.includes("superlative")) return "Comparatives and superlatives";
    if (normal.includes("question") || normal.includes("auxiliar")) return "Questions and auxiliaries";

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

  async function lerItensConfig(db, usuario, chave) {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw error;
    return Array.isArray(data?.valor?.itens) ? data.valor.itens : [];
  }

  async function carregarCenasDisponiveis(db, usuario) {
    const [diarias, historico] = await Promise.all([
      lerItensConfig(db, usuario, CHAVE_CENAS_DIARIAS),
      lerItensConfig(db, usuario, CHAVE_HISTORICO)
    ]);

    const mapa = new Map();
    historico.forEach(item => {
      if (texto(item?.data)) mapa.set(texto(item.data), item);
    });
    diarias.forEach(item => {
      if (texto(item?.data)) mapa.set(texto(item.data), item);
    });
    return [...mapa.values()];
  }

  function chaveFala(fala, indice) {
    const cueIds = Array.isArray(fala?.cueIds)
      ? fala.cueIds.map(texto).filter(Boolean)
      : [];
    if (cueIds.length) return cueIds.join("|");
    return `${indice}|${texto(fala?.speaker)}|${texto(fala?.english).slice(0, 80)}`;
  }

  function mapaDificuldades(item) {
    const lista = Array.isArray(item?.dificuldadeFalas)
      ? item.dificuldadeFalas
      : [];
    return new Map(
      lista
        .filter(registro => texto(registro?.chave))
        .map(registro => [texto(registro.chave), registro])
    );
  }

  function resumoDificuldadeHtml(item) {
    const total = Array.isArray(item?.transcricaoOriginal)
      ? item.transcricaoOriginal.length
      : 0;
    const marcadas = Array.isArray(item?.dificuldadeFalas)
      ? item.dificuldadeFalas.length
      : 0;

    return `
      <div class="series-line-difficulty-summary" data-series-difficulty-summary>
        <span>Dificuldade percebida</span>
        <strong data-series-difficulty-count>${marcadas} de ${total} falas</strong>
        <small>Marque somente as falas que realmente exigiram tradução ou releitura.</small>
      </div>`;
  }

  async function salvarDificuldadesDaCena(item, dificuldades) {
    if (!contextoAtual?.db || !contextoAtual?.usuario || !item?.data) return false;

    const { db, usuario } = contextoAtual;
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", CHAVE_CENAS_DIARIAS)
      .maybeSingle();

    if (error) throw error;

    const armazenamento = data?.valor && typeof data.valor === "object"
      ? structuredClone(data.valor)
      : { versao: 1, itens: [] };

    if (!Array.isArray(armazenamento.itens)) armazenamento.itens = [];

    let encontrou = false;
    armazenamento.itens = armazenamento.itens.map(cena => {
      if (
        texto(cena?.data) === texto(item.data)
        && texto(cena?.titulo) === texto(item.titulo)
        && texto(cena?.inicio) === texto(item.inicio)
      ) {
        encontrou = true;
        return {
          ...cena,
          dificuldadeFalas: dificuldades,
          dificuldadePercebida: null,
          avaliadoEm: new Date().toISOString()
        };
      }
      return cena;
    });

    if (!encontrou) return false;

    armazenamento.atualizadoEm = new Date().toISOString();

    const payload = {
      user_id: usuario.id,
      chave: CHAVE_CENAS_DIARIAS,
      valor: armazenamento
    };

    const { error: saveError } = await db.from("configuracoes_usuario")
      .upsert(payload, { onConflict: "user_id,chave" });

    if (saveError) throw saveError;

    item.dificuldadeFalas = dificuldades;
    item.dificuldadePercebida = null;
    return true;
  }

  function atualizarResumoDificuldade(section, item) {
    const total = Array.isArray(item?.transcricaoOriginal)
      ? item.transcricaoOriginal.length
      : 0;
    const marcadas = Array.isArray(item?.dificuldadeFalas)
      ? item.dificuldadeFalas.length
      : 0;
    const count = section.querySelector("[data-series-difficulty-count]");
    if (count) count.textContent = `${marcadas} de ${total} falas`;
  }

  function ligarDificuldadePorFala(section, item) {
    section.querySelectorAll("[data-series-line-difficulty]").forEach(input => {
      input.addEventListener("change", async () => {
        const linha = input.closest("[data-series-line]");
        const chave = input.dataset.seriesLineDifficulty;
        const speaker = texto(linha?.dataset.seriesSpeaker);
        const english = texto(linha?.dataset.seriesEnglish);
        const focus = linha?.dataset.seriesFocus === "true";
        const cueIds = texto(linha?.dataset.seriesCueIds)
          .split("|")
          .map(texto)
          .filter(Boolean);

        const atuais = Array.isArray(item.dificuldadeFalas)
          ? [...item.dificuldadeFalas]
          : [];

        const semEsta = atuais.filter(registro => texto(registro?.chave) !== chave);

        if (input.checked) {
          semEsta.push({
            chave,
            speaker,
            english,
            focus,
            cueIds,
            marcadoEm: new Date().toISOString()
          });
        }

        const novas = semEsta;
        input.disabled = true;

        try {
          const salvo = await salvarDificuldadesDaCena(item, novas);
          if (!salvo) throw new Error("Cena não encontrada na configuração diária.");

          linha?.classList.toggle("has-difficulty", input.checked);
          atualizarResumoDificuldade(section, item);

          const status = linha?.querySelector("[data-line-difficulty-status]");
          if (status) {
            status.textContent = input.checked
              ? "Marcada como difícil"
              : "Dificuldade removida";
            window.setTimeout(() => {
              status.textContent = "";
            }, 1800);
          }
        } catch (erro) {
          console.error(erro);
          input.checked = !input.checked;
          const status = linha?.querySelector("[data-line-difficulty-status]");
          if (status) status.textContent = "Não consegui salvar.";
        } finally {
          input.disabled = false;
        }
      });
    });
  }


  function cenaDaData(itens, data) {
    return itens
      .filter(item => texto(item?.data) === data)
      .sort((a, b) =>
        texto(b?.disponibilizadaEm || b?.confirmadoEm || b?.criadoEm)
          .localeCompare(texto(a?.disponibilizadaEm || a?.confirmadoEm || a?.criadoEm))
      )[0] || null;
  }

  function sinalizarPassos(cena) {
    const mapa = {
      understand: document.querySelector('[data-english-step="understand"]'),
      read: document.querySelector('[data-english-step="read"]'),
      produce: document.querySelector('[data-english-step="produce"]'),
      scene: document.querySelector('[data-english-step="scene"]')
    };
    Object.values(mapa).forEach(item => item?.classList.remove("is-muted"));
    mapa.scene?.classList.toggle("is-muted", !cena);
  }

  function atualizarResumo(container, cena) {
    const grammarBruto =
      container.querySelector('[data-lesson-kind="grammar"] .english-block-main-title')?.textContent?.trim()
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

    if (grammar) grammar.querySelector(".english-block-kicker").textContent = "1 · Entenda";
    if (concept) concept.querySelector(".english-block-kicker").textContent = "Como funciona";
    if (examples) examples.querySelector(".english-block-kicker").textContent = "Exemplos do foco";
    if (reading) reading.querySelector(".english-block-kicker").textContent = "2 · Leia e pratique";
    if (expressions) expressions.querySelector(".english-block-kicker").textContent = "Expressões úteis da leitura";
    if (writing) writing.querySelector(".english-block-kicker").textContent = "3 · Produza";

    if (grammar) {
      const titulo = grammar.querySelector(".english-block-main-title");
      if (titulo) titulo.textContent = familiaGramatical(titulo.textContent);
    }
  }

  function transcricaoHtml(item) {
    const transcricao = Array.isArray(item?.transcricaoOriginal)
      ? item.transcricaoOriginal
      : [];

    if (!transcricao.length) {
      return `
        <div class="series-study-missing">
          <strong>Essa cena foi criada numa versão anterior.</strong>
          <span>Rode TESTAR_LEGENDA_LOCAL.bat para selecionar o texto original do seu arquivo .srt.</span>
        </div>`;
    }

    const dificuldades = mapaDificuldades(item);

    return `<div class="series-original-transcript">${transcricao.map((fala, indice) => {
      const chave = chaveFala(fala, indice);
      const dificil = dificuldades.has(chave);
      const cueIds = Array.isArray(fala?.cueIds) ? fala.cueIds.join("|") : "";

      return `
        <article
          class="series-original-turn${fala?.focus ? " is-focus" : ""}${dificil ? " has-difficulty" : ""}"
          data-series-line
          data-series-speaker="${esc(fala?.speaker || `Speaker ${indice + 1}`)}"
          data-series-english="${esc(fala?.english || "")}"
          data-series-focus="${fala?.focus ? "true" : "false"}"
          data-series-cue-ids="${esc(cueIds)}"
        >
          <div class="series-original-speaker">
            <span>${esc(fala?.speaker || `Speaker ${indice + 1}`)}</span>
            ${fala?.focus ? "<b>Foco</b>" : ""}
          </div>

          <div class="series-original-text">
            <p>${esc(fala?.english || "")}</p>

            <div class="series-line-actions">
              ${fala?.meaningPt ? `
                <button type="button" class="series-translation-button" data-series-translation>Ver tradução</button>
              ` : ""}

              <label class="series-line-difficulty-check">
                <input
                  type="checkbox"
                  data-series-line-difficulty="${esc(chave)}"
                  ${dificil ? "checked" : ""}
                >
                <span>Tive dificuldade</span>
              </label>

              <small data-line-difficulty-status></small>
            </div>

            ${fala?.meaningPt ? `
              <p class="series-study-translation" data-series-meaning hidden>${esc(fala.meaningPt)}</p>
            ` : ""}
          </div>
        </article>`;
    }).join("")}</div>`;
  }

  function expressoesHtml(item) {
    const itens = (Array.isArray(item?.expressoes) ? item.expressoes : [])
      .filter(x => texto(typeof x === "string" ? x : x?.english))
      .slice(0, 3);

    if (!itens.length) return "";

    return `<div class="series-study-expressions">
      ${itens.map(x => {
        const english = texto(typeof x === "string" ? x : x.english);
        const meaning = texto(typeof x === "string" ? "" : (x.meaningPt || x.meaning_pt));
        return `<span><strong>${esc(english)}</strong>${meaning ? ` · ${esc(meaning)}` : ""}</span>`;
      }).join("")}
    </div>`;
  }

  function criarCena(item) {
    const section = document.createElement("section");
    section.className = "english-lesson-block english-course-block english-scene-lesson series-reading-final";
    section.dataset.lessonKind = "scene";

    const foco = familiaGramatical(item?.grammarFocus || "");
    const contexto = texto(item?.contexto || item?.resumo);
    const dica = texto(item?.dicaEstudo);
    const score = Number(item?.score || 0);

    section.innerHTML = `
      <header class="series-final-head">
        <div>
          <p class="english-block-kicker">4 · Série — texto original</p>
          <h2>${esc(item?.titulo || "Série ou filme")}</h2>
          <p class="series-final-subtitle">
            Trecho original do arquivo de legenda que você salvou no Life Style. Leia tudo aqui; não é necessário abrir o episódio.
          </p>
        </div>
        <div class="series-final-side">
          <div class="series-final-meta">
            <span>${esc(foco)}</span>
            ${score ? `<span>${Math.max(0, Math.min(100, score))}/100</span>` : ""}
            ${item?.palavrasOriginal ? `<span>${esc(item.palavrasOriginal)} palavras</span>` : ""}
          </div>
          ${resumoDificuldadeHtml(item)}
        </div>
      </header>

      ${contexto ? `<div class="series-context"><span>Contexto</span><p>${esc(contexto)}</p></div>` : ""}

      <section class="series-dialogue-section">
        <div class="series-section-heading">
          <div>
            <span>Texto original da legenda</span>
            <strong>Leia a cena em inglês</strong>
          </div>
          <small>O inglês abaixo vem do seu arquivo .srt. As traduções ficam escondidas.</small>
        </div>
        ${transcricaoHtml(item)}
      </section>

      <section class="series-after-reading">
        <div>
          <span class="series-mini-label">O foco hoje</span>
          <strong>${esc(foco)}</strong>
          <p>As falas marcadas com <b>Foco</b> foram identificadas dentro do texto original como bons exemplos da estrutura estudada.</p>
        </div>
        <div>
          <span class="series-mini-label">Expressões para guardar</span>
          ${expressoesHtml(item) || "<p>Nenhuma expressão extra necessária.</p>"}
        </div>
      </section>

      <section class="series-read-aloud">
        <div>
          <span class="series-mini-label">Leitura em voz alta</span>
          <strong>Agora releia a cena em voz alta, seguindo os falantes.</strong>
          <p>${esc(dica || "Primeiro leia o texto inteiro sem tradução; depois abra apenas as falas que você não entendeu e releia em voz alta.")}</p>
        </div>
      </section>

      <details class="series-origin">
        <summary>Referência da cena original</summary>
        <div>
          <strong>${esc(item?.titulo || "")}</strong>
          <span>${esc(localizacao(item))}</span>
          ${item?.arquivoLegenda ? `<span>${esc(item.arquivoLegenda)}</span>` : ""}
          <p>O texto acima já é o conteúdo do seu arquivo local. Use episódio/timestamp apenas se depois quiser assistir à cena.</p>
        </div>
      </details>
    `;

    return section;
  }

  function criarCenaVazia() {
    const section = document.createElement("section");
    section.className = "english-lesson-block english-course-block english-scene-lesson series-reading-final is-empty";
    section.dataset.lessonKind = "scene";
    section.innerHTML = `
      <header class="series-final-head">
        <div>
          <p class="english-block-kicker">4 · Série — leitura final</p>
          <h2>Sem roteiro de série para esta data</h2>
          <p class="series-final-subtitle">
            O restante da aula continua normalmente. Quando uma cena for aprovada, o roteiro de leitura aparecerá aqui.
          </p>
        </div>
      </header>`;
    return section;
  }

  function ligarTraducoes(section) {
    section.querySelectorAll("[data-series-translation]").forEach(botao => {
      botao.addEventListener("click", () => {
        const significado = botao.parentElement?.querySelector("[data-series-meaning]");
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
          produce: '[data-lesson-kind="writing"]',
          scene: '[data-lesson-kind="scene"]'
        };
        document.querySelector(mapa[botao.dataset.englishStep])
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  async function render({ container, data, db, usuario }) {
    if (!container || !data || !db || !usuario) return null;

    contextoAtual = { db, usuario };
    document.body.classList.remove("english-v6", "english-v7", "english-v10", "english-v12");
    document.body.classList.add("english-v13");
    ligarRota();

    container.querySelector('[data-lesson-kind="scene"]')?.remove();
    organizarBlocos(container);

    let cena = null;
    try {
      const itens = await carregarCenasDisponiveis(db, usuario);
      cena = cenaDaData(itens, data);
    } catch (erro) {
      console.warn("Não foi possível carregar a cena automática do inglês.", erro);
    }

    const grid = container.querySelector(".english-lesson-grid");
    if (grid) {
      const section = cena ? criarCena(cena) : criarCenaVazia();
      grid.append(section);
      ligarTraducoes(section);
      if (cena) ligarDificuldadePorFala(section, cena);
    }

    atualizarResumo(container, cena);
    sinalizarPassos(cena);
    return cena;
  }

  window.MMCDEnglishExperience = { render, familiaGramatical };
})();
