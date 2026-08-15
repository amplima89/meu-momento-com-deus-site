"use strict";

(async () => {
  const db = window.MMCDSupabase;
  const session = await window.MMCDAuth.requireSession();
  const user = session.user;
  const CHAVE_V2 = "catalogo_series_v2";
  const CHAVE_V1 = "catalogo_series_v1";
  const CHAVE_HISTORICO = "historico_series_ingles_v1";
  const $ = seletor => document.querySelector(seletor);
  const esc = valor => window.MMCDUI.esc(valor);

  const SEEDS = [
    { titulo: "Suits", tipo: "serie", prioridade: "alta" },
    { titulo: "Breaking Bad", tipo: "serie", prioridade: "normal" },
    { titulo: "Stranger Things", tipo: "serie", prioridade: "normal" },
    { titulo: "Ted Lasso", tipo: "serie", prioridade: "normal" },
    { titulo: "SEAL Team", tipo: "serie", prioridade: "normal" },
    { titulo: "Top Gun", tipo: "filme", prioridade: "normal" }
  ];

  let catalogo = { versao: 2, producoes: [], atualizadoEm: "" };
  let historico = { versao: 1, itens: [], atualizadoEm: "" };
  let salvando = false;

  const texto = valor => String(valor ?? "").trim();
  const numeroOuVazio = valor => {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : "";
  };
  const novoId = () => globalThis.crypto?.randomUUID
    ? `producao-${crypto.randomUUID()}`
    : `producao-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function normalizarCatalogo(valor) {
    const producoes = Array.isArray(valor?.producoes) ? valor.producoes : [];
    return {
      versao: 2,
      atualizadoEm: texto(valor?.atualizadoEm),
      producoes: producoes.map(p => ({
        id: texto(p?.id) || novoId(),
        titulo: texto(p?.titulo),
        tipo: p?.tipo === "filme" ? "filme" : "serie",
        plataforma: texto(p?.plataforma),
        prioridade: ["alta","normal","baixa"].includes(p?.prioridade) ? p.prioridade : "normal",
        limiteTemporada: numeroOuVazio(p?.limiteTemporada ?? p?.maxTemporada),
        limiteEpisodio: numeroOuVazio(p?.limiteEpisodio ?? p?.maxEpisodio),
        observacoes: texto(p?.observacoes),
        ativa: p?.ativa !== false
      })).filter(p => p.titulo)
    };
  }

  function migrarV1(valor) {
    const anterior = Array.isArray(valor?.producoes) ? valor.producoes : [];
    return normalizarCatalogo({
      versao: 2,
      producoes: anterior.map(p => ({
        id: p?.id,
        titulo: p?.titulo,
        tipo: p?.tipo,
        plataforma: p?.plataforma,
        prioridade: p?.prioridade,
        observacoes: p?.observacoes,
        ativa: p?.ativa,
        limiteTemporada: "",
        limiteEpisodio: ""
      }))
    });
  }

  function normalizarHistorico(valor) {
    return {
      versao: 1,
      itens: Array.isArray(valor?.itens) ? valor.itens : [],
      atualizadoEm: texto(valor?.atualizadoEm)
    };
  }

  async function lerConfiguracao(chave) {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", user.id)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw error;
    return data?.valor || null;
  }

  async function carregar() {
    const [v2, v1, h] = await Promise.all([
      lerConfiguracao(CHAVE_V2),
      lerConfiguracao(CHAVE_V1),
      lerConfiguracao(CHAVE_HISTORICO)
    ]);

    historico = normalizarHistorico(h);

    if (v2) {
      catalogo = normalizarCatalogo(v2);
      return;
    }

    if (v1) {
      catalogo = migrarV1(v1);
      await salvar("Catálogo migrado para seleção automática", false);
      return;
    }

    catalogo = normalizarCatalogo({
      versao: 2,
      producoes: SEEDS.map(item => ({
        id: novoId(),
        ...item,
        plataforma: "",
        observacoes: "",
        ativa: true,
        limiteTemporada: "",
        limiteEpisodio: ""
      }))
    });
    await salvar("Catálogo inicial criado", false);
  }

  async function salvar(mensagem = "Alterações salvas", toast = true) {
    if (salvando) return false;
    salvando = true;
    try {
      catalogo.atualizadoEm = new Date().toISOString();
      const { error } = await db.from("configuracoes_usuario").upsert({
        user_id: user.id,
        chave: CHAVE_V2,
        valor: catalogo
      }, { onConflict: "user_id,chave" });
      if (error) throw error;
      if (toast) MMCDUI.toast(mensagem);
      return true;
    } finally {
      salvando = false;
    }
  }

  function formatarData(iso = "") {
    const data = texto(iso).slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return "—";
    return data.split("-").reverse().join("/");
  }

  function historicoDaProducao(p) {
    return historico.itens.filter(item =>
      texto(item?.producaoId) === p.id ||
      texto(item?.titulo).toLocaleLowerCase("pt-BR") === p.titulo.toLocaleLowerCase("pt-BR")
    );
  }

  function ultimoDaProducao(p) {
    return historicoDaProducao(p)
      .slice()
      .sort((a,b) => texto(b?.data).localeCompare(texto(a?.data)))[0] || null;
  }

  function localizacao(item) {
    if (!item) return "Ainda não utilizada";
    if (item.tipo === "filme") return `${item.inicio || "?"} → ${item.fim || "?"}`;
    const te = [
      item.temporada ? `T${item.temporada}` : "",
      item.episodio ? `E${item.episodio}` : ""
    ].filter(Boolean).join("");
    return `${te || "episódio"} · ${item.inicio || "?"} → ${item.fim || "?"}`;
  }

  function limiteSpoiler(p) {
    if (p.tipo === "filme") return "Não se aplica";
    if (!p.limiteTemporada) return "Sem limite cadastrado";
    return p.limiteEpisodio
      ? `Até T${p.limiteTemporada} E${p.limiteEpisodio}`
      : `Até temporada ${p.limiteTemporada}`;
  }

  function render() {
    const busca = texto($("#production-search").value).toLocaleLowerCase("pt-BR");
    const filtro = $("#production-filter").value;
    const producoes = catalogo.producoes
      .filter(p => !busca || p.titulo.toLocaleLowerCase("pt-BR").includes(busca))
      .filter(p => {
        if (filtro === "ativas") return p.ativa;
        if (filtro === "series") return p.tipo === "serie";
        if (filtro === "filmes") return p.tipo === "filme";
        return true;
      })
      .sort((a,b) => a.titulo.localeCompare(b.titulo, "pt-BR"));

    $("#catalog-empty").hidden = producoes.length > 0;
    $("#production-list").innerHTML = producoes.map(p => {
      const usados = historicoDaProducao(p);
      const ultimo = ultimoDaProducao(p);
      const prioridade = ({alta:"Alta",normal:"Normal",baixa:"Baixa"})[p.prioridade] || "Normal";
      return `<article class="production-card" data-production="${esc(p.id)}">
        <div class="production-head">
          <div>
            <div class="production-title-row">
              <h3>${esc(p.titulo)}</h3>
              <span class="series-badge">${p.tipo === "filme" ? "Filme" : "Série"}</span>
              <span class="series-badge ${p.ativa ? "active" : ""}">${p.ativa ? "Ativa" : "Pausada"}</span>
              <span class="series-badge">Prioridade ${prioridade}</span>
            </div>
            <div class="production-meta">
              ${p.plataforma ? `<span>${esc(p.plataforma)}</span>` : ""}
              <span>${esc(limiteSpoiler(p))}</span>
            </div>
          </div>
          <div class="production-actions">
            <button class="btn small" type="button" data-edit="${esc(p.id)}">Editar</button>
            <button class="btn small danger" type="button" data-delete="${esc(p.id)}">Excluir</button>
          </div>
        </div>
        <div class="production-summary">
          <div class="production-stat"><span>Cenas escolhidas</span><strong>${usados.length}</strong></div>
          <div class="production-stat"><span>Último estudo</span><strong>${ultimo ? `${formatarData(ultimo.data)} · ${esc(localizacao(ultimo))}` : "Ainda não utilizada"}</strong></div>
          <div class="production-stat"><span>Último foco</span><strong>${esc(ultimo?.grammarFocus || "—")}</strong></div>
        </div>
        ${p.observacoes ? `<p class="production-note"><strong>Preferência:</strong> ${esc(p.observacoes)}</p>` : ""}
      </article>`;
    }).join("");

    renderHistorico();
  }

  function renderHistorico() {
    const itens = historico.itens
      .slice()
      .sort((a,b) => texto(b?.data).localeCompare(texto(a?.data)))
      .slice(0, 15);

    $("#series-history-empty").hidden = itens.length > 0;
    $("#series-history").innerHTML = itens.map(item => `
      <div class="history-item">
        <div class="history-date">${formatarData(item.data)}</div>
        <div class="history-main">
          <strong>${esc(item.titulo || "Produção")}</strong>
          <span>${esc(localizacao(item))}${item.motivo ? ` · ${esc(item.motivo)}` : ""}</span>
        </div>
        <div class="history-focus">${esc(item.grammarFocus || "")}</div>
      </div>`).join("");
  }

  function alternarCamposSerie() {
    const serie = $("#production-type").value === "serie";
    document.querySelectorAll("[data-series-only]").forEach(el => { el.hidden = !serie; });
  }

  function abrirFormulario(p = null) {
    $("#production-form-card").hidden = false;
    $("#production-form-title").textContent = p ? "Editar produção" : "Adicionar produção";
    $("#production-id").value = p?.id || "";
    $("#production-title").value = p?.titulo || "";
    $("#production-type").value = p?.tipo || "serie";
    $("#production-platform").value = p?.plataforma || "";
    $("#production-priority").value = p?.prioridade || "normal";
    $("#production-max-season").value = p?.limiteTemporada || "";
    $("#production-max-episode").value = p?.limiteEpisodio || "";
    $("#production-notes").value = p?.observacoes || "";
    $("#production-active").checked = p?.ativa !== false;
    alternarCamposSerie();
    $("#production-form-card").scrollIntoView({behavior:"smooth",block:"start"});
    setTimeout(() => $("#production-title").focus(), 180);
  }

  function fecharFormulario() {
    $("#production-form-card").hidden = true;
    $("#production-form").reset();
    $("#production-id").value = "";
  }

  $("#production-type").addEventListener("change", alternarCamposSerie);
  $("#add-production").addEventListener("click", () => abrirFormulario());
  $("#close-production-form").addEventListener("click", fecharFormulario);
  $("#cancel-production").addEventListener("click", fecharFormulario);
  $("#production-search").addEventListener("input", render);
  $("#production-filter").addEventListener("change", render);

  $("#production-form").addEventListener("submit", async evento => {
    evento.preventDefault();
    const id = texto($("#production-id").value);
    const atual = catalogo.producoes.find(p => p.id === id);
    const tipo = $("#production-type").value === "filme" ? "filme" : "serie";
    const proximo = {
      id: id || novoId(),
      titulo: texto($("#production-title").value),
      tipo,
      plataforma: texto($("#production-platform").value),
      prioridade: $("#production-priority").value,
      limiteTemporada: tipo === "serie" ? numeroOuVazio($("#production-max-season").value) : "",
      limiteEpisodio: tipo === "serie" ? numeroOuVazio($("#production-max-episode").value) : "",
      observacoes: texto($("#production-notes").value),
      ativa: $("#production-active").checked
    };

    if (!proximo.titulo) {
      MMCDUI.toast("Informe o título da produção.");
      return;
    }

    if (atual) Object.assign(atual, proximo);
    else catalogo.producoes.push(proximo);

    try {
      await salvar();
      fecharFormulario();
      render();
    } catch (erro) {
      console.error(erro);
      MMCDUI.toast("Não foi possível salvar a produção.");
    }
  });

  $("#production-list").addEventListener("click", async evento => {
    const edit = evento.target.closest("[data-edit]");
    if (edit) {
      abrirFormulario(catalogo.producoes.find(p => p.id === edit.dataset.edit));
      return;
    }
    const del = evento.target.closest("[data-delete]");
    if (!del) return;
    const p = catalogo.producoes.find(item => item.id === del.dataset.delete);
    if (!p || !confirm(`Excluir "${p.titulo}" do catálogo automático? O histórico estudado será preservado.`)) return;
    catalogo.producoes = catalogo.producoes.filter(item => item.id !== p.id);
    try {
      await salvar("Produção removida");
      render();
    } catch (erro) {
      console.error(erro);
      MMCDUI.toast("Não foi possível excluir a produção.");
    }
  });

  try {
    await carregar();
    render();
  } catch (erro) {
    console.error(erro);
    $("#catalog-empty").hidden = false;
    $("#catalog-empty").textContent = "Não foi possível carregar o catálogo.";
    MMCDUI.toast("Erro ao carregar Séries & filmes.");
  }
})();
