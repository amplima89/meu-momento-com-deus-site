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

  const [producoes, estruturas, revisao, series] = await Promise.all([
    readKey("ingles_producoes_v1"),
    readKey("ingles_estruturas_v1"),
    readKey("ingles_estruturas_revisao_v2"),
    readKey("historico_series_ingles_v1")
  ]);

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

  const studyDates = new Set();
  const days = producoes?.dias && typeof producoes.dias === "object" ? producoes.dias : {};

  let writingTotal = 0;
  let writingCorrect = 0;
  const readingScores = [];
  const speakingScores = [];
  let speakingAnalyses = 0;

  for (const [dataIso, day] of Object.entries(days)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) studyDates.add(dataIso);
    if (!day || typeof day !== "object") continue;

    const writing = day.escrita;
    if (writing?.analise && typeof writing.analise === "object") {
      if (typeof writing.analise.correta === "boolean") {
        writingTotal += 1;
        if (writing.analise.correta) writingCorrect += 1;
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

  let remembered = 0;
  let forgotten = 0;
  const reviewItems = revisao?.itens && typeof revisao.itens === "object" ? revisao.itens : {};
  for (const item of Object.values(reviewItems)) {
    const answers = item?.respostas && typeof item.respostas === "object" ? item.respostas : {};
    for (const [dateIso, answer] of Object.entries(answers)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) studyDates.add(dateIso);
      if (answer === "sim") remembered += 1;
      if (answer === "nao") forgotten += 1;
    }
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

  const writingScore = percentage(writingCorrect, writingTotal);
  const readingScore = average(readingScores);
  const speakingScore = average(speakingScores);
  const vocabularyScore = percentage(remembered, remembered + forgotten);
  const listeningScore = answeredLines ? percentage(answeredLines - difficultLines, answeredLines) : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last30 = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    last30.push({ iso, active: studyDates.has(iso) });
  }
  const activeDays = last30.filter(item => item.active).length;
  const consistencyScore = clamp(activeDays / 20 * 100);

  const skills = {
    reading: { label: "Leitura", score: readingScore, samples: readingScores.length,
      detail: readingScores.length ? `${readingScores.length} gravação(ões) analisada(s)` : "sem gravação analisada" },
    writing: { label: "Escrita", score: writingScore, samples: writingTotal,
      detail: writingTotal ? `${writingCorrect}/${writingTotal} produções estruturalmente corretas` : "sem produção corrigida" },
    speaking: { label: "Fala", score: speakingScore, samples: speakingAnalyses,
      detail: speakingAnalyses
        ? (speakingScores.length ? `${speakingAnalyses} análise(s) com indicador numérico` : `${speakingAnalyses} análise(s), ainda sem nota numérica`)
        : "sem fala analisada" },
    vocabulary: { label: "Vocabulário", score: vocabularyScore, samples: remembered + forgotten,
      detail: remembered + forgotten ? `${remembered} lembradas · ${forgotten} para reforçar` : "sem revisão respondida" },
    listening: { label: "Compreensão em cenas", score: listeningScore, samples: answeredLines,
      detail: answeredLines ? `${difficultLines}/${answeredLines} falas marcadas como difíceis` : "sem falas avaliadas" },
    consistency: { label: "Consistência", score: consistencyScore, samples: activeDays,
      detail: `${activeDays} dias com estudo nos últimos 30` }
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
    schemaVersion: 2,
    atualizadoEm: new Date().toISOString(),
    overall: overallEvidence,
    decision,
    priority,
    reason,
    studyDays30: activeDays,
    latestActivity: latest,
    skills: Object.fromEntries(Object.entries(skills).map(([key, item]) => [key, {
      score: item.score === null ? null : clamp(item.score),
      samples: item.samples,
      detail: item.detail
    }])),
    grammarCounts
  };

  await db.from("configuracoes_usuario").upsert({
    user_id: user.id,
    chave: SUMMARY_KEY,
    valor: summary
  }, { onConflict: "user_id,chave" });

  document.querySelector("#english-overall-ring")?.style.setProperty("--progress", String(overallEvidence || 0));
  document.querySelector("#english-overall-score").textContent = overallEvidence === null ? "—" : `${overallEvidence}%`;
  document.querySelector("#english-overall-title").textContent = overallEvidence === null
    ? "Construindo sua linha de base"
    : overallEvidence >= 80 ? "Evidências fortes em várias habilidades"
    : overallEvidence >= 65 ? "Evolução consistente, com pontos claros para fortalecer"
    : "Algumas habilidades precisam de reforço";
  document.querySelector("#english-overall-text").textContent =
    "Este índice resume evidências registradas no Life Style; não é uma nota de fluência nem uma classificação CEFR.";
  document.querySelector("#english-study-days").textContent =
    `${activeDays} dia${activeDays === 1 ? "" : "s"} estudado${activeDays === 1 ? "" : "s"} nos últimos 30`;
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
  if (writingTotal) evidence.push(["Escrita", `${writingCorrect}/${writingTotal} produções corrigidas como estruturalmente corretas.`]);
  if (readingScores.length) evidence.push(["Leitura em voz alta", `${readingScores.length} gravação(ões), clareza média de reconhecimento ${clamp(readingScore)}%.`]);
  if (speakingAnalyses) evidence.push(["Fala", speakingScores.length
    ? `${speakingAnalyses} análise(s), indicador médio ${clamp(speakingScore)}%.`
    : `${speakingAnalyses} análise(s) concluída(s). O corretor atual ainda não grava uma nota numérica confiável para todas elas.`]);
  if (remembered + forgotten) evidence.push(["Memória ativa", `${remembered} lembradas e ${forgotten} para reforçar.`]);
  if (answeredLines) evidence.push(["Séries", `${difficultLines} de ${answeredLines} falas respondidas foram marcadas como difíceis.`]);
  evidence.push(["Consistência", `${activeDays} dias com evidência de estudo nos últimos 30.`]);

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
  console.error(error);
  const title = document.querySelector("#english-overall-title");
  if (title) title.textContent = "Não foi possível carregar o relatório";
});
