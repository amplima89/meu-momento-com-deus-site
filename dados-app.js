"use strict";
window.MMCD=(()=>{
 const KEY='mmcd:vida:v4',OLD_KEYS=['mmcd:vida:v3','mmcd:vida:v2'];let cache=null,api=false;
 const hoje=()=>new Date().toISOString().slice(0,10);
 const defs=[['agua','Água','Saúde','diaria','💧','#2563eb'],['meditacao','Meditação','Espiritual','diaria','🙏','#7c3aed'],['leitura','Leitura','Desenvolvimento','diaria','📖','#d97706'],['treino','Treino','Saúde','semanal','🏋️','#059669'],['cardio','Cardio','Saúde','semanal','🏃','#dc2626'],['alimentacao','Alimentação','Saúde','diaria','🥗','#16a34a'],['sono','Sono','Saúde','diaria','🌙','#4f46e5'],['estudo','Estudo','Desenvolvimento','semanal','🎓','#0891b2']];
 const base={schemaVersion:4,atualizadoEm:'',configuracoes:{metaLivrosAno:30,anoMetaLivros:2026,missaoAtual:{titulo:'Ser um homem melhor diante de Deus, da família e do meu propósito.'}},metas:[],registros:{},pesos:{},observacoesDiarias:{},meditacoes:{},livros:{atual:{titulo:'',autor:'',dataInicio:'',observacoes:''},concluidos:[]}};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const norm=s=>(s||'').trim().toLocaleLowerCase('pt-BR');
 function merge(v={}){return {...clone(base),...v,schemaVersion:4,configuracoes:{...base.configuracoes,...(v.configuracoes||{}),missaoAtual:{...base.configuracoes.missaoAtual,...(v.configuracoes?.missaoAtual||{})}},metas:Array.isArray(v.metas)?v.metas:[],registros:v.registros||{},pesos:v.pesos||{},observacoesDiarias:v.observacoesDiarias||{},meditacoes:v.meditacoes||{},livros:{...base.livros,...(v.livros||{}),atual:{...base.livros.atual,...(v.livros?.atual||{})},concluidos:Array.isArray(v.livros?.concluidos)?v.livros.concluidos:[]}}}
 function earliest(v,id){return Object.keys(v.registros||{}).filter(dt=>(v.registros[dt]||[]).some(r=>r.metaId===id)).sort()[0]||Object.keys(v.habitos||{}).sort()[0]||hoje()}
 function migrate(v){let n=merge(v||{});if(!Array.isArray(n.metas)||!n.metas.length){n.metas=defs.map(x=>({id:x[0],nome:x[1],categoria:x[2],tipo:'check',frequencia:x[3],diasSemana:x[3]==='semanal'?[1,3,5]:[0,1,2,3,4,5,6],quantidade:x[3]==='semanal'?3:1,cor:x[5],icone:x[4],ativa:true,descricao:'',inicioVigencia:Object.keys(v?.habitos||{}).sort()[0]||hoje(),fimVigencia:''}))}
 if(v?.habitos){for(const [date,day] of Object.entries(v.habitos)){n.registros[date] ||= [];for(const [old,val] of Object.entries(day.habitos||{})){const id=old==='espiritual'?'meditacao':old;if(!n.registros[date].some(r=>r.metaId===id))n.registros[date].push({metaId:id,concluida:!!val,valor:val?1:0,observacao:''})}if(Number.isFinite(day.peso)&&n.pesos[date]==null)n.pesos[date]=day.peso}}
 n.metas=n.metas.map(m=>({...m,inicioVigencia:m.inicioVigencia||earliest(n,m.id),fimVigencia:m.fimVigencia||''}));n.schemaVersion=4;return n}
 function unionBooks(a=[],b=[]){const out=[];for(const x of [...a,...b]){const key=[norm(x.titulo),norm(x.autor),x.dataConclusao||'',x.dataInicio||''].join('|');if(!out.some(y=>[norm(y.titulo),norm(y.autor),y.dataConclusao||'',y.dataInicio||''].join('|')===key))out.push({...x,id:x.id||crypto.randomUUID()})}return out}
 function combine(a,b){a=migrate(a||{});b=migrate(b||{});const newer=Date.parse(a.atualizadoEm||0)>=Date.parse(b.atualizadoEm||0)?a:b,older=newer===a?b:a,n=merge(newer);n.metas=[...newer.metas];for(const m of older.metas)if(!n.metas.some(x=>x.id===m.id||norm(x.nome)===norm(m.nome)))n.metas.push(m);n.registros={...older.registros,...newer.registros};for(const [dt,rs] of Object.entries(older.registros||{})){n.registros[dt] ||= [];for(const r of rs)if(!n.registros[dt].some(x=>x.metaId===r.metaId))n.registros[dt].push(r)}n.pesos={...older.pesos,...newer.pesos};n.observacoesDiarias={...older.observacoesDiarias,...newer.observacoesDiarias};n.meditacoes={...older.meditacoes,...newer.meditacoes};n.livros.concluidos=unionBooks(newer.livros.concluidos,older.livros.concluidos);if(!n.livros.atual?.titulo&&older.livros.atual?.titulo)n.livros.atual=older.livros.atual;return migrate(n)}
 function local(){let out=null;for(const k of [KEY,...OLD_KEYS]){try{const v=JSON.parse(localStorage.getItem(k));if(v)out=out?combine(out,v):migrate(v)}catch{}}return out}
 function syncMeditacoes(d){const lista=window.MEDITACOES_DO_LIVRO||[];for(const item of lista){if(!item?.data)continue;d.meditacoes[item.data]={...(d.meditacoes[item.data]||{}),titulo:item.titulo||'Meu Momento com Deus',arquivo:item.arquivo||''}}return d}
 async function carregar(){
  if(cache)return cache;
  let fonte=null;
  try{
   const r=await fetch('/api/dados',{cache:'no-store'});
   if(r.ok){api=true;fonte=migrate(await r.json())}
  }catch{}
  if(!fonte){
   try{
    const r=await fetch('dados/vida.json?ts='+Date.now(),{cache:'no-store'});
    if(r.ok)fonte=migrate(await r.json())
   }catch{}
  }
  // A fonte publicada/API é soberana. Dados antigos do navegador nunca são
  // mesclados de volta, pois isso ressuscitava registros já excluídos.
  cache=syncMeditacoes(fonte||migrate({}));
  localStorage.setItem(KEY,JSON.stringify(cache));
  for(const k of OLD_KEYS)localStorage.removeItem(k);
  return cache
 }
 async function salvar(d){
  cache=syncMeditacoes(merge(d));
  cache.atualizadoEm=new Date().toISOString();
  if(api){
   try{
    const r=await fetch('/api/dados',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cache)});
    if(!r.ok)throw new Error(await r.text());
    const resposta=await r.json().catch(()=>null);
    localStorage.setItem(KEY,JSON.stringify(cache));
    return cache
   }catch(e){
    console.error('Falha ao persistir dados:',e);
    throw e
   }
  }
  // No GitHub Pages o site é somente leitura. A rotina local publica o JSON.
  // Não guardamos alterações estruturais no navegador para não reaparecerem no refresh.
  return cache
 }
 function registro(d,date,id){return (d.registros?.[date]||[]).find(r=>r.metaId===id)}
 function setRegistro(d,date,id,patch){d.registros[date] ||= [];let r=registro(d,date,id);if(!r){r={metaId:id,concluida:false,valor:0,observacao:''};d.registros[date].push(r)}Object.assign(r,patch)}
 function ativaNaData(m,date){if(!m?.ativa)return false;if(m.inicioVigencia&&date<m.inicioVigencia)return false;if(m.fimVigencia&&date>m.fimVigencia)return false;const dow=new Date(date+'T12:00:00').getDay();return (m.diasSemana||[]).includes(dow)}
 function metasNaData(d,date){return (d.metas||[]).filter(m=>ativaNaData(m,date))}
 return{carregar,salvar,registro,setRegistro,ativaNaData,metasNaData};
})();
