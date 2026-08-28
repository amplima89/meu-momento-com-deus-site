"use strict";

(() => {
  const KEY = "ingles_conversas_v1";
  const VERSION = "v81.19";

  const SCENARIOS = [
    {id:"wife-morning",title:"Café da manhã em casa",icon:"☕",speaker:"Your wife",goal:"conversar de forma leve antes de começar o dia",variants:[
      ["Did you sleep well last night?","What do you have to do first this morning?","Are you going to have a busy day?","What time do you think you'll be home?"],
      ["You look a little tired. Did you sleep okay?","What's the main thing on your mind this morning?","Do you have many meetings today?","Is there anything you want us to do tonight?"]]},
    {id:"wife-evening",title:"Chegando em casa",icon:"🏠",speaker:"Your wife",goal:"contar como foi o dia sem transformar a conversa em entrevista",variants:[
      ["Hey, how was your day?","Really? What happened?","And how did you deal with that?","Do you want to relax or talk about it a little more?"],
      ["You finally made it home. Was work okay today?","What was the best part of your day?","Was there anything that annoyed you?","What would make tonight better for you?"]]},
    {id:"wife-plans",title:"Planos do casal",icon:"❤️",speaker:"Your wife",goal:"combinar planos e preferências do dia a dia",variants:[
      ["What do you feel like doing this weekend?","Would you rather go out or stay home?","Is there anywhere you want to eat?","Okay, so what should we decide first?"],
      ["Do we have any plans for Saturday?","What would be fun but not too tiring?","Should we invite anyone or keep it just us?","What time do you want to leave?"]]},
    {id:"child-morning",title:"Rotina com seu filho",icon:"👨‍👦",speaker:"Your child",goal:"usar inglês simples em uma conversa familiar",variants:[
      ["Dad, what are you doing?","Can I go with you?","Are you coming back soon?","What can we do together later?"],
      ["Dad, are you working today?","Why do you have to go now?","Will you be home for dinner?","Can we play something tonight?"]]},
    {id:"child-bedtime",title:"Antes de dormir",icon:"🌙",speaker:"Your child",goal:"responder perguntas simples com carinho e naturalidade",variants:[
      ["Dad, was your day good?","What did you do at work?","Were you tired today?","Can you tell me one good thing that happened?"],
      ["Dad, what was the funniest part of your day?","Did you talk to many people?","What are you doing tomorrow?","Can we do something together after that?"]]},
    {id:"coworker-coffee",title:"Café com um colega",icon:"☕",speaker:"Coworker",goal:"small talk realista no trabalho",variants:[
      ["Morning! How's your day going so far?","Are you working on anything difficult today?","Do you have time for lunch later?","By the way, how's everything outside work?"],
      ["Hey, you look busy. Everything okay?","What are you trying to finish today?","Do you think you'll get it done?","Are you doing anything after work?"]]},
    {id:"coworker-meeting",title:"Antes de uma reunião",icon:"💼",speaker:"Coworker",goal:"falar de trabalho em linguagem natural, sem formalidade excessiva",variants:[
      ["Are you ready for the meeting?","What do you think they're going to ask us?","Is there anything we still need to check?","Okay. What's the main point you want to make?"],
      ["Do you have everything for the meeting?","What part are you presenting?","Are you worried about any question?","How do you want to explain the problem?"]]},
    {id:"manager-checkin",title:"Check-in rápido no trabalho",icon:"📊",speaker:"Manager",goal:"responder de forma objetiva sobre andamento e prioridades",variants:[
      ["How are things going today?","What's your main priority right now?","Is anything blocking you?","What do you need from me?"],
      ["Quick check-in: where are we with that work?","What have you finished already?","What still needs attention?","When do you think it'll be ready?"]]},
    {id:"gym-smalltalk",title:"Conversa na academia",icon:"🏋️",speaker:"Someone at the gym",goal:"small talk informal durante o treino",variants:[
      ["Hey, are you using this machine?","What are you training today?","How many sets do you have left?","Do you usually train at this time?"],
      ["That set looked hard. What are you training today?","Do you prefer machines or free weights?","How often do you come here?","Are you training tomorrow too?"]]},
    {id:"gym-friend",title:"Depois do treino",icon:"💪",speaker:"Gym friend",goal:"falar de treino e rotina sem respostas decoradas",variants:[
      ["Good workout today?","What exercise felt the hardest?","Are you sore from your last session?","What are you going to eat now?"],
      ["You look exhausted. Was the workout that hard?","What went better than last time?","Do you need a rest day tomorrow?","Are you going straight home now?"]]},
    {id:"football",title:"Depois do futebol",icon:"⚽",speaker:"Teammate",goal:"conversar sobre jogo, desempenho e planos",variants:[
      ["That game was intense, wasn't it?","How did you feel out there today?","What do you think we did well?","Are you playing again next week?"],
      ["Man, I'm tired. How about you?","What was the hardest part of the game?","Did you think we were going to win?","What do we need to do better next time?"]]},
    {id:"friend-weekend",title:"Falando com um amigo",icon:"🤝",speaker:"Friend",goal:"manter uma conversa casual sobre a vida",variants:[
      ["Hey, long time no see. How have you been?","What have you been doing lately?","Are you free this weekend?","What do you feel like doing?"],
      ["What's up? How's life?","Is work keeping you busy?","Have you done anything fun lately?","We should do something soon. What do you think?"]]},
    {id:"restaurant",title:"No restaurante",icon:"🍽️",speaker:"Server",goal:"resolver uma situação comum em restaurante",variants:[
      ["Hi! Are you ready to order?","Would you like something to drink?","How would you like your meal?","Can I get you anything else?"],
      ["Good evening. Is this table okay for you?","Do you need a few more minutes with the menu?","Do you have any questions about the dishes?","Would you like dessert or coffee?"]]},
    {id:"coffee-shop",title:"Na cafeteria",icon:"🥤",speaker:"Barista",goal:"fazer um pedido e reagir a perguntas comuns",variants:[
      ["Hi! What can I get for you?","What size would you like?","Would you like anything to eat with that?","Is that for here or to go?"],
      ["Good morning! What are you having today?","Do you want it hot or iced?","Would you like regular milk?","Can I have your name for the order?"]]},
    {id:"store",title:"Em uma loja",icon:"🛍️",speaker:"Store clerk",goal:"pedir ajuda e tomar uma decisão de compra",variants:[
      ["Hi, can I help you find something?","What size are you looking for?","Would you like to try this one?","What do you think of the fit?"],
      ["Are you looking for anything specific today?","Do you prefer this color or something darker?","Would you like to see another option?","Are you taking it or do you want to think about it?"]]},
    {id:"uber",title:"No carro por aplicativo",icon:"🚗",speaker:"Driver",goal:"small talk com um desconhecido durante um trajeto",variants:[
      ["Hi, André? Where are you headed today?","Is this route okay for you?","Are you going to work or somewhere else?","Do you travel around the city a lot?"],
      ["Good evening. Was it a long day?","Do you live around here?","Is traffic usually this bad at this time?","Do you have any plans for the rest of the night?"]]},
    {id:"airport",title:"No aeroporto",icon:"✈️",speaker:"Passenger nearby",goal:"repetir o estilo de conversa informal usado no estudo do aeroporto",variants:[
      ["Is your flight delayed too?","Where are you flying to?","Are you traveling for work or for fun?","Do you travel often?"],
      ["Do you know if boarding has started?","Which gate are you going to?","Did you check a bag or just bring a backpack?","What are you going to do when you arrive?"]]},
    {id:"hotel",title:"No hotel",icon:"🏨",speaker:"Hotel receptionist",goal:"resolver situações simples durante uma viagem",variants:[
      ["Good evening. Are you checking in?","Could I see your ID, please?","How many nights are you staying?","Do you need any information about breakfast or Wi-Fi?"],
      ["Hi. How was your stay?","Did everything in the room work well?","Do you need us to store your bags?","Would you like a taxi to the airport?"]]},
    {id:"neighbor",title:"Encontrando um vizinho",icon:"🏘️",speaker:"Neighbor",goal:"treinar conversa curta e espontânea",variants:[
      ["Hey, how are you? Busy week?","Are you staying home this weekend?","Have you tried that new place nearby?","Alright, see you around. What are you up to now?"],
      ["Morning! You're up early today. Going somewhere?","Do you usually leave this early?","How's your family doing?","Any plans for tonight?"]]},
    {id:"lunch-work",title:"Almoço no trabalho",icon:"🥗",speaker:"Coworker",goal:"conversar sobre rotina, comida e trabalho de maneira leve",variants:[
      ["What are you having for lunch today?","Do you usually bring food from home?","How's your morning been?","What do you still have to do this afternoon?"],
      ["Are you going out for lunch?","Do you know a good place nearby?","Was your morning productive?","What time are you hoping to leave today?"]]},
    {id:"tech-help",title:"Pedindo ajuda com tecnologia",icon:"💻",speaker:"Coworker",goal:"explicar um problema simples e pedir ajuda",variants:[
      ["You said your computer is acting up. What's happening?","When did the problem start?","Have you tried restarting it?","Do you want me to take a look?"],
      ["Is that system still giving you trouble?","What happens when you click there?","Did it work yesterday?","What do you need it to do right now?"]]},
    {id:"family-visit",title:"Visita em família",icon:"👪",speaker:"Relative",goal:"responder perguntas familiares comuns",variants:[
      ["How have you been?","How's work going these days?","Are you still studying English?","What are you most excited about right now?"],
      ["It's good to see you. How's everything at home?","Have you been very busy lately?","Are you keeping up with your training?","What are your plans for the next few weeks?"]]},
    {id:"barber",title:"No barbeiro",icon:"✂️",speaker:"Barber",goal:"explicar preferências e manter small talk",variants:[
      ["How do you want your hair today?","Do you want the sides shorter?","Are you growing the top out?","So, how's your week been?"],
      ["Same haircut as last time?","How much do you want me to take off?","Do you want me to trim the beard too?","Anything interesting happening this weekend?"]]},
    {id:"weather-smalltalk",title:"Small talk do dia",icon:"🌤️",speaker:"Someone you know",goal:"começar e sustentar uma conversa sem tema preparado",variants:[
      ["Crazy weather today, right?","Did it change any of your plans?","How has your week been otherwise?","What are you doing later?"],
      ["It's been a long day, hasn't it?","What kept you busy today?","Was anything easier than you expected?","What are you looking forward to tonight?"]]},
  ];

  const LEGACY = {
    "after-work": ["How was your day at work today?","What did you do first today?","Was it a busy or calm day? Why?"],
    "gym-and-health": ["Did you train today?","What part of your body did you train?","How did you feel after the workout?"],
    "family-time": ["How was your time with your family today?","Did you have dinner at home?","What is one small thing you want to do better at home?"],
    "weekend-plans": ["What do you want to do this weekend?","Do you prefer staying home or going out?","What helps you relax?"]
  };

  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const toast=m=>window.MMCDUI?.toast?.(m);
  const parseDate=value=>new Date(`${String(value)}T12:00:00`);
  const isSunday=value=>parseDate(value).getDay()===0;
  const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const datePt=value=>{const [y,m,d]=String(value||"").split("-");return y&&m&&d?`${d}/${m}/${y}`:String(value||"");};

  function inferStage(levelText,sessions=[]){
    const text=String(levelText||"").toLowerCase();
    const completed=sessions.filter(item=>item?.completed).length;
    let stage=1;
    if(text.includes("dif")||text.includes("hard")) stage=3;
    else if(text.includes("méd")||text.includes("medio")||text.includes("intermedi")) stage=2;
    if(completed>=12) stage=Math.max(stage,3);
    if(completed>=24) stage=4;
    return Math.min(4,Math.max(1,stage));
  }

  async function loadStore(db,userId){
    const {data,error}=await db.from("configuracoes_usuario").select("valor").eq("user_id",userId).eq("chave",KEY).maybeSingle();
    if(error) throw error;
    return data?.valor&&typeof data.valor==="object"?structuredClone(data.valor):{schemaVersion:2,sessions:[]};
  }

  async function saveStore(db,userId,store){
    const {error}=await db.from("configuracoes_usuario").upsert({
      user_id:userId,chave:KEY,valor:{schemaVersion:2,sessions:store.sessions,updatedAt:new Date().toISOString()}
    },{onConflict:"user_id,chave"});
    if(error) throw error;
  }

  function dateSeed(date){
    return [...String(date)].reduce((acc,ch)=>acc+ch.charCodeAt(0),0)+parseDate(date).getTime()/86400000;
  }

  function chooseScenario(store,date){
    const recent=(store.sessions||[])
      .filter(s=>s?.date&&s.date<date&&s.scenarioId)
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)))
      .slice(0,14)
      .map(s=>s.scenarioId);
    let pool=SCENARIOS.filter(s=>!recent.includes(s.id));
    if(!pool.length) pool=SCENARIOS;
    const seed=Math.abs(Math.trunc(dateSeed(date)));
    const scenario=pool[seed%pool.length];
    const variantIndex=Math.abs(seed+scenario.id.length)%scenario.variants.length;
    return {...scenario,turns:scenario.variants[variantIndex],variantIndex};
  }

  function legacyScenario(session){
    const turns=LEGACY[session?.topicId];
    if(!turns) return null;
    return {id:session.topicId,title:"Conversa anterior",icon:"💬",speaker:"Conversation partner",goal:"preservar uma conversa iniciada antes da V81.19",turns,variantIndex:0,legacy:true};
  }

  function ensureSession(store,date,scenario,stage){
    let session=(store.sessions||[]).find(item=>item?.date===date);
    if(!session){
      session={id:crypto.randomUUID?crypto.randomUUID():`conv-${Date.now()}`,date,scenarioId:scenario.id,topicId:scenario.id,scenarioTitle:scenario.title,speaker:scenario.speaker,variantIndex:scenario.variantIndex,stage,answers:[],completed:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      store.sessions=Array.isArray(store.sessions)?store.sessions:[];
      store.sessions.push(session);
    }else{
      session.stage=Number(session.stage||stage);
      session.answers=Array.isArray(session.answers)?session.answers:[];
      if(!session.scenarioId&&!session.answers.length){
        session.scenarioId=scenario.id;session.topicId=scenario.id;session.scenarioTitle=scenario.title;session.speaker=scenario.speaker;session.variantIndex=scenario.variantIndex;
      }
    }
    return session;
  }

  function answerFor(session,index){return session.answers.find(item=>Number(item.index)===Number(index));}

  function hintFor(stage,turn){
    const anchor=String(turn||"").match(/\b(did|do|does|are|is|was|were|will|would|have|has|can|could|should)\b/i)?.[0]||"";
    if(stage<=1) return `Answer in 1–2 simple sentences.${anchor?` You can reuse “${anchor}”.`:""}`;
    if(stage===2) return "Answer naturally in 2–3 sentences and add one detail.";
    if(stage===3) return "Answer with a detail and a reason. Don't translate word by word.";
    return "Answer as you would in a real conversation. Add detail, reaction or a follow-up idea.";
  }

  function cardHtml(prompt,index,answer,enabled,speaker,stage){
    return `<article class="conversation-step conversation-dialogue ${answer?'is-done':''} ${enabled?'is-open':'is-locked'}" data-conversation-step="${index}">
      <div class="conversation-dialogue__line">
        <span>${esc(speaker)}</span><p>${esc(prompt)}</p>
      </div>
      <div class="conversation-step__hint">${esc(hintFor(stage,prompt))}</div>
      <label class="conversation-answer conversation-dialogue__answer"><span>You</span>
        <textarea data-conversation-answer="${index}" ${enabled?'':'disabled'} placeholder="Reply naturally in English...">${esc(answer?.text||'')}</textarea>
      </label>
      <div class="conversation-step__actions">
        <button type="button" class="btn primary" data-save-conversation="${index}" ${enabled?'':'disabled'}>${answer?'Atualizar resposta':'Responder'}</button>
        ${answer?'<span class="conversation-step__state">✓ resposta salva</span>':'<span class="conversation-step__state">Sua resposta libera a próxima fala</span>'}
      </div>
    </article>`;
  }

  function weekRange(sunday){
    const end=parseDate(sunday); const start=new Date(end); start.setDate(end.getDate()-6);
    const last=new Date(end); last.setDate(end.getDate()-1);
    return {start:iso(start),end:iso(last)};
  }

  function weeklyItems(store,sunday){
    const range=weekRange(sunday); const result=[]; const seen=new Set();
    (store.sessions||[]).filter(s=>s?.date>=range.start&&s?.date<=range.end).sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(session=>{
      (Array.isArray(session.reviewItems)?session.reviewItems:[]).forEach(item=>{
        if(!item||item.status==="correta") return;
        const key=String(item.correction||item.naturalVersion||item.userAnswer||"").trim().toLowerCase();
        if(!key||seen.has(key)) return; seen.add(key);
        result.push({...item,date:session.date,scenarioTitle:session.scenarioTitle||session.topicId||"Conversa"});
      });
    });
    return result.slice(0,16);
  }

  function weeklyReviewHtml(store,date){
    const items=weeklyItems(store,date); const range=weekRange(date);
    const cards=items.length?items.map((item,index)=>`<article class="english-week-review__item">
      <header><span>${index+1}</span><div><strong>${esc(item.pattern||"Estrutura para fixar")}</strong><small>${esc(datePt(item.date))} · ${esc(item.scenarioTitle||"Conversa")}</small></div></header>
      ${item.prompt?`<div><b>Contexto</b><p>${esc(item.prompt)}</p></div>`:""}
      <div class="original"><b>Você escreveu</b><p>${esc(item.userAnswer||"—")}</p></div>
      <div class="correct"><b>Forma correta</b><p>${esc(item.correction||item.naturalVersion||"—")}</p></div>
      ${item.naturalVersion&&item.naturalVersion!==item.correction?`<div class="natural"><b>Forma mais natural</b><p>${esc(item.naturalVersion)}</p></div>`:""}
      ${item.explanation?`<div class="why"><b>Por quê</b><p>${esc(item.explanation)}</p></div>`:""}
    </article>`).join(""):`<div class="english-week-review__empty"><strong>Nenhum erro salvo nesta semana.</strong><p>Se as respostas de segunda a sábado foram corrigidas pela IA e não houve ajuste necessário, não há nada para repetir. Correções de versões anteriores só aparecem quando ainda existirem no Supabase e puderem ser recuperadas.</p></div>`;
    return `<section class="english-week-review" data-english-weekly-review="true">
      <div class="english-week-review__head"><div><p class="eyebrow">Domingo · revisão da semana</p><h2>🔁 Leia os seus erros corrigidos</h2><p>De ${esc(datePt(range.start))} a ${esc(datePt(range.end))}. Aqui entram somente respostas que precisaram de ajuste.</p></div><strong>${items.length} item${items.length===1?'':'s'}</strong></div>
      <div class="english-week-review__list">${cards}</div>
      <p class="english-week-review__note">Objetivo de hoje: ler devagar, comparar sua construção com a correta e fixar o padrão. Não é uma nova prova.</p>
    </section>`;
  }

  async function render(params){
    const host=document.querySelector('#english-conversation-host'); if(!host) return;
    const {db,usuario,data,nivelTexto}=params||{};
    if(!db||!usuario){host.innerHTML='<div class="muted">Conversa do dia indisponível.</div>';return;}
    try{
      const store=await loadStore(db,usuario.id); const date=String(data||new Date().toISOString().slice(0,10));
      if(isSunday(date)){
        host.innerHTML=weeklyReviewHtml(store,date);
        host.dataset.englishWeeklyReview="true";
        const summary=document.querySelector('#english-summary-verbs'); if(summary) summary.textContent='Revisão + Leitura';
        const step=document.querySelector('[data-english-step="conversation"]'); if(step) step.innerHTML='<b>1</b>Revisão';
        document.dispatchEvent(new CustomEvent('memory:english-weekly-review-ready',{detail:{date}}));
        return;
      }
      delete host.dataset.englishWeeklyReview;
      const summary=document.querySelector('#english-summary-verbs'); if(summary) summary.textContent='Conversa + Leitura';
      const step=document.querySelector('[data-english-step="conversation"]'); if(step) step.innerHTML='<b>1</b>Conversa';
      const picked=chooseScenario(store,date); let session=(store.sessions||[]).find(s=>s?.date===date);
      let scenario=session&&!session.scenarioId&&session.answers?.length?legacyScenario(session):null;
      scenario=scenario||picked;
      const stage=inferStage(nivelTexto,store.sessions||[]); session=ensureSession(store,date,scenario,stage);
      if(session.scenarioId){
        const fixed=SCENARIOS.find(s=>s.id===session.scenarioId);
        if(fixed){const vi=Number(session.variantIndex||0)%fixed.variants.length; scenario={...fixed,turns:fixed.variants[vi],variantIndex:vi};}
      }
      const prompts=scenario.turns||[]; const firstPending=prompts.findIndex((_,i)=>!answerFor(session,i)?.text?.trim()); const unlocked=firstPending===-1?prompts.length-1:firstPending;
      host.innerHTML=`<div class="section-head conversation-head"><div><p class="eyebrow">Conversa do dia · diálogo real</p><h2>${scenario.icon} ${esc(scenario.title)}</h2><p class="muted">Hoje você conversa com <strong>${esc(scenario.speaker)}</strong>. As falas são encadeadas como numa situação do dia a dia.</p></div><span class="conversation-goal">Objetivo: ${esc(scenario.goal)}</span></div>
        <div class="conversation-stats"><div><span>Formato</span><strong>Diálogo</strong></div><div><span>Complexidade</span><strong>Nível ${session.stage}</strong></div><div><span>Status</span><strong>${session.completed?'Concluída':'Em andamento'}</strong></div></div>
        <div class="conversation-flow">${prompts.map((p,i)=>cardHtml(p,i,answerFor(session,i),i<=unlocked,scenario.speaker,session.stage)).join('')}</div>
        <div class="conversation-footer"><button type="button" class="btn" data-finish-conversation ${session.completed?'disabled':''}>${session.completed?'Conversa concluída':'Concluir conversa de hoje'}</button><p class="muted">Não tente falar “bonito”. Responda como você responderia de verdade; a IA corrige tudo no final.</p></div>`;
      if(!session.createdSaved){session.createdSaved=true; try{await saveStore(db,usuario.id,store);}catch(e){console.warn(e);}}
      host.querySelectorAll('[data-save-conversation]').forEach(button=>button.addEventListener('click',async()=>{
        const index=Number(button.dataset.saveConversation); const textarea=host.querySelector(`[data-conversation-answer="${index}"]`); const value=String(textarea?.value||'').trim();
        if(!value){toast('Escreva sua resposta em inglês antes de salvar.');textarea?.focus();return;}
        session.answers=session.answers.filter(item=>Number(item.index)!==index); session.answers.push({index,text:value,prompt:prompts[index],speaker:scenario.speaker,savedAt:new Date().toISOString()});
        if(session.completed) session.completed=false; delete session.evaluation; delete session.reviewItems; session.updatedAt=new Date().toISOString();
        try{await saveStore(db,usuario.id,store);toast('Resposta salva.');await render({db,usuario,data:date,nivelTexto});}catch(error){console.error(error);toast(error.message||'Não foi possível salvar a resposta.');}
      }));
      host.querySelector('[data-finish-conversation]')?.addEventListener('click',async()=>{
        const answered=prompts.filter((_,i)=>answerFor(session,i)?.text?.trim()).length; if(answered<prompts.length){toast('Responda todas as falas antes de concluir.');return;}
        session.completed=true; delete session.evaluation; session.updatedAt=new Date().toISOString();
        try{await saveStore(db,usuario.id,store);toast('Conversa concluída. A IA corrige tudo quando você finalizar o inglês do dia.');await render({db,usuario,data:date,nivelTexto});}catch(error){console.error(error);toast(error.message||'Não foi possível concluir a conversa.');}
      });
    }catch(error){console.error(error);host.innerHTML=`<div class="measure-empty">${esc(error.message||'Não foi possível carregar o inglês do dia.')}</div>`;}
  }

  window.MMCDEnglishConversation={render,version:VERSION};
})();
