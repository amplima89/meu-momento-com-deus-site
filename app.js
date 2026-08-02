"use strict";

/* =========================================================
   DADOS E ESTADO
   ========================================================= */

const meditacoes = [...(window.MEDITACOES_DO_LIVRO ?? [])]
    .filter(item =>
        item &&
        item.data &&
        typeof item.markdown === "string"
    )
    .sort((a, b) => a.data.localeCompare(b.data));

let indiceAtual = -1;


/* =========================================================
   ELEMENTOS
   ========================================================= */

const $ = seletor => document.querySelector(seletor);

const elementos = {
    data: $("#data-meditacao"),
    titulo: $("#titulo-meditacao"),
    conteudo: $("#conteudo-meditacao"),

    metadados: $("#metadados-meditacao"),
    clima: $("#meta-clima"),
    temperatura: $("#meta-temperatura"),
    referencia: $("#meta-referencia"),

    numeroPagina: $("#numero-pagina"),
    seletorData: $("#seletor-data"),

    anterior: $("#botao-anterior"),
    hoje: $("#botao-hoje"),
    proximo: $("#botao-proximo"),

    tema: $("#botao-tema"),
    iconeTema: $("#icone-tema"),
    marcar: $("#botao-marcar"),
    limparMarcas: $("#botao-limpar-marcas")
};


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function escaparHTML(valor = "") {
    const div = document.createElement("div");

    div.textContent = valor;

    return div.innerHTML;
}


function normalizarTexto(valor = "") {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


function dataHojeISO() {
    const hoje = new Date();

    return [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0")
    ].join("-");
}


function formatarData(dataISO) {
    const data = new Date(
        `${dataISO}T12:00:00`
    );

    if (Number.isNaN(data.getTime())) {
        return dataISO;
    }

    const texto = new Intl.DateTimeFormat(
        "pt-BR",
        {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    ).format(data);

    return (
        texto.charAt(0).toUpperCase()
        + texto.slice(1)
    );
}


function formatarInline(texto = "") {
    let html = escaparHTML(texto);

    html = html
        .replace(
            /\*\*(.+?)\*\*/g,
            "<strong>$1</strong>"
        )
        .replace(
            /__(.+?)__/g,
            "<strong>$1</strong>"
        )
        .replace(
            /(?<!\*)\*([^*\n]+?)\*(?!\*)/g,
            "<em>$1</em>"
        )
        .replace(
            /(?<!_)_([^_\n]+?)_(?!_)/g,
            "<em>$1</em>"
        )
        .replace(
            /`([^`\n]+?)`/g,
            "<code>$1</code>"
        );

    return html;
}


/* =========================================================
   LEITURA DOS METADADOS
   ========================================================= */

function separarFrontmatter(markdown) {
    const linhas = markdown
        .replace(/\r\n/g, "\n")
        .split("\n");

    if (linhas[0]?.trim() !== "---") {
        return {
            metadados: {},
            linhas
        };
    }

    const fim = linhas.findIndex(
        (linha, indice) =>
            indice > 0
            && linha.trim() === "---"
    );

    if (fim === -1) {
        return {
            metadados: {},
            linhas
        };
    }

    const metadados = {};

    linhas
        .slice(1, fim)
        .forEach(linha => {
            const separador = linha.indexOf(":");

            if (separador === -1) {
                return;
            }

            const chave = normalizarTexto(
                linha.slice(0, separador)
            ).replace(/\s+/g, "_");

            const valor = linha
                .slice(separador + 1)
                .trim();

            if (chave && valor) {
                metadados[chave] = valor;
            }
        });

    return {
        metadados,
        linhas: linhas.slice(fim + 1)
    };
}


/* =========================================================
   INTERPRETAÇÃO DA ESTRUTURA
   ========================================================= */

function limparMarcacaoTitulo(texto = "") {
    return texto
        .replace(/^#{1,6}\s+/, "")
        .replace(/^\*\*(.+)\*\*$/, "$1")
        .replace(/^__(.+)__$/, "$1")
        .trim();
}


function analisarLinhaComoTitulo(linha) {
    const limpa = linha.trim();

    if (!limpa) {
        return null;
    }

    /*
     * Reconhece títulos Markdown:
     *
     * # Meu Momento com Deus
     * ## 1. Água e Respiração
     */

    const markdown = limpa.match(
        /^#{1,6}\s+(.+)$/
    );

    if (markdown) {
        const titulo = limparMarcacaoTitulo(
            markdown[1]
        );

        const numerado = titulo.match(
            /^(\d+)[.)]\s+(.+)$/
        );

        return {
            numero: numerado?.[1] ?? "",
            titulo:
                numerado?.[2]?.trim()
                ?? titulo
        };
    }

    /*
     * Reconhece títulos numerados sem #:
     *
     * 1. Água e Respiração
     * **1. Água e Respiração**
     */

    const numerado = limpa.match(
        /^(?:\*\*|__)?(\d+)[.)]\s+(.+?)(?:\*\*|__)?$/
    );

    if (numerado) {
        return {
            numero: numerado[1],
            titulo: limparMarcacaoTitulo(
                numerado[2]
            )
        };
    }

    return null;
}


function tituloGenerico(titulo) {
    const normalizado = normalizarTexto(
        titulo
    );

    return [
        "meu momento com deus",
        "meditacao",
        "meditacao do dia",
        "devocional",
        "devocional do dia"
    ].includes(normalizado);
}


function classeDaSecao(titulo) {
    const nome = normalizarTexto(titulo);

    if (nome.includes("versiculo")) {
        return "meditacao__secao--versiculo";
    }

    if (nome.includes("oracao")) {
        return "meditacao__secao--oracao";
    }

    if (nome.includes("semente")) {
        return "meditacao__secao--semente";
    }

    if (nome.includes("essencial")) {
        return "meditacao__secao--essencial";
    }

    return "";
}


/* =========================================================
   BLOCOS DE CONTEÚDO
   ========================================================= */

function quebrarEmBlocos(linhas) {
    const blocos = [];

    let atual = [];

    function finalizar() {
        const texto = atual
            .map(linha => linha.trim())
            .filter(Boolean);

        if (texto.length) {
            blocos.push(texto);
        }

        atual = [];
    }

    linhas.forEach(linha => {
        if (!linha.trim()) {
            finalizar();
            return;
        }

        atual.push(linha);
    });

    finalizar();

    return blocos;
}


function renderizarBloco(bloco) {
    const primeiraLinha = bloco[0].trim();

    /*
     * Citação Markdown
     */

    if (
        bloco.every(
            linha =>
                /^>\s?/.test(linha.trim())
        )
    ) {
        const texto = bloco
            .map(
                linha =>
                    linha
                        .trim()
                        .replace(/^>\s?/, "")
            )
            .join(" ");

        return `
            <blockquote>
                <p>${formatarInline(texto)}</p>
            </blockquote>
        `;
    }

    /*
     * Lista não ordenada
     */

    if (
        bloco.every(
            linha =>
                /^[-*+]\s+/.test(
                    linha.trim()
                )
        )
    ) {
        const itens = bloco
            .map(
                linha => `
                    <li>
                        ${formatarInline(
                            linha
                                .trim()
                                .replace(
                                    /^[-*+]\s+/,
                                    ""
                                )
                        )}
                    </li>
                `
            )
            .join("");

        return `<ul>${itens}</ul>`;
    }

    /*
     * Lista ordenada
     */

    if (
        bloco.every(
            linha =>
                /^\d+[.)]\s+/.test(
                    linha.trim()
                )
        )
    ) {
        const itens = bloco
            .map(
                linha => `
                    <li>
                        ${formatarInline(
                            linha
                                .trim()
                                .replace(
                                    /^\d+[.)]\s+/,
                                    ""
                                )
                        )}
                    </li>
                `
            )
            .join("");

        return `<ol>${itens}</ol>`;
    }

    /*
     * Linha horizontal
     */

    if (
        /^([-*_])\1{2,}$/.test(
            primeiraLinha
        )
    ) {
        return "<hr>";
    }

    /*
     * Parágrafo normal
     */

    const texto = bloco.join(" ");

    return `
        <p>
            ${formatarInline(texto)}
        </p>
    `;
}


/* =========================================================
   EXTRAÇÃO DAS SEÇÕES
   ========================================================= */

function extrairEstrutura(markdown) {
    const {
        metadados,
        linhas
    } = separarFrontmatter(markdown);

    const secoes = [];

    let secaoAtual = null;
    let ultimoTituloNormalizado = "";

    function finalizarSecao() {
        if (!secaoAtual) {
            return;
        }

        const temConteudo =
            secaoAtual.linhas.some(
                linha => linha.trim()
            );

        if (temConteudo) {
            secoes.push(secaoAtual);
        }

        secaoAtual = null;
    }

    for (const linhaOriginal of linhas) {
        const linha = linhaOriginal.trimEnd();

        const candidatoTitulo =
            analisarLinhaComoTitulo(linha);

        if (candidatoTitulo) {
            const tituloNormalizado =
                normalizarTexto(
                    candidatoTitulo.titulo
                );

            /*
             * O título principal do documento
             * não deve virar uma seção.
             */

            if (
                tituloGenerico(
                    candidatoTitulo.titulo
                )
            ) {
                ultimoTituloNormalizado =
                    tituloNormalizado;

                continue;
            }

            /*
             * Evita títulos duplicados seguidos.
             */

            if (
                tituloNormalizado
                === ultimoTituloNormalizado
            ) {
                continue;
            }

            finalizarSecao();

            secaoAtual = {
                numero:
                    candidatoTitulo.numero,
                titulo:
                    candidatoTitulo.titulo,
                linhas: []
            };

            ultimoTituloNormalizado =
                tituloNormalizado;

            continue;
        }

        /*
         * Conteúdo encontrado antes
         * da primeira seção.
         */

        if (!secaoAtual) {
            if (!linha.trim()) {
                continue;
            }

            secaoAtual = {
                numero: "",
                titulo: "",
                linhas: []
            };
        }

        secaoAtual.linhas.push(linha);
    }

    finalizarSecao();

    return {
        metadados,
        secoes
    };
}


/* =========================================================
   RENDERIZAÇÃO DAS SEÇÕES
   ========================================================= */

function renderizarSecao(secao) {
    const classeEspecial =
        classeDaSecao(secao.titulo);

    const blocos =
        quebrarEmBlocos(secao.linhas);

    const corpo = blocos
        .map(renderizarBloco)
        .join("");

    const cabecalho = secao.titulo
        ? `
            <h3 class="meditacao__titulo-secao">

                ${
                    secao.numero
                        ? `
                            <span class="meditacao__numero">
                                ${escaparHTML(secao.numero)}.
                            </span>
                        `
                        : ""
                }

                <span>
                    ${formatarInline(secao.titulo)}
                </span>

            </h3>
        `
        : "";

    return `
        <section
            class="
                meditacao__secao
                ${classeEspecial}
            "
        >
            ${cabecalho}

            <div class="meditacao__corpo">
                ${corpo}
            </div>
        </section>
    `;
}


/* =========================================================
   METADADOS VISUAIS
   ========================================================= */

function procurarMetadado(
    objeto,
    chaves
) {
    for (const chave of chaves) {
        if (objeto[chave]) {
            return objeto[chave];
        }
    }

    return "";
}


function atualizarMetadados(
    metadados
) {
    const clima = procurarMetadado(
        metadados,
        [
            "clima",
            "tempo"
        ]
    );

    const temperatura = procurarMetadado(
        metadados,
        [
            "temperatura",
            "temp"
        ]
    );

    const referencia = procurarMetadado(
        metadados,
        [
            "referencia_biblica",
            "referencia",
            "versiculo"
        ]
    );

    const itens = [
        [
            elementos.clima,
            clima
                ? `☁ ${clima}`
                : ""
        ],
        [
            elementos.temperatura,
            temperatura
                ? `◦ ${temperatura}`
                : ""
        ],
        [
            elementos.referencia,
            referencia
                ? `✦ ${referencia}`
                : ""
        ]
    ];

    let algumVisivel = false;

    itens.forEach(
        ([elemento, valor]) => {
            elemento.textContent = valor;
            elemento.hidden = !valor;

            if (valor) {
                algumVisivel = true;
            }
        }
    );

    elementos.metadados.hidden =
        !algumVisivel;
}


/* =========================================================
   MARCAÇÕES DE TEXTO
   ========================================================= */

function chaveMarcacoes() {
    const data = meditacoes[indiceAtual]?.data || "sem-data";
    return `mmcd:marcacoes:${data}`;
}

function salvarMarcacoes() {
    if (!elementos.conteudo) return;
    localStorage.setItem(chaveMarcacoes(), elementos.conteudo.innerHTML);
}

function restaurarMarcacoes() {
    const html = localStorage.getItem(chaveMarcacoes());
    if (html) elementos.conteudo.innerHTML = html;
}

function marcarSelecao() {
    const selecao = window.getSelection();
    if (!selecao || selecao.isCollapsed || !selecao.rangeCount) {
        window.MMCDUI?.toast?.("Selecione primeiro um trecho da meditação.");
        return;
    }

    const range = selecao.getRangeAt(0);
    const ancestral = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;

    if (!elementos.conteudo.contains(ancestral)) {
        window.MMCDUI?.toast?.("A marcação funciona somente no texto da meditação.");
        return;
    }

    try {
        const marca = document.createElement("mark");
        marca.className = "user-highlight";
        range.surroundContents(marca);
    } catch {
        const fragmento = range.extractContents();
        const marca = document.createElement("mark");
        marca.className = "user-highlight";
        marca.append(fragmento);
        range.insertNode(marca);
    }

    selecao.removeAllRanges();
    salvarMarcacoes();
    window.MMCDUI?.toast?.("Trecho marcado.");
}

function desmarcarTrecho(marca) {
    if (!(marca instanceof HTMLElement) || !marca.matches("mark.user-highlight")) {
        return;
    }

    marca.replaceWith(...marca.childNodes);
    elementos.conteudo.normalize();

    if (elementos.conteudo.querySelector("mark.user-highlight")) {
        salvarMarcacoes();
    } else {
        localStorage.removeItem(chaveMarcacoes());
    }

    window.MMCDUI?.toast?.("Marcação removida deste trecho.");
}

function limparMarcacoes() {
    const marcas = elementos.conteudo.querySelectorAll("mark.user-highlight");

    if (!marcas.length) {
        window.MMCDUI?.toast?.("Não há marcações para remover.");
        return;
    }

    if (!window.confirm("Remover todas as marcações amarelas desta meditação?")) {
        return;
    }

    marcas.forEach(marca => {
        marca.replaceWith(...marca.childNodes);
    });

    elementos.conteudo.normalize();
    localStorage.removeItem(chaveMarcacoes());
    window.MMCDUI?.toast?.("Todas as marcações foram removidas.");
}

/* =========================================================
   NAVEGAÇÃO POR DATA
   ========================================================= */

function encontrarIndice(dataISO) {
    return meditacoes.findIndex(
        meditacao =>
            meditacao.data === dataISO
    );
}


function indiceInicial() {
    if (!meditacoes.length) {
        return -1;
    }

    const hoje = dataHojeISO();

    const indiceHoje =
        encontrarIndice(hoje);

    if (indiceHoje !== -1) {
        return indiceHoje;
    }

    /*
     * Abre a meditação mais recente
     * anterior à data atual.
     */

    for (
        let indice = meditacoes.length - 1;
        indice >= 0;
        indice -= 1
    ) {
        if (
            meditacoes[indice].data
            <= hoje
        ) {
            return indice;
        }
    }

    return 0;
}


function preencherSeletor() {
    elementos.seletorData.replaceChildren();

    [...meditacoes]
        .reverse()
        .forEach(
            (
                meditacao,
                indiceReverso
            ) => {
                const indiceReal =
                    meditacoes.length
                    - 1
                    - indiceReverso;

                const opcao =
                    document.createElement(
                        "option"
                    );

                opcao.value =
                    String(indiceReal);

                opcao.textContent =
                    formatarData(
                        meditacao.data
                    );

                elementos.seletorData
                    .appendChild(opcao);
            }
        );
}


function atualizarNavegacao() {
    elementos.anterior.disabled =
        indiceAtual <= 0;

    elementos.proximo.disabled =
        indiceAtual
        >= meditacoes.length - 1;

    elementos.hoje.disabled =
        !meditacoes.length;
}


function abrirIndice(indice) {
    if (!meditacoes[indice]) {
        return;
    }

    indiceAtual = indice;

    renderizarMeditacao();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
   ========================================================= */

function renderizarVazio() {
    elementos.data.textContent = "";

    elementos.titulo.textContent =
        "Meu Momento com Deus";

    elementos.conteudo.innerHTML = `
        <p class="estado-vazio">
            Nenhuma meditação válida foi encontrada.
            Execute novamente o gerador de dados do livro.
        </p>
    `;

    elementos.metadados.hidden = true;

    elementos.numeroPagina.textContent = "";

    atualizarNavegacao();
}


function renderizarMeditacao() {
    const meditacao =
        meditacoes[indiceAtual];

    if (!meditacao) {
        renderizarVazio();
        return;
    }

    const markdownLimpo = String(meditacao.markdown || "")
        .split("\n")
        .filter(linha => !/^(<{7}|={7}|>{7})(\s.*)?$/.test(linha.trim()))
        .join("\n");

    const estrutura =
        extrairEstrutura(
            markdownLimpo
        );

    /*
     * O título principal do livro é fixo.
     *
     * A primeira seção, como
     * "1. Água e Respiração",
     * nunca será usada como título.
     */

    const titulo =
        "Meu Momento com Deus";

    elementos.data.textContent =
        formatarData(
            meditacao.data
        );

    elementos.titulo.textContent =
        titulo;

    elementos.conteudo.innerHTML =
        estrutura.secoes
            .filter(secao => {
                const titulo = normalizarTexto(secao.titulo || "");
                return !titulo.includes("my prayer in english")
                    && !titulo.includes("english prayer")
                    && !titulo.includes("oracao em ingles");
            })
            .map(renderizarSecao)
            .join("");

    restaurarMarcacoes();

    elementos.numeroPagina.textContent =
        `${indiceAtual + 1} de ${meditacoes.length}`;

    elementos.seletorData.value =
        String(indiceAtual);

    atualizarMetadados(
        estrutura.metadados
    );

    atualizarNavegacao();

    document.title =
        `${titulo} — ${formatarData(meditacao.data)}`;

    localStorage.setItem(
        "ultima-data-lida",
        meditacao.data
    );
}


/* =========================================================
   TEMA
   ========================================================= */

function aplicarTema(tema) {
    const escuro =
        tema === "escuro";

    document.documentElement.dataset.tema = escuro ? "escuro" : "claro";

    document.body.classList.toggle(
        "tema-escuro",
        escuro
    );

    elementos.iconeTema.textContent =
        escuro
            ? "☀"
            : "☾";

    elementos.tema.setAttribute(
        "aria-label",
        escuro
            ? "Ativar tema claro"
            : "Ativar tema escuro"
    );

    elementos.tema.title =
        escuro
            ? "Ativar tema claro"
            : "Ativar tema escuro";

    localStorage.setItem("mmcd:tema", tema);
    localStorage.setItem("tema-livro", tema);
}


/* =========================================================
   EVENTOS
   ========================================================= */

elementos.anterior.addEventListener(
    "click",
    () => {
        abrirIndice(
            indiceAtual - 1
        );
    }
);


elementos.proximo.addEventListener(
    "click",
    () => {
        abrirIndice(
            indiceAtual + 1
        );
    }
);


elementos.hoje.addEventListener(
    "click",
    () => {
        abrirIndice(
            indiceInicial()
        );
    }
);


elementos.seletorData.addEventListener(
    "change",
    () => {
        abrirIndice(
            Number(
                elementos
                    .seletorData
                    .value
            )
        );
    }
);


elementos.tema.addEventListener(
    "click",
    () => {
        const escuro =
            document.body
                .classList
                .contains(
                    "tema-escuro"
                );

        aplicarTema(
            escuro
                ? "claro"
                : "escuro"
        );
    }
);


elementos.marcar?.addEventListener("click", marcarSelecao);

elementos.conteudo?.addEventListener("click", evento => {
    const marca = evento.target.closest?.("mark.user-highlight");

    if (marca && elementos.conteudo.contains(marca)) {
        desmarcarTrecho(marca);
    }
});

elementos.limparMarcas?.addEventListener("click", limparMarcacoes);

/* =========================================================
   NAVEGAÇÃO PELO TECLADO
   ========================================================= */

document.addEventListener(
    "keydown",
    evento => {
        const elementoAtivo =
            document.activeElement;

        const usuarioDigitando =
            elementoAtivo?.matches(
                "input, select, textarea"
            );

        if (usuarioDigitando) {
            return;
        }

        if (
            evento.key
            === "ArrowLeft"
        ) {
            abrirIndice(
                indiceAtual - 1
            );
        }

        if (
            evento.key
            === "ArrowRight"
        ) {
            abrirIndice(
                indiceAtual + 1
            );
        }
    }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function iniciar() {
    const temaSalvo =
        localStorage.getItem("mmcd:tema")
        ?? localStorage.getItem("tema-livro")
        ?? "claro";

    aplicarTema(
        temaSalvo
    );

    if (!meditacoes.length) {
        renderizarVazio();
        return;
    }

    preencherSeletor();

    indiceAtual =
        indiceInicial();

    renderizarMeditacao();
}


try {
    iniciar();
} catch (erro) {
    console.error(
        "Erro ao abrir o livro:",
        erro
    );

    elementos.conteudo.innerHTML = `
        <p class="estado-vazio">
            Não foi possível interpretar esta meditação.
            Consulte o console do navegador pressionando F12.
        </p>
    `;
}