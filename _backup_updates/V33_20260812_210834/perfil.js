"use strict";
(async()=>{
  const session=await MMCDAuth.requireSession();
  const user=session.user;
  const $=selector=>document.querySelector(selector);
  let profile=await MMCDAuth.loadProfile(user);

  function label(){
    return String(profile?.nome||user?.user_metadata?.full_name||user?.user_metadata?.name||user?.user_metadata?.user_name||user?.email?.split("@")[0]||"Usuário").trim();
  }

  function fallbackAvatar(){
    return user?.user_metadata?.avatar_url||user?.user_metadata?.picture||"";
  }

  function render(){
    const preview=$("#profile-preview");
    const source=profile?.avatarDataUrl||fallbackAvatar();
    preview.innerHTML=source?`<img src="${MMCDUI.esc(source)}" alt="Foto de perfil">`:`<span id="profile-initial">${MMCDUI.esc((label()[0]||"U").toUpperCase())}</span>`;
    $("#profile-user-name").textContent=label();
    $("#profile-user-email").textContent=user?.email||"";
    $("#profile-remove").disabled=!profile?.avatarDataUrl;
  }

  function carregarImagem(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>{
        const image=new Image();
        image.onload=()=>resolve(image);
        image.onerror=()=>reject(new Error("Não foi possível abrir esta imagem."));
        image.src=reader.result;
      };
      reader.onerror=()=>reject(new Error("Não foi possível ler o arquivo."));
      reader.readAsDataURL(file);
    });
  }

  async function compactarAvatar(file){
    if(!file?.type?.startsWith("image/"))throw new Error("Escolha um arquivo de imagem.");
    const image=await carregarImagem(file);
    const size=Math.min(image.naturalWidth||image.width,image.naturalHeight||image.height);
    if(!size)throw new Error("Imagem inválida.");
    const sx=Math.max(0,((image.naturalWidth||image.width)-size)/2);
    const sy=Math.max(0,((image.naturalHeight||image.height)-size)/2);
    const canvas=document.createElement("canvas");
    canvas.width=160;canvas.height=160;
    const ctx=canvas.getContext("2d",{alpha:false});
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,160,160);
    ctx.drawImage(image,sx,sy,size,size,0,0,160,160);
    return canvas.toDataURL("image/jpeg",0.82);
  }

  $("#profile-choose").addEventListener("click",()=>$("#profile-file").click());
  $("#profile-file").addEventListener("change",async event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    const button=$("#profile-choose");
    button.disabled=true;button.textContent="Salvando...";
    try{
      const avatarDataUrl=await compactarAvatar(file);
      profile={...(profile||{}),avatarDataUrl,atualizadoEm:new Date().toISOString()};
      await MMCDAuth.saveProfile(user,profile);
      render();
      await MMCDAuth.refreshAccountProfile(user);
      MMCDUI.toast("Foto de perfil atualizada");
    }catch(error){alert(error.message)}finally{
      event.target.value="";
      button.disabled=false;button.textContent="Escolher foto";
    }
  });

  $("#profile-remove").addEventListener("click",async()=>{
    if(!profile?.avatarDataUrl)return;
    const button=$("#profile-remove");
    button.disabled=true;
    try{
      const {avatarDataUrl,...rest}=profile;
      profile={...rest,atualizadoEm:new Date().toISOString()};
      await MMCDAuth.saveProfile(user,profile);
      render();
      await MMCDAuth.refreshAccountProfile(user);
      MMCDUI.toast("Foto personalizada removida");
    }catch(error){alert(error.message)}finally{button.disabled=false}
  });

  render();
})();
