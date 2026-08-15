"use strict";
(async()=>{
  const session=await MMCDAuth.requireSession();
  const user=session.user;
  const $=selector=>document.querySelector(selector);
  const esc=value=>window.MMCDUI?.esc ? MMCDUI.esc(value) : String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let profile=await MMCDAuth.loadProfile(user);

  function label(){
    return String(profile?.nome||user?.user_metadata?.full_name||user?.user_metadata?.name||user?.user_metadata?.user_name||user?.email?.split("@")[0]||"Usuário").trim();
  }

  function fallbackAvatar(){
    return user?.user_metadata?.avatar_url||user?.user_metadata?.picture||"";
  }

  function setStatus(message="",kind=""){
    const el=$("#profile-status");
    if(!el)return;
    el.textContent=message;
    el.dataset.kind=kind;
  }

  function render(){
    const preview=$("#profile-preview");
    const source=profile?.avatarDataUrl||fallbackAvatar();
    preview.innerHTML=source?`<img src="${esc(source)}" alt="Foto de perfil">`:`<span id="profile-initial">${esc((label()[0]||"U").toUpperCase())}</span>`;
    $("#profile-user-name").textContent=label();
    $("#profile-user-email").textContent=user?.email||"";
    $("#profile-remove").disabled=!profile?.avatarDataUrl;
  }

  async function carregarImagem(file){
    if(window.createImageBitmap){
      try{return await createImageBitmap(file,{imageOrientation:"from-image"})}catch{}
    }
    return await new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const image=new Image();
      image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
      image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Não consegui abrir esta foto. Tente uma imagem JPG, PNG ou WEBP."))};
      image.src=url;
    });
  }

  async function compactarAvatar(file){
    if(!file)throw new Error("Escolha uma foto.");
    if(file.size>25*1024*1024)throw new Error("A foto é muito grande. Escolha uma imagem com até 25 MB.");
    if(file.type && !file.type.startsWith("image/"))throw new Error("Escolha um arquivo de imagem.");
    const image=await carregarImagem(file);
    const width=image.naturalWidth||image.width||0;
    const height=image.naturalHeight||image.height||0;
    const size=Math.min(width,height);
    if(!size)throw new Error("Imagem inválida.");
    const sx=Math.max(0,(width-size)/2);
    const sy=Math.max(0,(height-size)/2);
    const canvas=document.createElement("canvas");
    canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext("2d",{alpha:false});
    if(!ctx)throw new Error("Seu navegador não conseguiu preparar a foto.");
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,128,128);
    ctx.drawImage(image,sx,sy,size,size,0,0,128,128);
    if(typeof image.close==="function")try{image.close()}catch{}
    return canvas.toDataURL("image/jpeg",0.76);
  }

  $("#profile-choose").addEventListener("click",()=>$("#profile-file").click());
  $("#profile-file").addEventListener("change",async event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    const button=$("#profile-choose");
    button.disabled=true;button.textContent="Preparando...";setStatus("Preparando sua foto…","working");
    try{
      const avatarDataUrl=await compactarAvatar(file);
      profile={...(profile||{}),avatarDataUrl,atualizadoEm:new Date().toISOString()};
      render();
      button.textContent="Salvando...";setStatus("Foto pronta. Sincronizando…","working");
      try{
        await MMCDAuth.saveProfile(user,profile);
        await MMCDAuth.refreshAccountProfile(user);
        setStatus("Foto salva e sincronizada.","success");
        window.MMCDUI?.toast("Foto de perfil atualizada");
      }catch(syncError){
        // O cache local já foi salvo por MMCDAuth.saveProfile antes da tentativa remota.
        await MMCDAuth.refreshAccountProfile(user);
        setStatus("Foto aplicada neste aparelho, mas a sincronização falhou.","warning");
        alert(syncError.message);
      }
    }catch(error){
      setStatus(error.message,"error");
      alert(error.message);
    }finally{
      event.target.value="";
      button.disabled=false;button.textContent="Escolher foto";
    }
  });

  $("#profile-remove").addEventListener("click",async()=>{
    if(!profile?.avatarDataUrl)return;
    const button=$("#profile-remove");
    button.disabled=true;setStatus("Removendo foto…","working");
    const previous=profile;
    try{
      const {avatarDataUrl,...rest}=profile;
      profile={...rest,atualizadoEm:new Date().toISOString()};
      render();
      try{
        await MMCDAuth.saveProfile(user,profile);
        await MMCDAuth.refreshAccountProfile(user);
        setStatus("Foto personalizada removida.","success");
        window.MMCDUI?.toast("Foto personalizada removida");
      }catch(syncError){
        await MMCDAuth.refreshAccountProfile(user);
        setStatus("Removida neste aparelho, mas a sincronização falhou.","warning");
        alert(syncError.message);
      }
    }catch(error){
      profile=previous;render();setStatus(error.message,"error");alert(error.message);
    }finally{button.disabled=false}
  });

  render();
})();
