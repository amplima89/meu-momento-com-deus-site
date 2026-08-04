"use strict";
window.MMCD = (() => {
  const db = window.MMCDSupabase;
  const hoje = () => new Date().toISOString().slice(0, 10);
  const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || "");
  const clone = value => JSON.parse(JSON.stringify(value));
  let cache = null;
  let currentUser = null;

  const base = {
    schemaVersion: 5,
    atualizadoEm: "",
    configuracoes: {
      metaLivrosAno: 20,
      anoMetaLivros: new Date().getFullYear(),
      missaoAtual: { titulo: "Ser um homem melhor diante de Deus, da família e do meu propósito." }
    },
    metas: [], registros: {}, pesos: {}, observacoesDiarias: {}, meditacoes: {},
    livros: { atual: { titulo: "", autor: "", dataInicio: "", observacoes: "" }, concluidos: [] }
  };

  function merge(value = {}) {
    return {
      ...clone(base), ...value, schemaVersion: 5,
      configuracoes: {
        ...base.configuracoes, ...(value.configuracoes || {}),
        missaoAtual: { ...base.configuracoes.missaoAtual, ...(value.configuracoes?.missaoAtual || {}) }
      },
      metas: Array.isArray(value.metas) ? value.metas : [],
      registros: value.registros || {}, pesos: value.pesos || {},
      observacoesDiarias: value.observacoesDiarias || {}, meditacoes: value.meditacoes || {},
      livros: {
        ...base.livros, ...(value.livros || {}),
        atual: { ...base.livros.atual, ...(value.livros?.atual || {}) },
        concluidos: Array.isArray(value.livros?.concluidos) ? value.livros.concluidos : []
      }
    };
  }


  async function mustUser() {
    const session = await window.MMCDAuth.requireSession();
    currentUser = session.user;
    return currentUser;
  }

  function fail(error, context) {
    console.error(context, error);
    throw new Error(`${context}: ${error?.message || error}`);
  }

  async function select(table, columns = "*") {
    const { data, error } = await db.from(table).select(columns).eq("user_id", currentUser.id);
    if (error) fail(error, `Falha ao ler ${table}`);
    return data || [];
  }

  async function syncRows(table, rows, uniqueIds = true) {
    if (rows.length) {
      const { error } = await db.from(table).upsert(rows);
      if (error) fail(error, `Falha ao salvar ${table}`);
    }
    if (!uniqueIds) return;
    const ids = rows.map(row => row.id).filter(Boolean);
    let query = db.from(table).delete().eq("user_id", currentUser.id);
    if (ids.length) query = query.not("id", "in", `(${ids.join(",")})`);
    const { error } = await query;
    if (error) fail(error, `Falha ao remover registros antigos de ${table}`);
  }

  async function categoryMap(names) {
    const clean = [...new Set(names.map(x => String(x || "").trim()).filter(Boolean))];
    if (clean.length) {
      const existing = await select("categorias", "id,nome");
      const known = new Set(existing.map(x => x.nome.toLocaleLowerCase("pt-BR")));
      const missing = clean.filter(nome => !known.has(nome.toLocaleLowerCase("pt-BR"))).map(nome => ({ user_id: currentUser.id, nome, ativo: true }));
      if (missing.length) {
        const { error } = await db.from("categorias").insert(missing);
        if (error) fail(error, "Falha ao salvar categorias");
      }
    }
    const rows = await select("categorias", "id,nome");
    return Object.fromEntries(rows.map(row => [row.nome.toLocaleLowerCase("pt-BR"), row.id]));
  }

  function normalizeIds(data) {
    const map = new Map();
    data.metas = data.metas.map(item => {
      const old = item.id;
      const id = uuid(old) ? old : crypto.randomUUID();
      if (old !== id) map.set(old, id);
      return { ...item, id };
    });
    for (const rows of Object.values(data.registros || {})) {
      for (const row of rows) if (map.has(row.metaId)) row.metaId = map.get(row.metaId);
    }
    data.livros.concluidos = data.livros.concluidos.map(item => ({ ...item, id: uuid(item.id) ? item.id : crypto.randomUUID() }));
    if (data.livros.atual?.id && !uuid(data.livros.atual.id)) data.livros.atual.id = crypto.randomUUID();
    return data;
  }

  async function loadRemote() {
    const [categories, activities, activityRecords, books, goals, daily, configs, englishConfigs, meditations] = await Promise.all([
      select("categorias"), select("atividades"), select("registros_atividades"), select("livros"),
      select("metas"), select("registros_diarios"), select("configuracoes_usuario"), select("ingles_configuracao"),
      select("meditacoes", "data_meditacao,titulo,status")
    ]);
    const categoryById = Object.fromEntries(categories.map(x => [x.id, x.nome]));
    const englishByActivity = Object.fromEntries(englishConfigs.map(x => [x.atividade_id, x.niveis_por_dia || {}]));
    const data = merge({});

    for (const row of meditations) {
      if (!row.data_meditacao || row.status !== "publicada") continue;
      data.meditacoes[row.data_meditacao] = {
        titulo: row.titulo || "Meu Momento com Deus"
      };
    }

    data.metas = activities.map(row => ({
      id: row.id, nome: row.nome, descricao: row.descricao || "", categoria: categoryById[row.categoria_id] || "",
      tipo: row.tipo_registro || "check", unidade: row.unidade || "", icone: row.icone || "✓", cor: row.cor || "#2563eb",
      diasSemana: Array.isArray(row.dias_semana) ? row.dias_semana : [], quantidade: Number(row.quantidade || 1),
      frequencia: row.frequencia || ((row.dias_semana || []).length === 7 ? "diaria" : "semanal"),
      inicioVigencia: row.inicio_vigencia || "", fimVigencia: row.fim_vigencia || "", ativa: row.ativo !== false,
      nivelInglesPorDia: englishByActivity[row.id] || {}
    }));

    for (const row of activityRecords) {
      data.registros[row.data_registro] ||= [];
      data.registros[row.data_registro].push({
        metaId: row.atividade_id, concluida: !!row.concluido, valor: Number(row.valor_numerico || 0),
        observacao: row.observacao || "", texto: row.valor_texto || ""
      });
    }

    const current = books.find(x => x.livro_atual || x.status === "lendo");
    data.livros.atual = current ? {
      id: current.id, titulo: current.titulo, autor: current.autor || "", dataInicio: current.data_inicio || "",
      observacoes: current.principal_aprendizado || current.observacao || ""
    } : clone(base.livros.atual);
    data.livros.concluidos = books.filter(x => x.status === "concluido" || x.data_conclusao).map(row => ({
      id: row.id, titulo: row.titulo, autor: row.autor || "", dataInicio: row.data_inicio || "",
      dataConclusao: row.data_conclusao || "", aprendizado: row.principal_aprendizado || row.observacao || ""
    }));

    const annual = goals.find(x => x.unidade === "livros") || goals.find(x => /livro/i.test(x.titulo || ""));
    if (annual) {
      data.configuracoes.metaLivrosAno = Number(annual.valor_alvo || 20);
      data.configuracoes.anoMetaLivros = Number((annual.data_inicio || "").slice(0, 4)) || new Date().getFullYear();
    }
    for (const row of daily) {
      if (row.peso != null) data.pesos[row.data_registro] = Number(row.peso);
      if (row.observacao) data.observacoesDiarias[row.data_registro] = row.observacao;
    }
    const mission = configs.find(x => x.chave === "missao_atual");
    if (mission?.valor?.titulo) data.configuracoes.missaoAtual.titulo = mission.valor.titulo;
    data.atualizadoEm = new Date().toISOString();
    return data;
  }

  async function carregar() {
    if (cache) return cache;
    await mustUser();
    cache = await loadRemote();
    return cache;
  }

  async function salvar(input) {
    await mustUser();
    const data = normalizeIds(merge(input));
    const categories = await categoryMap(data.metas.map(x => x.categoria));

    const activityRows = data.metas.map(item => ({
      id: item.id, user_id: currentUser.id,
      categoria_id: categories[String(item.categoria || "").toLocaleLowerCase("pt-BR")] || null,
      nome: item.nome, descricao: item.descricao || null, tipo_registro: item.tipo || "check", unidade: item.unidade || null,
      icone: item.icone || "✓", cor: item.cor || "#2563eb", dias_semana: item.diasSemana || [],
      quantidade: Number(item.quantidade || 1), inicio_vigencia: item.inicioVigencia || null,
      fim_vigencia: item.fimVigencia || null, ativo: item.ativa !== false
    }));
    await syncRows("atividades", activityRows);

    const englishRows = data.metas.filter(item => Object.keys(item.nivelInglesPorDia || {}).length).map(item => ({
      id: crypto.randomUUID(), user_id: currentUser.id, atividade_id: item.id, niveis_por_dia: item.nivelInglesPorDia, ativo: item.ativa !== false
    }));
    const oldEnglish = await select("ingles_configuracao");
    for (const row of englishRows) {
      const old = oldEnglish.find(x => x.atividade_id === row.atividade_id);
      if (old) row.id = old.id;
    }
    await syncRows("ingles_configuracao", englishRows);

    const recordRows = [];
    for (const [date, rows] of Object.entries(data.registros || {})) {
      for (const row of rows) {
        if (!uuid(row.metaId)) continue;
        recordRows.push({
          user_id: currentUser.id, atividade_id: row.metaId, data_registro: date,
          concluido: !!row.concluida, valor_numerico: Number(row.valor || 0),
          valor_texto: row.texto || null, observacao: row.observacao || null
        });
      }
    }
    if (recordRows.length) {
      const { error } = await db.from("registros_atividades").upsert(recordRows, { onConflict: "user_id,atividade_id,data_registro" });
      if (error) fail(error, "Falha ao salvar registros das atividades");
    }
    const activityIds = activityRows.map(x => x.id);
    if (activityIds.length) {
      const { error } = await db.from("registros_atividades").delete().eq("user_id", currentUser.id).not("atividade_id", "in", `(${activityIds.join(",")})`);
      if (error) fail(error, "Falha ao limpar registros sem atividade");
    }

    const bookRows = [];
    if (data.livros.atual?.titulo) {
      bookRows.push({
        id: uuid(data.livros.atual.id) ? data.livros.atual.id : crypto.randomUUID(), user_id: currentUser.id,
        titulo: data.livros.atual.titulo, autor: data.livros.atual.autor || null, status: "lendo",
        data_inicio: data.livros.atual.dataInicio || null, data_conclusao: null,
        principal_aprendizado: data.livros.atual.observacoes || null, livro_atual: true, ativo: true
      });
      data.livros.atual.id = bookRows[0].id;
    }
    for (const book of data.livros.concluidos) {
      bookRows.push({
        id: book.id, user_id: currentUser.id, titulo: book.titulo, autor: book.autor || null, status: "concluido",
        data_inicio: book.dataInicio || null, data_conclusao: book.dataConclusao || null,
        principal_aprendizado: book.aprendizado || null, livro_atual: false, ativo: true
      });
    }
    // A restrição do banco permite apenas um livro atual por usuário.
    // Antes de inserir um novo livro atual, desmarcamos o anterior para evitar
    // conflito com o índice parcial de unicidade.
    const existingBooks = await select("livros", "id,livro_atual,status");
    const desiredCurrent = bookRows.find(row => row.livro_atual);
    const previousCurrent = existingBooks.find(row => row.livro_atual);
    if (desiredCurrent && previousCurrent && previousCurrent.id !== desiredCurrent.id) {
      const { error } = await db.from("livros")
        .update({ livro_atual: false })
        .eq("user_id", currentUser.id)
        .eq("id", previousCurrent.id);
      if (error) fail(error, "Falha ao substituir o livro atual");
    }
    await syncRows("livros", bookRows);

    const year = Number(data.configuracoes.anoMetaLivros || new Date().getFullYear());
    const existingGoals = await select("metas");
    const annualOld = existingGoals.find(x => x.unidade === "livros") || existingGoals.find(x => /livro/i.test(x.titulo || ""));
    const annualId = annualOld?.id || crypto.randomUUID();
    const completed = data.livros.concluidos.filter(x => (x.dataConclusao || "").startsWith(String(year))).length;
    const { error: goalError } = await db.from("metas").upsert({
      id: annualId, user_id: currentUser.id, titulo: `Ler ${Number(data.configuracoes.metaLivrosAno || 20)} livros em ${year}`,
      descricao: "Meta anual cadastrada na página de livros.", tipo_meta: "acumulativa", valor_atual: completed, valor_alvo: Number(data.configuracoes.metaLivrosAno || 20),
      unidade: "livros", data_inicio: `${year}-01-01`, data_fim: `${year}-12-31`, status: "ativa", ativo: true
    });
    if (goalError) fail(goalError, "Falha ao salvar meta anual de leitura");

    const dates = new Set([...Object.keys(data.pesos || {}), ...Object.keys(data.observacoesDiarias || {})]);
    const dailyRows = [...dates].map(date => ({
      user_id: currentUser.id, data_registro: date,
      peso: data.pesos[date] == null ? null : Number(data.pesos[date]),
      observacao: data.observacoesDiarias[date] || null
    }));
    if (dailyRows.length) {
      const { error } = await db.from("registros_diarios").upsert(dailyRows, { onConflict: "user_id,data_registro" });
      if (error) fail(error, "Falha ao salvar registros diários");
    }

    const { error: configError } = await db.from("configuracoes_usuario").upsert({
      user_id: currentUser.id, chave: "missao_atual", valor: data.configuracoes.missaoAtual || {}
    }, { onConflict: "user_id,chave" });
    if (configError) fail(configError, "Falha ao salvar configurações");

    cache = data;
    cache.atualizadoEm = new Date().toISOString();
    return cache;
  }


  function atualizarCache(data) {
    cache = data;
    cache.atualizadoEm = new Date().toISOString();
    return cache;
  }

  async function salvarRegistroAtividade(input, date, activityId) {
    await mustUser();
    const data = normalizeIds(merge(input));
    const item = data.metas.find(meta => meta.id === activityId);
    if (!item) throw new Error("Atividade não encontrada. Atualize a página e tente novamente.");

    const row = registro(data, date, activityId) || {};
    const payload = {
      user_id: currentUser.id,
      atividade_id: activityId,
      data_registro: date,
      concluido: !!row.concluida,
      valor_numerico: Number(row.valor || 0),
      valor_texto: row.texto || null,
      observacao: row.observacao || null
    };

    const { error } = await db.from("registros_atividades")
      .upsert(payload, { onConflict: "user_id,atividade_id,data_registro" });
    if (error) fail(error, "Falha ao salvar a atividade diária");
    return atualizarCache(data);
  }

  async function salvarRegistroDiario(input, date) {
    await mustUser();
    const data = normalizeIds(merge(input));
    const payload = {
      user_id: currentUser.id,
      data_registro: date,
      peso: data.pesos[date] == null ? null : Number(data.pesos[date]),
      observacao: data.observacoesDiarias[date] || null
    };

    const { error } = await db.from("registros_diarios")
      .upsert(payload, { onConflict: "user_id,data_registro" });
    if (error) fail(error, "Falha ao salvar o registro diário");
    return atualizarCache(data);
  }

  function montarLinhasLivros(data) {
    const rows = [];
    if (data.livros.atual?.titulo) {
      const currentId = uuid(data.livros.atual.id) ? data.livros.atual.id : crypto.randomUUID();
      data.livros.atual.id = currentId;
      rows.push({
        id: currentId,
        user_id: currentUser.id,
        titulo: data.livros.atual.titulo,
        autor: data.livros.atual.autor || null,
        status: "lendo",
        data_inicio: data.livros.atual.dataInicio || null,
        data_conclusao: null,
        principal_aprendizado: data.livros.atual.observacoes || null,
        livro_atual: true,
        ativo: true
      });
    }
    for (const book of data.livros.concluidos) {
      rows.push({
        id: book.id,
        user_id: currentUser.id,
        titulo: book.titulo,
        autor: book.autor || null,
        status: "concluido",
        data_inicio: book.dataInicio || null,
        data_conclusao: book.dataConclusao || null,
        principal_aprendizado: book.aprendizado || null,
        livro_atual: false,
        ativo: true
      });
    }
    return rows;
  }

  async function salvarMetaLivrosInterna(data) {
    const year = Number(data.configuracoes.anoMetaLivros || new Date().getFullYear());
    const existingGoals = await select("metas");
    const annualOld = existingGoals.find(x => x.unidade === "livros") || existingGoals.find(x => /livro/i.test(x.titulo || ""));
    const completed = data.livros.concluidos.filter(x => (x.dataConclusao || "").startsWith(String(year))).length;
    const { error } = await db.from("metas").upsert({
      id: annualOld?.id || crypto.randomUUID(),
      user_id: currentUser.id,
      titulo: `Ler ${Number(data.configuracoes.metaLivrosAno || 20)} livros em ${year}`,
      descricao: "Meta anual cadastrada na página de livros.",
      tipo_meta: "acumulativa",
      valor_atual: completed,
      valor_alvo: Number(data.configuracoes.metaLivrosAno || 20),
      unidade: "livros",
      data_inicio: `${year}-01-01`,
      data_fim: `${year}-12-31`,
      status: "ativa",
      ativo: true
    });
    if (error) fail(error, "Falha ao salvar a meta anual de leitura");
  }

  async function salvarLivros(input) {
    await mustUser();
    const data = normalizeIds(merge(input));
    const rows = montarLinhasLivros(data);
    const desiredIds = new Set(rows.map(row => row.id));
    const existing = await select("livros", "id,livro_atual,status");
    const staleIds = existing.filter(row => !desiredIds.has(row.id)).map(row => row.id);

    // Remove primeiro os livros que deixaram de existir. Isso evita conflito
    // ao substituir o único livro marcado como atual.
    if (staleIds.length) {
      const { error } = await db.from("livros")
        .delete()
        .eq("user_id", currentUser.id)
        .in("id", staleIds);
      if (error) fail(error, "Falha ao remover livros antigos");
    }

    const desiredCurrent = rows.find(row => row.livro_atual);
    if (desiredCurrent) {
      const { error } = await db.from("livros")
        .update({ livro_atual: false })
        .eq("user_id", currentUser.id)
        .eq("livro_atual", true)
        .neq("id", desiredCurrent.id);
      if (error) fail(error, "Falha ao substituir o livro atual");
    } else {
      const { error } = await db.from("livros")
        .update({ livro_atual: false })
        .eq("user_id", currentUser.id)
        .eq("livro_atual", true);
      if (error) fail(error, "Falha ao limpar o livro atual");
    }

    const completedRows = rows.filter(row => !row.livro_atual);
    if (completedRows.length) {
      const { error } = await db.from("livros").upsert(completedRows);
      if (error) fail(error, "Falha ao salvar os livros concluídos");
    }
    if (desiredCurrent) {
      const { error } = await db.from("livros").upsert(desiredCurrent);
      if (error) fail(error, "Falha ao salvar o livro atual");
    }

    let aviso = "";
    try {
      await salvarMetaLivrosInterna(data);
    } catch (error) {
      // O livro já está persistido. A falha secundária não pode fazer o usuário
      // acreditar que o cadastro inteiro foi perdido.
      aviso = error.message || "Livro salvo, mas a meta anual não foi atualizada.";
      console.warn(aviso, error);
    }

    return { dados: atualizarCache(data), aviso };
  }

  async function salvarMetaLivros(input) {
    await mustUser();
    const data = normalizeIds(merge(input));
    await salvarMetaLivrosInterna(data);
    return atualizarCache(data);
  }

  async function listarMarcacoesIngles(date) {
    await mustUser();
    const { data, error } = await db.from("marcacoes_ingles").select("id,texto,ordem").eq("user_id", currentUser.id).eq("data_meditacao", date).eq("ativo", true).order("ordem");
    if (error) fail(error, "Falha ao carregar marcações do inglês");
    return data || [];
  }

  async function substituirMarcacoesIngles(date, texts) {
    await mustUser();
    const { error: deleteError } = await db.from("marcacoes_ingles").delete().eq("user_id", currentUser.id).eq("data_meditacao", date);
    if (deleteError) fail(deleteError, "Falha ao remover marcações antigas");
    const rows = [...new Set(texts.map(x => String(x || "").trim()).filter(Boolean))].map((texto, ordem) => ({
      user_id: currentUser.id, data_meditacao: date, texto, ordem, ativo: true
    }));
    if (rows.length) {
      const { error } = await db.from("marcacoes_ingles").insert(rows);
      if (error) fail(error, "Falha ao salvar marcações do inglês");
    }
    return rows;
  }

  async function listarMeditacoes() {
    await mustUser();
    const { data, error } = await db.from("meditacoes")
      .select("data_meditacao,titulo,conteudo_markdown,tema")
      .eq("user_id", currentUser.id)
      .eq("status", "publicada")
      .order("data_meditacao", { ascending: true });
    if (error) fail(error, "Falha ao carregar meditações");
    return (data || []).map(row => ({
      data: row.data_meditacao,
      titulo: row.titulo || "Meu Momento com Deus",
      markdown: row.conteudo_markdown || "",
      tema: row.tema || ""
    }));
  }


  function registro(data, date, id) { return (data.registros?.[date] || []).find(x => x.metaId === id); }
  function setRegistro(data, date, id, patch) {
    data.registros[date] ||= [];
    let row = registro(data, date, id);
    if (!row) { row = { metaId: id, concluida: false, valor: 0, observacao: "" }; data.registros[date].push(row); }
    Object.assign(row, patch);
  }
  function ativaNaData(item, date) {
    if (!item?.ativa) return false;
    if (item.inicioVigencia && date < item.inicioVigencia) return false;
    if (item.fimVigencia && date > item.fimVigencia) return false;
    return (item.diasSemana || []).includes(new Date(`${date}T12:00:00`).getDay());
  }
  function metasNaData(data, date) { return (data.metas || []).filter(item => ativaNaData(item, date)); }

  return { carregar, salvar, salvarRegistroAtividade, salvarRegistroDiario, salvarLivros, salvarMetaLivros, registro, setRegistro, ativaNaData, metasNaData, listarMarcacoesIngles, substituirMarcacoesIngles, listarMeditacoes };
})();
