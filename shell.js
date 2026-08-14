"use strict";
window.MMCDShell=async function(active){
 const nav=[
  ['missoes','painel.html','01','🎯','Missões','Visão da vida','Missões'],
  ['meditacao','meditacao.html','02','🙏','Meditação','Momento com Deus','Meditação'],
  ['biblia','biblia.html','03','📖','Bíblia','Leitura e anotações','Bíblia'],
  ['ingles','ingles.html','04','🇬🇧','Inglês diário','Aula adaptativa','Inglês'],
  ['treinos','treinos.html#hoje','05','🏋️','Treinos','Plano de treino','Treinos'],
  ['atividades','atividades.html','06','✅','Atividades','Rotina diária','Atividades'],
  ['livros','livros.html','07','📚','Livros','Biblioteca','Livros'],
  ['estatisticas','relatorios.html','08','📊','Estatísticas','Evolução','Evolução']
 ];
 const settingsActive=active==='aparencia'||active==='medidas'||active==='metas'||active==='perfil'||active==='series';
 const settingsWorkout=active==='treinos-config';
 const storedSettingsOpen=localStorage.getItem('mmcd:sidebar:settings-open');
 const settingsOpen=settingsActive||settingsWorkout||storedSettingsOpen==='1';
 const navHtml=nav.map(x=>`
  <a class="sidebar-link ${active===x[0]?'active':''}" href="${x[1]}">
   <span class="sidebar-link__icon"><span class="sidebar-icon-desktop">${x[2]}</span><span class="sidebar-icon-mobile" aria-hidden="true">${x[3]}</span></span>
   <div class="sidebar-link__copy"><strong>${x[4]}</strong><small>${x[5]}</small></div>
   <span class="sidebar-mobile-label">${x[6]}</span>
   <span class="sidebar-link__arrow" aria-hidden="true">›</span>
  </a>`).join('');
 const sidebarHtml=`
  <aside class="sidebar sidebar-v24">
   <a class="sidebar-brand" href="painel.html" aria-label="Memory — início">
    <span class="sidebar-brand__mark">
     <img src="./memory-mark.png?v=20260814-memory-v42" alt="Memory">
     <span class="sidebar-brand__fallback" aria-hidden="true">M</span>
    </span>
    <div class="sidebar-brand__copy">
     <strong>MEMORY</strong>
     <small>CUIDADO E EVOLUÇÃO</small>
    </div>
   </a>
   <div class="sidebar-nav__section-label">PRINCIPAL</div>
   <nav class="sidebar-nav" aria-label="Navegação principal">
    ${navHtml}
    <div class="sidebar-nav__section-label sidebar-nav__section-label--system">GESTÃO</div>
    <div class="sidebar-settings ${settingsOpen?'open':''}">
     <button type="button" class="sidebar-link sidebar-settings__toggle ${settingsActive||settingsWorkout?'active':''}" id="sidebar-settings-toggle" aria-expanded="${settingsOpen?'true':'false'}" aria-controls="sidebar-settings-menu">
      <span class="sidebar-link__icon"><span class="sidebar-icon-desktop">09</span><span class="sidebar-icon-mobile" aria-hidden="true">⚙️</span></span>
      <div class="sidebar-link__copy"><strong>Configurações</strong><small>Preferências e cadastros</small></div>
      <span class="sidebar-mobile-label">Ajustes</span>
      <span class="sidebar-settings__chevron" aria-hidden="true">›</span>
     </button>
     <div class="sidebar-subnav ${settingsOpen?'open':''}" id="sidebar-settings-menu" ${settingsOpen?'':'hidden'}>
      <a class="sidebar-subnav__link ${active==='aparencia'?'active':''}" href="aparencia.html">
       <span class="sidebar-subnav__dot"></span><span><strong>Aparência</strong><small>Temas e cores</small></span>
      </a>
      <a class="sidebar-subnav__link ${active==='medidas'?'active':''}" href="medidas.html">
       <span class="sidebar-subnav__dot"></span><span><strong>Medições corporais</strong><small>Medidas e evolução visual</small></span>
      </a>
      <a class="sidebar-subnav__link ${active==='metas'?'active':''}" href="metas.html">
       <span class="sidebar-subnav__dot"></span><span><strong>Metas</strong><small>Rotina e objetivos</small></span>
      </a>
      <a class="sidebar-subnav__link ${active==='perfil'?'active':''}" href="perfil.html">
       <span class="sidebar-subnav__dot"></span><span><strong>Meu perfil</strong><small>Foto e identificação</small></span>
      </a>
      <a class="sidebar-subnav__link ${settingsWorkout?'active':''}" href="treinos-config.html">
       <span class="sidebar-subnav__dot"></span><span><strong>Plano de treino</strong><small>Programa e exercícios</small></span>
      </a>
      <a class="sidebar-subnav__link ${active==='series'?'active':''}" href="series.html">
       <span class="sidebar-subnav__dot"></span><span><strong>Séries & filmes</strong><small>Biblioteca de exposição</small></span>
      </a>
     </div>
    </div>
   </nav>
   <div class="sidebar-summary">
    <span class="sidebar-summary__line"></span>
    <span>Fé, disciplina e evolução.</span>
    <small>Um dia de cada vez.</small>
   </div>
  </aside>`;
 document.body.insertAdjacentHTML('afterbegin',sidebarHtml);
 document.body.classList.add('app-body');
 document.querySelectorAll('.app-topbar__title').forEach(el=>{el.textContent='MEMORY'});
 document.title=document.title.replace(/Life Style/gi,'Memory').replace(/Meu Momento com Deus$/i,'Memory');

 // Recarrega a identidade visual sem depender do cache antigo do navegador/PWA.
 document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(link=>{
  try{
   const url=new URL(link.getAttribute('href'),location.href);
   url.searchParams.set('memoryv','20260814-memory-v42');
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

 const settings=document.querySelector('.sidebar-settings');
 const settingsButton=document.querySelector('#sidebar-settings-toggle');
 const settingsMenu=document.querySelector('#sidebar-settings-menu');
 if(settings&&settingsButton&&settingsMenu){
  const setSettingsOpen=(open,persist=true)=>{
   settings.classList.toggle('open',open);
   settingsMenu.classList.toggle('open',open);
   settingsMenu.hidden=!open;
   settingsButton.setAttribute('aria-expanded',open?'true':'false');
   if(persist)localStorage.setItem('mmcd:sidebar:settings-open',open?'1':'0');
  };
  settingsButton.addEventListener('click',()=>{
   if(isMobileNav()){
    openMobileSubmenu(settingsMenu,'Configurações');
    return;
   }
   setSettingsOpen(!settings.classList.contains('open'));
  });
  if(settingsActive||settingsWorkout)setSettingsOpen(true,false);
 }

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



 

 try{const session=await MMCDAuth.requireSession();const sidebar=document.querySelector('.sidebar');if(sidebar){sidebar.append(MMCDAuth.accountButton(session.user));sidebar.insertAdjacentHTML('beforeend','<div class="sync-status">Dados online · Supabase</div>')}}catch(e){console.error(e)}
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
