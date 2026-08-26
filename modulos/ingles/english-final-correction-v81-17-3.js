"use strict";

window.MMCDEnglishFinalCorrectionV81173 = (() => {
  const FINAL_KEY="ingles_correcao_final_v81_17_3";
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

  function cleanAnswer(value) {
    const text=String(value ?? "").trim();
    if(!text || text === "[object Object]") return "";
    return text;
  }

  function conversationFromDom() {
    const root=document.querySelector("#english-conversation-host");
    if(!root) return [];

    const fields=[
      ...root.querySelectorAll(
        "textarea, input[type='text'], input:not([type])"
      )
    ];

    const fromFields=fields
      .map((field,index)=>{
        const answer=cleanAnswer(field.value);
        if(!answer) return null;

        const block=closestQuestionBlock(field);

        return {
          id:`conversation-${index+1}`,
          prompt:promptFromBlock(block,field,index),
          userAnswer:answer
        };
      })
      .filter(Boolean);

    if(fromFields.length) {
      return fromFields.slice(0,10);
    }

    const blocks=[
      ...root.querySelectorAll(
        "[data-question], [data-conversation-question], .english-question, .conversation-question, article"
      )
    ];

    const recovered=[];

    for(const block of blocks) {
      const answerNode=block.querySelector(
        "[data-user-answer], [data-answer], .user-answer, .your-answer, .english-user-answer, .conversation-answer"
      );

      const answer=cleanAnswer(
        answerNode?.getAttribute?.("data-user-answer")
        || answerNode?.getAttribute?.("data-answer")
        || answerNode?.textContent
        || ""
      );

      if(!answer) continue;

      const promptNode=block.querySelector(
        "[data-question-prompt], .question-text, .english-question-text, .prompt, h3, h4, h5, strong"
      );

      recovered.push({
        id:`conversation-${recovered.length+1}`,
        prompt:String(
          promptNode?.textContent
          || `Question ${recovered.length+1}`
        ).trim(),
        userAnswer:answer
      });

      if(recovered.length>=10) break;
    }

    return recovered;
  }

  function keyLooksLikeConversation(key) {
    const text=norm(key);

    if(!/(ingles|english)/.test(text)) return false;
    if(!/(conversa|conversation)/.test(text)) return false;
    if(/(correcao|correction|final|practice|pratica)/.test(text)) return false;

    return true;
  }

  function stringField(obj,names) {
    for(const name of names) {
      const value=obj?.[name];

      if(typeof value==="string" && cleanAnswer(value)) {
        return cleanAnswer(value);
      }
    }

    return "";
  }

  function extractAnswerPairs(value,result=[],depth=0) {
    if(depth>8 || result.length>=10 || value==null) {
      return result;
    }

    if(Array.isArray(value)) {
      for(const item of value) {
        extractAnswerPairs(item,result,depth+1);
        if(result.length>=10) break;
      }
      return result;
    }

    if(typeof value!=="object") {
      return result;
    }

    const answer=stringField(value,[
      "userAnswer",
      "answer",
      "resposta",
      "response",
      "textoResposta",
      "textAnswer"
    ]);

    if(answer) {
      const prompt=stringField(value,[
        "prompt",
        "question",
        "pergunta",
        "questionText",
        "textoPergunta",
        "title"
      ]);

      const duplicate=result.some(item=>
        norm(item.userAnswer)===norm(answer)
      );

      if(!duplicate) {
        result.push({
          id:`conversation-${result.length+1}`,
          prompt:prompt || `Question ${result.length+1}`,
          userAnswer:answer
        });
      }
    }

    for(const [key,child] of Object.entries(value)) {
      if([
        "analysis",
        "correction",
        "naturalVersion",
        "explanation"
      ].includes(key)) {
        continue;
      }

      if(child && typeof child==="object") {
        extractAnswerPairs(child,result,depth+1);
        if(result.length>=10) break;
      }
    }

    return result;
  }

  async function conversationFromSavedConfig() {
    try {
      const {data,error}=await ctx.db
        .from("configuracoes_usuario")
        .select("chave,valor")
        .eq("user_id",ctx.usuario.id);

      if(error) throw error;

      const rows=Array.isArray(data) ? data : [];

      const candidates=rows
        .filter(row=>keyLooksLikeConversation(row?.chave));

      for(const row of candidates) {
        const answers=extractAnswerPairs(row?.valor,[]);

        if(answers.length) {
          return answers;
        }
      }
    } catch(error) {
      console.warn(
        "Inglês: não foi possível recuperar a Conversa salva.",
        error
      );
    }

    return [];
  }

  async function collectConversation() {
    const fromDom=conversationFromDom();

    if(fromDom.length) {
      return fromDom;
    }

    return conversationFromSavedConfig();
  }

  async function readingContext() {
    const oral=window.MMCDEnglishReadingRecorderV81171?.status?.() || null;

    try {
      const result=await window.MMCDEnglishDailyV8113?.taskForDate?.(ctx.data);
      const task=result?.task || {};

      return {
        completed:Boolean(
          document.querySelector("[data-english-reading-clean]")
          || document.querySelector('[data-lesson-kind="reading"]')
        ),
        title:task.title || "",
        theme:task.theme || "",
        readingText:task.readingText || "",
        vocabulary:Array.isArray(task.vocabulary)
          ? task.vocabulary
          : [],
        structureFocus:Array.isArray(task.structureFocus)
          ? task.structureFocus
          : [],
        oralReading:oral?.recorded
          ? {
              key:oral.key || "",
              mimeType:oral.mimeType || "",
              durationSeconds:Number(oral.durationSeconds || 0),
              savedAt:oral.savedAt || ""
            }
          : null
      };
    } catch {
      return {
        completed:Boolean(
          document.querySelector("[data-english-reading-clean]")
          || document.querySelector('[data-lesson-kind="reading"]')
        ),
        title:"",
        theme:"",
        readingText:"",
        vocabulary:[],
        structureFocus:[],
        oralReading:oral?.recorded
          ? {
              key:oral.key || "",
              mimeType:oral.mimeType || "",
              durationSeconds:Number(oral.durationSeconds || 0),
              savedAt:oral.savedAt || ""
            }
          : null
      };
    }
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
          <p>${esc(
            item?.userAnswer
            || item?.answer
            || "Resposta original não recuperada."
          )}</p>
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

  function readingAnalysisHtml(reading={}) {
    if(!reading || typeof reading!=="object") return "";

    const issues=Array.isArray(reading.sourceIssues)
      ? reading.sourceIssues
      : [];

    const structures=Array.isArray(reading.structures)
      ? reading.structures
      : [];

    return `
      <section class="english-final-clean__section english-final-reading-analysis">
        <h4>Leitura do texto</h4>

        <div class="english-final-reading-analysis__summary">
          <span>A IA LEU O TEXTO COMPLETO</span>
          <p>${esc(reading.summaryPt || "Texto analisado como contexto da atividade.")}</p>
        </div>

        ${reading.mainIdeaEn ? `
          <div class="english-final-reading-analysis__summary">
            <span>IDEIA CENTRAL EM INGLÊS</span>
            <p>${esc(reading.mainIdeaEn)}</p>
          </div>
        ` : ""}

        <div class="english-final-reading-analysis__status ${issues.length ? "has-issues" : "is-ok"}">
          <strong>${issues.length
            ? `${issues.length} ajuste(s) encontrado(s) no texto`
            : "Nenhum erro relevante encontrado no texto"
          }</strong>
          <small>A qualidade do texto não altera sua nota de inglês.</small>
        </div>

        ${issues.length ? `
          <div class="english-final-reading-analysis__issues">
            ${issues.map(issue=>`
              <article>
                <b>Trecho original</b>
                <p>${esc(issue.original || "")}</p>
                <b>Correção</b>
                <p>${esc(issue.correction || "")}</p>
                ${issue.explanation ? `<small>${esc(issue.explanation)}</small>` : ""}
              </article>
            `).join("")}
          </div>
        ` : ""}

        ${structures.length ? `
          <div class="english-final-reading-analysis__structures">
            <span>ESTRUTURAS IMPORTANTES DO TEXTO</span>
            ${structures.map(item=>`
              <article>
                <strong>${esc(item.excerpt || item.structure || "")}</strong>
                <p>${esc(item.explanationPt || "")}</p>
              </article>
            `).join("")}
          </div>
        ` : ""}
      </section>
    `;
  }

  function readingOralHtml(oral={}) {
    if(!oral || typeof oral!=="object" || !oral.transcript) return "";

    const points=Array.isArray(oral.pointsToRepeat)
      ? oral.pointsToRepeat
      : [];

    const strengths=Array.isArray(oral.strengths)
      ? oral.strengths
      : [];

    return `
      <section class="english-final-clean__section english-final-reading-oral">
        <h4>Leitura em voz alta</h4>

        <div class="english-final-reading-oral__score">
          <div>
            <span>FIDELIDADE RECONHECIDA</span>
            <strong>${Number(oral.matchPercent || 0)}%</strong>
          </div>
          <p>${esc(oral.summaryPt || "A gravação foi comparada com o texto original.")}</p>
        </div>

        <div class="english-final-reading-oral__transcript">
          <b>O que a transcrição reconheceu</b>
          <p>${esc(oral.transcript || "")}</p>
        </div>

        ${oral.paceNote ? `
          <div class="english-final-reading-oral__pace">
            <b>Ritmo da leitura</b>
            <p>${esc(oral.paceNote)}</p>
          </div>
        ` : ""}

        ${strengths.length ? `
          <div class="english-final-reading-oral__strengths">
            <b>O que foi bem</b>
            <ul>${strengths.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>
          </div>
        ` : ""}

        ${points.length ? `
          <div class="english-final-reading-oral__points">
            <b>Trechos para repetir</b>
            ${points.map(item=>`
              <article>
                <strong>${esc(item.sourceExcerpt || "")}</strong>
                ${item.recognizedAs ? `<p><span>A IA reconheceu:</span> ${esc(item.recognizedAs)}</p>` : ""}
                ${item.tipPt ? `<small>${esc(item.tipPt)}</small>` : ""}
              </article>
            `).join("")}
          </div>
        ` : ""}

        <p class="english-final-reading-oral__note">
          Esta avaliação usa a transcrição automática como evidência de fidelidade. Não é uma medição fonética clínica de sotaque ou fonemas.
        </p>
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

        ${readingAnalysisHtml(analysis.reading)}
        ${readingOralHtml(analysis.readingOral)}
        ${section("Conversa do dia",analysis.conversation)}

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
          A leitura do texto entra como contexto. A gravação da leitura é avaliada separadamente e não altera sua nota geral.
        </p>
      </section>
    `;
  }

  async function currentMaterial() {
    const [reading,remote,conversation]=await Promise.all([
      readingContext(),
      readConfig(FINAL_KEY),
      collectConversation()
    ]);

    return {
      conversation,
      reading,
      remote
    };
  }

  function renderStatus(material) {
    const conversationCount=material.conversation.length;

    const conversationStep=document.querySelector(
      '[data-english-step="conversation"]'
    );

    const conversationStepText=norm(
      conversationStep?.textContent || ""
    );

    const conversationMarkedComplete=
      conversationCount>0
      || conversationStepText.includes("✓")
      || conversationStep?.classList?.contains("is-complete")
      || false;

    const readingOk=Boolean(material.reading?.completed);

    const waiting=material.remote
      && ["pendente","processando"].includes(material.remote.status);

    if(material.remote?.status==="corrigida" && material.remote.analysis) {
      renderResult(material.remote);
      return;
    }

    const canFinish=
      conversationCount>0
      && readingOk
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
          <div class="${conversationMarkedComplete ? "ok" : ""}">
            <span>1 · Conversa</span>
            <strong>${conversationCount
              ? `${conversationCount} respostas prontas`
              : conversationMarkedComplete
                ? "concluída · recuperando respostas"
                : "faltam suas respostas"
            }</strong>
          </div>

          <div class="${readingOk ? "ok" : ""}">
            <span>2 · Leitura</span>
            <strong>${readingOk
              ? material.reading?.oralReading?.key
                ? "concluída · gravação pronta para IA"
                : "concluída · gravação opcional"
              : "abra e leia o texto"
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
          A IA lê o texto completo e, quando houver gravação, também avalia sua leitura em voz alta. Depois corrige suas respostas da Conversa.
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

      if(!material.conversation.length) {
        const stepText=norm(
          document.querySelector(
            '[data-english-step="conversation"]'
          )?.textContent || ""
        );

        if(stepText.includes("✓")) {
          missing.push("sincronização das respostas da Conversa");
        } else {
          missing.push("Conversa");
        }
      }

      if(!material.reading?.completed) missing.push("Leitura");

      window.MMCDUI?.toast?.(
        `Ainda falta concluir: ${missing.join(", ")}.`
      );

      const target=!material.conversation.length
        ? document.querySelector("#english-conversation-host")
        : (
            document.querySelector('[data-lesson-kind="reading"]')
            || document.querySelector("[data-english-reading-clean]")
            || document.querySelector("#ingles-conteudo")
          );

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

    host=document.querySelector("#english-final-correction-host");

    if(!host) {
      const readingContainer=
        document.querySelector("#ingles-conteudo")?.closest("article")
        || document.querySelector("[data-english-reading-clean]")?.closest("article")
        || document.querySelector("#ingles-conteudo");

      if(!readingContainer) return;

      host=document.createElement("div");
      host.id="english-final-correction-host";
      readingContainer.insertAdjacentElement("afterend",host);
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
      "memory:english-reading-audio-saved",
      refresh
    );

    const conversationHost=document.querySelector(
      "#english-conversation-host"
    );

    if(conversationHost) {
      const observer=new MutationObserver(()=>{
        clearTimeout(
          window.__memoryEnglishConversationRefresh
        );

        window.__memoryEnglishConversationRefresh=
          setTimeout(refresh,180);
      });

      observer.observe(conversationHost,{
        childList:true,
        subtree:true,
        characterData:true,
        attributes:true
      });

      setTimeout(refresh,350);
      setTimeout(refresh,1200);
      setTimeout(refresh,2500);
    }

    document.addEventListener(
      "input",
      event=>{
        if(
          event.target.closest?.("#english-conversation-host")
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
    version:"v81.17.3"
  };
})();
