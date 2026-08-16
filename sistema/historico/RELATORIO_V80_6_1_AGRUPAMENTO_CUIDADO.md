# V80.6.1 — Agrupamento do Cuidado

## Causa
A V80.6 tinha dois problemas de experiência:
1. somente a pequena seta controlava o agrupamento;
2. `careActive || saved` forçava o grupo a abrir novamente sempre que a página atual pertencia a Cuidado.

Por isso, visualmente o grupo parecia nunca recolher.

## Comportamento corrigido
- Fora de Cuidado: clicar em **Cuidado** abre o **Mapa de Cuidado** e expande o grupo.
- Dentro de Cuidado: clicar no card **Cuidado** abre/recolhe o grupo.
- Se o usuário recolher, o estado é preservado mesmo permanecendo em uma página de Cuidado.
- Os filhos continuam subordinados visualmente ao grupo.
