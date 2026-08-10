"use strict";

(() => {
  const db = window.MMCDSupabase;
  const KEYS = {
    plano: "treino_plano_v1",
    sessoes: "treino_sessoes_v1",
    medidas: "treino_medidas_v1"
  };

  const state = {
    user: null,
    plano: null,
    sessoes: [],
    medidas: [],
    tab: "hoje",
    selectedDate: null,
    loading: true,
    saving: false,
    saveQueue: Promise.resolve()
  };

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
      schemaVersion:1,
      programa:{...base.programa,...value.programa},
      treinos:value.treinos
    };
  }

  async function loadAll() {
    await mustUser();
    const [planValue,sessionsValue,measuresValue] = await Promise.all([
      loadKey(KEYS.plano),
      loadKey(KEYS.sessoes),
      loadKey(KEYS.medidas)
    ]);

    state.plano = normalizePlan(planValue);
    state.sessoes = Array.isArray(sessionsValue?.sessoes) ? sessionsValue.sessoes : [];
    state.medidas = Array.isArray(measuresValue?.medidas) ? measuresValue.medidas : [];

    if (!state.plano.programa.dataInicio) {
      state.plano.programa.dataInicio = todayIso();
    }

    if (!planValue) {
      await saveKey(KEYS.plano, {...state.plano, atualizadoEm:new Date().toISOString()});
    }
    if (!sessionsValue) {
      await saveKey(KEYS.sessoes, {schemaVersion:1,sessoes:[],atualizadoEm:new Date().toISOString()});
    }
    if (!measuresValue) {
      await saveKey(KEYS.medidas, {schemaVersion:1,medidas:[],atualizadoEm:new Date().toISOString()});
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
    if (!prior?.exercicios) return null;
    return prior.exercicios.find(ex => ex.exercicioId === exerciseId) || null;
  }

  function repsDefault(label) {
    const m = String(label || "").match(/\d+/);
    return m ? Number(m[0]) : 0;
  }

  function createExerciseSession(ex) {
    if (ex.registro === "protocolo") {
      return {
        exercicioId:ex.id,nome:ex.nome,registro:"protocolo",
        observacao:ex.observacao||"", series:[{numero:1,concluida:false}]
      };
    }
    const total = Math.max(1,Number(ex.series || 1));
    return {
      exercicioId:ex.id,
      nome:ex.nome,
      equipamento:ex.equipamento||"",
      grupo:ex.grupo||"",
      registro:ex.registro||"peso_reps",
      planejado:{series:total,reps:ex.reps||"",descanso:ex.descanso||"",observacao:ex.observacao||""},
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
        intensidade:workout.intensidade
      },
      exercicios:(workout.exercicios||[]).map(createExerciseSession),
      aquecimento:(workout.aquecimento||[]).map((texto,i)=>({id:i,texto,concluido:false})),
      protocolo:(workout.protocolo||[]).map((texto,i)=>({id:i,texto,concluido:false})),
      futebol:{duracao:"",intensidade:"",folego:"",explosao:"",pernas:"",observacao:""},
      cardio:{duracao:"",protocoloStatus:"completo",intensidade:"",observacao:""}
    };
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
    return `<strong>${fmt(best.peso)} kg × ${fmt(best.reps)}</strong><span>${done.length} série(s)</span>`;
  }

  function intensityFlames(n=5) {
    return `<span class="treino-flames" aria-label="intensidade ${n} de 5">${"🔥".repeat(clamp(Number(n||0),0,5))}</span>`;
  }

  const exerciseMediaCache=new Map();
  const exerciseMediaOwners=new Map();

  function guideFor(exerciseId) {
    return window.MMCD_TREINO_GUIAS?.[exerciseId] || window.MMCD_TREINO_GUIA_PADRAO || null;
  }

  function visualButton(exerciseId,label="Ver execução") {
    return `<button type="button" class="exercise-visual-btn" data-action="show-exercise-guide" data-guide-id="${esc(exerciseId)}">
      <span class="exercise-visual-btn__icon">▶</span>${esc(label)}
    </button>`;
  }

  function normalizeGuideText(value) {
    return String(value||"")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .replace(/\b(machine|cable|smith|barbell|dumbbell)\b/g," ")
      .replace(/[^a-z0-9]+/g," ")
      .replace(/\s+/g," ")
      .trim();
  }

  function absoluteWgerUrl(url) {
    if(!url) return "";
    if(/^https?:\/\//i.test(url)) return url;
    return `https://wger.de${String(url).startsWith("/")?"":"/"}${url}`;
  }

  function extractExerciseNames(item) {
    const names=[];
    if(item?.name) names.push(item.name);
    if(item?.exercise_name) names.push(item.exercise_name);
    if(Array.isArray(item?.translations)) {
      item.translations.forEach(t=>{if(t?.name) names.push(t.name)});
    }
    return [...new Set(names.filter(Boolean))];
  }

  function mediaUrl(image) {
    return absoluteWgerUrl(
      image?.thumbnails?.medium ||
      image?.thumbnails?.small ||
      image?.image ||
      image?.url ||
      image?.path ||
      ""
    );
  }

  function tokenScore(a,b) {
    const A=new Set(normalizeGuideText(a).split(" ").filter(x=>x.length>2));
    const B=new Set(normalizeGuideText(b).split(" ").filter(x=>x.length>2));
    if(!A.size || !B.size) return 0;

    const common=[...A].filter(x=>B.has(x)).length;
    const precision=common/A.size;
    const recall=common/B.size;

    if(common===0) return 0;
    return Math.round((precision*.6 + recall*.4)*100);
  }

  function scoreWgerResult(item,aliases) {
    const names=extractExerciseNames(item);
    let best=0;

    aliases.forEach(alias=>{
      const q=normalizeGuideText(alias);
      names.forEach(raw=>{
        const name=normalizeGuideText(raw);

        if(name===q) {
          best=Math.max(best,100);
          return;
        }

        // A containment match is allowed only when the smaller phrase
        // still contains at least two meaningful words.
        const qTokens=q.split(" ").filter(x=>x.length>2);
        const nTokens=name.split(" ").filter(x=>x.length>2);
        if((name.includes(q) || q.includes(name)) && Math.min(qTokens.length,nTokens.length)>=2) {
          best=Math.max(best,88);
          return;
        }

        best=Math.max(best,tokenScore(alias,raw));
      });
    });

    return best;
  }

  function extractWgerImages(item) {
    const raw=[];
    if(Array.isArray(item?.images)) raw.push(...item.images);
    if(Array.isArray(item?.exercise_images)) raw.push(...item.exercise_images);
    if(item?.image && typeof item.image==="object") raw.push(item.image);

    const seen=new Set();
    return raw.map(img=>({
      url:mediaUrl(img),
      style:String(img?.style||img?.image_style||"").toLowerCase(),
      author:img?.license_author || img?.author || item?.license_author || "",
      license:img?.license?.short_name || img?.license?.full_name || img?.license_name || item?.license?.short_name || item?.license?.full_name || ""
    }))
    .filter(x=>{
      if(!x.url || seen.has(x.url)) return false;
      seen.add(x.url);
      return true;
    })
    .sort((a,b)=>{
      const rank=x=>{
        if(x.style.includes("photo")||x.style.includes("foto")) return 4;
        if(x.style.includes("3d")) return 3;
        if(x.style.includes("drawing")||x.style.includes("illustration")) return 2;
        return 1;
      };
      return rank(b)-rank(a);
    });
  }

  function canUseMedia(images,visualKey) {
    if(!images?.length) return false;

    // A visual can be reused only by aliases of the SAME movement
    // (e.g. the Tuesday and Saturday version of the same pulldown).
    for(const image of images) {
      const owner=exerciseMediaOwners.get(image.url);
      if(owner && owner!==visualKey) return false;
    }
    return true;
  }

  function reserveMedia(images,visualKey) {
    images.forEach(image=>exerciseMediaOwners.set(image.url,visualKey));
  }

  async function searchWger(query) {
    const url=`https://wger.de/api/v2/exerciseinfo/?limit=40&language=2&status=2&search=${encodeURIComponent(query)}`;
    const response=await fetch(url,{headers:{Accept:"application/json"}});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    return Array.isArray(payload)?payload:(payload?.results||[]);
  }

  async function fetchWgerGuide(exerciseId) {
    if(exerciseMediaCache.has(exerciseId)) return exerciseMediaCache.get(exerciseId);

    const guide=guideFor(exerciseId);
    const aliases=(guide?.consultas?.length ? guide.consultas : [guide?.consulta]).filter(Boolean);
    const visualKey=guide?.visualKey || exerciseId;

    if(!aliases.length) {
      const empty={images:[],source:"",sourceLabel:"",error:"Sem busca visual mapeada."};
      exerciseMediaCache.set(exerciseId,empty);
      return empty;
    }

    let lastError="";
    let bestRejectedScore=0;

    // IMPORTANT: every request remains query-specific.
    // There is deliberately NO "load all exercises and pick something" fallback.
    for(const query of aliases) {
      try {
        const rows=await searchWger(query);
        if(!rows.length) continue;

        const ranked=rows
          .map(item=>({item,score:scoreWgerResult(item,aliases)}))
          .sort((a,b)=>b.score-a.score);

        for(const candidate of ranked) {
          bestRejectedScore=Math.max(bestRejectedScore,candidate.score);

          // Strong semantic match only.
          if(candidate.score<72) continue;

          const images=extractWgerImages(candidate.item);
          if(!images.length) continue;

          // Prevent "the same guy/image for everything".
          if(!canUseMedia(images,visualKey)) continue;

          reserveMedia(images,visualKey);

          const id=candidate.item?.id || candidate.item?.uuid || "";
          const result={
            images:images.slice(0,3),
            source:id?`https://wger.de/exercise/${id}/view`:"https://wger.de",
            sourceLabel:extractExerciseNames(candidate.item)[0] || query,
            matchedQuery:query,
            matchScore:candidate.score,
            visualKey,
            error:""
          };

          exerciseMediaCache.set(exerciseId,result);
          return result;
        }
      } catch(error) {
        lastError=error?.message||String(error);
      }
    }

    const empty={
      images:[],
      source:"https://wger.de",
      sourceLabel:"wger",
      matchedQuery:"",
      matchScore:bestRejectedScore,
      visualKey,
      error:lastError || `Nenhuma referência atingiu a qualidade mínima (${bestRejectedScore}/100).`
    };
    exerciseMediaCache.set(exerciseId,empty);
    return empty;
  }

  function guideTextHtml(exerciseId) {
    const guide=guideFor(exerciseId);
    if(!guide) return "";
    return `<div class="exercise-guide__content">
      <span class="treino-kicker">COMO EXECUTAR</span>
      <ol>${(guide.passos||[]).map(item=>`<li>${esc(item)}</li>`).join("")}</ol>
      ${guide.dica?`<div class="exercise-guide__tip"><span>💡</span><p><strong>Dica:</strong> ${esc(guide.dica)}</p></div>`:""}
    </div>`;
  }

  function guideHtml(exerciseId,compact=false) {
    const guide=guideFor(exerciseId);
    if(!guide) return "";
    return `<div class="exercise-guide exercise-guide--real ${compact?"compact":""}" data-live-guide="${esc(exerciseId)}">
      <div class="exercise-guide__visual exercise-guide__visual--loading">
        <div class="exercise-media-loading"><span></span><strong>Buscando referência visual real…</strong><small>Foto ou ilustração 3D, quando disponível.</small></div>
      </div>
      ${guideTextHtml(exerciseId)}
    </div>`;
  }

  function attributionHtml(media) {
    const authors=[...new Set((media.images||[]).map(x=>x.author).filter(Boolean))];
    const licenses=[...new Set((media.images||[]).map(x=>x.license).filter(Boolean))];
    return `<div class="exercise-media-source">
      <span>Fonte visual: wger</span>
      ${media.sourceLabel?`<span>Correspondência: ${esc(media.sourceLabel)}</span>`:""}
      ${media.matchScore?`<span>Confiança: ${esc(media.matchScore)}/100</span>`:""}
      ${authors.length?`<span>Autor: ${esc(authors.join(", "))}</span>`:""}
      ${licenses.length?`<span>Licença: ${esc(licenses.join(", "))}</span>`:""}
      ${media.source?`<a href="${esc(media.source)}" target="_blank" rel="noopener noreferrer">Ver fonte</a>`:""}
    </div>`;
  }

  async function hydrateGuide(container,exerciseId) {
    if(!container) return;
    const visual=container.querySelector(".exercise-guide__visual");
    if(!visual) return;

    const media=await fetchWgerGuide(exerciseId);
    if(!document.documentElement.contains(container)) return;

    if(media.images?.length){
      visual.classList.remove("exercise-guide__visual--loading");
      visual.innerHTML=`<div class="exercise-real-media ${media.images.length>1?"multiple":""}">
        ${media.images.map((img,i)=>`<figure><img src="${esc(img.url)}" alt="${esc(guideFor(exerciseId)?.titulo||"Exercício")} — referência ${i+1}" loading="lazy" referrerpolicy="no-referrer">${media.images.length>1?`<figcaption>Referência ${i+1}</figcaption>`:""}</figure>`).join("")}
      </div>${attributionHtml(media)}`;
    }else{
      visual.classList.remove("exercise-guide__visual--loading");
      visual.innerHTML=`<div class="exercise-media-unavailable"><span>📷</span><strong>Referência visual indisponível</strong><p>Não encontrei uma foto ou ilustração que corresponda com segurança a este exercício. Prefiro deixar sem imagem do que repetir uma referência errada.</p></div>`;
    }
  }

  function hydrateVisibleGuides(root=document) {
    root.querySelectorAll("[data-live-guide]").forEach(container=>{
      if(container.dataset.hydrating==="1") return;
      container.dataset.hydrating="1";
      hydrateGuide(container,container.dataset.liveGuide);
    });
  }

  async function showExerciseGuide(exerciseId) {
    const guide=guideFor(exerciseId);
    if(!guide) return;
    const modal=$("#exercise-guide-modal");
    if(!modal) return;
    $("#exercise-guide-modal-title").textContent=guide.titulo || "Execução do exercício";
    $("#exercise-guide-modal-body").innerHTML=guideHtml(exerciseId,false);
    modal.hidden=false;
    document.body.classList.add("guide-modal-open");
    hydrateVisibleGuides(modal);
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
      return `<div class="preview-list">${(workout.aquecimento||[]).map(x=>`<div>• ${esc(x)}</div>`).join("")}</div>`;
    }

    if (workout.tipo==="cardio") {
      return `
        <div class="preview-list">${(workout.protocolo||[]).map(x=>`<div>• ${esc(x)}</div>`).join("")}</div>
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
            <h2>${esc(workout?.tituloCurto || session.treinoSnapshot?.nome || "Treino")}</h2>
            <p>${esc(workout?.objetivo || session.treinoSnapshot?.objetivo || "")}</p>
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
    return `
      <article class="card active-workout-head">
        <div class="active-workout-head__title">
          <div>
            <span class="treino-kicker">${session.status==="concluido"?"TREINO CONCLUÍDO":"EM ANDAMENTO"}</span>
            <h2>${esc(workout.tituloCurto)}</h2>
            <p>${esc(workout.objetivo)}</p>
          </div>
          ${intensityFlames(workout.intensidade)}
        </div>
        <div class="workout-progress-copy"><strong>${p.done} de ${p.total}</strong><span> exercícios concluídos</span><b>${p.pct}%</b></div>
        <div class="workout-progress"><i style="width:${p.pct}%"></i></div>
      </article>`;
  }

  function renderStrength(root,workout,session) {
    const currentIdx=currentExerciseIndex(session);
    const prior=priorSession(workout.id,session.data);
    const exerciseCards=(session.exercicios||[]).map((ex,idx)=>{
      const done=exerciseDone(ex);
      const pex=prior?.exercicios?.find(x=>x.exercicioId===ex.exercicioId);
      const isCurrent=!done && idx===currentIdx;
      const seriesHtml=(ex.series||[]).map(s=>seriesRow(ex,s,isCurrent && !s.concluida)).join("");
      return `
        <article class="exercise-card ${done?"done":""} ${isCurrent?"current":""}" data-exercise="${esc(ex.exercicioId)}">
          <div class="exercise-card__head">
            <div>
              <span class="exercise-order">${String(idx+1).padStart(2,"0")}</span>
              <div>
                <h3>${done?"✓ ":""}${esc(ex.nome)}</h3>
                <p>${esc(ex.planejado?.series||ex.series.length)} × ${esc(ex.planejado?.reps||"")} ${ex.planejado?.descanso?`· descanso ${esc(ex.planejado.descanso)}`:""}</p>
              </div>
            </div>
            <div class="exercise-head-actions">
              <span class="exercise-state">${done?"Concluído":isCurrent?"Agora":"Depois"}</span>
              ${visualButton(ex.exercicioId,isCurrent?"Execução":"Ver execução")}
            </div>
          </div>
          ${isCurrent ? guideHtml(ex.exercicioId,true) : ""}
          ${ex.planejado?.observacao?`<div class="exercise-note">${esc(ex.planejado.observacao)}</div>`:""}
          <div class="last-time-box">
            <span>ÚLTIMA VEZ</span>
            <div>${lastExerciseSummary(pex)}</div>
            ${prior?`<small>${datePt(prior.data)}</small>`:""}
            ${pex?`<button class="mini-action" data-action="copy-last" data-exercise-id="${esc(ex.exercicioId)}">Usar último treino</button>`:""}
          </div>
          <div class="series-stack">${seriesHtml}</div>
        </article>`;
    }).join("");

    const p=progress(session);
    root.innerHTML=`
      ${renderSessionHeader(workout,session)}
      <div class="exercise-stack">${exerciseCards}</div>
      <article class="card finish-workout-card">
        <div>
          <span class="treino-kicker">${p.pct===100?"PRONTO PARA FINALIZAR":"FINAL DO TREINO"}</span>
          <h2>${p.done}/${p.total} exercícios</h2>
          <p>${p.pct===100?"Todas as séries foram concluídas.":"Você pode finalizar como parcial se precisar encerrar agora."}</p>
        </div>
        <button class="btn primary finish-btn" data-action="finish-workout">${p.pct===100?"FINALIZAR TREINO":"FINALIZAR PARCIAL"}</button>
      </article>`;
  }

  function seriesRow(ex,s,highlight) {
    if (ex.registro==="protocolo") {
      return `<div class="series-card protocol-series ${s.concluida?"done":""}">
        <div><span>PROTOCOLO</span><strong>${esc(ex.planejado?.reps||"Concluir")}</strong></div>
        <button class="series-check ${s.concluida?"done":""}" data-action="toggle-series" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">${s.concluida?"✓ Concluído":"✓ Concluir"}</button>
      </div>`;
    }
    const time=ex.registro==="tempo";
    return `<div class="series-card ${s.concluida?"done":""} ${highlight?"focus":""}">
      <div class="series-title"><span>SÉRIE ${s.numero}</span>${s.concluida?"<b>✓</b>":""}</div>
      <div class="series-controls ${time?"single":""}">
        ${time ? `
          <label><span>Tempo</span><div class="stepper">
            <button type="button" data-step-field="segundos" data-step="-5" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">−</button>
            <input inputmode="numeric" type="number" min="0" step="5" value="${Number(s.segundos||0)}" data-field="segundos" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">
            <strong>s</strong>
            <button type="button" data-step-field="segundos" data-step="5" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">+</button>
          </div></label>` : `
          <label><span>Peso total</span><div class="stepper">
            <button type="button" data-step-field="peso" data-step="-2.5" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">−</button>
            <input inputmode="decimal" type="number" min="0" step="0.5" value="${Number(s.peso||0)}" data-field="peso" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">
            <strong>kg</strong>
            <button type="button" data-step-field="peso" data-step="2.5" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">+</button>
          </div></label>
          <label><span>Repetições</span><div class="stepper">
            <button type="button" data-step-field="reps" data-step="-1" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">−</button>
            <input inputmode="numeric" type="number" min="0" step="1" value="${Number(s.reps||0)}" data-field="reps" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">
            <button type="button" data-step-field="reps" data-step="1" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">+</button>
          </div></label>`}
      </div>
      <button class="series-check ${s.concluida?"done":""}" data-action="toggle-series" data-exercise-id="${esc(ex.exercicioId)}" data-series="${s.numero}">${s.concluida?"✓ Série concluída":"✓ Concluir série"}</button>
    </div>`;
  }

  function checklist(items,kind) {
    return `<div class="protocol-list">${(items||[]).map(item=>`
      <button class="protocol-item ${item.concluido?"done":""}" data-action="toggle-check" data-kind="${kind}" data-index="${item.id}">
        <span>${item.concluido?"✓":"○"}</span><strong>${esc(item.texto)}</strong>
      </button>`).join("")}</div>`;
  }

  function renderFootball(root,workout,session) {
    root.innerHTML=`
      ${renderSessionHeader(workout,session)}
      <article class="card special-workout-card">
        <div class="section-head"><div><p class="eyebrow">Antes do jogo</p><h2>Aquecimento</h2></div></div>
        ${checklist(session.aquecimento,"aquecimento")}
      </article>
      <article class="card special-workout-card">
        <div class="section-head"><div><p class="eyebrow">Depois do jogo</p><h2>Como foi?</h2></div></div>
        <div class="special-fields">
          ${specialNumber("Duração (min)","duracao",session.futebol.duracao,0,240,1,"futebol")}
          ${specialNumber("Intensidade percebida","intensidade",session.futebol.intensidade,1,10,1,"futebol")}
          ${specialNumber("Fôlego","folego",session.futebol.folego,1,10,1,"futebol")}
          ${specialNumber("Explosão","explosao",session.futebol.explosao,1,10,1,"futebol")}
          ${specialNumber("Condição das pernas","pernas",session.futebol.pernas,1,10,1,"futebol")}
          <label class="field full"><span>Observação</span><textarea data-special="futebol" data-field="observacao">${esc(session.futebol.observacao)}</textarea></label>
        </div>
      </article>
      <button class="btn primary finish-special" data-action="finish-workout">FINALIZAR FUTEBOL</button>`;
  }

  function renderCardio(root,workout,session) {
    const exerciseCards=(session.exercicios||[]).map((ex,idx)=>`
      <article class="exercise-card ${exerciseDone(ex)?"done":""}">
        <div class="exercise-card__head">
          <div><span class="exercise-order">${String(idx+1).padStart(2,"0")}</span><div><h3>${esc(ex.nome)}</h3><p>${esc(ex.planejado?.series)} × ${esc(ex.planejado?.reps)}</p></div></div>
          ${visualButton(ex.exercicioId)}
        </div>
        ${guideHtml(ex.exercicioId,true)}
        <div class="series-stack">${(ex.series||[]).map(s=>seriesRow(ex,s,false)).join("")}</div>
      </article>`).join("");

    root.innerHTML=`
      ${renderSessionHeader(workout,session)}
      <article class="card special-workout-card">
        <div class="section-head"><div><p class="eyebrow">Bicicleta</p><h2>Protocolo</h2></div></div>
        ${checklist(session.protocolo,"protocolo")}
        <div class="special-fields cardio-summary">
          ${specialNumber("Duração total (min)","duracao",session.cardio.duracao,0,180,1,"cardio")}
          <label class="field"><span>Protocolo</span><select data-special="cardio" data-field="protocoloStatus"><option value="completo" ${session.cardio.protocoloStatus==="completo"?"selected":""}>Completo</option><option value="parcial" ${session.cardio.protocoloStatus==="parcial"?"selected":""}>Parcial</option></select></label>
          ${specialNumber("Intensidade percebida","intensidade",session.cardio.intensidade,1,10,1,"cardio")}
          <label class="field full"><span>Observação</span><textarea data-special="cardio" data-field="observacao">${esc(session.cardio.observacao)}</textarea></label>
        </div>
      </article>
      <div class="exercise-stack">${exerciseCards}</div>
      <button class="btn primary finish-special" data-action="finish-workout">FINALIZAR TREINO</button>`;
  }

  function specialNumber(label,field,value,min,max,step,group) {
    return `<label class="field"><span>${esc(label)}</span><input type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${esc(value)}" data-special="${group}" data-field="${field}"></label>`;
  }

  function startWorkout() {
    const iso=todayIso();
    const workout=workoutForDate(iso);
    if (!workout || workout.tipo==="descanso") return;
    if (sessionForDate(iso)) return;
    state.sessoes.push(createSession(workout));
    saveSessions();
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
    if (!session || !ex) return;
    const s=ex.series.find(x=>Number(x.numero)===Number(seriesNo));
    if (!s) return;
    s[field]=Math.max(0,num(value));
    saveSessions();
  }

  function stepSeries(exerciseId,seriesNo,field,delta) {
    const {session,ex}=findSessionExercise(exerciseId);
    if (!session || !ex) return;
    const s=ex.series.find(x=>Number(x.numero)===Number(seriesNo));
    if (!s) return;
    const precision=field==="peso" ? 1 : 0;
    const next=Math.max(0,Number((num(s[field])+num(delta)).toFixed(precision)));
    s[field]=next;
    saveSessions();
    renderToday();
  }

  function toggleSeries(exerciseId,seriesNo) {
    const {session,ex}=findSessionExercise(exerciseId);
    if (!session || !ex) return;
    const s=ex.series.find(x=>Number(x.numero)===Number(seriesNo));
    if (!s) return;
    s.concluida=!s.concluida;
    saveSessions();
    renderToday();
    if (s.concluida) {
      requestAnimationFrame(()=>{
        const current=$(".exercise-card.current .series-card:not(.done)") || $(".exercise-card.current");
        current?.scrollIntoView({behavior:"smooth",block:"center"});
      });
    }
  }

  function copyLast(exerciseId) {
    const session=sessionForDate(todayIso());
    if (!session) return;
    const current=session.exercicios.find(x=>x.exercicioId===exerciseId);
    const prior=exercisePrior(exerciseId,session.treinoId,session.data);
    if (!current || !prior) return;
    current.series.forEach((s,i)=>{
      const old=prior.series?.[i] || prior.series?.[prior.series.length-1];
      if (!old) return;
      if ("peso" in s) s.peso=Number(old.peso||0);
      if ("reps" in s) s.reps=Number(old.reps||0);
      if ("segundos" in s) s.segundos=Number(old.segundos||0);
    });
    saveSessions();
    renderToday();
    MMCDUI?.toast?.("Último treino copiado.");
  }

  function toggleCheck(kind,index) {
    const session=sessionForDate(todayIso());
    if (!session || !Array.isArray(session[kind])) return;
    const item=session[kind].find(x=>Number(x.id)===Number(index));
    if (!item) return;
    item.concluido=!item.concluido;
    saveSessions();
    renderToday();
  }

  function updateSpecial(group,field,value) {
    const session=sessionForDate(todayIso());
    if (!session?.[group]) return;
    session[group][field]=value;
    saveSessions();
  }

  function finishWorkout() {
    const session=sessionForDate(todayIso());
    if (!session || session.status==="concluido") return;
    const p=progress(session);
    session.status=p.pct===100 || session.tipo==="futebol" ? "concluido" : "parcial";
    if (session.tipo==="cardio" && session.cardio.protocoloStatus==="parcial") session.status="parcial";
    session.finalizadoEm=new Date().toISOString();
    const start=new Date(session.iniciadoEm);
    session.duracaoMinutos=Math.max(1,Math.round((Date.now()-start.getTime())/60000));
    if (session.tipo==="futebol" && num(session.futebol.duracao)>0) session.duracaoMinutos=num(session.futebol.duracao);
    if (session.tipo==="cardio" && num(session.cardio.duracao)>0) session.duracaoMinutos=num(session.cardio.duracao);
    saveSessions();
    renderAll();
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
        const old=Math.max(0,...(oldEx?.series||[]).filter(s=>s.concluida).map(s=>num(s.peso)));
        if (cur>old && old>0) increased++;
        else if (cur===old && cur>0) maintained++;
      });
    }
    const modal=$("#finish-modal");
    $("#finish-modal-body").innerHTML=`
      <span class="treino-kicker">TREINO CONCLUÍDO 🔥</span>
      <h2>${esc(workout?.nome||"Treino")}</h2>
      <div class="finish-stats">
        <div><span>Tempo</span><strong>${fmt(session.duracaoMinutos)} min</strong></div>
        ${session.tipo==="musculacao"?`<div><span>Aumentos de carga</span><strong>${increased}</strong></div><div><span>Mantidos</span><strong>${maintained}</strong></div>`:""}
        <div><span>Status</span><strong>${session.status==="concluido"?"Concluído":"Parcial"}</strong></div>
      </div>`;
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
    card.hidden=false;
    card.innerHTML=`<button class="detail-close" data-action="close-history">×</button><span class="treino-kicker">${datePt(iso)}</span><h2>${esc(session.treinoSnapshot?.nome||workout?.nome||"Treino")}</h2><div class="detail-meta"><span>${session.status==="concluido"?"Concluído":"Parcial"}</span><span>${session.duracaoMinutos?`${fmt(session.duracaoMinutos)} min`:""}</span></div>${exercises||"<p>Registro concluído.</p>"}`;
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
    return state.sessoes.filter(s=>s.data.startsWith(prefix));
  }

  function sessionExerciseBest(session,exerciseId) {
    const ex=session.exercicios?.find(x=>x.exercicioId===exerciseId);
    if (!ex || ex.registro!=="peso_reps") return null;
    const vals=ex.series.filter(s=>s.concluida && num(s.peso)>0).map(s=>({peso:num(s.peso),reps:num(s.reps)}));
    if (!vals.length) return null;
    return vals.sort((a,b)=>b.peso-a.peso || b.reps-a.reps)[0];
  }

  function loadProgressRows(reference=new Date()) {
    const sessions=monthSessions(reference).filter(s=>["concluido","parcial"].includes(s.status)).sort((a,b)=>a.data.localeCompare(b.data));
    const map=new Map();
    sessions.forEach(s=>{
      (s.exercicios||[]).forEach(ex=>{
        const best=sessionExerciseBest(s,ex.exercicioId);
        if (!best) return;
        if (!map.has(ex.exercicioId)) map.set(ex.exercicioId,{id:ex.exercicioId,nome:ex.nome,rows:[]});
        map.get(ex.exercicioId).rows.push({data:s.data,...best});
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
    return [...seen.entries()];
  }

  function exerciseHistory(exerciseId) {
    return state.sessoes
      .filter(s=>["concluido","parcial"].includes(s.status))
      .sort((a,b)=>a.data.localeCompare(b.data))
      .map(s=>{
        const best=sessionExerciseBest(s,exerciseId);
        return best?{data:s.data,...best}:null;
      }).filter(Boolean);
  }

  function chartSvg(rows) {
    if (!rows.length) return `<div class="empty">Ainda não há cargas registradas.</div>`;
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
    return `<div class="load-chart-wrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Carga por data">
      <line x1="${p}" y1="${H-p}" x2="${W-p}" y2="${H-p}" class="chart-axis"/>
      <polyline points="${poly}" class="chart-line"/>
      ${pts.map(pt=>`<circle cx="${pt.x}" cy="${pt.y}" r="5" class="chart-dot"><title>${datePt(pt.data)} — ${fmt(pt.peso)} kg</title></circle>`).join("")}
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
            <div><strong>${esc(item.nome)}</strong><small>${fmt(item.first.peso)} → ${fmt(item.last.peso)} kg</small></div>
            <b class="${item.delta>0?"up":item.delta<0?"down":""}">${item.delta>0?"↑":item.delta<0?"↓":"→"} ${item.delta>0?"+":""}${fmt(item.delta)} kg ${item.first.peso?`(${item.pct>0?"+":""}${item.pct.toFixed(1).replace(".",",")}%)`:""}</b>
          </div>`).join(""):`<div class="empty">Registre cargas para acompanhar a evolução.</div>`}</div>
      </article>
      <article class="card evolution-card">
        <div class="section-head"><div><p class="eyebrow">Medidas</p><h2>Evolução corporal</h2></div><button class="btn small" data-go-tab="configuracoes">Nova medição</button></div>
        ${measureCards(reference)||`<div class="empty">Faça pelo menos duas medições no mesmo mês para ver a comparação.</div>`}
      </article>
      <article class="card evolution-card">
        <div class="section-head"><div><p class="eyebrow">Histórico por exercício</p><h2>Carga × data</h2></div>
          <select id="exercise-history-select" class="compact-select">${options.map(([id,name])=>`<option value="${esc(id)}" ${id===selected?"selected":""}>${esc(name)}</option>`).join("")}</select>
        </div>
        ${chartSvg(hist)}
        <div class="exercise-history-list">${hist.slice().reverse().slice(0,12).map(r=>`<div><span>${datePt(r.data)}</span><strong>${fmt(r.peso)} kg × ${fmt(r.reps)}</strong></div>`).join("")}</div>
      </article>`;
  }

  function renderSettings() {
    const root=$("#treino-settings-root");
    if (!root) return;
    const p=state.plano.programa;
    const measureRows=state.medidas.slice().sort((a,b)=>b.data.localeCompare(a.data)).slice(0,10);

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

      <article class="card settings-block">
        <div class="section-head"><div><p class="eyebrow">Treinos e exercícios</p><h2>Composição semanal</h2><p class="muted">Esses cadastros não aparecem durante a execução normal.</p></div></div>
        <div class="settings-workouts">${state.plano.treinos.map(workoutSettings).join("")}</div>
        <div class="settings-actions"><button class="btn primary" data-action="save-plan">Salvar composição</button></div>
      </article>

      <article class="card settings-block" id="medidas">
        <div class="section-head"><div><p class="eyebrow">Medidas corporais</p><h2>Nova medição</h2><p class="muted">Nenhum campo corporal é obrigatório.</p></div></div>
        <form id="measure-form">
          <div class="measure-form-grid">
            ${measureInput("Data","data","date",todayIso(),true)}
            ${measureInput("Peso corporal","peso","number","","")}
            ${measureInput("Cintura","cintura","number","","")}
            ${measureInput("Abdômen","abdomen","number","","")}
            ${measureInput("Peitoral","peitoral","number","","")}
            ${measureInput("Braço direito","bracoDireito","number","","")}
            ${measureInput("Braço esquerdo","bracoEsquerdo","number","","")}
            ${measureInput("Quadril","quadril","number","","")}
            ${measureInput("Coxa direita","coxaDireita","number","","")}
            ${measureInput("Coxa esquerda","coxaEsquerda","number","","")}
            ${measureInput("Panturrilha direita","panturrilhaDireita","number","","")}
            ${measureInput("Panturrilha esquerda","panturrilhaEsquerda","number","","")}
            <label class="field full"><span>Observação</span><textarea name="observacao"></textarea></label>
          </div>
          <div class="settings-actions"><button class="btn primary">+ Salvar medição</button></div>
        </form>
        <div class="measure-history">${measureRows.map(m=>`<div class="measure-history-row"><strong>${datePt(m.data)}</strong><span>${m.peso?`${fmt(m.peso)} kg`:""}</span><span>${m.cintura?`Cintura ${fmt(m.cintura)} cm`:""}</span><button class="mini-action danger" data-action="delete-measure" data-measure-id="${esc(m.id)}">Excluir</button></div>`).join("")}</div>
      </article>`;
  }

  function measureInput(label,name,type,value,required) {
    return `<label class="field"><span>${esc(label)}${name!=="data"?" (cm)":""}</span><input name="${name}" type="${type}" ${type==="number"?'inputmode="decimal" step="0.1" min="0"':""} value="${esc(value)}" ${required?"required":""}></label>`;
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
          <div class="field full exercise-guide-admin">
            <span>Guia visual</span>
            <div class="exercise-guide-admin__row">
              <div class="exercise-guide-admin__icon">📷</div>
              <div><strong>Referência real</strong><small>${esc(guideFor(ex.id)?.consulta||"Sem busca mapeada")}</small></div>
              ${visualButton(ex.id,"Pré-visualizar")}
            </div>
          </div>
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
        ${["musculacao","cardio"].includes(w.tipo)?`<div class="settings-exercise-list">${exercises}</div><button class="btn small" data-action="add-exercise" data-workout-index="${wi}">+ Exercício</button>`:""}
      </div>
    </details>`;
  }

  function savePlanFields() {
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
    savePlan();
    MMCDUI?.toast?.("Plano de treino salvo.");
    renderAll();
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
      observacao:""
    });
    renderSettings();
    requestAnimationFrame(()=>{
      const details=$$(".settings-workout")[Number(workoutIndex)];
      if(details) details.open=true;
    });
  }

  function removeExercise(wi,ei) {
    const w=state.plano.treinos[Number(wi)];
    if (!w?.exercicios?.[Number(ei)]) return;
    w.exercicios.splice(Number(ei),1);
    renderSettings();
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
    requestAnimationFrame(()=>hydrateVisibleGuides(document));
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

      const action=event.target.closest("[data-action]");
      if(action){
        const a=action.dataset.action;
        if(a==="start-workout") startWorkout();
        else if(a==="toggle-series") toggleSeries(action.dataset.exerciseId,action.dataset.series);
        else if(a==="copy-last") copyLast(action.dataset.exerciseId);
        else if(a==="finish-workout") finishWorkout();
        else if(a==="toggle-check") toggleCheck(action.dataset.kind,action.dataset.index);
        else if(a==="close-history") $("#history-detail-card").hidden=true;
        else if(a==="save-plan") savePlanFields();
        else if(a==="new-phase") newPhase();
        else if(a==="add-exercise") addExercise(action.dataset.workoutIndex);
        else if(a==="remove-exercise") removeExercise(action.dataset.workoutIndex,action.dataset.exerciseIndex);
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

      const guideObserver=new MutationObserver(()=>hydrateVisibleGuides(document));
      guideObserver.observe(document.body,{childList:true,subtree:true});

      if (window.MMCD_TREINO_PAGE_MODE === "configuracoes" && location.hash === "#medidas") {
        requestAnimationFrame(() => document.querySelector("#medidas")?.scrollIntoView({behavior:"smooth",block:"start"}));
      }
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