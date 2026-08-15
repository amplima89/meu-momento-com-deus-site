"use strict";

(() => {
  const LIVROS = [{"id": "GEN", "nome": "Gênesis", "api": "Genesis", "capitulos": 50}, {"id": "EXO", "nome": "Êxodo", "api": "Exodus", "capitulos": 40}, {"id": "LEV", "nome": "Levítico", "api": "Leviticus", "capitulos": 27}, {"id": "NUM", "nome": "Números", "api": "Numbers", "capitulos": 36}, {"id": "DEU", "nome": "Deuteronômio", "api": "Deuteronomy", "capitulos": 34}, {"id": "JOS", "nome": "Josué", "api": "Joshua", "capitulos": 24}, {"id": "JDG", "nome": "Juízes", "api": "Judges", "capitulos": 21}, {"id": "RUT", "nome": "Rute", "api": "Ruth", "capitulos": 4}, {"id": "1SA", "nome": "1 Samuel", "api": "1 Samuel", "capitulos": 31}, {"id": "2SA", "nome": "2 Samuel", "api": "2 Samuel", "capitulos": 24}, {"id": "1KI", "nome": "1 Reis", "api": "1 Kings", "capitulos": 22}, {"id": "2KI", "nome": "2 Reis", "api": "2 Kings", "capitulos": 25}, {"id": "1CH", "nome": "1 Crônicas", "api": "1 Chronicles", "capitulos": 29}, {"id": "2CH", "nome": "2 Crônicas", "api": "2 Chronicles", "capitulos": 36}, {"id": "EZR", "nome": "Esdras", "api": "Ezra", "capitulos": 10}, {"id": "NEH", "nome": "Neemias", "api": "Nehemiah", "capitulos": 13}, {"id": "EST", "nome": "Ester", "api": "Esther", "capitulos": 10}, {"id": "JOB", "nome": "Jó", "api": "Job", "capitulos": 42}, {"id": "PSA", "nome": "Salmos", "api": "Psalms", "capitulos": 150}, {"id": "PRO", "nome": "Provérbios", "api": "Proverbs", "capitulos": 31}, {"id": "ECC", "nome": "Eclesiastes", "api": "Ecclesiastes", "capitulos": 12}, {"id": "SNG", "nome": "Cânticos", "api": "Song of Solomon", "capitulos": 8}, {"id": "ISA", "nome": "Isaías", "api": "Isaiah", "capitulos": 66}, {"id": "JER", "nome": "Jeremias", "api": "Jeremiah", "capitulos": 52}, {"id": "LAM", "nome": "Lamentações", "api": "Lamentations", "capitulos": 5}, {"id": "EZK", "nome": "Ezequiel", "api": "Ezekiel", "capitulos": 48}, {"id": "DAN", "nome": "Daniel", "api": "Daniel", "capitulos": 12}, {"id": "HOS", "nome": "Oséias", "api": "Hosea", "capitulos": 14}, {"id": "JOL", "nome": "Joel", "api": "Joel", "capitulos": 3}, {"id": "AMO", "nome": "Amós", "api": "Amos", "capitulos": 9}, {"id": "OBA", "nome": "Obadias", "api": "Obadiah", "capitulos": 1}, {"id": "JON", "nome": "Jonas", "api": "Jonah", "capitulos": 4}, {"id": "MIC", "nome": "Miquéias", "api": "Micah", "capitulos": 7}, {"id": "NAM", "nome": "Naum", "api": "Nahum", "capitulos": 3}, {"id": "HAB", "nome": "Habacuque", "api": "Habakkuk", "capitulos": 3}, {"id": "ZEP", "nome": "Sofonias", "api": "Zephaniah", "capitulos": 3}, {"id": "HAG", "nome": "Ageu", "api": "Haggai", "capitulos": 2}, {"id": "ZEC", "nome": "Zacarias", "api": "Zechariah", "capitulos": 14}, {"id": "MAL", "nome": "Malaquias", "api": "Malachi", "capitulos": 4}, {"id": "MAT", "nome": "Mateus", "api": "Matthew", "capitulos": 28}, {"id": "MRK", "nome": "Marcos", "api": "Mark", "capitulos": 16}, {"id": "LUK", "nome": "Lucas", "api": "Luke", "capitulos": 24}, {"id": "JHN", "nome": "João", "api": "John", "capitulos": 21}, {"id": "ACT", "nome": "Atos", "api": "Acts", "capitulos": 28}, {"id": "ROM", "nome": "Romanos", "api": "Romans", "capitulos": 16}, {"id": "1CO", "nome": "1 Coríntios", "api": "1 Corinthians", "capitulos": 16}, {"id": "2CO", "nome": "2 Coríntios", "api": "2 Corinthians", "capitulos": 13}, {"id": "GAL", "nome": "Gálatas", "api": "Galatians", "capitulos": 6}, {"id": "EPH", "nome": "Efésios", "api": "Ephesians", "capitulos": 6}, {"id": "PHP", "nome": "Filipenses", "api": "Philippians", "capitulos": 4}, {"id": "COL", "nome": "Colossenses", "api": "Colossians", "capitulos": 4}, {"id": "1TH", "nome": "1 Tessalonicenses", "api": "1 Thessalonians", "capitulos": 5}, {"id": "2TH", "nome": "2 Tessalonicenses", "api": "2 Thessalonians", "capitulos": 3}, {"id": "1TI", "nome": "1 Timóteo", "api": "1 Timothy", "capitulos": 6}, {"id": "2TI", "nome": "2 Timóteo", "api": "2 Timothy", "capitulos": 4}, {"id": "TIT", "nome": "Tito", "api": "Titus", "capitulos": 3}, {"id": "PHM", "nome": "Filemom", "api": "Philemon", "capitulos": 1}, {"id": "HEB", "nome": "Hebreus", "api": "Hebrews", "capitulos": 13}, {"id": "JAS", "nome": "Tiago", "api": "James", "capitulos": 5}, {"id": "1PE", "nome": "1 Pedro", "api": "1 Peter", "capitulos": 5}, {"id": "2PE", "nome": "2 Pedro", "api": "2 Peter", "capitulos": 3}, {"id": "1JN", "nome": "1 João", "api": "1 John", "capitulos": 5}, {"id": "2JN", "nome": "2 João", "api": "2 John", "capitulos": 1}, {"id": "3JN", "nome": "3 João", "api": "3 John", "capitulos": 1}, {"id": "JUD", "nome": "Judas", "api": "Jude", "capitulos": 1}, {"id": "REV", "nome": "Apocalipse", "api": "Revelation", "capitulos": 22}];
  const TRADUCAO = "almeida";
  const CHAVE_PREFERENCIA = "biblia_preferencia_v1";
  const CHAVE_PROGRESSO = "biblia_progresso_v2";
  const TOTAL_CAPITULOS = 1189;
  const TOTAL_VERSICULOS = 31102;
  const TOTAL_CAPITULOS_AT = 929;
  const TOTAL_CAPITULOS_NT = 260;
  const VERSOS_POR_LIVRO = {"GEN":1533,"EXO":1213,"LEV":859,"NUM":1288,"DEU":959,"JOS":658,"JDG":618,"RUT":85,"1SA":810,"2SA":695,"1KI":816,"2KI":719,"1CH":942,"2CH":822,"EZR":280,"NEH":406,"EST":167,"JOB":1070,"PSA":2461,"PRO":915,"ECC":222,"SNG":117,"ISA":1292,"JER":1364,"LAM":154,"EZK":1273,"DAN":357,"HOS":197,"JOL":73,"AMO":146,"OBA":21,"JON":48,"MIC":105,"NAM":47,"HAB":56,"ZEP":53,"HAG":38,"ZEC":211,"MAL":55,"MAT":1071,"MRK":678,"LUK":1151,"JHN":879,"ACT":1007,"ROM":433,"1CO":437,"2CO":257,"GAL":149,"EPH":155,"PHP":104,"COL":95,"1TH":89,"2TH":47,"1TI":113,"2TI":83,"TIT":46,"PHM":25,"HEB":303,"JAS":108,"1PE":105,"2PE":61,"1JN":105,"2JN":13,"3JN":14,"JUD":25,"REV":404};
  const db = window.MMCDSupabase;
  const livroSelect = document.querySelector("#biblia-livro");
  const capituloSelect = document.querySelector("#biblia-capitulo");
  const conteudo = document.querySelector("#biblia-conteudo");
  const titulo = document.querySelector("#biblia-titulo");
  const status = document.querySelector("#biblia-status");
  const anterior = document.querySelector("#biblia-anterior");
  const proximo = document.querySelector("#biblia-proximo");
  const listaDestaques = document.querySelector("#biblia-destaques");
  const limpar = document.querySelector("#biblia-limpar");
  const checkCapitulo = document.querySelector("#biblia-check-capitulo");
  const mapaLista = document.querySelector("#biblia-map-list");
  const mapaResumo = document.querySelector("#biblia-map-summary");
  const progressRing = document.querySelector("#biblia-progress-ring");
  const progressPercent = document.querySelector("#biblia-progress-percent");
  const progressTitle = document.querySelector("#biblia-progress-title");
  const progressMessage = document.querySelector("#biblia-progress-message");
  const statBooks = document.querySelector("#biblia-stat-books");
  const statChapters = document.querySelector("#biblia-stat-chapters");
  const statVerses = document.querySelector("#biblia-stat-verses");
  const statCurrentBook = document.querySelector("#biblia-stat-current-book");
  const atLabel = document.querySelector("#biblia-at-label");
  const ntLabel = document.querySelector("#biblia-nt-label");
  const atBar = document.querySelector("#biblia-at-bar");
  const ntBar = document.querySelector("#biblia-nt-bar");
  const motivacaoTitulo = document.querySelector("#biblia-motivacao-titulo");
  const motivacaoTexto = document.querySelector("#biblia-motivacao-texto");
  const irMapa = document.querySelector("#biblia-ir-mapa");
  const notesList = document.querySelector("#biblia-notes-list");
  const notesCount = document.querySelector("#biblia-notes-count");

  if (!db || !livroSelect || !capituloSelect || !conteudo) return;

  let usuario = null;
  let versos = [];
  let destaques = [];
  let anotacoes = [];
  let filaSalvarAnotacoes = Promise.resolve();
  let filaSalvar = Promise.resolve();
  let timerSelecao = null;
  let tokenCarga = 0;
  let progresso = { schemaVersion: 2, capitulos: {}, livrosCompletos: {}, atualizadoEm: null, resumo: {} };
  let filtroMapa = "todos";
  let salvandoProgresso = Promise.resolve();

  const esc = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);

  function livroAtual() { return LIVROS.find(x => x.id === livroSelect.value) || LIVROS[0]; }
  function capituloAtual() { return Math.max(1, Number(capituloSelect.value || 1)); }
  function chaveDestaques() { return `destaques_biblia:${TRADUCAO}:${livroAtual().id}:${capituloAtual()}`; }


  function testamentoDoLivro(livro) {
    return LIVROS.findIndex(x => x.id === livro.id) >= 39 ? "NT" : "AT";
  }

  function totalVersosLivro(livro) {
    return Number(VERSOS_POR_LIVRO[livro.id] || 0);
  }

  function chaveCapitulo(livroId, capitulo) {
    return `${livroId}:${Number(capitulo)}`;
  }

  function progressoNormalizado(valor) {
    const v = valor && typeof valor === "object" ? valor : {};
    return {
      schemaVersion: 2,
      capitulos: v.capitulos && typeof v.capitulos === "object" ? v.capitulos : {},
      livrosCompletos: v.livrosCompletos && typeof v.livrosCompletos === "object" ? v.livrosCompletos : {},
      atualizadoEm: v.atualizadoEm || null,
      resumo: v.resumo && typeof v.resumo === "object" ? v.resumo : {}
    };
  }

  async function carregarProgresso() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", CHAVE_PROGRESSO)
      .maybeSingle();
    if (error) throw error;
    progresso = progressoNormalizado(data?.valor);
  }

  function livroBaseCompleto(livroId) {
    return Boolean(progresso.livrosCompletos?.[livroId]);
  }

  function excecoesLivro(livroId) {
    return progresso.livrosCompletos?.[livroId]?.excecoes || {};
  }

  function capituloConcluido(livroId, capitulo) {
    const chave = chaveCapitulo(livroId, capitulo);
    if (livroBaseCompleto(livroId)) return !Object.prototype.hasOwnProperty.call(excecoesLivro(livroId), String(Number(capitulo)));
    return Boolean(progresso.capitulos?.[chave]?.concluido);
  }

  function dadosLivro(livro) {
    const baseCompleto = livroBaseCompleto(livro.id);
    let capitulosConcluidos = 0;
    let versiculosConcluidos = 0;

    if (baseCompleto) {
      const excecoes = excecoesLivro(livro.id);
      const excluidos = Object.keys(excecoes);
      capitulosConcluidos = Math.max(0, livro.capitulos - excluidos.length);
      const versosExcluidos = excluidos.reduce((acc, cap) => acc + Number(excecoes[cap]?.versiculos || 0), 0);
      versiculosConcluidos = Math.max(0, totalVersosLivro(livro) - versosExcluidos);
    } else {
      for (let cap = 1; cap <= livro.capitulos; cap += 1) {
        const item = progresso.capitulos?.[chaveCapitulo(livro.id, cap)];
        if (!item?.concluido) continue;
        capitulosConcluidos += 1;
        versiculosConcluidos += Number(item.versiculos || 0);
      }
    }

    const concluido = capitulosConcluidos === livro.capitulos;
    return {livro,testamento:testamentoDoLivro(livro),capitulosConcluidos,versiculosConcluidos:concluido?totalVersosLivro(livro):versiculosConcluidos,concluido,percentual:livro.capitulos?Math.round(capitulosConcluidos/livro.capitulos*100):0};
  }

  function resumoProgresso() {
    const livros=LIVROS.map(dadosLivro);
    const capitulosConcluidos=livros.reduce((a,x)=>a+x.capitulosConcluidos,0);
    const versiculosConcluidos=livros.reduce((a,x)=>a+x.versiculosConcluidos,0);
    const livrosConcluidos=livros.filter(x=>x.concluido).length;
    const atCapitulos=livros.filter(x=>x.testamento==="AT").reduce((a,x)=>a+x.capitulosConcluidos,0);
    const ntCapitulos=livros.filter(x=>x.testamento==="NT").reduce((a,x)=>a+x.capitulosConcluidos,0);
    const percentual=Math.round(capitulosConcluidos/TOTAL_CAPITULOS*1000)/10;
    return {livrosConcluidos,capitulosConcluidos,versiculosConcluidos,percentual,atCapitulos,ntCapitulos,totalLivros:66,totalCapitulos:TOTAL_CAPITULOS,totalVersiculos:TOTAL_VERSICULOS};
  }

  function prepararResumoParaSalvar() {
    progresso.resumo=resumoProgresso();
    progresso.atualizadoEm=new Date().toISOString();
  }

  function salvarProgresso() {
    prepararResumoParaSalvar();
    const valor=JSON.parse(JSON.stringify(progresso));
    salvandoProgresso=salvandoProgresso.catch(()=>undefined).then(async()=>{
      const {error}=await db.from("configuracoes_usuario").upsert({user_id:usuario.id,chave:CHAVE_PROGRESSO,valor},{onConflict:"user_id,chave"});
      if(error) throw error;
      window.MMCDAtualizarProgressoBiblia?.(valor.resumo);
    });
    return salvandoProgresso;
  }

  function cacheVersosDoCapitulo(livro,capitulo) {
    try {
      const cacheKey=`mmcd:biblia:${TRADUCAO}:${livro.id}:${Number(capitulo)}`;
      const cache=JSON.parse(localStorage.getItem(cacheKey)||"null");
      if(Array.isArray(cache?.versos)&&cache.versos.length)return cache.versos.length;
    } catch {}
    return 0;
  }

  async function quantidadeVersosCapitulo(livro,capitulo) {
    if(livro.id===livroAtual().id&&Number(capitulo)===capituloAtual()&&versos.length)return versos.length;
    const cached=cacheVersosDoCapitulo(livro,capitulo);
    if(cached)return cached;
    const url=`https://bible-api.com/${encodeURIComponent(`${livro.api} ${Number(capitulo)}`)}?translation=${TRADUCAO}&single_chapter_book_matching=indifferent`;
    const resposta=await fetch(url,{headers:{Accept:"application/json"}});
    if(!resposta.ok)throw new Error(`Resposta ${resposta.status}`);
    const dados=await resposta.json();
    const quantidade=Array.isArray(dados.verses)?dados.verses.length:0;
    if(!quantidade)throw new Error("Capítulo sem versículos.");
    return quantidade;
  }

  function promoverLivroSeCompleto(livro) {
    if(livroBaseCompleto(livro.id))return;
    for(let cap=1;cap<=livro.capitulos;cap+=1){if(!progresso.capitulos?.[chaveCapitulo(livro.id,cap)]?.concluido)return;}
    progresso.livrosCompletos[livro.id]={concluidoEm:new Date().toISOString(),excecoes:{}};
    Object.keys(progresso.capitulos).forEach(chave=>{if(chave.startsWith(`${livro.id}:`))delete progresso.capitulos[chave];});
  }

  async function definirCapituloConcluido(livro,capitulo,concluido,{versiculosConhecidos=0}={}) {
    const chave=chaveCapitulo(livro.id,capitulo);
    const numeroCap=String(Number(capitulo));
    if(concluido){
      if(livroBaseCompleto(livro.id)) delete progresso.livrosCompletos[livro.id].excecoes[numeroCap];
      else {
        const quantidade=Number(versiculosConhecidos||await quantidadeVersosCapitulo(livro,capitulo));
        progresso.capitulos[chave]={concluido:true,versiculos:quantidade,concluidoEm:new Date().toISOString()};
        promoverLivroSeCompleto(livro);
      }
    } else {
      if(livroBaseCompleto(livro.id)){
        const quantidade=Number(versiculosConhecidos||await quantidadeVersosCapitulo(livro,capitulo));
        progresso.livrosCompletos[livro.id].excecoes[numeroCap]={versiculos:quantidade,alteradoEm:new Date().toISOString()};
      } else delete progresso.capitulos[chave];
    }
    await salvarProgresso();
    renderizarProgresso();
  }

  async function alternarCapitulo(livro,capitulo,opcoes={}) {
    const novoEstado=!capituloConcluido(livro.id,capitulo);
    await definirCapituloConcluido(livro,capitulo,novoEstado,opcoes);
    window.MMCDUI?.toast(novoEstado?`${livro.nome} ${capitulo} concluído.`:`${livro.nome} ${capitulo} voltou para pendente.`);
  }

  async function marcarLivroCompleto(livro) {
    progresso.livrosCompletos[livro.id]={concluidoEm:new Date().toISOString(),excecoes:{}};
    Object.keys(progresso.capitulos).forEach(chave=>{if(chave.startsWith(`${livro.id}:`))delete progresso.capitulos[chave];});
    await salvarProgresso();renderizarProgresso();window.MMCDUI?.toast(`${livro.nome} marcado como concluído.`);
  }

  async function limparLivro(livro) {
    delete progresso.livrosCompletos[livro.id];
    Object.keys(progresso.capitulos).forEach(chave=>{if(chave.startsWith(`${livro.id}:`))delete progresso.capitulos[chave];});
    await salvarProgresso();renderizarProgresso();window.MMCDUI?.toast(`Progresso de ${livro.nome} removido.`);
  }

  function formatarNumero(n){return Number(n||0).toLocaleString("pt-BR");}
  function melhorLivroEmAndamento(){return LIVROS.map(dadosLivro).filter(x=>!x.concluido&&x.capitulosConcluidos>0).sort((a,b)=>b.percentual-a.percentual||b.capitulosConcluidos-a.capitulosConcluidos)[0]||null;}

  function renderizarCabecalhoProgresso(){
    const resumo=resumoProgresso();const emAndamento=melhorLivroEmAndamento();
    progressRing?.style.setProperty("--progress",String(resumo.percentual));
    if(progressPercent)progressPercent.textContent=`${String(resumo.percentual).replace(".",",")}%`;
    if(progressTitle)progressTitle.textContent=resumo.capitulosConcluidos?`${formatarNumero(resumo.capitulosConcluidos)} capítulos já percorridos`:"Um capítulo de cada vez";
    if(progressMessage){
      if(resumo.capitulosConcluidos===0)progressMessage.textContent="Marque o primeiro capítulo concluído. A partir daí, o mapa começa a contar sua história.";
      else if(resumo.percentual>=100)progressMessage.textContent="Toda a Bíblia está marcada como concluída. O mapa agora registra uma caminhada completa.";
      else if(emAndamento){const faltam=emAndamento.livro.capitulos-emAndamento.capitulosConcluidos;progressMessage.textContent=`${emAndamento.livro.nome} está em ${emAndamento.percentual}%. Faltam ${faltam} capítulo${faltam===1?"":"s"} para concluir o livro.`;}
      else progressMessage.textContent="Continue marcando os capítulos à medida que concluir a leitura.";
    }
    if(statBooks)statBooks.innerHTML=`${resumo.livrosConcluidos} <small>/ 66</small>`;
    if(statChapters)statChapters.innerHTML=`${formatarNumero(resumo.capitulosConcluidos)} <small>/ 1.189</small>`;
    if(statVerses)statVerses.innerHTML=`${formatarNumero(resumo.versiculosConcluidos)} <small>/ 31.102</small>`;
    if(statCurrentBook)statCurrentBook.textContent=emAndamento?`${emAndamento.livro.nome} · ${emAndamento.percentual}%`:(resumo.livrosConcluidos?`${resumo.livrosConcluidos} livro${resumo.livrosConcluidos===1?"":"s"} completo${resumo.livrosConcluidos===1?"":"s"}`:"—");
    if(atLabel)atLabel.textContent=`${formatarNumero(resumo.atCapitulos)} / ${formatarNumero(TOTAL_CAPITULOS_AT)} capítulos`;
    if(ntLabel)ntLabel.textContent=`${formatarNumero(resumo.ntCapitulos)} / ${formatarNumero(TOTAL_CAPITULOS_NT)} capítulos`;
    if(atBar)atBar.style.width=`${Math.min(100,resumo.atCapitulos/TOTAL_CAPITULOS_AT*100)}%`;
    if(ntBar)ntBar.style.width=`${Math.min(100,resumo.ntCapitulos/TOTAL_CAPITULOS_NT*100)}%`;
    if(motivacaoTitulo&&motivacaoTexto){
      const atual=dadosLivro(livroAtual());
      if(atual.concluido){motivacaoTitulo.textContent=`${livroAtual().nome} concluído ✓`;motivacaoTexto.textContent="Este livro está completo no seu mapa. Você pode seguir para o próximo ou revisitar qualquer capítulo.";}
      else if(atual.capitulosConcluidos>0){const faltam=atual.livro.capitulos-atual.capitulosConcluidos;motivacaoTitulo.textContent=`${atual.percentual}% de ${atual.livro.nome}`;motivacaoTexto.textContent=`Faltam ${faltam} capítulo${faltam===1?"":"s"} para concluir este livro.`;}
      else {motivacaoTitulo.textContent=`Comece ${livroAtual().nome}`;motivacaoTexto.textContent="Quando terminar o capítulo atual, marque o check. O avanço aparecerá imediatamente no mapa.";}
    }
    window.MMCDAtualizarProgressoBiblia?.(resumo);
  }

  function livroPassaFiltro(item){if(filtroMapa==="AT"||filtroMapa==="NT")return item.testamento===filtroMapa;if(filtroMapa==="andamento")return item.capitulosConcluidos>0&&!item.concluido;if(filtroMapa==="concluidos")return item.concluido;return true;}

  function renderizarMapa(){
    if(!mapaLista)return;
    const resumo=resumoProgresso();const livros=LIVROS.map(dadosLivro).filter(livroPassaFiltro);
    if(mapaResumo)mapaResumo.innerHTML=`<span><b>${resumo.livrosConcluidos}</b> livros completos</span><span><b>${formatarNumero(resumo.capitulosConcluidos)}</b> de 1.189 capítulos</span><span><b>${formatarNumero(resumo.versiculosConcluidos)}</b> de 31.102 versículos</span>`;
    if(!livros.length){mapaLista.innerHTML='<div class="bible-map-empty">Nenhum livro corresponde a este filtro.</div>';return;}
    mapaLista.innerHTML=livros.map(item=>{
      const livro=item.livro;
      const chapterButtons=Array.from({length:livro.capitulos},(_,i)=>{const cap=i+1;const done=capituloConcluido(livro.id,cap);return `<button type="button" class="bible-chapter-dot ${done?"done":""}" data-book-id="${esc(livro.id)}" data-chapter="${cap}" aria-pressed="${done?"true":"false"}" title="${esc(livro.nome)} ${cap} · ${done?"concluído":"pendente"}">${done?"✓":cap}</button>`;}).join("");
      return `<details class="bible-book-card ${item.concluido?"complete":""}" data-book-card="${esc(livro.id)}"><summary><div class="bible-book-card__identity"><span class="bible-book-status">${item.concluido?"✓":item.percentual+"%"}</span><div><strong>${esc(livro.nome)}</strong><small>${item.capitulosConcluidos}/${livro.capitulos} capítulos · ${formatarNumero(item.versiculosConcluidos)}/${formatarNumero(totalVersosLivro(livro))} versículos</small></div></div><div class="bible-book-card__progress"><i style="width:${item.percentual}%"></i></div></summary><div class="bible-book-card__body"><div class="bible-book-card__actions"><button type="button" class="btn small" data-open-book="${esc(livro.id)}">Abrir no leitor</button>${item.concluido?`<button type="button" class="btn small danger-outline" data-clear-book="${esc(livro.id)}">Desmarcar livro</button>`:`<button type="button" class="btn small primary" data-complete-book="${esc(livro.id)}">Marcar livro completo</button>`}</div><div class="bible-chapter-grid">${chapterButtons}</div></div></details>`;
    }).join("");
  }

  function atualizarCheckCapitulo(){
    if(!checkCapitulo)return;const done=capituloConcluido(livroAtual().id,capituloAtual());checkCapitulo.disabled=!versos.length;checkCapitulo.classList.toggle("done",done);checkCapitulo.setAttribute("aria-pressed",done?"true":"false");checkCapitulo.querySelector(".bible-chapter-check__box").textContent=done?"✓":"○";checkCapitulo.querySelector("strong").textContent=done?"Capítulo concluído":"Capítulo concluído?";checkCapitulo.querySelector("small").textContent=done?"Clique para desmarcar":"Marcar como lido";
  }

  function renderizarProgresso(){renderizarCabecalhoProgresso();renderizarMapa();atualizarCheckCapitulo();}

  function preencherLivros() {
    livroSelect.innerHTML = LIVROS.map(l => `<option value="${l.id}">${esc(l.nome)}</option>`).join("");
  }

  function preencherCapitulos(valor = 1) {
    const livro = livroAtual();
    capituloSelect.innerHTML = Array.from({ length: livro.capitulos }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
    capituloSelect.value = String(Math.min(Math.max(1, Number(valor || 1)), livro.capitulos));
  }

  async function carregarPreferencia() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", CHAVE_PREFERENCIA)
      .maybeSingle();
    if (error) throw error;
    return data?.valor || { livro: "JHN", capitulo: 1 };
  }

  function salvarPreferencia() {
    const valor = { livro: livroAtual().id, capitulo: capituloAtual(), atualizadoEm: new Date().toISOString() };
    return db.from("configuracoes_usuario").upsert({ user_id: usuario.id, chave: CHAVE_PREFERENCIA, valor }, { onConflict: "user_id,chave" });
  }


  function chaveAnotacoes() {
    return `biblia_anotacoes_v1:${livroAtual().id}:${capituloAtual()}`;
  }

  function normalizarAnotacoes(valor) {
    const lista = Array.isArray(valor) ? valor : valor?.anotacoes;
    if (!Array.isArray(lista)) return [];
    return lista.map((x, i) => ({
      id: String(x?.id || `nota-${Date.now()}-${i}`),
      referencia: String(x?.referencia || ""),
      versiculoInicio: Number(x?.versiculoInicio || 0),
      versiculoFim: Number(x?.versiculoFim || x?.versiculoInicio || 0),
      citacao: String(x?.citacao || ""),
      tipo: ["reflexao","aplicacao","oracao","duvida","promessa"].includes(String(x?.tipo)) ? String(x.tipo) : "reflexao",
      comentario: String(x?.comentario || ""),
      highlightId: String(x?.highlightId || ""),
      criadoEm: x?.criadoEm || new Date().toISOString(),
      atualizadoEm: x?.atualizadoEm || x?.criadoEm || new Date().toISOString()
    })).filter(x => x.citacao.trim());
  }

  async function carregarAnotacoes() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", chaveAnotacoes())
      .maybeSingle();
    if (error) throw error;
    anotacoes = normalizarAnotacoes(data?.valor);
  }

  function salvarAnotacoes() {
    const chave = chaveAnotacoes();
    const valor = {
      anotacoes,
      livroId: livroAtual().id,
      livro: livroAtual().nome,
      capitulo: capituloAtual(),
      atualizadoEm: new Date().toISOString()
    };
    filaSalvarAnotacoes = filaSalvarAnotacoes.catch(() => undefined).then(async () => {
      const { error } = await db.from("configuracoes_usuario").upsert(
        { user_id: usuario.id, chave, valor },
        { onConflict: "user_id,chave" }
      );
      if (error) throw error;
    });
    return filaSalvarAnotacoes;
  }

  function referenciaVersiculos(inicio, fim = inicio) {
    const livro = livroAtual().nome;
    const cap = capituloAtual();
    if (!inicio) return `${livro} ${cap}`;
    return inicio === fim ? `${livro} ${cap}:${inicio}` : `${livro} ${cap}:${inicio}–${fim}`;
  }

  function notaDuplicada(citacao, referencia) {
    const q = String(citacao || "").trim();
    return anotacoes.find(x => x.citacao.trim() === q && x.referencia === referencia);
  }

  function criarAnotacao({ citacao, versiculoInicio = 0, versiculoFim = versiculoInicio, highlightId = "" }) {
    const texto = String(citacao || "").replace(/\s+/g, " ").trim();
    if (!texto) return null;
    const referencia = referenciaVersiculos(versiculoInicio, versiculoFim);
    const existente = notaDuplicada(texto, referencia);
    if (existente) return existente;

    const nota = {
      id: `nota-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      referencia,
      versiculoInicio: Number(versiculoInicio || 0),
      versiculoFim: Number(versiculoFim || versiculoInicio || 0),
      citacao: texto,
      tipo: "reflexao",
      comentario: "",
      highlightId: String(highlightId || ""),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };
    anotacoes.unshift(nota);
    return nota;
  }

  function renderizarAnotacoes({ focarId = "" } = {}) {
    if (!notesList) return;
    if (notesCount) notesCount.textContent = `${anotacoes.length} ${anotacoes.length === 1 ? "anotação" : "anotações"}`;

    if (!anotacoes.length) {
      notesList.innerHTML = `
        <div class="bible-notes-empty">
          <strong>Seu caderno deste capítulo está vazio.</strong>
          <span>Selecione um trecho da leitura ou use <b>+ Anotar</b> em um versículo.</span>
        </div>`;
      return;
    }

    notesList.innerHTML = anotacoes.map(nota => `
      <article class="bible-note-card" data-note-id="${esc(nota.id)}">
        <div class="bible-note-card__quote">
          <span>${esc(nota.referencia)}</span>
          <blockquote>${esc(nota.citacao)}</blockquote>
        </div>

        <div class="bible-note-types" role="group" aria-label="Tipo da anotação">
          ${[
            ["reflexao","Reflexão"],
            ["aplicacao","Aplicação"],
            ["oracao","Oração"],
            ["duvida","Dúvida"],
            ["promessa","Promessa"]
          ].map(([value,label]) => `
            <button type="button" class="${nota.tipo === value ? "active" : ""}" data-note-type="${value}" aria-pressed="${nota.tipo === value ? "true" : "false"}">${label}</button>
          `).join("")}
        </div>

        <label class="bible-note-comment">
          <span>Minha consideração</span>
          <textarea data-note-comment placeholder="${
            nota.tipo === "oracao" ? "Transforme este texto em oração..." :
            nota.tipo === "aplicacao" ? "O que preciso praticar a partir deste texto?" :
            nota.tipo === "duvida" ? "O que preciso estudar ou entender melhor?" :
            nota.tipo === "promessa" ? "O que este texto me lembra sobre Deus?" :
            "O que chamou minha atenção neste texto?"
          }">${esc(nota.comentario)}</textarea>
        </label>

        <footer class="bible-note-card__footer">
          <span class="bible-note-status">${nota.comentario.trim() ? "Anotação registrada" : "Aguardando sua consideração"}</span>
          <div>
            <button type="button" class="btn small danger-outline" data-note-delete>Excluir</button>
            <button type="button" class="btn small primary" data-note-save>Salvar anotação</button>
          </div>
        </footer>
      </article>`).join("");

    if (focarId) {
      requestAnimationFrame(() => {
        const card = notesList.querySelector(`[data-note-id="${CSS.escape(focarId)}"]`);
        card?.classList.add("new");
        card?.querySelector("textarea")?.focus({ preventScroll: true });
      });
    }
  }

  async function anotarVersiculo(numero) {
    const verso = versos.find(v => Number(v.numero) === Number(numero));
    if (!verso) return;

    const nota = criarAnotacao({
      citacao: verso.texto,
      versiculoInicio: verso.numero,
      versiculoFim: verso.numero
    });

    renderizarAnotacoes({ focarId: nota?.id || "" });
    document.querySelector("#biblia-anotacoes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      await salvarAnotacoes();
      window.MMCDUI?.toast(`${referenciaVersiculos(verso.numero)} enviado para Minhas anotações.`);
    } catch (erro) {
      console.error(erro);
      window.MMCDUI?.toast("A anotação apareceu, mas não sincronizou.");
    }
  }

  function normalizarDestaques(valor) {
    const lista = Array.isArray(valor) ? valor : valor?.destaques;
    if (!Array.isArray(lista)) return [];
    return lista.map((x, i) => ({
      id: String(x?.id || `biblia-${Date.now()}-${i}`),
      inicio: Number(x?.inicio), fim: Number(x?.fim), texto: String(x?.texto || "")
    })).filter(x => Number.isInteger(x.inicio) && Number.isInteger(x.fim) && x.fim > x.inicio && x.texto.trim()).sort((a, b) => a.inicio - b.inicio);
  }

  async function carregarDestaques() {
    const { data, error } = await db.from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", usuario.id)
      .eq("chave", chaveDestaques())
      .maybeSingle();
    if (error) throw error;
    destaques = normalizarDestaques(data?.valor);
  }

  function salvarDestaques() {
    const chave = chaveDestaques();
    const valor = { destaques, atualizadoEm: new Date().toISOString() };
    filaSalvar = filaSalvar.catch(() => undefined).then(async () => {
      const { error } = await db.from("configuracoes_usuario").upsert({ user_id: usuario.id, chave, valor }, { onConflict: "user_id,chave" });
      if (error) throw error;
    });
    return filaSalvar;
  }

  function chaveCache() { return `mmcd:biblia:${TRADUCAO}:${livroAtual().id}:${capituloAtual()}`; }

  async function buscarCapitulo() {
    const livro = livroAtual();
    const capitulo = capituloAtual();
    const cacheKey = chaveCache();
    try {
      const url = `https://bible-api.com/${encodeURIComponent(`${livro.api} ${capitulo}`)}?translation=${TRADUCAO}&single_chapter_book_matching=indifferent`;
      const resposta = await fetch(url, { headers: { Accept: "application/json" } });
      if (!resposta.ok) throw new Error(`Resposta ${resposta.status}`);
      const dados = await resposta.json();
      if (!Array.isArray(dados.verses) || !dados.verses.length) throw new Error("Capítulo vazio");
      const resultado = dados.verses.map(v => ({ numero: Number(v.verse), texto: String(v.text || "").replace(/\s+/g, " ").trim() }));
      localStorage.setItem(cacheKey, JSON.stringify({ salvoEm: Date.now(), versos: resultado }));
      return resultado;
    } catch (erro) {
      try {
        const cache = JSON.parse(localStorage.getItem(cacheKey) || "null");
        if (Array.isArray(cache?.versos) && cache.versos.length) {
          window.MMCDUI?.toast("A Bíblia online ficou indisponível; exibindo a cópia salva neste navegador.");
          return cache.versos;
        }
      } catch { }
      throw erro;
    }
  }

  function mapaVersos() {
    let cursor = 0;
    return versos.map(verso => {
      const item = { ...verso, inicio: cursor, fim: cursor + verso.texto.length };
      cursor = item.fim + 1; // separador lógico entre versículos
      return item;
    });
  }

  function segmentosVerso(verso, mapa) {
    const relevantes = destaques.filter(d => d.fim > mapa.inicio && d.inicio < mapa.fim).sort((a, b) => a.inicio - b.inicio);
    if (!relevantes.length) return esc(verso.texto);
    let cursor = 0;
    let html = "";
    for (const d of relevantes) {
      const inicio = Math.max(0, d.inicio - mapa.inicio);
      const fim = Math.min(verso.texto.length, d.fim - mapa.inicio);
      if (fim <= cursor) continue;
      html += esc(verso.texto.slice(cursor, inicio));
      html += `<mark class="bible-highlight" data-highlight-id="${esc(d.id)}" title="Duplo clique para remover">${esc(verso.texto.slice(inicio, fim))}</mark>`;
      cursor = fim;
    }
    html += esc(verso.texto.slice(cursor));
    return html;
  }

  function renderizar() {
    const mapas = mapaVersos();
    conteudo.innerHTML = versos.map((verso, i) => `
      <p class="bible-verse" data-verso="${verso.numero}" data-start="${mapas[i].inicio}" data-end="${mapas[i].fim}">
        <span class="bible-verse__number">${verso.numero}</span>
        <span class="bible-verse__text">${segmentosVerso(verso, mapas[i])}</span>
        <button type="button" class="bible-verse-note-btn" data-note-verse="${verso.numero}" title="Enviar ${esc(referenciaVersiculos(verso.numero))} para Minhas anotações">+ Anotar</button>
      </p>`).join("");
    titulo.textContent = `${livroAtual().nome} ${capituloAtual()}`;
    status.textContent = `${versos.length} versículos · marcações sincronizadas`;
    renderizarListaDestaques();
    renderizarAnotacoes();
    atualizarNavegacao();
    renderizarProgresso();
  }

  function renderizarListaDestaques() {
    if (!destaques.length) {
      listaDestaques.innerHTML = '<p class="muted">Nenhuma marcação neste capítulo.</p>';
      return;
    }

    listaDestaques.innerHTML = destaques.map(d => `
      <div class="bible-highlight-row" data-id="${esc(d.id)}">
        <p>${esc(d.texto)}</p>
        <div class="bible-highlight-row__actions">
          <button type="button" data-highlight-note>Anotar</button>
          <button type="button" data-highlight-remove>Remover</button>
        </div>
      </div>`).join("");

    listaDestaques.querySelectorAll("[data-highlight-remove]").forEach(btn => btn.addEventListener("click", async () => {
      const id = btn.closest("[data-id]").dataset.id;
      await removerDestaque(id);
    }));

    listaDestaques.querySelectorAll("[data-highlight-note]").forEach(btn => btn.addEventListener("click", async () => {
      const id = btn.closest("[data-id]").dataset.id;
      const destaque = destaques.find(x => x.id === id);
      if (!destaque) return;

      const ref = referenciaDoOffset(destaque.inicio, destaque.fim);
      const nota = criarAnotacao({
        citacao: destaque.texto,
        versiculoInicio: ref.inicio,
        versiculoFim: ref.fim,
        highlightId: destaque.id
      });

      renderizarAnotacoes({ focarId: nota?.id || "" });
      await salvarAnotacoes();
      document.querySelector("#biblia-anotacoes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
  }


  function nosDeTexto() {
    const walker = document.createTreeWalker(conteudo, NodeFilter.SHOW_TEXT, {
      acceptNode(no) {
        return no.parentElement?.closest(".bible-verse__text") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nos = [];
    let no;
    while ((no = walker.nextNode())) nos.push(no);
    return nos;
  }

  function offsetDoPonto(noAlvo, offsetAlvo) {
    let acumulado = 0;
    const nos = nosDeTexto();
    for (const no of nos) {
      if (no === noAlvo) return acumulado + offsetAlvo;
      acumulado += no.nodeValue.length;
      const p = no.parentElement?.closest(".bible-verse");
      const proximo = nos[nos.indexOf(no) + 1]?.parentElement?.closest(".bible-verse");
      if (p && proximo && p !== proximo) acumulado += 1;
    }
    return -1;
  }

  function offsetsDaSelecao(range) {
    let inicio = offsetDoPonto(range.startContainer, range.startOffset);
    let fim = offsetDoPonto(range.endContainer, range.endOffset);
    if (inicio < 0 || fim < 0) return null;
    if (inicio > fim) [inicio, fim] = [fim, inicio];
    return { inicio, fim };
  }

  function referenciaDoOffset(inicio, fim) {
    const mapas = mapaVersos();
    const encontrados = mapas.filter(v => fim > v.inicio && inicio < v.fim);
    if (!encontrados.length) return { inicio: 0, fim: 0 };
    return {
      inicio: encontrados[0].numero,
      fim: encontrados[encontrados.length - 1].numero
    };
  }

  function cruzaDestaque(inicio, fim) {
    return destaques.some(d => fim > d.inicio && inicio < d.fim);
  }

  async function marcarSelecao({ silencioso = false } = {}) {
    const selecao = getSelection();
    if (!selecao || selecao.isCollapsed || !selecao.rangeCount) {
      if (!silencioso) window.MMCDUI?.toast("Selecione uma palavra ou frase da Bíblia.");
      return;
    }

    const range = selecao.getRangeAt(0);
    const ancestral = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

    if (!ancestral || !conteudo.contains(ancestral)) return;

    const texto = range.toString().replace(/\s+/g, " ").trim();
    const offsets = offsetsDaSelecao(range);
    if (!texto || !offsets || offsets.fim <= offsets.inicio) return;

    if (cruzaDestaque(offsets.inicio, offsets.fim)) {
      if (!silencioso) window.MMCDUI?.toast("Esse trecho já cruza uma marcação.");
      return;
    }

    const ref = referenciaDoOffset(offsets.inicio, offsets.fim);
    const highlightId = `biblia-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    destaques.push({ id: highlightId, ...offsets, texto });
    destaques.sort((a, b) => a.inicio - b.inicio);

    const nota = criarAnotacao({
      citacao: texto,
      versiculoInicio: ref.inicio,
      versiculoFim: ref.fim,
      highlightId
    });

    selecao.removeAllRanges();
    renderizar();
    renderizarAnotacoes({ focarId: nota?.id || "" });
    document.querySelector("#biblia-anotacoes")?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      await Promise.all([salvarDestaques(), salvarAnotacoes()]);
      window.MMCDUI?.toast("Trecho marcado e enviado para Minhas anotações.");
    } catch (erro) {
      console.error(erro);
      window.MMCDUI?.toast("O trecho apareceu, mas a sincronização falhou.");
    }
  }

  async function removerDestaque(id) {
    destaques = destaques.filter(d => d.id !== id);
    renderizar();
    try {
      await salvarDestaques();
      window.MMCDUI?.toast("Marcação removida.");
    } catch (erro) {
      console.error(erro);
      window.MMCDUI?.toast("A remoção não sincronizou.");
    }
  }

  function atualizarNavegacao() {
    const indice = LIVROS.findIndex(x => x.id === livroAtual().id);
    anterior.disabled = indice === 0 && capituloAtual() === 1;
    proximo.disabled = indice === LIVROS.length - 1 && capituloAtual() === livroAtual().capitulos;
  }

  async function carregar() {
    const meuToken = ++tokenCarga;
    conteudo.innerHTML = '<div class="bible-loading">Carregando o capítulo...</div>';
    status.textContent = "Bíblia online · João Ferreira de Almeida";
    await salvarPreferencia();
    try {
      const [capitulo] = await Promise.all([
        buscarCapitulo(),
        carregarDestaques(),
        carregarAnotacoes()
      ]);
      if (meuToken !== tokenCarga) return;
      versos = capitulo;
      renderizar();
    } catch (erro) {
      console.error(erro);
      conteudo.innerHTML = '<div class="bible-error">Não foi possível carregar este capítulo agora. Verifique a internet e tente novamente.</div>';
      status.textContent = "Falha ao carregar";
    }
  }

  async function navegar(direcao) {
    let indice = LIVROS.findIndex(x => x.id === livroAtual().id);
    let capitulo = capituloAtual() + direcao;
    if (capitulo < 1 && indice > 0) {
      indice -= 1;
      livroSelect.value = LIVROS[indice].id;
      preencherCapitulos(LIVROS[indice].capitulos);
    } else if (capitulo > livroAtual().capitulos && indice < LIVROS.length - 1) {
      indice += 1;
      livroSelect.value = LIVROS[indice].id;
      preencherCapitulos(1);
    } else {
      capituloSelect.value = String(capitulo);
    }
    await carregar();
  }

  livroSelect.addEventListener("change", () => { preencherCapitulos(1); carregar(); });
  capituloSelect.addEventListener("change", carregar);
  anterior.addEventListener("click", () => navegar(-1));
  proximo.addEventListener("click", () => navegar(1));
  conteudo.addEventListener("click", evento => {
    const noteVerse = evento.target.closest("[data-note-verse]");
    if (noteVerse) {
      evento.preventDefault();
      anotarVersiculo(Number(noteVerse.dataset.noteVerse));
    }
  });

  notesList?.addEventListener("click", async evento => {
    const card = evento.target.closest("[data-note-id]");
    if (!card) return;

    const nota = anotacoes.find(x => x.id === card.dataset.noteId);
    if (!nota) return;

    const typeButton = evento.target.closest("[data-note-type]");
    if (typeButton) {
      const textareaAtual = card.querySelector("[data-note-comment]");
      if (textareaAtual) nota.comentario = textareaAtual.value;
      nota.tipo = typeButton.dataset.noteType;
      nota.atualizadoEm = new Date().toISOString();
      renderizarAnotacoes({ focarId: nota.id });
      return;
    }

    if (evento.target.closest("[data-note-save]")) {
      const textarea = card.querySelector("[data-note-comment]");
      nota.comentario = textarea?.value || "";
      nota.atualizadoEm = new Date().toISOString();
      try {
        await salvarAnotacoes();
        renderizarAnotacoes();
        window.MMCDUI?.toast("Anotação salva no Supabase.");
      } catch (erro) {
        console.error(erro);
        window.MMCDUI?.toast("Não foi possível salvar a anotação.");
      }
      return;
    }

    if (evento.target.closest("[data-note-delete]")) {
      if (!confirm(`Excluir sua anotação de ${nota.referencia}?`)) return;
      anotacoes = anotacoes.filter(x => x.id !== nota.id);
      try {
        await salvarAnotacoes();
        renderizarAnotacoes();
        window.MMCDUI?.toast("Anotação excluída.");
      } catch (erro) {
        console.error(erro);
        window.MMCDUI?.toast("Não foi possível excluir a anotação.");
      }
    }
  });

  conteudo.addEventListener("mouseup", evento => {
    if (evento.button !== 0 || evento.detail > 1) return;
    clearTimeout(timerSelecao);
    timerSelecao = setTimeout(() => marcarSelecao({ silencioso: true }), 250);
  });
  conteudo.addEventListener("touchend", () => {
    clearTimeout(timerSelecao);
    timerSelecao = setTimeout(() => marcarSelecao({ silencioso: true }), 350);
  }, { passive: true });

  conteudo.addEventListener("dblclick", evento => {
    clearTimeout(timerSelecao);
    const marca = evento.target.closest?.("mark.bible-highlight");
    if (marca) {
      evento.preventDefault();
      removerDestaque(marca.dataset.highlightId);
    } else {
      setTimeout(() => marcarSelecao({ silencioso: true }), 0);
    }
  });
  limpar.addEventListener("click", async () => {
    if (!destaques.length || !confirm("Remover todas as marcações deste capítulo?")) return;
    destaques = [];
    renderizar();
    await salvarDestaques();
  });

  checkCapitulo?.addEventListener("click", async () => {
    if (!versos.length || checkCapitulo.disabled) return;
    checkCapitulo.disabled = true;
    try { await alternarCapitulo(livroAtual(), capituloAtual(), { versiculosConhecidos: versos.length }); }
    catch (erro) { console.error(erro); window.MMCDUI?.toast("Não foi possível salvar o progresso deste capítulo."); }
    finally { atualizarCheckCapitulo(); }
  });

  document.querySelectorAll("[data-bible-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      filtroMapa = btn.dataset.bibleFilter || "todos";
      document.querySelectorAll("[data-bible-filter]").forEach(x => x.classList.toggle("active", x === btn));
      renderizarMapa();
    });
  });

  mapaLista?.addEventListener("click", async evento => {
    const chapter = evento.target.closest("[data-book-id][data-chapter]");
    if (chapter) {
      const livro = LIVROS.find(x => x.id === chapter.dataset.bookId); if (!livro) return;
      const cap = Number(chapter.dataset.chapter); chapter.disabled = true;
      try { await alternarCapitulo(livro, cap); }
      catch (erro) { console.error(erro); window.MMCDUI?.toast("Não foi possível atualizar este capítulo."); }
      finally { chapter.disabled = false; }
      return;
    }
    const completeBook = evento.target.closest("[data-complete-book]");
    if (completeBook) {
      const livro=LIVROS.find(x=>x.id===completeBook.dataset.completeBook); if(!livro)return;
      if(!confirm(`Marcar todos os ${livro.capitulos} capítulos de ${livro.nome} como concluídos?`))return;
      try{await marcarLivroCompleto(livro)}catch(erro){console.error(erro);window.MMCDUI?.toast("Não foi possível marcar o livro completo.")}return;
    }
    const clearBook=evento.target.closest("[data-clear-book]");
    if(clearBook){
      const livro=LIVROS.find(x=>x.id===clearBook.dataset.clearBook);if(!livro)return;
      if(!confirm(`Remover todas as marcações de leitura de ${livro.nome}? As marcações amarelas do texto não serão afetadas.`))return;
      try{await limparLivro(livro)}catch(erro){console.error(erro);window.MMCDUI?.toast("Não foi possível limpar o progresso deste livro.")}return;
    }
    const openBook=evento.target.closest("[data-open-book]");
    if(openBook){
      const livro=LIVROS.find(x=>x.id===openBook.dataset.openBook);if(!livro)return;livroSelect.value=livro.id;
      const primeiroPendente=Array.from({length:livro.capitulos},(_,i)=>i+1).find(cap=>!capituloConcluido(livro.id,cap))||1;
      preencherCapitulos(primeiroPendente);await carregar();document.querySelector(".bible-toolbar")?.scrollIntoView({behavior:"smooth",block:"start"});
    }
  });

  (async () => {
    try {
      const session = await window.MMCDAuth.requireSession();
      usuario = session.user;
      preencherLivros();
      const [pref] = await Promise.all([carregarPreferencia(), carregarProgresso()]);
      const params = new URLSearchParams(location.search);
      const livroUrl = params.get("livro");
      const capituloUrl = Number(params.get("capitulo") || 0);

      livroSelect.value = LIVROS.some(x => x.id === livroUrl)
        ? livroUrl
        : (LIVROS.some(x => x.id === pref.livro) ? pref.livro : "JHN");

      const selecionado = livroAtual();
      const capituloInicial = capituloUrl >= 1 && capituloUrl <= selecionado.capitulos
        ? capituloUrl
        : (pref.capitulo || 1);

      preencherCapitulos(capituloInicial);
      renderizarProgresso();
      await carregar();
    } catch (erro) {
      console.error(erro);
      conteudo.innerHTML = '<div class="bible-error">Não foi possível iniciar a Bíblia online.</div>';
    }
  })();
})();
