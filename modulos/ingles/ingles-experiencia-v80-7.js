"use strict";

window.MMCDEnglishExperience = (() => {
  let wired = false;

  const text = value => String(value || "").replace(/\s+/g, " ").trim();
  const family = value => {
    const raw = text(value);
    if (!raw) return "Estrutura em prática";
    return raw.replace(/\s+[—–-]\s+.+$/, "").trim() || "Estrutura em prática";
  };

  function organizeReading(container) {
    const grid = container?.querySelector?.(".english-lesson-grid");
    if (!grid) return;

    const grammar = grid.querySelector('[data-lesson-kind="grammar"]');
    const concept = grid.querySelector('[data-lesson-kind="concept"]');
    const examples = grid.querySelector('[data-lesson-kind="examples"]');
    const reading = grid.querySelector('[data-lesson-kind="reading"]');
    const expressions = grid.querySelector('[data-lesson-kind="expressions"]');
    const comprehension = grid.querySelector('[data-lesson-kind="quick"]');

    // V80.7: Produza, speaking isolado e Série/Filme saem da rotina diária.
    grid.querySelectorAll('[data-lesson-kind="writing"],[data-lesson-kind="speaking"],[data-lesson-kind="scene"]')
      .forEach(block => block.remove());

    grid.querySelectorAll('[data-lesson-kind]').forEach(block => block.classList.add('english-course-block'));

    if (grammar) grammar.querySelector('.english-block-kicker').textContent = 'Estrutura da leitura';
    if (concept) concept.querySelector('.english-block-kicker').textContent = 'Como funciona';
    if (examples) examples.querySelector('.english-block-kicker').textContent = 'Exemplos em contexto';
    if (reading) reading.querySelector('.english-block-kicker').textContent = '2 · Leitura';
    if (expressions) expressions.querySelector('.english-block-kicker').textContent = 'Vocabulário da leitura';
    if (comprehension) comprehension.querySelector('.english-block-kicker').textContent = 'Compreensão';

    if (grammar) {
      const title = grammar.querySelector('.english-block-main-title');
      if (title) title.textContent = family(title.textContent);
    }

    [grammar, concept, examples, reading, expressions, comprehension]
      .filter(Boolean)
      .forEach(block => grid.append(block));
  }

  function updateLevel() {
    const raw = document.querySelector('#ingles-nivel')?.textContent || '';
    const level = raw.replace(/^Nível de hoje:\s*/i, '').trim() || '—';
    const levelEl = document.querySelector('#english-summary-level');
    if (levelEl) levelEl.textContent = level;
  }

  function scrollToStep(step) {
    const targets = {
      conversation: '#english-conversation-host',
      read: '#ingles-conteudo [data-lesson-kind="reading"]',
      practice: '#english-practice-host'
    };
    const target = document.querySelector(targets[step] || '');
    target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function wireRoute() {
    if (wired) return;
    wired = true;
    document.querySelectorAll('[data-english-step]').forEach(button => {
      button.addEventListener('click', () => scrollToStep(button.dataset.englishStep));
    });
  }

  async function render({ container, data, db, usuario }) {
    document.body.classList.add('english-v10', 'english-v807');
    organizeReading(container);
    updateLevel();
    wireRoute();

    const host = document.querySelector('#english-practice-host');
    if (host && window.MMCDEnglishPractice?.render) {
      await window.MMCDEnglishPractice.render({ host, data, db, usuario });
    }
  }

  return { render };
})();
