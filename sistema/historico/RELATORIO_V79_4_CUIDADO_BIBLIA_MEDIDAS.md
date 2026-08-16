# Memory V79.4 — Cuidado, Bíblia e Medições Corporais

## Entrega cumulativa
Esta versão reúne as melhorias pendentes de Cuidado, Bíblia e Medições Corporais e preserva as correções recentes de Treinos.

## Cuidado > Boas Ações
- Nova página dentro do submenu Cuidado.
- Cadastro: data, categoria, descrição e pessoa beneficiada opcional.
- Categorias: Família/Relacionamentos, Generosidade, Ajuda/Serviço, Trabalho, Comunidade e Outro.
- Persistência em `configuracoes_usuario`, chave `memory_boas_acoes_v1`.
- Histórico editável/excluível.
- Relatório mensal: total de ações, dias com gesto, categoria mais presente, pessoas registradas e distribuição por categoria.
- Sem pontos, ranking ou score.

## Bíblia — Livro atual
- Livro atual é priorizado pela conclusão de capítulo mais recente.
- Livro mais avançado permanece como estatística independente.
- Última leitura mostra livro, capítulo e recência.
- A mensagem Sua Caminhada passa a falar do livro atual.

## Bíblia — Check na igreja
- Check individual ao lado de cada versículo.
- Persistência em `biblia_versiculos_igreja_v1`.
- Não altera capítulos concluídos, versículos percorridos ou percentual da Bíblia.
- Mesmo com todos os versículos marcados na igreja, o capítulo continua dependente de `Capítulo concluído`.

## Medições corporais
20 campos:
1. Ombros
2. Peitoral
3-4. Bíceps relaxado D/E
5-6. Bíceps contraído D/E
7-8. Antebraço D/E
9. Cintura
10. Abdômen
11. Quadril
12-13. Coxa superior D/E
14-15. Coxa média D/E
16-17. Coxa inferior D/E
18-19. Panturrilha D/E
20. Peso corporal

Registros antigos permanecem legíveis: bíceps anterior é usado como referência do relaxado e coxa anterior como referência da coxa média.
