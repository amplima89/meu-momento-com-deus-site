# V81.13.14 — Recupera respostas do Inglês

A imagem mostrou dois bugs diferentes.

## Conversa
A barra superior já marcava `Conversa ✓`, mas a etapa final ainda dizia que faltavam
respostas.

A etapa final estava lendo apenas os `textarea` no momento em que era carregada.

Agora ela:
- lê campos ativos;
- lê respostas renderizadas;
- observa mudanças no bloco da Conversa;
- tenta novamente após o carregamento;
- como fallback, recupera respostas salvas no Supabase.

## Prática
Respostas antigas estavam estruturadas como objetos `{prompt, answer}`.
A tela colocou o objeto inteiro dentro do textarea e exibiu `[object Object]`.

Agora:
- o textarea recebe somente `answer`;
- a correção por IA continua recebendo `{prompt, answer}`;
- os dados antigos são reaproveitados.
