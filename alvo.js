"use strict";

const MISSAO = {
    id: "retomar-controle-2026-07",
    inicio: "2026-07-28",
    fim: "2026-08-09",
    pesoAlvo: 93.5,
    metas: [
        { id: "treino", titulo: "Treino", descricao: "Comparecer. Treino feito vale mais que treino perfeito.", alvo: 4, unidade: "treinos" },
        { id: "cardio", titulo: "Cardio", descricao: "Caminhada de 30 minutos ou equivalente. Sem negociação.", alvo: 5, unidade: "cardios" },
        { id: "alimentacao", titulo: "Alimentação", descricao: "Sem refrigerante e sem doce durante a semana. No fim de semana, uma refeição livre — não um dia livre.", alvo: null, unidade: "dias" },
        { id: "agua", titulo: "Água", descricao: "3 litros no dia.", alvo: null, unidade: "dias" },
        { id: "sono", titulo: "Sono", descricao: "Dormir antes das 23h.", alvo: 5, unidade: "noites" },
        { id: "espiritual", titulo: "Espiritual", descricao: "Realizar a meditação e colocar ordem na mente antes de colocar ordem no corpo.", alvo: null, unidade: "dias" }
    ]
};

const CHAVE = `alvo:${MISSAO.id}`;
const nomesDias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const $ = seletor => document.querySelector(seletor);

function dataLocalISO(data = new Date()) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

function criarData(iso) { return new Date(`${iso}T12:00:00`); }
function adicionarDias(data, quantidade) { const nova = new Date(data); nova.setDate(nova.getDate() + quantidade); return nova; }
function formatarDataCurta(iso) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(criarData(iso)); }
function formatarDataLonga(iso) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(criarData(iso)); }
function arredondar(valor) { return Math.max(0, Math.min(100, Math.round(valor))); }

function datasDaMissao() {
    const inicio = criarData(MISSAO.inicio);
    const fim = criarData(MISSAO.fim);
    const datas = [];
    for (let atual = inicio; atual <= fim; atual = adicionarDias(atual, 1)) datas.push(dataLocalISO(atual));
    return datas;
}

function estadoInicial() { return { checks: {}, pesos: {} }; }
function carregarEstado() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE));
        return salvo && typeof salvo === "object" ? { ...estadoInicial(), ...salvo } : estadoInicial();
    } catch { return estadoInicial(); }
}
let estado = carregarEstado();
function salvarEstado() { localStorage.setItem(CHAVE, JSON.stringify(estado)); }

function marcado(metaId, data) { return Boolean(estado.checks?.[metaId]?.[data]); }
function alternarCheck(metaId, data) {
    estado.checks[metaId] ??= {};
    estado.checks[metaId][data] = !estado.checks[metaId][data];
    salvarEstado();
    renderizar();
}

function totalMarcado(metaId) { return datasDaMissao().filter(data => marcado(metaId, data)).length; }
function alvoDaMeta(meta) { return meta.alvo ?? datasDaMissao().length; }
function progressoMeta(meta) { return arredondar((totalMarcado(meta.id) / alvoDaMeta(meta)) * 100); }
function pesoAtingido() { return Object.values(estado.pesos).some(valor => Number(valor) < MISSAO.pesoAlvo); }
function progressoGeral() {
    const progresso = MISSAO.metas.map(progressoMeta);
    progresso.push(pesoAtingido() ? 100 : 0);
    return arredondar(progresso.reduce((soma, item) => soma + item, 0) / progresso.length);
}

function renderizarCabecalho() {
    $("#periodo-missao").textContent = `${formatarDataLonga(MISSAO.inicio)} a ${formatarDataLonga(MISSAO.fim)}`;
    const progresso = progressoGeral();
    $("#progresso-geral-texto").textContent = `${progresso}%`;
    $("#progresso-geral-barra").style.width = `${progresso}%`;

    const hoje = dataLocalISO();
    const dentro = hoje >= MISSAO.inicio && hoje <= MISSAO.fim;
    $("#mensagem-hoje").textContent = dentro
        ? `Hoje é ${nomesDias[criarData(hoje).getDay()]}, ${formatarDataCurta(hoje)}. Marque somente o que foi cumprido de verdade.`
        : hoje < MISSAO.inicio ? "A missão ainda não começou." : "O prazo terminou. Seu histórico permanece salvo neste navegador.";
}

function renderizarMetas() {
    const hoje = dataLocalISO();
    const datas = datasDaMissao();
    $("#lista-metas").innerHTML = MISSAO.metas.map(meta => {
        const total = totalMarcado(meta.id);
        const alvo = alvoDaMeta(meta);
        const progresso = progressoMeta(meta);
        const dias = datas.map(data => {
            const ativa = marcado(meta.id, data);
            const classeHoje = data === hoje ? " dia-check--hoje" : "";
            return `<button class="dia-check${classeHoje}${ativa ? " dia-check--marcado" : ""}" type="button" data-meta="${meta.id}" data-data="${data}" aria-pressed="${ativa}">
                <span class="dia-check__semana">${nomesDias[criarData(data).getDay()]}</span>
                <span class="dia-check__numero">${criarData(data).getDate()}</span>
                <span class="dia-check__marca" aria-hidden="true">${ativa ? "✓" : ""}</span>
            </button>`;
        }).join("");
        const textoContador = meta.alvo ? `${total} de ${meta.alvo} ${meta.unidade}` : `${total} de ${datas.length} dias`;
        return `<article class="meta-card">
            <div class="meta-card__topo">
                <div><h3>${meta.titulo}</h3><p>${meta.descricao}</p></div>
                <strong>${textoContador}</strong>
            </div>
            <div class="dias-grade">${dias}</div>
            <div class="meta-progresso"><span style="width:${progresso}%"></span></div>
        </article>`;
    }).join("");

    document.querySelectorAll(".dia-check").forEach(botao => {
        botao.addEventListener("click", () => alternarCheck(botao.dataset.meta, botao.dataset.data));
    });
}

function renderizarPeso() {
    const entradas = Object.entries(estado.pesos).sort(([a], [b]) => b.localeCompare(a));
    const hoje = dataLocalISO();
    if (estado.pesos[hoje] != null) $("#peso-atual").value = String(estado.pesos[hoje]);

    const atingiu = pesoAtingido();
    $("#peso-status").innerHTML = atingiu
        ? `<span class="peso-status__selo peso-status__selo--ok">✓ Meta alcançada</span>`
        : `<span class="peso-status__selo">Em andamento</span>`;

    $("#peso-historico").innerHTML = entradas.length
        ? `<h3>Histórico de peso</h3><div class="peso-historico__lista">${entradas.map(([data, valor]) => `<div><span>${nomesDias[criarData(data).getDay()]} · ${formatarDataCurta(data)}</span><strong>${Number(valor).toFixed(1).replace(".", ",")} kg</strong></div>`).join("")}</div>`
        : `<p class="peso-historico__vazio">Nenhum peso registrado ainda.</p>`;
}

function aplicarTema(tema) {
    const escuro = tema === "escuro";
    document.body.classList.toggle("tema-escuro", escuro);
    $("#icone-tema").textContent = escuro ? "☀" : "☾";
    $("#botao-tema").setAttribute("aria-label", escuro ? "Ativar tema claro" : "Ativar tema escuro");
    localStorage.setItem("tema-livro", tema);
}

function renderizar() { renderizarCabecalho(); renderizarMetas(); renderizarPeso(); }

$("#form-peso").addEventListener("submit", evento => {
    evento.preventDefault();
    const valor = Number($("#peso-atual").value.replace?.(",", ".") ?? $("#peso-atual").value);
    if (!Number.isFinite(valor) || valor <= 0) return;
    estado.pesos[dataLocalISO()] = Math.round(valor * 10) / 10;
    salvarEstado();
    renderizar();
});

$("#botao-tema").addEventListener("click", () => {
    aplicarTema(document.body.classList.contains("tema-escuro") ? "claro" : "escuro");
});

aplicarTema(localStorage.getItem("tema-livro") ?? "claro");
renderizar();
