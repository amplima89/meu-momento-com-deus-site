"use strict";

(() => {
  const pad = n => String(n).padStart(2, "0");
  const iso = value => `${value.getFullYear()}-${pad(value.getMonth()+1)}-${pad(value.getDate())}`;
  const parse = value => new Date(`${value}T12:00:00`);
  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  let rendering = false;
  let latest = {
    current: 0,
    record: 0,
    percent30: 0,
    completed30: 0,
    scheduled30: 0
  };

  function devotionalMeta(data, date) {
    const candidates = (data?.metas || []).filter(meta =>
      /(medita|devocional)/.test(
        normalize(`${meta?.nome || ""} ${meta?.descricao || ""}`)
      )
    );

    return candidates.find(meta => window.MMCD?.ativaNaData?.(meta, date))
      || candidates[0]
      || null;
  }

  function calculate(data, referenceDate = iso(new Date())) {
    const meta = devotionalMeta(data, referenceDate);

    if (!meta) {
      return {
        current: 0,
        record: 0,
        percent30: 0,
        completed30: 0,
        scheduled30: 0
      };
    }

    const completed = date => {
      const row = MMCD.registro(data, date, meta.id);
      return Boolean(row?.concluida && !MMCD.estaAbonada(row));
    };

    const end = parse(referenceDate);
    const last30 = [];

    for (let i = 29; i >= 0; i--) {
      const item = new Date(end);
      item.setDate(item.getDate() - i);
      last30.push(iso(item));
    }

    const valid30 = last30.filter(date => MMCD.ativaNaData(meta, date));
    const completed30 = valid30.filter(completed).length;

    const startIso = meta?.inicioVigencia || valid30[0] || referenceDate;
    const history = [];

    for (
      let cursor = parse(startIso), endDate = parse(referenceDate);
      cursor <= endDate;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      const date = iso(cursor);
      if (MMCD.ativaNaData(meta, date)) history.push(date);
    }

    let record = 0;
    let sequence = 0;

    for (const date of history) {
      sequence = completed(date) ? sequence + 1 : 0;
      record = Math.max(record, sequence);
    }

    let index = history.length - 1;

    if (
      index >= 0
      && history[index] === referenceDate
      && !completed(referenceDate)
    ) {
      index -= 1;
    }

    let current = 0;

    for (; index >= 0 && completed(history[index]); index--) {
      current += 1;
    }

    record = Math.max(record, current);

    return {
      current,
      record,
      percent30: valid30.length
        ? Math.round((completed30 / valid30.length) * 100)
        : 0,
      completed30,
      scheduled30: valid30.length
    };
  }

  async function renderConsistency() {
    if (rendering) return;
    rendering = true;

    try {
      const data = await MMCD.carregar();
      const today = iso(new Date());

      latest = calculate(data, today);

      const el = document.querySelector("#meditation-consistency");
      if (!el) return;

      const meta = devotionalMeta(data, today);

      const completed = date => {
        if (!meta) return false;
        const row = MMCD.registro(data, date, meta.id);
        return Boolean(row?.concluida && !MMCD.estaAbonada(row));
      };

      const last30 = [];

      for (let i = 29; i >= 0; i--) {
        const item = new Date();
        item.setDate(item.getDate() - i);
        last30.push(iso(item));
      }

      el.innerHTML = `
        <div class="consistency__top">
          <div>
            <h2>CONSISTÊNCIA NA DEVOCIONAL</h2>
            <p>Você está há <strong>${latest.current} ${latest.current===1?"dia":"dias"}</strong> consecutivos.</p>
            <p>Seu recorde é <strong>${latest.record} ${latest.record===1?"dia":"dias"}</strong>.</p>
          </div>
          <strong>${latest.percent30}%</strong>
        </div>

        <div class="consistency-grid">
          ${last30.map(date => {
            const scheduled = meta && MMCD.ativaNaData(meta, date);
            const state = !scheduled ? "off" : completed(date) ? "on" : "missed";
            const label = !scheduled ? "Não programada" : completed(date) ? "Realizada" : "Não realizada";
            return `<i class="consistency-cell ${state}" title="${MMCDUI.date(date)} — ${label}"></i>`;
          }).join("")}
        </div>
      `;

      document.dispatchEvent(
        new CustomEvent("memory:devotional-consistency-updated", {
          detail: latest
        })
      );
    } finally {
      rendering = false;
    }
  }

  window.MemoryDevotionalConsistency = {
    version: "v81.15",
    calculate,
    getLatest: () => ({ ...latest }),
    refresh: renderConsistency
  };

  document.addEventListener("memory:activity-updated", renderConsistency);
  document.addEventListener("memory:meditation-rendered", renderConsistency);

  window.addEventListener(
    "load",
    () => setTimeout(() => renderConsistency().catch(console.error), 80),
    { once: true }
  );

  renderConsistency().catch(console.error);
})();
