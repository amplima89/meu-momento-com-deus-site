"use strict";

(async () => {
  let d = await MMCD.carregar();
  d.observacoesDiarias ||= {};

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

  function goalsFor(date) {
    return MMCD.metasNaData(d, date);
  }

  function stats(date) {
    const goals = goalsFor(date);
    const done = goals.filter(meta => MMCD.registro(d, date, meta.id)?.concluida).length;
    return { goals, done, pct: goals.length ? Math.round((done / goals.length) * 100) : 0 };
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
        const done = MMCD.registro(d, key, meta.id)?.concluida;
        return `<i class="day-dot ${done ? "done" : ""}"></i>`;
      }).join("");

      html += `
        <button class="calendar-day ${outside ? "outside" : ""} ${key === selected ? "selected" : ""} ${key === today ? "today" : ""}" data-date="${key}">
          <span class="day-top"><span class="day-number">${date.getDate()}</span></span>
          <span class="day-dots">${dots}</span>
          <span class="day-percent">${dayStats.goals.length ? `${dayStats.pct}%` : "Sem atividades"}</span>
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

  async function toggleGoal(button) {
    if (button.disabled) return;

    const goalId = button.dataset.goal;
    const previous = MMCD.registro(d, selected, goalId);
    const previousState = previous ? { ...previous } : null;
    const nextValue = !previous?.concluida;

    button.disabled = true;
    MMCD.setRegistro(d, selected, goalId, {
      concluida: nextValue,
      valor: nextValue ? 1 : 0,
      origem: "manual"
    });
    render();
    setStatus("Salvando no banco...", "saving");

    try {
      d = await MMCD.salvarRegistroAtividade(d, selected, goalId);
      render();
      setStatus("Atividade salva no banco", "success", true);
    } catch (error) {
      const rows = d.registros[selected] || [];
      const index = rows.findIndex(row => row.metaId === goalId);
      if (previousState && index >= 0) rows[index] = previousState;
      if (!previousState && index >= 0) rows.splice(index, 1);
      render();
      showError(error, "Não foi possível salvar a atividade.");
    } finally {
      const currentButton = document.querySelector(`[data-goal="${goalId}"]`);
      if (currentButton) currentButton.disabled = false;
    }
  }

  function renderDay() {
    const date = parseDate(selected);
    const dayStats = stats(selected);
    $("#selected-date").textContent = dateFmt.format(date);
    $("#selected-weekday").textContent = weekFmt.format(date);
    $("#day-progress-label").textContent = `${dayStats.pct}%`;
    $("#day-progress-bar").style.width = `${dayStats.pct}%`;

    $("#daily-goals").innerHTML = dayStats.goals.map(meta => {
      const done = !!MMCD.registro(d, selected, meta.id)?.concluida;
      const color = meta.cor || "#2563eb";
      return `
        <article class="daily-goal">
          <span class="daily-goal-icon" style="color:${color};background:${color}14">${MMCDUI.esc(meta.icone || "✓")}</span>
          <div>
            <strong>${MMCDUI.esc(meta.nome || "Atividade")}</strong>
            <small>${MMCDUI.esc(meta.descricao || "Marque somente quando realmente cumprir.")}</small>
          </div>
          <button class="daily-check ${done ? "done" : ""}" data-goal="${meta.id}" aria-label="${done ? "Desmarcar" : "Marcar"} atividade">${done ? "✓" : ""}</button>
        </article>`;
    }).join("") || '<div class="empty-day">Nenhuma meta programada para este dia.</div>';

    document.querySelectorAll("[data-goal]").forEach(button => {
      button.onclick = () => toggleGoal(button);
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
