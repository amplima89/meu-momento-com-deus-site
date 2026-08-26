"use strict";

window.MMCDEnglishExperience = (() => {
  let wired=false;

  function updateLevel() {
    const raw=document.querySelector("#ingles-nivel")?.textContent || "";
    const level=raw.replace(/^Nível de hoje:\s*/i,"").trim() || "—";
    const el=document.querySelector("#english-summary-level");
    if(el) el.textContent=level;
  }

  async function updateSummary(date) {
    const focus=document.querySelector("#english-summary-focus");
    const routine=document.querySelector("#english-summary-verbs");

    if(routine) {
      routine.textContent="Conversa + Leitura";
    }

    if(!focus) return;

    try {
      const result=await window.MMCDEnglishDailyV8113?.taskForDate?.(date);
      const task=result?.task || {};
      focus.textContent=task.theme || task.title || "Tema do dia";
    } catch {
      focus.textContent="Tema do dia";
    }
  }

  function removeLegacyPractice() {
    document.querySelector('[data-english-step="practice"]')?.remove();
    document.querySelector("#english-practice-host")?.remove();

    document.querySelectorAll(
      ".english-practice-card,[data-context-finish],[data-context-question]"
    ).forEach(node=>{
      const owner=node.closest?.("#english-practice-host");
      if(owner) owner.remove();
    });
  }

  function scrollToStep(step) {
    const target=step==="conversation"
      ? document.querySelector("#english-conversation-host")
      : step==="read"
        ? (
            document.querySelector('[data-lesson-kind="reading"]')
            || document.querySelector("[data-english-reading-clean]")
            || document.querySelector("#ingles-conteudo")
          )
        : null;

    target?.scrollIntoView?.({
      behavior:"smooth",
      block:"start"
    });
  }

  function wireRoute() {
    if(wired) return;
    wired=true;

    document.querySelectorAll("[data-english-step]").forEach(button=>{
      button.addEventListener("click",()=>{
        scrollToStep(button.dataset.englishStep);
      });
    });
  }

  async function render({container,data,db,usuario}) {
    document.body.classList.add(
      "english-v10",
      "english-v807",
      "english-v81173"
    );

    removeLegacyPractice();

    let enhanced=false;

    if(window.MMCDEnglishDailyV8113?.render) {
      try {
        enhanced=await window.MMCDEnglishDailyV8113.render({
          container,
          data,
          db,
          usuario
        });
      } catch(error) {
        console.error("Inglês: falha ao carregar a leitura.",error);
      }
    }

    if(!enhanced) {
      const grid=container?.querySelector?.(".english-lesson-grid");

      if(grid) {
        grid.querySelectorAll(
          '[data-lesson-kind="writing"],[data-lesson-kind="speaking"],[data-lesson-kind="scene"],[data-lesson-kind="grammar"],[data-lesson-kind="concept"],[data-lesson-kind="examples"],[data-lesson-kind="quick"]'
        ).forEach(block=>block.remove());

        const reading=grid.querySelector('[data-lesson-kind="reading"]');
        const expressions=grid.querySelector('[data-lesson-kind="expressions"]');

        if(reading) {
          reading.querySelector(".english-block-kicker")?.replaceChildren(
            document.createTextNode("2 · Leitura")
          );
          grid.append(reading);
        }

        if(expressions) {
          expressions.querySelector(".english-block-kicker")?.replaceChildren(
            document.createTextNode("Vocabulário da leitura")
          );
          grid.append(expressions);
        }
      }
    }

    removeLegacyPractice();
    updateLevel();
    await updateSummary(data);
    wireRoute();

    if(window.MMCDEnglishReadingRecorderV81175?.init) {
      try {
        await window.MMCDEnglishReadingRecorderV81175.init({
          data,
          db,
          usuario
        });
      } catch(error) {
        console.error("Inglês: falha ao iniciar gravação da leitura.",error);
      }
    }

    if(window.MMCDEnglishFinalCorrectionV81176?.render) {
      await window.MMCDEnglishFinalCorrectionV81176.render({
        container,
        data,
        db,
        usuario
      });
    }
  }

  return {
    render,
    version:"v81.17.6"
  };
})();
