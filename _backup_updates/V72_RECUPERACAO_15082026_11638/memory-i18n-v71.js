"use strict";
(()=>{
 const STORAGE_KEY="memory:language";
 const VALID=["pt-BR","en"];
 const FLAGS={"pt-BR":"🇧🇷",en:"🇬🇧"};
 const NAMES={"pt-BR":"Português",en:"English"};
 const exact=new Map(Object.entries({
  "Visão da vida":"Life overview","Atividades":"Activities","Rotina diária":"Daily routine","Momento com Deus":"Time with God",
  "Leitura e anotações":"Reading & notes","Inglês diário":"Daily English","Aula adaptativa":"Adaptive lesson","Plano de treino":"Workout plan",
  "Biblioteca":"Library","Estatísticas":"Statistics","Evolução":"Progress","GESTÃO":"MANAGEMENT","PRINCIPAL":"MAIN",
  "Configurações":"Settings","Preferências e cadastros":"Preferences & records","Ajustes":"Settings","Fé, disciplina e evolução.":"Faith, discipline and growth.","Um dia de cada vez.":"One day at a time.",
  "Tamanho do texto":"Text size","Deixe o Memory confortável para você.":"Make Memory comfortable for you.","Padrão":"Default","Tamanho original":"Original size","Grande":"Large","Leitura mais confortável":"More comfortable reading","Extra grande":"Extra large","Maior acessibilidade":"Greater accessibility",
  "Novidades do Memory":"What's new in Memory","Veja o que mudou no sistema. O histórico continua aqui mesmo depois de visualizado.":"See what changed in the system. The history remains available after you read it.",
  "Idioma":"Language","Idioma do Memory":"Memory language","Escolha o idioma da interface.":"Choose the interface language.","Português":"Portuguese","Inglês":"English",
  "Situação da vida":"Life overview","Tudo o que importa, compreendido em menos de 10 segundos.":"Everything that matters, understood in under 10 seconds.",
  "Indicadores":"Indicators","Consistência":"Consistency","Últimos 30 dias":"Last 30 days","Evolução do peso":"Weight progress","Detalhes →":"Details →","Espiritual":"Spiritual","Última meditação":"Latest meditation",
  "Execução e histórico diário":"Daily execution and history","Rotina":"Routine","Atividades diárias":"Daily activities","Escolha qualquer data para registrar, consultar ou corrigir suas atividades.":"Choose any date to record, review, or correct your activities.","Gerenciar metas":"Manage goals","Hoje":"Today","Progresso do dia":"Daily progress","Dados online · Supabase":"Online data · Supabase","Calendário de atividades":"Activity calendar","Mês anterior":"Previous month","Próximo mês":"Next month","Registro do dia":"Daily log","Controles dos grupos":"Group controls","Grupos":"Groups","Expandir tudo":"Expand all","Recolher tudo":"Collapse all","Peso (kg)":"Weight (kg)","Observação":"Note","Como foi o seu dia?":"How was your day?","Nenhuma meta programada para este dia.":"No goal scheduled for this day.",
  "SEMANA FLEXÍVEL":"FLEXIBLE WEEK","Você decide o dia":"You choose the day","Só fecha como não concluída depois de domingo.":"It is only marked incomplete after Sunday.","Meta semanal concluída":"Weekly goal completed","Semana encerrada parcialmente":"Week ended partially","Semana encerrada · Não concluída":"Week ended · Not completed","Pendente · você tem até domingo":"Pending · you have until Sunday","Desfazer hoje":"Undo today","Registrar realização":"Log completion","Concluída":"Completed",
  "MÊS FLEXÍVEL":"FLEXIBLE MONTH","Você decide quando neste mês":"You choose when this month","Só fecha como não concluída quando o mês terminar.":"It is only marked incomplete when the month ends.","Meta mensal concluída":"Monthly goal completed","Mês encerrado parcialmente":"Month ended partially","Mês encerrado · Não concluída":"Month ended · Not completed","Pendente · você tem até o fim do mês":"Pending · you have until the end of the month","neste mês":"this month",
  "Configuração das metas":"Goal settings","Metas":"Goals","Rotinas e objetivos":"Routines and goals","Cadastro":"Setup","Nova meta":"New goal","Editar meta":"Edit goal","Nome":"Name","Grupo":"Group","Ícone":"Icon","Tipo":"Type","Concluir":"Complete","Registrar valor":"Record value","Frequência":"Frequency","Diária":"Daily","Semanal":"Weekly","Mensal":"Monthly","Anual":"Yearly","Como concluir":"How to complete","Em dias específicos":"On specific days","Em qualquer dia da semana":"On any day of the week","Em qualquer dia do mês":"On any day of the month","Descrição":"Description","Qual é o objetivo desta meta?":"What is the purpose of this goal?","Integração com musculação":"Strength training integration","Vincular esta meta ao meu treino de musculação":"Link this goal to my strength workout","Quando você malhar, o Memory conclui automaticamente esta meta se ela estiver programada para aquele dia.":"When you work out, Memory automatically completes this goal when it is eligible on that date.","Desativado":"Disabled","Vinculado":"Linked","Você pode vincular várias metas.":"You can link multiple goals.","Dias programados":"Scheduled days","Meta semanal flexível":"Flexible weekly goal","Ela aparece em Atividades durante a semana até você atingir a quantidade. Antes de domingo, o Memory nunca trata a meta como não concluída. Ao encerrar a semana, registra 100%, parcial ou não concluída.":"It stays in Activities throughout the week until you reach the target. Before Sunday ends, Memory never treats it as failed. When the week closes, it records 100%, partial, or not completed.","Meta mensal flexível":"Flexible monthly goal","Ela aparece em Atividades durante o mês até você atingir a quantidade. Antes do último dia do mês terminar, o Memory mantém a meta em aberto. Ao encerrar o mês, registra 100%, parcial ou não concluída.":"It stays in Activities throughout the month until you reach the target. Until the last day ends, Memory keeps the goal open. When the month closes, it records 100%, partial, or not completed.","Dificuldade do inglês por dia":"English difficulty by day","Escolha um nível diferente para cada dia marcado.":"Choose a different level for each selected day.","Início da vigência":"Start date","Fim da vigência":"End date","Quantidade":"Quantity","Vezes por semana":"Times per week","Vezes por mês":"Times per month","Unidade":"Unit","Status":"Status","Ativa":"Active","Desativada":"Disabled","Cancelar":"Cancel","Salvar meta":"Save goal","Metas cadastradas":"Registered goals","Lista de metas":"Goal list","Todos os grupos":"All groups","Todos":"All","Ações":"Actions","Editar":"Edit","Duplicar":"Duplicate","Desativar":"Disable","Ativar":"Enable","Excluir":"Delete","Sem descrição":"No description","Sem grupo":"No group","Programação":"Schedule","Vigência":"Validity","Flexível":"Flexible","Semanal flexível":"Flexible weekly","Mensal flexível":"Flexible monthly","Todos os dias":"Every day","Sem dia definido":"No day defined","Sem frequência":"No frequency",
  "Configurações do Memory":"Memory settings","Organize suas preferências e cadastros em um só lugar.":"Organize your preferences and records in one place.","Aparência":"Appearance","Tema e cores":"Theme and colors","Medições corporais":"Body measurements","Medidas e evolução visual":"Measurements and visual progress","Rotina e objetivos":"Routine and goals","Meu perfil":"My profile","Foto e identificação":"Photo and identification","Programa e exercícios":"Program and exercises","Séries & filmes":"Series & movies","Biblioteca de exposição":"Exposure library","Aniversários":"Birthdays","Pessoas importantes":"Important people","Links da meditação":"Meditation links","Músicas e vídeos":"Music and videos",
  "Mapa corporal":"Body map","Registre suas medidas e veja o corpo ser preenchido em tempo real. Verde indica evolução na direção desejada; vermelho indica movimento contrário.":"Record your measurements and see the body fill in real time. Green shows progress in the desired direction; red shows movement in the opposite direction.","Leitura corporal":"Body reading","Nova medição":"New measurement","Data da medição":"Measurement date","Corpo em leitura":"Body scan","Próximo →":"Next →","← Anterior":"← Previous","Sem medição":"No measurement","Aguardando medida":"Waiting for measurement",
  "Prepare seu coração":"Prepare your heart","Abrir no YouTube ↗":"Open on YouTube ↗","Ouvir a meditação":"Listen to the meditation","Ouvir":"Play","Pausar":"Pause","Parar":"Stop","Voz":"Voice",
  "Salvando no banco...":"Saving...","Atividade salva no banco":"Activity saved","Salvando meta semanal...":"Saving weekly goal...","Progresso semanal salvo":"Weekly progress saved","Salvando meta mensal...":"Saving monthly goal...","Progresso mensal salvo":"Monthly progress saved","Meta mensal concluída":"Monthly goal completed","Salvando peso...":"Saving weight...","Peso salvo no banco":"Weight saved","Salvando observação...":"Saving note...","Observação salva no banco":"Note saved","Abono removido":"Excuse removed","Atividade abonada":"Activity excused","Abonada":"Excused","Abonar":"Excuse","Abonado":"Excused","Registrar abono":"Add excuse","Remover abono":"Remove excuse","Motivo":"Reason",
  "Fácil":"Easy","Médio":"Medium","Difícil":"Hard","Salvar":"Save","Fechar":"Close","Voltar":"Back","Próximo":"Next","Anterior":"Previous","Pendente":"Pending","Parcial":"Partial","Não concluída":"Not completed","Concluído":"Completed","Não iniciado":"Not started","Em andamento":"In progress",
  "Sua vida como um todo":"Your life as a whole","Árvore da Vida":"Tree of Life","O Memory não mede perfeição. Ele mostra onde sua atenção tem aparecido para você decidir o que cuidar.":"Memory does not measure perfection. It shows where your attention has been so you can decide what to care for.",
  "Minhas orações":"My prayers","Círculo de Cuidado":"Circle of Care","Leitura integrada":"Integrated view","Seu cuidado está formando uma história":"Your care is becoming a story","Os ramos usam evidências que já existem no Memory: metas, atividades, registros, orações e memórias.":"The branches use evidence already in Memory: goals, activities, records, prayers, and memories.",
  "O Memory percebeu":"Memory noticed","Padrões sem julgamento":"Patterns without judgment","Seis dimensões":"Six dimensions","Onde sua atenção tem aparecido":"Where your attention has been","Orações e Memórias de Deus":"Prayers and Memories of God","Pessoas importantes que você não quer esquecer.":"Important people you do not want to forget.",
  "Memória espiritual":"Spiritual memory","Minhas Orações":"My Prayers","Nova oração":"New prayer","O que está no seu coração?":"What is on your heart?","Pedido ou tema":"Prayer or theme","Categoria":"Category","Por quem? (opcional)":"For whom? (optional)","Nome da pessoa":"Person's name","Contexto":"Context","Salvar oração":"Save prayer","Pedidos e respostas":"Prayers and answers","Em oração":"In prayer","Memórias de Deus":"Memories of God","Deus respondeu":"God answered","Orar agora":"Pray now","Guardar memória":"Save memory","Modo Presença":"Presence Mode","Encerrar":"Finish","Continue em oração":"Continue praying","Etapa":"Step",
  "Cuidado com pessoas":"Care for people","Quem você quer lembrar de cuidar?":"Who do you want to remember to care for?","Pessoa importante":"Important person","Relação":"Relationship","Lembrar a cada":"Remind every","Nota opcional":"Optional note","Manter no meu círculo":"Keep in my circle","Adicionar ao círculo":"Add to circle","Relacionamentos":"Relationships","Pessoas importantes":"Important people","No círculo":"In circle","Pedindo atenção":"Needs attention","Cuidados hoje":"Care today","Cuidei hoje":"I cared today","Próximo cuidado":"Next care","Ainda sem registro":"No record yet",
  "O que merece sua atenção hoje?":"What deserves your attention today?","O essencial antes do restante":"What matters before everything else","O Memory usa o que já está registrado para reduzir ruído, não para criar mais tarefas.":"Memory uses what is already recorded to reduce noise, not to create more tasks.","Seu cuidado como um todo":"Your care as a whole","Abrir visão →":"Open view →","Sinais que poderiam passar despercebidos":"Signals that could go unnoticed"
 }));
 const titleMap=new Map(Object.entries({
  "Missões — Memory":"Memory - Missions","Atividades Diárias — Memory":"Memory - Activities","Metas — Memory":"Memory - Goals","Memory - Metas":"Memory - Goals","Memory - Configurações":"Memory - Settings","Aparência — Configurações — Memory":"Memory - Settings - Appearance","Medições corporais — Configurações — Memory":"Memory - Settings - Body measurements","Meu perfil — Memory":"Memory - Profile","Plano de treino — Configurações — Memory":"Memory - Settings - Workout plan","Séries & filmes — Memory":"Memory - Series & movies","Memory - Aniversários":"Memory - Birthdays","Memory - Links da meditação":"Memory - Meditation links","Inglês diário — Memory":"Memory - Daily English","Evolução do inglês — Memory":"Memory - English progress","Treinos — Memory":"Memory - Workouts","Memory — Treinos":"Memory - Workouts","Livros — Memory":"Memory - Books","Bíblia online — Memory":"Memory - Bible","Mapa da Bíblia — Memory":"Memory - Bible map","Meditação — Memory":"Memory - Meditation","Análise de atividades — Memory":"Memory - Activity analysis","Memory — Propósito e essência":"Memory - Purpose & essence","Memory - Árvore da Vida":"Memory - Tree of Life","Memory - Minhas Orações":"Memory - My Prayers","Memory - Círculo de Cuidado":"Memory - Circle of Care"
 }));
 const originalText=new WeakMap();
 const originalAttrs=new WeakMap();
 let applying=false;
 let observer=null;
 let current=VALID.includes(localStorage.getItem(STORAGE_KEY))?localStorage.getItem(STORAGE_KEY):"pt-BR";
 const months={janeiro:"January",fevereiro:"February",março:"March",abril:"April",maio:"May",junho:"June",julho:"July",agosto:"August",setembro:"September",outubro:"October",novembro:"November",dezembro:"December"};
 const weekdays={"segunda-feira":"Monday","terça-feira":"Tuesday","quarta-feira":"Wednesday","quinta-feira":"Thursday","sexta-feira":"Friday","sábado":"Saturday","domingo":"Sunday","Seg":"Mon","Ter":"Tue","Qua":"Wed","Qui":"Thu","Sex":"Fri","Sáb":"Sat","Dom":"Sun","SEG":"MON","TER":"TUE","QUA":"WED","QUI":"THU","SEX":"FRI","SÁB":"SAT","DOM":"SUN"};
 function dynamicEn(text){
  let s=text;
  if(exact.has(s)) return exact.get(s);
  if(weekdays[s]) return weekdays[s];
  s=s.replace(/^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4})$/i,(m,mon,y)=>`${months[mon.toLowerCase()]||mon} ${y}`);
  s=s.replace(/\baté domingo\b/gi,"until Sunday").replace(/\bnesta semana\b/gi,"this week").replace(/\bvezes nesta semana\b/gi,"times this week").replace(/\bvez nesta semana\b/gi,"time this week");
  s=s.replace(/\baté o fim do mês\b/gi,"until the end of the month").replace(/\bneste mês\b/gi,"this month").replace(/\bvezes neste mês\b/gi,"times this month").replace(/\bvez neste mês\b/gi,"time this month");
  s=s.replace(/(\d+) de (\d+) · Meta semanal concluída/g,"$1 of $2 · Weekly goal completed");
  s=s.replace(/(\d+) de (\d+) · (\d+)% · falta(?:m)? (\d+) until Sunday/gi,"$1 of $2 · $3% · $4 remaining until Sunday");
  s=s.replace(/^(\d+) de (\d+) · (\d+)% · Semana encerrada parcialmente$/i,"$1 of $2 · $3% · Week ended partially");
  s=s.replace(/^0 de (\d+) · Semana encerrada · Não concluída$/i,"0 of $1 · Week ended · Not completed");
  s=s.replace(/^0 de (\d+) · Pendente · você tem until Sunday$/i,"0 of $1 · Pending · you have until Sunday");
  s=s.replace(/(\d+) de (\d+) · Meta mensal concluída/g,"$1 of $2 · Monthly goal completed");
  s=s.replace(/(\d+) de (\d+) · (\d+)% · falta(?:m)? (\d+) until the end of the month/gi,"$1 of $2 · $3% · $4 remaining until the end of the month");
  s=s.replace(/^(\d+) de (\d+) · (\d+)% · Mês encerrado parcialmente$/i,"$1 of $2 · $3% · Month ended partially");
  s=s.replace(/^0 de (\d+) · Mês encerrado · Não concluída$/i,"0 of $1 · Month ended · Not completed");
  s=s.replace(/^0 de (\d+) · Pendente · você tem until the end of the month$/i,"0 of $1 · Pending · you have until the end of the month");
  s=s.replace(/^(\d+)% de evidências recentes$/i,"$1% of recent evidence");
  s=s.replace(/^(\d+) pessoa(?:s)? importante(?:s)? no seu círculo$/i,"$1 important people in your circle");
  s=s.replace(/^(\d+) em oração · (\d+) respondida(?:s)?$/i,"$1 in prayer · $2 answered");
  s=s.replace(/^Há (\d+) dia(?:s)?$/i,"$1 days ago");
  s=s.replace(/^Em (\d+) dia(?:s)?$/i,"In $1 days");
  return s;
 }
 function shouldSkip(node){const p=node.parentElement;return !p||p.closest('script,style,noscript,code,pre,[data-memory-i18n-skip]');}
 function translateTextNode(node,lang){
  if(shouldSkip(node))return;
  if(!originalText.has(node)) originalText.set(node,node.nodeValue);
  const original=originalText.get(node);
  if(lang==="pt-BR"){if(node.nodeValue!==original)node.nodeValue=original;return;}
  const lead=original.match(/^\s*/)?.[0]||"",tail=original.match(/\s*$/)?.[0]||"";
  const core=original.trim(); if(!core)return;
  const translated=dynamicEn(core);
  if(translated!==core) node.nodeValue=lead+translated+tail;
 }
 function translateAttrs(el,lang){
  if(!el?.getAttribute)return;
  const attrs=["placeholder","title","aria-label"];
  let saved=originalAttrs.get(el);if(!saved){saved={};originalAttrs.set(el,saved)}
  for(const attr of attrs){const val=el.getAttribute(attr);if(val==null)continue;if(!(attr in saved))saved[attr]=val;const orig=saved[attr];el.setAttribute(attr,lang==="pt-BR"?orig:dynamicEn(orig));}
 }
 function walk(root,lang){
  if(!root)return;
  if(root.nodeType===Node.TEXT_NODE){translateTextNode(root,lang);return;}
  if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE&&root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return;
  if(root.nodeType===Node.ELEMENT_NODE)translateAttrs(root,lang);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  let n;while((n=walker.nextNode())){if(n.nodeType===Node.TEXT_NODE)translateTextNode(n,lang);else translateAttrs(n,lang)}
 }
 function translateTitle(lang){
  if(!document.documentElement.dataset.memoryOriginalTitle)document.documentElement.dataset.memoryOriginalTitle=document.title;
  const orig=document.documentElement.dataset.memoryOriginalTitle;
  document.title=lang==="pt-BR"?orig:(titleMap.get(orig)||orig.replace(/ — Memory$/," - Memory"));
 }
 function updateButtons(){document.querySelectorAll('[data-memory-language-flag]').forEach(el=>el.textContent=FLAGS[current]);document.querySelectorAll('[data-memory-language-choice]').forEach(el=>el.classList.toggle('active',el.dataset.memoryLanguageChoice===current));}
 function apply(lang){
  const safe=VALID.includes(lang)?lang:"pt-BR";current=safe;localStorage.setItem(STORAGE_KEY,safe);document.documentElement.lang=safe;document.documentElement.dataset.memoryLanguage=safe;applying=true;try{walk(document.body,safe);translateTitle(safe);updateButtons();}finally{applying=false}window.dispatchEvent(new CustomEvent('memory:language-applied',{detail:{language:safe}}));return safe;
 }
 function observe(){if(observer)return;observer=new MutationObserver(list=>{if(applying)return;applying=true;try{for(const m of list){if(m.type==='characterData')translateTextNode(m.target,current);for(const n of m.addedNodes||[])walk(n,current)}updateButtons();}finally{applying=false}});observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});}
 function init(){apply(current);observe();}
 window.MemoryI18n={init,apply,get:()=>current,flag:()=>FLAGS[current],name:()=>NAMES[current],flags:FLAGS,names:NAMES,storageKey:STORAGE_KEY};
})();
