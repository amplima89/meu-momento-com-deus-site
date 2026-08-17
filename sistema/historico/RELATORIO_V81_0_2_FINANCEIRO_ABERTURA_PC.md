# V81.0.2 — Financeiro: abertura no PC

## Causa encontrada
A senha estava sendo aceita, mas o CSS do Financeiro definia:

- `.finance-lock { display: grid }`
- `.finance-app { display: grid }`
- `.finance-sync-badge { display: inline-flex }`

Essas regras podiam prevalecer visualmente sobre o atributo HTML `hidden`.

Por isso, depois da senha correta, o JavaScript liberava o Financeiro,
mas a tela de senha continuava aparecendo no PC. O badge
`Local criptografado` visível na própria tela bloqueada era um sinal do mesmo problema.

## Correção
- regra explícita `[hidden] { display:none!important }` nos elementos do Financeiro;
- função `setFinanceUnlockedUI()` força também o `display`;
- bloqueio e desbloqueio usam a mesma função;
- badge de sincronização só aparece quando a área está aberta;
- cache-bust atualizado para V81.0.2;
- após abrir, a página volta ao topo para exibir o dashboard imediatamente.

A senha continua sendo 240617.
