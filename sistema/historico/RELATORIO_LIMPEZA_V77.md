# Limpeza inicial do projeto — V77

Data: 15/08/2026

## Escopo

A varredura foi feita sobre os dois diretórios do pacote: `meu-momento-com-deus-site` e `Meu Momento com Deus`. O princípio adotado foi remover somente itens com evidência forte de obsolescência, mantendo os arquivos ativos na raiz quando movê-los aumentaria o risco de quebrar referências relativas.

## Decisões

- Backups automáticos antigos foram removidos do diretório publicado.
- Versões antigas de assets sem referência no conjunto atual de páginas foram removidas.
- Páginas antigas ainda potencialmente salvas em favoritos foram convertidas em redirects mínimos.
- A reorganização de CSS/JS ativos em subpastas foi adiada: hoje o projeto possui muitas referências relativas e scripts que carregam outros scripts dinamicamente. Fazer essa migração junto da limpeza aumentaria o risco sem benefício funcional imediato.
- Documentação histórica foi agrupada em `sistema/historico`.
- O diretório Python teve apenas limpeza de cache e backups explícitos; a estrutura funcional existente foi mantida.

## Prevenção de novo acúmulo

O `.gitignore` passa a ignorar diretórios de backup de atualização, arquivos `.bak`, `.old` e temporários. O histórico funcional deve ser mantido na página `atualizacoes.html`, e não por cópias sucessivas de arquivos ativos na raiz.
