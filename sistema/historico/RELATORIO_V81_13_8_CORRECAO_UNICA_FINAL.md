# V81.13.8 — Inglês / Uma única correção por IA no final

## Decisão
O Inglês deixa de ter correções por IA espalhadas ao longo do estudo.

O novo princípio é:
**primeiro produzir; depois corrigir tudo de uma vez.**

## Fluxo
1. Conversa do Dia
2. Leitura + compreensão
3. Estruturas em novas frases
4. Writing
5. Speaking
6. Prática em Contexto
7. Finalizar inglês e corrigir tudo com IA

## Parte diária
O botão que antes dizia:
`Finalizar atividade e corrigir com IA`

passa a apenas salvar:
`Salvar esta parte do inglês`

Esse passo guarda:
- compreensão;
- estruturas;
- writing;
- speaking/audio.

Nenhuma IA é acionada ali.

## Conversa
A correção separada da conversa deixa de ser conectada à experiência.
As respostas da conversa entram na correção final quando são detectadas na página.

## Prática em contexto
Os roteiros concluídos em `ingles_pratica_v2` entram no material da correção final,
com pergunta, contexto e resposta produzida.

## Correção final
O botão:
`Finalizar inglês e corrigir tudo com IA`

cria um único pedido no Supabase:
`ingles_correcao_final_v81_13_8`

O PC executa o corretor local somente nesse momento.

A IA devolve:
- nota geral;
- gramática;
- vocabulário;
- naturalidade;
- construção;
- clareza;
- correção item a item;
- versão mais natural;
- explicação curta;
- pontos fortes;
- um foco para o próximo dia.

## Speaking
A transcrição do áudio ocorre dentro da correção final.
Depois da correção, o áudio temporário é removido.

## Scheduler
Não existe tarefa verificando pendência a cada 5 minutos.
