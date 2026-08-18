# V81.4 — Sincronização de Atividades

## O que estava errado

### Bíblia
O check de capítulo concluído era salvo em `biblia_progresso_v2`, porém não existia integração
com `registros_atividades`. Por isso a leitura podia estar correta na Bíblia e continuar aberta
em Atividades.

### Inglês
Conversa e Prática eram salvas em chaves próprias, mas não concluíam a atividade do dia.
A etapa Leitura também não possuía um check persistente.

### Treinos
A integração automática de Treinos com Atividades rejeitava qualquer sessão cujo tipo não fosse
`musculacao`. Futebol e Cardio ficavam de fora.

No Futebol havia ainda um problema de uso: sem iniciar a sessão no celular, não existia registro
para o calendário considerar o jogo realizado.

## Correções

- Bíblia concluída passa a concluir `Ler a bíblia` em Atividades.
- Ao abrir Atividades ou Bíblia, o Memory reconcilia leituras recentes já salvas.
- Inglês passa a exigir Conversa + Leitura + Prática.
- A Leitura recebe `Marcar leitura concluída`.
- Para datas passadas anteriores à V81.4, Conversa + Prática concluídas são usadas para reconciliar
  a rotina antiga, pois não existia check de Leitura.
- Futebol e Cardio entram na integração Treinos → Atividades.
- Futebol prefere uma meta específica com nome `Futebol`.
- No dia do jogo existe `JOGUEI · REGISTRAR SEM CELULAR`.
- Em uma data passada existe `REGISTRAR QUE JOGUEI`.
- O registro sem celular cria uma sessão concluída sem cronômetro, início ou checklist.
- Se Futebol já tiver sido marcado em Atividades, Treinos recupera a sessão histórica.
- Corrigida a ordem de renderização do histórico de Treinos, que antes deixava o bloco histórico
  inacessível por causa de um `return` anterior.
- A correção de Atos da V81.3.1 é preservada.
- A prática intensiva V81.3 é preservada.
