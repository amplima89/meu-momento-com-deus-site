# V81.4.1 — Marcação do treino no celular

## Problema observado
Depois de iniciar a musculação, os cards apareciam fechados e o único controle visível
era a seta. Para concluir uma série era necessário abrir o exercício e informar carga.
Na prática isso deixou a ação principal — marcar o que foi feito — escondida.

## Correção
- cada exercício ganha um botão `○` sempre visível;
- tocar no `○` conclui o exercício inteiro com os valores já preenchidos;
- ao concluir, vira `✓`;
- o primeiro exercício pendente abre automaticamente ao iniciar/reabrir o treino;
- as cargas e repetições do último treino são carregadas automaticamente como ponto de partida;
- se o exercício ainda não possui nenhuma carga anterior, o botão abre o exercício,
  pede a carga da primeira vez e posiciona o cursor no campo;
- depois de concluir, o próximo exercício é aberto automaticamente;
- ao chegar a 100%, o fechamento automático do treino continua funcionando.

A seta continua disponível para editar carga, repetições e séries individualmente.

## Objetivo
No treino normal, o fluxo passa a ser:
1. alterar a carga somente se mudou;
2. tocar `○`;
3. seguir para o próximo exercício.

O registro detalhado continua disponível, mas não fica mais no caminho da marcação diária.
