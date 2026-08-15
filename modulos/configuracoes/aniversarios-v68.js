"use strict";

(async()=>{
  const KEY="memory_aniversarios_v1";
  const $=selector=>document.querySelector(selector);
  const esc=value=>window.MMCDUI?.esc?.(value) ?? String(value ?? "");
  const meses=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  let state={versao:1,itens:[]};

  function normalize(value){
    return {
      versao:1,
      itens:Array.isArray(value?.itens)?value.itens.map(item=>({
        id:String(item?.id||crypto.randomUUID()),
        nome:String(item?.nome||"").trim(),
        dia:Number(item?.dia||0),
        mes:Number(item?.mes||0),
        relacao:String(item?.relacao||"").trim(),
        ativo:item?.ativo!==false,
        criadoEm:item?.criadoEm||new Date().toISOString()
      })).filter(item=>item.nome&&item.dia>=1&&item.dia<=31&&item.mes>=1&&item.mes<=12):[]
    };
  }

  function maxDay(month){
    if(month===2)return 29;
    if([4,6,9,11].includes(month))return 30;
    return 31;
  }

  function setStatus(message,type=""){
    const el=$("#birthday-status");
    if(!el)return;
    el.textContent=message||"";
    el.className=`settings-status${type?` is-${type}`:""}`;
  }

  async function save(){
    state=normalize(state);
    await window.MemoryConfig.write(KEY,{...state,atualizadoEm:new Date().toISOString()});
  }

  function sortItems(items){
    return [...items].sort((a,b)=>a.mes-b.mes||a.dia-b.dia||a.nome.localeCompare(b.nome,"pt-BR",{sensitivity:"base"}));
  }

  function render(){
    const list=$("#birthday-list");
    const items=sortItems(state.itens);
    $("#birthday-count").textContent=`${items.length} cadastrada${items.length===1?"":"s"}`;
    if(!items.length){
      list.innerHTML='<div class="settings-empty">Nenhuma pessoa cadastrada ainda.</div>';
      return;
    }
    list.innerHTML=items.map(item=>`
      <article class="settings-list-item" data-id="${esc(item.id)}">
        <span class="settings-list-item__icon">🎂</span>
        <span class="settings-list-item__copy">
          <strong>${esc(item.nome)}</strong>
          <small>${String(item.dia).padStart(2,"0")} de ${meses[item.mes-1]}${item.relacao?` · ${esc(item.relacao)}`:""}${item.ativo?"":" · desativado"}</small>
        </span>
        <span class="settings-list-item__actions">
          <label class="memory-switch" title="${item.ativo?"Desativar":"Ativar"}"><input type="checkbox" data-action="toggle" ${item.ativo?"checked":""}><span></span></label>
          <button type="button" class="settings-mini-btn" data-action="edit">Editar</button>
          <button type="button" class="settings-mini-btn danger" data-action="delete">Excluir</button>
        </span>
      </article>`).join("");

    list.querySelectorAll("[data-id]").forEach(row=>{
      const id=row.dataset.id;
      row.querySelector('[data-action="toggle"]')?.addEventListener("change",async event=>{
        const item=state.itens.find(x=>x.id===id);if(!item)return;
        item.ativo=event.target.checked;
        try{await save();render();window.MMCDUI?.toast(item.ativo?"Lembrete ativado":"Lembrete desativado");}
        catch(error){event.target.checked=!event.target.checked;window.MMCDUI?.toast(error.message,5000);}
      });
      row.querySelector('[data-action="edit"]')?.addEventListener("click",()=>edit(id));
      row.querySelector('[data-action="delete"]')?.addEventListener("click",()=>remove(id));
    });
  }

  function resetForm(){
    $("#birthday-form").reset();
    $("#birthday-id").value="";
    $("#birthday-active").checked=true;
    $("#birthday-form-title").textContent="Adicionar pessoa";
    $("#birthday-cancel").hidden=true;
    setStatus("");
  }

  function edit(id){
    const item=state.itens.find(x=>x.id===id);if(!item)return;
    $("#birthday-id").value=item.id;
    $("#birthday-name").value=item.nome;
    $("#birthday-day").value=item.dia;
    $("#birthday-month").value=String(item.mes);
    $("#birthday-relation").value=item.relacao;
    $("#birthday-active").checked=item.ativo;
    $("#birthday-form-title").textContent=`Editar ${item.nome}`;
    $("#birthday-cancel").hidden=false;
    $("#birthday-name").focus();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function remove(id){
    const item=state.itens.find(x=>x.id===id);if(!item)return;
    if(!window.confirm(`Excluir o aniversário de ${item.nome}?`))return;
    const previous=[...state.itens];
    state.itens=state.itens.filter(x=>x.id!==id);
    try{await save();render();resetForm();window.MMCDUI?.toast("Aniversário removido");}
    catch(error){state.itens=previous;render();window.MMCDUI?.toast(error.message,5000);}
  }

  $("#birthday-form").addEventListener("submit",async event=>{
    event.preventDefault();
    const nome=$("#birthday-name").value.trim();
    const dia=Number($("#birthday-day").value);
    const mes=Number($("#birthday-month").value);
    if(!nome){setStatus("Informe o nome.","error");return;}
    if(!mes||dia<1||dia>maxDay(mes)){setStatus("Confira o dia e o mês do aniversário.","error");return;}
    const id=$("#birthday-id").value||crypto.randomUUID();
    const item={id,nome,dia,mes,relacao:$("#birthday-relation").value.trim(),ativo:$("#birthday-active").checked,criadoEm:state.itens.find(x=>x.id===id)?.criadoEm||new Date().toISOString()};
    const previous=[...state.itens];
    const index=state.itens.findIndex(x=>x.id===id);
    if(index>=0)state.itens[index]=item;else state.itens.push(item);
    setStatus("Salvando no Supabase...");
    try{await save();render();resetForm();setStatus("Pessoa salva.","success");window.MMCDUI?.toast("Aniversário salvo");}
    catch(error){state.itens=previous;render();setStatus(error.message,"error");}
  });

  $("#birthday-cancel").addEventListener("click",resetForm);

  try{
    state=normalize(await window.MemoryConfig.read(KEY,{versao:1,itens:[]}));
    render();
  }catch(error){
    console.error(error);
    $("#birthday-list").innerHTML=`<div class="settings-empty">${esc(error.message)}</div>`;
    setStatus(error.message,"error");
  }
})().catch(error=>{console.error(error);window.MMCDUI?.toast(error.message||"Erro ao abrir aniversários",5000);});
