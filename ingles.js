
"use strict";
(async()=>{
 const lista=await MMCD.listarMeditacoes(),sel=document.querySelector('#ingles-data'),box=document.querySelector('#ingles-conteudo');
 const nivelBox=document.querySelector('#ingles-nivel');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
 function extrair(md=''){
  const linhas=md.split(/\r?\n/);let ini=-1,fim=linhas.length;
  for(let i=0;i<linhas.length;i++){const n=linhas[i].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/^#{2,3}\s+/.test(linhas[i])&&(n.includes('my prayer in english')||n.includes('oracao em ingles'))){ini=i+1;continue}if(ini>=0&&i>=ini&&/^##\s+/.test(linhas[i])){fim=i;break}}
  return ini<0?'':linhas.slice(ini,fim).join('\n').trim();
 }
 function render(md){const text=extrair(md);if(!text)return '<div class="empty">Esta meditação não possui a seção de inglês.</div>';let out='<div class="practice-note"><strong>Como usar:</strong> leia em voz alta, repita as expressões e marque o que deseja praticar novamente.</div>';let paras=text.split(/\n\s*\n/);for(const p of paras){const lines=p.split('\n').map(x=>x.trim()).filter(Boolean);if(lines.every(x=>/^[-*]\s+/.test(x)))out+='<ul>'+lines.map(x=>'<li>'+inline(x.replace(/^[-*]\s+/,''))+'</li>').join('')+'</ul>';else out+='<p>'+inline(lines.join(' ').replace(/\s{2,}/g,' '))+'</p>'}return out}

 async function carregarNivel(){
  try{
   const d=await MMCD.carregar();
   const hoje=new Date(),dia=hoje.getDay(),iso=hoje.toISOString().slice(0,10);
   const meta=(d.metas||[]).find(m=>{const n=((m.nome||'')+' '+(m.categoria||'')).toLowerCase();const mapa=m.nivelInglesPorDia||{};const nivelHoje=mapa[String(dia)]||m.nivelIngles||'';m.__nivelHoje=nivelHoje;return m.ativa!==false&&nivelHoje&&n.includes('ingl')&&(!(m.diasSemana||[]).length||(m.diasSemana||[]).includes(dia))&&(!m.inicioVigencia||iso>=m.inicioVigencia)&&(!m.fimVigencia||iso<=m.fimVigencia)});
   if(!meta){nivelBox.hidden=true;return}
   const nomes={facil:'Fácil',medio:'Médio',dificil:'Difícil'};nivelBox.textContent='Nível de hoje: '+(nomes[meta.__nivelHoje]||meta.__nivelHoje);nivelBox.hidden=false;
  }catch{nivelBox.hidden=true}
 }
 function dataAtual(){return lista[+sel.value]?.data||''}
 async function carregarMarcacoes(){
   try{const rows=await MMCD.listarMarcacoesIngles(dataAtual());aplicarTextos(rows.map(x=>x.texto))}
   catch(e){console.error(e);MMCDUI.toast('Não foi possível carregar as marcações.')}
 }
 function aplicarTextos(textos){for(const texto of textos){const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const i=node.nodeValue.indexOf(texto);if(i>=0){const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+texto.length);const mark=document.createElement('mark');mark.className='user-highlight';try{range.surroundContents(mark)}catch{}break}}}}
 async function salvar(){const textos=[...box.querySelectorAll('mark.user-highlight')].map(x=>' '.concat(x.textContent).trim()).filter(Boolean);await MMCD.substituirMarcacoesIngles(dataAtual(),textos)}
 async function abrir(){box.innerHTML=render(lista[+sel.value]?.markdown||'');await carregarMarcacoes()}
 lista.forEach((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=m.data.split('-').reverse().join('/');sel.append(o)});sel.value=Math.max(0,lista.length-1);sel.addEventListener('change',abrir);
 document.querySelector('#ingles-marcar').addEventListener('click',async()=>{const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount)return MMCDUI.toast('Selecione uma expressão primeiro.');const r=s.getRangeAt(0),a=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;if(!box.contains(a))return MMCDUI.toast('Selecione um trecho do inglês diário.');const m=document.createElement('mark');m.className='user-highlight';try{r.surroundContents(m)}catch{const f=r.extractContents();m.append(f);r.insertNode(m)}s.removeAllRanges();await salvar();MMCDUI.toast('Expressão salva no banco para revisão.')});
 box.addEventListener('click',async e=>{const m=e.target.closest?.('mark.user-highlight');if(!m)return;m.replaceWith(...m.childNodes);box.normalize();await salvar();MMCDUI.toast('Marcação removida.')});
 document.querySelector('#ingles-limpar').addEventListener('click',async()=>{const ms=[...box.querySelectorAll('mark.user-highlight')];if(!ms.length)return;if(!confirm('Remover todas as marcações desta data?'))return;ms.forEach(m=>m.replaceWith(...m.childNodes));box.normalize();await salvar();MMCDUI.toast('Marcações removidas.')});
 await carregarNivel();await abrir();
})();
