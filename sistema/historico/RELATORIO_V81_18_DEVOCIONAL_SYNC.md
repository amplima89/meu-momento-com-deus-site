# V81.18 — Sincronização automática do Devocional

## Causa encontrada
A rotina local já publicava e confirmava o devocional no Supabase.

Porém, na página do Devocional, `window.MMCD.listarMeditacoes()` era chamado
automaticamente apenas na inicialização da página.

A função que recarregava a lista depois de uma publicação estava ligada ao fluxo
manual `Gerar devocional de hoje`.

Consequência:
se a rotina agendada publicasse enquanto a página/app já estava aberta, a interface
continuava com a lista antiga até uma nova abertura/recarregamento.

## Correção
O app passa a consultar novamente a lista de meditações:
- ao voltar o foco para a janela;
- ao voltar para a aba/app;
- ao recuperar a conexão;
- 2,5 s e 10 s após a inicialização;
- a cada 60 s somente enquanto o devocional de hoje ainda estiver ausente.

Quando o dia de hoje aparece:
- atualiza o seletor;
- abre o devocional novo;
- renderiza o conteúdo;
- informa `Devocional de hoje sincronizado.`

Não existe polling contínuo depois que o dia atual foi encontrado.

## Identidade
Os assets oficiais da marca são restaurados e validados antes da publicação.
