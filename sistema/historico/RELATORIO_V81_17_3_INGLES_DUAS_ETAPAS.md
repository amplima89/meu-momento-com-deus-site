# V81.17.3 — Inglês com duas etapas

## Decisão
A antiga terceira etapa `Prática em contexto` foi removida.

O fluxo ativo fica:
1. Conversa;
2. Leitura;
3. uma única correção final por IA.

O tempo que seria usado na terceira etapa fica livre para treino de listening
fora do fluxo do Memory.

## Remoção técnica
Foram removidos do fluxo ativo:
- botão `3 · Prática em contexto`;
- `#english-practice-host`;
- referências `english-practice-v*.js/css`;
- dependência `ingles_pratica_v2` para concluir a atividade;
- prática no relatório de evolução;
- prática no perfil adaptativo;
- prática no corretor final;
- referências à terceira etapa nos prompts ativos.

Os arquivos `english-practice-v*.js/css` são apagados do projeto após backup.

## Preservado
- Conversa do Dia;
- Leitura 350–500 palavras;
- vocabulário;
- gravação da leitura;
- comparação da gravação pela IA;
- uma única correção final;
- histórico antigo no Supabase (não apagado);
- logo oficial e ícones.

## Atividades
A atividade de Inglês passa a ser concluída quando:
`Conversa concluída + Leitura concluída`.

A gravação da leitura continua opcional para conclusão.
