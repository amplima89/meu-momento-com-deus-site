# V81.4.4 — Instalador do Catálogo corrigido

## O que falhou na V81.4.3
A V81.4.1 usava uma expressão ampla para localizar o JavaScript principal de Treinos:

`treinos-v...`

Como `treinos-visuais-v...` também começa com `treinos-v`, a atualização podia substituir
a linha da biblioteca visual pelo próprio JavaScript principal.

Depois disso, as versões V81.4.2 e V81.4.3 procuravam uma referência
`treinos-visuais-v...` que já não existia mais na página.

Por isso a V81.4.3 conseguiu copiar os arquivos, mas a validação encontrou:
- biblioteca visual ausente;
- ordem Visuais → Catálogo → Principal inválida.

A publicação no GitHub não foi executada porque a validação interrompeu o processo antes.

## Correção da V81.4.4
O instalador não tenta mais "adivinhar" e substituir referências antigas.

Ele reconstrói o bloco de carregamento:
1. remove somente referências antigas do JS visual, catálogo e JS principal;
2. preserva `treinos-data-*`, `treinos-guiado-*` e os demais scripts;
3. insere explicitamente, uma única vez e nesta ordem:
   - `treinos-visuais-v81-4-4.js`
   - `treinos-catalogo-v81-4-4.js`
   - `treinos-v81-4-4.js`
4. se a página usa `loadScript()`, insere as três linhas logo após `treinos-data-*`;
5. se não usa `loadScript()`, insere `<script>` antes de `</body>`;
6. remove CSS incremental antigo e instala uma única referência da V81.4.4.

## Funcionalidade preservada
A V81.4.4 mantém tudo que existia na V81.4.3:
- check reversível;
- finalização manual do treino;
- catálogo local;
- biblioteca Free Exercise DB em runtime;
- filtros vivos;
- 24 cards por lote;
- fotos de início e fim;
- orientação em português;
- substituição do exercício no plano.
