"use strict";

(async () => {
  const db = window.MMCDSupabase;
  const session = await window.MMCDAuth.requireSession();
  const user = session.user;

  const MEASURES_KEY = "treino_medidas_v1";
  const CONFIG_KEY = "treino_medidas_config_v1";

  const FIELDS = [
    { key: "ombros", label: "Ombros", unit: "cm", region: "ombros", defaultDirection: "up" },
    { key: "peitoral", label: "Peitoral", unit: "cm", region: "peitoral", defaultDirection: "up" },
    { key: "bicepsRelaxadoDireito", label: "Bíceps relaxado direito", short: "Direito", unit: "cm", region: "bicepsDireito", defaultDirection: "up" },
    { key: "bicepsRelaxadoEsquerdo", label: "Bíceps relaxado esquerdo", short: "Esquerdo", unit: "cm", region: "bicepsEsquerdo", defaultDirection: "up" },
    { key: "bicepsContraidoDireito", label: "Bíceps contraído direito", short: "Direito", unit: "cm", region: "bicepsDireito", defaultDirection: "up" },
    { key: "bicepsContraidoEsquerdo", label: "Bíceps contraído esquerdo", short: "Esquerdo", unit: "cm", region: "bicepsEsquerdo", defaultDirection: "up" },
    { key: "antebracoDireito", label: "Antebraço direito", short: "Direito", unit: "cm", region: "antebracoDireito", defaultDirection: "up" },
    { key: "antebracoEsquerdo", label: "Antebraço esquerdo", short: "Esquerdo", unit: "cm", region: "antebracoEsquerdo", defaultDirection: "up" },
    { key: "cintura", label: "Cintura", unit: "cm", region: "cintura", defaultDirection: "down" },
    { key: "abdomen", label: "Abdômen", unit: "cm", region: "abdomen", defaultDirection: "down" },
    { key: "quadril", label: "Quadril", unit: "cm", region: "quadril", defaultDirection: "neutral" },
    { key: "coxaSuperiorDireita", label: "Coxa superior direita", short: "Direita", unit: "cm", region: "coxaSuperiorDireita", defaultDirection: "up" },
    { key: "coxaSuperiorEsquerda", label: "Coxa superior esquerda", short: "Esquerda", unit: "cm", region: "coxaSuperiorEsquerda", defaultDirection: "up" },
    { key: "coxaMediaDireita", label: "Coxa média direita", short: "Direita", unit: "cm", region: "coxaMediaDireita", defaultDirection: "up" },
    { key: "coxaMediaEsquerda", label: "Coxa média esquerda", short: "Esquerda", unit: "cm", region: "coxaMediaEsquerda", defaultDirection: "up" },
    { key: "coxaInferiorDireita", label: "Coxa inferior direita", short: "Direita", unit: "cm", region: "coxaInferiorDireita", defaultDirection: "up" },
    { key: "coxaInferiorEsquerda", label: "Coxa inferior esquerda", short: "Esquerda", unit: "cm", region: "coxaInferiorEsquerda", defaultDirection: "up" },
    { key: "panturrilhaDireita", label: "Panturrilha direita", short: "Direita", unit: "cm", region: "panturrilhaDireita", defaultDirection: "up" },
    { key: "panturrilhaEsquerda", label: "Panturrilha esquerda", short: "Esquerda", unit: "cm", region: "panturrilhaEsquerda", defaultDirection: "up" },
    { key: "peso", label: "Peso corporal", unit: "kg", region: "peso", defaultDirection: "down" }
  ];

  const STEPS = [
    { id: "ombros", title: "Ombros", subtitle: "Meça a circunferência passando pelos pontos mais largos dos ombros.", fields: ["ombros"] },
    { id: "peitoral", title: "Peitoral", subtitle: "Mantenha a fita nivelada ao redor do tórax.", fields: ["peitoral"] },
    { id: "biceps-relaxado", title: "Bíceps relaxado", subtitle: "Braços soltos, sem contrair. Meça direita e esquerda.", fields: ["bicepsRelaxadoDireito", "bicepsRelaxadoEsquerdo"] },
    { id: "biceps-contraido", title: "Bíceps contraído", subtitle: "Contraia o braço e meça o maior ponto em ambos os lados.", fields: ["bicepsContraidoDireito", "bicepsContraidoEsquerdo"] },
    { id: "antebracos", title: "Antebraços", subtitle: "Meça o ponto de maior circunferência de cada lado.", fields: ["antebracoDireito", "antebracoEsquerdo"] },
    { id: "cintura", title: "Cintura", subtitle: "A redução é considerada evolução positiva.", fields: ["cintura"] },
    { id: "abdomen", title: "Abdômen", subtitle: "A redução também é positiva nesta região.", fields: ["abdomen"] },
    { id: "quadril", title: "Quadril", subtitle: "Registre a maior circunferência do quadril.", fields: ["quadril"] },
    { id: "coxa-superior", title: "Coxa superior", subtitle: "Registre a parte mais alta da coxa, direita e esquerda.", fields: ["coxaSuperiorDireita", "coxaSuperiorEsquerda"] },
    { id: "coxa-media", title: "Coxa média", subtitle: "Meça o ponto médio da coxa nos dois lados.", fields: ["coxaMediaDireita", "coxaMediaEsquerda"] },
    { id: "coxa-inferior", title: "Coxa inferior", subtitle: "Meça a região inferior da coxa, mantendo o mesmo ponto de referência.", fields: ["coxaInferiorDireita", "coxaInferiorEsquerda"] },
    { id: "panturrilhas", title: "Panturrilhas", subtitle: "Meça o ponto de maior circunferência de cada panturrilha.", fields: ["panturrilhaDireita", "panturrilhaEsquerda"] },
    { id: "peso", title: "Peso corporal", subtitle: "Finalize o percurso com o peso do dia.", fields: ["peso"], final: true }
  ];

  const state = {
    medidas: [],
    direcoes: Object.fromEntries(FIELDS.map(field => [field.key, field.defaultDirection])),
    draft: Object.fromEntries(FIELDS.map(field => [field.key, ""])),
    currentStep: 0,
    saving: false,
    editingId: null
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
    return number.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  const parseNumber = value => {
    let normalized = String(value ?? "").trim().replace(/\s/g, "");
    if (!normalized) return null;
    // O Memory aceita tanto vírgula quanto ponto como separador decimal no celular.
    // Nunca interpreta um único ponto/vírgula como separador de milhar em medidas corporais.
    if (normalized.includes(",") && normalized.includes(".")) {
      const lastComma = normalized.lastIndexOf(",");
      const lastDot = normalized.lastIndexOf(".");
      if (lastComma > lastDot) normalized = normalized.replace(/\./g, "").replace(",", ".");
      else normalized = normalized.replace(/,/g, "");
    } else {
      normalized = normalized.replace(",", ".");
    }
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
    // Compatibilidade com medições antigas sem apagar o histórico existente.
    if (field.key === "bicepsRelaxadoDireito") return parseNumber(row.bicepsDireito ?? row.bracoDireito);
    if (field.key === "bicepsRelaxadoEsquerdo") return parseNumber(row.bicepsEsquerdo ?? row.bracoEsquerdo);
    if (field.key === "antebracoDireito") return parseNumber(row.antebracoDireito ?? row.bracoDireito);
    if (field.key === "antebracoEsquerdo") return parseNumber(row.antebracoEsquerdo ?? row.bracoEsquerdo);
    if (field.key === "coxaMediaDireita") return parseNumber(row.coxaDireita);
    if (field.key === "coxaMediaEsquerda") return parseNumber(row.coxaEsquerda);
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
        <input data-measure-input="${esc(field.key)}" name="${esc(field.key)}" type="text" inputmode="decimal" value="${esc(value)}" placeholder="${field.key==="peso"?"94,35":"0,0"}" autocomplete="off" aria-label="${esc(field.label)}">
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
          : `<div class="measure-save-actions">
              ${state.editingId ? `<button class="btn" type="button" data-cancel-edit>Cancelar edição</button>` : ""}
              <button class="btn primary" type="submit">${state.editingId ? "Salvar alterações ✓" : "Salvar medição ✓"}</button>
            </div>`}
      </div>
      ${state.editingId ? `<div class="measure-editing-banner">✎ Editando uma medição já salva. Ao salvar, o registro será atualizado sem criar uma duplicata.</div>` : ""}
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
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        window.MMCDMobileNavGuard?.arm?.(1200);
        goStep(Number(button.dataset.goStep));
      });
    });
    root.querySelector("[data-prev-step]")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      window.MMCDMobileNavGuard?.arm?.(1200);
      goStep(state.currentStep - 1);
    });
    root.querySelector("[data-next-step]")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      window.MMCDMobileNavGuard?.arm?.(1200);
      goStep(state.currentStep + 1);
    });
    root.querySelector("[data-cancel-edit]")?.addEventListener("click", event => {
      event.preventDefault();
      cancelEditMeasure();
    });

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
    if (window.innerWidth <= 720) {
      window.MMCDMobileNavGuard?.arm?.(1200);
      requestAnimationFrame(() => card?.scrollIntoView({ behavior: "auto", block: "start" }));
    }
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
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        window.MMCDMobileNavGuard?.arm?.(1200);
        goStep(Number(button.dataset.summaryStep));
      });
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

  function comparisonBodySvg(statusByRegion){
    const cls = region => `compare-body-region ${statusByRegion[region] || "neutral"}`;
    return `<svg viewBox="0 0 360 620" role="img" aria-label="Mapa corporal da evolução">
      <ellipse class="${cls("ombros")}" cx="180" cy="60" rx="42" ry="42"/>
      <path class="${cls("ombros")}" d="M118 116 Q145 96 180 104 Q215 96 242 116 L232 154 Q207 142 180 145 Q153 142 128 154 Z"/>
      <path class="${cls("peitoral")}" d="M126 151 Q180 132 234 151 L225 218 Q180 236 135 218 Z"/>
      <path class="${cls("abdomen")}" d="M137 218 Q180 235 223 218 L220 267 Q180 281 140 267 Z"/>
      <rect class="${cls("cintura")}" x="142" y="265" width="76" height="42" rx="19"/>
      <path class="${cls("quadril")}" d="M137 304 Q180 325 223 304 L234 350 Q180 378 126 350 Z"/>
      <path class="${cls("bicepsEsquerdo")}" d="M92 116 Q103 108 118 113 L126 194 Q111 204 96 194 L88 128 Z"/>
      <path class="${cls("antebracoEsquerdo")}" d="M96 196 Q111 205 126 196 L130 286 Q116 295 101 286 L95 222 Z"/>
      <path class="${cls("bicepsDireito")}" d="M268 116 Q257 108 242 113 L234 194 Q249 204 264 194 L272 128 Z"/>
      <path class="${cls("antebracoDireito")}" d="M264 196 Q249 205 234 196 L230 286 Q244 295 259 286 L265 222 Z"/>
      <path class="${cls("coxaSuperiorEsquerda")}" d="M128 350 Q154 340 174 362 L171 400 Q146 410 124 397 Z"/>
      <path class="${cls("coxaSuperiorDireita")}" d="M232 350 Q206 340 186 362 L189 400 Q214 410 236 397 Z"/>
      <path class="${cls("coxaMediaEsquerda")}" d="M124 398 Q147 410 171 401 L168 438 Q145 448 121 436 Z"/>
      <path class="${cls("coxaMediaDireita")}" d="M236 398 Q213 410 189 401 L192 438 Q215 448 239 436 Z"/>
      <path class="${cls("coxaInferiorEsquerda")}" d="M121 437 Q145 448 168 439 L166 475 Q145 493 119 470 Z"/>
      <path class="${cls("coxaInferiorDireita")}" d="M239 437 Q215 448 192 439 L194 475 Q215 493 241 470 Z"/>
      <path class="${cls("panturrilhaEsquerda")}" d="M119 467 Q145 478 166 470 L158 573 Q142 590 126 573 Z"/>
      <path class="${cls("panturrilhaDireita")}" d="M241 467 Q215 478 194 470 L202 573 Q218 590 234 573 Z"/>
      <path class="compare-body-outline" d="M180 20 C155 20 138 37 138 59 C138 76 147 91 160 98 C140 101 122 111 111 129 L87 190 L98 294 C102 310 112 319 123 319 L117 357 L108 470 L120 592 L157 592 L175 490 L180 386 L185 490 L203 592 L240 592 L252 470 L243 357 L237 319 C248 319 258 310 262 294 L273 190 L249 129 C238 111 220 101 200 98 C213 91 222 76 222 59 C222 37 205 20 180 20 Z"/>
    </svg>`;
  }

  function comparisonBodyMap(previous,current){
    const statusByRegion={};
    let good=0,bad=0,neutral=0;
    for(const field of FIELDS){
      if(field.key==="peso") continue;
      const before=getFieldValue(previous,field), after=getFieldValue(current,field);
      if(!Number.isFinite(before)||!Number.isFinite(after)) continue;
      const status=compareStatus(after,before,state.direcoes[field.key]||field.defaultDirection);
      // Bíceps relaxado e contraído ocupam a mesma área: se houver qualquer piora,
      // vermelho prevalece; depois verde; por fim neutro.
      const currentStatus=statusByRegion[field.region];
      if(!currentStatus || status==="bad" || (status==="good" && currentStatus!=="bad")) statusByRegion[field.region]=status;
      if(status==="good") good++; else if(status==="bad") bad++; else neutral++;
    }
    return `<section class="measure-body-comparison">
      <div class="measure-body-comparison__head"><div><p class="eyebrow">Body Scan</p><h3>Onde seu corpo evoluiu</h3><p>${datePt(previous.data)} → ${datePt(current.data)}</p></div><span>${good+bad+neutral} comparadas</span></div>
      <div class="measure-body-comparison__stage">${comparisonBodySvg(statusByRegion)}</div>
      <div class="measure-body-comparison__legend"><span><i class="good"></i>Evolução positiva</span><span><i class="bad"></i>Evolução negativa</span><span><i class="neutral"></i>Sem alteração</span></div>
      <div class="measure-body-comparison__summary"><b class="good">${good} evoluíram</b><b class="bad">${bad} não evoluíram</b><b>${neutral} sem alteração</b></div>
    </section>`;
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
      ? `${comparisonBodyMap(previous,current)}<div class="measure-comparison-period">${datePt(previous.data)} → ${datePt(current.data)}</div><div class="measure-comparison-grid">${cards.join("")}</div>`
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
      return `<article class="measure-history-row-v40 ${String(state.editingId)===String(row.id) ? "is-editing" : ""}">
        <strong>${datePt(row.data)}</strong>
        <div class="measure-history-row-v40__values">${chips || '<span class="muted">Sem medidas corporais</span>'}</div>
        <div class="measure-history-row-v40__actions">
          <button type="button" class="measure-history-edit" data-edit-measure="${esc(row.id)}">Editar</button>
          <button type="button" class="measure-history-delete" data-delete-measure="${esc(row.id)}">Excluir</button>
        </div>
      </article>`;
    }).join("")}</div>`;
  }

  async function saveMeasures() {
    await saveKey(MEASURES_KEY, { schemaVersion: 4, medidas: state.medidas, atualizadoEm: new Date().toISOString() });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.saving) return;
    syncVisibleInputs();

    const existing = state.editingId
      ? state.medidas.find(item => String(item.id) === String(state.editingId))
      : null;

    const row = {
      id: existing?.id || uuid(),
      data: currentDate(),
      observacao: String(state.observation || "").trim(),
      criadoEm: existing?.criadoEm || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
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
      setStatus(state.editingId ? "Atualizando…" : "Salvando…", "saving");

      const previousRows = [...state.medidas];
      if (existing) {
        state.medidas = state.medidas.map(item => String(item.id) === String(existing.id) ? row : item);
      } else {
        state.medidas.push(row);
      }

      try {
        await saveMeasures();
      } catch (saveError) {
        state.medidas = previousRows;
        throw saveError;
      }

      const wasEditing = Boolean(existing);
      state.editingId = null;
      setStatus("Salvo no Supabase", "saved");
      window.MMCDUI?.toast?.(wasEditing ? "Medição atualizada com sucesso." : "Body Scan salvo com sucesso.");
      renderComparison();
      state.draft = Object.fromEntries(FIELDS.map(field => [field.key, ""]));
      state.observation = "";
      state.currentStep = 0;
      const dateInput = document.querySelector("#measure-date");
      if (dateInput) dateInput.value = todayIso();
      renderCurrentStep();
      renderCompletedSteps();
      renderHistory();
    } catch (error) {
      setStatus("Erro ao salvar", "error");
      window.MMCDUI?.toast?.(error.message || "Não foi possível salvar a medição.", 4500);
    } finally {
      state.saving = false;
    }
  }

  function editMeasure(id) {
    const row = state.medidas.find(item => String(item.id) === String(id));
    if (!row) {
      window.MMCDUI?.toast?.("Medição não encontrada.");
      return;
    }

    state.editingId = row.id;
    state.draft = Object.fromEntries(FIELDS.map(field => {
      const value = getFieldValue(row, field);
      return [field.key, Number.isFinite(value) ? String(value).replace(".", ",") : ""];
    }));
    state.observation = String(row.observacao || "");
    state.currentStep = 0;

    const dateInput = document.querySelector("#measure-date");
    if (dateInput) dateInput.value = row.data || todayIso();

    setStatus(`Editando ${datePt(row.data)}`, "editing");
    renderCurrentStep();
    renderCompletedSteps();
    renderHistory();

    const card = document.querySelector(".measure-form-card");
    window.MMCDMobileNavGuard?.arm?.(1200);
    requestAnimationFrame(() => card?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function cancelEditMeasure() {
    state.editingId = null;
    state.draft = Object.fromEntries(FIELDS.map(field => [field.key, ""]));
    state.observation = "";
    state.currentStep = 0;

    const dateInput = document.querySelector("#measure-date");
    if (dateInput) dateInput.value = todayIso();

    setStatus("Salvo no Supabase", "saved");
    renderCurrentStep();
    renderCompletedSteps();
    renderHistory();
  }

  async function deleteMeasure(id) {
    const previousRows = [...state.medidas];
    state.medidas = state.medidas.filter(item => String(item.id) !== String(id));
    const wasEditing = String(state.editingId) === String(id);
    if (wasEditing) state.editingId = null;
    try {
      setStatus("Salvando…", "saving");
      await saveMeasures();
      setStatus("Salvo no Supabase", "saved");
      renderComparison();
      if (wasEditing) {
        state.draft = Object.fromEntries(FIELDS.map(field => [field.key, ""]));
        state.observation = "";
        state.currentStep = 0;
        const dateInput = document.querySelector("#measure-date");
        if (dateInput) dateInput.value = todayIso();
        renderCurrentStep();
        renderCompletedSteps();
      }
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
        const editButton = event.target.closest("[data-edit-measure]");
        if (editButton) {
          editMeasure(editButton.dataset.editMeasure);
          return;
        }
        const deleteButton = event.target.closest("[data-delete-measure]");
        if (deleteButton) deleteMeasure(deleteButton.dataset.deleteMeasure);
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
