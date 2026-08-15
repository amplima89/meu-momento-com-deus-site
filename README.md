# Meu Momento com Deus — Site

Aplicação web do Memory, publicada no GitHub Pages.

## Estrutura atual

- Arquivos `.html`, `.css` e `.js` na raiz: runtime atual do site. Nesta etapa eles foram mantidos na raiz para preservar as referências relativas existentes.
- `dados/`: dados estáticos usados pelo site.
- `configuracao-banco/`: scripts e instruções do Supabase.
- `sistema/historico/`: changelog e relatórios técnicos que não fazem parte do runtime.
- `ATUALIZAR_SITE.bat` / `ATUALIZAR_SITE.ps1`: publicação do site.

## Histórico de melhorias

A página `atualizacoes.html` registra as melhorias aplicadas ao projeto. A partir da V77, o histórico funcional deve ser mantido ali em vez de acumular cópias e backups na raiz.

## Publicação

Execute `ATUALIZAR_SITE.bat`. O script prepara os arquivos, cria o commit e envia a versão atual para o GitHub Pages.
