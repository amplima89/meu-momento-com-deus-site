"use strict";
(async function(){
  await window.MMCDShell?.('aparencia');
  const root=document.querySelector('#appearance-root');
  if(!root)return;
  const api=window.MMCDTheme;
  if(!api){root.innerHTML='<section class="card appearance-card"><strong>Temas indisponíveis.</strong></section>';return;}

  const esc=v=>window.MMCDUI?.esc?window.MMCDUI.esc(v):String(v??'');
  function render(){
    const catalog=api.getCatalog();
    const enabled=api.getEnabled();
    const current=api.getCurrent();
    const admin=api.isAdmin();
    const choices=catalog.filter(item=>enabled.includes(item.id)).map(item=>`<button type="button" class="appearance-choice ${current===item.id?'active':''}" data-theme-choice="${esc(item.id)}"><span class="appearance-swatch" style="--appearance-swatch:${esc(item.swatch)};--appearance-surface:${esc(item.surface)}"></span><span><strong>${esc(item.label)}</strong><small>${current===item.id?'Em uso':'Usar este tema'}</small></span><b>${current===item.id?'✓':''}</b></button>`).join('');
    const rows=catalog.map(item=>`<label class="appearance-enable"><span class="appearance-swatch" style="--appearance-swatch:${esc(item.swatch)};--appearance-surface:${esc(item.surface)}"></span><span><strong>${esc(item.label)}</strong><small>${esc(item.short)}</small></span><input type="checkbox" data-theme-enabled value="${esc(item.id)}" ${enabled.includes(item.id)?'checked':''} ${admin?'':'disabled'}></label>`).join('');
    root.innerHTML=`<section class="card appearance-card"><div class="appearance-head"><div><p class="eyebrow">Temas de cores</p><h2>Sua aparência</h2><p class="muted">A paleta escolhida é individual para cada usuário.</p></div><span class="appearance-badge">${api.governanceMode()==='global'?'Multiusuário':'Compatível'}</span></div><div class="appearance-choices">${choices}</div><div class="appearance-admin"><div class="appearance-admin__head"><div><strong>Administração das paletas</strong><small>${admin?'Habilite somente as cores que deseja disponibilizar no projeto.':'Somente administradores podem alterar o catálogo disponível.'}</small></div></div><div class="appearance-enable-grid">${rows}</div>${admin?'<div class="appearance-actions"><button type="button" class="btn primary" id="appearance-save">Salvar cores habilitadas</button></div>':''}${api.governanceMode()!=='global'?'<p class="appearance-note">Para a liberação de cores valer globalmente para todos os usuários, execute a migração <strong>SUPABASE_TEMAS_MULTIUSUARIO.sql</strong> incluída no projeto.</p>':''}</div></section>`;
    root.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.addEventListener('click',async()=>{await api.setTheme(btn.dataset.themeChoice);render();}));
    root.querySelector('#appearance-save')?.addEventListener('click',async()=>{
      const ids=[...root.querySelectorAll('[data-theme-enabled]:checked')].map(el=>el.value);
      try{const result=await api.saveEnabled(ids);render();window.MMCDUI?.toast?.(result.savedGlobal?'Cores habilitadas para o projeto.':'Cores salvas neste ambiente.',3000);}catch(err){window.MMCDUI?.toast?.(err.message||'Não foi possível salvar as cores.',3200);}
    });
  }
  render();
})();
