"use strict";

(async () => {
  const data = await MMCD.carregar();

  const $ = selector => document.querySelector(selector);
  const pad = value => String(value).padStart(2, "0");
  const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseDate = value => new Date(`${value}T12:00:00`);
  const addDays = (date, amount) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + amount);
    return copy;
  };
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const todayDate = new Date();
  todayDate.setHours(12, 0, 0, 0);
  const today = iso(todayDate);

  const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
  const longDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" });
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

  function dateRange(start, end) {
    const dates = [];
    for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
      dates.push(iso(cursor));
    }
    return dates;
  }

  function lastDays(amount, end = todayDate) {
    return dateRange(addDays(end, -(amount - 1)), end);
  }

  function record(date, activityId) {
    return MMCD.registro(data, date, activityId);
  }

  function dueOn(date) {
    return MMCD.metasNaData(data, date);
  }

  function analyze(dates) {
    const byActivity = new Map();
    const byCategory = new Map();
    const byDay = [];
    let planned = 0;
    let completed = 0;
    let missed = 0;
    let pendingToday = 0;
    let evaluated = 0;

    for (const date of dates) {
      const due = dueOn(date);
      let dayCompleted = 0;
      let dayMissed = 0;
      let dayPending = 0;

      for (const activity of due) {
        const done = !!record(date, activity.id)?.concluida;
        const isTodayPending = date === today && !done;

        planned += 1;
        if (done) {
          completed += 1;
          evaluated += 1;
          dayCompleted += 1;
        } else if (isTodayPending) {
          pendingToday += 1;
          dayPending += 1;
        } else {
          missed += 1;
          evaluated += 1;
          dayMissed += 1;
        }

        if (!byActivity.has(activity.id)) {
          byActivity.set(activity.id, {
            id: activity.id,
            name: activity.nome || "Atividade",
            category: activity.categoria || "Sem categoria",
            icon: activity.icone || "✓",
            due: 0,
            evaluated: 0,
            completed: 0,
            missed: 0,
            pendingToday: 0
          });
        }
        const activityStats = byActivity.get(activity.id);
        activityStats.due += 1;
        if (done) {
          activityStats.completed += 1;
          activityStats.evaluated += 1;
        } else if (isTodayPending) {
          activityStats.pendingToday += 1;
        } else {
          activityStats.missed += 1;
          activityStats.evaluated += 1;
        }

        const categoryName = activity.categoria || "Sem categoria";
        if (!byCategory.has(categoryName)) {
          byCategory.set(categoryName, { name: categoryName, evaluated: 0, completed: 0, missed: 0 });
        }
        const categoryStats = byCategory.get(categoryName);
        if (done) {
          categoryStats.completed += 1;
          categoryStats.evaluated += 1;
        } else if (!isTodayPending) {
          categoryStats.missed += 1;
          categoryStats.evaluated += 1;
        }
      }

      const dayEvaluated = dayCompleted + dayMissed;
      byDay.push({
        date,
        due: due.length,
        completed: dayCompleted,
        missed: dayMissed,
        pendingToday: dayPending,
        evaluated: dayEvaluated,
        rate: dayEvaluated ? Math.round((dayCompleted / dayEvaluated) * 100) : null
      });
    }

    const activities = [...byActivity.values()].map(item => ({
      ...item,
      rate: item.evaluated ? Math.round((item.completed / item.evaluated) * 100) : null
    }));
    const categories = [...byCategory.values()].map(item => ({
      ...item,
      rate: item.evaluated ? Math.round((item.completed / item.evaluated) * 100) : null
    }));

    return {
      dates,
      planned,
      completed,
      missed,
      pendingToday,
      evaluated,
      rate: evaluated ? Math.round((completed / evaluated) * 100) : null,
      activities,
      categories,
      days: byDay,
      fullDays: byDay.filter(day => day.evaluated > 0 && day.missed === 0).length,
      activeDays: byDay.filter(day => day.due > 0).length
    };
  }

  function level(rate) {
    if (rate == null) return { label: "Sem base", key: "medium" };
    if (rate >= 85) return { label: "Muito consistente", key: "high" };
    if (rate >= 70) return { label: "Boa semana", key: "high" };
    if (rate >= 50) return { label: "Semana irregular", key: "medium" };
    return { label: "Atenção necessária", key: "low" };
  }

  function formatPeriod(dates) {
    if (!dates.length) return "Sem período";
    return `${shortDate.format(parseDate(dates[0]))} a ${shortDate.format(parseDate(dates.at(-1)))}`;
  }

  function sortedBest(items) {
    return [...items]
      .filter(item => item.evaluated > 0)
      .sort((a, b) => (b.rate - a.rate) || (b.evaluated - a.evaluated) || a.name.localeCompare(b.name, "pt-BR"));
  }

  function sortedWeak(items) {
    return [...items]
      .filter(item => item.evaluated > 0)
      .sort((a, b) => (b.missed - a.missed) || (a.rate - b.rate) || (b.evaluated - a.evaluated));
  }

  function listHtml(items, emptyMessage) {
    if (!items.length) return `<div class="insight-empty">${escapeHtml(emptyMessage)}</div>`;
    return items.map(item => `<div class="insight-item">${item}</div>`).join("");
  }

  function renderKpis(weekly) {
    const rateText = weekly.rate == null ? "—" : `${weekly.rate}%`;
    $("#activity-kpis").innerHTML = `
      <article class="card activity-kpi">
        <span>Atividades previstas</span>
        <strong>${weekly.planned}</strong>
        <small>Distribuídas em ${weekly.activeDays} dia${weekly.activeDays === 1 ? "" : "s"} com programação.</small>
      </article>
      <article class="card activity-kpi">
        <span>Concluídas</span>
        <strong>${weekly.completed}</strong>
        <small>${weekly.missed} negligenciada${weekly.missed === 1 ? "" : "s"} em dias já encerrados.</small>
      </article>
      <article class="card activity-kpi">
        <span>Taxa de conclusão</span>
        <strong>${rateText}</strong>
        <small>Calculada sobre ${weekly.evaluated} oportunidade${weekly.evaluated === 1 ? "" : "s"} já avaliadas.</small>
      </article>
      <article class="card activity-kpi">
        <span>Dias completos</span>
        <strong>${weekly.fullDays}</strong>
        <small>${weekly.pendingToday ? `${weekly.pendingToday} atividade${weekly.pendingToday === 1 ? "" : "s"} ainda pendente${weekly.pendingToday === 1 ? "" : "s"} hoje.` : "Nenhuma pendência aberta para hoje."}</small>
      </article>`;
  }

  function renderWeeklySummary(weekly, previousWeekly) {
    const status = level(weekly.rate);
    const badge = $("#weekly-status-badge");
    badge.textContent = status.label;
    badge.dataset.level = status.key;

    if (!weekly.evaluated) {
      $("#weekly-summary").classList.remove("loading-copy");
      $("#weekly-summary").innerHTML = `
        <p>Ainda não há oportunidades encerradas suficientes para avaliar a semana. Marque as atividades na página <strong>Atividades</strong> e a análise será construída automaticamente.</p>`;
      return;
    }

    const previousRate = previousWeekly.rate;
    let comparison = "";
    if (previousRate != null) {
      const delta = weekly.rate - previousRate;
      if (Math.abs(delta) < 3) {
        comparison = `O desempenho ficou praticamente estável em relação aos 7 dias anteriores, que registraram ${previousRate}%.`;
      } else if (delta > 0) {
        comparison = `Houve evolução de ${delta} ponto${delta === 1 ? "" : "s"} percentual${delta === 1 ? "" : "is"} em relação aos 7 dias anteriores.`;
      } else {
        comparison = `A taxa caiu ${Math.abs(delta)} ponto${Math.abs(delta) === 1 ? "" : "s"} percentual${Math.abs(delta) === 1 ? "" : "is"} em relação aos 7 dias anteriores.`;
      }
    }

    const pastDays = weekly.days.filter(day => day.date < today && day.evaluated > 0);
    const bestDay = [...pastDays].sort((a, b) => (b.rate - a.rate) || (b.evaluated - a.evaluated))[0];
    const worstDay = [...pastDays].sort((a, b) => (a.rate - b.rate) || (b.evaluated - a.evaluated))[0];
    let daySentence = "";
    if (bestDay && worstDay && bestDay.date !== worstDay.date) {
      daySentence = `Seu melhor dia foi <strong>${weekday.format(parseDate(bestDay.date))}</strong>, com ${bestDay.rate}% de conclusão. O dia de maior fragilidade foi <strong>${weekday.format(parseDate(worstDay.date))}</strong>, com ${worstDay.rate}%.`;
    } else if (bestDay) {
      daySentence = `O principal registro diário foi <strong>${weekday.format(parseDate(bestDay.date))}</strong>, com ${bestDay.rate}% de conclusão.`;
    }

    $("#weekly-summary").classList.remove("loading-copy");
    $("#weekly-summary").innerHTML = `
      <p>Nos últimos 7 dias, você concluiu <strong>${weekly.completed} de ${weekly.evaluated} atividades já avaliadas</strong>, atingindo <strong>${weekly.rate}%</strong> de conclusão. Foram ${weekly.fullDays} dia${weekly.fullDays === 1 ? "" : "s"} sem nenhuma falha entre as atividades encerradas.</p>
      ${comparison ? `<p>${comparison}</p>` : ""}
      ${daySentence ? `<p>${daySentence}</p>` : ""}
      ${weekly.pendingToday ? `<p>Hoje ainda existem <strong>${weekly.pendingToday} atividade${weekly.pendingToday === 1 ? "" : "s"} em aberto</strong>. Elas não foram tratadas como negligência nesta análise.</p>` : ""}`;
  }

  function renderStrengths(weekly) {
    const bestActivities = sortedBest(weekly.activities);
    const bestCategories = sortedBest(weekly.categories);
    const insights = [];

    const reliable = bestActivities.find(item => item.evaluated >= 2 && item.rate >= 70);
    if (reliable) {
      insights.push(`<strong>${escapeHtml(reliable.name)}</strong> foi sua atividade mais consistente: ${reliable.completed} de ${reliable.evaluated} oportunidades concluídas (${reliable.rate}%).`);
    }

    const bestCategory = bestCategories.find(item => item.evaluated >= 2 && item.rate >= 70);
    if (bestCategory && (!reliable || bestCategory.name !== reliable.category)) {
      insights.push(`A categoria <strong>${escapeHtml(bestCategory.name)}</strong> apresentou o melhor equilíbrio da semana, com ${bestCategory.rate}% de conclusão.`);
    }

    if (weekly.fullDays > 0) {
      insights.push(`Você fechou <strong>${weekly.fullDays} dia${weekly.fullDays === 1 ? "" : "s"} completo${weekly.fullDays === 1 ? "" : "s"}</strong>, sem deixar atividade programada para trás.`);
    }

    if (weekly.rate >= 70) {
      insights.push(`A taxa geral de <strong>${weekly.rate}%</strong> mostra que a maior parte do que foi planejado virou execução real.`);
    }

    $("#weekly-strengths").innerHTML = listHtml(
      insights.slice(0, 4),
      "Ainda não há um ponto forte recorrente comprovado. A base precisa de mais dias marcados."
    );
  }

  function renderWeaknesses(weekly) {
    const weakActivities = sortedWeak(weekly.activities);
    const weakCategories = sortedWeak(weekly.categories);
    const insights = [];

    const neglected = weakActivities.find(item => item.missed > 0);
    if (neglected) {
      insights.push(`<strong>${escapeHtml(neglected.name)}</strong> foi a principal negligência: ficou pendente em ${neglected.missed} de ${neglected.evaluated} oportunidades encerradas.`);
    }

    const repeated = weakActivities.find(item => item.missed >= 2 && (!neglected || item.id !== neglected.id));
    if (repeated) {
      insights.push(`Também houve repetição de falha em <strong>${escapeHtml(repeated.name)}</strong>, não concluída ${repeated.missed} vezes.`);
    }

    const weakCategory = weakCategories.find(item => item.missed >= 2);
    if (weakCategory && (!neglected || weakCategory.name !== neglected.category)) {
      insights.push(`A categoria <strong>${escapeHtml(weakCategory.name)}</strong> concentrou ${weakCategory.missed} falha${weakCategory.missed === 1 ? "" : "s"} e merece revisão de prioridade.`);
    }

    const pastDays = weekly.days.filter(day => day.date < today && day.evaluated > 0);
    const weakDay = [...pastDays].sort((a, b) => (a.rate - b.rate) || (b.evaluated - a.evaluated))[0];
    if (weakDay && weakDay.rate < 70) {
      insights.push(`<strong>${weekday.format(parseDate(weakDay.date))}</strong> foi o dia mais frágil, com ${weakDay.missed} atividade${weakDay.missed === 1 ? "" : "s"} não concluída${weakDay.missed === 1 ? "" : "s"}.`);
    }

    $("#weekly-weaknesses").innerHTML = listHtml(
      insights.slice(0, 4),
      "Nenhuma negligência recorrente foi identificada nos dias já encerrados."
    );
  }

  function renderActivityPerformance(weekly) {
    const rows = [...weekly.activities]
      .filter(item => item.evaluated > 0 || item.pendingToday > 0)
      .sort((a, b) => (b.missed - a.missed) || ((a.rate ?? 101) - (b.rate ?? 101)) || a.name.localeCompare(b.name, "pt-BR"));

    const badge = $("#evidence-summary-badge");
    if (badge) {
      badge.textContent = `${rows.length} atividade${rows.length === 1 ? "" : "s"}`;
      badge.dataset.level = weekly.rate != null && weekly.rate >= 70
        ? "high"
        : weekly.rate != null && weekly.rate < 50
          ? "low"
          : "medium";
    }

    if (!rows.length) {
      $("#activity-performance").innerHTML = `<div class="activity-performance-empty">Nenhuma atividade programada foi encontrada no período.</div>`;
      return;
    }

    $("#activity-performance").innerHTML = rows.map(item => {
      const rate = item.rate ?? 0;
      const rateLabel = item.rate == null ? "Ainda não avaliada" : `${item.rate}% concluído`;
      return `
        <div class="activity-row">
          <div class="activity-row__name">
            <strong>${escapeHtml(item.icon)} ${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(item.category)}</small>
          </div>
          <div class="activity-row__metric"><span>Previstas</span><strong>${item.due}</strong></div>
          <div class="activity-row__metric"><span>Concluídas</span><strong>${item.completed}</strong></div>
          <div class="activity-row__metric"><span>Negligenciadas</span><strong>${item.missed}</strong></div>
          <div class="activity-row__rate">
            <div><i style="width:${Math.max(0, Math.min(100, rate))}%"></i></div>
            <span>${rateLabel}${item.pendingToday ? ` · ${item.pendingToday} pendente hoje` : ""}</span>
          </div>
        </div>`;
    }).join("");
  }

  function nextScheduledDate(activity) {
    for (let offset = 0; offset <= 7; offset += 1) {
      const date = iso(addDays(todayDate, offset));
      if (MMCD.ativaNaData(activity, date)) return date;
    }
    return null;
  }

  function renderFocus(weekly) {
    const neglected = sortedWeak(weekly.activities).find(item => item.missed > 0);
    if (!neglected) {
      $("#next-focus").innerHTML = `
        <div class="focus-primary">
          <strong>Preserve o que já está funcionando</strong>
          <p>Não há uma negligência recorrente comprovada. O foco é repetir a organização que permitiu concluir ${weekly.rate ?? 0}% das oportunidades avaliadas.</p>
        </div>
        <ul class="focus-action">
          <li>Mantenha a marcação diária no momento em que a atividade for concluída.</li>
          <li>Evite aumentar a quantidade de atividades antes de consolidar a semana atual.</li>
        </ul>`;
      return;
    }

    const meta = data.metas.find(item => item.id === neglected.id);
    const nextDate = meta ? nextScheduledDate(meta) : null;
    $("#next-focus").innerHTML = `
      <div class="focus-primary">
        <strong>Prioridade: ${escapeHtml(neglected.name)}</strong>
        <p>Essa foi a atividade mais negligenciada da semana. O objetivo não é compensar tudo de uma vez, mas impedir uma nova falha na próxima oportunidade${nextDate ? `, em ${longDate.format(parseDate(nextDate))}` : ""}.</p>
      </div>
      <ul class="focus-action">
        <li>Defina antecipadamente o horário mínimo para executar essa atividade.</li>
        <li>Reduza a tarefa para uma versão pequena, mas concluível, nos dias de menor energia.</li>
        <li>Marque no Life Style imediatamente após concluir para não perder o registro.</li>
      </ul>`;
  }


  function goalRadarSource(weekly) {
    const items = [...weekly.activities]
      .filter(item => item.evaluated > 0)
      .sort((a, b) =>
        (b.missed - a.missed) ||
        (b.evaluated - a.evaluated) ||
        a.name.localeCompare(b.name, "pt-BR")
      )
      .slice(0, 8)
      .map(item => ({
        label: item.name,
        value: item.rate ?? 0,
        evidence: item.evaluated
      }));

    return {
      items,
      emptyMessage: "O radar por meta precisa de pelo menos três atividades com oportunidades encerradas."
    };
  }

  function groupRadarSource(weekly) {
    const items = [...weekly.categories]
      .filter(item => item.evaluated > 0)
      .sort((a, b) =>
        (b.evaluated - a.evaluated) ||
        a.name.localeCompare(b.name, "pt-BR")
      )
      .slice(0, 8)
      .map(item => ({
        label: item.name,
        value: item.rate ?? 0,
        evidence: item.evaluated
      }));

    return {
      items,
      emptyMessage: "O radar agrupado precisa de pelo menos três categorias com oportunidades encerradas."
    };
  }

  function shortenRadarLabel(value, limit = 17) {
    const text = String(value || "");
    return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
  }

  function drawRadar({
    canvasSelector,
    emptySelector,
    legendSelector,
    source,
    accentOverride = ""
  }) {
    const canvas = $(canvasSelector);
    const empty = $(emptySelector);
    const legend = $(legendSelector);
    if (!canvas || !empty || !legend) return;

    if (source.items.length < 3) {
      canvas.hidden = true;
      empty.hidden = false;
      empty.textContent = source.emptyMessage;
      legend.innerHTML = "";
      return;
    }

    canvas.hidden = false;
    empty.hidden = true;

    legend.innerHTML = source.items.map(item => `
      <span class="radar-legend__item">
        <i class="radar-legend__dot"></i>
        <span>${escapeHtml(item.label)}</span>
        <strong>${item.value}%</strong>
      </span>`).join("");

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const cssHeight = 310;
    const cssWidth = Math.max(320, rect.width);

    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round(cssHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const styles = getComputedStyle(document.documentElement);
    const accent = accentOverride || styles.getPropertyValue("--accent").trim() || "#2563eb";
    const line = styles.getPropertyValue("--line").trim() || "#d8dde5";
    const muted = styles.getPropertyValue("--muted").trim() || "#6b7280";
    const text = styles.getPropertyValue("--text").trim() || "#111827";

    const centerX = cssWidth / 2;
    const centerY = cssHeight / 2 + 7;
    const radius = Math.min(cssWidth * .30, cssHeight * .34);
    const count = source.items.length;
    const angleStep = (Math.PI * 2) / count;
    const startAngle = -Math.PI / 2;

    const point = (index, scale) => {
      const angle = startAngle + index * angleStep;
      return {
        x: centerX + Math.cos(angle) * radius * scale,
        y: centerY + Math.sin(angle) * radius * scale,
        angle
      };
    };

    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      ctx.beginPath();
      source.items.forEach((_, index) => {
        const p = point(index, scale);
        if (index === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.strokeStyle = line;
      ctx.stroke();
    });

    source.items.forEach((_, index) => {
      const p = point(index, 1);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = line;
      ctx.stroke();
    });

    ctx.beginPath();
    source.items.forEach((item, index) => {
      const p = point(index, Math.max(0, Math.min(100, item.value)) / 100);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();

    ctx.save();
    ctx.globalAlpha = .16;
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    source.items.forEach((item, index) => {
      const p = point(index, Math.max(0, Math.min(100, item.value)) / 100);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    });

    ctx.font = "600 11px sans-serif";
    ctx.fillStyle = text;
    ctx.textBaseline = "middle";

    source.items.forEach((item, index) => {
      const labelPoint = point(index, 1.22);
      const cosine = Math.cos(labelPoint.angle);
      ctx.textAlign = cosine > .25 ? "left" : cosine < -.25 ? "right" : "center";
      ctx.fillText(shortenRadarLabel(item.label), labelPoint.x, labelPoint.y);
    });

    ctx.font = "10px sans-serif";
    ctx.fillStyle = muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("25% · 50% · 75% · 100%", centerX, cssHeight - 2);
  }

  function renderRadars(weekly) {
    drawRadar({
      canvasSelector: "#goal-radar",
      emptySelector: "#goal-radar-empty",
      legendSelector: "#goal-radar-legend",
      source: goalRadarSource(weekly)
    });

    drawRadar({
      canvasSelector: "#group-radar",
      emptySelector: "#group-radar-empty",
      legendSelector: "#group-radar-legend",
      source: groupRadarSource(weekly),
      accentOverride: "#8258d6"
    });
  }

  function monthPeriod() {
    const day = todayDate.getDate();
    let start;
    let end;
    let title;
    let badge;

    if (day <= 3) {
      start = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1, 12);
      end = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0, 12);
      title = `Fechamento de ${monthName.format(start)}`;
      badge = "Fechado";
    } else {
      start = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1, 12);
      end = new Date(todayDate);
      const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate();
      const closing = lastDay - day <= 2;
      title = `${closing ? "Fechamento" : "Parcial"} de ${monthName.format(start)}`;
      badge = closing ? "Fechamento" : "Parcial";
    }

    return { start, end, title, badge };
  }

  function previousEquivalent(period) {
    const length = Math.round((period.end - period.start) / 86400000) + 1;
    const previousEnd = addDays(period.start, -1);
    const previousStart = addDays(previousEnd, -(length - 1));
    return analyze(dateRange(previousStart, previousEnd));
  }

  function renderMonthly() {
    const period = monthPeriod();
    const monthly = analyze(dateRange(period.start, period.end));
    const previous = previousEquivalent(period);
    const best = sortedBest(monthly.activities).find(item => item.evaluated >= 2);
    const weak = sortedWeak(monthly.activities).find(item => item.missed > 0);
    const badge = $("#monthly-status-badge");

    $("#monthly-title").textContent = period.title;
    $("#monthly-period-label").textContent = `${longDate.format(period.start)} a ${longDate.format(period.end)}`;
    badge.textContent = period.badge;
    badge.dataset.level = monthly.rate != null && monthly.rate >= 70 ? "high" : monthly.rate != null && monthly.rate < 50 ? "low" : "medium";

    if (!monthly.evaluated) {
      $("#monthly-summary").innerHTML = `<p>Ainda não há atividades encerradas suficientes para construir o fechamento mensal.</p>`;
      $("#monthly-highlights").innerHTML = "";
      return;
    }

    let trend = "Não há período anterior equivalente suficiente para comparação.";
    if (previous.rate != null) {
      const delta = monthly.rate - previous.rate;
      if (Math.abs(delta) < 3) trend = `O resultado ficou estável em comparação ao período anterior equivalente (${previous.rate}%).`;
      else if (delta > 0) trend = `O desempenho avançou ${delta} ponto${delta === 1 ? "" : "s"} percentual${delta === 1 ? "" : "is"} sobre o período anterior equivalente.`;
      else trend = `O desempenho recuou ${Math.abs(delta)} ponto${Math.abs(delta) === 1 ? "" : "s"} percentual${Math.abs(delta) === 1 ? "" : "is"} em relação ao período anterior equivalente.`;
    }

    const finalSentence = weak
      ? `A principal fragilidade foi <strong>${escapeHtml(weak.name)}</strong>, com ${weak.missed} oportunidade${weak.missed === 1 ? "" : "s"} perdida${weak.missed === 1 ? "" : "s"}.`
      : "Nenhuma atividade concentrou falhas recorrentes no período.";

    $("#monthly-summary").innerHTML = `
      <p>No período mensal analisado, você concluiu <strong>${monthly.completed} de ${monthly.evaluated} oportunidades</strong>, alcançando <strong>${monthly.rate}%</strong>. Foram ${monthly.fullDays} dia${monthly.fullDays === 1 ? "" : "s"} completos.</p>
      <p>${trend}</p>
      <p>${finalSentence}</p>`;

    $("#monthly-highlights").innerHTML = `
      <div class="monthly-highlight">
        <span>Maior força</span>
        <strong>${best ? `${escapeHtml(best.name)} · ${best.rate}%` : "Base insuficiente"}</strong>
      </div>
      <div class="monthly-highlight">
        <span>Maior fragilidade</span>
        <strong>${weak ? `${escapeHtml(weak.name)} · ${weak.missed} falha${weak.missed === 1 ? "" : "s"}` : "Sem recorrência"}</strong>
      </div>
      <div class="monthly-highlight">
        <span>Direção seguinte</span>
        <strong>${weak ? `Proteger a execução de ${escapeHtml(weak.name)}` : "Manter a consistência atual"}</strong>
      </div>`;
  }

  const weeklyDates = lastDays(7);
  const previousWeeklyDates = dateRange(addDays(parseDate(weeklyDates[0]), -7), addDays(parseDate(weeklyDates[0]), -1));
  const weekly = analyze(weeklyDates);
  const previousWeekly = analyze(previousWeeklyDates);

  $("#analysis-period-label").textContent = formatPeriod(weeklyDates);
  renderKpis(weekly);
  renderWeeklySummary(weekly, previousWeekly);
  renderStrengths(weekly);
  renderWeaknesses(weekly);
  renderRadars(weekly);
  renderActivityPerformance(weekly);
  renderFocus(weekly);
  renderMonthly();

  let radarResizeTimer = null;
  addEventListener("resize", () => {
    clearTimeout(radarResizeTimer);
    radarResizeTimer = setTimeout(() => renderRadars(weekly), 120);
  });

  $("#analysis-footnote").textContent =
    "A análise considera apenas atividades programadas e registros de conclusão da página Atividades. Livros, peso, meditação, inglês e Bíblia não entram como indicadores independentes.";
})().catch(error => {
  console.error(error);
  const page = document.querySelector(".activity-analysis-page");
  if (page) {
    page.innerHTML = `
      <section class="card section">
        <p class="eyebrow">Erro ao carregar</p>
        <h1>Não foi possível analisar as atividades</h1>
        <p class="muted">${String(error?.message || "Atualize a página e tente novamente.")}</p>
      </section>`;
  }
  window.MMCDUI?.toast(error?.message || "Erro ao analisar as atividades.", 6000);
});
