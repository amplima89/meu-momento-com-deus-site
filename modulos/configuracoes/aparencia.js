"use strict";
(async function(){
  await window.MMCDShell?.('aparencia');
  const root=document.querySelector('#appearance-root');
  if(!root)return;
  const api=window.MMCDTheme;
  if(!api){
    root.innerHTML='<section class="card appearance-card"><strong>Temas indisponíveis.</strong></section>';
    return;
  }

  const esc=v=>window.MMCDUI?.esc?window.MMCDUI.esc(v):String(v??'');
  let draftEnabled=new Set(api.getEnabled());
  let saving=false;
  let mobileNavigationGuardUntil=0;
  const isMobile=()=>window.matchMedia?.('(max-width:760px)').matches;
  const armMobileNavigationGuard=(ms=900)=>{
    if(isMobile()) mobileNavigationGuardUntil=Date.now()+ms;
  };

  // Safari/iOS pode gerar um segundo clique (ghost click) quando um controle fica
  // próximo da navegação fixa. Se o toque começou num controle de Aparência,
  // bloqueia somente uma eventual navegação da barra inferior logo em seguida.
  document.addEventListener('click',event=>{
    if(Date.now()>mobileNavigationGuardUntil)return;
    if(event.target.closest?.('.sidebar a,.sidebar button')){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      mobileNavigationGuardUntil=0;
    }
  },true);

  const catalogIds=()=>api.getCatalog().map(item=>item.id);
  const orderedDraft=()=>catalogIds().filter(id=>draftEnabled.has(id));

  function updateToggleButton(btn,enabled){
    btn.classList.toggle('is-enabled',enabled);
    btn.setAttribute('aria-pressed',enabled?'true':'false');
    const mark=btn.querySelector('.appearance-enable__toggle');
    if(mark){
      mark.textContent=enabled?'✓':'';
      mark.setAttribute('aria-label',enabled?'Tema habilitado':'Tema desabilitado');
    }
  }

  function toggleEnabled(id,btn){
    if(!api.isAdmin())return;
    if(id===api.getOfficialTheme?.()){
      window.MMCDUI?.toast?.('Memory Original é o tema oficial e permanece sempre disponível.',2800);
      return;
    }
    const isEnabled=draftEnabled.has(id);
    if(isEnabled && draftEnabled.size===1){
      window.MMCDUI?.toast?.('Mantenha pelo menos uma cor habilitada.',2600);
      return;
    }
    if(isEnabled)draftEnabled.delete(id);
    else draftEnabled.add(id);
    updateToggleButton(btn,!isEnabled);
  }

  function render(){
    const catalog=api.getCatalog();
    const enabled=api.getEnabled();
    const current=api.getCurrent();
    const admin=api.isAdmin();

    // Se a API mudou por sincronização/salvamento, mantém o rascunho coerente.
    if(!draftEnabled.size) draftEnabled=new Set(enabled);

    const choices=catalog
      .filter(item=>enabled.includes(item.id))
      .map(item=>`<button type="button" class="appearance-choice ${current===item.id?'active':''}" data-theme-choice="${esc(item.id)}">
        <span class="appearance-swatch" style="--appearance-swatch:${esc(item.swatch)};--appearance-surface:${esc(item.surface)}"></span>
        <span><strong>${esc(item.label)}${item.official?'<em class="memory-official-badge">Oficial</em>':''}</strong><small>${current===item.id?'Em uso':item.official?'Identidade principal do Memory':'Usar este tema'}</small></span>
        <b>${current===item.id?'✓':''}</b>
      </button>`).join('');

    const rows=catalog.map(item=>{
      const on=draftEnabled.has(item.id);
      return `<button type="button" class="appearance-enable ${on?'is-enabled':''}" data-theme-enabled-toggle="${esc(item.id)}" aria-pressed="${on?'true':'false'}" ${(admin&&!item.official)?'':'disabled'}>
        <span class="appearance-swatch" style="--appearance-swatch:${esc(item.swatch)};--appearance-surface:${esc(item.surface)}"></span>
        <span class="appearance-enable__copy"><strong>${esc(item.label)}${item.official?'<em class="memory-official-badge">Oficial</em>':''}</strong><small>${item.official?'Sempre disponível':esc(item.short)}</small></span>
        <span class="appearance-enable__toggle" aria-label="${on?'Tema habilitado':'Tema desabilitado'}">${on?'✓':''}</span>
      </button>`;
    }).join('');

    root.innerHTML=`<section class="card appearance-card">
      <div class="appearance-head">
        <div><p class="eyebrow">Temas de cores</p><h2>Sua aparência</h2><p class="muted">Memory Original é a identidade oficial. As demais paletas continuam disponíveis para você alternar quando quiser.</p></div>
        <span class="appearance-badge">Conta atual</span>
      </div>
      <div class="appearance-choices">${choices}</div>
      <div class="appearance-admin">
        <div class="appearance-admin__head"><div><strong>Administração das paletas</strong><small>${admin?'Toque em uma cor para habilitar ou desabilitar. A alteração só é aplicada ao tocar em Salvar.':'Somente administradores podem alterar o catálogo disponível.'}</small></div></div>
        <div class="appearance-enable-grid">${rows}</div>
        ${admin?'<div class="appearance-actions"><button type="button" class="btn primary" id="appearance-save">Salvar cores habilitadas</button></div>':''}
        
      </div>
    </section>`;

    root.querySelectorAll('[data-theme-choice]').forEach(btn=>{
      btn.addEventListener('pointerdown',armMobileNavigationGuard);
      btn.addEventListener('touchstart',armMobileNavigationGuard,{passive:true});
      btn.addEventListener('click',async event=>{
        armMobileNavigationGuard();
        event.preventDefault();
        event.stopPropagation();
        await api.setTheme(btn.dataset.themeChoice);
        draftEnabled=new Set(api.getEnabled());
        render();
      });
    });

    root.querySelectorAll('[data-theme-enabled-toggle]').forEach(btn=>{
      btn.addEventListener('pointerdown',armMobileNavigationGuard);
      btn.addEventListener('touchstart',armMobileNavigationGuard,{passive:true});
      btn.addEventListener('click',event=>{
        armMobileNavigationGuard();
        event.preventDefault();
        event.stopPropagation();
        toggleEnabled(btn.dataset.themeEnabledToggle,btn);
      });
    });

    const saveButton=root.querySelector('#appearance-save');
    saveButton?.addEventListener('pointerdown',armMobileNavigationGuard);
    saveButton?.addEventListener('touchstart',armMobileNavigationGuard,{passive:true});
    saveButton?.addEventListener('click',async event=>{
      armMobileNavigationGuard(1200);
      event.preventDefault();
      event.stopPropagation();
      if(saving)return;
      const button=event.currentTarget;
      saving=true;
      button.disabled=true;
      button.textContent='Salvando...';
      try{
        const result=await api.saveEnabled(orderedDraft());
        draftEnabled=new Set(result.enabled||api.getEnabled());
        render();
        window.MMCDUI?.toast?.(result.savedGlobal?'Cores sincronizadas na sua conta.':'Cores salvas neste aparelho.',3000);
      }catch(err){
        button.disabled=false;
        button.textContent='Salvar cores habilitadas';
        window.MMCDUI?.toast?.(err.message||'Não foi possível salvar as cores.',3200);
      }finally{
        saving=false;
      }
    });
  }

  // Mantém gestos dos controles dentro da própria página.
  ['pointerdown','pointerup','touchstart','touchend'].forEach(type=>{
    root.addEventListener(type,event=>{
      if(event.target.closest?.('[data-theme-choice],[data-theme-enabled-toggle],#appearance-save')){
        armMobileNavigationGuard();
        event.stopPropagation();
      }
    },{passive:true});
  });

  render();
})();
