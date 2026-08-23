# V81.14.3 — Instalador corrigido

A V81.14.2 falhou no parser do PowerShell por causa de uma expressão que somava
`.Count` de duas chamadas `[regex]::Matches(...)`.

Na V81.14.3 cada contagem é feita em uma linha simples e independente.

A proposta visual não muda:
- paletas anteriores intactas;
- Conforto Visual como opção adicional;
- desligada por padrão;
- sem mudança automática por horário.

Pode ser executada diretamente sobre as tentativas anteriores.
