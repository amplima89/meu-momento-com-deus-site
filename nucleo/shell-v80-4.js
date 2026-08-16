"use strict";
window.MMCDShell=async function(active){
 window.MemoryConfigReady=window.MemoryConfigReady||new Promise(resolve=>{
  if(window.MemoryConfig){resolve(window.MemoryConfig);return;}
  const existing=document.querySelector('script[data-memory-config-v68]');
  if(existing){
   existing.addEventListener('load',()=>resolve(window.MemoryConfig||null),{once:true});
   existing.addEventListener('error',()=>resolve(null),{once:true});
   return;
  }
  const script=document.createElement('script');
  script.src='modulos/memory/memory-config-v68.js?v=20260814-2355-v68';
  script.dataset.memoryConfigV68='1';
  script.onload=()=>resolve(window.MemoryConfig||null);
  script.onerror=()=>resolve(null);
  document.head.append(script);
 });
 // V80: identidade visual oficial do Memory — #A78BFA + #60D5FF sobre azul-marinho profundo.
 if(!document.querySelector('link[data-memory-original-v80]')){
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='modulos/memory/memory-original-v80.css?v=20260816-v80';
  css.dataset.memoryOriginalV80='1';
  document.head.append(css);
 }
 // V79: camada semântica comum para os temas e componentes do Memory.
 if(!document.querySelector('link[data-memory-v79]')){
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='nucleo/memory-v79.css?v=20260815-v79';
  css.dataset.memoryV79='1';
  document.head.append(css);
 }
 if(!window.MMCDTheme?.getCatalog?.().some?.(item=>item.id==='memory-original')){
  await new Promise(resolve=>{
   const existing=document.querySelector('script[data-memory-theme-v80]');
   if(existing){
    if(window.MMCDTheme?.getCatalog?.().some?.(item=>item.id==='memory-original')) resolve();
    else existing.addEventListener('load',resolve,{once:true});
    return;
   }
   const script=document.createElement('script');
   script.src='nucleo/theme-system-v80.js?v=20260816-v80';
   script.dataset.memoryThemeV80='1';
   script.onload=resolve;
   script.onerror=resolve;
   document.head.append(script);
  });
 }
 const nav=[
  ['missoes','painel.html','01','🎯','Missões','Visão da vida','Missões'],
  ['atividades','atividades.html','02','✅','Atividades','Rotina diária','Atividades'],
  ['meditacao','meditacao.html','03','🙏','Devocional','Momento com Deus','Devocional'],
  ['biblia','biblia.html','04','📖','Bíblia','Leitura e anotações','Bíblia'],
  ['ingles','ingles.html','06','🇬🇧','Inglês diário','Aula adaptativa','Inglês'],
  ['treinos','treinos.html#hoje','07','🏋️','Treinos','Plano de treino','Treinos'],
  ['livros','livros.html','08','📚','Livros','Biblioteca','Livros'],
  ['estatisticas','relatorios.html','09','📊','Estatísticas','Evolução','Evolução']
 ];
 const settingsKeys=['configuracoes','aparencia','medidas','metas','perfil','series','treinos-config','meditacao-links'];
 const settingsActive=settingsKeys.includes(active);
 const careKeys=['mapa-cuidado','arvore-da-vida','aniversarios','boas-acoes','circulo-cuidado','oracoes','registro-rapido','testemunhos'];
 const careActive=careKeys.includes(active);
 const mobileMemoryHtml=`
  <a class="sidebar-link sidebar-memory-mobile ${active==='memory'?'active':''}" href="memory.html?v=20260815-v76" aria-label="Abrir Memory">
   <span class="sidebar-link__icon sidebar-memory-mobile__icon"><img src="assets/imagens/memory-mark-official-v80-1.png?v=20260816-v80-1" alt=""></span>
   <div class="sidebar-link__copy"><strong>Memory</strong><small>Propósito e essência</small></div>
   <span class="sidebar-mobile-label">Memory</span>
   <span class="sidebar-link__arrow" aria-hidden="true">›</span>
  </a>`;
 const renderNavItem=x=>`
  <a class="sidebar-link ${active===x[0]?'active':''}" href="${x[1]}">
   <span class="sidebar-link__icon"><span class="sidebar-icon-desktop">${x[2]}</span><span class="sidebar-icon-mobile" aria-hidden="true">${x[3]}</span></span>
   <div class="sidebar-link__copy"><strong>${x[4]}</strong><small>${x[5]}</small></div>
   <span class="sidebar-mobile-label">${x[6]}</span>
   <span class="sidebar-link__arrow" aria-hidden="true">›</span>
  </a>`;
 const bibleIndex=nav.findIndex(item=>item[0]==='biblia');
 const navBeforeCareHtml=nav.slice(0,bibleIndex+1).map(renderNavItem).join('');
 const navAfterCareHtml=nav.slice(bibleIndex+1).map(renderNavItem).join('');
 const sidebarHtml=`
  <aside class="sidebar sidebar-v24">
   <a class="sidebar-brand" href="memory.html?v=20260815-v76" aria-label="Abrir propósito e essência do Memory" title="Abrir Memory">
    <span class="sidebar-brand__mark">
     <img src="assets/imagens/memory-mark-official-v80-1.png?v=20260816-v80-1" alt="Memory">
     <span class="sidebar-brand__fallback" aria-hidden="true">M</span>
    </span>
    <div class="sidebar-brand__copy">
     <strong>Memory</strong>
     <small>cuidado e evolução</small>
    </div>
   </a>
   <div class="sidebar-nav__section-label">PRINCIPAL</div>
   <nav class="sidebar-nav" aria-label="Navegação principal">
    ${mobileMemoryHtml}
    ${navBeforeCareHtml}
    <div class="sidebar-settings sidebar-care-group ${careActive?'open':''}">
     <a href="mapa-cuidado.html?v=20260816-v79-9" class="sidebar-link sidebar-settings__toggle ${careActive?'active':''}" aria-expanded="${careActive?'true':'false'}" aria-controls="sidebar-care-menu" title="Abrir Mapa de Cuidado">
      <span class="sidebar-link__icon"><span class="sidebar-icon-desktop">05</span><span class="sidebar-icon-mobile" aria-hidden="true">♡</span></span>
      <div class="sidebar-link__copy"><strong>Cuidado</strong><small>Você por inteiro</small></div>
      <span class="sidebar-mobile-label">Cuidado</span><span class="sidebar-settings__chevron" aria-hidden="true">›</span>
     </a>
     <div class="sidebar-subnav ${careActive?'open':''}" id="sidebar-care-menu" ${careActive?'':'hidden'}>
      <a class="sidebar-subnav__link ${active==='mapa-cuidado'||active==='arvore-da-vida'?'active':''}" href="mapa-cuidado.html?v=20260816-v79-9"><span class="sidebar-subnav__dot"></span><span><strong>Mapa de Cuidado</strong><small>Visão integral</small></span></a>
      <a class="sidebar-subnav__link ${active==='aniversarios'?'active':''}" href="aniversarios.html?v=20260816-v79-9"><span class="sidebar-subnav__dot"></span><span><strong>Aniversariantes</strong><small>Datas e gestos de cuidado</small></span></a>
      <a class="sidebar-subnav__link ${active==='boas-acoes'?'active':''}" href="boas-acoes.html?v=20260816-v79-9"><span class="sidebar-subnav__dot"></span><span><strong>Boas Ações</strong><small>Cuidado colocado em prática</small></span></a>
      <a class="sidebar-subnav__link ${active==='circulo-cuidado'?'active':''}" href="circulo-cuidado.html?v=20260816-v80-4"><span class="sidebar-subnav__dot"></span><span><strong>Relacionamentos</strong><small>Presença com quem importa</small></span></a>
      <a class="sidebar-subnav__link ${active==='oracoes'?'active':''}" href="oracoes.html?v=20260816-v79-9"><span class="sidebar-subnav__dot"></span><span><strong>Minhas Orações</strong><small>Pedidos e Memórias de Deus</small></span></a>
      <a class="sidebar-subnav__link ${active==='registro-rapido'?'active':''}" href="registro-rapido.html?v=20260816-v80-4"><span class="sidebar-subnav__dot"></span><span><strong>Registro rápido</strong><small>Memória de curto prazo</small></span></a>
      <a class="sidebar-subnav__link ${active==='testemunhos'?'active':''}" href="testemunhos.html?v=20260816-v79-9"><span class="sidebar-subnav__dot"></span><span><strong>Testemunhos</strong><small>Memórias do que Deus fez</small></span></a>
     </div>
    </div>
    ${navAfterCareHtml}
    <div class="sidebar-nav__section-label sidebar-nav__section-label--system">GESTÃO</div>
    <a class="sidebar-link ${settingsActive?'active':''}" href="configuracoes.html?v=20260815-v79">
     <span class="sidebar-link__icon"><span class="sidebar-icon-desktop">10</span><span class="sidebar-icon-mobile" aria-hidden="true">⚙️</span></span>
     <div class="sidebar-link__copy"><strong>Configurações</strong><small>Preferências e cadastros</small></div>
     <span class="sidebar-mobile-label">Ajustes</span>
     <span class="sidebar-link__arrow" aria-hidden="true">›</span>
    </a>
   </nav>
   <div class="sidebar-summary">
    <span class="sidebar-summary__line"></span>
    <span>Fé, disciplina e evolução.</span>
    <small>Um dia de cada vez.</small>
   </div>
  </aside>`;
 if(!document.querySelector('#memory-brand-v48-style')){
  const brandStyle=document.createElement('style');
  brandStyle.id='memory-brand-v48-style';
  brandStyle.textContent=`
   .sidebar-v24 .sidebar-brand{
    border-radius:13px;
    transition:background .18s ease,border-color .18s ease,transform .18s ease;
   }
   .sidebar-v24 .sidebar-brand:hover{
    background:rgba(255,255,255,.035);
    border-bottom-color:rgba(116,216,244,.24);
   }
   .sidebar-v24 .sidebar-brand:active{transform:translateY(1px)}
   .sidebar-v24 .sidebar-brand__copy strong{
    font-family:Inter,"Segoe UI",Arial,sans-serif;
    font-size:1.02rem;
    font-weight:620;
    letter-spacing:-.018em;
    line-height:1.05;
    text-transform:none;
   }
   .sidebar-v24 .sidebar-brand__copy small{
    margin-top:5px;
    font-size:.51rem;
    font-weight:580;
    letter-spacing:.075em;
    text-transform:none;
    color:#8793a7;
   }
   .sidebar-memory-mobile{display:none!important}
   .sidebar-memory-mobile__icon{overflow:hidden;padding:0!important;background:#071a39!important;border-color:rgba(116,216,244,.22)!important}
  
 .sidebar-v24 .sidebar-brand__mark img{object-fit:contain!important;padding:5px!important}
 .sidebar-memory-mobile__icon img{display:block;width:100%;height:100%;object-fit:contain;border-radius:0;padding:4px}
   .memory-topbar-brand{display:inline-flex;align-items:center;gap:8px;color:inherit;text-decoration:none}
   .memory-topbar-brand img{display:none;width:30px;height:30px;border-radius:9px;object-fit:contain;padding:4px;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));background:#000717}
   .memory-topbar-brand span{font:650 .82rem/1 Inter,"Segoe UI",Arial,sans-serif;letter-spacing:.015em;text-transform:none}
   @media(max-width:760px){
    .sidebar-v24 .sidebar-memory-mobile{display:grid!important}
    .memory-topbar-brand img{display:block}
    .app-topbar__title{letter-spacing:0!important}
    .memory-topbar-brand span{font-size:.88rem;color:var(--text)}
   }
  `;
  document.head.append(brandStyle);
 }
 document.body.insertAdjacentHTML('afterbegin',sidebarHtml);
 document.body.classList.add('app-body');

 // V63 — isolamento forte de gestos no mobile.
 // A navegacao so pode acontecer se o MESMO gesto tiver comecado e terminado
 // no proprio item de menu. Cliques sinteticos/"ghost clicks" gerados depois
 // de tocar em botoes, inputs, selects, labels ou controles das Configuracoes
 // nao recebem autorizacao para navegar.
 if(!window.__memoryMobileNavGuardV63Installed){
  window.__memoryMobileNavGuardV63Installed=true;
  const mobileGuardActive=()=>window.matchMedia?.('(max-width:760px)').matches;
  const navControl=target=>target?.closest?.('.sidebar a[href],.sidebar button,.mobile-subnav-layer a[href],.mobile-subnav-layer button');
  const appContent=target=>target?.closest?.('.app-main,main,.app-topbar');
  let gesture=null;
  let sequence=0;

  const pointFromEvent=event=>{
   const touch=event.changedTouches?.[0]||event.touches?.[0];
   return {
    x:Number(touch?.clientX ?? event.clientX ?? 0),
    y:Number(touch?.clientY ?? event.clientY ?? 0)
   };
  };
  const hitNav=(x,y)=>{
   try{return navControl(document.elementFromPoint(x,y));}catch(_){return null;}
  };
  const clearTokens=()=>{
   document.querySelectorAll('[data-memory-nav-token]').forEach(el=>{
    delete el.dataset.memoryNavToken;
    delete el.dataset.memoryNavTokenUntil;
   });
  };
  const beginGesture=event=>{
   if(!mobileGuardActive())return;
   const point=pointFromEvent(event);
   const nav=navControl(event.target);
   sequence+=1;
   gesture={
    id:String(sequence),
    origin:nav?'nav':'content',
    nav:nav||null,
    startX:point.x,
    startY:point.y,
    startedAt:Date.now()
   };
   if(!nav) clearTokens();
  };
  const endGesture=event=>{
   if(!mobileGuardActive()||!gesture)return;
   const current=gesture;
   const point=pointFromEvent(event);
   const dx=point.x-current.startX;
   const dy=point.y-current.startY;
   const moved=Math.hypot(dx,dy);
   const elapsed=Date.now()-current.startedAt;
   if(current.origin==='nav'&&current.nav){
    const endedOn=hitNav(point.x,point.y)||navControl(event.target);
    if(endedOn===current.nav&&moved<=28&&elapsed<=1400){
     clearTokens();
     current.nav.dataset.memoryNavToken=current.id;
     current.nav.dataset.memoryNavTokenUntil=String(Date.now()+1000);
    }else{
     clearTokens();
    }
   }else{
    // Gesto nasceu no conteudo. Mesmo que a tela mude debaixo do dedo,
    // nenhum item da navegacao recebe permissao para usar esse toque.
    clearTokens();
   }
   gesture=null;
  };
  const cancelGesture=()=>{gesture=null;clearTokens();};

  if(window.PointerEvent){
   document.addEventListener('pointerdown',beginGesture,{capture:true,passive:true});
   document.addEventListener('pointerup',endGesture,{capture:true,passive:true});
   document.addEventListener('pointercancel',cancelGesture,{capture:true,passive:true});
  }else{
   document.addEventListener('touchstart',beginGesture,{capture:true,passive:true});
   document.addEventListener('touchend',endGesture,{capture:true,passive:true});
   document.addEventListener('touchcancel',cancelGesture,{capture:true,passive:true});
  }

  document.addEventListener('click',event=>{
   if(!mobileGuardActive())return;
   const nav=navControl(event.target);
   if(!nav){
    if(appContent(event.target)) clearTokens();
    return;
   }
   const token=nav.dataset.memoryNavToken;
   const until=Number(nav.dataset.memoryNavTokenUntil||0);
   const authorized=Boolean(token)&&Date.now()<=until;
   if(!authorized){
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return;
   }
   clearTokens();
  },true);

  window.MMCDMobileNavGuard={
   arm:()=>clearTokens(),
   cancel:cancelGesture,
   version:'v63'
  };

  if(!document.querySelector('#memory-mobile-guard-v63-style')){
   const style=document.createElement('style');
   style.id='memory-mobile-guard-v63-style';
   style.textContent=`@media(max-width:760px){
    .app-main button,.app-main input,.app-main select,.app-main textarea,.app-main label,.app-main a,
    .app-main [role="button"],.app-main [data-action],.app-topbar button,.app-topbar a{
     touch-action:manipulation;
     -webkit-tap-highlight-color:transparent;
    }
    .sidebar-nav{touch-action:pan-x;overscroll-behavior-x:contain}
    .sidebar-link,.sidebar-subnav__link,.mobile-subnav-layer a,.mobile-subnav-layer button{touch-action:manipulation}
   }`;
   document.head.append(style);
  }
 }
 document.querySelectorAll('.app-topbar__title').forEach(el=>{el.innerHTML='<a class="memory-topbar-brand" href="memory.html?v=20260815-v76" aria-label="Abrir Memory"><img src="assets/imagens/memory-mark-official-v80-1.png?v=20260816-v80-1" alt=""><span>Memory</span></a>'});
 const memoryTitles={
  memory:'Memory',
  missoes:'Memory - Missões',
  atividades:'Memory - Atividades',
  meditacao:'Memory - Devocional',
  biblia:'Memory - Bíblia',
  'biblia-mapa':'Memory - Mapa da Bíblia',
  ingles:'Memory - Inglês diário',
  'ingles-evolucao':'Memory - Evolução do inglês',
  treinos:'Memory - Treinos',
  livros:'Memory - Livros',
  estatisticas:'Memory - Estatísticas',
  configuracoes:'Memory - Configurações',
  aparencia:'Memory - Aparência',
  medidas:'Memory - Medições corporais',
  metas:'Memory - Metas',
  perfil:'Memory - Meu perfil',
  'treinos-config':'Memory - Plano de treino',
  series:'Memory - Séries & filmes',
  aniversarios:'Memory - Aniversários',
  'meditacao-links':'Memory - Links da devocional',
  'arvore-da-vida':'Memory - Mapa de Cuidado',
  'mapa-cuidado':'Memory - Mapa de Cuidado',
  oracoes:'Memory - Minhas Orações',
  'circulo-cuidado':'Memory - Relacionamentos',
  'boas-acoes':'Memory - Boas Ações',
  'testemunhos':'Memory - Testemunhos',
  'registro-rapido':'Memory - Registro rápido'
 };
 if(memoryTitles[active]) document.title=memoryTitles[active];
 else document.title=document.title.replace(/Life Style/gi,'Memory').replace(/\s*[—-]\s*Memory\s*$/i,'').replace(/^Memory\s*[—-]\s*/i,'Memory - ');

 // Recarrega a identidade visual sem depender do cache antigo do navegador/PWA.
 document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>{
  try{
   const url=new URL(link.getAttribute('href'),location.href);
   url.searchParams.set('memoryv','20260814-memory-v49');
   link.setAttribute('href',url.pathname.split('/').pop()+url.search);
  }catch{}
 });
 // MMCD_ENGLISH_EVOLUTION_NAV_V30_START
 const englishNavLink=document.querySelector('.sidebar-link[href^="ingles.html"]');
 if(englishNavLink&&!document.querySelector('.sidebar-english-evolution-link')){
   englishNavLink.insertAdjacentHTML('afterend',`<a class="sidebar-english-evolution-link ${active==='ingles-evolucao'?'active':''}" href="ingles-evolucao.html"><span class="sidebar-english-evolution-link__dot"></span><span class="sidebar-english-evolution-link__copy"><strong>Evolução do inglês</strong><small>Progresso e diagnóstico</small></span><span class="sidebar-english-evolution-link__arrow">›</span></a>`);
 }
 // MMCD_ENGLISH_EVOLUTION_NAV_V30_END

 // MMCD_BIBLIA_PROGRESS_NAV_V29_START
 const bibliaNavLink=document.querySelector('.sidebar-link[href^="biblia.html"]');
 const bibliaNavSmall=bibliaNavLink?.querySelector('small');

 if(bibliaNavLink&&!document.querySelector('.sidebar-bible-map-link')){
   bibliaNavLink.insertAdjacentHTML('afterend',`
    <a class="sidebar-bible-map-link ${active==='biblia-mapa'?'active':''}" href="biblia-mapa.html">
      <span class="sidebar-bible-map-link__dot" aria-hidden="true"></span>
      <span class="sidebar-bible-map-link__copy">
        <strong>Mapa da Bíblia</strong>
        <small>Progresso geral</small>
      </span>
      <span class="sidebar-bible-map-link__arrow" aria-hidden="true">›</span>
    </a>`);
 }

 window.MMCDAtualizarProgressoBiblia=function(resumo){
   if(!bibliaNavSmall)return;
   const chapters=Number(resumo?.capitulosConcluidos||0);
   const percent=Number(resumo?.percentual||0);
   if(!chapters){
     bibliaNavSmall.textContent='Leitura e anotações';
     return;
   }
   const pct=Number.isInteger(percent)?String(percent):percent.toFixed(1).replace('.',',');
   bibliaNavSmall.textContent=`${pct}% lida · ${chapters.toLocaleString('pt-BR')} cap.`;
 };

 try{
   if(window.MMCDSupabase&&window.MMCDAuth){
     const bibliaSession=await MMCDAuth.requireSession();
     const {data:bibliaProgressRow,error:bibliaProgressError}=await window.MMCDSupabase
       .from('configuracoes_usuario')
       .select('valor')
       .eq('user_id',bibliaSession.user.id)
       .eq('chave','biblia_progresso_v2')
       .maybeSingle();

     if(!bibliaProgressError){
       window.MMCDAtualizarProgressoBiblia(bibliaProgressRow?.valor?.resumo||{});
     }
   }
 }catch(bibliaProgressError){
   console.warn('Bíblia: progresso da sidebar indisponível.',bibliaProgressError);
 }
 // MMCD_BIBLIA_PROGRESS_NAV_V29_END


 // MMCD_MOBILE_SUBMENU_V32_START
 const isMobileNav=()=>window.matchMedia?.('(max-width:760px)').matches;
 let mobileSubmenuLayer=null;
 const closeMobileSubmenu=()=>{
  mobileSubmenuLayer?.remove();
  mobileSubmenuLayer=null;
 };
 const openMobileSubmenu=(menu,title='Opções')=>{
  closeMobileSubmenu();
  const links=[...menu.querySelectorAll('a')];
  if(!links.length)return;
  const layer=document.createElement('div');
  layer.className='mobile-subnav-layer';
  layer.innerHTML=`<button type="button" class="mobile-subnav-backdrop" aria-label="Fechar menu"></button><div class="mobile-subnav-sheet" role="dialog" aria-modal="true"><div class="mobile-subnav-sheet__head"><strong>${window.MMCDUI?.esc?.(title)||title}</strong><button type="button" aria-label="Fechar">×</button></div><div class="mobile-subnav-sheet__links"></div></div>`;
  const target=layer.querySelector('.mobile-subnav-sheet__links');
  links.forEach(link=>{
   const clone=link.cloneNode(true);
   clone.classList.add('mobile-subnav-sheet__link');
   clone.addEventListener('click',closeMobileSubmenu,{once:true});
   target.append(clone);
  });
  layer.querySelector('.mobile-subnav-backdrop')?.addEventListener('click',closeMobileSubmenu);
  layer.querySelector('.mobile-subnav-sheet__head button')?.addEventListener('click',closeMobileSubmenu);
  document.body.append(layer);
  mobileSubmenuLayer=layer;
  requestAnimationFrame(()=>layer.classList.add('open'));
 };
 // MMCD_MOBILE_SUBMENU_V32_END

 // MEMORY_CARE_NAV_V78_START
 const careGroup=document.querySelector('.sidebar-care-group');
 const careToggle=careGroup?.querySelector('.sidebar-settings__toggle');
 const careMenu=careGroup?.querySelector('#sidebar-care-menu');
 // V78.6: garante que Aniversariantes exista em Cuidado mesmo se algum HTML antigo for servido do cache.
 if(careMenu&&!careMenu.querySelector('a[href^="aniversarios.html"]')){
  const birthdayLink=document.createElement('a');
  birthdayLink.className=`sidebar-subnav__link ${active==='aniversarios'?'active':''}`;
  birthdayLink.href='aniversarios.html?v=20260816-v79-4';
  birthdayLink.innerHTML='<span class="sidebar-subnav__dot"></span><span><strong>Aniversariantes</strong><small>Datas e gestos de cuidado</small></span>';
  careMenu.append(birthdayLink);
 }
 // V78.6: defesa contra cards antigos de Aniversariantes ainda presentes em Configuracoes por cache.
 if(active==='configuracoes'){
  document.querySelectorAll('a[href^="aniversarios.html"],a[href*="/aniversarios.html"]').forEach(link=>{
   if(!link.closest('.sidebar-care-group')) link.remove();
  });
 }
 const setCareOpen=(next,{persist=true}={})=>{
  if(!careGroup||!careToggle||!careMenu)return;
  // V78.2: a pagina ativa abre o grupo ao carregar, mas o usuario pode recolher manualmente.
  const safe=Boolean(next);
  careGroup.classList.toggle('open',safe);
  careMenu.classList.toggle('open',safe);
  careMenu.hidden=!safe;
  careToggle.setAttribute('aria-expanded',safe?'true':'false');
  if(persist)localStorage.setItem('memory:sidebar:care-open',safe?'1':'0');
 };
 if(careGroup&&careToggle&&careMenu){
  const saved=localStorage.getItem('memory:sidebar:care-open')==='1';
  setCareOpen(careActive||saved,{persist:false});
  // V79.9: Cuidado é um destino. Um clique abre diretamente o Mapa de Cuidado.
  // O submenu permanece aberto nas páginas de Cuidado e lista os demais itens abaixo.
  careToggle.addEventListener('click',()=>{
   localStorage.setItem('memory:sidebar:care-open','1');
  });
 }
 // MEMORY_CARE_NAV_V78_END

 const logo=document.querySelector('.sidebar-brand__mark img');
 if(logo){
  const mark=logo.closest('.sidebar-brand__mark');
  const fallback=()=>{
   if(logo.dataset.memoryFallbackTried!=='1'){
    logo.dataset.memoryFallbackTried='1';
    logo.src='assets/imagens/memory-mark-v62.png?v=20260816-v80-1';
    return;
   }
   if(mark)mark.classList.add('has-fallback');
  };
  logo.addEventListener('error',fallback);
  if(logo.complete&&logo.naturalWidth===0)fallback();
 }

 // MMCD_LEARNING_GROUPS_V31_START
 const buildLearningGroup=({
   mainSelector,childSelector,groupClass,menuId,storageKey,activeKeys,
   primaryHref,primaryTitle,primarySubtitle
 })=>{
   const main=document.querySelector(mainSelector);
   if(!main||main.closest(`.${groupClass}`))return;

   const child=document.querySelector(childSelector);
   const isActive=activeKeys.includes(active);
   const saved=localStorage.getItem(storageKey)==='1';
   const open=isActive||saved;

   const group=document.createElement('div');
   group.className=`sidebar-settings ${groupClass} ${open?'open':''}`;

   const button=document.createElement('button');
   button.type='button';
   button.className=`sidebar-link sidebar-settings__toggle ${isActive?'active':''}`;
   button.setAttribute('aria-expanded',open?'true':'false');
   button.setAttribute('aria-controls',menuId);
   button.innerHTML=main.innerHTML;

   const oldArrow=button.querySelector('.sidebar-link__arrow');
   if(oldArrow){
     oldArrow.className='sidebar-settings__chevron';
     oldArrow.textContent='›';
   }

   const menu=document.createElement('div');
   menu.className=`sidebar-subnav ${open?'open':''}`;
   menu.id=menuId;
   menu.hidden=!open;

   const primary=document.createElement('a');
   primary.className=`sidebar-subnav__link ${activeKeys[0]===active?'active':''}`;
   primary.href=primaryHref;
   primary.innerHTML=`<span class="sidebar-subnav__dot"></span><span><strong>${primaryTitle}</strong><small>${primarySubtitle}</small></span>`;
   menu.append(primary);

   if(child){
     const secondary=document.createElement('a');
     secondary.className=`sidebar-subnav__link ${activeKeys[1]===active?'active':''}`;
     secondary.href=child.getAttribute('href')||'#';
     const strong=child.querySelector('strong')?.textContent?.trim()||'Evolução';
     const small=child.querySelector('small')?.textContent?.trim()||'';
     secondary.innerHTML=`<span class="sidebar-subnav__dot"></span><span><strong>${strong}</strong><small>${small}</small></span>`;
     menu.append(secondary);
   }

   main.replaceWith(group);
   if(child)child.remove();
   group.append(button,menu);

   const setOpen=(next,persist=true)=>{
     group.classList.toggle('open',next);
     menu.classList.toggle('open',next);
     menu.hidden=!next;
     button.setAttribute('aria-expanded',next?'true':'false');
     if(persist)localStorage.setItem(storageKey,next?'1':'0');
   };
   button.addEventListener('click',()=>{
     if(isMobileNav()){
       openMobileSubmenu(menu,primaryTitle);
       return;
     }
     setOpen(!group.classList.contains('open'));
   });
   if(isActive)setOpen(true,false);
 };

 buildLearningGroup({
   mainSelector:'.sidebar-link[href^="biblia.html"]',
   childSelector:'.sidebar-bible-map-link',
   groupClass:'sidebar-bible-group',
   menuId:'sidebar-bible-menu',
   storageKey:'mmcd:sidebar:bible-open',
   activeKeys:['biblia','biblia-mapa'],
   primaryHref:'biblia.html',
   primaryTitle:'Leitura e anotações',
   primarySubtitle:'Capítulos, versículos e notas'
 });

 buildLearningGroup({
   mainSelector:'.sidebar-link[href^="ingles.html"]',
   childSelector:'.sidebar-english-evolution-link',
   groupClass:'sidebar-english-group',
   menuId:'sidebar-english-menu',
   storageKey:'mmcd:sidebar:english-open',
   activeKeys:['ingles','ingles-evolucao'],
   primaryHref:'ingles.html',
   primaryTitle:'Aula do dia',
   primarySubtitle:'Prática adaptativa'
 });
 // MMCD_LEARNING_GROUPS_V31_END





 // MEMORY_GLOBAL_TOOLS_V68_START
 const memoryConfig=await window.MemoryConfigReady;
 const topbarInner=document.querySelector('.app-topbar__inner');
 let topbarActions=document.querySelector('.app-topbar .topbar-actions');
 const themeButton=document.querySelector('.app-topbar #theme-toggle');
 if(topbarInner&&!topbarActions){
  topbarActions=document.createElement('div');
  topbarActions.className='topbar-actions';
  if(themeButton)topbarActions.append(themeButton);
  topbarInner.append(topbarActions);
 }
 if(topbarActions&&!document.querySelector('#memory-global-tools-v68')){
  const tools=document.createElement('div');
  tools.id='memory-global-tools-v68';
  tools.className='memory-global-tools';
  tools.innerHTML=`
   <div class="memory-font-tool">
    <button type="button" class="icon-btn memory-font-btn" aria-label="Tamanho do texto" title="Tamanho do texto">Aa</button>
    <div class="memory-font-panel" hidden>
     <div class="memory-tool-head"><div><strong>Tamanho do texto</strong><small>Deixe o Memory confortável para você.</small></div><button type="button" data-close-font aria-label="Fechar">×</button></div>
     <button type="button" data-font-size="padrao"><span class="is-large">Aa</span><span><strong>Padrão</strong><small>Leitura confortável</small></span><b>✓</b></button>
     <button type="button" data-font-size="grande"><span class="is-extra">Aa</span><span><strong>Grande</strong><small>Leitura ampliada</small></span><b>✓</b></button>
     <button type="button" data-font-size="extra"><span class="is-max">Aa</span><span><strong>Extra grande</strong><small>Maior acessibilidade</small></span><b>✓</b></button>
    </div>
   </div>
   <div class="memory-news-tool">
    <button type="button" class="icon-btn memory-news-btn" aria-label="Novidades do Memory" title="Clique para saber as atualizações do sistema"><span aria-hidden="true">✨</span><i class="memory-news-dot" aria-label="Há novidades"></i></button>
   </div>`;
  if(themeButton&&themeButton.parentElement===topbarActions)topbarActions.insertBefore(tools,themeButton);
  else topbarActions.append(tools);
 }

 if(!document.querySelector('#memory-global-tools-v68-style')){
  const style=document.createElement('style');
  style.id='memory-global-tools-v68-style';
  style.textContent=`
   html[data-memory-font-size="padrao"]{font-size:18px}
   html[data-memory-font-size="grande"]{font-size:20px}
   html[data-memory-font-size="extra"]{font-size:22.5px}
   .memory-global-tools{display:flex;align-items:center;gap:8px}
   .memory-font-tool,.memory-news-tool{position:relative}
   .memory-font-btn{font-weight:850;font-size:.72rem;letter-spacing:-.04em}
   .memory-font-panel{position:absolute;right:0;top:48px;width:min(340px,calc(100vw - 32px));padding:10px;border:1px solid var(--line);border-radius:16px;background:var(--surface);box-shadow:var(--shadow);z-index:160}
   .memory-tool-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:5px 6px 10px}
   .memory-tool-head>div{display:grid;gap:3px}.memory-tool-head strong{font-size:.8rem}.memory-tool-head small{font-size:.64rem;color:var(--muted)}
   .memory-tool-head>button{width:30px;height:30px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--text);cursor:pointer}
   .memory-font-panel>[data-font-size]{display:grid;grid-template-columns:48px 1fr 22px;align-items:center;gap:10px;width:100%;padding:10px;border:1px solid transparent;border-radius:12px;background:transparent;color:var(--text);text-align:left;cursor:pointer}
   .memory-font-panel>[data-font-size]:hover{background:var(--surface-2)}
   .memory-font-panel>[data-font-size].active{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 35%,var(--line))}
   .memory-font-panel>[data-font-size]>span:first-child{display:grid;place-items:center;height:40px;border-radius:10px;background:var(--surface-2);font-size:.72rem;font-weight:850}
   .memory-font-panel>[data-font-size]>span:first-child.is-large{font-size:.88rem}.memory-font-panel>[data-font-size]>span:first-child.is-extra{font-size:1.03rem}.memory-font-panel>[data-font-size]>span:first-child.is-max{font-size:1.18rem}
   .memory-font-panel>[data-font-size]>span:nth-child(2){display:grid;gap:2px}.memory-font-panel>[data-font-size] strong{font-size:.75rem}.memory-font-panel>[data-font-size] small{font-size:.61rem;color:var(--muted)}
   .memory-font-panel>[data-font-size] b{visibility:hidden;color:var(--accent)}.memory-font-panel>[data-font-size].active b{visibility:visible}
   .memory-news-btn{position:relative}.memory-news-dot{position:absolute;right:5px;top:5px;width:8px;height:8px;border-radius:50%;background:#ff4d67;border:2px solid var(--surface);box-sizing:content-box}
   .memory-news-dot[hidden]{display:none}
   .memory-news-layer{position:fixed;inset:0;z-index:220;display:grid;grid-template-columns:1fr min(460px,94vw);background:rgba(4,10,22,.36);backdrop-filter:blur(3px)}
   .memory-news-layer[hidden]{display:none}
   .memory-news-backdrop{border:0;background:transparent;cursor:default}
   .memory-news-panel{height:100%;overflow:auto;padding:22px;border-left:1px solid var(--line);background:var(--surface);box-shadow:-18px 0 48px rgba(0,0,0,.18)}
   .memory-news-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:18px;border-bottom:1px solid var(--line)}
   .memory-news-head p{margin:5px 0 0;color:var(--muted);font-size:.78rem;line-height:1.5}.memory-news-head h2{margin:0;font-size:1.35rem}
   .memory-news-close{width:36px;height:36px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);color:var(--text);cursor:pointer}
   .memory-news-history{display:grid;gap:14px;padding:18px 0}
   .memory-news-entry{padding:16px;border:1px solid var(--line);border-radius:15px;background:var(--surface-2)}
   .memory-news-date{display:flex;align-items:center;gap:8px;color:var(--accent);font-size:.68rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
   .memory-news-entry ul{margin:11px 0 0;padding-left:20px;display:grid;gap:8px}.memory-news-entry li{font-size:.78rem;line-height:1.5;color:var(--text)}
   @media(max-width:760px){
    html[data-memory-font-size="padrao"]{font-size:17.5px}html[data-memory-font-size="grande"]{font-size:19.5px}html[data-memory-font-size="extra"]{font-size:21.5px}
    .memory-global-tools{gap:4px}.memory-global-tools .icon-btn{width:34px;min-height:36px;padding:0}
    .app-topbar__inner{gap:8px}.app-topbar .topbar-actions{gap:5px;min-width:0}.app-topbar #today-label{display:none}
    .memory-font-panel{position:fixed;left:12px;right:12px;top:72px;width:auto}
    .memory-news-layer{grid-template-columns:1fr;align-items:end}.memory-news-backdrop{position:absolute;inset:0}
    .memory-news-panel{position:relative;height:min(78vh,720px);border-left:0;border-top:1px solid var(--line);border-radius:22px 22px 0 0;padding:20px}
   }`;
  document.head.append(style);
 }

 const validFontSizes=['padrao','grande','extra'];
 const applyFontSize=size=>{
  const safe=validFontSizes.includes(size)?size:'padrao';
  document.documentElement.dataset.memoryFontSize=safe;
  localStorage.setItem('memory:font-size',safe);
  document.querySelectorAll('[data-font-size]').forEach(btn=>btn.classList.toggle('active',btn.dataset.fontSize===safe));
  return safe;
 };
 let currentFont=applyFontSize(localStorage.getItem('memory:font-size')||'padrao');
 if(memoryConfig){
  try{
   const remoteFont=await memoryConfig.read('memory_acessibilidade_v1',{tamanho:currentFont});
   if(validFontSizes.includes(remoteFont?.tamanho))currentFont=applyFontSize(remoteFont.tamanho);
  }catch(error){console.warn('Memory: acessibilidade indisponível.',error)}
 }
 const fontButton=document.querySelector('.memory-font-btn');
 const fontPanel=document.querySelector('.memory-font-panel');
 const closeFont=()=>{if(fontPanel)fontPanel.hidden=true};
 fontButton?.addEventListener('click',event=>{event.stopPropagation();if(fontPanel)fontPanel.hidden=!fontPanel.hidden});
 fontPanel?.querySelector('[data-close-font]')?.addEventListener('click',closeFont);
 fontPanel?.querySelectorAll('[data-font-size]').forEach(button=>button.addEventListener('click',async()=>{
  currentFont=applyFontSize(button.dataset.fontSize);
  closeFont();
  if(memoryConfig){
   try{await memoryConfig.write('memory_acessibilidade_v1',{tamanho:currentFont,atualizadoEm:new Date().toISOString()})}
   catch(error){console.warn('Memory: não foi possível salvar o tamanho do texto.',error)}
  }
 }));
 document.addEventListener('click',event=>{if(fontPanel&&!fontPanel.hidden&&!event.target.closest('.memory-font-tool'))closeFont()});

 const NEWS_ID='memory-update-2026-08-16-v79-4-cuidado-biblia-medidas';
 const NEWS_ITEMS=[
  'Cuidado ganhou Boas Ações: registre gestos de cuidado com data, categoria, descrição e pessoa, sem pontos ou ranking.',
  'Cuidado agora também tem Testemunhos: registre o que Deus fez, mantenha privado ou prepare para compartilhar com sua identidade ou de forma anônima.',
  'Boas Ações já traz um relatório mensal com quantidade de registros, dias com gestos, categorias e pessoas alcançadas.',
  'A Bíblia agora separa Livro atual de Livro mais avançado e mostra também a Última leitura para representar melhor onde você está na caminhada.',
  'Cada versículo da Bíblia ganhou um check para registrar o que foi lido ou citado na igreja; essa marcação não conclui capítulos nem altera o percentual da Bíblia.',
  'O Body Scan foi ampliado para 20 medidas: inclui ombros, bíceps relaxado e contraído e coxa superior, média e inferior nos dois lados.',
  'Treinos preservam a constância quando existe abono: o abono não vira treino realizado, mas também não quebra a sequência; o card social informa essa proteção.'
 ];
 const NEWS_PREVIOUS_ITEMS=[
  'Estatísticas ganhou uma área própria de Treinos com ritmo percebido, média de 7/30 dias, evolução semanal, distribuição das notas e histórico por treino.',
  'O check-out do treino agora permite escolher e revisar a nota antes de tocar em Salvar avaliação; somente a confirmação grava no Supabase.',
  'Históricos de carga passam a reconhecer o exercício pela identidade canônica, recuperando registros mesmo quando IDs antigos do plano mudaram.',
  'Duplicidades exatas dentro do mesmo treino são eliminadas ao salvar o plano sem apagar sessões históricas.',
  'Leg Press unilateral recebeu mídia e orientação realmente unilaterais, sem usar a demonstração bilateral como referência.',
  'Cardio e protocolos temporizados ganharam Treino Guiado com timer grande, fase atual, próxima etapa, ciclos, progresso, pausa e encerramento.',
  'Atividades abonadas passam a usar estado verde explícito, não aparecem como pendentes e continuam fora do denominador da consistência.',
 ];
 const newsButton=document.querySelector('.memory-news-btn');
 const newsDot=document.querySelector('.memory-news-dot');
 const localNewsSeen=localStorage.getItem('memory:news-seen')||'';
 let newsSeen=localNewsSeen===NEWS_ID;
 if(memoryConfig){
  try{
   const remoteNews=await memoryConfig.read('memory_novidades_lidas_v1',{ultimoId:''});
   if(remoteNews?.ultimoId===NEWS_ID)newsSeen=true;
  }catch(error){console.warn('Memory: histórico de novidades indisponível.',error)}
 }
 if(newsDot)newsDot.hidden=newsSeen;

 const ensureNewsLayer=()=>{
  let layer=document.querySelector('.memory-news-layer');
  if(layer)return layer;
  layer=document.createElement('div');
  layer.className='memory-news-layer';
  layer.hidden=true;
  layer.innerHTML=`
   <button type="button" class="memory-news-backdrop" aria-label="Fechar novidades"></button>
   <aside class="memory-news-panel" role="dialog" aria-modal="true" aria-label="Novidades do Memory">
    <div class="memory-news-head">
     <div><h2>Novidades do Memory</h2><p>Veja o que mudou no sistema. O histórico continua aqui mesmo depois de visualizado.</p></div>
     <button type="button" class="memory-news-close" aria-label="Fechar">×</button>
    </div>
    <div class="memory-news-history">
     <article class="memory-news-entry">
      <div class="memory-news-date"><span>✨</span><span>16/08/2026</span></div>
      <ul>${NEWS_ITEMS.map(item=>`<li>${window.MMCDUI?.esc?.(item)||item}</li>`).join('')}</ul>
     </article>
     <article class="memory-news-entry">
      <div class="memory-news-date"><span>•</span><span>15/08/2026</span></div>
      <ul>${NEWS_PREVIOUS_ITEMS.map(item=>`<li>${window.MMCDUI?.esc?.(item)||item}</li>`).join('')}</ul>
     </article>
    </div>
   </aside>`;
  document.body.append(layer);
  const close=()=>{layer.hidden=true};
  layer.querySelector('.memory-news-backdrop')?.addEventListener('click',close);
  layer.querySelector('.memory-news-close')?.addEventListener('click',close);
  return layer;
 };
 const markNewsSeen=async()=>{
  if(newsDot)newsDot.hidden=true;
  localStorage.setItem('memory:news-seen',NEWS_ID);
  if(memoryConfig){
   try{await memoryConfig.write('memory_novidades_lidas_v1',{ultimoId:NEWS_ID,vistoEm:new Date().toISOString()})}
   catch(error){console.warn('Memory: não foi possível registrar a leitura das novidades.',error)}
  }
 };
 newsButton?.addEventListener('click',()=>{
  const layer=ensureNewsLayer();
  layer.hidden=false;
  markNewsSeen();
 });

 try{const session=await MMCDAuth.requireSession();const sidebar=document.querySelector('.sidebar');if(sidebar){sidebar.append(MMCDAuth.accountButton(session.user));sidebar.insertAdjacentHTML('beforeend','<div class="sync-status">Dados online · Supabase</div>')}}catch(e){console.error(e)}
 // MEMORY_GLOBAL_TOOLS_V68_END
 window.addEventListener('mmcd:profile-updated',()=>{window.MMCDAuth?.refreshAccountProfile?.().catch(()=>{})});

 // No celular, mantém a área ativa visível dentro do menu horizontal.
 if(window.matchMedia?.('(max-width:760px)').matches){
  requestAnimationFrame(()=>{
   const mobileNav=document.querySelector('.sidebar-nav');
   const activeItem=mobileNav?.querySelector('.sidebar-link.active');
   if(!mobileNav||!activeItem)return;
   const left=Math.max(0,activeItem.offsetLeft-(mobileNav.clientWidth-activeItem.offsetWidth)/2);
   mobileNav.scrollTo({left,behavior:'auto'});
  });
 }

 if(window.MMCDTheme){
  await window.MMCDTheme.init({active});
 }else{
  const tema=localStorage.getItem('mmcd:tema')||'claro';document.documentElement.dataset.tema=tema;
  document.querySelectorAll('#theme-toggle').forEach(btn=>{btn.textContent=tema==='escuro'?'☀':'☾';btn.onclick=()=>{const n=document.documentElement.dataset.tema==='escuro'?'claro':'escuro';document.documentElement.dataset.tema=n;localStorage.setItem('mmcd:tema',n);btn.textContent=n==='escuro'?'☀':'☾'}});
 }
};
window.MMCDUI={esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),date:s=>s?new Date(s+'T12:00:00').toLocaleDateString('pt-BR'):'—',toast(msg,duration=2200){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.append(t)}clearTimeout(t._timer);t.textContent=msg;t.classList.add('show');t._timer=setTimeout(()=>t.classList.remove('show'),duration)}};


/* V80.3 — terminologia visual Devocional para nomes persistidos antigos. */
(()=>{
 const replaceTerms=value=>String(value||"")
  .replace(/MEDITAÇÃO/g,"DEVOCIONAL")
  .replace(/Meditação/g,"Devocional")
  .replace(/meditação/g,"devocional");
 const allowedSelector=[
  ".sidebar",".app-topbar",".page-header",".settings-card",".dashboard-bottom",
  ".daily-card",".goal-list",".goals-list",".goals-table",".mission-card",
  ".meditation-view-switch",".meditation-journey",".meditation-completion-zone",
  "#meditation-consistency",".devotional-sidebar",".meditation-nav"
 ].join(",");
 const excludedSelector=["#conteudo-meditacao","textarea","input","script","style","code","pre",".testimony-row__text",".quick-journal-entry__text"].join(",");
 function translateNode(node){
  if(!node?.parentElement)return;
  const parent=node.parentElement;
  if(parent.closest(excludedSelector)||!parent.closest(allowedSelector))return;
  const next=replaceTerms(node.nodeValue);
  if(next!==node.nodeValue)node.nodeValue=next;
 }
 function scan(root=document.body){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;while((node=walker.nextNode()))translateNode(node);
 }
 const observer=new MutationObserver(mutations=>{
  for(const mutation of mutations){
   mutation.addedNodes.forEach(node=>{
    if(node.nodeType===Node.TEXT_NODE)translateNode(node);
    else if(node.nodeType===Node.ELEMENT_NODE)scan(node);
   });
  }
 });
 const start=()=>{scan();observer.observe(document.body,{childList:true,subtree:true})};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
