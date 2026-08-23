# V81.13.4 — Inglês / Correção sob demanda

## Decisão
A verificação automática de atividades pendentes a cada 5 minutos foi removida.

## Novo fluxo no PC
1. O usuário responde a atividade.
2. Toca em `Finalizar atividade e corrigir com IA`.
3. O Memory valida e salva a atividade no Supabase.
4. Somente depois de confirmar que a atividade entrou como pendente, a ponte V81.13.4
   chama `memory-ingles://corrigir`.
5. O Windows executa o corretor local oculto.
6. A página continua verificando apenas o RESULTADO enquanto estiver aberta.

Ou seja: não existe mais tarefa do Windows procurando pendências durante o dia.

## Pendência antiga
Se uma atividade já estiver pendente ao abrir a página no PC, aparece:
`Corrigir agora com IA`

## Celular
A chave OpenAI continua protegida no PC.

Por isso, no celular a atividade pode ser finalizada e salva, mas o processo nativo de
correção não pode ser iniciado diretamente no computador remoto.

Para correção instantânea também no celular, a arquitetura futura deve mover o corretor
para uma função server-side (por exemplo Supabase Edge Function) com a chave OpenAI
guardada como secret.

## Preservado
- conteúdo do Inglês;
- Conversa;
- Leitura;
- Writing;
- Speaking;
- Prática Intensiva;
- fila no Supabase;
- corretor existente;
- chave OpenAI fora do site.
