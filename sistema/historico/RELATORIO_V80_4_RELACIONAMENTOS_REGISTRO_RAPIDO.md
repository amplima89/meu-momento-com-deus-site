# V80.4 — Relacionamentos e Registro rápido

## Relacionamentos
A interface deixa de usar “Círculo de Cuidado” e passa a usar “Relacionamentos”.

Para não quebrar dados existentes, permanecem:
- arquivo técnico `circulo-cuidado.html`;
- active key `circulo-cuidado`;
- chave persistida `memory_circulo_cuidado_v1`.

## Registro rápido
O erro 404 ocorria porque o menu apontava para `registro-rapido.html`, mas o arquivo não estava garantido nos pacotes posteriores.

A V80.4 inclui explicitamente:
- `registro-rapido.html`;
- `memory-quick-journal-v80-4.js`;
- `memory-quick-journal-v80-4.css`;
- `memory-care-core-v80-4.js`.

O instalador também verifica a existência desses arquivos e, depois da publicação, confirma que `registro-rapido.html` está rastreado no Git.
