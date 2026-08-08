"use strict";

(async () => {
  const CHAVE = "historico_series_ingles_v1";
  const seletor = document.querySelector("#ingles-data");
  const cardAula = document.querySelector(".english-card");
  if (!seletor || !cardAula || !window.MMCDAuth || !window.MMCDSupabase) return;

  const esc = valor => window.MMCDUI?.esc
    ? window.MMCDUI.esc(valor)
    : String(valor ?? "").replace(/[&<>"']/g, "");

  const card = document.createElement("section");
  card.id = "ingles-cena-ia";
  card.className = "card english-auto-scene";
  card.hidden = true;
  cardAula.parentNode.insertBefore(card, cardAula);

  let itens = [];

  function dataSelecionada() {
    const texto = seletor.selectedOptions?.[0]?.textContent?.trim() || "";
    const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  }

  function localizacao(item) {
    if (item.tipo === "filme") return `${item.inicio || "?"} → ${item.fim || "?"}`;
    const episodio = `${item.temporada ? `T${item.temporada}` : ""}${item.episodio ? `E${item.episodio}` : ""}`;
    return `${episodio || "Episódio"} · ${item.inicio || "?"} → ${item.fim || "?"}`;
  }

  function render() {
    const data = dataSelecionada();
    const item = itens.find(reg => String(reg?.data || "") === data);
    if (!item) {
      card.hidden = true;
      card.innerHTML = "";
      return;
    }

    const expressoes = Array.isArray(item.expressoes) ? item.expressoes.slice(0,3) : [];
    card.innerHTML = `
      <div class="english-auto-scene__icon">▶</div>
      <div class="english-auto-scene__head">
        <div>
          <p class="eyebrow">Cena sugerida automaticamente</p>
          <h2>${esc(item.titulo || "Série ou filme")}</h2>
        </div>
        <div class="english-auto-scene__location">${esc(localizacao(item))}</div>
      </div>
      <div class="english-auto-scene__body">
        ${item.motivo ? `<p class="english-auto-scene__why"><strong>Por que esta cena:</strong> ${esc(item.motivo)}</p>` : ""}
        ${item.resumo ? `<p>${esc(item.resumo)}</p>` : ""}
        ${expressoes.length ? `<div class="english-auto-scene__expressions">${expressoes.map(x => `<span>${esc(typeof x === "string" ? x : x?.english || "")}</span>`).join("")}</div>` : ""}
        <p class="english-auto-scene__note">O horário é aproximado e pode variar um pouco conforme a versão da plataforma. A cena foi selecionada a partir de legenda inglesa disponível publicamente.</p>
      </div>`;
    card.hidden = false;
  }

  try {
    const session = await window.MMCDAuth.requireSession();
    const { data, error } = await window.MMCDSupabase
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", session.user.id)
      .eq("chave", CHAVE)
      .maybeSingle();

    if (error) throw error;
    itens = Array.isArray(data?.valor?.itens) ? data.valor.itens : [];
  } catch (erro) {
    console.warn("Não foi possível carregar o histórico automático de séries.", erro);
    return;
  }

  seletor.addEventListener("change", () => setTimeout(render, 0));

  let tentativas = 0;
  const aguardar = setInterval(() => {
    tentativas += 1;
    if (seletor.options.length || tentativas >= 20) {
      clearInterval(aguardar);
      render();
    }
  }, 150);
})();
