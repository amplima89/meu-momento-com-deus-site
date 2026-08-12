"use strict";

(async () => {
  const db = window.MMCDSupabase;
  const session = await window.MMCDAuth.requireSession();
  const user = session.user;

  async function readKey(chave) {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", user.id)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw error;
    return data?.valor || {};
  }

  const [producoes, estruturas, revisao1, revisao2, series] = await Promise.all([
    readKey("ingles_producoes_v1"),
    readKey("ingles_estruturas_v1"),
    readKey("ingles_estruturas_revisao_v2"),
    readKey("revisao_ingles_v2"),
    readKey("historico_series_ingles_v1")
  ]);

  function walk(value, fn) {
    if (!value || typeof value !== "object") return;
    fn(value);
    if (Array.isArray(value)) value.forEach(item => walk(item, fn));
    else Object.values(value).forEach(item => walk(item, fn));
  }

  const studyDates = new Set();
  [producoes, estruturas, revisao1, revisao2, series].forEach(root => {
    walk(root, node => {
      Object.keys(node).forEach(key => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) studyDates.add(key);
      });
    });
  });

  let writingTotal = 0;
  let writingCorrect = 0;
  const readingScores = [];
  const speakingScores = [];

  walk(producoes, node => {
    const analysis = node?.analise;
    if (!analysis || typeof analysis !== "object") return;
    const type = String(node.tipo || analysis.tipo || "").toLowerCase();

    if ((type === "escrita" || Object.prototype.hasOwnProperty.call(node, "texto")) && typeof analysis.correta === "boolean") {
      writingTotal += 1;
      if (analysis.correta) writingCorrect += 1;
    }

    const clarity = Number(node.clareza ?? analysis.clareza ?? analysis.clarezaReconhecimento ?? analysis.score);
    if (Number.isFinite(clarity) && clarity >= 0 && clarity <= 100) {
      if (type === "leitura") readingScores.push(clarity);
      if (type === "fala" || type === "cena") speakingScores.push(clarity);
    }
  });

  let remembered = 0;
  let forgotten = 0;
  [revisao1, revisao2].forEach(root => {
    walk(root, node => {
      if (!node?.respostas || typeof node.respostas !== "object") return;
      Object.values(node.respostas).forEach(value => {
        if (value === "sim") remembered += 1;
        if (value === "nao") forgotten += 1;
      });
    });
  });

  let difficultLines = 0;
  let totalLines = 0;
  walk(series, node => {
    if (!node?.dificuldadeFalas || typeof node.dificuldadeFalas !== "object") return;
    Object.values(node.dificuldadeFalas).forEach(value => {
      totalLines += 1;
      if (value === true || value?.dificuldade === true || value?.valor === "sim") difficultLines += 1;
    });
  });

  const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const percentage = (a, b) => b ? Math.round(a * 100 / b) : null;
  const clamp = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

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

  const skills = {
    reading: { label: "Leitura", score: average(readingScores), samples: readingScores.length },
    writing: { label: "Escrita", score: percentage(writingCorrect, writingTotal), samples: writingTotal },
    speaking: { label: "Fala", score: average(speakingScores), samples: speakingScores.length },
    vocabulary: { label: "Vocabulário", score: percentage(remembered, remembered + forgotten), samples: remembered + forgotten },
    listening: { label: "Compreensão em cenas", score: totalLines ? percentage(totalLines - difficultLines, totalLines) : null, samples: totalLines },
    consistency: { label: "Consistência", score: clamp(activeDays / 20 * 100), samples: activeDays }
  };

  const measured = Object.values(skills).filter(item => item.score !== null && Number.isFinite(item.score));
  const overall = measured.length ? clamp(measured.reduce((sum, item) => sum + item.score, 0) / measured.length) : null;
  const weakest = [...measured].sort((a, b) => a.score - b.score)[0] || null;

  let decision = "CONTINUAR";
  if (weakest && weakest.score < 60) decision = "REVISAR";
  else if (measured.length >= 4 && measured.every(item => item.score >= 80)) decision = "AVANÇAR";

  const priority = weakest?.label || "Coletar mais evidências";
  const reason = weakest
    ? `${priority} é a habilidade com menor evidência (${clamp(weakest.score)}%). A próxima aula deve reforçar isso sem abandonar a família gramatical vigente.`
    : "Ainda não há dados suficientes para uma adaptação confiável.";

  const grammarCounts = {};
  walk(estruturas, node => {
    [node?.grammar, node?.grammarFocus, node?.foco, node?.conceito, node?.familia].forEach(raw => {
      const text = String(raw || "").trim();
      if (!text || text.length >= 70) return;
      const family = text.split("—")[0].trim();
      grammarCounts[family] = (grammarCounts[family] || 0) + 1;
    });
  });

  const latest = [...studyDates].sort().pop() || "";
  const summary = {
    schemaVersion: 1,
    atualizadoEm: new Date().toISOString(),
    overall,
    decision,
    priority,
    reason,
    studyDays30: activeDays,
    latestActivity: latest,
    skills: Object.fromEntries(Object.entries(skills).map(([key, item]) => [key, {
      score: item.score === null ? null : clamp(item.score),
      samples: item.samples
    }])),
    grammarCounts
  };

  await db.from("configuracoes_usuario").upsert({
    user_id: user.id,
    chave: "ingles_evolucao_v1",
    valor: summary
  }, { onConflict: "user_id,chave" });

  document.querySelector("#english-overall-ring")?.style.setProperty("--progress", String(overall || 0));
  document.querySelector("#english-overall-score").textContent = overall === null ? "—" : `${overall}%`;
  document.querySelector("#english-overall-title").textContent = overall === null
    ? "Construindo sua linha de base"
    : overall >= 80
      ? "Base consistente e pronta para mais desafio"
      : overall >= 65
        ? "Evolução consistente, com pontos claros para fortalecer"
        : "Algumas habilidades precisam de reforço";
  document.querySelector("#english-study-days").textContent = `${activeDays} dias estudados nos últimos 30`;
  document.querySelector("#english-last-activity").textContent = `Última atividade: ${latest ? latest.split("-").reverse().join("/") : "—"}`;
  document.querySelector("#english-next-focus-title").textContent = priority;
  document.querySelector("#english-next-focus-text").textContent = reason;
  document.querySelector("#english-adaptive-decision").textContent = decision;

  for (const [key, item] of Object.entries(skills)) {
    const card = document.querySelector(`[data-skill="${key}"]`);
    if (!card) continue;
    const score = item.score === null ? null : clamp(item.score);
    card.querySelector("strong").textContent = score === null ? "—" : `${score}%`;
    card.querySelector("small").textContent = item.samples ? `${item.samples} evidência(s) registrada(s)` : "sem evidência suficiente";
    card.querySelector("i").style.width = `${score || 0}%`;
  }

  document.querySelector("#english-trend-total").textContent = `${activeDays} dias com estudo`;
  document.querySelector("#english-trend-chart").innerHTML = last30.map((item, index) =>
    `<div class="english-trend-day ${item.active ? "active" : ""}" style="height:${item.active ? 65 + (index % 4) * 8 : 10}%" title="${item.iso}"></div>`
  ).join("");

  const evidence = [];
  if (writingTotal) evidence.push(["Escrita", `${writingCorrect}/${writingTotal} produções corrigidas como estruturalmente corretas.`]);
  if (readingScores.length) evidence.push(["Leitura em voz alta", `${readingScores.length} gravação(ões), clareza média estimada ${clamp(average(readingScores))}%.`]);
  if (speakingScores.length) evidence.push(["Fala", `${speakingScores.length} gravação(ões), média estimada ${clamp(average(speakingScores))}%.`]);
  if (remembered + forgotten) evidence.push(["Memória ativa", `${remembered} lembradas e ${forgotten} para reforçar.`]);
  if (totalLines) evidence.push(["Séries", `${difficultLines} de ${totalLines} falas marcadas como difíceis.`]);
  evidence.push(["Consistência", `${activeDays} dias com evidência de estudo nos últimos 30.`]);

  document.querySelector("#english-evidence-list").innerHTML = evidence.map(([title, text]) =>
    `<div class="english-evidence-item"><i></i><div><strong>${title}</strong><span>${text}</span></div></div>`
  ).join("");

  const grammarEntries = Object.entries(grammarCounts).sort((a, b) => b[1] - a[1]);
  const maxGrammar = Math.max(1, ...grammarEntries.map(item => item[1]));
  document.querySelector("#english-grammar-list").innerHTML = grammarEntries.length
    ? grammarEntries.map(([name, count]) =>
      `<div class="english-grammar-row"><div><strong>${name}</strong><span>${count} aula(s)</span></div><div><i style="width:${Math.round(count / maxGrammar * 100)}%"></i></div></div>`
    ).join("")
    : '<div class="english-evolution-empty">A trilha aparecerá conforme suas aulas forem registradas.</div>';
})().catch(error => {
  console.error(error);
  const title = document.querySelector("#english-overall-title");
  if (title) title.textContent = "Não foi possível carregar o relatório";
});
