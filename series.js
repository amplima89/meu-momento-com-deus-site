"use strict";

(async () => {
  const db = window.MMCDSupabase;
  const session = await window.MMCDAuth.requireSession();
  const user = session.user;
  const CHAVE = "catalogo_series_v1";
  const $ = selector => document.querySelector(selector);
  const esc = value => window.MMCDUI.esc(value);

  const SEEDS = [
    { titulo: "Suits", tipo: "serie" },
    { titulo: "Breaking Bad", tipo: "serie" },
    { titulo: "Stranger Things", tipo: "serie" },
    { titulo: "Ted Lasso", tipo: "serie" },
    { titulo: "SEAL Team", tipo: "serie" },
    { titulo: "Top Gun", tipo: "filme" }
  ];

  let catalogo = { versao: 1, producoes: [], atualizadoEm: "" };
  let saving = false;

  function idNovo(prefixo = "item") {
    if (globalThis.crypto?.randomUUID) return `${prefixo}-${globalThis.crypto.randomUUID()}`;
    return `${prefixo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function texto(value) { return String(value ?? "").trim(); }
  function normalizar(value) { return texto(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"); }

  function setMessage(selector, message = "", state = "") {
    const el = $(selector);
    if (!el) return;
    el.textContent = message;
    el.dataset.state = state;
    el.hidden = !message;
  }

  function tituloTipo(tipo) { return tipo === "filme" ? "Filme" : "Série"; }
  function tituloPrioridade(priority) { return ({ alta: "Alta", normal: "Normal", baixa: "Baixa" })[priority] || "Normal"; }
  function tituloStatus(status) { return ({ "para-estudar": "Para estudar", estudando: "Estudando", revisada: "Revisada" })[status] || "Para estudar"; }

  function normalizarCatalogo(value) {
    const producoes = Array.isArray(value?.producoes) ? value.producoes : [];
    return {
      versao: 1,
      atualizadoEm: texto(value?.atualizadoEm),
      producoes: producoes.map((p, index) => ({
        id: texto(p?.id) || idNovo(`producao-${index}`),
        titulo: texto(p?.titulo),
        tipo: p?.tipo === "filme" ? "filme" : "serie",
        plataforma: texto(p?.plataforma),
        prioridade: ["alta", "normal", "baixa"].includes(p?.prioridade) ? p.prioridade : "normal",
        observacoes: texto(p?.observacoes),
        ativa: p?.ativa !== false,
        cenas: Array.isArray(p?.cenas) ? p.cenas.map((c, cIndex) => ({
          id: texto(c?.id) || idNovo(`cena-${cIndex}`),
          tema: texto(c?.tema),
          temporada: texto(c?.temporada),
          episodio: texto(c?.episodio),
          inicio: texto(c?.inicio),
          fim: texto(c?.fim),
          identificacao: texto(c?.identificacao),
          transcricao: texto(c?.transcricao),
          pontos: Array.isArray(c?.pontos) ? c.pontos.map(texto).filter(Boolean) : texto(c?.pontos).split(/\r?\n/).map(texto).filter(Boolean),
          status: ["para-estudar", "estudando", "revisada"].includes(c?.status) ? c.status : "para-estudar",
          observacoes: texto(c?.observacoes),
          criadoEm: texto(c?.criadoEm),
          atualizadoEm: texto(c?.atualizadoEm)
        })) : []
      })).filter(p => p.titulo)
    };
  }

  async function carregar() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", user.id)
      .eq("chave", CHAVE)
      .maybeSingle();
    if (error) throw new Error(`Não foi possível carregar o catálogo: ${error.message}`);

    if (data?.valor) {
      catalogo = normalizarCatalogo(data.valor);
      return;
    }

    catalogo = normalizarCatalogo({
      versao: 1,
      producoes: SEEDS.map((item, index) => ({
        id: `inicio-${index + 1}`,
        ...item,
        plataforma: "",
        prioridade: index === 0 ? "alta" : "normal",
        observacoes: "",
        ativa: true,
        cenas: []
      }))
    });
    await salvar("Catálogo inicial criado", false);
  }

  async function salvar(message = "Alterações salvas", toast = true) {
    if (saving) return false;
    saving = true;
    try {
      catalogo.atualizadoEm = new Date().toISOString();
      const { error } = await db.from("configuracoes_usuario").upsert({
        user_id: user.id,
        chave: CHAVE,
        valor: catalogo
      }, { onConflict: "user_id,chave" });
      if (error) throw new Error(error.message);
      if (toast) MMCDUI.toast(message, 3200);
      return true;
    } finally {
      saving = false;
    }
  }

  function fecharMenus() { document.querySelectorAll(".series-menu").forEach(menu => menu.remove()); }

  function atualizarSelectProducoes(preferida = "") {
    const select = $("#scene-production");
    const atual = preferida || select.value;
    select.innerHTML = catalogo.producoes
      .sort((a,b) => a.titulo.localeCompare(b.titulo, "pt-BR"))
      .map(p => `<option value="${esc(p.id)}">${esc(p.titulo)} · ${tituloTipo(p.tipo)}</option>`).join("");
    if (catalogo.producoes.some(p => p.id === atual)) select.value = atual;
  }

  function abrirProducao(producao = null) {
    $("#scene-form-card").hidden = true;
    $("#production-form-card").hidden = false;
    $("#production-form-title").textContent = producao ? "Editar produção" : "Adicionar produção";
    $("#production-id").value = producao?.id || "";
    $("#production-title").value = producao?.titulo || "";
    $("#production-type").value = producao?.tipo || "serie";
    $("#production-platform").value = producao?.plataforma || "";
    $("#production-priority").value = producao?.prioridade || "normal";
    $("#production-notes").value = producao?.observacoes || "";
    $("#production-active").checked = producao?.ativa !== false;
    setMessage("#production-form-message");
    window.scrollTo({ top: $("#production-form-card").offsetTop - 20, behavior: "smooth" });
    setTimeout(() => $("#production-title").focus(), 200);
  }

  function fecharProducao() {
    $("#production-form-card").hidden = true;
    $("#production-form").reset();
    $("#production-id").value = "";
    setMessage("#production-form-message");
  }

  function localizarCena(sceneId) {
    for (const producao of catalogo.producoes) {
      const cena = producao.cenas.find(item => item.id === sceneId);
      if (cena) return { producao, cena };
    }
    return null;
  }

  function abrirCena(productionId = "", cena = null) {
    if (!catalogo.producoes.length) {
      MMCDUI.toast("Cadastre uma série ou filme antes de adicionar uma cena.", 4500);
      abrirProducao();
      return;
    }
    $("#production-form-card").hidden = true;
    $("#scene-form-card").hidden = false;
    $("#scene-form-title").textContent = cena ? "Editar cena" : "Adicionar cena";
    $("#scene-id").value = cena?.id || "";
    atualizarSelectProducoes(productionId || "");
    if (productionId && catalogo.producoes.some(p => p.id === productionId)) $("#scene-production").value = productionId;
    $("#scene-topic").value = cena?.tema || "";
    $("#scene-season").value = cena?.temporada || "";
    $("#scene-episode").value = cena?.episodio || "";
    $("#scene-start").value = cena?.inicio || "";
    $("#scene-end").value = cena?.fim || "";
    $("#scene-label").value = cena?.identificacao || "";
    $("#scene-transcript").value = cena?.transcricao || "";
    $("#scene-points").value = (cena?.pontos || []).join("\n");
    $("#scene-status").value = cena?.status || "para-estudar";
    $("#scene-notes").value = cena?.observacoes || "";
    setMessage("#scene-form-message");
    window.scrollTo({ top: $("#scene-form-card").offsetTop - 20, behavior: "smooth" });
    setTimeout(() => $("#scene-topic").focus(), 200);
  }

  function fecharCena() {
    $("#scene-form-card").hidden = true;
    $("#scene-form").reset();
    $("#scene-id").value = "";
    setMessage("#scene-form-message");
  }

  function renderTranscricao(transcricao = "") {
    if (!texto(transcricao)) return "";
    const linhas = transcricao.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!linhas.length) return "";
    const html = linhas.map(linha => {
      const match = linha.match(/^([^:]{1,40}):\s*(.+)$/);
      if (!match) return `<div class="dialogue-line"><span class="dialogue-speaker">—</span><span class="dialogue-text">${esc(linha)}</span></div>`;
      return `<div class="dialogue-line"><span class="dialogue-speaker">${esc(match[1])}</span><span class="dialogue-text">${esc(match[2])}</span></div>`;
    }).join("");
    return `<div class="scene-transcript">${html}</div>`;
  }

  function sceneLocation(p, c) {
    const itens = [];
    if (p.tipo === "serie" && c.temporada) itens.push(`T${c.temporada}`);
    if (p.tipo === "serie" && c.episodio) itens.push(`E${c.episodio}`);
    if (c.inicio || c.fim) itens.push(`${c.inicio || "?"} → ${c.fim || "?"}`);
    return itens.join(" · ") || "Localização ainda não informada";
  }

  function renderCena(p, c) {
    const pontos = (c.pontos || []).filter(Boolean);
    return `<article class="scene-card" data-scene-id="${esc(c.id)}">
      <div class="scene-head">
        <div>
          <h4 class="scene-title">${esc(c.identificacao || c.tema || "Cena de estudo")}</h4>
          <div class="scene-location">${esc(sceneLocation(p,c))}</div>
          ${c.tema ? `<div class="scene-topic"><span class="series-badge active">${esc(c.tema)}</span> <span class="series-badge">${esc(tituloStatus(c.status))}</span></div>` : `<div class="scene-topic"><span class="series-badge">${esc(tituloStatus(c.status))}</span></div>`}
        </div>
        <div class="scene-actions"><button class="btn small" type="button" data-scene-edit="${esc(c.id)}">Editar</button><button class="btn small danger" type="button" data-scene-delete="${esc(c.id)}">Excluir</button></div>
      </div>
      ${renderTranscricao(c.transcricao)}
      ${pontos.length ? `<ul class="scene-points">${pontos.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${c.observacoes ? `<p class="scene-note"><strong>Observação:</strong> ${esc(c.observacoes)}</p>` : ""}
    </article>`;
  }

  function passarFiltro(producao, query, filtro) {
    if (filtro === "ativas" && !producao.ativa) return false;
    if (filtro === "serie" && producao.tipo !== "serie") return false;
    if (filtro === "filme" && producao.tipo !== "filme") return false;
    if (!query) return true;
    const universo = [producao.titulo, producao.plataforma, producao.observacoes,
      ...producao.cenas.flatMap(c => [c.tema,c.identificacao,c.observacoes,(c.pontos||[]).join(" ")])].join(" ");
    return normalizar(universo).includes(query);
  }

  function render() {
    fecharMenus();
    const todasCenas = catalogo.producoes.flatMap(p => p.cenas || []);
    $("#stat-active").textContent = String(catalogo.producoes.filter(p => p.ativa).length);
    $("#stat-series").textContent = String(catalogo.producoes.filter(p => p.tipo === "serie").length);
    $("#stat-films").textContent = String(catalogo.producoes.filter(p => p.tipo === "filme").length);
    $("#stat-scenes").textContent = String(todasCenas.length);
    atualizarSelectProducoes();

    const query = normalizar($("#series-search").value);
    const filtro = $("#series-filter").value;
    const lista = [...catalogo.producoes]
      .filter(p => passarFiltro(p, query, filtro))
      .sort((a,b) => {
        const priority = { alta: 0, normal: 1, baixa: 2 };
        return (Number(!a.ativa)-Number(!b.ativa)) || (priority[a.prioridade]-priority[b.prioridade]) || a.titulo.localeCompare(b.titulo, "pt-BR");
      });

    $("#series-list").innerHTML = lista.map(p => `<article class="production-card" data-production-id="${esc(p.id)}">
      <div class="production-main">
        <div>
          <div class="production-title-row">
            <h3>${esc(p.titulo)}</h3>
            <span class="series-badge">${tituloTipo(p.tipo)}</span>
            ${p.ativa ? '<span class="series-badge active">Ativa</span>' : '<span class="series-badge">Inativa</span>'}
            <span class="series-badge ${p.prioridade === "alta" ? "high" : ""}">Prioridade ${esc(tituloPrioridade(p.prioridade))}</span>
          </div>
          <div class="series-meta">
            <span>${p.plataforma ? esc(p.plataforma) : "Plataforma não informada"}</span>
            <span>${p.cenas.length} ${p.cenas.length === 1 ? "cena cadastrada" : "cenas cadastradas"}</span>
          </div>
          ${p.observacoes ? `<p class="production-notes">${esc(p.observacoes)}</p>` : ""}
        </div>
        <div class="production-actions">
          <button class="btn small" type="button" data-add-scene="${esc(p.id)}">+ Cena</button>
          <div class="series-menu-wrap"><button class="icon-btn" type="button" data-production-menu="${esc(p.id)}" aria-label="Ações de ${esc(p.titulo)}">⋮</button></div>
        </div>
      </div>
      <details class="production-scenes" ${p.cenas.length ? "" : ""}>
        <summary><span>Cenas de estudo</span><span class="muted">${p.cenas.length}</span></summary>
        <div class="scene-list">${p.cenas.length ? p.cenas.map(c => renderCena(p,c)).join("") : '<div class="scene-empty">Nenhuma cena cadastrada. Use “+ Cena” para adicionar o primeiro trecho.</div>'}</div>
      </details>
    </article>`).join("") || '<div class="empty">Nenhuma produção encontrada com esse filtro.</div>';

    bindRenderActions();
  }

  function bindRenderActions() {
    document.querySelectorAll("[data-add-scene]").forEach(btn => btn.onclick = () => abrirCena(btn.dataset.addScene));
    document.querySelectorAll("[data-scene-edit]").forEach(btn => btn.onclick = () => {
      const found = localizarCena(btn.dataset.sceneEdit);
      if (found) abrirCena(found.producao.id, found.cena);
    });
    document.querySelectorAll("[data-scene-delete]").forEach(btn => btn.onclick = async () => {
      const found = localizarCena(btn.dataset.sceneDelete);
      if (!found || !confirm(`Excluir esta cena de “${found.producao.titulo}”?`)) return;
      const snapshot = clone(catalogo);
      found.producao.cenas = found.producao.cenas.filter(c => c.id !== found.cena.id);
      try { await salvar("Cena excluída"); render(); }
      catch (error) { catalogo = snapshot; render(); MMCDUI.toast(`Não foi possível excluir: ${error.message}`, 6000); }
    });
    document.querySelectorAll("[data-production-menu]").forEach(btn => btn.onclick = event => {
      event.stopPropagation();
      fecharMenus();
      const p = catalogo.producoes.find(x => x.id === btn.dataset.productionMenu);
      if (!p) return;
      const menu = document.createElement("div");
      menu.className = "series-menu";
      menu.innerHTML = `<button type="button" data-action="edit">Editar produção</button><button type="button" data-action="toggle">${p.ativa ? "Desativar" : "Ativar"}</button><button type="button" data-action="delete">Excluir produção</button>`;
      btn.parentElement.append(menu);
      menu.onclick = async e => {
        const action = e.target.dataset.action;
        if (!action) return;
        menu.remove();
        if (action === "edit") return abrirProducao(p);
        if (action === "toggle") {
          const snapshot = clone(catalogo); p.ativa = !p.ativa;
          try { await salvar(p.ativa ? "Produção ativada" : "Produção desativada"); render(); }
          catch(error) { catalogo = snapshot; render(); MMCDUI.toast(`Não foi possível salvar: ${error.message}`, 6000); }
          return;
        }
        if (action === "delete" && confirm(`Excluir “${p.titulo}” e todas as ${p.cenas.length} cenas cadastradas?`)) {
          const snapshot = clone(catalogo); catalogo.producoes = catalogo.producoes.filter(x => x.id !== p.id);
          try { await salvar("Produção excluída"); render(); }
          catch(error) { catalogo = snapshot; render(); MMCDUI.toast(`Não foi possível excluir: ${error.message}`, 6000); }
        }
      };
    });
  }

  $("#open-production-form").onclick = () => abrirProducao();
  $("#close-production-form").onclick = fecharProducao;
  $("#cancel-production").onclick = fecharProducao;
  $("#open-scene-form").onclick = () => abrirCena();
  $("#close-scene-form").onclick = fecharCena;
  $("#cancel-scene").onclick = fecharCena;
  $("#series-search").oninput = render;
  $("#series-filter").onchange = render;
  document.addEventListener("click", event => { if (!event.target.closest(".series-menu-wrap")) fecharMenus(); });

  $("#production-form").onsubmit = async event => {
    event.preventDefault();
    const id = texto($("#production-id").value);
    const titulo = texto($("#production-title").value);
    if (!titulo) { setMessage("#production-form-message", "Informe o título.", "error"); return; }
    const duplicate = catalogo.producoes.find(p => p.id !== id && normalizar(p.titulo) === normalizar(titulo));
    if (duplicate) { setMessage("#production-form-message", "Essa produção já está cadastrada.", "error"); return; }
    const snapshot = clone(catalogo);
    const atual = catalogo.producoes.find(p => p.id === id);
    const value = {
      id: id || idNovo("producao"), titulo,
      tipo: $("#production-type").value === "filme" ? "filme" : "serie",
      plataforma: texto($("#production-platform").value),
      prioridade: $("#production-priority").value,
      observacoes: texto($("#production-notes").value),
      ativa: $("#production-active").checked,
      cenas: atual?.cenas || []
    };
    if (atual) Object.assign(atual, value); else catalogo.producoes.push(value);
    const btn = event.submitter; btn.disabled = true; setMessage("#production-form-message", "Salvando no Supabase...", "saving");
    try { await salvar(id ? "Produção atualizada" : "Produção adicionada"); fecharProducao(); render(); }
    catch(error) { catalogo = snapshot; render(); setMessage("#production-form-message", `Não foi possível salvar: ${error.message}`, "error"); }
    finally { btn.disabled = false; }
  };

  $("#scene-form").onsubmit = async event => {
    event.preventDefault();
    const productionId = $("#scene-production").value;
    const p = catalogo.producoes.find(x => x.id === productionId);
    if (!p) { setMessage("#scene-form-message", "Selecione uma produção válida.", "error"); return; }
    const id = texto($("#scene-id").value);
    const snapshot = clone(catalogo);
    let source = id ? localizarCena(id) : null;
    const now = new Date().toISOString();
    const scene = {
      id: id || idNovo("cena"),
      tema: texto($("#scene-topic").value), temporada: texto($("#scene-season").value), episodio: texto($("#scene-episode").value),
      inicio: texto($("#scene-start").value), fim: texto($("#scene-end").value), identificacao: texto($("#scene-label").value),
      transcricao: texto($("#scene-transcript").value), pontos: $("#scene-points").value.split(/\r?\n/).map(texto).filter(Boolean),
      status: $("#scene-status").value, observacoes: texto($("#scene-notes").value),
      criadoEm: source?.cena?.criadoEm || now, atualizadoEm: now
    };
    if (!scene.tema && !scene.identificacao) { setMessage("#scene-form-message", "Informe pelo menos o tema ou a identificação da cena.", "error"); return; }
    if (source) {
      source.producao.cenas = source.producao.cenas.filter(c => c.id !== id);
      p.cenas.push(scene);
    } else p.cenas.push(scene);
    const btn = event.submitter; btn.disabled = true; setMessage("#scene-form-message", "Salvando no Supabase...", "saving");
    try { await salvar(id ? "Cena atualizada" : "Cena adicionada"); fecharCena(); render(); }
    catch(error) { catalogo = snapshot; render(); setMessage("#scene-form-message", `Não foi possível salvar: ${error.message}`, "error"); }
    finally { btn.disabled = false; }
  };

  await carregar();
  render();
})().catch(error => {
  console.error(error);
  window.MMCDUI?.toast(error?.message || "Erro ao carregar Séries & filmes.", 7000);
  const list = document.querySelector("#series-list");
  if (list) list.innerHTML = `<div class="empty">${window.MMCDUI?.esc(error?.message || "Não foi possível carregar o catálogo.")}</div>`;
});
