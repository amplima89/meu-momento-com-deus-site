"use strict";

(async () => {
  let d = await MMCD.carregar();
  const $ = selector => document.querySelector(selector);
  const clone = value => JSON.parse(JSON.stringify(value));

  function newId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
      const random = Math.floor(Math.random() * 16);
      const value = character === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  function setFormMessage(message = "", state = "") {
    const element = $("#book-form-message");
    element.textContent = message;
    element.dataset.state = state;
    element.hidden = !message;
  }

  function showError(error, fallback) {
    console.error(error);
    const message = error?.message || fallback;
    setFormMessage(message, "error");
    MMCDUI.toast(message, 6000);
  }

  function openBook(book = {}, current = false) {
    $("#book-form-card").hidden = false;
    $("#book-form-title").textContent = current ? "Editar livro atual" : book.id ? "Editar livro" : "Adicionar livro";
    $("#book-id").value = current ? "CURRENT" : book.id || "";
    $("#book-title").value = book.titulo || "";
    $("#book-author").value = book.autor || "";
    $("#book-start").value = book.dataInicio || "";
    $("#book-end").value = book.dataConclusao || "";
    $("#book-learning").value = book.aprendizado || book.observacoes || "";
    setFormMessage();
    window.scrollTo({ top: $("#book-form-card").offsetTop - 24, behavior: "smooth" });
    setTimeout(() => $("#book-title").focus(), 250);
  }

  function closeForm() {
    $("#book-form-card").hidden = true;
    $("#book-form").reset();
    $("#book-id").value = "";
    setFormMessage();
  }

  function daysBetween(start, end) {
    if (!start || !end) return "—";
    return `${Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1)} dias`;
  }

  function consistency() {
    const dates = [];
    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      dates.push(date.toISOString().slice(0, 10));
    }

    const reading = d.metas.find(meta => String(meta.nome || "").toLocaleLowerCase("pt-BR").includes("leitura"));
    const count = reading ? dates.filter(date => MMCD.registro(d, date, reading.id)?.concluida).length : 0;
    let record = 0;
    let run = 0;

    Object.keys(d.registros || {}).sort().forEach(date => {
      const completed = !!(reading && MMCD.registro(d, date, reading.id)?.concluida);
      run = completed ? run + 1 : 0;
      record = Math.max(record, run);
    });

    $("#reading-consistency").innerHTML = `
      <div class="consistency__top">
        <div>
          <h2>CONSISTÊNCIA NA LEITURA</h2>
          <p>Você leu <strong>${count}</strong> dos últimos 30 dias.</p>
          <p>Seu recorde é <strong>${record}</strong> dias.</p>
        </div>
        <strong>${Math.round((count / 30) * 100)}%</strong>
      </div>
      <div class="consistency-grid">
        ${dates.map(date => `<i class="consistency-cell ${reading && MMCD.registro(d, date, reading.id)?.concluida ? "on" : ""}"></i>`).join("")}
      </div>`;
  }

  async function persistLibrary(successMessage, snapshot) {
    try {
      const result = await MMCD.salvarLivros(d);
      d = result.dados;
      render();
      if (result.aviso) {
        MMCDUI.toast(`${successMessage}. Atenção: ${result.aviso}`, 7000);
      } else {
        MMCDUI.toast(successMessage, 3500);
      }
      return true;
    } catch (error) {
      d = snapshot;
      render();
      showError(error, "Não foi possível salvar o livro no banco.");
      return false;
    }
  }

  function render() {
    consistency();
    const current = d.livros.atual || {};
    $("#current-title").textContent = current.titulo || "Nenhum livro em andamento";
    $("#current-author").textContent = current.autor || "Cadastre sua próxima leitura.";
    $("#current-start").textContent = current.dataInicio ? `Iniciado em ${MMCDUI.date(current.dataInicio)}` : "Data de início não informada";

    const year = String(d.configuracoes.anoMetaLivros);
    const booksThisYear = d.livros.concluidos.filter(book => (book.dataConclusao || "").startsWith(year));
    const goal = Number(d.configuracoes.metaLivrosAno) || 30;
    const percentage = Math.min(100, Math.round((booksThisYear.length / goal) * 100));
    $("#goal-number").textContent = goal;
    $("#goal-percent").textContent = `${percentage}%`;
    $("#goal-progress").style.width = `${percentage}%`;
    $("#goal-detail").textContent = `${booksThisYear.length} de ${goal} livros concluídos em ${year}`;
    $("#library-count").textContent = `${d.livros.concluidos.length} livros`;

    $("#books-list").innerHTML = [...d.livros.concluidos]
      .sort((left, right) => (right.dataConclusao || "").localeCompare(left.dataConclusao || ""))
      .map(book => `
        <article class="book-item">
          <div>
            <h3>${MMCDUI.esc(book.titulo)}</h3>
            <div class="book-meta">
              ${MMCDUI.esc(book.autor || "Autor não informado")} ·
              Início: ${MMCDUI.date(book.dataInicio)} ·
              Conclusão: ${MMCDUI.date(book.dataConclusao)} ·
              Tempo: ${daysBetween(book.dataInicio, book.dataConclusao)}
            </div>
            ${book.aprendizado ? `<p class="book-learning"><strong>Aprendizado:</strong> ${MMCDUI.esc(book.aprendizado)}</p>` : ""}
          </div>
          <div class="book-actions"><button class="book-menu-button" type="button" data-menu="${book.id}" aria-label="Ações do livro">⋮</button></div>
        </article>`).join("") || '<div class="empty">Nenhum livro concluído.</div>';

    document.querySelectorAll("[data-menu]").forEach(button => {
      button.onclick = () => {
        document.querySelectorAll(".menu-pop").forEach(menu => menu.remove());
        const book = d.livros.concluidos.find(item => item.id === button.dataset.menu);
        if (!book) return;

        const menu = document.createElement("div");
        menu.className = "menu-pop";
        menu.innerHTML = '<button type="button" data-action="edit">Editar</button><button type="button" data-action="current">Definir como atual</button><button type="button" data-action="delete">Excluir</button>';
        button.parentElement.append(menu);

        menu.onclick = async event => {
          const action = event.target.dataset.action;
          if (!action) return;
          menu.remove();

          if (action === "edit") {
            openBook(book);
            return;
          }

          if (action === "current") {
            const snapshot = clone(d);
            d.livros.atual = {
              id: newId(),
              titulo: book.titulo,
              autor: book.autor,
              dataInicio: new Date().toISOString().slice(0, 10),
              observacoes: book.aprendizado || ""
            };
            await persistLibrary("Livro definido como leitura atual", snapshot);
            return;
          }

          if (action === "delete" && confirm(`Excluir “${book.titulo}” da biblioteca?`)) {
            const snapshot = clone(d);
            d.livros.concluidos = d.livros.concluidos.filter(item => item.id !== book.id);
            await persistLibrary("Livro excluído", snapshot);
          }
        };
      };
    });
  }

  $("#open-book-form").onclick = () => openBook();
  $("#edit-current").onclick = () => openBook(d.livros.atual, true);
  $("#close-book-form").onclick = closeForm;
  $("#cancel-book").onclick = closeForm;

  $("#edit-goal").onclick = async () => {
    const value = prompt("Meta anual de livros:", d.configuracoes.metaLivrosAno);
    if (!value || Number(value) <= 0) return;

    const snapshot = clone(d);
    d.configuracoes.metaLivrosAno = Number(value);
    try {
      d = await MMCD.salvarMetaLivros(d);
      render();
      MMCDUI.toast("Meta anual salva no banco", 3500);
    } catch (error) {
      d = snapshot;
      render();
      showError(error, "Não foi possível salvar a meta anual.");
    }
  };

  $("#book-form").onsubmit = async event => {
    event.preventDefault();
    setFormMessage();

    const id = $("#book-id").value;
    const book = {
      id: id && id !== "CURRENT" ? id : newId(),
      titulo: $("#book-title").value.trim(),
      autor: $("#book-author").value.trim(),
      dataInicio: $("#book-start").value,
      dataConclusao: $("#book-end").value,
      aprendizado: $("#book-learning").value.trim()
    };

    if (!book.titulo) {
      setFormMessage("Informe o título do livro.", "error");
      $("#book-title").focus();
      return;
    }
    if (book.dataInicio && book.dataConclusao && book.dataConclusao < book.dataInicio) {
      setFormMessage("A data de conclusão não pode ser anterior à data de início.", "error");
      $("#book-end").focus();
      return;
    }

    const snapshot = clone(d);

    if (id === "CURRENT" && book.dataConclusao) {
      book.id = d.livros.atual?.id || newId();
      const existingIndex = d.livros.concluidos.findIndex(item => item.id === book.id);
      if (existingIndex >= 0) d.livros.concluidos[existingIndex] = book;
      else d.livros.concluidos.push(book);
      d.livros.atual = { titulo: "", autor: "", dataInicio: "", observacoes: "" };
    } else if (id === "CURRENT") {
      d.livros.atual = {
        id: d.livros.atual?.id || book.id,
        titulo: book.titulo,
        autor: book.autor,
        dataInicio: book.dataInicio,
        observacoes: book.aprendizado
      };
    } else if (book.dataConclusao) {
      const existingIndex = d.livros.concluidos.findIndex(item => item.id === book.id);
      if (existingIndex >= 0) d.livros.concluidos[existingIndex] = book;
      else d.livros.concluidos.push(book);

      if ((d.livros.atual?.titulo || "").toLocaleLowerCase("pt-BR") === book.titulo.toLocaleLowerCase("pt-BR")) {
        d.livros.atual = { titulo: "", autor: "", dataInicio: "", observacoes: "" };
      }
    } else {
      const completedIndex = d.livros.concluidos.findIndex(item => item.id === book.id);
      if (completedIndex >= 0) d.livros.concluidos.splice(completedIndex, 1);

      const hasAnotherCurrent = d.livros.atual?.titulo &&
        d.livros.atual.titulo.toLocaleLowerCase("pt-BR") !== book.titulo.toLocaleLowerCase("pt-BR");
      if (hasAnotherCurrent && !confirm(`Já existe um livro atual: ${d.livros.atual.titulo}. Deseja substituí-lo por ${book.titulo}?`)) {
        d = snapshot;
        return;
      }

      d.livros.atual = {
        id: book.id,
        titulo: book.titulo,
        autor: book.autor,
        dataInicio: book.dataInicio,
        observacoes: book.aprendizado
      };
    }

    const button = event.submitter || $("#book-form button[type=submit]");
    button.disabled = true;
    button.textContent = "Salvando no banco...";
    setFormMessage("Salvando no Supabase...", "saving");

    try {
      const result = await MMCD.salvarLivros(d);
      d = result.dados;
      closeForm();
      render();
      const success = book.dataConclusao ? "Livro concluído e salvo no banco" : "Livro salvo no banco";
      MMCDUI.toast(result.aviso ? `${success}. ${result.aviso}` : success, result.aviso ? 7000 : 3500);
    } catch (error) {
      d = snapshot;
      showError(error, "Não foi possível salvar o livro no banco.");
    } finally {
      button.disabled = false;
      button.textContent = "Salvar";
    }
  };

  render();
})().catch(error => {
  console.error(error);
  window.MMCDUI?.toast(error?.message || "Erro ao carregar a biblioteca.", 7000);
  const card = document.querySelector("#book-form-card");
  if (card) card.hidden = false;
  const message = document.querySelector("#book-form-message");
  if (message) {
    message.hidden = false;
    message.dataset.state = "error";
    message.textContent = error?.message || "Erro ao carregar os dados do banco.";
  }
});
