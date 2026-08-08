"use strict";

(async () => {
  const CHAVE_BANCO = "ingles_estruturas_v1";
  const CHAVE_REVISAO = "ingles_estruturas_revisao_v2";
  const LIMITE = 5;
  const seletor = document.querySelector("#ingles-data");
  const card = document.querySelector("#revisao-ingles-card");
  const lista = document.querySelector("#revisao-ingles-lista");
  const progresso = document.querySelector("#revisao-ingles-progresso");
  const resumo = document.querySelector("#revisao-ingles-resumo");
  const vazio = document.querySelector("#revisao-ingles-vazio");
  const concluida = document.querySelector("#revisao-ingles-concluida");

  if (!seletor || !card || !lista || !window.MMCDSupabase || !window.MMCDAuth) return;

  const db = window.MMCDSupabase;
  const sessao = await window.MMCDAuth.requireSession();
  const usuario = sessao.user;
  let banco = { versao: 1, itens: {} };
  let revisao = { versao: 2, itens: {}, atualizadoEm: "" };
  let itensHoje = [];
  let indice = 0;
  let filaSalvar = Promise.resolve();

  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  function dataSelecionada() {
    const opcao = seletor.options[seletor.selectedIndex];
    const texto = opcao?.textContent || "";
    const br = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return texto.match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
  }

  function somarDias(iso, dias) {
    const data = new Date(`${iso}T12:00:00`);
    data.setDate(data.getDate() + dias);
    return data.toISOString().slice(0, 10);
  }

  function normalizar(valor = "") {
    return String(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("en-US")
      .replace(/\s+/g, " ")
      .trim();
  }

  function preencherModelo(modelo = "", valor = "") {
    const base = String(modelo).trim();
    const complemento = String(valor).trim();
    if (!base) return complemento;
    if (/_{2,}/.test(base)) return base.replace(/_{2,}/, complemento);
    if (/\.{3,}/.test(base)) return base.replace(/\.{3,}/, complemento);
    return base;
  }

  function valorPromptPt(prompt = "") {
    const texto = String(prompt).trim();
    if (!texto) return "";
    const partes = texto.split(/\s*(?:→|=>|=|\|)\s*/).filter(Boolean);
    return (partes[0] || texto).trim();
  }

  function cartoesDoItem(item) {
    const salvos = Array.isArray(item?.cartoes)
      ? item.cartoes
          .map(cartao => ({
            dataOrigem: item.dataOrigem,
            grammar: item.grammar || "Estrutura fundamental",
            pattern: item.pattern || "",
            frente: String(cartao?.frente || "").trim(),
            resposta: String(cartao?.resposta || "").trim()
          }))
          .filter(cartao => cartao.frente && cartao.resposta && !/_{2,}/.test(cartao.frente))
      : [];

    if (salvos.length) return salvos;

    // Compatibilidade com atividades salvas antes desta melhoria:
    // cria somente uma frase COMPLETA, nunca um cartão com palavra oculta.
    const prompt = valorPromptPt(item?.prompts?.[0] || "");
    const frente = preencherModelo(item?.meaning || "", prompt);
    const resposta = String(item?.model || "").trim();
    if (!frente || !resposta || /_{2,}/.test(frente)) return [];
    return [{
      dataOrigem: item.dataOrigem,
      grammar: item.grammar || "Estrutura fundamental",
      pattern: item.pattern || "",
      frente,
      resposta
    }];
  }

  function chaveCartao(cartao) {
    return [cartao.pattern, cartao.frente, cartao.resposta].map(normalizar).join("::");
  }

  async function lerConfiguracao(chave) {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw error;
    return data?.valor && typeof data.valor === "object" ? data.valor : null;
  }

  async function carregar() {
    const [valorBanco, valorRevisao] = await Promise.all([
      lerConfiguracao(CHAVE_BANCO),
      lerConfiguracao(CHAVE_REVISAO)
    ]);
    banco = {
      versao: 1,
      itens: valorBanco?.itens && typeof valorBanco.itens === "object" ? valorBanco.itens : {}
    };
    revisao = {
      versao: 2,
      itens: valorRevisao?.itens && typeof valorRevisao.itens === "object" ? valorRevisao.itens : {},
      atualizadoEm: valorRevisao?.atualizadoEm || ""
    };
  }

  function salvar() {
    revisao.atualizadoEm = new Date().toISOString();
    const valor = JSON.parse(JSON.stringify(revisao));
    filaSalvar = filaSalvar.catch(() => undefined).then(async () => {
      const { error } = await db.from("configuracoes_usuario").upsert({
        user_id: usuario.id,
        chave: CHAVE_REVISAO,
        valor
      }, { onConflict: "user_id,chave" });
      if (error) throw error;
    });
    return filaSalvar;
  }

  function historico(cartao, dataAtual) {
    const registro = revisao.itens[chaveCartao(cartao)] || { respostas: {} };
    const respostas = Object.entries(registro.respostas || {}).sort(([a], [b]) => a.localeCompare(b));
    let intervalo = 1;
    let proxima = somarDias(cartao.dataOrigem, 1);
    let acertos = 0;
    let erros = 0;

    for (const [data, resposta] of respostas) {
      if (resposta === "nao") {
        erros += 1;
        intervalo = 1;
        proxima = somarDias(data, 1);
      } else {
        acertos += 1;
        intervalo = intervalo <= 1 ? 3 : intervalo <= 3 ? 7 : intervalo <= 7 ? 14 : 30;
        proxima = somarDias(data, intervalo);
      }
    }
    return { proxima, acertos, erros, devido: proxima <= dataAtual };
  }

  function selecionar(dataAtual) {
    const unicos = new Map();

    for (const item of Object.values(banco.itens || {})) {
      if (!item?.dataOrigem || item.dataOrigem >= dataAtual) continue;
      for (const cartao of cartoesDoItem(item)) {
        const chave = chaveCartao(cartao);
        const anterior = unicos.get(chave);
        if (!anterior || anterior.dataOrigem < cartao.dataOrigem) unicos.set(chave, cartao);
      }
    }

    return [...unicos.values()]
      .map(cartao => ({ cartao, hist: historico(cartao, dataAtual) }))
      .filter(x => x.hist.devido)
      .sort((a, b) => a.hist.proxima.localeCompare(b.hist.proxima) || a.cartao.dataOrigem.localeCompare(b.cartao.dataOrigem))
      .slice(0, LIMITE)
      .map(x => x.cartao);
  }

  function responder(cartao, valor, dataAtual) {
    const chave = chaveCartao(cartao);
    revisao.itens[chave] ||= { respostas: {} };
    revisao.itens[chave].respostas ||= {};
    revisao.itens[chave].respostas[dataAtual] = valor;
    return salvar();
  }

  function renderConcluida(dataAtual) {
    const respostas = itensHoje.map(cartao => revisao.itens[chaveCartao(cartao)]?.respostas?.[dataAtual] || "");
    const lembradas = respostas.filter(x => x === "sim").length;
    const reforcar = respostas.filter(x => x === "nao").length;
    lista.innerHTML = "";
    progresso.textContent = `${itensHoje.length} de ${itensHoje.length}`;
    concluida.hidden = false;
    concluida.innerHTML = `
      <div class="review-completion__icon">✓</div>
      <div class="review-completion__body">
        <strong>Revisão concluída</strong>
        <span>${lembradas} lembrada${lembradas === 1 ? "" : "s"} · ${reforcar} para reforçar</span>
      </div>`;
  }

  function renderAtual(dataAtual) {
    concluida.hidden = true;
    vazio.hidden = true;

    if (!itensHoje.length) {
      lista.innerHTML = "";
      progresso.textContent = "0 de 0";
      vazio.hidden = false;
      vazio.textContent = "Ainda não há frases vencidas para revisar. As frases que você praticar hoje entram no Anki a partir de amanhã.";
      return;
    }

    if (indice >= itensHoje.length) {
      renderConcluida(dataAtual);
      return;
    }

    const cartao = itensHoje[indice];
    progresso.textContent = `${indice + 1} de ${itensHoje.length}`;
    resumo.textContent = "Leia a frase completa em português e tente reconstruí-la inteira em inglês.";
    lista.innerHTML = `
      <article class="structure-review-card" data-structure-card>
        <span class="structure-review-tag">${esc(cartao.grammar || "Estrutura fundamental")}</span>
        <span class="structure-review-label">Português</span>
        <p class="structure-review-prompt">${esc(cartao.frente)}</p>
        <p class="structure-review-hint">Não há palavra escondida. Lembre a frase completa que você praticou.</p>
        <button class="btn primary" type="button" data-show-answer>Mostrar minha frase</button>
        <div class="structure-review-answer" data-answer hidden>
          <span>Sua frase em inglês</span>
          <strong>${esc(cartao.resposta)}</strong>
          ${cartao.pattern ? `<span>Estrutura praticada</span><p>${esc(cartao.pattern)}</p>` : ""}
          <div class="structure-review-actions">
            <button class="btn" type="button" data-answer-value="nao">Não lembrei</button>
            <button class="btn primary" type="button" data-answer-value="sim">Lembrei</button>
          </div>
        </div>
      </article>`;

    const mostrar = lista.querySelector("[data-show-answer]");
    const resposta = lista.querySelector("[data-answer]");
    mostrar.addEventListener("click", () => {
      mostrar.hidden = true;
      resposta.hidden = false;
    });

    lista.querySelectorAll("[data-answer-value]").forEach(botao => {
      botao.addEventListener("click", async () => {
        lista.querySelectorAll("button").forEach(x => { x.disabled = true; });
        try {
          await responder(cartao, botao.dataset.answerValue, dataAtual);
          indice += 1;
          renderAtual(dataAtual);
        } catch (erro) {
          console.error(erro);
          lista.querySelectorAll("button").forEach(x => { x.disabled = false; });
          window.MMCDUI?.toast?.("Não foi possível salvar a revisão.");
        }
      });
    });
  }

  async function render() {
    const dataAtual = dataSelecionada();
    if (!dataAtual) return;
    try {
      await carregar();
      itensHoje = selecionar(dataAtual);
      indice = 0;
      card.hidden = false;
      renderAtual(dataAtual);
    } catch (erro) {
      console.error(erro);
      card.hidden = false;
      vazio.hidden = false;
      vazio.textContent = "Não foi possível carregar a revisão das frases.";
    }
  }

  seletor.addEventListener("change", render);
  window.addEventListener("mmcd:english-structure-saved", () => render());
  await render();
})();
