"use strict";
(async()=>{
 const lista=await MMCD.listarMeditacoes(),sel=document.querySelector('#ingles-data'),box=document.querySelector('#ingles-conteudo');
 const nivelBox=document.querySelector('#ingles-nivel');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
 const GLOSSARIO_BASE={
  "a":"um / uma","an":"um / uma","the":"o / a","i":"eu","i'm":"eu estou / eu sou","i've":"eu tenho","i'll":"eu vou","i'd":"eu iria / eu tinha","my":"meu / minha","me":"me / mim","mine":"meu / minha","we":"nós","we're":"nós estamos / somos","we've":"nós temos","we'll":"nós vamos","our":"nosso / nossa","us":"nos / nós","you":"você / vocês","you're":"você está / é","you've":"você tem","your":"seu / sua","he":"ele","she":"ela","it":"isso / ele / ela","they":"eles / elas","this":"isto / este / esta","that":"isso / aquilo / que","these":"estes / estas","those":"aqueles / aquelas","and":"e","or":"ou","but":"mas","because":"porque","so":"então / por isso","if":"se","when":"quando","while":"enquanto","with":"com","without":"sem","for":"para / por","from":"de / desde","to":"para / a","in":"em / dentro de","on":"em / sobre","at":"em / no / na","of":"de","by":"por / perto de","about":"sobre","as":"como / enquanto","is":"é / está","are":"são / estão","was":"era / estava","were":"eram / estavam","be":"ser / estar","been":"sido / estado","being":"sendo / estando","have":"ter","has":"tem","had":"tinha / teve","do":"fazer","does":"faz","did":"fez","don't":"não","doesn't":"não","didn't":"não","can":"poder / consegue","can't":"não pode / não consegue","could":"poderia","will":"vai / irá","would":"iria","should":"deveria","must":"deve / precisa","not":"não","very":"muito","more":"mais","less":"menos","today":"hoje","today's":"de hoje","topic":"tema","useful":"úteis","expressions":"expressões","example":"exemplo","quick":"rápida","practice":"prática"
 };
 const MARCADOR_INICIO='MMCD_ENGLISH_GLOSSARY_START';
 const MARCADOR_FIM='MMCD_ENGLISH_GLOSSARY_END';

 function decodificarEntidadesHtml(valor=''){
  const area=document.createElement('textarea');
  area.innerHTML=String(valor);
  return area.value;
 }

 function localizarBlocoGlossario(texto=''){
  const original=String(texto);
  const minusculo=original.toLocaleLowerCase('en-US');
  const inicioToken=minusculo.indexOf(MARCADOR_INICIO.toLocaleLowerCase('en-US'));
  if(inicioToken<0)return null;

  const inicioConteudo=inicioToken+MARCADOR_INICIO.length;
  const fimToken=minusculo.indexOf(
   MARCADOR_FIM.toLocaleLowerCase('en-US'),
   inicioConteudo
  );
  if(fimToken<0){
   return {
    bruto:'',
    inicio:inicioToken,
    fim:original.length,
    incompleto:true
   };
  }

  let inicioRemocao=inicioToken;
  let fimRemocao=fimToken+MARCADOR_FIM.length;

  const antes=original.slice(Math.max(0,inicioToken-24),inicioToken);
  const comentarioHtml=antes.lastIndexOf('<!--');
  const comentarioEscapado=antes.toLocaleLowerCase('en-US').lastIndexOf('&lt;!--');

  if(comentarioHtml>=0){
   inicioRemocao=Math.max(0,inicioToken-24)+comentarioHtml;
  }else if(comentarioEscapado>=0){
   inicioRemocao=Math.max(0,inicioToken-24)+comentarioEscapado;
  }

  const depois=original.slice(fimRemocao,fimRemocao+24);
  const fechaHtml=depois.indexOf('-->');
  const fechaEscapado=depois.toLocaleLowerCase('en-US').indexOf('--&gt;');

  if(fechaHtml>=0){
   fimRemocao+=fechaHtml+3;
  }else if(fechaEscapado>=0){
   fimRemocao+=fechaEscapado+6;
  }

  return {
   bruto:original.slice(inicioConteudo,fimToken),
   inicio:inicioRemocao,
   fim:fimRemocao,
   incompleto:false
  };
 }

 function extrairGlossario(md=''){
  const bloco=localizarBlocoGlossario(md);
  if(!bloco||bloco.incompleto)return {...GLOSSARIO_BASE};

  let bruto=decodificarEntidadesHtml(bloco.bruto)
   .trim()
   .replace(/^```(?:json)?\s*/i,'')
   .replace(/\s*```$/,'');

  try{
   const objeto=JSON.parse(bruto),limpo={...GLOSSARIO_BASE};
   for(const [palavra,traducao] of Object.entries(objeto||{})){
    if(typeof traducao!=='string'||!traducao.trim())continue;
    const chave=normalizarPalavra(palavra);
    if(chave)limpo[chave]=traducao.trim();
   }
   return limpo;
  }catch(erro){
   console.warn('Glossário de inglês inválido nesta meditação.',erro);
   return {...GLOSSARIO_BASE};
  }
 }

 function removerGlossario(texto=''){
  let resultado=String(texto);
  let seguranca=0;

  while(seguranca<5){
   const bloco=localizarBlocoGlossario(resultado);
   if(!bloco)break;
   resultado=resultado.slice(0,bloco.inicio)+resultado.slice(bloco.fim);
   seguranca+=1;
  }

  return resultado.trim();
 }
 function normalizarPalavra(palavra=''){return String(palavra).trim().toLocaleLowerCase('en-US').replace(/’/g,"'").replace(/^[^a-z]+|[^a-z']+$/g,'')}
 function extrair(md=''){
  const linhas=md.split(/\r?\n/);let ini=-1,fim=linhas.length;
  for(let i=0;i<linhas.length;i++){const n=linhas[i].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/^#{2,3}\s+/.test(linhas[i])&&(n.includes('my life in english')||n.includes('english for my life')||n.includes('daily english')||n.includes('ingles diario')||n.includes('my prayer in english')||n.includes('oracao em ingles'))){ini=i+1;continue}if(ini>=0&&i>=ini&&/^##\s+/.test(linhas[i])){fim=i;break}}
  return ini<0?'':removerGlossario(linhas.slice(ini,fim).join('\n'));
 }
 function render(md){const text=removerGlossario(extrair(md));if(!text)return '<div class="empty">Esta meditação não possui uma prática de inglês.</div>';let out='<div class="practice-note"><strong>Como usar:</strong> passe o mouse ou toque em uma palavra para ver a tradução. Leia em voz alta, responda à prática final e salve em azul as expressões que deseja revisar.</div>';let paras=text.split(/\n\s*\n/);for(const p of paras){const lines=p.split('\n').map(x=>x.trim()).filter(Boolean);if(lines.every(x=>/^[-*]\s+/.test(x)))out+='<ul>'+lines.map(x=>'<li>'+inline(x.replace(/^[-*]\s+/,''))+'</li>').join('')+'</ul>';else out+='<p>'+inline(lines.join(' ').replace(/\s{2,}/g,' '))+'</p>'}return out}
 function aplicarTraducoes(glossario){
  const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT,{acceptNode(no){if(!no.nodeValue?.trim())return NodeFilter.FILTER_REJECT;const pai=no.parentElement;if(!pai||pai.closest('.practice-note')||pai.closest('.english-word'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}}),nos=[];let no;while(no=walker.nextNode())nos.push(no);
  const padrao=/[A-Za-z]+(?:['’][A-Za-z]+)*/g;
  for(const textoNo of nos){const texto=textoNo.nodeValue;let ultimo=0,achou=false,match;const frag=document.createDocumentFragment();padrao.lastIndex=0;while(match=padrao.exec(texto)){const palavra=match[0],traducao=glossario[normalizarPalavra(palavra)];if(!traducao)continue;achou=true;if(match.index>ultimo)frag.append(document.createTextNode(texto.slice(ultimo,match.index)));const span=document.createElement('span');span.className='english-word';span.tabIndex=0;span.dataset.translation=traducao;span.setAttribute('aria-label',`${palavra}: ${traducao}`);span.textContent=palavra;frag.append(span);ultimo=match.index+palavra.length}if(!achou)continue;if(ultimo<texto.length)frag.append(document.createTextNode(texto.slice(ultimo)));textoNo.replaceWith(frag)}
 }
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
 function aplicarTextos(textos){for(const texto of textos){const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const i=node.nodeValue.indexOf(texto);if(i>=0){const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+texto.length);const mark=document.createElement('mark');mark.className='english-highlight';try{range.surroundContents(mark)}catch{}break}}}}
 async function salvar(){const textos=[...box.querySelectorAll('mark.english-highlight')].map(x=>' '.concat(x.textContent).trim()).filter(Boolean);await MMCD.substituirMarcacoesIngles(dataAtual(),textos)}
 async function abrir(){const md=lista[+sel.value]?.markdown||'';box.innerHTML=render(md);await carregarMarcacoes();aplicarTraducoes(extrairGlossario(md))}
 function fecharTooltips(excecao=null){box.querySelectorAll('.english-word.is-open').forEach(item=>{if(item!==excecao)item.classList.remove('is-open')})}
 lista.forEach((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=m.data.split('-').reverse().join('/');sel.append(o)});sel.value=Math.max(0,lista.length-1);sel.addEventListener('change',abrir);
 document.querySelector('#ingles-marcar').addEventListener('click',async()=>{const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount)return MMCDUI.toast('Selecione uma expressão primeiro.');const r=s.getRangeAt(0),a=r.commonAncestorContainer.nodeType===1?r.commonAncestorContainer:r.commonAncestorContainer.parentElement;if(!box.contains(a))return MMCDUI.toast('Selecione um trecho do inglês diário.');const m=document.createElement('mark');m.className='english-highlight';try{r.surroundContents(m)}catch{const f=r.extractContents();m.append(f);r.insertNode(m)}s.removeAllRanges();await salvar();MMCDUI.toast('Expressão salva no banco para revisão.')});
 box.addEventListener('click',async e=>{const m=e.target.closest?.('mark.english-highlight');if(m){m.replaceWith(...m.childNodes);box.normalize();await salvar();MMCDUI.toast('Marcação removida.');return}const palavra=e.target.closest?.('.english-word');if(!palavra)return;e.stopPropagation();const abrir=!palavra.classList.contains('is-open');fecharTooltips(palavra);palavra.classList.toggle('is-open',abrir)});
 document.addEventListener('click',e=>{if(!box.contains(e.target))fecharTooltips()});
 document.querySelector('#ingles-limpar').addEventListener('click',async()=>{const ms=[...box.querySelectorAll('mark.english-highlight')];if(!ms.length)return;if(!confirm('Remover todas as marcações desta data?'))return;ms.forEach(m=>m.replaceWith(...m.childNodes));box.normalize();await salvar();MMCDUI.toast('Marcações removidas.')});
 await carregarNivel();await abrir();
})();
