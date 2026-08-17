# V81.0.1 — Correção da abertura do Financeiro

## Correção
- senha continua sendo `240617`;
- o submit não depende mais exclusivamente de `event.submitter`;
- Enter e clique no botão passam pelo mesmo fluxo;
- a senha é normalizada com `trim()` antes da validação;
- leitura do Supabase possui timeout e não pode travar a abertura indefinidamente;
- na primeira abertura, o salvamento criptografado acontece em segundo plano;
- erros de abertura agora aparecem na tela e também em toast.

## Segurança
O hash SHA-256 da senha continua sendo usado para validação.
Os dados financeiros continuam criptografados com AES-GCM + PBKDF2 antes da sincronização.
