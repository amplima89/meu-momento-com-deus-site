# V81.13.5 — Correção de Inglês resposta por resposta

## Problema observado
O Resultado da Conversa estava funcionando mais como avaliação geral do que como
correção pedagógica.

Era possível receber notas acima de 90% em gramática/naturalidade mesmo com vários
erros objetivos, e a área `Como ficaria mais natural` mostrava apenas uma frase.

## Nova regra
A correção detalhada separa:
- ser entendível;
- estar gramaticalmente correto;
- soar natural.

Clareza pode ficar alta mesmo quando gramática estiver mais baixa.

## Para cada resposta
A IA mostra:
1. Sua resposta;
2. erros específicos;
3. Correção necessária;
4. Versão mais natural;
5. explicação curta.

## Notas
Gramática 90–100 passa a significar praticamente ausência de erros.
Vários erros recorrentes devem reduzir a nota mesmo quando a mensagem é entendida.

## Execução
Continua sob demanda.
Não há tarefa de Windows verificando o Inglês a cada 5 minutos.

No Resultado da Conversa aparece:
`Corrigir minhas respostas com IA`

No PC, esse botão salva o pedido no Supabase e aciona o corretor local oculto.
