"use strict";

(() => {
  const READING_KEY="ingles_etapas_v1";
  const CONVERSATION_KEY="ingles_conversas_v1";
  const PRACTICE_KEY="ingles_pratica_v2";

  let db=null;
  let user=null;
  let running=false;

  function today() {
    return window.MemoryActivitySync?.localIso?.(new Date()) || new Date().toISOString().slice(0,10);
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
    const {data,error}=await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",user.id)
      .eq("chave",key)
      .maybeSingle();
    if(error) throw error;
    return data?.valor && typeof data.valor==="object" ? structuredClone(data.valor) : null;
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
      valor:{schemaVersion:1,days:store.days,updatedAt:new Date().toISOString()}
    },{onConflict:"user_id,chave"});
    if(error) throw error;
  }

  function completedSession(store,date) {
    return Boolean((store?.sessions||[]).find(item=>item?.date===date)?.completed);
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
    button.classList.toggle("is-complete",Boolean(done));
    let check=button.querySelector(".english-step-check");
    if(!check) {
      check=document.createElement("span");
      check.className="english-step-check";
      button.append(check);
    }
    check.hidden=!done;
    check.textContent=done?"✓":"";
  }

  function updateSteps(states) {
    setStepState("conversation",states.conversation);
    setStepState("read",states.reading);
    setStepState("practice",states.practice);
  }

  function ensureReadingButton(states) {
    const block=document.querySelector('#ingles-conteudo [data-lesson-kind="reading"]');
    if(!block) return;

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
        <button type="button" class="btn" data-complete-english-reading>Marcar leitura concluída</button>`;
      block.append(footer);
    }

    const done=Boolean(states?.reading);
    footer.classList.toggle("is-complete",done);
    const button=footer.querySelector("[data-complete-english-reading]");
    if(button) {
      button.disabled=done;
      button.textContent=done?"✓ Leitura concluída":"Marcar leitura concluída";
    }
  }

  async function markEnglish(date) {
    return window.MemoryActivitySync?.mark?.("english",{
      date,
      origin:"ingles_rotina",
      observation:"Inglês concluído automaticamente após Conversa + Leitura + Prática."
    });
  }

  async function refresh({legacy=true}={}) {
    if(running || !db || !user) return;
    running=true;
    try {
      const date=selectedDate();
      const states=await getStates(date);

      // Antes da V81.4 não existia check persistente para Leitura.
      // Para datas passadas, Conversa + Prática concluídas comprovam que a
      // rotina antiga chegou ao fim; por isso inferimos a Leitura uma única vez.
      if(legacy && date<today() && states.conversation && states.practice && !states.reading) {
        states.readingStore.days[date]={
          completed:true,
          legacyInferred:true,
          completedAt:new Date().toISOString()
        };
        await saveReading(states.readingStore);
        states.reading=true;
      }

      updateSteps(states);
      ensureReadingButton(states);

      if(states.conversation && states.reading && states.practice) {
        const result=await markEnglish(date);
        if(result?.ok && !result.already) {
          window.MMCDUI?.toast?.(`${result.meta?.nome || "Inglês"} atualizado em Atividades.`);
        }
      }
    } catch(error) {
      console.warn("Inglês: não foi possível sincronizar com Atividades.",error);
    } finally {
      running=false;
    }
  }

  async function backfillRecent() {
    try {
      const [conversation,practice,rawReading]=await Promise.all([
        readConfig(CONVERSATION_KEY),
        readConfig(PRACTICE_KEY),
        readConfig(READING_KEY)
      ]);
      const reading=readingStore(rawReading);
      const conversations=new Set((conversation?.sessions||[]).filter(s=>s?.completed&&s?.date).map(s=>s.date));
      const practices=new Set((practice?.sessions||[]).filter(s=>s?.completed&&s?.date).map(s=>s.date));

      const limit=new Date();
      limit.setDate(limit.getDate()-45);
      const limitIso=window.MemoryActivitySync?.localIso?.(limit) || limit.toISOString().slice(0,10);

      let changed=false;
      const dates=[];
      for(const date of conversations) {
        if(!practices.has(date) || date>=today() || date<limitIso) continue;
        if(!completedReading(reading,date)) {
          reading.days[date]={completed:true,legacyInferred:true,completedAt:new Date().toISOString()};
          changed=true;
        }
        dates.push(date);
      }
      if(changed) await saveReading(reading);
      for(const date of [...new Set(dates)].sort()) await markEnglish(date);
    } catch(error) {
      console.warn("Inglês: não foi possível reconciliar as datas anteriores.",error);
    }
  }

  async function completeReading() {
    try {
      const date=selectedDate();
      const reading=readingStore(await readConfig(READING_KEY));
      reading.days[date]={completed:true,legacyInferred:false,completedAt:new Date().toISOString()};
      await saveReading(reading);
      await refresh({legacy:false});
      window.MMCDUI?.toast?.("Leitura concluída.");
    } catch(error) {
      console.error(error);
      window.MMCDUI?.toast?.("Não foi possível salvar a leitura.");
    }
  }

  function delayedRefresh(ms=1000) {
    setTimeout(()=>refresh({legacy:true}),ms);
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
        delayedRefresh(1300);
      }
    },true);

    document.querySelector("#ingles-data")?.addEventListener("change",()=>delayedRefresh(700));

    const root=document.querySelector("#ingles-conteudo") || document.body;
    const observer=new MutationObserver(()=>ensureReadingButton());
    observer.observe(root,{subtree:true,childList:true});
  }

  async function init() {
    try {
      db=window.MMCDSupabase;
      if(!db || !window.MMCDAuth) return;
      const session=await window.MMCDAuth.requireSession();
      user=session.user;

      wire();
      await backfillRecent();
      await refresh({legacy:true});
    } catch(error) {
      console.warn("Inglês: integração com Atividades não iniciou.",error);
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
