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
      session.stage = stage;
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
      const prompts = topic.prompts[stage] || topic.prompts[1];
      const session = ensureSession(store, date, topic, stage);
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
        session.updatedAt = new Date().toISOString();
        try {
          await saveStore(db, usuario.id, store);
          toast('Conversa do dia concluída.');
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
