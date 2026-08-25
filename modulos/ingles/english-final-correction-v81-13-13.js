"use strict";

window.MMCDEnglishFinalCorrectionV811313 = (() => {
  const FINAL_KEY="ingles_correcao_final_v81_13_13";
  const PROTOCOL="memory-ingles://corrigir";
  const POLL_MS=2400;

  let ctx=null;
  let host=null;
  let pollTimer=null;
  let busy=false;

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
    const platform=String(
      navigator.userAgentData?.platform
      || navigator.platform
      || navigator.userAgent
      || ""
    ).toLowerCase();

    return platform.includes("win");
  }

  async function readConfig(key) {
    const {data,error}=await ctx.db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",ctx.usuario.id)
      .eq("chave",key)
      .maybeSingle();

    if(error) throw error;

    return data?.valor && typeof data.valor==="object"
      ? structuredClone(data.valor)
      : null;
  }

  async function writeConfig(key,value) {
    const {error}=await ctx.db
      .from("configuracoes_usuario")
      .upsert({
        user_id:ctx.usuario.id,
        chave:key,
        valor:value
      },{onConflict:"user_id,chave"});

    if(error) throw error;
  }

  function closestQuestionBlock(textarea) {
    let node=textarea;

    for(let depth=0; node && depth<7; depth++,node=node.parentElement) {
      const text=norm(node.textContent);

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

  function promptFromBlock(block,textarea,index) {
    const answer=String(textarea?.value || "").trim();

    const lines=String(block?.innerText || "")
      .split(/\n+/)
      .map(line=>line.trim())
      .filter(Boolean);

    for(const line of lines) {
      const normalized=norm(line);

      if(!line || line===answer) continue;
      if(/^question\s*\d+$/i.test(line)) continue;
      if(/^your answer$/i.test(line)) continue;
      if(/^sua resposta$/i.test(line)) continue;
      if(/^hint[:\s]/i.test(line)) continue;
      if(/^atualizar resposta$/i.test(line)) continue;
      if(normalized.includes("resposta salva")) continue;
      if(line.length<10) continue;

      return line;
    }

    return `Question ${index+1}`;
  }

  function collectConversation() {
    const root=document.querySelector("#english-conversation-host");
    if(!root) return [];

    return [...root.querySelectorAll("textarea")]
      .filter(field=>String(field.value || "").trim())
      .slice(0,10)
      .map((textarea,index)=>{
        const block=closestQuestionBlock(textarea);

        return {
          id:`conversation-${index+1}`,
          prompt:promptFromBlock(block,textarea,index),
          userAnswer:String(textarea.value || "").trim()
        };
      });
  }

  async function readingContext() {
    try {
      const result=await window.MMCDEnglishDailyV8113?.taskForDate?.(ctx.data);
      const task=result?.task || {};

      return {
        completed:Boolean(
          document.querySelector("[data-english-reading-clean]")
          || document.querySelector('[data-lesson-kind="reading"]')
        ),
        title:task.title || "",
        theme:task.theme || ""
      };
    } catch {
      return {
        completed:Boolean(
          document.querySelector("[data-english-reading-clean]")
          || document.querySelector('[data-lesson-kind="reading"]')
        ),
        title:"",
        theme:""
      };
    }
  }

  function practiceStatus() {
    const status=window.MMCDEnglishPractice?.status?.();

    if(!status) {
      return {
        completed:false,
        answers:[],
        title:"",
        label:""
      };
    }

    return status;
  }

  function triggerCorrector() {
    if(!isWindows()) return false;

    const frame=document.createElement("iframe");
    frame.hidden=true;
    frame.setAttribute("aria-hidden","true");
    frame.src=`${PROTOCOL}?source=english-final-clean&ts=${Date.now()}`;

    document.body.appendChild(frame);
    setTimeout(()=>frame.remove(),2500);

    return true;
  }

  function metric(label,value) {
    const score=Math.max(0,Math.min(100,Number(value) || 0));

    return `
      <div class="english-final-clean__metric">
        <span>${esc(label)}</span>
        <strong>${score}%</strong>
        <i><u style="width:${score}%"></u></i>
      </div>
    `;
  }

  function itemHtml(item,index) {
    const label=item?.status==="correta"
      ? "Correta"
      : item?.status==="parcial"
        ? "Entendível, mas ajustar"
        : "Revisar";

    return `
      <article class="english-final-clean__answer ${esc(item?.status || "revisar")}">
        <header>
          <span>${index+1}</span>
          <div>
            <strong>${esc(item?.prompt || "Resposta")}</strong>
            <small>${esc(label)}</small>
          </div>
        </header>

        <div>
          <b>Sua resposta</b>
          <p>${esc(item?.userAnswer || "")}</p>
        </div>

        ${item?.correction ? `
          <div class="correction">
            <b>Correção necessária</b>
            <p>${esc(item.correction)}</p>
          </div>
        ` : ""}

        ${item?.naturalVersion ? `
          <div class="natural">
            <b>Versão mais natural</b>
            <p>${esc(item.naturalVersion)}</p>
          </div>
        ` : ""}

        ${item?.explanation ? `
          <div>
            <b>Explicação curta</b>
            <p>${esc(item.explanation)}</p>
          </div>
        ` : ""}
      </article>
    `;
  }

  function section(title,items) {
    if(!Array.isArray(items) || !items.length) return "";

    return `
      <section class="english-final-clean__section">
        <h4>${esc(title)}</h4>
        <div>${items.map(itemHtml).join("")}</div>
      </section>
    `;
  }

  function renderResult(state) {
    const analysis=state?.analysis || {};
    const metrics=analysis.metrics || {};

    host.innerHTML=`
      <section class="english-final-clean english-final-clean--result">
        <header>
          <div>
            <span>CORREÇÃO FINAL DO DIA</span>
            <h2>${Number(analysis.overallScore || 0)}%</h2>
          </div>
          <p>${esc(analysis.summary || "Correção concluída.")}</p>
        </header>

        <div class="english-final-clean__metrics">
          ${metric("Gramática",metrics.grammar)}
          ${metric("Vocabulário",metrics.vocabulary)}
          ${metric("Naturalidade",metrics.naturalness)}
          ${metric("Construção",metrics.construction)}
          ${metric("Clareza",metrics.clarity)}
        </div>

        ${section("Conversa do dia",analysis.conversation)}
        ${section("Prática em contexto",analysis.practice)}

        ${Array.isArray(analysis.strengths) && analysis.strengths.length ? `
          <div class="english-final-clean__summary">
            <span>O QUE FOI BEM</span>
            <ul>${analysis.strengths.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>
          </div>
        ` : ""}

        ${analysis.focus ? `
          <div class="english-final-clean__summary focus">
            <span>FOCO PARA O PRÓXIMO ESTUDO</span>
            <p>${esc(analysis.focus)}</p>
          </div>
        ` : ""}

        <p class="english-final-clean__note">
          A leitura entra como contexto. A IA corrige apenas o inglês que você realmente produziu.
        </p>
      </section>
    `;
  }

  async function currentMaterial() {
    const [reading,remote]=await Promise.all([
      readingContext(),
      readConfig(FINAL_KEY)
    ]);

    return {
      conversation:collectConversation(),
      reading,
      practice:practiceStatus(),
      remote
    };
  }

  function renderStatus(material) {
    const conversationCount=material.conversation.length;
    const readingOk=Boolean(material.reading?.completed);
    const practiceAnswers=Array.isArray(material.practice?.answers)
      ? material.practice.answers
      : [];
    const practiceOk=Boolean(
      material.practice?.completed
      && practiceAnswers.length>=6
    );

    const waiting=material.remote
      && ["pendente","processando"].includes(material.remote.status);

    if(material.remote?.status==="corrigida" && material.remote.analysis) {
      renderResult(material.remote);
      return;
    }

    const canFinish=
      conversationCount>0
      && readingOk
      && practiceOk
      && !waiting;

    host.innerHTML=`
      <section class="english-final-clean">
        <header>
          <div>
            <span>ÚLTIMA ETAPA</span>
            <h2>Corrigir o inglês de hoje com IA</h2>
            <p>Uma única correção no final. Sem atividades escondidas e sem etapas extras.</p>
          </div>
          <strong>1 correção</strong>
        </header>

        <div class="english-final-clean__checklist">
          <div class="${conversationCount ? "ok" : ""}">
            <span>1 · Conversa</span>
            <strong>${conversationCount
              ? `${conversationCount} respostas prontas`
              : "faltam suas respostas"
            }</strong>
          </div>

          <div class="${readingOk ? "ok" : ""}">
            <span>2 · Leitura</span>
            <strong>${readingOk ? "concluída" : "abra e leia o texto"}</strong>
          </div>

          <div class="${practiceOk ? "ok" : ""}">
            <span>3 · Prática em contexto</span>
            <strong>${practiceOk
              ? "6 respostas prontas"
              : "conclua as 6 respostas"
            }</strong>
          </div>
        </div>

        ${waiting ? `
          <div class="english-final-clean__wait">
            <strong>A IA está corrigindo o inglês de hoje.</strong>
            <p>Essa é a única correção automática desta atividade.</p>
          </div>
        ` : `
          <button
            type="button"
            class="btn primary english-final-clean__button ${canFinish ? "is-ready" : "is-blocked"}"
            data-final-clean-correct
          >
            Finalizar inglês e corrigir com IA
          </button>
        `}

        <p class="english-final-clean__helper">
          A IA corrige suas respostas da Conversa e da Prática em contexto. A Leitura serve como contexto.
        </p>
      </section>
    `;

    host.querySelector("[data-final-clean-correct]")
      ?.addEventListener("click",()=>requestCorrection(canFinish,material));

    if(waiting) startPolling();
  }

  async function requestCorrection(canFinish,material) {
    if(busy) return;

    if(!canFinish) {
      const missing=[];

      if(!material.conversation.length) missing.push("Conversa");
      if(!material.reading?.completed) missing.push("Leitura");
      if(
        !material.practice?.completed
        || (material.practice?.answers?.length || 0)<6
      ) {
        missing.push("Prática em contexto");
      }

      window.MMCDUI?.toast?.(
        `Ainda falta concluir: ${missing.join(", ")}.`
      );

      const target=!material.conversation.length
        ? document.querySelector("#english-conversation-host")
        : !material.reading?.completed
          ? document.querySelector('[data-lesson-kind="reading"]')
          : document.querySelector("#english-practice-host");

      target?.scrollIntoView?.({
        behavior:"smooth",
        block:"center"
      });

      return;
    }

    busy=true;

    try {
      const request={
        schemaVersion:1,
        date:ctx.data,
        status:"pendente",
        requestedAt:new Date().toISOString(),
        conversation:material.conversation,
        reading:material.reading,
        practice:{
          title:material.practice.title || "",
          label:material.practice.label || "",
          answers:material.practice.answers || []
        },
        analysis:null,
        error:""
      };

      await writeConfig(FINAL_KEY,request);

      renderStatus({
        ...material,
        remote:request
      });

      if(triggerCorrector()) {
        window.MMCDUI?.toast?.("Correção final iniciada.");
      } else {
        window.MMCDUI?.toast?.(
          "Tudo salvo. Abra o Memory no PC para processar a correção."
        );
      }

      startPolling();
    } catch(error) {
      console.error("Inglês: falha ao solicitar correção final.",error);
      window.MMCDUI?.toast?.("Não foi possível solicitar a correção final.");
    } finally {
      busy=false;
    }
  }

  function stopPolling() {
    if(pollTimer) {
      clearInterval(pollTimer);
      pollTimer=null;
    }
  }

  function startPolling() {
    if(pollTimer) return;

    let attempts=0;

    pollTimer=setInterval(async()=>{
      attempts++;

      try {
        const state=await readConfig(FINAL_KEY);

        if(state?.date!==ctx.data) return;

        if(state?.status==="corrigida" && state.analysis) {
          stopPolling();
          renderResult(state);
          window.MMCDUI?.toast?.("Correção do inglês pronta.");
          return;
        }

        if(state?.status==="erro") {
          stopPolling();

          host.innerHTML=`
            <section class="english-final-clean">
              <header>
                <div>
                  <span>CORREÇÃO FINAL</span>
                  <h2>A correção encontrou um problema</h2>
                  <p>${esc(state.error || "Tente novamente.")}</p>
                </div>
              </header>

              <button type="button" class="btn primary" data-final-clean-retry>
                Tentar novamente
              </button>
            </section>
          `;

          host.querySelector("[data-final-clean-retry]")
            ?.addEventListener("click",refresh);
        }
      } catch(error) {
        console.warn("Inglês: consulta da correção final falhou.",error);
      }

      if(attempts>=90) stopPolling();
    },POLL_MS);
  }

  async function refresh() {
    if(!host || !ctx) return;

    try {
      renderStatus(await currentMaterial());
    } catch(error) {
      console.warn("Inglês: falha ao atualizar etapa final.",error);
    }
  }

  async function render(options) {
    ctx=options;

    const practiceHost=document.querySelector("#english-practice-host");
    if(!practiceHost) return;

    host=document.querySelector("#english-final-correction-host");

    if(!host) {
      host=document.createElement("div");
      host.id="english-final-correction-host";
      practiceHost.insertAdjacentElement("afterend",host);
    }

    await refresh();

    document.addEventListener(
      "memory:english-part-saved",
      refresh
    );

    document.addEventListener(
      "memory:english-reading-ready",
      refresh
    );

    document.addEventListener(
      "input",
      event=>{
        if(
          event.target.closest?.("#english-conversation-host")
          || event.target.closest?.("#english-practice-host")
        ) {
          clearTimeout(window.__memoryEnglishCleanRefresh);
          window.__memoryEnglishCleanRefresh=setTimeout(refresh,350);
        }
      },
      true
    );
  }

  return {
    render,
    refresh,
    version:"v81.13.13"
  };
})();
