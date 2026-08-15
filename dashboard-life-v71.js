"use strict";
(async()=>{
 const esc=window.MemoryLife.esc;
 const waitForDashboard=async()=>{for(let i=0;i<40;i++){if(document.querySelector("#main-cards .dash-card"))return;await new Promise(r=>setTimeout(r,100))}};
 try{
  await waitForDashboard();
  const all=await window.MemoryLife.loadAll({fresh:true});
  const computed=window.MemoryLife.computeBranches(all);
  const focus=window.MemoryLife.focusCards(all);
  const insights=window.MemoryLife.insights(all,computed).slice(0,3);
  const focusRoot=document.querySelector("#memory-life-focus");
  if(focusRoot){focusRoot.className="memory-focus-wrap";focusRoot.innerHTML=`<div class="memory-focus-head"><div><p class="eyebrow">O que merece sua atenção hoje?</p><h2>O essencial antes do restante</h2></div><p>O Memory usa o que já está registrado para reduzir ruído, não para criar mais tarefas.</p></div><div class="memory-focus-grid">${focus.map(item=>`<a class="memory-focus-card" href="${item.href}"><span class="memory-focus-card__icon">${item.icon}</span><span><small>${esc(item.kind)}</small><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></span><b>›</b></a>`).join("")}</div>`}
  const overview=document.querySelector("#memory-life-overview");
  if(overview){overview.className="memory-life-overview";overview.innerHTML=`<article class="card memory-life-mini"><div class="memory-life-mini-head"><div><p class="eyebrow">Árvore da Vida</p><h2>Seu cuidado como um todo</h2></div><a href="vida.html?v=20260815-v71">Abrir visão →</a></div><div class="memory-life-branches">${computed.branches.map(b=>`<div class="memory-life-branch"><span>${b.icon}</span><strong>${esc(b.label)}</strong><small>${Number.isFinite(b.score)?`${b.score}% de evidências recentes`:"em leitura"}</small></div>`).join("")}</div><div class="memory-life-mini-actions"><a href="oracoes.html?v=20260815-v71">🙏 Minhas orações</a><a href="circulo.html?v=20260815-v71">❤️ Círculo de Cuidado</a></div></article><article class="card memory-life-mini-insights"><div class="memory-life-mini-head"><div><p class="eyebrow">O Memory percebeu</p><h2>Sinais que poderiam passar despercebidos</h2></div></div><div class="life-insight-list">${insights.length?insights.map(x=>`<article class="life-insight"><span class="life-insight__icon">${x.icon}</span><div><strong>${esc(x.title)}</strong><p>${esc(x.text)}</p></div></article>`).join(""):`<div class="personal-empty">Ainda reunindo evidências suficientes para enxergar padrões sem adivinhar.</div>`}</div></article>`}
 }catch(error){
  console.warn("Memory Vida: painel complementar indisponível.",error);
  const focusRoot=document.querySelector("#memory-life-focus");if(focusRoot)focusRoot.innerHTML="";
  const overview=document.querySelector("#memory-life-overview");if(overview)overview.innerHTML="";
 }
})();
