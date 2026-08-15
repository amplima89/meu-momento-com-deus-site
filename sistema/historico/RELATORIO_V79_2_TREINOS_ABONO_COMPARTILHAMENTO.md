# Memory V79.2 — Treinos, abono e compartilhamento

Data: 15/08/2026

## Entregas

- Leg Press unilateral com mídia fotográfica padronizada, usando o mesmo desenho visual de início/fim já aprovado nos demais exercícios.
- Abono disponível na meta semanal flexível, com motivo salvo no registro diário.
- O dia abonado não vira conclusão e não gera falha; ele sai do denominador válido da meta semanal.
- Treinos concluídos mantêm o card social disponível ao reabrir a tela e ao consultar uma data anterior.
- A ação de compartilhar usa a sessão/data selecionada, não apenas o treino de hoje.
- Card social passa a enfatizar Treino concluído + dias de constância.

## Compatibilidade

- Nenhuma tabela nova no Supabase.
- Sessões históricas e cargas existentes são preservadas.
- Publicação continua pelo `ATUALIZAR_SITE.bat` já existente no projeto.
- Arquivos de texto permanecem em UTF-8 e o instalador V79.2 deve copiar bytes diretamente, sem regravação implícita de encoding.
