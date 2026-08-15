"use strict";
(async()=>{
 const $=selector=>document.querySelector(selector);
 const waitFor=(test,timeout=8000)=>new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{try{const value=test();if(value){clearInterval(timer);resolve(value);return}}catch{}if(Date.now()-start>=timeout){clearInterval(timer);reject(new Error('Dependências do Mapa de Cuidado demoraram para carregar.'))}},60)});
 await waitFor(()=>window.MemoryCare&&window.MMCD&&window.MMCDAuth);
 const C=window.MemoryCare;
 const today=C.today(),todayIso=C.iso(today),days7=C.range(7,today),days30=C.range(30,today);
 const nodes=$('#care-map-nodes'),center=$('#care-map-center'),detail=$('#care-map-detail'),updated=$('#care-map-updated'),insightsEl=$('#care-map-insights');
 if(!nodes||!center||!detail)return;

 const dimensions=[
  {key:'spiritual',icon:'🙏',name:'Espiritual',question:'Tenho separado espaço para Deus e para aquilo que sustenta minha fé?',score:null,observes:'Meditação, Bíblia, oração e outras práticas espirituais que você cadastrou.',evidence:'Carregando seus registros recentes…',actions:[{label:'Fazer a meditação de hoje',href:'meditacao.html',primary:true},{label:'Abrir Minhas Orações',href:'oracoes.html'}]},
  {key:'body',icon:'🏃',name:'Corpo',question:'Meu corpo recebeu movimento, treino e cuidado físico nesta semana?',score:null,observes:'Treinos e atividades físicas que fazem parte da sua rotina.',evidence:'Carregando seus registros recentes…',actions:[{label:'Abrir treino de hoje',href:'treinos.html#hoje',primary:true},{label:'Ver atividades',href:'atividades.html'}]},
  {key:'mind',icon:'🧠',name:'Mente',question:'Tenho criado espaço para desacelerar, perceber o que sinto e diminuir o ruído?',score:null,observes:'Registros de reflexão e atividades relacionadas a descanso, lazer ou cuidado mental.',evidence:'Carregando seus registros recentes…',actions:[{label:'Fazer uma pausa guiada de 1 minuto',action:'pause',primary:true},{label:'Registrar como estou',href:'painel.html'}]},
  {key:'relationships',icon:'❤️',name:'Relacionamentos',question:'Tenho estado presente para as pessoas que eu disse que são importantes?',score:null,observes:'As pessoas e frequências que você definiu no Círculo de Cuidado.',evidence:'Carregando seus registros recentes…',actions:[{label:'Ver quem merece presença',href:'circulo-cuidado.html',primary:true}]},
  {key:'development',icon:'📚',name:'Desenvolvimento',question:'Tenho reservado energia para aprender e avançar no que quero construir?',score:null,observes:'Metas de estudo, leitura, cursos e sua evolução no Inglês.',evidence:'Carregando seus registros recentes…',actions:[{label:'Abrir Inglês diário',href:'ingles.html',primary:true},{label:'Abrir Livros',href:'livros.html'}]},
  {key:'memories',icon:'✨',name:'Memórias',question:'Tenho registrado aquilo que eu não quero deixar desaparecer na correria?',score:null,observes:'Registro rápido do dia e pedidos marcados como respondidos em Memórias de Deus.',evidence:'Carregando seus registros recentes…',actions:[{label:'Fazer um registro rápido',href:'painel.html',primary:true},{label:'Abrir Memórias de Deus',href:'oracoes.html'}]}
 ];

 const state=dim=>{if(dim.loading)return{label:'Atualizando sinais',cls:'is-loading'};if(dim.score==null)return{label:'Pouca evidência',cls:'is-empty'};if(dim.score>=55)return{label:'Com sinais recentes',cls:'is-present'};return{label:'Merece atenção',cls:'is-light'}};
 dimensions.forEach(dim=>dim.loading=true);
 let lockedKey=null;
 let profileView={src:'',initial:'V',name:'Você'};

 function profileMarkup(){return profileView.src?`<span class="memory-map-center__avatar"><img src="${C.esc(profileView.src)}" alt="Foto do perfil"></span>`:`<span class="memory-map-center__avatar memory-map-center__avatar--fallback" aria-hidden="true">${C.esc(profileView.initial)}</span>`}
 function renderCenter(dim){
  center.classList.remove('is-selected','is-present','is-light','is-empty','is-loading');
  if(!dim){
   center.innerHTML=`<span class="memory-map-center__portrait">${profileMarkup()}<span class="memory-map-center__badge">∞</span></span><span class="memory-map-center__eyebrow">Você no centro</span><strong>${C.esc(profileView.name)}</strong><small>Seu cuidado começa daqui. Passe o mouse em um card.</small>`;
   center.setAttribute('aria-label','Você no centro do Mapa de Cuidado. Passe o mouse em uma área para aprofundar.');
   return;
  }
  const st=state(dim);center.classList.add('is-selected',st.cls);
  const symbol=dim.key==='relationships'?(st.cls==='is-present'?'♥':'♡'):dim.icon;
  center.innerHTML=`<span class="memory-map-center__portrait">${profileMarkup()}<span class="memory-map-center__badge">${symbol}</span></span><span class="memory-map-center__eyebrow">${C.esc(dim.name)}</span><strong>${C.esc(st.label)}</strong><small>${C.esc(dim.question)}</small>`;
  center.setAttribute('aria-label',`${dim.name}. ${st.label}. ${dim.question}`);
 }
 function neutralDetail(){detail.innerHTML=`<div class="memory-map-detail__neutral"><span class="memory-map-detail__neutral-icon">∞</span><p class="memory-care-eyebrow">Leitura rápida</p><h3>Você continua no centro</h3><p>Passe o mouse em um dos seis cards. A sua foto permanece no centro e o anel muda para mostrar o estado daquela dimensão.</p><div class="memory-map-detail__legend"><span><i class="present"></i>Com sinais recentes</span><span><i class="light"></i>Merece atenção</span><span><i class="empty"></i>Pouca evidência</span></div></div>`}
 function actionHtml(action){if(action.action==='pause')return `<button type="button" class="memory-map-action ${action.primary?'primary':''}" data-care-action="pause"><span>${C.esc(action.label)}</span><b>→</b></button>`;return `<a class="memory-map-action ${action.primary?'primary':''}" href="${C.esc(action.href)}"><span>${C.esc(action.label)}</span><b>→</b></a>`}
 function markActive(key){nodes.querySelectorAll('.memory-map-node').forEach(node=>node.classList.toggle('is-active',!!key&&node.dataset.careKey===key))}
 function renderDetail(dim,mark=true){if(!dim){neutralDetail();if(mark)markActive(null);return}const st=state(dim);detail.innerHTML=`<div class="memory-map-detail__top"><span class="memory-map-detail__icon">${dim.icon}</span><span class="memory-map-detail__eyebrow">${C.esc(st.label)}</span><h3>${C.esc(dim.name)}</h3><p class="memory-map-detail__question">${C.esc(dim.question)}</p></div><div class="memory-map-detail__block"><h4>O que o Memory observa</h4><p>${C.esc(dim.observes)}</p></div><div class="memory-map-detail__block"><h4>O que seus registros mostram</h4><p class="memory-map-detail__evidence">${C.esc(dim.evidence)}</p></div><div class="memory-map-detail__block"><h4>Para cuidar hoje</h4><div class="memory-map-detail__actions">${dim.actions.map(actionHtml).join('')}</div></div><small class="memory-map-detail__hint">O mapa organiza sinais dos seus próprios registros. Ele não transforma cuidado em obrigação.</small>`;if(mark)markActive(dim.key)}
 function getDim(node){return dimensions.find(item=>item.key===node?.dataset?.careKey)}
 function hoverDim(node){if(lockedKey)return;const dim=getDim(node);renderDetail(dim);renderCenter(dim)}
 function resetHover(){if(lockedKey)return;renderCenter(null);renderDetail(null)}
 function bindNodes(){nodes.querySelectorAll('.memory-map-node').forEach(node=>{node.addEventListener('mouseenter',()=>hoverDim(node));node.addEventListener('mouseleave',resetHover);node.addEventListener('focus',()=>hoverDim(node));node.addEventListener('blur',resetHover);node.addEventListener('click',()=>{const dim=getDim(node);if(!dim)return;if(lockedKey===dim.key){lockedKey=null;renderCenter(null);renderDetail(null);return}lockedKey=dim.key;renderDetail(dim);renderCenter(dim)})})}
 function renderNodes(){nodes.innerHTML=dimensions.map(dim=>{const st=state(dim);return `<button type="button" class="memory-map-node" data-care-key="${dim.key}" aria-label="Ver detalhes de ${C.esc(dim.name)}"><span class="memory-map-node__head"><span class="memory-map-node__icon">${dim.icon}</span><span class="memory-map-node__copy"><strong>${C.esc(dim.name)}</strong><small>${C.esc(dim.question)}</small></span></span><span class="memory-map-node__status ${st.cls}">${C.esc(st.label)}</span></button>`}).join('');bindNodes();if(lockedKey)markActive(lockedKey)}

 renderNodes();renderCenter(null);neutralDetail();if(updated)updated.textContent='Atualizando sinais…';if(insightsEl)insightsEl.innerHTML='<div class="memory-care-note">O mapa já está disponível. Os sinais dos seus registros estão sendo carregados em segundo plano.</div>';

 async function loadProfile(){
  try{
   const session=await Promise.race([window.MMCDAuth.requireSession(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),5000))]);
   const user=session?.user;if(!user)return;
   const profile=await Promise.race([window.MMCDAuth.loadProfile(user),new Promise(resolve=>setTimeout(()=>resolve({}),4500))]);
   const name=String(profile?.nome||user?.user_metadata?.full_name||user?.user_metadata?.name||user?.user_metadata?.user_name||user?.email?.split('@')[0]||'Você').trim();
   profileView={src:profile?.avatarDataUrl||user?.user_metadata?.avatar_url||user?.user_metadata?.picture||'',initial:(name[0]||'V').toUpperCase(),name};
   renderCenter(lockedKey?dimensions.find(item=>item.key===lockedKey):null);
  }catch{renderCenter(lockedKey?dimensions.find(item=>item.key===lockedKey):null)}
 }
 loadProfile();

 const timeout=(promise,ms,fallback)=>Promise.race([promise,new Promise(resolve=>setTimeout(()=>resolve(fallback),ms))]);
 const safeRead=(key,fallback)=>timeout(C.read(key,fallback).catch(()=>fallback),5000,fallback);
 let signalLoadError=null;
 try{
  const d=await timeout(window.MMCD.carregar().catch(error=>{signalLoadError=error;return {metas:[]}}),7000,{metas:[]});
  const [prayers,circle,journal,english,workouts,englishSummary]=await Promise.all([
   safeRead('memory_oracoes_v1',{itens:[]}),safeRead('memory_circulo_cuidado_v1',{itens:[]}),safeRead('diario_rapido_v1',{registros:[]}),safeRead('ingles_conversas_v1',{sessoes:[]}),safeRead('treino_sessoes_v1',{sessoes:[]}),safeRead('ingles_evolucao_v1',{})
  ]);
  const norm=value=>C.normalizeName(value),textMeta=meta=>norm(`${meta?.nome||''} ${meta?.categoria||''} ${meta?.descricao||''}`);
  function activitySignal(words,windowDays=days7){const metas=(d?.metas||[]).filter(meta=>words.some(word=>textMeta(meta).includes(word)));let expected=0,done=0;for(const date of windowDays)for(const meta of metas){try{if(!window.MMCD.ativaNaData(meta,date))continue;const row=window.MMCD.registro(d,date,meta.id);if(window.MMCD.estaAbonada(row))continue;expected++;if(row?.concluida)done++}catch{}}if(!metas.length||!expected)return{score:null,done,expected,count:metas.length};return{score:C.clamp(Math.round(done/expected*100)),done,expected,count:metas.length}}
  const spiritual=activitySignal(['deus','biblia','oracao','meditacao','devocional','igreja']);
  const body=activitySignal(['treino','academia','futebol','jiu','corrida','cardio','caminhada','saude','peso']);
  const mindAct=activitySignal(['mente','mental','terapia','descanso','lazer','respira','relax','sono','mindfulness']);
  const development=activitySignal(['ingles','estudo','leitura','livro','curso','python','estatistica','prf','desenvolvimento']);
  const recentJournal7=(journal?.registros||[]).filter(item=>item?.data&&days7.includes(item.data));
  const recentJournal30=(journal?.registros||[]).filter(item=>item?.data&&days30.includes(item.data));
  const circleItems=(circle?.itens||[]).filter(item=>item?.ativo!==false);let circleOk=0;
  for(const person of circleItems){if(!person.ultimoCuidado)continue;const since=C.daysBetween(String(person.ultimoCuidado).slice(0,10),todayIso);if(since!=null&&since<Number(person.frequenciaDias||7))circleOk++}
  const convSessions=Array.isArray(english?.sessoes)?english.sessoes:Array.isArray(english?.sessions)?english.sessions:[];
  const recentConv=convSessions.filter(item=>String(item?.data||item?.date||item?.createdAt||item?.criadoEm||'').slice(0,10)>=days30[0]).length;
  const workoutSessions=Array.isArray(workouts?.sessoes)?workouts.sessoes:[];
  const recentWorkouts=workoutSessions.filter(item=>days7.includes(String(item?.data||'').slice(0,10))&&['concluido','parcial'].includes(item?.status)).length;
  const answeredRecent=(prayers?.itens||[]).filter(item=>item?.status==='respondida'&&days30.includes(String(item?.respondidoEm||'').slice(0,10))).length;
  const mix=(...values)=>{const valid=values.filter(Number.isFinite);return valid.length?C.clamp(Math.round(valid.reduce((a,b)=>a+b,0)/valid.length)):null};
  const journalMindScore=recentJournal7.length?C.clamp(Math.round(recentJournal7.length/4*100)):null;
  const relationshipScore=circleItems.length?C.clamp(Math.round(circleOk/circleItems.length*100)):null;
  const englishScore=Number.isFinite(Number(englishSummary?.overall))?C.clamp(Math.round(Number(englishSummary.overall))):(recentConv?C.clamp(recentConv*20):null);
  const memoryScore=(recentJournal30.length||answeredRecent)?C.clamp(Math.round(Math.min(1,(recentJournal30.length+answeredRecent*2)/8)*100)):null;
  const bodyScore=body.score==null?(recentWorkouts?C.clamp(Math.round(recentWorkouts/4*100)):null):mix(body.score,recentWorkouts?C.clamp(recentWorkouts*25):null);
  const updates={
   spiritual:{score:spiritual.score,evidence:spiritual.score==null?'Ainda há poucos registros recentes para formar um sinal.':`${spiritual.done} de ${spiritual.expected} práticas espirituais previstas foram concluídas nos últimos 7 dias.`},
   body:{score:bodyScore,evidence:bodyScore==null?'Treinos e cuidados físicos começam a formar este sinal quando há registros.':`${recentWorkouts} treino(s) recente(s) e ${body.done}/${body.expected||body.done} cuidados físicos previstos.`},
   mind:{score:mix(mindAct.score,journalMindScore),evidence:(mindAct.score==null&&!recentJournal7.length)?'Ainda não há registros suficientes. Isso não significa que sua mente esteja mal — apenas que o Memory tem pouca evidência.':`${recentJournal7.length} reflexão(ões) rápida(s) nos últimos 7 dias${mindAct.expected?` e ${mindAct.done}/${mindAct.expected} atividades relacionadas ao cuidado mental`:''}.`},
   relationships:{score:relationshipScore,evidence:circleItems.length?`${circleOk} de ${circleItems.length} pessoa(s) estão dentro da frequência de cuidado definida por você.`:'Você ainda não cadastrou pessoas no Círculo de Cuidado.'},
   development:{score:mix(development.score,englishScore),evidence:development.score==null&&englishScore==null?'Ainda não há evidência suficiente para formar um sinal recente.':`${development.expected?`${development.done}/${development.expected} práticas de estudo previstas`:'Sem metas de estudo previstas'}${englishScore!=null?` · Inglês ${englishScore}%`:''}.`},
   memories:{score:memoryScore,evidence:`${recentJournal30.length} registro(s) rápido(s) e ${answeredRecent} Memória(s) de Deus nos últimos 30 dias.`}
  };
  dimensions.forEach(dim=>{Object.assign(dim,updates[dim.key]||{});dim.loading=false});
  renderNodes();renderCenter(lockedKey?dimensions.find(item=>item.key===lockedKey):null);if(lockedKey)renderDetail(dimensions.find(item=>item.key===lockedKey));else renderDetail(null);
  const scored=dimensions.filter(item=>item.score!=null),light=scored.filter(item=>item.score<55),present=scored.filter(item=>item.score>=55),insights=[];
  if(light.length){const dim=[...light].sort((a,b)=>a.score-b.score)[0];insights.push([dim.icon,`${dim.name} merece um olhar hoje`,'Não é uma nota ruim. É apenas a área com menos sinais recentes entre as que o Memory conseguiu ler.'])}
  if(present.length){const dim=[...present].sort((a,b)=>b.score-a.score)[0];insights.push([dim.icon,`${dim.name} tem presença recente`,'Vale perceber o que tornou esse cuidado mais natural e proteger essa rotina.'])}
  if(circleItems.length&&circleOk<circleItems.length)insights.push(['❤️','Há pessoas fora da frequência de cuidado',`${circleItems.length-circleOk} pessoa(s) estão fora da frequência que você mesmo definiu no Círculo.`]);
  if(!insights.length)insights.push(['✨','O mapa ainda está aprendendo com seus registros','Continue usando o Memory normalmente. Quando faltar evidência, ele prefere dizer isso a inventar uma conclusão.']);
  if(insightsEl)insightsEl.innerHTML=insights.slice(0,3).map(item=>`<div class="memory-care-row"><span class="memory-care-row__icon">${item[0]}</span><div class="memory-care-row__copy"><strong>${C.esc(item[1])}</strong><small>${C.esc(item[2])}</small></div></div>`).join('');
  if(updated)updated.textContent=signalLoadError?'Sinais parciais · mapa disponível':`Últimos 7 dias · atualizado ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
 }catch(error){
  console.error('Mapa de Cuidado: falha ao hidratar sinais',error);dimensions.forEach(dim=>{dim.loading=false;dim.score=null;dim.evidence='Os registros não responderam agora. O mapa continua disponível e tentará novamente na próxima abertura.'});renderNodes();renderCenter(null);renderDetail(null);if(updated)updated.textContent='Sinais indisponíveis agora';if(insightsEl)insightsEl.innerHTML='<div class="memory-care-note">Os dados recentes não responderam, mas o Mapa de Cuidado continua disponível. Nenhuma informação foi apagada.</div>';
 }

 function ensurePause(){let layer=document.querySelector('#memory-map-pause');if(layer)return layer;layer=document.createElement('div');layer.id='memory-map-pause';layer.className='memory-map-pause';layer.hidden=true;layer.innerHTML=`<div class="memory-map-pause__card" role="dialog" aria-modal="true" aria-labelledby="memory-pause-title"><p class="memory-care-eyebrow">Pausa de 1 minuto</p><h2 id="memory-pause-title" style="margin:0">Um minuto sem resolver nada</h2><div id="memory-pause-timer" class="memory-map-pause__timer">1:00</div><div id="memory-pause-guide" class="memory-map-pause__guide">Solte os ombros e perceba sua respiração do jeito que ela está.</div><div class="memory-map-pause__actions"><button type="button" data-pause-close>Encerrar</button></div></div>`;document.body.append(layer);return layer}
 let pauseInterval=null;
 function startPause(){const layer=ensurePause(),timer=layer.querySelector('#memory-pause-timer'),guide=layer.querySelector('#memory-pause-guide');clearInterval(pauseInterval);let remaining=60;const update=()=>{timer.textContent=`0:${String(remaining).padStart(2,'0')}`;if(remaining>45)guide.textContent='Solte os ombros e perceba sua respiração do jeito que ela está.';else if(remaining>30)guide.textContent='Inspire devagar. Ao soltar o ar, não tente pensar em outra tarefa.';else if(remaining>15)guide.textContent='Perceba o que está ocupando sua cabeça, sem precisar resolver agora.';else if(remaining>0)guide.textContent='Escolha apenas uma coisa que merece sua presença depois desta pausa.';else guide.textContent='Pronto. Volte no seu ritmo.'};update();layer.hidden=false;pauseInterval=setInterval(()=>{remaining--;update();if(remaining<=0)clearInterval(pauseInterval)},1000);layer.querySelector('[data-pause-close]').onclick=()=>{clearInterval(pauseInterval);layer.hidden=true}}
 detail.addEventListener('click',event=>{if(event.target.closest('[data-care-action="pause"]'))startPause()});
})().catch(error=>{console.error(error);const updated=document.querySelector('#care-map-updated');if(updated)updated.textContent='Mapa temporariamente indisponível';const el=document.querySelector('#care-map');if(el&&!el.querySelector('.memory-map-fallback'))el.insertAdjacentHTML('beforeend',`<div class="memory-care-note memory-map-fallback" style="margin:18px">O Mapa de Cuidado não conseguiu iniciar: ${String(error.message||error)}</div>`)});
