"use strict";

(async()=>{
  const KEY="memory_meditacao_links_v1";
  const $=selector=>document.querySelector(selector);
  const esc=value=>window.MMCDUI?.esc?.(value) ?? String(value ?? "");
  let state={versao:1,itens:[]};

  function platform(url){
    try{
      const host=new URL(url).hostname.toLowerCase();
      if(host.includes("youtube.com")||host.includes("youtu.be"))return {nome:"YouTube",icone:"▶️"};
      if(host.includes("spotify.com"))return {nome:"Spotify",icone:"🎧"};
      return {nome:"Link",icone:"🔗"};
    }catch{return {nome:"Link",icone:"🔗"};}
  }

  function normalize(value){
    return {versao:1,itens:Array.isArray(value?.itens)?value.itens.map(item=>({
      id:String(item?.id||crypto.randomUUID()),titulo:String(item?.titulo||"").trim(),url:String(item?.url||"").trim(),ativo:item?.ativo!==false,criadoEm:item?.criadoEm||new Date().toISOString()
    })).filter(item=>item.titulo&&item.url):[]};
  }

  function setStatus(message,type=""){
    const el=$("#med-link-status");if(!el)return;el.textContent=message||"";el.className=`settings-status${type?` is-${type}`:""}`;
  }

  async function save(){state=normalize(state);await window.MemoryConfig.write(KEY,{...state,atualizadoEm:new Date().toISOString()});}

  function render(){
    const list=$("#med-link-list");
    const items=[...state.itens].sort((a,b)=>Number(b.ativo)-Number(a.ativo)||a.titulo.localeCompare(b.titulo,"pt-BR",{sensitivity:"base"}));
    const active=items.filter(item=>item.ativo).length;
    $("#med-link-count").textContent=`${active} ativo${active===1?"":"s"} · ${items.length} no total`;
    if(!items.length){list.innerHTML='<div class="settings-empty">Nenhum link cadastrado. O conteúdo padrão atual continuará sendo exibido.</div>';return;}
    list.innerHTML=items.map(item=>{const p=platform(item.url);return `
      <article class="settings-list-item" data-id="${esc(item.id)}">
       <span class="settings-list-item__icon">${p.icone}</span>
       <span class="settings-list-item__copy"><strong>${esc(item.titulo)}</strong><span class="settings-platform-badge">${p.nome}${item.ativo?" · ativo":" · desativado"}</span><small class="settings-url" title="${esc(item.url)}">${esc(item.url)}</small></span>
       <span class="settings-list-item__actions"><label class="memory-switch" title="${item.ativo?"Desativar":"Ativar"}"><input type="checkbox" data-action="toggle" ${item.ativo?"checked":""}><span></span></label><button type="button" class="settings-mini-btn" data-action="open">Abrir</button><button type="button" class="settings-mini-btn" data-action="edit">Editar</button><button type="button" class="settings-mini-btn danger" data-action="delete">Excluir</button></span>
      </article>`}).join("");
    list.querySelectorAll("[data-id]").forEach(row=>{
      const id=row.dataset.id;
      row.querySelector('[data-action="toggle"]')?.addEventListener("change",async event=>{const item=state.itens.find(x=>x.id===id);if(!item)return;item.ativo=event.target.checked;try{await save();render();window.MMCDUI?.toast(item.ativo?"Conteúdo ativado":"Conteúdo desativado");}catch(error){event.target.checked=!event.target.checked;window.MMCDUI?.toast(error.message,5000);}});
      row.querySelector('[data-action="open"]')?.addEventListener("click",()=>{const item=state.itens.find(x=>x.id===id);if(item)window.open(item.url,"_blank","noopener,noreferrer");});
      row.querySelector('[data-action="edit"]')?.addEventListener("click",()=>edit(id));
      row.querySelector('[data-action="delete"]')?.addEventListener("click",()=>remove(id));
    });
  }

  function resetForm(){
    $("#med-link-form").reset();$("#med-link-id").value="";$("#med-link-active").checked=true;$("#med-link-form-title").textContent="Adicionar conteúdo";$("#med-link-cancel").hidden=true;setStatus("");
  }

  function edit(id){
    const item=state.itens.find(x=>x.id===id);if(!item)return;
    $("#med-link-id").value=item.id;$("#med-link-title").value=item.titulo;$("#med-link-url").value=item.url;$("#med-link-active").checked=item.ativo;$("#med-link-form-title").textContent=`Editar ${item.titulo}`;$("#med-link-cancel").hidden=false;$("#med-link-title").focus();window.scrollTo({top:0,behavior:"smooth"});
  }

  async function remove(id){
    const item=state.itens.find(x=>x.id===id);if(!item||!window.confirm(`Excluir “${item.titulo}”?`))return;
    const previous=[...state.itens];state.itens=state.itens.filter(x=>x.id!==id);
    try{await save();render();resetForm();window.MMCDUI?.toast("Conteúdo removido");}catch(error){state.itens=previous;render();window.MMCDUI?.toast(error.message,5000);}
  }

  $("#med-link-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const titulo=$("#med-link-title").value.trim();const url=$("#med-link-url").value.trim();
    try{new URL(url);}catch{setStatus("Informe um link válido, começando por https://","error");return;}
    if(!titulo){setStatus("Informe um título para reconhecer o conteúdo.","error");return;}
    const id=$("#med-link-id").value||crypto.randomUUID();
    const item={id,titulo,url,ativo:$("#med-link-active").checked,criadoEm:state.itens.find(x=>x.id===id)?.criadoEm||new Date().toISOString()};
    const previous=[...state.itens];const index=state.itens.findIndex(x=>x.id===id);if(index>=0)state.itens[index]=item;else state.itens.push(item);
    setStatus("Salvando no Supabase...");
    try{await save();render();resetForm();setStatus("Conteúdo salvo.","success");window.MMCDUI?.toast("Link salvo");}catch(error){state.itens=previous;render();setStatus(error.message,"error");}
  });
  $("#med-link-cancel").addEventListener("click",resetForm);
  try{state=normalize(await window.MemoryConfig.read(KEY,{versao:1,itens:[]}));render();}catch(error){console.error(error);$("#med-link-list").innerHTML=`<div class="settings-empty">${esc(error.message)}</div>`;setStatus(error.message,"error");}
})().catch(error=>{console.error(error);window.MMCDUI?.toast(error.message||"Erro ao abrir os links da meditação",5000);});
