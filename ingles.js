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
  let urlAudioAtual = "";

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

  function completarAulaLegada(aula) {
    const tipos = new Set(aula.blocos.map(bloco => bloco.tipo));
    const praticaRapida = aula.blocos.find(bloco => bloco.tipo === "quick");
    const pergunta = praticaRapida?.conteudo || praticaRapida?.valor || "Answer the question from today's lesson.";

    if (!tipos.has("writing")) {
      aula.blocos.push({
        tipo: "writing",
        titulo: "Prática de escrita",
        icone: "✎",
        valor: "",
        conteudo: `Write 4 to 6 sentences in English answering this question: ${pergunta} Use at least one useful expression from the lesson.`
      });
    }

    if (!tipos.has("speaking")) {
      aula.blocos.push({
        tipo: "speaking",
        titulo: "Prática de fala",
        icone: "●",
        valor: "",
        conteudo: `Answer the same question without reading. Speak for 45 to 60 seconds and use at least one useful expression from the lesson.`
      });
    }

    if (praticaRapida) {
      aula.blocos = aula.blocos.filter(bloco => bloco !== praticaRapida);
    }

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
    const resposta = bloco.tipo === "writing"
      ? '<div class="english-response-workspace" data-writing-workspace></div>'
      : bloco.tipo === "speaking"
        ? '<div class="english-response-workspace" data-speaking-workspace></div>'
        : "";

    return `
      <section class="${classe}" data-lesson-kind="${bloco.tipo}">
        <header class="english-block-head">
          <span class="english-block-icon" aria-hidden="true">${bloco.icone}</span>
          <div>
            <p class="english-block-kicker">${bloco.titulo}</p>
            ${tituloPrincipal}
          </div>
        </header>
        <div class="english-block-body">${renderizarFragmento(bloco.conteudo)}</div>
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
    const nota = '<div class="practice-note"><strong>Como usar:</strong> leia em voz alta, selecione em azul as palavras que quer estudar, escreva sua resposta e finalize com o áudio sem ler.</div>';

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

  function prepararEscrita() {
    const area = conteudo.querySelector("[data-writing-workspace]");
    if (!area) return;

    area.innerHTML = `
      <label class="english-writing-field">
        <span>Sua resposta em inglês</span>
        <textarea rows="7" placeholder="Write your answer here..."></textarea>
      </label>
      <div class="english-workspace-footer">
        <span class="english-word-count">0 palavras</span>
        <div class="english-workspace-actions">
          <button class="btn small" type="button" data-copy-writing>Copiar</button>
          <button class="btn small" type="button" data-clear-writing>Limpar</button>
        </div>
      </div>
      <p class="english-save-note">A resposta é salva automaticamente neste dispositivo.</p>`;

    const campo = area.querySelector("textarea");
    const contador = area.querySelector(".english-word-count");
    campo.value = lerArmazenamentoLocal(chaveEscrita());

    const atualizar = () => {
      const quantidade = contarPalavras(campo.value);
      contador.textContent = `${quantidade} palavra${quantidade === 1 ? "" : "s"}`;
      salvarArmazenamentoLocal(chaveEscrita(), campo.value);
    };

    campo.addEventListener("input", atualizar);
    area.querySelector("[data-copy-writing]").addEventListener("click", () => copiarTexto(campo.value));
    area.querySelector("[data-clear-writing]").addEventListener("click", () => {
      if (!campo.value || confirm("Limpar sua resposta escrita desta data?")) {
        campo.value = "";
        atualizar();
        campo.focus();
      }
    });

    atualizar();
  }

  function abrirBancoAudio() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB indisponível"));
        return;
      }

      const requisicao = indexedDB.open("mmcd_english_audio_v1", 1);
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

  async function salvarAudio(data, blob) {
    const banco = await abrirBancoAudio();
    await new Promise((resolve, reject) => {
      const transacao = banco.transaction("recordings", "readwrite");
      transacao.objectStore("recordings").put(blob, data);
      transacao.oncomplete = resolve;
      transacao.onerror = () => reject(transacao.error);
    });
    banco.close();
  }

  async function carregarAudio(data) {
    const banco = await abrirBancoAudio();
    const resultado = await new Promise((resolve, reject) => {
      const transacao = banco.transaction("recordings", "readonly");
      const requisicao = transacao.objectStore("recordings").get(data);
      requisicao.onsuccess = () => resolve(requisicao.result || null);
      requisicao.onerror = () => reject(requisicao.error);
    });
    banco.close();
    return resultado;
  }

  async function excluirAudio(data) {
    const banco = await abrirBancoAudio();
    await new Promise((resolve, reject) => {
      const transacao = banco.transaction("recordings", "readwrite");
      transacao.objectStore("recordings").delete(data);
      transacao.oncomplete = resolve;
      transacao.onerror = () => reject(transacao.error);
    });
    banco.close();
  }

  function liberarUrlAudio() {
    if (!urlAudioAtual) return;
    URL.revokeObjectURL(urlAudioAtual);
    urlAudioAtual = "";
  }

  function exibirAudio(blob) {
    const audio = conteudo.querySelector("[data-speaking-audio]");
    const excluir = conteudo.querySelector("[data-delete-recording]");
    if (!audio) return;

    liberarUrlAudio();
    if (!blob) {
      audio.hidden = true;
      audio.removeAttribute("src");
      if (excluir) excluir.hidden = true;
      return;
    }

    urlAudioAtual = URL.createObjectURL(blob);
    audio.src = urlAudioAtual;
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

  async function prepararFala() {
    const area = conteudo.querySelector("[data-speaking-workspace]");
    if (!area) return;

    const suportaGravacao = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
    area.innerHTML = `
      <div class="english-recorder">
        <div class="english-recorder-status">
          <span class="english-recorder-dot" aria-hidden="true"></span>
          <strong data-recording-status>${suportaGravacao ? "Pronto para gravar" : "Gravação não suportada neste navegador"}</strong>
          <span data-recording-time>00:00</span>
        </div>
        <div class="english-workspace-actions">
          <button class="btn" type="button" data-start-recording ${suportaGravacao ? "" : "disabled"}>Gravar resposta</button>
          <button class="btn" type="button" data-stop-recording disabled>Parar</button>
          <button class="btn" type="button" data-delete-recording hidden>Excluir áudio</button>
        </div>
        <audio controls data-speaking-audio hidden></audio>
        <p class="english-save-note">O áudio fica salvo somente neste dispositivo.</p>
      </div>`;

    const iniciar = area.querySelector("[data-start-recording]");
    const parar = area.querySelector("[data-stop-recording]");
    const excluir = area.querySelector("[data-delete-recording]");
    const status = area.querySelector("[data-recording-status]");
    const tempo = area.querySelector("[data-recording-time]");
    const dataDaGravacao = dataAtual();

    try {
      exibirAudio(await carregarAudio(dataDaGravacao));
    } catch (erro) {
      console.warn("Não foi possível recuperar o áudio salvo.", erro);
    }

    iniciar.addEventListener("click", async () => {
      try {
        descartarGravacaoAtual = false;
        fluxoAudioAtual = await navigator.mediaDevices.getUserMedia({ audio: true });
        gravadorAtual = new MediaRecorder(fluxoAudioAtual);
        const partes = [];
        const inicioEm = Date.now();

        gravadorAtual.addEventListener("dataavailable", evento => {
          if (evento.data?.size) partes.push(evento.data);
        });

        gravadorAtual.addEventListener("stop", async () => {
          encerrarFluxoAudio();
          iniciar.disabled = false;
          parar.disabled = true;
          area.classList.remove("is-recording");

          if (descartarGravacaoAtual || !partes.length) {
            descartarGravacaoAtual = false;
            status.textContent = "Pronto para gravar";
            tempo.textContent = "00:00";
            return;
          }

          const blob = new Blob(partes, { type: gravadorAtual.mimeType || "audio/webm" });
          try {
            await salvarAudio(dataDaGravacao, blob);
            if (dataAtual() === dataDaGravacao) exibirAudio(blob);
            status.textContent = "Resposta gravada";
            MMCDUI.toast("Áudio salvo neste dispositivo.");
          } catch (erro) {
            console.error(erro);
            status.textContent = "Áudio gravado, mas não salvo";
          }
        });

        gravadorAtual.start();
        area.classList.add("is-recording");
        iniciar.disabled = true;
        parar.disabled = false;
        status.textContent = "Gravando...";
        tempo.textContent = "00:00";
        intervaloGravacao = setInterval(() => {
          tempo.textContent = formatarTempo(Math.floor((Date.now() - inicioEm) / 1000));
        }, 500);
      } catch (erro) {
        console.error(erro);
        encerrarFluxoAudio();
        status.textContent = "Não foi possível acessar o microfone";
        MMCDUI.toast("Autorize o uso do microfone para gravar sua resposta.");
      }
    });

    parar.addEventListener("click", () => {
      if (gravadorAtual?.state === "recording") gravadorAtual.stop();
    });

    excluir.addEventListener("click", async () => {
      if (!confirm("Excluir o áudio desta data?")) return;
      try {
        await excluirAudio(dataDaGravacao);
        exibirAudio(null);
        status.textContent = "Pronto para gravar";
        tempo.textContent = "00:00";
        MMCDUI.toast("Áudio excluído.");
      } catch (erro) {
        console.error(erro);
        MMCDUI.toast("Não foi possível excluir o áudio.");
      }
    });
  }

  async function prepararEspacosResposta() {
    prepararEscrita();
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

  await abrir();
})();
