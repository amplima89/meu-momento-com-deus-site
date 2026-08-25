"use strict";

window.MMCDEnglishFinalCorrectionV81138 = (() => {
  const FINAL_KEY = "ingles_correcao_final_v81_13_8";
  const DAILY_KEY = "ingles_atividade_diaria_v1";
  const PRACTICE_KEY = "ingles_pratica_v2";
  const PROTOCOL = "memory-ingles://corrigir";
  const POLL_MS = 2400;

  let ctx = null;
  let host = null;
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

  async function readConfig(key) {
    const {data,error} = await ctx.db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",ctx.usuario.id)
      .eq("chave",key)
      .maybeSingle();

    if(error) throw error;
    return data?.valor && typeof data.valor === "object"
      ? structuredClone(data.valor)
      : null;
  }

  async function writeConfig(key,value) {
    const {error} = await ctx.db
      .from("configuracoes_usuario")
      .upsert({
        user_id:ctx.usuario.id,
        chave:key,
        valor:value
      },{onConflict:"user_id,chave"});

    if(error) throw error;
  }

  function closestQuestionBlock(textarea) {
    let node = textarea;

    for(let depth=0; node && depth<7; depth++, node=node.parentElement) {
      const text = norm(node.textContent);

      if(
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

  function conversationPrompt(block,textarea,index) {
    const lines = String(block?.innerText || "")
      .split(/\n+/)
      .map(line => line.trim())
      .filter(Boolean);

    const answer = String(textarea?.value || "").trim();

    for(const line of lines) {
      const normalized = norm(line);

      if(!line || line === answer) continue;
      if(/^question\s*\d+$/i.test(line)) continue;
      if(/^your answer$/i.test(line)) continue;
      if(/^sua resposta$/i.test(line)) continue;
      if(/^hint[:\s]/i.test(line)) continue;
      if(/^atualizar resposta$/i.test(line)) continue;
      if(normalized.includes("resposta salva")) continue;
      if(line.length < 10) continue;

      return line;
    }

    return `Question ${index+1}`;
  }

  function collectConversation() {
    const root = document.querySelector("#english-conversation-host");
    if(!root) return [];

    return [...root.querySelectorAll("textarea")]
      .filter(field => String(field.value || "").trim())
      .slice(0,10)
      .map((textarea,index) => {
        const block = closestQuestionBlock(textarea);

        return {
          id:`conversation-${index+1}`,
          prompt:conversationPrompt(block,textarea,index),
          userAnswer:String(textarea.value || "").trim()
        };
      });
  }

  function practiceForDate(store,date) {
    const sessions = Array.isArray(store?.sessions)
      ? store.sessions
      : [];

    const session = sessions.find(item => item?.date === date);

    if(!session) {
      return {
        completed:false,
        rounds:[]
      };
    }

    const rounds = (session.rounds || [])
      .filter(round => round?.completed)
      .map((round,index) => ({
        id:round.id || `${round.scriptId || "practice"}-${index+1}`,
        title:round.scriptTitle || round.scriptLabel || `Roteiro ${index+1}`,
        label:round.scriptLabel || "",
        sourceTheme:round.sourceTheme || "",
        answers:(round.answers || []).map((item,qIndex) => ({
          id:`practice-${index+1}-${qIndex+1}`,
          prompt:item.prompt || `Question ${qIndex+1}`,
          userAnswer:item.answer || ""
        }))
      }));

    return {
      completed:Boolean(session.completed || rounds.length),
      rounds
    };
  }

  function dailyForDate(store,date) {
    const day = store?.days?.[date] || null;

    if(!day) {
      return {
        ready:false,
        saved:false,
        localReady:false,
        started:false,
        missing:[],
        day:null
      };
    }

    const saved = [
      "pronto",
      "pendente",
      "processando",
      "corrigida"
    ].includes(day.status);

    return {
      ready:saved,
      saved,
      localReady:false,
      started:saved,
      missing:[],
      day
    };
  }

  function triggerLocalCorrector() {
    if(!isWindows()) return false;

    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("aria-hidden","true");
    frame.src = `${PROTOCOL}?source=english-final&ts=${Date.now()}`;

    document.body.appendChild(frame);
    setTimeout(() => frame.remove(),2500);

    return true;
  }

  function metric(label,value) {
    const score = Math.max(0,Math.min(100,Number(value) || 0));

    return `
      <div class="english-final-metric">
        <span>${esc(label)}</span>
        <strong>${score}%</strong>
        <i><u style="width:${score}%"></u></i>
      </div>
    `;
  }

  function correctionCard(item,index) {
    const status = String(item?.status || "revisar");
    const statusLabel = status === "correta"
      ? "Correta"
      : status === "parcial"
        ? "Entendível, mas ajustar"
        : "Revisar";

    return `
      <article class="english-final-answer ${esc(status)}">
        <header>
          <span>${index+1}</span>
          <div>
            <strong>${esc(item.prompt || "Resposta")}</strong>
            <small>${esc(statusLabel)}</small>
          </div>
        </header>

        ${item.userAnswer ? `
          <div>
            <b>Sua resposta</b>
            <p>${esc(item.userAnswer)}</p>
          </div>
        ` : ""}

        ${item.correction ? `
          <div class="correction">
            <b>Correção necessária</b>
            <p>${esc(item.correction)}</p>
          </div>
        ` : ""}

        ${item.naturalVersion ? `
          <div class="natural">
            <b>Versão mais natural</b>
            <p>${esc(item.naturalVersion)}</p>
          </div>
        ` : ""}

        ${item.explanation ? `
          <div>
            <b>Explicação curta</b>
            <p>${esc(item.explanation)}</p>
          </div>
        ` : ""}
      </article>
    `;
  }

  function sectionHtml(title,items) {
    if(!Array.isArray(items) || !items.length) return "";

    return `
      <section class="english-final-result-section">
        <h4>${esc(title)}</h4>
        <div>
          ${items.map(correctionCard).join("")}
        </div>
      </section>
    `;
  }

  function renderResult(state) {
    const analysis = state?.analysis || {};
    const metrics = analysis.metrics || {};

    host.innerHTML = `
      <div class="english-final-result">
        <header class="english-final-result__head">
          <div>
            <span>CORREÇÃO FINAL DO INGLÊS</span>
            <h2>${Number(analysis.overallScore || 0)}%</h2>
          </div>
          <p>${esc(analysis.summary || "Correção concluída.")}</p>
        </header>

        <div class="english-final-metrics">
          ${metric("Gramática",metrics.grammar)}
          ${metric("Vocabulário",metrics.vocabulary)}
          ${metric("Naturalidade",metrics.naturalness)}
          ${metric("Construção",metrics.construction)}
          ${metric("Clareza",metrics.clarity)}
        </div>

        ${sectionHtml("Conversa do dia",analysis.conversation)}
        ${sectionHtml("Compreensão da leitura",analysis.comprehension)}
        ${sectionHtml("Estruturas em novas frases",analysis.structures)}
        ${sectionHtml("Writing",analysis.writing ? [analysis.writing] : [])}
        ${sectionHtml("Speaking",analysis.speaking ? [analysis.speaking] : [])}
        ${sectionHtml("Prática em contexto",analysis.practice)}

        ${analysis.strengths?.length ? `
          <section class="english-final-summary-box">
            <span>O QUE FOI BEM</span>
            <ul>${analysis.strengths.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
          </section>
        ` : ""}

        ${analysis.focus ? `
          <section class="english-final-summary-box focus">
            <span>FOCO PARA O PRÓXIMO DIA</span>
            <p>${esc(analysis.focus)}</p>
          </section>
        ` : ""}

        <p class="english-final-note">
          Clareza pode ser alta mesmo quando existem erros. Gramática e naturalidade são avaliadas separadamente.
        </p>
      </div>
    `;
  }

  function renderStatus({daily,practice,conversation,remote}) {
    const waiting = remote && ["pendente","processando"].includes(remote.status);
    const corrected = remote?.status === "corrigida" && remote?.analysis;

    if(corrected) {
      renderResult(remote);
      return;
    }

    const dailyOk = Boolean(daily?.ready);
    const dailySaved = Boolean(daily?.saved);
    const dailyLocalReady = Boolean(daily?.localReady);
    const dailyStarted = Boolean(daily?.started);

    const practiceCount = practice?.rounds?.reduce(
      (sum,round) => sum + (round.answers?.length || 0),
      0
    ) || 0;

    const practiceOk = Boolean(practice?.completed && practiceCount);
    const conversationCount = conversation.length;
    const canFinish = dailyOk && practiceOk && !waiting;

    const productionStatus = dailySaved
      ? "salvas e prontas"
      : dailyLocalReady
        ? "prontas · serão salvas ao finalizar"
        : dailyStarted
          ? `em andamento${daily?.missing?.length ? ` · falta ${daily.missing.join(", ")}` : ""}`
          : "ainda não preenchidas";

    host.innerHTML = `
      <section class="english-final-correction">
        <header>
          <div>
            <span>ÚLTIMA ETAPA</span>
            <h2>Uma única correção por IA para o inglês do dia</h2>
            <p>Primeiro você produz. No final, a IA revisa tudo em conjunto: conversa, leitura, estruturas, writing, speaking e prática em contexto.</p>
          </div>
          <strong>1 correção</strong>
        </header>

        <div class="english-final-checklist">
          <div class="${conversationCount ? "ok" : "optional"}">
            <span>Conversa do dia</span>
            <strong>${conversationCount ? `${conversationCount} respostas detectadas` : "sem respostas detectadas"}</strong>
          </div>

          <div class="${dailyOk ? "ok" : dailyStarted ? "optional" : ""}">
            <span>Respostas + Writing + Speaking</span>
            <strong>${esc(productionStatus)}</strong>
          </div>

          <div class="${practiceOk ? "ok" : ""}">
            <span>Prática em contexto</span>
            <strong>${practiceOk ? `${practiceCount} respostas prontas` : "conclua o roteiro"}</strong>
          </div>
        </div>

        ${waiting ? `
          <div class="english-final-wait">
            <strong>A IA está corrigindo todo o inglês de hoje.</strong>
            <p>Não há outra correção rodando em paralelo.</p>
          </div>
        ` : `
          <button
            type="button"
            class="btn primary english-final-button ${canFinish ? "is-ready" : "is-blocked"}"
            data-english-final-correct
          >
            Finalizar inglês e corrigir tudo com IA
          </button>
        `}

        <p class="english-final-helper">
          A leitura não fica pendente aqui. Para a correção final, precisam estar prontas as respostas, Writing, Speaking e a Prática em contexto.
        </p>
      </section>
    `;

    host.querySelector("[data-english-final-correct]")
      ?.addEventListener("click",requestFinalCorrection);

    if(waiting) startPolling();
  }

  async function currentMaterial() {
    const [dailyStore,practiceStore,remote] = await Promise.all([
      readConfig(DAILY_KEY),
      readConfig(PRACTICE_KEY),
      readConfig(FINAL_KEY)
    ]);

    const daily = dailyForDate(dailyStore,ctx.data);
    const localDaily = window.MMCDEnglishDailyV8113?.status?.() || null;

    if(localDaily) {
      daily.localReady=Boolean(localDaily.ready);
      daily.started=Boolean(localDaily.started || daily.saved);
      daily.missing=Array.isArray(localDaily.missing)
        ? localDaily.missing
        : [];
      daily.ready=Boolean(daily.saved || localDaily.ready);
    }

    const practice = practiceForDate(practiceStore,ctx.data);
    const conversation = collectConversation();

    return {
      daily,
      practice,
      conversation,
      remote
    };
  }

  async function refresh() {
    if(!host || !ctx) return;

    try {
      const material = await currentMaterial();
      renderStatus(material);
    } catch(error) {
      console.warn("Inglês final: falha ao atualizar status.",error);
    }
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));

  async function waitUntil(predicate,timeoutMs=6500) {
    const started=Date.now();

    while(Date.now()-started < timeoutMs) {
      const material=await currentMaterial();

      if(predicate(material)) {
        return material;
      }

      await sleep(350);
    }

    return currentMaterial();
  }

  function focusMissing(kind) {
    const target = kind === "daily"
      ? document.querySelector("[data-daily-finish]")
        || document.querySelector(".english-daily-finish")
        || document.querySelector('[data-lesson-kind="reading"]')
      : document.querySelector("[data-context-finish]")
        || document.querySelector("#english-practice-host");

    target?.scrollIntoView?.({
      behavior:"smooth",
      block:"center"
    });

    if(target instanceof HTMLElement) {
      setTimeout(() => target.focus?.(),450);
    }
  }

  async function tryPreparePendingParts(material) {
    let current=material;

    // Se a parte de leitura/produção já estiver preenchida, o botão final
    // tenta salvá-la automaticamente antes de desistir.
    if(!current.daily.saved && current.daily.localReady) {
      const dailyButton=document.querySelector("[data-daily-finish]");

      if(dailyButton && !dailyButton.disabled) {
        dailyButton.click();

        current=await waitUntil(
          value => Boolean(value?.daily?.saved)
        );
      }
    }

    // Se as 6 respostas da prática já estiverem prontas, o botão final
    // também tenta concluir/salvar a prática.
    if(!current.practice.completed) {
      const practiceButton=document.querySelector("[data-context-finish]");

      if(practiceButton && !practiceButton.disabled) {
        practiceButton.click();

        current=await waitUntil(
          value => Boolean(value?.practice?.completed)
        );
      }
    }

    return current;
  }

  async function requestFinalCorrection() {
    if(busy) return;
    busy = true;

    try {
      let material = await currentMaterial();

      const button=host?.querySelector?.("[data-english-final-correct]");

      if(button) {
        button.disabled=true;
        button.textContent="Preparando o inglês do dia...";
      }

      material = await tryPreparePendingParts(material);

      const missing=[];

      if(!material.daily.ready) {
        missing.push("Respostas + Writing + Speaking");
      }

      if(!material.practice.completed) {
        missing.push("Prática em contexto");
      }

      if(missing.length) {
        if(button) {
          button.disabled=false;
          button.textContent="Finalizar inglês e corrigir tudo com IA";
        }

        window.MMCDUI?.toast?.(
          `Ainda falta concluir: ${missing.join(" e ")}.`
        );

        focusMissing(!material.daily.ready ? "daily" : "practice");
        await refresh();
        return;
      }

      if(button) {
        button.textContent="Enviando para a IA...";
      }

      const request = {
        schemaVersion:1,
        date:ctx.data,
        status:"pendente",
        requestedAt:new Date().toISOString(),
        conversation:material.conversation,
        daily:material.daily.day,
        practice:material.practice,
        analysis:null,
        error:""
      };

      await writeConfig(FINAL_KEY,request);
      renderStatus({
        ...material,
        remote:request
      });

      if(triggerLocalCorrector()) {
        window.MMCDUI?.toast?.("Correção final iniciada.");
      } else {
        window.MMCDUI?.toast?.("Tudo foi salvo. Abra o Memory no PC para processar a correção final.");
      }

      startPolling();
    } catch(error) {
      console.error("Inglês final: falha ao solicitar correção.",error);
      window.MMCDUI?.toast?.("Não foi possível solicitar a correção final.");
    } finally {
      busy = false;
    }
  }

  function stopPolling() {
    if(pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function startPolling() {
    if(pollTimer) return;

    let attempts = 0;

    pollTimer = setInterval(async () => {
      attempts++;

      try {
        const state = await readConfig(FINAL_KEY);

        if(state?.date !== ctx.data) return;

        if(state?.status === "corrigida" && state.analysis) {
          stopPolling();
          renderResult(state);
          window.MMCDUI?.toast?.("Correção final do inglês pronta.");
          return;
        }

        if(state?.status === "erro") {
          stopPolling();

          host.innerHTML = `
            <section class="english-final-correction">
              <header>
                <div>
                  <span>CORREÇÃO FINAL</span>
                  <h2>A correção encontrou um problema</h2>
                  <p>${esc(state.error || "Tente novamente.")}</p>
                </div>
              </header>

              <button type="button" class="btn primary" data-english-final-retry>
                Tentar correção final novamente
              </button>
            </section>
          `;

          host.querySelector("[data-english-final-retry]")
            ?.addEventListener("click",requestFinalCorrection);

          return;
        }
      } catch(error) {
        console.warn("Inglês final: polling falhou.",error);
      }

      if(attempts >= 90) stopPolling();
    },POLL_MS);
  }

  async function render(options) {
    ctx = options;

    const practiceHost = document.querySelector("#english-practice-host");

    if(!practiceHost) return;

    host = document.querySelector("#english-final-correction-host");

    if(!host) {
      host = document.createElement("div");
      host.id = "english-final-correction-host";
      practiceHost.insertAdjacentElement("afterend",host);
    }

    await refresh();

    document.addEventListener(
      "memory:english-part-saved",
      refresh
    );

    document.addEventListener(
      "memory:english-part-progress",
      refresh
    );

    document.addEventListener(
      "input",
      event => {
        if(event.target.closest?.("#english-conversation-host")) {
          clearTimeout(window.__memoryEnglishFinalRefresh);
          window.__memoryEnglishFinalRefresh = setTimeout(refresh,350);
        }
      },
      true
    );
  }

  return {
    version:"v81.13.8",
    render,
    refresh
  };
})();
