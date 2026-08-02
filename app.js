"use strict";

/* =========================================================
   DADOS E ESTADO
   ========================================================= */

let meditacoes = [...(window.MEDITACOES_DO_LIVRO ?? [])]
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

    narracaoOuvir: $("#narracao-ouvir"),
    narracaoPausar: $("#narracao-pausar"),
    narracaoParar: $("#narracao-parar"),
    narracaoVoz: $("#narracao-voz"),
    narracaoStatus: $("#narracao-status"),

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
   NARRAÇÃO OPCIONAL
   ========================================================= */

const estadoNarracao = {
    suportada:
        "speechSynthesis" in window
        && "SpeechSynthesisUtterance" in window,
    blocos: [],
    indice: 0,
    ativa: false,
    pausada: false,
    aguardandoProximo: false,
    temporizador: null,
    token: 0,
    voz: null
};


function atualizarStatusNarracao(texto) {
    if (elementos.narracaoStatus) {
        elementos.narracaoStatus.textContent = texto;
    }
}


function atualizarControlesNarracao() {
    if (!elementos.narracaoOuvir) {
        return;
    }

    if (!estadoNarracao.suportada) {
        elementos.narracaoOuvir.disabled = true;
        elementos.narracaoPausar.disabled = true;
        elementos.narracaoParar.disabled = true;
        elementos.narracaoVoz.disabled = true;
        atualizarStatusNarracao(
            "A narração não está disponível neste navegador."
        );
        return;
    }

    elementos.narracaoOuvir.disabled = false;
    elementos.narracaoPausar.disabled =
        !estadoNarracao.ativa;
    elementos.narracaoParar.disabled =
        !estadoNarracao.ativa;

    elementos.narracaoOuvir.textContent =
        estadoNarracao.ativa
            ? "↻ Reiniciar"
            : "▶ Ouvir";

    elementos.narracaoPausar.textContent =
        estadoNarracao.pausada
            ? "▶ Continuar"
            : "⏸ Pausar";
}


function pontuarVoz(voz) {
    const nome = normalizarTexto(
        `${voz.name || ""} ${voz.voiceURI || ""}`
    );
    const idioma = String(voz.lang || "")
        .toLowerCase();

    let pontos = 0;

    if (idioma === "pt-br") {
        pontos += 120;
    } else if (idioma.startsWith("pt")) {
        pontos += 80;
    }

    if (
        /(antonio|ant[oô]nio|donato|daniel|felipe|ricardo|jo[aã]o|luciano|paulo|rafael|thiago|carlos|marcos|male|mascul)/i
            .test(nome)
    ) {
        pontos += 55;
    }

    if (
        /(francisca|maria|luciana|helena|vitoria|vit[oó]ria|camila|fernanda|isabela|female|femin)/i
            .test(nome)
    ) {
        pontos -= 35;
    }

    if (voz.localService) {
        pontos += 5;
    }

    return pontos;
}


function vozesDisponiveis() {
    if (!estadoNarracao.suportada) {
        return [];
    }

    return window.speechSynthesis
        .getVoices()
        .filter(voz =>
            String(voz.lang || "")
                .toLowerCase()
                .startsWith("pt")
        )
        .sort((a, b) =>
            pontuarVoz(b) - pontuarVoz(a)
            || a.name.localeCompare(b.name, "pt-BR")
        );
}


function carregarVozesNarracao() {
    if (!elementos.narracaoVoz) {
        return;
    }

    const vozes = vozesDisponiveis();
    const preferidaSalva =
        localStorage.getItem("mmcd:narracao:voz")
        || "";

    elementos.narracaoVoz.replaceChildren();

    const automatica =
        document.createElement("option");
    automatica.value = "";
    automatica.textContent =
        "Automática — grave";
    elementos.narracaoVoz.appendChild(
        automatica
    );

    vozes.forEach(voz => {
        const opcao =
            document.createElement("option");

        opcao.value =
            voz.voiceURI || voz.name;
        opcao.textContent =
            `${voz.name} (${voz.lang})`;

        elementos.narracaoVoz.appendChild(
            opcao
        );
    });

    if (
        preferidaSalva
        && [...elementos.narracaoVoz.options]
            .some(opcao =>
                opcao.value === preferidaSalva
            )
    ) {
        elementos.narracaoVoz.value =
            preferidaSalva;
    }

    escolherVozNarracao();
}


function escolherVozNarracao() {
    const vozes = vozesDisponiveis();
    const escolha =
        elementos.narracaoVoz?.value
        || "";

    estadoNarracao.voz =
        vozes.find(voz =>
            (voz.voiceURI || voz.name)
            === escolha
        )
        || vozes[0]
        || window.speechSynthesis
            ?.getVoices()
            ?.find(voz =>
                String(voz.lang || "")
                    .toLowerCase()
                    .startsWith("pt")
            )
        || null;

    if (escolha) {
        localStorage.setItem(
            "mmcd:narracao:voz",
            escolha
        );
    } else {
        localStorage.removeItem(
            "mmcd:narracao:voz"
        );
    }
}


function limparTextoParaNarracao(texto = "") {
    return String(texto)
        /* Imagens Markdown e endereços não devem ser pronunciados. */
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/https?:\/\/\S+/gi, " ")
        /* Remove emojis, pictogramas, variações e junções visuais. */
        .replace(/[\u2600-\u27BF]/g, " ")
        .replace(/[\u{1F000}-\u{1FAFF}]/gu, " ")
        .replace(/[\uFE0E\uFE0F\u200D]/g, "")
        .replace(/\s+/g, " ")
        .replace(/\s+([,.;:!?…])/g, "$1")
        .trim();
}


function textoDoElementoParaNarracao(elemento) {
    const copia = elemento.cloneNode(true);

    copia.querySelectorAll(
        [
            "img",
            "picture",
            "svg",
            "figure",
            "figcaption",
            "canvas",
            "video",
            "audio",
            "iframe",
            "object",
            "embed",
            "button",
            "select",
            "option",
            "[role='img']",
            "[aria-hidden='true']",
            ".meditacao__numero"
        ].join(",")
    ).forEach(item => item.remove());

    return limparTextoParaNarracao(
        copia.innerText
        || copia.textContent
        || ""
    );
}


function garantirPausaTextual(texto) {
    const limpo = texto.trim();

    if (!limpo) {
        return "";
    }

    if (/[.!?…][\"'”’)}\]]*$/.test(limpo)) {
        return limpo;
    }

    /*
     * Vírgula, dois-pontos e ponto e vírgula no fim nem sempre
     * geram uma pausa perceptível nas vozes do navegador.
     */
    return `${limpo.replace(/[,;:]+$/, "").trim()}.`;
}


function coletarBlocosNarracao() {
    if (!elementos.conteudo) {
        return [];
    }

    const nos = [...elementos.conteudo.querySelectorAll(
        "h1, h2, h3, h4, p, li, blockquote"
    )].filter(no => {
        /* O parágrafo interno de um blockquote seria lido duas vezes. */
        if (
            no.matches("p")
            && no.closest("blockquote")
        ) {
            return false;
        }

        return true;
    });

    return nos
        .map(no => {
            const texto = garantirPausaTextual(
                textoDoElementoParaNarracao(no)
            );

            let pausa = 460;

            if (no.matches("h1, h2, h3, h4")) {
                pausa = 760;
            } else if (no.matches("blockquote")) {
                pausa = 620;
            } else if (no.matches("li")) {
                pausa = 340;
            }

            return {
                texto,
                pausa
            };
        })
        .filter(bloco => bloco.texto);
}


function dividirTextoNarracao(
    texto,
    limite = 320
) {
    const sentencas =
        texto.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)
        || [texto];

    const partes = [];
    let atual = "";

    function adicionarAtual() {
        const pronto = garantirPausaTextual(
            atual.trim()
        );

        if (pronto) {
            partes.push(pronto);
        }

        atual = "";
    }

    sentencas.forEach(sentenca => {
        const limpa = sentenca.trim();

        if (!limpa) {
            return;
        }

        if (
            atual
            && `${atual} ${limpa}`.length > limite
        ) {
            adicionarAtual();
        }

        if (limpa.length <= limite) {
            atual = atual
                ? `${atual} ${limpa}`
                : limpa;
            return;
        }

        adicionarAtual();

        const palavras = limpa.split(/\s+/);
        let parte = "";

        palavras.forEach(palavra => {
            if (
                parte
                && `${parte} ${palavra}`.length > limite
            ) {
                partes.push(
                    garantirPausaTextual(parte)
                );
                parte = palavra;
            } else {
                parte = parte
                    ? `${parte} ${palavra}`
                    : palavra;
            }
        });

        if (parte) {
            partes.push(
                garantirPausaTextual(parte)
            );
        }
    });

    adicionarAtual();

    return partes;
}


function prepararBlocosNarracao() {
    return coletarBlocosNarracao()
        .flatMap(bloco => {
            const partes = dividirTextoNarracao(
                bloco.texto
            );

            return partes.map((texto, indice) => ({
                texto,
                pausa:
                    indice === partes.length - 1
                        ? bloco.pausa
                        : 180
            }));
        });
}


function limparTemporizadorNarracao() {
    if (estadoNarracao.temporizador) {
        window.clearTimeout(
            estadoNarracao.temporizador
        );
        estadoNarracao.temporizador = null;
    }
}


function pararNarracao(
    atualizarMensagem = true
) {
    if (!estadoNarracao.suportada) {
        return;
    }

    estadoNarracao.token += 1;
    estadoNarracao.ativa = false;
    estadoNarracao.pausada = false;
    estadoNarracao.aguardandoProximo = false;
    estadoNarracao.blocos = [];
    estadoNarracao.indice = 0;

    limparTemporizadorNarracao();
    window.speechSynthesis.cancel();

    if (atualizarMensagem) {
        atualizarStatusNarracao(
            "Narração interrompida."
        );
    }

    atualizarControlesNarracao();
}


function agendarProximoBloco(token, pausa) {
    estadoNarracao.aguardandoProximo = true;
    limparTemporizadorNarracao();

    if (estadoNarracao.pausada) {
        return;
    }

    estadoNarracao.temporizador = window.setTimeout(
        () => {
            estadoNarracao.temporizador = null;
            estadoNarracao.aguardandoProximo = false;
            falarProximoBloco(token);
        },
        pausa
    );
}


function falarProximoBloco(token) {
    if (
        !estadoNarracao.ativa
        || estadoNarracao.pausada
        || token !== estadoNarracao.token
    ) {
        return;
    }

    if (
        estadoNarracao.indice
        >= estadoNarracao.blocos.length
    ) {
        estadoNarracao.ativa = false;
        estadoNarracao.pausada = false;
        estadoNarracao.aguardandoProximo = false;

        atualizarStatusNarracao(
            "Narração concluída."
        );
        atualizarControlesNarracao();
        return;
    }

    const bloco =
        estadoNarracao.blocos[
            estadoNarracao.indice
        ];

    const fala =
        new SpeechSynthesisUtterance(
            bloco.texto
        );

    fala.lang =
        estadoNarracao.voz?.lang
        || "pt-BR";
    fala.voice =
        estadoNarracao.voz;
    fala.rate = 0.86;
    fala.pitch = 0.74;
    fala.volume = 1;

    fala.onstart = () => {
        atualizarStatusNarracao(
            `Ouvindo ${estadoNarracao.indice + 1} de ${estadoNarracao.blocos.length}…`
        );
    };

    fala.onend = () => {
        if (
            token !== estadoNarracao.token
            || !estadoNarracao.ativa
        ) {
            return;
        }

        estadoNarracao.indice += 1;
        agendarProximoBloco(
            token,
            bloco.pausa
        );
    };

    fala.onerror = evento => {
        if (
            ["canceled", "interrupted"]
                .includes(evento.error)
        ) {
            return;
        }

        console.error(
            "Erro na narração:",
            evento.error
        );

        estadoNarracao.ativa = false;
        estadoNarracao.pausada = false;
        estadoNarracao.aguardandoProximo = false;
        limparTemporizadorNarracao();

        atualizarStatusNarracao(
            "Não foi possível continuar a narração."
        );
        atualizarControlesNarracao();
    };

    window.speechSynthesis.speak(fala);
}


function iniciarNarracao() {
    if (!estadoNarracao.suportada) {
        atualizarControlesNarracao();
        return;
    }

    const blocos = prepararBlocosNarracao();

    if (!blocos.length) {
        atualizarStatusNarracao(
            "Não há texto disponível para narrar."
        );
        return;
    }

    pararNarracao(false);
    escolherVozNarracao();

    estadoNarracao.blocos = blocos;
    estadoNarracao.indice = 0;
    estadoNarracao.ativa = true;
    estadoNarracao.pausada = false;
    estadoNarracao.aguardandoProximo = false;
    estadoNarracao.token += 1;

    const token = estadoNarracao.token;

    atualizarControlesNarracao();
    falarProximoBloco(token);
}


function alternarPausaNarracao() {
    if (
        !estadoNarracao.suportada
        || !estadoNarracao.ativa
    ) {
        return;
    }

    if (estadoNarracao.pausada) {
        estadoNarracao.pausada = false;

        if (estadoNarracao.aguardandoProximo) {
            estadoNarracao.aguardandoProximo = false;
            agendarProximoBloco(
                estadoNarracao.token,
                180
            );
        } else {
            window.speechSynthesis.resume();
        }

        atualizarStatusNarracao(
            `Ouvindo ${estadoNarracao.indice + 1} de ${estadoNarracao.blocos.length}…`
        );
    } else {
        estadoNarracao.pausada = true;
        limparTemporizadorNarracao();
        window.speechSynthesis.pause();

        atualizarStatusNarracao(
            "Narração pausada."
        );
    }

    atualizarControlesNarracao();
}


/* =========================================================
   DESTAQUES PESSOAIS — SOMENTE NESTE NAVEGADOR
   ========================================================= */

function chaveDestaquesMeditacao() {
    const data =
        meditacoes[indiceAtual]?.data;

    return data
        ? `mmcd:destaques:${data}`
        : "";
}


function lerDestaquesLocais() {
    const chave =
        chaveDestaquesMeditacao();

    if (!chave) {
        return [];
    }

    try {
        const valor =
            JSON.parse(
                localStorage.getItem(chave)
                || "[]"
            );

        if (!Array.isArray(valor)) {
            return [];
        }

        return valor
            .filter(item =>
                item
                && Number.isInteger(item.inicio)
                && Number.isInteger(item.fim)
                && item.fim > item.inicio
                && typeof item.texto === "string"
            )
            .sort((a, b) =>
                a.inicio - b.inicio
            );
    } catch {
        return [];
    }
}


function salvarDestaquesLocais(
    destaques
) {
    const chave =
        chaveDestaquesMeditacao();

    if (!chave) {
        return;
    }

    if (!destaques.length) {
        localStorage.removeItem(chave);
        return;
    }

    localStorage.setItem(
        chave,
        JSON.stringify(destaques)
    );
}


function offsetGlobalNoConteudo(
    node,
    offset
) {
    const range =
        document.createRange();

    range.selectNodeContents(
        elementos.conteudo
    );

    try {
        range.setEnd(node, offset);
        return range.toString().length;
    } catch {
        return -1;
    }
}


function posicaoPorOffset(
    offset
) {
    const walker =
        document.createTreeWalker(
            elementos.conteudo,
            NodeFilter.SHOW_TEXT
        );

    let acumulado = 0;
    let node;

    while ((node = walker.nextNode())) {
        const proximo =
            acumulado
            + node.nodeValue.length;

        if (offset <= proximo) {
            return {
                node,
                offset:
                    Math.max(
                        0,
                        offset - acumulado
                    )
            };
        }

        acumulado = proximo;
    }

    return null;
}


function criarRangePorOffsets(
    inicio,
    fim
) {
    const comeco =
        posicaoPorOffset(inicio);
    const termino =
        posicaoPorOffset(fim);

    if (!comeco || !termino) {
        return null;
    }

    const range =
        document.createRange();

    try {
        range.setStart(
            comeco.node,
            comeco.offset
        );
        range.setEnd(
            termino.node,
            termino.offset
        );
        return range;
    } catch {
        return null;
    }
}


function aplicarMarcaAoRange(
    range,
    id
) {
    const marca =
        document.createElement("mark");

    marca.className =
        "reflection-highlight";
    marca.dataset.highlightId = id;

    try {
        range.surroundContents(marca);
    } catch {
        const fragmento =
            range.extractContents();

        marca.append(fragmento);
        range.insertNode(marca);
    }

    return marca;
}


function restaurarDestaquesLocais() {
    const destaques =
        lerDestaquesLocais()
            .sort((a, b) =>
                b.inicio - a.inicio
            );

    destaques.forEach(destaque => {
        const range =
            criarRangePorOffsets(
                destaque.inicio,
                destaque.fim
            );

        if (!range) {
            return;
        }

        const textoAtual =
            range.toString();

        if (
            textoAtual
            !== destaque.texto
        ) {
            return;
        }

        aplicarMarcaAoRange(
            range,
            destaque.id
        );
    });
}


function rangeCruzaDestaque(
    range
) {
    return [
        ...elementos.conteudo
            .querySelectorAll(
                "mark.reflection-highlight"
            )
    ].some(marca => {
        try {
            return range.intersectsNode(marca);
        } catch {
            return false;
        }
    });
}


function novoIdDestaque() {
    return window.crypto?.randomUUID?.()
        || `destaque-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;
}


function marcarSelecao() {
    const selecao =
        window.getSelection();

    if (
        !selecao
        || selecao.isCollapsed
        || !selecao.rangeCount
    ) {
        window.MMCDUI?.toast?.(
            "Selecione primeiro um trecho da meditação."
        );
        return;
    }

    const range =
        selecao.getRangeAt(0);

    const ancestral =
        range.commonAncestorContainer
            .nodeType
            === Node.ELEMENT_NODE
            ? range.commonAncestorContainer
            : range.commonAncestorContainer
                .parentElement;

    if (
        !ancestral
        || !elementos.conteudo
            .contains(ancestral)
    ) {
        window.MMCDUI?.toast?.(
            "O destaque funciona somente no texto da meditação."
        );
        return;
    }

    if (rangeCruzaDestaque(range)) {
        window.MMCDUI?.toast?.(
            "Esse trecho já cruza um destaque existente."
        );
        return;
    }

    const inicio =
        offsetGlobalNoConteudo(
            range.startContainer,
            range.startOffset
        );
    const fim =
        offsetGlobalNoConteudo(
            range.endContainer,
            range.endOffset
        );
    const texto =
        range.toString();

    if (
        inicio < 0
        || fim <= inicio
        || !texto.trim()
    ) {
        window.MMCDUI?.toast?.(
            "Não foi possível destacar essa seleção."
        );
        return;
    }

    const id =
        novoIdDestaque();

    aplicarMarcaAoRange(range, id);

    const destaques =
        lerDestaquesLocais();

    destaques.push({
        id,
        inicio,
        fim,
        texto
    });

    salvarDestaquesLocais(
        destaques
    );

    selecao.removeAllRanges();

    window.MMCDUI?.toast?.(
        "Destaque salvo somente neste navegador."
    );
}


function desmarcarTrecho(
    marca
) {
    if (
        !(marca instanceof HTMLElement)
        || !marca.matches(
            "mark.reflection-highlight"
        )
    ) {
        return;
    }

    const id =
        marca.dataset.highlightId;

    marca.replaceWith(
        ...marca.childNodes
    );
    elementos.conteudo.normalize();

    const restantes =
        lerDestaquesLocais()
            .filter(item =>
                item.id !== id
            );

    salvarDestaquesLocais(
        restantes
    );

    window.MMCDUI?.toast?.(
        "Destaque removido."
    );
}


function limparMarcacoes() {
    const marcas =
        elementos.conteudo
            .querySelectorAll(
                "mark.reflection-highlight"
            );

    if (!marcas.length) {
        window.MMCDUI?.toast?.(
            "Não há destaques para remover."
        );
        return;
    }

    if (
        !window.confirm(
            "Remover todos os destaques amarelos desta meditação?"
        )
    ) {
        return;
    }

    marcas.forEach(marca => {
        marca.replaceWith(
            ...marca.childNodes
        );
    });

    elementos.conteudo.normalize();

    const chave =
        chaveDestaquesMeditacao();

    if (chave) {
        localStorage.removeItem(chave);
    }

    window.MMCDUI?.toast?.(
        "Todos os destaques foram removidos."
    );
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
    pararNarracao(false);

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

    restaurarDestaquesLocais();

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


elementos.narracaoOuvir?.addEventListener(
    "click",
    iniciarNarracao
);

elementos.narracaoPausar?.addEventListener(
    "click",
    alternarPausaNarracao
);

elementos.narracaoParar?.addEventListener(
    "click",
    () => pararNarracao(true)
);

elementos.narracaoVoz?.addEventListener(
    "change",
    escolherVozNarracao
);

if (estadoNarracao.suportada) {
    window.speechSynthesis.addEventListener?.(
        "voiceschanged",
        carregarVozesNarracao
    );

    window.speechSynthesis.onvoiceschanged =
        carregarVozesNarracao;
}

window.addEventListener(
    "pagehide",
    () => pararNarracao(false)
);

elementos.marcar?.addEventListener(
    "click",
    marcarSelecao
);

elementos.conteudo?.addEventListener(
    "click",
    evento => {
        const marca =
            evento.target.closest?.(
                "mark.reflection-highlight"
            );

        if (
            marca
            && elementos.conteudo
                .contains(marca)
        ) {
            desmarcarTrecho(marca);
        }
    }
);

elementos.limparMarcas?.addEventListener(
    "click",
    limparMarcacoes
);

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

async function iniciar() {
    const temaSalvo =
        localStorage.getItem("mmcd:tema")
        ?? localStorage.getItem("tema-livro")
        ?? "claro";

    aplicarTema(
        temaSalvo
    );

    atualizarControlesNarracao();
    carregarVozesNarracao();

    if (window.MMCD?.listarMeditacoes) {
        meditacoes = await window.MMCD.listarMeditacoes();
    }

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