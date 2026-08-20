# V81.10 — Devocional + exemplos do treino

## Devocional
- `Resposta a Deus` passa a aparecer como `Momento de oração`.
- O título técnico `Silêncio e Reflexão` é preservado no Markdown, mas a tela exibe `Aplicação de hoje`.
- Um prompt adicional exige `Verdade para levar` + `Primeira obediência de hoje`.
- Os prompts anteriores não são sobrescritos.
- Acordeão V81.9 e sincronização V81.6 são preservados.

## Botão quando o Devocional de hoje estiver ausente
A tela passa a mostrar `Gerar devocional de hoje`.

Por segurança, a chave da OpenAI não vai para o navegador.
O celular grava uma solicitação autenticada no Supabase.
O PC processa com o Python local a cada 15 minutos enquanto estiver ligado e também no login.

Se o PC estiver desligado, a solicitação fica registrada até ele voltar.

## Treino de hoje
O guia visual passa a procurar o exercício também pelo nome canônico.
Isso corrige o caso em que o ID do plano foi recriado e deixou de coincidir com o ID da biblioteca.

Ordem de resolução:
1. guia vinculado;
2. ID exato;
3. nome canônico na biblioteca;
4. catálogo local;
5. catálogo completo sob demanda.

A V81.10 preserva histórico V81.8, catálogo completo, check reversível e finalização manual.
