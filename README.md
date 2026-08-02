# Meu Momento com Deus — Site

Aplicação web do projeto **Meu Momento com Deus**.

## Estrutura

- `index.html` e `app.js`: livro digital e meditações.
- `painel.html`: painel principal.
- `atividades.html`: atividades diárias.
- `livros.html`: biblioteca e meta anual.
- `metas.html`, `ingles.html`, `relatorios.html` e `alvo.html`: demais módulos.
- `dados-app.js`: acesso e persistência no Supabase.
- `configuracao-banco/SUPABASE_CONFIGURAR_BANCO.sql`: índices e permissões necessárias.

## Banco de dados

Antes do primeiro teste, execute uma única vez o arquivo SQL da pasta `configuracao-banco` no SQL Editor do Supabase.

O site usa autenticação do Supabase e grava cada usuário apenas nos próprios registros.
