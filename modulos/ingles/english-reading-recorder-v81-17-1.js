"use strict";

window.MMCDEnglishReadingRecorderV81171 = (() => {
  const AUDIO_PREFIX="ingles_leitura_audio_v81_17_1";
  const MAX_SECONDS=300;

  let ctx=null;
  let host=null;
  let recorder=null;
  let stream=null;
  let chunks=[];
  let timer=null;
  let startedAt=0;
  let audioBlob=null;
  let durationSeconds=0;
  let savedAudio=null;

  const esc=value=>String(value ?? "").replace(/[&<>"']/g,char=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[char]));

  function keyFor(date){
    return `${AUDIO_PREFIX}:${date}`;
  }

  function toast(message){
    window.MMCDUI?.toast?.(message);
  }

  function supported(){
    return Boolean(
      navigator.mediaDevices?.getUserMedia
      && window.MediaRecorder
    );
  }

  function mimeType(){
    const options=[
      "audio/webm;codecs=opus",
      "audio/mp4",
      "audio/webm",
      "audio/ogg;codecs=opus"
    ];

    return options.find(type=>
      window.MediaRecorder?.isTypeSupported?.(type)
    ) || "";
  }

  function secondsLabel(seconds){
    const value=Math.max(0,Number(seconds) || 0);
    const minutes=String(Math.floor(value/60)).padStart(2,"0");
    const rest=String(Math.floor(value%60)).padStart(2,"0");
    return `${minutes}:${rest}`;
  }

  function stopTracks(){
    stream?.getTracks?.().forEach(track=>track.stop());
    stream=null;

    if(timer){
      clearInterval(timer);
      timer=null;
    }
  }

  function blobBase64(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(reader.error);
      reader.onload=()=>{
        const value=String(reader.result || "");
        resolve(value.includes(",") ? value.split(",",2)[1] : value);
      };
      reader.readAsDataURL(blob);
    });
  }

  async function readSaved(){
    if(!ctx?.db || !ctx?.usuario?.id || !ctx?.data) return null;

    const {data,error}=await ctx.db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",ctx.usuario.id)
      .eq("chave",keyFor(ctx.data))
      .maybeSingle();

    if(error) throw error;

    const value=data?.valor;
    return value && typeof value==="object"
      ? structuredClone(value)
      : null;
  }

  async function writeSaved(blob,duration){
    if(!ctx?.db || !ctx?.usuario?.id || !ctx?.data){
      throw new Error("Contexto da leitura indisponível.");
    }

    const base64=await blobBase64(blob);
    const key=keyFor(ctx.data);
    const value={
      arquivoBase64:base64,
      mimeType:blob.type || "audio/webm",
      duracaoSegundos:duration,
      atualizadoEm:new Date().toISOString(),
      tipo:"leitura_em_voz_alta"
    };

    const {error}=await ctx.db
      .from("configuracoes_usuario")
      .upsert({
        user_id:ctx.usuario.id,
        chave:key,
        valor:value
      },{onConflict:"user_id,chave"});

    if(error) throw error;

    savedAudio={
      key,
      mimeType:value.mimeType,
      durationSeconds:duration,
      savedAt:value.atualizadoEm
    };

    document.dispatchEvent(
      new CustomEvent("memory:english-reading-audio-saved",{
        detail:{
          date:ctx.data,
          ...savedAudio
        }
      })
    );

    return savedAudio;
  }

  async function deleteSaved(){
    if(!ctx?.db || !ctx?.usuario?.id || !ctx?.data) return;

    const {error}=await ctx.db
      .from("configuracoes_usuario")
      .delete()
      .eq("user_id",ctx.usuario.id)
      .eq("chave",keyFor(ctx.data));

    if(error) throw error;

    savedAudio=null;
    audioBlob=null;
    durationSeconds=0;

    document.dispatchEvent(
      new CustomEvent("memory:english-reading-audio-saved",{
        detail:{
          date:ctx.data,
          deleted:true
        }
      })
    );
  }

  function html(){
    return `
      <section class="english-reading-recorder-v81171" data-reading-recorder-v81171>
        <div class="english-reading-recorder-v81171__head">
          <div>
            <span>LEITURA EM VOZ ALTA</span>
            <strong>Grave sua leitura para a IA avaliar</strong>
            <p>A IA compara o que foi reconhecido no áudio com o texto acima e aponta trechos para repetir.</p>
          </div>
          <em data-reading-recorder-time>00:00</em>
        </div>

        <div class="english-reading-recorder-v81171__status">
          <strong data-reading-recorder-status>Pronto para gravar</strong>
          <small>Leia o texto em voz alta no seu ritmo normal. Máximo de 5 minutos.</small>
        </div>

        <div class="english-reading-recorder-v81171__actions">
          <button type="button" class="btn primary" data-reading-record>
            Gravar leitura
          </button>
          <button type="button" class="btn" data-reading-stop disabled>
            Parar
          </button>
          <button type="button" class="btn" data-reading-delete hidden>
            Excluir e refazer
          </button>
        </div>

        <audio controls hidden data-reading-audio></audio>

        <p class="english-reading-recorder-v81171__note">
          A avaliação usa a transcrição automática como evidência de fidelidade da leitura. Ela não mede fonemas ou sotaque de forma clínica.
        </p>
      </section>
    `;
  }

  function elements(){
    return {
      record:host?.querySelector("[data-reading-record]"),
      stop:host?.querySelector("[data-reading-stop]"),
      del:host?.querySelector("[data-reading-delete]"),
      status:host?.querySelector("[data-reading-recorder-status]"),
      time:host?.querySelector("[data-reading-recorder-time]"),
      audio:host?.querySelector("[data-reading-audio]")
    };
  }

  function showSaved(value,withPlayback=true){
    if(!host) return;

    const el=elements();
    const duration=Number(
      value?.durationSeconds
      ?? value?.duracaoSegundos
      ?? 0
    );

    if(el.status){
      el.status.textContent=`Gravação pronta para a IA${duration ? ` · ${duration}s` : ""}`;
    }

    if(el.time){
      el.time.textContent=secondsLabel(duration);
    }

    if(el.del){
      el.del.hidden=false;
    }

    const base64=String(value?.arquivoBase64 || "").trim();
    const mime=String(value?.mimeType || "audio/webm");

    if(withPlayback && base64 && el.audio){
      el.audio.src=`data:${mime};base64,${base64}`;
      el.audio.hidden=false;
    }
  }

  async function startRecording(){
    if(!supported()){
      toast("Este navegador não oferece gravação de áudio.");
      return;
    }

    const el=elements();

    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      chunks=[];
      durationSeconds=0;
      audioBlob=null;

      const type=mimeType();
      recorder=new MediaRecorder(
        stream,
        type
          ? {mimeType:type,audioBitsPerSecond:32000}
          : {audioBitsPerSecond:32000}
      );

      startedAt=Date.now();

      recorder.addEventListener("dataavailable",event=>{
        if(event.data?.size) chunks.push(event.data);
      });

      recorder.addEventListener("stop",async()=>{
        durationSeconds=Math.max(
          1,
          Math.round((Date.now()-startedAt)/1000)
        );

        stopTracks();

        audioBlob=new Blob(
          chunks,
          {type:recorder.mimeType || "audio/webm"}
        );

        if(el.audio){
          el.audio.src=URL.createObjectURL(audioBlob);
          el.audio.hidden=false;
        }

        if(el.record){
          el.record.disabled=true;
          el.record.textContent="Salvando gravação...";
        }

        if(el.stop){
          el.stop.disabled=true;
        }

        if(el.status){
          el.status.textContent="Salvando para a correção final...";
        }

        try{
          await writeSaved(audioBlob,durationSeconds);

          if(el.status){
            el.status.textContent=`Gravação pronta para a IA · ${durationSeconds}s`;
          }

          if(el.del){
            el.del.hidden=false;
          }

          toast("Leitura gravada. A IA vai avaliá-la na correção final.");
        }catch(error){
          console.error("Inglês: falha ao salvar leitura gravada.",error);

          if(el.status){
            el.status.textContent="Não foi possível salvar a gravação.";
          }

          toast("Não foi possível salvar a gravação da leitura.");
        }finally{
          if(el.record){
            el.record.disabled=false;
            el.record.textContent="Gravar novamente";
          }
        }
      });

      recorder.start();

      if(el.record){
        el.record.disabled=true;
      }

      if(el.stop){
        el.stop.disabled=false;
      }

      if(el.status){
        el.status.textContent="Gravando sua leitura...";
      }

      if(el.time){
        el.time.textContent="00:00";
      }

      timer=setInterval(()=>{
        const seconds=Math.floor((Date.now()-startedAt)/1000);

        if(el.time){
          el.time.textContent=secondsLabel(seconds);
        }

        if(seconds>=MAX_SECONDS && recorder?.state==="recording"){
          recorder.stop();
          toast("A gravação chegou ao limite de 5 minutos.");
        }
      },500);
    }catch(error){
      console.error("Inglês: microfone indisponível.",error);
      stopTracks();

      if(el.record) el.record.disabled=false;
      if(el.stop) el.stop.disabled=true;
      if(el.status) el.status.textContent="Não foi possível acessar o microfone.";

      toast("Autorize o microfone para gravar sua leitura.");
    }
  }

  function bind(){
    if(!host) return;

    const el=elements();

    if(!supported()){
      if(el.record) el.record.disabled=true;
      if(el.status) el.status.textContent="Gravação não suportada neste navegador.";
      return;
    }

    el.record?.addEventListener("click",startRecording);

    el.stop?.addEventListener("click",()=>{
      if(recorder?.state==="recording") recorder.stop();
    });

    el.del?.addEventListener("click",async()=>{
      if(recorder?.state==="recording") recorder.stop();

      try{
        await deleteSaved();

        if(el.audio){
          el.audio.pause?.();
          el.audio.removeAttribute("src");
          el.audio.hidden=true;
        }

        if(el.del) el.del.hidden=true;
        if(el.status) el.status.textContent="Pronto para gravar";
        if(el.time) el.time.textContent="00:00";
        if(el.record) el.record.textContent="Gravar leitura";

        toast("Gravação removida. Você pode gravar novamente.");
      }catch(error){
        console.error("Inglês: falha ao excluir gravação.",error);
        toast("Não foi possível excluir a gravação.");
      }
    });
  }

  async function init(options){
    ctx=options || null;

    const reading=document.querySelector("[data-english-reading-clean]");
    const readingText=reading?.querySelector(".english-reading-clean__text");

    if(!reading || !readingText || !ctx?.data) return false;

    host=reading.querySelector("[data-reading-recorder-v81171]");

    if(!host){
      readingText.insertAdjacentHTML("afterend",html());
      host=reading.querySelector("[data-reading-recorder-v81171]");
    }

    bind();

    try{
      const saved=await readSaved();

      if(saved){
        savedAudio={
          key:keyFor(ctx.data),
          mimeType:String(saved.mimeType || "audio/webm"),
          durationSeconds:Number(saved.duracaoSegundos || 0),
          savedAt:String(saved.atualizadoEm || "")
        };

        showSaved(saved,true);

        const el=elements();
        if(el.record) el.record.textContent="Gravar novamente";
      }
    }catch(error){
      console.warn("Inglês: não foi possível consultar gravação da leitura.",error);
    }

    return true;
  }

  function status(){
    return savedAudio
      ? {
          recorded:true,
          ...structuredClone(savedAudio)
        }
      : {
          recorded:false,
          key:"",
          mimeType:"",
          durationSeconds:0,
          savedAt:""
        };
  }

  return {
    init,
    status,
    version:"v81.17.1"
  };
})();
