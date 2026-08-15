"use strict";
(async()=>{
 const root=document.querySelector('#meditation-journey');
 const dayView=document.querySelector('#meditation-day-view');
 const dayTab=document.querySelector('[data-meditation-view="day"]');
 const journeyTab=document.querySelector('[data-meditation-view="journey"]');
 const returnBar=document.querySelector('#meditation-journey-return');
 const returnButton=document.querySelector('#meditation-journey-return-button');
 const returnText=document.querySelector('#meditation-journey-return-text');
 if(!root||!dayView||!window.MMCD?.listarMeditacoes)return;

 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const esc=value=>{const div=document.createElement('div');div.textContent=String(value??'');return div.innerHTML};
 const themes=[
  {id:'ansiedade',label:'Ansiedade',icon:'≈',description:'Preocupações, controle, descanso e paz.',words:[['ansiedad',8],['preocup',5],['estress',5],['medo',4],['paz',3],['descans',3],['controle',2],['angust',6]]},
  {id:'perdao',label:'Perdão',icon:'↺',description:'Mágoas, feridas, reconciliação e liberdade.',words:[['perdao',9],['perdo',8],['magoa',7],['ressent',7],['reconcili',6],['ofensa',5],['ferida',3]]},
  {id:'disciplina',label:'Disciplina',icon:'↗',description:'Constância, hábitos, foco e perseverança.',words:[['disciplin',8],['constan',6],['habito',6],['rotina',5],['foco',4],['procrast',7],['esforco',3],['persist',5]]},
  {id:'proposito',label:'Propósito',icon:'⌁',description:'Direção, prioridades, chamado e sentido.',words:[['proposito',9],['chamado',7],['direcao',5],['missao',6],['caminho',3],['prioridade',4],['sentido',4]]},
  {id:'relacionamentos',label:'Relacionamentos',icon:'♡',description:'Presença, amor, escuta e vínculos importantes.',words:[['relacion',8],['casamento',8],['familia',6],['esposa',6],['marido',6],['amigo',4],['equipe',3],['proximo',3],['conversa',3]]},
  {id:'fe',label:'Fé',icon:'✦',description:'Confiança, esperança, espera e dependência de Deus.',words:[['confiar',7],['confianca',6],['promessa',5],['duvida',5],['espera',4],['esperanca',5],['crer',6],['fe',3]]},
  {id:'gratidao',label:'Gratidão',icon:'☼',description:'Reconhecimento, contentamento e gratidão.',words:[['gratidao',9],['agradec',7],['bencao',6],['content',6],['reconhec',3],['presente',2]]},
  {id:'identidade',label:'Identidade',icon:'◉',description:'Quem você é, valor, ego, humildade e comparação.',words:[['identidade',9],['quem sou',8],['compar',6],['ego',7],['humild',6],['aprovacao',5],['valor',3],['imagem',3]]},
  {id:'obediencia',label:'Obediência',icon:'◇',description:'Convicção, decisão, prática e fidelidade.',words:[['obedien',9],['obedec',8],['mandamento',6],['submiss',6],['vontade de deus',5],['praticar',3],['decisao',3],['fidelidade',4]]}
 ];
 const byId=id=>themes.find(theme=>theme.id===id)||themes.find(theme=>theme.id==='fe');
 const explicitTheme=value=>{
  const text=normalize(value);
  if(!text)return null;
  return themes.find(theme=>text===normalize(theme.id)||text===normalize(theme.label)||text.includes(normalize(theme.label)))||null;
 };
 const classify=item=>{
  const explicit=explicitTheme(item.tema);
  if(explicit)return explicit;
  const text=` ${normalize(item.markdown)} `;
  let best=themes.find(theme=>theme.id==='fe'),bestScore=-1;
  themes.forEach(theme=>{
   let score=0;
   theme.words.forEach(([word,weight])=>{const matches=text.split(word).length-1;score+=Math.min(matches,3)*weight});
   if(score>bestScore){bestScore=score;best=theme}
  });
  return best;
 };
 const cleanMarkdown=value=>String(value||'')
  .replace(/[`*_>#]/g,' ')
  .replace(/\[[^\]]+\]\([^\)]+\)/g,' ')
  .replace(/\s+/g,' ')
  .trim();
 const extractFocus=markdown=>{
  const lines=String(markdown||'').replace(/\r\n/g,'\n').split('\n');
  const heading=/^#{1,6}\s+(?:\d+[.)]\s*)?(?:✨\s*)?Premissa Existencial\s*$/i;
  let start=lines.findIndex(line=>heading.test(line.trim()));
  if(start<0){
   start=lines.findIndex(line=>normalize(line).includes('premissa existencial'));
  }
  if(start>=0){
   const collected=[];
   for(let i=start+1;i<lines.length;i++){
    const line=lines[i].trim();
    if(/^#{1,6}\s+/.test(line)||/^\*\*?\d+[.)]\s+/.test(line))break;
    if(!line||/^---+$/.test(line))continue;
    collected.push(line);
    if(cleanMarkdown(collected.join(' ')).length>190)break;
   }
   const text=cleanMarkdown(collected.join(' '));
   if(text)return text.length>180?`${text.slice(0,177).trim()}…`:text;
  }
  const fallback=cleanMarkdown(markdown).replace(/^titulo\s*:[^\n]+/i,'').trim();
  return fallback.length>180?`${fallback.slice(0,177).trim()}…`:fallback||'Meditação deste assunto.';
 };
 const meditations=(await window.MMCD.listarMeditacoes()).map((item,index)=>({...item,index,theme:classify(item),focus:extractFocus(item.markdown)}));
 const selector=document.querySelector('#seletor-data');
 const fmt=date=>{try{return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}catch{return date}};
 const themeItems=id=>meditations.filter(item=>item.theme.id===id);
 let selectedThemeId=null;
 let openedFromJourney=false;

 function currentItem(){return meditations[Number(selector?.value)]||meditations.at(-1)||null}
 function setView(view,{updateHash=true}={}){
  const journey=view==='journey';
  root.hidden=!journey;
  dayView.hidden=journey;
  dayTab?.classList.toggle('active',!journey);
  journeyTab?.classList.toggle('active',journey);
  dayTab?.setAttribute('aria-selected',journey?'false':'true');
  journeyTab?.setAttribute('aria-selected',journey?'true':'false');
  if(journey){
   renderJourney();
   requestAnimationFrame(()=>root.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  if(updateHash){
   const hash=journey?'#jornada':'#meditacao';
   history.replaceState(null,'',`${location.pathname}${location.search}${hash}`);
  }
 }
 function openIndex(index){
  if(!selector)return;
  selector.value=String(index);
  selector.dispatchEvent(new Event('change',{bubbles:true}));
  setView('day');
  openedFromJourney=true;
  const item=meditations[index];
  if(returnBar){returnBar.hidden=false}
  if(returnText&&item){returnText.textContent=`Você abriu ${fmt(item.data)} a partir de ${item.theme.label}.`}
  requestAnimationFrame(()=>document.querySelector('.devotional-book')?.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 function renderJourney(){
  const current=currentItem();
  if(!selectedThemeId)selectedThemeId=current?.theme?.id||themes.find(theme=>themeItems(theme.id).length)?.id||'fe';
  if(!themeItems(selectedThemeId).length){selectedThemeId=themes.find(theme=>themeItems(theme.id).length)?.id||'fe'}
  const selected=byId(selectedThemeId);
  const list=themeItems(selectedThemeId);
  const total=meditations.length;
  const occupied=themes.filter(theme=>themeItems(theme.id).length).length;
  root.innerHTML=`
   <div class="meditation-journey-v782__head">
    <div>
     <p class="eyebrow">Minha jornada nas meditações</p>
     <h1>O que você já trabalhou com Deus</h1>
     <p>Os assuntos abaixo organizam as meditações publicadas. Aqui não existe porcentagem de conclusão: o objetivo é lembrar por onde você já caminhou e voltar a qualquer dia quando quiser.</p>
    </div>
    <div class="meditation-journey-v782__summary" aria-label="Resumo da jornada">
     <strong>${total}</strong><span>meditações</span><small>${occupied} assuntos com conteúdo</small>
    </div>
   </div>
   <div class="meditation-theme-strip meditation-theme-strip--counts" aria-label="Assuntos das meditações">
    ${themes.map(theme=>{const count=themeItems(theme.id).length;return `<button type="button" class="meditation-theme-chip ${theme.id===selectedThemeId?'active':''}" data-theme="${theme.id}" ${count?'':'disabled'}><span class="meditation-theme-chip__top"><span class="meditation-theme-chip__icon">${theme.icon}</span><span class="meditation-theme-chip__count">${count}</span></span><strong>${theme.label}</strong><small>${count===1?'1 meditação':`${count} meditações`}</small></button>`}).join('')}
   </div>
   <section class="meditation-topic-history">
    <header class="meditation-topic-history__head">
     <div><p class="eyebrow">${selected.icon} ${selected.label}</p><h2>${list.length===1?'1 meditação neste assunto':`${list.length} meditações neste assunto`}</h2><p>${selected.description} Cada registro abaixo mostra o foco daquele dia.</p></div>
    </header>
    <div class="meditation-topic-history__list">
     ${list.length?list.slice().reverse().map(item=>`<button type="button" class="meditation-history-item ${current?.index===item.index?'current':''}" data-index="${item.index}"><span class="meditation-history-item__date">${fmt(item.data)}</span><span class="meditation-history-item__body"><strong>${esc(item.focus)}</strong><small>Abrir esta meditação →</small></span></button>`).join(''):'<p class="muted">Ainda não há meditações classificadas neste assunto.</p>'}
    </div>
   </section>`;
  root.querySelectorAll('[data-theme]').forEach(button=>button.addEventListener('click',()=>{selectedThemeId=button.dataset.theme;renderJourney()}));
  root.querySelectorAll('[data-index]').forEach(button=>button.addEventListener('click',()=>openIndex(Number(button.dataset.index))));
 }

 dayTab?.addEventListener('click',()=>setView('day'));
 journeyTab?.addEventListener('click',()=>{openedFromJourney=false;if(returnBar)returnBar.hidden=true;setView('journey')});
 returnButton?.addEventListener('click',()=>{openedFromJourney=false;if(returnBar)returnBar.hidden=true;setView('journey')});
 selector?.addEventListener('change',()=>{
  const item=currentItem();
  if(item&&!openedFromJourney)selectedThemeId=item.theme.id;
 });

 let attempts=0;
 const ready=setInterval(()=>{
  attempts++;
  if(selector?.options?.length){
   clearInterval(ready);
   const initial=location.hash==='#jornada'?'journey':'day';
   setView(initial,{updateHash:false});
  }else if(attempts>80){
   clearInterval(ready);
   root.innerHTML='<p class="muted">A jornada temática não pôde ser carregada agora. A meditação continua disponível.</p>';
  }
 },120);
})().catch(error=>{console.error(error);const root=document.querySelector('#meditation-journey');if(root)root.innerHTML='<p class="muted">A jornada temática não pôde ser carregada agora. A meditação continua disponível abaixo.</p>'});
