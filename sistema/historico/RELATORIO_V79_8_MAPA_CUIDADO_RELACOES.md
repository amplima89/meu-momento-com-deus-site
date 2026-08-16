# V79.8 — Mapa de Cuidado e relações

## Regra estrutural
Qualquer alteração persistida nas fontes de Cuidado deve tornar o mapa elegível a uma nova leitura.

## Relações
- Minhas Orações → Espiritual; quando houver pessoa → Relacionamentos; respondidas → Memórias.
- Círculo de Cuidado → Relacionamentos.
- Boas Ações → Relacionamentos + Memórias; categoria Trabalho → Desenvolvimento.
- Testemunhos → Espiritual + Memórias.
- Aniversários → Relacionamentos + Memórias.

## Sincronização
O `MemoryCare.write()` dispara:
1. evento `memory:care-changed`;
2. revisão em `localStorage`;
3. `BroadcastChannel("memory-care")`.

Isso permite atualização da aba atual, atualização entre abas e nova leitura ao voltar para o Mapa de Cuidado.

## Importante
O mapa continua sendo uma leitura de sinais dos próprios registros, não um diagnóstico e não uma pontuação de valor pessoal.
