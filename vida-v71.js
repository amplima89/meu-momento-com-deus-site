"use strict";
(async()=>{
 const status=document.querySelector("#life-status");
 try{
  const all=await window.MemoryLife.loadAll({fresh:true});
  const computed=window.MemoryLife.computeBranches(all);
  const insights=window.MemoryLife.insights(all,computed);
  const overall=document.querySelector("#life-overall");
  if(overall)overall.textContent=Number.isFinite(computed.overall)?`${computed.overall}%`:"Em leitura";
  const nodes=document.querySelector("#life-tree-nodes");
  if(nodes){
   nodes.innerHTML=computed.branches.map(branch=>`<div class="life-tree__node" data-score="${Number.isFinite(branch.score)?branch.score:"none"}"><span>${branch.icon}</span><strong>${window.MemoryLife.esc(branch.label)}</strong><small>${Number.isFinite(branch.score)?`${branch.score}%`:"sem dados"}</small></div>`).join("");
  }
  const branchGrid=document.querySelector("#life-branch-grid");
  if(branchGrid){
   branchGrid.innerHTML=computed.branches.map(branch=>`<article class="life-branch"><div class="life-branch__top"><strong>${branch.icon} ${window.MemoryLife.esc(branch.label)}</strong><span class="life-branch__score">${Number.isFinite(branch.score)?`${branch.score}%`:"—"}</span></div><div class="progress"><i style="width:${Number.isFinite(branch.score)?branch.score:0}%"></i></div><small>${window.MemoryLife.esc(branch.detail||"")}</small></article>`).join("");
  }
  const insightList=document.querySelector("#life-insight-list");
  if(insightList){
   insightList.innerHTML=insights.length?insights.map(item=>`<article class="life-insight"><span class="life-insight__icon">${item.icon}</span><div><strong>${window.MemoryLife.esc(item.title)}</strong><p>${window.MemoryLife.esc(item.text)}</p></div></article>`).join(""):`<div class="personal-empty">O Memory ainda está reunindo evidências suficientes para enxergar padrões sem adivinhar.</div>`;
  }
  const prayerStats=window.MemoryLife.prayerStats(all.prayers);
  const prayerSummary=document.querySelector("#life-prayer-summary");
  if(prayerSummary)prayerSummary.textContent=prayerStats.active?`${prayerStats.active} em oração · ${prayerStats.answered} respondida${prayerStats.answered===1?"":"s"}`:`${prayerStats.answered} memória${prayerStats.answered===1?"":"s"} de Deus guardada${prayerStats.answered===1?"":"s"}`;
  const circleActive=(all.circle.itens||[]).filter(x=>x?.ativo!==false).length;
  const circleSummary=document.querySelector("#life-circle-summary");
  if(circleSummary)circleSummary.textContent=circleActive?`${circleActive} pessoa${circleActive===1?"":"s"} importante${circleActive===1?"":"s"} no seu círculo`:"Cadastre as pessoas que você não quer deixar passar despercebidas";
  if(status)status.textContent="Atualizado com seus registros atuais.";
 }catch(error){
  console.error(error);if(status)status.textContent="Não foi possível montar sua visão agora. Seus dados existentes não foram alterados.";
  window.MMCDUI?.toast?.("Não foi possível carregar a Árvore da Vida.");
 }
})();
