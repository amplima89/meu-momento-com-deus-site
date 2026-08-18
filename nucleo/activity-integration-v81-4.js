"use strict";

(() => {
  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();

  const localIso = value => {
    const d = value instanceof Date ? value : new Date(value || Date.now());
    if(Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  function activeOn(meta,date) {
    if(!meta?.ativa) return false;
    if(meta.inicioVigencia && date<meta.inicioVigencia) return false;
    if(meta.fimVigencia && date>meta.fimVigencia) return false;
    if(meta.modoProgramacao==="semanal_flexivel" || meta.modoProgramacao==="mensal_flexivel") return true;
    const day=new Date(`${date}T12:00:00`).getDay();
    return (meta.diasSemana||[]).includes(day);
  }

  function score(meta,kind) {
    const name=normalize(meta?.nome);
    const desc=normalize(meta?.descricao);
    const category=normalize(meta?.categoria);
    const text=`${name} ${desc}`.trim();
    let value=0;

    if(kind==="bible") {
      if(name==="ler a biblia") value+=500;
      if(name==="leitura da biblia") value+=460;
      if(name==="biblia") value+=420;
      if(name.includes("biblia")) value+=280;
      if(text.includes("ler") && text.includes("biblia")) value+=120;
      if(category.includes("espiritual")) value+=20;
    }

    if(kind==="english") {
      if(["ingles","ingles diario","estudar ingles","estudo de ingles","praticar ingles"].includes(name)) value+=500;
      if(name.includes("ingles") || name.includes("english")) value+=330;
      if(text.includes("idioma")) value+=70;
      if(text.includes("estud") && (text.includes("ingles") || text.includes("english"))) value+=140;
    }

    if(kind==="football") {
      if(name==="futebol") value+=520;
      if(name.includes("futebol")) value+=370;
      if(text.includes("jogar bola") || text.includes("jogo de futebol")) value+=300;
      if(category.includes("fisic")) value+=20;
    }

    if(kind==="cardio") {
      if(name==="cardio" || name==="hiit") value+=500;
      if(name.includes("cardio") || name.includes("hiit")) value+=350;
      if(text.includes("cardio") || text.includes("hiit")) value+=220;
    }

    if(kind==="workout") {
      if(name==="treino" || name==="atividade fisica") value+=500;
      if(name.includes("treino") || name.includes("atividade fisica")) value+=330;
      if(name.includes("academia") || name.includes("exercicio")) value+=220;
    }

    return value;
  }

  function bestMeta(data,kind,date) {
    return (data?.metas||[])
      .filter(meta=>activeOn(meta,date))
      .map(meta=>({meta,score:score(meta,kind)}))
      .filter(item=>item.score>0)
      .sort((a,b)=>b.score-a.score)[0]?.meta || null;
  }

  async function mark(kind,{date=localIso(new Date()),origin=kind,observation=""}={}) {
    if(!window.MMCD?.carregar || !window.MMCD?.salvarRegistroAtividade) {
      return {ok:false,reason:"mmcd-indisponivel"};
    }

    const data=await window.MMCD.carregar();
    const meta=bestMeta(data,kind,date);
    if(!meta) return {ok:false,reason:"sem-meta",kind,date};

    const previous=window.MMCD.registro(data,date,meta.id);
    if(window.MMCD.estaAbonada(previous)) return {ok:false,reason:"abonada",meta,date};
    if(previous?.concluida) return {ok:true,already:true,meta,date};

    const flexible=meta.modoProgramacao==="semanal_flexivel" || meta.modoProgramacao==="mensal_flexivel";
    window.MMCD.setRegistro(data,date,meta.id,{
      concluida:true,
      abonada:false,
      valor:flexible?Math.max(1,Number(previous?.valor||0)):1,
      texto:"",
      observacao:previous?.observacao || observation || "",
      origem:origin
    });

    await window.MMCD.salvarRegistroAtividade(data,date,meta.id);
    window.dispatchEvent(new CustomEvent("mmcd:atividade-atualizada",{
      detail:{data:date,metaId:meta.id,origem:origin,kind}
    }));
    return {ok:true,already:false,meta,date};
  }

  window.MemoryActivitySync={normalize,localIso,activeOn,score,bestMeta,mark};
})();
