# Relatório V79 — Evolução integrada do Memory

Data: 15/08/2026

## Escopo
A V79 consolida melhorias de experiência já aprovadas e adiciona uma evolução funcional de Treinos e Estatísticas.

## Principais entregas
1. Estatísticas de ritmo percebido em Estatísticas > Treinos.
2. Check-out com confirmação explícita antes do Supabase.
3. Histórico de cargas resiliente a mudanças de ID do plano.
4. Deduplicação segura e automática do plano, sem apagar sessões antigas.
5. Leg Press unilateral corrigido em mídia, texto e coaching.
6. Treino Guiado para protocolos temporizados, com incentivos contextuais durante a execução.
7. Detecção real de som e vibração.
8. Calendário semanal responsivo e funcional.
9. Abono verde e sem penalização.
10. Temas e indicadores refinados.
11. Limpeza de versões JS/CSS intermediárias sem referências ativas.

## Dados e compatibilidade
- Nenhuma sessão histórica é apagada pela migração.
- O histórico principal das avaliações fica em Estatísticas, não em Missões.
- O pacote não altera registros do Supabase fora das ações normais do próprio app.
- Arquivos de texto são publicados em UTF-8 e o instalador não os regrava com conversão implícita de encoding.
