# V81.4.9 — Abono laranja em Atividades

## Ajuste visual
O abono ainda aparecia em verde dentro da tela de Atividades, apesar de o padrão desejado ser laranja.

A V81.4.9 aplica laranja `#F59E0B` em:
- pontos de abono no calendário;
- badge `ABONADA`;
- motivo do abono;
- botão `A Abonado`;
- quadrado `A` da direita;
- abonos das metas semanais flexíveis.

## Centralização
O botão quadrado `A` da direita não possuía uma regra explícita de centralização.
Agora usa `display:grid` + `place-items:center`, sem padding, garantindo o A no centro.

## Sem alteração
Atividades concluídas continuam verdes.
O laranja é exclusivo para abono.
