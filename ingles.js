"use strict";
(async()=>{
 const lista=await MMCD.listarMeditacoes(),sel=document.querySelector('#ingles-data'),box=document.querySelector('#ingles-conteudo');
 const nivelBox=document.querySelector('#ingles-nivel');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const inline=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
 const MARCADOR_GLOSSARIO=/<!--\s*MMCD_ENGLISH_GLOSSARY_START\s*([\s\S]*?)\s*MMCD_ENGLISH_GLOSSARY_END\s*-->/i;
 const GLOSSARIO_BASE={
  "a":"um / uma","an":"um / uma","the":"o / a","i":"eu","i'm":"eu estou / eu sou","i've":"eu tenho","i'll":"eu vou","i'd":"eu iria / eu tinha","my":"meu / minha","me":"me / mim","mine":"meu / minha","we":"nós","we're":"nós estamos / somos","we've":"nós temos","we'll":"nós vamos","our":"nosso / nossa","us":"nos / nós","you":"você / vocês","you're":"você está / é","you've":"você tem","your":"seu / sua","he":"ele","she":"ela","it":"isso / ele / ela","they":"eles / elas","this":"isto / este / esta","that":"isso / aquilo / que","these":"estes / estas","those":"aqueles / aquelas","and":"e","or":"ou","but":"mas","because":"porque","so":"então / por isso","if":"se","when":"quando","while":"enquanto","with":"com","without":"sem","for":"para / por","from":"de / desde","to":"para / a","in":"em / dentro de","on":"em / sobre","at":"em / no / na","of":"de","by":"por / perto de","about":"sobre","as":"como / enquanto","is":"é / está","are":"são / estão","was":"era / estava","were":"eram / estavam","be":"ser / estar","been":"sido / estado","being":"sendo / estando","have":"ter","has":"tem","had":"tinha / teve","do":"fazer","does":"faz","did":"fez","don't":"não","doesn't":"não","didn't":"não","can":"poder / consegue","can't":"não pode / não consegue","could":"poderia","will":"vai / irá","would":"iria","should":"deveria","must":"deve / precisa","not":"não","very":"muito","more":"mais","less":"menos","today":"hoje","today's":"de hoje","topic":"tema","useful":"úteis","expressions":"expressões","example":"exemplo","quick":"rápida","practice":"prática"
 };
 const GLOSSARIO_MEDITACAO_ATUAL={
  "a": "um / uma",
  "about": "sobre",
  "all": "todo / tudo",
  "also": "também",
  "am": "sou / estou",
  "and": "e",
  "anymore": "mais / daqui em diante",
  "at": "em / no",
  "be": "ser / estar",
  "become": "tornar-se",
  "between": "entre",
  "boundaries": "limites",
  "boundary": "limite",
  "but": "mas",
  "called": "chamado",
  "can": "pode",
  "cannot": "não pode",
  "carefully": "com cuidado",
  "carry": "carregar",
  "clearer": "mais claros",
  "closing": "fechando",
  "doing": "fazendo",
  "don't": "não",
  "down": "o ritmo",
  "even": "mesmo",
  "everything": "tudo",
  "expressions": "expressões",
  "faithfulness": "fidelidade",
  "family": "família",
  "felt": "pareceu",
  "finally": "finalmente",
  "for": "para",
  "guilt": "culpa",
  "healthier": "mais saudáveis",
  "healthy": "saudável",
  "home": "casa",
  "i": "eu",
  "if": "se",
  "into": "para / até",
  "is": "é / está",
  "it": "isso",
  "laptop": "notebook",
  "last": "durar / continuar",
  "learning": "aprendendo",
  "let": "deixar",
  "me": "me / mim",
  "means": "significa",
  "more": "mais",
  "my": "meu / minha",
  "need": "preciso",
  "normal": "normal",
  "not": "não",
  "on": "em / no",
  "one": "um / uma",
  "only": "apenas",
  "practice": "prática",
  "present": "presente",
  "protect": "proteger",
  "protecting": "protegendo",
  "quick": "rápida",
  "realized": "percebi",
  "reminded": "lembrou",
  "rest": "descanso / descansar",
  "rested": "descansei",
  "routine": "rotina",
  "saturday": "sábado",
  "set": "estabelecer",
  "slowing": "desacelerando",
  "sometimes": "às vezes",
  "spill": "invadir / se estender",
  "steady": "constante / equilibrado",
  "stop": "paro",
  "sunday": "domingo",
  "that": "que",
  "the": "o / a",
  "things": "as coisas",
  "this": "esta / isto",
  "time": "tempo",
  "to": "para / a",
  "today's": "de hoje",
  "topic": "tema",
  "trusting": "confiando",
  "used": "costumava",
  "useful": "úteis",
  "want": "quero",
  "week": "semana",
  "weekend": "fim de semana",
  "what": "qual / o que",
  "when": "quando",
  "while": "um tempo / enquanto",
  "without": "sem",
  "work": "trabalho / trabalhar",
  "you": "você"
};
 Object.assign(GLOSSARIO_BASE,GLOSSARIO_MEDITACAO_ATUAL);
 function extrairGlossario(md=''){
  const achou=String(md).match(MARCADOR_GLOSSARIO);if(!achou)return {...GLOSSARIO_BASE};
  let bruto=achou[1].trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  try{
   const objeto=JSON.parse(bruto),limpo={...GLOSSARIO_BASE};
   for(const [palavra,traducao] of Object.entries(objeto||{})){
    if(typeof traducao!=='string'||!traducao.trim())continue;
    const chave=normalizarPalavra(palavra);if(chave)limpo[chave]=traducao.trim();
   }
   return limpo;
  }catch(erro){console.warn('Glossário de inglês inválido nesta meditação.',erro);return {...GLOSSARIO_BASE}}
 }
 function removerGlossario(texto=''){return String(texto).replace(MARCADOR_GLOSSARIO,'').trim()}
 function normalizarPalavra(palavra=''){return String(palavra).trim().toLocaleLowerCase('en-US').replace(/’/g,"'").replace(/^[^a-z]+|[^a-z']+$/g,'')}
 function extrair(md=''){
  const linhas=md.split(/\r?\n/);let ini=-1,fim=linhas.length;
  for(let i=0;i<linhas.length;i++){const n=linhas[i].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/^#{2,3}\s+/.test(linhas[i])&&(n.includes('my life in english')||n.includes('english for my life')||n.includes('daily english')||n.includes('ingles diario')||n.includes('my prayer in english')||n.includes('oracao em ingles'))){ini=i+1;continue}if(ini>=0&&i>=ini&&/^##\s+/.test(linhas[i])){fim=i;break}}
  return ini<0?'':removerGlossario(linhas.slice(ini,fim).join('\n'));
 }
 function render(md){const text=extrair(md);if(!text)return '<div class="empty">Esta meditação não possui uma prática de inglês.</div>';let out='<div class="practice-note"><strong>Como usar:</strong> passe o mouse ou toque em uma palavra para ver a tradução. Leia em voz alta, responda à prática final e salve em azul as expressões que deseja revisar.</div>';let paras=text.split(/\n\s*\n/);for(const p of paras){const lines=p.split('\n').map(x=>x.trim()).filter(Boolean);if(lines.every(x=>/^[-*]\s+/.test(x)))out+='<ul>'+lines.map(x=>'<li>'+inline(x.replace(/^[-*]\s+/,''))+'</li>').join('')+'</ul>';else out+='<p>'+inline(lines.join(' ').replace(/\s{2,}/g,' '))+'</p>'}return out}
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
