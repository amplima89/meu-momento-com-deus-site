# V81.17.6 — Correção no lugar certo

## Resultado da Conversa removido
O bloco local que mostrava notas como 94% foi removido da experiência.

Ele era calculado por regras heurísticas locais e podia entrar em conflito com a
correção real da IA. A Conversa agora apenas registra as respostas e é concluída.

Depois da correção final, a avaliação da IA é sincronizada no histórico da Conversa
para a Evolução continuar tendo uma referência real.

## Correção inline
Depois de finalizar o inglês:

- cada pergunta da Conversa recebe sua correção dentro do próprio card;
- a resposta original continua no campo onde foi escrita;
- logo abaixo aparecem Correção necessária, Forma mais natural e Por quê;
- a análise da Leitura é colocada no final do bloco da própria Leitura;
- a avaliação da gravação também permanece junto da Leitura.

O grande painel final com percentual e cinco barras deixa de ser a tela principal.
No final fica apenas uma confirmação compacta e um ponto de foco.

## Calibração
As notas individuais continuam exigentes:
- gramática;
- vocabulário;
- naturalidade;
- construção;
- clareza.

A nota geral interna deixa de representar perfeição e passa a representar eficácia
de comunicação, com maior peso para clareza.

Pesos:
- Clareza 45%;
- Vocabulário 20%;
- Gramática 15%;
- Naturalidade 10%;
- Construção 10%.

Se a clareza for alta, pequenos erros não derrubam artificialmente o resultado geral.

## Preservado
- Conversa;
- Leitura;
- gravação da Leitura V81.17.5;
- leitura completa pela IA;
- correção sob demanda;
- Evolução;
- logo oficial validada por SHA-256.
