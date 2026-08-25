# V81.13.11 — Finalizar Inglês sem botão morto

## Causa
O botão final recebia o atributo HTML `disabled` enquanto:
- Leitura + produção não estivesse salva; ou
- Prática em contexto não estivesse concluída.

Visualmente, porém, o gradiente fazia o botão parecer disponível.
Resultado: o usuário clicava e nada acontecia.

Além disso, a Prática em contexto não emitia o evento usado pelo card final para
atualizar o status imediatamente após salvar.

## Correção
O botão final:
- não fica mais silenciosamente desabilitado;
- sempre responde ao clique;
- tenta salvar automaticamente a parte diária se ela já estiver preenchida;
- tenta concluir a Prática se as 6 respostas já estiverem prontas;
- se ainda houver pendência, informa exatamente qual é;
- rola a página até a etapa pendente.

A Prática em contexto agora emite `memory:english-part-saved` depois de salvar, fazendo
a Última Etapa atualizar imediatamente.

A correção continua sendo uma única chamada por IA no final.
