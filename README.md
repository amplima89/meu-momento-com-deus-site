# Meu Momento com Deus — Site

Aplicação web publicada no GitHub Pages.

## Módulos

- `index.html`: meditação diária com player do YouTube.
- `ingles.html`: prática diária com tradução ao passar o mouse ou tocar.
- `painel.html`: visão geral.
- `atividades.html`: rotina e registros.
- `livros.html`: biblioteca.
- `metas.html`: cadastro de metas.
- `relatorios.html`: evolução e indicadores.

Os dados são carregados do Supabase. O arquivo `ATUALIZAR_SITE.bat` publica
as alterações no repositório do GitHub sem depender da pasta `.git` local.


## Publicação pelo BAT

O `ATUALIZAR_SITE.bat` confirma o envio do commit ao GitHub e encerra imediatamente. O GitHub Pages publica a nova versão em segundo plano; o BAT não permanece mais em um ciclo de tentativas.

## Padrão dos gráficos

Os gráficos utilizam o mesmo contêiner responsivo, altura padrão de 310 px, cabeçalho e área de legenda. A escala do gráfico de peso usa números inteiros em intervalos de 1 kg.
