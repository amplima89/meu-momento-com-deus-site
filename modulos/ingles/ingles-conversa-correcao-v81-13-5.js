"use strict";

window.MMCDConversationCorrectionV81135 = (() => {
  const KEY = "ingles_conversa_correcao_v81_13_5";
  const PROTOCOL = "memory-ingles://corrigir";
  const POLL_MS = 2200;

  let ctx = null;
  let observer = null;
  let pollTimer = null;
  let busy = false;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[char]));

  const norm = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ")
    .trim()
    .toLowerCase();

  function isWindows() {
    const platform = String(
      navigator.userAgentData?.platform
      || navigator.platform
      || navigator.userAgent
      || ""
    ).toLowerCase();

    return platform.includes("win");
  }

  async function userId() {
    const direct = ctx?.usuario?.id || ctx?.usuario?.user?.id;
    if (direct) return direct;

    const result = await ctx?.db?.auth?.getUser?.();
    return result?.data?.user?.id || "";
  }

  async function readRemote() {
    const uid = await userId();
    if (!uid || !ctx?.db) return null;

    const {data,error} = await ctx.db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",uid)
      .eq("chave",KEY)
      .maybeSingle();

    if (error) throw error;
    return data?.valor && typeof data.valor === "object"
      ? structuredClone(data.valor)
      : null;
  }

  async function writeRemote(value) {
    const uid = await userId();
    if (!uid || !ctx?.db) throw new Error("Usuário não identificado.");

    const {error} = await ctx.db
      .from("configuracoes_usuario")
      .upsert({
        user_id:uid,
        chave:KEY,
        valor:value
      },{onConflict:"user_id,chave"});

    if (error) throw error;
  }

  function host() {
    return document.querySelector("#english-conversation-host");
  }

  function findResultPanel(root=host()) {
    if (!root) return null;

    const candidates = [
      ...root.querySelectorAll("section,article,div")
    ];

    return candidates
      .filter(el => {
        const text = norm(el.textContent);
        return (
          text.includes("resultado da conversa")
          && (
            text.includes("gramatica")
            || text.includes("naturalidade")
            || text.includes("como ficaria mais natural")
          )
        );
      })
      .sort((a,b) => a.textContent.length - b.textContent.length)[0] || null;
  }

  function closestQuestionBlock(textarea) {
    let node = textarea;

    for (let depth=0; node && depth<7; depth++, node=node.parentElement) {
      const text = norm(node.textContent);

      if (
        /question\s*\d+/.test(text)
        && (
          text.includes("your answer")
          || text.includes("sua resposta")
          || text.includes("atualizar resposta")
        )
      ) {
        return node;
      }
    }

    return textarea.parentElement;
  }

  function promptFromBlock(block, textarea, index) {
    const selectors = [
      "[data-question-prompt]",
      ".question-text",
      ".english-question-text",
      ".prompt",
      "h3",
      "h4",
      "h5"
    ];

    for (const selector of selectors) {
      for (const el of block?.querySelectorAll?.(selector) || []) {
        const text = String(el.textContent || "").trim();

        if (
          text.length >= 10
          && !/^question\s*\d+/i.test(text)
          && !/^your answer$/i.test(text)
          && !/^sua resposta$/i.test(text)
        ) {
          return text;
        }
      }
    }

    const answer = String(textarea?.value || "").trim();
    const lines = String(block?.innerText || "")
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      const normalized = norm(line);

      if (!line || line === answer) continue;
      if (/^question\s*\d+$/i.test(line)) continue;
      if (/^your answer$/i.test(line)) continue;
      if (/^sua resposta$/i.test(line)) continue;
      if (/^hint[:\s]/i.test(line)) continue;
      if (/^atualizar resposta$/i.test(line)) continue;
      if (normalized.includes("resposta salva")) continue;
      if (line.length < 12) continue;

      return line;
    }

    return `Question ${index+1}`;
  }

  function collectQuestions() {
    const root = host();
    if (!root) return [];

    const textareas = [...root.querySelectorAll("textarea")]
      .filter(el => String(el.value || "").trim());

    return textareas.slice(0,8).map((textarea,index) => {
      const block = closestQuestionBlock(textarea);

      return {
        id:`q${index+1}`,
        prompt:promptFromBlock(block,textarea,index),
        userAnswer:String(textarea.value || "").trim()
      };
    });
  }

  function signature(questions) {
    const raw = questions
      .map(item => `${item.prompt}\n${item.userAnswer}`)
      .join("\n---\n");

    let hash = 2166136261;

    for (let i=0;i<raw.length;i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash,16777619);
    }

    return (hash >>> 0).toString(16);
  }

  function panelHost() {
    const result = findResultPanel();

    if (!result) return null;

    let extra = result.querySelector("[data-conversation-ai-detail-v81135]");

    if (!extra) {
      extra = document.createElement("section");
      extra.className = "english-conversation-ai-detail";
      extra.setAttribute("data-conversation-ai-detail-v81135","");
      result.appendChild(extra);
    }

    return extra;
  }

  function errorList(item) {
    const errors = Array.isArray(item?.errors) ? item.errors : [];

    if (!errors.length) {
      return `<p class="english-conversation-ai-detail__ok">Nenhum erro objetivo relevante nesta resposta.</p>`;
    }

    return `
      <div class="english-conversation-ai-detail__errors">
        ${errors.map(error => `
          <div class="english-conversation-ai-error">
            <b>${esc(error.type || "Ajuste")}</b>
            ${error.original?`<p><span>Você usou:</span> ${esc(error.original)}</p>`:""}
            ${error.correction?`<p><span>Melhor:</span> ${esc(error.correction)}</p>`:""}
            ${error.explanation?`<small>${esc(error.explanation)}</small>`:""}
          </div>
        `).join("")}
      </div>
    `;
  }

  function answerHtml(item,index) {
    const status = String(item?.status || "revisar");
    const label = status === "correta"
      ? "Correta"
      : status === "parcial"
        ? "Entendível, mas precisa de ajustes"
        : "Revisar";

    return `
      <article class="english-conversation-ai-answer ${esc(status)}">
        <header>
          <div>
            <span>RESPOSTA ${index+1}</span>
            <strong>${esc(item?.prompt || `Question ${index+1}`)}</strong>
          </div>
          <em>${esc(label)}</em>
        </header>

        <div class="english-conversation-ai-box">
          <b>Sua resposta</b>
          <p>${esc(item?.userAnswer || "")}</p>
        </div>

        ${errorList(item)}

        ${item?.correctedVersion?`
          <div class="english-conversation-ai-box correction">
            <b>Correção necessária</b>
            <p>${esc(item.correctedVersion)}</p>
          </div>
        `:""}

        ${item?.naturalVersion?`
          <div class="english-conversation-ai-box natural">
            <b>Versão mais natural</b>
            <p>${esc(item.naturalVersion)}</p>
          </div>
        `:""}

        ${item?.explanation?`
          <div class="english-conversation-ai-box explanation">
            <b>Por quê</b>
            <p>${esc(item.explanation)}</p>
          </div>
        `:""}
      </article>
    `;
  }

  function metricHtml(name,data={}) {
    const score = Math.max(0,Math.min(100,Number(data.score) || 0));

    return `
      <div class="english-conversation-ai-metric">
        <span>${esc(name)}</span>
        <strong>${score}%</strong>
        <i><u style="width:${score}%"></u></i>
        ${data.note?`<small>${esc(data.note)}</small>`:""}
      </div>
    `;
  }

  function renderAnalysis(state) {
    const target = panelHost();
    if (!target) return;

    const analysis = state?.analysis || {};
    const answers = Array.isArray(analysis.answers) ? analysis.answers : [];
    const metrics = analysis.metrics || {};

    target.innerHTML = `
      <header class="english-conversation-ai-detail__head">
        <div>
          <span>CORREÇÃO DETALHADA DA IA</span>
          <h3>${Number(analysis.overallScore || 0)}%</h3>
        </div>
        <p>${esc(analysis.summary || "Correção concluída.")}</p>
      </header>

      <div class="english-conversation-ai-metrics">
        ${metricHtml("Gramática",metrics.grammar)}
        ${metricHtml("Vocabulário",metrics.vocabulary)}
        ${metricHtml("Naturalidade",metrics.naturalness)}
        ${metricHtml("Construção",metrics.construction)}
        ${metricHtml("Clareza",metrics.clarity)}
      </div>

      <div class="english-conversation-ai-answers">
        ${answers.map(answerHtml).join("")}
      </div>

      ${analysis.focus?`
        <div class="english-conversation-ai-focus">
          <span>PRÓXIMO FOCO</span>
          <p>${esc(analysis.focus)}</p>
        </div>
      `:""}

      <p class="english-conversation-ai-note">
        Entendível não significa sem erros: a correção separa clareza da mensagem, gramática e naturalidade.
      </p>
    `;
  }

  function renderAction(state=null) {
    const target = panelHost();
    if (!target) return;

    const questions = collectQuestions();

    if (!questions.length) {
      target.innerHTML = "";
      return;
    }

    const sig = signature(questions);
    const same = state?.signature === sig;

    if (same && state?.status === "corrigida" && state?.analysis) {
      renderAnalysis(state);
      return;
    }

    if (same && ["pendente","processando"].includes(state?.status)) {
      target.innerHTML = `
        <div class="english-conversation-ai-pending">
          <span>CORREÇÃO DETALHADA DA IA</span>
          <strong>${state.status === "processando" ? "Analisando suas respostas..." : "Correção solicitada."}</strong>
          <p>Agora a IA vai revisar resposta por resposta, procurando gramática, construção e naturalidade — não apenas se a mensagem foi entendida.</p>
        </div>
      `;
      startPolling(sig);
      return;
    }

    target.innerHTML = `
      <div class="english-conversation-ai-action">
        <div>
          <span>CORREÇÃO DETALHADA</span>
          <strong>Quer ver os erros de cada resposta?</strong>
          <p>A IA vai separar o que está entendível do que está realmente correto e natural.</p>
        </div>
        <button type="button" data-conversation-ai-correct>
          Corrigir minhas respostas com IA
        </button>
      </div>
    `;

    target.querySelector("[data-conversation-ai-correct]")
      ?.addEventListener("click",() => requestCorrection(questions).catch(console.error));
  }

  function triggerLocalCorrector() {
    if (!isWindows()) return false;

    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("aria-hidden","true");
    frame.src = `${PROTOCOL}?source=conversation&ts=${Date.now()}`;
    document.body.appendChild(frame);

    setTimeout(() => frame.remove(),2500);
    return true;
  }

  async function requestCorrection(questions) {
    if (busy) return;
    busy = true;

    try {
      const sig = signature(questions);
      const request = {
        schemaVersion:1,
        requestId:`conversation:${Date.now()}`,
        signature:sig,
        status:"pendente",
        questions,
        requestedAt:new Date().toISOString(),
        analysis:null,
        error:""
      };

      await writeRemote(request);
      renderAction(request);

      if (triggerLocalCorrector()) {
        window.MMCDUI?.toast?.("Correção detalhada iniciada.");
      } else {
        window.MMCDUI?.toast?.("Correção salva. Abra o Memory no PC para processar com a IA.");
      }

      startPolling(sig);
    } catch(error) {
      console.error("Memory Inglês: falha ao pedir correção detalhada.",error);
      window.MMCDUI?.toast?.("Não foi possível solicitar a correção detalhada.");
    } finally {
      busy = false;
    }
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPolling(sig) {
    if (pollTimer) return;

    let attempts = 0;

    pollTimer = setInterval(async () => {
      attempts++;

      try {
        const remote = await readRemote();

        if (!remote || remote.signature !== sig) return;

        renderAction(remote);

        if (remote.status === "corrigida" || remote.status === "erro") {
          stopPolling();
        }
      } catch(error) {
        console.warn("Memory Inglês: polling da correção detalhada falhou.",error);
      }

      if (attempts >= 70) {
        stopPolling();
      }
    },POLL_MS);
  }

  async function refresh() {
    const result = findResultPanel();

    if (!result) return;

    const questions = collectQuestions();

    if (!questions.length) return;

    try {
      const remote = await readRemote();
      renderAction(remote);
    } catch(error) {
      console.warn("Memory Inglês: não foi possível consultar correção detalhada.",error);
      renderAction(null);
    }
  }

  async function attach(options) {
    ctx = options || ctx;

    if (!host()) return;

    if (!observer) {
      observer = new MutationObserver(() => {
        if (findResultPanel()) {
          refresh().catch(console.error);
        }
      });

      observer.observe(host(),{
        childList:true,
        subtree:true
      });
    }

    await refresh();
  }

  return {
    version:"v81.13.5",
    attach,
    refresh
  };
})();
