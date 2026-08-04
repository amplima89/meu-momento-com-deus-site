"use strict";

(async () => {
  const lista = await MMCD.listarMeditacoes();
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

  function renderizar(markdown = "") {
    if (!String(markdown).trim()) {
      return '<div class="empty">A meditação desta data foi encontrada, mas o conteúdo não foi carregado.</div>';
    }

    const texto = extrairSecaoIngles(markdown);
    if (!texto) {
      return '<div class="empty">Não consegui identificar a prática de inglês desta meditação.</div>';
    }

    let html = '<div class="practice-note"><strong>Como usar:</strong> passe o mouse ou toque em uma palavra para ver a tradução. Leia em voz alta, responda à prática final e salve em azul as expressões que deseja revisar.</div>';
    const paragrafos = texto.split(/\n\s*\n/);

    for (const paragrafo of paragrafos) {
      const linhas = paragrafo
        .split("\n")
        .map(linha => linha.trim())
        .filter(Boolean);

      if (!linhas.length) continue;

      if (linhas.every(linha => /^[-*]\s+/.test(linha))) {
        html += `<ul>${linhas.map(linha => `<li>${renderizarInline(linha.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      } else {
        html += `<p>${renderizarInline(linhas.join(" ").replace(/\s{2,}/g, " "))}</p>`;
      }
    }

    return html;
  }

  function aplicarTraducoes(glossario) {
    const walker = document.createTreeWalker(
      conteudo,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(no) {
          if (!no.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
          const pai = no.parentElement;
          if (!pai || pai.closest(".practice-note") || pai.closest(".english-word")) {
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

        try {
          range.surroundContents(marca);
        } catch {
          // Uma marcação antiga incompatível não pode impedir a leitura.
        }
        break;
      }
    }
  }

  async function salvarMarcacoes() {
    const textos = [...conteudo.querySelectorAll("mark.english-highlight")]
      .map(item => item.textContent.trim())
      .filter(Boolean);
    await MMCD.substituirMarcacoesIngles(dataAtual(), textos);
  }

  async function abrir() {
    const markdown = lista[Number(seletor.value)]?.markdown || "";
    conteudo.innerHTML = renderizar(markdown);
    await carregarNivel();
    await carregarMarcacoes();
    aplicarTraducoes(extrairGlossario(markdown));
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

  document.querySelector("#ingles-marcar").addEventListener("click", async () => {
    const selecao = getSelection();
    if (!selecao || selecao.isCollapsed || !selecao.rangeCount) {
      MMCDUI.toast("Selecione uma expressão primeiro.");
      return;
    }

    const range = selecao.getRangeAt(0);
    const ancestral = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

    if (!conteudo.contains(ancestral)) {
      MMCDUI.toast("Selecione um trecho do inglês diário.");
      return;
    }

    const marca = document.createElement("mark");
    marca.className = "english-highlight";

    try {
      range.surroundContents(marca);
    } catch {
      const fragmento = range.extractContents();
      marca.append(fragmento);
      range.insertNode(marca);
    }

    selecao.removeAllRanges();
    await salvarMarcacoes();
    MMCDUI.toast("Expressão salva no banco para revisão.");
  });

  conteudo.addEventListener("click", async evento => {
    const marca = evento.target.closest?.("mark.english-highlight");
    if (marca) {
      marca.replaceWith(...marca.childNodes);
      conteudo.normalize();
      await salvarMarcacoes();
      MMCDUI.toast("Marcação removida.");
      return;
    }

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
    await salvarMarcacoes();
    MMCDUI.toast("Marcações removidas.");
  });

  await abrir();
})();
