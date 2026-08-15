"use strict";

(() => {
  const KEY = "ingles_conversas_v1";

  const TOPICS = [
    {
      id: "after-work",
      title: "Depois do trabalho",
      icon: "💼",
      goal: "contar como foi o dia, explicar tarefas e comentar sentimentos",
      prompts: {
        1: [
          { q: "How was your day at work today?", hint: "Resposta curta: It was... / My day was..." },
          { q: "What did you do first today?", hint: "Use simple past: I started..., I checked..., I talked to..." },
          { q: "Was it a busy or calm day? Why?", hint: "Explain with because." }
        ],
        2: [
          { q: "How was your workday and what took most of your energy?", hint: "Use 2–4 sentences." },
          { q: "What problem did you solve today?", hint: "Explain the problem and the action." },
          { q: "What would you like to improve tomorrow?", hint: "Use would like to..." },
          { q: "How did your mood change during the day?", hint: "Use first / then / in the end." }
        ],
        3: [
          { q: "Describe the most important situation you handled today and why it mattered.", hint: "Add context, action and result." },
          { q: "If you could redo one part of your workday, what would you change?", hint: "Use conditional thinking." },
          { q: "How did your communication affect the outcome today?", hint: "Mention meetings, alignment, or feedback." },
          { q: "What does this day say about your current priorities at work?", hint: "More reflective answer." }
        ],
        4: [
          { q: "Walk me through your day as if you were reporting it to a mentor.", hint: "Tell a full narrative with transitions." },
          { q: "What trade-offs did you have to make, and were they the right ones?", hint: "Evaluate your decisions." },
          { q: "How would you defend your choices to someone who disagreed with you?", hint: "Use opinion + argument." },
          { q: "What is one lesson from today that could improve your next month, not just tomorrow?", hint: "Abstract reflection." }
        ]
      }
    },
    {
      id: "gym-and-health",
      title: "Treino e saúde",
      icon: "🏋️",
      goal: "falar sobre treino, sensação física, disciplina e recuperação",
      prompts: {
        1: [
          { q: "Did you train today?", hint: "Yes, I did / No, I didn't." },
          { q: "What part of your body did you train?", hint: "I trained legs / chest / shoulders..." },
          { q: "How did you feel after the workout?", hint: "Use tired, strong, happy, sore..." }
        ],
        2: [
          { q: "What was the hardest part of your workout today?", hint: "Explain exercise + feeling." },
          { q: "How is your training helping your life outside the gym?", hint: "Talk about energy, discipline or confidence." },
          { q: "What do you need to do better in your recovery?", hint: "Sleep, water, food, mobility..." },
          { q: "If you train tomorrow, what will you focus on?", hint: "Future plan." }
        ],
        3: [
          { q: "Describe today's training session in enough detail for a coach to understand your performance.", hint: "Structure: goal, session, result." },
          { q: "What pattern are you noticing in your discipline or inconsistency lately?", hint: "Reflect honestly." },
          { q: "How do football and gym training influence each other in your routine?", hint: "Connect both domains." },
          { q: "What physical sign tells you that you are evolving?", hint: "Talk about strength, stamina, body composition, or control." }
        ],
        4: [
          { q: "Evaluate your current training system: what is efficient, what is wasteful, and why?", hint: "Critical thinking." },
          { q: "How do you balance aesthetics, performance, and long-term health?", hint: "Compare priorities." },
          { q: "If your progress stalled for 30 days, what would be your hypothesis and plan?", hint: "Use analytical language." },
          { q: "What mindset change would make the biggest difference in your athletic development?", hint: "Finish with reflection." }
        ]
      }
    },
    {
      id: "family-time",
      title: "Família e rotina",
      icon: "👨‍👩‍👦",
      goal: "praticar conversas sobre casa, relacionamentos e cuidado diário",
      prompts: {
        1: [
          { q: "How was your time with your family today?", hint: "Simple answer + feeling." },
          { q: "Did you have dinner at home?", hint: "Add one detail." },
          { q: "What is one small thing you want to do better at home?", hint: "Use want to..." }
        ],
        2: [
          { q: "What kind of conversation did you have at home today?", hint: "Explain briefly." },
          { q: "How do you try to show care in your routine?", hint: "Examples help." },
          { q: "What usually steals your attention from your family?", hint: "Be honest and specific." },
          { q: "What would a better evening routine look like?", hint: "Use would / could." }
        ],
        3: [
          { q: "Describe a recent moment when you were present at home—and another when you were not.", hint: "Compare the two." },
          { q: "How does stress affect the way you speak to the people you love?", hint: "Cause and effect." },
          { q: "What family atmosphere are you trying to build?", hint: "Talk about values." },
          { q: "Which habit would strengthen your marriage or family life the most right now?", hint: "Reflective answer." }
        ],
        4: [
          { q: "How do your routines communicate your real priorities to your family?", hint: "Go beyond obvious answers." },
          { q: "If someone observed your evenings for a month, what would they conclude about your presence?", hint: "Analytical response." },
          { q: "What kind of emotional leadership do you want to offer at home?", hint: "Abstract but practical." },
          { q: "What tension exists between ambition and family devotion in your life?", hint: "Build an argument." }
        ]
      }
    },
    {
      id: "weekend-plans",
      title: "Planos e lazer",
      icon: "🗓️",
      goal: "falar sobre planejamento, escolhas e tempo livre",
      prompts: {
        1: [
          { q: "What do you want to do this weekend?", hint: "Use want to / plan to." },
          { q: "Do you prefer staying home or going out?", hint: "Say why." },
          { q: "What helps you relax?", hint: "Music, games, sports, rest..." }
        ],
        2: [
          { q: "What is one weekend plan that would really help you recharge?", hint: "Use 2–3 sentences." },
          { q: "How do you usually waste time when you should be resting or planning?", hint: "Honest reflection." },
          { q: "What is something useful and enjoyable you could do this weekend?", hint: "Combine duty + pleasure." },
          { q: "Who would you like to spend time with, and why?", hint: "Be specific." }
        ],
        3: [
          { q: "If you designed the ideal weekend for your current season of life, what would it include?", hint: "Talk about priorities." },
          { q: "How can free time become either recovery or escape?", hint: "Contrast both ideas." },
          { q: "What weekend habit most affects the quality of your next week?", hint: "Connect cause and effect." },
          { q: "How do you decide what deserves your time outside work?", hint: "Criteria-based answer." }
        ],
        4: [
          { q: "What does the way you spend your weekends reveal about your character and goals?", hint: "Deep reflection." },
          { q: "How would you defend a disciplined weekend routine to someone who thinks weekends are only for comfort?", hint: "Argumentative answer." },
          { q: "What tension do you feel between enjoyment, recovery, and personal growth?", hint: "Use nuanced language." },
          { q: "Describe a weekend framework that would make your life more sustainable over the next year.", hint: "System-oriented response." }
        ]
      }
    }
  ];

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  function toast(message) {
    window.MMCDUI?.toast?.(message);
  }

  function getTopicByDate(date) {
    const normalized = String(date || new Date().toISOString().slice(0,10));
    const parts = normalized.split("-").map(Number);
    const seed = parts.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
    return TOPICS[seed % TOPICS.length];
  }

  function inferStage(levelText, sessions = []) {
    const text = String(levelText || "").toLowerCase();
    const completed = sessions.filter(item => item?.completed).length;
    let stage = 1;
    if (text.includes("dif") || text.includes("hard")) stage = 3;
    else if (text.includes("méd") || text.includes("medio") || text.includes("intermedi")) stage = 2;
    if (completed >= 12) stage = Math.max(stage, 3);
    if (completed >= 24) stage = 4;
    return Math.min(4, Math.max(1, stage));
  }

  async function loadStore(db, userId) {
    const { data, error } = await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id", userId)
      .eq("chave", KEY)
      .maybeSingle();
    if (error) throw error;
    return data?.valor && typeof data.valor === "object"
      ? structuredClone(data.valor)
      : { schemaVersion: 1, sessions: [] };
  }

  async function saveStore(db, userId, store) {
    const payload = {
      user_id: userId,
      chave: KEY,
      valor: {
        schemaVersion: 1,
        sessions: store.sessions,
        updatedAt: new Date().toISOString()
      }
    };
    const { error } = await db.from("configuracoes_usuario").upsert(payload, { onConflict: "user_id,chave" });
    if (error) throw error;
  }

  function ensureSession(store, date, topic, stage) {
    let session = (store.sessions || []).find(item => item?.date === date);
    if (!session) {
      session = {
        id: crypto.randomUUID ? crypto.randomUUID() : `conv-${Date.now()}`,
        date,
        topicId: topic.id,
        stage,
        answers: [],
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      store.sessions = Array.isArray(store.sessions) ? store.sessions : [];
      store.sessions.push(session);
    } else {
      session.topicId = session.topicId || topic.id;
      // Uma conversa já iniciada mantém a complexidade original; não trocamos as perguntas no meio do dia.
      session.stage = Number(session.stage || stage);
      session.answers = Array.isArray(session.answers) ? session.answers : [];
    }
    return session;
  }

  function answerFor(session, index) {
    return session.answers.find(item => Number(item.index) === Number(index));
  }

  function cardHtml(prompt, index, answer, enabled) {
    return `<article class="conversation-step ${answer ? 'is-done' : ''} ${enabled ? 'is-open' : 'is-locked'}" data-conversation-step="${index}">
      <div class="conversation-step__top">
        <span class="conversation-step__badge">${index + 1}</span>
        <div>
          <strong>Question ${index + 1}</strong>
          <p>${esc(prompt.q)}</p>
        </div>
      </div>
      <div class="conversation-step__hint">Hint: ${esc(prompt.hint || 'Answer naturally in English.')}</div>
      <label class="conversation-answer">
        <span>Your answer</span>
        <textarea data-conversation-answer="${index}" ${enabled ? '' : 'disabled'} placeholder="Write your answer in English...">${esc(answer?.text || '')}</textarea>
      </label>
      <div class="conversation-step__actions">
        <button type="button" class="btn primary" data-save-conversation="${index}" ${enabled ? '' : 'disabled'}>${answer ? 'Atualizar resposta' : 'Salvar resposta'}</button>
        ${answer ? '<span class="conversation-step__state">✓ resposta salva</span>' : '<span class="conversation-step__state">Responda para liberar a próxima etapa</span>'}
      </div>
    </article>`;
  }

  function statsHtml(session, prompts) {
    const answered = prompts.filter((_, index) => answerFor(session, index)?.text?.trim()).length;
    return `<div class="conversation-stats">
      <div><span>Complexidade</span><strong>Nível ${session.stage}</strong></div>
      <div><span>Progresso</span><strong>${answered}/${prompts.length} respostas</strong></div>
      <div><span>Status</span><strong>${session.completed ? 'Concluída' : 'Em andamento'}</strong></div>
    </div>`;
  }


  const clampScore = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const tokenize = text => String(text || "").toLocaleLowerCase("en-US").match(/[a-z]+(?:'[a-z]+)?/g) || [];
  const CONNECTORS = new Set(["because","but","so","then","however","although","also","after","before","first","finally","while","when","if","therefore","instead"]);
  const VERBS = new Set(["am","is","are","was","were","be","been","being","do","does","did","have","has","had","go","went","get","got","make","made","work","worked","train","trained","feel","felt","want","wanted","need","needed","think","thought","like","liked","prefer","preferred","try","tried","talk","talked","solve","solved","change","changed","spend","spent","help","helped","focus","focused","improve","improved","start","started"]);
  const FIXES = [
    [/\bi am agree\b/gi,"I agree","Use “I agree”, sem o verbo to be."],
    [/\bi have (\d{1,3}) years(?: old)?\b/gi,"I am $1 years old","Para idade, use “I am ... years old”."],
    [/\bi didn't went\b/gi,"I didn't go","Depois de “didn't”, o verbo volta à forma base."],
    [/\bi did went\b/gi,"I went","Com passado afirmativo, use “I went” ou “I did go” apenas para ênfase."],
    [/\bhe don't\b/gi,"he doesn't","Com he/she/it, use “doesn't”."],
    [/\bshe don't\b/gi,"she doesn't","Com he/she/it, use “doesn't”."],
    [/\bit don't\b/gi,"it doesn't","Com he/she/it, use “doesn't”."],
    [/\bpeople is\b/gi,"people are","“People” pede verbo no plural."],
    [/\bmore better\b/gi,"better","“Better” já é comparativo; não use “more better”."],
    [/\bdepend of\b/gi,"depend on","A combinação natural é “depend on”."],
    [/\bmarried with\b/gi,"married to","A combinação natural é “married to”."],
    [/\bdiscuss about\b/gi,"discuss","“Discuss” normalmente não leva “about”."]
  ];

  function sentenceCount(text) {
    const chunks = String(text || "").split(/[.!?]+/).map(x => x.trim()).filter(Boolean);
    return Math.max(1, chunks.length);
  }

  function applyKnownFixes(text) {
    let corrected = String(text || "").trim();
    const notes = [];
    for (const [pattern, replacement, note] of FIXES) {
      pattern.lastIndex = 0;
      if (pattern.test(corrected)) {
        pattern.lastIndex = 0;
        corrected = corrected.replace(pattern, replacement);
        notes.push(note);
      }
    }
    corrected = corrected.replace(/\s+/g, " ").trim();
    if (corrected) corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    if (corrected && !/[.!?]$/.test(corrected)) corrected += ".";
    return { corrected, notes };
  }

  function naturalize(text) {
    let value = String(text || "").trim();
    const replacements = [
      [/\bI do not\b/gi,"I don't"],[/\bI did not\b/gi,"I didn't"],[/\bI am not\b/gi,"I'm not"],
      [/\bI am\b/gi,"I'm"],[/\bI have not\b/gi,"I haven't"],[/\bI would\b/gi,"I'd"],
      [/\bI will\b/gi,"I'll"],[/\bcannot\b/gi,"can't"],[/\bdo not\b/gi,"don't"],
      [/\bdoes not\b/gi,"doesn't"],[/\bdid not\b/gi,"didn't"],[/\bwould not\b/gi,"wouldn't"],
      [/\bcould not\b/gi,"couldn't"],[/\bshould not\b/gi,"shouldn't"]
    ];
    for (const [pattern,replacement] of replacements) value=value.replace(pattern,replacement);
    value=value.replace(/\s+/g," ").trim();
    if(value) value=value.charAt(0).toUpperCase()+value.slice(1);
    if(value&&!/[.!?]$/.test(value)) value+='.';
    return value;
  }

  function evaluateAnswer(text, stage) {
    const raw=String(text||"").trim();
    const words=tokenize(raw);
    const unique=new Set(words);
    const expectedWords={1:5,2:14,3:24,4:34}[stage]||14;
    const connectors=words.filter(word=>CONNECTORS.has(word)).length;
    const hasVerb=words.some(word=>VERBS.has(word)||/(ed|ing)$/.test(word));
    const {corrected,notes}=applyKnownFixes(raw);
    const shortfall=Math.max(0,expectedWords-words.length);
    const lengthFactor=Math.min(1,words.length/expectedWords);
    const lexicalRatio=words.length?unique.size/words.length:0;
    const grammar=clampScore(92-notes.length*16-(hasVerb?0:12)-(words.length<3?18:0));
    const vocabulary=clampScore(55+Math.min(25,lexicalRatio*32)+Math.min(20,words.length/Math.max(1,expectedWords)*20));
    const development=clampScore(45+lengthFactor*38+Math.min(17,connectors*6));
    const naturalBase=notes.length?70:84;
    const naturalness=clampScore(naturalBase+Math.min(10,connectors*3)+(sentenceCount(raw)>1?5:0)-(shortfall>expectedWords*.6?10:0));
    const clarity=clampScore(60+Math.min(25,lengthFactor*25)+(hasVerb?10:0)+(connectors?5:0));
    const overall=clampScore(average([grammar,vocabulary,development,naturalness,clarity]));
    const natural=naturalize(corrected);
    const strengths=[];
    if(grammar>=85) strengths.push("estrutura gramatical estável nos padrões avaliados");
    if(vocabulary>=80) strengths.push("boa variedade de vocabulário");
    if(development>=80) strengths.push("resposta desenvolvida, não apenas uma frase curta");
    if(connectors>=1) strengths.push("uso de conectores para ligar ideias");
    const improvements=[...notes];
    if(words.length<expectedWords*.65) improvements.push(`Desenvolva um pouco mais a resposta; para este nível, tente chegar perto de ${expectedWords} palavras quando a pergunta permitir.`);
    if(!connectors&&stage>=2) improvements.push("Conecte as ideias com because, but, so, then ou however para soar mais fluido.");
    if(!hasVerb&&words.length) improvements.push("Revise a frase para garantir um verbo principal claro.");
    return {overall,grammar,vocabulary,naturalness,development,clarity,corrected,natural,notes,strengths,improvements,wordCount:words.length};
  }

  function evaluateSession(session,prompts) {
    const answers=prompts.map((prompt,index)=>{
      const answer=answerFor(session,index);
      return {index,question:prompt.q,text:String(answer?.text||"").trim(),...evaluateAnswer(answer?.text||"",session.stage)};
    });
    const metric=name=>clampScore(average(answers.map(item=>item[name])));
    const evaluation={
      overall:metric("overall"),grammar:metric("grammar"),vocabulary:metric("vocabulary"),naturalness:metric("naturalness"),development:metric("development"),clarity:metric("clarity"),answers,
      evaluatedAt:new Date().toISOString(),method:"memory-local-v69"
    };
    evaluation.label=evaluation.overall>=88?"Muito bom":evaluation.overall>=75?"Bom":evaluation.overall>=60?"Em evolução":"Precisa revisar";
    const allStrengths=[...new Set(answers.flatMap(item=>item.strengths))].slice(0,3);
    const allImprovements=[...new Set(answers.flatMap(item=>item.improvements))].slice(0,4);
    evaluation.strengths=allStrengths.length?allStrengths:["Você completou toda a conversa e produziu inglês espontâneo."];
    evaluation.improvements=allImprovements.length?allImprovements:["Nenhum erro estrutural comum foi detectado. Continue ampliando detalhe e naturalidade."];
    return evaluation;
  }

  function metricCard(label,value){return `<div><span>${esc(label)}</span><strong>${clampScore(value)}%</strong><i><b style="width:${clampScore(value)}%"></b></i></div>`}

  function evaluationHtml(session){
    const a=session?.evaluation;if(!a)return'';
    const rewrites=(a.answers||[]).filter(item=>item.text&&item.natural&&item.natural.toLocaleLowerCase('en-US')!==item.text.trim().toLocaleLowerCase('en-US')).slice(0,3);
    return `<section class="conversation-evaluation ${a.overall>=75?'is-good':a.overall>=60?'is-progress':'needs-review'}">
      <div class="conversation-evaluation__head"><div><p class="eyebrow">Resultado da conversa</p><h3>${esc(a.label)}</h3><p>O Memory avaliou a conversa que você realmente escreveu, sem comparar com uma resposta única esperada.</p></div><strong>${clampScore(a.overall)}%</strong></div>
      <div class="conversation-evaluation__metrics">${metricCard('Gramática',a.grammar)}${metricCard('Vocabulário',a.vocabulary)}${metricCard('Naturalidade',a.naturalness)}${metricCard('Construção',a.development)}${metricCard('Clareza',a.clarity)}</div>
      <div class="conversation-evaluation__columns">
        <div><span class="conversation-evaluation__label">O que você fez bem</span><ul>${(a.strengths||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>
        <div><span class="conversation-evaluation__label">O que melhorar</span><ul>${(a.improvements||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>
      </div>
      ${rewrites.length?`<div class="conversation-native"><span class="conversation-evaluation__label">Como deixaria mais natural</span>${rewrites.map(item=>`<article><small>Question ${item.index+1}</small><p><b>Você:</b> ${esc(item.text)}</p><p><b>Mais natural:</b> ${esc(item.natural)}</p></article>`).join('')}</div>`:''}
      <p class="conversation-evaluation__note">Correção automática local: identifica estrutura, desenvolvimento e erros comuns. Quando a construção é ambígua, ela não deve ser usada como penalização definitiva.</p>
    </section>`;
  }

  async function render(params) {
    const host = document.querySelector('#english-conversation-host');
    if (!host) return;

    const { db, usuario, data, nivelTexto } = params || {};
    if (!db || !usuario) {
      host.innerHTML = '<div class="muted">Conversa do dia indisponível.</div>';
      return;
    }

    try {
      const store = await loadStore(db, usuario.id);
      const date = String(data || new Date().toISOString().slice(0, 10));
      const topic = getTopicByDate(date);
      const stage = inferStage(nivelTexto, store.sessions || []);
      const session = ensureSession(store, date, topic, stage);
      const prompts = topic.prompts[session.stage] || topic.prompts[1];
      if (session.completed && !session.evaluation && prompts.every((_, index) => answerFor(session, index)?.text?.trim())) {
        session.evaluation = evaluateSession(session, prompts);
        session.updatedAt = new Date().toISOString();
        try { await saveStore(db, usuario.id, store); } catch (error) { console.warn("Conversa: não foi possível salvar a avaliação retroativa.", error); }
      }
      const firstPending = prompts.findIndex((_, index) => !answerFor(session, index)?.text?.trim());
      const unlocked = firstPending === -1 ? prompts.length - 1 : firstPending;

      host.innerHTML = `
        <div class="section-head conversation-head">
          <div>
            <p class="eyebrow">Conversa do dia</p>
            <h2>${topic.icon} ${esc(topic.title)}</h2>
            <p class="muted">Tema cotidiano com progressão adaptativa. As perguntas ficam mais complexas conforme sua evolução.</p>
          </div>
          <span class="conversation-goal">Objetivo: ${esc(topic.goal)}</span>
        </div>
        ${statsHtml(session, prompts)}
        <div class="conversation-flow">
          ${prompts.map((prompt, index) => cardHtml(prompt, index, answerFor(session, index), index <= unlocked)).join('')}
        </div>
        ${evaluationHtml(session)}
        <div class="conversation-footer">
          <button type="button" class="btn" data-finish-conversation ${session.completed ? 'disabled' : ''}>${session.completed ? 'Conversa concluída' : 'Concluir conversa de hoje'}</button>
          <p class="muted">Dica: responda com o máximo de naturalidade. Mais para frente, as respostas pedem mais detalhe, opinião e improviso.</p>
        </div>`;

      host.querySelectorAll('[data-save-conversation]').forEach(button => {
        button.addEventListener('click', async () => {
          const index = Number(button.dataset.saveConversation);
          const textarea = host.querySelector(`[data-conversation-answer="${index}"]`);
          const text = String(textarea?.value || '').trim();
          if (!text) {
            toast('Escreva sua resposta em inglês antes de salvar.');
            textarea?.focus();
            return;
          }

          session.answers = session.answers.filter(item => Number(item.index) !== index);
          session.answers.push({ index, text, savedAt: new Date().toISOString() });
          if (session.completed) session.completed = false;
          delete session.evaluation;
          session.updatedAt = new Date().toISOString();
          try {
            await saveStore(db, usuario.id, store);
            toast('Resposta salva.');
            await render({ db, usuario, data: date, nivelTexto });
          } catch (error) {
            console.error(error);
            toast(error.message || 'Não foi possível salvar a resposta.');
          }
        });
      });

      const finishButton = host.querySelector('[data-finish-conversation]');
      finishButton?.addEventListener('click', async () => {
        const answered = prompts.filter((_, index) => answerFor(session, index)?.text?.trim()).length;
        if (answered < prompts.length) {
          toast('Responda todas as perguntas antes de concluir.');
          return;
        }
        session.completed = true;
        session.evaluation = evaluateSession(session, prompts);
        session.updatedAt = new Date().toISOString();
        try {
          await saveStore(db, usuario.id, store);
          toast(`Conversa avaliada: ${session.evaluation.label} · ${session.evaluation.overall}%.`);
          await render({ db, usuario, data: date, nivelTexto });
        } catch (error) {
          console.error(error);
          toast(error.message || 'Não foi possível concluir a conversa.');
        }
      });
    } catch (error) {
      console.error(error);
      host.innerHTML = `<div class="measure-empty">${esc(error.message || 'Não foi possível carregar a conversa do dia.')}</div>`;
    }
  }

  window.MMCDEnglishConversation = { render };
})();
