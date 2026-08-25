"use strict";

window.MMCDEnglishExperience = (() => {
  let wired=false;

  function replacePracticeLabel(root=document) {
    const walker=document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT
    );

    const nodes=[];

    while(walker.nextNode()) {
      const node=walker.currentNode;
      if(/Prática intensiva/i.test(node.nodeValue || "")) {
        nodes.push(node);
      }
    }

    nodes.forEach(node=>{
      node.nodeValue=String(node.nodeValue || "")
        .replace(/Prática intensiva/gi,"Prática em contexto");
    });
  }

  function updateLevel() {
    const raw=document.querySelector("#ingles-nivel")?.textContent || "";
    const level=raw.replace(/^Nível de hoje:\s*/i,"").trim() || "—";
    const el=document.querySelector("#english-summary-level");
    if(el) el.textContent=level;
  }

  function scrollToStep(step) {
    const target=step==="conversation"
      ? document.querySelector("#english-conversation-host")
      : step==="read"
        ? document.querySelector('[data-lesson-kind="reading"]')
        : step==="practice"
          ? document.querySelector("#english-practice-host")
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
      "english-v811313"
    );

    replacePracticeLabel(document);

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

    updateLevel();
    wireRoute();

    const practiceHost=document.querySelector("#english-practice-host");

    if(practiceHost && window.MMCDEnglishPractice?.render) {
      await window.MMCDEnglishPractice.render({
        host:practiceHost,
        data,
        db,
        usuario
      });
    }

    replacePracticeLabel(document);

    if(window.MMCDEnglishFinalCorrectionV811314?.render) {
      await window.MMCDEnglishFinalCorrectionV811314.render({
        container,
        data,
        db,
        usuario
      });
    }
  }

  return {
    render,
    version:"v81.13.14"
  };
})();
