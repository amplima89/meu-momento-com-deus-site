# Memory V78.2.1 — Correção do instalador

Data: 15/08/2026

## Motivo
A V78.2 continha uma expressão de validação PowerShell usando escape no padrão `\"`. No Windows PowerShell, esse formato provocou erro de parser antes da execução do pacote.

## Correções
- Validações do instalador reescritas com strings literais compatíveis com Windows PowerShell.
- Validação funcional baseada em identificadores ASCII para reduzir risco de problemas de encoding.
- BAT colocado diretamente na raiz do ZIP.
- Mantido backup externo antes de qualquer cópia para o projeto.
- Mantidas integralmente as melhorias funcionais da V78.2.

## Segurança
O erro original era de parser e ocorria antes da execução das instruções; portanto, a tentativa que exibiu esse erro não chegou à etapa de backup, cópia ou limpeza do projeto.
