"use strict";
(()=>{
 const KEYS={
  prayers:"memory_oracoes_v1",
  circle:"memory_circulo_cuidado_v1",
  journal:"diario_rapido_v1",
  workouts:"treino_sessoes_v1",
  workoutPlan:"treino_plano_v1",
  birthdays:"memory_aniversarios_v1"
 };
 let userPromise=null;
 const cache=new Map();
 const dayMs=86400000;
 const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const norm=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const pad=n=>String(n).padStart(2,"0");
 const isoDate=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
 const todayISO=()=>isoDate(new Date());
 const parseDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||"")))return null;const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?null:d};
 const daysBetween=(a,b)=>{const da=typeof a==="string"?parseDate(a):a;const db=typeof b==="string"?parseDate(b):b;if(!da||!db)return null;return Math.round((db-da)/dayMs)};
 const uid=()=>globalThis.crypto?.randomUUID?.()||`m-${Date.now()}-${Math.random().toString(16).slice(2)}`;
 const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,v));

 async function user(){
  if(!userPromise)userPromise=window.MMCDAuth.requireSession().then(s=>s.user);
  return userPromise;
 }
 async function read(key,fallback=null,{fresh=false}={}){
  if(!fresh&&cache.has(key))return cache.get(key);
  const current=await user();
  const {data,error}=await window.MMCDSupabase.from("configuracoes_usuario").select("valor").eq("user_id",current.id).eq("chave",key).maybeSingle();
  if(error)throw new Error(`Não foi possível carregar ${key}: ${error.message}`);
  const value=data?.valor??fallback;cache.set(key,value);return value;
 }
 async function write(key,value){
  const current=await user();
  const {error}=await window.MMCDSupabase.from("configuracoes_usuario").upsert({user_id:current.id,chave:key,valor:value},{onConflict:"user_id,chave"});
  if(error)throw new Error(`Não foi possível salvar ${key}: ${error.message}`);
  cache.set(key,value);return value;
 }
 function normalizePrayers(value){return {versao:1,itens:Array.isArray(value?.itens)?value.itens:[],atualizadoEm:value?.atualizadoEm||""}}
 function normalizeCircle(value){return {versao:1,itens:Array.isArray(value?.itens)?value.itens:[],atualizadoEm:value?.atualizadoEm||""}}
 function normalizeJournal(value){return {versao:1,registros:Array.isArray(value?.registros)?value.registros:[]}}
 function normalizeBirthdays(value){return {versao:1,itens:Array.isArray(value?.itens)?value.itens:[]}}
 function normalizeWorkouts(value){return {versao:1,sessoes:Array.isArray(value?.sessoes)?value.sessoes:[]}}
 function normalizeWorkoutPlan(value){return value&&typeof value==="object"?value:{}}

 async function loadAll({fresh=false}={}){
  const [core,p,c,j,w,wp,b]=await Promise.all([
   window.MMCD.carregar(),
   read(KEYS.prayers,{versao:1,itens:[]},{fresh}),
   read(KEYS.circle,{versao:1,itens:[]},{fresh}),
   read(KEYS.journal,{versao:1,registros:[]},{fresh}),
   read(KEYS.workouts,{versao:1,sessoes:[]},{fresh}),
   read(KEYS.workoutPlan,{}, {fresh}),
   read(KEYS.birthdays,{versao:1,itens:[]},{fresh})
  ]);
  return {core,prayers:normalizePrayers(p),circle:normalizeCircle(c),journal:normalizeJournal(j),workouts:normalizeWorkouts(w),workoutPlan:normalizeWorkoutPlan(wp),birthdays:normalizeBirthdays(b)};
 }

 function branchForGoal(item){
  const text=norm(`${item?.categoria||item?.grupo||""} ${item?.nome||""} ${item?.descricao||""}`);
  if(/espiritual|medita|biblia|oracao|deus|\bfe\b/.test(text))return "espiritual";
  if(/saude|treino|muscul|cardio|futebol|jiu|agua|aliment|sono|peso|corrida|caminh|bike|bicic/.test(text))return "corpo";
  if(/desenvolv|ingles|matemat|estudo|curso|livro|leitura|aprend|carreira/.test(text))return "desenvolvimento";
  if(/cuidado|relacion|familia|esposa|marido|filh|amig|gato|cachorro|anivers/.test(text))return "relacionamentos";
  if(/mente|mental|terapia|ansiedad|estress|descanso|rede social|diario|humor|emoc/.test(text))return "mente";
  return null;
 }
 function goalRates(core){
  const result={espiritual:{done:0,planned:0},corpo:{done:0,planned:0},desenvolvimento:{done:0,planned:0},relacionamentos:{done:0,planned:0},mente:{done:0,planned:0}};
  const end=new Date();end.setHours(12,0,0,0);end.setDate(end.getDate()-1);
  for(let i=0;i<30;i++){
   const date=new Date(end);date.setDate(end.getDate()-i);const iso=isoDate(date);
   const goals=window.MMCD.metasNaData(core,iso)||[];
   for(const goal of goals){
    const branch=branchForGoal(goal);if(!branch)continue;
    const row=window.MMCD.registro(core,iso,goal.id);if(window.MMCD.estaAbonada?.(row))continue;
    result[branch].planned+=1;if(row?.concluida)result[branch].done+=1;
   }
  }
  return result;
 }
 function circleAdherence(circle){
  const active=(circle?.itens||[]).filter(x=>x?.ativo!==false&&String(x?.nome||"").trim());
  if(!active.length)return {score:null,details:"Nenhuma pessoa cadastrada",overdue:[]};
  const today=new Date();today.setHours(12,0,0,0);
  let total=0;const overdue=[];
  for(const person of active){
   const freq=Math.max(1,Number(person.frequenciaDias||14));
   const last=parseDate(person.ultimoCuidadoEm||"");
   if(!last){total+=25;overdue.push({...person,diasSemRegistro:null});continue;}
   const days=Math.max(0,daysBetween(last,today)||0);
   let score=100;if(days>freq)score=65;if(days>freq*1.5)score=35;if(days>freq*2)score=10;
   total+=score;if(days>=freq)overdue.push({...person,diasSemRegistro:days});
  }
  return {score:Math.round(total/active.length),details:`${active.length} pessoa${active.length===1?"":"s"} acompanhada${active.length===1?"":"s"}`,overdue:overdue.sort((a,b)=>(b.diasSemRegistro??999)-(a.diasSemRegistro??999))};
 }
 function prayerActivity(prayers){
  const cutoff=new Date();cutoff.setHours(12,0,0,0);cutoff.setDate(cutoff.getDate()-29);const min=isoDate(cutoff);
  const days=new Set();let answered=0;
  for(const item of prayers?.itens||[]){
   if(item?.status==="respondida")answered+=1;
   for(const h of item?.historico||[]){if(h?.tipo==="oracao"&&String(h?.data||"")>=min)days.add(String(h.data));}
  }
  return {days:days.size,score:days.size?clamp(Math.round(days.size/8*100)):null,answered};
 }
 function journalActivity(journal){
  const today=new Date();today.setHours(12,0,0,0);const cutoff30=new Date(today);cutoff30.setDate(today.getDate()-29);const cutoff14=new Date(today);cutoff14.setDate(today.getDate()-13);
  const min30=isoDate(cutoff30),min14=isoDate(cutoff14);
  const recent=(journal?.registros||[]).filter(x=>String(x?.data||"")>=min30&&String(x?.data||"")<=todayISO()&&String(x?.texto||"").trim());
  const mindDays=new Set(recent.filter(x=>String(x?.data||"")>=min14&&["pessoal","trabalho","familia","fé","fe"].includes(norm(x?.categoria||""))).map(x=>x.data));
  const memoryDays=new Set(recent.map(x=>x.data));
  return {records:recent.length,mindScore:mindDays.size?clamp(Math.round(mindDays.size/5*100)):null,memoryScore:memoryDays.size?clamp(Math.round(memoryDays.size/10*100)):null,memoryDays:memoryDays.size,mindDays:mindDays.size};
 }
 function combine(...values){const nums=values.filter(Number.isFinite);return nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):null}
 function computeBranches(all){
  const rates=goalRates(all.core);const circle=circleAdherence(all.circle);const prayer=prayerActivity(all.prayers);const journal=journalActivity(all.journal);
  const baseScore=key=>rates[key].planned?Math.round(rates[key].done/rates[key].planned*100):null;
  const branches=[
   {id:"espiritual",label:"Espiritual",icon:"🙏",score:combine(baseScore("espiritual"),prayer.score),detail:rates.espiritual.planned?`${rates.espiritual.done}/${rates.espiritual.planned} compromissos · ${prayer.days} dia${prayer.days===1?"":"s"} de oração`:`${prayer.days} dia${prayer.days===1?"":"s"} de oração registrados`},
   {id:"corpo",label:"Corpo",icon:"🏃",score:baseScore("corpo"),detail:rates.corpo.planned?`${rates.corpo.done}/${rates.corpo.planned} cuidados concluídos nos últimos 30 dias`:"Ainda sem evidência suficiente"},
   {id:"desenvolvimento",label:"Desenvolvimento",icon:"📚",score:baseScore("desenvolvimento"),detail:rates.desenvolvimento.planned?`${rates.desenvolvimento.done}/${rates.desenvolvimento.planned} compromissos concluídos`:"Ainda sem evidência suficiente"},
   {id:"relacionamentos",label:"Relacionamentos",icon:"❤️",score:combine(baseScore("relacionamentos"),circle.score),detail:circle.details},
   {id:"mente",label:"Mente",icon:"🧠",score:combine(baseScore("mente"),journal.mindScore),detail:journal.mindDays?`${journal.mindDays} dia${journal.mindDays===1?"":"s"} com registros de reflexão recente`:"Ainda sem evidência suficiente"},
   {id:"memorias",label:"Memórias",icon:"✨",score:journal.memoryScore,detail:journal.memoryDays?`${journal.memoryDays} dia${journal.memoryDays===1?"":"s"} com algo guardado nos últimos 30 dias`:"Comece guardando pequenos momentos do dia"}
  ];
  const numeric=branches.filter(x=>Number.isFinite(x.score));
  const overall=numeric.length?Math.round(numeric.reduce((sum,x)=>sum+x.score,0)/numeric.length):null;
  return {branches,overall,circle,prayer,journal,rates};
 }
 function currentBookInsight(core){
  const book=core?.livros?.atual;if(!book?.titulo)return null;
  const start=parseDate(book.dataInicio||"");if(!start)return {icon:"📖",title:`Você está lendo ${book.titulo}`,text:"Cadastre a data de início para o Memory acompanhar esse percurso."};
  const days=Math.max(1,(daysBetween(start,new Date())||0)+1);return {icon:"📖",title:`${days} dia${days===1?"":"s"} com ${book.titulo}`,text:"Constância também é permanecer tempo suficiente com uma ideia para ela amadurecer."};
 }
 function workoutInsight(workouts){
  const cutoff=new Date();cutoff.setHours(12,0,0,0);cutoff.setDate(cutoff.getDate()-29);const min=isoDate(cutoff);
  const rows=(workouts?.sessoes||[]).filter(x=>String(x?.data||"")>=min&&["concluido","parcial"].includes(x?.status));
  if(!rows.length)return null;const complete=rows.filter(x=>x.status==="concluido").length;
  return {icon:"🏋️",title:`${rows.length} treino${rows.length===1?"":"s"} em 30 dias`,text:complete===rows.length?"Você está transformando intenção em presença real no corpo.":`${complete} completo${complete===1?"":"s"} e ${rows.length-complete} ${rows.length-complete===1?"parcial":"parciais"}. O Memory preserva o que foi feito sem apagar o que faltou.`};
 }
 function insights(all,computed=computeBranches(all)){
  const list=[];
  const numeric=computed.branches.filter(x=>Number.isFinite(x.score));
  if(numeric.length){
   const sorted=[...numeric].sort((a,b)=>b.score-a.score);const strong=sorted[0],weak=sorted.at(-1);
   if(strong?.score>=75)list.push({icon:strong.icon,title:`${strong.label} está consistente`,text:`Nos últimos registros, essa área aparece com ${strong.score}% de cuidado.`});
   if(weak&&strong&&weak.id!==strong.id&&weak.score<=65)list.push({icon:weak.icon,title:`${weak.label} recebeu menos atenção`,text:`Essa área está em ${weak.score}%. Não é julgamento: é apenas um sinal para você decidir se quer cuidar dela agora.`});
  }
  const overdue=computed.circle.overdue?.[0];
  if(overdue){
   const days=overdue.diasSemRegistro;list.push({icon:"❤️",title:`Lembre de ${overdue.nome}`,text:days==null?"Essa pessoa está no seu Círculo de Cuidado e ainda não tem um momento registrado.":`Faz ${days} dia${days===1?"":"s"} desde o último cuidado registrado.`});
  }
  const book=currentBookInsight(all.core);if(book)list.push(book);
  const workout=workoutInsight(all.workouts);if(workout)list.push(workout);
  const answered=(all.prayers.itens||[]).filter(x=>x?.status==="respondida").sort((a,b)=>String(b.respondidaEm||"").localeCompare(String(a.respondidaEm||"")))[0];
  if(answered)list.push({icon:"✨",title:"Uma memória de Deus permanece aqui",text:`“${answered.titulo}” foi marcada como respondida. O Memory guarda isso para você não esquecer.`});
  return list.slice(0,4);
 }
 function focusCards(all){
  const core=all.core,iso=todayISO();const goals=window.MMCD.metasNaData(core,iso)||[];const cards=[];
  const incomplete=goals.filter(g=>{const r=window.MMCD.registro(core,iso,g.id);return !window.MMCD.estaAbonada?.(r)&&!r?.concluida});
  const spiritual=incomplete.find(g=>branchForGoal(g)==="espiritual");
  if(spiritual)cards.push({icon:"🙏",kind:"Espiritual",title:spiritual.nome||"Seu momento com Deus",text:"Ainda está pendente hoje.",href:/medita/i.test(`${spiritual.nome} ${spiritual.descricao}`)?"meditacao.html":"atividades.html"});
  const birthday=(all.birthdays.itens||[]).filter(x=>x?.ativo!==false&&Number(x?.dia)===new Date().getDate()&&Number(x?.mes)===new Date().getMonth()+1&&String(x?.nome||"").trim())[0];
  if(birthday)cards.push({icon:"🎂",kind:"Cuidado",title:`Hoje é aniversário de ${birthday.nome}`,text:"Uma pequena lembrança pode significar muito.",href:"atividades.html"});
  else{
   const overdue=circleAdherence(all.circle).overdue?.[0];if(overdue)cards.push({icon:"❤️",kind:"Cuidado",title:`Que tal cuidar de ${overdue.nome}?`,text:overdue.diasSemRegistro==null?"Ainda não há um momento de cuidado registrado.":`Faz ${overdue.diasSemRegistro} dia${overdue.diasSemRegistro===1?"":"s"} desde o último registro.`,href:"circulo.html"});
  }
  const body=incomplete.find(g=>branchForGoal(g)==="corpo");
  if(body)cards.push({icon:"🏃",kind:"Corpo",title:body.nome||"Cuide do corpo",text:"Está previsto para hoje.",href:/treino|muscul|cardio/i.test(`${body.nome} ${body.descricao}`)?"treinos-v70.html#hoje":"atividades.html"});
  if(cards.length<3){const dev=incomplete.find(g=>branchForGoal(g)==="desenvolvimento");if(dev)cards.push({icon:"📚",kind:"Desenvolvimento",title:dev.nome,text:"Ainda cabe no seu dia.",href:"atividades.html"});}
  if(!cards.length)cards.push({icon:"✓",kind:"Hoje",title:"O essencial está em ordem",text:"Use o restante do dia para viver, não apenas para marcar coisas como concluídas.",href:"painel.html"});
  return cards.slice(0,3);
 }
 function prayerStats(prayers){
  const items=prayers?.itens||[];const active=items.filter(x=>x?.status==="ativa");const answered=items.filter(x=>x?.status==="respondida");
  const oldest=active.map(x=>parseDate(String(x?.criadoEm||"").slice(0,10))).filter(Boolean).sort((a,b)=>a-b)[0];
  const days=oldest?Math.max(1,(daysBetween(oldest,new Date())||0)+1):0;return {active:active.length,answered:answered.length,oldestDays:days};
 }
 function personStatus(person){
  const freq=Math.max(1,Number(person?.frequenciaDias||14));const last=parseDate(person?.ultimoCuidadoEm||"");
  if(!last)return {state:"due",label:"Ainda sem registro",days:null,next:"Hoje"};
  const today=new Date();today.setHours(12,0,0,0);const days=Math.max(0,daysBetween(last,today)||0);const remaining=freq-days;
  if(remaining<=0)return {state:"due",label:days===0?"Cuidado registrado hoje":`Há ${days} dia${days===1?"":"s"}`,days,next:"Agora"};
  return {state:remaining<=3?"soon":"ok",label:days===0?"Cuidado registrado hoje":`Há ${days} dia${days===1?"":"s"}`,days,next:`Em ${remaining} dia${remaining===1?"":"s"}`};
 }
 window.MemoryLife={KEYS,read,write,loadAll,normalizePrayers,normalizeCircle,computeBranches,insights,focusCards,prayerStats,personStatus,branchForGoal,uid,esc,norm,isoDate,todayISO,parseDate,daysBetween};
})();
