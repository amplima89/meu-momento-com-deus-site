"use strict";

window.MMCD = (() => {
  const CHAVE = "mmcd:vida:v2";
  const CHAVE_LEGADA = "mmcd:alvos:v1";
  const ARQUIVO_PADRAO = {
    schemaVersion: 2,
    atualizadoEm: "",
    configuracoes: {
      metaLivrosAno: 30,
      anoMetaLivros: 2026,
      missaoAtual: { id: "retomar-controle-2026-07", titulo: "Retomar o controle", inicio: "2026-07-28", fim: "2026-08-09", pesoAlvo: 93.5 }
    },
    habitos: {},
    livros: { atual: { titulo: "Sem Esforço", autor: "Greg McKeown", dataInicio: "", observacoes: "" }, concluidos: [], pendentesData: [] }
  };

  let cache = null;
  let apiDisponivel = false;

  function clonar(valor) { return JSON.parse(JSON.stringify(valor)); }

  function mesclar(base, valor) {
    const v = valor && typeof valor === "object" ? valor : {};
    return {
      ...base, ...v,
      configuracoes: { ...base.configuracoes, ...(v.configuracoes || {}), missaoAtual: { ...base.configuracoes.missaoAtual, ...(v.configuracoes?.missaoAtual || {}) } },
      habitos: v.habitos && typeof v.habitos === "object" ? v.habitos : {},
      livros: {
        ...base.livros, ...(v.livros || {}),
        atual: { ...base.livros.atual, ...(v.livros?.atual || {}) },
        concluidos: Array.isArray(v.livros?.concluidos) ? v.livros.concluidos : [],
        pendentesData: Array.isArray(v.livros?.pendentesData) ? v.livros.pendentesData : []
      }
    };
  }

  function lerLocal() {
    try {
      const atual = JSON.parse(localStorage.getItem(CHAVE));
      if (atual) return mesclar(ARQUIVO_PADRAO, atual);
    } catch (_) {}

    // Migração automática da primeira versão do calendário, quando estiver na mesma origem.
    try {
      const legado = JSON.parse(localStorage.getItem(CHAVE_LEGADA));
      if (legado?.dias && typeof legado.dias === "object") {
        const migrado = mesclar(ARQUIVO_PADRAO, {
          atualizadoEm: legado.atualizadoEm || new Date().toISOString(),
          habitos: legado.dias
        });
        localStorage.setItem(CHAVE, JSON.stringify(migrado));
        return migrado;
      }
    } catch (_) {}
    return null;
  }

  function pontuacao(dados) {
    if (!dados) return 0;
    const dias = Object.keys(dados.habitos || {}).length;
    const livros = (dados.livros?.concluidos || []).length;
    const atual = dados.livros?.atual?.titulo ? 1 : 0;
    return dias * 100 + livros * 10 + atual;
  }

  function maisRecente(a, b) {
    const ta = Date.parse(a?.atualizadoEm || "") || 0;
    const tb = Date.parse(b?.atualizadoEm || "") || 0;
    if (ta !== tb) return ta > tb ? a : b;
    return pontuacao(a) >= pontuacao(b) ? a : b;
  }

  async function gravarApi(dados) {
    const r = await fetch("/api/dados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });
    if (!r.ok) throw new Error("Não foi possível gravar o arquivo pelo Python.");
    return await r.json();
  }

  async function carregar() {
    if (cache) return cache;
    const local = lerLocal();

    try {
      const r = await fetch("/api/dados", { cache: "no-store" });
      if (r.ok) {
        apiDisponivel = true;
        const servidor = mesclar(ARQUIVO_PADRAO, await r.json());
        cache = maisRecente(local, servidor) || servidor;

        // Nunca substitui silenciosamente um histórico local mais completo por um arquivo vazio.
        if (local && cache === local && pontuacao(local) > pontuacao(servidor)) {
          await gravarApi(local);
        }
        localStorage.setItem(CHAVE, JSON.stringify(cache));
        return cache;
      }
    } catch (_) {}

    if (local) { cache = local; return cache; }

    try {
      const r = await fetch("dados/vida.json", { cache: "no-store" });
      if (r.ok) {
        cache = mesclar(ARQUIVO_PADRAO, await r.json());
        localStorage.setItem(CHAVE, JSON.stringify(cache));
        return cache;
      }
    } catch (_) {}

    cache = clonar(ARQUIVO_PADRAO);
    return cache;
  }

  async function salvar(dados) {
    cache = mesclar(ARQUIVO_PADRAO, dados);
    cache.atualizadoEm = new Date().toISOString();
    localStorage.setItem(CHAVE, JSON.stringify(cache));
    if (apiDisponivel) {
      const resposta = await gravarApi(cache);
      return { modo: "arquivo", publicado: Boolean(resposta.publicado), aviso: resposta.aviso || "" };
    }
    return { modo: "navegador" };
  }

  async function exportar() {
    const dados = await carregar();
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mmcd-dados-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function importar(arquivo) {
    const texto = await arquivo.text();
    const dados = mesclar(ARQUIVO_PADRAO, JSON.parse(texto));
    return salvar(dados);
  }

  function modo() { return apiDisponivel ? "arquivo" : "navegador"; }
  function invalidar() { cache = null; }
  return { carregar, salvar, exportar, importar, modo, invalidar };
})();
