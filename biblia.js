"use strict";

(() => {
  const LIVROS = [{"id": "GEN", "nome": "Gênesis", "api": "Genesis", "capitulos": 50}, {"id": "EXO", "nome": "Êxodo", "api": "Exodus", "capitulos": 40}, {"id": "LEV", "nome": "Levítico", "api": "Leviticus", "capitulos": 27}, {"id": "NUM", "nome": "Números", "api": "Numbers", "capitulos": 36}, {"id": "DEU", "nome": "Deuteronômio", "api": "Deuteronomy", "capitulos": 34}, {"id": "JOS", "nome": "Josué", "api": "Joshua", "capitulos": 24}, {"id": "JDG", "nome": "Juízes", "api": "Judges", "capitulos": 21}, {"id": "RUT", "nome": "Rute", "api": "Ruth", "capitulos": 4}, {"id": "1SA", "nome": "1 Samuel", "api": "1 Samuel", "capitulos": 31}, {"id": "2SA", "nome": "2 Samuel", "api": "2 Samuel", "capitulos": 24}, {"id": "1KI", "nome": "1 Reis", "api": "1 Kings", "capitulos": 22}, {"id": "2KI", "nome": "2 Reis", "api": "2 Kings", "capitulos": 25}, {"id": "1CH", "nome": "1 Crônicas", "api": "1 Chronicles", "capitulos": 29}, {"id": "2CH", "nome": "2 Crônicas", "api": "2 Chronicles", "capitulos": 36}, {"id": "EZR", "nome": "Esdras", "api": "Ezra", "capitulos": 10}, {"id": "NEH", "nome": "Neemias", "api": "Nehemiah", "capitulos": 13}, {"id": "EST", "nome": "Ester", "api": "Esther", "capitulos": 10}, {"id": "JOB", "nome": "Jó", "api": "Job", "capitulos": 42}, {"id": "PSA", "nome": "Salmos", "api": "Psalms", "capitulos": 150}, {"id": "PRO", "nome": "Provérbios", "api": "Proverbs", "capitulos": 31}, {"id": "ECC", "nome": "Eclesiastes", "api": "Ecclesiastes", "capitulos": 12}, {"id": "SNG", "nome": "Cânticos", "api": "Song of Solomon", "capitulos": 8}, {"id": "ISA", "nome": "Isaías", "api": "Isaiah", "capitulos": 66}, {"id": "JER", "nome": "Jeremias", "api": "Jeremiah", "capitulos": 52}, {"id": "LAM", "nome": "Lamentações", "api": "Lamentations", "capitulos": 5}, {"id": "EZK", "nome": "Ezequiel", "api": "Ezekiel", "capitulos": 48}, {"id": "DAN", "nome": "Daniel", "api": "Daniel", "capitulos": 12}, {"id": "HOS", "nome": "Oséias", "api": "Hosea", "capitulos": 14}, {"id": "JOL", "nome": "Joel", "api": "Joel", "capitulos": 3}, {"id": "AMO", "nome": "Amós", "api": "Amos", "capitulos": 9}, {"id": "OBA", "nome": "Obadias", "api": "Obadiah", "capitulos": 1}, {"id": "JON", "nome": "Jonas", "api": "Jonah", "capitulos": 4}, {"id": "MIC", "nome": "Miquéias", "api": "Micah", "capitulos": 7}, {"id": "NAM", "nome": "Naum", "api": "Nahum", "capitulos": 3}, {"id": "HAB", "nome": "Habacuque", "api": "Habakkuk", "capitulos": 3}, {"id": "ZEP", "nome": "Sofonias", "api": "Zephaniah", "capitulos": 3}, {"id": "HAG", "nome": "Ageu", "api": "Haggai", "capitulos": 2}, {"id": "ZEC", "nome": "Zacarias", "api": "Zechariah", "capitulos": 14}, {"id": "MAL", "nome": "Malaquias", "api": "Malachi", "capitulos": 4}, {"id": "MAT", "nome": "Mateus", "api": "Matthew", "capitulos": 28}, {"id": "MRK", "nome": "Marcos", "api": "Mark", "capitulos": 16}, {"id": "LUK", "nome": "Lucas", "api": "Luke", "capitulos": 24}, {"id": "JHN", "nome": "João", "api": "John", "capitulos": 21}, {"id": "ACT", "nome": "Atos", "api": "Acts", "capitulos": 28}, {"id": "ROM", "nome": "Romanos", "api": "Romans", "capitulos": 16}, {"id": "1CO", "nome": "1 Coríntios", "api": "1 Corinthians", "capitulos": 16}, {"id": "2CO", "nome": "2 Coríntios", "api": "2 Corinthians", "capitulos": 13}, {"id": "GAL", "nome": "Gálatas", "api": "Galatians", "capitulos": 6}, {"id": "EPH", "nome": "Efésios", "api": "Ephesians", "capitulos": 6}, {"id": "PHP", "nome": "Filipenses", "api": "Philippians", "capitulos": 4}, {"id": "COL", "nome": "Colossenses", "api": "Colossians", "capitulos": 4}, {"id": "1TH", "nome": "1 Tessalonicenses", "api": "1 Thessalonians", "capitulos": 5}, {"id": "2TH", "nome": "2 Tessalonicenses", "api": "2 Thessalonians", "capitulos": 3}, {"id": "1TI", "nome": "1 Timóteo", "api": "1 Timothy", "capitulos": 6}, {"id": "2TI", "nome": "2 Timóteo", "api": "2 Timothy", "capitulos": 4}, {"id": "TIT", "nome": "Tito", "api": "Titus", "capitulos": 3}, {"id": "PHM", "nome": "Filemom", "api": "Philemon", "capitulos": 1}, {"id": "HEB", "nome": "Hebreus", "api": "Hebrews", "capitulos": 13}, {"id": "JAS", "nome": "Tiago", "api": "James", "capitulos": 5}, {"id": "1PE", "nome": "1 Pedro", "api": "1 Peter", "capitulos": 5}, {"id": "2PE", "nome": "2 Pedro", "api": "2 Peter", "capitulos": 3}, {"id": "1JN", "nome": "1 João", "api": "1 John", "capitulos": 5}, {"id": "2JN", "nome": "2 João", "api": "2 John", "capitulos": 1}, {"id": "3JN", "nome": "3 João", "api": "3 John", "capitulos": 1}, {"id": "JUD", "nome": "Judas", "api": "Jude", "capitulos": 1}, {"id": "REV", "nome": "Apocalipse", "api": "Revelation", "capitulos": 22}];
  const TRADUCAO = "almeida";
  const CHAVE_PREFERENCIA = "biblia_preferencia_v1";
  const db = window.MMCDSupabase;
  const livroSelect = document.querySelector("#biblia-livro");
  const capituloSelect = document.querySelector("#biblia-capitulo");
  const conteudo = document.querySelector("#biblia-conteudo");
  const titulo = document.querySelector("#biblia-titulo");
  const status = document.querySelector("#biblia-status");
  const anterior = document.querySelector("#biblia-anterior");
  const proximo = document.querySelector("#biblia-proximo");
  const listaDestaques = document.querySelector("#biblia-destaques");
  const limpar = document.querySelector("#biblia-limpar");

  if (!db || !livroSelect || !capituloSelect || !conteudo) return;

  let usuario = null;
  let versos = [];
  let destaques = [];
  let filaSalvar = Promise.resolve();
  let timerSelecao = null;
  let tokenCarga = 0;

  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  function livroAtual() { return LIVROS.find(x => x.id === livroSelect.value) || LIVROS[0]; }
  function capituloAtual() { return Math.max(1, Number(capituloSelect.value || 1)); }
  function chaveDestaques() { return `destaques_biblia:${TRADUCAO}:${livroAtual().id}:${capituloAtual()}`; }

  function preencherLivros() {
    livroSelect.innerHTML = LIVROS.map(l => `<option value="${l.id}">${esc(l.nome)}</option>`).join("");
  }

  function preencherCapitulos(valor = 1) {
    const livro = livroAtual();
    capituloSelect.innerHTML = Array.from({ length: livro.capitulos }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
    capituloSelect.value = String(Math.min(Math.max(1, Number(valor || 1)), livro.capitulos));
  }

  async function carregarPreferencia() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", CHAVE_PREFERENCIA)
      .maybeSingle();
    if (error) throw error;
    return data?.valor || { livro: "JHN", capitulo: 1 };
  }

  function salvarPreferencia() {
    const valor = { livro: livroAtual().id, capitulo: capituloAtual(), atualizadoEm: new Date().toISOString() };
    return db.from("configuracoes_usuario").upsert({ user_id: usuario.id, chave: CHAVE_PREFERENCIA, valor }, { onConflict: "user_id,chave" });
  }

  function normalizarDestaques(valor) {
    const lista = Array.isArray(valor) ? valor : valor?.destaques;
    if (!Array.isArray(lista)) return [];
    return lista.map((x, i) => ({
      id: String(x?.id || `biblia-${Date.now()}-${i}`),
      inicio: Number(x?.inicio), fim: Number(x?.fim), texto: String(x?.texto || "")
    })).filter(x => Number.isInteger(x.inicio) && Number.isInteger(x.fim) && x.fim > x.inicio && x.texto.trim()).sort((a, b) => a.inicio - b.inicio);
  }

  async function carregarDestaques() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", chaveDestaques())
      .maybeSingle();
    if (error) throw error;
    destaques = normalizarDestaques(data?.valor);
  }

  function salvarDestaques() {
    const chave = chaveDestaques();
    const valor = { destaques, atualizadoEm: new Date().toISOString() };
    filaSalvar = filaSalvar.catch(() => undefined).then(async () => {
      const { error } = await db.from("configuracoes_usuario").upsert({ user_id: usuario.id, chave, valor }, { onConflict: "user_id,chave" });
      if (error) throw error;
    });
    return filaSalvar;
  }

  function chaveCache() { return `mmcd:biblia:${TRADUCAO}:${livroAtual().id}:${capituloAtual()}`; }

  async function buscarCapitulo() {
    const livro = livroAtual();
    const capitulo = capituloAtual();
    const cacheKey = chaveCache();
    try {
      const url = `https://bible-api.com/${encodeURIComponent(`${livro.api} ${capitulo}`)}?translation=${TRADUCAO}&single_chapter_book_matching=indifferent`;
      const resposta = await fetch(url, { headers: { Accept: "application/json" } });
      if (!resposta.ok) throw new Error(`Resposta ${resposta.status}`);
      const dados = await resposta.json();
      if (!Array.isArray(dados.verses) || !dados.verses.length) throw new Error("Capítulo vazio");
      const resultado = dados.verses.map(v => ({ numero: Number(v.verse), texto: String(v.text || "").replace(/\s+/g, " ").trim() }));
      localStorage.setItem(cacheKey, JSON.stringify({ salvoEm: Date.now(), versos: resultado }));
      return resultado;
    } catch (erro) {
      try {
        const cache = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (Array.isArray(cache?.versos) && cache.versos.length) {
          window.MMCDUI?.toast("A Bíblia online ficou indisponível; exibindo a cópia salva neste navegador.");
          return cache.versos;
        }
      } catch { }
      throw erro;
    }
  }

  function mapaVersos() {
    let cursor = 0;
    return versos.map(verso => {
      const item = { ...verso, inicio: cursor, fim: cursor + verso.texto.length };
      cursor = item.fim + 1; // separador lógico entre versículos
      return item;
    });
  }

  function segmentosVerso(verso, mapa) {
    const relevantes = destaques.filter(d => d.fim > mapa.inicio && d.inicio < mapa.fim).sort((a, b) => a.inicio - b.inicio);
    if (!relevantes.length) return esc(verso.texto);
    let cursor = 0;
    let html = "";
    for (const d of relevantes) {
      const inicio = Math.max(0, d.inicio - mapa.inicio);
      const fim = Math.min(verso.texto.length, d.fim - mapa.inicio);
      if (fim <= cursor) continue;
      html += esc(verso.texto.slice(cursor, inicio));
      html += `<mark class="bible-highlight" data-highlight-id="${esc(d.id)}" title="Duplo clique para remover">${esc(verso.texto.slice(inicio, fim))}</mark>`;
      cursor = fim;
    }
    html += esc(verso.texto.slice(cursor));
    return html;
  }

  function renderizar() {
    const mapas = mapaVersos();
    conteudo.innerHTML = versos.map((verso, i) => `
      <p class="bible-verse" data-verso="${verso.numero}" data-start="${mapas[i].inicio}" data-end="${mapas[i].fim}">
        <span class="bible-verse__number">${verso.numero}</span><span class="bible-verse__text">${segmentosVerso(verso, mapas[i])}</span>
      </p>`).join("");
    titulo.textContent = `${livroAtual().nome} ${capituloAtual()}`;
    status.textContent = `${versos.length} versículos · marcações sincronizadas`;
    renderizarListaDestaques();
    atualizarNavegacao();
  }

  function renderizarListaDestaques() {
    if (!destaques.length) {
      listaDestaques.innerHTML = '<p class="muted">Nenhuma marcação neste capítulo.</p>';
      return;
    }
    listaDestaques.innerHTML = destaques.map(d => `
      <div class="bible-highlight-row" data-id="${esc(d.id)}">
        <p>${esc(d.texto)}</p><button type="button">Remover</button>
      </div>`).join("");
    listaDestaques.querySelectorAll("button").forEach(btn => btn.addEventListener("click", async () => {
      const id = btn.closest("[data-id]").dataset.id;
      await removerDestaque(id);
    }));
  }

  function nosDeTexto() {
    const walker = document.createTreeWalker(conteudo, NodeFilter.SHOW_TEXT, {
      acceptNode(no) {
        return no.parentElement?.closest(".bible-verse__text") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nos = [];
    let no;
    while ((no = walker.nextNode())) nos.push(no);
    return nos;
  }

  function offsetDoPonto(noAlvo, offsetAlvo) {
    let acumulado = 0;
    const nos = nosDeTexto();
    for (const no of nos) {
      if (no === noAlvo) return acumulado + offsetAlvo;
      acumulado += no.nodeValue.length;
      const p = no.parentElement?.closest(".bible-verse");
      const proximo = nos[nos.indexOf(no) + 1]?.parentElement?.closest(".bible-verse");
      if (p && proximo && p !== proximo) acumulado += 1;
    }
    return -1;
  }

  function offsetsDaSelecao(range) {
    let inicio = offsetDoPonto(range.startContainer, range.startOffset);
    let fim = offsetDoPonto(range.endContainer, range.endOffset);
    if (inicio < 0 || fim < 0) return null;
    if (inicio > fim) [inicio, fim] = [fim, inicio];
    return { inicio, fim };
  }

  function cruzaDestaque(inicio, fim) {
    return destaques.some(d => fim > d.inicio && inicio < d.fim);
  }

  async function marcarSelecao({ silencioso = false } = {}) {
    const selecao = getSelection();
    if (!selecao || selecao.isCollapsed || !selecao.rangeCount) {
      if (!silencioso) window.MMCDUI?.toast("Selecione uma palavra ou frase da Bíblia.");
      return;
    }
    const range = selecao.getRangeAt(0);
    const ancestral = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    if (!ancestral || !conteudo.contains(ancestral)) return;
    const texto = range.toString().replace(/\s+/g, " ").trim();
    const offsets = offsetsDaSelecao(range);
    if (!texto || !offsets || offsets.fim <= offsets.inicio) return;
    if (cruzaDestaque(offsets.inicio, offsets.fim)) {
      if (!silencioso) window.MMCDUI?.toast("Esse trecho já cruza uma marcação.");
      return;
    }
    destaques.push({ id: `biblia-${Date.now()}-${Math.random().toString(16).slice(2)}`, ...offsets, texto });
    destaques.sort((a, b) => a.inicio - b.inicio);
    selecao.removeAllRanges();
    renderizar();
    try {
      await salvarDestaques();
      window.MMCDUI?.toast("Marcação bíblica salva no banco.");
    } catch (erro) {
      console.error(erro);
      window.MMCDUI?.toast("A marcação apareceu, mas não sincronizou.");
    }
  }

  async function removerDestaque(id) {
    destaques = destaques.filter(d => d.id !== id);
    renderizar();
    try {
      await salvarDestaques();
      window.MMCDUI?.toast("Marcação removida.");
    } catch (erro) {
      console.error(erro);
      window.MMCDUI?.toast("A remoção não sincronizou.");
    }
  }

  function atualizarNavegacao() {
    const indice = LIVROS.findIndex(x => x.id === livroAtual().id);
    anterior.disabled = indice === 0 && capituloAtual() === 1;
    proximo.disabled = indice === LIVROS.length - 1 && capituloAtual() === livroAtual().capitulos;
  }

  async function carregar() {
    const meuToken = ++tokenCarga;
    conteudo.innerHTML = '<div class="bible-loading">Carregando o capítulo...</div>';
    status.textContent = "Bíblia online · João Ferreira de Almeida";
    await salvarPreferencia();
    try {
      const [capitulo] = await Promise.all([buscarCapitulo(), carregarDestaques()]);
      if (meuToken !== tokenCarga) return;
      versos = capitulo;
      renderizar();
    } catch (erro) {
      console.error(erro);
      conteudo.innerHTML = '<div class="bible-error">Não foi possível carregar este capítulo agora. Verifique a internet e tente novamente.</div>';
      status.textContent = "Falha ao carregar";
    }
  }

  async function navegar(direcao) {
    let indice = LIVROS.findIndex(x => x.id === livroAtual().id);
    let capitulo = capituloAtual() + direcao;
    if (capitulo < 1 && indice > 0) {
      indice -= 1;
      livroSelect.value = LIVROS[indice].id;
      preencherCapitulos(LIVROS[indice].capitulos);
    } else if (capitulo > livroAtual().capitulos && indice < LIVROS.length - 1) {
      indice += 1;
      livroSelect.value = LIVROS[indice].id;
      preencherCapitulos(1);
    } else {
      capituloSelect.value = String(capitulo);
    }
    await carregar();
  }

  livroSelect.addEventListener("change", () => { preencherCapitulos(1); carregar(); });
  capituloSelect.addEventListener("change", carregar);
  anterior.addEventListener("click", () => navegar(-1));
  proximo.addEventListener("click", () => navegar(1));
  conteudo.addEventListener("mouseup", evento => {
    if (evento.button !== 0 || evento.detail > 1) return;
    clearTimeout(timerSelecao);
    timerSelecao = setTimeout(() => marcarSelecao({ silencioso: true }), 250);
  });
  conteudo.addEventListener("dblclick", evento => {
    clearTimeout(timerSelecao);
    const marca = evento.target.closest?.("mark.bible-highlight");
    if (marca) {
      evento.preventDefault();
      removerDestaque(marca.dataset.highlightId);
    } else {
      setTimeout(() => marcarSelecao({ silencioso: true }), 0);
    }
  });
  limpar.addEventListener("click", async () => {
    if (!destaques.length || !confirm("Remover todas as marcações deste capítulo?")) return;
    destaques = [];
    renderizar();
    await salvarDestaques();
  });

  (async () => {
    try {
      const session = await window.MMCDAuth.requireSession();
      usuario = session.user;
      preencherLivros();
      const pref = await carregarPreferencia();
      livroSelect.value = LIVROS.some(x => x.id === pref.livro) ? pref.livro : "JHN";
      preencherCapitulos(pref.capitulo || 1);
      await carregar();
    } catch (erro) {
      console.error(erro);
      conteudo.innerHTML = '<div class="bible-error">Não foi possível iniciar a Bíblia online.</div>';
    }
  })();
})();
