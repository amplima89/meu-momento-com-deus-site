# V81.11.2 — Abono atualiza Plano Semanal e histórico

## Sintoma
Os abonos já preservavam a sequência na regra interna, mas o **Plano Semanal**
continuava mostrando `×` nos dias abonados.

## Causa
A V81.11.1 tinha duas regras diferentes:

- `workoutExcuseInfo()` — reconhecia somente o abono diretamente ligado ao treino;
- `workoutConstancyExcuseInfo()` — reconhecia também o **dia abonado em Atividades**.

A sequência usava a segunda regra, mas as telas ainda usavam a primeira.

Por isso o cálculo podia estar preservado e, visualmente, QUI/SEX continuavam como faltas.

## Correção
As telas e estatísticas passam a usar a mesma regra efetiva da sequência:

`workoutConstancyExcuseInfo()`

Isso atualiza:
- Plano Semanal;
- tela do dia selecionado;
- calendário mensal;
- histórico;
- detalhe do histórico;
- planejados do mês;
- indicadores de evolução.

## Resultado esperado
Um dia abonado em Atividades:
- aparece como **A / Abonado** em Treinos;
- não aparece como `×`;
- não quebra a sequência;
- não soma como treino realizado;
- não entra como falta nas estatísticas.

## Preservado
Nenhuma regra de:
- pular exercício;
- finalizar treino;
- agachamentos removidos;
- exemplos Início/Fim;
- histórico V81.8;
- catálogo;
- check reversível

foi alterada.
