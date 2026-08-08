"use strict";

(() => {
  const LIMITE = 10;

  const GLOSSARIO_BASE = {
    "a": "um / uma", "an": "um / uma", "the": "o / a",
    "i": "eu", "i'm": "eu estou / eu sou", "i've": "eu tenho",
    "i'll": "eu vou", "i'd": "eu iria / eu tinha", "my": "meu / minha",
    "me": "me / mim", "mine": "meu / minha", "myself": "eu mesmo",
    "we": "nós", "we're": "nós estamos / somos", "we've": "nós temos",
    "we'll": "nós vamos", "our": "nosso / nossa", "ours": "nosso / nossa",
    "us": "nos / nós", "you": "você / vocês", "you're": "você está / é",
    "you've": "você tem", "you'll": "você vai", "your": "seu / sua",
    "yours": "seu / sua", "yourself": "você mesmo", "he": "ele",
    "him": "ele / o", "his": "dele / seu", "himself": "ele mesmo",
    "she": "ela", "her": "ela / dela", "hers": "dela", "herself": "ela mesma",
    "it": "isso / ele / ela", "its": "seu / sua", "they": "eles / elas",
    "them": "eles / elas", "their": "deles / delas", "theirs": "deles / delas",
    "this": "isto / este / esta", "that": "isso / aquilo / que",
    "these": "estes / estas", "those": "aqueles / aquelas",
    "who": "quem / que", "whom": "quem", "whose": "de quem",
    "what": "o que / qual", "which": "qual / que", "where": "onde",
    "why": "por que", "how": "como",

    "and": "e", "or": "ou", "but": "mas", "because": "porque",
    "so": "então / por isso", "if": "se", "when": "quando",
    "while": "enquanto", "although": "embora", "though": "embora",
    "with": "com", "without": "sem", "for": "para / por",
    "from": "de / desde", "to": "para / a", "in": "em / dentro de",
    "on": "em / sobre", "at": "em / no / na", "of": "de",
    "by": "por / perto de", "about": "sobre", "as": "como / enquanto",
    "into": "para dentro / em", "through": "através de", "under": "sob",
    "over": "sobre / acima de", "before": "antes", "after": "depois",
    "between": "entre", "among": "entre", "around": "ao redor",
    "toward": "em direção a", "against": "contra", "within": "dentro de",

    "is": "é / está", "are": "são / estão", "am": "sou / estou",
    "was": "era / estava", "were": "eram / estavam", "be": "ser / estar",
    "been": "sido / estado", "being": "sendo / estando",
    "have": "ter", "has": "tem", "had": "tinha / teve",
    "do": "fazer", "does": "faz", "did": "fez",
    "don't": "não", "doesn't": "não", "didn't": "não",
    "can": "poder / consegue", "can't": "não pode / não consegue",
    "could": "poderia", "couldn't": "não poderia",
    "will": "vai / irá", "won't": "não vai", "would": "iria",
    "wouldn't": "não iria", "should": "deveria", "shouldn't": "não deveria",
    "must": "deve / precisa", "may": "pode / talvez", "might": "poderia / talvez",
    "not": "não",

    "make": "fazer / tornar", "makes": "faz / torna", "made": "fez / tornou",
    "take": "pegar / levar", "takes": "pega / leva", "took": "pegou / levou",
    "give": "dar", "gives": "dá", "gave": "deu",
    "get": "obter / ficar", "gets": "obtém / fica", "got": "obteve / ficou",
    "go": "ir", "goes": "vai", "went": "foi", "come": "vir",
    "comes": "vem", "came": "veio", "know": "saber / conhecer",
    "knows": "sabe / conhece", "knew": "sabia / conhecia",
    "think": "pensar", "thinks": "pensa", "thought": "pensou / pensamento",
    "see": "ver", "sees": "vê", "saw": "viu", "look": "olhar / parecer",
    "looks": "olha / parece", "feel": "sentir", "feels": "sente / parece",
    "felt": "sentiu / pareceu", "find": "encontrar", "found": "encontrou",
    "want": "querer / quero", "wants": "quer", "need": "precisar / preciso",
    "needs": "precisa", "try": "tentar", "tries": "tenta", "tried": "tentou",
    "use": "usar", "uses": "usa", "used": "usou / costumava",
    "work": "trabalho / trabalhar", "works": "trabalha / funciona",
    "working": "trabalhando", "live": "viver", "lives": "vive",
    "living": "vivendo / vida", "leave": "deixar / partir",
    "leaves": "deixa / parte", "left": "deixou / partiu",
    "stay": "ficar / permanecer", "stays": "fica / permanece",
    "keep": "manter / guardar", "keeps": "mantém / guarda",
    "hold": "segurar / manter", "holds": "segura / mantém",
    "carry": "carregar", "carries": "carrega", "carried": "carregou",
    "bring": "trazer", "brings": "traz", "brought": "trouxe",
    "put": "colocar", "set": "estabelecer / colocar",
    "let": "deixar / permitir", "help": "ajudar / ajuda",
    "helps": "ajuda", "serve": "servir", "serves": "serve",
    "lead": "liderar / conduzir", "leads": "lidera / conduz",
    "follow": "seguir", "follows": "segue", "teach": "ensinar",
    "teaches": "ensina", "learn": "aprender", "learning": "aprendendo",
    "grow": "crescer", "grows": "cresce", "build": "construir",
    "builds": "constrói", "create": "criar", "creates": "cria",
    "protect": "proteger", "protects": "protege", "trust": "confiar",
    "trusts": "confia", "believe": "acreditar / crer", "believes": "acredita / crê",
    "remember": "lembrar", "remembers": "lembra", "forget": "esquecer",
    "forgets": "esquece", "forgive": "perdoar / perdoe",
    "forgives": "perdoa", "wait": "esperar", "waits": "espera",
    "rest": "descansar / descanso", "rests": "descansa",
    "stop": "parar", "stops": "para", "start": "começar",
    "starts": "começa", "continue": "continuar", "continues": "continua",
    "change": "mudar / mudança", "changes": "muda / mudanças",
    "become": "tornar-se", "becomes": "torna-se", "act": "agir",
    "acts": "age", "depend": "depender", "depends": "depende",
    "control": "controlar / controle", "controls": "controla",

    "very": "muito", "more": "mais", "less": "menos", "than": "do que",
    "too": "demais / também", "much": "muito", "many": "muitos / muitas",
    "all": "todo / tudo", "some": "algum / alguns", "any": "qualquer / algum",
    "each": "cada", "every": "cada / todo", "another": "outro / outra",
    "other": "outro / outra", "only": "apenas", "even": "mesmo / até",
    "still": "ainda", "already": "já", "again": "novamente",
    "always": "sempre", "never": "nunca", "sometimes": "às vezes",
    "often": "frequentemente", "usually": "geralmente", "now": "agora",
    "today": "hoje", "today's": "de hoje", "tomorrow": "amanhã",
    "yesterday": "ontem", "here": "aqui", "there": "lá / ali",
    "together": "juntos", "alone": "sozinho", "away": "longe",
    "back": "de volta / atrás", "forward": "adiante",
    "first": "primeiro", "last": "último / durar", "next": "próximo",
    "new": "novo", "old": "antigo / velho", "same": "mesmo",
    "different": "diferente", "right": "certo / direito",
    "wrong": "errado", "good": "bom", "better": "melhor",
    "best": "melhor", "bad": "ruim", "strong": "forte",
    "weak": "fraco", "small": "pequeno", "great": "grande / excelente",
    "greater": "maior", "clear": "claro", "simple": "simples",
    "hard": "difícil / duro", "easy": "fácil", "healthy": "saudável",
    "healthier": "mais saudável", "steady": "constante / equilibrado",
    "faithful": "fiel", "faithfully": "fielmente", "dependent": "dependente",
    "present": "presente", "patient": "paciente", "quiet": "silencioso / quieto",
    "wise": "sábio", "worthy": "digno", "true": "verdadeiro",
    "real": "real", "ready": "pronto", "able": "capaz",

    "day": "dia", "days": "dias", "week": "semana", "weekend": "fim de semana",
    "time": "tempo", "moment": "momento", "morning": "manhã",
    "night": "noite", "year": "ano", "life": "vida", "way": "caminho / maneira",
    "place": "lugar / colocar", "home": "casa", "workplace": "local de trabalho",
    "family": "família", "father": "pai", "mother": "mãe", "son": "filho",
    "daughter": "filha", "child": "criança / filho", "children": "crianças / filhos",
    "people": "pessoas", "person": "pessoa", "man": "homem", "woman": "mulher",
    "friend": "amigo", "team": "equipe", "leader": "líder",
    "leadership": "liderança", "heart": "coração", "mind": "mente",
    "body": "corpo", "hands": "mãos", "voice": "voz", "word": "palavra",
    "words": "palavras", "sentence": "frase", "question": "pergunta",
    "answer": "resposta", "story": "história", "truth": "verdade",
    "knowledge": "conhecimento", "wisdom": "sabedoria", "understanding": "entendimento",
    "choice": "escolha", "decision": "decisão", "responsibility": "responsabilidade",
    "responsibilities": "responsabilidades", "task": "tarefa", "tasks": "tarefas",
    "goal": "meta / objetivo", "purpose": "propósito", "plan": "plano",
    "plans": "planos", "process": "processo", "result": "resultado",
    "results": "resultados", "step": "passo", "steps": "passos",
    "habit": "hábito", "habits": "hábitos", "routine": "rotina",
    "boundary": "limite", "boundaries": "limites", "pressure": "pressão",
    "hurry": "pressa", "fear": "medo", "guilt": "culpa",
    "pride": "orgulho", "humility": "humildade", "peace": "paz",
    "joy": "alegria", "love": "amor", "hope": "esperança",
    "strength": "força", "courage": "coragem", "patience": "paciência",
    "faith": "fé", "faithfulness": "fidelidade", "obedience": "obediência",
    "grace": "graça", "goodness": "bondade", "glory": "glória",
    "praise": "louvor", "worship": "adoração", "prayer": "oração",
    "promise": "promessa", "presence": "presença", "future": "futuro",
    "security": "segurança", "freedom": "liberdade", "growth": "crescimento",
    "legacy": "legado", "service": "serviço", "formation": "formação",
    "quality": "qualidade", "perfection": "perfeição",

    "god": "Deus", "lord": "Senhor", "jesus": "Jesus", "christ": "Cristo",
    "spirit": "Espírito", "holy": "santo", "bible": "Bíblia",
    "scripture": "Escritura", "kingdom": "reino", "cross": "cruz",
    "gospel": "evangelho", "church": "igreja", "saints": "santos",
    "shepherd": "pastor", "servant": "servo", "sovereign": "soberano",
    "sovereignty": "soberania", "eternal": "eterno", "salvation": "salvação",
    "sin": "pecado", "mercy": "misericórdia", "refuge": "refúgio",

    "topic": "tema", "useful": "úteis", "expressions": "expressões",
    "example": "exemplo", "quick": "rápida", "practice": "prática",
    "remembered": "lembrado", "forgot": "esqueceu", "forgotten": "esquecido"
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
  let estado = { versao: 3, itens: {}, sessoes: {}, atualizadoEm: "" };
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

  function resolverTraducao(chave, glossario) {
    if (glossario[chave]) return glossario[chave];

    const candidatos = [];
    if (chave.endsWith("'s")) candidatos.push(chave.slice(0, -2));
    if (chave.endsWith("ies") && chave.length > 4) candidatos.push(`${chave.slice(0, -3)}y`);
    if (chave.endsWith("ing") && chave.length > 5) {
      candidatos.push(chave.slice(0, -3));
      candidatos.push(`${chave.slice(0, -3)}e`);
    }
    if (chave.endsWith("ed") && chave.length > 4) {
      candidatos.push(chave.slice(0, -2));
      candidatos.push(`${chave.slice(0, -1)}`);
    }
    if (chave.endsWith("es") && chave.length > 4) candidatos.push(chave.slice(0, -2));
    if (chave.endsWith("s") && chave.length > 3) candidatos.push(chave.slice(0, -1));

    for (const candidato of candidatos) {
      if (glossario[candidato]) return glossario[candidato];
    }
    return "";
  }

  function apoioTraducao(frase, glossario) {
    const palavras = frase.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [];
    const vistos = new Set();
    const apoio = [];
    for (const palavra of palavras) {
      const chave = normalizar(palavra).replace(/^[^a-z]+|[^a-z']+$/g, "");
      if (!chave || vistos.has(chave)) continue;
      vistos.add(chave);
      const traducao = resolverTraducao(chave, glossario);
      if (traducao) apoio.push({ palavra, traducao });
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
        versao: 3,
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
      const frase = encontrarFrase(markdown, textoMarcado);
      const chaveEstado = `${linha.data_meditacao}::${normalizar(textoMarcado)}`;
      const glossarioExtra = estado.itens[chaveEstado]?.glossarioExtra || {};
      const glossario = { ...localizarGlossario(markdown), ...glossarioExtra };
      const item = {
        textoMarcado,
        frase,
        dataOrigem: linha.data_meditacao,
        apoio: apoioTraducao(frase, glossario)
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

  function producoesDoItem(item) {
    return estado.itens[chaveItem(item)]?.frasesProducao || {};
  }

  function producaoDoDia(dataAtual, item) {
    return producoesDoItem(item)[dataAtual] || null;
  }

  function correcaoAnterior(dataAtual, item) {
    const entradas = Object.entries(producoesDoItem(item))
      .filter(([data, valor]) => data < dataAtual && valor?.fraseUsuario)
      .sort(([a], [b]) => b.localeCompare(a));

    return entradas[0] ? { data: entradas[0][0], ...entradas[0][1] } : null;
  }

  function fraseContemAlvo(frase, alvo) {
    return normalizar(frase).includes(normalizar(alvo));
  }

  function htmlCorrecao(dataAtual, item) {
    const anterior = correcaoAnterior(dataAtual, item);
    if (!anterior) return "";

    if (anterior.status !== "corrigida") {
      return `
        <div class="review-correction is-pending">
          <p class="review-correction__eyebrow">Sua frase de ${esc(formatarData(anterior.data))}</p>
          <p class="review-correction__original">${esc(anterior.fraseUsuario)}</p>
          <p class="muted">Aguardando a próxima execução da automação para receber a correção.</p>
        </div>`;
    }

    return `
      <div class="review-correction ${anterior.correta ? "is-correct" : "needs-adjustment"}">
        <div class="review-correction__head">
          <div>
            <p class="review-correction__eyebrow">Correção da frase de ${esc(formatarData(anterior.data))}</p>
            <strong>${anterior.correta ? "Frase correta" : "Ajuste necessário"}</strong>
          </div>
          <span>${anterior.correta ? "✓" : "✎"}</span>
        </div>
        <div class="review-correction__line">
          <span>Sua frase</span>
          <p>${esc(anterior.fraseUsuario)}</p>
        </div>
        <div class="review-correction__line">
          <span>Forma corrigida</span>
          <p>${esc(anterior.fraseCorrigida || anterior.fraseUsuario)}</p>
        </div>
        ${anterior.explicacao ? `
          <div class="review-correction__line">
            <span>Por quê</span>
            <p>${esc(anterior.explicacao)}</p>
          </div>` : ""}
        ${anterior.traducao ? `
          <div class="review-correction__line">
            <span>Tradução</span>
            <p>${esc(anterior.traducao)}</p>
          </div>` : ""}
      </div>`;
  }

  function htmlProducao(dataAtual, item, resposta) {
    const producao = producaoDoDia(dataAtual, item);
    const visivel = resposta === "nao_lembrei" || Boolean(producao?.fraseUsuario);

    return `
      <div class="review-production" ${visivel ? "" : "hidden"}>
        <label>
          <strong>Crie uma nova frase com “${esc(item.textoMarcado)}”</strong>
          <span>Use a palavra ou expressão destacada em uma frase completa em inglês.</span>
          <textarea rows="2" maxlength="350" data-frase-producao placeholder="Escreva sua frase em inglês...">${esc(producao?.fraseUsuario || "")}</textarea>
        </label>
        <div class="review-production__footer">
          <span data-status-producao>${producao?.fraseUsuario ? (producao.status === "corrigida" ? "Frase já corrigida." : "Frase salva para correção amanhã.") : ""}</span>
          <button class="btn small primary" type="button" data-salvar-frase>Salvar para corrigir amanhã</button>
        </div>
      </div>`;
  }

  async function salvarFraseProducao(dataAtual, item, artigo) {
    const campo = artigo.querySelector("[data-frase-producao]");
    const status = artigo.querySelector("[data-status-producao]");
    const botao = artigo.querySelector("[data-salvar-frase]");
    const fraseUsuario = String(campo?.value || "").trim();

    if (fraseUsuario.length < 5) {
      window.MMCDUI?.toast("Escreva uma frase completa antes de salvar.");
      campo?.focus();
      return;
    }

    if (!fraseContemAlvo(fraseUsuario, item.textoMarcado)) {
      window.MMCDUI?.toast(`Use “${item.textoMarcado}” na frase.`);
      campo?.focus();
      return;
    }

    const chave = chaveItem(item);
    estado.itens[chave] ||= {
      textoMarcado: item.textoMarcado,
      frase: item.frase,
      dataOrigem: item.dataOrigem,
      respostas: {}
    };
    estado.itens[chave].frasesProducao ||= {};
    estado.itens[chave].frasesProducao[dataAtual] = {
      fraseUsuario,
      status: "pendente",
      criadaEm: new Date().toISOString()
    };

    if (botao) botao.disabled = true;
    if (status) status.textContent = "Salvando...";

    try {
      await salvarEstado();
      if (status) status.textContent = "Frase salva. A automação vai corrigi-la na próxima manhã.";
      window.MMCDUI?.toast("Frase salva para correção.");
    } catch (erro) {
      console.error(erro);
      if (status) status.textContent = "Não foi possível sincronizar a frase.";
      window.MMCDUI?.toast("A frase não foi sincronizada.");
    } finally {
      if (botao) botao.disabled = false;
    }
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

    const producao = cardItem?.querySelector(".review-production");
    if (producao) {
      producao.hidden = resposta !== "nao_lembrei" && !producaoDoDia(dataAtual, item)?.fraseUsuario;
      if (resposta === "nao_lembrei") {
        setTimeout(() => cardItem.querySelector("[data-frase-producao]")?.focus(), 80);
      }
    }

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
      vazioEl.hidden = false;
      vazioEl.innerHTML = `
        <div class="english-review-empty-state">
          <strong>Nenhuma revisão disponível para esta data.</strong>
          <span>Marque palavras ou expressões na leitura. Quando houver material para revisar, ele aparecerá aqui com “Lembrei”, “Não lembrei” e a criação de uma frase própria.</span>
        </div>`;
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
        ${htmlCorrecao(dataAtual, item)}
        <div class="review-answer-row">
          <button class="btn small remember ${resposta === "lembrei" ? "is-active" : ""}" type="button" data-resposta="lembrei">✓ Lembrei</button>
          <button class="btn small forgot ${resposta === "nao_lembrei" ? "is-active" : ""}" type="button" data-resposta="nao_lembrei">✕ Não lembrei</button>
          <button class="btn small" type="button" data-ajuda>Ver apoio</button>
        </div>
        <div class="review-help" hidden>
          <strong>Palavra ou expressão marcada:</strong> ${esc(item.textoMarcado)}
          ${apoio.length ? `<div class="review-help-list">${apoio.map(x => `<span><b>${esc(x.palavra)}</b> — ${esc(x.traducao)}</span>`).join("")}</div>` : `<p class="muted">As traduções que faltarem serão completadas quando sua frase for corrigida.</p>`}
        </div>
        ${htmlProducao(dataAtual, item, resposta)}`;

      artigo.querySelectorAll("[data-resposta]").forEach(botao => {
        botao.addEventListener("click", () => responder(dataAtual, item, botao.dataset.resposta, botao));
      });
      artigo.querySelector("[data-ajuda]")?.addEventListener("click", evento => {
        const ajuda = artigo.querySelector(".review-help");
        ajuda.hidden = !ajuda.hidden;
        evento.currentTarget.textContent = ajuda.hidden ? "Ver apoio" : "Ocultar apoio";
      });
      artigo.querySelector("[data-salvar-frase]")?.addEventListener("click", () => {
        salvarFraseProducao(dataAtual, item, artigo);
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
      card.hidden = false;
      listaEl.innerHTML = "";
      vazioEl.hidden = false;
      vazioEl.innerHTML = `
        <div class="english-review-empty-state">
          <strong>A revisão não conseguiu carregar agora.</strong>
          <span>A aula continua disponível. Atualize a página para tentar novamente; seus cards e respostas salvos não são apagados.</span>
        </div>`;
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
      card.hidden = false;
      listaEl.innerHTML = "";
      vazioEl.hidden = false;
      vazioEl.innerHTML = `
        <div class="english-review-empty-state">
          <strong>Revisão temporariamente indisponível.</strong>
          <span>O restante da aula continua funcionando. Nenhuma revisão foi apagada.</span>
        </div>`;
    }
  })();
})();
