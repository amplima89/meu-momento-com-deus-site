"use strict";

(() => {
  const READING_KEY="ingles_etapas_v1";
  const CONVERSATION_KEY="ingles_conversas_v1";
  const PRACTICE_KEY="ingles_pratica_v2";
  const BACKFILL_MARKER="memory:english:activity-backfill-v81-4-5";

  let db=null;
  let user=null;
  let running=false;
  let observer=null;
  let mountQueued=false;
  let lastStates=null;

  function today() {
    return window.MemoryActivitySync?.localIso?.(new Date()) ||
      new Date().toISOString().slice(0,10);
  }

  function selectedDate() {
    const select=document.querySelector("#ingles-data");
    const option=select?.selectedOptions?.[0];
    const label=String(option?.textContent||"").trim();

    const br=label.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if(br) return `${br[3]}-${br[2]}-${br[1]}`;

    const dataAttr=option?.dataset?.date || option?.dataset?.data;
    if(/^\d{4}-\d{2}-\d{2}$/.test(dataAttr||"")) return dataAttr;

    return today();
  }

  async function readConfig(key) {
    const {data,error}=await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",user.id)
      .eq("chave",key)
      .maybeSingle();

    if(error) throw error;

    return data?.valor && typeof data.valor==="object"
      ? structuredClone(data.valor)
      : null;
  }

  function readingStore(raw) {
    const store=raw && typeof raw==="object" ? structuredClone(raw) : {};
    store.schemaVersion=1;
    store.days=store.days && typeof store.days==="object" ? store.days : {};
    return store;
  }

  async function saveReading(store) {
    const {error}=await db.from("configuracoes_usuario").upsert({
      user_id:user.id,
      chave:READING_KEY,
      valor:{
        schemaVersion:1,
        days:store.days,
        updatedAt:new Date().toISOString()
      }
    },{onConflict:"user_id,chave"});

    if(error) throw error;
  }

  function completedSession(store,date) {
    return Boolean(
      (store?.sessions||[]).find(item=>item?.date===date)?.completed
    );
  }

  function completedReading(store,date) {
    return Boolean(store?.days?.[date]?.completed);
  }

  async function getStates(date) {
    const [conversation,practice,rawReading]=await Promise.all([
      readConfig(CONVERSATION_KEY),
      readConfig(PRACTICE_KEY),
      readConfig(READING_KEY)
    ]);

    const reading=readingStore(rawReading);

    return {
      date,
      conversation:completedSession(conversation,date),
      reading:completedReading(reading,date),
      practice:completedSession(practice,date),
      readingStore:reading
    };
  }

  function stepButton(step) {
    return document.querySelector(`[data-english-step="${step}"]`);
  }

  function setStepState(step,done) {
    const button=stepButton(step);
    if(!button) return;

    const shouldComplete=Boolean(done);

    if(button.classList.contains("is-complete")!==shouldComplete) {
      button.classList.toggle("is-complete",shouldComplete);
    }

    let check=button.querySelector(".english-step-check");

    if(!check) {
      check=document.createElement("span");
      check.className="english-step-check";
      button.append(check);
    }

    if(check.hidden===shouldComplete) {
      check.hidden=!shouldComplete;
    }

    const nextText=shouldComplete?"✓":"";
    if(check.textContent!==nextText) {
      check.textContent=nextText;
    }
  }

  function updateSteps(states) {
    setStepState("conversation",states.conversation);
    setStepState("read",states.reading);
    setStepState("practice",states.practice);
  }

  function ensureReadingButton(states=null) {
    const block=document.querySelector(
      '#ingles-conteudo [data-lesson-kind="reading"]'
    );

    if(!block) return false;

    let footer=block.querySelector("[data-english-reading-footer]");

    if(!footer) {
      footer=document.createElement("div");
      footer.className="english-reading-complete";
      footer.dataset.englishReadingFooter="true";
      footer.innerHTML=`
        <div>
          <strong>Leitura do dia</strong>
          <span>Marque depois de realmente ler o texto.</span>
        </div>
        <button type="button" class="btn" data-complete-english-reading>
          Marcar leitura concluída
        </button>`;
      block.append(footer);
    }

    // CRÍTICO V81.4.5:
    // o MutationObserver pode chamar esta função sem estados.
    // Nesse caso NÃO fazemos nenhuma escrita no DOM depois que o botão já existe.
    // Isso impede o loop infinito que travava a página.
    if(!states) return true;

    const done=Boolean(states.reading);

    if(footer.classList.contains("is-complete")!==done) {
      footer.classList.toggle("is-complete",done);
    }

    const button=footer.querySelector("[data-complete-english-reading]");

    if(button) {
      if(button.disabled!==done) {
        button.disabled=done;
      }

      const nextText=done
        ? "✓ Leitura concluída"
        : "Marcar leitura concluída";

      if(button.textContent.trim()!==nextText) {
        button.textContent=nextText;
      }
    }

    return true;
  }

  function statesForCurrentDom() {
    if(!lastStates) return null;
    return lastStates.date===selectedDate() ? lastStates : null;
  }

  function scheduleReadingMount() {
    if(mountQueued) return;
    mountQueued=true;

    requestAnimationFrame(()=>{
      mountQueued=false;
      ensureReadingButton(statesForCurrentDom());
    });
  }

  async function markEnglish(date) {
    return window.MemoryActivitySync?.mark?.("english",{
      date,
      origin:"ingles_rotina",
      observation:
        "Inglês concluído automaticamente após Conversa + Leitura + Prática."
    });
  }

  async function refresh({legacy=true}={}) {
    if(running || !db || !user) return;

    running=true;

    try {
      const date=selectedDate();
      const states=await getStates(date);

      if(
        legacy &&
        date<today() &&
        states.conversation &&
        states.practice &&
        !states.reading
      ) {
        states.readingStore.days[date]={
          completed:true,
          legacyInferred:true,
          completedAt:new Date().toISOString()
        };

        await saveReading(states.readingStore);
        states.reading=true;
      }

      lastStates=states;

      updateSteps(states);
      ensureReadingButton(states);

      if(states.conversation && states.reading && states.practice) {
        const result=await markEnglish(date);

        if(result?.ok && !result.already) {
          window.MMCDUI?.toast?.(
            `${result.meta?.nome || "Inglês"} atualizado em Atividades.`
          );
        }
      }
    } catch(error) {
      console.warn(
        "Inglês: não foi possível sincronizar com Atividades.",
        error
      );
    } finally {
      running=false;
    }
  }

  async function backfillRecent() {
    const [conversation,practice,rawReading]=await Promise.all([
      readConfig(CONVERSATION_KEY),
      readConfig(PRACTICE_KEY),
      readConfig(READING_KEY)
    ]);

    const reading=readingStore(rawReading);

    const conversations=new Set(
      (conversation?.sessions||[])
        .filter(session=>session?.completed && session?.date)
        .map(session=>session.date)
    );

    const practices=new Set(
      (practice?.sessions||[])
        .filter(session=>session?.completed && session?.date)
        .map(session=>session.date)
    );

    const limit=new Date();
    limit.setDate(limit.getDate()-45);

    const limitIso=
      window.MemoryActivitySync?.localIso?.(limit) ||
      limit.toISOString().slice(0,10);

    let changed=false;
    const dates=[];

    for(const date of conversations) {
      if(!practices.has(date) || date>=today() || date<limitIso) continue;

      if(!completedReading(reading,date)) {
        reading.days[date]={
          completed:true,
          legacyInferred:true,
          completedAt:new Date().toISOString()
        };
        changed=true;
      }

      dates.push(date);
    }

    if(changed) {
      await saveReading(reading);
    }

    // Não dispara dezenas de gravações de uma vez.
    // Pequeno intervalo entre datas deixa o navegador livre para a interface.
    for(const date of [...new Set(dates)].sort()) {
      await markEnglish(date);
      await new Promise(resolve=>setTimeout(resolve,40));
    }
  }

  function scheduleBackfillOnce() {
    try {
      if(localStorage.getItem(BACKFILL_MARKER)==="done") return;
    } catch {}

    const run=async()=>{
      try {
        await backfillRecent();
        try {
          localStorage.setItem(BACKFILL_MARKER,"done");
        } catch {}
      } catch(error) {
        console.warn(
          "Inglês: reconciliação histórica ficou para a próxima abertura.",
          error
        );
      }
    };

    if("requestIdleCallback" in window) {
      window.requestIdleCallback(
        ()=>run(),
        {timeout:5000}
      );
    } else {
      setTimeout(run,2500);
    }
  }

  async function completeReading() {
    try {
      const date=selectedDate();
      const reading=readingStore(await readConfig(READING_KEY));

      reading.days[date]={
        completed:true,
        legacyInferred:false,
        completedAt:new Date().toISOString()
      };

      await saveReading(reading);
      await refresh({legacy:false});

      window.MMCDUI?.toast?.("Leitura concluída.");
    } catch(error) {
      console.error(error);
      window.MMCDUI?.toast?.(
        "Não foi possível salvar a leitura."
      );
    }
  }

  function delayedRefresh(ms=900) {
    setTimeout(
      ()=>refresh({legacy:true}),
      ms
    );
  }

  function wire() {
    document.addEventListener("click",event=>{
      if(event.target.closest("[data-complete-english-reading]")) {
        completeReading();
        return;
      }

      if(
        event.target.closest("[data-finish-conversation]") ||
        event.target.closest("[data-finish-practice]")
      ) {
        delayedRefresh(900);
      }
    },true);

    document
      .querySelector("#ingles-data")
      ?.addEventListener("change",()=>{
        lastStates=null;
        delayedRefresh(350);
      });

    const root=
      document.querySelector("#ingles-conteudo") ||
      document.body;

    // Observa apenas a chegada/recriação do bloco de leitura.
    // A callback agenda no máximo uma operação por frame.
    observer=new MutationObserver(()=>{
      scheduleReadingMount();
    });

    observer.observe(root,{
      subtree:true,
      childList:true
    });

    scheduleReadingMount();

    window.addEventListener("pagehide",()=>{
      observer?.disconnect();
      observer=null;
    },{once:true});
  }

  async function init() {
    try {
      db=window.MMCDSupabase;

      if(!db || !window.MMCDAuth) return;

      const session=await window.MMCDAuth.requireSession();
      user=session.user;

      wire();

      // Primeiro carrega o estado do dia. O histórico roda depois,
      // em tempo ocioso, para não segurar a abertura da página.
      await refresh({legacy:true});
      scheduleBackfillOnce();
    } catch(error) {
      console.warn(
        "Inglês: integração com Atividades não iniciou.",
        error
      );
    }
  }

  if(document.readyState==="loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {once:true}
    );
  } else {
    init();
  }
})();
