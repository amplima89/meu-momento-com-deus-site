"use strict";

(async () => {
  const db = window.MMCDSupabase;
  const session = await window.MMCDAuth.requireSession();
  const user = session.user;

  const MEASURES_KEY = "treino_medidas_v1";
  const CONFIG_KEY = "treino_medidas_config_v1";

  const FIELDS = [
    { key: "peitoral", label: "Peitoral", unit: "cm", region: "peitoral", defaultDirection: "up" },
    { key: "bicepsDireito", label: "Bíceps direito", short: "Direito", unit: "cm", region: "bicepsDireito", defaultDirection: "up" },
    { key: "bicepsEsquerdo", label: "Bíceps esquerdo", short: "Esquerdo", unit: "cm", region: "bicepsEsquerdo", defaultDirection: "up" },
    { key: "antebracoDireito", label: "Antebraço direito", short: "Direito", unit: "cm", region: "antebracoDireito", defaultDirection: "up" },
    { key: "antebracoEsquerdo", label: "Antebraço esquerdo", short: "Esquerdo", unit: "cm", region: "antebracoEsquerdo", defaultDirection: "up" },
    { key: "cintura", label: "Cintura", unit: "cm", region: "cintura", defaultDirection: "down" },
    { key: "abdomen", label: "Abdômen", unit: "cm", region: "abdomen", defaultDirection: "down" },
    { key: "quadril", label: "Quadril", unit: "cm", region: "quadril", defaultDirection: "neutral" },
    { key: "coxaDireita", label: "Coxa direita", short: "Direita", unit: "cm", region: "coxaDireita", defaultDirection: "up" },
    { key: "coxaEsquerda", label: "Coxa esquerda", short: "Esquerda", unit: "cm", region: "coxaEsquerda", defaultDirection: "up" },
    { key: "panturrilhaDireita", label: "Panturrilha direita", short: "Direita", unit: "cm", region: "panturrilhaDireita", defaultDirection: "up" },
    { key: "panturrilhaEsquerda", label: "Panturrilha esquerda", short: "Esquerda", unit: "cm", region: "panturrilhaEsquerda", defaultDirection: "up" },
    { key: "peso", label: "Peso corporal", unit: "kg", region: "peso", defaultDirection: "down" }
  ];

  const STEPS = [
    { id: "peitoral", title: "Peitoral", subtitle: "Comece pela parte superior do tronco.", fields: ["peitoral"] },
    { id: "biceps", title: "Bíceps", subtitle: "Meça os dois lados sem mudar a posição da fita.", fields: ["bicepsDireito", "bicepsEsquerdo"] },
    { id: "antebracos", title: "Antebraços", subtitle: "Direito e esquerdo na mesma etapa.", fields: ["antebracoDireito", "antebracoEsquerdo"] },
    { id: "cintura", title: "Cintura", subtitle: "A redução é considerada evolução positiva.", fields: ["cintura"] },
    { id: "abdomen", title: "Abdômen", subtitle: "A redução também é positiva nesta região.", fields: ["abdomen"] },
    { id: "quadril", title: "Quadril", subtitle: "Registre para acompanhar a composição corporal.", fields: ["quadril"] },
    { id: "coxas", title: "Coxas", subtitle: "Continue descendo pelo corpo: direita e esquerda.", fields: ["coxaDireita", "coxaEsquerda"] },
    { id: "panturrilhas", title: "Panturrilhas", subtitle: "Última região corporal do scan.", fields: ["panturrilhaDireita", "panturrilhaEsquerda"] },
    { id: "peso", title: "Peso corporal", subtitle: "Finalize o percurso com o peso do dia.", fields: ["peso"], final: true }
  ];

  const state = {
    medidas: [],
    direcoes: Object.fromEntries(FIELDS.map(field => [field.key, field.defaultDirection])),
    draft: Object.fromEntries(FIELDS.map(field => [field.key, ""])),
    currentStep: 0,
    saving: false
  };

  const esc = value => window.MMCDUI?.esc ? MMCDUI.esc(value) : String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pad = value => String(value).padStart(2, "0");
  const todayIso = () => {
    const date = new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const fmt = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };
  const parseNumber = value => {
    const normalized = String(value ?? "").trim().replace(",", ".");
    if (!normalized) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  };
  const datePt = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `med-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fieldByKey = key => FIELDS.find(field => field.key === key);

  function getFieldValue(row, field) {
    if (!row || !field) return null;
    const direct = parseNumber(row[field.key]);
    if (Number.isFinite(direct)) return direct;
    if (field.key === "bicepsDireito" || field.key === "antebracoDireito") return parseNumber(row.bracoDireito);
    if (field.key === "bicepsEsquerdo" || field.key === "antebracoEsquerdo") return parseNumber(row.bracoEsquerdo);
    return null;
  }

  async function loadKey(chave) {
    const { data, error } = await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", user.id)
      .eq("chave", chave)
      .maybeSingle();
    if (error) throw new Error(`Não foi possível carregar ${chave}: ${error.message}`);
    return data?.valor ?? null;
  }

  async function saveKey(chave, valor) {
    const { error } = await db
      .from("configuracoes_usuario")
      .upsert({ user_id: user.id, chave, valor }, { onConflict: "user_id,chave" });
    if (error) throw new Error(`Não foi possível salvar ${chave}: ${error.message}`);
  }

  function setStatus(message, kind = "") {
    const target = document.querySelector("#measure-save-status");
    if (!target) return;
    target.textContent = message;
    target.dataset.kind = kind;
  }

  function sortedMeasures() {
    return [...state.medidas].sort((a, b) => {
      const byDate = String(a.data || "").localeCompare(String(b.data || ""));
      if (byDate !== 0) return byDate;
      return String(a.criadoEm || "").localeCompare(String(b.criadoEm || ""));
    });
  }

  function previousMeasurement(date) {
    return sortedMeasures().filter(item => item?.data && item.data < date).at(-1) || null;
  }

  function compareStatus(current, previous, direction) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return "measured";
    const delta = current - previous;
    if (Math.abs(delta) < 0.0001 || direction === "neutral") return "neutral";
    if (direction === "down") return delta < 0 ? "good" : "bad";
    return delta > 0 ? "good" : "bad";
  }

  function directionText(direction) {
    if (direction === "down") return "reduzir é positivo";
    if (direction === "up") return "aumentar é positivo";
    return "apenas acompanhar";
  }

  function currentDate() {
    return String(document.querySelector("#measure-date")?.value || todayIso());
  }

  function syncVisibleInputs() {
    document.querySelectorAll("[data-measure-input]").forEach(input => {
      state.draft[input.dataset.measureInput] = input.value;
    });
    const observation = document.querySelector("#measure-observation-input");
    if (observation) state.observation = observation.value;
  }

  function stepState(step) {
    const values = step.fields.map(key => parseNumber(state.draft[key]));
    const filled = values.filter(Number.isFinite).length;
    if (filled === step.fields.length) return "done";
    if (filled > 0) return "partial";
    return "pending";
  }

  function stepSummary(step) {
    const parts = step.fields.map(key => {
      const field = fieldByKey(key);
      const value = parseNumber(state.draft[key]);
      if (!Number.isFinite(value)) return null;
      return `${field.short || field.label} ${fmt(value)} ${field.unit}`;
    }).filter(Boolean);
    return parts.length ? parts.join(" · ") : "Sem medida";
  }

  function progressHtml() {
    return `<div class="measure-step-progress" aria-label="Progresso da medição">
      ${STEPS.map((step, index) => {
        const status = stepState(step);
        const cls = [index === state.currentStep ? "is-current" : "", `is-${status}`].filter(Boolean).join(" ");
        return `<button type="button" class="measure-step-dot ${cls}" data-go-step="${index}" aria-label="Etapa ${index + 1}: ${esc(step.title)}"><span>${index + 1}</span></button>`;
      }).join("")}
    </div>`;
  }

  function inputHtml(field) {
    const value = state.draft[field.key] ?? "";
    const previous = getFieldValue(previousMeasurement(currentDate()), field);
    const previousHtml = Number.isFinite(previous)
      ? `<small>Última medição: <strong>${fmt(previous)} ${esc(field.unit)}</strong></small>`
      : `<small>Sem medição anterior para comparar.</small>`;

    return `<label class="guided-measure-input">
      <span>${esc(field.short || field.label)}</span>
      <div class="guided-measure-input__control">
        <input data-measure-input="${esc(field.key)}" name="${esc(field.key)}" type="number" min="0" step="0.1" inputmode="decimal" value="${esc(value)}" placeholder="0,0" autocomplete="off">
        <b>${esc(field.unit)}</b>
      </div>
      ${previousHtml}
    </label>`;
  }

  function renderCurrentStep() {
    const root = document.querySelector("#measure-fields");
    const step = STEPS[state.currentStep];
    const status = stepState(step);

    root.innerHTML = `
      <div class="guided-measure-header">
        <div>
          <span class="guided-measure-counter">Etapa ${state.currentStep + 1} de ${STEPS.length}</span>
          <h3>${esc(step.title)}</h3>
          <p>${esc(step.subtitle)}</p>
        </div>
        <span class="guided-measure-status is-${status}">${status === "done" ? "✓ Concluída" : status === "partial" ? "Parcial" : "Atual"}</span>
      </div>
      ${progressHtml()}
      <div class="guided-measure-fields ${step.fields.length > 1 ? "is-pair" : ""}">
        ${step.fields.map(key => inputHtml(fieldByKey(key))).join("")}
      </div>
      <div class="guided-measure-rule">
        <span>Regra de evolução</span>
        <strong>${step.fields.map(key => `${fieldByKey(key).short || fieldByKey(key).label}: ${directionText(state.direcoes[key] || fieldByKey(key).defaultDirection)}`).join(" · ")}</strong>
      </div>
      <div class="guided-measure-nav">
        <button class="btn" type="button" data-prev-step ${state.currentStep === 0 ? "disabled" : ""}>← Anterior</button>
        ${state.currentStep < STEPS.length - 1
          ? `<button class="btn primary" type="button" data-next-step>Próximo →</button>`
          : `<button class="btn primary" type="submit">Salvar medição ✓</button>`}
      </div>
    `;

    const observationWrap = document.querySelector("#measure-observation-wrap");
    if (observationWrap) observationWrap.hidden = !step.final;
    const observation = document.querySelector("#measure-observation-input");
    if (observation && step.final) observation.value = state.observation || "";

    root.querySelectorAll("[data-measure-input]").forEach(input => {
      input.addEventListener("input", () => {
        state.draft[input.dataset.measureInput] = input.value;
        updateBodyScan();
        renderCompletedSteps();
        updateStepVisualOnly();
      });
    });

    root.querySelectorAll("[data-go-step]").forEach(button => {
      button.addEventListener("click", () => goStep(Number(button.dataset.goStep)));
    });
    root.querySelector("[data-prev-step]")?.addEventListener("click", () => goStep(state.currentStep - 1));
    root.querySelector("[data-next-step]")?.addEventListener("click", () => goStep(state.currentStep + 1));

    updateBodyScan();
  }

  function updateStepVisualOnly() {
    const step = STEPS[state.currentStep];
    const status = stepState(step);
    const badge = document.querySelector(".guided-measure-status");
    if (badge) {
      badge.className = `guided-measure-status is-${status}`;
      badge.textContent = status === "done" ? "✓ Concluída" : status === "partial" ? "Parcial" : "Atual";
    }
    document.querySelectorAll("[data-go-step]").forEach((button, index) => {
      const currentStatus = stepState(STEPS[index]);
      button.classList.toggle("is-current", index === state.currentStep);
      button.classList.toggle("is-done", currentStatus === "done");
      button.classList.toggle("is-partial", currentStatus === "partial");
      button.classList.toggle("is-pending", currentStatus === "pending");
    });
  }

  function goStep(index) {
    syncVisibleInputs();
    state.currentStep = Math.max(0, Math.min(STEPS.length - 1, index));
    renderCurrentStep();
    renderCompletedSteps();
    const card = document.querySelector(".measure-form-card");
    if (window.innerWidth <= 720) card?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCompletedSteps() {
    const root = document.querySelector("#measure-step-summary");
    if (!root) return;
    root.innerHTML = STEPS.map((step, index) => {
      const status = stepState(step);
      return `<button type="button" class="measure-summary-row is-${status} ${index === state.currentStep ? "is-current" : ""}" data-summary-step="${index}">
        <span class="measure-summary-icon">${status === "done" ? "✓" : status === "partial" ? "◐" : "○"}</span>
        <span><strong>${esc(step.title)}</strong><small>${esc(stepSummary(step))}</small></span>
        <b>›</b>
      </button>`;
    }).join("");
    root.querySelectorAll("[data-summary-step]").forEach(button => {
      button.addEventListener("click", () => goStep(Number(button.dataset.summaryStep)));
    });
  }

  function updateBodyScan() {
    const date = currentDate();
    const previous = previousMeasurement(date);
    const scan = document.querySelector("#body-scan");
    const readout = document.querySelector("#body-scan-readout");
    const currentStep = STEPS[state.currentStep];
    let filled = 0;

    document.querySelectorAll(".body-region").forEach(region => {
      region.classList.remove("is-measured", "is-good", "is-bad", "is-neutral", "is-current-region");
    });
    scan?.classList.remove("has-weight", "weight-good", "weight-bad", "weight-neutral", "is-weight-current");

    for (const field of FIELDS) {
      const value = parseNumber(state.draft[field.key]);
      if (!Number.isFinite(value)) continue;
      filled += 1;
      const previousValue = getFieldValue(previous, field);
      const status = compareStatus(value, previousValue, state.direcoes[field.key] || field.defaultDirection);
      if (field.key === "peso") scan?.classList.add("has-weight", `weight-${status}`);
      else document.querySelectorAll(`[data-region="${field.region}"]`).forEach(region => region.classList.add(status === "measured" ? "is-measured" : `is-${status}`));
    }

    currentStep.fields.forEach(key => {
      const field = fieldByKey(key);
      if (field.key === "peso") scan?.classList.add("is-weight-current");
      else document.querySelectorAll(`[data-region="${field.region}"]`).forEach(region => region.classList.add("is-current-region"));
    });

    const count = document.querySelector("#body-scan-count");
    if (count) count.textContent = `${filled}/${FIELDS.length}`;

    if (readout) {
      readout.innerHTML = currentStep.fields.map(key => {
        const field = fieldByKey(key);
        const current = parseNumber(state.draft[key]);
        const before = getFieldValue(previous, field);
        if (!Number.isFinite(current)) {
          return `<div class="body-readout-item is-current-readout"><span>${esc(field.label)}</span><strong>Aguardando medida</strong></div>`;
        }
        const status = compareStatus(current, before, state.direcoes[key] || field.defaultDirection);
        const delta = Number.isFinite(before) ? current - before : null;
        const deltaText = delta === null ? "primeira referência" : `${delta > 0 ? "+" : ""}${fmt(delta)} ${field.unit}`;
        return `<div class="body-readout-item ${status} is-current-readout"><span>${esc(field.label)}</span><strong>${fmt(current)} ${field.unit} · ${esc(deltaText)}</strong></div>`;
      }).join("");
    }
  }

  function latestPair() {
    const rows = sortedMeasures();
    if (rows.length < 2) return null;
    return [rows.at(-2), rows.at(-1)];
  }

  function comparisonItem(field, previous, current) {
    const before = getFieldValue(previous, field);
    const after = getFieldValue(current, field);
    if (!Number.isFinite(before) || !Number.isFinite(after)) return "";
    const delta = after - before;
    const direction = state.direcoes[field.key] || field.defaultDirection;
    const status = compareStatus(after, before, direction);
    return `<article class="measure-delta-card ${status}">
      <span>${esc(field.label)}</span>
      <strong>${fmt(before)} → ${fmt(after)} ${esc(field.unit)}</strong>
      <b>${delta > 0 ? "+" : ""}${fmt(delta)} ${esc(field.unit)} · ${esc(directionText(direction))}</b>
    </article>`;
  }

  function renderComparison() {
    const root = document.querySelector("#measure-comparison");
    const pair = latestPair();
    if (!pair) {
      root.innerHTML = `<div class="measure-empty">Salve pelo menos duas medições para ativar a comparação corporal.</div>`;
      return;
    }
    const [previous, current] = pair;
    const cards = FIELDS.map(field => comparisonItem(field, previous, current)).filter(Boolean);
    root.innerHTML = cards.length
      ? `<div class="measure-comparison-period">${datePt(previous.data)} → ${datePt(current.data)}</div><div class="measure-comparison-grid">${cards.join("")}</div>`
      : `<div class="measure-empty">As duas últimas medições ainda não têm campos equivalentes para comparar.</div>`;
  }

  function renderHistory() {
    const root = document.querySelector("#measure-history");
    const rows = sortedMeasures().reverse().slice(0, 15);
    if (!rows.length) {
      root.innerHTML = `<div class="measure-empty">Nenhuma medição salva ainda.</div>`;
      return;
    }
    root.innerHTML = `<div class="measure-history-list">${rows.map(row => {
      const chips = FIELDS.map(field => {
        const value = getFieldValue(row, field);
        if (!Number.isFinite(value)) return "";
        return `<span class="measure-history-chip">${esc(field.label)} ${fmt(value)} ${esc(field.unit)}</span>`;
      }).filter(Boolean).join("");
      return `<article class="measure-history-row-v40"><strong>${datePt(row.data)}</strong><div class="measure-history-row-v40__values">${chips || '<span class="muted">Sem medidas corporais</span>'}</div><button type="button" data-delete-measure="${esc(row.id)}">Excluir</button></article>`;
    }).join("")}</div>`;
  }

  async function saveMeasures() {
    await saveKey(MEASURES_KEY, { schemaVersion: 3, medidas: state.medidas, atualizadoEm: new Date().toISOString() });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.saving) return;
    syncVisibleInputs();

    const row = {
      id: uuid(),
      data: currentDate(),
      observacao: String(state.observation || "").trim(),
      criadoEm: new Date().toISOString()
    };

    let hasValue = false;
    for (const field of FIELDS) {
      const value = parseNumber(state.draft[field.key]);
      row[field.key] = Number.isFinite(value) ? value : "";
      if (Number.isFinite(value)) hasValue = true;
    }
    if (!hasValue) {
      window.MMCDUI?.toast?.("Preencha pelo menos uma medida antes de salvar.");
      return;
    }

    try {
      state.saving = true;
      setStatus("Salvando…", "saving");
      state.medidas.push(row);
      await saveMeasures();
      setStatus("Salvo no Supabase", "saved");
      window.MMCDUI?.toast?.("Body Scan salvo com sucesso.");
      renderComparison();
      renderHistory();
      state.draft = Object.fromEntries(FIELDS.map(field => [field.key, ""]));
      state.observation = "";
      state.currentStep = 0;
      renderCurrentStep();
      renderCompletedSteps();
    } catch (error) {
      state.medidas = state.medidas.filter(item => item.id !== row.id);
      setStatus("Erro ao salvar", "error");
      window.MMCDUI?.toast?.(error.message || "Não foi possível salvar a medição.", 4500);
    } finally {
      state.saving = false;
    }
  }

  async function deleteMeasure(id) {
    const previousRows = [...state.medidas];
    state.medidas = state.medidas.filter(item => String(item.id) !== String(id));
    try {
      setStatus("Salvando…", "saving");
      await saveMeasures();
      setStatus("Salvo no Supabase", "saved");
      renderComparison();
      renderHistory();
      updateBodyScan();
      window.MMCDUI?.toast?.("Medição excluída.");
    } catch (error) {
      state.medidas = previousRows;
      setStatus("Erro ao salvar", "error");
      window.MMCDUI?.toast?.(error.message || "Não foi possível excluir.", 4500);
    }
  }

  async function init() {
    try {
      const [measureValue, configValue] = await Promise.all([loadKey(MEASURES_KEY), loadKey(CONFIG_KEY)]);
      state.medidas = Array.isArray(measureValue?.medidas) ? measureValue.medidas : [];
      state.direcoes = {
        ...state.direcoes,
        ...(configValue?.direcoes && typeof configValue.direcoes === "object" ? configValue.direcoes : {})
      };

      const dateInput = document.querySelector("#measure-date");
      if (dateInput) {
        dateInput.value = todayIso();
        dateInput.addEventListener("change", () => {
          renderCurrentStep();
          updateBodyScan();
        });
      }

      const form = document.querySelector("#measure-form");
      form.addEventListener("submit", handleSubmit);
      document.querySelector("#measure-history").addEventListener("click", event => {
        const button = event.target.closest("[data-delete-measure]");
        if (button) deleteMeasure(button.dataset.deleteMeasure);
      });

      renderCurrentStep();
      renderCompletedSteps();
      renderComparison();
      renderHistory();
      setStatus("Salvo no Supabase", "saved");
    } catch (error) {
      console.error(error);
      setStatus("Falha ao carregar", "error");
      document.querySelector("#measure-history").innerHTML = `<div class="measure-empty">${esc(error.message || "Não foi possível carregar suas medições.")}</div>`;
    }
  }

  init();
})().catch(error => {
  console.error(error);
  window.MMCDUI?.toast?.(error.message || "Não foi possível abrir Medições corporais.", 5000);
});
