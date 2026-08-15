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
  script.src='./memory-config-v68.js?v=20260814-2355-v68';
  script.dataset.memoryConfigV68='1';
  script.onload=()=>resolve(window.MemoryConfig||null);
  script.onerror=()=>resolve(null);
  document.head.append(script);
 });
 // V50: carrega a identidade oficial Memory com URL nova para evitar cache antigo/PWA.
 if(!document.querySelector('link[data-memory-original-v50]')){
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href='./memory-original-v50.css?v=20260814-v50';
  css.dataset.memoryOriginalV50='1';
  document.head.append(css);
 }
 if(!window.MMCDTheme?.getCatalog?.().some?.(item=>item.id==='memory-original')){
  await new Promise(resolve=>{
   const existing=document.querySelector('script[data-memory-theme-v50]');
   if(existing){
    if(window.MMCDTheme?.getCatalog?.().some?.(item=>item.id==='memory-original')) resolve();
    else existing.addEventListener('load',resolve,{once:true});
    return;
   }
   const script=document.createElement('script');
   script.src='./theme-system-v50.js?v=20260814-v50';
   script.dataset.memoryThemeV50='1';
   script.onload=resolve;
   script.onerror=resolve;
   document.head.append(script);
  });
 }
 const nav=[
  ['missoes','painel.html','01','🎯','Missões','Visão da vida','Missões'],
  ['atividades','atividades.html','02','✅','Atividades','Rotina diária','Atividades'],
  ['meditacao','meditacao.html','03','🙏','Meditação','Momento com Deus','Meditação'],
  ['biblia','biblia.html','04','📖','Bíblia','Leitura e anotações','Bíblia'],
  ['ingles','ingles.html','05','🇬🇧','Inglês diário','Aula adaptativa','Inglês'],
  ['treinos','treinos-v67.html#hoje','06','🏋️','Treinos','Plano de treino','Treinos'],
  ['livros','livros.html','07','📚','Livros','Biblioteca','Livros'],
  ['estatisticas','relatorios.html','08','📊','Estatísticas','Evolução','Evolução']
 ];
 const settingsKeys=['configuracoes','aparencia','medidas','metas','perfil','series','treinos-config','aniversarios','meditacao-links'];
 const settingsActive=settingsKeys.includes(active);
 const mobileMemoryHtml=`
  <a class="sidebar-link sidebar-memory-mobile ${active==='memory'?'active':''}" href="memory.html?v=20260814-2355-v68" aria-label="Abrir Memory">
   <span class="sidebar-link__icon sidebar-memory-mobile__icon"><img src="./memory-mark-v62.png?v=20260814-v63" alt=""></span>
   <div class="sidebar-link__copy"><strong>Memory</strong><small>Propósito e essência</small></div>
   <span class="sidebar-mobile-label">Memory</span>
   <span class="sidebar-link__arrow" aria-hidden="true">›</span>
  </a>`;
 const navHtml=nav.map(x=>`
  <a class="sidebar-link ${active===x[0]?'active':''}" href="${x[1]}">
   <span class="sidebar-link__icon"><span class="sidebar-icon-desktop">${x[2]}</span><span class="sidebar-icon-mobile" aria-hidden="true">${x[3]}</span></span>
   <div class="sidebar-link__copy"><strong>${x[4]}</strong><small>${x[5]}</small></div>
   <span class="sidebar-mobile-label">${x[6]}</span>
   <span class="sidebar-link__arrow" aria-hidden="true">›</span>
  </a>`).join('');
 const sidebarHtml=`
  <aside class="sidebar sidebar-v24">
   <a class="sidebar-brand" href="memory.html?v=20260814-2355-v68" aria-label="Abrir propósito e essência do Memory" title="Abrir Memory">
    <span class="sidebar-brand__mark">
     <img src="./memory-mark-v62.png?v=20260814-v63" alt="Memory">
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
    ${navHtml}
    <div class="sidebar-nav__section-label sidebar-nav__section-label--system">GESTÃO</div>
    <a class="sidebar-link ${settingsActive?'active':''}" href="configuracoes.html?v=20260814-2355-v68">
     <span class="sidebar-link__icon"><span class="sidebar-icon-desktop">09</span><span class="sidebar-icon-mobile" aria-hidden="true">⚙️</span></span>
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
   .sidebar-memory-mobile__icon img{display:block;width:100%;height:100%;object-fit:cover;border-radius:inherit}
   .memory-topbar-brand{display:inline-flex;align-items:center;gap:8px;color:inherit;text-decoration:none}
   .memory-topbar-brand img{display:none;width:30px;height:30px;border-radius:9px;object-fit:cover;border:1px solid color-mix(in srgb,var(--accent) 30%,var(--line));background:#071a39}
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
 document.querySelectorAll('.app-topbar__title').forEach(el=>{el.innerHTML='<a class="memory-topbar-brand" href="memory.html?v=20260814-2355-v68" aria-label="Abrir Memory"><img src="./memory-mark-v62.png?v=20260814-v63" alt=""><span>Memory</span></a>'});
 const memoryTitles={
  memory:'Memory',
  missoes:'Memory - Missões',
  atividades:'Memory - Atividades',
  meditacao:'Memory - Meditação',
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
  'meditacao-links':'Memory - Links da meditação'
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

 const logo=document.querySelector('.sidebar-brand__mark img');
 if(logo){
  const fallback=()=>{const mark=logo.closest('.sidebar-brand__mark');if(mark)mark.classList.add('has-fallback')};
  logo.addEventListener('error',fallback,{once:true});
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
     <button type="button" data-font-size="padrao"><span>Aa</span><span><strong>Padrão</strong><small>Tamanho original</small></span><b>✓</b></button>
     <button type="button" data-font-size="grande"><span class="is-large">Aa</span><span><strong>Grande</strong><small>Leitura mais confortável</small></span><b>✓</b></button>
     <button type="button" data-font-size="extra"><span class="is-extra">Aa</span><span><strong>Extra grande</strong><small>Maior acessibilidade</small></span><b>✓</b></button>
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
   html[data-memory-font-size="padrao"]{font-size:16px}
   html[data-memory-font-size="grande"]{font-size:18px}
   html[data-memory-font-size="extra"]{font-size:20px}
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
   .memory-font-panel>[data-font-size]>span:first-child.is-large{font-size:.88rem}.memory-font-panel>[data-font-size]>span:first-child.is-extra{font-size:1.03rem}
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
    html[data-memory-font-size="padrao"]{font-size:16px}html[data-memory-font-size="grande"]{font-size:17.5px}html[data-memory-font-size="extra"]{font-size:19px}
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

 const NEWS_ID='memory-update-2026-08-14-2355';
 const NEWS_ITEMS=[
  'Central de Configurações: as opções saíram do submenu apertado da lateral e ganharam uma página própria.',
  'Novo controle global de tamanho do texto com opções Padrão, Grande e Extra grande.',
  'Cadastro de aniversários importantes, com lembrete automático em Atividades > Cuidado e card dinâmico em Missões.',
  'Cadastro de links da meditação com ativação/desativação e escolha aleatória entre os conteúdos ativos.',
  'Novo painel de novidades: ao abrir, o aviso é considerado visualizado e o indicador desaparece.',
  'Títulos das abas foram simplificados para não repetir “Memory” ou “Configurações”.',
  'Treinos e metas seguem com vínculo automático: as metas marcadas podem ser concluídas quando a musculação do dia é realizada.',
  'Treinos mantêm alarme de descanso, som/vibração, BI-SET (conjugado), técnica detalhada e continuidade do treino até o fim do dia.'
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
      <div class="memory-news-date"><span>✨</span><span>14/08/2026</span></div>
      <ul>${NEWS_ITEMS.map(item=>`<li>${window.MMCDUI?.esc?.(item)||item}</li>`).join('')}</ul>
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
