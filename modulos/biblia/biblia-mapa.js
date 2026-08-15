"use strict";
(async()=>{
  const db=window.MMCDSupabase;
  const esc=window.MMCDUI?.esc || (s=>String(s??""));
  const LIVROS=[{"id": "GEN", "nome": "Gênesis", "api": "Genesis", "capitulos": 50}, {"id": "EXO", "nome": "Êxodo", "api": "Exodus", "capitulos": 40}, {"id": "LEV", "nome": "Levítico", "api": "Leviticus", "capitulos": 27}, {"id": "NUM", "nome": "Números", "api": "Numbers", "capitulos": 36}, {"id": "DEU", "nome": "Deuteronômio", "api": "Deuteronomy", "capitulos": 34}, {"id": "JOS", "nome": "Josué", "api": "Joshua", "capitulos": 24}, {"id": "JDG", "nome": "Juízes", "api": "Judges", "capitulos": 21}, {"id": "RUT", "nome": "Rute", "api": "Ruth", "capitulos": 4}, {"id": "1SA", "nome": "1 Samuel", "api": "1 Samuel", "capitulos": 31}, {"id": "2SA", "nome": "2 Samuel", "api": "2 Samuel", "capitulos": 24}, {"id": "1KI", "nome": "1 Reis", "api": "1 Kings", "capitulos": 22}, {"id": "2KI", "nome": "2 Reis", "api": "2 Kings", "capitulos": 25}, {"id": "1CH", "nome": "1 Crônicas", "api": "1 Chronicles", "capitulos": 29}, {"id": "2CH", "nome": "2 Crônicas", "api": "2 Chronicles", "capitulos": 36}, {"id": "EZR", "nome": "Esdras", "api": "Ezra", "capitulos": 10}, {"id": "NEH", "nome": "Neemias", "api": "Nehemiah", "capitulos": 13}, {"id": "EST", "nome": "Ester", "api": "Esther", "capitulos": 10}, {"id": "JOB", "nome": "Jó", "api": "Job", "capitulos": 42}, {"id": "PSA", "nome": "Salmos", "api": "Psalms", "capitulos": 150}, {"id": "PRO", "nome": "Provérbios", "api": "Proverbs", "capitulos": 31}, {"id": "ECC", "nome": "Eclesiastes", "api": "Ecclesiastes", "capitulos": 12}, {"id": "SNG", "nome": "Cânticos", "api": "Song of Solomon", "capitulos": 8}, {"id": "ISA", "nome": "Isaías", "api": "Isaiah", "capitulos": 66}, {"id": "JER", "nome": "Jeremias", "api": "Jeremiah", "capitulos": 52}, {"id": "LAM", "nome": "Lamentações", "api": "Lamentations", "capitulos": 5}, {"id": "EZK", "nome": "Ezequiel", "api": "Ezekiel", "capitulos": 48}, {"id": "DAN", "nome": "Daniel", "api": "Daniel", "capitulos": 12}, {"id": "HOS", "nome": "Oséias", "api": "Hosea", "capitulos": 14}, {"id": "JOL", "nome": "Joel", "api": "Joel", "capitulos": 3}, {"id": "AMO", "nome": "Amós", "api": "Amos", "capitulos": 9}, {"id": "OBA", "nome": "Obadias", "api": "Obadiah", "capitulos": 1}, {"id": "JON", "nome": "Jonas", "api": "Jonah", "capitulos": 4}, {"id": "MIC", "nome": "Miquéias", "api": "Micah", "capitulos": 7}, {"id": "NAM", "nome": "Naum", "api": "Nahum", "capitulos": 3}, {"id": "HAB", "nome": "Habacuque", "api": "Habakkuk", "capitulos": 3}, {"id": "ZEP", "nome": "Sofonias", "api": "Zephaniah", "capitulos": 3}, {"id": "HAG", "nome": "Ageu", "api": "Haggai", "capitulos": 2}, {"id": "ZEC", "nome": "Zacarias", "api": "Zechariah", "capitulos": 14}, {"id": "MAL", "nome": "Malaquias", "api": "Malachi", "capitulos": 4}, {"id": "MAT", "nome": "Mateus", "api": "Matthew", "capitulos": 28}, {"id": "MRK", "nome": "Marcos", "api": "Mark", "capitulos": 16}, {"id": "LUK", "nome": "Lucas", "api": "Luke", "capitulos": 24}, {"id": "JHN", "nome": "João", "api": "John", "capitulos": 21}, {"id": "ACT", "nome": "Atos", "api": "Acts", "capitulos": 28}, {"id": "ROM", "nome": "Romanos", "api": "Romans", "capitulos": 16}, {"id": "1CO", "nome": "1 Coríntios", "api": "1 Corinthians", "capitulos": 16}, {"id": "2CO", "nome": "2 Coríntios", "api": "2 Corinthians", "capitulos": 13}, {"id": "GAL", "nome": "Gálatas", "api": "Galatians", "capitulos": 6}, {"id": "EPH", "nome": "Efésios", "api": "Ephesians", "capitulos": 6}, {"id": "PHP", "nome": "Filipenses", "api": "Philippians", "capitulos": 4}, {"id": "COL", "nome": "Colossenses", "api": "Colossians", "capitulos": 4}, {"id": "1TH", "nome": "1 Tessalonicenses", "api": "1 Thessalonians", "capitulos": 5}, {"id": "2TH", "nome": "2 Tessalonicenses", "api": "2 Thessalonians", "capitulos": 3}, {"id": "1TI", "nome": "1 Timóteo", "api": "1 Timothy", "capitulos": 6}, {"id": "2TI", "nome": "2 Timóteo", "api": "2 Timothy", "capitulos": 4}, {"id": "TIT", "nome": "Tito", "api": "Titus", "capitulos": 3}, {"id": "PHM", "nome": "Filemom", "api": "Philemon", "capitulos": 1}, {"id": "HEB", "nome": "Hebreus", "api": "Hebrews", "capitulos": 13}, {"id": "JAS", "nome": "Tiago", "api": "James", "capitulos": 5}, {"id": "1PE", "nome": "1 Pedro", "api": "1 Peter", "capitulos": 5}, {"id": "2PE", "nome": "2 Pedro", "api": "2 Peter", "capitulos": 3}, {"id": "1JN", "nome": "1 João", "api": "1 John", "capitulos": 5}, {"id": "2JN", "nome": "2 João", "api": "2 John", "capitulos": 1}, {"id": "3JN", "nome": "3 João", "api": "3 John", "capitulos": 1}, {"id": "JUD", "nome": "Judas", "api": "Jude", "capitulos": 1}, {"id": "REV", "nome": "Apocalipse", "api": "Revelation", "capitulos": 22}];
  const VERSOS_POR_LIVRO={"GEN":1533,"EXO":1213,"LEV":859,"NUM":1288,"DEU":959,"JOS":658,"JDG":618,"RUT":85,"1SA":810,"2SA":695,"1KI":816,"2KI":719,"1CH":942,"2CH":822,"EZR":280,"NEH":406,"EST":167,"JOB":1070,"PSA":2461,"PRO":915,"ECC":222,"SNG":117,"ISA":1292,"JER":1364,"LAM":154,"EZK":1273,"DAN":357,"HOS":197,"JOL":73,"AMO":146,"OBA":21,"JON":48,"MIC":105,"NAM":47,"HAB":56,"ZEP":53,"HAG":38,"ZEC":211,"MAL":55,"MAT":1071,"MRK":678,"LUK":1151,"JHN":879,"ACT":1007,"ROM":433,"1CO":437,"2CO":257,"GAL":149,"EPH":155,"PHP":104,"COL":95,"1TH":89,"2TH":47,"1TI":113,"2TI":83,"TIT":46,"PHM":25,"HEB":303,"JAS":108,"1PE":105,"2PE":61,"1JN":105,"2JN":13,"3JN":14,"JUD":25,"REV":404};

  const CHAVE_PROGRESSO="biblia_progresso_v2";
  const TOTAL_CAPITULOS=1189, TOTAL_VERSICULOS=31102, TOTAL_AT=929, TOTAL_NT=260;
  const TRADUCAO="almeida";

  const mapaLista=document.querySelector("#biblia-map-list");
  const mapaResumo=document.querySelector("#biblia-map-summary");
  const progressRing=document.querySelector("#biblia-progress-ring");
  const progressPercent=document.querySelector("#biblia-progress-percent");
  const progressTitle=document.querySelector("#biblia-progress-title");
  const progressMessage=document.querySelector("#biblia-progress-message");
  const statBooks=document.querySelector("#biblia-stat-books");
  const statChapters=document.querySelector("#biblia-stat-chapters");
  const statVerses=document.querySelector("#biblia-stat-verses");
  const statCurrentBook=document.querySelector("#biblia-stat-current-book");
  const atLabel=document.querySelector("#biblia-at-label");
  const ntLabel=document.querySelector("#biblia-nt-label");
  const atBar=document.querySelector("#biblia-at-bar");
  const ntBar=document.querySelector("#biblia-nt-bar");

  let usuario=null;
  let filtroMapa="todos";
  let progresso={schemaVersion:2,capitulos:{},livrosCompletos:{},resumo:{}};
  let filaSalvar=Promise.resolve();

  const fmt=n=>Number(n||0).toLocaleString("pt-BR");
  const testamento=livro=>LIVROS.findIndex(x=>x.id===livro.id)>=39?"NT":"AT";
  const totalVersos=livro=>Number(VERSOS_POR_LIVRO[livro.id]||0);
  const chave=(id,cap)=>`${id}:${Number(cap)}`;
  const baseCompleto=id=>Boolean(progresso.livrosCompletos?.[id]);
  const excecoes=id=>progresso.livrosCompletos?.[id]?.excecoes||{};

  function normalizar(v){
    v=v&&typeof v==="object"?v:{};
    return {
      schemaVersion:2,
      capitulos:v.capitulos&&typeof v.capitulos==="object"?v.capitulos:{},
      livrosCompletos:v.livrosCompletos&&typeof v.livrosCompletos==="object"?v.livrosCompletos:{},
      atualizadoEm:v.atualizadoEm||null,
      resumo:v.resumo&&typeof v.resumo==="object"?v.resumo:{}
    };
  }

  async function carregar(){
    const {data,error}=await db.from("configuracoes_usuario").select("valor").eq("user_id",usuario.id).eq("chave",CHAVE_PROGRESSO).maybeSingle();
    if(error) throw error;
    progresso=normalizar(data?.valor);
  }

  function capituloConcluido(id,cap){
    if(baseCompleto(id)) return !Object.prototype.hasOwnProperty.call(excecoes(id),String(Number(cap)));
    return Boolean(progresso.capitulos?.[chave(id,cap)]?.concluido);
  }

  function dadosLivro(livro){
    let caps=0, vers=0;
    if(baseCompleto(livro.id)){
      const ex=excecoes(livro.id);
      const excluidos=Object.keys(ex);
      caps=Math.max(0,livro.capitulos-excluidos.length);
      vers=Math.max(0,totalVersos(livro)-excluidos.reduce((a,c)=>a+Number(ex[c]?.versiculos||0),0));
    }else{
      for(let cap=1;cap<=livro.capitulos;cap++){
        const item=progresso.capitulos?.[chave(livro.id,cap)];
        if(!item?.concluido) continue;
        caps++;
        vers+=Number(item.versiculos||0);
      }
    }
    const concluido=caps===livro.capitulos;
    return {livro,testamento:testamento(livro),capitulosConcluidos:caps,versiculosConcluidos:concluido?totalVersos(livro):vers,concluido,percentual:livro.capitulos?Math.round(caps/livro.capitulos*100):0};
  }

  function resumo(){
    const livros=LIVROS.map(dadosLivro);
    const capitulosConcluidos=livros.reduce((a,x)=>a+x.capitulosConcluidos,0);
    const versiculosConcluidos=livros.reduce((a,x)=>a+x.versiculosConcluidos,0);
    const livrosConcluidos=livros.filter(x=>x.concluido).length;
    const atCapitulos=livros.filter(x=>x.testamento==="AT").reduce((a,x)=>a+x.capitulosConcluidos,0);
    const ntCapitulos=livros.filter(x=>x.testamento==="NT").reduce((a,x)=>a+x.capitulosConcluidos,0);
    return {livrosConcluidos,capitulosConcluidos,versiculosConcluidos,atCapitulos,ntCapitulos,percentual:Math.round(capitulosConcluidos/TOTAL_CAPITULOS*1000)/10};
  }

  function melhorLivro(){
    return LIVROS.map(dadosLivro).filter(x=>!x.concluido&&x.capitulosConcluidos>0).sort((a,b)=>b.percentual-a.percentual||b.capitulosConcluidos-a.capitulosConcluidos)[0]||null;
  }

  function salvar(){
    const r=resumo();
    progresso.resumo={...r,totalLivros:66,totalCapitulos:TOTAL_CAPITULOS,totalVersiculos:TOTAL_VERSICULOS};
    progresso.atualizadoEm=new Date().toISOString();
    const valor=JSON.parse(JSON.stringify(progresso));
    filaSalvar=filaSalvar.catch(()=>undefined).then(async()=>{
      const {error}=await db.from("configuracoes_usuario").upsert({user_id:usuario.id,chave:CHAVE_PROGRESSO,valor},{onConflict:"user_id,chave"});
      if(error) throw error;
      window.MMCDAtualizarProgressoBiblia?.(valor.resumo);
    });
    return filaSalvar;
  }

  async function quantidadeVersos(livro,cap){
    const cacheKey=`mmcd:biblia:${TRADUCAO}:${livro.id}:${Number(cap)}`;
    try{
      const cache=JSON.parse(localStorage.getItem(cacheKey)||"null");
      if(Array.isArray(cache?.versos)&&cache.versos.length) return cache.versos.length;
    }catch{}
    const url=`https://bible-api.com/${encodeURIComponent(`${livro.api} ${Number(cap)}`)}?translation=${TRADUCAO}&single_chapter_book_matching=indifferent`;
    const response=await fetch(url,{headers:{Accept:"application/json"}});
    if(!response.ok) throw new Error(`Resposta ${response.status}`);
    const data=await response.json();
    const n=Array.isArray(data.verses)?data.verses.length:0;
    if(!n) throw new Error("Capítulo sem versículos");
    return n;
  }

  async function definirCapitulo(livro,cap,done){
    const k=chave(livro.id,cap), c=String(Number(cap));
    if(done){
      if(baseCompleto(livro.id)){
        delete progresso.livrosCompletos[livro.id].excecoes[c];
      }else{
        progresso.capitulos[k]={concluido:true,versiculos:await quantidadeVersos(livro,cap),concluidoEm:new Date().toISOString()};
        let completo=true;
        for(let x=1;x<=livro.capitulos;x++) if(!progresso.capitulos?.[chave(livro.id,x)]?.concluido){completo=false;break;}
        if(completo){
          progresso.livrosCompletos[livro.id]={concluidoEm:new Date().toISOString(),excecoes:{}};
          Object.keys(progresso.capitulos).forEach(key=>{if(key.startsWith(`${livro.id}:`)) delete progresso.capitulos[key];});
        }
      }
    }else{
      if(baseCompleto(livro.id)){
        progresso.livrosCompletos[livro.id].excecoes[c]={versiculos:await quantidadeVersos(livro,cap),alteradoEm:new Date().toISOString()};
      }else delete progresso.capitulos[k];
    }
    await salvar();
  }

  async function marcarLivro(livro){
    progresso.livrosCompletos[livro.id]={concluidoEm:new Date().toISOString(),excecoes:{}};
    Object.keys(progresso.capitulos).forEach(k=>{if(k.startsWith(`${livro.id}:`)) delete progresso.capitulos[k];});
    await salvar();
  }

  async function limparLivro(livro){
    delete progresso.livrosCompletos[livro.id];
    Object.keys(progresso.capitulos).forEach(k=>{if(k.startsWith(`${livro.id}:`)) delete progresso.capitulos[k];});
    await salvar();
  }

  function passaFiltro(item){
    if(filtroMapa==="AT"||filtroMapa==="NT") return item.testamento===filtroMapa;
    if(filtroMapa==="andamento") return item.capitulosConcluidos>0&&!item.concluido;
    if(filtroMapa==="concluidos") return item.concluido;
    return true;
  }

  function renderResumo(){
    const r=resumo(), em=melhorLivro();
    progressRing?.style.setProperty("--progress",String(r.percentual));
    if(progressPercent) progressPercent.textContent=`${String(r.percentual).replace(".",",")}%`;
    if(progressTitle) progressTitle.textContent=r.capitulosConcluidos?`${fmt(r.capitulosConcluidos)} capítulos percorridos`:"Um capítulo de cada vez";
    if(progressMessage) progressMessage.textContent=em?`${em.livro.nome} está em ${em.percentual}%.`:"Comece marcando o primeiro capítulo concluído.";
    if(statBooks) statBooks.innerHTML=`${r.livrosConcluidos} <small>/ 66</small>`;
    if(statChapters) statChapters.innerHTML=`${fmt(r.capitulosConcluidos)} <small>/ 1.189</small>`;
    if(statVerses) statVerses.innerHTML=`${fmt(r.versiculosConcluidos)} <small>/ 31.102</small>`;
    if(statCurrentBook) statCurrentBook.textContent=em?`${em.livro.nome} · ${em.percentual}%`:"—";
    if(atLabel) atLabel.textContent=`${fmt(r.atCapitulos)} / 929 capítulos`;
    if(ntLabel) ntLabel.textContent=`${fmt(r.ntCapitulos)} / 260 capítulos`;
    if(atBar) atBar.style.width=`${Math.min(100,r.atCapitulos/TOTAL_AT*100)}%`;
    if(ntBar) ntBar.style.width=`${Math.min(100,r.ntCapitulos/TOTAL_NT*100)}%`;
    window.MMCDAtualizarProgressoBiblia?.({...r,totalLivros:66,totalCapitulos:1189,totalVersiculos:31102});
  }

  function renderMapa(){
    const r=resumo();
    const livros=LIVROS.map(dadosLivro).filter(passaFiltro);
    mapaResumo.innerHTML=`<span><b>${r.livrosConcluidos}</b> livros completos</span><span><b>${fmt(r.capitulosConcluidos)}</b> de 1.189 capítulos</span><span><b>${fmt(r.versiculosConcluidos)}</b> de 31.102 versículos</span>`;
    mapaLista.innerHTML=livros.map(item=>{
      const livro=item.livro;
      const chapters=Array.from({length:livro.capitulos},(_,i)=>{
        const cap=i+1, done=capituloConcluido(livro.id,cap);
        return `<button type="button" class="bible-chapter-dot ${done?"done":""}" data-book-id="${esc(livro.id)}" data-chapter="${cap}" aria-pressed="${done?"true":"false"}" title="${esc(livro.nome)} ${cap} · ${done?"concluído":"pendente"}">${done?"✓":cap}</button>`;
      }).join("");
      const firstPending=Array.from({length:livro.capitulos},(_,i)=>i+1).find(c=>!capituloConcluido(livro.id,c))||1;
      return `<details class="bible-book-card ${item.concluido?"complete":""}">
        <summary><div class="bible-book-card__identity"><span class="bible-book-status">${item.concluido?"✓":item.percentual+"%"}</span><div><strong>${esc(livro.nome)}</strong><small>${item.capitulosConcluidos}/${livro.capitulos} capítulos · ${fmt(item.versiculosConcluidos)}/${fmt(totalVersos(livro))} versículos</small></div></div><div class="bible-book-card__progress"><i style="width:${item.percentual}%"></i></div></summary>
        <div class="bible-book-card__body"><div class="bible-book-card__actions">
          <a class="btn small" href="biblia.html?livro=${encodeURIComponent(livro.id)}&capitulo=${firstPending}">Abrir no leitor</a>
          ${item.concluido?`<button type="button" class="btn small danger-outline" data-clear-book="${esc(livro.id)}">Desmarcar livro</button>`:`<button type="button" class="btn small primary" data-complete-book="${esc(livro.id)}">Marcar livro completo</button>`}
        </div><div class="bible-chapter-grid">${chapters}</div></div>
      </details>`;
    }).join("")||'<div class="bible-map-empty">Nenhum livro corresponde a este filtro.</div>';
  }

  const render=()=>{renderResumo();renderMapa();};

  document.querySelectorAll("[data-bible-filter]").forEach(btn=>btn.addEventListener("click",()=>{
    filtroMapa=btn.dataset.bibleFilter||"todos";
    document.querySelectorAll("[data-bible-filter]").forEach(x=>x.classList.toggle("active",x===btn));
    renderMapa();
  }));

  mapaLista.addEventListener("click",async e=>{
    const chapter=e.target.closest("[data-book-id][data-chapter]");
    if(chapter){
      const livro=LIVROS.find(x=>x.id===chapter.dataset.bookId); if(!livro)return;
      const cap=Number(chapter.dataset.chapter), done=!capituloConcluido(livro.id,cap);
      chapter.disabled=true;
      try{await definirCapitulo(livro,cap,done);render();window.MMCDUI?.toast(done?`${livro.nome} ${cap} concluído.`:`${livro.nome} ${cap} voltou para pendente.`);}
      catch(err){console.error(err);window.MMCDUI?.toast("Não foi possível atualizar este capítulo.");}
      finally{chapter.disabled=false;}
      return;
    }
    const complete=e.target.closest("[data-complete-book]");
    if(complete){
      const livro=LIVROS.find(x=>x.id===complete.dataset.completeBook); if(!livro)return;
      if(!confirm(`Marcar todos os ${livro.capitulos} capítulos de ${livro.nome} como concluídos?`))return;
      try{await marcarLivro(livro);render();window.MMCDUI?.toast(`${livro.nome} concluído.`);}catch(err){console.error(err);window.MMCDUI?.toast("Não foi possível marcar o livro.");}
      return;
    }
    const clear=e.target.closest("[data-clear-book]");
    if(clear){
      const livro=LIVROS.find(x=>x.id===clear.dataset.clearBook); if(!livro)return;
      if(!confirm(`Remover o progresso de leitura de ${livro.nome}?`))return;
      try{await limparLivro(livro);render();window.MMCDUI?.toast(`Progresso de ${livro.nome} removido.`);}catch(err){console.error(err);window.MMCDUI?.toast("Não foi possível limpar o livro.");}
    }
  });

  try{
    const session=await window.MMCDAuth.requireSession();
    usuario=session.user;
    await carregar();
    render();
  }catch(err){
    console.error(err);
    mapaLista.innerHTML='<div class="bible-error">Não foi possível carregar o mapa da Bíblia.</div>';
  }
})();
