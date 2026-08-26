"use strict";

(async () => {
  const db=window.MMCDSupabase;
  const session=await window.MMCDAuth.requireSession();
  const user=session.user;
  const SUMMARY_KEY="ingles_evolucao_v2";
  const READING_KEY="ingles_etapas_v1";
  const CONVERSATION_KEY="ingles_conversas_v1";

  async function readKey(key) {
    const {data,error}=await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",user.id)
      .eq("chave",key)
      .maybeSingle();

    if(error) throw error;
    return data?.valor && typeof data.valor==="object"
      ? data.valor
      : {};
  }

  const [conversations,readingStore]=await Promise.all([
    readKey(CONVERSATION_KEY),
    readKey(READING_KEY)
  ]);

  let appData=null;
  try {
    appData=await window.MMCD?.carregar?.();
  } catch(error) {
    console.warn(error);
  }

  const clamp=value=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
  const pct=(a,b)=>b ? Math.round(a*100/b) : null;
  const avg=values=>values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const norm=value=>String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLocaleLowerCase("pt-BR");

  const studyDates=new Set();
  const conversationScores=[];
  let conversationAnswers=0;
  let conversationExpected=0;
  let conversationCompleted=0;

  const conversationSessions=Array.isArray(conversations?.sessions)
    ? conversations.sessions
    : [];

  for(const item of conversationSessions) {
    const date=String(item?.date || "");
    if(/^\d{4}-\d{2}-\d{2}$/.test(date)) studyDates.add(date);

    const stage=Math.max(1,Math.min(4,Number(item?.stage || 1)));
    const expected=stage===1 ? 3 : 4;
    const answers=Array.isArray(item?.answers)
      ? item.answers.filter(answer=>String(answer?.text || answer?.answer || "").trim())
      : [];

    conversationAnswers+=Math.min(expected,answers.length);
    conversationExpected+=expected;

    if(item?.completed) conversationCompleted++;

    const score=Number(item?.evaluation?.overall);
    if(Number.isFinite(score) && score>=0 && score<=100) {
      conversationScores.push(score);
    }
  }

  const readingDays=Object.entries(readingStore?.days || {})
    .filter(([,value])=>Boolean(value?.completed))
    .map(([date])=>date)
    .filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date));

  readingDays.forEach(date=>studyDates.add(date));

  const conversationScore=conversationScores.length
    ? avg(conversationScores)
    : (conversationExpected ? pct(conversationAnswers,conversationExpected) : null);

  const today=new Date();
  today.setHours(0,0,0,0);

  const isoLocal=date=>new Date(
    date.getTime()-date.getTimezoneOffset()*60000
  ).toISOString().slice(0,10);

  const last30=[];

  for(let i=29;i>=0;i--) {
    const day=new Date(today);
    day.setDate(day.getDate()-i);
    const iso=isoLocal(day);
    last30.push({
      iso,
      active:studyDates.has(iso)
    });
  }

  const activeDays=last30.filter(item=>item.active).length;
  const sorted=[...studyDates]
    .filter(date=>/^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();

  const first=sorted[0] || isoLocal(today);
  const start30=isoLocal(
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()-29
    )
  );

  const start=first>start30 ? first : start30;

  const englishMetaIds=new Set(
    (appData?.metas || [])
      .filter(meta=>{
        const label=norm(`${meta?.nome || ""} ${meta?.categoria || ""}`);
        return meta?.ativa!==false
          && (label.includes("ingles") || label.includes("english"));
      })
      .map(meta=>String(meta.id))
  );

  const expectedDates=[];
  const cursor=new Date(`${start}T12:00:00`);

  while(cursor<=today) {
    const iso=isoLocal(cursor);
    let expected=true;

    if(englishMetaIds.size && window.MMCD?.metasNaData) {
      const active=window.MMCD.metasNaData(appData,iso) || [];
      expected=active.some(meta=>englishMetaIds.has(String(meta.id)));
    }

    if(expected) expectedDates.push(iso);
    cursor.setDate(cursor.getDate()+1);
  }

  const completedExpected=expectedDates
    .filter(date=>studyDates.has(date))
    .length;

  const consistencyScore=expectedDates.length
    ? pct(completedExpected,expectedDates.length)
    : (activeDays ? 100 : 0);

  const skills={
    conversation:{
      label:"Conversação",
      score:conversationScore,
      samples:conversationSessions.length,
      detail:conversationExpected
        ? `${conversationAnswers}/${conversationExpected} respostas · ${conversationCompleted} conversa(s) concluída(s)`
        : "sem conversa registrada"
    },
    reading:{
      label:"Leitura",
      score:null,
      samples:readingDays.length,
      detail:readingDays.length
        ? `${readingDays.length} leitura(s) concluída(s)`
        : "sem leitura concluída"
    },
    consistency:{
      label:"Consistência",
      score:consistencyScore,
      samples:completedExpected,
      detail:expectedDates.length
        ? `${completedExpected}/${expectedDates.length} dias previstos cumpridos`
        : "sem dias previstos no período"
    }
  };

  const overall=Number.isFinite(conversationScore)
    ? clamp(conversationScore)
    : null;

  let decision="CONTINUAR";
  if(overall!==null && overall<60) decision="REVISAR";
  else if(overall!==null && overall>=80) decision="AVANÇAR";

  const priority=overall===null
    ? "Coletar mais evidências"
    : "Conversação";

  const reason=overall===null
    ? "Ainda não há respostas corrigidas suficientes para ajustar a trilha com segurança."
    : `A conversação é a evidência ativa de produção do Memory (${clamp(overall)}%).`;

  const latest=sorted.at(-1) || "";

  const summary={
    schemaVersion:5,
    updatedAt:new Date().toISOString(),
    overall,
    decision,
    priority,
    reason,
    studyDays30:activeDays,
    skills:Object.fromEntries(
      Object.entries(skills).map(([key,value])=>[
        key,
        {
          score:value.score===null ? null : clamp(value.score),
          samples:value.samples,
          detail:value.detail
        }
      ])
    )
  };

  try {
    const {error}=await db.from("configuracoes_usuario").upsert({
      user_id:user.id,
      chave:SUMMARY_KEY,
      valor:summary
    },{onConflict:"user_id,chave"});

    if(error) throw error;
  } catch(error) {
    console.warn("Evolução do inglês: resumo não salvo.",error);
  }

  document.querySelector("#english-overall-ring")
    ?.style.setProperty("--progress",String(overall || 0));

  const scoreEl=document.querySelector("#english-overall-score");
  if(scoreEl) scoreEl.textContent=overall===null ? "—" : `${overall}%`;

  const titleEl=document.querySelector("#english-overall-title");
  if(titleEl) {
    titleEl.textContent=overall===null
      ? "Construindo sua linha de base"
      : overall>=80
        ? "Boa evolução no inglês ativo"
        : overall>=65
          ? "Evolução consistente"
          : "Há um ponto pedindo reforço";
  }

  const daysEl=document.querySelector("#english-study-days");
  if(daysEl) {
    daysEl.textContent=expectedDates.length
      ? `${completedExpected}/${expectedDates.length} dias previstos cumpridos`
      : `${activeDays} dia${activeDays===1 ? "" : "s"} com estudo`;
  }

  const lastEl=document.querySelector("#english-last-activity");
  if(lastEl) {
    lastEl.textContent=`Última atividade: ${
      latest ? latest.split("-").reverse().join("/") : "—"
    }`;
  }

  const focusTitle=document.querySelector("#english-next-focus-title");
  if(focusTitle) focusTitle.textContent=priority;

  const focusText=document.querySelector("#english-next-focus-text");
  if(focusText) focusText.textContent=reason;

  const decisionEl=document.querySelector("#english-adaptive-decision");
  if(decisionEl) decisionEl.textContent=decision;

  for(const [key,item] of Object.entries(skills)) {
    const card=document.querySelector(`[data-skill="${key}"]`);
    if(!card) continue;

    const score=item.score===null ? null : clamp(item.score);
    const strong=card.querySelector("strong");
    const small=card.querySelector("small");
    const bar=card.querySelector("i");

    if(strong) strong.textContent=score===null ? "—" : `${score}%`;
    if(small) small.textContent=item.detail;
    if(bar) bar.style.width=`${score || 0}%`;
  }

  const trendTotal=document.querySelector("#english-trend-total");
  if(trendTotal) {
    trendTotal.textContent=`${activeDays} dia${activeDays===1 ? "" : "s"} com estudo`;
  }

  const trend=document.querySelector("#english-trend-chart");
  if(trend) {
    trend.innerHTML=last30.map((item,index)=>`
      <div
        class="english-trend-day ${item.active ? "active" : ""}"
        style="height:${item.active ? 64+(index%4)*8 : 10}%"
        data-label="${item.iso} · ${item.active ? "estudou" : "sem registro"}"
      ></div>
    `).join("");
  }

  const evidence=[];

  if(conversationExpected) {
    evidence.push([
      "Conversa",
      `${conversationCompleted} conversa(s) concluída(s); ${conversationAnswers}/${conversationExpected} respostas registradas.`
    ]);
  }

  if(readingDays.length) {
    evidence.push([
      "Leitura",
      `${readingDays.length} leitura(s) concluída(s) no histórico atual.`
    ]);
  }

  evidence.push([
    "Consistência",
    expectedDates.length
      ? `${completedExpected} de ${expectedDates.length} dias previstos cumpridos.`
      : `${activeDays} dias com evidência de estudo.`
  ]);

  const evidenceList=document.querySelector("#english-evidence-list");

  if(evidenceList) {
    evidenceList.innerHTML=evidence.map(([title,text])=>`
      <div class="english-evidence-item">
        <i></i>
        <div>
          <strong>${title}</strong>
          <span>${text}</span>
        </div>
      </div>
    `).join("");
  }
})();
