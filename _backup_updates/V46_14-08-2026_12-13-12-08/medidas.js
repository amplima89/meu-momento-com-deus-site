"use strict";

(async () => {
  const db = window.MMCDSupabase;
  const session = await window.MMCDAuth.requireSession();
  const user = session.user;

  const MEASURES_KEY = "treino_medidas_v1";
  const CONFIG_KEY = "treino_medidas_config_v1";

  const FIELDS = [
    { key: "peso", label: "Peso corporal", unit: "kg", region: "peso", defaultDirection: "down" },
    { key: "cintura", label: "Cintura", unit: "cm", region: "cintura", defaultDirection: "down" },
    { key: "abdomen", label: "Abdômen", unit: "cm", region: "abdomen", defaultDirection: "down" },
    { key: "peitoral", label: "Peitoral", unit: "cm", region: "peitoral", defaultDirection: "up" },
    { key: "bicepsDireito", label: "Bíceps direito", unit: "cm", region: "bicepsDireito", defaultDirection: "up" },
    { key: "antebracoDireito", label: "Antebraço direito", unit: "cm", region: "antebracoDireito", defaultDirection: "up" },
    { key: "bicepsEsquerdo", label: "Bíceps esquerdo", unit: "cm", region: "bicepsEsquerdo", defaultDirection: "up" },
    { key: "antebracoEsquerdo", label: "Antebraço esquerdo", unit: "cm", region: "antebracoEsquerdo", defaultDirection: "up" },
    { key: "quadril", label: "Quadril", unit: "cm", region: "quadril", defaultDirection: "neutral" },
    { key: "coxaDireita", label: "Coxa direita", unit: "cm", region: "coxaDireita", defaultDirection: "up" },
    { key: "coxaEsquerda", label: "Coxa esquerda", unit: "cm", region: "coxaEsquerda", defaultDirection: "up" },
    { key: "panturrilhaDireita", label: "Panturrilha direita", unit: "cm", region: "panturrilhaDireita", defaultDirection: "up" },
    { key: "panturrilhaEsquerda", label: "Panturrilha esquerda", unit: "cm", region: "panturrilhaEsquerda", defaultDirection: "up" }
  ];

  const state = {
    medidas: [],
    direcoes: Object.fromEntries(FIELDS.map(field => [field.key, field.defaultDirection])),
    saving: false
  };

  const esc = value => window.MMCDUI?.esc ? MMCDUI.esc(value) : String(value ?? "");
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
  const getFieldValue = (row, field) => {
    if (!row || !field) return null;
    const direct = parseNumber(row[field.key]);
    if (Number.isFinite(direct)) return direct;

    if (field.key === "bicepsDireito" || field.key === "antebracoDireito") {
      return parseNumber(row.bracoDireito);
    }
    if (field.key === "bicepsEsquerdo" || field.key === "antebracoEsquerdo") {
      return parseNumber(row.bracoEsquerdo);
    }
    return null;
  };
  const datePt = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : `med-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
      .upsert({
        user_id: user.id,
        chave,
        valor
      }, { onConflict: "user_id,chave" });

    if (error) throw new Error(`Não foi possível salvar ${chave}: ${error.message}`);
  }

  function setStatus(message, kind = "") {
    const target = document.querySelector("#measure-save-status");
    if (!target) return;
    target.textContent = message;
    target.dataset.kind = kind;
  }

  function directionLabel(direction) {
    if (direction === "down") return "↓ reduzir é positivo";
    if (direction === "up") return "↑ aumentar é positivo";
    return "↔ apenas acompanhar";
  }

  function fieldHtml(field, index) {
    return `
      <div class="measure-field" data-measure-field="${esc(field.key)}">
        <div class="measure-field__head">
          <div class="measure-field__label">
            <strong>${String(index + 1).padStart(2, "0")} · ${esc(field.label)}</strong>
            <small>${field.key === "peso" ? "Massa corporal" : "Circunferência corporal"}</small>
          </div>
          <span class="measure-field__check" aria-hidden="true">✓</span>
        </div>
        <div class="measure-field__input">
          <input
            name="${esc(field.key)}"
            type="number"
            min="0"
            step="0.1"
            inputmode="decimal"
            placeholder="0,0"
            aria-label="${esc(field.label)}">
          <span class="measure-unit">${esc(field.unit)}</span>
        </div>
        <label class="measure-direction">
          <span>Lógica</span>
          <select data-direction-field="${esc(field.key)}" aria-label="Direção positiva para ${esc(field.label)}">
            <option value="up">↑ aumentar é positivo</option>
            <option value="down">↓ reduzir é positivo</option>
            <option value="neutral">↔ apenas acompanhar</option>
          </select>
        </label>
      </div>`;
  }

  function renderFields() {
    const root = document.querySelector("#measure-fields");
    root.innerHTML = `
      <label class="field measure-date-field">
        <span>Data</span>
        <input name="data" type="date" value="${todayIso()}" required>
      </label>
      ${FIELDS.map(fieldHtml).join("")}
    `;

    root.querySelectorAll("[data-direction-field]").forEach(select => {
      const key = select.dataset.directionField;
      select.value = state.direcoes[key] || FIELDS.find(field => field.key === key)?.defaultDirection || "neutral";
    });
  }

  function sortedMeasures() {
    return [...state.medidas].sort((a, b) => {
      const byDate = String(a.data || "").localeCompare(String(b.data || ""));
      if (byDate !== 0) return byDate;
      return String(a.criadoEm || "").localeCompare(String(b.criadoEm || ""));
    });
  }

  function previousMeasurement(date) {
    return sortedMeasures()
      .filter(item => item?.data && item.data < date)
      .at(-1) || null;
  }

  function compareStatus(current, previous, direction) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return "measured";
    const delta = current - previous;
    if (Math.abs(delta) < 0.0001 || direction === "neutral") return "neutral";
    if (direction === "down") return delta < 0 ? "good" : "bad";
    return delta > 0 ? "good" : "bad";
  }

  function currentFormData() {
    const form = document.querySelector("#measure-form");
    const data = String(form.elements.data?.value || todayIso());
    const values = {};
    for (const field of FIELDS) {
      values[field.key] = parseNumber(form.elements[field.key]?.value);
    }
    return { data, values };
  }

  function statusIcon(status) {
    if (status === "good") return "↗";
    if (status === "bad") return "↘";
    return "✓";
  }

  function updateBodyScan() {
    const { data, values } = currentFormData();
    const previous = previousMeasurement(data);
    const scan = document.querySelector("#body-scan");
    const readout = document.querySelector("#body-scan-readout");
    let filled = 0;
    const items = [];

    document.querySelectorAll(".body-region").forEach(region => {
      region.classList.remove("is-measured", "is-good", "is-bad", "is-neutral");
    });
    scan?.classList.remove("has-weight", "weight-good", "weight-bad", "weight-neutral");

    for (const field of FIELDS) {
      const value = values[field.key];
      const fieldCard = document.querySelector(`[data-measure-field="${field.key}"]`);
      fieldCard?.classList.remove("is-filled", "is-good", "is-bad", "is-neutral");

      if (!Number.isFinite(value)) continue;
      filled += 1;

      const previousValue = getFieldValue(previous, field);
      const status = compareStatus(value, previousValue, state.direcoes[field.key] || field.defaultDirection);

      fieldCard?.classList.add("is-filled");
      if (status === "good" || status === "bad" || status === "neutral") fieldCard?.classList.add(`is-${status}`);

      if (field.key === "peso") {
        scan?.classList.add("has-weight", `weight-${status}`);
      } else {
        document.querySelectorAll(`[data-region="${field.region}"]`).forEach(region => {
          region.classList.add(status === "measured" ? "is-measured" : `is-${status}`);
        });
      }

      const delta = Number.isFinite(previousValue) ? value - previousValue : null;
      items.push({
        field,
        value,
        delta,
        status
      });
    }

    const count = document.querySelector("#body-scan-count");
    if (count) count.textContent = `${filled}/${FIELDS.length}`;

    if (readout) {
      readout.innerHTML = items.length
        ? items.map(item => {
            const deltaText = item.delta === null
              ? item.field.unit
              : `${item.delta > 0 ? "+" : ""}${fmt(item.delta)} ${item.field.unit}`;
            return `<div class="body-readout-item ${item.status}">
              <span>${esc(item.field.label)}</span>
              <strong>${fmt(item.value)} ${esc(item.field.unit)} · ${esc(deltaText)} ${statusIcon(item.status)}</strong>
            </div>`;
          }).join("")
        : `<div class="measure-empty">Comece a preencher as medidas. Cada região aparecerá no mapa conforme os dados forem informados.</div>`;
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
      <b>${delta > 0 ? "+" : ""}${fmt(delta)} ${esc(field.unit)} · ${esc(directionLabel(direction))}</b>
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
      ? `<div class="measure-comparison-period">${datePt(previous.data)} → ${datePt(current.data)}</div>
         <div class="measure-comparison-grid">${cards.join("")}</div>`
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
      const chips = FIELDS
        .map(field => {
          const value = getFieldValue(row, field);
          if (!Number.isFinite(value)) return "";
          return `<span class="measure-history-chip">${esc(field.label)} ${fmt(value)} ${esc(field.unit)}</span>`;
        })
        .filter(Boolean)
        .join("");
      return `<article class="measure-history-row-v40">
        <strong>${datePt(row.data)}</strong>
        <div class="measure-history-row-v40__values">${chips || '<span class="muted">Sem medidas corporais</span>'}</div>
        <button type="button" data-delete-measure="${esc(row.id)}">Excluir</button>
      </article>`;
    }).join("")}</div>`;
  }

  async function saveMeasures() {
    await saveKey(MEASURES_KEY, {
      schemaVersion: 2,
      medidas: state.medidas,
      atualizadoEm: new Date().toISOString()
    });
  }

  async function saveDirections() {
    await saveKey(CONFIG_KEY, {
      schemaVersion: 1,
      direcoes: state.direcoes,
      atualizadoEm: new Date().toISOString()
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (state.saving) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const row = {
      id: uuid(),
      data: String(formData.get("data") || todayIso()),
      observacao: String(formData.get("observacao") || "").trim(),
      criadoEm: new Date().toISOString()
    };

    let hasValue = false;
    for (const field of FIELDS) {
      const value = parseNumber(formData.get(field.key));
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
      await Promise.all([saveMeasures(), saveDirections()]);
      setStatus("Salvo no Supabase", "saved");
      window.MMCDUI?.toast?.("Medição salva.");
      renderComparison();
      renderHistory();
      updateBodyScan();
    } catch (error) {
      state.medidas = state.medidas.filter(item => item.id !== row.id);
      setStatus("Erro ao salvar", "error");
      window.MMCDUI?.toast?.(error.message || "Não foi possível salvar a medição.", 4500);
    } finally {
      state.saving = false;
    }
  }

  async function deleteMeasure(id) {
    const row = state.medidas.find(item => String(item.id) === String(id));
    if (!row) return;
    const previous = [...state.medidas];
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
      state.medidas = previous;
      setStatus("Erro ao salvar", "error");
      window.MMCDUI?.toast?.(error.message || "Não foi possível excluir.", 4500);
    }
  }

  async function init() {
    try {
      const [measureValue, configValue] = await Promise.all([
        loadKey(MEASURES_KEY),
        loadKey(CONFIG_KEY)
      ]);

      state.medidas = Array.isArray(measureValue?.medidas) ? measureValue.medidas : [];
      state.direcoes = {
        ...state.direcoes,
        ...(configValue?.direcoes && typeof configValue.direcoes === "object" ? configValue.direcoes : {})
      };

      renderFields();

      const form = document.querySelector("#measure-form");
      form.addEventListener("input", updateBodyScan);
      form.addEventListener("submit", handleSubmit);

      document.querySelector("#measure-fields").addEventListener("change", async event => {
        const select = event.target.closest("[data-direction-field]");
        if (!select) {
          updateBodyScan();
          return;
        }
        state.direcoes[select.dataset.directionField] = select.value;
        updateBodyScan();
        renderComparison();
        try {
          setStatus("Salvando lógica…", "saving");
          await saveDirections();
          setStatus("Salvo no Supabase", "saved");
        } catch (error) {
          setStatus("Erro ao salvar", "error");
          window.MMCDUI?.toast?.(error.message || "Não foi possível salvar a lógica da medida.", 4500);
        }
      });

      document.querySelector("#measure-history").addEventListener("click", event => {
        const button = event.target.closest("[data-delete-measure]");
        if (button) deleteMeasure(button.dataset.deleteMeasure);
      });

      renderComparison();
      renderHistory();
      updateBodyScan();
      setStatus("Salvo no Supabase", "saved");
    } catch (error) {
      console.error(error);
      setStatus("Falha ao carregar", "error");
      document.querySelector("#measure-history").innerHTML =
        `<div class="measure-empty">${esc(error.message || "Não foi possível carregar suas medições.")}</div>`;
    }
  }

  init();
})().catch(error => {
  console.error(error);
  window.MMCDUI?.toast?.(error.message || "Não foi possível abrir Medições corporais.", 5000);
});
