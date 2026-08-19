# V81.4.3 — Catálogo completo de exercícios

## Problema da V81.4.2
O contador mostrava 28 opções, mas ao filtrar por grupo o catálogo podia ficar vazio.

A causa estava no instalador: a expressão usada para atualizar o JavaScript principal
também podia capturar `treinos-visuais-...`. Quando a biblioteca visual não carregava,
os cards eram descartados porque dependiam obrigatoriamente de um guia local.

## Correção
- o instalador diferencia explicitamente `treinos-visuais-*` do arquivo principal `treinos-v*`;
- a biblioteca visual é carregada antes do catálogo e do módulo principal;
- um exercício não é mais descartado só porque não existe no guia local;
- os filtros são aplicados sobre os dados, e não escondendo cards antigos no DOM;
- selecionar Grupo, Equipamento ou Tipo atualiza os resultados imediatamente;
- busca por texto usa debounce de 120 ms;
- o contador mostra quantos exercícios correspondem ao filtro.

## Ampliação
O catálogo local continua como fallback e com orientações específicas do Memory.

Quando a tela abre, o Memory tenta carregar a biblioteca pública Free Exercise DB:
- mais de 800 exercícios na fonte;
- imagens de início e fim;
- grupo muscular;
- equipamento;
- nível;
- tipo de treino;
- instruções originais.

Para não deixar o celular pesado:
- o catálogo inteiro fica disponível para busca/filtro;
- são renderizados 24 cards por vez;
- `Carregar mais` adiciona outros 24.

## Orientação
Os exercícios locais continuam usando os guias específicos do Memory.
Os demais exercícios recebem:
- posição inicial em português;
- orientação de movimento em português;
- erro técnico a evitar;
- dica de controle de carga;
- fotos de início e fim da base;
- passo a passo original disponível em um bloco expansível.

## Substituição
Ao usar `Trocar`:
- o grupo do exercício atual já entra como filtro inicial;
- qualquer item encontrado pode substituir o atual;
- fotos e orientação ficam gravadas junto ao exercício no plano;
- o novo exercício mantém guia visual mesmo fora do catálogo;
- a alteração é salva no plano/Supabase.
