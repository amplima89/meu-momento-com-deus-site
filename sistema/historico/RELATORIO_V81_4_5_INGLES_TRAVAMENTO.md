# V81.4.5 — Inglês: travamento ao abrir corrigido

## Sintoma
Ao entrar em Inglês diário:
- Conversa permanecia em `Carregando...`;
- Leitura permanecia em `Carregando...`;
- Prática permanecia em `Carregando prática estruturada...`;
- o navegador exibia `Esta página não está respondendo`.

## Causa encontrada
A V81.4 adicionou um `MutationObserver` em `#ingles-conteudo`.

Quando o bloco de Leitura aparecia, a integração adicionava o botão
`Marcar leitura concluída`.

A própria inclusão do botão gerava uma mutação.
O observer chamava `ensureReadingButton()` novamente.

Mesmo com o botão já existente, a função executava novamente:

`button.textContent = "Marcar leitura concluída"`

Alterar `textContent` gera uma nova mutação de `childList`.
Isso chamava o observer outra vez, criando um ciclo contínuo:

MutationObserver → textContent → MutationObserver → textContent → ...

Esse loop consumia a thread principal do navegador e congelava a página.

## Correção
- o observer agora apenas garante que o controle de Leitura exista;
- quando chamado sem estado, não reescreve texto, classe ou `disabled`;
- qualquer mudança visual só é feita se o valor realmente mudou;
- chamadas do observer são agrupadas com `requestAnimationFrame`;
- o observer é desconectado em `pagehide`;
- a reconciliação histórica deixou de bloquear a inicialização;
- o backfill roda apenas uma vez e em tempo ocioso;
- o estado do dia é carregado antes do backfill.

## Escopo
Esta atualização altera somente a integração:
`modulos/ingles/ingles-atividade-*`

Não substitui:
- Prática Intensiva V81.3;
- Conversa do Dia;
- Leitura;
- Financeiro;
- Treinos;
- Bíblia;
- shell;
- logo;
- cliente Supabase.
