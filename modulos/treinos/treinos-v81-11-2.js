"use strict";

(() => {
  const db = window.MMCDSupabase;
  const KEYS = {
    plano: "treino_plano_v1",
    sessoes: "treino_sessoes_v1",
    medidas: "treino_medidas_v1"
  };
  const HARDCORE_PHASE_SCHEMA_VERSION = 3;
  const HARDCORE_PHASE_START = "2026-08-12";

  const state = {
    user: null,
    plano: null,
    sessoes: [],
    medidas: [],
    atividadesData: null,
    tab: "hoje",
    selectedDate: null,
    loading: true,
    saving: false,
    saveQueue: Promise.resolve()
  };

  let openExerciseId=null;
  let startingWorkout=false;
  let workoutFeedbackDraft=0;

  const exerciseCatalogState={
    replaceTarget:null,
    fullCatalog:null,
    loading:false,
    error:"",
    query:"",
    group:"",
    equipment:"",
    category:"",
    visibleLimit:24
  };
  let catalogSearchTimer=null;

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const esc = value => window.MMCDUI?.esc ? MMCDUI.esc(value) : String(value ?? "");
  const clone = value => JSON.parse(JSON.stringify(value));
  const todayIso = () => {
    const d = new Date();
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const datePt = iso => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "—";
  const monthLabel = date => date.toLocaleDateString("pt-BR", {month:"long", year:"numeric"});
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `tr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const num = value => {
    const n = Number(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const fmt = value => {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR",{maximumFractionDigits:1});
  };
  const normalizeLoadUnit = value => String(value||"").toLowerCase()==="placas" ? "placas" : "kg";
  const loadUnitLabel = value => normalizeLoadUnit(value)==="placas" ? "placas" : "kg";
  const normalizeText = value => String(value||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

  function isConjugatedExercise(ex){
    const source=normalizeText(`${ex?.planejado?.descanso||""} ${ex?.planejado?.observacao||ex?.observacao||""}`);
    return /bi[- ]?set|conjugad/.test(source);
  }

  function conjugatedPair(session,ex){
    if(!session || !ex || !isConjugatedExercise(ex)) return null;
    const list=session.exercicios||[];
    const idx=list.indexOf(ex);
    if(idx<0) return null;
    const prev=list[idx-1];
    const next=list[idx+1];
    if(prev && isConjugatedExercise(prev)) return {first:prev,second:ex,firstIndex:idx-1,secondIndex:idx,position:2};
    if(next && isConjugatedExercise(next)) return {first:ex,second:next,firstIndex:idx,secondIndex:idx+1,position:1};
    return null;
  }

  function conjugatedRestLabel(pair){
    return String(pair?.second?.planejado?.descanso || pair?.first?.planejado?.descanso || "").replace(/\s*ap[oó]s\s+(?:o\s+)?(?:bi[- ]?set|conjugado).*/i,"").trim() || "60 s";
  }

  function conjugatedRounds(pair){
    return Math.max(1,Math.min(pair?.first?.series?.length||1,pair?.second?.series?.length||1));
  }

  function conjugatedRoundsDone(pair){
    const total=conjugatedRounds(pair);
    let done=0;
    for(let i=0;i<total;i+=1){
      if(pair.first.series?.[i]?.concluida && pair.second.series?.[i]?.concluida) done+=1;
    }
    return done;
  }

  function seriesByNumber(ex,number){
    return ex?.series?.find(item=>Number(item.numero)===Number(number)) || null;
  }

  function scrollToSeries(exerciseId,seriesNo){
    window.setTimeout(()=>{
      const selector=`[data-action="toggle-series"][data-exercise-id="${CSS.escape(String(exerciseId))}"][data-series="${Number(seriesNo)}"]`;
      const target=document.querySelector(selector);
      target?.scrollIntoView?.({behavior:"smooth",block:"center"});
    },140);
  }

  // V58 — alarme de descanso + execução guiada de BI-SET (CONJUGADO).
  const REST_SOUND_KEY="memory:rest-sound";
  const REST_VIBRATION_KEY="memory:rest-vibration";
  const restTimerState={
    interval:null,
    alarmInterval:null,
    endAt:0,
    total:0,
    completed:false,
    audioContext:null,
    sound:true,
    vibration:true
  };

  const restCapabilities={audio:Boolean(window.AudioContext||window.webkitAudioContext),vibration:typeof navigator.vibrate==="function"};
  if(!restCapabilities.audio) restTimerState.sound=false;
  if(!restCapabilities.vibration) restTimerState.vibration=false;

  try{
    const soundSaved=localStorage.getItem(REST_SOUND_KEY);
    const vibrationSaved=localStorage.getItem(REST_VIBRATION_KEY);
    if(soundSaved!==null && restCapabilities.audio) restTimerState.sound=soundSaved!=="false";
    if(vibrationSaved!==null && restCapabilities.vibration) restTimerState.vibration=vibrationSaved!=="false";
  }catch(_){ }

  function parseRestSeconds(value) {
    const raw=String(value||"").trim().toLowerCase().replace(/[–—]/g,"-").replace(/,/g,".");
    if(!raw || raw==="-" || raw.includes("sem descanso")) return 0;
    const match=raw.match(/(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*(min(?:uto)?s?|m|s|seg(?:undo)?s?)/i);
    if(!match) return 0;
    const first=Number(match[1]);
    if(!Number.isFinite(first) || first<=0) return 0;
    const unit=String(match[3]||"").toLowerCase();
    return Math.round(first * (unit.startsWith("m") ? 60 : 1));
  }

  function saveRestPreference(key,value){
    try{localStorage.setItem(key,String(value));}catch(_){ }
  }

  function ensureAlarmAudioUnlocked(){
    if(!restTimerState.sound) return;
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx) return;
      if(!restTimerState.audioContext) restTimerState.audioContext=new AudioCtx();
      if(restTimerState.audioContext.state==="suspended") restTimerState.audioContext.resume?.();
    }catch(_){ }
  }

  function beepRestAlarm(frequency=880,duration=.16,delay=0){
    if(!restTimerState.sound) return;
    try{
      ensureAlarmAudioUnlocked();
      const ctx=restTimerState.audioContext;
      if(!ctx) return;
      const start=ctx.currentTime+delay;
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type="sine";
      osc.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(.22,start+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start+duration+.03);
    }catch(_){ }
  }

  function pulseRestAlarm(){
    beepRestAlarm(920,.16,0);
    beepRestAlarm(1120,.18,.24);
    if(restTimerState.vibration){
      try{navigator.vibrate?.([180,100,180,100,260]);}catch(_){ }
    }
  }

  function stopRestAlarm(){
    if(restTimerState.alarmInterval){clearInterval(restTimerState.alarmInterval);restTimerState.alarmInterval=null;}
    try{navigator.vibrate?.(0);}catch(_){ }
  }

  function startRestAlarm(){
    stopRestAlarm();
    pulseRestAlarm();
    restTimerState.alarmInterval=setInterval(pulseRestAlarm,3200);
  }

  function nextPendingSeriesElement(){
    return [...document.querySelectorAll('.series-check')].find(btn=>
      !btn.classList.contains('done') && !btn.disabled && !btn.closest('[hidden]')
    ) || null;
  }

  function continueWorkoutAfterRest(){
    stopRestAlarm();
    closeRestTimer();
    window.setTimeout(()=>{
      const next=nextPendingSeriesElement();
      next?.scrollIntoView?.({behavior:"smooth",block:"center"});
    },120);
  }

  function ensureRestTimerModal() {
    let modal=document.querySelector("#rest-timer-modal");
    if(modal) return modal;
    modal=document.createElement("div");
    modal.id="rest-timer-modal";
    modal.className="rest-timer-modal";
    modal.hidden=true;
    modal.innerHTML=`
      <div class="rest-timer-dialog" role="dialog" aria-modal="true" aria-labelledby="rest-timer-title">
        <button type="button" class="rest-timer-close" id="rest-timer-close" aria-label="Fechar temporizador">×</button>
        <div class="rest-timer-kicker">DESCANSO</div>
        <h2 id="rest-timer-title">Recupere</h2>
        <p id="rest-timer-context" class="rest-timer-context"></p>

        <div class="rest-timer-visual" aria-live="polite">
          <div class="rest-hourglass" id="rest-hourglass" aria-hidden="true">
            <div class="rest-hourglass__glass rest-hourglass__glass--top"><span></span></div>
            <div class="rest-hourglass__neck"></div>
            <div class="rest-hourglass__glass rest-hourglass__glass--bottom"><span></span></div>
          </div>
          <div class="rest-timer-clock">
            <strong id="rest-timer-value">00:00</strong>
            <span id="rest-timer-label">restantes</span>
          </div>
        </div>

        <div class="rest-progress" aria-hidden="true"><span id="rest-progress-fill"></span></div>
        <div class="rest-progress-label"><span id="rest-progress-text">0% recuperado</span></div>
        <div class="rest-timer-prescription" id="rest-timer-prescription"></div>

        <div class="rest-timer-actions" id="rest-timer-actions-running">
          <button type="button" class="btn" id="rest-timer-add">+30s</button>
          <button type="button" class="btn" id="rest-timer-stop">PARAR</button>
          <button type="button" class="btn primary" id="rest-timer-follow">SEGUIR AGORA</button>
        </div>

        <div class="rest-timer-actions rest-timer-actions--complete" id="rest-timer-actions-complete" hidden>
          <button type="button" class="btn" id="rest-timer-add-complete">+30s</button>
          <button type="button" class="btn" id="rest-timer-silence">PARAR ALARME</button>
          <button type="button" class="btn primary" id="rest-timer-continue">SEGUIR TREINO</button>
        </div>

        <div class="rest-timer-preferences" aria-label="Preferências do alarme">
          <label><input type="checkbox" id="rest-pref-sound"> <span>🔊 Som <small id="rest-sound-capability"></small></span></label>
          <label><input type="checkbox" id="rest-pref-vibration"> <span>📳 Vibração <small id="rest-vibration-capability"></small></span></label>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const syncPrefs=()=>{
      const sound=modal.querySelector("#rest-pref-sound");
      const vibration=modal.querySelector("#rest-pref-vibration");
      if(sound){sound.checked=restTimerState.sound;sound.disabled=!restCapabilities.audio;}
      if(vibration){vibration.checked=restTimerState.vibration;vibration.disabled=!restCapabilities.vibration;}
      const soundNote=modal.querySelector("#rest-sound-capability");
      const vibrationNote=modal.querySelector("#rest-vibration-capability");
      if(soundNote) soundNote.textContent=restCapabilities.audio?"":"· indisponível neste navegador";
      if(vibrationNote) vibrationNote.textContent=restCapabilities.vibration?"":"· indisponível neste dispositivo";
    };
    syncPrefs();

    modal.querySelector("#rest-timer-close")?.addEventListener("click",closeRestTimer);
    modal.querySelector("#rest-timer-stop")?.addEventListener("click",closeRestTimer);
    modal.querySelector("#rest-timer-follow")?.addEventListener("click",continueWorkoutAfterRest);
    modal.querySelector("#rest-timer-continue")?.addEventListener("click",continueWorkoutAfterRest);
    modal.querySelector("#rest-timer-silence")?.addEventListener("click",()=>{
      stopRestAlarm();
      const btn=modal.querySelector("#rest-timer-silence");
      if(btn){btn.textContent="ALARME PARADO";btn.disabled=true;}
    });

    const addThirty=()=>{
      stopRestAlarm();
      restTimerState.endAt=Math.max(restTimerState.endAt,Date.now())+30000;
      restTimerState.total=Math.max(30,restTimerState.total+30);
      restTimerState.completed=false;
      modal.classList.remove("is-complete");
      modal.querySelector("#rest-timer-actions-running")?.removeAttribute("hidden");
      const completeActions=modal.querySelector("#rest-timer-actions-complete");
      if(completeActions) completeActions.hidden=true;
      const silence=modal.querySelector("#rest-timer-silence");
      if(silence){silence.textContent="PARAR ALARME";silence.disabled=false;}
      const title=modal.querySelector("#rest-timer-title");
      if(title) title.textContent="Mais 30 segundos";
      const label=modal.querySelector("#rest-timer-label");
      if(label) label.textContent="restantes";
      if(restTimerState.interval) clearInterval(restTimerState.interval);
      updateRestTimer();
      restTimerState.interval=setInterval(updateRestTimer,250);
    };
    modal.querySelector("#rest-timer-add")?.addEventListener("click",addThirty);
    modal.querySelector("#rest-timer-add-complete")?.addEventListener("click",addThirty);

    modal.querySelector("#rest-pref-sound")?.addEventListener("change",event=>{
      restTimerState.sound=Boolean(event.target.checked);
      saveRestPreference(REST_SOUND_KEY,restTimerState.sound);
      if(restTimerState.sound) ensureAlarmAudioUnlocked();
    });
    modal.querySelector("#rest-pref-vibration")?.addEventListener("change",event=>{
      restTimerState.vibration=Boolean(event.target.checked);
      saveRestPreference(REST_VIBRATION_KEY,restTimerState.vibration);
      if(!restTimerState.vibration){try{navigator.vibrate?.(0);}catch(_){ }}
    });

    modal.addEventListener("click",event=>{
      if(event.target===modal) closeRestTimer();
    });
    return modal;
  }

  document.addEventListener("pointerdown",()=>{if(restTimerState.sound)ensureAlarmAudioUnlocked();},{passive:true});

  function closeRestTimer() {
    if(restTimerState.interval){clearInterval(restTimerState.interval);restTimerState.interval=null;}
    stopRestAlarm();
    const modal=document.querySelector("#rest-timer-modal");
    if(modal) modal.hidden=true;
    document.documentElement.classList.remove("rest-timer-open");
  }

  function updateRestTimer() {
    const modal=document.querySelector("#rest-timer-modal");
    if(!modal || modal.hidden) return;
    const remaining=Math.max(0,Math.ceil((restTimerState.endAt-Date.now())/1000));
    const min=Math.floor(remaining/60);
    const sec=remaining%60;
    const value=modal.querySelector("#rest-timer-value");
    if(value) value.textContent=`${String(min).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;

    const ratioRemaining=restTimerState.total>0 ? Math.max(0,Math.min(1,remaining/restTimerState.total)) : 0;
    const progress=1-ratioRemaining;
    modal.style.setProperty("--rest-progress",`${progress*100}%`);
    modal.style.setProperty("--rest-top-sand",`${ratioRemaining*100}%`);
    modal.style.setProperty("--rest-bottom-sand",`${progress*100}%`);
    const fill=modal.querySelector("#rest-progress-fill");
    if(fill) fill.style.width=`${progress*100}%`;
    const progressText=modal.querySelector("#rest-progress-text");
    if(progressText) progressText.textContent=`${Math.round(progress*100)}% recuperado`;

    if(remaining<=0 && !restTimerState.completed){
      restTimerState.completed=true;
      if(restTimerState.interval){clearInterval(restTimerState.interval);restTimerState.interval=null;}
      modal.classList.add("is-complete");
      const label=modal.querySelector("#rest-timer-label");
      if(label) label.textContent="TEMPO CONCLUÍDO";
      const title=modal.querySelector("#rest-timer-title");
      if(title) title.textContent="Pronto. Próxima série!";
      const running=modal.querySelector("#rest-timer-actions-running");
      if(running) running.hidden=true;
      const complete=modal.querySelector("#rest-timer-actions-complete");
      if(complete) complete.hidden=false;
      modal.style.setProperty("--rest-progress","100%");
      modal.style.setProperty("--rest-top-sand","0%");
      modal.style.setProperty("--rest-bottom-sand","100%");
      if(fill) fill.style.width="100%";
      if(progressText) progressText.textContent="Descanso concluído";
      startRestAlarm();
    }
  }

  function openRestTimer(config) {
    if(!config?.seconds) return;
    closeRestTimer();
    ensureAlarmAudioUnlocked();
    const modal=ensureRestTimerModal();
    restTimerState.total=config.seconds;
    restTimerState.endAt=Date.now()+config.seconds*1000;
    restTimerState.completed=false;
    modal.classList.remove("is-complete");
    const title=modal.querySelector("#rest-timer-title");
    const context=modal.querySelector("#rest-timer-context");
    const prescription=modal.querySelector("#rest-timer-prescription");
    const label=modal.querySelector("#rest-timer-label");
    if(title) title.textContent=config.exerciseName||"Recupere";
    if(context) context.textContent=config.context||"Recupere antes de continuar.";
    if(prescription) prescription.textContent=`Descanso prescrito: ${config.restLabel}`;
    if(label) label.textContent="restantes";
    const running=modal.querySelector("#rest-timer-actions-running");
    if(running) running.hidden=false;
    const complete=modal.querySelector("#rest-timer-actions-complete");
    if(complete) complete.hidden=true;
    const silence=modal.querySelector("#rest-timer-silence");
    if(silence){silence.textContent="PARAR ALARME";silence.disabled=false;}
    const sound=modal.querySelector("#rest-pref-sound");
    const vibration=modal.querySelector("#rest-pref-vibration");
    if(sound) sound.checked=restTimerState.sound;
    if(vibration) vibration.checked=restTimerState.vibration;
    modal.hidden=false;
    document.documentElement.classList.add("rest-timer-open");
    updateRestTimer();
    restTimerState.interval=setInterval(updateRestTimer,250);
  }

  function restTimerConfig(session,ex,series) {
    if(!session || !ex || !series || ex.registro==="protocolo") return null;

    const pair=conjugatedPair(session,ex);
    if(pair){
      // Uma rodada do BI-SET = exercício A + exercício B. Nunca há descanso entre A e B.
      if(pair.position===1) return null;
      const firstSeries=seriesByNumber(pair.first,series.numero);
      if(!firstSeries?.concluida) return null;
      const restLabel=conjugatedRestLabel(pair);
      const seconds=parseRestSeconds(restLabel);
      if(!seconds) return null;
      const round=Number(series.numero||1);
      return {
        seconds,
        restLabel,
        exerciseName:`BI-SET · Rodada ${round} concluída`,
        context:`${pair.first.nome} → ${pair.second.nome}. Recupere antes da próxima rodada.`,
        conjugated:true
      };
    }

    const restLabel=String(ex.planejado?.descanso||"").trim();
    const seconds=parseRestSeconds(restLabel);
    if(!seconds) return null;
    const exerciseFinished=exerciseDone(ex);
    if(exerciseFinished && (session.exercicios||[]).every(exerciseDone)) return null;
    return {
      seconds,
      restLabel,
      exerciseName:ex.nome,
      context:exerciseFinished
        ? `Série ${series.numero} concluída. Recupere antes do próximo exercício.`
        : `Série ${series.numero} concluída. Recupere antes da próxima série.`
    };
  }

  const FOOTBALL_WARMUP_V26_2 = [
    {id:"futebol-caminhada-trote",nome:"Caminhada + trote leve",prescricao:"2 min",texto:"2 min caminhada/trote",guiaId:"futebol-caminhada-trote"},
    {id:"futebol-agachamento-livre",nome:"Agachamento livre",prescricao:"2 × 10",texto:"2 × 10 agachamentos livres",guiaId:"futebol-agachamento-livre"},
    {id:"futebol-avanco-alternado",nome:"Avanço alternado",prescricao:"2 × 8",texto:"2 × 8 avanços alternados",guiaId:"futebol-avanco-alternado"},
    {id:"futebol-mobilidade-quadril",nome:"Mobilidade de quadril",prescricao:"10 por lado",texto:"10 movimentos de mobilidade de quadril por lado",guiaId:"futebol-mobilidade-quadril"},
    {id:"futebol-mobilidade-tornozelo",nome:"Mobilidade de tornozelo",prescricao:"10 por lado",texto:"10 movimentos de mobilidade de tornozelo por lado",guiaId:"futebol-mobilidade-tornozelo"},
    {id:"futebol-skipping",nome:"Skipping",prescricao:"2 × 20 s",texto:"2 × 20 segundos de skipping",guiaId:"futebol-skipping"},
    {id:"futebol-aceleracao-progressiva",nome:"Acelerações progressivas",prescricao:"3 repetições",texto:"3 acelerações progressivas",guiaId:"futebol-aceleracao-progressiva"}
  ];

  function normalizeFootballText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[×x]/g, "x")
      .replace(/\s+/g, " ")
      .trim();
  }

  function footballWarmupMeta(raw,index=0) {
    const item = typeof raw === "string"
      ? {texto:raw,nome:raw,prescricao:"",guiaId:"",id:index}
      : (raw || {});

    const text = normalizeFootballText(item.texto || item.nome || "");
    const byId = FOOTBALL_WARMUP_V26_2.find(x => x.id === item.id || x.id === item.guiaId);
    const byText = FOOTBALL_WARMUP_V26_2.find(x => {
      const target = normalizeFootballText(x.texto);
      const name = normalizeFootballText(x.nome);
      return text === target || text === name || text.includes(name) || target.includes(text);
    });
    const legacyId = item.id === undefined || item.id === null || /^\d+$/.test(String(item.id));
    const fallback = (typeof raw === "string" || legacyId) ? (FOOTBALL_WARMUP_V26_2[index] || null) : null;
    const meta = byId || byText || fallback;

    if (!meta) return {
      id:item.id ?? index,
      nome:item.nome || item.texto || "",
      prescricao:item.prescricao || "",
      texto:item.texto || item.nome || "",
      guiaId:item.guiaId || ""
    };

    return {
      id:meta.id,
      nome:item.nome && item.nome !== item.texto ? item.nome : meta.nome,
      prescricao:item.prescricao || meta.prescricao,
      texto:item.texto || meta.texto,
      guiaId:item.guiaId || meta.guiaId
    };
  }

  function upgradeFootballWarmupPlan(plan) {
    const football = plan?.treinos?.find(t => t.tipo === "futebol" || t.id === "segunda-futebol");
    if (!football) return false;

    // A partir da V26.5, a composição do futebol é editável pelo usuário.
    // Portanto a migração automática roda uma única vez e nunca mais
    // recompõe/apaga o que foi adicionado manualmente.
    if (Number(football.aquecimentoSchemaVersion || 0) >= 2) return false;

    const current = Array.isArray(football.aquecimento) ? football.aquecimento : [];
    const upgraded=[];

    current.forEach((raw,index)=>{
      const meta=footballWarmupMeta(raw,index);
      upgraded.push({
        ...(typeof raw==="object" && raw ? raw : {}),
        id:meta.id ?? `futebol-mov-${Date.now()}-${index}`,
        nome:meta.nome || meta.texto || "Movimento",
        prescricao:meta.prescricao || "",
        texto:meta.texto || meta.nome || "",
        guiaId:meta.guiaId || "",
        imagemInicio:typeof raw==="object" ? (raw.imagemInicio||"") : "",
        imagemFim:typeof raw==="object" ? (raw.imagemFim||"") : "",
        observacao:typeof raw==="object" ? (raw.observacao||"") : ""
      });
    });

    // Primeira migração de instalações antigas: garante os cinco movimentos
    // padrão apenas quando ainda não havia estrutura editável.
    if (!upgraded.length) {
      FOOTBALL_WARMUP_V26_2.forEach(meta=>{
        upgraded.push({
          ...meta,
          imagemInicio:"",
          imagemFim:"",
          observacao:""
        });
      });
    }

    football.aquecimento=upgraded;
    football.aquecimentoSchemaVersion=2;
    return true;
  }

  function status(msg, kind="") {
    const el = $("#treino-save-status");
    if (!el) return;
    el.textContent = msg;
    el.dataset.kind = kind;
  }

  async function mustUser() {
    const session = await MMCDAuth.requireSession();
    state.user = session.user;
    return state.user;
  }

  async function loadKey(chave) {
    const {data,error} = await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", state.user.id)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw new Error(`Falha ao carregar ${chave}: ${error.message}`);
    return data?.valor ?? null;
  }

  async function saveKey(chave, valor) {
    const payload = {user_id:state.user.id, chave, valor};
    const {error} = await db
      .from("configuracoes_usuario")
      .upsert(payload,{onConflict:"user_id,chave"});
    if (error) throw new Error(`Falha ao salvar ${chave}: ${error.message}`);
  }

  function enqueueSave(chave, valor) {
    const snapshot = clone(valor);
    state.saving = true;
    status("Salvando…","saving");
    state.saveQueue = state.saveQueue
      .catch(() => {})
      .then(() => saveKey(chave, snapshot))
      .then(() => {
        state.saving = false;
        status("Salvo no Supabase","saved");
      })
      .catch(error => {
        state.saving = false;
        console.error(error);
        status("Erro ao salvar","error");
        MMCDUI?.toast?.(error.message, 4000);
      });
    return state.saveQueue;
  }

  function normalizePlan(value) {
    const base = clone(window.MMCD_TREINO_PLANO_PADRAO);
    if (!value?.programa || !Array.isArray(value?.treinos)) return base;
    return {
      schemaVersion:Number(value.schemaVersion || 1),
      programa:{...base.programa,...value.programa},
      treinos:value.treinos
    };
  }

  function copyVisualOverrides(targetPlan, previousPlan) {
    const previous=new Map();

    (previousPlan?.treinos||[]).forEach(workout=>{
      (workout.exercicios||[]).forEach(item=>{
        if(!previous.has(String(item.id))) previous.set(String(item.id),item);
      });
      (workout.aquecimento||[]).forEach(item=>{
        if(item && typeof item==="object" && !previous.has(String(item.id))) previous.set(String(item.id),item);
      });
    });

    const preserve=item=>{
      const old=previous.get(String(item?.id));
      if(!old || !item) return;
      ["guiaId","imagemInicio","imagemFim"].forEach(field=>{
        const custom=String(old[field]||"").trim();
        if(custom) item[field]=old[field];
      });
    };

    (targetPlan?.treinos||[]).forEach(workout=>{
      (workout.exercicios||[]).forEach(preserve);
      (workout.aquecimento||[]).forEach(item=>{
        if(item && typeof item==="object") preserve(item);
      });
    });
  }

  function upgradeHardcorePhasePlan(plan) {
    if(Number(plan?.schemaVersion||1) >= HARDCORE_PHASE_SCHEMA_VERSION) return false;

    const previous=clone(plan);
    const target=clone(window.MMCD_TREINO_PLANO_PADRAO);
    copyVisualOverrides(target,previous);

    target.schemaVersion=HARDCORE_PHASE_SCHEMA_VERSION;
    target.programa.dataInicio=HARDCORE_PHASE_START;
    target.programa.dataFim="";

    plan.schemaVersion=target.schemaVersion;
    plan.programa=target.programa;
    plan.treinos=target.treinos;
    return true;
  }

  async function loadAll() {
    await mustUser();
    const activitiesPromise=window.MMCD?.carregar
      ? window.MMCD.carregar().catch(error=>{console.warn("Treinos: atividades indisponíveis para integração automática.",error);return null;})
      : Promise.resolve(null);

    const [planValue,sessionsValue,measuresValue,activitiesValue,metaExtensionsValue] = await Promise.all([
      loadKey(KEYS.plano),
      loadKey(KEYS.sessoes),
      loadKey(KEYS.medidas),
      activitiesPromise,
      loadKey("memory_metas_ext_v69").catch(error=>{console.warn("Treinos: extensões de metas indisponíveis.",error);return null;})
    ]);

    state.plano = normalizePlan(planValue);

    // V54 — remove o nome legado "Projeto Pai Atleta" sem alterar o restante do plano.
    const programNameBefore = String(state.plano?.programa?.nome || "");
    const programNameAfter = programNameBefore
      .replace(/^\s*Projeto\s+Pai\s+Atleta\s*[—–-]\s*/i, "")
      .trim();
    const programNameMigrated = Boolean(programNameAfter && programNameAfter !== programNameBefore);
    if (programNameMigrated) state.plano.programa.nome = programNameAfter;

    const hardcorePhaseMigrated = upgradeHardcorePhasePlan(state.plano);
    const footballPlanMigrated = upgradeFootballWarmupPlan(state.plano);

    state.sessoes = Array.isArray(sessionsValue?.sessoes) ? sessionsValue.sessoes : [];
    state.medidas = Array.isArray(measuresValue?.medidas) ? measuresValue.medidas : [];
    state.atividadesData = activitiesValue || null;
    if(state.atividadesData?.metas && metaExtensionsValue?.itens){
      for(const meta of state.atividadesData.metas){
        const extra=metaExtensionsValue.itens?.[meta.id];
        if(extra&&typeof extra==="object") Object.assign(meta,extra);
      }
    }

    if (!state.plano.programa.dataInicio) {
      state.plano.programa.dataInicio = todayIso();
    }

    if (!planValue || programNameMigrated || hardcorePhaseMigrated || footballPlanMigrated) {
      await saveKey(KEYS.plano, {...state.plano, atualizadoEm:new Date().toISOString()});
    }
    if (!sessionsValue) {
      await saveKey(KEYS.sessoes, {schemaVersion:1,sessoes:[],atualizadoEm:new Date().toISOString()});
    }
    if (!measuresValue) {
      await saveKey(KEYS.medidas, {schemaVersion:1,medidas:[],atualizadoEm:new Date().toISOString()});
    }

    // Sessões finalizadas são histórico imutável. Só uma sessão ainda em andamento pode acompanhar o plano novo.
    if (syncActiveSessionWithPlan()) {
      await saveKey(KEYS.sessoes, {
        schemaVersion:1,
        sessoes:state.sessoes,
        atualizadoEm:new Date().toISOString()
      });
    }
  }

  function savePlan() {
    return enqueueSave(KEYS.plano, {...state.plano,atualizadoEm:new Date().toISOString()});
  }

  function saveSessions() {
    return enqueueSave(KEYS.sessoes, {schemaVersion:1,sessoes:state.sessoes,atualizadoEm:new Date().toISOString()});
  }

  function saveMeasures() {
    return enqueueSave(KEYS.medidas, {schemaVersion:1,medidas:state.medidas,atualizadoEm:new Date().toISOString()});
  }

  function workoutForDate(iso) {
    const d = new Date(`${iso}T12:00:00`);
    return state.plano.treinos.find(t => Number(t.diaSemana) === d.getDay()) || null;
  }

  function sessionForDate(iso) {
    return state.sessoes.find(s => s.data === iso) || null;
  }

  function canonicalExerciseKey(exercise){
    const rawName=normalizeText(exercise?.nome||exercise?.titulo||"")
      .replace(/\b(no|na|com|de|do|da)\b/g," ")
      .replace(/\b45\s*graus?\b/g,"45")
      .replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
    const aliases={
      "panturrilha leg press":"panturrilha leg press",
      "leg press panturrilha":"panturrilha leg press",
      "rosca polia":"rosca polia",
      "rosca biceps polia":"rosca polia",
      "puxada alta crossover":"puxada alta crossover",
      "puxada alta polia":"puxada alta crossover"
    };
    return aliases[rawName]||rawName||normalizeText(exercise?.exercicioId||exercise?.id||"");
  }

  function isSquatExercise(exercise){
    const name=normalizeText(exercise?.nome||exercise?.titulo||"");
    return name.includes("agachamento") || /\bsquat\b/.test(name);
  }

  async function removeSquatsFromCurrentPlan(){
    let planChanged=false;
    let sessionChanged=false;
    let removed=0;

    for(const workout of state.plano?.treinos || []){
      if(String(workout?.tipo||"")!=="musculacao") continue;

      const before=(workout.exercicios||[]).length;

      workout.exercicios=(workout.exercicios||[]).filter(
        ex=>!isSquatExercise(ex)
      );

      const diff=before-workout.exercicios.length;

      if(diff>0){
        removed+=diff;
        planChanged=true;
      }
    }

    const today=sessionForDate(todayIso());

    if(today?.status==="em_andamento"){
      const before=(today.exercicios||[]).length;

      today.exercicios=(today.exercicios||[]).filter(
        ex=>!isSquatExercise(ex)
      );

      if(before!==today.exercicios.length){
        sessionChanged=true;
      }
    }

    if(planChanged) await savePlan();
    if(sessionChanged) await saveSessions();

    if(removed>0){
      console.info(
        `Treinos V81.11.1: ${removed} exercício(s) de agachamento removido(s) do plano atual; histórico antigo preservado.`
      );
    }

    return removed;
  }

  function currentWorkoutMeta(workoutId){ return state.plano?.treinos?.find(w=>w.id===workoutId)||null; }

  function priorSession(workoutId, beforeDate=todayIso()) {
    const current=currentWorkoutMeta(workoutId);
    const currentName=normalizeText(current?.nome||"");
    const currentType=normalizeText(current?.tipo||"");
    const candidates=state.sessoes
      .filter(s=>s.data<beforeDate && ["concluido","parcial"].includes(s.status))
      .sort((a,b)=>b.data.localeCompare(a.data));

    const exact=candidates.find(s=>s.treinoId===workoutId);
    if(exact) return exact;

    const sameName=candidates.find(s=>{
      const snapName=normalizeText(s.treinoSnapshot?.nome||"");
      const snapType=normalizeText(s.treinoSnapshot?.tipo||s.tipo||"");
      return Boolean(currentName && snapName===currentName && (!currentType || snapType===currentType));
    });
    if(sameName) return sameName;

    // V79 — se o plano foi recriado/renomeado, reconhece o treino anterior pelo conjunto de exercícios.
    // Isso recupera, por exemplo, o último treino de pernas mesmo quando IDs antigos não existem mais.
    const currentKeys=new Set((current?.exercicios||[]).map(canonicalExerciseKey).filter(Boolean));
    if(!currentKeys.size) return null;
    let best=null,bestScore=0;
    for(const session of candidates){
      const snapType=normalizeText(session.treinoSnapshot?.tipo||session.tipo||"");
      if(currentType && snapType && snapType!==currentType) continue;
      const historicalKeys=new Set((session.exercicios||[]).map(canonicalExerciseKey).filter(Boolean));
      const overlap=[...currentKeys].filter(key=>historicalKeys.has(key)).length;
      const ratio=overlap/currentKeys.size;
      const minOverlap=currentKeys.size===1?1:2;
      if(overlap<minOverlap || ratio<.4) continue;
      const score=overlap*100+Math.round(ratio*20);
      if(score>bestScore){best=session;bestScore=score;}
    }
    return best;
  }

  function exercisePrior(exerciseId, workoutId, beforeDate=todayIso()) {
    const currentPlanExercise=state.plano?.treinos?.flatMap(w=>w.exercicios||[]).find(ex=>ex.id===exerciseId)||{id:exerciseId};
    const wantedKey=canonicalExerciseKey(currentPlanExercise);
    const matchExercise=ex=>ex?.exercicioId===exerciseId || (wantedKey && canonicalExerciseKey(ex)===wantedKey);
    const prior=priorSession(workoutId,beforeDate);
    const sameWorkout=prior?.exercicios?.find(matchExercise)||null;
    if(sameWorkout) return {...sameWorkout,_priorDate:prior.data};
    const previousAnyWorkout=state.sessoes
      .filter(s=>s.data<beforeDate&&["concluido","parcial"].includes(s.status))
      .sort((a,b)=>b.data.localeCompare(a.data))
      .find(s=>s.exercicios?.some(matchExercise));
    const previousExercise=previousAnyWorkout?.exercicios?.find(matchExercise)||null;
    return previousExercise?{...previousExercise,_priorDate:previousAnyWorkout.data}:null;
  }

  function repsDefault(label) {
    const m = String(label || "").match(/\d+/);
    return m ? Number(m[0]) : 0;
  }

  function createExerciseSession(ex) {
    const total = Math.max(1,Number(ex.series || 1));
    const planned={series:total,reps:ex.reps||"",descanso:ex.descanso||"",observacao:ex.observacao||""};
    if (ex.registro === "protocolo") {
      return {
        exercicioId:ex.id,nome:ex.nome,equipamento:ex.equipamento||"",grupo:ex.grupo||"",registro:"protocolo",
        observacao:ex.observacao||"",planejado:planned,pulado:false,motivoPulo:"",series:[{numero:1,concluida:false}]
      };
    }
    return {
      exercicioId:ex.id,
      nome:ex.nome,
      equipamento:ex.equipamento||"",
      grupo:ex.grupo||"",
      registro:ex.registro||"peso_reps",
      unidadeCarga:normalizeLoadUnit(ex.unidadeCarga),
      planejado:planned,
      pulado:false,
      motivoPulo:"",
      series:Array.from({length:total},(_,i)=>({
        numero:i+1,
        peso:0,
        reps:ex.registro === "tempo" ? 0 : repsDefault(ex.reps),
        segundos:ex.registro === "tempo" ? Number(ex.segundos || repsDefault(ex.reps) || 0) : 0,
        concluida:false
      }))
    };
  }

  function createSession(workout,date=todayIso()) {
    return {
      id:uuid(),
      data:date,
      treinoId:workout.id,
      tipo:workout.tipo,
      status:"em_andamento",
      iniciadoEm:new Date().toISOString(),
      finalizadoEm:null,
      duracaoMinutos:null,
      treinoSnapshot:{
        nome:workout.nome,
        objetivo:workout.objetivo,
        tipo:workout.tipo,
        intensidade:workout.intensidade,
        orientacao:workout.orientacao||""
      },
      exercicios:(workout.exercicios||[]).map(ex=>{
        const item=createExerciseSession(ex);

        if(item.registro==="peso_reps") {
          const prior=exercisePrior(ex.id,workout.id,date);
          item.unidadeCarga=normalizeLoadUnit(prior?.unidadeCarga || ex.unidadeCarga || "kg");

          // V81.4.1 — o treino já abre com a última carga/repetição conhecida.
          // Assim o usuário só precisa alterar quando realmente mudou a carga.
          const priorSeries=Array.isArray(prior?.series)?prior.series:[];
          const lastPrior=priorSeries.length ? priorSeries[priorSeries.length-1] : null;

          item.series=(item.series||[]).map((serie,index)=>{
            const antiga=priorSeries[index] || lastPrior;
            if(!antiga) return serie;

            return {
              ...serie,
              peso:Number(antiga.peso||0),
              reps:Number(antiga.reps || serie.reps || 0)
            };
          });
        }

        return item;
      }),
      aquecimento:(workout.aquecimento||[]).map((item,i)=>{
        const meta=footballWarmupMeta(item,i);
        return {
          id:meta.id ?? i,
          texto:meta.texto || "",
          nome:meta.nome || meta.texto || "",
          prescricao:meta.prescricao || "",
          guiaId:meta.guiaId || "",
          concluido:false,
          pulado:false
        };
      }),
      protocolo:(workout.protocolo||[]).map((texto,i)=>({id:i,texto,concluido:false,pulado:false})),
      futebol:{duracao:"",intensidade:"",folego:"",explosao:"",pernas:"",recuperacao:"",observacao:""},
      cardio:{duracao:"",protocoloStatus:"completo",intensidade:"",observacao:""},
      avaliacao:{ritmo:"",atualizadoEm:null}
    };
  }

  function syncExerciseSessionWithPlan(saved,planExercise) {
    if(!saved) return createExerciseSession(planExercise);

    const fresh=createExerciseSession(planExercise);
    saved.exercicioId=planExercise.id;
    saved.nome=planExercise.nome;
    saved.equipamento=planExercise.equipamento||"";
    saved.grupo=planExercise.grupo||"";
    saved.registro=planExercise.registro||"peso_reps";
    saved.observacao=planExercise.observacao||"";
    saved.unidadeCarga=saved.registro==="peso_reps" ? normalizeLoadUnit(saved.unidadeCarga || fresh.unidadeCarga || planExercise.unidadeCarga || "kg") : undefined;
    saved.planejado={...(fresh.planejado||{})};
    saved.pulado=Boolean(saved.pulado);
    saved.motivoPulo=String(saved.motivoPulo||"");

    if(saved.registro==="protocolo") {
      const wasDone=Boolean(saved.series?.[0]?.concluida);
      saved.series=[{numero:1,concluida:wasDone}];
      return saved;
    }

    const oldSeries=Array.isArray(saved.series)?saved.series:[];
    saved.series=(fresh.series||[]).map(freshSeries=>{
      const old=oldSeries.find(x=>Number(x.numero)===Number(freshSeries.numero));
      if(!old) return freshSeries;

      return {
        ...freshSeries,
        peso:Number(old.peso||0),
        reps:Number(old.reps ?? freshSeries.reps ?? 0),
        segundos:Number(old.segundos ?? freshSeries.segundos ?? 0),
        concluida:Boolean(old.concluida)
      };
    });

    return saved;
  }

  function syncFootballWarmupWithPlan(session,workout) {
    const current=Array.isArray(session.aquecimento)?session.aquecimento:[];
    const planned=Array.isArray(workout.aquecimento)?workout.aquecimento:[];

    session.aquecimento=planned.map((raw,index)=>{
      const meta=footballWarmupMeta(raw,index);

      let old=current.find(x=>String(x?.id??"")===String(meta.id??""));
      if(!old) {
        const target=normalizeFootballText(meta.texto||meta.nome||"");
        old=current.find(x=>normalizeFootballText(x?.texto||x?.nome||"")===target);
      }

      return {
        id:meta.id ?? index,
        texto:meta.texto||meta.nome||"",
        nome:meta.nome||meta.texto||"",
        prescricao:meta.prescricao||"",
        guiaId:meta.guiaId||"",
        concluido:Boolean(old?.concluido),
        pulado:Boolean(old?.pulado)
      };
    });
  }

  function syncProtocolWithPlan(session,workout) {
    const current=Array.isArray(session.protocolo)?session.protocolo:[];
    const planned=Array.isArray(workout.protocolo)?workout.protocolo:[];

    session.protocolo=planned.map((texto,index)=>{
      const old=current.find(x=>String(x?.texto||"")===String(texto||"")) || current[index];
      return {id:index,texto,concluido:Boolean(old?.concluido),pulado:Boolean(old?.pulado)};
    });
  }

  function syncActiveSessionWithPlan() {
    const iso=todayIso();
    const session=sessionForDate(iso);
    const workout=workoutForDate(iso);

    // Histórico finalizado nunca é alterado.
    if(!session || !workout || session.status!=="em_andamento") return false;
    if(String(session.treinoId)!==String(workout.id)) return false;

    const before=JSON.stringify({
      treinoSnapshot:session.treinoSnapshot,
      exercicios:session.exercicios,
      aquecimento:session.aquecimento,
      protocolo:session.protocolo
    });

    session.tipo=workout.tipo;
    session.treinoSnapshot={
      nome:workout.nome,
      objetivo:workout.objetivo,
      tipo:workout.tipo,
      intensidade:workout.intensidade,
      orientacao:workout.orientacao||""
    };

    if(workout.tipo==="futebol") {
      syncFootballWarmupWithPlan(session,workout);
    } else {
      const current=Array.isArray(session.exercicios)?session.exercicios:[];
      const currentById=new Map(current.map(ex=>[String(ex.exercicioId),ex]));

      // A lista da sessão passa a seguir EXATAMENTE a lista do plano:
      // deletou -> sai; adicionou -> entra; manteve -> conserva cargas/checks.
      session.exercicios=(workout.exercicios||[]).map(planExercise=>
        syncExerciseSessionWithPlan(currentById.get(String(planExercise.id)),planExercise)
      );

      if(workout.tipo==="cardio") syncProtocolWithPlan(session,workout);
    }

    const after=JSON.stringify({
      treinoSnapshot:session.treinoSnapshot,
      exercicios:session.exercicios,
      aquecimento:session.aquecimento,
      protocolo:session.protocolo
    });

    return before!==after;
  }

  async function persistPlanAndSync(message="Plano de treino salvo.") {
    const sessionChanged=syncActiveSessionWithPlan();

    await savePlan();
    if(sessionChanged) await saveSessions();

    renderAll();
    MMCDUI?.toast?.(
      sessionChanged
        ? "Plano salvo e treino atual sincronizado."
        : message
    );
  }

  function enrichFootballWarmupSession(session,workout) {
    if(!session || session.tipo!=="futebol" || !Array.isArray(session.aquecimento)) return false;
    let changed=false;

    // Match by old text/order, independent of whether the stored plan was already migrated.
    session.aquecimento.forEach((saved,index)=>{
      const meta=footballWarmupMeta(saved,index);
      const values={
        id:meta.id,
        texto:meta.texto,
        nome:meta.nome,
        prescricao:meta.prescricao,
        guiaId:meta.guiaId
      };

      Object.entries(values).forEach(([key,value])=>{
        if(saved[key]!==value){
          saved[key]=value;
          changed=true;
        }
      });
    });

    return changed;
  }

  function exerciseDone(ex) {
    return (ex.series || []).length > 0 && ex.series.every(s => s.concluida);
  }

  function exerciseSkipped(ex){
    return Boolean(ex?.pulado);
  }

  function exerciseResolved(ex){
    return exerciseDone(ex) || exerciseSkipped(ex);
  }

  function checklistItemResolved(item){
    return Boolean(item?.concluido || item?.pulado);
  }

  function progress(session) {
    if (!session) return {done:0,total:0,pct:0,completed:0,skipped:0};

    if (session.tipo === "futebol") {
      const items=session.aquecimento||[];
      const total=Math.max(1,items.length);
      const completed=items.filter(x=>x.concluido).length;
      const skipped=items.filter(x=>x.pulado && !x.concluido).length;
      const done=completed+skipped;

      return {
        done,
        total,
        completed,
        skipped,
        pct:Math.round(done/total*100)
      };
    }

    if (session.tipo === "cardio") {
      const protocol=session.protocolo||[];
      const exercises=session.exercicios||[];

      const protocolCompleted=protocol.filter(x=>x.concluido).length;
      const protocolSkipped=protocol.filter(x=>x.pulado && !x.concluido).length;
      const exerciseCompleted=exercises.filter(exerciseDone).length;
      const exerciseSkippedCount=exercises.filter(ex=>exerciseSkipped(ex) && !exerciseDone(ex)).length;

      const total=Math.max(1,protocol.length+exercises.length);
      const completed=protocolCompleted+exerciseCompleted;
      const skipped=protocolSkipped+exerciseSkippedCount;
      const done=completed+skipped;

      return {
        done,
        total,
        completed,
        skipped,
        pct:Math.round(done/total*100)
      };
    }

    const exercises=session.exercicios||[];
    const total=Math.max(1,exercises.length);
    const completed=exercises.filter(exerciseDone).length;
    const skipped=exercises.filter(ex=>exerciseSkipped(ex) && !exerciseDone(ex)).length;
    const done=completed+skipped;

    return {
      done,
      total,
      completed,
      skipped,
      pct:Math.round(done/total*100)
    };
  }

  function currentExerciseIndex(session) {
    const idx=(session.exercicios||[]).findIndex(ex=>!exerciseResolved(ex));
    return idx < 0 ? Math.max(0,(session.exercicios||[]).length-1) : idx;
  }

  function lastExerciseSummary(ex) {
    if (!ex) return `<span class="muted">Sem registro anterior</span>`;
    const done = (ex.series||[]).filter(s=>s.concluida);
    if (!done.length) return `<span class="muted">Sem série concluída</span>`;
    if (ex.registro === "tempo") {
      const secs = Math.max(...done.map(s=>Number(s.segundos||0)));
      return `<strong>${fmt(secs)} s</strong><span>${done.length} série(s)</span>`;
    }
    if (ex.registro === "protocolo") {
      return `<strong>Concluído</strong><span>Protocolo</span>`;
    }
    const best = done.reduce((a,b)=>Number(b.peso||0)>Number(a.peso||0)?b:a,done[0]);
    const unit=loadUnitLabel(ex.unidadeCarga);
    return `<strong>${fmt(best.peso)} ${unit} × ${fmt(best.reps)}</strong><span>${done.length} série(s)</span>`;
  }

  function lastExerciseText(ex) {
    if(!ex) return "Sem histórico";
    const done=(ex.series||[]).filter(s=>s.concluida);
    if(!done.length) return "Sem série concluída";
    if(ex.registro==="tempo") return `${fmt(Math.max(...done.map(s=>Number(s.segundos||0))))} s`;
    if(ex.registro==="protocolo") return "Protocolo concluído";
    const unit=loadUnitLabel(ex.unidadeCarga);
    return done.map(s=>`${fmt(s.peso)} ${unit} × ${fmt(s.reps)}`).join(" · ");
  }

  function lastExerciseDetail(ex) {
    if(!ex) return "";
    const done=(ex.series||[]).filter(s=>s.concluida);
    if(!done.length) return "";
    if(ex.registro==="tempo") return `<div class="last-series-history">${done.map(s=>`<span>S${s.numero}: ${fmt(s.segundos)} s</span>`).join("")}</div>`;
    if(ex.registro==="protocolo") return `<div class="last-series-history"><span>Protocolo concluído</span></div>`;
    const unit=loadUnitLabel(ex.unidadeCarga);
    return `<div class="last-series-history">${done.map(s=>`<span>S${s.numero}: ${fmt(s.peso)} ${unit} × ${fmt(s.reps)}</span>`).join("")}</div>`;
  }

  function loadUnitControl(ex,locked=false) {
    if(ex?.registro!=="peso_reps") return "";
    const unit=normalizeLoadUnit(ex.unidadeCarga);
    return `<div class="load-unit-box"><span>REGISTRAR CARGA EM</span><div class="load-unit-toggle" role="group" aria-label="Unidade da carga">
      <button type="button" class="${unit==="kg"?"active":""}" data-action="set-load-unit" data-exercise-id="${esc(ex.exercicioId)}" data-load-unit="kg" ${locked?"disabled":""}>KG</button>
      <button type="button" class="${unit==="placas"?"active":""}" data-action="set-load-unit" data-exercise-id="${esc(ex.exercicioId)}" data-load-unit="placas" ${locked?"disabled":""}>PLACAS</button>
    </div></div>`;
  }

  function exerciseHistoryBox(pex,exerciseId,locked=false) {
    return `<div class="last-time-box">
      <div class="last-time-box__head"><span>ÚLTIMA VEZ</span>${pex?`<small>${datePt(pex._priorDate)}</small>`:""}${pex&&!locked?`<button class="mini-action" data-action="copy-last" data-exercise-id="${esc(exerciseId)}">Usar último treino</button>`:""}</div>
      <div class="last-time-box__summary">${lastExerciseSummary(pex)}</div>
      ${lastExerciseDetail(pex)}
    </div>`;
  }

  function intensityFlames(n=5) {
    return `<span class="treino-flames" aria-label="intensidade ${n} de 5">${"🔥".repeat(clamp(Number(n||0),0,5))}</span>`;
  }

  function findPlanMovementById(exerciseId) {
    for(const workout of state.plano?.treinos || []) {
      const exercise=(workout.exercicios||[]).find(x=>String(x.id)===String(exerciseId));
      if(exercise) return exercise;

      const warmup=(workout.aquecimento||[]).find(x=>
        typeof x==="object" && x && String(x.id)===String(exerciseId)
      );
      if(warmup) return warmup;
    }
    return null;
  }

  function findSessionMovementById(exerciseId){
    const sessions=state.sessoes
      .slice()
      .sort((a,b)=>String(b.data||"").localeCompare(String(a.data||"")));

    for(const session of sessions){
      const ex=(session.exercicios||[]).find(
        item=>String(item.exercicioId)===String(exerciseId)
      );

      if(ex){
        return {
          id:ex.exercicioId,
          nome:ex.nome,
          equipamento:ex.equipamento||"",
          grupo:ex.grupo||"",
          registro:ex.registro||"peso_reps",
          imagemInicio:ex.imagemInicio||"",
          imagemFim:ex.imagemFim||"",
          orientacao:ex.orientacao||null
        };
      }
    }

    return null;
  }

  function movementForGuide(exerciseId){
    return findPlanMovementById(exerciseId) || findSessionMovementById(exerciseId);
  }

  function guideByCanonicalMovement(movement,exerciseId) {
    const library=window.MMCD_TREINO_GUIAS || {};
    const targetKey=canonicalExerciseKey(
      movement || {id:exerciseId,nome:exerciseId}
    );

    if(!targetKey) return null;

    const libraryMatch=Object.values(library).find(guide=>
      canonicalExerciseKey({nome:guide?.titulo || ""})===targetKey
    );

    if(libraryMatch) return libraryMatch;

    const localCatalog=Array.isArray(window.MMCD_TREINO_CATALOGO)
      ? window.MMCD_TREINO_CATALOGO
      : [];

    const catalogMatch=localCatalog.find(item=>
      canonicalExerciseKey(item)===targetKey
    );

    if(catalogMatch){
      const catalogGuideId=catalogMatch.guiaId || catalogMatch.id;

      if(catalogGuideId && library[catalogGuideId]){
        return library[catalogGuideId];
      }
    }

    return null;
  }

  function guideFor(exerciseId) {
    const movement=movementForGuide(exerciseId);
    const library=window.MMCD_TREINO_GUIAS || {};
    const linked=movement?.guiaId ? library[movement.guiaId] : null;
    const own=library[exerciseId] || null;
    const byCanonical=guideByCanonicalMovement(movement,exerciseId);
    const base=linked || own || byCanonical;

    const customStart=String(movement?.imagemInicio||"").trim();
    const customEnd=String(movement?.imagemFim||"").trim();

    if(customStart && customEnd) {
      const orientacao=movement?.orientacao && typeof movement.orientacao==="object"
        ? movement.orientacao
        : null;

      return {
        ...(base||{}),
        titulo:movement?.nome || base?.titulo || "Exercício",
        inicio:customStart,
        fim:customEnd,
        passos:Array.isArray(orientacao?.passos) && orientacao.passos.length
          ? orientacao.passos
          : (base?.passos || [
              "Observe a posição inicial.",
              "Execute o movimento de forma controlada.",
              "Compare sua posição final com a referência.",
              "Interrompa se houver dor ou desconforto articular."
            ]),
        dica:orientacao?.dica || movement?.observacao || base?.dica || "Use as imagens como referência de posição e amplitude.",
        observacaoVisual:base?.observacaoVisual || "",
        fonte:movement?.fonteCatalogo || base?.fonte || "Catálogo Memory",
        fonteUrl:movement?.fonteUrl || base?.fonteUrl || ""
      };
    }

    return base;
  }

  const FREE_EXERCISE_DB_URL="https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
  const FREE_EXERCISE_IMAGE_ROOT="https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
  const CATALOG_PAGE_SIZE=24;

  const MUSCLE_PT={
    "abdominals":"Abdômen / Core",
    "abductors":"Abdutores",
    "adductors":"Adutores",
    "biceps":"Bíceps",
    "calves":"Panturrilha",
    "chest":"Peito",
    "forearms":"Antebraços",
    "glutes":"Glúteos",
    "hamstrings":"Posterior de coxa",
    "lats":"Costas",
    "lower back":"Lombar",
    "middle back":"Costas",
    "neck":"Pescoço",
    "quadriceps":"Quadríceps",
    "shoulders":"Ombros",
    "traps":"Trapézio",
    "triceps":"Tríceps"
  };

  const EQUIPMENT_PT={
    "bands":"Faixas elásticas",
    "barbell":"Barra",
    "body only":"Peso corporal",
    "cable":"Cabo / Crossover",
    "dumbbell":"Halteres",
    "e-z curl bar":"Barra EZ",
    "exercise ball":"Bola suíça",
    "foam roll":"Rolo de liberação",
    "kettlebells":"Kettlebell",
    "machine":"Máquina",
    "medicine ball":"Medicine ball",
    "other":"Outro",
    "":"Sem equipamento"
  };

  const CATEGORY_PT={
    "strength":"Força / musculação",
    "stretching":"Mobilidade / alongamento",
    "cardio":"Cardio",
    "plyometrics":"Pliometria",
    "strongman":"Strongman",
    "powerlifting":"Powerlifting",
    "olympic weightlifting":"Levantamento olímpico"
  };

  const LEVEL_PT={
    "beginner":"Iniciante",
    "intermediate":"Intermediário",
    "expert":"Avançado"
  };

  function localCatalog() {
    return Array.isArray(window.MMCD_TREINO_CATALOGO)
      ? window.MMCD_TREINO_CATALOGO
      : [];
  }

  function localDatasetIds() {
    const guides=window.MMCD_TREINO_GUIAS || {};
    return new Set(
      Object.values(guides)
        .map(guide=>String(guide?.datasetId||"").trim())
        .filter(Boolean)
    );
  }

  function muscleLabel(value) {
    const key=String(value||"").toLowerCase();
    return MUSCLE_PT[key] || (value ? String(value) : "Corpo inteiro");
  }

  function equipmentLabel(value) {
    const key=String(value||"").toLowerCase();
    return EQUIPMENT_PT[key] || (value ? String(value) : "Sem equipamento");
  }

  function categoryLabel(value) {
    const key=String(value||"").toLowerCase();
    return CATEGORY_PT[key] || (value ? String(value) : "Treino");
  }

  function defaultPrescription(raw) {
    const category=String(raw?.category||"").toLowerCase();
    const mechanic=String(raw?.mechanic||"").toLowerCase();

    if(category==="stretching") {
      return {series:2,reps:"20–30 s",registro:"tempo",descanso:"30–45 s",segundos:25};
    }

    if(category==="cardio") {
      return {series:1,reps:"10–20 min",registro:"protocolo",descanso:"—"};
    }

    if(category==="plyometrics") {
      return {series:3,reps:"6–10",registro:"reps",descanso:"90–120 s"};
    }

    if(["powerlifting","olympic weightlifting","strongman"].includes(category)) {
      return {series:4,reps:"4–6",registro:"peso_reps",descanso:"120–180 s"};
    }

    if(mechanic==="isolation") {
      return {series:3,reps:"10–15",registro:"peso_reps",descanso:"60–75 s"};
    }

    return {series:3,reps:"8–12",registro:"peso_reps",descanso:"75–90 s"};
  }

  function normalizeRemoteExercise(raw) {
    if(!raw?.id || !raw?.name || !Array.isArray(raw.images) || raw.images.length<2) return null;

    const primary=Array.isArray(raw.primaryMuscles) ? raw.primaryMuscles[0] : "";
    const prescription=defaultPrescription(raw);

    return {
      id:`fedb:${raw.id}`,
      datasetId:raw.id,
      nome:raw.name,
      nomeOriginal:raw.name,
      grupo:muscleLabel(primary),
      grupoKey:String(primary||"").toLowerCase(),
      equipamento:equipmentLabel(raw.equipment),
      equipmentKey:String(raw.equipment||"").toLowerCase(),
      categoria:categoryLabel(raw.category),
      categoryKey:String(raw.category||"").toLowerCase(),
      nivel:LEVEL_PT[String(raw.level||"").toLowerCase()] || String(raw.level||""),
      source:"free-exercise-db",
      images:raw.images.slice(0,2).map(path=>`${FREE_EXERCISE_IMAGE_ROOT}${path}`),
      instructions:Array.isArray(raw.instructions) ? raw.instructions.filter(Boolean).slice(0,8) : [],
      primaryMuscles:Array.isArray(raw.primaryMuscles)?raw.primaryMuscles:[],
      secondaryMuscles:Array.isArray(raw.secondaryMuscles)?raw.secondaryMuscles:[],
      force:raw.force||"",
      mechanic:raw.mechanic||"",
      ...prescription
    };
  }

  function exerciseCatalog() {
    if(Array.isArray(exerciseCatalogState.fullCatalog) && exerciseCatalogState.fullCatalog.length) {
      return exerciseCatalogState.fullCatalog;
    }
    return localCatalog();
  }

  async function ensureFullExerciseCatalog() {
    if(exerciseCatalogState.loading) return;
    if(Array.isArray(exerciseCatalogState.fullCatalog) && exerciseCatalogState.fullCatalog.length) {
      renderExerciseCatalogResults({resetLimit:false});
      return;
    }

    exerciseCatalogState.loading=true;
    exerciseCatalogState.error="";
    renderExerciseCatalogStatus();

    try {
      const response=await fetch(FREE_EXERCISE_DB_URL,{
        headers:{Accept:"application/json"},
        cache:"force-cache"
      });

      if(!response.ok) throw new Error(`Catálogo respondeu ${response.status}.`);

      const raw=await response.json();
      if(!Array.isArray(raw) || !raw.length) throw new Error("Catálogo externo vazio.");

      const local=localCatalog();
      const localIds=localDatasetIds();

      const remote=raw
        .map(normalizeRemoteExercise)
        .filter(Boolean)
        .filter(item=>!localIds.has(String(item.datasetId)));

      exerciseCatalogState.fullCatalog=[...local,...remote];
      exerciseCatalogState.loading=false;
      exerciseCatalogState.error="";
      exerciseCatalogState.visibleLimit=CATALOG_PAGE_SIZE;

      refreshCatalogFilterOptions();
      renderExerciseCatalogResults({resetLimit:true});
    } catch(error) {
      console.warn("Treinos: catálogo completo indisponível; usando catálogo local.",error);
      exerciseCatalogState.loading=false;
      exerciseCatalogState.error="Não consegui carregar a biblioteca completa agora. Estou mostrando as opções locais.";
      exerciseCatalogState.fullCatalog=localCatalog();

      refreshCatalogFilterOptions();
      renderExerciseCatalogResults({resetLimit:true});
    }
  }

  function catalogGuide(item) {
    const library=window.MMCD_TREINO_GUIAS || {};

    if(item?.source==="free-exercise-db") {
      return Object.values(library).find(guide=>String(guide?.datasetId||"")===String(item.datasetId)) || null;
    }

    return library[item?.guiaId || item?.id] || null;
  }

  function movementFamily(item) {
    const name=normalizeText(item?.nomeOriginal || item?.nome);
    const category=String(item?.categoryKey||"");

    if(category==="stretching") return "stretch";
    if(/bench press|chest press|floor press|incline press|decline press/.test(name)) return "press";
    if(/push[- ]?up/.test(name)) return "pushup";
    if(/fly|flye|crossover/.test(name) && /chest|cable|dumbbell|pec/.test(name)) return "fly";
    if(/row/.test(name)) return "row";
    if(/pulldown|pull[- ]?up|chin[- ]?up/.test(name)) return "pulldown";
    if(/curl/.test(name) && !/leg curl/.test(name)) return "curl";
    if(/triceps|pushdown|skullcrusher|skull crusher|extension/.test(name) && !/leg extension/.test(name)) return "triceps";
    if(/lateral raise|side lateral/.test(name)) return "lateralraise";
    if(/front raise/.test(name)) return "frontraise";
    if(/rear delt|reverse fly|face pull/.test(name)) return "reardelt";
    if(/shoulder press|military press|overhead press|arnold press/.test(name)) return "shoulderpress";
    if(/shrug/.test(name)) return "shrug";
    if(/leg press/.test(name)) return "legpress";
    if(/leg extension/.test(name)) return "legextension";
    if(/leg curl|hamstring curl/.test(name)) return "legcurl";
    if(/squat/.test(name)) return "squat";
    if(/lunge|split squat|step[- ]?up/.test(name)) return "lunge";
    if(/deadlift|romanian deadlift|stiff/.test(name)) return "deadlift";
    if(/hip thrust|glute bridge|bridge/.test(name)) return "hipthrust";
    if(/calf raise|calves/.test(name)) return "calf";
    if(/plank/.test(name)) return "plank";
    if(/crunch|sit[- ]?up/.test(name)) return "crunch";
    if(/twist|wood chop|rotation/.test(name)) return "rotation";
    if(/dip/.test(name)) return "dip";
    if(/clean|snatch|jerk/.test(name)) return "olympic";
    return "generic";
  }

  function externalCoach(item) {
    const family=movementFamily(item);
    const eq=item?.equipamento || "equipamento";
    const muscle=item?.grupo || "grupo-alvo";

    const guides={
      press:{
        position:`Ajuste o banco e estabilize escápulas e pés antes de iniciar. Posicione a pegada de forma confortável no ${eq}.`,
        movement:"Desça a carga com controle até uma amplitude confortável e empurre mantendo punhos alinhados e peito estável.",
        avoid:"Não deixe os ombros avançarem, não arqueie a lombar em excesso e não transforme a repetição em impulso."
      },
      pushup:{
        position:"Mantenha mãos firmes no chão, abdômen contraído e corpo alinhado da cabeça aos pés.",
        movement:"Desça o peito controlando os cotovelos e empurre o chão sem perder o alinhamento do tronco.",
        avoid:"Evite quadril caindo, pescoço projetado e cotovelos totalmente abertos."
      },
      fly:{
        position:`Estabilize o tronco e mantenha uma leve flexão nos cotovelos usando ${eq}.`,
        movement:"Abra os braços de forma controlada até sentir alongamento confortável e aproxime-os contraindo o peito.",
        avoid:"Não transforme o movimento em supino e não force amplitude que puxe a articulação do ombro."
      },
      row:{
        position:"Mantenha coluna neutra, peito organizado e ombros longe das orelhas.",
        movement:"Puxe conduzindo os cotovelos para trás, aproxime as escápulas e retorne devagar até alongar as costas.",
        avoid:"Não use balanço do tronco nem eleve os ombros para completar a repetição."
      },
      pulldown:{
        position:"Comece com o tronco estável, peito aberto e braços alongados sem perder a posição das escápulas.",
        movement:"Leve os cotovelos para baixo em direção às costelas e retorne de forma controlada.",
        avoid:"Evite jogar o corpo para trás ou puxar apenas com as mãos."
      },
      curl:{
        position:"Mantenha cotovelos próximos ao corpo e ombros estáveis.",
        movement:"Flexione os cotovelos contraindo o bíceps e desça controlando até quase estender completamente.",
        avoid:"Não balance o tronco e não leve os cotovelos para frente para vencer a carga."
      },
      triceps:{
        position:"Fixe os braços próximos ao tronco e mantenha ombros estáveis.",
        movement:"Estenda os cotovelos até contrair o tríceps e retorne sem perder o controle.",
        avoid:"Não abra os cotovelos excessivamente e não use o peso do corpo como impulso."
      },
      lateralraise:{
        position:"Fique estável, com cotovelos levemente flexionados e ombros afastados das orelhas.",
        movement:"Eleve os braços lateralmente até uma amplitude confortável e desça devagar.",
        avoid:"Não encolha os ombros e não embale o tronco para subir a carga."
      },
      frontraise:{
        position:"Tronco firme, abdômen ativo e cotovelos levemente flexionados.",
        movement:"Eleve a carga à frente com controle e retorne sem deixar o peso despencar.",
        avoid:"Evite hiperextensão lombar e balanço do corpo."
      },
      reardelt:{
        position:"Organize o tronco e mantenha pescoço neutro.",
        movement:"Abra ou puxe os braços enfatizando a parte posterior do ombro e a aproximação controlada das escápulas.",
        avoid:"Não compense com lombar ou trapézio superior."
      },
      shoulderpress:{
        position:"Mantenha tronco firme, costelas controladas e punhos alinhados.",
        movement:"Empurre a carga acima da cabeça sem perder o controle do ombro e retorne lentamente.",
        avoid:"Não exagere na curvatura lombar e não force amplitude dolorosa."
      },
      shrug:{
        position:"Fique ereto com braços relaxados e carga sob controle.",
        movement:"Eleve os ombros verticalmente, pause e desça de forma controlada.",
        avoid:"Evite girar os ombros em círculos e usar balanço."
      },
      legpress:{
        position:"Apoie completamente as costas e posicione os pés firmes na plataforma.",
        movement:"Desça a plataforma mantendo joelhos alinhados aos pés e empurre sem travar agressivamente os joelhos.",
        avoid:"Não deixe o quadril descolar do banco nem os joelhos colapsarem para dentro."
      },
      legextension:{
        position:"Alinhe o joelho ao eixo da máquina e ajuste o rolo sobre a parte inferior da canela.",
        movement:"Estenda os joelhos de forma controlada, contraia o quadríceps e retorne sem soltar o peso.",
        avoid:"Não use impulso nem deixe a carga bater no final da repetição."
      },
      legcurl:{
        position:"Ajuste a máquina para que o eixo fique alinhado ao joelho e estabilize o quadril.",
        movement:"Flexione os joelhos contraindo o posterior e retorne lentamente.",
        avoid:"Não levante o quadril para vencer a carga e não deixe o peso despencar."
      },
      squat:{
        position:"Pés firmes, abdômen ativo e coluna neutra antes de iniciar a descida.",
        movement:"Agache mantendo joelhos acompanhando a direção dos pés e suba empurrando o chão.",
        avoid:"Não deixe os joelhos colapsarem para dentro nem perca a posição da lombar."
      },
      lunge:{
        position:"Organize a base, mantenha tronco estável e distribua o peso com controle.",
        movement:"Desça flexionando os dois joelhos e retorne empurrando o chão com a perna de trabalho.",
        avoid:"Evite perder o equilíbrio, deixar o joelho cair para dentro ou usar uma passada curta demais."
      },
      deadlift:{
        position:"Mantenha coluna neutra, carga próxima ao corpo e abdômen firme.",
        movement:"Faça a dobradiça de quadril, mantenha a carga próxima às pernas e estenda o quadril para subir.",
        avoid:"Não arredonde a lombar e não afaste a carga do corpo."
      },
      hipthrust:{
        position:"Apoie-se de forma estável e mantenha pés firmes no chão.",
        movement:"Estenda o quadril contraindo glúteos, pause no topo e desça controlando.",
        avoid:"Não hiperestenda a lombar no topo nem deixe joelhos colapsarem."
      },
      calf:{
        position:"Mantenha o pé bem apoiado e controle o equilíbrio.",
        movement:"Eleve os calcanhares até contrair a panturrilha e desça lentamente buscando amplitude confortável.",
        avoid:"Não faça repetições curtas e rápidas usando impulso."
      },
      plank:{
        position:"Apoie-se de forma estável e alinhe cabeça, tronco e quadril.",
        movement:"Mantenha abdômen e glúteos ativos durante todo o tempo prescrito.",
        avoid:"Não deixe a lombar afundar nem prenda a respiração."
      },
      crunch:{
        position:"Ajuste a posição para que a lombar fique confortável e o abdômen ativo.",
        movement:"Flexione o tronco usando o abdômen e retorne de forma controlada.",
        avoid:"Não puxe a cabeça com as mãos e não transforme a repetição em balanço."
      },
      rotation:{
        position:"Estabilize quadril e tronco antes de iniciar a rotação.",
        movement:"Gire de forma controlada usando o core e retorne sem perder a postura.",
        avoid:"Evite torcer apenas a lombar ou usar velocidade excessiva."
      },
      dip:{
        position:"Estabilize ombros e mãos antes de tirar o peso do apoio.",
        movement:"Desça com controle até uma amplitude confortável e empurre mantendo o ombro organizado.",
        avoid:"Não force profundidade dolorosa nem deixe os ombros subirem em direção às orelhas."
      },
      stretch:{
        position:`Entre na posição de alongamento de ${muscle} sem dor aguda.`,
        movement:"Aumente a amplitude aos poucos e mantenha respiração normal durante o tempo prescrito.",
        avoid:"Não force a articulação, não faça movimentos bruscos e interrompa se houver dor."
      },
      olympic:{
        position:"Priorize posição técnica, barra próxima ao corpo e estabilidade antes de adicionar carga.",
        movement:"Execute cada fase de maneira coordenada e explosiva somente depois de dominar a técnica.",
        avoid:"Movimentos olímpicos exigem aprendizagem técnica; não aumente carga sem domínio consistente."
      },
      generic:{
        position:`Ajuste o ${eq} e estabilize o corpo antes da primeira repetição.`,
        movement:`Execute o movimento de ${muscle} de forma controlada, respeitando a amplitude confortável mostrada nas imagens.`,
        avoid:"Evite impulso, perda de postura e carga que faça você abandonar a técnica."
      }
    };

    return guides[family] || guides.generic;
  }

  function catalogCoachSummary(item) {
    const guide=catalogGuide(item);
    const coach=guide ? coachFor(item?.guiaId || item?.id,guide) : null;

    if(coach) {
      return {
        position:coach.setup,
        movement:coach.move,
        avoid:coach.avoid,
        tip:guide?.dica || ""
      };
    }

    const external=externalCoach(item);
    return {...external,tip:"Controle a carga e pare se sentir dor articular ou perda clara de técnica."};
  }

  function catalogImages(item) {
    const guide=catalogGuide(item);

    if(guide?.inicio && guide?.fim) {
      return {inicio:guide.inicio,fim:guide.fim,estatico:Boolean(guide.estatico)};
    }

    const images=Array.isArray(item?.images)?item.images:[];
    return {
      inicio:images[0] || "",
      fim:images[1] || images[0] || "",
      estatico:String(item?.categoryKey||"")==="stretching"
    };
  }

  function catalogGroups() {
    return [...new Set(exerciseCatalog().map(item=>item.grupo).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,"pt-BR"));
  }

  function catalogEquipments() {
    return [...new Set(exerciseCatalog().map(item=>item.equipamento).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,"pt-BR"));
  }

  function catalogCategories() {
    return [...new Set(exerciseCatalog().map(item=>item.categoria).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,"pt-BR"));
  }

  function catalogCardHtml(item) {
    const images=catalogImages(item);
    if(!images.inicio || !images.fim) return "";

    const coach=catalogCoachSummary(item);
    const target=exerciseCatalogState.replaceTarget;
    const replacing=Boolean(target);
    const current=target
      ? state.plano?.treinos?.[target.workoutIndex]?.exercicios?.[target.exerciseIndex]
      : null;

    return `<article class="exercise-catalog-card" data-catalog-item-id="${esc(item.id)}">
      <div class="exercise-catalog-card__visual">
        <figure>
          <span>INÍCIO</span>
          <img src="${esc(images.inicio)}" alt="${esc(item.nome)} — posição inicial" loading="lazy" referrerpolicy="no-referrer">
        </figure>
        <figure>
          <span>${images.estatico?"MANTER":"FIM"}</span>
          <img src="${esc(images.fim)}" alt="${esc(item.nome)} — posição final" loading="lazy" referrerpolicy="no-referrer">
        </figure>
      </div>

      <div class="exercise-catalog-card__body">
        <div class="exercise-catalog-card__title">
          <div>
            <strong>${esc(item.nome)}</strong>
            <small>${esc(item.grupo)} · ${esc(item.equipamento)}${item.nivel?` · ${esc(item.nivel)}`:""}</small>
          </div>
          <span>${esc(item.series)} × ${esc(item.reps)}</span>
        </div>

        <div class="exercise-catalog-coach">
          <div><b>1 · Posição</b><p>${esc(coach.position)}</p></div>
          <div><b>2 · Movimento</b><p>${esc(coach.movement)}</p></div>
          <div><b>⚠ Evite</b><p>${esc(coach.avoid)}</p></div>
        </div>

        ${coach.tip?`<div class="exercise-catalog-tip"><b>Orientação</b><span>${esc(coach.tip)}</span></div>`:""}

        ${item.source==="free-exercise-db" && Array.isArray(item.instructions) && item.instructions.length
          ? `<details class="exercise-catalog-source-steps">
              <summary>Passo a passo da base original</summary>
              <ol>${item.instructions.slice(0,5).map(step=>`<li>${esc(step)}</li>`).join("")}</ol>
            </details>`
          : ""}

        <div class="exercise-catalog-card__actions">
          ${catalogGuide(item)
            ? `<button type="button" class="btn small" data-action="show-exercise-guide" data-guide-id="${esc(item.guiaId || item.id)}">Abrir guia completo</button>`
            : `<span class="exercise-catalog-source">Free Exercise DB</span>`}
          ${replacing
            ? `<button type="button" class="btn primary small" data-action="catalog-use-exercise" data-catalog-id="${esc(item.id)}">
                Usar no lugar de ${esc(current?.nome || "exercício")}
              </button>`
            : ""}
        </div>
      </div>
    </article>`;
  }

  function filterCatalogItems() {
    const query=normalizeText(exerciseCatalogState.query);
    const group=exerciseCatalogState.group;
    const equipment=exerciseCatalogState.equipment;
    const category=exerciseCatalogState.category;

    return exerciseCatalog().filter(item=>{
      const haystack=normalizeText([
        item.nome,
        item.nomeOriginal,
        item.grupo,
        item.equipamento,
        item.categoria,
        ...(item.primaryMuscles||[]),
        ...(item.secondaryMuscles||[])
      ].join(" "));

      if(query && !haystack.includes(query)) return false;
      if(group && item.grupo!==group) return false;
      if(equipment && item.equipamento!==equipment) return false;
      if(category && item.categoria!==category) return false;
      return true;
    });
  }

  function refreshCatalogFilterOptions() {
    const groupSelect=$("#exercise-catalog-group");
    const equipmentSelect=$("#exercise-catalog-equipment");
    const categorySelect=$("#exercise-catalog-category");

    if(groupSelect) {
      groupSelect.innerHTML=`<option value="">Todos</option>${catalogGroups().map(group=>`<option value="${esc(group)}" ${group===exerciseCatalogState.group?"selected":""}>${esc(group)}</option>`).join("")}`;
    }

    if(equipmentSelect) {
      equipmentSelect.innerHTML=`<option value="">Todos</option>${catalogEquipments().map(eq=>`<option value="${esc(eq)}" ${eq===exerciseCatalogState.equipment?"selected":""}>${esc(eq)}</option>`).join("")}`;
    }

    if(categorySelect) {
      categorySelect.innerHTML=`<option value="">Todas</option>${catalogCategories().map(cat=>`<option value="${esc(cat)}" ${cat===exerciseCatalogState.category?"selected":""}>${esc(cat)}</option>`).join("")}`;
    }
  }

  function renderExerciseCatalogStatus() {
    const badge=$("#exercise-catalog-total-badge");
    if(badge) {
      badge.textContent=exerciseCatalogState.loading
        ? "Carregando catálogo…"
        : `${exerciseCatalog().length} opções`;
    }

    const status=$("#exercise-catalog-status");
    if(status) {
      status.textContent=exerciseCatalogState.error || (
        exerciseCatalogState.loading
          ? "Buscando a biblioteca completa de exercícios…"
          : "Selecione grupo, equipamento ou categoria. Os resultados aparecem imediatamente."
      );
      status.dataset.kind=exerciseCatalogState.error?"warning":"";
    }
  }

  function renderExerciseCatalogResults({resetLimit=false}={}) {
    if(resetLimit) exerciseCatalogState.visibleLimit=CATALOG_PAGE_SIZE;

    const grid=$("#exercise-catalog-grid");
    if(!grid) return;

    const filtered=filterCatalogItems();
    const shown=filtered.slice(0,exerciseCatalogState.visibleLimit);

    grid.innerHTML=shown.map(catalogCardHtml).join("");

    const count=$("#exercise-catalog-results-count");
    if(count) count.textContent=`${filtered.length} exercício(s) encontrado(s)`;

    const empty=$("#exercise-catalog-empty");
    if(empty) empty.hidden=filtered.length>0;

    const more=$("#exercise-catalog-load-more");
    if(more) {
      more.hidden=shown.length>=filtered.length;
      more.textContent=`Carregar mais ${Math.min(CATALOG_PAGE_SIZE,Math.max(0,filtered.length-shown.length))}`;
    }

    renderExerciseCatalogStatus();
  }

  function exerciseCatalogHtml() {
    const target=exerciseCatalogState.replaceTarget;
    const current=target
      ? state.plano?.treinos?.[target.workoutIndex]?.exercicios?.[target.exerciseIndex]
      : null;

    return `<article class="card settings-block exercise-catalog-section" id="exercise-catalog-section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Biblioteca de exercícios</p>
          <h2>Catálogo para montar seu treino</h2>
          <p class="muted">Fotos de início e fim, orientação de execução e substituição direta de um exercício do seu plano.</p>
        </div>
        <span class="db-badge" id="exercise-catalog-total-badge">${exerciseCatalogState.loading?"Carregando…":`${exerciseCatalog().length} opções`}</span>
      </div>

      ${target?`<div class="catalog-replace-banner">
        <div><span>SUBSTITUINDO</span><strong>${esc(current?.nome || "Exercício")}</strong><small>Escolha abaixo o exercício que entra no lugar.</small></div>
        <button type="button" class="btn small" data-action="catalog-cancel-replace">Cancelar</button>
      </div>`:""}

      <div class="exercise-catalog-filters exercise-catalog-filters--v8143">
        <label class="catalog-search-field">
          <span>Buscar</span>
          <input id="exercise-catalog-search" type="search" value="${esc(exerciseCatalogState.query)}" placeholder="Ex.: peito, remada, dumbbell...">
        </label>
        <label>
          <span>Grupo muscular</span>
          <select id="exercise-catalog-group">
            <option value="">Todos</option>
            ${catalogGroups().map(group=>`<option value="${esc(group)}" ${group===exerciseCatalogState.group?"selected":""}>${esc(group)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Equipamento</span>
          <select id="exercise-catalog-equipment">
            <option value="">Todos</option>
            ${catalogEquipments().map(eq=>`<option value="${esc(eq)}" ${eq===exerciseCatalogState.equipment?"selected":""}>${esc(eq)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Tipo</span>
          <select id="exercise-catalog-category">
            <option value="">Todos</option>
            ${catalogCategories().map(cat=>`<option value="${esc(cat)}" ${cat===exerciseCatalogState.category?"selected":""}>${esc(cat)}</option>`).join("")}
          </select>
        </label>
      </div>

      <div class="exercise-catalog-results-head">
        <strong id="exercise-catalog-results-count">Carregando opções…</strong>
        <span id="exercise-catalog-status">Selecione os filtros para encontrar um exercício.</span>
      </div>

      <div class="exercise-catalog-grid" id="exercise-catalog-grid">
        ${exerciseCatalog().slice(0,CATALOG_PAGE_SIZE).map(catalogCardHtml).join("")}
      </div>

      <div class="settings-empty-list" id="exercise-catalog-empty" hidden>Nenhum exercício encontrado com esses filtros.</div>

      <button type="button" class="btn exercise-catalog-load-more" id="exercise-catalog-load-more" data-action="catalog-load-more" hidden>
        Carregar mais
      </button>
    </article>`;
  }

  function applyExerciseCatalogFilters({resetLimit=true}={}) {
    exerciseCatalogState.query=$("#exercise-catalog-search")?.value || "";
    exerciseCatalogState.group=$("#exercise-catalog-group")?.value || "";
    exerciseCatalogState.equipment=$("#exercise-catalog-equipment")?.value || "";
    exerciseCatalogState.category=$("#exercise-catalog-category")?.value || "";
    renderExerciseCatalogResults({resetLimit});
  }

  function openExerciseReplacement(workoutIndex,exerciseIndex) {
    const workout=state.plano?.treinos?.[Number(workoutIndex)];
    const exercise=workout?.exercicios?.[Number(exerciseIndex)];
    if(!workout || !exercise) return;

    exerciseCatalogState.replaceTarget={
      workoutIndex:Number(workoutIndex),
      exerciseIndex:Number(exerciseIndex)
    };
    exerciseCatalogState.query="";
    exerciseCatalogState.group=exercise?.grupo || "";
    exerciseCatalogState.equipment="";
    exerciseCatalogState.category="";
    exerciseCatalogState.visibleLimit=CATALOG_PAGE_SIZE;

    renderSettings();

    requestAnimationFrame(()=>{
      $("#exercise-catalog-section")?.scrollIntoView({behavior:"smooth",block:"start"});
      ensureFullExerciseCatalog();
    });
  }

  function cancelExerciseReplacement() {
    exerciseCatalogState.replaceTarget=null;
    renderSettings();
    requestAnimationFrame(()=>ensureFullExerciseCatalog());
  }

  async function replaceExerciseFromCatalog(catalogId) {
    const target=exerciseCatalogState.replaceTarget;
    if(!target) return;

    const workout=state.plano?.treinos?.[target.workoutIndex];
    const current=workout?.exercicios?.[target.exerciseIndex];
    const item=exerciseCatalog().find(entry=>String(entry.id)===String(catalogId));

    if(!workout || !current || !item) return;

    const duplicate=(workout.exercicios||[]).find((ex,index)=>
      index!==target.exerciseIndex &&
      canonicalExerciseKey(ex)===canonicalExerciseKey(item)
    );

    if(duplicate) {
      MMCDUI?.toast?.(`${item.nome} já existe neste treino.`);
      return;
    }

    const images=catalogImages(item);
    const coach=catalogCoachSummary(item);

    const replacement={
      id:item.source==="free-exercise-db"
        ? `catalog-${String(item.datasetId||item.id).replace(/[^a-zA-Z0-9_-]/g,"-")}`
        : item.id,
      nome:item.nome,
      equipamento:item.equipamento,
      grupo:item.grupo,
      series:Number(item.series||3),
      reps:item.reps||"10–12",
      registro:item.registro||"peso_reps",
      descanso:item.descanso||"60–90 s",
      observacao:item.observacao||coach.tip||"",
      guiaId:item.source==="free-exercise-db"?"":(item.guiaId||item.id),
      imagemInicio:images.inicio||"",
      imagemFim:images.fim||"",
      orientacao:{
        passos:[
          coach.position,
          coach.movement,
          `Evite: ${coach.avoid}`
        ],
        dica:coach.tip||"Priorize execução controlada e postura estável."
      },
      fonteCatalogo:item.source==="free-exercise-db"?"Free Exercise DB":"Memory",
      fonteUrl:item.source==="free-exercise-db"?"https://github.com/yuhonas/free-exercise-db":"",
      catalogDatasetId:item.datasetId||""
    };

    if(item.segundos) replacement.segundos=Number(item.segundos);

    workout.exercicios[target.exerciseIndex]=replacement;
    exerciseCatalogState.replaceTarget=null;

    await persistPlanAndSync(`${current.nome} foi substituído por ${item.nome}.`);
    renderSettings();

    requestAnimationFrame(()=>{
      const details=$$(".settings-workout")[target.workoutIndex];
      if(details) details.open=true;
      details?.scrollIntoView({behavior:"smooth",block:"center"});
    });
  }

  function visualLibraryOptions(selected="") {
    const rows=[];
    const seen=new Set();

    Object.entries(window.MMCD_TREINO_GUIAS||{}).forEach(([id,guide])=>{
      const signature=guide?.datasetId || `${guide?.titulo||id}|${guide?.inicio||""}|${guide?.fim||""}`;
      if(seen.has(signature)) return;
      seen.add(signature);
      rows.push({id,titulo:guide?.titulo||id});
    });

    rows.sort((a,b)=>a.titulo.localeCompare(b.titulo,"pt-BR"));

    return `<option value="">Sem referência da biblioteca</option>` +
      rows.map(row=>`<option value="${esc(row.id)}" ${String(selected)===String(row.id)?"selected":""}>${esc(row.titulo)}</option>`).join("");
  }

  function visualConfigHtml(item,attrs) {
    const currentGuide=item?.guiaId || (window.MMCD_TREINO_GUIAS?.[item?.id] ? item.id : "");
    const hasGuide=Boolean(guideFor(item?.id));

    return `<div class="field full exercise-guide-admin">
      <span>Guia visual</span>
      <div class="visual-config-box">
        <div class="visual-config-box__intro">
          <div>
            <strong>Como vincular as fotos</strong>
            <small>Escolha uma referência pronta ou informe duas URLs: início e fim.</small>
          </div>
          ${hasGuide?visualButton(item.id,"Pré-visualizar"):""}
        </div>

        <label class="field">
          <span>Referência da biblioteca</span>
          <select ${attrs} data-visual-field="guiaId">${visualLibraryOptions(currentGuide)}</select>
        </label>

        <div class="visual-url-grid">
          <label class="field">
            <span>Imagem — início (URL)</span>
            <input type="url" ${attrs} data-visual-field="imagemInicio" value="${esc(item?.imagemInicio||"")}" placeholder="https://.../inicio.jpg">
          </label>
          <label class="field">
            <span>Imagem — fim (URL)</span>
            <input type="url" ${attrs} data-visual-field="imagemFim" value="${esc(item?.imagemFim||"")}" placeholder="https://.../fim.jpg">
          </label>
        </div>

        <p class="visual-config-help">
          As duas URLs personalizadas têm prioridade sobre a biblioteca. O vínculo fica salvo junto com este exercício no Supabase.
        </p>
      </div>
    </div>`;
  }

  function visualButton(exerciseId,label="Ver execução") {
    const movement=movementForGuide(exerciseId);
    const hasGuide=Boolean(guideFor(exerciseId));

    if(!hasGuide && !movement) return "";

    return `<button type="button" class="exercise-visual-btn" data-action="show-exercise-guide" data-guide-id="${esc(exerciseId)}">
      <span class="exercise-visual-btn__icon">▶</span>${esc(label)}
    </button>`;
  }

  function inlineExerciseExample(exerciseId){
    const guide=guideFor(exerciseId);

    if(!guide?.inicio || !guide?.fim) return "";

    const steps=(guide.passos||[]).slice(0,2);

    return `
      <section class="exercise-inline-example">
        <div class="exercise-inline-example__head">
          <span>EXEMPLO DE EXECUÇÃO</span>
          <strong>${esc(guide.titulo||"Movimento")}</strong>
        </div>

        <div class="exercise-inline-example__images">
          <figure>
            <img src="${esc(guide.inicio)}" alt="Posição inicial de ${esc(guide.titulo||"exercício")}" loading="lazy">
            <figcaption>Início</figcaption>
          </figure>

          <figure>
            <img src="${esc(guide.fim)}" alt="Posição final de ${esc(guide.titulo||"exercício")}" loading="lazy">
            <figcaption>Fim</figcaption>
          </figure>
        </div>

        ${steps.length?`
          <div class="exercise-inline-example__tips">
            ${steps.map(step=>`<span>• ${esc(step)}</span>`).join("")}
          </div>
        `:""}
      </section>
    `;
  }

  const COACH_PROFILES = [
    {
      match:/rosca|b[ií]ceps/,
      title:"Bíceps — execução de excelência",
      setup:"Fique alto, peito aberto e abdômen firme. Mantenha os cotovelos próximos ao tronco e ligeiramente à frente da linha do corpo, sem deixá-los passear durante a série.",
      move:"Comece com o braço quase estendido. Flexione o cotovelo e leve a mão/barra em direção ao bíceps e à altura do peito. Dobre o braço o máximo que conseguir mantendo o braço superior praticamente parado.",
      range:"No topo, aproxime antebraço e bíceps sem jogar o ombro para frente. Na descida, estenda novamente até sentir o bíceps alongar, mas sem relaxar completamente a tensão.",
      tempo:"Suba em cerca de 1–2 s, aperte o bíceps por um instante no topo e desça em 2–3 s. A volta controlada faz parte da repetição.",
      breathe:"Solte o ar ao subir; inspire enquanto retorna.",
      feel:"Você deve sentir o bíceps encurtando e queimando. Se o esforço estiver indo para lombar, ombro ou balanço do corpo, a carga está vencendo a técnica.",
      avoid:"Não balance o tronco, não levante os cotovelos para terminar a repetição e não deixe a carga despencar na descida."
    },
    {
      match:/tr[ií]ceps|pushdown/,
      title:"Tríceps — execução de excelência",
      setup:"Incline o tronco apenas o suficiente para ficar estável. Fixe os cotovelos ao lado do corpo e mantenha os ombros para baixo, longe das orelhas.",
      move:"Empurre o cabo para baixo estendendo somente os cotovelos. Pense em afastar as mãos do peito até o braço ficar praticamente reto.",
      range:"Chegue ao final da extensão sem jogar o ombro para frente. Com corda, abra levemente as pontas no final para terminar a contração. Volte até o antebraço subir sem o cotovelo avançar.",
      tempo:"Desça firme em 1 s, contraia o tríceps por 1 s e retorne em 2 s.",
      breathe:"Solte o ar na extensão; inspire na volta.",
      feel:"A sensação deve estar atrás do braço. O tronco serve de base, não de impulso.",
      avoid:"Não transforme em mergulho com o corpo, não abra os cotovelos e não encurte a volta só para usar mais carga."
    },
    {
      match:/remada/,
      title:"Remada — execução de excelência",
      setup:"Monte uma base firme, peito aberto e coluna neutra. Antes de puxar, deixe os ombros baixos e o cabo criar tensão nas costas.",
      move:"Inicie levando o cotovelo para trás, não pensando apenas na mão. Puxe em direção ao abdômen ou linha inferior do peito conforme a variação e aproxime as escápulas no final.",
      range:"Pare quando o cotovelo chegar próximo ou ligeiramente atrás do tronco sem o ombro rodar para frente. Na volta, permita que a escápula avance para alongar as costas mantendo o tronco estável.",
      tempo:"Puxe em 1–2 s, segure 1 s com as costas contraídas e retorne em 2–3 s.",
      breathe:"Solte o ar ao puxar; inspire ao alongar.",
      feel:"Pense em colocar o cotovelo no bolso de trás. A mão apenas conecta você ao cabo.",
      avoid:"Não jogue o tronco para trás, não encolha os ombros e não termine a repetição apenas dobrando o braço."
    },
    {
      match:/puxada alta|pulldown/,
      title:"Puxada — execução de excelência",
      setup:"Peito aberto, costelas controladas e ombros baixos. Comece com os braços estendidos sem perder a posição do tronco.",
      move:"Leve os cotovelos para baixo e para as laterais do corpo. Pense em trazer os cotovelos em direção às costelas, enquanto a barra/cabo se aproxima da parte alta do peito.",
      range:"Desça até onde consegue manter peito aberto e ombros longe das orelhas. Retorne até os braços estenderem e as dorsais alongarem sem perder o controle.",
      tempo:"Puxe em 1–2 s, segure brevemente embaixo e volte em 2–3 s.",
      breathe:"Solte o ar na puxada; inspire no retorno.",
      feel:"A tensão deve aparecer nas laterais das costas, abaixo das axilas. Imagine fechar as axilas contra o tronco.",
      avoid:"Não transforme o exercício em uma remada inclinando demais o corpo e não puxe atrás da cabeça."
    },
    {
      match:/supino|bench press/,
      title:"Supino — execução de excelência",
      setup:"Pés firmes no chão, glúteos apoiados e escápulas puxadas para trás e para baixo. Crie um peito alto sem exagerar o arco da lombar.",
      move:"Desça a barra de forma controlada em direção ao peito, mantendo antebraços próximos da vertical. Empurre a barra para cima mantendo as escápulas presas ao banco.",
      range:"Desça até uma amplitude confortável em que o ombro continue estável. Na subida, estenda os braços sem perder a posição das escápulas.",
      tempo:"Desça em 2–3 s, toque/chegue ao ponto inferior com controle e suba forte em 1–2 s.",
      breathe:"Inspire durante a descida e solte o ar ao vencer a parte mais difícil da subida.",
      feel:"Você deve sentir peitoral e tríceps trabalhando com ombro firme. Pense em empurrar o banco para longe de você.",
      avoid:"Não deixe os ombros subirem em direção às orelhas, não quique a barra no peito e não sacrifique a amplitude por carga."
    },
    {
      match:/crucifixo|crossover/,
      title:"Crucifixo — execução de excelência",
      setup:"Dê um passo à frente, firme o tronco e mantenha os cotovelos levemente flexionados. Peito aberto e ombros para baixo.",
      move:"Feche os braços em um arco amplo, como se fosse abraçar alguém. As mãos se aproximam à frente do peito sem transformar o movimento em uma extensão de cotovelo.",
      range:"Feche até sentir forte contração do peitoral. Abra até sentir alongamento confortável no peito sem deixar o ombro escapar para frente.",
      tempo:"Feche em 1–2 s, aperte o peito por 1 s e abra em 2–3 s.",
      breathe:"Solte o ar ao fechar; inspire ao abrir.",
      feel:"Pense em aproximar os braços usando o peito, não em empurrar o cabo com as mãos.",
      avoid:"Não estique e dobre os cotovelos durante a repetição e não busque amplitude que cause desconforto na frente do ombro."
    },
    {
      match:/eleva[cç][aã]o lateral|lateral raise/,
      title:"Elevação lateral — execução de excelência",
      setup:"Fique alto, abdômen firme e ombros baixos. Cotovelo levemente flexionado e mão alinhada ao antebraço.",
      move:"Eleve o braço para o lado guiando pelo cotovelo. Imagine que o cotovelo está puxando a mão para cima.",
      range:"Suba aproximadamente até a altura do ombro. Pare antes de precisar encolher o trapézio para continuar. Desça até manter tensão no deltoide.",
      tempo:"Suba em 1–2 s e desça em 2–3 s, sem deixar o peso cair.",
      breathe:"Solte o ar ao elevar; inspire na descida.",
      feel:"A queima deve aparecer na lateral do ombro. Pescoço deve permanecer relaxado.",
      avoid:"Não dê impulso com quadril/tronco, não encolha os ombros e não transforme o movimento em uma elevação frontal."
    },
    {
      match:/face pull/,
      title:"Face Pull — execução de excelência",
      setup:"Cabo na altura do rosto ou ligeiramente acima. Fique firme, peito aberto e ombros baixos.",
      move:"Puxe a corda em direção ao rosto levando os cotovelos para fora. No final, separe as mãos como se quisesse mostrar o centro da corda para o rosto.",
      range:"Termine com mãos próximas das laterais da cabeça e escápulas aproximadas, sem deixar a lombar arquear para compensar.",
      tempo:"Puxe em 1–2 s, segure a posição final por 1 s e retorne em 2–3 s.",
      breathe:"Solte o ar ao puxar; inspire na volta.",
      feel:"Você deve sentir parte posterior dos ombros e região entre as escápulas, não apenas bíceps.",
      avoid:"Não use carga que obrigue o tronco a balançar e não puxe a corda para o peito."
    },
    {
      match:/pallof/,
      title:"Pallof Press — execução de excelência",
      setup:"Fique de lado para a polia, pés firmes e joelhos levemente flexionados. Segure o cabo junto ao centro do peito e contraia abdômen e glúteos.",
      move:"Empurre as mãos para frente até os braços ficarem estendidos. Quanto mais longe as mãos ficam do corpo, maior a tentativa do cabo de girar você.",
      range:"Estenda completamente sem permitir que ombros ou quadril girem em direção à polia. Retorne devagar ao peito.",
      tempo:"Estenda em 1–2 s, segure 1–2 s e volte em 2 s.",
      breathe:"Respire curto e controlado mantendo o abdômen firme; não prenda o ar pela série inteira.",
      feel:"O exercício deve parecer uma luta para não girar. O tronco permanece imóvel enquanto os braços se movem.",
      avoid:"Não rode o quadril, não incline o corpo e não use carga que destrua a postura."
    },
    {
      match:/prancha lateral|side bridge/,
      title:"Prancha lateral — execução de excelência",
      setup:"Cotovelo exatamente abaixo do ombro. Pernas alinhadas e quadril empilhado, sem rodar para frente.",
      move:"Eleve o quadril e forme uma linha longa do tornozelo ao topo da cabeça. Empurre o chão com o antebraço.",
      range:"Mantenha o quadril alto durante todo o tempo. Quando ele começar a cair e você não conseguir corrigir, a série terminou.",
      tempo:"É isométrico: tensão constante, sem relaxar entre segundos.",
      breathe:"Respire normalmente, soltando o ar enquanto mantém abdômen e glúteos firmes.",
      feel:"Você deve sentir principalmente lateral do abdômen e estabilizadores do quadril.",
      avoid:"Não deixe o ombro afundar, quadril cair ou peito girar para o chão."
    },
    {
      match:/prancha|plank/,
      title:"Prancha — execução de excelência",
      setup:"Cotovelos abaixo dos ombros. Pernas estendidas, glúteos contraídos e abdômen firme antes de tirar o corpo do chão.",
      move:"Empurre o chão com os antebraços e mantenha o corpo como uma prancha única: cabeça, costas, quadril e pernas alinhados.",
      range:"Não existe amplitude: sua meta é manter a mesma posição do primeiro ao último segundo.",
      tempo:"Tensão contínua. Qualidade vale mais que sobreviver ao cronômetro.",
      breathe:"Respire de forma curta e contínua sem soltar o abdômen.",
      feel:"Abdômen, glúteos e cintura escapular trabalhando juntos para impedir qualquer movimento.",
      avoid:"Não deixe a lombar afundar, quadril subir demais ou cabeça despencar."
    },
    {
      match:/leg press.*unilateral|unilateral.*leg press|memory_leg_press_unilateral/,
      title:"Leg Press unilateral — execução de excelência",
      setup:"Apoie totalmente costas, lombar e quadril. Coloque apenas o pé da perna ativa na plataforma; a outra perna fica fora da plataforma e não participa do empurrão.",
      move:"Desça a plataforma controlando joelho e quadril da perna ativa. Empurre usando o pé inteiro, sem deixar o joelho cair para dentro e sem girar a pelve.",
      range:"Desça apenas até onde o quadril permanece colado ao banco e a lombar neutra. A amplitude deve ser simétrica entre os lados.",
      tempo:"Desça em 2–3 s e suba forte em 1–2 s. Não use a perna livre para ajudar.",
      breathe:"Inspire na descida; solte o ar durante o empurrão mantendo o abdômen firme.",
      feel:"Quadríceps e glúteo da perna ativa devem produzir todo o movimento. A pelve deve permanecer estável.",
      avoid:"Não apoie as duas pernas na plataforma, não deixe o joelho colapsar para dentro e não permita que o quadril rode ou saia do encosto."
    },
    {
      match:/leg press/,
      title:"Leg Press — execução de excelência",
      setup:"Apoie costas, lombar e quadril no encosto. Posicione os pés de forma simétrica e firme na plataforma, com joelhos acompanhando a direção das pontas dos pés.",
      move:"Desça a plataforma dobrando joelhos e quadril de forma controlada. Na subida, empurre a plataforma usando o pé inteiro, como se afastasse o chão de você.",
      range:"Desça somente até o ponto em que o quadril continue colado ao banco. Se a lombar arredondar ou o quadril levantar, você passou da sua amplitude útil.",
      tempo:"Desça em 2–3 s e suba forte em 1–2 s. Em séries pesadas, reinicie a tensão antes de cada repetição.",
      breathe:"Inspire na descida; solte o ar durante a subida sem perder a pressão abdominal.",
      feel:"Quadríceps e glúteos devem produzir o movimento. Joelho deve seguir o pé durante toda a repetição.",
      avoid:"Não deixe os joelhos colapsarem para dentro, não tire o quadril do banco e não trave violentamente os joelhos no topo."
    },
    {
      match:/agachamento.*smith|smith.*squat|agachamento livre|bodyweight squat/,
      title:"Agachamento — execução de excelência",
      setup:"Pés firmes, abdômen contraído e peito alto. Antes de descer, organize joelhos na mesma direção dos pés.",
      move:"Desça dobrando joelhos e quadril ao mesmo tempo, mantendo o pé inteiro no chão. Suba empurrando o chão e mantendo joelhos alinhados.",
      range:"Busque a maior amplitude que mantém calcanhar apoiado, coluna controlada e joelhos estáveis. Não existe prêmio por descer além da técnica.",
      tempo:"Desça em 2–3 s, faça uma transição controlada embaixo e suba com intenção forte.",
      breathe:"Inspire e crie pressão abdominal antes de descer; solte o ar durante a subida ou no topo.",
      feel:"Pense em manter o centro do pé pesado no chão durante toda a repetição.",
      avoid:"Não deixe joelhos caírem para dentro, calcanhar levantar ou tronco perder rigidez."
    },
    {
      match:/afundo|avan[cç]o|lunge/,
      title:"Afundo / avanço — execução de excelência",
      setup:"Comece alto e estável. A distância entre os pés deve permitir descer sem perder o equilíbrio e sem esmagar o joelho da frente para dentro.",
      move:"Desça o corpo verticalmente dobrando as duas pernas. Na subida, empurre o chão com o pé da frente e pense em usar glúteo e coxa dessa perna.",
      range:"Desça até o joelho de trás se aproximar do chão enquanto o pé da frente permanece totalmente apoiado e o quadril estável.",
      tempo:"Desça em 2–3 s, controle o fundo e suba em 1–2 s.",
      breathe:"Inspire na descida; solte o ar na subida.",
      feel:"A perna da frente deve fazer a maior parte do trabalho. O tronco permanece firme, sem oscilar de um lado para o outro.",
      avoid:"Não dê um passo curto demais, não deixe o joelho cair para dentro e não empurre excessivamente com a perna de trás."
    },
    {
      match:/flexora|leg curl/,
      title:"Flexora — execução de excelência",
      setup:"Ajuste o eixo da máquina alinhado ao joelho e prenda bem o quadril. Comece com posterior alongado e sem folga na carga.",
      move:"Dobre os joelhos levando o rolo para baixo/para trás até o máximo que conseguir sem levantar o quadril.",
      range:"Feche o joelho o máximo possível mantendo o quadril apoiado. Depois retorne até quase estender completamente, mantendo tensão.",
      tempo:"Contraia em 1–2 s e volte em 2–3 s. Na sessão de resistência, respeite os 3 s de retorno prescritos.",
      breathe:"Solte o ar ao flexionar; inspire ao retornar.",
      feel:"O posterior da coxa deve encurtar no final e alongar na volta.",
      avoid:"Não deixe a carga puxar suas pernas de volta e não levante o quadril para ganhar amplitude."
    },
    {
      match:/extensora|leg extension/,
      title:"Extensora — execução de excelência",
      setup:"Quadril e costas totalmente apoiados. Ajuste o eixo na linha do joelho e o rolo na parte inferior da canela.",
      move:"Estenda os joelhos até contrair fortemente o quadríceps. Pense em levantar a canela usando a frente da coxa.",
      range:"Suba até quase estender totalmente sem dar um tranco na articulação. Desça até a posição inicial sem perder tensão.",
      tempo:"Suba forte em 1 s, segure brevemente no topo e desça em 2–3 s.",
      breathe:"Solte o ar ao estender; inspire na descida.",
      feel:"A frente da coxa deve fazer todo o trabalho; o quadril não deve sair do banco.",
      avoid:"Não use impulso, não bata as placas e não acelere a descida."
    },
    {
      match:/adutora|adductor/,
      title:"Adutora — execução de excelência",
      setup:"Sente-se com costas e quadril apoiados. Escolha uma abertura confortável, sem forçar a virilha antes mesmo de começar.",
      move:"Feche as pernas de forma controlada até aproximar os apoios, mantendo tronco imóvel.",
      range:"Feche até o máximo confortável e retorne apenas até sentir alongamento moderado, não dor.",
      tempo:"Feche em 1–2 s, segure 1 s e abra em 2–3 s.",
      breathe:"Solte o ar ao fechar; inspire ao abrir.",
      feel:"Você deve sentir a parte interna das coxas produzindo o movimento.",
      avoid:"Não bater as placas, não usar impulso e não buscar uma abertura agressiva."
    },
    {
      match:/abdutora|abductor/,
      title:"Abdutora — execução de excelência",
      setup:"Quadril e lombar apoiados, pés firmes nos suportes e abdômen levemente contraído.",
      move:"Abra os joelhos contra a resistência pensando em afastar as coxas usando a lateral do quadril.",
      range:"Abra até onde consegue manter quadril e tronco estáveis. Retorne devagar sem deixar a carga fechar de uma vez.",
      tempo:"Abra em 1–2 s, segure 1 s e retorne em 2–3 s.",
      breathe:"Solte o ar ao abrir; inspire ao voltar.",
      feel:"A tensão deve aparecer na lateral dos glúteos/quadril.",
      avoid:"Não jogar o tronco para frente e para trás para gerar impulso e não deixar as placas baterem."
    },
    {
      match:/panturrilha|calf/,
      title:"Panturrilha — execução de excelência",
      setup:"Apoie a parte da frente dos pés de forma segura e mantenha joelhos estáveis. O movimento deve acontecer no tornozelo.",
      move:"Desça os calcanhares lentamente até sentir a panturrilha alongar. Depois empurre a plataforma com a ponta dos pés e eleve os calcanhares o máximo possível.",
      range:"Use amplitude completa e controlada: alongamento embaixo e contração máxima em cima.",
      tempo:"Desça em 2–3 s, suba em 1 s e segure cerca de 1 s no ponto alto.",
      breathe:"Respire normalmente; não precisa prender o ar.",
      feel:"A panturrilha deve trabalhar do alongamento até a contração máxima, sem quicar no fundo.",
      avoid:"Não fazer repetições curtinhas e rápidas, não usar rebote e interromper se houver dor aguda no tornozelo ou canela."
    },
    {
      match:/wood chop/,
      title:"Wood Chop — execução de excelência",
      setup:"Base firme, joelhos destravados e abdômen ativo. Segure o cabo com as duas mãos e organize o tronco antes de mover.",
      move:"Leve as mãos em diagonal através do corpo, permitindo rotação controlada de tronco e quadril conforme a variação. Pense em mover o corpo como uma unidade.",
      range:"Termine a diagonal mantendo equilíbrio e controle. Retorne devagar até a posição inicial.",
      tempo:"Puxe em 1–2 s e retorne em 2–3 s.",
      breathe:"Solte o ar durante a diagonal; inspire na volta.",
      feel:"Core e oblíquos controlam a rotação. Os braços transmitem a força, mas não devem fazer tudo sozinhos.",
      avoid:"Não arrancar o cabo com os braços e não girar de forma brusca pela lombar."
    },
    {
      match:/bike|bicycl|bicicleta/,
      title:"Bike — execução de excelência",
      setup:"Ajuste o banco para que, no ponto mais baixo do pedal, o joelho ainda fique levemente flexionado. Tronco confortável e mãos leves no guidão.",
      move:"Pedale de forma circular e estável. Nos blocos fortes, aumente cadência/resistência sem transformar o corpo em balanço lateral.",
      range:"Mantenha quadril estável no banco e joelhos apontando para frente durante toda a pedalada.",
      tempo:"Nos intervalos fortes, acelere de forma rápida mas controlada; nas recuperações, realmente reduza o esforço para conseguir repetir a intensidade.",
      breathe:"Respiração livre. Nos blocos fortes, foque em expirar completamente para controlar o esforço.",
      feel:"Pernas trabalhando de forma contínua, sem perder a cadência. O tronco permanece econômico.",
      avoid:"Não deixar o quadril balançar, joelhos abrirem excessivamente ou resistência ficar tão alta que a cadência desmorone."
    },
    {
      match:/skipping/,
      title:"Skipping — execução de excelência",
      setup:"Fique alto, olhar à frente e braços soltos em posição de corrida.",
      move:"Alterne os apoios rapidamente, levantando os joelhos de forma coordenada e usando os braços para marcar ritmo.",
      range:"Passadas curtas e rápidas; o objetivo é frequência, não saltar alto.",
      tempo:"Contato breve com o chão e ritmo contínuo durante todo o intervalo.",
      breathe:"Respiração natural e solta.",
      feel:"Leveza e rapidez nos pés, como se o chão estivesse quente.",
      avoid:"Não bater o pé pesado no chão e não transformar em saltos verticais exagerados."
    },
    {
      match:/acelera[cç][oõ]es|acelera[cç][aã]o|3-part start/,
      title:"Aceleração — execução de excelência",
      setup:"Comece em posição atlética, leve inclinação do corpo à frente e pés preparados para empurrar o chão para trás.",
      move:"Aumente a velocidade progressivamente. As primeiras passadas são fortes e curtas; conforme acelera, a passada alonga naturalmente.",
      range:"Não busque velocidade máxima logo no primeiro passo. A meta é chegar gradualmente ao percentual prescrito.",
      tempo:"Cada repetição deve ser mais rápida que a anterior conforme o plano, com recuperação suficiente caminhando de volta.",
      breathe:"Respire solto e não tensione mandíbula/ombros.",
      feel:"Força aplicada para trás no chão, braços rápidos e corpo ganhando velocidade sem travar.",
      avoid:"Não sair 100% frio, não frear bruscamente e não continuar se sentir dor aguda."
    },
    {
      match:/mobilidade de quadril|hip circles/,
      title:"Mobilidade de quadril — execução de excelência",
      setup:"Fique alto e use apoio se necessário. Quadril e tronco permanecem estáveis.",
      move:"Eleve o joelho e desenhe um círculo amplo pelo quadril, como se passasse a perna por cima de uma barreira.",
      range:"Busque a maior amplitude confortável sem girar o tronco para criar uma falsa amplitude.",
      tempo:"Lento e controlado, sem pressa.",
      breathe:"Respiração normal.",
      feel:"Movimento livre na articulação do quadril, sem pinçamento.",
      avoid:"Não balançar a perna com velocidade e não forçar um ponto doloroso."
    },
    {
      match:/mobilidade de tornozelo|ankle circles/,
      title:"Mobilidade de tornozelo — execução de excelência",
      setup:"Use apoio e relaxe o pé que será movimentado.",
      move:"Desenhe círculos com a ponta do pé, movendo o tornozelo e mantendo joelho e quadril o mais parados possível.",
      range:"Faça círculos amplos nos dois sentidos sem provocar dor.",
      tempo:"Lento e contínuo.",
      breathe:"Respiração normal.",
      feel:"A articulação deve ficar mais solta a cada repetição.",
      avoid:"Não transformar o movimento em rotação do joelho e não forçar amplitude dolorosa."
    },
    {
      match:/trote|caminhada|trail running/,
      title:"Trote leve — execução de excelência",
      setup:"Postura alta, ombros relaxados e braços soltos ao lado do corpo.",
      move:"Passe gradualmente da caminhada para o trote, usando passos curtos e confortáveis.",
      range:"Sem buscar velocidade. O objetivo é elevar temperatura e preparar o corpo.",
      tempo:"Ritmo em que você ainda consegue respirar com controle.",
      breathe:"Respiração confortável e contínua.",
      feel:"Corpo aquecendo sem fadiga relevante.",
      avoid:"Não transformar o aquecimento em corrida forte antes do treino/jogo."
    }
  ];

  function coachFor(exerciseId,guide){
    const source=normalizeText(`${exerciseId||""} ${guide?.titulo||""} ${guide?.datasetId||""}`);
    return COACH_PROFILES.find(profile=>profile.match.test(source)) || null;
  }

  function coachHtml(profile){
    if(!profile) return "";
    const rows=[
      ["1 · POSIÇÃO",profile.setup],
      ["2 · MOVIMENTO",profile.move],
      ["3 · AMPLITUDE",profile.range],
      ["4 · RITMO",profile.tempo],
      ["5 · RESPIRAÇÃO",profile.breathe]
    ];
    return `<div class="exercise-coach">
      <div class="exercise-coach__head"><span>🎯</span><div><strong>${esc(profile.title)}</strong><small>Execute cada repetição como se eu estivesse corrigindo você ao lado.</small></div></div>
      <div class="exercise-coach__steps">${rows.map(([label,value])=>`<div class="exercise-coach__step"><b>${esc(label)}</b><p>${esc(value)}</p></div>`).join("")}</div>
      <div class="exercise-coach__feel"><b>✅ O que você deve sentir</b><p>${esc(profile.feel)}</p></div>
      <div class="exercise-coach__avoid"><b>⚠️ Não aceite esta execução</b><p>${esc(profile.avoid)}</p></div>
    </div>`;
  }

  function guideTextHtml(exerciseId) {
    const guide=guideFor(exerciseId);
    if(!guide) return "";
    const coach=coachFor(exerciseId,guide);

    return `<div class="exercise-guide__content">
      <span class="treino-kicker">COMO EXECUTAR</span>
      ${coachHtml(coach)}
      <div class="exercise-guide__quick">
        <strong>Resumo rápido</strong>
        <ol>${(guide.passos||[]).map(item=>`<li>${esc(item)}</li>`).join("")}</ol>
      </div>
      ${guide.observacaoVisual?`<div class="exercise-guide__specific"><strong>Importante</strong><p>${esc(guide.observacaoVisual)}</p></div>`:""}
      ${guide.dica?`<div class="exercise-guide__tip"><span>💡</span><p><strong>Dica do treinador:</strong> ${esc(guide.dica)}</p></div>`:""}
    </div>`;
  }

  function guideImagePanel(url,label,title) {
    return `<figure class="exercise-pose">
      <div class="exercise-pose__label">${esc(label)}</div>
      <img src="${esc(url)}" alt="${esc(title)} — ${esc(label)}" loading="lazy" referrerpolicy="no-referrer">
    </figure>`;
  }

  function guideHtml(exerciseId,compact=false) {
    const guide=guideFor(exerciseId);
    if(!guide) return "";

    const firstLabel=guide.estatico?"POSIÇÃO":"INÍCIO";
    const secondLabel=guide.estatico?"MANTER":"FIM";
    const referenceImage=`<img src="${esc(guide.painel||"")}" alt="${esc(guide.titulo)} — início e fim" loading="lazy">`;
    const visual=guide.painel
      ? `<div class="exercise-guide__visual exercise-guide__visual--reference-card">${guide.fonteUrl?`<a class="exercise-reference-card-link" href="${esc(guide.fonteUrl)}" target="_blank" rel="noopener noreferrer">${referenceImage}</a>`:referenceImage}</div>`
      : `<div class="exercise-guide__visual exercise-guide__visual--pair">
          <div class="exercise-pose-grid">
            ${guideImagePanel(guide.inicio,firstLabel,guide.titulo)}
            ${guideImagePanel(guide.fim,secondLabel,guide.titulo)}
          </div>
          <div class="exercise-media-source">
            <span>Referência: ${esc(guide.fonte||"Free Exercise DB")}</span>
            ${guide.fonteUrl?`<a href="${esc(guide.fonteUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte</a>`:""}
          </div>
        </div>`;

    return `<div class="exercise-guide exercise-guide--curated ${compact?"compact":""}">
      ${visual}
      ${guideTextHtml(exerciseId)}
    </div>`;
  }

  function hydrateVisibleGuides() {
    // V26 uses explicit start/end URLs; there is no search or hydration step.
  }

  async function showExerciseGuide(exerciseId) {
    let guide=guideFor(exerciseId);

    if(!guide){
      try{
        await ensureFullExerciseCatalog();
      }catch(error){
        console.warn("Treinos: catálogo completo indisponível ao abrir exemplo.",error);
      }

      const movement=findPlanMovementById(exerciseId);
      const key=canonicalExerciseKey(
        movement || {id:exerciseId,nome:exerciseId}
      );

      const item=exerciseCatalog().find(entry=>
        canonicalExerciseKey(entry)===key
      );

      if(item && movement){
        const images=catalogImages(item);
        const coach=catalogCoachSummary(item);

        if(images.inicio && images.fim){
          movement.imagemInicio=movement.imagemInicio || images.inicio;
          movement.imagemFim=movement.imagemFim || images.fim;
          movement.orientacao=movement.orientacao || {
            passos:[
              coach.position,
              coach.movement,
              `Evite: ${coach.avoid}`
            ],
            dica:coach.tip || "Priorize execução controlada."
          };
        }
      }

      guide=guideFor(exerciseId);
    }

    if(!guide){
      window.MMCDUI?.toast?.(
        "Ainda não encontrei um exemplo visual para este exercício."
      );
      return;
    }

    const modal=$("#exercise-guide-modal");
    if(!modal) return;

    $("#exercise-guide-modal-title").textContent=
      guide.titulo || "Execução do exercício";

    $("#exercise-guide-modal-body").innerHTML=
      guideHtml(exerciseId,false);

    modal.hidden=false;
    document.body.classList.add("guide-modal-open");
  }

  function closeExerciseGuide() {
    const modal=$("#exercise-guide-modal");
    if(modal) modal.hidden=true;
    document.body.classList.remove("guide-modal-open");
  }

  function weekDates(reference=new Date()) {
    const d = new Date(reference);
    d.setHours(12,0,0,0);
    const day = d.getDay();
    const mondayOffset = day === 0 ? -6 : 1-day;
    const monday = new Date(d);
    monday.setDate(d.getDate()+mondayOffset);
    return Array.from({length:7},(_,i)=>{
      const x=new Date(monday);x.setDate(monday.getDate()+i);
      const local=new Date(x.getTime()-x.getTimezoneOffset()*60000);
      return local.toISOString().slice(0,10);
    });
  }

  function dateLabel(iso) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday:"long",
      day:"2-digit",
      month:"2-digit"
    });
  }

  function weekStatusHtml(referenceIso=state.selectedDate || todayIso()) {
    const today=todayIso();
    const reference=new Date(`${referenceIso}T12:00:00`);

    return weekDates(reference).map(iso=>{
      const work=workoutForDate(iso);
      if (!work) return "";

      const ses=sessionForDate(iso);
      const day=new Date(`${iso}T12:00:00`);
      const short=day.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
      const number=day.getDate();

      const excuse=workoutConstancyExcuseInfo(iso);
      let cls="future", symbol="○";
      if (work.tipo==="descanso") { cls="rest";symbol="—"; }
      else if (excuse) { cls="excused";symbol="A"; }
      else if (ses?.status==="concluido") { cls="done";symbol="✓"; }
      else if (ses?.status==="parcial" || ses?.status==="em_andamento") { cls="partial";symbol=iso===today?"▶":"◐"; }
      else if (iso<today) { cls="missed";symbol="×"; }
      else if (iso===today) { cls="today";symbol="▶"; }

      if (iso===referenceIso) cls += " selected";

      return `<button class="week-day ${cls}" type="button" data-plan-date="${iso}" aria-label="${esc(dateLabel(iso))}: ${esc(work.nome)}${excuse?" — Abonado":""}">
        <span>${esc(short)}</span>
        <b>${number}</b>
        <strong>${symbol}</strong>
      </button>`;
    }).join("");
  }

  function weekLabel(referenceIso=state.selectedDate || todayIso()) {
    const dates=weekDates(new Date(`${referenceIso}T12:00:00`));
    const first=new Date(`${dates[0]}T12:00:00`);
    const last=new Date(`${dates[6]}T12:00:00`);
    const a=first.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).replace(".","");
    const b=last.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).replace(".","");
    return `${a} — ${b}`;
  }

  function calendarNavigatorHtml() {
    const selected=state.selectedDate || todayIso();
    return `
      <section class="card treino-calendar-nav">
        <div class="treino-calendar-nav__head">
          <div>
            <span class="treino-kicker">PLANO SEMANAL</span>
            <h2>Escolha o dia</h2>
            <p>Veja o treino de qualquer data sem sair desta tela.</p>
          </div>
          <label class="treino-date-picker">
            <span>📅 Calendário</span>
            <input id="treino-date-picker" type="date" value="${selected}" aria-label="Escolher data do plano de treino">
          </label>
        </div>

        <div class="week-strip week-strip--interactive">${weekStatusHtml(selected)}</div>

        <div class="treino-week-nav">
          <button type="button" class="mini-action treino-week-arrow" data-action="week-prev">← Semana anterior</button>
          <strong>${esc(weekLabel(selected))}</strong>
          <button type="button" class="mini-action treino-week-arrow" data-action="week-next">Próxima semana →</button>
        </div>

        ${selected!==todayIso()?`<button type="button" class="btn treino-back-today" data-action="back-today">Voltar para hoje</button>`:""}
      </section>`;
  }

  function plannedPreviewHtml(workout) {
    if (workout.tipo==="futebol") {
      return `<div class="football-warmup-preview">
        ${(workout.aquecimento||[]).map((raw,i)=>{
          const item=footballWarmupMeta(raw,i);
          return `<div class="football-warmup-preview__row">
            <span class="exercise-order">${String(i+1).padStart(2,"0")}</span>
            <div>
              <strong>${esc(item.nome || item.texto || "")}</strong>
              <small>${esc(item.prescricao || item.texto || "")}</small>
            </div>
            ${item.guiaId?visualButton(item.guiaId,"Ver execução"):""}
          </div>`;
        }).join("")}
      </div>`;
    }

    if (workout.tipo==="cardio") {
      return `
        <div class="preview-list preview-list--checkable">${(workout.protocolo||[]).map(x=>`<div><span aria-hidden="true">○</span><strong>${esc(x)}</strong></div>`).join("")}</div>
        <div class="preview-protocol-guide">${visualButton("bike-estacionaria","Ver execução da bike")}</div>
        ${(workout.exercicios||[]).length?`
          <div class="preview-exercises preview-exercises--calendar">
            ${(workout.exercicios||[]).map((x,i)=>`
              <div class="preview-exercise-row">
                <span>${String(i+1).padStart(2,"0")}</span>
                <div><strong>${esc(x.nome)}</strong><small>${esc(x.series)} × ${esc(x.reps)}</small></div>
                ${visualButton(x.id,"Ver execução")}
              </div>`).join("")}
          </div>`:""}`;
    }

    return `<div class="preview-exercises preview-exercises--calendar">${(workout.exercicios||[]).map((x,i)=>`
      <div class="preview-exercise-row">
        <span>${String(i+1).padStart(2,"0")}</span>
        <div><strong>${esc(x.nome)}</strong><small>${esc(x.series)} × ${esc(x.reps)}</small></div>
        ${visualButton(x.id,"Ver execução")}
      </div>`).join("")}</div>`;
  }

  function historicalPlanHtml(workout,session,iso) {
    const exercises=(session.exercicios||[]).map((ex,i)=>`
      <div class="selected-history-exercise">
        <span>${String(i+1).padStart(2,"0")}</span>
        <div><strong>${esc(ex.nome)}</strong><small>${lastExerciseSummary(ex)}</small></div>
        <b>${exerciseDone(ex)?"✓":"—"}</b>
      </div>`).join("");

    return `
      <article class="card selected-plan-card selected-plan-card--history">
        <div class="selected-plan-card__head">
          <div>
            <span class="treino-kicker">REGISTRO DE ${esc(datePt(iso))}</span>
            <h2>${esc(session.treinoSnapshot?.nome || workout?.tituloCurto || "Treino")}</h2>
            <p>${esc(session.treinoSnapshot?.objetivo || workout?.objetivo || "")}</p>
          </div>
          <span class="selected-plan-status ${session.status}">${session.status==="concluido"?"Concluído":session.status==="parcial"?"Parcial":"Em andamento"}</span>
        </div>
        ${session.registroSemCelular
          ? `<div class="selected-history-meta">⚽ Jogo registrado sem acompanhamento pelo celular.</div>`
          : (exercises || `<div class="selected-history-meta">${session.duracaoMinutos?`${fmt(session.duracaoMinutos)} min`:"Registro disponível"}</div>`)}
        ${session.status==="concluido"?workoutSocialHtml(session):""}
      </article>`;
  }

  function renderToday() {
    const root=$("#treino-today-root");
    if (!root) return;

    if (!state.selectedDate) state.selectedDate=todayIso();

    const iso=state.selectedDate;
    const isToday=iso===todayIso();
    const workout=workoutForDate(iso);
    const session=sessionForDate(iso);
    const program=state.plano.programa;
    const excuse=workoutConstancyExcuseInfo(iso);

    if(!excuse && session?.status==="em_andamento" && syncActiveSessionWithPlan()) {
      saveSessions();
    }
    const navigator=calendarNavigatorHtml();

    $("#treino-program-name").textContent=program.nome || "Plano de treino";
    $("#treino-program-objective").textContent=program.objetivo || "";
    $("#treino-today-label").textContent=dateLabel(iso);

    if (!workout) {
      root.innerHTML=`
        ${navigator}
        <article class="card treino-empty">
          <span class="treino-kicker">${isToday?"HOJE":"PLANO DO DIA"}</span>
          <h2>Sem treino programado</h2>
          <p class="muted">Não há treino cadastrado para ${esc(datePt(iso))}.</p>
        </article>`;
      return;
    }

    if (workout.tipo==="descanso") {
      root.innerHTML=`
        ${navigator}
        <article class="card treino-rest-card">
          <span class="treino-kicker">${isToday?"HOJE":"PLANO DO DIA"}</span>
          <h2>${esc(workout.tituloCurto)}</h2>
          <p>${esc(workout.objetivo)}</p>
          <div class="rest-orb">RECUPERAÇÃO</div>
          <small>Descanso programado não conta como treino perdido.</small>
        </article>`;
      return;
    }

    if (excuse) {
      const exercises=plannedPreviewHtml(workout);
      root.innerHTML=`
        ${navigator}
        <article class="card today-start-card treino-excused-card">
          <div class="today-start-card__top">
            <div>
              <span class="treino-kicker">TREINO ABONADO</span>
              <h2>${esc(workout.tituloCurto)}</h2>
              <p>${esc(workout.objetivo)}</p>
            </div>
            ${intensityFlames(workout.intensidade)}
          </div>
          <div class="today-count">Atividade justificada em Atividades</div>
          <button class="btn treino-start-btn treino-start-btn--excused" type="button" disabled>✓ TREINO ABONADO</button>
          ${excuse.motivo?`<p class="treino-excused-reason"><strong>Motivo:</strong> ${esc(excuse.motivo)}</p>`:""}
          ${session?`<p class="treino-excused-session-note">Havia uma sessão de treino aberta nesta data. O registro foi preservado, mas ficou bloqueado porque o abono tem prioridade.</p>`:""}
          <details class="today-preview">
            <summary>Ver estrutura que estava programada</summary>
            ${exercises}
          </details>
        </article>`;
      return;
    }

    if (!isToday && session) {
      root.innerHTML=navigator+historicalPlanHtml(workout,session,iso);
      return;
    }

    if (!isToday) {
      root.innerHTML=`
        ${navigator}
        <article class="card selected-plan-card">
          <div class="selected-plan-card__head">
            <div>
              <span class="treino-kicker">PLANO DO DIA · ${esc(datePt(iso))}</span>
              <h2>${esc(workout.tituloCurto)}</h2>
              <p>${esc(workout.objetivo)}</p>
            </div>
            ${intensityFlames(workout.intensidade)}
          </div>
          <div class="selected-plan-count">${workout.tipo==="futebol"?"Jogo + aquecimento":workout.tipo==="cardio"?"Protocolo + core":`${(workout.exercicios||[]).length} exercícios`}</div>
          ${plannedPreviewHtml(workout)}
          ${workout.tipo==="futebol" && iso<todayIso()
            ? `<div class="selected-plan-offline-action">
                <button class="btn primary" type="button" data-action="register-football-offline" data-workout-date="${iso}">✓ REGISTRAR QUE JOGUEI</button>
                <small>Use depois do futebol quando você não levou o celular.</small>
              </div>`
            : `<div class="selected-plan-note">Visualização do plano desta data.</div>`}
        </article>`;
      return;
    }

    if (!session) {
      const exercises=plannedPreviewHtml(workout);

      root.innerHTML=`
        ${navigator}
        <article class="card today-start-card">
          <div class="today-start-card__top">
            <div>
              <span class="treino-kicker">TREINO DE HOJE</span>
              <h2>${esc(workout.tituloCurto)}</h2>
              <p>${esc(workout.objetivo)}</p>
            </div>
            ${intensityFlames(workout.intensidade)}
          </div>
          <div class="today-count">${workout.tipo==="futebol" ? "Jogo + aquecimento" : workout.tipo==="cardio" ? "Protocolo + core" : `${(workout.exercicios||[]).length} exercícios`}</div>
          <button class="btn treino-start-btn" type="button" data-action="start-workout" onclick="return window.MemoryStartWorkoutNow(this,event)" ontouchend="return window.MemoryStartWorkoutNow(this,event)">INICIAR TREINO</button>
          ${workout.tipo==="futebol"?`
            <div class="selected-plan-offline-action selected-plan-offline-action--today">
              <button class="btn" type="button" data-action="register-football-offline" data-workout-date="${iso}">✓ JOGUEI · REGISTRAR SEM CELULAR</button>
              <small>Registre quando voltar para casa; você não precisa levar o celular ao campo.</small>
            </div>`:""}
          <details class="today-preview">
            <summary>Ver estrutura de hoje</summary>
            ${exercises}
          </details>
        </article>`;
      return;
    }

    const appendCompletedShare=()=>{
      if(session?.status==="concluido" && !root.querySelector(".workout-social-block")) {
        root.insertAdjacentHTML("beforeend",`<article class="card completed-workout-share-card">${workoutSocialHtml(session)}</article>`);
      }
    };

    if (workout.tipo==="futebol") {
      renderFootball(root,workout,session);
      root.insertAdjacentHTML("afterbegin",navigator);
      appendCompletedShare();
      return;
    }
    if (workout.tipo==="cardio") {
      renderCardio(root,workout,session);
      root.insertAdjacentHTML("afterbegin",navigator);
      appendCompletedShare();
      return;
    }

    renderStrength(root,workout,session);
    root.insertAdjacentHTML("afterbegin",navigator);
    appendCompletedShare();
  }

  function renderSessionHeader(workout,session) {
    const p=progress(session);
    const statusLabel=session.status==="concluido"?"TREINO CONCLUÍDO":session.status==="parcial"?"TREINO FINALIZADO · PARCIAL":"EM ANDAMENTO";
    return `
      <article class="card active-workout-head ${session.status}">
        <div class="active-workout-head__title">
          <div>
            <span class="treino-kicker">${statusLabel}</span>
            <h2>${esc(workout.tituloCurto)}</h2>
            <p>${esc(workout.objetivo)}</p>
            ${workout.orientacao?`<p class="muted">${esc(workout.orientacao)}</p>`:""}
          </div>
          ${intensityFlames(workout.intensidade)}
        </div>
        <div class="workout-progress-copy"><strong>${p.done} de ${p.total}</strong><span> ${session.tipo==="cardio"?"itens concluídos":"exercícios concluídos"}</span><b>${p.pct}%</b></div>
        <div class="workout-progress"><i style="width:${p.pct}%"></i></div>
      </article>`;
  }


  function exercisePanelIsOpen(exerciseId) {
    return String(openExerciseId ?? "") === String(exerciseId ?? "");
  }

  function toggleExercisePanel(exerciseId) {
    const id=String(exerciseId||"");
    if(!id) return;
    const selected=document.querySelector(`.exercise-card[data-exercise="${CSS.escape(id)}"]`);
    if(!selected) return;
    const wasOpen=selected.classList.contains("open");

    document.querySelectorAll(".exercise-card.open").forEach(card=>{
      card.classList.remove("open");
      const body=card.querySelector(".exercise-card__body");
      if(body) body.hidden=true;
      card.querySelectorAll("[data-action='toggle-exercise']").forEach(toggle=>{
        toggle.setAttribute("aria-expanded","false");
        const label=toggle.querySelector(".exercise-expand-label");
        if(label) label.textContent="Abrir";
        const icon=toggle.querySelector(".exercise-expand-icon");
        if(icon) icon.textContent="⌄";
      });
    });

    if(wasOpen) { openExerciseId=null; return; }
    openExerciseId=id;
    selected.classList.add("open");
    const body=selected.querySelector(".exercise-card__body");
    if(body) body.hidden=false;
    selected.querySelectorAll("[data-action='toggle-exercise']").forEach(toggle=>{
      toggle.setAttribute("aria-expanded","true");
      const label=toggle.querySelector(".exercise-expand-label");
      if(label) label.textContent="Fechar";
      const icon=toggle.querySelector(".exercise-expand-icon");
      if(icon) icon.textContent="⌃";
    });
  }

  function exerciseAccordionButton(exerciseId,isOpen) {
    return `<button type="button" class="exercise-expand-btn" data-action="toggle-exercise" data-exercise-id="${esc(exerciseId)}" aria-expanded="${isOpen?"true":"false"}" aria-label="${isOpen?"Fechar exercício":"Abrir exercício"}">
      <span class="exercise-expand-label">${isOpen?"Fechar":"Abrir"}</span>
      <span class="exercise-expand-icon" aria-hidden="true">${isOpen?"⌃":"⌄"}</span>
    </button>`;
  }

  function renderStrength(root,workout,session) {
    const locked=session.status!=="em_andamento";
    const currentIdx=locked ? -1 : currentExerciseIndex(session);

    const buildCard=(ex,idx,pair=null)=>{
      const done=exerciseDone(ex);
      const skipped=exerciseSkipped(ex);
      const resolved=exerciseResolved(ex);
      const missed=session.status==="parcial" && !resolved;
      const pex=exercisePrior(ex.exercicioId,workout.id,session.data);
      const isCurrent=!locked && !resolved && idx===currentIdx;
      const isOpen=exercisePanelIsOpen(ex.exercicioId);
      const seriesHtml=(ex.series||[]).map(s=>seriesRow(ex,s,isOpen && !s.concluida,locked||skipped)).join("");
      const stateLabel=skipped?"Pulado":done?"Concluído":missed?"Não realizado":isOpen?"Em preenchimento":isCurrent?"Próximo":"Pendente";

      let prescription=`${esc(ex.planejado?.series||ex.series.length)} × ${esc(ex.planejado?.reps||"")}`;
      if(pair){
        prescription += pair.position===1
          ? ` · sem descanso → ${esc(pair.second.nome)}`
          : ` · descanso ${esc(conjugatedRestLabel(pair))} após a dupla`;
      }else if(ex.planejado?.descanso){
        prescription += ` · descanso ${esc(ex.planejado.descanso)}`;
      }

      return `
        <article class="exercise-card ${done?"done":""} ${skipped?"skipped":""} ${missed?"missed":""} ${isCurrent?"current":""} ${isOpen?"open":""} ${pair?`conjugated-exercise conjugated-exercise--${pair.position===1?"a":"b"}`:""}" data-exercise="${esc(ex.exercicioId)}">
          <div class="exercise-card__head">
            <button type="button" class="exercise-card__identity" data-action="toggle-exercise" data-exercise-id="${esc(ex.exercicioId)}" aria-expanded="${isOpen?"true":"false"}">
              <span class="exercise-order">${String(idx+1).padStart(2,"0")}</span>
              <span class="exercise-card__copy">
                <strong>${skipped?"↷ ":done?"✓ ":missed?"× ":""}${esc(ex.nome)}</strong>
                <small>${prescription}</small>
                ${pex?`<small class="exercise-last-inline">Última: ${esc(lastExerciseText(pex))}</small>`:""}
              </span>
            </button>
            <div class="exercise-head-actions">
              ${pair?`<span class="conjugated-position">${pair.position===1?"A":"B"}</span>`:""}
              <span class="exercise-state">${stateLabel}</span>
              ${!locked && !skipped?`<button type="button"
                class="exercise-quick-check ${done?"done":""}"
                data-action="quick-complete-exercise"
                data-exercise-id="${esc(ex.exercicioId)}"
                aria-label="${done?"Desmarcar exercício":"Concluir exercício"}"
                title="${done?"Desmarcar exercício":"Concluir exercício com as cargas preenchidas"}">
                ${done?"✓":"○"}
              </button>`:""}
              ${!locked?`<button type="button"
                class="exercise-skip-btn ${skipped?"active":""}"
                data-action="toggle-exercise-skip"
                data-exercise-id="${esc(ex.exercicioId)}"
                title="${skipped?"Desfazer pulo":"Pular este exercício sem invalidar o treino"}">
                ${skipped?"Desfazer pulo":"Pular"}
              </button>`:""}
              ${visualButton(ex.exercicioId,"Ver execução")}
              ${exerciseAccordionButton(ex.exercicioId,isOpen)}
            </div>
          </div>
          <div class="exercise-card__body" ${isOpen?"":"hidden"}>
            ${ex.planejado?.observacao?`<div class="exercise-note">${esc(ex.planejado.observacao)}</div>`:""}
            ${skipped?`<div class="exercise-skip-note">Exercício pulado. O treino ainda pode ser concluído normalmente.</div>`:""}
            ${inlineExerciseExample(ex.exercicioId)}
            ${exerciseHistoryBox(pex,ex.exercicioId,locked)}
            ${loadUnitControl(ex,locked||skipped)}
            <div class="series-stack">${seriesHtml}</div>
          </div>
        </article>`;
    };

    const exerciseCards=[];
    const list=session.exercicios||[];
    let conjugatedGroupNo=0;
    for(let idx=0;idx<list.length;idx+=1){
      const ex=list[idx];
      const next=list[idx+1];
      if(isConjugatedExercise(ex) && next && isConjugatedExercise(next)){
        conjugatedGroupNo+=1;
        const pairA={first:ex,second:next,firstIndex:idx,secondIndex:idx+1,position:1};
        const pairB={...pairA,position:2};
        const rounds=conjugatedRounds(pairA);
        const doneRounds=conjugatedRoundsDone(pairA);
        const rest=conjugatedRestLabel(pairA);
        exerciseCards.push(`
          <section class="conjugated-group ${doneRounds===rounds?"done":""}" data-conjugated-group>
            <div class="conjugated-group__head">
              <div>
                <span class="conjugated-kicker">BI-SET (CONJUGADO)</span>
                <h3>BI-SET ${conjugatedGroupNo} · ${rounds} rodadas</h3>
                <p><strong>${esc(ex.nome)}</strong> ${esc(ex.planejado?.reps||"")} → <strong>sem descanso</strong> → <strong>${esc(next.nome)}</strong> ${esc(next.planejado?.reps||"")} → descanso ${esc(rest)}.</p>
                <small>1 rodada = 1 série de cada exercício. O descanso começa somente depois do exercício B.</small>
              </div>
              <div class="conjugated-round-progress"><strong>${doneRounds}/${rounds}</strong><span>rodadas</span></div>
            </div>
            <div class="conjugated-flow"><span>A</span><b>${esc(ex.nome)}</b><i>→</i><em>SEM DESCANSO</em><i>→</i><span>B</span><b>${esc(next.nome)}</b><i>→</i><em>DESCANSO ${esc(rest)}</em></div>
            <div class="conjugated-group__cards">
              ${buildCard(ex,idx,pairA)}
              <div class="conjugated-no-rest"><span>↳</span><strong>Vá direto para o exercício B</strong><small>Sem descanso entre os dois.</small></div>
              ${buildCard(next,idx+1,pairB)}
            </div>
          </section>`);
        idx+=1;
        continue;
      }
      exerciseCards.push(buildCard(ex,idx,null));
    }

    const p=progress(session);
    const finishArea=session.status==="em_andamento"
      ? `<article class="card finish-workout-card ${p.pct===100?"ready":""}">
          <div>
            <span class="treino-kicker">${p.pct===100?"PRONTO PARA FINALIZAR":"TREINO ABERTO"}</span>
            <h2>${p.done}/${p.total} exercícios resolvidos${p.skipped?` · ${p.skipped} pulado${p.skipped===1?"":"s"}`:""}</h2>
            <p>${p.pct===100
              ?"Você pode finalizar normalmente. Exercícios pulados não contam como executados, mas não impedem a conclusão do treino."
              :"O treino permanece aberto. Você pode concluir ou pular apenas o exercício que não consegue fazer."}</p>
          </div>
          ${p.pct===100
            ? '<button class="btn primary finish-workout-confirm" type="button" data-action="finish-workout">FINALIZAR TREINO</button>'
            : '<span class="finish-auto-badge">Em andamento</span>'}
        </article>`
      : `<article class="card workout-closed-card ${session.status}"><div><span class="treino-kicker">${session.status==="concluido"?"TREINO ENCERRADO":"DIA ENCERRADO · PARCIAL"}</span><h2>${p.done}/${p.total} exercícios</h2><p>${session.status==="concluido"?"Treino finalizado e salvo no histórico.":"O dia terminou antes da conclusão. O que foi feito ficou preservado e o restante foi registrado como pendente."}</p></div><strong>${session.status==="concluido"?"✓":"◐"}</strong></article>`;
    root.innerHTML=`
      ${renderSessionHeader(workout,session)}
      <article class="exercise-accordion-intro"><div><strong>Exercícios</strong><span>${locked
        ?"Treino encerrado. Abra um exercício para consultar o registro."
        :"Toque no ○ para concluir rapidamente. Use a seta para editar cargas e séries."}</span></div><span>${p.done}/${p.total}</span></article>
      <div class="exercise-stack">${exerciseCards.join("")}</div>
      ${finishArea}`;
  }

  function seriesRow(ex,s,highlight,locked=false) {
    const disabled=locked?"disabled":"";
    if (ex.registro==="protocolo") {
      return `<div class="series-card protocol-series ${s.concluida?"done":""}">
        <div><span>PROTOCOLO</span><strong>${esc(ex.planejado?.reps||"Concluir")}</strong></div>
        <div class="protocol-series__actions"><button type="button" class="btn small" data-guided-single data-guided-title="${esc(ex.nome)}" data-guided-detail="${esc(ex.planejado?.reps||ex.observacao||"Protocolo")}" data-guided-exercise-id="${esc(ex.exercicioId)}" data-guided-series="${s.numero}" ${disabled}>▶ Guiado</button><button class="series-check ${s.concluida?"done":""}" data-action="toggle-series" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>${s.concluida?"✓ Concluído":"✓ Concluir"}</button></div>
      </div>`;
    }
    const time=ex.registro==="tempo";
    const unit=normalizeLoadUnit(ex.unidadeCarga);
    const plates=unit==="placas";
    const loadLabel=plates?"Placa":"Carga total";
    const unitLabel=plates?"placas":"kg";
    const step=plates?1:2.5;
    const inputStep=plates?1:0.5;
    return `<div class="series-card ${s.concluida?"done":""} ${highlight?"focus":""}">
      <div class="series-title">
        <span>SÉRIE ${s.numero}</span>
        ${!time?`<small class="series-load-required">${plates?"placa":"carga"} + reps obrigatórios</small>`:""}
        ${s.concluida?"<b>✓</b>":""}
      </div>
      <div class="series-controls ${time?"single":""}">
        ${time ? `
          <label><span>Tempo</span><div class="stepper">
            <button type="button" data-step-field="segundos" data-step="-5" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>−</button>
            <input inputmode="numeric" type="number" min="0" step="5" value="${Number(s.segundos||0)}" data-field="segundos" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>
            <strong>s</strong>
            <button type="button" data-step-field="segundos" data-step="5" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>+</button>
          </div></label>` : `
          <label><span>${loadLabel}</span><div class="stepper">
            <button type="button" data-step-field="peso" data-step="-${step}" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>−</button>
            <input inputmode="decimal" type="number" min="0" step="${inputStep}" value="${Number(s.peso||0)}" data-field="peso" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>
            <strong>${unitLabel}</strong>
            <button type="button" data-step-field="peso" data-step="${step}" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>+</button>
          </div></label>
          <label><span>Repetições</span><div class="stepper">
            <button type="button" data-step-field="reps" data-step="-1" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>−</button>
            <input inputmode="numeric" type="number" min="0" step="1" value="${Number(s.reps||0)}" data-field="reps" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>
            <button type="button" data-step-field="reps" data-step="1" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>+</button>
          </div></label>`}
      </div>
      <button class="series-check ${s.concluida?"done":""}" data-action="toggle-series" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>${s.concluida?"✓ Série concluída":"✓ Concluir série"}</button>
    </div>`;
  }

  function checklist(items,kind,locked=false) {
    return `<div class="protocol-list">${(items||[]).map(item=>`
      <article class="protocol-item-wrap ${item.concluido?"done":""} ${item.pulado?"skipped":""}">
        <button class="protocol-item ${item.concluido?"done":""} ${item.pulado?"skipped":""}" data-action="toggle-check" data-kind="${kind}" data-index="${item.id}" ${locked||item.pulado?"disabled":""}>
          <span>${item.pulado?"↷":item.concluido?"✓":"○"}</span>
          <strong>${esc(item.texto)}</strong>
        </button>

        ${!locked?`<button
          type="button"
          class="checklist-skip-btn ${item.pulado?"active":""}"
          data-action="toggle-check-skip"
          data-kind="${kind}"
          data-index="${item.id}">
          ${item.pulado?"Desfazer":"Pular"}
        </button>`:""}
      </article>`).join("")}</div>`;
  }

  function footballWarmupChecklist(items,locked=false) {
    return `<div class="football-warmup-list">${(items||[]).map((saved,i)=>{
      const meta=footballWarmupMeta(saved,i);
      const item={...saved,...meta,concluido:Boolean(saved?.concluido),pulado:Boolean(saved?.pulado)};
      const guideId=item.guiaId || "";
      return `<article class="football-warmup-card ${item.concluido?"done":""} ${item.pulado?"skipped":""}">
        <div class="football-warmup-card__top">
          <button class="football-warmup-check" type="button" data-action="toggle-check" data-kind="aquecimento" data-index="${esc(item.id)}" aria-label="${item.concluido?"Marcar como não concluído":"Marcar como concluído"}" ${locked||item.pulado?"disabled":""}>
            ${item.pulado?"↷":item.concluido?"✓":"○"}
          </button>
          <span class="exercise-order">${String(i+1).padStart(2,"0")}</span>
          <div class="football-warmup-card__copy">
            <strong>${esc(item.nome || item.texto || "")}</strong>
            <small>${item.pulado?"Pulado · sequência do treino preservada":esc(item.prescricao || item.texto || "")}</small>
          </div>
          ${!locked?`<button type="button" class="checklist-skip-btn ${item.pulado?"active":""}" data-action="toggle-check-skip" data-kind="aquecimento" data-index="${esc(item.id)}">${item.pulado?"Desfazer":"Pular"}</button>`:""}
          ${guideId?visualButton(guideId,"Ver execução"):""}
        </div>
        ${guideId?`<details class="football-warmup-card__details">
          <summary>Como fazer</summary>
          ${guideHtml(guideId,true)}
        </details>`:""}
      </article>`;
    }).join("")}</div>`;
  }

  function renderFootball(root,workout,session) {
    const locked=session.status!=="em_andamento";
    root.innerHTML=`
      ${renderSessionHeader(workout,session)}
      <article class="card special-workout-card">
        <div class="section-head"><div><p class="eyebrow">Antes do jogo</p><h2>Aquecimento</h2></div></div>
        ${footballWarmupChecklist(session.aquecimento,locked)}
      </article>
      <article class="card special-workout-card">
        <div class="section-head"><div><p class="eyebrow">Depois do jogo</p><h2>Como foi?</h2></div></div>
        <div class="football-report">
          <div class="football-report__duration">
            ${specialNumber("Tempo total em campo (min)","duracao",session.futebol.duracao,0,240,1,"futebol",locked)}
            <p>Informe somente o tempo efetivamente jogado.</p>
          </div>

          <div class="football-report__intro">
            <strong>Avaliação do jogo</strong>
            <p>Escolha a palavra que melhor representa como você se sentiu. A escala numérica fica apenas no histórico para acompanhar sua evolução.</p>
          </div>

          ${subjectiveRating("intensidade",session.futebol.intensidade,"futebol",locked)}
          ${subjectiveRating("folego",session.futebol.folego,"futebol",locked)}
          ${subjectiveRating("explosao",session.futebol.explosao,"futebol",locked)}
          ${subjectiveRating("pernas",session.futebol.pernas,"futebol",locked)}
          ${subjectiveRating("recuperacao",session.futebol.recuperacao,"futebol",locked)}

          <label class="field football-report__notes">
            <span>Observação do jogo</span>
            <textarea data-special="futebol" data-field="observacao" placeholder="Ex.: senti a perna pesada no segundo tempo, chutei bem, cansou depois de 60 min..." ${locked?"disabled":""}>${esc(session.futebol.observacao)}</textarea>
          </label>
        </div>
      </article>
      ${session.status==="em_andamento"?`<button class="btn primary finish-special" data-action="finish-workout">FINALIZAR FUTEBOL</button>`:`<article class="card workout-closed-card concluido"><div><span class="treino-kicker">JOGO ENCERRADO</span><h2>Futebol registrado</h2><p>Treino salvo no histórico.</p></div><strong>✓</strong></article>`}`;
  }

  function renderCardio(root,workout,session) {
    const locked=session.status!=="em_andamento";
    const exerciseCards=(session.exercicios||[]).map((ex,idx)=>{
      const done=exerciseDone(ex);
      const skipped=exerciseSkipped(ex);
      const resolved=exerciseResolved(ex);
      const missed=session.status==="parcial" && !resolved;
      const pex=exercisePrior(ex.exercicioId,workout.id,session.data);
      const isOpen=exercisePanelIsOpen(ex.exercicioId);
      return `<article class="exercise-card ${done?"done":""} ${skipped?"skipped":""} ${missed?"missed":""} ${isOpen?"open":""}" data-exercise="${esc(ex.exercicioId)}">
        <div class="exercise-card__head">
          <button type="button" class="exercise-card__identity" data-action="toggle-exercise" data-exercise-id="${esc(ex.exercicioId)}" aria-expanded="${isOpen?"true":"false"}">
            <span class="exercise-order">${String(idx+1).padStart(2,"0")}</span>
            <span class="exercise-card__copy"><strong>${skipped?"↷ ":done?"✓ ":missed?"× ":""}${esc(ex.nome)}</strong><small>${esc(ex.planejado?.series)} × ${esc(ex.planejado?.reps)}</small>${pex?`<small class="exercise-last-inline">Última: ${esc(lastExerciseText(pex))}</small>`:""}</span>
          </button>
          <div class="exercise-head-actions">
            <span class="exercise-state">${skipped?"Pulado":done?"Concluído":missed?"Não realizado":isOpen?"Em preenchimento":"Pendente"}</span>
            ${!locked?`<button type="button" class="exercise-skip-btn ${skipped?"active":""}" data-action="toggle-exercise-skip" data-exercise-id="${esc(ex.exercicioId)}">${skipped?"Desfazer pulo":"Pular"}</button>`:""}
            ${visualButton(ex.exercicioId,"Ver execução")}
            ${exerciseAccordionButton(ex.exercicioId,isOpen)}
          </div>
        </div>
        <div class="exercise-card__body" ${isOpen?"":"hidden"}>
          ${skipped?`<div class="exercise-skip-note">Exercício pulado. O cardio ainda pode ser concluído.</div>`:""}
          ${inlineExerciseExample(ex.exercicioId)}
          ${exerciseHistoryBox(pex,ex.exercicioId,locked)}
          ${loadUnitControl(ex,locked||skipped)}
          <div class="series-stack">${(ex.series||[]).map(s=>seriesRow(ex,s,isOpen && !s.concluida,locked||skipped)).join("")}</div>
        </div>
      </article>`;
    }).join("");
    const cardioProgress=progress(session);
    const finish=session.status==="em_andamento"
      ? `<article class="card finish-workout-card"><div><span class="treino-kicker">${cardioProgress.pct===100?"CONCLUINDO AUTOMATICAMENTE":"CARDIO ABERTO"}</span><h2>${cardioProgress.done}/${cardioProgress.total} etapas</h2><p>${cardioProgress.pct===100?"Protocolo completo. O Memory está encerrando automaticamente.":"O cardio fica aberto até o fim do dia. Você pode sair e voltar para concluir as etapas restantes."}</p></div><span class="finish-auto-badge">${cardioProgress.pct===100?"✓ 100%":"Em andamento"}</span></article>`
      : `<article class="card workout-closed-card ${session.status}"><div><span class="treino-kicker">${session.status==="concluido"?"TREINO ENCERRADO":"DIA ENCERRADO · PARCIAL"}</span><h2>Registro salvo</h2><p>${session.status==="concluido"?"Cardio finalizado e salvo no histórico.":"O dia terminou com etapas pendentes; o esforço realizado foi preservado."}</p></div><strong>${session.status==="concluido"?"✓":"◐"}</strong></article>`;
    root.innerHTML=`
      ${renderSessionHeader(workout,session)}
      <article class="card special-workout-card">
        <div class="section-head"><div><p class="eyebrow">Bicicleta</p><h2>Protocolo</h2><span class="protocol-progress-copy">${(session.protocolo||[]).filter(x=>x.concluido).length}/${(session.protocolo||[]).length} etapas concluídas</span></div><div class="section-head__actions"><button type="button" class="btn primary guided-launch" data-guided-protocol ${locked?"disabled":""}>▶ Treino guiado</button>${visualButton("bike-estacionaria","Ver execução")}</div></div>
        ${checklist(session.protocolo,"protocolo",locked)}
        <div class="special-fields cardio-summary">
          ${specialNumber("Duração total (min)","duracao",session.cardio.duracao,0,180,1,"cardio",locked)}
          <label class="field"><span>Protocolo</span><select data-special="cardio" data-field="protocoloStatus" ${locked?"disabled":""}><option value="completo" ${session.cardio.protocoloStatus==="completo"?"selected":""}>Completo</option><option value="parcial" ${session.cardio.protocoloStatus==="parcial"?"selected":""}>Parcial</option></select></label>
          ${specialNumber("Intensidade percebida","intensidade",session.cardio.intensidade,1,10,1,"cardio",locked)}
          <label class="field full"><span>Observação</span><textarea data-special="cardio" data-field="observacao" ${locked?"disabled":""}>${esc(session.cardio.observacao)}</textarea></label>
        </div>
      </article>
      ${exerciseCards?`<article class="exercise-accordion-intro"><div><strong>Exercícios agrupados</strong><span>${locked?"Treino encerrado. Abra para consultar o registro.":"Abra somente o exercício que estiver registrando."}</span></div></article><div class="exercise-stack">${exerciseCards}</div>`:""}
      ${finish}`;
  }

  const SUBJECTIVE_SCALES = {
    intensidade: {
      titulo:"Intensidade do jogo",
      ajuda:"Quanto esforço o jogo exigiu de você?",
      opcoes:[
        {valor:1,label:"Leve"},
        {valor:2,label:"Moderada"},
        {valor:3,label:"Forte"},
        {valor:4,label:"Muito forte"},
        {valor:5,label:"No limite"}
      ]
    },
    folego: {
      titulo:"Fôlego",
      ajuda:"Como seu condicionamento sustentou o jogo?",
      opcoes:[
        {valor:1,label:"Muito ruim"},
        {valor:2,label:"Ruim"},
        {valor:3,label:"Regular"},
        {valor:4,label:"Bom"},
        {valor:5,label:"Ótimo"}
      ]
    },
    explosao: {
      titulo:"Explosão",
      ajuda:"Como estavam suas arrancadas e mudanças de ritmo?",
      opcoes:[
        {valor:1,label:"Travado"},
        {valor:2,label:"Baixa"},
        {valor:3,label:"Regular"},
        {valor:4,label:"Boa"},
        {valor:5,label:"Excelente"}
      ]
    },
    pernas: {
      titulo:"Condição das pernas",
      ajuda:"Como as pernas responderam durante o jogo?",
      opcoes:[
        {valor:1,label:"Muito pesadas"},
        {valor:2,label:"Pesadas"},
        {valor:3,label:"Normais"},
        {valor:4,label:"Boas"},
        {valor:5,label:"Soltas"}
      ]
    },
    recuperacao: {
      titulo:"Recuperação entre esforços",
      ajuda:"Quão rápido você conseguia recuperar o fôlego para acelerar de novo?",
      opcoes:[
        {valor:1,label:"Muito lenta"},
        {valor:2,label:"Lenta"},
        {valor:3,label:"Regular"},
        {valor:4,label:"Boa"},
        {valor:5,label:"Muito boa"}
      ]
    }
  };

  function subjectiveStoredValue(value) {
    const n=Number(value);
    if(!Number.isFinite(n) || n<=0) return 0;
    if(n<=5) return Math.round(n);
    return Math.max(1,Math.min(5,Math.ceil(n/2)));
  }

  function subjectiveRating(field,value,group="futebol",locked=false) {
    const scale=SUBJECTIVE_SCALES[field];
    if(!scale) return "";
    const selected=subjectiveStoredValue(value);

    return `<section class="subjective-rating" data-rating="${esc(field)}">
      <div class="subjective-rating__head">
        <div>
          <strong>${esc(scale.titulo)}</strong>
          <small>${esc(scale.ajuda)}</small>
        </div>
        ${selected?`<span class="subjective-rating__selected">${esc(scale.opcoes.find(x=>x.valor===selected)?.label||"")}</span>`:"<span class=\"subjective-rating__selected empty\">Não avaliado</span>"}
      </div>
      <div class="subjective-rating__options">
        ${scale.opcoes.map(option=>`
          <button
            type="button"
            class="subjective-rating__option ${selected===option.valor?"active":""}"
            data-rating-group="${esc(group)}"
            data-rating-field="${esc(field)}"
            data-rating-value="${option.valor}"
            aria-pressed="${selected===option.valor?"true":"false"}"
            ${locked?"disabled":""}
          >${esc(option.label)}</button>
        `).join("")}
      </div>
    </section>`;
  }

  function specialNumber(label,field,value,min,max,step,group,locked=false) {
    return `<label class="field"><span>${esc(label)}</span><input type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${esc(value)}" data-special="${group}" data-field="${field}" ${locked?"disabled":""}></label>`;
  }

  async function startWorkout(button=null) {
    if(startingWorkout) return;
    const iso=todayIso();
    const workout=workoutForDate(iso);

    if (!workout || workout.tipo==="descanso") {
      MMCDUI?.toast?.("Não há treino disponível para iniciar hoje.",3200);
      return;
    }

    const excuse=workoutConstancyExcuseInfo(iso);
    if(excuse){
      MMCDUI?.toast?.("Este treino está abonado em Atividades e não pode ser iniciado.",3600);
      renderToday();
      return;
    }

    const existing=sessionForDate(iso);
    if(existing){
      if(existing.tipo==="musculacao" && existing.status==="em_andamento" && !openExerciseId) {
        openExerciseId=(existing.exercicios||[]).find(ex=>!exerciseDone(ex))?.exercicioId || null;
      }
      renderAll();
      requestAnimationFrame(()=>$(".active-workout-head")?.scrollIntoView({behavior:"smooth",block:"start"}));
      return;
    }

    startingWorkout=true;
    if(button){
      button.disabled=true;
      button.dataset.originalLabel=button.textContent;
      button.textContent="ABRINDO TREINO...";
    }

    let created=null;
    try{
      created=createSession(workout);
      state.sessoes.push(created);

      // V81.4.1 — no celular, o primeiro exercício já abre pronto para registrar.
      openExerciseId=created.tipo==="musculacao"
        ? (created.exercicios||[]).find(ex=>!exerciseDone(ex))?.exercicioId || null
        : null;

      // Atualiza a tela imediatamente. O usuário não precisa esperar o Supabase responder.
      renderAll();
      requestAnimationFrame(()=>$(".active-workout-head")?.scrollIntoView({behavior:"smooth",block:"start"}));

      await saveSessions();
      status("Dados online · Supabase","saved");
    }catch(error){
      console.error("Falha ao iniciar treino:",error);
      if(created) state.sessoes=state.sessoes.filter(item=>item.id!==created.id);
      renderAll();
      MMCDUI?.toast?.(`Não foi possível iniciar o treino${error?.message ? `: ${error.message}` : "."}`,5000);
    }finally{
      startingWorkout=false;
    }
  }

  // V53 — acionamento direto e robusto para iPhone/Safari.
  // O touchend chama o treino sem depender da delegação global de cliques.
  // O click subsequente do iOS é ignorado por alguns milissegundos.
  let memoryLastStartTrigger=0;
  window.MemoryStartWorkoutNow=(button,event)=>{
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const now=Date.now();
    if(now-memoryLastStartTrigger<800) return false;
    memoryLastStartTrigger=now;
    startWorkout(button);
    return false;
  };

  function findSessionExercise(exerciseId) {
    const session=sessionForDate(todayIso());
    const ex=session?.exercicios?.find(x=>x.exercicioId===exerciseId);
    return {session,ex};
  }

  function updateSeries(exerciseId,seriesNo,field,value) {
    const {session,ex}=findSessionExercise(exerciseId);
    if (!session || !ex || session.status!=="em_andamento") return;
    const s=ex.series.find(x=>Number(x.numero)===Number(seriesNo));
    if (!s) return;
    s[field]=Math.max(0,num(value));
    saveSessions();
  }

  function stepSeries(exerciseId,seriesNo,field,delta) {
    const {session,ex}=findSessionExercise(exerciseId);
    if (!session || !ex || session.status!=="em_andamento") return;
    const s=ex.series.find(x=>Number(x.numero)===Number(seriesNo));
    if (!s) return;
    const precision=field==="peso" && normalizeLoadUnit(ex.unidadeCarga)==="placas" ? 0 : field==="peso" ? 1 : 0;
    const next=Math.max(0,Number((num(s[field])+num(delta)).toFixed(precision)));
    s[field]=next;
    openExerciseId=exerciseId;
    saveSessions();
    renderToday();
  }

  function setLoadUnit(exerciseId,unit) {
    const {session,ex}=findSessionExercise(exerciseId);
    if(!session || !ex || session.status!=="em_andamento" || ex.registro!=="peso_reps") return;
    ex.unidadeCarga=normalizeLoadUnit(unit);
    openExerciseId=exerciseId;
    saveSessions();
    renderToday();
  }

  async function toggleExerciseSkip(exerciseId){
    const {session,ex}=findSessionExercise(exerciseId);

    if(!session || !ex || session.status!=="em_andamento") return;

    ex.pulado=!Boolean(ex.pulado);

    if(ex.pulado){
      ex.motivoPulo="Pulado durante o treino";
      openExerciseId=null;

      window.MMCDUI?.toast?.(
        `${ex.nome} foi pulado. O treino pode ser finalizado normalmente.`
      );
    }else{
      ex.motivoPulo="";
      openExerciseId=exerciseId;

      window.MMCDUI?.toast?.(
        `${ex.nome} voltou para o treino.`
      );
    }

    await saveSessions();
    renderToday();

    if(progress(session).pct===100){
      window.MMCDUI?.toast?.(
        "Todas as etapas estão resolvidas. Você já pode finalizar o treino.",
        3600
      );
    }
  }


  function quickCompleteExercise(exerciseId) {
    const {session,ex}=findSessionExercise(exerciseId);

    if(!session || !ex || session.status!=="em_andamento") return;

    const series=Array.isArray(ex.series)?ex.series:[];
    ex.pulado=false;
    ex.motivoPulo="";
    const wasDone=exerciseDone(ex);

    // V81.4.2 — o check é um toggle real.
    // Tocou no ✓ por engano? Toca novamente e o exercício volta para pendente.
    if(wasDone) {
      series.forEach(s=>{s.concluida=false;});
      openExerciseId=exerciseId;
      closeRestTimer();
      saveSessions();
      renderToday();

      window.MMCDUI?.toast?.(`${ex.nome} voltou para pendente.`);

      requestAnimationFrame(()=>{
        document.querySelector(`.exercise-card[data-exercise="${CSS.escape(String(exerciseId))}"]`)
          ?.scrollIntoView({behavior:"smooth",block:"center"});
      });
      return;
    }

    if(ex.registro==="peso_reps") {
      const reference=series.find(s=>num(s.peso)>0) || null;

      if(reference) {
        series.forEach(s=>{
          if(num(s.peso)<=0) s.peso=num(reference.peso);
          if(num(s.reps)<=0) s.reps=num(reference.reps) || repsDefault(ex.planejado?.reps);
        });
      }

      const missing=series.find(s=>num(s.peso)<=0 || num(s.reps)<=0);

      if(missing) {
        openExerciseId=exerciseId;
        renderToday();

        window.MMCDUI?.toast?.(
          "Informe a carga deste exercício. Depois o Memory reaproveita sua última carga automaticamente.",
          4200
        );

        requestAnimationFrame(()=>{
          const selector=`[data-exercise-id="${CSS.escape(String(exerciseId))}"][data-series="${Number(missing.numero)}"][data-field="${num(missing.peso)<=0?"peso":"reps"}"]`;
          document.querySelector(selector)?.focus();
        });

        return;
      }
    }

    if(ex.registro==="tempo") {
      const reference=series.find(s=>num(s.segundos)>0);
      if(reference) {
        series.forEach(s=>{
          if(num(s.segundos)<=0) s.segundos=num(reference.segundos);
        });
      }
    }

    series.forEach(s=>{s.concluida=true;});

    const nextExercise=(session.exercicios||[]).find(item=>!exerciseDone(item));
    openExerciseId=nextExercise?.exercicioId || null;

    ensureAlarmAudioUnlocked();
    saveSessions();
    renderToday();

    // V81.4.2 — 100% NÃO encerra sozinho.
    // O usuário confirma o treino no botão FINALIZAR TREINO.
    if(progress(session).pct===100) {
      closeRestTimer();
      window.MMCDUI?.toast?.("100% concluído. Confira e finalize o treino quando quiser.",3600);
      return;
    }

    window.MMCDUI?.toast?.(`${ex.nome} concluído.`);

    requestAnimationFrame(()=>{
      if(openExerciseId) {
        document.querySelector(`.exercise-card[data-exercise="${CSS.escape(String(openExerciseId))}"]`)
          ?.scrollIntoView({behavior:"smooth",block:"center"});
      }
    });
  }

  function toggleSeries(exerciseId,seriesNo) {
    const {session,ex}=findSessionExercise(exerciseId);
    if (!session || !ex || session.status!=="em_andamento") return;
    const s=ex.series.find(x=>Number(x.numero)===Number(seriesNo));
    if (!s) return;

    const pair=conjugatedPair(session,ex);
    const concluindo=!Boolean(s.concluida);

    if(concluindo && pair){
      if(pair.position===2){
        const firstSame=seriesByNumber(pair.first,seriesNo);
        if(!firstSame?.concluida){
          window.MMCDUI?.toast?.(`Primeiro conclua ${pair.first.nome} da rodada ${seriesNo}.`);
          openExerciseId=pair.first.exercicioId;
          renderToday();
          scrollToSeries(pair.first.exercicioId,seriesNo);
          return;
        }
      }else if(Number(seriesNo)>1){
        const previousSecond=seriesByNumber(pair.second,Number(seriesNo)-1);
        if(!previousSecond?.concluida){
          window.MMCDUI?.toast?.(`Finalize a rodada ${Number(seriesNo)-1} do BI-SET antes de começar a próxima.`);
          openExerciseId=pair.second.exercicioId;
          renderToday();
          scrollToSeries(pair.second.exercicioId,Number(seriesNo)-1);
          return;
        }
      }
    }

    if (!s.concluida && ex.registro==="peso_reps") {
      const unit=normalizeLoadUnit(ex.unidadeCarga);
      if (num(s.peso)<=0) {
        window.MMCDUI?.toast?.(unit==="placas"?"Informe a placa utilizada antes de concluir a série.":"Informe a carga total em kg antes de concluir a série.");
        const input=document.querySelector(`[data-exercise-id="${CSS.escape(exerciseId)}"][data-series="${seriesNo}"][data-field="peso"]`);
        input?.focus(); return;
      }
      if (num(s.reps)<=0) {
        window.MMCDUI?.toast?.("Informe as repetições realizadas antes de concluir a série.");
        const input=document.querySelector(`[data-exercise-id="${CSS.escape(exerciseId)}"][data-series="${seriesNo}"][data-field="reps"]`);
        input?.focus(); return;
      }
    }

    s.concluida=!Boolean(s.concluida);
    const exercicioTerminou=exerciseDone(ex);
    if(concluindo) ensureAlarmAudioUnlocked();
    const timerConfig=concluindo ? restTimerConfig(session,ex,s) : null;

    let nextTarget=null;
    if(concluindo && pair){
      if(pair.position===1){
        openExerciseId=pair.second.exercicioId;
        nextTarget={exerciseId:pair.second.exercicioId,seriesNo:Number(seriesNo)};
      }else{
        const nextRound=Number(seriesNo)+1;
        if(nextRound<=conjugatedRounds(pair)){
          openExerciseId=pair.first.exercicioId;
          nextTarget={exerciseId:pair.first.exercicioId,seriesNo:nextRound};
        }else{
          const nextExercise=(session.exercicios||[]).slice(pair.secondIndex+1).find(item=>!exerciseDone(item));
          openExerciseId=nextExercise?.exercicioId || null;
          if(nextExercise) nextTarget={exerciseId:nextExercise.exercicioId,seriesNo:1};
        }
      }
    }else if(exercicioTerminou){
      openExerciseId=null;
    }else if(concluindo){
      openExerciseId=exerciseId;
    }

    saveSessions();
    renderToday();

    if(concluindo && progress(session).pct===100){
      closeRestTimer();
      window.MMCDUI?.toast?.("100% concluído. Confira e finalize o treino quando quiser.",3600);
      return;
    }

    if(concluindo && timerConfig){
      window.setTimeout(()=>openRestTimer(timerConfig),80);
    }else if(concluindo && nextTarget){
      scrollToSeries(nextTarget.exerciseId,nextTarget.seriesNo);
    }

    if (exercicioTerminou && !pair) {
      window.MMCDUI?.toast?.(`${ex.nome} concluído.`);
    }else if(concluindo && pair?.position===1){
      window.MMCDUI?.toast?.(`Sem descanso: vá direto para ${pair.second.nome}.`);
    }else if(concluindo && pair?.position===2){
      window.MMCDUI?.toast?.(`Rodada ${seriesNo} do BI-SET concluída.`);
    }
  }

  function copyLast(exerciseId) {
    const session=sessionForDate(todayIso());
    if (!session || session.status!=="em_andamento") return;
    const current=session.exercicios.find(x=>x.exercicioId===exerciseId);
    const prior=exercisePrior(exerciseId,session.treinoId,session.data);
    if (!current || !prior) return;
    if(current.registro==="peso_reps") current.unidadeCarga=normalizeLoadUnit(prior.unidadeCarga||current.unidadeCarga);
    current.series.forEach((s,i)=>{
      const old=prior.series?.[i] || prior.series?.[prior.series.length-1];
      if (!old) return;
      if ("peso" in s) s.peso=Number(old.peso||0);
      if ("reps" in s) s.reps=Number(old.reps||0);
      if ("segundos" in s) s.segundos=Number(old.segundos||0);
    });
    openExerciseId=exerciseId;
    saveSessions();
    renderToday();
    MMCDUI?.toast?.("Último treino copiado.");
  }

  function findChecklistItem(session,kind,index){
    if(!session || !Array.isArray(session[kind])) return null;

    const requestedId=String(index ?? "");

    return session[kind].find((x,pos)=>{
      if(String(x?.id ?? "")===requestedId) return true;

      const numericRequested=Number(requestedId);
      const numericSaved=Number(x?.id);

      if(
        requestedId!==""
        && Number.isFinite(numericRequested)
        && Number.isFinite(numericSaved)
        && numericSaved===numericRequested
      ){
        return true;
      }

      return String(pos)===requestedId;
    }) || null;
  }

  async function toggleChecklistSkip(kind,index){
    const session=sessionForDate(todayIso());

    if(
      !session
      || session.status!=="em_andamento"
      || !Array.isArray(session[kind])
    ) return;

    const item=findChecklistItem(session,kind,index);

    if(!item){
      window.MMCDUI?.toast?.("Não consegui localizar esta etapa.");
      return;
    }

    item.pulado=!Boolean(item.pulado);

    if(item.pulado){
      item.concluido=false;
    }

    await saveSessions();
    renderToday();

    window.MMCDUI?.toast?.(
      item.pulado
        ? "Etapa pulada. O treino ainda pode ser concluído normalmente."
        : "Etapa voltou para o treino."
    );

    if(progress(session).pct===100){
      maybeAutoFinishWorkout(session);
    }
  }


  function toggleCheck(kind,index) {
    const session=sessionForDate(todayIso());
    if (!session || session.status!=="em_andamento" || !Array.isArray(session[kind])) return;

    const item=findChecklistItem(session,kind,index);

    if (!item) {
      console.warn("Treinos: item do checklist não encontrado.", {kind,index});
      MMCDUI?.toast?.("Não consegui localizar este item do treino.");
      return;
    }

    item.pulado=false;
    item.concluido=!Boolean(item.concluido);
    renderToday();
    saveSessions().then(()=>{
      if(item.concluido && progress(session).pct===100) maybeAutoFinishWorkout(session);
    }).catch(error=>{
      console.error("Treinos: falha ao salvar checklist.",error);
      item.concluido=!Boolean(item.concluido);
      renderToday();
      MMCDUI?.toast?.("Não foi possível salvar o check. Tente novamente.");
    });
  }

  function updateSpecial(group,field,value) {
    const session=sessionForDate(todayIso());
    if (!session?.[group] || session.status!=="em_andamento") return;
    session[group][field]=value;
    saveSessions();
  }

  function scoreWorkoutActivity(meta) {
    const name=normalizeText(meta?.nome);
    const desc=normalizeText(meta?.descricao);
    let score=0;
    if(name==="treino") score+=120;
    if(name==="atividade fisica") score+=115;
    if(name.includes("treino")) score+=95;
    if(name.includes("atividade fisica")) score+=90;
    if(name.includes("exercicio")) score+=80;
    if(name.includes("academia")) score+=70;
    if(desc.includes("treino") || desc.includes("atividade fisica")) score+=20;
    return score;
  }

  function workoutHadEffort(session) {
    if(!session) return false;
    if(session.tipo==="futebol") return session.registroSemCelular===true || num(session.futebol?.duracao)>0 || (session.aquecimento||[]).some(x=>x.concluido);
    if(session.tipo==="cardio") return num(session.cardio?.duracao)>0 || (session.protocolo||[]).some(x=>x.concluido) || (session.exercicios||[]).some(ex=>exerciseDone(ex));
    return (session.exercicios||[]).some(ex=>(ex.series||[]).some(series=>series.concluida));
  }

  function isMusculacaoSession(session){
    return Boolean(session && session.tipo==="musculacao" && workoutHadEffort(session));
  }

  function isFlexibleWeeklyMeta(meta){
    return meta?.modoProgramacao==="semanal_flexivel";
  }

  function metaActiveByDate(meta,date){
    if(!meta?.ativa) return false;
    if(meta.inicioVigencia && date<meta.inicioVigencia) return false;
    if(meta.fimVigencia && date>meta.fimVigencia) return false;
    if(isFlexibleWeeklyMeta(meta)) return true;
    return (meta.diasSemana||[]).includes(new Date(`${date}T12:00:00`).getDay());
  }

  function weeklyBounds(date){
    const base=new Date(`${date}T12:00:00`);
    const offset=(base.getDay()+6)%7;
    const start=new Date(base);start.setDate(base.getDate()-offset);
    const end=new Date(start);end.setDate(start.getDate()+6);
    const isoDate=x=>{const y=x.getFullYear(),m=String(x.getMonth()+1).padStart(2,"0"),d=String(x.getDate()).padStart(2,"0");return `${y}-${m}-${d}`};
    return {start:isoDate(start),end:isoDate(end)};
  }

  function weeklyCompletionCount(meta,date){
    if(!isFlexibleWeeklyMeta(meta)||!state.atividadesData) return 0;
    const {start,end}=weeklyBounds(date);
    let total=0;
    const cursor=new Date(`${start}T12:00:00`),last=new Date(`${end}T12:00:00`);
    while(cursor<=last){
      const day=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;
      const row=window.MMCD.registro(state.atividadesData,day,meta.id);
      if(row?.concluida && !window.MMCD.estaAbonada(row)) total+=Math.max(1,Number(row.valor||1));
      cursor.setDate(cursor.getDate()+1);
    }
    return total;
  }

  function flexibleTarget(meta){return Math.max(1,Number(meta?.metaSemanal||meta?.quantidade||1))}

  function activeActivityMetas(date=todayIso()){
    const data=state.atividadesData;
    if(!data || !window.MMCD) return [];
    return (data.metas||[]).filter(meta=>metaActiveByDate(meta,date));
  }

  function flexibleMetaStillAvailable(meta,date){
    if(!isFlexibleWeeklyMeta(meta)) return true;
    return weeklyCompletionCount(meta,date)<flexibleTarget(meta);
  }

  function metaText(meta){
    return `${normalizeText(meta?.nome)} ${normalizeText(meta?.descricao)}`.trim();
  }

  function specificActivityMetas(session,active){
    const valid=active.filter(meta=>flexibleMetaStillAvailable(meta,session.data));

    if(session.tipo==="futebol"){
      const matches=valid.filter(meta=>{
        const text=metaText(meta);
        return normalizeText(meta?.nome)==="futebol" || text.includes("futebol") || text.includes("jogar bola");
      });
      if(matches.length) return matches;
    }

    if(session.tipo==="cardio"){
      const matches=valid.filter(meta=>{
        const text=metaText(meta);
        return text.includes("cardio") || text.includes("hiit");
      });
      if(matches.length) return matches;
    }

    return [];
  }

  function linkedActivityMetasForWorkout(session){
    if(!session || !workoutHadEffort(session)) return [];

    const active=activeActivityMetas(session.data);
    const specific=specificActivityMetas(session,active);

    const linked=active.filter(meta=>
      meta?.associadaTreinoFisico===true &&
      flexibleMetaStillAvailable(meta,session.data)
    );

    // Futebol é um evento próprio: quando existir uma meta Futebol, ela tem
    // prioridade e evita concluir uma meta genérica de academia por engano.
    if(session.tipo==="futebol" && specific.length) return specific;

    // Cardio pode contribuir tanto para uma meta específica quanto para metas
    // gerais explicitamente vinculadas ao treino.
    if(session.tipo==="cardio" && specific.length) {
      return [...new Map([...specific,...linked].map(meta=>[String(meta.id),meta])).values()];
    }

    if(linked.length) return linked;
    if(specific.length) return specific;

    const fallback=active
      .filter(meta=>flexibleMetaStillAvailable(meta,session.data))
      .map(meta=>({meta,score:scoreWorkoutActivity(meta)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)[0]?.meta;

    return fallback?[fallback]:[];
  }

  function primaryActivityMetasForWorkout(date=todayIso()){
    const workout=workoutForDate(date);
    if(String(workout?.tipo||"")!=="musculacao") return [];

    const active=activeActivityMetas(date);
    const linkedActive=active.filter(meta=>meta?.associadaTreinoFisico===true);
    const primaryLinked=linkedActive
      .map(meta=>({meta,score:scoreWorkoutActivity(meta)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)[0]?.meta;
    if(primaryLinked) return [primaryLinked];

    const configured=String(state.plano?.programa?.atividadeMetaId||"").trim();
    if(configured){
      const exact=active.find(meta=>String(meta.id)===configured);
      if(exact) return [exact];
    }

    const fallback=active.map(meta=>({meta,score:scoreWorkoutActivity(meta)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)[0]?.meta;
    return fallback?[fallback]:[];
  }

  function activityMetaForWorkout(date=todayIso()) {
    return primaryActivityMetasForWorkout(date)[0] || null;
  }

  function workoutExcuseInfo(date=todayIso()) {
    if(!window.MMCD || !state.atividadesData) return null;
    const metas=primaryActivityMetasForWorkout(date);
    for(const meta of metas){
      const row=window.MMCD.registro(state.atividadesData,date,meta.id);
      if(window.MMCD.estaAbonada(row)) return {meta,row,motivo:window.MMCD.motivoAbono(row)};
    }
    return null;
  }

  async function markWorkoutActivity(session) {
    if(!window.MMCD || !state.atividadesData) return {ok:false,reason:"sem-integracao",metas:[],newlyMarked:[]};
    if(!session || !workoutHadEffort(session)) return {ok:false,reason:"sem-esforco",metas:[],newlyMarked:[]};

    const metas=linkedActivityMetasForWorkout(session);
    if(!metas.length) return {ok:false,reason:"sem-meta",metas:[],newlyMarked:[]};

    const newlyMarked=[];
    const alreadyMarked=[];

    for(const meta of metas){
      const previous=window.MMCD.registro(state.atividadesData,session.data,meta.id);
      if(window.MMCD.estaAbonada(previous)) continue;

      if(previous?.concluida){
        alreadyMarked.push(meta);
        continue;
      }

      const nextValue=isFlexibleWeeklyMeta(meta)?Math.max(1,Number(previous?.valor||0)):1;
      window.MMCD.setRegistro(state.atividadesData,session.data,meta.id,{
        concluida:true,
        abonada:false,
        valor:nextValue,
        texto:"",
        observacao:previous?.observacao||"",
        origem:session.registroSemCelular ? "treino_sem_celular" : (isFlexibleWeeklyMeta(meta)?"treino_semanal_flexivel":"treino")
      });

      state.atividadesData=await window.MMCD.salvarRegistroAtividade(state.atividadesData,session.data,meta.id);
      window.dispatchEvent(new CustomEvent("mmcd:atividade-atualizada",{detail:{data:session.data,metaId:meta.id,origem:"treino"}}));
      newlyMarked.push(meta);
    }

    return {ok:true,meta:metas[0],metas,newlyMarked,alreadyMarked,already:newlyMarked.length===0};
  }

  function workoutActivityUpdateText(activity){
    const names=(activity?.newlyMarked||[]).map(meta=>meta.nome).filter(Boolean);
    if(!names.length) return "";
    if(names.length===1) return `${names[0]} atualizada a partir do treino de hoje.`;
    if(names.length===2) return `${names[0]} e ${names[1]} atualizadas a partir do treino de hoje.`;
    return `${names.slice(0,-1).join(", ")} e ${names.at(-1)} atualizadas a partir do treino de hoje.`;
  }

  function footballActivityMetaForDate(date){
    return activeActivityMetas(date).find(meta=>{
      const text=metaText(meta);
      return normalizeText(meta?.nome)==="futebol" || text.includes("futebol") || text.includes("jogar bola");
    }) || null;
  }

  function footballActivityDone(date){
    if(!window.MMCD || !state.atividadesData) return false;
    const meta=footballActivityMetaForDate(date);
    if(!meta) return false;
    const row=window.MMCD.registro(state.atividadesData,date,meta.id);
    return Boolean(row?.concluida && !window.MMCD.estaAbonada(row));
  }

  function makeOfflineFootballSession(workout,date,{origin="manual"}={}){
    const session=createSession(workout,date);
    session.status="concluido";
    session.registroSemCelular=true;
    session.origemRegistro=origin;
    session.iniciadoEm=`${date}T12:00:00`;
    session.finalizadoEm=date===todayIso()?new Date().toISOString():`${date}T23:00:00`;
    session.duracaoMinutos=null;
    session.futebol={
      ...(session.futebol||{}),
      observacao:origin==="atividade"
        ? "Jogo recuperado a partir da atividade Futebol."
        : "Jogo registrado sem acompanhamento pelo celular."
    };
    return session;
  }

  async function reconcileFootballSessionsFromActivities(){
    if(!state.atividadesData?.registros) return false;
    let changed=false;

    for(const date of Object.keys(state.atividadesData.registros).sort()){
      if(date>todayIso()) continue;
      const workout=workoutForDate(date);
      if(workout?.tipo!=="futebol") continue;
      if(sessionForDate(date)) continue;
      if(!footballActivityDone(date)) continue;

      state.sessoes.push(makeOfflineFootballSession(workout,date,{origin:"atividade"}));
      changed=true;
    }

    if(changed) await saveSessions();
    return changed;
  }

  async function registerFootballWithoutTracking(date=state.selectedDate||todayIso()){
    const workout=workoutForDate(date);

    if(!workout || workout.tipo!=="futebol"){
      MMCDUI?.toast?.("Este registro rápido é exclusivo do dia de futebol.");
      return;
    }

    if(date>todayIso()){
      MMCDUI?.toast?.("Você só pode registrar um jogo que já aconteceu.");
      return;
    }

    const existing=sessionForDate(date);
    if(existing?.status==="concluido"){
      MMCDUI?.toast?.("Este jogo já está registrado como concluído.");
      return;
    }

    const pergunta=date===todayIso()
      ? "Registrar que você jogou futebol hoje sem acompanhar o treino pelo celular?"
      : `Registrar o futebol de ${datePt(date)} como realizado, sem acompanhamento pelo celular?`;

    if(!confirm(pergunta)) return;

    let session=existing;
    if(!session){
      session=makeOfflineFootballSession(workout,date,{origin:"manual"});
      state.sessoes.push(session);
    } else {
      session.status="concluido";
      session.registroSemCelular=true;
      session.origemRegistro="manual";
      session.finalizadoEm=session.finalizadoEm || new Date().toISOString();
    }

    await saveSessions();

    try{
      const activity=await markWorkoutActivity(session);
      if(activity.ok && !activity.already){
        MMCDUI?.toast?.(`Futebol registrado · ${workoutActivityUpdateText(activity)}`,4200);
      } else {
        MMCDUI?.toast?.("Futebol registrado como concluído.",3200);
      }
    }catch(error){
      console.warn("Treinos: jogo salvo, mas Atividades não foi atualizada.",error);
      MMCDUI?.toast?.("Futebol registrado. Não consegui atualizar Atividades agora.",4200);
    }

    state.selectedDate=date;
    renderAll();
  }

  async function reconcileWorkoutLifecycleByDate() {
    const today=todayIso();
    let changed=false;
    const closed=[];

    // V60 — recupera um treino que foi finalizado parcialmente por engano no próprio dia.
    const todaySession=sessionForDate(today);
    if(todaySession?.status==="parcial" && progress(todaySession).pct<100){
      todaySession.status="em_andamento";
      todaySession.reabertoEm=new Date().toISOString();
      delete todaySession.finalizadoEm;
      changed=true;
    }

    // V60 — parcial só passa a ser estado final depois que o dia acabou.
    for(const session of state.sessoes){
      if(!session?.data || session.data>=today || session.status!=="em_andamento") continue;
      const p=progress(session);
      session.status=p.pct===100 ? "concluido" : "parcial";
      session.finalizadoEm=session.finalizadoEm || `${session.data}T23:59:59`;
      closed.push(session);
      changed=true;
    }

    if(changed) await saveSessions();

    for(const session of closed){
      if(!workoutHadEffort(session)) continue;
      try{
        await markWorkoutActivity(session);
      }catch(error){
        console.warn("Treinos: não foi possível atualizar a atividade física do treino encerrado pelo fim do dia.",error);
      }
    }
    return changed;
  }

  async function reconcileFinishedWorkoutActivity() {
    const session=sessionForDate(todayIso());
    if(!session || !["concluido","parcial"].includes(session.status)) return;
    try{
      const activity=await markWorkoutActivity(session);
      if(activity.ok && !activity.already){
        MMCDUI?.toast?.(workoutActivityUpdateText(activity),3600);
      }
    }catch(error){
      console.warn("Treinos: não foi possível reconciliar a atividade do treino finalizado.",error);
    }
  }

  const WORKOUT_RHYTHM_OPTIONS=[
    {valor:1,label:"Travado"},
    {valor:2,label:"Abaixo"},
    {valor:3,label:"Bom"},
    {valor:4,label:"Muito bom"},
    {valor:5,label:"Excelente"}
  ];

  function workoutFeedbackValue(session){
    const value=Number(session?.avaliacao?.ritmo||0);
    return Number.isFinite(value) ? clamp(Math.round(value),0,5) : 0;
  }

  function workoutFeedbackHtml(session){
    if(session?.tipo==="futebol") return "";
    const stored=workoutFeedbackValue(session);
    const selected=workoutFeedbackDraft||stored;
    const label=WORKOUT_RHYTHM_OPTIONS.find(x=>x.valor===selected)?.label||"";
    return `<section class="finish-feedback">
      <div class="finish-feedback__head"><span class="treino-kicker">CHECK-OUT DO TREINO</span><h3>Como foi o ritmo do treino?</h3><p>Escolha sua percepção, revise se quiser e só depois salve.</p></div>
      <div class="finish-feedback__options">${WORKOUT_RHYTHM_OPTIONS.map(option=>`<button type="button" class="finish-feedback__option ${selected===option.valor?"active":""}" data-workout-feedback="${option.valor}" aria-pressed="${selected===option.valor?"true":"false"}"><b>${option.valor}</b><span>${esc(option.label)}</span></button>`).join("")}</div>
      <div class="finish-feedback__commit"><small class="finish-feedback__saved">${stored&&!workoutFeedbackDraft?`✓ Avaliação salva: ${esc(label)}`:selected?`Selecionado: ${esc(label)}. Confirme para salvar.`:"Selecione uma opção de 1 a 5."}</small><button type="button" class="btn primary" data-action="save-workout-feedback" ${workoutFeedbackDraft?"":"disabled"}>${workoutFeedbackDraft?"Salvar avaliação":"Avaliação salva"}</button></div>
    </section>`;
  }

  function selectWorkoutFeedback(value){
    workoutFeedbackDraft=clamp(Math.round(Number(value)||0),1,5);
    const session=sessionForDate(todayIso());
    if(session) showFinishSummary(session);
  }

  async function saveWorkoutFeedback(){
    const session=sessionForDate(todayIso());
    if(!session||!["concluido","parcial"].includes(session.status)||session.tipo==="futebol"||!workoutFeedbackDraft)return;
    const rating=workoutFeedbackDraft;
    session.avaliacao={...(session.avaliacao||{}),ritmo:rating,atualizadoEm:new Date().toISOString()};
    await saveSessions();workoutFeedbackDraft=0;showFinishSummary(session);MMCDUI?.toast?.("Avaliação salva no histórico de Treinos.");
  }

  function promptPendingWorkoutFeedback(){
    if(window.MMCD_TREINO_PAGE_MODE==="configuracoes") return;
    const session=sessionForDate(todayIso());
    if(!session || !["concluido","parcial"].includes(session.status) || session.tipo==="futebol") return;
    if(workoutFeedbackValue(session)>0) return;
    showFinishSummary(session);
  }

  let autoFinishingWorkout=false;

  async function finishWorkout({forcePartial=false}={}) {
    const session=sessionForDate(todayIso());
    if (!session || session.status!=="em_andamento") return;
    const p=progress(session);

    // Pular uma ou mais etapas é permitido.
    // Pular TUDO, sem nenhum esforço real, não transforma o dia em treino concluído.
    if(
      session.tipo!=="futebol"
      && p.pct===100
      && p.skipped>0
      && !workoutHadEffort(session)
    ){
      window.MMCDUI?.toast?.(
        "Todas as etapas foram puladas. Isso preserva o registro, mas não conta como treino concluído.",
        4200
      );
      return;
    }

    // V60 — um treino incompleto de hoje não pode mais ser encerrado por engano.
    if(session.tipo!=="futebol" && p.pct<100 && !forcePartial){
      MMCDUI?.toast?.("Treino ainda incompleto. Ele ficará aberto até o fim do dia para você continuar depois.",4200);
      renderToday();
      return;
    }

    session.status=(p.pct===100 || session.tipo==="futebol") ? "concluido" : "parcial";
    if(session.tipo==="cardio" && p.pct===100) session.cardio.protocoloStatus="completo";
    session.finalizadoEm=new Date().toISOString();
    const start=new Date(session.iniciadoEm);
    session.duracaoMinutos=Math.max(1,Math.round((Date.now()-start.getTime())/60000));
    if (session.tipo==="futebol" && num(session.futebol.duracao)>0) session.duracaoMinutos=num(session.futebol.duracao);
    if (session.tipo==="cardio" && num(session.cardio.duracao)>0) session.duracaoMinutos=num(session.cardio.duracao);

    const sessionSave=saveSessions();
    openExerciseId=null;
    closeRestTimer();
    renderAll();
    await sessionSave;

    try{
      const activity=await markWorkoutActivity(session);
      if(activity.ok && !activity.already) MMCDUI?.toast?.(`Treino concluído · ${workoutActivityUpdateText(activity)}`,4200);
      else if(activity.reason==="sem-meta") MMCDUI?.toast?.("Treino concluído. Configure em Metas quais atividades devem ser atualizadas pelos seus treinos.",4200);
    }catch(error){
      console.error("Treinos: falha ao atualizar a atividade diária.",error);
      MMCDUI?.toast?.("Treino concluído, mas não consegui atualizar a atividade física.",4200);
    }

    showFinishSummary(session);
  }

  async function maybeAutoFinishWorkout(session){
    if(autoFinishingWorkout || !session || session.status!=="em_andamento" || session.tipo==="futebol") return false;
    const p=progress(session);
    if(p.pct<100) return false;
    autoFinishingWorkout=true;
    try{
      await finishWorkout();
      return true;
    }finally{
      autoFinishingWorkout=false;
    }
  }

  function workoutShareGroups(session){
    if(session?.tipo==="futebol") return "Futebol";
    if(session?.tipo==="cardio") return "Cardio / HIIT";
    const groups=[];
    (session?.exercicios||[]).forEach(ex=>{
      if(!exerciseDone(ex)) return;
      const group=String(ex.grupo||"").trim();
      if(group && !groups.some(item=>normalizeText(item)===normalizeText(group))) groups.push(group);
    });
    if(!groups.length) return "Treino de força";
    if(groups.length<=3) return groups.join(" · ");
    return `${groups.slice(0,3).join(" · ")} +${groups.length-3}`;
  }

  function workoutConstancyExcuseInfo(date=todayIso()){
    const direct=workoutExcuseInfo(date);
    if(direct) return direct;
    if(!window.MMCD || !state.atividadesData) return null;

    const workout=workoutForDate(date);
    if(!workout || workout.tipo==="descanso") return null;

    const metas=activeActivityMetas(date);

    // 1) Mantém a regra específica já existente:
    // se a atividade ligada ao treino foi abonada, a sequência é preservada.
    const candidates=metas.filter(meta=>{
      if(meta?.associadaTreinoFisico===true) return true;
      return workout.tipo==="musculacao" && scoreWorkoutActivity(meta)>0;
    });

    for(const meta of candidates){
      const row=window.MMCD.registro(state.atividadesData,date,meta.id);

      if(window.MMCD.estaAbonada(row)){
        return {
          meta,
          row,
          motivo:window.MMCD.motivoAbono(row),
          origem:"atividade_treino"
        };
      }
    }

    // 2) Recupera a regra de "dia abonado":
    // se TODAS as atividades programadas daquele dia já foram resolvidas
    // (concluídas ou abonadas) e ao menos uma foi abonada,
    // o dia inteiro é tratado como justificado para a constância do treino.
    //
    // Isso evita a regressão em que o usuário abona o dia em Atividades,
    // mas Treinos interpreta a ausência como quebra de sequência.
    if(metas.length){
      const rows=metas.map(meta=>({
        meta,
        row:window.MMCD.registro(state.atividadesData,date,meta.id)
      }));

      const allResolved=rows.every(item=>
        Boolean(item.row?.concluida)
        || window.MMCD.estaAbonada(item.row)
      );

      const excusedRows=rows.filter(item=>
        window.MMCD.estaAbonada(item.row)
      );

      if(allResolved && excusedRows.length){
        const first=excusedRows[0];

        return {
          meta:first.meta,
          row:first.row,
          motivo:window.MMCD.motivoAbono(first.row) || "Dia abonado em Atividades",
          origem:"dia_abonado",
          totalAbonos:excusedRows.length
        };
      }
    }

    return null;
  }

  function workoutConstancySummary(session){
    if(!session || session.status!=="concluido"){
      return {days:0,excused:0,preserved:false};
    }

    const cursor=new Date(`${session.data}T12:00:00`);
    let completedDays=0;
    let excusedDays=0;

    for(let i=0;i<210;i+=1){
      const iso=isoFromDate(cursor);
      const workout=workoutForDate(iso);

      if(workout && workout.tipo!=="descanso"){
        // A sessão que originou o card é um treino efetivamente concluído.
        // Nos dias anteriores, um abono preserva a sequência sem virar treino realizado.
        if(iso===session.data && session.status==="concluido"){
          completedDays+=1;
        }else{
          const excuse=workoutConstancyExcuseInfo(iso);
          if(excuse){
            excusedDays+=1;
          }else{
            const completed=sessionForDate(iso);
            if(completed?.status==="concluido") completedDays+=1;
            else break;
          }
        }
      }

      cursor.setDate(cursor.getDate()-1);
    }

    return {
      days:Math.max(1,completedDays),
      excused:excusedDays,
      preserved:excusedDays>0
    };
  }

  function workoutCompletedStreak(session){
    return workoutConstancySummary(session).days;
  }

  function workoutMotivation(streak){
    if(streak>=12) return "A constância já virou parte de quem você está se tornando.";
    if(streak>=8) return "Resultado não nasce de um dia perfeito. Nasce de continuar.";
    if(streak>=4) return "Você não precisa recomeçar quando escolhe continuar.";
    if(streak>=2) return "Uma sequência é construída treino após treino.";
    return "O próximo resultado começa na repetição do básico.";
  }

  function workoutShareExerciseItems(session){
    if(!session) return [];

    if(session.tipo==="futebol"){
      const warmup=(session.aquecimento||[])
        .filter(item=>item?.concluido)
        .map(item=>({
          name:item.nome || item.label || "Aquecimento",
          detail:item.duracao ? `${item.duracao} min` : ""
        }));

      return [
        {name:"Futebol",detail:session.futebol?.duracao ? `${session.futebol.duracao} min` : "Jogo"},
        ...warmup
      ].slice(0,10);
    }

    if(session.tipo==="cardio"){
      const protocol=(session.protocolo||[])
        .filter(item=>item?.concluido)
        .map(item=>({
          name:item.nome || item.label || String(item),
          detail:item.duracao ? `${item.duracao} min` : ""
        }));

      const exercises=(session.exercicios||[])
        .filter(ex=>exerciseDone(ex))
        .map(ex=>({
          name:ex.nome,
          detail:`${ex.planejado?.series || ex.series?.length || ""} × ${ex.planejado?.reps || ""}`.trim()
        }));

      return [...protocol,...exercises].slice(0,10);
    }

    return (session.exercicios||[])
      .filter(ex=>exerciseDone(ex))
      .map(ex=>{
        const plannedSeries=ex.planejado?.series || ex.series?.length || "";
        const plannedReps=String(ex.planejado?.reps || "").trim();
        const detail=[plannedSeries && plannedReps ? `${plannedSeries} × ${plannedReps}` : "", ex.grupo || ""]
          .filter(Boolean)
          .join(" · ");

        return {
          name:ex.nome || "Exercício",
          detail
        };
      })
      .slice(0,10);
  }

  function workoutShareExerciseCaption(items){
    if(!Array.isArray(items) || !items.length) return "";
    return [
      "Treino do dia:",
      ...items.map(item=>`• ${item.name}${item.detail?` — ${item.detail}`:""}`)
    ].join("\\n");
  }

  function workoutSocialOptions(session){
    const workout=state.plano.treinos.find(x=>x.id===session?.treinoId);
    const constancy=workoutConstancySummary(session);
    const streak=constancy.days;
    const groups=workoutShareGroups(session);
    const title=workout?.nome||session?.treinoSnapshot?.nome||"Treino";
    const streakText=`${streak} ${streak===1?"dia":"dias"} de constância`;
    const motivation=workoutMotivation(streak);
    const excuseText=constancy.excused
      ? `${constancy.excused} ${constancy.excused===1?"abono preservou":"abonos preservaram"} a sequência`
      : "";
    const items=workoutShareExerciseItems(session);
    const itemCaption=workoutShareExerciseCaption(items);

    const caption=[
      "Treino concluído no Memory 🔥",
      `${title} · ${groups}`,
      itemCaption,
      streakText,
      excuseText ? `🛡️ ${excuseText}.` : "",
      `${motivation} #Memory`
    ].filter(Boolean).join("\\n\\n");

    const stats=[
      {label:"Status",value:"Treino concluído"},
      {label:"Constância",value:`${streak} ${streak===1?"dia":"dias"}`}
    ];

    if(constancy.excused){
      stats.push({
        label:"Abono",
        value:`${constancy.excused} ${constancy.excused===1?"dia preservado":"dias preservados"}`
      });
    }

    const footer=constancy.excused
      ? `${motivation} Abono preserva a sequência sem contar como treino realizado.`
      : motivation;

    return {
      variant:"workout",
      eyebrow:"Treino concluído",
      title,
      subtitle:groups,
      items,
      itemsTitle:"Treino do dia",
      stats,
      footer,
      caption,
      shareTitle:"Meu treino no Memory",
      fileName:`memory-treino-${session?.data||todayIso()}`
    };
  }

  function workoutSocialHtml(session){
    if(!session || session.status!=="concluido") return "";

    const options=workoutSocialOptions(session);
    const constancy=workoutConstancySummary(session);
    const streak=constancy.days;

    const excuseBadge=constancy.excused
      ? `<span class="memory-share-preview__excuse">🛡 ${constancy.excused} ${constancy.excused===1?"abono preservou":"abonos preservaram"} a constância</span>`
      : "";

    const exerciseSummary=(options.items||[]).length
      ? `<div class="workout-share-exercises">
          <div class="workout-share-exercises__head">
            <span>Treino do dia</span>
            <b>${options.items.length} ${options.items.length===1?"exercício":"exercícios"}</b>
          </div>
          <div class="workout-share-exercises__list">
            ${options.items.map((item,index)=>`
              <div class="workout-share-exercise">
                <span>${String(index+1).padStart(2,"0")}</span>
                <div>
                  <strong>${esc(item.name)}</strong>
                  ${item.detail?`<small>${esc(item.detail)}</small>`:""}
                </div>
              </div>`).join("")}
          </div>
        </div>`
      : "";

    return `<div class="workout-social-block memory-share-block">
      <div class="memory-share-preview memory-share-preview--workout">
        <div class="memory-share-preview__brand"><img src="assets/imagens/memory-mark-official-v81-4-8.png?v=20260819-v81-4-8" alt="Memory"><div><strong>Memory</strong><small>movimento que vira memória</small></div></div>
        <span class="memory-share-preview__eyebrow">Treino concluído</span>
        <h3>${esc(options.title)}</h3>
        <p class="workout-share-groups">${esc(options.subtitle)}</p>
        ${exerciseSummary}
        <div class="memory-share-preview__stats"><span>✓ Treino concluído</span><span>🔥 ${streak} ${streak===1?"dia":"dias"} de constância</span>${excuseBadge}</div>
        <p class="workout-share-motivation">${esc(options.footer)}</p>
      </div>

      <div class="memory-share-actions">
        <button type="button" class="btn primary" data-action="share-workout-card" data-workout-date="${esc(session.data)}">Compartilhar · Instagram / WhatsApp</button>
        <button type="button" class="btn" data-action="download-workout-card" data-workout-date="${esc(session.data)}">Baixar card</button>
        <button type="button" class="btn" data-action="copy-workout-caption" data-workout-date="${esc(session.data)}">Copiar legenda</button>
      </div>

      <p class="memory-share-note">O card compartilhado também leva o resumo dos exercícios concluídos. Nada é publicado sem a sua confirmação.</p>
    </div>`;
  }

  async function handleWorkoutSocial(mode,date=todayIso()){
    const session=sessionForDate(date||todayIso());
    if(!session || session.status!=="concluido") return;
    const api=window.MemorySocialCard;
    if(!api){MMCDUI?.toast?.("O card ainda não ficou pronto. Atualize a página e tente novamente.",4200);return;}
    const options=workoutSocialOptions(session);
    try{
      if(mode==="share"){
        const result=await api.share(options);
        if(result?.downloaded&&!result.shared) MMCDUI?.toast?.("Card baixado. Agora você pode publicar onde quiser.",4200);
      }else if(mode==="download"){
        await api.download(options);MMCDUI?.toast?.("Card do treino salvo como PNG.",3200);
      }else if(mode==="copy"){
        const ok=await api.copyCaption(options.caption);MMCDUI?.toast?.(ok?"Legenda copiada.":"Não foi possível copiar a legenda.",3200);
      }
    }catch(error){
      if(error?.name!=="AbortError"){console.error(error);MMCDUI?.toast?.("Não foi possível preparar o compartilhamento agora.",4200)}
    }
  }

  function showFinishSummary(session) {
    const workout=state.plano.treinos.find(x=>x.id===session.treinoId);
    let increased=0,maintained=0;
    if (session.tipo==="musculacao") {
      const prior=priorSession(session.treinoId,session.data);
      (session.exercicios||[]).forEach(ex=>{
        if (ex.registro!=="peso_reps") return;
        const cur=Math.max(0,...ex.series.filter(s=>s.concluida).map(s=>num(s.peso)));
        const identity=canonicalExerciseKey(ex);
        const oldEx=prior?.exercicios?.find(x=>
          canonicalExerciseKey(x)===identity
        );
        if(oldEx && normalizeLoadUnit(oldEx.unidadeCarga)!==normalizeLoadUnit(ex.unidadeCarga)) return;
        const old=Math.max(0,...(oldEx?.series||[]).filter(s=>s.concluida).map(s=>num(s.peso)));
        if (cur>old && old>0) increased++;
        else if (cur===old && cur>0) maintained++;
      });
    }
    const modal=$("#finish-modal");
    $("#finish-modal-body").innerHTML=`
      <span class="treino-kicker">${session.status==="concluido"?"TREINO CONCLUÍDO 🔥":"TREINO FINALIZADO · PARCIAL"}</span>
      <h2>${esc(workout?.nome||"Treino")}</h2>
      <div class="finish-stats">
        <div><span>Tempo</span><strong>${fmt(session.duracaoMinutos)} min</strong></div>
        ${session.tipo==="musculacao"?`<div><span>Aumentos de carga</span><strong>${increased}</strong></div><div><span>Mantidos</span><strong>${maintained}</strong></div>`:""}
        <div><span>Status</span><strong>${session.status==="concluido"?"Concluído":"Parcial"}</strong></div>
      </div>
      ${workoutFeedbackHtml(session)}
      ${workoutSocialHtml(session)}`;
    modal.hidden=false;
  }

  function monthBounds(reference=new Date()) {
    const first=new Date(reference.getFullYear(),reference.getMonth(),1,12);
    const last=new Date(reference.getFullYear(),reference.getMonth()+1,0,12);
    return {first,last};
  }

  function isoFromDate(d) {
    const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);
    return x.toISOString().slice(0,10);
  }

  function calendarStatus(iso) {
    const work=workoutForDate(iso);
    const ses=sessionForDate(iso);
    if (work?.tipo==="descanso") return "rest";
    if (workoutConstancyExcuseInfo(iso)) return "excused";
    if (ses?.status==="concluido") return "done";
    if (ses?.status==="parcial" || ses?.status==="em_andamento") return "partial";
    if (work && iso<todayIso()) return "missed";
    return "empty";
  }

  function renderHistory(reference=new Date()) {
    const root=$("#treino-history-root");
    if (!root) return;
    const {first,last}=monthBounds(reference);
    $("#history-month-label").textContent=cap(monthLabel(first));
    const startDay=(first.getDay()+6)%7;
    const cells=[];
    for(let i=0;i<startDay;i++) cells.push(`<div class="calendar-cell ghost"></div>`);
    for(let day=1;day<=last.getDate();day++){
      const d=new Date(first.getFullYear(),first.getMonth(),day,12);
      const iso=isoFromDate(d);
      const st=calendarStatus(iso);
      const work=workoutForDate(iso);
      cells.push(`<button class="calendar-cell ${st}" data-history-date="${iso}">
        <span>${day}</span>
        <i></i>
        <small>${esc(work?.nome||"")}</small>
      </button>`);
    }

    const recent=state.sessoes.slice().sort((a,b)=>b.data.localeCompare(a.data)).slice(0,12);
    root.innerHTML=`
      <article class="card calendar-card">
        <div class="calendar-legend">
          <span><i class="done"></i>Concluído</span><span><i class="excused"></i>Abonado</span><span><i class="partial"></i>Parcial</span><span><i class="missed"></i>Não realizado</span><span><i class="rest"></i>Descanso</span>
        </div>
        <div class="calendar-weekdays">${["SEG","TER","QUA","QUI","SEX","SÁB","DOM"].map(x=>`<span>${x}</span>`).join("")}</div>
        <div class="calendar-grid">${cells.join("")}</div>
      </article>
      <article class="card history-list-card">
        <div class="section-head"><div><p class="eyebrow">Registros</p><h2>Treinos recentes</h2></div></div>
        <div class="history-list">${recent.length?recent.map(historyRow).join(""):`<div class="empty">Nenhum treino registrado ainda.</div>`}</div>
      </article>
      <article id="history-detail-card" class="card history-detail-card" hidden></article>`;
  }

  function historyRow(s) {
    const w=state.plano.treinos.find(x=>x.id===s.treinoId);
    const excused=!!workoutConstancyExcuseInfo(s.data);
    return `<button class="history-row" data-history-date="${s.data}">
      <span class="history-status ${excused?"excused":s.status}"></span>
      <div><strong>${esc(w?.nome||s.treinoSnapshot?.nome||"Treino")}</strong><small>${datePt(s.data)}${excused?" · Abonado":""}</small></div>
      <b>${excused?"Abonado":s.duracaoMinutos?`${fmt(s.duracaoMinutos)} min`:"Ver"}</b>
    </button>`;
  }

  function showHistoryDetail(iso) {
    const card=$("#history-detail-card");
    const session=sessionForDate(iso);
    const workout=workoutForDate(iso);
    const excuse=workoutConstancyExcuseInfo(iso);
    if (!card) return;
    if (excuse) {
      card.hidden=false;
      const preserved=session ? `<p class="muted">Existe um registro de treino preservado nesta data, mas o status efetivo do dia é Abonado.</p>` : "";
      card.innerHTML=`<button class="detail-close" data-action="close-history">×</button><span class="treino-kicker">${datePt(iso)}</span><h2>${esc(session?.treinoSnapshot?.nome||workout?.nome||"Treino")}</h2><div class="detail-meta"><span>Abonado</span></div>${excuse.motivo?`<p><strong>Motivo:</strong> ${esc(excuse.motivo)}</p>`:""}${preserved}`;
      card.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    if (!session) {
      card.hidden=false;
      card.innerHTML=`<button class="detail-close" data-action="close-history">×</button><span class="treino-kicker">${datePt(iso)}</span><h2>${esc(workout?.nome||"Dia")}</h2><p class="muted">${workout?.tipo==="descanso"?"Descanso programado.":"Nenhum treino registrado nesta data."}</p>`;
      card.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    const exercises=(session.exercicios||[]).map(ex=>`<div class="detail-exercise"><strong>${esc(ex.nome)}</strong><span>${lastExerciseSummary(ex)}</span></div>`).join("");
    const rhythmValue=workoutFeedbackValue(session);
    const rhythmLabel=rhythmValue ? WORKOUT_RHYTHM_OPTIONS.find(x=>x.valor===rhythmValue)?.label : "";
    card.hidden=false;
    card.innerHTML=`<button class="detail-close" data-action="close-history">×</button><span class="treino-kicker">${datePt(iso)}</span><h2>${esc(session.treinoSnapshot?.nome||workout?.nome||"Treino")}</h2><div class="detail-meta"><span>${session.status==="concluido"?"Concluído":"Parcial"}</span><span>${session.duracaoMinutos?`${fmt(session.duracaoMinutos)} min`:""}</span>${rhythmLabel?`<span>Ritmo: ${esc(rhythmLabel)}</span>`:""}</div>${exercises||"<p>Registro concluído.</p>"}`;
    card.scrollIntoView({behavior:"smooth",block:"center"});
  }

  function plannedDaysInMonth(reference=new Date()) {
    const {first,last}=monthBounds(reference);
    let count=0;
    for(let day=1;day<=last.getDate();day++){
      const d=new Date(first.getFullYear(),first.getMonth(),day,12);
      const iso=isoFromDate(d);
      const w=workoutForDate(iso);
      if (!w || w.tipo==="descanso") continue;
      if (workoutConstancyExcuseInfo(iso)) continue;
      const start=state.plano.programa.dataInicio;
      const end=state.plano.programa.dataFim;
      if (start && iso<start) continue;
      if (end && iso>end) continue;
      count++;
    }
    return count;
  }

  function monthSessions(reference=new Date()) {
    const prefix=`${reference.getFullYear()}-${String(reference.getMonth()+1).padStart(2,"0")}`;
    const start=state.plano.programa.dataInicio;
    const end=state.plano.programa.dataFim;
    return state.sessoes.filter(s=>
      s.data.startsWith(prefix) &&
      (!start || s.data>=start) &&
      (!end || s.data<=end)
    );
  }

  function sessionExerciseBest(session,exerciseId) {
    const ex=session.exercicios?.find(x=>x.exercicioId===exerciseId);
    if (!ex || ex.registro!=="peso_reps") return null;
    const vals=ex.series.filter(s=>s.concluida && num(s.peso)>0).map(s=>({peso:num(s.peso),reps:num(s.reps)}));
    if (!vals.length) return null;
    const best=vals.sort((a,b)=>b.peso-a.peso || b.reps-a.reps)[0];
    return {...best,unidadeCarga:normalizeLoadUnit(ex.unidadeCarga)};
  }

  function exerciseBestFromRecord(ex) {
    if (!ex || ex.registro!=="peso_reps") return null;

    const vals=(ex.series||[])
      .filter(s=>s.concluida && num(s.peso)>0)
      .map(s=>({
        peso:num(s.peso),
        reps:num(s.reps)
      }));

    if(!vals.length) return null;

    const best=vals
      .sort((a,b)=>b.peso-a.peso || b.reps-a.reps)[0];

    return {
      ...best,
      unidadeCarga:normalizeLoadUnit(ex.unidadeCarga)
    };
  }

  function loadProgressRows(reference=new Date()) {
    const sessions=monthSessions(reference)
      .filter(s=>["concluido","parcial"].includes(s.status))
      .sort((a,b)=>a.data.localeCompare(b.data));

    const map=new Map();

    sessions.forEach(session=>{
      (session.exercicios||[]).forEach(ex=>{
        const best=exerciseBestFromRecord(ex);
        if(!best) return;

        const identity=canonicalExerciseKey(ex);
        if(!identity) return;

        const unit=normalizeLoadUnit(best.unidadeCarga);
        const key=`${identity}::${unit}`;

        if(!map.has(key)){
          map.set(key,{
            id:identity,
            nome:ex.nome || identity,
            unit,
            rows:[]
          });
        }

        map.get(key).rows.push({
          data:session.data,
          ...best
        });
      });
    });

    return [...map.values()]
      .map(item=>{
        const first=item.rows[0];
        const last=item.rows[item.rows.length-1];

        return {
          ...item,
          first,
          last,
          delta:last.peso-first.peso,
          pct:first.peso
            ? ((last.peso-first.peso)/first.peso*100)
            : 0
        };
      })
      .sort((a,b)=>b.delta-a.delta);
  }

  function measureCards(reference=new Date()) {
    const prefix=`${reference.getFullYear()}-${String(reference.getMonth()+1).padStart(2,"0")}`;
    const rows=state.medidas.filter(m=>m.data?.startsWith(prefix)).sort((a,b)=>a.data.localeCompare(b.data));
    if (rows.length<2) return "";
    const first=rows[0],last=rows[rows.length-1];
    const fields=[["peso","Peso","kg"],["cintura","Cintura","cm"],["peitoral","Peitoral","cm"],["bracoDireito","Braço dir.","cm"]];
    return `<div class="measure-evolution-grid">${fields.map(([key,label,unit])=>{
      if (first[key]==="" || last[key]==="" || first[key]==null || last[key]==null) return "";
      const delta=num(last[key])-num(first[key]);
      return `<div class="evolution-mini"><span>${label}</span><strong>${fmt(first[key])} → ${fmt(last[key])} ${unit}</strong><b class="${delta>0?"up":delta<0?"down":""}">${delta>0?"+":""}${fmt(delta)} ${unit}</b></div>`;
    }).join("")}</div>`;
  }

  function allExerciseOptions() {
    const seen=new Map();

    // O plano atual tem prioridade no nome exibido.
    state.plano.treinos.forEach(workout=>
      (workout.exercicios||[]).forEach(ex=>{
        if(ex.registro!=="peso_reps") return;

        const key=canonicalExerciseKey(ex);
        if(key && !seen.has(key)){
          seen.set(key,ex.nome || key);
        }
      })
    );

    // Exercícios antigos continuam disponíveis mesmo que tenham saído do plano.
    state.sessoes.forEach(session=>
      (session.exercicios||[]).forEach(ex=>{
        if(ex.registro!=="peso_reps") return;

        const key=canonicalExerciseKey(ex);
        if(key && !seen.has(key)){
          seen.set(key,ex.nome || key);
        }
      })
    );

    return [...seen.entries()]
      .sort((a,b)=>String(a[1]).localeCompare(String(b[1]),"pt-BR"));
  }

  function sessionExerciseBestByIdentity(session,identity) {
    if(!session || !identity) return null;

    const candidates=(session.exercicios||[])
      .filter(ex=>
        ex.registro==="peso_reps"
        && canonicalExerciseKey(ex)===identity
      )
      .map(ex=>{
        const best=exerciseBestFromRecord(ex);

        return best
          ? {
              ...best,
              nome:ex.nome || identity,
              exercicioId:ex.exercicioId || ex.id || ""
            }
          : null;
      })
      .filter(Boolean)
      .sort((a,b)=>b.peso-a.peso || b.reps-a.reps);

    return candidates[0] || null;
  }

  function exerciseHistory(exerciseIdentity) {
    return state.sessoes
      .filter(s=>["concluido","parcial"].includes(s.status))
      .sort((a,b)=>a.data.localeCompare(b.data))
      .map(session=>{
        const best=sessionExerciseBestByIdentity(
          session,
          exerciseIdentity
        );

        return best
          ? {
              data:session.data,
              sessionId:session.id || "",
              ...best
            }
          : null;
      })
      .filter(Boolean);
  }

  function exerciseHistoryGroups(rows) {
    const groups=new Map();

    rows.forEach(row=>{
      const unit=normalizeLoadUnit(row.unidadeCarga);

      if(!groups.has(unit)){
        groups.set(unit,[]);
      }

      groups.get(unit).push(row);
    });

    return [...groups.entries()]
      .map(([unit,unitRows])=>({
        unit,
        rows:unitRows.sort((a,b)=>a.data.localeCompare(b.data)),
        lastDate:unitRows
          .slice()
          .sort((a,b)=>b.data.localeCompare(a.data))[0]?.data || ""
      }))
      .sort((a,b)=>b.lastDate.localeCompare(a.lastDate));
  }

  function chartSvg(rows) {
    if(!rows.length){
      return `<div class="empty">Ainda não há cargas registradas.</div>`;
    }

    const unit=loadUnitLabel(rows[0]?.unidadeCarga);
    const W=680,H=210,p=28;
    const vals=rows.map(r=>r.peso);
    const min=Math.min(...vals);
    const max=Math.max(...vals);
    const range=Math.max(1,max-min);

    const pts=rows.map((r,i)=>{
      const x=rows.length===1
        ? W/2
        : p+i*(W-2*p)/(rows.length-1);

      const y=H-p-((r.peso-min)/range)*(H-2*p);

      return {x,y,...r};
    });

    const poly=pts
      .map(point=>`${point.x},${point.y}`)
      .join(" ");

    return `<div class="load-chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Carga por data em ${unit}">
        <line x1="${p}" y1="${H-p}" x2="${W-p}" y2="${H-p}" class="chart-axis"/>
        ${pts.length>1?`<polyline points="${poly}" class="chart-line"/>`:""}
        ${pts.map(pt=>`
          <circle cx="${pt.x}" cy="${pt.y}" r="5" class="chart-dot">
            <title>${datePt(pt.data)} — ${fmt(pt.peso)} ${unit} × ${fmt(pt.reps)}</title>
          </circle>
        `).join("")}
      </svg>
    </div>`;
  }

  function exerciseHistoryAnalysis(rows) {
    if(!rows.length){
      return `<div class="empty">
        Ainda não há histórico de carga para este exercício.
      </div>`;
    }

    const first=rows[0];
    const last=rows[rows.length-1];
    const groups=exerciseHistoryGroups(rows);
    const units=groups.map(group=>loadUnitLabel(group.unit));
    const unitChanged=groups.length>1;

    const summary=`
      <div class="exercise-history-summary">
        <div>
          <span>Registros encontrados</span>
          <strong>${rows.length}</strong>
        </div>
        <div>
          <span>Período analisado</span>
          <strong>${datePt(first.data)} → ${datePt(last.data)}</strong>
        </div>
        <div>
          <span>Último registro</span>
          <strong>${fmt(last.peso)} ${loadUnitLabel(last.unidadeCarga)} × ${fmt(last.reps)}</strong>
        </div>
        <div>
          <span>Unidades usadas</span>
          <strong>${units.join(" + ")}</strong>
        </div>
      </div>

      ${unitChanged?`
        <div class="exercise-history-unit-note">
          <strong>O Memory encontrou mudança de unidade.</strong>
          <span>
            Kg e placas não são misturados na mesma curva, porque isso criaria uma evolução falsa.
            O histórico completo continua abaixo, separado por unidade.
          </span>
        </div>
      `:""}
    `;

    const groupsHtml=groups.map(group=>{
      const unitRows=group.rows;
      const unit=loadUnitLabel(group.unit);
      const unitFirst=unitRows[0];
      const unitLast=unitRows[unitRows.length-1];
      const best=unitRows
        .slice()
        .sort((a,b)=>b.peso-a.peso || b.reps-a.reps)[0];
      const delta=unitLast.peso-unitFirst.peso;
      const pct=unitFirst.peso
        ? (delta/unitFirst.peso)*100
        : 0;

      return `
        <section class="exercise-history-unit-block">
          <div class="exercise-history-unit-head">
            <div>
              <span>Histórico em ${esc(unit)}</span>
              <strong>${unitRows.length} ${unitRows.length===1?"registro":"registros"}</strong>
            </div>

            <div class="exercise-history-unit-metrics">
              <span>
                Primeiro
                <b>${fmt(unitFirst.peso)} ${unit} × ${fmt(unitFirst.reps)}</b>
              </span>
              <span>
                Último
                <b>${fmt(unitLast.peso)} ${unit} × ${fmt(unitLast.reps)}</b>
              </span>
              <span>
                Melhor carga
                <b>${fmt(best.peso)} ${unit} × ${fmt(best.reps)}</b>
              </span>
              <span>
                Evolução
                <b class="${delta>0?"up":delta<0?"down":""}">
                  ${delta>0?"+":""}${fmt(delta)} ${unit}
                  ${unitRows.length>1 && unitFirst.peso
                    ? ` · ${pct>0?"+":""}${pct.toFixed(1).replace(".",",")}%`
                    : ""}
                </b>
              </span>
            </div>
          </div>

          ${chartSvg(unitRows)}

          <div class="exercise-history-list">
            ${unitRows
              .slice()
              .reverse()
              .slice(0,12)
              .map(row=>`
                <div>
                  <span>${datePt(row.data)}</span>
                  <strong>${fmt(row.peso)} ${unit} × ${fmt(row.reps)}</strong>
                </div>
              `).join("")}
          </div>
        </section>
      `;
    }).join("");

    return summary + groupsHtml;
  }

  function renderEvolution(reference=new Date()) {
    const root=$("#treino-evolution-root");
    if (!root) return;
    const planned=plannedDaysInMonth(reference);
    const sessions=monthSessions(reference);
    const eligibleSessions=sessions.filter(s=>!workoutConstancyExcuseInfo(s.data));
    const realized=eligibleSessions.filter(s=>["concluido","parcial"].includes(s.status)).length;
    const completed=eligibleSessions.filter(s=>s.status==="concluido").length;
    const partial=eligibleSessions.filter(s=>s.status==="parcial").length;
    const adherence=planned?Math.round(realized/planned*100):0;
    const loads=loadProgressRows(reference);
    const options=allExerciseOptions();
    const selected=$("#exercise-history-select")?.value || options[0]?.[0] || "";
    const hist=exerciseHistory(selected);

    root.innerHTML=`
      <div class="evolution-kpis">
        <article class="card evolution-kpi"><span>Planejados</span><strong>${planned}</strong><small>${cap(monthLabel(reference))}</small></article>
        <article class="card evolution-kpi"><span>Realizados</span><strong>${realized}</strong><small>${completed} completos · ${partial} parciais</small></article>
        <article class="card evolution-kpi"><span>Aderência</span><strong>${adherence}%</strong><small>Treinos registrados / planejados</small></article>
      </div>
      <article class="card evolution-card">
        <div class="section-head"><div><p class="eyebrow">Principais evoluções</p><h2>Cargas no mês</h2></div></div>
        <div class="load-progress-list">${loads.length?loads.slice(0,8).map(item=>`
          <div class="load-progress-row">
            <div><strong>${esc(item.nome)}</strong><small>${fmt(item.first.peso)} → ${fmt(item.last.peso)} ${loadUnitLabel(item.unit)}</small></div>
            <b class="${item.delta>0?"up":item.delta<0?"down":""}">${item.delta>0?"↑":item.delta<0?"↓":"→"} ${item.delta>0?"+":""}${fmt(item.delta)} ${loadUnitLabel(item.unit)} ${item.first.peso?`(${item.pct>0?"+":""}${item.pct.toFixed(1).replace(".",",")}%)`:""}</b>
          </div>`).join(""):`<div class="empty">Registre cargas para acompanhar a evolução.</div>`}</div>
      </article>
      <article class="card evolution-card">
        <div class="section-head"><div><p class="eyebrow">Medidas</p><h2>Evolução corporal</h2></div><a class="btn small" href="medidas.html">Nova medição</a></div>
        ${measureCards(reference)||`<div class="empty">Faça pelo menos duas medições no mesmo mês para ver a comparação.</div>`}
      </article>
      <article class="card evolution-card">
        <div class="section-head"><div><p class="eyebrow">Histórico por exercício</p><h2>Carga × data</h2></div>
          <select id="exercise-history-select" class="compact-select">${options.map(([id,name])=>`<option value="${esc(id)}" ${id===selected?"selected":""}>${esc(name)}</option>`).join("")}</select>
        </div>
        ${exerciseHistoryAnalysis(hist)}
      </article>`;
  }

  function activityIntegrationHtml() {
    const metas=state.atividadesData?.metas || [];
    if(!metas.length){
      return `<article class="card settings-block"><div class="section-head"><div><p class="eyebrow">Integração</p><h2>Treino → Atividades</h2></div></div><p class="muted">As atividades diárias não puderam ser carregadas agora. O treino continua funcionando normalmente.</p></article>`;
    }
    const linked=metas.filter(meta=>meta?.associadaTreinoFisico===true)
      .sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR"));
    const rows=linked.length?linked.map(meta=>{
      return `<div class="integration-summary-row"><span>🏋️</span><div><strong>${esc(meta.nome)}</strong><small>Será concluída quando houver execução compatível e esta meta estiver programada para o dia.</small></div></div>`;
    }).join(""):`<div class="empty">Nenhuma meta de treino vinculada ainda.</div>`;
    return `<article class="card settings-block">
      <div class="section-head"><div><p class="eyebrow">Integração automática</p><h2>Treinos → Atividades</h2><p class="muted">É simples: você escolhe quais metas estão vinculadas. Quando um treino tiver execução registrada, o Memory conclui a meta específica ou vinculada que estiver programada para aquele dia.</p></div></div>
      <div class="integration-summary-list">${rows}</div>
      <div class="settings-hint">Configure em <strong>Configurações → Metas</strong>. Você pode vincular quantas metas quiser.</div>
      <div class="settings-actions"><a class="btn primary" href="metas.html?v=20260814-v67">Abrir Metas</a></div>
    </article>`;
  }

  function themeSettingsHtml() {
    const api=window.MMCDTheme;
    if(!api) return "";
    const catalog=api.getCatalog();
    const enabled=api.getEnabled();
    const current=api.getCurrent();
    const admin=api.isAdmin();
    const choices=catalog.filter(item=>enabled.includes(item.id)).map(item=>`<button type="button" class="theme-admin-choice ${current===item.id?"active":""}" data-action="choose-theme" data-theme-id="${esc(item.id)}"><span class="theme-admin-swatch" style="--theme-swatch:${esc(item.swatch)};--theme-surface:${esc(item.surface)}"></span><span><strong>${esc(item.label)}</strong><small>${current===item.id?"Em uso":"Usar este tema"}</small></span>${current===item.id?"<b>✓</b>":""}</button>`).join("");
    const adminRows=catalog.map(item=>`<label class="theme-enable-row"><span class="theme-admin-swatch" style="--theme-swatch:${esc(item.swatch)};--theme-surface:${esc(item.surface)}"></span><span><strong>${esc(item.label)}</strong><small>${esc(item.short)}</small></span><input type="checkbox" data-theme-enabled value="${esc(item.id)}" ${enabled.includes(item.id)?"checked":""} ${admin?"":"disabled"}></label>`).join("");
    return `<article class="card settings-block" id="aparencia">
      <div class="section-head"><div><p class="eyebrow">Aparência</p><h2>Temas de cores</h2><p class="muted">Cada usuário escolhe a própria paleta entre as opções liberadas.</p></div><span class="db-badge">${api.governanceMode()==="global"?"Multiusuário":"Compatível"}</span></div>
      <div class="theme-admin-choices">${choices}</div>
      <div class="theme-admin-governance">
        <div class="settings-subhead"><div><strong>Administração das paletas</strong><small>${admin?"Habilite somente as cores que você quer disponibilizar no projeto.":"Somente administradores podem alterar o catálogo disponível."}</small></div></div>
        <div class="theme-enable-grid">${adminRows}</div>
        ${admin?`<div class="settings-actions"><button type="button" class="btn primary" data-action="save-theme-catalog">Salvar cores habilitadas</button></div>`:""}
        ${api.governanceMode()!=="global"?`<p class="theme-governance-note">O painel já funciona neste ambiente. Para a liberação de cores valer globalmente para todos os usuários, execute a migração <strong>SUPABASE_TEMAS_MULTIUSUARIO.sql</strong> incluída no projeto.</p>`:""}
      </div>
    </article>`;
  }

  async function saveThemeCatalog() {
    const api=window.MMCDTheme;
    if(!api?.isAdmin?.()) return;
    const ids=$$("[data-theme-enabled]:checked").map(el=>el.value);
    try{
      const result=await api.saveEnabled(ids);
      renderSettings();
      MMCDUI?.toast?.(result.savedGlobal?"Cores habilitadas para o projeto.":"Cores salvas neste ambiente. Execute a migração para governança multiusuário.",3600);
    }catch(error){MMCDUI?.toast?.(error.message||"Não foi possível salvar as cores.",3600);}
  }

  function renderSettings() {
    const root=$("#treino-settings-root");
    if (!root) return;
    const p=state.plano.programa;

    root.innerHTML=`
      <article class="card settings-block">
        <div class="section-head"><div><p class="eyebrow">Programa</p><h2>Plano de treino</h2></div><span class="db-badge">Supabase</span></div>
        <div class="settings-grid">
          <label class="field"><span>Nome</span><input data-plan-field="nome" value="${esc(p.nome)}"></label>
          <label class="field"><span>Status</span><select data-plan-field="status"><option value="ativo" ${p.status==="ativo"?"selected":""}>Ativo</option><option value="inativo" ${p.status==="inativo"?"selected":""}>Inativo</option></select></label>
          <label class="field"><span>Data inicial</span><input type="date" data-plan-field="dataInicio" value="${esc(p.dataInicio)}"></label>
          <label class="field"><span>Data final</span><input type="date" data-plan-field="dataFim" value="${esc(p.dataFim)}"></label>
          <label class="field full"><span>Objetivo</span><input data-plan-field="objetivo" value="${esc(p.objetivo)}"></label>
          <label class="field full"><span>Observações</span><textarea data-plan-field="observacoes">${esc(p.observacoes||"")}</textarea></label>
        </div>
        <div class="settings-actions"><button class="btn primary" data-action="save-plan">Salvar programa</button><button class="btn" data-action="new-phase">Criar nova fase</button></div>
      </article>

      ${activityIntegrationHtml()}

      ${exerciseCatalogHtml()}

      <article class="card settings-block">
        <div class="section-head"><div><p class="eyebrow">Treinos e exercícios</p><h2>Composição semanal</h2><p class="muted">Use “Trocar” para substituir um exercício pelo catálogo sem precisar recriar o treino.</p></div></div>
        <div class="settings-workouts">${state.plano.treinos.map(workoutSettings).join("")}</div>
        <div class="settings-actions"><button class="btn primary" data-action="save-plan">Salvar composição</button></div>
      </article>

      `;

    requestAnimationFrame(()=>{
      ensureFullExerciseCatalog();
      renderExerciseCatalogResults({resetLimit:false});
    });
  }

  function measureInput(label,name,type,value,required) {
    return `<label class="field"><span>${esc(label)}${name!=="data"?" (cm)":""}</span><input name="${name}" type="${type}" ${type==="number"?'inputmode="decimal" step="0.1" min="0"':""} value="${esc(value)}" ${required?"required":""}></label>`;
  }

  function footballWarmupSettings(w,wi) {
    const items=(w.aquecimento||[]);

    const cards=items.map((raw,ai)=>{
      const item=footballWarmupMeta(raw,ai);
      const stored=typeof raw==="object" && raw ? raw : {};
      const merged={...item,...stored};

      return `<div class="settings-exercise settings-football-movement">
        <div class="settings-exercise__title">
          <div>
            <strong>${esc(merged.nome||merged.texto||`Movimento ${ai+1}`)}</strong>
            <small>Aquecimento / preparação</small>
          </div>
          <button class="mini-action danger" type="button" data-action="remove-football-warmup" data-workout-index="${wi}" data-warmup-index="${ai}">Remover</button>
        </div>

        <div class="exercise-config-grid">
          <label class="field">
            <span>Nome do movimento</span>
            <input data-workout-index="${wi}" data-warmup-index="${ai}" data-warmup-field="nome" value="${esc(merged.nome||"")}">
          </label>

          <label class="field">
            <span>Prescrição</span>
            <input data-workout-index="${wi}" data-warmup-index="${ai}" data-warmup-field="prescricao" value="${esc(merged.prescricao||"")}" placeholder="Ex.: 2 × 10 ou 30 s">
          </label>

          <label class="field full">
            <span>Observação</span>
            <input data-workout-index="${wi}" data-warmup-index="${ai}" data-warmup-field="observacao" value="${esc(merged.observacao||"")}" placeholder="Orientação opcional">
          </label>

          ${visualConfigHtml(
            merged,
            `data-workout-index="${wi}" data-warmup-index="${ai}"`
          )}
        </div>
      </div>`;
    }).join("");

    return `<section class="football-settings-block">
      <div class="settings-subhead">
        <div>
          <strong>Aquecimento / movimentos</strong>
          <small>Estes são os exercícios que aparecem antes do jogo.</small>
        </div>
        <button class="btn small" type="button" data-action="add-football-warmup" data-workout-index="${wi}">+ Adicionar movimento</button>
      </div>

      <div class="settings-exercise-list">
        ${cards || `<div class="settings-empty-list">Nenhum movimento cadastrado.</div>`}
      </div>

      <button class="btn small settings-add-bottom" type="button" data-action="add-football-warmup" data-workout-index="${wi}">+ Adicionar movimento</button>
    </section>`;
  }

  function workoutSettings(w,wi) {
    if (w.tipo==="descanso") {
      return `<details class="settings-workout"><summary><div><strong>${esc(w.diaNome)} — Descanso</strong><small>Recuperação</small></div><span>›</span></summary><div class="settings-workout-body"><label class="field"><span>Objetivo</span><input data-workout-index="${wi}" data-workout-field="objetivo" value="${esc(w.objetivo)}"></label></div></details>`;
    }
    const exercises=(w.exercicios||[]).map((ex,ei)=>`
      <div class="settings-exercise">
        <div class="settings-exercise__title">
          <strong>${esc(ex.nome)}</strong>
          <div class="settings-exercise__actions">
            <button class="mini-action" type="button" data-action="catalog-replace-exercise" data-workout-index="${wi}" data-exercise-index="${ei}">Trocar</button>
            <button class="mini-action danger" type="button" data-action="remove-exercise" data-workout-index="${wi}" data-exercise-index="${ei}">Remover</button>
          </div>
        </div>
        <div class="exercise-config-grid">
          <label class="field"><span>Nome</span><input data-workout-index="${wi}" data-exercise-index="${ei}" data-exercise-field="nome" value="${esc(ex.nome)}"></label>
          <label class="field"><span>Equipamento</span><input data-workout-index="${wi}" data-exercise-index="${ei}" data-exercise-field="equipamento" value="${esc(ex.equipamento||"")}"></label>
          <label class="field"><span>Grupo muscular</span><input data-workout-index="${wi}" data-exercise-index="${ei}" data-exercise-field="grupo" value="${esc(ex.grupo||"")}"></label>
          <label class="field"><span>Séries</span><input type="number" min="1" data-workout-index="${wi}" data-exercise-index="${ei}" data-exercise-field="series" value="${esc(ex.series||1)}"></label>
          <label class="field"><span>Repetições / duração</span><input data-workout-index="${wi}" data-exercise-index="${ei}" data-exercise-field="reps" value="${esc(ex.reps||"")}"></label>
          <label class="field"><span>Descanso</span><input data-workout-index="${wi}" data-exercise-index="${ei}" data-exercise-field="descanso" value="${esc(ex.descanso||"")}"></label>
          <label class="field full"><span>Observação</span><input data-workout-index="${wi}" data-exercise-index="${ei}" data-exercise-field="observacao" value="${esc(ex.observacao||"")}"></label>
          ${visualConfigHtml(
            ex,
            `data-workout-index="${wi}" data-exercise-index="${ei}"`
          )}
        </div>
      </div>`).join("");

    return `<details class="settings-workout">
      <summary><div><strong>${esc(w.diaNome)} — ${esc(w.nome)}</strong><small>${esc(w.objetivo)}</small></div><span>›</span></summary>
      <div class="settings-workout-body">
        <div class="settings-grid">
          <label class="field"><span>Nome do treino</span><input data-workout-index="${wi}" data-workout-field="nome" value="${esc(w.nome)}"></label>
          <label class="field"><span>Tipo</span><select data-workout-index="${wi}" data-workout-field="tipo"><option value="musculacao" ${w.tipo==="musculacao"?"selected":""}>Musculação</option><option value="futebol" ${w.tipo==="futebol"?"selected":""}>Futebol</option><option value="cardio" ${w.tipo==="cardio"?"selected":""}>Cardio</option></select></label>
          <label class="field full"><span>Objetivo</span><input data-workout-index="${wi}" data-workout-field="objetivo" value="${esc(w.objetivo)}"></label>
        </div>
        ${w.tipo==="futebol"
          ? footballWarmupSettings(w,wi)
          : ["musculacao","cardio"].includes(w.tipo)
            ? `<div class="settings-exercise-list">${exercises}</div><button class="btn small" type="button" data-action="add-exercise" data-workout-index="${wi}">+ Adicionar exercício</button>`
            : ""
        }
      </div>
    </details>`;
  }

  function dedupeWorkoutExercises(workout){
    if(!Array.isArray(workout?.exercicios))return 0;
    const seen=new Map(),next=[];let removed=0;
    workout.exercicios.forEach(ex=>{const canonical=canonicalExerciseKey(ex);const key=`${canonical}|${normalizeText(ex.equipamento||"")}|${normalizeText(ex.registro||"peso_reps")}`;if(!canonical||canonical==="novo exercicio"||!key.replace(/[|]/g,"").trim()){next.push(ex);return;}if(seen.has(key)){removed+=1;const kept=seen.get(key);["guiaId","imagemInicio","imagemFim","observacao"].forEach(f=>{if(!kept[f]&&ex[f])kept[f]=ex[f];});return;}seen.set(key,ex);next.push(ex);});
    workout.exercicios=next;return removed;
  }

  async function savePlanFields() {
    $$("[data-plan-field]").forEach(el=>{
      state.plano.programa[el.dataset.planField]=el.value;
    });
    $$("[data-workout-field]").forEach(el=>{
      const w=state.plano.treinos[Number(el.dataset.workoutIndex)];
      if (w) w[el.dataset.workoutField]=el.value;
    });
    $$("[data-exercise-field]").forEach(el=>{
      const w=state.plano.treinos[Number(el.dataset.workoutIndex)];
      const ex=w?.exercicios?.[Number(el.dataset.exerciseIndex)];
      if (!ex) return;
      const f=el.dataset.exerciseField;
      ex[f]=f==="series" ? Math.max(1,Number(el.value||1)) : el.value;
    });

    $$("[data-exercise-index][data-visual-field]").forEach(el=>{
      const w=state.plano.treinos[Number(el.dataset.workoutIndex)];
      const ex=w?.exercicios?.[Number(el.dataset.exerciseIndex)];
      if (!ex) return;
      ex[el.dataset.visualField]=el.value;
    });

    $$("[data-warmup-field]").forEach(el=>{
      const w=state.plano.treinos[Number(el.dataset.workoutIndex)];
      const item=w?.aquecimento?.[Number(el.dataset.warmupIndex)];
      if (!item || typeof item!=="object") return;
      item[el.dataset.warmupField]=el.value;
      item.texto=item.nome || item.texto || "";
    });

    $$("[data-warmup-index][data-visual-field]").forEach(el=>{
      const w=state.plano.treinos[Number(el.dataset.workoutIndex)];
      const item=w?.aquecimento?.[Number(el.dataset.warmupIndex)];
      if (!item || typeof item!=="object") return;
      item[el.dataset.visualField]=el.value;
    });

    const duplicatesRemoved=(state.plano.treinos||[]).reduce((sum,w)=>sum+dedupeWorkoutExercises(w),0);
    await persistPlanAndSync(duplicatesRemoved?`Plano salvo. ${duplicatesRemoved} duplicidade${duplicatesRemoved===1?"":"s"} removida${duplicatesRemoved===1?"":"s"} com histórico preservado.`:"Plano de treino salvo.");
  }

  function newPhase() {
    const oldName=state.plano.programa.nome||"Plano de treino";
    state.plano.programa={
      ...state.plano.programa,
      id:`plano-${Date.now()}`,
      nome:oldName.replace(/\s*—\s*Fase\s*\d+\s*$/i,"")+" — Nova fase",
      dataInicio:todayIso(),
      dataFim:"",
      status:"ativo",
      observacoes:"Nova fase criada a partir da composição anterior."
    };
    savePlan();
    renderSettings();
    MMCDUI?.toast?.("Nova fase criada. Ajuste as datas e o nome.");
  }

  function addExercise(workoutIndex) {
    const w=state.plano.treinos[Number(workoutIndex)];
    if (!w) return;
    w.exercicios ||= [];
    w.exercicios.push({
      id:`ex-${Date.now()}`,
      nome:"Novo exercício",
      equipamento:"",
      grupo:"",
      series:3,
      reps:"10",
      registro:"peso_reps",
      descanso:"60–90 s",
      observacao:"",
      guiaId:"",
      imagemInicio:"",
      imagemFim:""
    });
    renderSettings();
    requestAnimationFrame(()=>{
      const details=$$(".settings-workout")[Number(workoutIndex)];
      if(details) details.open=true;
    });
  }

  function addFootballWarmup(workoutIndex) {
    const w=state.plano.treinos[Number(workoutIndex)];
    if (!w) return;

    w.aquecimento ||= [];
    w.aquecimentoSchemaVersion=2;

    const id=`futebol-custom-${Date.now()}`;
    w.aquecimento.push({
      id,
      nome:"Novo movimento",
      prescricao:"2 × 10",
      texto:"Novo movimento",
      guiaId:"",
      imagemInicio:"",
      imagemFim:"",
      observacao:""
    });

    renderSettings();

    requestAnimationFrame(()=>{
      const details=$$(".settings-workout")[Number(workoutIndex)];
      if(details) details.open=true;
      const cards=details?.querySelectorAll(".settings-football-movement");
      cards?.[cards.length-1]?.scrollIntoView({behavior:"smooth",block:"center"});
    });
  }

  async function removeFootballWarmup(wi,ai) {
    const w=state.plano.treinos[Number(wi)];
    if (!Array.isArray(w?.aquecimento) || !w.aquecimento[Number(ai)]) return;

    w.aquecimento.splice(Number(ai),1);
    w.aquecimentoSchemaVersion=2;

    renderSettings();
    await persistPlanAndSync("Movimento removido e plano atualizado.");
  }

  function updateVisualConfigFromControl(el) {
    const field=el.dataset.visualField;
    if(!field) return;

    const wi=Number(el.dataset.workoutIndex);
    const w=state.plano.treinos[wi];
    if(!w) return;

    if(el.dataset.exerciseIndex !== undefined) {
      const ex=w.exercicios?.[Number(el.dataset.exerciseIndex)];
      if(ex) ex[field]=el.value;
      return;
    }

    if(el.dataset.warmupIndex !== undefined) {
      const item=w.aquecimento?.[Number(el.dataset.warmupIndex)];
      if(item && typeof item==="object") item[field]=el.value;
    }
  }

  async function removeExercise(wi,ei) {
    const w=state.plano.treinos[Number(wi)];
    if (!w?.exercicios?.[Number(ei)]) return;

    w.exercicios.splice(Number(ei),1);

    renderSettings();
    await persistPlanAndSync("Exercício removido e plano atualizado.");
  }

  function saveMeasurement(form) {
    const fd=new FormData(form);
    const row={id:uuid(),data:String(fd.get("data")||todayIso()),observacao:String(fd.get("observacao")||"")};
    ["peso","cintura","abdomen","peitoral","bracoDireito","bracoEsquerdo","quadril","coxaDireita","coxaEsquerda","panturrilhaDireita","panturrilhaEsquerda"].forEach(k=>{
      const raw=String(fd.get(k)||"").trim();
      row[k]=raw===""?"":num(raw);
    });
    state.medidas.push(row);
    saveMeasures();
    renderSettings();
    MMCDUI?.toast?.("Medição salva.");
  }

  function deleteMeasurement(id) {
    state.medidas=state.medidas.filter(m=>m.id!==id);
    saveMeasures();
    renderSettings();
  }

  function setTab(tab,pushHash=true) {
    if(tab==="hoje" && state.tab!==tab) openExerciseId=null;
    state.tab=tab;
    $$(".treino-tab").forEach(btn=>btn.classList.toggle("active",btn.dataset.tab===tab));
    $$(".treino-panel").forEach(panel=>panel.hidden=panel.dataset.panel!==tab);
    if(pushHash){
      if (window.MMCD_TREINO_PAGE_MODE !== "configuracoes") {
        const map={hoje:"hoje",historico:"historico",evolucao:"evolucao"};
        history.replaceState(null,"",`#${map[tab]||"hoje"}`);
      }
    }
    if(tab==="historico") renderHistory();
    if(tab==="evolucao") renderEvolution();
    if(tab==="configuracoes") renderSettings();
  }

  function tabFromHash() {
    if (window.MMCD_TREINO_PAGE_MODE === "configuracoes") return "configuracoes";
    const h=location.hash.replace("#","").toLowerCase();
    return ["hoje","historico","evolucao"].includes(h)?h:"hoje";
  }

  function renderAll() {
    renderToday();
    if(state.tab==="historico") renderHistory();
    if(state.tab==="evolucao") renderEvolution();
    if(state.tab==="configuracoes") renderSettings();
    
  }

  function bindEvents() {
    // Tratamento dedicado do botão de início. Usa capture para funcionar mesmo quando
    // algum componente do shell/mobile interrompe a propagação normal do clique.
    document.addEventListener("click",event=>{
      const start=event.target?.closest?.('[data-action="start-workout"]');
      if(!start) return;
      event.preventDefault();
      startWorkout(start);
    },true);

    document.addEventListener("click",event=>{
      const tab=event.target.closest("[data-tab]");
      if(tab){
        if(tab.dataset.tab==="hoje") state.selectedDate=todayIso();
        setTab(tab.dataset.tab);
        return;
      }

      const planDate=event.target.closest("[data-plan-date]");
      if(planDate){
        state.selectedDate=planDate.dataset.planDate;
        openExerciseId=null;
        renderToday();
        return;
      }

      const go=event.target.closest("[data-go-tab]");
      if(go){
        if (go.dataset.goTab === "configuracoes" && window.MMCD_TREINO_PAGE_MODE !== "configuracoes") {
          location.href = "treinos-config.html#medidas";
          return;
        }
        setTab(go.dataset.goTab);
        return;
      }

      const rating=event.target.closest("[data-rating-group][data-rating-field][data-rating-value]");
      if(rating){
        const session=sessionForDate(todayIso());
        const group=rating.dataset.ratingGroup;
        const field=rating.dataset.ratingField;
        if(session?.[group] && session.status==="em_andamento"){
          session[group][field]=Number(rating.dataset.ratingValue);
          saveSessions();
          renderToday();
        }
        return;
      }

      const workoutFeedback=event.target.closest("[data-workout-feedback]");
      if(workoutFeedback){
        selectWorkoutFeedback(workoutFeedback.dataset.workoutFeedback);
        return;
      }

      const action=event.target.closest("[data-action]");
      if(action){
        const a=action.dataset.action;
        if(a==="start-workout") return;
        else if(a==="toggle-exercise") toggleExercisePanel(action.dataset.exerciseId);
        else if(a==="quick-complete-exercise") quickCompleteExercise(action.dataset.exerciseId);
        else if(a==="toggle-exercise-skip") toggleExerciseSkip(action.dataset.exerciseId);
        else if(a==="toggle-check-skip") toggleChecklistSkip(action.dataset.kind,action.dataset.index);
        else if(a==="toggle-series") toggleSeries(action.dataset.exerciseId,action.dataset.series);
        else if(a==="copy-last") copyLast(action.dataset.exerciseId);
        else if(a==="set-load-unit") setLoadUnit(action.dataset.exerciseId,action.dataset.loadUnit);
        else if(a==="finish-workout") finishWorkout();
        else if(a==="register-football-offline") registerFootballWithoutTracking(action.dataset.workoutDate || state.selectedDate || todayIso());
        else if(a==="save-workout-feedback") saveWorkoutFeedback();
        else if(a==="share-workout-card") handleWorkoutSocial("share",action.dataset.workoutDate);
        else if(a==="download-workout-card") handleWorkoutSocial("download",action.dataset.workoutDate);
        else if(a==="copy-workout-caption") handleWorkoutSocial("copy",action.dataset.workoutDate);
        else if(a==="toggle-check") toggleCheck(action.dataset.kind,action.dataset.index);
        else if(a==="close-history") $("#history-detail-card").hidden=true;
        else if(a==="save-plan") savePlanFields();
        else if(a==="choose-theme"){ window.MMCDTheme?.setTheme?.(action.dataset.themeId).then(()=>renderSettings()); }
        else if(a==="save-theme-catalog") saveThemeCatalog();
        else if(a==="new-phase") newPhase();
        else if(a==="add-exercise") addExercise(action.dataset.workoutIndex);
        else if(a==="remove-exercise") removeExercise(action.dataset.workoutIndex,action.dataset.exerciseIndex);
        else if(a==="catalog-replace-exercise") openExerciseReplacement(action.dataset.workoutIndex,action.dataset.exerciseIndex);
        else if(a==="catalog-cancel-replace") cancelExerciseReplacement();
        else if(a==="catalog-use-exercise") replaceExerciseFromCatalog(action.dataset.catalogId);
        else if(a==="catalog-load-more"){
          exerciseCatalogState.visibleLimit+=CATALOG_PAGE_SIZE;
          renderExerciseCatalogResults({resetLimit:false});
        }
        else if(a==="add-football-warmup") addFootballWarmup(action.dataset.workoutIndex);
        else if(a==="remove-football-warmup") removeFootballWarmup(action.dataset.workoutIndex,action.dataset.warmupIndex);
        else if(a==="delete-measure") deleteMeasurement(action.dataset.measureId);
        else if(a==="back-today"){
          state.selectedDate=todayIso();
          renderToday();
        }
        else if(a==="week-prev"){
          const d=new Date(`${state.selectedDate||todayIso()}T12:00:00`);
          d.setDate(d.getDate()-7);
          state.selectedDate=isoFromDate(d);
          renderToday();
        }
        else if(a==="week-next"){
          const d=new Date(`${state.selectedDate||todayIso()}T12:00:00`);
          d.setDate(d.getDate()+7);
          state.selectedDate=isoFromDate(d);
          renderToday();
        }
        else if(a==="show-exercise-guide"){
          showExerciseGuide(action.dataset.guideId);
        }
        else if(a==="close-exercise-guide"){
          closeExerciseGuide();
        }
        return;
      }

      const step=event.target.closest("[data-step-field]");
      if(step){
        stepSeries(step.dataset.exerciseId,step.dataset.series,step.dataset.stepField,step.dataset.step);
        return;
      }

      const hist=event.target.closest("[data-history-date]");
      if(hist){showHistoryDetail(hist.dataset.historyDate);return;}
    });

    document.addEventListener("change",event=>{
      const visualControl=event.target.closest("[data-visual-field]");
      if(visualControl){
        updateVisualConfigFromControl(visualControl);
        renderSettings();
        return;
      }

      if(event.target.id==="treino-date-picker"){
        state.selectedDate=event.target.value || todayIso();
        renderToday();
        return;
      }

      const series=event.target.closest("[data-exercise-id][data-series][data-field]");
      if(series){
        updateSeries(series.dataset.exerciseId,series.dataset.series,series.dataset.field,series.value);
        return;
      }
      const special=event.target.closest("[data-special][data-field]");
      if(special){
        updateSpecial(special.dataset.special,special.dataset.field,special.value);
        return;
      }
      if(event.target.id==="exercise-history-select"){
        renderEvolution();
      }
    });

    document.addEventListener("input",event=>{
      const special=event.target.closest("textarea[data-special][data-field]");
      if(special){
        updateSpecial(special.dataset.special,special.dataset.field,special.value);
      }
    });

    document.addEventListener("submit",event=>{
      if(event.target.id==="measure-form"){
        event.preventDefault();
        saveMeasurement(event.target);
      }
    });

    $("#finish-modal-close")?.addEventListener("click",()=>$("#finish-modal").hidden=true);
    $("#finish-modal")?.addEventListener("click",event=>{
      if(event.target.id==="finish-modal") event.currentTarget.hidden=true;
    });

    $("#exercise-guide-modal")?.addEventListener("click",event=>{
      if(event.target.id==="exercise-guide-modal") closeExerciseGuide();
    });

    document.addEventListener("keydown",event=>{
      if(event.key==="Escape") {
        if(!document.querySelector("#rest-timer-modal")?.hidden) closeRestTimer();
        else closeExerciseGuide();
      }
    });

    window.addEventListener("hashchange",()=>setTab(tabFromHash(),false));
  }

  document.addEventListener("input",event=>{
    if(event.target?.id==="exercise-catalog-search") applyExerciseCatalogFilters();
  });

  document.addEventListener("change",event=>{
    if(["exercise-catalog-group","exercise-catalog-equipment"].includes(event.target?.id)) applyExerciseCatalogFilters();
  });


  document.addEventListener("input",event=>{
      if(event.target?.id!=="exercise-catalog-search") return;

      clearTimeout(catalogSearchTimer);
      catalogSearchTimer=setTimeout(()=>{
        applyExerciseCatalogFilters({resetLimit:true});
      },120);
    });

  document.addEventListener("change",event=>{
      if(["exercise-catalog-group","exercise-catalog-equipment","exercise-catalog-category"].includes(event.target?.id)) {
        applyExerciseCatalogFilters({resetLimit:true});
      }
    });

  async function init() {
    try {
      status("Carregando…");
      await loadAll();

      // V81.11.1 — remove agachamentos do plano atual.
      // Histórico finalizado permanece intacto.
      await removeSquatsFromCurrentPlan();

      const autoDuplicates=(state.plano?.treinos||[]).reduce((sum,workout)=>sum+dedupeWorkoutExercises(workout),0);
      if(autoDuplicates>0){
        await savePlan();
        console.info(`Treinos V79: ${autoDuplicates} duplicidade(s) de exercício unificada(s) no plano; histórico preservado.`);
      }
      await reconcileFootballSessionsFromActivities();
      await reconcileWorkoutLifecycleByDate();
      state.loading=false;
      state.selectedDate=todayIso();
      state.tab=tabFromHash();
      bindEvents();
      setTab(state.tab,false);
      renderAll();
      // Também reconcilia um treino que já havia sido finalizado antes desta atualização.
      await reconcileFinishedWorkoutActivity();
      // Se o treino de hoje já havia sido encerrado antes desta versão, abre o check-out pendente.
      promptPendingWorkoutFeedback();
      status("Dados online · Supabase","saved");
    } catch(error) {
      console.error(error);
      status("Falha ao carregar","error");
      const root=$("#treino-today-root");
      if(root) root.innerHTML=`<article class="card treino-empty"><h2>Não foi possível carregar o plano de treino</h2><p>${esc(error.message)}</p></article>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else {
    init();
  }
})();