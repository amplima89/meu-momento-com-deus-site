"use strict";
(async function(){
  const dados = await MMCD.carregar();
  const hoje = new Date();
  const isoHoje = localISO(hoje);
  const registroHoje = dados.habitos?.[isoHoje] || {habitos:{}};
  const habitos = [
    ["espiritual","Meditação","Encontro diário com Deus","ME"],
    ["leitura","Leitura","Avançar no livro atual","LE"],
    ["agua","Água","Cuidar do corpo","AG"],
    ["treino","Treino","Movimento e disciplina","TR"],
    ["cardio","Cardio","Resistência e saúde","CA"],
    ["estudo","Estudo","Aprendizado intencional","ES"]
  ];

  const hora = hoje.getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  text("welcome-title", `${saudacao}, André.`);
  text("welcome-date", hoje.toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"long", year:"numeric"}));

  const missao = dados.configuracoes.missaoAtual;
  text("dash-mission-title", missao.titulo);
  text("dash-mission-period", `${formatar(missao.inicio)} até ${formatar(missao.fim)}`);

  const todosRegistros = Object.entries(dados.habitos || {}).sort(([a],[b])=>a.localeCompare(b));
  const checks = todosRegistros.flatMap(([,d])=>Object.values(d.habitos||{}));
  const consistencia = checks.length ? Math.round(checks.filter(Boolean).length/checks.length*100) : 0;
  text("dash-mission-percent", `${consistencia}%`);
  width("dash-mission-bar", consistencia);
  text("dash-days-done", todosRegistros.length);
  text("dash-streak", calcularStreak(dados.habitos || {}, hoje));

  const concluidosAno = (dados.livros.concluidos||[]).filter(l=>String(l.dataConclusao||"").startsWith(String(dados.configuracoes.anoMetaLivros))).length;
  text("dash-books", concluidosAno);

  const habitsEl = document.querySelector("#dash-habits");
  habitsEl.innerHTML = habitos.map(([id,nome,desc,icone])=>{
    const feito = Boolean(registroHoje.habitos?.[id]);
    return `<a class="dash-habit ${feito?"done":""}" href="alvo.html">
      <span class="dash-habit__icon">${icone}</span>
      <span class="dash-habit__copy"><strong>${nome}</strong><small>${desc}</small></span>
      <span class="dash-habit__state">${feito?"Concluído":"Pendente"}</span>
    </a>`;
  }).join("");

  montarSemana(dados.habitos || {}, hoje);
  montarCalendario(dados.habitos || {}, hoje);

  const livroAtual = dados.livros.atual || {};
  text("dash-book-title", livroAtual.titulo || "Nenhum livro atual");
  text("dash-book-author", livroAtual.autor || "Cadastre o autor");
  const meta = Number(dados.configuracoes.metaLivrosAno || 30);
  text("dash-book-goal", `${concluidosAno} / ${meta}`);
  width("dash-book-bar", Math.min(100, concluidosAno/meta*100));

  const feitosHoje = Object.values(registroHoje.habitos||{}).filter(Boolean).length;
  const insight = feitosHoje >= 5
    ? "Seu dia já tem uma base forte. Preserve o ritmo sem transformar disciplina em excesso."
    : feitosHoje >= 2
      ? "Você já começou. Agora escolha a próxima ação essencial e conclua antes de abrir uma nova frente."
      : "O dia ainda pode mudar com uma decisão pequena e concreta. Comece pela meta mais essencial.";
  text("dash-insight", insight);
})();

function montarSemana(registros, hoje){
  const el=document.querySelector("#dash-week-chart");
  let soma=0;
  const itens=[];
  for(let i=6;i>=0;i--){
    const d=new Date(hoje); d.setDate(hoje.getDate()-i);
    const r=registros[localISO(d)]?.habitos||{};
    const vals=Object.values(r);
    const pct=vals.length?Math.round(vals.filter(Boolean).length/vals.length*100):0;
    soma+=pct;
    itens.push(`<div class="week-bar"><span class="week-bar__value">${pct}%</span><div><i style="height:${Math.max(5,pct)}%"></i></div><small>${d.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","")}</small></div>`);
  }
  el.innerHTML=itens.join("");
  text("dash-week-score", `${Math.round(soma/7)}%`);
}
function montarCalendario(registros, hoje){
  text("dash-month-title", hoje.toLocaleDateString("pt-BR",{month:"long",year:"numeric"}));
  const el=document.querySelector("#dash-calendar");
  const ano=hoje.getFullYear(), mes=hoje.getMonth();
  const primeiro=new Date(ano,mes,1);
  const offset=(primeiro.getDay()+6)%7;
  const total=new Date(ano,mes+1,0).getDate();
  const cells=[];
  for(let i=0;i<offset;i++) cells.push('<span class="mini-day empty"></span>');
  for(let dia=1;dia<=total;dia++){
    const d=new Date(ano,mes,dia); const iso=localISO(d);
    const vals=Object.values(registros[iso]?.habitos||{});
    const pct=vals.length?vals.filter(Boolean).length/vals.length:0;
    const classe=pct>=.75?"good":pct>0?"partial":"";
    const atual=iso===localISO(hoje)?"today":"";
    cells.push(`<span class="mini-day ${classe} ${atual}" title="${Math.round(pct*100)}%">${dia}</span>`);
  }
  el.innerHTML=cells.join("");
}
function calcularStreak(registros, hoje){
  let streak=0;
  for(let i=0;i<365;i++){
    const d=new Date(hoje); d.setDate(hoje.getDate()-i);
    const vals=Object.values(registros[localISO(d)]?.habitos||{});
    if(vals.length && vals.some(Boolean)) streak++; else if(i===0) continue; else break;
  }
  return streak;
}
function localISO(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function formatar(s){if(!s)return "—"; const [a,m,d]=s.split("-"); return `${d}/${m}/${a}`}
function text(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
function width(id,v){const e=document.getElementById(id);if(e)e.style.width=`${Number.isFinite(v)?v:0}%`}
