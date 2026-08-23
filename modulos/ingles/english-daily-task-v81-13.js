"use strict";

window.MMCDEnglishDailyV8113 = (() => {
  const STATE_KEY = "ingles_atividade_diaria_v1";
  const AUDIO_PREFIX = "ingles_atividade_audio_v1";
  const LOCAL_PREFIX = "memory:english:daily:v81-13:";
  const TASK_FIELD = "__memoryDailyTaskV81_13";
  const POLL_MS = 10000;
  const STOPWORDS = new Set([
    "a","an","the","to","of","in","on","at","for","and","or","but","is","are",
    "was","were","be","been","being","do","does","did","have","has","had","will",
    "would","should","can","could","may","might","with","without","from","your",
    "you","i","we","they","he","she","it","this","that","these","those","what",
    "why","how","when","where","which","one","using","write","sentence","explain"
  ]);

  let current = null;
  let recorder = null;
  let stream = null;
  let timer = null;
  let chunks = [];
  let audioBlob = null;
  let audioDuration = 0;
  let pollTimer = null;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  const toast = message => window.MMCDUI?.toast?.(message);

  function normalize(value="") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLocaleLowerCase("en-US")
      .replace(/[^a-z0-9'\s]/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function tokens(value="") {
    return new Set(
      normalize(value)
        .split(" ")
        .filter(word => word.length >= 3 && !STOPWORDS.has(word))
    );
  }

  function jaccard(a,b) {
    const A=tokens(a), B=tokens(b);
    if(!A.size || !B.size) return 0;
    let common=0;
    A.forEach(item=>{ if(B.has(item)) common+=1; });
    return common / (A.size + B.size - common);
  }

  function semanticallyDuplicate(a,b) {
    const pa=normalize(a?.prompt || a || "");
    const pb=normalize(b?.prompt || b || "");
    if(!pa || !pb) return false;
    if(pa===pb) return true;
    if(jaccard(pa,pb)>=0.68) return true;

    const aa=normalize(a?.answerGuide || "");
    const ab=normalize(b?.answerGuide || "");
    return Boolean(aa && ab && (aa===ab || jaccard(aa,ab)>=0.76));
  }

  function dedupe(items=[],limit=99) {
    const result=[];
    for(const item of items) {
      if(!item?.prompt) continue;
      if(result.some(saved=>semanticallyDuplicate(saved,item))) continue;
      result.push(item);
      if(result.length>=limit) break;
    }
    return result;
  }

  function markerJson(markdown="") {
    const match=String(markdown).match(
      /MMCD_ENGLISH_GLOSSARY_START\s*([\s\S]*?)\s*MMCD_ENGLISH_GLOSSARY_END/i
    );
    if(!match) return null;

    let raw=match[1]
      .replace(/^\s*```(?:json)?\s*/i,"")
      .replace(/\s*```\s*$/,"")
      .replace(/-->\s*$/,"")
      .trim();

    try {
      const obj=JSON.parse(raw);
      const task=obj?.[TASK_FIELD];
      return task && typeof task==="object" ? task : null;
    } catch(error) {
      console.warn("Inglês diário: JSON estruturado inválido.",error);
      return null;
    }
  }

  async function allMeditations() {
    try {
      const list=await window.MMCD?.listarMeditacoes?.();
      return Array.isArray(list) ? list : [];
    } catch(error) {
      console.warn("Inglês diário: não foi possível carregar histórico.",error);
      return [];
    }
  }

  function minusDays(dateIso,days) {
    const [y,m,d]=String(dateIso).split("-").map(Number);
    const date=new Date(y,m-1,d,12,0,0);
    date.setDate(date.getDate()-days);
    return [
      date.getFullYear(),
      String(date.getMonth()+1).padStart(2,"0"),
      String(date.getDate()).padStart(2,"0")
    ].join("-");
  }

  async function reviewsFromHistory(date,list,currentTask) {
    const candidates=[];
    const specs=[
      {days:7,key:"d7",priority:3},
      {days:3,key:"d3",priority:2},
      {days:1,key:"d1",priority:1}
    ];

    for(const spec of specs) {
      const target=minusDays(date,spec.days);
      const meditation=list.find(item=>item?.data===target);
      if(!meditation) continue;

      const past=markerJson(meditation.markdown || "");
      const seeds=Array.isArray(past?.reviewSeeds) ? past.reviewSeeds : [];

      for(const seed of seeds) {
        const prompt=String(seed?.[spec.key] || "").trim();
        if(!prompt) continue;

        candidates.push({
          id:`review:${target}:${seed.id || candidates.length}`,
          label:`Revisão · ${spec.days} dia${spec.days===1?"":"s"}`,
          prompt,
          answerGuide:String(seed.answerGuide || ""),
          sourceDate:target,
          intervalDays:spec.days,
          priority:spec.priority
        });
      }
    }

    candidates.sort((a,b)=>b.priority-a.priority);

    let reviews=dedupe(candidates,2);

    if(!reviews.length && Array.isArray(currentTask?.legacyReviews)) {
      reviews=dedupe(currentTask.legacyReviews,2);
    }

    return reviews.slice(0,2);
  }

  function dailyFallback(date) {
    const FALLBACK = {"schemaVersion": 1, "date": "2026-08-22", "theme": "cotidiano", "title": "A Better Decision at the End of the Day", "readingText": "After a demanding week, André arrived home on Saturday evening with several things on his mind. He had work ideas to organize, messages to answer and personal tasks that he had postponed during the week. At first, he felt that the best decision would be to keep working until everything was finished.\n\nHowever, he noticed that his energy was already low. He had spent many hours making decisions, solving problems and moving between different responsibilities. If he continued at the same pace, he might finish one more task, but he would probably start the next day more tired.\n\nInstead of opening his laptop immediately, he made a different decision. He took a shower, drank some water and sat quietly for a few minutes. Then he wrote down the three things that really needed his attention. Two of them could wait until the next day. Only one needed a short action that evening.\n\nAfter completing that small task, he decided to study English for a limited amount of time. He did not want the study session to become another obligation. His goal was to read carefully, understand the main ideas and practice expressing his own opinion.\n\nWhile reading, he found a few expressions that were new to him, but most of the text was understandable. Instead of stopping every time he saw an unfamiliar word, he tried to understand the meaning from the context. When that was not enough, he checked the vocabulary section.\n\nAt the end of the study session, André reflected on an important difference: discipline does not always mean doing more. Sometimes it means choosing what deserves attention and stopping at the right time.\n\nIf he had tried to complete every task that evening, he would have gone to bed later and probably slept worse. If he had ignored everything and spent the whole evening on social media, he might have felt that he had wasted his time.\n\nThe better option was somewhere in the middle. He completed what was truly necessary, studied for a reasonable amount of time and protected the rest of his evening. The day was not perfect, but it ended with a deliberate decision instead of an automatic reaction.", "structureFocus": ["instead of + -ing", "if + past perfect → would have", "might have", "while + past continuous"], "vocabulary": [{"term": "demanding", "meaningPt": "exigente / cansativo", "example": "It was a demanding week."}, {"term": "postponed", "meaningPt": "adiado", "example": "He postponed two tasks."}, {"term": "at the same pace", "meaningPt": "no mesmo ritmo", "example": "He could not continue at the same pace."}, {"term": "instead of", "meaningPt": "em vez de", "example": "Instead of working, he rested for a few minutes."}, {"term": "unfamiliar", "meaningPt": "desconhecido / pouco familiar", "example": "He found an unfamiliar expression."}, {"term": "from the context", "meaningPt": "pelo contexto", "example": "He understood the word from the context."}, {"term": "deserves attention", "meaningPt": "merece atenção", "example": "Choose what deserves attention."}, {"term": "deliberate decision", "meaningPt": "decisão consciente / deliberada", "example": "He made a deliberate decision."}], "comprehension": [{"id": "c1", "prompt": "Why did André decide not to continue working at the same pace?", "answerGuide": "His energy was low and continuing could make him start the next day more tired."}, {"id": "c2", "prompt": "What did André do before deciding which tasks to complete?", "answerGuide": "He took a shower, drank water, sat quietly and wrote down the three things that needed attention."}, {"id": "c3", "prompt": "How did André deal with unfamiliar English words?", "answerGuide": "He first tried to infer the meaning from context and used the vocabulary section when necessary."}, {"id": "c4", "prompt": "According to the text, what can discipline mean besides doing more?", "answerGuide": "Choosing what deserves attention and knowing when to stop."}, {"id": "c5", "prompt": "Why was the middle option better than the two extremes?", "answerGuide": "He completed what was necessary, studied for a reasonable time and still protected his evening."}], "structures": [{"id": "s1", "label": "Instead of", "prompt": "Write one new sentence about your routine using “instead of”.", "answerGuide": "A complete natural sentence using instead of + noun or -ing form."}, {"id": "s2", "label": "By the time", "prompt": "Write one sentence about work using “by the time”.", "answerGuide": "A coherent sentence showing that something happened or was true by a specific point in time."}, {"id": "s3", "label": "Third conditional", "prompt": "Complete with your own idea: If I had not ________, I would have ________.", "answerGuide": "If + past perfect, followed by would have + past participle."}, {"id": "s4", "label": "Might have", "prompt": "Write one sentence about a past possibility using “might have”.", "answerGuide": "A natural past possibility with might have + past participle."}], "writing": {"prompt": "Imagine you arrive home very tired after work. You can study English, watch something or go directly to sleep. Write 5 to 7 sentences explaining what you would choose and why.", "minSentences": 5, "maxSentences": 7, "suggestedStructures": ["instead of", "because", "if", "would", "might", "however"]}, "speaking": {"prompt": "How do you decide whether you should keep working or stop and rest when you are tired?", "minSeconds": 40, "maxSeconds": 60}, "legacyReviews": [{"id": "legacy-airport", "label": "Revisão · viagem", "prompt": "Yesterday your flight was delayed. Explain in one complete sentence what happened to the departure time.", "answerGuide": "The flight was delayed by twenty minutes / it was expected to depart twenty minutes late."}, {"id": "legacy-hr", "label": "Revisão · RH", "prompt": "Before recommending a salary increase to reduce turnover, name two pieces of information you would analyze.", "answerGuide": "Examples include turnover by position/location/tenure/manager, market compensation, exit interviews, employee feedback or financial impact."}], "reviewSeeds": [{"id": "discipline-choice", "answerGuide": "Discipline can mean choosing what deserves attention and stopping at the right time.", "d1": "Complete: Discipline does not always mean doing more. Sometimes it means ________.", "d3": "Explain in one sentence why André’s decision was disciplined even though he did less.", "d7": "Give a new real-life example in which doing less can be the more disciplined choice."}, {"id": "instead-of", "answerGuide": "Use instead of with a noun or -ing form to show an alternative.", "d1": "Complete with a natural form: Instead of ________, I decided to rest.", "d3": "Write a new sentence using “instead of” about work or study.", "d7": "Explain a decision you changed recently using “instead of” and give the reason."}, {"id": "third-conditional", "answerGuide": "If + past perfect, would have + past participle.", "d1": "Complete: If he had worked all night, he would have ________.", "d3": "Write a third-conditional sentence about a decision you made this week.", "d7": "Describe a past situation and explain how the result would have changed if you had acted differently."}]};
    return date===FALLBACK.date ? structuredClone(FALLBACK) : null;
  }

  async function taskForDate(date) {
    const list=await allMeditations();
    const meditation=list.find(item=>item?.data===date);
    const generated=markerJson(meditation?.markdown || "");
    const task=generated || dailyFallback(date);

    if(!task) return {task:null,reviews:[],list};

    task.comprehension=dedupe(task.comprehension || [],5);
    task.structures=dedupe(task.structures || [],4);

    const combined=[];
    task.comprehension.forEach(item=>combined.push({...item,_kind:"comprehension"}));
    task.structures.forEach(item=>combined.push({...item,_kind:"structures"}));

    const unique=[];
    for(const item of combined) {
      if(unique.some(saved=>semanticallyDuplicate(saved,item))) continue;
      unique.push(item);
    }

    task.comprehension=unique
      .filter(item=>item._kind==="comprehension")
      .slice(0,5)
      .map(({_kind,...rest})=>rest);

    task.structures=unique
      .filter(item=>item._kind==="structures")
      .slice(0,4)
      .map(({_kind,...rest})=>rest);

    const reviews=[];

    return {task,reviews,list};
  }

  function localKey(date) {
    return `${LOCAL_PREFIX}${date}`;
  }

  function loadLocal(date) {
    try {
      const raw=localStorage.getItem(localKey(date));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveLocal(date,value) {
    try {
      localStorage.setItem(localKey(date),JSON.stringify(value));
    } catch {}
  }

  async function readRemote(db,userId) {
    const {data,error}=await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",userId)
      .eq("chave",STATE_KEY)
      .maybeSingle();

    if(error) throw error;
    const value=data?.valor;
    return value && typeof value==="object"
      ? structuredClone(value)
      : {schemaVersion:1,days:{}};
  }

  async function writeRemote(db,userId,state) {
    const {error}=await db
      .from("configuracoes_usuario")
      .upsert({
        user_id:userId,
        chave:STATE_KEY,
        valor:{
          schemaVersion:1,
          days:state.days || {},
          updatedAt:new Date().toISOString()
        }
      },{onConflict:"user_id,chave"});

    if(error) throw error;
  }

  function fieldValue(root,kind,id) {
    return root.querySelector(
      `[data-daily-answer="${kind}:${CSS.escape(String(id))}"]`
    )?.value?.trim() || "";
  }

  function collectAnswers(root,task,reviews) {
    const comprehension={};
    const structures={};
    const reviewAnswers={};

    for(const item of task.comprehension || []) {
      comprehension[item.id]=fieldValue(root,"comprehension",item.id);
    }

    for(const item of task.structures || []) {
      structures[item.id]=fieldValue(root,"structures",item.id);
    }

    for(const item of reviews || []) {
      reviewAnswers[item.id]=fieldValue(root,"reviews",item.id);
    }

    return {
      comprehension,
      structures,
      writing:root.querySelector("[data-daily-writing]")?.value?.trim() || "",
      reviews:reviewAnswers
    };
  }

  function sentenceCount(text="") {
    const cleaned=String(text).trim();
    if(!cleaned) return 0;
    const byPunctuation=cleaned
      .split(/[.!?]+(?=\s|$)/)
      .map(item=>item.trim())
      .filter(Boolean);

    if(byPunctuation.length>1) return byPunctuation.length;

    return cleaned
      .split(/\n+/)
      .map(item=>item.trim())
      .filter(Boolean)
      .length;
  }

  function renderVocabulary(items=[]) {
    return `
      <section class="english-daily-section">
        <header class="english-daily-section__head">
          <span>2</span>
          <div>
            <strong>Vocabulário relevante</strong>
            <small>Aprenda pelo contexto e reutilize depois.</small>
          </div>
        </header>
        <div class="english-daily-vocab">
          ${items.map(item=>`
            <article>
              <div>
                <strong>${esc(item.term)}</strong>
                <span>${esc(item.meaningPt || "")}</span>
              </div>
              ${item.example?`<p>${esc(item.example)}</p>`:""}
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function questionBlock(kind,title,subtitle,items=[]) {
    if(!items.length) return "";

    return `
      <section class="english-daily-section">
        <header class="english-daily-section__head">
          <span>${kind==="comprehension"?"3":kind==="structures"?"4":"R"}</span>
          <div>
            <strong>${esc(title)}</strong>
            <small>${esc(subtitle)}</small>
          </div>
        </header>
        <div class="english-daily-questions">
          ${items.map((item,index)=>`
            <label class="english-daily-question">
              <span class="english-daily-question__number">${index+1}</span>
              <div>
                ${item.label?`<small class="english-daily-review-badge">${esc(item.label)}</small>`:""}
                <strong>${esc(item.prompt)}</strong>
                <textarea
                  rows="3"
                  data-daily-answer="${esc(kind)}:${esc(item.id)}"
                  placeholder="Responda em inglês. A correção fica escondida até você finalizar."
                ></textarea>
              </div>
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderTask(task,reviews,draft,remoteDay) {
    const structureText=(task.structureFocus || []).join(" · ");
    const speaking=task.speaking || {};
    const writing=task.writing || {};
    const corrected=remoteDay?.status==="corrigida";
    const pending=remoteDay?.status==="pendente" || remoteDay?.status==="processando";
    const error=remoteDay?.status==="erro";

    return `
      <div class="english-daily-v8113" data-english-daily-task>
        <section class="english-daily-hero" data-lesson-kind="reading">
          <div class="english-daily-hero__meta">
            <span>INGLÊS DO DIA</span>
            <b>${esc(task.theme || "situação real")}</b>
          </div>
          <h2>${esc(task.title || "English Today")}</h2>
          <p class="english-daily-level">Texto contextualizado · 85% familiar / 15% novidade</p>

          ${structureText?`
            <div class="english-daily-structure-focus">
              <span>Estruturas em contexto</span>
              <strong>${esc(structureText)}</strong>
            </div>
          `:""}

          <div class="english-daily-reading">
            ${String(task.readingText || "")
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map(p=>`<p>${esc(p.trim())}</p>`)
              .join("")}
          </div>
        </section>

        ${renderVocabulary(task.vocabulary || [])}

        ${questionBlock(
          "comprehension",
          "Compreensão do texto",
          "Entenda a ideia — não procure apenas palavras iguais.",
          task.comprehension || []
        )}

        ${questionBlock(
          "structures",
          "Use as estruturas em novas frases",
          "Você precisa transferir a estrutura para uma situação diferente.",
          task.structures || []
        )}

        <section class="english-daily-section">
          <header class="english-daily-section__head">
            <span>5</span>
            <div>
              <strong>Produção escrita</strong>
              <small>Escreva com suas próprias ideias.</small>
            </div>
          </header>

          <div class="english-daily-writing">
            <p>${esc(writing.prompt || "")}</p>
            ${Array.isArray(writing.suggestedStructures) && writing.suggestedStructures.length
              ? `<div class="english-daily-chips">${writing.suggestedStructures.map(item=>`<span>${esc(item)}</span>`).join("")}</div>`
              : ""}
            <textarea
              rows="8"
              data-daily-writing
              placeholder="Escreva sua resposta em inglês. A IA só corrige depois de você finalizar."
            >${esc(draft?.answers?.writing || "")}</textarea>
            <small data-writing-count></small>
          </div>
        </section>

        <section class="english-daily-section">
          <header class="english-daily-section__head">
            <span>6</span>
            <div>
              <strong>Speaking</strong>
              <small>Fale sem escrever a resposta completa antes.</small>
            </div>
          </header>

          <div class="english-daily-speaking">
            <p>${esc(speaking.prompt || "")}</p>
            <div class="english-daily-speaking__goal">
              Meta: ${Number(speaking.minSeconds || 40)}–${Number(speaking.maxSeconds || 60)} segundos
            </div>
            <div class="english-daily-recorder">
              <strong data-daily-recording-status>Pronto para gravar</strong>
              <span data-daily-recording-time>00:00</span>
              <div>
                <button type="button" class="btn" data-daily-record>Gravar resposta</button>
                <button type="button" class="btn" data-daily-stop disabled>Parar</button>
                <button type="button" class="btn" data-daily-delete-audio hidden>Excluir áudio</button>
              </div>
              <audio controls data-daily-audio hidden></audio>
            </div>
          </div>
        </section>


        <section class="english-daily-finish">
          <div>
            <span>CORREÇÃO PROTEGIDA</span>
            <strong>${corrected
              ? "Correção da IA disponível"
              : pending
                ? "Atividade enviada para correção"
                : error
                  ? "A correção encontrou um problema"
                  : "A correção só aparece depois de você finalizar"
            }</strong>
            <p>${corrected
              ? "Veja abaixo sua resposta, o ajuste necessário, uma versão natural e a explicação."
              : pending
                ? "Se o PC estiver ligado, a correção automática normalmente aparece em até alguns minutos."
                : error
                  ? esc(remoteDay?.error || "Você pode solicitar a correção novamente.")
                  : "Nada de gabarito antes da resposta. Primeiro você produz; depois a IA corrige."
            }</p>
          </div>

          <button
            type="button"
            class="btn primary"
            data-daily-finish
            ${pending ? "disabled" : ""}
          >
            ${corrected ? "Corrigir novamente com IA" : error ? "Tentar correção novamente" : "Finalizar atividade e corrigir com IA"}
          </button>
        </section>

        <div data-daily-analysis>
          ${corrected ? analysisHtml(remoteDay.analysis || {}) : ""}
        </div>
      </div>
    `;
  }

  function statusLabel(status) {
    if(status==="correta") return "✓ Correta";
    if(status==="parcial") return "◐ Parcialmente correta";
    return "↻ Revisar";
  }

  function correctionItem(item={}) {
    return `
      <article class="english-ai-item ${esc(item.status || "revisar")}">
        <header>
          <strong>${esc(item.prompt || item.label || "Resposta")}</strong>
          <span>${esc(statusLabel(item.status))}</span>
        </header>
        ${item.userAnswer?`<div><b>Sua resposta</b><p>${esc(item.userAnswer)}</p></div>`:""}
        ${item.correction?`<div><b>Correção necessária</b><p>${esc(item.correction)}</p></div>`:""}
        ${item.naturalVersion?`<div><b>Versão mais natural</b><p>${esc(item.naturalVersion)}</p></div>`:""}
        ${item.explanation?`<div><b>Explicação curta</b><p>${esc(item.explanation)}</p></div>`:""}
      </article>
    `;
  }

  function analysisHtml(analysis={}) {
    const comprehension=Array.isArray(analysis.comprehension) ? analysis.comprehension : [];
    const structures=Array.isArray(analysis.structures) ? analysis.structures : [];
    const reviews=Array.isArray(analysis.reviews) ? analysis.reviews : [];
    const writing=analysis.writing || null;
    const speaking=analysis.speaking || null;

    return `
      <section class="english-ai-result">
        <header class="english-ai-result__head">
          <div>
            <span>CORREÇÃO DA IA</span>
            <h3>${Number.isFinite(Number(analysis.score)) ? `${Number(analysis.score)}%` : "Feedback completo"}</h3>
          </div>
          ${analysis.summary?`<p>${esc(analysis.summary)}</p>`:""}
        </header>

        ${comprehension.length?`
          <div class="english-ai-group">
            <h4>Compreensão</h4>
            ${comprehension.map(correctionItem).join("")}
          </div>
        `:""}

        ${structures.length?`
          <div class="english-ai-group">
            <h4>Estruturas</h4>
            ${structures.map(correctionItem).join("")}
          </div>
        `:""}

        ${writing?`
          <div class="english-ai-group">
            <h4>Produção escrita</h4>
            ${correctionItem({
              prompt:"Writing",
              status:writing.status,
              userAnswer:writing.userAnswer,
              correction:writing.correction,
              naturalVersion:writing.naturalVersion,
              explanation:writing.explanation
            })}
          </div>
        `:""}

        ${speaking?`
          <div class="english-ai-group">
            <h4>Speaking</h4>
            ${speaking.transcript?`<div class="english-ai-transcript"><b>O que a IA reconheceu</b><p>${esc(speaking.transcript)}</p></div>`:""}
            ${correctionItem({
              prompt:"Speaking",
              status:speaking.status,
              userAnswer:speaking.transcript,
              correction:speaking.correction,
              naturalVersion:speaking.naturalVersion,
              explanation:speaking.explanation
            })}
            ${speaking.clarityNote?`<p class="english-ai-note">${esc(speaking.clarityNote)}</p>`:""}
          </div>
        `:""}

        ${reviews.length?`
          <div class="english-ai-group">
            <h4>Revisão</h4>
            ${reviews.map(correctionItem).join("")}
          </div>
        `:""}

        ${analysis.nextStep?`
          <div class="english-ai-next">
            <span>PRÓXIMO PASSO</span>
            <p>${esc(analysis.nextStep)}</p>
          </div>
        `:""}
      </section>
    `;
  }

  function restoreDraft(root,draft,task,reviews) {
    const answers=draft?.answers || {};

    for(const item of task.comprehension || []) {
      const el=root.querySelector(`[data-daily-answer="comprehension:${CSS.escape(String(item.id))}"]`);
      if(el) el.value=answers.comprehension?.[item.id] || "";
    }

    for(const item of task.structures || []) {
      const el=root.querySelector(`[data-daily-answer="structures:${CSS.escape(String(item.id))}"]`);
      if(el) el.value=answers.structures?.[item.id] || "";
    }

    for(const item of reviews || []) {
      const el=root.querySelector(`[data-daily-answer="reviews:${CSS.escape(String(item.id))}"]`);
      if(el) el.value=answers.reviews?.[item.id] || "";
    }
  }

  function saveDraftFromDom() {
    if(!current?.root) return;
    const answers=collectAnswers(current.root,current.task,current.reviews);

    saveLocal(current.date,{
      answers,
      hasAudio:Boolean(audioBlob),
      savedAt:new Date().toISOString()
    });

    updateWritingCount();
  }

  function updateWritingCount() {
    const root=current?.root;
    if(!root) return;

    const writing=root.querySelector("[data-daily-writing]")?.value || "";
    const count=sentenceCount(writing);
    const target=root.querySelector("[data-writing-count]");
    const min=Number(current.task?.writing?.minSentences || 5);
    const max=Number(current.task?.writing?.maxSentences || 7);

    if(target) {
      target.textContent=`${count} frase${count===1?"":"s"} · meta ${min}–${max}`;
    }
  }

  function mimeType() {
    const options=[
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/webm",
      "audio/ogg;codecs=opus"
    ];

    return options.find(type=>window.MediaRecorder?.isTypeSupported?.(type)) || "";
  }

  function secondsLabel(seconds) {
    const m=String(Math.floor(seconds/60)).padStart(2,"0");
    const s=String(seconds%60).padStart(2,"0");
    return `${m}:${s}`;
  }

  function stopTracks() {
    stream?.getTracks?.().forEach(track=>track.stop());
    stream=null;
    if(timer) clearInterval(timer);
    timer=null;
  }

  async function setupRecorder(root) {
    const record=root.querySelector("[data-daily-record]");
    const stop=root.querySelector("[data-daily-stop]");
    const del=root.querySelector("[data-daily-delete-audio]");
    const status=root.querySelector("[data-daily-recording-status]");
    const time=root.querySelector("[data-daily-recording-time]");
    const audio=root.querySelector("[data-daily-audio]");

    if(!record || !stop) return;

    const supported=Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

    if(!supported) {
      record.disabled=true;
      status.textContent="Gravação não suportada neste navegador.";
      return;
    }

    record.addEventListener("click",async()=>{
      if(recorder?.state==="recording") return;

      try {
        stream=await navigator.mediaDevices.getUserMedia({audio:true});
        chunks=[];
        audioDuration=0;

        const type=mimeType();
        recorder=new MediaRecorder(
          stream,
          type ? {mimeType:type,audioBitsPerSecond:32000} : {audioBitsPerSecond:32000}
        );

        const started=Date.now();

        recorder.addEventListener("dataavailable",event=>{
          if(event.data?.size) chunks.push(event.data);
        });

        recorder.addEventListener("stop",()=>{
          audioDuration=Math.max(1,Math.round((Date.now()-started)/1000));
          stopTracks();

          audioBlob=new Blob(
            chunks,
            {type:recorder.mimeType || "audio/webm"}
          );

          const url=URL.createObjectURL(audioBlob);
          audio.src=url;
          audio.hidden=false;
          del.hidden=false;
          record.disabled=false;
          stop.disabled=true;
          status.textContent=`Áudio pronto · ${audioDuration}s`;
          time.textContent=secondsLabel(audioDuration);
          saveDraftFromDom();
        });

        recorder.start();
        record.disabled=true;
        stop.disabled=false;
        status.textContent="Gravando...";
        time.textContent="00:00";

        timer=setInterval(()=>{
          const seconds=Math.floor((Date.now()-started)/1000);
          time.textContent=secondsLabel(seconds);

          const max=Number(current?.task?.speaking?.maxSeconds || 60);
          if(seconds>=max && recorder?.state==="recording") {
            recorder.stop();
            toast("A gravação chegou ao tempo máximo da atividade.");
          }
        },500);
      } catch(error) {
        console.error(error);
        stopTracks();
        record.disabled=false;
        stop.disabled=true;
        status.textContent="Não foi possível acessar o microfone.";
        toast("Autorize o microfone para fazer o speaking.");
      }
    });

    stop.addEventListener("click",()=>{
      if(recorder?.state==="recording") recorder.stop();
    });

    del.addEventListener("click",()=>{
      audioBlob=null;
      audioDuration=0;
      audio.removeAttribute("src");
      audio.hidden=true;
      del.hidden=true;
      status.textContent="Pronto para gravar";
      time.textContent="00:00";
      saveDraftFromDom();
    });
  }

  function blobBase64(blob) {
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error);
      reader.onload=()=>{
        const result=String(reader.result || "");
        resolve(result.includes(",") ? result.split(",",2)[1] : result);
      };
      reader.readAsDataURL(blob);
    });
  }

  async function saveAudioRemote(db,userId,date) {
    if(!audioBlob) return null;

    const key=`${AUDIO_PREFIX}:${date}`;
    const base64=await blobBase64(audioBlob);

    const {error}=await db
      .from("configuracoes_usuario")
      .upsert({
        user_id:userId,
        chave:key,
        valor:{
          arquivoBase64:base64,
          mimeType:audioBlob.type || "audio/webm",
          duracaoSegundos:audioDuration,
          atualizadoEm:new Date().toISOString()
        }
      },{onConflict:"user_id,chave"});

    if(error) throw error;

    return {
      key,
      mimeType:audioBlob.type || "audio/webm",
      durationSeconds:audioDuration
    };
  }

  function validate(root,task,reviews) {
    const answers=collectAnswers(root,task,reviews);
    const missing=[];

    for(const item of task.comprehension || []) {
      if(!answers.comprehension[item.id]) missing.push("compreensão");
    }

    for(const item of task.structures || []) {
      if(!answers.structures[item.id]) missing.push("estruturas");
    }

    for(const item of reviews || []) {
      if(!answers.reviews[item.id]) missing.push("revisão");
    }

    const count=sentenceCount(answers.writing);
    const min=Number(task.writing?.minSentences || 5);

    if(count<min) missing.push(`writing (${min} frases)`);

    if(!audioBlob && !current?.remoteDay?.speaking?.audioKey) {
      missing.push("speaking");
    }

    return {
      ok:missing.length===0,
      missing:[...new Set(missing)],
      answers
    };
  }

  async function submit() {
    if(!current) return;

    const {root,task,reviews,date,db,user}=current;
    const check=validate(root,task,reviews);

    if(!check.ok) {
      toast(`Falta concluir: ${check.missing.join(", ")}.`);
      return;
    }

    const button=root.querySelector("[data-daily-finish]");
    if(button) {
      button.disabled=true;
      button.textContent="Enviando para correção...";
    }

    try {
      let speaking=current.remoteDay?.speaking || null;

      if(audioBlob) {
        speaking=await saveAudioRemote(db,user.id,date);
      }

      const state=await readRemote(db,user.id);
      state.days ||= {};

      state.days[date]={
        status:"pendente",
        task,
        reviews,
        answers:check.answers,
        speaking,
        submittedAt:new Date().toISOString(),
        analysis:null,
        error:""
      };

      await writeRemote(db,user.id,state);

      current.remoteDay=state.days[date];
      saveDraftFromDom();

      const analysis=root.querySelector("[data-daily-analysis]");
      if(analysis) analysis.innerHTML=`
        <div class="english-ai-wait">
          <strong>Atividade enviada para a IA</strong>
          <p>A correção fica escondida até o processamento terminar. Se o PC estiver ligado, isso costuma acontecer em poucos minutos.</p>
        </div>
      `;

      if(button) {
        button.textContent="Aguardando correção da IA";
      }

      toast("Atividade finalizada. A correção foi solicitada.");
      startPolling();
    } catch(error) {
      console.error(error);

      if(button) {
        button.disabled=false;
        button.textContent="Finalizar atividade e corrigir com IA";
      }

      toast("Não foi possível enviar a atividade para correção.");
    }
  }

  async function refreshRemote() {
    if(!current) return;

    try {
      const state=await readRemote(current.db,current.user.id);
      const day=state.days?.[current.date] || null;

      if(!day) return;

      current.remoteDay=day;

      if(day.status==="corrigida") {
        clearInterval(pollTimer);
        pollTimer=null;

        const host=current.root.querySelector("[data-daily-analysis]");
        if(host) host.innerHTML=analysisHtml(day.analysis || {});

        const button=current.root.querySelector("[data-daily-finish]");
        if(button) {
          button.disabled=false;
          button.textContent="Corrigir novamente com IA";
        }

        toast("A correção do inglês ficou pronta.");
      } else if(day.status==="erro") {
        clearInterval(pollTimer);
        pollTimer=null;

        const host=current.root.querySelector("[data-daily-analysis]");
        if(host) host.innerHTML=`
          <div class="english-ai-wait is-error">
            <strong>A correção encontrou um problema</strong>
            <p>${esc(day.error || "Tente novamente.")}</p>
          </div>
        `;

        const button=current.root.querySelector("[data-daily-finish]");
        if(button) {
          button.disabled=false;
          button.textContent="Tentar correção novamente";
        }
      }
    } catch(error) {
      console.warn("Inglês diário: polling da correção falhou.",error);
    }
  }

  function startPolling() {
    if(pollTimer) clearInterval(pollTimer);
    refreshRemote();
    pollTimer=setInterval(refreshRemote,POLL_MS);
  }

  async function render({container,data,db,usuario}) {
    if(!container || !data || !db || !usuario) return false;

    const {task,reviews}=await taskForDate(data);

    if(!task) return false;

    const draft=loadLocal(data);
    const state=await readRemote(db,usuario.id).catch(()=>({schemaVersion:1,days:{}}));
    const remoteDay=state.days?.[data] || null;

    container.innerHTML=renderTask(task,reviews,draft,remoteDay);

    current={
      root:container,
      task,
      reviews,
      date:data,
      db,
      user:usuario,
      remoteDay
    };

    restoreDraft(container,draft,task,reviews);
    updateWritingCount();

    container.querySelectorAll("textarea").forEach(field=>{
      field.addEventListener("input",saveDraftFromDom);
    });

    container.querySelector("[data-daily-finish]")?.addEventListener("click",submit);

    await setupRecorder(container);

    if(remoteDay?.status==="pendente" || remoteDay?.status==="processando") {
      startPolling();
    }

    return true;
  }

  return {
    render,
    taskForDate,
    semanticallyDuplicate
  };
})();
