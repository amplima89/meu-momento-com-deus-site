"use strict";

(async () => {
  const lista = await MMCD.listarMeditacoes();
  const session = await window.MMCDAuth.requireSession();
  const usuario = session.user;
  const db = window.MMCDSupabase;
  const CHAVE_PRODUCOES = "ingles_producoes_v1";
  const CHAVE_ESTRUTURAS = "ingles_estruturas_v1";
  const PREFIXO_AUDIO_REMOTO = "ingles_audio_v1";
  const seletor = document.querySelector("#ingles-data");
  const conteudo = document.querySelector("#ingles-conteudo");
  const nivelBox = document.querySelector("#ingles-nivel");

  const escaparHtml = valor => String(valor ?? "").replace(
    /[&<>"']/g,
    caractere => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[caractere]
  );

  const renderizarInline = valor => escaparHtml(valor)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");

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
    "very": "muito", "more": "mais", "less": "menos", "today": "hoje",
    "today's": "de hoje", "topic": "tema", "useful": "úteis",
    "expressions": "expressões", "example": "exemplo", "quick": "rápida",
    "practice": "prática"
  };

  const MARCADOR_INICIO = "MMCD_ENGLISH_GLOSSARY_START";
  const MARCADOR_FIM = "MMCD_ENGLISH_GLOSSARY_END";

  function normalizarPalavra(palavra = "") {
    return String(palavra)
      .trim()
      .toLocaleLowerCase("en-US")
      .replace(/’/g, "'")
      .replace(/^[^a-z]+|[^a-z']+$/g, "");
  }

  function normalizarTitulo(titulo = "") {
    return String(titulo)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^\s*#{1,6}\s*/, "")
      .replace(/^\s*(?:\*\*|__)/, "")
      .replace(/(?:\*\*|__)\s*:??\s*$/, "")
      .replace(/^\s*\d+[.)-]\s*/, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function ehTituloDeIngles(titulo = "") {
    const normalizado = normalizarTitulo(titulo);
    if (!normalizado) return false;

    const aliases = [
      "my life in english",
      "my prayer in english",
      "english for my life",
      "english prayer",
      "daily english",
      "english practice",
      "english daily practice",
      "my daily english",
      "english today",
      "ingles diario",
      "ingles do dia",
      "pratica de ingles",
      "oracao em ingles"
    ];

    if (aliases.some(alias => normalizado === alias || normalizado.startsWith(`${alias} `))) {
      return true;
    }

    const palavras = new Set(normalizado.split(" "));
    return palavras.has("english") || palavras.has("ingles");
  }

  function identificarCabecalho(linha = "") {
    const markdown = String(linha).match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (markdown) {
      return {
        nivel: markdown[1].length,
        titulo: markdown[2],
        tipo: "markdown"
      };
    }

    const negrito = String(linha).match(/^\s*(?:\*\*|__)(.+?)(?:\*\*|__)\s*:??\s*$/);
    if (negrito) {
      return {
        nivel: 7,
        titulo: negrito[1],
        tipo: "negrito"
      };
    }

    return null;
  }

  function decodificarEntidadesHtml(valor = "") {
    const area = document.createElement("textarea");
    area.innerHTML = String(valor);
    return area.value;
  }

  function localizarBlocoGlossario(texto = "") {
    const original = String(texto);
    const minusculo = original.toLocaleLowerCase("en-US");
    const marcadorInicio = MARCADOR_INICIO.toLocaleLowerCase("en-US");
    const marcadorFim = MARCADOR_FIM.toLocaleLowerCase("en-US");
    const inicioToken = minusculo.indexOf(marcadorInicio);

    if (inicioToken < 0) return null;

    const inicioConteudo = inicioToken + MARCADOR_INICIO.length;
    const fimToken = minusculo.indexOf(marcadorFim, inicioConteudo);

    if (fimToken < 0) {
      return {
        bruto: "",
        inicio: inicioToken,
        fim: original.length,
        incompleto: true
      };
    }

    let inicioRemocao = inicioToken;
    let fimRemocao = fimToken + MARCADOR_FIM.length;

    const antes = original.slice(Math.max(0, inicioToken - 32), inicioToken);
    const comentarioHtml = antes.lastIndexOf("<!--");
    const comentarioEscapado = antes.toLocaleLowerCase("en-US").lastIndexOf("&lt;!--");

    if (comentarioHtml >= 0) {
      inicioRemocao = Math.max(0, inicioToken - 32) + comentarioHtml;
    } else if (comentarioEscapado >= 0) {
      inicioRemocao = Math.max(0, inicioToken - 32) + comentarioEscapado;
    }

    const depois = original.slice(fimRemocao, fimRemocao + 32);
    const fechaHtml = depois.indexOf("-->");
    const fechaEscapado = depois.toLocaleLowerCase("en-US").indexOf("--&gt;");

    if (fechaHtml >= 0) {
      fimRemocao += fechaHtml + 3;
    } else if (fechaEscapado >= 0) {
      fimRemocao += fechaEscapado + 6;
    }

    return {
      bruto: original.slice(inicioConteudo, fimToken),
      inicio: inicioRemocao,
      fim: fimRemocao,
      incompleto: false
    };
  }

  function extrairGlossario(markdown = "") {
    const bloco = localizarBlocoGlossario(markdown);
    if (!bloco || bloco.incompleto) return { ...GLOSSARIO_BASE };

    const bruto = decodificarEntidadesHtml(bloco.bruto)
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    try {
      const objeto = JSON.parse(bruto);
      const glossario = { ...GLOSSARIO_BASE };

      for (const [palavra, traducao] of Object.entries(objeto || {})) {
        if (typeof traducao !== "string" || !traducao.trim()) continue;
        const chave = normalizarPalavra(palavra);
        if (chave) glossario[chave] = traducao.trim();
      }

      return glossario;
    } catch (erro) {
      console.warn("Glossário de inglês inválido nesta meditação.", erro);
      return { ...GLOSSARIO_BASE };
    }
  }

  function removerGlossario(texto = "") {
    let resultado = String(texto);
    let seguranca = 0;

    while (seguranca < 5) {
      const bloco = localizarBlocoGlossario(resultado);
      if (!bloco) break;
      resultado = resultado.slice(0, bloco.inicio) + resultado.slice(bloco.fim);
      seguranca += 1;
    }

    return resultado.trim();
  }

  function extrairPorCabecalho(markdown = "") {
    const linhas = String(markdown).replace(/\r\n/g, "\n").split("\n");

    for (let indice = 0; indice < linhas.length; indice += 1) {
      const cabecalho = identificarCabecalho(linhas[indice]);
      if (!cabecalho || !ehTituloDeIngles(cabecalho.titulo)) continue;

      let fim = linhas.length;

      for (let proximo = indice + 1; proximo < linhas.length; proximo += 1) {
        const outroCabecalho = identificarCabecalho(linhas[proximo]);
        if (!outroCabecalho) continue;

        if (cabecalho.tipo === "negrito" || outroCabecalho.nivel <= cabecalho.nivel) {
          fim = proximo;
          break;
        }
      }

      const secao = removerGlossario(linhas.slice(indice + 1, fim).join("\n"));
      if (secao) return secao;
    }

    return "";
  }

  function extrairPorEstruturaInterna(markdown = "") {
    const linhas = String(markdown).replace(/\r\n/g, "\n").split("\n");
    const inicio = linhas.findIndex(linha => {
      const normalizado = normalizarTitulo(linha);
      return normalizado === "today s topic" || normalizado.startsWith("today s topic ");
    });

    if (inicio < 0) return "";

    let fim = linhas.length;
    for (let indice = inicio + 1; indice < linhas.length; indice += 1) {
      const cabecalho = identificarCabecalho(linhas[indice]);
      if (!cabecalho) continue;

      const titulo = normalizarTitulo(cabecalho.titulo);
      if (
        titulo.includes("silencio") ||
        titulo.includes("reflexao") ||
        (!ehTituloDeIngles(cabecalho.titulo) && cabecalho.nivel <= 2)
      ) {
        fim = indice;
        break;
      }
    }

    return removerGlossario(linhas.slice(inicio, fim).join("\n"));
  }

  function extrairSecaoIngles(markdown = "") {
    const porCabecalho = extrairPorCabecalho(markdown);
    if (porCabecalho) return porCabecalho;
    return extrairPorEstruturaInterna(markdown);
  }

  const ROTULOS_BLOCOS = {
    "grammar focus": { tipo: "grammar", titulo: "Conceito do dia", icone: "Aa" },
    "concept summary": { tipo: "concept", titulo: "Resumo do conceito", icone: "i" },
    "examples": { tipo: "examples", titulo: "Exemplos", icone: "01" },
    "today s topic": { tipo: "reading", titulo: "Leitura", icone: "▶" },
    "useful expressions": { tipo: "expressions", titulo: "Expressões úteis", icone: "+" },
    "writing practice": { tipo: "writing", titulo: "Prática de escrita", icone: "✎" },
    "speaking practice": { tipo: "speaking", titulo: "Prática de fala", icone: "●" },
    "quick practice": { tipo: "quick", titulo: "Prática rápida", icone: "→" }
  };

  let gravadorAtual = null;
  let fluxoAudioAtual = null;
  let intervaloGravacao = null;
  let descartarGravacaoAtual = false;
  const urlsAudio = new Map();
  let estadoProducoes = { versao: 1, dias: {}, atualizadoEm: "" };
  let filaSalvarProducoes = Promise.resolve();
  let temporizadorSalvarEscrita = null;
  let estadoEstruturas = null;
  let filaSalvarEstruturas = Promise.resolve();

  function identificarTituloInterno(linha = "") {
    const encontrado = String(linha).match(/^\s*\*\*(.+?)\*\*\s*:?[ \t]*(.*?)\s*$/);
    if (!encontrado) return null;

    const rotulo = normalizarTitulo(encontrado[1]);
    const configuracao = ROTULOS_BLOCOS[rotulo];
    if (!configuracao) return null;

    return {
      ...configuracao,
      valor: encontrado[2]?.trim() || ""
    };
  }

  function extrairBlocosDaAula(texto = "") {
    const blocos = [];
    const introducao = [];
    let atual = null;

    const finalizar = () => {
      if (!atual) return;
      atual.conteudo = atual.linhas.join("\n").trim();
      delete atual.linhas;
      blocos.push(atual);
      atual = null;
    };

    for (const linha of String(texto).replace(/\r\n/g, "\n").split("\n")) {
      const titulo = identificarTituloInterno(linha);
      if (titulo) {
        finalizar();
        atual = { ...titulo, linhas: [] };
        continue;
      }

      if (atual) atual.linhas.push(linha);
      else introducao.push(linha);
    }

    finalizar();
    return { blocos, introducao: introducao.join("\n").trim() };
  }

  function extrairPraticaEstruturada(texto = "") {
    const original = String(texto).replace(/\r\n/g, "\n");
    const obter = rotulo => {
      const match = original.match(new RegExp(`^\\s*\\*\\*${rotulo}:\\*\\*\\s*(.+?)\\s*$`, "im"));
      return match?.[1]?.trim() || "";
    };
    const pattern = obter("Pattern");
    const meaning = obter("Meaning");
    const model = obter("Model");
    const linhas = original.split("\n");
    const inicioPrompts = linhas.findIndex(linha => /^\s*\*\*Prompts:\*\*\s*$/i.test(linha));
    const prompts = [];
    if (inicioPrompts >= 0) {
      for (const linha of linhas.slice(inicioPrompts + 1)) {
        const item = linha.match(/^\s*[-*]\s+(.+?)\s*$/);
        if (!item) {
          if (linha.trim()) break;
          continue;
        }
        prompts.push(item[1].replace(/[*_`]/g, "").trim());
        if (prompts.length >= 5) break;
      }
    }
    if (!pattern || !meaning || !model || prompts.length < 5) return null;
    return { pattern, meaning, model, prompts: prompts.slice(0, 5), origem: "gerada" };
  }

  function praticaFundamentalFallback() {
    return {
      pattern: "I like to eat ___.",
      meaning: "Eu gosto de comer ___.",
      model: "I like to eat fruit.",
      prompts: ["fruta", "carne", "queijo", "arroz", "ovos"],
      origem: "fundacao"
    };
  }

  function completarAulaLegada(aula) {
    const tipos = new Set(aula.blocos.map(bloco => bloco.tipo));
    let escrita = aula.blocos.find(bloco => bloco.tipo === "writing");

    if (!escrita) {
      escrita = { tipo: "writing", titulo: "Prática de escrita", icone: "✎", valor: "", conteudo: "" };
      aula.blocos.push(escrita);
    }

    escrita.pratica = extrairPraticaEstruturada(escrita.conteudo) || praticaFundamentalFallback();
    escrita.legada = !extrairPraticaEstruturada(escrita.conteudo);

    // Fase 1: leitura, vocabulário e escrita estruturada. A fala volta em uma etapa futura.
    aula.blocos = aula.blocos.filter(bloco => bloco.tipo !== "speaking" && bloco.tipo !== "quick");
    return aula;
  }

  function renderizarFragmento(texto = "") {
    const partes = String(texto).split(/\n\s*\n/);
    let html = "";

    for (const parte of partes) {
      const linhas = parte
        .split("\n")
        .map(linha => linha.trim())
        .filter(Boolean);

      if (!linhas.length) continue;

      if (linhas.every(linha => /^\s*[-*]\s+/.test(linha))) {
        html += `<ul>${linhas.map(linha => `<li>${renderizarInline(linha.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")}</ul>`;
        continue;
      }

      html += `<p>${renderizarInline(linhas.join(" ").replace(/\s{2,}/g, " "))}</p>`;
    }

    return html;
  }

  function renderizarBloco(bloco) {
    const destaque = bloco.tipo === "grammar" || bloco.tipo === "reading";
    const classe = `english-lesson-block english-lesson-block--${bloco.tipo}${destaque ? " is-featured" : ""}`;
    const tituloPrincipal = bloco.valor
      ? `<h2 class="english-block-main-title">${renderizarInline(bloco.valor)}</h2>`
      : "";

    let corpo = renderizarFragmento(bloco.conteudo);
    let resposta = "";

    if (bloco.tipo === "writing") {
      const pratica = bloco.pratica || praticaFundamentalFallback();
      corpo = `
        <div class="english-pattern-guide">
          ${bloco.legada ? '<span class="english-phase-badge">Reforço de base</span>' : '<span class="english-phase-badge">Estrutura do dia</span>'}
          <div class="english-pattern-row"><span>Estrutura</span><strong>${renderizarInline(pratica.pattern)}</strong></div>
          <div class="english-pattern-row"><span>Significado</span><strong>${escaparHtml(pratica.meaning)}</strong></div>
          <div class="english-pattern-model"><span>Modelo</span><p>${renderizarInline(pratica.model)}</p></div>
          <p class="english-pattern-help">Escreva a frase completa 5 vezes. Mude somente a palavra indicada.</p>
        </div>`;
      resposta = `<div class="english-response-workspace" data-writing-workspace data-pattern="${escaparHtml(pratica.pattern)}" data-meaning="${escaparHtml(pratica.meaning)}" data-model="${escaparHtml(pratica.model)}" data-prompts="${escaparHtml(JSON.stringify(pratica.prompts))}" data-origin="${escaparHtml(pratica.origem || "gerada")}"></div>`;
    } else if (bloco.tipo === "reading") {
      resposta = '<div class="english-response-workspace english-reading-recorder" data-reading-workspace></div>';
    }

    return `
      <section class="${classe}" data-lesson-kind="${bloco.tipo}">
        <header class="english-block-head">
          <span class="english-block-icon" aria-hidden="true">${bloco.icone}</span>
          <div>
            <p class="english-block-kicker">${bloco.titulo}</p>
            ${tituloPrincipal}
          </div>
        </header>
        <div class="english-block-body">${corpo}</div>
        ${resposta}
      </section>`;
  }

  function renderizar(markdown = "") {
    if (!String(markdown).trim()) {
      return '<div class="empty">A meditação desta data foi encontrada, mas o conteúdo não foi carregado.</div>';
    }

    const texto = extrairSecaoIngles(markdown);
    if (!texto) {
      return '<div class="empty">Não consegui identificar a prática de inglês desta meditação.</div>';
    }

    const aula = completarAulaLegada(extrairBlocosDaAula(texto));
    const nota = '<div class="practice-note"><strong>Fase 1:</strong> leia, grave a leitura, selecione em azul as palavras que quer guardar e pratique uma estrutura simples em 5 frases curtas.</div>';

    if (!aula.blocos.length) {
      return nota + renderizarFragmento(texto);
    }

    const introducao = aula.introducao
      ? `<div class="english-lesson-intro">${renderizarFragmento(aula.introducao)}</div>`
      : "";

    return `${nota}${introducao}<div class="english-lesson-grid">${aula.blocos.map(renderizarBloco).join("")}</div>`;
  }

  function chaveEscrita(data = dataAtual()) {
    return `mmcd_english_writing_v1:${data}`;
  }

  function lerArmazenamentoLocal(chave) {
    try {
      return window.localStorage?.getItem(chave) || "";
    } catch {
      return "";
    }
  }

  function salvarArmazenamentoLocal(chave, valor) {
    try {
      window.localStorage?.setItem(chave, valor);
      return true;
    } catch {
      return false;
    }
  }

  function estadoDoDia(data = dataAtual(), criar = true) {
    if (!data) return null;
    if (!estadoProducoes.dias[data] && criar) {
      estadoProducoes.dias[data] = { audios: {} };
    }
    const dia = estadoProducoes.dias[data] || null;
    if (dia && criar) dia.audios ||= {};
    return dia;
  }

  async function carregarEstadoProducoes() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", CHAVE_PRODUCOES)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    const valor = data?.valor;
    estadoProducoes = {
      versao: 1,
      dias: valor?.dias && typeof valor.dias === "object" ? valor.dias : {},
      atualizadoEm: valor?.atualizadoEm || ""
    };
  }

  function salvarEstadoProducoes() {
    estadoProducoes.versao = 1;
    estadoProducoes.atualizadoEm = new Date().toISOString();
    const valor = JSON.parse(JSON.stringify(estadoProducoes));
    filaSalvarProducoes = filaSalvarProducoes.catch(() => undefined).then(async () => {
      const { error } = await db.from("configuracoes_usuario").upsert({
        user_id: usuario.id,
        chave: CHAVE_PRODUCOES,
        valor
      }, { onConflict: "user_id,chave" });
      if (error) throw error;
    });
    return filaSalvarProducoes;
  }

  async function carregarBancoEstruturas() {
    if (estadoEstruturas) return estadoEstruturas;
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", CHAVE_ESTRUTURAS)
      .maybeSingle();
    if (error) throw error;
    const valor = data?.valor;
    estadoEstruturas = {
      versao: 1,
      itens: valor?.itens && typeof valor.itens === "object" ? valor.itens : {},
      atualizadoEm: valor?.atualizadoEm || ""
    };
    return estadoEstruturas;
  }

  function valorDoPromptEmPortugues(prompt = "") {
    const texto = String(prompt).trim();
    if (!texto) return "";
    const partes = texto.split(/\s*(?:→|=>|=|\|)\s*/).filter(Boolean);
    return (partes[0] || texto).trim();
  }

  function preencherModelo(modelo = "", valor = "") {
    const base = String(modelo).trim();
    const complemento = String(valor).trim();
    if (!base) return complemento;
    if (/_{2,}/.test(base)) return base.replace(/_{2,}/, complemento);
    if (/\.{3,}/.test(base)) return base.replace(/\.{3,}/, complemento);
    return base;
  }

  function criarCartoesEstrutura(pratica, linhas = []) {
    if (!pratica?.meaning || !Array.isArray(linhas)) return [];
    const prompts = Array.isArray(pratica.prompts) ? pratica.prompts : [];
    return linhas.slice(0, 5).map((linha, indice) => {
      const resposta = String(linha || "").trim();
      const promptPt = valorDoPromptEmPortugues(prompts[indice] || "");
      const frente = preencherModelo(pratica.meaning, promptPt);
      if (!resposta || !frente || /_{2,}/.test(frente)) return null;
      return {
        indice: indice + 1,
        frente,
        resposta,
        dica: promptPt
      };
    }).filter(Boolean);
  }

  async function registrarEstruturaDaAula(data, pratica, cartoes = null) {
    if (!data || !pratica?.pattern || !pratica?.meaning || !pratica?.model) return;
    await carregarBancoEstruturas();
    const grammar = pratica.origem === "fundacao"
      ? "Reforço de base — like + food"
      : conteudo.querySelector('[data-lesson-kind="grammar"] .english-block-main-title')?.textContent?.trim() || "Estrutura fundamental";
    const anterior = estadoEstruturas.itens[data];
    const proximo = {
      dataOrigem: data,
      grammar,
      pattern: pratica.pattern,
      meaning: pratica.meaning,
      model: pratica.model,
      prompts: Array.isArray(pratica.prompts) ? pratica.prompts.slice(0, 5) : [],
      cartoes: Array.isArray(cartoes) && cartoes.length ? cartoes.slice(0, 5) : (Array.isArray(anterior?.cartoes) ? anterior.cartoes : [])
    };
    if (anterior && JSON.stringify(anterior) === JSON.stringify(proximo)) return;
    estadoEstruturas.itens[data] = proximo;
    estadoEstruturas.atualizadoEm = new Date().toISOString();
    const valor = JSON.parse(JSON.stringify(estadoEstruturas));
    filaSalvarEstruturas = filaSalvarEstruturas.catch(() => undefined).then(async () => {
      const { error } = await db.from("configuracoes_usuario").upsert({
        user_id: usuario.id,
        chave: CHAVE_ESTRUTURAS,
        valor
      }, { onConflict: "user_id,chave" });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("mmcd:english-structure-saved", { detail: { data } }));
    });
    return filaSalvarEstruturas;
  }

  function contarPalavras(texto = "") {
    return (String(texto).trim().match(/[A-Za-zÀ-ÿ]+(?:['’][A-Za-zÀ-ÿ]+)*/g) || []).length;
  }

  function copiarTexto(texto) {
    if (!texto.trim()) {
      MMCDUI.toast("Escreva sua resposta antes de copiar.");
      return;
    }

    const operacao = navigator.clipboard?.writeText?.(texto);
    if (!operacao) {
      MMCDUI.toast("A cópia automática não está disponível neste navegador.");
      return;
    }

    operacao
      .then(() => MMCDUI.toast("Resposta copiada."))
      .catch(() => MMCDUI.toast("Não foi possível copiar automaticamente."));
  }

  function conceitoDaAula() {
    const bloco = conteudo.querySelector('[data-lesson-kind="grammar"]');
    if (!bloco) return "";
    return [
      bloco.querySelector(".english-block-main-title")?.textContent || "",
      bloco.querySelector(".english-block-body")?.textContent || ""
    ].filter(Boolean).join(" — ").trim();
  }

  function listaFeedback(itens = []) {
    if (!Array.isArray(itens) || !itens.length) return "";
    return `<ul>${itens.map(item => {
      if (typeof item === "string") return `<li>${escaparHtml(item)}</li>`;
      const palavra = escaparHtml(item?.palavra || item?.word || "");
      const dica = escaparHtml(item?.dica || item?.hint || item?.explicacao || "");
      return `<li>${palavra ? `<strong>${palavra}</strong>${dica ? " — " : ""}` : ""}${dica}</li>`;
    }).join("")}</ul>`;
  }

  function htmlAnaliseEscrita(registro) {
    if (!registro) return "";
    if (registro.status === "pendente") {
      return '<div class="english-analysis is-pending"><strong>Resposta enviada</strong><p>A correção será feita na próxima execução da automação.</p></div>';
    }
    if (registro.status === "erro") {
      return `<div class="english-analysis is-error"><strong>Não foi possível analisar</strong><p>${escaparHtml(registro.erro || "Tente enviar novamente.")}</p></div>`;
    }
    if (registro.status !== "corrigida" || !registro.analise) return "";

    const a = registro.analise;
    return `
      <section class="english-analysis ${a.correta ? "is-good" : "needs-work"}">
        <div class="english-analysis__head">
          <div><span>Correção da escrita</span><strong>${a.correta ? "Boa construção" : "Há ajustes importantes"}</strong></div>
          <b>${a.correta ? "✓" : "✎"}</b>
        </div>
        <div class="english-analysis__row"><span>Sua resposta</span><p>${escaparHtml(registro.texto || "")}</p></div>
        <div class="english-analysis__row"><span>Forma corrigida</span><p>${escaparHtml(a.textoCorrigido || registro.texto || "")}</p></div>
        ${a.explicacao ? `<div class="english-analysis__row"><span>O que ajustar</span><p>${escaparHtml(a.explicacao)}</p></div>` : ""}
      </section>`;
  }

  function htmlAnaliseAudio(registro, tipo) {
    if (!registro) return "";
    if (registro.status === "pendente") {
      return '<div class="english-analysis is-pending"><strong>Áudio sincronizado</strong><p>A transcrição e a correção serão feitas na próxima execução da automação.</p></div>';
    }
    if (registro.status === "erro") {
      return `<div class="english-analysis is-error"><strong>Não foi possível analisar</strong><p>${escaparHtml(registro.erro || "Grave novamente ou execute a automação outra vez.")}</p></div>`;
    }
    if (registro.status !== "corrigida" || !registro.analise) return "";

    const a = registro.analise;
    if (tipo === "leitura" || tipo === "cena") {
      const clareza = Number(a.clarezaReconhecimento);
      return `
        <section class="english-analysis ${clareza >= 85 ? "is-good" : "needs-work"}">
          <div class="english-analysis__head">
            <div><span>Análise da leitura</span><strong>${Number.isFinite(clareza) ? `${clareza}% de clareza de reconhecimento` : "Leitura analisada"}</strong></div>
            <b>▶</b>
          </div>
          <p class="english-analysis__disclaimer">Esse indicador compara o texto reconhecido com o texto original; não é uma nota de sotaque.</p>
          ${registro.transcricao ? `<div class="english-analysis__row"><span>O que foi reconhecido</span><p>${escaparHtml(registro.transcricao)}</p></div>` : ""}
          ${a.pontoForte ? `<div class="english-analysis__row"><span>Ponto forte</span><p>${escaparHtml(a.pontoForte)}</p></div>` : ""}
          ${a.resumo ? `<div class="english-analysis__row"><span>O que melhorar</span><p>${escaparHtml(a.resumo)}</p></div>` : ""}
          ${a.palavrasPraticar?.length ? `<div class="english-analysis__row"><span>Palavras para repetir</span>${listaFeedback(a.palavrasPraticar)}</div>` : ""}
          ${a.proximoPasso ? `<div class="english-analysis__row"><span>Próxima tentativa</span><p>${escaparHtml(a.proximoPasso)}</p></div>` : ""}
        </section>`;
    }

    return `
      <section class="english-analysis needs-work">
        <div class="english-analysis__head">
          <div><span>Análise da fala</span><strong>Transcrição, correção e naturalidade</strong></div>
          <b>●</b>
        </div>
        ${registro.transcricao ? `<div class="english-analysis__row"><span>Você disse</span><p>${escaparHtml(registro.transcricao)}</p></div>` : ""}
        ${a.textoCorrigido ? `<div class="english-analysis__row"><span>Forma corrigida</span><p>${escaparHtml(a.textoCorrigido)}</p></div>` : ""}
        ${a.versaoNatural ? `<div class="english-analysis__row"><span>Forma mais natural</span><p>${escaparHtml(a.versaoNatural)}</p></div>` : ""}
        ${a.gramatica ? `<div class="english-analysis__row"><span>Gramática</span><p>${escaparHtml(a.gramatica)}</p></div>` : ""}
        ${a.vocabulario ? `<div class="english-analysis__row"><span>Vocabulário</span><p>${escaparHtml(a.vocabulario)}</p></div>` : ""}
        ${a.fluencia ? `<div class="english-analysis__row"><span>Fluidez estimada</span><p>${escaparHtml(a.fluencia)}</p></div>` : ""}
        ${a.usoConceito ? `<div class="english-analysis__row"><span>Conceito do dia</span><p>${escaparHtml(a.usoConceito)}</p></div>` : ""}
        ${a.palavrasPraticar?.length ? `<div class="english-analysis__row"><span>Palavras para praticar</span>${listaFeedback(a.palavrasPraticar)}</div>` : ""}
        <p class="english-analysis__disclaimer">A fluidez é estimada pela transcrição e pela duração. A análise não mede sotaque ou fonemas com precisão clínica.</p>
      </section>`;
  }

  function prepararEscrita() {
    const area = conteudo.querySelector("[data-writing-workspace]");
    if (!area) return;

    const data = dataAtual();
    const dia = estadoDoDia(data);
    const registro = dia.escrita || null;
    let prompts = [];
    try { prompts = JSON.parse(area.dataset.prompts || "[]"); } catch { prompts = []; }
    prompts = Array.isArray(prompts) ? prompts.slice(0, 5) : [];
    while (prompts.length < 5) prompts.push(`frase ${prompts.length + 1}`);

    const pratica = {
      pattern: area.dataset.pattern || "I like to eat ___.",
      meaning: area.dataset.meaning || "Eu gosto de comer ___.",
      model: area.dataset.model || "I like to eat fruit.",
      origem: area.dataset.origin || "gerada",
      prompts
    };

    const linhasJaEnviadas = String(registro?.texto || "")
      .split(/\n+/)
      .map(linha => linha.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);
    const cartoesJaEnviados = linhasJaEnviadas.length === 5 ? criarCartoesEstrutura(pratica, linhasJaEnviadas) : null;
    registrarEstruturaDaAula(data, pratica, cartoesJaEnviados).catch(erro => console.warn("Não foi possível salvar a estrutura para revisão.", erro));

    const brutoInicial = registro?.rascunho ?? registro?.texto ?? lerArmazenamentoLocal(chaveEscrita(data));
    const valoresIniciais = String(brutoInicial || "")
      .split(/\n+/)
      .map(linha => linha.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);

    area.innerHTML = `
      <div class="english-drill-head">
        <strong>Agora faça 5 frases</strong>
        <span>Repita a mesma estrutura. Troque somente o vocabulário.</span>
      </div>
      <div class="english-drill-list">
        ${prompts.map((prompt, indice) => `
          <label class="english-drill-item">
            <span><b>${indice + 1}</b>${escaparHtml(prompt)}</span>
            <input type="text" autocomplete="off" data-writing-line="${indice}" placeholder="Escreva a frase completa em inglês">
          </label>`).join("")}
      </div>
      <div class="english-workspace-footer">
        <span class="english-word-count" data-writing-progress>0 de 5 frases</span>
        <div class="english-workspace-actions">
          <button class="btn small primary" type="button" data-submit-writing>Enviar 5 frases</button>
          <button class="btn small" type="button" data-clear-writing>Limpar</button>
        </div>
      </div>
      <p class="english-save-note" data-writing-status>As frases são salvas automaticamente.</p>
      <div data-writing-analysis>${htmlAnaliseEscrita(registro)}</div>`;

    const campos = [...area.querySelectorAll("[data-writing-line]")];
    const progresso = area.querySelector("[data-writing-progress]");
    const status = area.querySelector("[data-writing-status]");
    const analise = area.querySelector("[data-writing-analysis]");
    campos.forEach((campo, indice) => { campo.value = valoresIniciais[indice] || ""; });

    const linhasAtuais = () => campos.map(campo => campo.value.trim());
    const textoRascunho = () => linhasAtuais().filter(Boolean).join("\n");
    const textoEnvio = () => linhasAtuais().map((linha, indice) => `${indice + 1}. ${linha}`).join("\n");

    const atualizar = () => {
      const completas = linhasAtuais().filter(Boolean).length;
      progresso.textContent = `${completas} de 5 frases`;
      salvarArmazenamentoLocal(chaveEscrita(data), textoRascunho());
    };

    const sincronizarRascunho = () => {
      clearTimeout(temporizadorSalvarEscrita);
      temporizadorSalvarEscrita = setTimeout(async () => {
        const atual = estadoDoDia(data).escrita || {};
        const rascunho = textoRascunho();
        const alterouEnviado = String(atual.rascunho || "") !== rascunho;
        estadoDoDia(data).escrita = {
          ...atual,
          rascunho,
          status: alterouEnviado ? "rascunho" : atual.status || "rascunho",
          atualizadoEm: new Date().toISOString()
        };
        try {
          await salvarEstadoProducoes();
          if (dataAtual() === data && alterouEnviado) status.textContent = "Rascunho sincronizado.";
        } catch {
          if (dataAtual() === data) status.textContent = "Rascunho salvo apenas neste dispositivo.";
        }
      }, 700);
    };

    campos.forEach(campo => campo.addEventListener("input", () => {
      atualizar();
      analise.innerHTML = "";
      sincronizarRascunho();
    }));

    area.querySelector("[data-submit-writing]").addEventListener("click", async evento => {
      const linhas = linhasAtuais();
      const faltantes = linhas.map((linha, indice) => linha ? null : indice + 1).filter(Boolean);
      if (faltantes.length) {
        MMCDUI.toast(`Complete as 5 frases. Faltam: ${faltantes.join(", ")}.`);
        campos[faltantes[0] - 1]?.focus();
        return;
      }

      const botao = evento.currentTarget;
      botao.disabled = true;
      status.textContent = "Enviando para correção...";
      estadoDoDia(data).escrita = {
        texto: textoEnvio(),
        rascunho: textoRascunho(),
        prompt: `Pattern: ${pratica.pattern} | Meaning: ${pratica.meaning} | Model: ${pratica.model} | Prompts: ${prompts.join(", ")}`,
        conceito: conceitoDaAula(),
        estrutura: pratica,
        status: "pendente",
        criadaEm: new Date().toISOString()
      };
      try {
        await salvarEstadoProducoes();
        await registrarEstruturaDaAula(data, pratica, criarCartoesEstrutura(pratica, linhas));
        status.textContent = "5 frases enviadas para correção e revisão futura.";
        analise.innerHTML = htmlAnaliseEscrita(estadoDoDia(data).escrita);
        MMCDUI.toast("As 5 frases foram enviadas.");
      } catch (erro) {
        console.error(erro);
        status.textContent = "Não foi possível sincronizar as frases.";
        MMCDUI.toast("As frases não foram enviadas.");
      } finally {
        botao.disabled = false;
      }
    });

    area.querySelector("[data-clear-writing]").addEventListener("click", async () => {
      if (linhasAtuais().some(Boolean) && !confirm("Limpar as cinco frases desta data?")) return;
      campos.forEach(campo => { campo.value = ""; });
      salvarArmazenamentoLocal(chaveEscrita(data), "");
      delete estadoDoDia(data).escrita;
      atualizar();
      analise.innerHTML = "";
      status.textContent = "Frases limpas.";
      try { await salvarEstadoProducoes(); } catch (erro) { console.warn(erro); }
      campos[0]?.focus();
    });

    atualizar();
  }

  function abrirBancoAudio() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB indisponível"));
        return;
      }

      const requisicao = indexedDB.open("mmcd_english_audio_v2", 1);
      requisicao.onupgradeneeded = () => {
        const banco = requisicao.result;
        if (!banco.objectStoreNames.contains("recordings")) {
          banco.createObjectStore("recordings");
        }
      };
      requisicao.onsuccess = () => resolve(requisicao.result);
      requisicao.onerror = () => reject(requisicao.error);
    });
  }

  function chaveAudioLocal(data, tipo) {
    return `${data}:${tipo}`;
  }

  async function salvarAudioLocal(data, tipo, blob) {
    const banco = await abrirBancoAudio();
    await new Promise((resolve, reject) => {
      const transacao = banco.transaction("recordings", "readwrite");
      transacao.objectStore("recordings").put(blob, chaveAudioLocal(data, tipo));
      transacao.oncomplete = resolve;
      transacao.onerror = () => reject(transacao.error);
    });
    banco.close();
  }

  async function carregarAudioLocal(data, tipo) {
    const banco = await abrirBancoAudio();
    const resultado = await new Promise((resolve, reject) => {
      const transacao = banco.transaction("recordings", "readonly");
      const requisicao = transacao.objectStore("recordings").get(chaveAudioLocal(data, tipo));
      requisicao.onsuccess = () => resolve(requisicao.result || null);
      requisicao.onerror = () => reject(requisicao.error);
    });
    banco.close();
    return resultado;
  }

  async function excluirAudioLocal(data, tipo) {
    const banco = await abrirBancoAudio();
    await new Promise((resolve, reject) => {
      const transacao = banco.transaction("recordings", "readwrite");
      transacao.objectStore("recordings").delete(chaveAudioLocal(data, tipo));
      transacao.oncomplete = resolve;
      transacao.onerror = () => reject(transacao.error);
    });
    banco.close();
  }

  function extensaoAudio(mime = "") {
    const valor = mime.toLowerCase();
    if (valor.includes("ogg")) return "ogg";
    if (valor.includes("mp4") || valor.includes("m4a")) return "mp4";
    if (valor.includes("mpeg") || valor.includes("mp3")) return "mp3";
    if (valor.includes("wav")) return "wav";
    return "webm";
  }

  function chaveAudioRemoto(data, tipo) {
    return `${PREFIXO_AUDIO_REMOTO}:${data}:${tipo}`;
  }

  function blobParaBase64(blob) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => {
        const resultado = String(leitor.result || "");
        resolve(resultado.includes(",") ? resultado.split(",", 2)[1] : resultado);
      };
      leitor.onerror = () => reject(leitor.error || new Error("Falha ao ler o áudio"));
      leitor.readAsDataURL(blob);
    });
  }

  function base64ParaBlob(base64, mimeType = "audio/webm") {
    const binario = atob(String(base64 || ""));
    const bytes = new Uint8Array(binario.length);
    for (let indice = 0; indice < binario.length; indice += 1) {
      bytes[indice] = binario.charCodeAt(indice);
    }
    return new Blob([bytes], { type: mimeType });
  }

  async function excluirAudioRemoto(configKey) {
    if (!configKey) return;
    const { error } = await db.from("configuracoes_usuario")
      .delete()
      .eq("user_id", usuario.id)
      .eq("chave", configKey);
    if (error) throw error;
  }

  async function enviarAudioParaNuvem({ data, tipo, blob, duracao, referencia, pergunta }) {
    const dia = estadoDoDia(data);
    const anterior = dia.audios?.[tipo] || null;
    const configKey = chaveAudioRemoto(data, tipo);
    const contentType = (blob.type || "audio/webm").split(";")[0];
    const arquivoBase64 = await blobParaBase64(blob);

    const { error } = await db.from("configuracoes_usuario").upsert({
      user_id: usuario.id,
      chave: configKey,
      valor: {
        versao: 1,
        mimeType: contentType,
        arquivoBase64,
        duracaoSegundos: Math.max(1, Math.round(duracao || 0)),
        criadaEm: new Date().toISOString()
      }
    }, { onConflict: "user_id,chave" });
    if (error) throw error;

    if (anterior?.configKey && anterior.configKey !== configKey) {
      excluirAudioRemoto(anterior.configKey).catch(() => undefined);
    }

    dia.audios[tipo] = {
      configKey,
      mimeType: contentType,
      duracaoSegundos: Math.max(1, Math.round(duracao || 0)),
      referencia: referencia || "",
      pergunta: pergunta || "",
      conceito: conceitoDaAula(),
      status: "pendente",
      criadaEm: new Date().toISOString()
    };
    await salvarEstadoProducoes();
    return dia.audios[tipo];
  }

  async function carregarAudioRemoto(registro) {
    if (!registro?.configKey) return null;
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", registro.configKey)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const valor = data?.valor;
    if (!valor?.arquivoBase64) return null;
    return base64ParaBlob(valor.arquivoBase64, valor.mimeType || registro.mimeType || "audio/webm");
  }

  function liberarUrlAudio(chave = "") {
    if (chave) {
      const url = urlsAudio.get(chave);
      if (url) URL.revokeObjectURL(url);
      urlsAudio.delete(chave);
      return;
    }
    for (const url of urlsAudio.values()) URL.revokeObjectURL(url);
    urlsAudio.clear();
  }

  function exibirAudio(area, chave, blob) {
    const audio = area.querySelector("[data-speaking-audio]");
    const excluir = area.querySelector("[data-delete-recording]");
    if (!audio) return;

    liberarUrlAudio(chave);
    if (!blob) {
      audio.hidden = true;
      audio.removeAttribute("src");
      if (excluir) excluir.hidden = true;
      return;
    }

    const url = URL.createObjectURL(blob);
    urlsAudio.set(chave, url);
    audio.src = url;
    audio.hidden = false;
    if (excluir) excluir.hidden = false;
  }

  function formatarTempo(segundos) {
    const minutos = Math.floor(segundos / 60).toString().padStart(2, "0");
    const resto = (segundos % 60).toString().padStart(2, "0");
    return `${minutos}:${resto}`;
  }

  function encerrarFluxoAudio() {
    if (intervaloGravacao) clearInterval(intervaloGravacao);
    intervaloGravacao = null;
    fluxoAudioAtual?.getTracks?.().forEach(trilha => trilha.stop());
    fluxoAudioAtual = null;
  }

  function cancelarGravacaoAoTrocarData() {
    if (gravadorAtual?.state === "recording") {
      descartarGravacaoAtual = true;
      gravadorAtual.stop();
    }
    encerrarFluxoAudio();
    gravadorAtual = null;
  }

  function mimePreferido() {
    const opcoes = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4"];
    return opcoes.find(tipo => window.MediaRecorder?.isTypeSupported?.(tipo)) || "";
  }

  async function prepararGravador({ area, tipo, referencia = "", pergunta = "" }) {
    if (!area) return;

    const suportaGravacao = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
    const dataDaGravacao = dataAtual();
    const chaveUrl = chaveAudioLocal(dataDaGravacao, tipo);
    const registroInicial = estadoDoDia(dataDaGravacao)?.audios?.[tipo] || null;
    const leitura = tipo === "leitura" || tipo === "cena";

    area.innerHTML = `
      <div class="english-recorder">
        <div class="english-recorder-intro">
          <strong>${leitura ? "Grave a leitura do texto" : "Responda sem ler"}</strong>
          <span>${leitura ? "A automação comparará a transcrição com o texto original." : "A automação transcreverá, corrigirá e mostrará uma forma mais natural."}</span>
        </div>
        <div class="english-recorder-status">
          <span class="english-recorder-dot" aria-hidden="true"></span>
          <strong data-recording-status>${suportaGravacao ? (registroInicial?.status === "corrigida" ? "Análise disponível" : registroInicial?.status === "pendente" ? "Aguardando análise" : "Pronto para gravar") : "Gravação não suportada neste navegador"}</strong>
          <span data-recording-time>00:00</span>
        </div>
        <div class="english-workspace-actions">
          <button class="btn" type="button" data-start-recording ${suportaGravacao ? "" : "disabled"}>${leitura ? "Gravar leitura" : "Gravar resposta"}</button>
          <button class="btn" type="button" data-stop-recording disabled>Parar</button>
          <button class="btn" type="button" data-delete-recording hidden>Excluir áudio</button>
        </div>
        <audio controls data-speaking-audio hidden></audio>
        <p class="english-save-note">Uma cópia temporária fica privada na sua conta e é apagada da nuvem após a análise. Limite de 3 minutos.</p>
        <div data-audio-analysis>${htmlAnaliseAudio(registroInicial, tipo)}</div>
      </div>`;

    const iniciar = area.querySelector("[data-start-recording]");
    const parar = area.querySelector("[data-stop-recording]");
    const excluir = area.querySelector("[data-delete-recording]");
    const status = area.querySelector("[data-recording-status]");
    const tempo = area.querySelector("[data-recording-time]");
    const analise = area.querySelector("[data-audio-analysis]");

    try {
      let blob = await carregarAudioLocal(dataDaGravacao, tipo);
      if (!blob && registroInicial?.configKey) {
        blob = await carregarAudioRemoto(registroInicial);
        if (blob) await salvarAudioLocal(dataDaGravacao, tipo, blob).catch(() => undefined);
      }
      exibirAudio(area, chaveUrl, blob);
      if (registroInicial?.configKey || registroInicial?.status === "corrigida") excluir.hidden = false;
    } catch (erro) {
      console.warn("Não foi possível recuperar o áudio salvo.", erro);
    }

    iniciar.addEventListener("click", async () => {
      if (gravadorAtual?.state === "recording") {
        MMCDUI.toast("Finalize a gravação que já está em andamento.");
        return;
      }
      try {
        descartarGravacaoAtual = false;
        fluxoAudioAtual = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = mimePreferido();
        const opcoesGravador = { audioBitsPerSecond: 32000 };
        if (mime) opcoesGravador.mimeType = mime;
        const gravador = new MediaRecorder(fluxoAudioAtual, opcoesGravador);
        gravadorAtual = gravador;
        const partes = [];
        const inicioEm = Date.now();
        let duracaoFinal = 0;

        gravador.addEventListener("dataavailable", evento => {
          if (evento.data?.size) partes.push(evento.data);
        });

        gravador.addEventListener("stop", async () => {
          duracaoFinal = Math.max(1, Math.round((Date.now() - inicioEm) / 1000));
          encerrarFluxoAudio();
          iniciar.disabled = false;
          parar.disabled = true;
          area.classList.remove("is-recording");
          gravadorAtual = null;

          if (descartarGravacaoAtual || !partes.length) {
            descartarGravacaoAtual = false;
            status.textContent = "Pronto para gravar";
            tempo.textContent = "00:00";
            return;
          }

          const blob = new Blob(partes, { type: gravador.mimeType || "audio/webm" });
          try {
            await salvarAudioLocal(dataDaGravacao, tipo, blob);
            if (dataAtual() === dataDaGravacao) exibirAudio(area, chaveUrl, blob);
            status.textContent = "Sincronizando áudio...";
            const registro = await enviarAudioParaNuvem({
              data: dataDaGravacao,
              tipo,
              blob,
              duracao: duracaoFinal,
              referencia,
              pergunta
            });
            status.textContent = "Aguardando análise";
            analise.innerHTML = htmlAnaliseAudio(registro, tipo);
            MMCDUI.toast("Áudio sincronizado para análise.");
          } catch (erro) {
            console.error(erro);
            status.textContent = "Áudio salvo apenas neste dispositivo";
            analise.innerHTML = '<div class="english-analysis is-error"><strong>O áudio não foi sincronizado</strong><p>Verifique a conexão e grave novamente.</p></div>';
            MMCDUI.toast("O áudio foi gravado, mas não chegou à sua conta.");
          }
        });

        gravador.start();
        area.classList.add("is-recording");
        iniciar.disabled = true;
        parar.disabled = false;
        status.textContent = "Gravando...";
        tempo.textContent = "00:00";
        intervaloGravacao = setInterval(() => {
          const segundos = Math.floor((Date.now() - inicioEm) / 1000);
          tempo.textContent = formatarTempo(segundos);
          if (segundos >= 180 && gravador.state === "recording") {
            gravador.stop();
            MMCDUI.toast("A gravação foi encerrada no limite de 3 minutos.");
          }
        }, 500);
      } catch (erro) {
        console.error(erro);
        encerrarFluxoAudio();
        gravadorAtual = null;
        status.textContent = "Não foi possível acessar o microfone";
        MMCDUI.toast("Autorize o uso do microfone para gravar sua resposta.");
      }
    });

    parar.addEventListener("click", () => {
      if (gravadorAtual?.state === "recording") gravadorAtual.stop();
    });

    excluir.addEventListener("click", async () => {
      if (!confirm("Excluir este áudio e a análise correspondente?")) return;
      const registro = estadoDoDia(dataDaGravacao)?.audios?.[tipo] || null;
      try {
        if (registro?.configKey) {
          await excluirAudioRemoto(registro.configKey);
        }
        await excluirAudioLocal(dataDaGravacao, tipo).catch(() => undefined);
        delete estadoDoDia(dataDaGravacao).audios[tipo];
        await salvarEstadoProducoes();
        exibirAudio(area, chaveUrl, null);
        analise.innerHTML = "";
        status.textContent = "Pronto para gravar";
        tempo.textContent = "00:00";
        MMCDUI.toast("Áudio excluído.");
      } catch (erro) {
        console.error(erro);
        MMCDUI.toast("Não foi possível excluir o áudio.");
      }
    });
  }

  async function prepararLeitura() {
    const area = conteudo.querySelector("[data-reading-workspace]");
    const bloco = area?.closest(".english-lesson-block");
    const referencia = bloco?.querySelector(".english-block-body")?.textContent?.replace(/\s+/g, " ").trim() || "";
    await prepararGravador({ area, tipo: "leitura", referencia });
  }

  async function prepararFala() {
    const area = conteudo.querySelector("[data-speaking-workspace]");
    if (!area) return;

    const bloco = area.closest(".english-lesson-block");

    if (area.dataset.sceneReading === "true" || bloco?.dataset?.lessonKind === "scene") {
      const falas = [...bloco.querySelectorAll(".series-original-text > p:first-child")]
        .map(item => item.textContent?.replace(/\s+/g, " ").trim() || "")
        .filter(Boolean);
      const referencia = falas.join(" ");
      await prepararGravador({ area, tipo: "cena", referencia });
      return;
    }

    const pergunta = bloco?.querySelector(".english-block-body")?.textContent?.replace(/\s+/g, " ").trim() || "";
    await prepararGravador({ area, tipo: "fala", pergunta });
  }

  async function prepararEspacosResposta() {
    prepararEscrita();
    await prepararLeitura();
    await prepararFala();
  }


  function aplicarTraducoes(glossario) {
    const walker = document.createTreeWalker(
      conteudo,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(no) {
          if (!no.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
          const pai = no.parentElement;
          if (!pai || pai.closest(".practice-note") || pai.closest(".english-word") || pai.closest(".english-response-workspace")) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nos = [];
    let no;
    while ((no = walker.nextNode())) nos.push(no);

    const padrao = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

    for (const textoNo of nos) {
      const texto = textoNo.nodeValue;
      let ultimo = 0;
      let encontrou = false;
      let correspondencia;
      const fragmento = document.createDocumentFragment();

      padrao.lastIndex = 0;
      while ((correspondencia = padrao.exec(texto))) {
        const palavra = correspondencia[0];
        const traducao = glossario[normalizarPalavra(palavra)];
        if (!traducao) continue;

        encontrou = true;
        if (correspondencia.index > ultimo) {
          fragmento.append(document.createTextNode(texto.slice(ultimo, correspondencia.index)));
        }

        const span = document.createElement("span");
        span.className = "english-word";
        span.tabIndex = 0;
        span.dataset.translation = traducao;
        span.setAttribute("aria-label", `${palavra}: ${traducao}`);
        span.textContent = palavra;
        fragmento.append(span);
        ultimo = correspondencia.index + palavra.length;
      }

      if (!encontrou) continue;
      if (ultimo < texto.length) fragmento.append(document.createTextNode(texto.slice(ultimo)));
      textoNo.replaceWith(fragmento);
    }
  }

  async function carregarNivel() {
    try {
      const dados = await MMCD.carregar();
      const dataSelecionada = lista[Number(seletor.value)]?.data || new Date().toISOString().slice(0, 10);
      const dataLocal = new Date(`${dataSelecionada}T12:00:00`);
      const dia = dataLocal.getDay();

      const meta = (dados.metas || []).find(item => {
        const nome = `${item.nome || ""} ${item.categoria || ""}`.toLocaleLowerCase("pt-BR");
        const mapa = item.nivelInglesPorDia || {};
        const nivel = mapa[String(dia)] || item.nivelIngles || "";
        item.__nivelSelecionado = nivel;

        return item.ativa !== false &&
          nivel &&
          (nome.includes("ingl") || nome.includes("english")) &&
          (!(item.diasSemana || []).length || (item.diasSemana || []).includes(dia)) &&
          (!item.inicioVigencia || dataSelecionada >= item.inicioVigencia) &&
          (!item.fimVigencia || dataSelecionada <= item.fimVigencia);
      });

      if (!meta) {
        nivelBox.hidden = true;
        return;
      }

      const nomes = { facil: "Fácil", medio: "Médio", dificil: "Difícil" };
      nivelBox.textContent = `Nível de hoje: ${nomes[meta.__nivelSelecionado] || meta.__nivelSelecionado}`;
      nivelBox.hidden = false;
    } catch (erro) {
      console.warn("Não foi possível carregar o nível do inglês.", erro);
      nivelBox.hidden = true;
    }
  }

  function dataAtual() {
    return lista[Number(seletor.value)]?.data || "";
  }

  async function carregarMarcacoes() {
    try {
      const linhas = await MMCD.listarMarcacoesIngles(dataAtual());
      aplicarTextos(linhas.map(item => item.texto));
    } catch (erro) {
      console.error(erro);
      MMCDUI.toast("Não foi possível carregar as marcações.");
    }
  }

  function aplicarTextos(textos) {
    for (const texto of textos) {
      const walker = document.createTreeWalker(conteudo, NodeFilter.SHOW_TEXT);
      let no;

      while ((no = walker.nextNode())) {
        const inicio = no.nodeValue.indexOf(texto);
        if (inicio < 0) continue;

        const range = document.createRange();
        range.setStart(no, inicio);
        range.setEnd(no, inicio + texto.length);
        const marca = document.createElement("mark");
        marca.className = "english-highlight";
        marca.title = "Duplo clique para remover a marcação";

        try {
          range.surroundContents(marca);
        } catch {
          // Uma marcação antiga incompatível não pode impedir a leitura.
        }
        break;
      }
    }
  }

  let filaMarcacoes = Promise.resolve();
  let temporizadorSelecao = null;

  function textosMarcados() {
    return [...conteudo.querySelectorAll("mark.english-highlight")]
      .map(item => item.textContent.trim())
      .filter(Boolean);
  }

  function salvarMarcacoes() {
    const data = dataAtual();
    const textos = textosMarcados();

    filaMarcacoes = filaMarcacoes
      .catch(() => undefined)
      .then(() => MMCD.substituirMarcacoesIngles(data, textos));

    return filaMarcacoes;
  }

  function rangeCruzaMarcacao(range) {
    return [...conteudo.querySelectorAll("mark.english-highlight")]
      .some(marca => {
        try {
          return range.intersectsNode(marca);
        } catch {
          return false;
        }
      });
  }

  async function marcarSelecaoIngles({ silencioso = false } = {}) {
    const selecao = getSelection();
    if (!selecao || selecao.isCollapsed || !selecao.rangeCount) {
      if (!silencioso) MMCDUI.toast("Selecione uma palavra ou expressão primeiro.");
      return false;
    }

    const range = selecao.getRangeAt(0);
    const ancestral = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

    if (!ancestral || !conteudo.contains(ancestral) || ancestral.closest?.(".english-response-workspace")) {
      if (!silencioso) MMCDUI.toast("Selecione um trecho do inglês diário.");
      return false;
    }

    const texto = range.toString().trim();
    if (!texto) return false;

    if (rangeCruzaMarcacao(range)) {
      if (!silencioso) MMCDUI.toast("Esse trecho já cruza uma marcação existente.");
      return false;
    }

    const marca = document.createElement("mark");
    marca.className = "english-highlight";
    marca.title = "Duplo clique para remover a marcação";

    try {
      range.surroundContents(marca);
    } catch {
      const fragmento = range.extractContents();
      marca.append(fragmento);
      range.insertNode(marca);
    }

    selecao.removeAllRanges();

    try {
      await salvarMarcacoes();
      MMCDUI.toast("Marcação salva e sincronizada.");
    } catch (erro) {
      console.error(erro);
      MMCDUI.toast("A marcação apareceu, mas não foi sincronizada.");
    }

    return true;
  }

  async function removerMarcacaoIngles(marca) {
    if (!marca?.matches?.("mark.english-highlight")) return;

    marca.replaceWith(...marca.childNodes);
    conteudo.normalize();
    getSelection()?.removeAllRanges();

    try {
      await salvarMarcacoes();
      MMCDUI.toast("Marcação removida e sincronizada.");
    } catch (erro) {
      console.error(erro);
      MMCDUI.toast("A marcação foi removida da tela, mas não sincronizou.");
    }
  }

  function agendarMarcacaoDaSelecao(evento) {
    if (evento.button !== undefined && evento.button !== 0) return;
    if (evento.detail > 1) return;

    clearTimeout(temporizadorSelecao);
    temporizadorSelecao = setTimeout(() => {
      marcarSelecaoIngles({ silencioso: true });
    }, 250);
  }

  function alternarComDuploClique(evento) {
    clearTimeout(temporizadorSelecao);

    const marca = evento.target.closest?.("mark.english-highlight");
    if (marca && conteudo.contains(marca)) {
      evento.preventDefault();
      evento.stopPropagation();
      removerMarcacaoIngles(marca);
      return;
    }

    setTimeout(() => {
      marcarSelecaoIngles({ silencioso: true });
    }, 0);
  }

  async function abrir() {
    cancelarGravacaoAoTrocarData();
    liberarUrlAudio();
    const markdown = lista[Number(seletor.value)]?.markdown || "";
    conteudo.innerHTML = renderizar(markdown);
    await carregarNivel();
    await carregarMarcacoes();
    aplicarTraducoes(extrairGlossario(markdown));
    // MMCD_ENGLISH_EXPERIENCE_RENDER_START
    if (window.MMCDEnglishExperience?.render) {
      await window.MMCDEnglishExperience.render({
        container: conteudo,
        data: dataAtual(),
        db,
        usuario
      });
    }
    // MMCD_ENGLISH_EXPERIENCE_RENDER_END
await prepararEspacosResposta();
  }

  function fecharTooltips(excecao = null) {
    conteudo.querySelectorAll(".english-word.is-open").forEach(item => {
      if (item !== excecao) item.classList.remove("is-open");
    });
  }

  if (!lista.length) {
    conteudo.innerHTML = '<div class="empty">Nenhuma meditação publicada foi encontrada.</div>';
    nivelBox.hidden = true;
    return;
  }

  lista.forEach((meditacao, indice) => {
    const opcao = document.createElement("option");
    opcao.value = String(indice);
    opcao.textContent = meditacao.data.split("-").reverse().join("/");
    seletor.append(opcao);
  });

  seletor.value = String(lista.length - 1);
  seletor.addEventListener("change", abrir);

  document.querySelector("#ingles-marcar").addEventListener("click", () => {
    marcarSelecaoIngles();
  });

  conteudo.addEventListener("mouseup", agendarMarcacaoDaSelecao);
  conteudo.addEventListener("dblclick", alternarComDuploClique);

  conteudo.addEventListener("click", evento => {
    const palavra = evento.target.closest?.(".english-word");
    if (!palavra) return;

    evento.stopPropagation();
    const deveAbrir = !palavra.classList.contains("is-open");
    fecharTooltips(palavra);
    palavra.classList.toggle("is-open", deveAbrir);
  });

  document.addEventListener("click", evento => {
    if (!conteudo.contains(evento.target)) fecharTooltips();
  });

  document.querySelector("#ingles-limpar").addEventListener("click", async () => {
    const marcas = [...conteudo.querySelectorAll("mark.english-highlight")];
    if (!marcas.length) return;
    if (!confirm("Remover todas as marcações desta data?")) return;

    marcas.forEach(marca => marca.replaceWith(...marca.childNodes));
    conteudo.normalize();

    try {
      await salvarMarcacoes();
      MMCDUI.toast("Marcações removidas e sincronizadas.");
    } catch (erro) {
      console.error(erro);
      MMCDUI.toast("As marcações saíram da tela, mas não sincronizaram.");
    }
  });

  try {
    await carregarEstadoProducoes();
  } catch (erro) {
    console.warn("Não foi possível carregar as produções de inglês.", erro);
  }

  await abrir();
})();
