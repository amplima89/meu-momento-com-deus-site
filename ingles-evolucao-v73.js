"use strict";

(async () => {
  const db = window.MMCDSupabase;
  const session = await window.MMCDAuth.requireSession();
  const user = session.user;
  const SUMMARY_KEY = "ingles_evolucao_v1";

  async function readKey(chave) {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", user.id)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw error;
    return data?.valor && typeof data.valor === "object" ? data.valor : {};
  }

  const [producoes, estruturas, series, conversas] = await Promise.all([
    readKey("ingles_producoes_v1"),
    readKey("ingles_estruturas_v1"),
    readKey("historico_series_ingles_v1"),
    readKey("ingles_conversas_v1")
  ]);

  let appData = null;
  try { appData = await window.MMCD?.carregar?.(); }
  catch (error) { console.warn("Evolução do inglês: rotina configurada indisponível.", error); }

  const clamp = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const percentage = (a, b) => b ? Math.round(a * 100 / b) : null;
  const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const numeric = (...values) => {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
    }
    return null;
  };
  const normalizeSentence = value => String(value || "")
    .toLocaleLowerCase("en-US")
    .replace(/[.!?]+$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  const normalizeLabel = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  const studyDates = new Set();
  const days = producoes?.dias && typeof producoes.dias === "object" ? producoes.dias : {};

  let writingTotal = 0;
  let writingValidated = 0;
  let writingReview = 0;
  let writingConfirmedErrors = 0;
  const readingScores = [];
  const speakingScores = [];
  let speakingAnalyses = 0;

  for (const [dataIso, day] of Object.entries(days)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) studyDates.add(dataIso);
    if (!day || typeof day !== "object") continue;

    const writing = day.escrita;
    if (writing?.analise && typeof writing.analise === "object") {
      const analysis = writing.analise;
      if (typeof analysis.correta === "boolean") {
        writingTotal += 1;
        if (analysis.correta) {
          writingValidated += 1;
        } else {
          const original = normalizeSentence(writing.texto || writing.rascunho || "");
          const corrected = normalizeSentence(analysis.textoCorrigido || "");
          const explicitlyConfirmed = analysis.erroConfirmado === true || analysis.penalizar === true;
          if (corrected && corrected === original) writingValidated += 1;
          else if (explicitlyConfirmed) writingConfirmedErrors += 1;
          else writingReview += 1;
        }
      }
    }

    const audios = day.audios && typeof day.audios === "object" ? day.audios : {};

    const reading = audios.leitura;
    if (reading?.analise && typeof reading.analise === "object") {
      const score = numeric(
        reading.analise.clarezaReconhecimento,
        reading.analise.clareza,
        reading.analise.score
      );
      if (score !== null) readingScores.push(score);
    }

    const speaking = audios.fala;
    if (speaking?.analise && typeof speaking.analise === "object") {
      speakingAnalyses += 1;
      const score = numeric(
        speaking.analise.score,
        speaking.analise.fluenciaScore,
        speaking.analise.naturalidadeScore,
        speaking.analise.clareza
      );
      if (score !== null) speakingScores.push(score);
    }
  }

  const grammarCounts = {};
  const structureItems = estruturas?.itens && typeof estruturas.itens === "object" ? estruturas.itens : {};
  for (const [dataIso, item] of Object.entries(structureItems)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) studyDates.add(dataIso);
    const raw = String(item?.grammar || item?.grammarFocus || item?.foco || "").trim();
    if (!raw) continue;
    const family = raw.replace(/\s+[—–-]\s+.+$/, "").trim();
    grammarCounts[family] = (grammarCounts[family] || 0) + 1;
  }

  let difficultLines = 0;
  let answeredLines = 0;
  const seriesItems = Array.isArray(series?.itens) ? series.itens : [];
  for (const item of seriesItems) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(item?.data || ""))) studyDates.add(String(item.data));
    const lineAnswers = Array.isArray(item?.dificuldadeFalas) ? item.dificuldadeFalas : [];
    for (const record of lineAnswers) {
      const answer = String(record?.resposta || "").toLocaleLowerCase("pt-BR");
      if (answer !== "sim" && answer !== "nao") continue;
      answeredLines += 1;
      if (answer === "sim") difficultLines += 1;
    }
  }

  let conversationAnswers = 0;
  let conversationExpected = 0;
  let conversationCompleted = 0;
  let conversationStage = 0;
  const conversationEvaluations = [];
  const conversationSessions = Array.isArray(conversas?.sessions) ? conversas.sessions : [];
  for (const item of conversationSessions) {
    const dateIso = String(item?.date || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) studyDates.add(dateIso);
    const stage = Math.max(1, Math.min(4, Number(item?.stage || 1)));
    conversationStage = Math.max(conversationStage, stage);
    const expected = stage === 1 ? 3 : 4;
    const answers = Array.isArray(item?.answers)
      ? item.answers.filter(answer => String(answer?.text || "").trim())
      : [];
    conversationAnswers += Math.min(expected, answers.length);
    conversationExpected += expected;
    if (item?.completed) conversationCompleted += 1;
    const evaluated = Number(item?.evaluation?.overall);
    if (Number.isFinite(evaluated) && evaluated >= 0 && evaluated <= 100) conversationEvaluations.push(evaluated);
  }

  const writingDenominator = writingValidated + writingConfirmedErrors;
  const writingScore = writingDenominator ? percentage(writingValidated, writingDenominator) : null;
  const readingScore = average(readingScores);
  const speakingScore = average(speakingScores);
  const conversationScore = conversationEvaluations.length
    ? average(conversationEvaluations)
    : (conversationExpected ? percentage(conversationAnswers, conversationExpected) : null);
  const listeningScore = answeredLines ? percentage(answeredLines - difficultLines, answeredLines) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isoLocal = date => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const last30 = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = isoLocal(d);
    last30.push({ iso, active: studyDates.has(iso) });
  }
  const activeDays = last30.filter(item => item.active).length;

  const studySorted = [...studyDates].filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
  const firstStudy = studySorted[0] || isoLocal(today);
  const thirtyStart = isoLocal(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29));
  const periodStart = firstStudy > thirtyStart ? firstStudy : thirtyStart;
  const englishMetaIds = new Set((appData?.metas || []).filter(meta => {
    const label = normalizeLabel(`${meta?.nome || ""} ${meta?.categoria || ""}`);
    return meta?.ativa !== false && (label.includes("ingles") || label.includes("english"));
  }).map(meta => String(meta.id)));

  const expectedDates = [];
  const cursor = new Date(`${periodStart}T12:00:00`);
  while (cursor <= today) {
    const iso = isoLocal(cursor);
    let expected = true;
    if (englishMetaIds.size && window.MMCD?.metasNaData) {
      const activeMetas = window.MMCD.metasNaData(appData, iso) || [];
      expected = activeMetas.some(meta => englishMetaIds.has(String(meta.id)));
    }
    if (expected) expectedDates.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }
  const completedExpected = expectedDates.filter(iso => studyDates.has(iso)).length;
  const consistencyScore = expectedDates.length ? percentage(completedExpected, expectedDates.length) : (activeDays ? 100 : 0);

  const skills = {
    reading: { label: "Leitura", score: readingScore, samples: readingScores.length,
      detail: readingScores.length ? `${readingScores.length} gravação(ões) analisada(s)` : "sem gravação analisada" },
    writing: { label: "Escrita", score: writingScore, samples: writingTotal,
      detail: writingTotal
        ? `${writingValidated} validada(s) · ${writingReview} para revisar${writingConfirmedErrors ? ` · ${writingConfirmedErrors} erro(s) confirmado(s)` : ""}`
        : "sem produção corrigida" },
    speaking: { label: "Fala", score: speakingScore, samples: speakingAnalyses,
      detail: speakingAnalyses
        ? (speakingScores.length ? `${speakingAnalyses} análise(s) com indicador numérico` : `${speakingAnalyses} análise(s), ainda sem nota numérica`)
        : "sem fala analisada" },
    conversation: { label: "Conversação", score: conversationScore, samples: conversationSessions.length,
      detail: conversationExpected
        ? (conversationEvaluations.length
          ? `${conversationEvaluations.length} conversa(s) avaliada(s) · média ${clamp(conversationScore)}% · estágio ${conversationStage || 1}`
          : `${conversationAnswers}/${conversationExpected} respostas · ${conversationCompleted} conversa(s) concluída(s) · aguardando avaliação`)
        : "sem conversa registrada" },
    listening: { label: "Compreensão em cenas", score: listeningScore, samples: answeredLines,
      detail: answeredLines ? `${difficultLines}/${answeredLines} falas marcadas como difíceis` : "sem falas avaliadas" },
    consistency: { label: "Consistência", score: consistencyScore, samples: completedExpected,
      detail: expectedDates.length ? `${completedExpected}/${expectedDates.length} dias previstos cumpridos no período atual` : "sem dias previstos no período" }
  };

  const adaptiveSkills = Object.values(skills)
    .filter(item => item !== skills.consistency && item.score !== null && Number.isFinite(item.score));
  const overallEvidence = adaptiveSkills.length
    ? clamp(adaptiveSkills.reduce((sum, item) => sum + item.score, 0) / adaptiveSkills.length)
    : null;
  const weakest = [...adaptiveSkills].sort((a, b) => a.score - b.score)[0] || null;

  let decision = "CONTINUAR";
  if (weakest && weakest.score < 60) decision = "REVISAR";
  else if (adaptiveSkills.length >= 4 && adaptiveSkills.every(item => item.score >= 80)) decision = "AVANÇAR";

  const priority = weakest?.label || "Coletar mais evidências";
  const reason = weakest
    ? `${priority} é hoje a menor evidência mensurável (${clamp(weakest.score)}%). A próxima aula deve reforçar essa habilidade sem abandonar a família gramatical vigente.`
    : "Ainda não há evidências suficientes para mudar a ênfase da aula com segurança.";

  const latest = [...studyDates].sort().pop() || "";
  const summary = {
    schemaVersion: 3,
    atualizadoEm: new Date().toISOString(),
    overall: overallEvidence,
    decision,
    priority,
    reason,
    studyDays30: activeDays,
    studyDaysExpected: expectedDates.length,
    studyDaysCompletedExpected: completedExpected,
    latestActivity: latest,
    skills: Object.fromEntries(Object.entries(skills).map(([key, item]) => [key, {
      score: item.score === null ? null : clamp(item.score),
      samples: item.samples,
      detail: item.detail
    }])),
    grammarCounts
  };

  // Persistir o resumo é útil, mas uma falha de gravação não pode derrubar o relatório visual.
  try {
    const { error: summaryError } = await db.from("configuracoes_usuario").upsert({
      user_id: user.id,
      chave: SUMMARY_KEY,
      valor: summary
    }, { onConflict: "user_id,chave" });
    if (summaryError) throw summaryError;
  } catch (summaryError) {
    console.warn("Evolução do inglês: não foi possível salvar o resumo, mas o relatório continuará visível.", summaryError);
  }

  document.querySelector("#english-overall-ring")?.style.setProperty("--progress", String(overallEvidence || 0));
  document.querySelector("#english-overall-score").textContent = overallEvidence === null ? "—" : `${overallEvidence}%`;
  document.querySelector("#english-overall-title").textContent = overallEvidence === null
    ? "Construindo sua linha de base"
    : overallEvidence >= 80 ? "Evidências fortes em várias habilidades"
    : overallEvidence >= 65 ? "Evolução consistente, com pontos claros para fortalecer"
    : "Algumas habilidades precisam de reforço";
  const overallText = document.querySelector("#english-overall-text");
  if (overallText) overallText.textContent =
    "Este índice resume evidências registradas no Memory; não é uma nota de fluência nem uma classificação CEFR.";
  document.querySelector("#english-study-days").textContent = expectedDates.length
    ? `${completedExpected}/${expectedDates.length} dias previstos cumpridos`
    : `${activeDays} dia${activeDays === 1 ? "" : "s"} com estudo`;
  document.querySelector("#english-last-activity").textContent =
    `Última atividade: ${latest ? latest.split("-").reverse().join("/") : "—"}`;
  document.querySelector("#english-next-focus-title").textContent = priority;
  document.querySelector("#english-next-focus-text").textContent = reason;
  document.querySelector("#english-adaptive-decision").textContent = decision;

  for (const [key, item] of Object.entries(skills)) {
    const card = document.querySelector(`[data-skill="${key}"]`);
    if (!card) continue;
    const score = item.score === null ? null : clamp(item.score);
    card.querySelector("strong").textContent = score === null ? "—" : `${score}%`;
    card.querySelector("small").textContent = item.detail;
    card.querySelector("i").style.width = `${score || 0}%`;
  }

  document.querySelector("#english-trend-total").textContent = `${activeDays} dia${activeDays === 1 ? "" : "s"} com estudo`;
  document.querySelector("#english-trend-chart").innerHTML = last30.map((item, index) =>
    `<div class="english-trend-day ${item.active ? "active" : ""}" style="height:${item.active ? 64 + (index % 4) * 8 : 10}%" data-label="${item.iso} · ${item.active ? "estudou" : "sem registro"}"></div>`
  ).join("");

  const evidence = [];
  if (writingTotal) evidence.push(["Escrita", `${writingValidated} resposta(s) validada(s); ${writingReview} aguardando revisão para evitar penalizar alternativas corretas.`]);
  if (readingScores.length) evidence.push(["Leitura em voz alta", `${readingScores.length} gravação(ões), clareza média de reconhecimento ${clamp(readingScore)}%.`]);
  if (speakingAnalyses) evidence.push(["Fala", speakingScores.length
    ? `${speakingAnalyses} análise(s), indicador médio ${clamp(speakingScore)}%.`
    : `${speakingAnalyses} análise(s) concluída(s). O corretor atual ainda não grava uma nota numérica confiável para todas elas.`]);
  if (conversationExpected) evidence.push(["Conversação", conversationEvaluations.length
    ? `${conversationEvaluations.length} conversa(s) corrigida(s), média ${clamp(conversationScore)}%; ${conversationCompleted} concluída(s), estágio ${conversationStage || 1}.`
    : `${conversationAnswers}/${conversationExpected} respostas registradas; ${conversationCompleted} conversa(s) concluída(s), ainda sem correção.`]);
  if (answeredLines) evidence.push(["Séries", `${difficultLines} de ${answeredLines} falas respondidas foram marcadas como difíceis.`]);
  evidence.push(["Consistência", expectedDates.length ? `${completedExpected} de ${expectedDates.length} dias previstos cumpridos no período já transcorrido.` : `${activeDays} dias com evidência de estudo.`]);

  document.querySelector("#english-evidence-list").innerHTML = evidence.map(([title, text]) =>
    `<div class="english-evidence-item"><i></i><div><strong>${title}</strong><span>${text}</span></div></div>`
  ).join("");

  const grammarEntries = Object.entries(grammarCounts).sort((a, b) => b[1] - a[1]);
  const maxGrammar = Math.max(1, ...grammarEntries.map(item => item[1]));
  document.querySelector("#english-grammar-list").innerHTML = grammarEntries.length
    ? grammarEntries.map(([name, count]) =>
      `<div class="english-grammar-row"><div><strong>${name}</strong><span>${count} aula${count === 1 ? "" : "s"}</span></div><div><i style="width:${Math.round(count / maxGrammar * 100)}%"></i></div></div>`
    ).join("")
    : '<div class="english-evolution-empty">A trilha aparecerá conforme suas aulas forem registradas.</div>';
})().catch(error => {
  console.error("Evolução do inglês:", error);
  const title = document.querySelector("#english-overall-title");
  if (title && /Carregando/i.test(title.textContent || "")) title.textContent = "Não foi possível carregar o relatório";
  window.MMCDUI?.toast?.("Não foi possível atualizar todos os dados do relatório.", 3200);
});
