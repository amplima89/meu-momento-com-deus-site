"use strict";

(async () => {
  const d = await MMCD.carregar();
  const db = window.MMCDSupabase;
  const currentUser = await window.MMCDAuth.user();

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const pad = n => String(n).padStart(2, "0");
  const isoDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const iso = isoDate(today);
  const fmt = date => date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const meta = d.configuracoes.missaoAtual || {};
  const number = value => {
    const normalized = String(value ?? "").trim().replace(",", ".");
    return normalized === "" ? Number.NaN : Number(normalized);
  };
  const kg = value => Number(value).toFixed(1).replace(".", ",") + " kg";
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const parseDate = value => new Date(`${value}T12:00:00`);
  const shortDate = value => parseDate(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  async function carregarMetaPeso() {
    const { data, error } = await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", currentUser.id)
      .eq("chave", "meta_peso")
      .maybeSingle();

    if (error) throw new Error(`Não foi possível carregar a meta de peso: ${error.message}`);
    const value = data?.valor || null;
    if (!value || !Number.isFinite(number(value.pesoAlvo))) return null;

    return {
      pesoAlvo: number(value.pesoAlvo),
      pesoInicial: Number.isFinite(number(value.pesoInicial)) ? number(value.pesoInicial) : null,
      dataInicio: value.dataInicio || iso,
      dataLimite: value.dataLimite || ""
    };
  }

  async function salvarMetaPeso(value) {
    const { error } = await db
      .from("configuracoes_usuario")
      .upsert({
        user_id: currentUser.id,
        chave: "meta_peso",
        valor: value
      }, { onConflict: "user_id,chave" });

    if (error) throw new Error(`Não foi possível salvar a meta de peso: ${error.message}`);
  }

  async function excluirMetaPeso() {
    const { error } = await db
      .from("configuracoes_usuario")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("chave", "meta_peso");

    if (error) throw new Error(`Não foi possível remover a meta de peso: ${error.message}`);
  }

  const CHAVE_DIARIO_RAPIDO = "diario_rapido_v1";
  const CATEGORIAS_DIARIO_RAPIDO = [
    ["Fé", "🙏"],
    ["Família", "❤️"],
    ["Trabalho", "💼"],
    ["Pessoal", "🧠"],
    ["Saúde", "🏃"],
    ["Desenvolvimento", "📚"]
  ];

  async function carregarDiarioRapido() {
    const { data, error } = await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", currentUser.id)
      .eq("chave", CHAVE_DIARIO_RAPIDO)
      .maybeSingle();

    if (error) throw new Error(`Não foi possível carregar o registro rápido: ${error.message}`);

    const value = data?.valor;
    return {
      versao: 1,
      registros: Array.isArray(value?.registros) ? value.registros : [],
      atualizadoEm: value?.atualizadoEm || ""
    };
  }

  async function salvarDiarioRapido() {
    diarioRapido.atualizadoEm = new Date().toISOString();
    // Mantém uma memória ampla sem deixar uma única configuração crescer indefinidamente.
    diarioRapido.registros = [...diarioRapido.registros]
      .sort((a, b) => String(b.criadoEm || b.data || "").localeCompare(String(a.criadoEm || a.data || "")))
      .slice(0, 180);

    const { error } = await db
      .from("configuracoes_usuario")
      .upsert({
        user_id: currentUser.id,
        chave: CHAVE_DIARIO_RAPIDO,
        valor: diarioRapido
      }, { onConflict: "user_id,chave" });

    if (error) throw new Error(`Não foi possível salvar o registro rápido: ${error.message}`);
  }

  function inicioJanelaDiarioRapido() {
    const date = new Date(today);
    date.setDate(date.getDate() - 6);
    return isoDate(date);
  }

  function formatarDataCurta(value) {
    if (!value) return "";
    const date = parseDate(value);
    if (value === iso) return "Hoje";
    const ontem = new Date(today);
    ontem.setDate(ontem.getDate() - 1);
    if (value === isoDate(ontem)) return "Ontem";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  function registrosRecentesDiarioRapido() {
    const inicio = inicioJanelaDiarioRapido();
    return [...diarioRapido.registros]
      .filter(item => item?.texto && item?.data >= inicio && item?.data <= iso)
      .sort((a, b) => String(b.criadoEm || b.data || "").localeCompare(String(a.criadoEm || a.data || "")));
  }

  function criarPainelDiarioRapido() {
    const missionCard = document.querySelector("#mission-card");
    if (!missionCard || document.querySelector("#quick-journal-card")) return;

    const section = document.createElement("section");
    section.id = "quick-journal-card";
    section.className = "card quick-journal-card";
    section.innerHTML = `
      <div class="section-head quick-journal-head">
        <div>
          <p class="eyebrow">Memória de curto prazo</p>
          <h2>Registro rápido do dia</h2>
          <p class="muted">Guarde em poucas linhas algo que vale lembrar. A próxima meditação poderá usar isso quando houver conexão real.</p>
        </div>
        <span class="quick-journal-sync">Supabase</span>
      </div>

      <div class="quick-journal-compose">
        <textarea id="quick-journal-text" maxlength="900" rows="3" placeholder="Ex.: Adiei o estudo mesmo sabendo que precisava começar. / Tivemos uma conversa muito boa no jantar. / Treinei sem vontade e fiquei feliz por ter ido."></textarea>
        <div class="quick-journal-voice">
          <button id="quick-journal-mic" class="btn quick-journal-mic" type="button" aria-pressed="false">
            <span aria-hidden="true">🎙️</span>
            <span data-mic-label>Transcrever fala</span>
          </button>
          <span id="quick-journal-voice-status" class="muted">O áudio não é salvo. Apenas o texto transcrito entra no registro.</span>
        </div>
        <div class="quick-journal-categories" role="group" aria-label="Categoria do registro">
          ${CATEGORIAS_DIARIO_RAPIDO.map(([nome, icone]) => `
            <button class="quick-category ${nome === categoriaDiarioRapido ? "is-active" : ""}" type="button" data-quick-category="${escapeHtml(nome)}">
              <span>${icone}</span>${escapeHtml(nome)}
            </button>`).join("")}
        </div>
        <div class="quick-journal-actions">
          <span id="quick-journal-status" class="muted">Pode registrar mais de uma coisa no mesmo dia.</span>
          <button id="quick-journal-save" class="btn primary" type="button">Salvar registro</button>
        </div>
      </div>

      <details class="quick-journal-history">
        <summary>
          <span>Últimos registros</span>
          <span id="quick-journal-count" class="quick-journal-count">0</span>
          <span class="quick-journal-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div id="quick-journal-list" class="quick-journal-list"></div>
      </details>`;

    missionCard.insertAdjacentElement("afterend", section);

    section.querySelectorAll("[data-quick-category]").forEach(button => {
      button.addEventListener("click", () => {
        categoriaDiarioRapido = button.dataset.quickCategory || "Pessoal";
        section.querySelectorAll("[data-quick-category]").forEach(item => {
          item.classList.toggle("is-active", item === button);
        });
      });
    });

    section.querySelector("#quick-journal-save")?.addEventListener("click", salvarNovoRegistroRapido);
    section.querySelector("#quick-journal-mic")?.addEventListener("click", alternarTranscricaoRapida);
    configurarTranscricaoRapida();
    renderizarDiarioRapido();
  }

  let quickSpeechRecognition = null;
  let quickSpeechAtiva = false;
  let quickSpeechBase = "";
  let quickSpeechFinal = "";

  function speechRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function atualizarEstadoMicrofone(ativo, mensagem = "") {
    const button = document.querySelector("#quick-journal-mic");
    const label = button?.querySelector("[data-mic-label]");
    const status = document.querySelector("#quick-journal-voice-status");
    quickSpeechAtiva = !!ativo;
    if (button) {
      button.classList.toggle("is-listening", quickSpeechAtiva);
      button.setAttribute("aria-pressed", quickSpeechAtiva ? "true" : "false");
    }
    if (label) label.textContent = quickSpeechAtiva ? "Parar transcrição" : "Transcrever fala";
    if (status && mensagem) status.textContent = mensagem;
  }

  function configurarTranscricaoRapida() {
    const button = document.querySelector("#quick-journal-mic");
    const status = document.querySelector("#quick-journal-voice-status");
    if (!button) return;

    if (!speechRecognitionCtor()) {
      button.dataset.unsupported = "1";
      if (status) status.textContent = "Este navegador não oferece transcrição direta. No iPhone, use o microfone do teclado no campo acima.";
      return;
    }

    if (status) status.textContent = "O áudio não é salvo. Apenas o texto transcrito entra no registro.";
  }

  function pararTranscricaoRapida() {
    if (!quickSpeechRecognition) return;
    try { quickSpeechRecognition.stop(); } catch {}
  }

  function alternarTranscricaoRapida() {
    const textarea = document.querySelector("#quick-journal-text");
    const status = document.querySelector("#quick-journal-voice-status");
    const Recognition = speechRecognitionCtor();

    if (!Recognition) {
      window.MMCDUI?.toast("Use o microfone do teclado para ditar neste navegador.");
      textarea?.focus();
      return;
    }

    if (quickSpeechAtiva) {
      atualizarEstadoMicrofone(false, "Finalizando a transcrição...");
      pararTranscricaoRapida();
      return;
    }

    quickSpeechBase = String(textarea?.value || "").trim();
    quickSpeechFinal = "";
    const recognition = new Recognition();
    quickSpeechRecognition = recognition;
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      atualizarEstadoMicrofone(true, "Ouvindo... fale normalmente. O áudio não será armazenado.");
    };

    recognition.onresult = event => {
      let finalChunk = "";
      let interimChunk = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = String(event.results[index][0]?.transcript || "").trim();
        if (!transcript) continue;
        if (event.results[index].isFinal) finalChunk += (finalChunk ? " " : "") + transcript;
        else interimChunk += (interimChunk ? " " : "") + transcript;
      }

      if (finalChunk) quickSpeechFinal += (quickSpeechFinal ? " " : "") + finalChunk;
      const parts = [quickSpeechBase, quickSpeechFinal, interimChunk].map(x => String(x || "").trim()).filter(Boolean);
      if (textarea) {
        textarea.value = parts.join(" ").slice(0, 900);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };

    recognition.onerror = event => {
      const map = {
        "not-allowed": "Permita o acesso ao microfone para transcrever sua fala.",
        "audio-capture": "Não encontrei um microfone disponível.",
        "network": "A transcrição do navegador está indisponível agora.",
        "no-speech": "Não detectei fala. Toque no microfone e tente novamente."
      };
      atualizarEstadoMicrofone(false, map[event.error] || "Não foi possível transcrever. Tente novamente.");
    };

    recognition.onend = () => {
      quickSpeechRecognition = null;
      if (quickSpeechAtiva) {
        atualizarEstadoMicrofone(false, "Transcrição encerrada. Revise o texto e salve quando quiser.");
      } else if (status?.textContent === "Finalizando a transcrição...") {
        if (status) status.textContent = "Transcrição encerrada. Revise o texto e salve quando quiser.";
      }
    };

    try {
      recognition.start();
    } catch (error) {
      quickSpeechRecognition = null;
      atualizarEstadoMicrofone(false, "Não foi possível iniciar o microfone.");
      console.warn("Registro rápido: transcrição indisponível.", error);
    }
  }

  function renderizarDiarioRapido() {
    const list = document.querySelector("#quick-journal-list");
    const count = document.querySelector("#quick-journal-count");
    if (!list || !count) return;

    const recentes = registrosRecentesDiarioRapido();
    count.textContent = String(recentes.length);

    if (!recentes.length) {
      list.innerHTML = `<div class="quick-journal-empty">Nenhum registro nos últimos 7 dias. Quando algo importante acontecer, guarde em uma ou duas linhas.</div>`;
      return;
    }

    list.innerHTML = recentes.map(item => `
      <article class="quick-journal-entry" data-quick-id="${escapeHtml(item.id)}">
        <div class="quick-journal-entry__meta">
          <span>${escapeHtml(formatarDataCurta(item.data))}</span>
          <span>${escapeHtml(item.categoria || "Pessoal")}</span>
        </div>
        <p>${escapeHtml(item.texto)}</p>
        <div class="quick-journal-entry__actions">
          <button class="text-link" type="button" data-quick-edit="${escapeHtml(item.id)}">Editar</button>
          <button class="text-link quick-delete" type="button" data-quick-delete="${escapeHtml(item.id)}">Excluir</button>
        </div>
      </article>`).join("");

    list.querySelectorAll("[data-quick-edit]").forEach(button => {
      button.addEventListener("click", () => editarRegistroRapido(button.dataset.quickEdit));
    });
    list.querySelectorAll("[data-quick-delete]").forEach(button => {
      button.addEventListener("click", () => excluirRegistroRapido(button.dataset.quickDelete));
    });
  }

  async function salvarNovoRegistroRapido() {
    if (quickSpeechAtiva) {
      atualizarEstadoMicrofone(false, "Finalizando a transcrição antes de salvar...");
      pararTranscricaoRapida();
    }
    const textarea = document.querySelector("#quick-journal-text");
    const button = document.querySelector("#quick-journal-save");
    const status = document.querySelector("#quick-journal-status");
    const texto = String(textarea?.value || "").trim();

    if (texto.length < 3) {
      window.MMCDUI?.toast("Escreva algo antes de salvar.");
      textarea?.focus();
      return;
    }

    const agora = new Date().toISOString();
    diarioRapido.registros.unshift({
      id: crypto.randomUUID(),
      data: iso,
      categoria: categoriaDiarioRapido,
      texto,
      criadoEm: agora,
      atualizadoEm: agora
    });

    if (button) button.disabled = true;
    if (status) status.textContent = "Salvando no Supabase...";

    try {
      await salvarDiarioRapido();
      if (textarea) textarea.value = "";
      if (status) status.textContent = "Salvo. A automação poderá considerar este registro na próxima meditação.";
      renderizarDiarioRapido();
      window.MMCDUI?.toast("Registro salvo");
    } catch (error) {
      diarioRapido.registros = diarioRapido.registros.filter(item => item.criadoEm !== agora);
      if (status) status.textContent = "Não foi possível salvar.";
      alert(error.message);
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function editarRegistroRapido(id) {
    const item = diarioRapido.registros.find(entry => entry.id === id);
    if (!item) return;

    const novoTexto = prompt("Edite o registro:", item.texto);
    if (novoTexto === null) return;
    const texto = novoTexto.trim();
    if (texto.length < 3) {
      window.MMCDUI?.toast("O registro ficou vazio e não foi alterado.");
      return;
    }

    const anterior = item.texto;
    item.texto = texto;
    item.atualizadoEm = new Date().toISOString();

    try {
      await salvarDiarioRapido();
      renderizarDiarioRapido();
      window.MMCDUI?.toast("Registro atualizado");
    } catch (error) {
      item.texto = anterior;
      alert(error.message);
    }
  }

  async function excluirRegistroRapido(id) {
    const item = diarioRapido.registros.find(entry => entry.id === id);
    if (!item) return;
    if (!confirm("Excluir este registro rápido?")) return;

    const anterior = [...diarioRapido.registros];
    diarioRapido.registros = diarioRapido.registros.filter(entry => entry.id !== id);

    try {
      await salvarDiarioRapido();
      renderizarDiarioRapido();
      window.MMCDUI?.toast("Registro excluído");
    } catch (error) {
      diarioRapido.registros = anterior;
      alert(error.message);
    }
  }

  let metaPeso = await carregarMetaPeso();
  let diarioRapido = await carregarDiarioRapido();
  let categoriaDiarioRapido = "Pessoal";

  const weights = Object.entries(d.pesos)
    .map(([date, value]) => [date, number(value)])
    .filter(([, value]) => Number.isFinite(value))
    .sort((a, b) => a[0].localeCompare(b[0]));

  const lastWeightEntry = weights.at(-1);
  const currentWeight = lastWeightEntry?.[1] ?? null;

  function metaMetrics(goal = metaPeso) {
    if (!goal || currentWeight == null) return null;

    const start = Number.isFinite(goal.pesoInicial) ? goal.pesoInicial : currentWeight;
    const target = goal.pesoAlvo;
    const total = Math.abs(start - target);
    const remaining = Math.abs(currentWeight - target);
    const direction = target < start ? "reduzir" : target > start ? "aumentar" : "manter";

    let moved;
    if (direction === "reduzir") moved = start - currentWeight;
    else if (direction === "aumentar") moved = currentWeight - start;
    else moved = remaining === 0 ? 1 : 0;

    const progress = total === 0
      ? (remaining <= 0.05 ? 100 : 0)
      : clamp(Math.round((moved / total) * 100), 0, 100);

    const achieved = remaining <= 0.05;
    const movingCorrectly = moved > 0;
    const movedAway = moved < 0;

    return { start, target, total, remaining, direction, moved, progress, achieved, movingCorrectly, movedAway };
  }

  function deadlineText(goal = metaPeso) {
    if (!goal?.dataLimite) return "Sem data limite";
    const deadline = parseDate(goal.dataLimite);
    const days = Math.ceil((deadline - today) / 86400000);
    if (days === 0) return "Prazo: hoje";
    if (days > 0) return `Prazo em ${days} dia${days === 1 ? "" : "s"}`;
    return `Prazo vencido há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
  }

  document.querySelector("#today-label").textContent = today.toLocaleDateString("pt-BR");

  document.querySelector("#mission-card").innerHTML = `
    <div>
      <p class="eyebrow">Missão de vida</p>
      <h2>${MMCDUI.esc(meta.titulo || "Defina sua missão de vida")}</h2>
      <span class="muted">Sua direção principal para decisões, hábitos e prioridades.</span>
    </div>
    <div class="mission-date">
      <span class="eyebrow">Hoje</span>
      <strong>${pad(today.getDate())}</strong>
      <span>${today.toLocaleDateString("pt-BR", { month: "long" })}</span>
    </div>`;

  criarPainelDiarioRapido();

  const due = MMCD.metasNaData(d, iso);
  const excusedToday = due.filter(item => MMCD.estaAbonada(MMCD.registro(d, iso, item.id))).length;
  const validToday = Math.max(0, due.length - excusedToday);
  const done = due.filter(item => {
    const row = MMCD.registro(d, iso, item.id);
    return !MMCD.estaAbonada(row) && !!row?.concluida;
  }).length;
  const books = d.livros.concluidos.filter(item => (item.dataConclusao || "").startsWith(String(d.configuracoes.anoMetaLivros)));
  const medDates = Object.keys(d.meditacoes || {}).sort();
  const lastMed = medDates.at(-1) || "";

  function streak() {
    let count = 0;
    const cursor = new Date(today);
    for (;;) {
      const date = isoDate(cursor);
      const goals = MMCD.metasNaData(d, date);
      if (!goals.length) {
        cursor.setDate(cursor.getDate() - 1);
        if (cursor < new Date("2020-01-01")) break;
        continue;
      }
      if (!goals.some(item => MMCD.registro(d, date, item.id)?.concluida)) break;
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  const medMeta = d.metas.find(item => item.nome.toLowerCase().includes("medita"));
  // A existência da meditação gerada para hoje não significa que ela foi realizada.
  // O card só fica concluído quando a atividade/meta de meditação foi efetivamente marcada.
  const medDone = !!(medMeta && MMCD.registro(d, iso, medMeta.id)?.concluida);

  const metrics = metaMetrics();
  let weightDetail = "Último registro";
  if (currentWeight != null && metrics) {
    weightDetail = metrics.achieved
      ? "Meta alcançada"
      : `Meta: ${kg(metrics.target)} · faltam ${kg(metrics.remaining)}`;
  } else if (currentWeight != null) {
    weightDetail = "Defina uma meta";
  }

  const cards = [
    ["🎯", "Missão de vida", meta.titulo || "Não definida", "Direção principal"],
    ["📅", "Data atual", fmt(today), "Hoje"],
    ["🔥", "Sequência de dias", `${streak()} dias`, "Com algum registro"],
    ["📖", "Livro em andamento", d.livros.atual.titulo || "Nenhum", d.livros.atual.autor || "Cadastre sua leitura"],
    ["📚", "Livros concluídos", String(books.length), `Meta anual: ${d.configuracoes.metaLivrosAno}`],
    ["🙏", "Meditação de hoje", medDone ? "Concluída" : "Pendente", lastMed ? `Última: ${MMCDUI.date(lastMed)}` : "Sem registro"],
    ["⚖️", "Peso atual", currentWeight != null ? kg(currentWeight) : "Não informado", weightDetail],
    ["✅", "Hábitos concluídos hoje", `${done} de ${validToday}`, excusedToday ? `${excusedToday} abonada${excusedToday === 1 ? "" : "s"} fora do cálculo` : "Metas válidas previstas"]
  ];

  document.querySelector("#main-cards").innerHTML = cards.map(card => `
    <article class="card dash-card">
      <span class="dash-card__icon">${card[0]}</span>
      <span class="dash-card__label">${card[1]}</span>
      <strong>${MMCDUI.esc(card[2])}</strong>
      <small>${MMCDUI.esc(card[3])}</small>
    </article>`).join("");

  function rate(days, endOffset = 0) {
    let completed = 0;
    let planned = 0;
    for (let index = 0; index < days; index += 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - endOffset - index);
      const value = isoDate(date);
      const goals = MMCD.metasNaData(d, value);
      for (const item of goals) {
        const row = MMCD.registro(d, value, item.id);
        if (MMCD.estaAbonada(row)) continue;
        planned += 1;
        if (row?.concluida) completed += 1;
      }
    }
    return planned ? Math.round((completed / planned) * 100) : 0;
  }

  // A consistência semanal usa sempre os sete dias completos anteriores.
  // O dia vigente fica fora do cálculo para não reduzir a taxa enquanto ainda
  // existem atividades que podem ser concluídas.
  const weekly = rate(7, 1);
  const monthly = rate(30);
  const bookGoal = Math.min(100, Math.round(books.length / (+d.configuracoes.metaLivrosAno || 30) * 100));

  document.querySelector("#consistency-metrics").innerHTML = [
    ["Consistência semanal", weekly],
    ["Consistência mensal", monthly],
    ["Meta anual de livros", bookGoal]
  ].map(item => `
    <div class="metric-row">
      <span>${item[0]}</span>
      <strong>${item[1]}%</strong>
      <div class="progress"><i style="width:${item[1]}%"></i></div>
    </div>`).join("");

  const canvas = document.querySelector("#mini-weight");
  const chartCard = canvas.closest(".card");
  const header = chartCard.querySelector(".section-head");
  header.querySelector(".eyebrow").textContent = "Peso e objetivo";
  header.querySelector("h2").textContent = "Progresso até a meta";
  header.querySelector(".text-link")?.remove();

  const actionWrap = document.createElement("div");
  actionWrap.className = "weight-goal-actions";
  actionWrap.innerHTML = `<button id="open-weight-goal" class="btn small" type="button">${metaPeso ? "Editar meta" : "Definir meta"}</button>`;
  header.appendChild(actionWrap);

  const summary = document.createElement("div");
  summary.id = "weight-goal-summary";
  summary.className = "weight-goal-summary";
  canvas.before(summary);

  const legend = document.createElement("div");
  legend.className = "weight-chart-legend";
  legend.innerHTML = `
    <span><i class="weight-chart-legend__history"></i>Peso registrado</span>
    <span><i class="weight-chart-legend__target"></i>Meta de peso</span>`;
  canvas.after(legend);

  function renderSummary() {
    const values = metaMetrics();
    if (currentWeight == null) {
      summary.innerHTML = `
        <div class="weight-goal-empty">
          <strong>Registre seu peso para começar</strong>
          <span>O progresso será calculado após o primeiro registro.</span>
        </div>`;
      return;
    }

    if (!metaPeso || !values) {
      summary.innerHTML = `
        <div class="weight-goal-empty">
          <strong>Você está com ${kg(currentWeight)}, mas ainda não existe um objetivo.</strong>
          <span>Defina o peso-alvo e o prazo. O peso inicial será capturado automaticamente do último registro.</span>
        </div>`;
      return;
    }

    let status;
    if (values.achieved) status = "Meta alcançada";
    else if (values.movedAway) status = "Você se afastou da meta";
    else if (values.movingCorrectly) status = "Você está avançando";
    else status = "Meta iniciada";

    summary.innerHTML = `
      <div class="weight-goal-grid">
        <div><span>Peso atual</span><strong>${kg(currentWeight)}</strong></div>
        <div><span>Peso-alvo</span><strong>${kg(values.target)}</strong></div>
        <div><span>Falta percorrer</span><strong>${values.achieved ? "0,0 kg" : kg(values.remaining)}</strong></div>
        <div><span>Prazo</span><strong>${escapeHtml(deadlineText())}</strong></div>
      </div>
      <div class="weight-goal-progress">
        <div class="weight-goal-progress__copy">
          <strong>${escapeHtml(status)}</strong>
          <span>${values.progress}% do caminho concluído desde ${kg(values.start)}</span>
        </div>
        <div class="progress"><i style="width:${values.progress}%"></i></div>
      </div>`;
  }

  function chartPoints() {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - 29);
    const cutoffIso = isoDate(cutoff);
    const recent = weights.filter(([date]) => date >= cutoffIso && date <= iso);
    return recent.length ? recent : weights.slice(-8);
  }

  function drawChart() {
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const height = 230;

    canvas.width = Math.max(1, rect.width * ratio);
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, rect.width, height);

    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue("--muted").trim() || "#6b7280";
    const lineColor = styles.getPropertyValue("--line").trim() || "#d8dde5";
    const accent = styles.getPropertyValue("--accent").trim() || "#2563eb";
    const targetColor = "#dc8a20";

    const points = chartPoints();
    const values = points.map(([, value]) => value);
    if (metaPeso) values.push(metaPeso.pesoAlvo);

    if (!points.length) {
      ctx.fillStyle = textColor;
      ctx.font = "13px sans-serif";
      ctx.fillText("Registre seu peso na página Atividades.", 16, 42);
      return;
    }

    // Mantém a leitura do peso em intervalos exatos de 1 kg. O arredondamento
    // para baixo e para cima também cria uma margem visual ao redor dos pontos.
    let min = Math.floor(Math.min(...values)) - 1;
    let max = Math.ceil(Math.max(...values)) + 1;
    if (max <= min) max = min + 1;

    const left = 52;
    const right = 18;
    const top = 18;
    const bottom = 38;
    const chartWidth = Math.max(10, rect.width - left - right);
    const chartHeight = height - top - bottom;

    const y = value => top + (max - value) / (max - min) * chartHeight;
    const x = index => points.length === 1
      ? left + chartWidth / 2
      : left + index * chartWidth / (points.length - 1);

    ctx.font = "11px sans-serif";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 1;

    for (let value = max; value >= min; value -= 1) {
      const yPos = y(value);
      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.moveTo(left, yPos);
      ctx.lineTo(left + chartWidth, yPos);
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.textAlign = "right";
      // A escala mostra somente números inteiros: 88, 89, 90, 91...
      ctx.fillText(String(value), left - 8, yPos);
    }

    if (metaPeso) {
      const targetY = y(metaPeso.pesoAlvo);
      ctx.save();
      ctx.strokeStyle = targetColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.moveTo(left, targetY);
      ctx.lineTo(left + chartWidth, targetY);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = targetColor;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(`Meta ${kg(metaPeso.pesoAlvo)}`, left + chartWidth, targetY - 5);
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach((point, index) => {
      const px = x(index);
      const py = y(point[1]);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    points.forEach((point, index) => {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x(index), y(point[1]), index === points.length - 1 ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const labelIndexes = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";
    labelIndexes.forEach((index, labelPosition) => {
      if (index < 0) return;
      ctx.textAlign = labelPosition === 0 ? "left" : labelPosition === labelIndexes.length - 1 ? "right" : "center";
      ctx.fillText(shortDate(points[index][0]), x(index), top + chartHeight + 12);
    });
  }

  function ensureModal() {
    let overlay = document.querySelector("#weight-goal-modal");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "weight-goal-modal";
    overlay.className = "weight-goal-modal";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="weight-goal-dialog" role="dialog" aria-modal="true" aria-labelledby="weight-goal-title">
        <div class="section-head">
          <div>
            <p class="eyebrow">Objetivo de peso</p>
            <h2 id="weight-goal-title">Definir meta</h2>
          </div>
          <button class="icon-btn" type="button" data-close-weight-goal aria-label="Fechar">×</button>
        </div>
        <form id="weight-goal-form" class="weight-goal-form">
          <div class="weight-goal-current">
            <span>Peso atual capturado</span>
            <strong id="weight-goal-current-value">—</strong>
            <small>Preenchido automaticamente com o último peso registrado.</small>
          </div>
          <label class="field">
            <span>Peso-alvo (kg)</span>
            <input id="weight-goal-target" type="number" min="30" max="300" step="0.1" required>
          </label>
          <label class="field">
            <span>Data limite</span>
            <input id="weight-goal-deadline" type="date">
          </label>
          <p class="muted weight-goal-help">O peso inicial é capturado automaticamente no cadastro. A meta fica salva no Supabase e aparecerá em qualquer computador.</p>
          <div class="weight-goal-form__actions">
            <button id="delete-weight-goal" class="btn danger" type="button">Remover meta</button>
            <div>
              <button class="btn" type="button" data-close-weight-goal>Cancelar</button>
              <button class="btn primary" type="submit">Salvar meta</button>
            </div>
          </div>
        </form>
      </section>`;

    document.body.appendChild(overlay);

    overlay.querySelectorAll("[data-close-weight-goal]").forEach(button => {
      button.addEventListener("click", () => { overlay.hidden = true; });
    });
    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.hidden = true;
    });

    overlay.querySelector("#weight-goal-form").addEventListener("submit", async event => {
      event.preventDefault();
      const start = Number.isFinite(number(metaPeso?.pesoInicial))
        ? number(metaPeso.pesoInicial)
        : currentWeight;
      const target = number(overlay.querySelector("#weight-goal-target").value);
      const deadline = overlay.querySelector("#weight-goal-deadline").value;

      if (!Number.isFinite(start)) {
        alert("Registre seu peso na página Atividades antes de criar a meta.");
        return;
      }
      if (!Number.isFinite(target)) {
        alert("Informe o peso-alvo.");
        return;
      }
      if (Math.abs(start - target) < 0.05) {
        alert("O peso-alvo precisa ser diferente do peso inicial.");
        return;
      }
      if (deadline && deadline < iso) {
        alert("A data limite não pode estar no passado.");
        return;
      }

      const submit = event.submitter;
      if (submit) submit.disabled = true;
      try {
        metaPeso = {
          pesoInicial: start,
          pesoAlvo: target,
          dataInicio: metaPeso?.dataInicio || lastWeightEntry?.[0] || iso,
          dataLimite: deadline
        };
        await salvarMetaPeso(metaPeso);
        overlay.hidden = true;
        window.MMCDUI?.toast("Meta de peso salva");
        setTimeout(() => location.reload(), 300);
      } catch (error) {
        alert(error.message);
      } finally {
        if (submit) submit.disabled = false;
      }
    });

    overlay.querySelector("#delete-weight-goal").addEventListener("click", async () => {
      if (!metaPeso) {
        overlay.hidden = true;
        return;
      }
      if (!confirm("Remover a meta de peso? Os registros de peso serão mantidos.")) return;

      try {
        await excluirMetaPeso();
        metaPeso = null;
        overlay.hidden = true;
        window.MMCDUI?.toast("Meta removida");
        setTimeout(() => location.reload(), 300);
      } catch (error) {
        alert(error.message);
      }
    });

    return overlay;
  }

  document.querySelector("#open-weight-goal").addEventListener("click", () => {
    if (!metaPeso && currentWeight == null) {
      alert("Registre seu peso na página Atividades antes de criar a meta.");
      return;
    }

    const overlay = ensureModal();
    const automaticStart = Number.isFinite(number(metaPeso?.pesoInicial))
      ? number(metaPeso.pesoInicial)
      : currentWeight;
    overlay.querySelector("#weight-goal-title").textContent = metaPeso ? "Editar meta de peso" : "Definir meta de peso";
    overlay.querySelector("#weight-goal-current-value").textContent = Number.isFinite(automaticStart) ? kg(automaticStart) : "—";
    overlay.querySelector("#weight-goal-target").value = metaPeso?.pesoAlvo ?? "";
    overlay.querySelector("#weight-goal-deadline").value = metaPeso?.dataLimite ?? "";
    overlay.querySelector("#delete-weight-goal").hidden = !metaPeso;
    overlay.hidden = false;
    overlay.querySelector("#weight-goal-target").focus();
  });

  renderSummary();
  drawChart();
  addEventListener("resize", drawChart);

  document.querySelector("#last-meditation").innerHTML = lastMed
    ? `<p class="meditation-date">${MMCDUI.date(lastMed)}</p>
       <p class="meditation-note">Seu registro espiritual mais recente. Continue transformando constância em profundidade.</p>
       <a class="text-link" href="index.html">Abrir meditação →</a>`
    : '<div class="empty">Nenhuma meditação registrada.</div>';
})().catch(error => {
  console.error(error);
  window.MMCDUI?.toast(error.message || "Não foi possível carregar o painel.", 6000);
});
