"use strict";
(async()=>{
  const C=window.MemoryCare,$=s=>document.querySelector(s),days=C.range(7);const d=await window.MMCD.carregar();
  const [prayers,circle,journal,english,workouts,englishSummary]=await Promise.all([
    C.read("memory_oracoes_v1",{itens:[]}).catch(()=>({itens:[]})),C.read("memory_circulo_cuidado_v1",{itens:[]}).catch(()=>({itens:[]})),C.read("diario_rapido_v1",{registros:[]}).catch(()=>({registros:[]})),C.read("ingles_conversas_v1",{sessoes:[]}).catch(()=>({sessoes:[]})),C.read("treino_sessoes_v1",{sessoes:[]}).catch(()=>({sessoes:[]})),C.read("ingles_evolucao_v1",{}).catch(()=>({}))
  ]);
  const norm=value=>C.normalizeName(value);
  const textMeta=m=>norm(`${m?.nome||""} ${m?.categoria||""} ${m?.descricao||""}`);
  function activitySignal(words){
    const metas=(d.metas||[]).filter(m=>words.some(w=>textMeta(m).includes(w)));let expected=0,done=0;
    for(const date of days){
      for(const m of metas){
        const row=window.MMCD.registro(d,date,m.id);const scheduled=window.MMCD.ativaNaData(m,date);if(scheduled)expected++;if(row?.concluida&&!window.MMCD.estaAbonada(row))done++;
      }
    }
    if(!metas.length)return {score:null,done:0,expected:0,count:0};
    if(!expected)return {score:done?100:null,done,expected,count:metas.length};
    return {score:C.clamp(Math.round(done/expected*100)),done,expected,count:metas.length};
  }
  const spiritualAct=activitySignal(["deus","biblia","oracao","meditacao","devocional","igreja"]);
  const bodyAct=activitySignal(["treino","academia","futebol","jiu","corrida","cardio","caminhada","saude","peso"]);
  const developmentAct=activitySignal(["ingles","estudo","leitura","livro","curso","python","estatistica","prf","desenvolvimento"]);
  const recentJournal=(journal.registros||[]).filter(x=>x?.data&&days.includes(x.data));
  const activePrayers=(prayers.itens||[]).filter(x=>x?.status!=="respondida").length;const answered=(prayers.itens||[]).filter(x=>x?.status==="respondida").length;
  const circleItems=(circle.itens||[]).filter(x=>x?.ativo!==false);let circleOk=0;for(const p of circleItems){if(!p.ultimoCuidado)continue;const since=C.daysBetween(String(p.ultimoCuidado).slice(0,10),C.iso(C.today()));if(since!=null&&since<Number(p.frequenciaDias||7))circleOk++}
  const convSessions=Array.isArray(english?.sessoes)?english.sessoes:Array.isArray(english?.sessions)?english.sessions:[];const recentConv=convSessions.filter(x=>String(x?.data||x?.date||x?.createdAt||x?.criadoEm||"").slice(0,10)>=days[0]).length;const workoutSessions=Array.isArray(workouts?.sessoes)?workouts.sessoes:[];const recentWorkouts=workoutSessions.filter(x=>String(x?.data||"").slice(0,10)>=days[0]&&["concluido","parcial"].includes(x?.status)).length;
  const scoreFromAct=(signal,bonus=0)=>signal.score==null?null:C.clamp(signal.score+bonus);
  const dimensions=[
    {key:"spiritual",icon:"🙏",name:"Espiritual",score:scoreFromAct(spiritualAct,Math.min(15,activePrayers*3+answered*2)),detail:spiritualAct.score==null?`${activePrayers} pedido(s) de oração registrado(s)`:`${spiritualAct.done}/${spiritualAct.expected||spiritualAct.done} cuidados espirituais registrados`},
    {key:"body",icon:"🏃",name:"Corpo",score:bodyAct.score==null?(recentWorkouts?C.clamp(Math.round(recentWorkouts/4*100)):null):C.clamp(bodyAct.score+Math.min(15,recentWorkouts*3)),detail:bodyAct.score==null?(recentWorkouts?`${recentWorkouts} treino(s) registrado(s) nos últimos 7 dias`:"Cadastre atividades de corpo para formar este sinal"):`${bodyAct.done}/${bodyAct.expected||bodyAct.done} cuidados físicos · ${recentWorkouts} treino(s)`},
    {key:"mind",icon:"🧠",name:"Mente",score:recentJournal.length?C.clamp(Math.round(recentJournal.length/4*100)):null,detail:recentJournal.length?`${recentJournal.length} registro(s) de reflexão nos últimos 7 dias`:"Sem registro rápido recente para esta dimensão"},
    {key:"relationships",icon:"❤️",name:"Relacionamentos",score:circleItems.length?C.clamp(Math.round(circleOk/circleItems.length*100)):null,detail:circleItems.length?`${circleOk}/${circleItems.length} relações dentro da frequência definida`:"Adicione pessoas ao Círculo de Cuidado"},
    {key:"development",icon:"📚",name:"Desenvolvimento",score:developmentAct.score==null?(Number.isFinite(Number(englishSummary?.overall))?C.clamp(Number(englishSummary.overall)):recentConv?C.clamp(recentConv*20):null):scoreFromAct(developmentAct,Math.min(12,recentConv*4)),detail:developmentAct.score==null?(Number.isFinite(Number(englishSummary?.overall))?`Evolução do inglês em ${Math.round(Number(englishSummary.overall))}%`:recentConv?`${recentConv} conversa(s) de inglês recente(s)`:"Cadastre estudos e práticas para formar este sinal"):`${developmentAct.done}/${developmentAct.expected||developmentAct.done} práticas de desenvolvimento`},
    {key:"memories",icon:"✨",name:"Memórias",score:(recentJournal.length||answered)?C.clamp(Math.round(Math.min(1,(recentJournal.length+answered)/6)*100)):null,detail:`${recentJournal.length} registro(s) recente(s) · ${answered} Memória(s) de Deus`}
  ];
  const tree=$("#life-tree");tree.innerHTML='<div class="memory-tree-trunk" aria-hidden="true"></div>'+dimensions.map(dim=>{const value=dim.score==null?50:dim.score;const label=dim.score==null?"Sem dados":`${dim.score}%`;return `<article class="memory-tree-branch"><h3>${dim.icon} ${C.esc(dim.name)} · ${label}</h3><div class="memory-tree-mini"><span style="width:${value}%"></span></div><p>${C.esc(dim.detail)}</p></article>`}).join("");
  const scored=dimensions.filter(x=>x.score!=null).sort((a,b)=>a.score-b.score);const insights=[];
  if(scored.length){const low=scored[0];if(low.score<55)insights.push(["🎯",`${low.name} merece mais atenção`,`Nos últimos registros, esta foi a dimensão com menos sinais de cuidado. Isso é um convite para observar a rotina, não uma avaliação pessoal.`]);const high=scored[scored.length-1];if(high.score>=75)insights.push(["🌱",`${high.name} está recebendo cuidado`,`Seus registros recentes mostram consistência maior nessa dimensão. Vale perceber o que está funcionando e repetir.`])}
  if(circleItems.length&&circleOk<circleItems.length)insights.push(["❤️","Há relações fora da frequência definida",`${circleItems.length-circleOk} pessoa(s) do seu Círculo de Cuidado podem estar merecendo um gesto simples de presença.`]);
  if(activePrayers&&!answered)insights.push(["🙏","Você está construindo um histórico de oração",`${activePrayers} pedido(s) ativo(s). Quando perceber uma resposta, marque-a para formar suas Memórias de Deus.`]);
  if(!insights.length)insights.push(["✨","Continue registrando","Com alguns dias de uso, o Memory consegue identificar padrões simples de consistência entre as dimensões."]);
  $("#tree-insights").innerHTML=insights.slice(0,3).map(x=>`<div class="memory-care-row"><span class="memory-care-row__icon">${x[0]}</span><div class="memory-care-row__copy"><strong>${C.esc(x[1])}</strong><small>${C.esc(x[2])}</small></div></div>`).join("");
  $("#tree-updated").textContent=`Atualizado com os últimos 7 dias · ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`;
})().catch(error=>{console.error(error);document.querySelector("#life-tree")?.insertAdjacentHTML("beforeend",`<div class="memory-care-note">Não foi possível montar a Árvore da Vida: ${window.MMCDUI?.esc?.(error.message)||error.message}</div>`)});
