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

    const [planValue,sessionsValue,measuresValue,activitiesValue] = await Promise.all([
      loadKey(KEYS.plano),
      loadKey(KEYS.sessoes),
      loadKey(KEYS.medidas),
      activitiesPromise
    ]);

    state.plano = normalizePlan(planValue);
    const hardcorePhaseMigrated = upgradeHardcorePhasePlan(state.plano);
    const footballPlanMigrated = upgradeFootballWarmupPlan(state.plano);

    state.sessoes = Array.isArray(sessionsValue?.sessoes) ? sessionsValue.sessoes : [];
    state.medidas = Array.isArray(measuresValue?.medidas) ? measuresValue.medidas : [];
    state.atividadesData = activitiesValue || null;

    if (!state.plano.programa.dataInicio) {
      state.plano.programa.dataInicio = todayIso();
    }

    if (!planValue || hardcorePhaseMigrated || footballPlanMigrated) {
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

  function priorSession(workoutId, beforeDate=todayIso()) {
    return state.sessoes
      .filter(s => s.treinoId === workoutId && s.data < beforeDate && ["concluido","parcial"].includes(s.status))
      .sort((a,b) => b.data.localeCompare(a.data))[0] || null;
  }

  function exercisePrior(exerciseId, workoutId, beforeDate=todayIso()) {
    const prior = priorSession(workoutId,beforeDate);
    const sameWorkout = prior?.exercicios?.find(ex => ex.exercicioId === exerciseId) || null;
    if (sameWorkout) return {...sameWorkout,_priorDate:prior.data};

    const previousAnyWorkout = state.sessoes
      .filter(s => s.data < beforeDate && ["concluido","parcial"].includes(s.status))
      .sort((a,b) => b.data.localeCompare(a.data))
      .find(s => s.exercicios?.some(ex => ex.exercicioId === exerciseId));

    const previousExercise=previousAnyWorkout?.exercicios?.find(ex => ex.exercicioId === exerciseId) || null;
    return previousExercise ? {...previousExercise,_priorDate:previousAnyWorkout.data} : null;
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
        observacao:ex.observacao||"",planejado,series:[{numero:1,concluida:false}]
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
      series:Array.from({length:total},(_,i)=>({
        numero:i+1,
        peso:0,
        reps:ex.registro === "tempo" ? 0 : repsDefault(ex.reps),
        segundos:ex.registro === "tempo" ? Number(ex.segundos || repsDefault(ex.reps) || 0) : 0,
        concluida:false
      }))
    };
  }

  function createSession(workout) {
    return {
      id:uuid(),
      data:todayIso(),
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
          const prior=exercisePrior(ex.id,workout.id,todayIso());
          item.unidadeCarga=normalizeLoadUnit(prior?.unidadeCarga || ex.unidadeCarga || "kg");
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
          concluido:false
        };
      }),
      protocolo:(workout.protocolo||[]).map((texto,i)=>({id:i,texto,concluido:false})),
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
        concluido:Boolean(old?.concluido)
      };
    });
  }

  function syncProtocolWithPlan(session,workout) {
    const current=Array.isArray(session.protocolo)?session.protocolo:[];
    const planned=Array.isArray(workout.protocolo)?workout.protocolo:[];

    session.protocolo=planned.map((texto,index)=>{
      const old=current.find(x=>String(x?.texto||"")===String(texto||"")) || current[index];
      return {id:index,texto,concluido:Boolean(old?.concluido)};
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

  function progress(session) {
    if (!session) return {done:0,total:0,pct:0};
    if (session.tipo === "futebol") {
      const total = Math.max(1,session.aquecimento?.length || 0);
      const done = (session.aquecimento||[]).filter(x=>x.concluido).length;
      return {done,total,pct:Math.round(done/total*100)};
    }
    if (session.tipo === "cardio") {
      const protocolTotal=(session.protocolo||[]).length;
      const protocolDone=(session.protocolo||[]).filter(x=>x.concluido).length;
      const exerciseTotal=(session.exercicios||[]).length;
      const exerciseDoneCount=(session.exercicios||[]).filter(exerciseDone).length;
      const total=Math.max(1,protocolTotal+exerciseTotal);
      const done=protocolDone+exerciseDoneCount;
      return {done,total,pct:Math.round(done/total*100)};
    }
    const total = Math.max(1,session.exercicios?.length || 0);
    const done = (session.exercicios||[]).filter(exerciseDone).length;
    return {done,total,pct:Math.round(done/total*100)};
  }

  function currentExerciseIndex(session) {
    const idx = (session.exercicios||[]).findIndex(ex => !exerciseDone(ex));
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

  function guideFor(exerciseId) {
    const movement=findPlanMovementById(exerciseId);
    const library=window.MMCD_TREINO_GUIAS || {};
    const linked=movement?.guiaId ? library[movement.guiaId] : null;
    const own=library[exerciseId] || null;
    const base=linked || own;

    const customStart=String(movement?.imagemInicio||"").trim();
    const customEnd=String(movement?.imagemFim||"").trim();

    if(customStart && customEnd) {
      return {
        ...(base||{}),
        titulo:movement?.nome || base?.titulo || "Exercício",
        inicio:customStart,
        fim:customEnd,
        passos:base?.passos || [
          "Observe a posição inicial.",
          "Execute o movimento de forma controlada.",
          "Compare sua posição final com a referência.",
          "Interrompa se houver dor ou desconforto articular."
        ],
        dica:movement?.observacao || base?.dica || "Use as imagens como referência de posição e amplitude.",
        observacaoVisual:base?.observacaoVisual || "",
        fonte:"Imagem personalizada",
        fonteUrl:""
      };
    }

    return base;
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
    if(!guideFor(exerciseId)) return "";
    return `<button type="button" class="exercise-visual-btn" data-action="show-exercise-guide" data-guide-id="${esc(exerciseId)}">
      <span class="exercise-visual-btn__icon">▶</span>${esc(label)}
    </button>`;
  }

  function guideTextHtml(exerciseId) {
    const guide=guideFor(exerciseId);
    if(!guide) return "";

    return `<div class="exercise-guide__content">
      <span class="treino-kicker">COMO EXECUTAR</span>
      <ol>${(guide.passos||[]).map(item=>`<li>${esc(item)}</li>`).join("")}</ol>
      ${guide.observacaoVisual?`<div class="exercise-guide__specific"><strong>Importante</strong><p>${esc(guide.observacaoVisual)}</p></div>`:""}
      ${guide.dica?`<div class="exercise-guide__tip"><span>💡</span><p><strong>Dica:</strong> ${esc(guide.dica)}</p></div>`:""}
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

    return `<div class="exercise-guide exercise-guide--curated ${compact?"compact":""}">
      <div class="exercise-guide__visual exercise-guide__visual--pair">
        <div class="exercise-pose-grid">
          ${guideImagePanel(guide.inicio,firstLabel,guide.titulo)}
          ${guideImagePanel(guide.fim,secondLabel,guide.titulo)}
        </div>
        <div class="exercise-media-source">
          <span>Referência: ${esc(guide.fonte||"Free Exercise DB")}</span>
          ${guide.fonteUrl?`<a href="${esc(guide.fonteUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte</a>`:""}
        </div>
      </div>
      ${guideTextHtml(exerciseId)}
    </div>`;
  }

  function hydrateVisibleGuides() {
    // V26 uses explicit start/end URLs; there is no search or hydration step.
  }

  function showExerciseGuide(exerciseId) {
    const guide=guideFor(exerciseId);
    if(!guide) return;
    const modal=$("#exercise-guide-modal");
    if(!modal) return;

    $("#exercise-guide-modal-title").textContent=guide.titulo || "Execução do exercício";
    $("#exercise-guide-modal-body").innerHTML=guideHtml(exerciseId,false);
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

      let cls="future", symbol="○";
      if (work.tipo==="descanso") { cls="rest";symbol="—"; }
      else if (ses?.status==="concluido") { cls="done";symbol="✓"; }
      else if (ses?.status==="parcial" || ses?.status==="em_andamento") { cls="partial";symbol=iso===today?"▶":"◐"; }
      else if (iso<today) { cls="missed";symbol="×"; }
      else if (iso===today) { cls="today";symbol="▶"; }

      if (iso===referenceIso) cls += " selected";

      return `<button class="week-day ${cls}" type="button" data-plan-date="${iso}" aria-label="${esc(dateLabel(iso))}: ${esc(work.nome)}">
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
        ${exercises || `<div class="selected-history-meta">${session.duracaoMinutos?`${fmt(session.duracaoMinutos)} min`:"Registro disponível"}</div>`}
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
    const excuse=!session ? workoutExcuseInfo(iso) : null;

    if(session?.status==="em_andamento" && syncActiveSessionWithPlan()) {
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

    if (!isToday && session) {
      root.innerHTML=navigator+historicalPlanHtml(workout,session,iso);
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
          <div class="selected-plan-note">Visualização do plano. Para registrar a execução, abra o treino na data correspondente.</div>
        </article>`;
      return;
    }

    if (!session && isToday && excuse) {
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
          <details class="today-preview">
            <summary>Ver estrutura que estava programada</summary>
            ${exercises}
          </details>
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
          <button class="btn treino-start-btn" data-action="start-workout">INICIAR TREINO</button>
          <details class="today-preview">
            <summary>Ver estrutura de hoje</summary>
            ${exercises}
          </details>
        </article>`;
      return;
    }

    if (workout.tipo==="futebol") {
      renderFootball(root,workout,session);
      root.insertAdjacentHTML("afterbegin",navigator);
      return;
    }
    if (workout.tipo==="cardio") {
      renderCardio(root,workout,session);
      root.insertAdjacentHTML("afterbegin",navigator);
      return;
    }

    renderStrength(root,workout,session);
    root.insertAdjacentHTML("afterbegin",navigator);
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
    const exerciseCards=(session.exercicios||[]).map((ex,idx)=>{
      const done=exerciseDone(ex);
      const missed=session.status==="parcial" && !done;
      const pex=exercisePrior(ex.exercicioId,workout.id,session.data);
      const isCurrent=!locked && !done && idx===currentIdx;
      const isOpen=exercisePanelIsOpen(ex.exercicioId);
      const seriesHtml=(ex.series||[]).map(s=>seriesRow(ex,s,isOpen && !s.concluida,locked)).join("");
      const stateLabel=done?"Concluído":missed?"Não realizado":isOpen?"Em preenchimento":isCurrent?"Próximo":"Pendente";
      return `
        <article class="exercise-card ${done?"done":""} ${missed?"missed":""} ${isCurrent?"current":""} ${isOpen?"open":""}" data-exercise="${esc(ex.exercicioId)}">
          <div class="exercise-card__head">
            <button type="button" class="exercise-card__identity" data-action="toggle-exercise" data-exercise-id="${esc(ex.exercicioId)}" aria-expanded="${isOpen?"true":"false"}">
              <span class="exercise-order">${String(idx+1).padStart(2,"0")}</span>
              <span class="exercise-card__copy">
                <strong>${done?"✓ ":missed?"× ":""}${esc(ex.nome)}</strong>
                <small>${esc(ex.planejado?.series||ex.series.length)} × ${esc(ex.planejado?.reps||"")} ${ex.planejado?.descanso?`· descanso ${esc(ex.planejado.descanso)}`:""}</small>
                ${pex?`<small class="exercise-last-inline">Última: ${esc(lastExerciseText(pex))}</small>`:""}
              </span>
            </button>
            <div class="exercise-head-actions">
              <span class="exercise-state">${stateLabel}</span>
              ${visualButton(ex.exercicioId,"Ver execução")}
              ${exerciseAccordionButton(ex.exercicioId,isOpen)}
            </div>
          </div>
          <div class="exercise-card__body" ${isOpen?"":"hidden"}>
            ${ex.planejado?.observacao?`<div class="exercise-note">${esc(ex.planejado.observacao)}</div>`:""}
            ${exerciseHistoryBox(pex,ex.exercicioId,locked)}
            ${loadUnitControl(ex,locked)}
            <div class="series-stack">${seriesHtml}</div>
          </div>
        </article>`;
    }).join("");
    const p=progress(session);
    const finishArea=session.status==="em_andamento"
      ? `<article class="card finish-workout-card">
          <div><span class="treino-kicker">${p.pct===100?"PRONTO PARA FINALIZAR":"FINAL DO TREINO"}</span><h2>${p.done}/${p.total} exercícios</h2><p>${p.pct===100?"Todas as séries foram concluídas.":"Você pode finalizar como parcial se precisar encerrar agora."}</p></div>
          <button class="btn primary finish-btn" data-action="finish-workout">${p.pct===100?"FINALIZAR TREINO":"FINALIZAR PARCIAL"}</button>
        </article>`
      : `<article class="card workout-closed-card ${session.status}"><div><span class="treino-kicker">${session.status==="concluido"?"TREINO ENCERRADO":"TREINO ENCERRADO PARCIALMENTE"}</span><h2>${p.done}/${p.total} exercícios</h2><p>${session.status==="concluido"?"Treino finalizado e salvo no histórico.":"Os exercícios não realizados foram mantidos como pendentes no histórico."}</p></div><strong>${session.status==="concluido"?"✓":"◐"}</strong></article>`;
    root.innerHTML=`
      ${renderSessionHeader(workout,session)}
      <article class="exercise-accordion-intro"><div><strong>Exercícios agrupados</strong><span>${locked?"Treino encerrado. Abra um exercício para consultar o registro.":"Abra um exercício, registre as séries e ele fecha automaticamente quando terminar."}</span></div><span>${p.done}/${p.total}</span></article>
      <div class="exercise-stack">${exerciseCards}</div>
      ${finishArea}`;
  }

  function seriesRow(ex,s,highlight,locked=false) {
    const disabled=locked?"disabled":"";
    if (ex.registro==="protocolo") {
      return `<div class="series-card protocol-series ${s.concluida?"done":""}">
        <div><span>PROTOCOLO</span><strong>${esc(ex.planejado?.reps||"Concluir")}</strong></div>
        <button class="series-check ${s.concluida?"done":""}" data-action="toggle-series" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}" ${disabled}>${s.concluida?"✓ Concluído":"✓ Concluir"}</button>
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
      <button class="protocol-item ${item.concluido?"done":""}" data-action="toggle-check" data-kind="${kind}" data-index="${item.id}" ${locked?"disabled":""}>
        <span>${item.concluido?"✓":"○"}</span><strong>${esc(item.texto)}</strong>
      </button>`).join("")}</div>`;
  }

  function footballWarmupChecklist(items,locked=false) {
    return `<div class="football-warmup-list">${(items||[]).map((saved,i)=>{
      const meta=footballWarmupMeta(saved,i);
      const item={...saved,...meta,concluido:Boolean(saved?.concluido)};
      const guideId=item.guiaId || "";
      return `<article class="football-warmup-card ${item.concluido?"done":""}">
        <div class="football-warmup-card__top">
          <button class="football-warmup-check" type="button" data-action="toggle-check" data-kind="aquecimento" data-index="${esc(item.id)}" aria-label="${item.concluido?"Marcar como não concluído":"Marcar como concluído"}" ${locked?"disabled":""}>
            ${item.concluido?"✓":"○"}
          </button>
          <span class="exercise-order">${String(i+1).padStart(2,"0")}</span>
          <div class="football-warmup-card__copy">
            <strong>${esc(item.nome || item.texto || "")}</strong>
            <small>${esc(item.prescricao || item.texto || "")}</small>
          </div>
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
      const missed=session.status==="parcial" && !done;
      const pex=exercisePrior(ex.exercicioId,workout.id,session.data);
      const isOpen=exercisePanelIsOpen(ex.exercicioId);
      return `<article class="exercise-card ${done?"done":""} ${missed?"missed":""} ${isOpen?"open":""}" data-exercise="${esc(ex.exercicioId)}">
        <div class="exercise-card__head">
          <button type="button" class="exercise-card__identity" data-action="toggle-exercise" data-exercise-id="${esc(ex.exercicioId)}" aria-expanded="${isOpen?"true":"false"}">
            <span class="exercise-order">${String(idx+1).padStart(2,"0")}</span>
            <span class="exercise-card__copy"><strong>${done?"✓ ":missed?"× ":""}${esc(ex.nome)}</strong><small>${esc(ex.planejado?.series)} × ${esc(ex.planejado?.reps)}</small>${pex?`<small class="exercise-last-inline">Última: ${esc(lastExerciseText(pex))}</small>`:""}</span>
          </button>
          <div class="exercise-head-actions"><span class="exercise-state">${done?"Concluído":missed?"Não realizado":isOpen?"Em preenchimento":"Pendente"}</span>${visualButton(ex.exercicioId,"Ver execução")}${exerciseAccordionButton(ex.exercicioId,isOpen)}</div>
        </div>
        <div class="exercise-card__body" ${isOpen?"":"hidden"}>${exerciseHistoryBox(pex,ex.exercicioId,locked)}${loadUnitControl(ex,locked)}<div class="series-stack">${(ex.series||[]).map(s=>seriesRow(ex,s,isOpen && !s.concluida,locked)).join("")}</div></div>
      </article>`;
    }).join("");
    const finish=session.status==="em_andamento"
      ? `<button class="btn primary finish-special" data-action="finish-workout">FINALIZAR TREINO</button>`
      : `<article class="card workout-closed-card ${session.status}"><div><span class="treino-kicker">${session.status==="concluido"?"TREINO ENCERRADO":"TREINO ENCERRADO PARCIALMENTE"}</span><h2>Registro salvo</h2><p>${session.status==="concluido"?"Cardio finalizado e salvo no histórico.":"Os itens não realizados foram sinalizados no histórico."}</p></div><strong>${session.status==="concluido"?"✓":"◐"}</strong></article>`;
    root.innerHTML=`
      ${renderSessionHeader(workout,session)}
      <article class="card special-workout-card">
        <div class="section-head"><div><p class="eyebrow">Bicicleta</p><h2>Protocolo</h2><span class="protocol-progress-copy">${(session.protocolo||[]).filter(x=>x.concluido).length}/${(session.protocolo||[]).length} etapas concluídas</span></div>${visualButton("bike-estacionaria","Ver execução")}</div>
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

  function startWorkout() {
    const iso=todayIso();
    const workout=workoutForDate(iso);
    if (!workout || workout.tipo==="descanso") return;
    if (sessionForDate(iso)) return;
    const excuse=workoutExcuseInfo(iso);
    if(excuse){
      MMCDUI?.toast?.("Este treino está abonado em Atividades e não pode ser iniciado.",3600);
      renderToday();
      return;
    }
    state.sessoes.push(createSession(workout));
    saveSessions();
    openExerciseId=null;
    renderAll();
    requestAnimationFrame(()=>$(".active-workout-head")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }

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

  function toggleSeries(exerciseId,seriesNo) {
    const {session,ex}=findSessionExercise(exerciseId);
    if (!session || !ex || session.status!=="em_andamento") return;
    const s=ex.series.find(x=>Number(x.numero)===Number(seriesNo));
    if (!s) return;
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
    const concluindo=!Boolean(s.concluida);
    s.concluida=!Boolean(s.concluida);
    const exercicioTerminou=exerciseDone(ex);
    if (exercicioTerminou) openExerciseId=null;
    else if (concluindo) openExerciseId=exerciseId;
    saveSessions();
    renderToday();
    if (exercicioTerminou) {
      window.MMCDUI?.toast?.(`${ex.nome} concluído.`);
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

  function toggleCheck(kind,index) {
    const session=sessionForDate(todayIso());
    if (!session || session.status!=="em_andamento" || !Array.isArray(session[kind])) return;

    const requestedId=String(index ?? "");
    const items=session[kind];
    const item=items.find((x,pos)=>{
      if (String(x?.id ?? "") === requestedId) return true;
      const numericRequested=Number(requestedId);
      const numericSaved=Number(x?.id);
      if (requestedId !== "" && Number.isFinite(numericRequested) && Number.isFinite(numericSaved) && numericSaved === numericRequested) return true;
      return String(pos) === requestedId;
    });

    if (!item) {
      console.warn("Treinos: item do checklist não encontrado.", {kind,index});
      MMCDUI?.toast?.("Não consegui localizar este item do treino.");
      return;
    }

    item.concluido=!Boolean(item.concluido);
    renderToday();
    saveSessions().catch(error=>{
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

  function activityMetaForWorkout(date=todayIso()) {
    const data=state.atividadesData;
    if(!data || !window.MMCD) return null;
    const active=window.MMCD.metasNaData(data,date) || [];
    const configured=String(state.plano?.programa?.atividadeMetaId||"").trim();
    if(configured){
      const exact=active.find(meta=>String(meta.id)===configured);
      if(exact) return exact;
    }
    return active.map(meta=>({meta,score:scoreWorkoutActivity(meta)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)[0]?.meta || null;
  }

  function workoutExcuseInfo(date=todayIso()) {
    if(!window.MMCD || !state.atividadesData) return null;
    const meta=activityMetaForWorkout(date);
    if(!meta) return null;
    const row=window.MMCD.registro(state.atividadesData,date,meta.id);
    if(!window.MMCD.estaAbonada(row)) return null;
    return {meta,row,motivo:window.MMCD.motivoAbono(row)};
  }

  function workoutHadEffort(session) {
    if(!session) return false;
    if(session.tipo==="futebol") return num(session.futebol?.duracao)>0 || (session.aquecimento||[]).some(x=>x.concluido);
    if(session.tipo==="cardio") return num(session.cardio?.duracao)>0 || (session.protocolo||[]).some(x=>x.concluido) || (session.exercicios||[]).some(ex=>exerciseDone(ex));
    return (session.exercicios||[]).some(ex=>(ex.series||[]).some(series=>series.concluida));
  }

  async function markWorkoutActivity(session) {
    if(!workoutHadEffort(session) || !window.MMCD || !state.atividadesData) return {ok:false,reason:"sem-integracao"};
    const meta=activityMetaForWorkout(session.data);
    if(!meta) return {ok:false,reason:"sem-meta"};
    const previous=window.MMCD.registro(state.atividadesData,session.data,meta.id);
    if(previous?.concluida && !window.MMCD.estaAbonada(previous)) return {ok:true,already:true,meta};
    window.MMCD.setRegistro(state.atividadesData,session.data,meta.id,{
      concluida:true,abonada:false,valor:1,texto:"",observacao:previous?.observacao||"",origem:"treino"
    });
    state.atividadesData=await window.MMCD.salvarRegistroAtividade(state.atividadesData,session.data,meta.id);
    window.dispatchEvent(new CustomEvent("mmcd:atividade-atualizada",{detail:{data:session.data,metaId:meta.id,origem:"treino"}}));
    return {ok:true,meta};
  }

  async function reconcileFinishedWorkoutActivity() {
    const session=sessionForDate(todayIso());
    if(!session || !["concluido","parcial"].includes(session.status)) return;
    try{
      const activity=await markWorkoutActivity(session);
      if(activity.ok && !activity.already){
        MMCDUI?.toast?.(`${activity.meta.nome} atualizada a partir do treino de hoje.`,3200);
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
    const selected=workoutFeedbackValue(session);
    return `<section class="finish-feedback">
      <div class="finish-feedback__head">
        <span class="treino-kicker">CHECK-OUT DO TREINO</span>
        <h3>Como foi o ritmo do treino?</h3>
        <p>Registre sua percepção geral para comparar a evolução ao longo das semanas.</p>
      </div>
      <div class="finish-feedback__options">
        ${WORKOUT_RHYTHM_OPTIONS.map(option=>`<button type="button" class="finish-feedback__option ${selected===option.valor?"active":""}" data-workout-feedback="${option.valor}" aria-pressed="${selected===option.valor?"true":"false"}"><b>${option.valor}</b><span>${esc(option.label)}</span></button>`).join("")}
      </div>
      <small class="finish-feedback__saved">${selected?`✓ Ritmo salvo: ${esc(WORKOUT_RHYTHM_OPTIONS.find(x=>x.valor===selected)?.label||"")}`:"Escolha uma opção. O registro é salvo automaticamente."}</small>
    </section>`;
  }

  async function saveWorkoutFeedback(value){
    const session=sessionForDate(todayIso());
    if(!session || !["concluido","parcial"].includes(session.status) || session.tipo==="futebol") return;
    const rating=clamp(Math.round(Number(value)||0),1,5);
    session.avaliacao={...(session.avaliacao||{}),ritmo:rating,atualizadoEm:new Date().toISOString()};
    await saveSessions();
    showFinishSummary(session);
    MMCDUI?.toast?.("Ritmo do treino salvo.");
  }

  function promptPendingWorkoutFeedback(){
    if(window.MMCD_TREINO_PAGE_MODE==="configuracoes") return;
    const session=sessionForDate(todayIso());
    if(!session || !["concluido","parcial"].includes(session.status) || session.tipo==="futebol") return;
    if(workoutFeedbackValue(session)>0) return;
    showFinishSummary(session);
  }

  async function finishWorkout() {
    const session=sessionForDate(todayIso());
    if (!session || session.status!=="em_andamento") return;
    const p=progress(session);
    session.status=p.pct===100 || session.tipo==="futebol" ? "concluido" : "parcial";
    if (session.tipo==="cardio" && session.cardio.protocoloStatus==="parcial") session.status="parcial";
    session.finalizadoEm=new Date().toISOString();
    const start=new Date(session.iniciadoEm);
    session.duracaoMinutos=Math.max(1,Math.round((Date.now()-start.getTime())/60000));
    if (session.tipo==="futebol" && num(session.futebol.duracao)>0) session.duracaoMinutos=num(session.futebol.duracao);
    if (session.tipo==="cardio" && num(session.cardio.duracao)>0) session.duracaoMinutos=num(session.cardio.duracao);

    // Fecha e redesenha imediatamente; o salvamento segue na mesma ação.
    const sessionSave=saveSessions();
    openExerciseId=null;
    renderAll();
    await sessionSave;

    try{
      const activity=await markWorkoutActivity(session);
      if(activity.ok && !activity.already) MMCDUI?.toast?.(`Treino finalizado · ${activity.meta.nome} marcada automaticamente.`);
      else if(activity.reason==="sem-meta") MMCDUI?.toast?.("Treino finalizado. Selecione em Configurações qual atividade deve ser marcada automaticamente.",4200);
    }catch(error){
      console.error("Treinos: falha ao atualizar a atividade diária.",error);
      MMCDUI?.toast?.("Treino finalizado, mas não consegui atualizar a atividade diária.",4200);
    }

    showFinishSummary(session);
  }

  function showFinishSummary(session) {
    const workout=state.plano.treinos.find(x=>x.id===session.treinoId);
    let increased=0,maintained=0;
    if (session.tipo==="musculacao") {
      const prior=priorSession(session.treinoId,session.data);
      (session.exercicios||[]).forEach(ex=>{
        if (ex.registro!=="peso_reps") return;
        const cur=Math.max(0,...ex.series.filter(s=>s.concluida).map(s=>num(s.peso)));
        const oldEx=prior?.exercicios?.find(x=>x.exercicioId===ex.exercicioId);
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
      ${workoutFeedbackHtml(session)}`;
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
          <span><i class="done"></i>Concluído</span><span><i class="partial"></i>Parcial</span><span><i class="missed"></i>Não realizado</span><span><i class="rest"></i>Descanso</span>
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
    return `<button class="history-row" data-history-date="${s.data}">
      <span class="history-status ${s.status}"></span>
      <div><strong>${esc(w?.nome||s.treinoSnapshot?.nome||"Treino")}</strong><small>${datePt(s.data)}</small></div>
      <b>${s.duracaoMinutos?`${fmt(s.duracaoMinutos)} min`:"Ver"}</b>
    </button>`;
  }

  function showHistoryDetail(iso) {
    const card=$("#history-detail-card");
    const session=sessionForDate(iso);
    const workout=workoutForDate(iso);
    if (!card) return;
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

  function loadProgressRows(reference=new Date()) {
    const sessions=monthSessions(reference).filter(s=>["concluido","parcial"].includes(s.status)).sort((a,b)=>a.data.localeCompare(b.data));
    const map=new Map();
    sessions.forEach(s=>{
      (s.exercicios||[]).forEach(ex=>{
        const best=sessionExerciseBest(s,ex.exercicioId);
        if (!best) return;
        const unit=normalizeLoadUnit(best.unidadeCarga);
        const key=`${ex.exercicioId}::${unit}`;
        if (!map.has(key)) map.set(key,{id:ex.exercicioId,nome:ex.nome,unit,rows:[]});
        map.get(key).rows.push({data:s.data,...best});
      });
    });
    return [...map.values()].map(item=>{
      const first=item.rows[0], last=item.rows[item.rows.length-1];
      return {...item,first,last,delta:last.peso-first.peso,pct:first.peso?((last.peso-first.peso)/first.peso*100):0};
    }).sort((a,b)=>b.delta-a.delta);
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
    state.plano.treinos.forEach(w=>(w.exercicios||[]).forEach(ex=>{
      if (ex.registro==="peso_reps") seen.set(ex.id,ex.nome);
    }));
    state.sessoes.forEach(session=>(session.exercicios||[]).forEach(ex=>{
      if (ex.registro==="peso_reps" && !seen.has(ex.exercicioId)) seen.set(ex.exercicioId,ex.nome);
    }));
    return [...seen.entries()];
  }

  function exerciseHistory(exerciseId) {
    const rows=state.sessoes
      .filter(s=>["concluido","parcial"].includes(s.status))
      .sort((a,b)=>a.data.localeCompare(b.data))
      .map(s=>{
        const best=sessionExerciseBest(s,exerciseId);
        return best?{data:s.data,...best}:null;
      }).filter(Boolean);
    if(!rows.length) return rows;
    // KG e placas representam escalas diferentes. A evolução mostra a unidade usada mais recentemente.
    const latestUnit=normalizeLoadUnit(rows[rows.length-1].unidadeCarga);
    return rows.filter(row=>normalizeLoadUnit(row.unidadeCarga)===latestUnit);
  }

  function chartSvg(rows) {
    if (!rows.length) return `<div class="empty">Ainda não há cargas registradas.</div>`;
    const unit=loadUnitLabel(rows[0]?.unidadeCarga);
    const W=680,H=210,p=28;
    const vals=rows.map(r=>r.peso);
    const min=Math.min(...vals),max=Math.max(...vals);
    const range=Math.max(1,max-min);
    const pts=rows.map((r,i)=>{
      const x=rows.length===1?W/2:p+i*(W-2*p)/(rows.length-1);
      const y=H-p-((r.peso-min)/range)*(H-2*p);
      return {x,y,...r};
    });
    const poly=pts.map(p=>`${p.x},${p.y}`).join(" ");
    return `<div class="load-chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Carga por data em ${unit}">
      <line x1="${p}" y1="${H-p}" x2="${W-p}" y2="${H-p}" class="chart-axis"/>
      <polyline points="${poly}" class="chart-line"/>
      ${pts.map(pt=>`<circle cx="${pt.x}" cy="${pt.y}" r="5" class="chart-dot"><title>${datePt(pt.data)} — ${fmt(pt.peso)} ${unit}</title></circle>`).join("")}
    </svg></div>`;
  }

  function renderEvolution(reference=new Date()) {
    const root=$("#treino-evolution-root");
    if (!root) return;
    const planned=plannedDaysInMonth(reference);
    const sessions=monthSessions(reference);
    const realized=sessions.filter(s=>["concluido","parcial"].includes(s.status)).length;
    const completed=sessions.filter(s=>s.status==="concluido").length;
    const partial=sessions.filter(s=>s.status==="parcial").length;
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
        ${chartSvg(hist)}
        <div class="exercise-history-list">${hist.slice().reverse().slice(0,12).map(r=>`<div><span>${datePt(r.data)}</span><strong>${fmt(r.peso)} ${loadUnitLabel(r.unidadeCarga)} × ${fmt(r.reps)}</strong></div>`).join("")}</div>
      </article>`;
  }

  function activityIntegrationHtml() {
    const metas=state.atividadesData?.metas || [];
    const configured=String(state.plano?.programa?.atividadeMetaId||"");
    const detected=activityMetaForWorkout(todayIso());
    if(!metas.length){
      return `<article class="card settings-block"><div class="section-head"><div><p class="eyebrow">Integração</p><h2>Treino → Atividades</h2></div></div><p class="muted">As atividades diárias não puderam ser carregadas agora. O treino continua funcionando normalmente.</p></article>`;
    }
    const options=metas.slice().sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR")).map(meta=>`<option value="${esc(meta.id)}" ${configured===String(meta.id)?"selected":""}>${esc(meta.nome)}</option>`).join("");
    return `<article class="card settings-block">
      <div class="section-head"><div><p class="eyebrow">Integração automática</p><h2>Treino → Atividades</h2><p class="muted">Ao finalizar um treino com execução registrada, esta atividade será marcada automaticamente no mesmo dia.</p></div></div>
      <div class="settings-grid">
        <label class="field full"><span>Indicador de atividade</span><select data-plan-field="atividadeMetaId"><option value="" ${!configured?"selected":""}>Detectar automaticamente${detected?` — ${esc(detected.nome)}`:""}</option>${options}</select></label>
      </div>
      <div class="settings-hint">${detected?`Detecção atual: <strong>${esc(detected.nome)}</strong>.`:"Nenhuma atividade com nome compatível foi detectada. Selecione uma atividade acima."}</div>
      <div class="settings-actions"><button class="btn primary" data-action="save-plan">Salvar integração</button></div>
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

      <article class="card settings-block">
        <div class="section-head"><div><p class="eyebrow">Treinos e exercícios</p><h2>Composição semanal</h2><p class="muted">Esses cadastros não aparecem durante a execução normal.</p></div></div>
        <div class="settings-workouts">${state.plano.treinos.map(workoutSettings).join("")}</div>
        <div class="settings-actions"><button class="btn primary" data-action="save-plan">Salvar composição</button></div>
      </article>

      `;
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
        <div class="settings-exercise__title"><strong>${esc(ex.nome)}</strong><button class="mini-action danger" data-action="remove-exercise" data-workout-index="${wi}" data-exercise-index="${ei}">Remover</button></div>
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

    await persistPlanAndSync("Plano de treino salvo.");
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
        saveWorkoutFeedback(workoutFeedback.dataset.workoutFeedback);
        return;
      }

      const action=event.target.closest("[data-action]");
      if(action){
        const a=action.dataset.action;
        if(a==="start-workout") startWorkout();
        else if(a==="toggle-exercise") toggleExercisePanel(action.dataset.exerciseId);
        else if(a==="toggle-series") toggleSeries(action.dataset.exerciseId,action.dataset.series);
        else if(a==="copy-last") copyLast(action.dataset.exerciseId);
        else if(a==="set-load-unit") setLoadUnit(action.dataset.exerciseId,action.dataset.loadUnit);
        else if(a==="finish-workout") finishWorkout();
        else if(a==="toggle-check") toggleCheck(action.dataset.kind,action.dataset.index);
        else if(a==="close-history") $("#history-detail-card").hidden=true;
        else if(a==="save-plan") savePlanFields();
        else if(a==="choose-theme"){ window.MMCDTheme?.setTheme?.(action.dataset.themeId).then(()=>renderSettings()); }
        else if(a==="save-theme-catalog") saveThemeCatalog();
        else if(a==="new-phase") newPhase();
        else if(a==="add-exercise") addExercise(action.dataset.workoutIndex);
        else if(a==="remove-exercise") removeExercise(action.dataset.workoutIndex,action.dataset.exerciseIndex);
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
      if(event.key==="Escape") closeExerciseGuide();
    });

    window.addEventListener("hashchange",()=>setTab(tabFromHash(),false));
  }

  async function init() {
    try {
      status("Carregando…");
      await loadAll();
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