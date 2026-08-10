"use strict";
window.MMCDShell=async function(active){
 const nav=[
  ['missoes','painel.html','01','Missões','Visão da vida'],
  ['meditacao','index.html','02','Meditação','Momento com Deus'],
  ['biblia','biblia.html','03','Bíblia','Leitura e marcações'],
  ['ingles','ingles.html','04','Inglês diário','Prática e revisão'],
  ['treinos','treinos.html','05','Treinos','Plano de treino'],
  ['atividades','atividades.html','06','Atividades','Rotina diária'],
  ['livros','livros.html','07','Livros','Biblioteca'],
  ['estatisticas','relatorios.html','08','Estatísticas','Evolução']
 ];
 const settingsActive=active==='metas'||active==='series';
 const settingsWorkout=active==='treinos' && location.hash==='#configuracoes';
 const storedSettingsOpen=localStorage.getItem('mmcd:sidebar:settings-open');
 const settingsOpen=settingsActive||settingsWorkout||storedSettingsOpen==='1';
 const navHtml=nav.map(x=>`
  <a class="sidebar-link ${active===x[0]?'active':''}" href="${x[1]}">
   <span class="sidebar-link__icon">${x[2]}</span>
   <div class="sidebar-link__copy"><strong>${x[3]}</strong><small>${x[4]}</small></div>
   <span class="sidebar-link__arrow" aria-hidden="true">›</span>
  </a>`).join('');
 const sidebarHtml=`
  <aside class="sidebar sidebar-v24">
   <a class="sidebar-brand" href="painel.html" aria-label="Life Style — início">
    <span class="sidebar-brand__mark">
     <img src="./logo-ls-sidebar.png?v=20260810-sidebar24" alt="Life Style">
     <span class="sidebar-brand__fallback" aria-hidden="true">LS</span>
    </span>
    <div class="sidebar-brand__copy">
     <strong>LIFE STYLE</strong>
     <small>SISTEMA DE EVOLUÇÃO</small>
    </div>
   </a>
   <div class="sidebar-nav__section-label">PRINCIPAL</div>
   <nav class="sidebar-nav" aria-label="Navegação principal">
    ${navHtml}
    <div class="sidebar-nav__section-label sidebar-nav__section-label--system">GESTÃO</div>
    <div class="sidebar-settings ${settingsOpen?'open':''}">
     <button type="button" class="sidebar-link sidebar-settings__toggle ${settingsActive||settingsWorkout?'active':''}" id="sidebar-settings-toggle" aria-expanded="${settingsOpen?'true':'false'}" aria-controls="sidebar-settings-menu">
      <span class="sidebar-link__icon">09</span>
      <div class="sidebar-link__copy"><strong>Configurações</strong><small>Preferências e cadastros</small></div>
      <span class="sidebar-settings__chevron" aria-hidden="true">›</span>
     </button>
     <div class="sidebar-subnav ${settingsOpen?'open':''}" id="sidebar-settings-menu" ${settingsOpen?'':'hidden'}>
      <a class="sidebar-subnav__link ${active==='metas'?'active':''}" href="metas.html">
       <span class="sidebar-subnav__dot"></span><span><strong>Metas</strong><small>Rotina e objetivos</small></span>
      </a>
      <a class="sidebar-subnav__link ${active==='series'?'active':''}" href="series.html">
       <span class="sidebar-subnav__dot"></span><span><strong>Séries & filmes</strong><small>Biblioteca de exposição</small></span>
      </a>
      <a class="sidebar-subnav__link ${settingsWorkout?'active':''}" href="treinos.html#configuracoes">
       <span class="sidebar-subnav__dot"></span><span><strong>Plano de treino</strong><small>Programa, exercícios e medidas</small></span>
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
  settingsButton.addEventListener('click',()=>setSettingsOpen(!settings.classList.contains('open')));
  if(settingsActive||settingsWorkout)setSettingsOpen(true,false);
 }

 const logo=document.querySelector('.sidebar-brand__mark img');
 if(logo){
  const fallback=()=>{const mark=logo.closest('.sidebar-brand__mark');if(mark)mark.classList.add('has-fallback')};
  logo.addEventListener('error',fallback,{once:true});
  if(logo.complete&&logo.naturalWidth===0)fallback();
 }

 

 try{const session=await MMCDAuth.requireSession();const sidebar=document.querySelector('.sidebar');if(sidebar){sidebar.append(MMCDAuth.accountButton(session.user));sidebar.insertAdjacentHTML('beforeend','<div class="sync-status">Dados online · Supabase</div>')}}catch(e){console.error(e)}
 const tema=localStorage.getItem('mmcd:tema')||'claro';document.documentElement.dataset.tema=tema;
 document.querySelectorAll('#theme-toggle').forEach(btn=>{btn.textContent=tema==='escuro'?'☀':'☾';btn.onclick=()=>{const n=document.documentElement.dataset.tema==='escuro'?'claro':'escuro';document.documentElement.dataset.tema=n;localStorage.setItem('mmcd:tema',n);btn.textContent=n==='escuro'?'☀':'☾'}});
};
window.MMCDUI={esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),date:s=>s?new Date(s+'T12:00:00').toLocaleDateString('pt-BR'):'—',toast(msg,duration=2200){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.append(t)}clearTimeout(t._timer);t.textContent=msg;t.classList.add('show');t._timer=setTimeout(()=>t.classList.remove('show'),duration)}};
