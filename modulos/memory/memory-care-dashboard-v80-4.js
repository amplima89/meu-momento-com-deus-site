"use strict";
(async()=>{
  const C=window.MemoryCare,d=await window.MMCD.carregar(),today=C.today(),iso=C.iso(today),days=C.range(7,today),$=s=>document.querySelector(s);
  const [circle,prayers,birthdays,journal]=await Promise.all([
    C.read("memory_circulo_cuidado_v1",{itens:[]}).catch(()=>({itens:[]})),C.read("memory_oracoes_v1",{itens:[]}).catch(()=>({itens:[]})),C.read("memory_aniversarios_v1",{itens:[]}).catch(()=>({itens:[]})),C.read("diario_rapido_v1",{registros:[]}).catch(()=>({registros:[]}))
  ]);
  const attention=[];
  const month=today.getMonth()+1,day=today.getDate();
  const birthdaysToday=(birthdays.itens||[]).filter(x=>x?.ativo!==false&&Number(x?.dia)===day&&Number(x?.mes)===month);
  if(birthdaysToday.length)attention.push({icon:"🎂",title:`Aniversário de ${birthdaysToday[0].nome}`,text:"Um gesto de presença pode valer mais do que acrescentar outra tarefa.",href:"circulo-cuidado.html?v=20260815-v76",action:"Cuidar agora"});
  const overdue=(circle.itens||[]).filter(x=>x?.ativo!==false).map(x=>{const since=x.ultimoCuidado?C.daysBetween(String(x.ultimoCuidado).slice(0,10),iso):9999;return {...x,since}}).filter(x=>x.since>=Number(x.frequenciaDias||7)).sort((a,b)=>b.since-a.since);
  if(overdue.length){const p=overdue[0];attention.push({icon:"❤️",title:`${p.nome} pode estar pedindo presença`,text:p.since>1000?"Você ainda não registrou um cuidado com essa pessoa.":`Último cuidado registrado há ${p.since} dias.`,href:"circulo-cuidado.html?v=20260815-v76",action:"Ver relacionamentos"})}
  const todayMetas=window.MMCD.metasNaData(d,iso).filter(m=>m?.ativa&&!window.MMCD.registro(d,iso,m.id)?.concluida);
  const spiritual=todayMetas.find(m=>/deus|biblia|oracao|meditacao|devocional/.test(C.normalizeName(`${m.nome} ${m.categoria}`)));
  if(spiritual)attention.push({icon:spiritual.icone||"🙏",title:spiritual.nome,text:"Está prevista para hoje e ainda não aparece como concluída.",href:"atividades.html?v=20260815-v76",action:"Abrir atividade"});
  if(attention.length<3&&todayMetas.length){const m=todayMetas.find(x=>x!==spiritual)||todayMetas[0];attention.push({icon:m.icone||"✓",title:m.nome,text:"Uma atividade prevista para hoje ainda está aberta.",href:"atividades.html?v=20260815-v76",action:"Abrir atividade"})}
  const activePrayers=(prayers.itens||[]).filter(x=>x?.status!=="respondida");
  if(attention.length<3&&activePrayers.length)attention.push({icon:"🙏",title:"Pedidos que você decidiu não esquecer",text:`${activePrayers.length} pedido${activePrayers.length===1?"":"s"} ativo${activePrayers.length===1?"":"s"} em Minhas Orações.`,href:"oracoes.html?v=20260815-v76",action:"Abrir Orações"});
  const mission=$("#mission-card");
  if(mission){const shown=attention.slice(0,3);const section=document.createElement("section");section.className="memory-focus-panel";section.innerHTML=`<div class="memory-focus-panel__head"><div><p class="eyebrow">Hoje</p><h2>${shown.length?"O que vale proteger agora":"Seu dia está sem alertas importantes"}</h2><p>${shown.length?"Só aparecem aqui sinais ligados a algo concreto dos seus registros.":"Continue com o que você planejou. O Memory não precisa inventar uma prioridade."}</p></div><a class="memory-focus-map-link" href="mapa-cuidado.html?v=20260815-v76">Ver Mapa de Cuidado <span>→</span></a></div>${shown.length?`<div class="memory-focus-list">${shown.map(item=>`<a class="memory-focus-row" href="${item.href}"><span class="memory-focus-row__icon">${item.icon}</span><span class="memory-focus-row__copy"><strong>${C.esc(item.title)}</strong><small>${C.esc(item.text)}</small></span><span class="memory-focus-row__action">${C.esc(item.action||"Abrir")} <b>→</b></span></a>`).join("")}</div>`:""}`;mission.insertAdjacentElement("afterend",section)}

  // Engine de percepção: regras simples, somente registros do próprio usuário.
  let expected=0,done=0,missByCategory={};
  for(const date of days){for(const m of (d.metas||[])){if(!window.MMCD.ativaNaData(m,date))continue;expected++;const row=window.MMCD.registro(d,date,m.id);if(row?.concluida||window.MMCD.estaAbonada(row))done++;else{const cat=m.categoria||"Outros";missByCategory[cat]=(missByCategory[cat]||0)+1}}}
  const consistency=expected?Math.round(done/expected*100):null;const insights=[];
  if(consistency!=null&&consistency>=80)insights.push({icon:"🌱",title:"Sua consistência recente está forte",text:`Você concluiu ou abonou ${done} de ${expected} atividades previstas nos últimos 7 dias (${consistency}%).`});
  if(consistency!=null&&consistency<60)insights.push({icon:"🧭",title:"A rotina ficou mais difícil nesta semana",text:`A consistência dos últimos 7 dias está em ${consistency}%. Talvez seja melhor proteger poucas prioridades em vez de tentar recuperar tudo de uma vez.`});
  const topMiss=Object.entries(missByCategory).sort((a,b)=>b[1]-a[1])[0];if(topMiss&&topMiss[1]>=2)insights.push({icon:"🔎",title:`${topMiss[0]} apareceu mais vezes entre as pendências`,text:`Foram ${topMiss[1]} ocorrências nos últimos 7 dias. O Memory só está contando o padrão; a interpretação continua sendo sua.`});
  if(overdue.length>=2)insights.push({icon:"❤️",title:"Relacionamentos estão pedindo espaço",text:`${overdue.length} pessoas do Relacionamentos estão fora da frequência que você mesmo definiu.`});
  const recentJournal=(journal.registros||[]).filter(x=>days.includes(x?.data));if(recentJournal.length>=4)insights.push({icon:"🧠",title:"Você tem criado espaço para registrar o que vive",text:`Há ${recentJournal.length} registros rápidos nos últimos 7 dias. Isso aumenta a memória do contexto sem depender de IA externa.`});
  if(!insights.length)insights.push({icon:"✨",title:"Ainda não há um padrão forte para destacar",text:"Conforme você registra atividades, cuidado com pessoas, orações e reflexões, os sinais ficam mais úteis."});
  const mainCards=$("#main-cards");if(mainCards){const section=document.createElement("section");section.className="card section memory-insights-panel";section.innerHTML=`<div class="memory-insights-panel__head"><div><p class="eyebrow">✨ O Memory percebeu</p><h2>Padrões dos seus próprios registros</h2></div><small>Regras e estatísticas · sem IA externa</small></div><div class="memory-insights-list">${insights.slice(0,3).map(x=>`<div class="memory-insight"><span>${x.icon}</span><div><strong>${C.esc(x.title)}</strong><small>${C.esc(x.text)}</small></div></div>`).join("")}</div>`;mainCards.insertAdjacentElement("afterend",section)}

  const seen="memory:care-integral-welcome";if(!localStorage.getItem(seen)){localStorage.setItem(seen,"1");window.MMCDUI?.toast?.("Cuidado integral ativado no Memory",3200)}
})().catch(error=>{console.error("Memory cuidado integral:",error)});
