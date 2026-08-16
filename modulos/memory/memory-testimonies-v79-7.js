"use strict";
(async()=>{
  const C=window.MemoryCare;
  if(!C) return;

  const KEY="memory_testemunhos_v1";
  const VISIBILITIES={
    privado:{label:"Somente eu",icon:"🔒",className:"is-private"},
    publico_identificado:{label:"Público · identificado",icon:"🌎",className:"is-public"},
    publico_anonimo:{label:"Público · anônimo",icon:"🕊️",className:"is-anonymous"}
  };

  const form=document.querySelector("#testimony-form");
  const dateInput=document.querySelector("#testimony-date");
  const titleInput=document.querySelector("#testimony-title");
  const textInput=document.querySelector("#testimony-text");
  const counter=document.querySelector("#testimony-counter");
  const history=document.querySelector("#testimony-history");
  const count=document.querySelector("#testimony-count");
  const statusEl=document.querySelector("#testimony-save-status");
  const preview=document.querySelector("#testimony-privacy-preview");
  const cancelButton=document.querySelector("#testimony-cancel");
  const submitButton=document.querySelector("#testimony-submit");
  if(!form||!dateInput||!titleInput||!textInput||!history) return;

  let state={schemaVersion:1,itens:[],atualizadoEm:null};
  let editingId="";
  let identityName="";

  const pad=n=>String(n).padStart(2,"0");
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
  const normalize=value=>String(value||"").trim();
  const fmtDate=value=>C.fmtDate(value);
  const visibility=()=>form.querySelector('input[name="visibilidade"]:checked')?.value||"privado";
  const visibilityMeta=value=>VISIBILITIES[value]||VISIBILITIES.privado;
  const normalizeState=value=>({
    schemaVersion:1,
    itens:Array.isArray(value?.itens)?value.itens.filter(Boolean).map(item=>({
      ...item,
      visibilidade:VISIBILITIES[item?.visibilidade]?item.visibilidade:"privado"
    })):[],
    atualizadoEm:value?.atualizadoEm||null
  });
  const setStatus=(text,type="")=>C.status(statusEl,text,type);

  async function loadIdentity(){
    try{
      const session=await window.MMCDAuth?.requireSession?.();
      const profile=session?.user ? await window.MMCDAuth?.loadProfile?.(session.user) : {};
      identityName=normalize(
        profile?.nome ||
        session?.user?.user_metadata?.full_name ||
        session?.user?.user_metadata?.name ||
        session?.user?.email?.split("@")[0]
      );
    }catch{
      identityName="";
    }
  }

  async function persist(){
    state.atualizadoEm=new Date().toISOString();
    await C.write(KEY,JSON.parse(JSON.stringify(state)));
  }

  function sorted(){
    return [...state.itens].sort((a,b)=>
      String(b.data||"").localeCompare(String(a.data||"")) ||
      String(b.atualizadoEm||b.criadoEm||"").localeCompare(String(a.atualizadoEm||a.criadoEm||""))
    );
  }

  function renderCounter(){
    counter.textContent=`${textInput.value.length.toLocaleString("pt-BR")} / 12.000`;
  }

  function renderPrivacyPreview(){
    const mode=visibility();
    if(mode==="privado"){
      preview.innerHTML="<strong>🔒 Privado.</strong> Este testemunho ficará disponível apenas na sua conta e não terá botão de compartilhamento.";
      return;
    }
    if(mode==="publico_anonimo"){
      preview.innerHTML="<strong>🕊️ Público anônimo.</strong> Ao compartilhar, o Memory envia somente o testemunho. Nome, usuário, foto e link de perfil são removidos.";
      return;
    }
    preview.innerHTML=`<strong>🌎 Público identificado.</strong> Ao compartilhar, o Memory poderá assinar o texto como <strong>${C.esc(identityName||"seu nome")}</strong>.`;
  }

  function renderHistory(){
    const rows=sorted();
    count.textContent=`${rows.length} ${rows.length===1?"registro":"registros"}`;
    history.innerHTML=rows.length?rows.map(item=>{
      const meta=visibilityMeta(item.visibilidade);
      const canShare=item.visibilidade!=="privado";
      return `<article class="testimony-row ${editingId===item.id?"is-editing":""}" data-testimony-id="${C.esc(item.id)}">
        <div class="testimony-row__head">
          <h3>${C.esc(item.titulo||"Testemunho")}</h3>
          <time>${C.esc(fmtDate(item.data))}</time>
        </div>
        <p class="testimony-row__text">${C.esc(item.texto||"")}</p>
        <div class="testimony-row__meta">
          <span class="testimony-chip ${meta.className}">${meta.icon} ${C.esc(meta.label)}</span>
          ${item.visibilidade==="publico_anonimo"?'<span class="testimony-chip is-anonymous">Identidade protegida</span>':""}
        </div>
        <div class="testimony-row__actions">
          <button type="button" data-testimony-edit>Editar</button>
          <button type="button" class="danger" data-testimony-delete>Excluir</button>
          ${canShare?'<button type="button" class="share" data-testimony-share>Compartilhar</button>':""}
        </div>
      </article>`;
    }).join(""):`<div class="testimony-empty">Nenhum testemunho registrado ainda.<br>Quando algo merecer ser lembrado, guarde aqui.</div>`;
  }

  function resetForm(){
    editingId="";
    form.reset();
    dateInput.value=today();
    form.querySelector('input[value="privado"]').checked=true;
    cancelButton.hidden=true;
    submitButton.textContent="Salvar testemunho ✓";
    renderCounter();
    renderPrivacyPreview();
    renderHistory();
  }

  function loadIntoForm(item){
    editingId=item.id;
    dateInput.value=item.data||today();
    titleInput.value=item.titulo||"";
    textInput.value=item.texto||"";
    const radio=form.querySelector(`input[name="visibilidade"][value="${item.visibilidade}"]`) || form.querySelector('input[value="privado"]');
    radio.checked=true;
    cancelButton.hidden=false;
    submitButton.textContent="Salvar alterações ✓";
    renderCounter();
    renderPrivacyPreview();
    renderHistory();
    form.scrollIntoView({behavior:"smooth",block:"start"});
    titleInput.focus();
  }

  function shareText(item){
    const mode=item.visibilidade;
    const parts=[item.titulo||"Meu testemunho", "", item.texto||""];
    if(mode==="publico_identificado" && identityName){
      parts.push("",`— ${identityName}`);
    }else if(mode==="publico_anonimo"){
      parts.push("","Testemunho compartilhado anonimamente pelo Memory.");
    }
    return parts.join("\n").trim();
  }

  async function shareItem(item){
    if(item.visibilidade==="privado"){
      C.toast("Este testemunho está marcado como privado.");
      return;
    }
    const text=shareText(item);
    try{
      if(navigator.share){
        await navigator.share({title:item.titulo||"Meu testemunho",text});
      }else{
        await navigator.clipboard.writeText(text);
        C.toast("Testemunho copiado para compartilhar.");
      }
    }catch(error){
      if(error?.name!=="AbortError"){
        try{
          await navigator.clipboard.writeText(text);
          C.toast("Testemunho copiado para compartilhar.");
        }catch{
          C.toast("Não foi possível abrir o compartilhamento.",3500);
        }
      }
    }
  }

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const titulo=normalize(titleInput.value);
    const texto=normalize(textInput.value);
    if(!titulo){C.toast("Dê um título ao testemunho.");return}
    if(!texto){C.toast("Escreva seu testemunho antes de salvar.");return}

    const now=new Date().toISOString();
    const item={
      id:editingId||C.uuid(),
      data:dateInput.value||today(),
      titulo,
      texto,
      visibilidade:visibility(),
      criadoEm:now,
      atualizadoEm:now
    };

    const before=JSON.parse(JSON.stringify(state));
    if(editingId){
      const index=state.itens.findIndex(x=>x.id===editingId);
      if(index>=0){
        item.criadoEm=state.itens[index].criadoEm||now;
        state.itens[index]=item;
      }else state.itens.push(item);
    }else state.itens.push(item);

    try{
      setStatus(editingId?"Atualizando…":"Salvando…","saving");
      await persist();
      setStatus("Salvo no Supabase","saved");
      C.toast(editingId?"Testemunho atualizado.":"Testemunho registrado.");
      resetForm();
    }catch(error){
      state=before;
      console.error(error);
      setStatus("Erro ao salvar","error");
      C.toast(error.message||"Não foi possível salvar o testemunho.",4500);
    }
  });

  history.addEventListener("click",async event=>{
    const row=event.target.closest("[data-testimony-id]");
    if(!row)return;
    const item=state.itens.find(x=>x.id===row.dataset.testimonyId);
    if(!item)return;

    if(event.target.closest("[data-testimony-edit]")){
      loadIntoForm(item);
      return;
    }
    if(event.target.closest("[data-testimony-share]")){
      await shareItem(item);
      return;
    }
    if(event.target.closest("[data-testimony-delete]")){
      if(!confirm("Excluir este testemunho?"))return;
      const before=JSON.parse(JSON.stringify(state));
      state.itens=state.itens.filter(x=>x.id!==item.id);
      try{
        setStatus("Salvando…","saving");
        await persist();
        if(editingId===item.id) resetForm();
        else renderHistory();
        setStatus("Salvo no Supabase","saved");
        C.toast("Testemunho excluído.");
      }catch(error){
        state=before;
        setStatus("Erro ao salvar","error");
        renderHistory();
        C.toast(error.message||"Não foi possível excluir.",4500);
      }
    }
  });

  cancelButton.addEventListener("click",resetForm);
  textInput.addEventListener("input",renderCounter);
  form.querySelectorAll('input[name="visibilidade"]').forEach(input=>input.addEventListener("change",renderPrivacyPreview));

  try{
    dateInput.value=today();
    await loadIdentity();
    state=normalizeState(await C.read(KEY,{schemaVersion:1,itens:[]}));
    setStatus("Salvo no Supabase","saved");
    renderCounter();
    renderPrivacyPreview();
    renderHistory();
  }catch(error){
    console.error(error);
    setStatus("Falha ao carregar","error");
    history.innerHTML=`<div class="testimony-empty">${C.esc(error.message||"Não foi possível carregar seus testemunhos.")}</div>`;
  }
})().catch(error=>{
  console.error(error);
  window.MMCDUI?.toast?.(error.message||"Não foi possível abrir Testemunhos.",4500);
});
