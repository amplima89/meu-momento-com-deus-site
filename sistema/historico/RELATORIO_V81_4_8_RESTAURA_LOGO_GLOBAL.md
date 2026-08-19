# V81.4.8 — Restauração global da logo oficial

## Sintoma
No celular, a logo do Memory passou a aparecer como imagem quebrada:
- topo da aplicação;
- botão Memory da navegação inferior;
- imagem principal da página Memory.

Isso indica falha no carregamento do asset, não uma distorção visual.

## Estratégia da correção
A V81.4.8 deixa de depender do mesmo nome de arquivo que já ficou quebrado/cacheado.

Novo asset canônico:
`assets/imagens/memory-mark-official-v81-4-8.png`

Novo ícone canônico:
`assets/imagens/memory-icon-official-v81-4-8.png`

A logo é exatamente a logo oficial já aprovada anteriormente.
SHA-256 do mark oficial:
`11889b6e4aacb1b6c46b077139ca17abeee8f5e05215439da55447577e8d5b68`

SHA-256 do ícone oficial:
`f0cfb24420f2f63a3c876c167c659d145a08370cc40edf92e7efcd62a7bb5242`

## Compatibilidade
Também são recriados os aliases antigos:
- `memory-mark-official-v80-1.png`
- `memory-mark-v62.png`
- `memory-icon-official-v80-1.png`

Assim uma tela antiga não fica sem logo mesmo se ainda usar uma referência anterior.

## Correção global
O instalador:
1. cria backup;
2. recopia os assets oficiais;
3. procura referências antigas em HTML, JS, CSS, JSON e webmanifest;
4. troca referências da marca pelo novo nome V81.4.8;
5. corrige especificamente imagens com alt `Logo oficial do Memory`;
6. atualiza os ícones PWA;
7. força novo cache das referências locais JS/CSS;
8. valida hashes e referências antes de publicar.

A correção é propositalmente global para impedir que uma atualização isolada de
Treinos, Inglês ou Financeiro volte a deixar partes do site apontando para um logo antigo.
