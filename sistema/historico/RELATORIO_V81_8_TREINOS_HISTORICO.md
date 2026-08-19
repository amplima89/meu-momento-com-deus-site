# V81.8 — Histórico completo de Treinos

## Problema encontrado
A tela `Evolução → Histórico por exercício` tinha duas regras que faziam o histórico parecer vazio.

### 1. O histórico dependia do ID exato
A busca usava:

`sessionExerciseBest(session, exerciseId)`

Se o plano fosse recriado, atualizado pelo catálogo ou o mesmo exercício recebesse outro ID,
as sessões antigas deixavam de ser reconhecidas mesmo com o mesmo nome de exercício.

### 2. Ao trocar kg por placas, o histórico antigo era descartado
A função `exerciseHistory()` pegava a unidade do registro mais recente e executava:

`rows.filter(row => unidade === latestUnit)`

Portanto, se Remada baixa tinha histórico em kg e o último treino foi registrado em placas,
todos os registros antigos em kg desapareciam da análise.

Isso explica uma tela com apenas:

`18/08/2026 — 9 placas × 8`

mesmo existindo execução anterior.

## Correção da V81.8
O histórico passa a reconhecer o exercício pela identidade canônica do nome, não apenas pelo ID.

Exemplo:
- `remada-baixa-crossover-a`
- `remada-baixa-crossover`
- um ID recriado pelo catálogo

podem pertencer ao mesmo histórico quando o exercício é `Remada baixa no crossover`.

## Kg e placas
Os dados deixam de ser apagados.

O Memory mostra todo o histórico, mas separa as curvas:
- Histórico em kg
- Histórico em placas

Isso é necessário porque 9 kg e 9 placas não são a mesma escala.

Quando existe mudança de unidade, aparece um aviso explicando que as duas escalas não serão
misturadas em uma única evolução artificial.

## Nova análise
Para o exercício selecionado a tela mostra:
- quantidade total de registros encontrados;
- período analisado;
- último registro;
- unidades usadas;
- primeiro registro por unidade;
- último registro por unidade;
- melhor carga por unidade;
- evolução absoluta e percentual dentro de cada unidade;
- gráfico separado por unidade;
- últimos registros de cada unidade.

## Cargas no mês
`Principais evoluções → Cargas no mês` também passa a usar a identidade canônica do exercício,
evitando dividir o mesmo movimento em linhas diferentes só porque o ID mudou.

## Mobile
O seletor `Histórico por exercício` passa a ocupar a largura correta no celular e não extrapola
mais o card.
