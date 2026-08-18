# V81.4.2 — Treino reversível + Catálogo de exercícios

## 1. Marcação reversível
O check rápido de exercício deixa de ser definitivo.

- `○` → toque para concluir.
- `✓` → toque novamente para desfazer.
- ao desfazer, o exercício volta para pendente e pode ser editado normalmente.

A conclusão de 100% também deixa de encerrar automaticamente o treino.
Quando todos os exercícios estiverem concluídos, aparece um botão explícito:

`FINALIZAR TREINO`

Assim existe uma etapa de conferência antes de gravar o treino como encerrado.

## 2. Catálogo no Plano de treino
A área de Configurações / Plano de treino ganha um Catálogo de exercícios.

Cada card possui:
- foto de INÍCIO;
- foto de FIM;
- grupo muscular;
- equipamento;
- sugestão de séries e repetições;
- orientação de posição;
- orientação do movimento;
- erro técnico a evitar;
- dica do personal;
- botão para abrir a orientação técnica completa.

As imagens usam a biblioteca visual que já existia no projeto (Free Exercise DB e guias
específicos do Memory).

## 3. Trocar um exercício do treino atual
Na Composição semanal, cada exercício ganha o botão:

`Trocar`

Ao tocar:
1. o catálogo abre em modo de substituição;
2. o usuário pode buscar por nome, grupo muscular ou equipamento;
3. escolhe a nova opção;
4. o exercício antigo é substituído;
5. o plano é salvo no Supabase;
6. se houver um treino ativo naquele dia, a sessão é sincronizada com o plano.

A substituição bloqueia duplicidade do mesmo exercício dentro do mesmo treino.

## 4. Catálogo inicial
Foram incluídas opções para:
- Costas
- Peito
- Ombros
- Bíceps
- Tríceps
- Core
- Pernas
- Posterior
- Quadríceps
- Adutores
- Abdutores
- Panturrilha
- Condicionamento

Equipamentos contemplados:
Crossover, Polia, Smith, Leg Press, Halteres, cadeiras da academia, peso corporal e bicicleta.
