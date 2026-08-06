"use strict";

(() => {
  const LIMITE = 10;

  const GLOSSARIO_BASE = {
    "a": "um / uma", "an": "um / uma", "the": "o / a",
    "i": "eu", "i'm": "eu estou / eu sou", "i've": "eu tenho",
    "i'll": "eu vou", "i'd": "eu iria / eu tinha", "my": "meu / minha",
    "me": "me / mim", "mine": "meu / minha", "we": "nós",
    "we're": "nós estamos / somos", "we've": "nós temos",
    "we'll": "nós vamos", "our": "nosso / nossa", "us": "nos / nós",
    "you": "você / vocês", "you're": "você está / é",
    "you've": "você tem", "your": "seu / sua", "he": "ele",
    "she": "ela", "it": "isso / ele / ela", "they": "eles / elas",
    "this": "isto / este / esta", "that": "isso / aquilo / que",
    "these": "estes / estas", "those": "aqueles / aquelas",
    "and": "e", "or": "ou", "but": "mas", "because": "porque",
    "so": "então / por isso", "if": "se", "when": "quando",
    "while": "enquanto", "with": "com", "without": "sem",
    "for": "para / por", "from": "de / desde", "to": "para / a",
    "in": "em / dentro de", "on": "em / sobre", "at": "em / no / na",
    "of": "de", "by": "por / perto de", "about": "sobre",
    "as": "como / enquanto", "is": "é / está", "are": "são / estão",
    "was": "era / estava", "were": "eram / estavam", "be": "ser / estar",
    "been": "sido / estado", "being": "sendo / estando", "have": "ter",
    "has": "tem", "had": "tinha / teve", "do": "fazer", "does": "faz",
    "did": "fez", "don't": "não", "doesn't": "não", "didn't": "não",
    "can": "poder / consegue", "can't": "não pode / não consegue",
    "could": "poderia", "will": "vai / irá", "would": "iria",
    "should": "deveria", "must": "deve / precisa", "not": "não",
    "very": "muito", "more": "mais", "less": "menos", "than": "do que",
    "too": "demais / também", "much": "muito", "today": "hoje",
    "today's": "de hoje", "topic": "tema", "useful": "úteis",
    "expressions": "expressões", "example": "exemplo", "quick": "rápida",
    "practice": "prática", "forgive": "perdoe", "try": "tentar",
    "control": "controlar", "carry": "carregar", "act": "agir",
    "continuity": "continuidade", "things": "coisas", "depends": "depende",
    "present": "presente", "family": "família", "steady": "constante / equilibrado",
    "work": "trabalho / trabalhar", "need": "preciso", "healthier": "mais saudáveis",
    "boundaries": "limites", "faithfulness": "fidelidade",
    "rest": "descanso / descansar", "week": "semana", "weekend": "fim de semana",
    "want": "querer / quero", "remember": "lembrar", "learn": "aprender",
    "learning": "aprendendo", "trust": "confiar", "trusting": "confiando",
    "life": "vida", "day": "dia", "days": "dias", "time": "tempo",
    "good": "bom", "better": "melhor", "strong": "forte", "weak": "fraco"
  };
  const CHAVE_ESTADO = "revisao_ingles_v2";
  const seletorData = document.querySelector("#ingles-data");
  const card = document.querySelector("#revisao-ingles-card");
  const listaEl = document.querySelector("#revisao-ingles-lista");
  const progressoEl = document.querySelector("#revisao-ingles-progresso");
  const resumoEl = document.querySelector("#revisao-ingles-resumo");
  const vazioEl = document.querySelector("#revisao-ingles-vazio");

  if (!seletorData || !card || !listaEl || !window.MMCDSupabase || !window.MMCDAuth) return;

  const db = window.MMCDSupabase;
  let usuario = null;
  let estado = { versao: 2, itens: {}, sessoes: {}, atualizadoEm: "" };
  let bancoAtual = [];
  let dataRenderizada = "";
  let tokenRender = 0;
  let filaSalvar = Promise.resolve();

  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  function normalizar(valor = "") {
    return String(valor)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/’/g, "'")
      .toLocaleLowerCase("en-US")
      .replace(/\s+/g, " ")
      .trim();
  }

  function dataSelecionada() {
    const indice = Number(seletorData.value);
    const opcao = seletorData.options[indice] || seletorData.options[seletorData.selectedIndex];
    const texto = opcao?.textContent || "";
    const br = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    const iso = texto.match(/\d{4}-\d{2}-\d{2}/);
    return iso?.[0] || "";
  }

  function formatarData(iso) {
    if (!iso) return "";
    return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
  }

  function somarDias(iso, dias) {
    const data = new Date(`${iso}T12:00:00`);
    data.setDate(data.getDate() + Number(dias || 0));
    return data.toISOString().slice(0, 10);
  }

  function hash(texto = "") {
    let valor = 2166136261;
    for (let i = 0; i < texto.length; i += 1) {
      valor ^= texto.charCodeAt(i);
      valor = Math.imul(valor, 16777619);
    }
    return valor >>> 0;
  }

  function chaveItem(item) {
    return `${item.dataOrigem}::${normalizar(item.textoMarcado)}`;
  }

  function localizarGlossario(markdown = "") {
    const resultado = { ...GLOSSARIO_BASE };
    const inicioNome = "MMCD_ENGLISH_GLOSSARY_START";
    const fimNome = "MMCD_ENGLISH_GLOSSARY_END";
    const texto = String(markdown);
    const inicio = texto.indexOf(inicioNome);
    if (inicio < 0) return resultado;
    const fim = texto.indexOf(fimNome, inicio + inicioNome.length);
    if (fim < 0) return resultado;

    const bruto = texto.slice(inicio + inicioNome.length, fim)
      .replace(/-->/g, "")
      .replace(/&gt;/gi, ">")
      .replace(/&lt;/gi, "<")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");

    try {
      const objeto = JSON.parse(bruto);
      for (const [palavra, traducao] of Object.entries(objeto || {})) {
        if (typeof traducao !== "string" || !traducao.trim()) continue;
        const chave = normalizar(palavra).replace(/^[^a-z]+|[^a-z']+$/g, "");
        if (chave) resultado[chave] = traducao.trim();
      }
    } catch (erro) {
      console.warn("Glossário contextual inválido; usando o apoio básico.", erro);
    }
    return resultado;
  }

  function removerGlossario(markdown = "") {
    return String(markdown)
      .replace(/<!--\s*MMCD_ENGLISH_GLOSSARY_START[\s\S]*?MMCD_ENGLISH_GLOSSARY_END\s*-->/gi, "")
      .replace(/&lt;!--\s*MMCD_ENGLISH_GLOSSARY_START[\s\S]*?MMCD_ENGLISH_GLOSSARY_END\s*--&gt;/gi, "")
      .replace(/MMCD_ENGLISH_GLOSSARY_START[\s\S]*?MMCD_ENGLISH_GLOSSARY_END/gi, "");
  }

  function tituloIngles(titulo = "") {
    const n = normalizar(String(titulo).replace(/^#{1,6}\s*/, "").replace(/\*\*|__/g, ""));
    return n.includes("english") || n.includes("ingles");
  }

  function extrairSecaoIngles(markdown = "") {
    const linhas = removerGlossario(markdown).replace(/\r\n/g, "\n").split("\n");
    let inicio = -1;
    let nivel = 7;

    for (let i = 0; i < linhas.length; i += 1) {
      const cab = linhas[i].match(/^\s*(#{1,6})\s+(.+?)\s*$/);
      if (cab && tituloIngles(cab[2])) {
        inicio = i + 1;
        nivel = cab[1].length;
        break;
      }
    }

    if (inicio < 0) {
      inicio = linhas.findIndex(l => normalizar(l).includes("today s topic"));
      if (inicio < 0) return "";
    }

    let fim = linhas.length;
    for (let i = inicio; i < linhas.length; i += 1) {
      const cab = linhas[i].match(/^\s*(#{1,6})\s+(.+?)\s*$/);
      if (!cab) continue;
      if (cab[1].length <= nivel && !tituloIngles(cab[2])) {
        fim = i;
        break;
      }
    }
    return linhas.slice(inicio, fim).join("\n");
  }

  function limparMarkdown(texto = "") {
    return String(texto)
      .replace(/<!--[^]*?-->/g, " ")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^\s*[-*]\s+/gm, "")
      .replace(/\*\*|__/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function encontrarFrase(markdown, textoMarcado) {
    const secao = extrairSecaoIngles(markdown);
    const alvo = normalizar(textoMarcado);
    if (!secao || !alvo) return textoMarcado;

    const limpo = limparMarkdown(secao);
    const frases = limpo.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    const candidatas = frases
      .map(f => f.trim().replace(/^(Example|Exemplo)\s*:\s*/i, ""))
      .filter(f => normalizar(f).includes(alvo));

    return candidatas.sort((a, b) => a.length - b.length)[0] || textoMarcado;
  }

  function apoioTraducao(frase, glossario) {
    const palavras = frase.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
    const vistos = new Set();
    const apoio = [];
    for (const palavra of palavras) {
      const chave = normalizar(palavra).replace(/^[^a-z]+|[^a-z']+$/g, "");
      if (!chave || vistos.has(chave) || !glossario[chave]) continue;
      vistos.add(chave);
      apoio.push({ palavra, traducao: glossario[chave] });
    }
    return apoio;
  }

  function destacarAlvo(frase, alvo) {
    const pos = normalizar(frase).indexOf(normalizar(alvo));
    if (pos < 0) return esc(frase);

    // Na maioria dos conteúdos o número de caracteres se mantém; este fallback evita quebrar a frase.
    const originalLower = frase.toLocaleLowerCase("en-US");
    const alvoLower = alvo.toLocaleLowerCase("en-US");
    const indiceOriginal = originalLower.indexOf(alvoLower);
    const inicio = indiceOriginal >= 0 ? indiceOriginal : pos;
    const fim = inicio + alvo.length;
    return `${esc(frase.slice(0, inicio))}<mark class="english-review-target">${esc(frase.slice(inicio, fim))}</mark>${esc(frase.slice(fim))}`;
  }

  async function carregarEstado() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", CHAVE_ESTADO)
      .maybeSingle();
    if (error) throw error;
    const valor = data?.valor;
    if (valor && typeof valor === "object") {
      estado = {
        versao: 2,
        itens: valor.itens && typeof valor.itens === "object" ? valor.itens : {},
        sessoes: valor.sessoes && typeof valor.sessoes === "object" ? valor.sessoes : {},
        atualizadoEm: valor.atualizadoEm || ""
      };
    }
  }

  function salvarEstado() {
    estado.atualizadoEm = new Date().toISOString();
    const valor = JSON.parse(JSON.stringify(estado));
    filaSalvar = filaSalvar.catch(() => undefined).then(async () => {
      const { error } = await db.from("configuracoes_usuario").upsert({
        user_id: usuario.id,
        chave: CHAVE_ESTADO,
        valor
      }, { onConflict: "user_id,chave" });
      if (error) throw error;
    });
    return filaSalvar;
  }

  function calcularHistorico(itemEstado, dataOrigem) {
    const respostas = Object.entries(itemEstado?.respostas || {})
      .sort(([a], [b]) => a.localeCompare(b));
    let intervalo = 0;
    let proximaRevisao = somarDias(dataOrigem, 1);
    let acertos = 0;
    let erros = 0;
    let ultimaResposta = "";

    for (const [data, resposta] of respostas) {
      ultimaResposta = resposta;
      if (resposta === "nao_lembrei") {
        erros += 1;
        intervalo = 1;
        proximaRevisao = somarDias(data, 1);
      } else {
        acertos += 1;
        intervalo = intervalo < 1 ? 3 : intervalo <= 3 ? 7 : intervalo <= 7 ? 14 : intervalo <= 14 ? 30 : Math.min(90, Math.round(intervalo * 1.5));
        proximaRevisao = somarDias(data, intervalo);
      }
    }
    return { intervalo, proximaRevisao, acertos, erros, ultimaResposta };
  }

  async function carregarBanco(dataAtual) {
    const [{ data: marcacoes, error: e1 }, { data: meditacoes, error: e2 }] = await Promise.all([
      db.from("marcacoes_ingles")
        .select("texto,data_meditacao,ordem")
        .eq("user_id", usuario.id)
        .eq("ativo", true)
        .lt("data_meditacao", dataAtual)
        .order("data_meditacao", { ascending: true })
        .order("ordem", { ascending: true }),
      db.from("meditacoes")
        .select("data_meditacao,conteudo_markdown")
        .eq("user_id", usuario.id)
        .eq("status", "publicada")
        .lt("data_meditacao", dataAtual)
    ]);
    if (e1) throw e1;
    if (e2) throw e2;

    const markdownPorData = new Map((meditacoes || []).map(x => [x.data_meditacao, x.conteudo_markdown || ""]));
    const unicos = new Map();

    for (const linha of marcacoes || []) {
      const textoMarcado = String(linha.texto || "").trim();
      const identidade = normalizar(textoMarcado);
      if (!identidade) continue;
      const markdown = markdownPorData.get(linha.data_meditacao) || "";
      const item = {
        textoMarcado,
        frase: encontrarFrase(markdown, textoMarcado),
        dataOrigem: linha.data_meditacao,
        apoio: apoioTraducao(encontrarFrase(markdown, textoMarcado), localizarGlossario(markdown))
      };
      // Mantém a ocorrência mais recente da mesma palavra/expressão.
      unicos.set(identidade, item);
    }
    return [...unicos.values()];
  }

  function selecionarItens(banco, dataAtual) {
    const mapa = new Map(banco.map(item => [chaveItem(item), item]));
    const sessao = estado.sessoes[dataAtual];
    if (Array.isArray(sessao?.selecionados)) {
      const existentes = sessao.selecionados.map(chave => mapa.get(chave)).filter(Boolean);
      if (existentes.length) return existentes.slice(0, LIMITE);
    }

    const registros = banco.map(item => {
      const chave = chaveItem(item);
      const itemEstado = estado.itens[chave] || { respostas: {} };
      const hist = calcularHistorico(itemEstado, item.dataOrigem);
      return {
        item, chave, hist,
        vencido: hist.proximaRevisao <= dataAtual,
        aleatorio: hash(`${dataAtual}|${chave}`)
      };
    });

    const vencidos = registros.filter(x => x.vencido).sort((a, b) => {
      const prioridadeA = a.hist.ultimaResposta === "nao_lembrei" ? 0 : 1;
      const prioridadeB = b.hist.ultimaResposta === "nao_lembrei" ? 0 : 1;
      return prioridadeA - prioridadeB || a.hist.proximaRevisao.localeCompare(b.hist.proximaRevisao) || a.aleatorio - b.aleatorio;
    });

    const escolhidos = vencidos.slice(0, LIMITE);
    const usados = new Set(escolhidos.map(x => x.chave));
    if (escolhidos.length < LIMITE) {
      escolhidos.push(...registros.filter(x => !usados.has(x.chave)).sort((a, b) => a.aleatorio - b.aleatorio).slice(0, LIMITE - escolhidos.length));
    }

    const itens = escolhidos.map(x => x.item);
    estado.sessoes[dataAtual] = {
      selecionados: itens.map(chaveItem),
      criadoEm: new Date().toISOString()
    };
    salvarEstado().catch(console.error);
    return itens;
  }

  function respostaDoDia(dataAtual, item) {
    return estado.itens[chaveItem(item)]?.respostas?.[dataAtual] || "";
  }

  function atualizarProgresso(dataAtual, itens = bancoAtual) {
    const respondidos = itens.filter(item => respostaDoDia(dataAtual, item)).length;
    progressoEl.textContent = itens.length ? `${respondidos} de ${itens.length}` : "0 de 0";
    resumoEl.textContent = itens.length
      ? `${itens.length} frase${itens.length === 1 ? "" : "s"} selecionada${itens.length === 1 ? "" : "s"} para hoje.`
      : "Marque palavras ou expressões no inglês para criar sua revisão.";
  }

  async function responder(dataAtual, item, resposta, botao) {
    const chave = chaveItem(item);
    estado.itens[chave] ||= {
      textoMarcado: item.textoMarcado,
      frase: item.frase,
      dataOrigem: item.dataOrigem,
      respostas: {}
    };
    estado.itens[chave].respostas ||= {};
    estado.itens[chave].respostas[dataAtual] = resposta;
    estado.itens[chave].textoMarcado = item.textoMarcado;
    estado.itens[chave].frase = item.frase;
    estado.itens[chave].dataOrigem = item.dataOrigem;

    const cardItem = botao.closest(".english-review-item");
    cardItem?.classList.toggle("is-remembered", resposta === "lembrei");
    cardItem?.classList.toggle("is-forgotten", resposta === "nao_lembrei");
    cardItem?.querySelectorAll("[data-resposta]").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.resposta === resposta);
    });

    try {
      await salvarEstado();
      atualizarProgresso(dataAtual);
      window.MMCDUI?.toast(resposta === "lembrei" ? "Boa. A frase voltará em um intervalo maior." : "Tudo bem. A frase volta amanhã.");
    } catch (erro) {
      console.error(erro);
      window.MMCDUI?.toast("A resposta não foi sincronizada.");
    }
  }

  function renderizarItens(dataAtual, itens) {
    listaEl.innerHTML = "";
    vazioEl.hidden = Boolean(itens.length);
    if (!itens.length) {
      card.hidden = false;
      atualizarProgresso(dataAtual, itens);
      return;
    }

    itens.forEach((item, indice) => {
      const resposta = respostaDoDia(dataAtual, item);
      const artigo = document.createElement("article");
      artigo.className = `english-review-item ${resposta === "lembrei" ? "is-remembered" : resposta === "nao_lembrei" ? "is-forgotten" : ""}`;
      const apoio = item.apoio || [];
      artigo.innerHTML = `
        <div class="english-review-meta">
          <span>Frase ${indice + 1} · marcada em ${esc(formatarData(item.dataOrigem))}</span>
          <span>${esc(item.textoMarcado)}</span>
        </div>
        <p class="english-review-sentence">${destacarAlvo(item.frase, item.textoMarcado)}</p>
        <div class="review-answer-row">
          <button class="btn small remember ${resposta === "lembrei" ? "is-active" : ""}" type="button" data-resposta="lembrei">✓ Lembrei</button>
          <button class="btn small forgot ${resposta === "nao_lembrei" ? "is-active" : ""}" type="button" data-resposta="nao_lembrei">✕ Não lembrei</button>
          <button class="btn small" type="button" data-ajuda>Ver apoio</button>
        </div>
        <div class="review-help" hidden>
          <strong>Palavra ou expressão marcada:</strong> ${esc(item.textoMarcado)}
          ${apoio.length ? `<div class="review-help-list">${apoio.map(x => `<span><b>${esc(x.palavra)}</b> — ${esc(x.traducao)}</span>`).join("")}</div>` : `<p class="muted">A tradução contextual aparecerá na leitura ao passar o mouse sobre as palavras.</p>`}
        </div>`;

      artigo.querySelectorAll("[data-resposta]").forEach(botao => {
        botao.addEventListener("click", () => responder(dataAtual, item, botao.dataset.resposta, botao));
      });
      artigo.querySelector("[data-ajuda]")?.addEventListener("click", evento => {
        const ajuda = artigo.querySelector(".review-help");
        ajuda.hidden = !ajuda.hidden;
        evento.currentTarget.textContent = ajuda.hidden ? "Ver apoio" : "Ocultar apoio";
      });
      listaEl.append(artigo);
    });

    card.hidden = false;
    atualizarProgresso(dataAtual, itens);
  }

  async function renderizar() {
    const meuToken = ++tokenRender;
    const dataAtual = dataSelecionada();
    if (!dataAtual || dataAtual === dataRenderizada && bancoAtual.length) return;

    dataRenderizada = dataAtual;
    card.hidden = false;
    listaEl.innerHTML = '<p class="muted">Preparando sua revisão...</p>';
    vazioEl.hidden = true;

    try {
      const banco = await carregarBanco(dataAtual);
      if (meuToken !== tokenRender) return;
      bancoAtual = selecionarItens(banco, dataAtual);
      renderizarItens(dataAtual, bancoAtual);
    } catch (erro) {
      console.error(erro);
      listaEl.innerHTML = '<div class="english-review-empty">Não foi possível carregar a revisão agora. A prática de hoje continua disponível abaixo.</div>';
      atualizarProgresso(dataAtual, []);
    }
  }

  async function aguardarSeletor() {
    for (let i = 0; i < 80; i += 1) {
      if (seletorData.options.length) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  (async () => {
    try {
      const session = await window.MMCDAuth.requireSession();
      usuario = session.user;
      await carregarEstado();
      if (!await aguardarSeletor()) return;
      seletorData.addEventListener("change", () => {
        dataRenderizada = "";
        bancoAtual = [];
        renderizar();
      });
      await renderizar();
    } catch (erro) {
      console.error(erro);
      card.hidden = true;
    }
  })();
})();
