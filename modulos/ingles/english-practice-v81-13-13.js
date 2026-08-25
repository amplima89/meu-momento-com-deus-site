"use strict";

window.MMCDEnglishPractice = (() => {
  const KEY = "ingles_pratica_v2";
  const SCHEMA = 4;
  const QUESTIONS_PER_ROUND = 6;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/\s+/g," ")
    .trim();

  const wordCount = value => String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

  const toast = message => window.MMCDUI?.toast?.(message);

  const SCRIPTS = {
    travel: [
      {
        id:"travel-airport-delay",
        label:"Viagem · aeroporto",
        title:"Your flight is delayed",
        intro:"Você chegou ao portão e descobriu que seu voo atrasou. A prática funciona como uma conversa real: responda do jeito que você falaria.",
        role:"Airport agent",
        questions:[
          {
            prompt:"Your flight is delayed by 30 minutes. What would you ask me first?",
            hint:"Pergunte sobre novo horário, conexão, portão ou embarque.",
            minWords:6
          },
          {
            prompt:"You have a connecting flight. Explain why you are worried about missing it.",
            hint:"Explique a situação em 1 ou 2 frases.",
            minWords:10
          },
          {
            prompt:"I can move you to another flight, but it leaves later. What would you want to know before accepting?",
            hint:"Pense em horário, bagagem, assento ou chegada.",
            minWords:10
          },
          {
            prompt:"I ask: “Do you have any checked luggage?” Answer naturally and add one useful detail.",
            hint:"Responda como em uma conversa real.",
            minWords:8
          },
          {
            prompt:"Your gate has changed. Tell another passenger what happened and where you need to go now.",
            hint:"Conte o acontecimento no passado e a ação atual.",
            minWords:12
          },
          {
            prompt:"You finally board the plane. Send a short message to someone explaining the delay and your new arrival time.",
            hint:"Escreva como você realmente mandaria a mensagem.",
            minWords:14
          }
        ]
      },
      {
        id:"travel-hotel",
        label:"Viagem · hotel",
        title:"Checking in after a long trip",
        intro:"Você chegou cansado ao hotel e precisa resolver pequenas situações no check-in.",
        role:"Hotel receptionist",
        questions:[
          {
            prompt:"Good evening. May I have your name and reservation details, please?",
            hint:"Responda de forma curta e natural.",
            minWords:7
          },
          {
            prompt:"Your room is not ready yet. How would you ask how long you need to wait?",
            hint:"Faça uma pergunta educada.",
            minWords:7
          },
          {
            prompt:"You need to work early tomorrow. Explain what kind of room would be better for you.",
            hint:"Use preferências e motivo.",
            minWords:12
          },
          {
            prompt:"The receptionist offers breakfast for an extra charge. Ask two things before deciding.",
            hint:"Horário, preço, opções, localização etc.",
            minWords:12
          },
          {
            prompt:"You discover that the Wi-Fi is not working in your room. Explain the problem politely.",
            hint:"Diga o que está acontecendo e o que você precisa.",
            minWords:12
          },
          {
            prompt:"Before going upstairs, ask for one recommendation for dinner nearby and explain what kind of food you want.",
            hint:"Faça a conversa soar natural.",
            minWords:14
          }
        ]
      }
    ],

    work: [
      {
        id:"work-meeting",
        label:"Trabalho · reunião",
        title:"A meeting that needs a decision",
        intro:"Você está em uma reunião e precisa explicar sua análise, fazer perguntas e propor próximos passos.",
        role:"Your manager",
        questions:[
          {
            prompt:"We have a problem with turnover in one area. What would you want to understand first?",
            hint:"Explique quais informações você analisaria primeiro.",
            minWords:14
          },
          {
            prompt:"The team thinks salary is the main reason. How would you respond without jumping to a conclusion?",
            hint:"Mostre cautela e diga o que precisa validar.",
            minWords:15
          },
          {
            prompt:"What data would help you compare this area with the rest of the company?",
            hint:"Responda como em uma reunião real.",
            minWords:14
          },
          {
            prompt:"I disagree with your first recommendation. How would you defend your point without sounding aggressive?",
            hint:"Discorde com respeito e dê argumento.",
            minWords:15
          },
          {
            prompt:"We only have two weeks to make a decision. What would you prioritize?",
            hint:"Use prioridade, prazo e justificativa.",
            minWords:14
          },
          {
            prompt:"Close the meeting by summarizing the next steps in 2 or 3 sentences.",
            hint:"Faça um fechamento executivo e natural.",
            minWords:20
          }
        ]
      },
      {
        id:"work-leadership",
        label:"Trabalho · liderança",
        title:"Talking with a team member",
        intro:"Você precisa conversar com alguém do time sobre uma entrega que não saiu como esperado.",
        role:"Team member",
        questions:[
          {
            prompt:"You asked to talk with me. How would you start the conversation?",
            hint:"Abra a conversa sem parecer acusatório.",
            minWords:12
          },
          {
            prompt:"I say: “I thought the task was clear.” How would you explain what was missing?",
            hint:"Descreva expectativa, comunicação ou processo.",
            minWords:14
          },
          {
            prompt:"What question would you ask to understand my side of the situation?",
            hint:"Faça uma pergunta aberta.",
            minWords:8
          },
          {
            prompt:"I admit that I did not ask for help. How would you respond?",
            hint:"Reconheça o ponto e direcione o próximo comportamento.",
            minWords:14
          },
          {
            prompt:"What would you agree with me for the next similar task?",
            hint:"Defina uma ação prática.",
            minWords:14
          },
          {
            prompt:"End the conversation in a supportive but clear way.",
            hint:"Evite frase motivacional genérica; seja específico.",
            minWords:14
          }
        ]
      }
    ],

    relationship: [
      {
        id:"relationship-partner",
        label:"Relacionamento",
        title:"A difficult conversation at home",
        intro:"Seu parceiro ou parceira teve um dia difícil e sente que você não estava presente. Responda como numa conversa real.",
        role:"Your partner",
        questions:[
          {
            prompt:"“I felt like you were distant today.” How would you respond first?",
            hint:"Reconheça o que ouviu antes de explicar seu lado.",
            minWords:12
          },
          {
            prompt:"“You were on your phone while I was talking.” What would you say?",
            hint:"Assuma ou explique sem ficar defensivo.",
            minWords:12
          },
          {
            prompt:"Ask one question to understand what your partner needed from you.",
            hint:"Pergunta aberta e natural.",
            minWords:8
          },
          {
            prompt:"Explain what was happening with you without using it as an excuse.",
            hint:"Contexto + responsabilidade.",
            minWords:14
          },
          {
            prompt:"Suggest one concrete thing you can do differently tomorrow.",
            hint:"Seja específico.",
            minWords:12
          },
          {
            prompt:"Close the conversation with a short sentence that shows care and commitment.",
            hint:"Natural, simples e direto.",
            minWords:10
          }
        ]
      }
    ],

    friend: [
      {
        id:"friend-catchup",
        label:"Amigos · conversa",
        title:"Catching up with a friend",
        intro:"Você encontra um amigo que não vê há algum tempo. O objetivo é sustentar uma conversa natural, não responder exercícios de gramática.",
        role:"Your friend",
        questions:[
          {
            prompt:"“It’s been a long time! What have you been up to lately?”",
            hint:"Fale de trabalho, rotina, estudos, família ou treino.",
            minWords:14
          },
          {
            prompt:"“Are you still studying English? What has been difficult for you?”",
            hint:"Explique uma dificuldade real.",
            minWords:14
          },
          {
            prompt:"“What are you doing differently now to improve?”",
            hint:"Fale sobre método ou rotina.",
            minWords:14
          },
          {
            prompt:"Your friend says he is thinking about changing jobs. What would you ask him?",
            hint:"Faça 1 ou 2 perguntas naturais.",
            minWords:10
          },
          {
            prompt:"He says he is afraid of making the wrong decision. What advice would you give?",
            hint:"Conselho simples e realista.",
            minWords:14
          },
          {
            prompt:"You need to leave. End the conversation and suggest seeing each other again.",
            hint:"Feche como você realmente falaria.",
            minWords:10
          }
        ]
      }
    ],

    family: [
      {
        id:"family-plans",
        label:"Família",
        title:"Planning the weekend with family",
        intro:"Sua família está decidindo o que fazer no fim de semana e existem opiniões diferentes.",
        role:"Family member",
        questions:[
          {
            prompt:"“What do you want to do this weekend?” Answer and explain why.",
            hint:"Preferência + motivo.",
            minWords:12
          },
          {
            prompt:"Someone suggests something you do not want to do. How would you disagree politely?",
            hint:"Discorde sem cortar a conversa.",
            minWords:12
          },
          {
            prompt:"Ask what everyone else would prefer.",
            hint:"Faça uma pergunta natural.",
            minWords:7
          },
          {
            prompt:"There is not enough time to do everything. What would you prioritize?",
            hint:"Explique escolha e motivo.",
            minWords:13
          },
          {
            prompt:"A family member changes the plan at the last minute. How would you react?",
            hint:"Responda como em uma conversa real.",
            minWords:12
          },
          {
            prompt:"Summarize the final plan for everyone.",
            hint:"2 ou 3 frases.",
            minWords:16
          }
        ]
      }
    ],

    training: [
      {
        id:"training-coach",
        label:"Treino · rotina",
        title:"Talking to a coach about your training",
        intro:"Você está explicando sua rotina e suas dificuldades para alguém que quer entender como você treina.",
        role:"Coach",
        questions:[
          {
            prompt:"Tell me what you usually do during a normal training week.",
            hint:"Use frequência e tipos de treino.",
            minWords:14
          },
          {
            prompt:"What has been going well in your training recently?",
            hint:"Dê um exemplo concreto.",
            minWords:12
          },
          {
            prompt:"What has been difficult to keep consistent?",
            hint:"Explique uma dificuldade.",
            minWords:12
          },
          {
            prompt:"How does football, gym or another activity affect the rest of your routine?",
            hint:"Explique relação entre atividades.",
            minWords:14
          },
          {
            prompt:"What would you like to improve over the next month?",
            hint:"Meta + motivo.",
            minWords:12
          },
          {
            prompt:"If your week becomes very busy, how would you adapt your training?",
            hint:"Use hipótese e decisão.",
            minWords:14
          }
        ]
      }
    ],

    food: [
      {
        id:"food-restaurant",
        label:"Comida · restaurante",
        title:"Ordering dinner with a small problem",
        intro:"Você está em um restaurante e precisa pedir, fazer perguntas e resolver uma situação simples.",
        role:"Server",
        questions:[
          {
            prompt:"“Are you ready to order?” Tell me what you would like.",
            hint:"Faça um pedido natural.",
            minWords:8
          },
          {
            prompt:"Ask one question about a dish before ordering it.",
            hint:"Ingredientes, tamanho, acompanhamento etc.",
            minWords:7
          },
          {
            prompt:"You want to change one side dish. How would you ask politely?",
            hint:"Use pedido educado.",
            minWords:9
          },
          {
            prompt:"Your food arrives, but it is not what you ordered. Explain the problem.",
            hint:"Seja claro e educado.",
            minWords:12
          },
          {
            prompt:"The server offers to replace it. How would you respond?",
            hint:"Aceite ou recuse naturalmente.",
            minWords:9
          },
          {
            prompt:"At the end, ask for the bill and make one short comment about the meal.",
            hint:"Feche a interação.",
            minWords:10
          }
        ]
      }
    ],

    music: [
      {
        id:"music-friend",
        label:"Música · conversa",
        title:"Talking about music with a friend",
        intro:"Você está conversando com um amigo sobre músicas, artistas e o que costuma ouvir.",
        role:"Your friend",
        questions:[
          {
            prompt:"“What kind of music have you been listening to lately?”",
            hint:"Dê uma resposta pessoal e natural.",
            minWords:12
          },
          {
            prompt:"“When do you usually listen to music?”",
            hint:"Rotina + contexto.",
            minWords:12
          },
          {
            prompt:"Tell me about one song or artist you like and why.",
            hint:"Não precisa citar letra; explique sua preferência.",
            minWords:14
          },
          {
            prompt:"Your friend recommends a style you normally do not listen to. How would you respond?",
            hint:"Seja aberto ou explique sua preferência.",
            minWords:12
          },
          {
            prompt:"Do you prefer listening alone or with other people? Explain.",
            hint:"Preferência + motivo.",
            minWords:12
          },
          {
            prompt:"Recommend something for a long drive or trip and explain your choice.",
            hint:"Faça uma recomendação natural.",
            minWords:14
          }
        ]
      }
    ],

    technology: [
      {
        id:"tech-problem",
        label:"Tecnologia",
        title:"Explaining a technical problem",
        intro:"Você precisa explicar um problema de tecnologia para alguém e responder perguntas sobre o que já tentou.",
        role:"Support agent",
        questions:[
          {
            prompt:"“What seems to be the problem?” Explain it in simple English.",
            hint:"Problema + quando começou.",
            minWords:14
          },
          {
            prompt:"“When did you first notice it?”",
            hint:"Responda com tempo e contexto.",
            minWords:10
          },
          {
            prompt:"“What have you already tried?”",
            hint:"Liste 1 ou 2 ações.",
            minWords:12
          },
          {
            prompt:"I suggest restarting everything again. You already did that twice. How would you respond politely?",
            hint:"Explique sem parecer irritado.",
            minWords:12
          },
          {
            prompt:"Ask what information I need from you to investigate the issue.",
            hint:"Faça uma pergunta natural.",
            minWords:9
          },
          {
            prompt:"Summarize the problem in one final message you could send by email or chat.",
            hint:"2 ou 3 frases claras.",
            minWords:18
          }
        ]
      }
    ],

    everyday: [
      {
        id:"everyday-decision",
        label:"Cotidiano · decisão",
        title:"A busy evening and one decision",
        intro:"Você chegou em casa cansado e precisa decidir como usar o resto da noite.",
        role:"A friend",
        questions:[
          {
            prompt:"“You look tired. What happened today?”",
            hint:"Conte brevemente seu dia.",
            minWords:12
          },
          {
            prompt:"“What do you still need to do tonight?”",
            hint:"Liste prioridades naturalmente.",
            minWords:10
          },
          {
            prompt:"“Do you really need to do all of that today?” Explain your answer.",
            hint:"Escolha e justifique.",
            minWords:14
          },
          {
            prompt:"What would you postpone until tomorrow and why?",
            hint:"Use decisão e motivo.",
            minWords:12
          },
          {
            prompt:"Your friend suggests watching something and relaxing. How would you respond?",
            hint:"Aceite, recuse ou negocie.",
            minWords:12
          },
          {
            prompt:"Describe what a good end to this evening would look like for you.",
            hint:"2 ou 3 ideias conectadas.",
            minWords:14
          }
        ]
      }
    ]
  };

  function hashSeed(text) {
    let h = 2166136261;
    for (const ch of String(text)) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h,16777619);
    }
    return h >>> 0;
  }

  function seededIndex(length,seedText) {
    if(!length) return 0;
    return hashSeed(seedText) % length;
  }

  function themeBucket(theme) {
    const text = normalize(theme);

    if(/viagem|travel|airport|aeroporto|hotel|voo/.test(text)) return "travel";
    if(/trabalho|work|rh|lideranca|liderança|reuniao|reunião|carreira|empresa/.test(text)) return "work";
    if(/relacionamento|casamento|partner|relationship/.test(text)) return "relationship";
    if(/amigo|friends|friend|social/.test(text)) return "friend";
    if(/familia|família|family/.test(text)) return "family";
    if(/treino|academia|esporte|sport|training|football|futebol/.test(text)) return "training";
    if(/comida|restaurant|restaurante|food|meal/.test(text)) return "food";
    if(/musica|música|music/.test(text)) return "music";
    if(/tecnologia|technology|tech/.test(text)) return "technology";

    return "everyday";
  }

  async function dailyContext(date) {
    try {
      const result = await window.MMCDEnglishDailyV8113?.taskForDate?.(date);
      const task = result?.task || null;

      return {
        theme:task?.theme || "",
        title:task?.title || "",
        structures:Array.isArray(task?.structureFocus) ? task.structureFocus : []
      };
    } catch(error) {
      console.warn("Prática em contexto: não foi possível ler o tema do texto do dia.",error);
      return {theme:"",title:"",structures:[]};
    }
  }

  function scriptFor(context,date,roundNo) {
    const bucket = themeBucket(context?.theme);
    const pool = SCRIPTS[bucket] || SCRIPTS.everyday;
    const index = seededIndex(pool.length,`${date}|${roundNo}|${context?.theme || bucket}`);
    return structuredClone(pool[index]);
  }

  function migrateStore(value) {
    const store = value && typeof value === "object"
      ? structuredClone(value)
      : {};

    store.sessions = Array.isArray(store.sessions)
      ? store.sessions
      : [];

    store.schemaVersion = SCHEMA;

    for(const session of store.sessions) {
      session.rounds = Array.isArray(session.rounds)
        ? session.rounds
        : [];
    }

    return store;
  }

  async function loadStore(db,userId) {
    const {data,error}=await db
      .from("configuracoes_usuario")
      .select("valor")
      .eq("user_id",userId)
      .eq("chave",KEY)
      .maybeSingle();

    if(error) throw error;
    return migrateStore(data?.valor);
  }

  async function saveStore(db,userId,store) {
    const payload = {
      user_id:userId,
      chave:KEY,
      valor:{
        schemaVersion:SCHEMA,
        sessions:store.sessions,
        updatedAt:new Date().toISOString()
      }
    };

    const {error}=await db
      .from("configuracoes_usuario")
      .upsert(payload,{onConflict:"user_id,chave"});

    if(error) throw error;
  }

  function ensureSession(store,date) {
    let session = store.sessions.find(item => item?.date === date);

    if(!session) {
      session = {
        id:crypto.randomUUID
          ? crypto.randomUUID()
          : `practice-${Date.now()}`,
        date,
        rounds:[],
        completed:false,
        score:null,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };

      store.sessions.push(session);
    }

    session.rounds = Array.isArray(session.rounds)
      ? session.rounds
      : [];

    return session;
  }

  function completedRounds(store) {
    return store.sessions.reduce((sum,session) => {
      return sum + (session.rounds || []).filter(round => round?.completed).length;
    },0);
  }

  function updateSummary(script) {
    const focus = document.querySelector("#english-summary-focus");
    const verbs = document.querySelector("#english-summary-verbs");

    if(focus) focus.textContent = script.label;
    if(verbs) verbs.textContent = "6 respostas · situação real";
  }

  function responseState(session,roundNo,script) {
    const savedRound = (session.rounds || []).find(round =>
      Number(round?.roundNo) === Number(roundNo)
      && round?.scriptId === script.id
    );

    if(savedRound?.completed) {
      return {
        answers:Array.isArray(savedRound.answers)
          ? savedRound.answers
          : [],
        completed:true
      };
    }

    return {
      answers:[],
      completed:false
    };
  }

  function answeredCount(answers) {
    return answers.filter(answer => String(answer || "").trim()).length;
  }

  function questionHtml(question,index,answers) {
    const value = answers[index] || "";
    const count = wordCount(value);
    const enough = count >= Number(question.minWords || 1);

    return `
      <article class="english-context-question ${value ? "has-answer" : ""}" data-context-question="${index}">
        <div class="english-context-question__number">${index+1}</div>

        <div class="english-context-question__body">
          <div class="english-context-question__speaker">
            <span>INTERLOCUTOR</span>
            <strong>${esc(question.prompt)}</strong>
          </div>

          <label>
            <span>SUA RESPOSTA</span>
            <textarea
              rows="3"
              data-context-answer="${index}"
              placeholder="Responda em inglês como você realmente falaria..."
            >${esc(value)}</textarea>
          </label>

          <div class="english-context-question__foot">
            <small>${esc(question.hint || "")}</small>
            <em class="${enough ? "is-ready" : ""}">
              ${count} ${count===1 ? "palavra" : "palavras"}
              ${question.minWords ? ` · meta ${question.minWords}+` : ""}
            </em>
          </div>
        </div>
      </article>
    `;
  }

  function renderHost(host,script,context,session,roundNo,state,totalRounds) {
    const answers = state.answers || [];
    const done = answeredCount(answers);
    const finished = done === QUESTIONS_PER_ROUND;

    const structures = (context?.structures || [])
      .slice(0,4);

    host.innerHTML = `
      <div class="english-context-practice">
        <header class="english-context-head">
          <div>
            <p class="eyebrow">3 · Prática em contexto</p>
            <h2>${esc(script.title)}</h2>
            <p class="muted">${esc(script.intro)}</p>
          </div>

          <div class="english-context-progress">
            <span>PRÁTICA DE HOJE</span>
            <strong>${done}/${QUESTIONS_PER_ROUND} respostas</strong>
            <small>${esc(script.label)}</small>
          </div>
        </header>

        <section class="english-context-brief">
          <div>
            <span>CENÁRIO</span>
            <strong>${esc(script.label)}</strong>
          </div>
          <div>
            <span>SEU INTERLOCUTOR</span>
            <strong>${esc(script.role)}</strong>
          </div>
          <div>
            <span>OBJETIVO</span>
            <strong>Responder com naturalidade e sustentar a conversa</strong>
          </div>
        </section>

        ${structures.length ? `
          <section class="english-context-reference">
            <div>
              <span>ESTRUTURAS DO TEXTO DE HOJE</span>
              <small>Use se fizer sentido. Não force a estrutura só para “acertar”.</small>
            </div>
            <div>
              ${structures.map(item => `<b>${esc(item)}</b>`).join("")}
            </div>
          </section>
        ` : ""}

        <section class="english-context-instruction">
          <strong>Sem tradução mecânica. Sem escolher alternativa.</strong>
          <p>Leia a fala, imagine a situação e responda como você responderia de verdade. A gramática será trabalhada dentro da sua resposta.</p>
        </section>

        <div class="english-context-list">
          ${script.questions.map((question,index) =>
            questionHtml(question,index,answers)
          ).join("")}
        </div>

        <footer class="english-context-finish">
          <div>
            <strong>${state.completed
              ? "Prática de hoje concluída."
              : finished
                ? "Prática pronta para concluir."
                : `Faltam ${QUESTIONS_PER_ROUND-done} respostas.`
            }</strong>
            <span>Uma situação real por dia. Sem rodadas extras.</span>
          </div>

          <button
            type="button"
            class="btn primary"
            data-context-finish
            ${finished ? "" : "disabled"}
          >
            ${state.completed ? "Atualizar prática" : "Concluir prática"}
          </button>
        </footer>
      </div>
    `;
  }

  async function render({host,data,db,usuario}) {
    if(!host || !db || !usuario?.id) return;

    const date = String(data || new Date().toISOString().slice(0,10));

    try {
      const store = await loadStore(db,usuario.id);
      const session = ensureSession(store,date);
      const context = await dailyContext(date);

      const roundNo = 0;
      const script = scriptFor(context,date,roundNo);
      const saved = responseState(session,roundNo,script);

      const state = {
        answers:Array(QUESTIONS_PER_ROUND).fill(""),
        completed:Boolean(saved.completed)
      };

      if(saved.answers?.length) {
        saved.answers.slice(0,QUESTIONS_PER_ROUND).forEach((value,index) => {
          state.answers[index] = value;
        });
      }

      updateSummary(script);

      const paint = () => {
        renderHost(
          host,
          script,
          context,
          session,
          roundNo,
          state,
          completedRounds(store)
        );
      };

      paint();

      host.addEventListener("input",event => {
        const field = event.target.closest("[data-context-answer]");
        if(!field) return;

        const index = Number(field.dataset.contextAnswer);
        state.answers[index] = field.value || "";

        // Atualiza apenas contador e botão sem destruir o foco/textarea.
        const done = answeredCount(state.answers);
        const finish = host.querySelector("[data-context-finish]");
        const progress = host.querySelector(".english-context-progress strong");
        const footerStrong = host.querySelector(".english-context-finish strong");

        if(progress) progress.textContent = `${done}/${QUESTIONS_PER_ROUND} respostas`;

        if(finish) {
          finish.disabled = done !== QUESTIONS_PER_ROUND;
        }

        if(footerStrong) {
          footerStrong.textContent = done === QUESTIONS_PER_ROUND
            ? "Prática pronta para concluir."
            : `Faltam ${QUESTIONS_PER_ROUND-done} respostas.`;
        }

        const card = field.closest(".english-context-question");
        const question = script.questions[index];

        if(card && question) {
          card.classList.toggle(
            "has-answer",
            Boolean(String(field.value || "").trim())
          );

          const counter = card.querySelector(".english-context-question__foot em");
          const count = wordCount(field.value || "");
          const enough = count >= Number(question.minWords || 1);

          if(counter) {
            counter.textContent =
              `${count} ${count===1 ? "palavra" : "palavras"} · meta ${question.minWords}+`;
            counter.classList.toggle("is-ready",enough);
          }
        }
      });

      host.addEventListener("click",async event => {
        const finish = event.target.closest("[data-context-finish]");

        if(!finish || finish.disabled) return;

        if(answeredCount(state.answers) < QUESTIONS_PER_ROUND) {
          toast("Responda todas as perguntas antes de concluir.");
          return;
        }

        const tooShort = script.questions
          .map((question,index) => ({
            index,
            min:Number(question.minWords || 1),
            count:wordCount(state.answers[index])
          }))
          .filter(item => item.count < item.min);

        if(tooShort.length) {
          const first = tooShort[0];
          toast(`A resposta ${first.index+1} ainda está muito curta para uma prática natural.`);

          host.querySelector(`[data-context-answer="${first.index}"]`)
            ?.focus();

          return;
        }

        const completedAt = new Date().toISOString();

        const canonicalRound={
          roundNo:0,
          completed:true,
          score:100,
          mode:"context-script",
          scriptId:script.id,
          scriptLabel:script.label,
          scriptTitle:script.title,
          sourceTheme:context?.theme || "",
          sourceReadingTitle:context?.title || "",
          answers:script.questions.map((question,index) => ({
            id:`practice-${index+1}`,
            prompt:question.prompt,
            answer:state.answers[index].trim()
          })),
          completedAt
        };

        const existingIndex=session.rounds.findIndex(round =>
          round?.scriptId===script.id
        );

        if(existingIndex>=0) {
          session.rounds[existingIndex]=canonicalRound;
        } else {
          session.rounds.push(canonicalRound);
        }

        state.completed=true;

        session.completed = true;
        session.score = 100;
        session.completedAt = completedAt;
        session.updatedAt = completedAt;
        session.lessonId = "context-script";
        session.lessonTitle = script.label;

        await saveStore(db,usuario.id,store);

        paint();

        toast("Prática em contexto salva.");

        document.dispatchEvent(
          new CustomEvent("memory:english-part-saved",{
            detail:{
              part:"practice",
              date
            }
          })
        );
      });

    } catch(error) {
      console.error("Prática em contexto de inglês:",error);

      host.innerHTML = `
        <div class="measure-empty">
          ${esc(error.message || "Não foi possível carregar a prática em contexto.")}
        </div>
      `;
    }
  }

  let liveStatus=null;

  const originalRender=render;

  async function renderWithStatus(options) {
    const result=await originalRender(options);

    try {
      const {host,data,db,usuario}=options;
      const store=await loadStore(db,usuario.id);
      const session=ensureSession(store,String(data));
      const context=await dailyContext(String(data));
      const script=scriptFor(context,String(data),0);
      const saved=responseState(session,0,script);

      liveStatus={
        date:String(data),
        scriptId:script.id,
        title:script.title,
        label:script.label,
        completed:Boolean(saved.completed),
        answers:Array.isArray(saved.answers) ? saved.answers : []
      };
    } catch(error) {
      console.warn("Prática em contexto: status final indisponível.",error);
    }

    return result;
  }

  document.addEventListener("memory:english-part-saved",async event=>{
    if(event?.detail?.part!=="practice") return;

    const currentDate=event.detail.date;
    if(liveStatus && String(liveStatus.date)===String(currentDate)) {
      liveStatus.completed=true;
    }
  });

  return {
    render:renderWithStatus,
    status:()=>liveStatus ? structuredClone(liveStatus) : null,
    version:"v81.13.13"
  };
})();
