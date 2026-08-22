# V81.11.1 — Pular exercício/atividade sem invalidar o treino

## Correção da interpretação
A V81.11 havia criado "Pular treino". Isso não era o comportamento desejado.

A regra correta é:

- o treino continua existindo normalmente;
- dentro dele, um exercício ou uma etapa pode ser marcada como `Pulado`;
- `Pulado` não significa `Concluído`;
- para o progresso do treino, `Concluído` e `Pulado` contam como etapas resolvidas;
- ao finalizar o treino, o treino inteiro fica `Concluído`, desde que tenha havido esforço real;
- se todas as etapas forem puladas, o Memory não converte isso em treino concluído;
- é possível desfazer o pulo de uma etapa.

## Exercícios de musculação
Cada exercício recebe:
- botão `Pular`;
- estado visual laranja;
- botão `Desfazer pulo`.

As séries já realizadas ficam preservadas caso o usuário pare um exercício no meio.

## Cardio / aquecimento / protocolo
As etapas de checklist também podem ser puladas individualmente.

## Abonos e sequência do treino
A regra anterior de constância foi restaurada e ampliada.

A sequência é preservada quando:
1. a atividade diretamente ligada ao treino está abonada; ou
2. o dia inteiro em Atividades está resolvido (todas concluídas ou abonadas) e existe ao menos um abono.

Isso corrige o caso em que dois dias foram abonados em Atividades, mas Treinos interpretou esses dias como quebra da sequência.

Abono não soma treino realizado; apenas evita quebrar a sequência.

## Agachamentos
Exercícios cujo nome contém `Agachamento` ou `Squat` são removidos do plano atual e da sessão aberta de hoje.
Histórico antigo permanece intacto.

## Exemplos
Mantida a correção para:
- resolver o exercício pelo plano ou pela sessão;
- procurar guia pelo nome canônico;
- mostrar Início/Fim;
- carregar Visuais → Catálogo → Principal.
