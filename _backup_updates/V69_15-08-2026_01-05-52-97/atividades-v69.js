"use strict";

(async () => {
  let d = await MMCD.carregar();
  d.observacoesDiarias ||= {};

  if (window.MemoryConfigReady) await window.MemoryConfigReady;
  const memoryConfig = window.MemoryConfig;
  const BIRTHDAY_KEY = "memory_aniversarios_v1";
  const BIRTHDAY_RECORDS_KEY = "memory_aniversarios_registros_v1";
  const META_EXT_KEY = "memory_metas_ext_v69";
  let birthdayState = { versao: 1, itens: [] };
  let birthdayRecords = { versao: 1, dias: {} };
  let metaExtensions = { versao: 1, itens: {} };

  if (memoryConfig) {
    try {
      const [savedBirthdays, savedRecords, savedMetaExtensions] = await Promise.all([
        memoryConfig.read(BIRTHDAY_KEY, { versao: 1, itens: [] }),
        memoryConfig.read(BIRTHDAY_RECORDS_KEY, { versao: 1, dias: {} }),
        memoryConfig.read(META_EXT_KEY, { versao: 1, itens: {} })
      ]);
      birthdayState = {
        versao: 1,
        itens: Array.isArray(savedBirthdays?.itens) ? savedBirthdays.itens : []
      };
      birthdayRecords = {
        versao: 1,
        dias: savedRecords?.dias && typeof savedRecords.dias === "object" ? savedRecords.dias : {}
      };
      metaExtensions = {
        versao: 1,
        itens: savedMetaExtensions?.itens && typeof savedMetaExtensions.itens === "object" ? savedMetaExtensions.itens : {}
      };
      for (const meta of d.metas || []) {
        const extra = metaExtensions.itens?.[meta.id];
        if (extra && typeof extra === "object") Object.assign(meta, extra);
      }
    } catch (error) {
      console.warn("Atividades: aniversários indisponíveis.", error);
    }
  }

  const $ = selector => document.querySelector(selector);
  const pad = value => String(value).padStart(2, "0");
  const iso = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parseDate = value => new Date(`${value}T12:00:00`);
  const today = iso(new Date());
  const monthFmt = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  const dateFmt = new Intl.DateTimeFormat("pt-BR");
  const weekFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });

  let selected = today;
  let view = new Date();
  let statusTimer = null;
  view.setDate(1);

  function setStatus(text, state = "idle", reset = false) {
    const element = $("#save-status");
    element.textContent = text;
    element.dataset.state = state;
    clearTimeout(statusTimer);
    if (reset) {
      statusTimer = setTimeout(() => {
        element.textContent = "Dados online · Supabase";
        element.dataset.state = "idle";
      }, 2200);
    }
  }

  function showError(error, fallback) {
    console.error(error);
    const message = error?.message || fallback;
    setStatus(message, "error");
    MMCDUI.toast(message, 5000);
  }

  function birthdayGoalId(id) {
    return `birthday:${id}`;
  }

  function isBirthdayGoalId(id) {
    return String(id || "").startsWith("birthday:");
  }

  function birthdayGoalsFor(date) {
    const parsed = parseDate(date);
    const day = parsed.getDate();
    const month = parsed.getMonth() + 1;
    return (birthdayState.itens || [])
      .filter(item => item?.ativo !== false && Number(item?.dia) === day && Number(item?.mes) === month && item?.nome)
      .map(item => ({
        id: birthdayGoalId(item.id),
        nome: `Dê feliz aniversário para ${item.nome}`,
        descricao: item.relacao ? `Aniversário hoje · ${item.relacao}.` : "Aniversário hoje.",
        categoria: "Cuidado",
        tipo: "check",
        unidade: "",
        icone: "🎂",
        cor: "#8b5cf6",
        diasSemana: [parsed.getDay()],
        quantidade: 1,
        frequencia: "anual",
        inicioVigencia: "",
        fimVigencia: "",
        ativa: true,
        memoryBirthday: true
      }));
  }

  function hydrateBirthdayRecords() {
    for (const [date, entries] of Object.entries(birthdayRecords.dias || {})) {
      if (!entries || typeof entries !== "object") continue;
      for (const [birthdayId, saved] of Object.entries(entries)) {
        MMCD.setRegistro(d, date, birthdayGoalId(birthdayId), {
          concluida: !!saved?.concluida,
          abonada: !!saved?.abonada,
          valor: saved?.concluida ? 1 : 0,
          texto: "",
          observacao: String(saved?.observacao || ""),
          origem: "aniversario"
        });
      }
    }
  }

  hydrateBirthdayRecords();

  function isWeeklyFlexible(meta) {
    return meta?.modoProgramacao === "semanal_flexivel";
  }

  function isMetaActiveByDate(meta, date) {
    if (!meta?.ativa) return false;
    if (meta.inicioVigencia && date < meta.inicioVigencia) return false;
    if (meta.fimVigencia && date > meta.fimVigencia) return false;
    return true;
  }

  function weekBounds(date) {
    const base = parseDate(date);
    const offset = (base.getDay() + 6) % 7;
    const start = new Date(base);
    start.setDate(base.getDate() - offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: iso(start), end: iso(end) };
  }

  function dateRange(startIso, endIso) {
    const out = [];
    const cursor = parseDate(startIso);
    const end = parseDate(endIso);
    while (cursor <= end) {
      out.push(iso(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }

  function weeklyTarget(meta) {
    return Math.max(1, Number(meta?.metaSemanal || meta?.quantidade || 1));
  }

  function executionsOnDate(metaId, date) {
    const row = MMCD.registro(d, date, metaId);
    if (!row || MMCD.estaAbonada(row) || !row.concluida) return 0;
    return Math.max(1, Number(row.valor || 1));
  }

  function weeklyState(meta, date) {
    const bounds = weekBounds(date);
    const target = weeklyTarget(meta);
    let total = 0;
    let completionDate = "";
    for (const day of dateRange(bounds.start, bounds.end)) {
      if (!isMetaActiveByDate(meta, day)) continue;
      total += executionsOnDate(meta.id, day);
      if (!completionDate && total >= target) completionDate = day;
    }
    const pct = Math.min(100, Math.round((total / target) * 100));
    const ended = bounds.end < today;
    const complete = total >= target;
    const partial = ended && total > 0 && !complete;
    const failed = ended && total === 0;
    return {
      ...bounds,
      target,
      total,
      remaining: Math.max(0, target - total),
      pct,
      ended,
      complete,
      partial,
      failed,
      completionDate,
      selectedCount: executionsOnDate(meta.id, date)
    };
  }

  function flexibleMetasFor(date) {
    return (d.metas || [])
      .filter(meta => isWeeklyFlexible(meta) && isMetaActiveByDate(meta, date))
      .filter(meta => {
        const state = weeklyState(meta, date);
        // Depois de concluir, a meta deixa de ocupar os dias seguintes da semana.
        return !state.complete || !state.completionDate || date <= state.completionDate;
      });
  }

  function weeklyStatusText(state) {
    if (state.complete) return `${state.total} de ${state.target} · Meta semanal concluída`;
    if (state.partial) return `${state.total} de ${state.target} · ${state.pct}% · Semana encerrada parcialmente`;
    if (state.failed) return `0 de ${state.target} · Semana encerrada · Não concluída`;
    if (state.total > 0) return `${state.total} de ${state.target} · ${state.pct}% · falta${state.remaining === 1 ? "" : "m"} ${state.remaining} até domingo`;
    return `0 de ${state.target} · Pendente · você tem até domingo`;
  }

  function renderWeeklyGoal(meta) {
    const state = weeklyState(meta, selected);
    const canEdit = selected <= today;
    const unit = String(meta.unidade || "vezes").trim() || "vezes";
    const stateClass = state.complete ? "is-complete" : state.failed ? "is-failed" : state.partial ? "is-partial" : "is-pending";
    return `<article class="weekly-flex-goal ${stateClass}">
      <div class="weekly-flex-goal__top">
        <span class="weekly-flex-goal__icon">${MMCDUI.esc(meta.icone || "↻")}</span>
        <div class="weekly-flex-goal__copy">
          <div class="weekly-flex-goal__title"><strong>${MMCDUI.esc(meta.nome || "Meta semanal")}</strong><span>${state.pct}%</span></div>
          <small>${MMCDUI.esc(weeklyStatusText(state))}</small>
        </div>
      </div>
      <div class="weekly-flex-progress"><i style="width:${state.pct}%"></i></div>
      <div class="weekly-flex-goal__footer">
        <span>${state.total}/${state.target} ${MMCDUI.esc(unit)} nesta semana</span>
        <div class="weekly-flex-actions">
          ${state.selectedCount > 0 ? `<button class="btn small" type="button" data-weekly-minus="${meta.id}" ${canEdit ? "" : "disabled"}>− Desfazer hoje</button>` : ""}
          ${!state.complete ? `<button class="btn small primary" type="button" data-weekly-plus="${meta.id}" ${canEdit ? "" : "disabled"}>+ Registrar realização</button>` : `<span class="weekly-flex-done">✓ Concluída</span>`}
        </div>
      </div>
    </article>`;
  }

  async function changeWeeklyExecution(metaId, delta) {
    const meta = (d.metas || []).find(item => item.id === metaId);
    if (!meta || !isWeeklyFlexible(meta)) return;
    const previous = MMCD.registro(d, selected, metaId);
    const previousState = previous ? { ...previous } : null;
    const state = weeklyState(meta, selected);
    let current = executionsOnDate(metaId, selected);
    if (delta > 0 && state.total >= state.target) return;
    current = Math.max(0, current + delta);
    MMCD.setRegistro(d, selected, metaId, {
      concluida: current > 0,
      abonada: false,
      valor: current,
      texto: "",
      observacao: previous?.observacao || "",
      origem: "semanal_flexivel"
    });
    render();
    setStatus("Salvando meta semanal...", "saving");
    try {
      d = await MMCD.salvarRegistroAtividade(d, selected, metaId);
      render();
      const updated = weeklyState(meta, selected);
      setStatus(updated.complete ? "Meta semanal concluída" : "Progresso semanal salvo", "success", true);
    } catch (error) {
      restoreRecord(metaId, previousState);
      render();
      showError(error, "Não foi possível salvar a meta semanal.");
    }
  }

  function goalsFor(date) {
    return [...MMCD.metasNaData(d, date), ...birthdayGoalsFor(date)];
  }

  async function saveBirthdayRecord(date, goalId) {
    if (!memoryConfig) throw new Error("Não foi possível acessar as configurações de aniversários.");
    const birthdayId = String(goalId).replace(/^birthday:/, "");
    const row = MMCD.registro(d, date, goalId) || {};
    birthdayRecords.dias ||= {};
    birthdayRecords.dias[date] ||= {};
    birthdayRecords.dias[date][birthdayId] = {
      concluida: !!row.concluida,
      abonada: !!row.abonada,
      observacao: String(row.observacao || ""),
      atualizadoEm: new Date().toISOString()
    };
    await memoryConfig.write(BIRTHDAY_RECORDS_KEY, {
      versao: 1,
      dias: birthdayRecords.dias,
      atualizadoEm: new Date().toISOString()
    });
  }

  function stats(date) {
    const goals = goalsFor(date);
    let done = 0;
    let excused = 0;

    for (const meta of goals) {
      const row = MMCD.registro(d, date, meta.id);
      if (MMCD.estaAbonada(row)) excused += 1;
      else if (row?.concluida) done += 1;
    }

    const valid = Math.max(0, goals.length - excused);
    return {
      goals,
      done,
      excused,
      valid,
      pct: valid ? Math.round((done / valid) * 100) : null
    };
  }

  function renderCalendar() {
    $("#month-title").textContent = monthFmt.format(view);
    const year = view.getFullYear();
    const month = view.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    let html = "";

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = iso(date);
      const dayStats = stats(key);
      const outside = date.getMonth() !== month;
      const dots = dayStats.goals.slice(0, 8).map(meta => {
        const row = MMCD.registro(d, key, meta.id);
        const state = MMCD.estaAbonada(row) ? "excused" : row?.concluida ? "done" : "";
        const title = state === "excused" ? "Abonada" : state === "done" ? "Concluída" : "Pendente";
        return `<i class="day-dot ${state}" title="${title}"></i>`;
      }).join("");

      let dayLabel = "Sem atividades";
      if (dayStats.goals.length && dayStats.valid === 0) dayLabel = "Tudo abonado";
      else if (dayStats.goals.length) {
        dayLabel = `${dayStats.pct}%${dayStats.excused ? ` · ${dayStats.excused} abono${dayStats.excused === 1 ? "" : "s"}` : ""}`;
      }

      html += `
        <button class="calendar-day ${outside ? "outside" : ""} ${key === selected ? "selected" : ""} ${key === today ? "today" : ""}" data-date="${key}">
          <span class="day-top"><span class="day-number">${date.getDate()}</span></span>
          <span class="day-dots">${dots}</span>
          <span class="day-percent">${dayLabel}</span>
        </button>`;
    }

    $("#calendar-grid").innerHTML = html;
    document.querySelectorAll("[data-date]").forEach(button => {
      button.onclick = () => {
        selected = button.dataset.date;
        const date = parseDate(selected);
        view = new Date(date.getFullYear(), date.getMonth(), 1);
        render();
      };
    });
  }

  function restoreRecord(goalId, previousState) {
    const rows = d.registros[selected] || [];
    const index = rows.findIndex(row => row.metaId === goalId);
    if (previousState && index >= 0) rows[index] = previousState;
    else if (previousState && index < 0) rows.push(previousState);
    else if (!previousState && index >= 0) rows.splice(index, 1);
  }

  async function saveGoalChange(goalId, previousState, successMessage) {
    render();
    setStatus("Salvando no banco...", "saving");

    try {
      if (isBirthdayGoalId(goalId)) {
        await saveBirthdayRecord(selected, goalId);
      } else {
        d = await MMCD.salvarRegistroAtividade(d, selected, goalId);
      }
      render();
      setStatus(successMessage, "success", true);
    } catch (error) {
      restoreRecord(goalId, previousState);
      render();
      showError(error, "Não foi possível salvar a atividade.");
    }
  }

  async function toggleGoal(button) {
    if (button.disabled) return;

    const goalId = button.dataset.goal;
    const previous = MMCD.registro(d, selected, goalId);
    const previousState = previous ? { ...previous } : null;
    const nextValue = !previous?.concluida;

    MMCD.setRegistro(d, selected, goalId, {
      concluida: nextValue,
      abonada: false,
      valor: nextValue ? 1 : 0,
      texto: "",
      observacao: "",
      origem: "manual"
    });

    await saveGoalChange(goalId, previousState, "Atividade salva no banco");
  }

  async function toggleExcuse(button) {
    if (button.disabled) return;

    const goalId = button.dataset.goal;
    const goal = goalsFor(selected).find(meta => meta.id === goalId);
    const previous = MMCD.registro(d, selected, goalId);
    const previousState = previous ? { ...previous } : null;
    const alreadyExcused = MMCD.estaAbonada(previous);

    if (alreadyExcused) {
      MMCD.setRegistro(d, selected, goalId, {
        concluida: false,
        abonada: false,
        valor: 0,
        texto: "",
        observacao: "",
        origem: "manual"
      });
      await saveGoalChange(goalId, previousState, "Abono removido");
      return;
    }

    const reason = window.prompt(
      `Informe o motivo do abono para ${goal?.nome || "esta atividade"} em ${dateFmt.format(parseDate(selected))}:`,
      previous?.observacao || ""
    );
    if (reason == null) return;

    const cleanReason = reason.trim();
    if (!cleanReason) {
      MMCDUI.toast("Informe um motivo para registrar o abono.", 3500);
      return;
    }

    MMCD.setRegistro(d, selected, goalId, {
      concluida: false,
      abonada: true,
      valor: 0,
      texto: "",
      observacao: cleanReason,
      origem: "abono"
    });

    await saveGoalChange(goalId, previousState, "Atividade abonada");
  }

  const compararTexto = (a, b) => String(a || "").localeCompare(String(b || ""), "pt-BR", { sensitivity: "base", numeric: true });

  function nomeGrupo(meta) {
    return String(meta?.categoria || "").trim() || "Sem grupo";
  }

  function chaveGrupo(nome) {
    return `mmcd_activity_group:${String(nome || "").toLocaleLowerCase("pt-BR")}`;
  }

  function grupoAberto(nome) {
    try {
      return window.localStorage?.getItem(chaveGrupo(nome)) !== "closed";
    } catch {
      return true;
    }
  }

  function salvarEstadoGrupo(nome, aberto) {
    try {
      window.localStorage?.setItem(chaveGrupo(nome), aberto ? "open" : "closed");
    } catch {
      // O painel continua funcionando mesmo sem armazenamento local.
    }
  }

  function definirTodosOsGrupos(abertos) {
    document.querySelectorAll("[data-daily-group]").forEach(painel => {
      painel.open = abertos;
      salvarEstadoGrupo(painel.dataset.dailyGroup, abertos);
    });
  }

  function renderGoal(meta) {
    const row = MMCD.registro(d, selected, meta.id);
    const excused = MMCD.estaAbonada(row);
    const done = !excused && !!row?.concluida;
    const reason = excused ? MMCD.motivoAbono(row) : "";
    const color = meta.cor || "#2563eb";
    return `
      <article class="daily-goal ${done ? "is-done" : ""} ${excused ? "is-excused" : ""}">
        <span class="daily-goal-icon" style="color:${color};background:${color}14">${MMCDUI.esc(meta.icone || "✓")}</span>
        <div class="daily-goal-copy">
          <div class="daily-goal-title">
            <strong>${MMCDUI.esc(meta.nome || "Atividade")}</strong>
            ${excused ? '<span class="excuse-badge">Abonada</span>' : ""}
          </div>
          <small>${MMCDUI.esc(meta.descricao || "Marque somente quando realmente cumprir.")}</small>
          ${reason ? `<small class="excuse-reason">Motivo: ${MMCDUI.esc(reason)}</small>` : ""}
        </div>
        <div class="daily-goal-actions">
          <button class="daily-excuse ${excused ? "active" : ""}" data-action="excuse" data-goal="${meta.id}" aria-label="${excused ? "Remover abono" : "Abonar"} ${MMCDUI.esc(meta.nome || "atividade")}" title="${excused ? "Remover abono" : "Registrar abono"}">
            <span aria-hidden="true">A</span><span>${excused ? "Abonado" : "Abonar"}</span>
          </button>
          <button class="daily-check ${done ? "done" : ""}" data-action="check" data-goal="${meta.id}" aria-label="${done ? "Desmarcar" : "Marcar"} atividade" ${excused ? "disabled" : ""}>${done ? "✓" : ""}</button>
        </div>
      </article>`;
  }

  function renderDay() {
    const date = parseDate(selected);
    const dayStats = stats(selected);
    $("#selected-date").textContent = dateFmt.format(date);
    $("#selected-weekday").textContent = weekFmt.format(date);

    let progressLabel = "0%";
    if (dayStats.goals.length && dayStats.valid === 0) progressLabel = "Tudo abonado";
    else if (dayStats.valid) progressLabel = `${dayStats.pct}%`;
    if (dayStats.excused && dayStats.valid) {
      progressLabel += ` · ${dayStats.excused} abonada${dayStats.excused === 1 ? "" : "s"}`;
    }

    $("#day-progress-label").textContent = progressLabel;
    $("#day-progress-bar").style.width = `${dayStats.pct ?? 0}%`;

    const grupos = new Map();
    for (const meta of dayStats.goals) {
      const grupo = nomeGrupo(meta);
      if (!grupos.has(grupo)) grupos.set(grupo, []);
      grupos.get(grupo).push(meta);
    }

    const gruposOrdenados = [...grupos.entries()]
      .sort(([grupoA], [grupoB]) => compararTexto(grupoA, grupoB));

    const flexible = flexibleMetasFor(selected);
    const weeklyHtml = flexible.length ? `
      <section class="weekly-flex-section">
        <div class="weekly-flex-section__head"><div><span>SEMANA FLEXÍVEL</span><strong>Você decide o dia</strong></div><small>Só fecha como não concluída depois de domingo.</small></div>
        <div class="weekly-flex-list">${flexible.map(renderWeeklyGoal).join("")}</div>
      </section>` : "";

    const regularHtml = gruposOrdenados.map(([grupo, metas]) => {
      const metasOrdenadas = [...metas].sort((a, b) => compararTexto(a.nome, b.nome));
      const concluidas = metasOrdenadas.filter(meta => {
        const row = MMCD.registro(d, selected, meta.id);
        return !MMCD.estaAbonada(row) && !!row?.concluida;
      }).length;
      const abonadas = metasOrdenadas.filter(meta => MMCD.estaAbonada(MMCD.registro(d, selected, meta.id))).length;
      const validas = metasOrdenadas.length - abonadas;
      const percentual = validas > 0 ? Math.round((concluidas / validas) * 100) : null;
      const abertas = grupoAberto(grupo);
      const status = abonadas
        ? (validas > 0
            ? `${concluidas} de ${validas} válidas · ${abonadas} abonada${abonadas === 1 ? "" : "s"}`
            : `Tudo abonado · ${abonadas} atividade${abonadas === 1 ? "" : "s"}`)
        : `${concluidas} de ${metasOrdenadas.length}`;
      const percentualLabel = percentual === null ? "—" : `${percentual}%`;

      return `
        <details class="daily-group" data-daily-group="${MMCDUI.esc(grupo)}" ${abertas ? "open" : ""}>
          <summary class="daily-group-summary">
            <span class="daily-group-heading">
              <strong>${MMCDUI.esc(grupo)}</strong>
              <small>${MMCDUI.esc(status)}</small>
            </span>
            <span class="daily-group-summary-right">
              <span class="daily-group-percent ${percentual === 100 ? "is-complete" : ""}" title="Atingimento do grupo">${MMCDUI.esc(percentualLabel)}</span>
              <span class="daily-group-chevron" aria-hidden="true">⌄</span>
            </span>
          </summary>
          <div class="daily-group-items">${metasOrdenadas.map(renderGoal).join("")}</div>
        </details>`;
    }).join("");

    $("#daily-goals").innerHTML = weeklyHtml + regularHtml || '<div class="empty-day">Nenhuma meta programada para este dia.</div>';

    document.querySelectorAll('[data-weekly-plus]').forEach(button => { button.onclick = () => changeWeeklyExecution(button.dataset.weeklyPlus, 1); });
    document.querySelectorAll('[data-weekly-minus]').forEach(button => { button.onclick = () => changeWeeklyExecution(button.dataset.weeklyMinus, -1); });

    document.querySelectorAll("[data-daily-group]").forEach(painel => {
      painel.addEventListener("toggle", () => salvarEstadoGrupo(painel.dataset.dailyGroup, painel.open));
    });

    document.querySelectorAll('[data-action="check"]').forEach(button => {
      button.onclick = () => toggleGoal(button);
    });
    document.querySelectorAll('[data-action="excuse"]').forEach(button => {
      button.onclick = () => toggleExcuse(button);
    });

    $("#day-weight").value = d.pesos[selected] ?? "";
    $("#day-note").value = d.observacoesDiarias[selected] || "";
  }

  function render() {
    renderCalendar();
    renderDay();
  }

  function gotoToday() {
    selected = today;
    const date = parseDate(today);
    view = new Date(date.getFullYear(), date.getMonth(), 1);
    render();
  }

  $("#prev-month").onclick = () => {
    view.setMonth(view.getMonth() - 1);
    renderCalendar();
  };
  $("#next-month").onclick = () => {
    view.setMonth(view.getMonth() + 1);
    renderCalendar();
  };
  $("#go-today").onclick = gotoToday;
  $("#panel-today").onclick = gotoToday;
  $("#expand-all-groups").onclick = () => definirTodosOsGrupos(true);
  $("#collapse-all-groups").onclick = () => definirTodosOsGrupos(false);

  $("#day-weight").onchange = async event => {
    const previous = d.pesos[selected];
    const value = Number.parseFloat(event.target.value);
    if (Number.isFinite(value)) d.pesos[selected] = value;
    else delete d.pesos[selected];

    setStatus("Salvando peso...", "saving");
    try {
      d = await MMCD.salvarRegistroDiario(d, selected);
      renderCalendar();
      setStatus("Peso salvo no banco", "success", true);
    } catch (error) {
      if (previous == null) delete d.pesos[selected];
      else d.pesos[selected] = previous;
      renderDay();
      showError(error, "Não foi possível salvar o peso.");
    }
  };

  $("#day-note").onchange = async event => {
    const previous = d.observacoesDiarias[selected];
    const value = event.target.value.trim();
    if (value) d.observacoesDiarias[selected] = value;
    else delete d.observacoesDiarias[selected];

    setStatus("Salvando observação...", "saving");
    try {
      d = await MMCD.salvarRegistroDiario(d, selected);
      setStatus("Observação salva no banco", "success", true);
    } catch (error) {
      if (previous == null) delete d.observacoesDiarias[selected];
      else d.observacoesDiarias[selected] = previous;
      renderDay();
      showError(error, "Não foi possível salvar a observação.");
    }
  };

  setStatus("Dados online · Supabase");
  render();
})().catch(error => {
  console.error(error);
  const status = document.querySelector("#save-status");
  if (status) {
    status.textContent = error?.message || "Erro ao carregar os dados.";
    status.dataset.state = "error";
  }
  window.MMCDUI?.toast(error?.message || "Erro ao carregar as atividades.", 6000);
});
