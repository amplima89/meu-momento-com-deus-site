# V81.17.5 — Gravador da Leitura forçado

## Problema
O arquivo do gravador existia, mas sua montagem dependia de duas condições frágeis:
1. a referência do script precisava ser inserida no `ingles.html` por uma correspondência exata;
2. o JS procurava apenas o layout `[data-english-reading-clean]` com `.english-reading-clean__text`.

Se a página estivesse com uma variação de HTML/cache/layout, o botão não aparecia.

## Correção
A V81.17.5 cria um gravador resiliente:

- injeta JS/CSS independentemente da indentação/ordem das tags;
- usa `MutationObserver`;
- reage a `memory:english-reading-ready`;
- tenta montar em 3 estruturas:
  - `[data-english-reading-clean]`;
  - `[data-lesson-kind="reading"]`;
  - `#ingles-conteudo`;
- tenta novamente após carregamento tardio;
- preserva a mesma chave de áudio da V81.17.1 para não perder gravações já salvas;
- a correção final consulta explicitamente o gravador V81.17.5.

## Mantido
- Conversa + Leitura;
- sem terceira etapa;
- gravação opcional;
- avaliação oral separada da nota geral;
- logo oficial validada por SHA-256.
