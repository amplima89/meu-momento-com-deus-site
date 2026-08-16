"use strict";

window.MMCDEnglishPractice = (() => {
  const KEY = 'ingles_pratica_v2';

  const CURRICULUM = [
    {
      id:'4d-simple-present', classLabel:'Class 4D', title:'Simple Present',
      purpose:'falar de rotina, hábitos, fatos e responsabilidades',
      rule:'I / you / we / they + verbo base. Com he / she / it, normalmente acrescentamos -s ou -es.',
      verbs:[['work','worked','trabalhar'],['study','studied','estudar'],['train','trained','treinar'],['read','read','ler'],['need','needed','precisar'],['help','helped','ajudar']],
      questions:[
        {kind:'choice',prompt:'I ___ with data every day.',options:['work','works','worked'],answer:'work',explain:'Com I, use a forma base: I work.'},
        {kind:'choice',prompt:'She ___ before work.',options:['train','trains','trained'],answer:'trains',explain:'Com she, no Simple Present, o verbo recebe -s: she trains.'},
        {kind:'input',prompt:'Passe para a negativa: I study at night.',answers:["i don't study at night","i do not study at night"],model:"I don't study at night.",explain:'Negativa com I: do not / don\'t + verbo base.'},
        {kind:'input',prompt:'Transforme em pergunta: You work here.',answers:['do you work here'],model:'Do you work here?',explain:'Pergunta com you: Do + sujeito + verbo base.'},
        {kind:'choice',prompt:'He ___ more time to finish the report.',options:['need','needs','needed'],answer:'needs',explain:'He + needs no presente.'}
      ]
    },
    {
      id:'2c-do-does-did', classLabel:'Class 2C', title:'Do, Does, Did',
      purpose:'perguntar e negar ações no presente e no passado',
      rule:'Do/does ajudam no presente; did ajuda no passado. Depois deles, o verbo principal volta à forma base.',
      verbs:[['like','liked','gostar'],['want','wanted','querer'],['need','needed','precisar'],['live','lived','morar'],['go','went','ir'],['see','saw','ver']],
      questions:[
        {kind:'choice',prompt:'___ you like this idea?',options:['Do','Does','Did'],answer:'Do',explain:'Com you no presente: Do you...?'},
        {kind:'choice',prompt:'___ she work with you?',options:['Do','Does','Did'],answer:'Does',explain:'Com she no presente: Does she...?'},
        {kind:'input',prompt:'Passe para a negativa: He likes coffee.',answers:["he doesn't like coffee","he does not like coffee"],model:"He doesn't like coffee.",explain:'Depois de does not, use like, não likes.'},
        {kind:'choice',prompt:'___ you go to the gym yesterday?',options:['Do','Does','Did'],answer:'Did',explain:'Yesterday pede passado: Did you go...?'},
        {kind:'input',prompt:'Corrija: I didn\'t went to work.',answers:["i didn't go to work","i did not go to work"],model:"I didn't go to work.",explain:'Depois de didn\'t, o verbo volta para go.'}
      ]
    },
    {
      id:'2d-wh-questions', classLabel:'Class 2D', title:'WH Questions',
      purpose:'fazer perguntas específicas com where, what, who, when, why e how',
      rule:'WH word + auxiliar + sujeito + verbo. Ex.: Where do you work? Why did she leave?',
      verbs:[['work','worked','trabalhar'],['live','lived','morar'],['go','went','ir'],['choose','chose','escolher'],['start','started','começar'],['leave','left','sair/deixar']],
      questions:[
        {kind:'choice',prompt:'___ do you work?',options:['Where','Who','When'],answer:'Where',explain:'Where pergunta lugar.'},
        {kind:'choice',prompt:'___ did you choose this job?',options:['Why','When','Who'],answer:'Why',explain:'Why pergunta motivo.'},
        {kind:'input',prompt:'Monte a pergunta: what / you / do / study',answers:['what do you study'],model:'What do you study?',explain:'WH + do + sujeito + verbo.'},
        {kind:'input',prompt:'Monte a pergunta: when / she / did / arrive',answers:['when did she arrive'],model:'When did she arrive?',explain:'No passado: WH + did + sujeito + verbo base.'},
        {kind:'choice',prompt:'___ helped you with the project?',options:['Who','Where','How many'],answer:'Who',explain:'Who pergunta pela pessoa.'}
      ]
    },
    {
      id:'4a-modal-verbs', classLabel:'Class 4A', title:'Modal Verbs',
      purpose:'falar de capacidade, conselho, obrigação e possibilidade',
      rule:'Can, could, should e must são seguidos pelo verbo base, sem to e sem -s.',
      verbs:[['help','helped','ajudar'],['improve','improved','melhorar'],['rest','rested','descansar'],['drive','drove','dirigir'],['study','studied','estudar'],['change','changed','mudar']],
      questions:[
        {kind:'choice',prompt:'I ___ help you after lunch.',options:['can','can to','cans'],answer:'can',explain:'Modal + verbo base: can help.'},
        {kind:'choice',prompt:'You ___ rest if you are exhausted.',options:['should','should to','shoulds'],answer:'should',explain:'Should + verbo base.'},
        {kind:'input',prompt:'Passe para a negativa: You must stop.',answers:["you mustn't stop","you must not stop"],model:"You mustn't stop.",explain:'A negativa mantém o modal: must not / mustn\'t.'},
        {kind:'choice',prompt:'___ you explain that again?',options:['Could','Did to','Are'],answer:'Could',explain:'Could pode tornar o pedido mais educado.'},
        {kind:'input',prompt:'Corrija: She can works from home.',answers:['she can work from home'],model:'She can work from home.',explain:'Depois de can, use work, nunca works.'}
      ]
    },
    {
      id:'4b-regular-verbs', classLabel:'Class 4B', title:'Regular Verbs',
      purpose:'usar passado de verbos regulares em situações do dia a dia',
      rule:'A maioria dos verbos regulares forma o passado com -ed. Alguns mudam a grafia: study → studied, plan → planned.',
      verbs:[['work','worked','trabalhar'],['train','trained','treinar'],['study','studied','estudar'],['help','helped','ajudar'],['plan','planned','planejar'],['watch','watched','assistir']],
      questions:[
        {kind:'choice',prompt:'Yesterday I ___ late.',options:['worked','work','workt'],answer:'worked',explain:'Work é regular: worked.'},
        {kind:'choice',prompt:'She ___ English last night.',options:['studied','studyed','studies'],answer:'studied',explain:'Consoante + y: study → studied.'},
        {kind:'input',prompt:'Complete no passado: We ___ (plan) the meeting.',answers:['we planned the meeting'],model:'We planned the meeting.',explain:'Plan dobra o n: planned.'},
        {kind:'choice',prompt:'They ___ the game after dinner.',options:['watched','watch','watchd'],answer:'watched',explain:'Watch → watched.'},
        {kind:'input',prompt:'Passe para a negativa: I trained yesterday.',answers:["i didn't train yesterday","i did not train yesterday"],model:"I didn't train yesterday.",explain:'Na negativa com did, o verbo volta para train.'}
      ]
    },
    {
      id:'4c-irregular-verbs', classLabel:'Class 4C', title:'Irregular Verbs',
      purpose:'ampliar repertório de verbos comuns no passado',
      rule:'Verbos irregulares não seguem uma única regra de -ed. É preciso reconhecer e reutilizar suas formas mais frequentes.',
      verbs:[['go','went','ir'],['come','came','vir'],['see','saw','ver'],['get','got','obter/chegar'],['make','made','fazer/criar'],['take','took','pegar/levar']],
      questions:[
        {kind:'choice',prompt:'I ___ to the gym yesterday.',options:['went','goed','go'],answer:'went',explain:'Go → went.'},
        {kind:'choice',prompt:'She ___ a difficult decision.',options:['made','maked','make'],answer:'made',explain:'Make → made.'},
        {kind:'input',prompt:'Complete no passado: We ___ (see) the problem.',answers:['we saw the problem'],model:'We saw the problem.',explain:'See → saw.'},
        {kind:'choice',prompt:'He ___ home early.',options:['came','comed','come'],answer:'came',explain:'Come → came.'},
        {kind:'input',prompt:'Passe para a pergunta: You took the car.',answers:['did you take the car'],model:'Did you take the car?',explain:'Com did, took volta para take.'}
      ]
    },
    {
      id:'5a-present-continuous', classLabel:'Class 5A', title:'Present Continuous',
      purpose:'falar do que está acontecendo agora ou neste período',
      rule:'am / is / are + verbo com -ing. Ex.: I am working. They are studying.',
      verbs:[['work','worked','trabalhar'],['study','studied','estudar'],['train','trained','treinar'],['read','read','ler'],['prepare','prepared','preparar'],['talk','talked','conversar']],
      questions:[
        {kind:'choice',prompt:'I ___ working now.',options:['am','do','did'],answer:'am',explain:'I am working.'},
        {kind:'choice',prompt:'They are ___ for the test.',options:['studying','study','studied'],answer:'studying',explain:'Present Continuous usa -ing.'},
        {kind:'input',prompt:'Passe para a negativa: She is training.',answers:["she isn't training","she is not training"],model:"She isn't training.",explain:'Negue o verbo be: is not / isn\'t.'},
        {kind:'input',prompt:'Transforme em pergunta: You are working.',answers:['are you working'],model:'Are you working?',explain:'No Present Continuous, o be vai para a frente.'},
        {kind:'choice',prompt:'We ___ preparing the presentation.',options:['are','do','were'],answer:'are',explain:'We are preparing.'}
      ]
    },
    {
      id:'5b-simple-past', classLabel:'Class 5B', title:'Simple Past',
      purpose:'contar ações concluídas no passado',
      rule:'Na afirmativa, use a forma passada. Em perguntas e negativas com did, volte o verbo para a forma base.',
      verbs:[['finish','finished','terminar'],['solve','solved','resolver'],['eat','ate','comer'],['sleep','slept','dormir'],['find','found','encontrar'],['think','thought','pensar']],
      questions:[
        {kind:'choice',prompt:'I ___ the report yesterday.',options:['finished','finish','finishes'],answer:'finished',explain:'Ação concluída: finished.'},
        {kind:'choice',prompt:'We ___ a solution.',options:['found','finded','find'],answer:'found',explain:'Find → found.'},
        {kind:'input',prompt:'Passe para a negativa: She ate at home.',answers:["she didn't eat at home","she did not eat at home"],model:"She didn't eat at home.",explain:'Didn\'t + eat.'},
        {kind:'input',prompt:'Transforme em pergunta: You slept well.',answers:['did you sleep well'],model:'Did you sleep well?',explain:'Did + sujeito + verbo base.'},
        {kind:'choice',prompt:'He ___ about the problem all day.',options:['thought','thinked','thinks'],answer:'thought',explain:'Think → thought.'}
      ]
    },
    {
      id:'5c-past-continuous', classLabel:'Class 5C', title:'Past Continuous',
      purpose:'descrever uma ação que estava em andamento no passado',
      rule:'was / were + verbo com -ing. É muito usado para dar contexto a outra ação passada.',
      verbs:[['work','worked','trabalhar'],['drive','drove','dirigir'],['talk','talked','conversar'],['study','studied','estudar'],['wait','waited','esperar'],['play','played','jogar']],
      questions:[
        {kind:'choice',prompt:'I ___ working when you called.',options:['was','were','did'],answer:'was',explain:'I was working.'},
        {kind:'choice',prompt:'They ___ talking at 8 p.m.',options:['were','was','did'],answer:'were',explain:'They were talking.'},
        {kind:'input',prompt:'Passe para a negativa: He was driving.',answers:["he wasn't driving","he was not driving"],model:"He wasn't driving.",explain:'Negue was: was not / wasn\'t.'},
        {kind:'input',prompt:'Transforme em pergunta: You were studying.',answers:['were you studying'],model:'Were you studying?',explain:'Were vai para a frente.'},
        {kind:'choice',prompt:'We were ___ for the meeting.',options:['waiting','waited','wait'],answer:'waiting',explain:'Past Continuous usa -ing.'}
      ]
    },
    {
      id:'5d-simple-future', classLabel:'Class 5D', title:'Simple Future',
      purpose:'falar de decisões, previsões e ações futuras com will',
      rule:'will + verbo base. A forma é igual para todos os sujeitos. Negativa: will not / won\'t.',
      verbs:[['work','worked','trabalhar'],['study','studied','estudar'],['train','trained','treinar'],['call','called','ligar'],['decide','decided','decidir'],['improve','improved','melhorar']],
      questions:[
        {kind:'choice',prompt:'I ___ call you tomorrow.',options:['will','will to','am will'],answer:'will',explain:'Will + verbo base.'},
        {kind:'choice',prompt:'She will ___ more next week.',options:['study','studies','studied'],answer:'study',explain:'Depois de will, use study.'},
        {kind:'input',prompt:'Passe para a negativa: We will work Saturday.',answers:["we won't work saturday","we will not work saturday"],model:"We won't work Saturday.",explain:'Will not / won\'t + verbo base.'},
        {kind:'input',prompt:'Transforme em pergunta: You will train tomorrow.',answers:['will you train tomorrow'],model:'Will you train tomorrow?',explain:'Will vai para a frente.'},
        {kind:'choice',prompt:'They ___ improve with practice.',options:['will','did','are'],answer:'will',explain:'Will expressa futuro.'}
      ]
    }
  ];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value || '').toLocaleLowerCase('en-US')
    .replace(/[’]/g, "'")
    .replace(/[.!?,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const toast = message => window.MMCDUI?.toast?.(message);

  async function loadStore(db, userId) {
    const { data, error } = await db.from('configuracoes_usuario')
      .select('valor').eq('user_id', userId).eq('chave', KEY).maybeSingle();
    if (error) throw error;
    return data?.valor && typeof data.valor === 'object'
      ? structuredClone(data.valor)
      : { schemaVersion:2, sessions:[] };
  }

  async function saveStore(db, userId, store) {
    const payload = {
      user_id:userId,
      chave:KEY,
      valor:{schemaVersion:2,sessions:store.sessions,updatedAt:new Date().toISOString()}
    };
    const { error } = await db.from('configuracoes_usuario').upsert(payload,{onConflict:'user_id,chave'});
    if (error) throw error;
  }

  function lessonById(id) { return CURRICULUM.find(item => item.id === id) || CURRICULUM[0]; }

  function ensureSession(store, date) {
    store.sessions = Array.isArray(store.sessions) ? store.sessions : [];
    let session = store.sessions.find(item => item?.date === date);
    if (session) {
      session.answers = session.answers && typeof session.answers === 'object' ? session.answers : {};
      return session;
    }
    const completed = store.sessions.filter(item => item?.completed).length;
    const lesson = CURRICULUM[completed % CURRICULUM.length];
    session = {
      id: crypto.randomUUID ? crypto.randomUUID() : `practice-${Date.now()}`,
      date,
      lessonId:lesson.id,
      lessonTitle:lesson.title,
      classLabel:lesson.classLabel,
      answers:{},
      completed:false,
      score:null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    store.sessions.push(session);
    return session;
  }

  function isCorrect(question, answer) {
    const candidate = normalize(answer);
    if (question.kind === 'choice') return candidate === normalize(question.answer);
    return (question.answers || []).some(value => candidate === normalize(value));
  }

  function questionHtml(question, index, saved) {
    const state = saved ? (saved.correct ? 'is-correct' : 'is-wrong') : '';
    const input = question.kind === 'choice'
      ? `<div class="english-practice-options">${question.options.map(option => `<button type="button" class="english-practice-option ${saved?.answer===option?'is-selected':''}" data-practice-choice="${index}" data-practice-value="${esc(option)}">${esc(option)}</button>`).join('')}</div>`
      : `<div class="english-practice-input-row"><input type="text" data-practice-input="${index}" value="${esc(saved?.answer || '')}" placeholder="Digite a frase em inglês"><button type="button" class="btn" data-practice-check="${index}">Verificar</button></div>`;

    return `<article class="english-practice-question ${state}" data-practice-question="${index}">
      <div class="english-practice-question__number">${index+1}</div>
      <div class="english-practice-question__body">
        <strong>${esc(question.prompt)}</strong>
        ${input}
        <div class="english-practice-feedback" ${saved ? '' : 'hidden'}>
          <span>${saved?.correct ? '✓ Correto' : '↻ Tente novamente'}</span>
          <p>${esc(saved?.correct ? question.explain : `Modelo: ${question.model || question.answer}. ${question.explain}`)}</p>
        </div>
      </div>
    </article>`;
  }

  function updateSummary(lesson) {
    const focus = document.querySelector('#english-summary-focus');
    const verbs = document.querySelector('#english-summary-verbs');
    if (focus) focus.textContent = `${lesson.classLabel} · ${lesson.title}`;
    if (verbs) verbs.textContent = lesson.verbs.slice(0,4).map(item => item[0]).join(' · ');
  }

  function renderHost(host, lesson, session) {
    const answered = Object.keys(session.answers || {}).length;
    const correct = Object.values(session.answers || {}).filter(item => item?.correct).length;
    const allCorrect = correct === lesson.questions.length;

    host.innerHTML = `
      <div class="english-practice-head">
        <div>
          <p class="eyebrow">3 · Prática estruturada</p>
          <h2>${esc(lesson.title)}</h2>
          <p class="muted">${esc(lesson.purpose)}.</p>
        </div>
        <div class="english-practice-progress">
          <span>${esc(lesson.classLabel)} · trilha da apostila</span>
          <strong>${correct}/${lesson.questions.length} corretas</strong>
        </div>
      </div>

      <div class="english-practice-rule"><span>Como funciona</span><p>${esc(lesson.rule)}</p></div>

      <div class="english-verb-bank">
        <div class="english-verb-bank__head"><span>Verbos do dia</span><small>base · passado · significado</small></div>
        <div class="english-verb-bank__grid">${lesson.verbs.map(([base,past,pt]) => `<div><strong>${esc(base)}</strong><b>${esc(past)}</b><span>${esc(pt)}</span></div>`).join('')}</div>
      </div>

      <div class="english-practice-list">${lesson.questions.map((question,index) => questionHtml(question,index,session.answers?.[index])).join('')}</div>

      <div class="english-practice-finish">
        <div><strong>${session.completed ? `Prática concluída · ${session.score}%` : allCorrect ? 'Tudo certo. Você pode concluir esta prática.' : `Resolva os ${lesson.questions.length} exercícios para concluir.`}</strong><span>${session.completed ? 'A próxima data avança para outra estrutura.' : 'Você pode corrigir quantas vezes precisar; errar não penaliza enquanto estiver praticando.'}</span></div>
        <button type="button" class="btn primary" data-finish-practice ${allCorrect && !session.completed ? '' : 'disabled'}>${session.completed ? '✓ Concluída' : 'Concluir prática'}</button>
      </div>`;
  }

  async function render({ host, data, db, usuario }) {
    if (!host || !db || !usuario?.id) return;
    const date = String(data || new Date().toISOString().slice(0,10));

    try {
      const store = await loadStore(db, usuario.id);
      const session = ensureSession(store, date);
      const lesson = lessonById(session.lessonId);
      updateSummary(lesson);
      renderHost(host, lesson, session);

      async function record(index, answer) {
        const question = lesson.questions[index];
        if (!question) return;
        const clean = String(answer || '').trim();
        if (!clean) { toast('Responda antes de verificar.'); return; }
        session.answers[index] = {
          answer:clean,
          correct:isCorrect(question, clean),
          updatedAt:new Date().toISOString()
        };
        session.updatedAt = new Date().toISOString();
        await saveStore(db, usuario.id, store);
        renderHost(host, lesson, session);
        toast(session.answers[index].correct ? 'Correto.' : 'Ainda não. Veja o modelo e tente de novo.');
      }

      host.onclick = async event => {
        const choice = event.target.closest('[data-practice-choice]');
        if (choice) {
          const index = Number(choice.dataset.practiceChoice);
          try { await record(index, choice.dataset.practiceValue); } catch (error) { console.error(error); toast('Não foi possível salvar sua resposta.'); }
          return;
        }

        const check = event.target.closest('[data-practice-check]');
        if (check) {
          const index = Number(check.dataset.practiceCheck);
          const input = host.querySelector(`[data-practice-input="${index}"]`);
          try { await record(index, input?.value || ''); } catch (error) { console.error(error); toast('Não foi possível salvar sua resposta.'); }
          return;
        }

        const finish = event.target.closest('[data-finish-practice]');
        if (finish && !finish.disabled) {
          const correct = Object.values(session.answers || {}).filter(item => item?.correct).length;
          if (correct < lesson.questions.length) { toast('Conclua corretamente os exercícios primeiro.'); return; }
          session.completed = true;
          session.score = Math.round(correct * 100 / lesson.questions.length);
          session.completedAt = new Date().toISOString();
          session.updatedAt = session.completedAt;
          try {
            await saveStore(db, usuario.id, store);
            renderHost(host, lesson, session);
            toast('Prática concluída. A próxima data avança para outra estrutura.');
          } catch (error) { console.error(error); toast('Não foi possível concluir a prática.'); }
        }
      };
    } catch (error) {
      console.error('Prática de inglês:', error);
      host.innerHTML = `<div class="measure-empty">${esc(error.message || 'Não foi possível carregar a prática estruturada.')}</div>`;
    }
  }

  return { render, curriculum: CURRICULUM };
})();
