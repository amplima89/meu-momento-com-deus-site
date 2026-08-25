"use strict";

window.MMCDEnglishDailyV8113 = (() => {
  const TASK_FIELD = "__memoryDailyTaskV81_13";

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));

  function markerJson(markdown="") {
    const match=String(markdown).match(
      /MMCD_ENGLISH_GLOSSARY_START\s*([\s\S]*?)\s*MMCD_ENGLISH_GLOSSARY_END/i
    );

    if(!match) return null;

    let raw=match[1]
      .replace(/^\s*```(?:json)?\s*/i,"")
      .replace(/\s*```\s*$/,"")
      .replace(/-->\s*$/,"")
      .trim();

    try {
      const obj=JSON.parse(raw);
      const task=obj?.[TASK_FIELD];
      return task && typeof task==="object"
        ? structuredClone(task)
        : null;
    } catch(error) {
      console.warn("Inglês: atividade diária estruturada inválida.",error);
      return null;
    }
  }

  async function allMeditations() {
    try {
      const list=await window.MMCD?.listarMeditacoes?.();
      return Array.isArray(list) ? list : [];
    } catch(error) {
      console.warn("Inglês: não foi possível carregar o texto diário.",error);
      return [];
    }
  }

  async function taskForDate(date) {
    const list=await allMeditations();
    const meditation=list.find(item=>item?.data===date);
    const task=markerJson(meditation?.markdown || "");

    return {
      task:task || null,
      reviews:[],
      list
    };
  }

  function vocabularyHtml(items=[]) {
    if(!Array.isArray(items) || !items.length) return "";

    return `
      <section class="english-clean-vocab">
        <header>
          <span>VOCABULÁRIO DO TEXTO</span>
          <strong>Palavras e expressões úteis</strong>
        </header>

        <div>
          ${items.map(item=>`
            <article>
              <div>
                <strong>${esc(item.term || "")}</strong>
                <span>${esc(item.meaningPt || "")}</span>
              </div>
              ${item.example ? `<p>${esc(item.example)}</p>` : ""}
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderTask(task) {
    const structures=Array.isArray(task?.structureFocus)
      ? task.structureFocus.filter(Boolean).slice(0,4)
      : [];

    return `
      <div class="english-reading-clean" data-english-reading-clean>
        <section class="english-reading-clean__hero" data-lesson-kind="reading">
          <div class="english-reading-clean__meta">
            <span>2 · LEITURA</span>
            <b>${esc(task?.theme || "situação real")}</b>
          </div>

          <h2>${esc(task?.title || "English Today")}</h2>
          <p class="english-reading-clean__level">
            Texto contextualizado · aproximadamente 85% familiar / 15% novidade
          </p>

          ${structures.length ? `
            <div class="english-reading-clean__structures">
              <span>ESTRUTURAS QUE APARECEM NO TEXTO</span>
              <div>${structures.map(item=>`<b>${esc(item)}</b>`).join("")}</div>
            </div>
          ` : ""}

          <div class="english-reading-clean__text">
            ${String(task?.readingText || "")
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map(paragraph=>`<p>${esc(paragraph.trim())}</p>`)
              .join("")}
          </div>
        </section>

        ${vocabularyHtml(task?.vocabulary || [])}
      </div>
    `;
  }

  async function render({container,data}) {
    if(!container || !data) return false;

    const {task}=await taskForDate(data);

    if(!task?.readingText) {
      return false;
    }

    container.innerHTML=renderTask(task);

    document.dispatchEvent(
      new CustomEvent("memory:english-reading-ready",{
        detail:{
          date:data,
          title:task.title || "",
          theme:task.theme || ""
        }
      })
    );

    return true;
  }

  function status() {
    return {
      ready:Boolean(
        document.querySelector("[data-english-reading-clean]")
        || document.querySelector('[data-lesson-kind="reading"]')
      ),
      saved:true,
      started:true,
      missing:[]
    };
  }

  return {
    render,
    taskForDate,
    status,
    version:"v81.13.13"
  };
})();
