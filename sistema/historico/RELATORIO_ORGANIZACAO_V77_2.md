# Organização estrutural do site — V77.2

Data: 15/08/2026

## Problema corrigido

A V77 removeu backups e arquivos obsoletos, mas a raiz ainda mantinha mais de cem itens soltos. Isso deixava a pasta visualmente desorganizada e dificultava manutenção.

## Estrutura adotada

- `nucleo/`: autenticação, tema, shell, Supabase e arquivos compartilhados.
- `modulos/<assunto>/`: CSS e JavaScript agrupados por domínio funcional.
- `assets/imagens/`: identidade visual.
- `dados/`: dados estáticos.
- `configuracao-banco/`: scripts SQL.
- `sistema/`: documentação, histórico e publicação.

## Compatibilidade

Os HTMLs públicos permaneceram na raiz. Isso mantém URLs como `painel.html`, `meditacao.html`, `ingles.html` e `treinos.html` funcionando sem alteração para o usuário.

Todas as referências locais dos HTMLs foram atualizadas para a nova estrutura. As referências dinâmicas carregadas por JavaScript também foram ajustadas.

## Validação

- Nenhuma referência local quebrada detectada após a reorganização.
- Todos os arquivos JavaScript passaram na verificação de sintaxe com Node.js.
- Nenhum `.js`, `.css`, `.png` ou `.ps1` permanece solto na raiz do site.
