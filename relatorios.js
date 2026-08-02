"use strict";(async()=>{let d=await MMCD.carregar(),period=30;const $=s=>document.querySelector(s),pad=n=>String(n).padStart(2,'0'),iso=x=>`${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;
function dates(n){let a=[];for(let i=n-1;i>=0;i--){let x=new Date();x.setDate(x.getDate()-i);a.push(iso(x))}return a}
function medDone(date,meta){return !!(meta&&MMCD.registro(d,date,meta.id)?.concluida)}
function scheduledDates(meta){if(!meta)return[];const start=meta.inicioVigencia||Object.keys(d.registros).sort()[0]||iso(new Date()),end=meta.fimVigencia||iso(new Date()),a=[];let x=new Date(start+'T12:00');const e=new Date(end+'T12:00');while(x<=e){let s=iso(x);if(MMCD.ativaNaData({...meta,ativa:true},s))a.push(s);x.setDate(x.getDate()+1)}return a}
function streak(meta){let max=0,run=0;for(const date of scheduledDates(meta)){run=(meta.nome.toLowerCase().includes('medita')?medDone(date,meta):MMCD.registro(d,date,meta.id)?.concluida)?run+1:0;max=Math.max(max,run)}return max}
function currentStreak(meta){if(!meta)return 0;let list=scheduledDates(meta),n=0;for(let i=list.length-1;i>=0;i--){let date=list[i],ok=meta.nome.toLowerCase().includes('medita')?medDone(date,meta):MMCD.registro(d,date,meta.id)?.concluida;if(!ok)break;n++}return n}
function drawWeight(list){
let c=$('#weight-chart'),ctx=c.getContext('2d'),r=c.getBoundingClientRect(),q=devicePixelRatio||1;
c.width=r.width*q;c.height=280*q;ctx.setTransform(q,0,0,q,0,0);ctx.clearRect(0,0,r.width,280);
c._weightPoints=[];
if(list.length<2){ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--muted');ctx.font='13px sans-serif';ctx.fillText('Registre pelo menos dois pesos.',25,45);return}
let vals=list.map(x=>+x[1]),min=Math.min(...vals)-.8,max=Math.max(...vals)+.8;
const css=getComputedStyle(document.documentElement),line=css.getPropertyValue('--line').trim(),accent=css.getPropertyValue('--accent').trim(),text=css.getPropertyValue('--text').trim(),surface=css.getPropertyValue('--surface').trim();
ctx.strokeStyle=line;ctx.lineWidth=1;
for(let i=0;i<5;i++){let y=25+i*52;ctx.beginPath();ctx.moveTo(40,y);ctx.lineTo(r.width-15,y);ctx.stroke()}
const points=list.map((p,i)=>({date:p[0],value:+p[1],x:40+i*(r.width-60)/(list.length-1),y:245-(+p[1]-min)/(max-min)*210}));
c._weightPoints=points;
ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
points.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fillStyle=accent;ctx.fill()});
/* Exibe o valor de cada ponto. Quando os pontos ficam muito próximos, alterna a altura para evitar sobreposição. */
ctx.font='600 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillStyle=text;
points.forEach((p,i)=>{let y=p.y-(i%2?12:7);ctx.fillText(p.value.toFixed(1).replace('.',',')+' kg',p.x,Math.max(15,y))});
function tooltip(ev){
 const box=c.getBoundingClientRect(),mx=ev.clientX-box.left,my=ev.clientY-box.top;
 let nearest=null,dist=Infinity;
 for(const p of c._weightPoints||[]){const d=Math.hypot(mx-p.x,my-p.y);if(d<dist){dist=d;nearest=p}}
 drawWeight(list);
 if(!nearest||dist>18)return;
 const label=nearest.value.toFixed(1).replace('.',',')+' kg · '+nearest.date.split('-').reverse().join('/');
 ctx.font='600 12px sans-serif';const w=ctx.measureText(label).width+18,h=28;
 let x=Math.min(Math.max(8,nearest.x-w/2),r.width-w-8),y=Math.max(8,nearest.y-45);
 ctx.fillStyle=surface;ctx.strokeStyle=line;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,w,h,7);ctx.fill();ctx.stroke();
 ctx.fillStyle=text;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x+w/2,y+h/2);
}
if(!c._weightHoverBound){c.addEventListener('mousemove',tooltip);c.addEventListener('mouseleave',()=>drawWeight(list));c._weightHoverBound=true}
}
function render(){let ds=dates(period),active=d.metas.filter(m=>m.ativa),weights=Object.entries(d.pesos).filter(x=>ds.includes(x[0])).sort(),last=weights.at(-1)?.[1],first=weights[0]?.[1],diff=last!=null&&first!=null?+last-+first:null,bookList=d.livros.concluidos,med=d.metas.find(m=>m.nome.toLowerCase().includes('medita')),medCount=Object.keys(d.registros||{}).filter(x=>med&&MMCD.registro(d,x,med.id)?.concluida).length;let all=0,ok=0;for(const date of ds){const due=MMCD.metasNaData(d,date);all+=due.length;ok+=due.filter(m=>MMCD.registro(d,date,m.id)?.concluida).length}let rate=all?Math.round(ok/all*100):0;
$('#stat-kpis').innerHTML=`<article class="card stat-kpi"><span>Peso atual</span><strong>${last!=null?(+last).toFixed(1).replace('.',',')+' kg':'—'}</strong><small>${diff==null?'Sem comparação':(diff>0?'▲ ':'▼ ')+Math.abs(diff).toFixed(1).replace('.',',')+' kg'}</small></article><article class="card stat-kpi"><span>Consistência</span><strong>${rate}%</strong><small>${period} dias, respeitando vigência</small></article><article class="card stat-kpi"><span>Livros</span><strong>${bookList.length}</strong><small>Total concluído</small></article><article class="card stat-kpi"><span>Meditações</span><strong>${medCount}</strong><small>Registros concluídos</small></article>`;
$('#weight-period').textContent=period;drawWeight(weights);
let rank=active.map(m=>{let due=ds.filter(x=>MMCD.ativaNaData(m,x)),done=due.filter(x=>MMCD.registro(d,x,m.id)?.concluida).length;return[m.nome,due.length?Math.round(done/due.length*100):0]}).sort((a,b)=>b[1]-a[1]);$('#habit-ranking').innerHTML=rank.slice(0,8).map(x=>`<div class="rank-row"><span>${MMCDUI.esc(x[0])}</span><strong>${x[1]}%</strong><div class="progress"><i style="width:${x[1]}%"></i></div></div>`).join('')||'<div class="empty">Sem metas vigentes no período.</div>';
let durations=bookList.map(x=>x.dataInicio&&x.dataConclusao?Math.max(1,Math.round((new Date(x.dataConclusao)-new Date(x.dataInicio))/86400000)+1):null).filter(Boolean),authors=new Set(bookList.map(x=>x.autor).filter(Boolean));$('#book-stats').innerHTML=[['Quantidade',bookList.length],['Tempo médio',durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length)+' dias':'—'],['Autores',authors.size],['Meta anual',d.configuracoes.metaLivrosAno]].map(x=>`<div class="stat-detail"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
$('#meditation-stats').innerHTML=[['Quantidade',medCount],['Sequência atual',currentStreak(med)],['Maior sequência',streak(med)],['Versículos','—']].map(x=>`<div class="stat-detail"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
$('#heatmap').innerHTML=ds.map(date=>{let due=MMCD.metasNaData(d,date),done=due.filter(m=>MMCD.registro(d,date,m.id)?.concluida).length,p=due.length?done/due.length:0,cl=p>=.85?'l4':p>=.6?'l3':p>=.3?'l2':p>0?'l1':'';return `<i class="heat ${cl}" title="${MMCDUI.date(date)} — ${Math.round(p*100)}%"></i>`}).join('')}
document.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{period=+b.dataset.days;document.querySelectorAll('[data-days]').forEach(x=>x.classList.toggle('active',x===b));render()});$('#add-weight').onclick=async()=>{let date=prompt('Data (AAAA-MM-DD):',iso(new Date())),value=prompt('Peso em kg:');if(date&&value&&!isNaN(+String(value).replace(',','.'))){d.pesos[date]=+String(value).replace(',','.');await MMCD.salvar(d);render()}};render();addEventListener('resize',render)})();
