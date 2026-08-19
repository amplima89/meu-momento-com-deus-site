"use strict";
(() => {
  const pad=n=>String(n).padStart(2,'0');
  const iso=x=>`${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;
  const parse=s=>new Date(`${s}T12:00:00`);
  let rendering=false;

  async function renderConsistency(){
    if(rendering)return;
    rendering=true;
    try{
      const d=await MMCD.carregar();
      const meta=d.metas.find(m=>/(medita|devocional)/.test((m.nome||'').toLocaleLowerCase('pt-BR')));
      const hoje=iso(new Date());
      const concluida=date=>!!(meta&&MMCD.registro(d,date,meta.id)?.concluida&&!MMCD.estaAbonada(MMCD.registro(d,date,meta.id)));
      const ultimos30=[];
      for(let i=29;i>=0;i--){const x=new Date();x.setDate(x.getDate()-i);ultimos30.push(iso(x))}
      const validos30=ultimos30.filter(date=>meta?MMCD.ativaNaData(meta,date):false);
      const totalConcluido=validos30.filter(concluida).length;
      const inicio=meta?.inicioVigencia||validos30[0]||hoje;
      const historico=[];
      for(let x=parse(inicio),fim=parse(hoje);x<=fim;x.setDate(x.getDate()+1)){
        const date=iso(x);if(meta&&MMCD.ativaNaData(meta,date))historico.push(date);
      }
      let recorde=0,sequencia=0;
      for(const date of historico){sequencia=concluida(date)?sequencia+1:0;recorde=Math.max(recorde,sequencia)}
      let indice=historico.length-1;
      if(indice>=0&&historico[indice]===hoje&&!concluida(hoje))indice--;
      let atual=0;for(;indice>=0&&concluida(historico[indice]);indice--)atual++;
      recorde=Math.max(recorde,atual);
      const el=document.querySelector('#meditation-consistency');if(!el)return;
      el.innerHTML=`<div class="consistency__top"><div><h2>CONSISTÊNCIA NA DEVOCIONAL</h2><p>Você está há <strong>${atual} ${atual===1?'dia':'dias'}</strong> consecutivos.</p><p>Seu recorde é <strong>${recorde} ${recorde===1?'dia':'dias'}</strong>.</p></div><strong>${validos30.length?Math.round(totalConcluido/validos30.length*100):0}%</strong></div><div class="consistency-grid consistency-grid--brains">${ultimos30.map(date=>{const programada=meta&&MMCD.ativaNaData(meta,date);const estado=!programada?'off':concluida(date)?'on':'missed';const texto=!programada?'Não programada':concluida(date)?'Realizada':'Não realizada';return `<i class="consistency-cell consistency-brain ${estado}" role="img" aria-label="${MMCDUI.date(date)} — ${texto}" title="${MMCDUI.date(date)} — ${texto}"></i>`}).join('')}</div>`;
    }finally{rendering=false}
  }
  document.addEventListener('memory:activity-updated',renderConsistency);
  renderConsistency().catch(console.error);
})();
