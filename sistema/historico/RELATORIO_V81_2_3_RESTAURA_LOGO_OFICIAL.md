# V81.2.3 — Restaura logo oficial do Memory no shell

## Causa
Os pacotes recentes de Financeiro/PWA carregavam o ícone PWA oficial, mas o pacote
incremental não carregava junto o arquivo usado pelo cabeçalho lateral:

`assets/imagens/memory-mark-official-v80-1.png`

Quando esse arquivo não existe no site publicado, o shell cai no fallback textual `M`,
que foi exatamente o que apareceu na tela.

## Correção
- restaura `memory-mark-official-v80-1.png` usando o asset oficial da V80.1;
- restaura também `memory-mark-v62.png` como alias/fallback, contendo a mesma marca oficial;
- preserva `memory-icon-official-v80-1.png`;
- o instalador valida os arquivos por SHA-256 antes de publicar;
- o shell ativo é atualizado apenas para garantir que a referência principal e o fallback
  apontem para os arquivos oficiais, sem substituir o restante do shell.

Nenhuma logo foi redesenhada.
