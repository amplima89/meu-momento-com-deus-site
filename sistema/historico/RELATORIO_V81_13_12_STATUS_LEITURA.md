# V81.13.12 — Status da leitura corrigido

## Problema
O card final mostrava:
`Leitura + produção — salve esta parte acima`

Esse estado não significava que a leitura estava pendente.

Na prática, o código estava verificando se o pacote abaixo havia sido salvo no
`ingles_atividade_diaria_v1`:
- compreensão;
- estruturas;
- writing;
- speaking.

Por isso uma leitura já concluída podia parecer pendente.

## Correção
O card deixa de usar o rótulo `Leitura + produção`.

Agora mostra:
`Respostas + Writing + Speaking`

e acompanha o formulário em tempo real.

Se tudo já estiver preenchido, mas ainda não tiver sido enviado ao Supabase, aparece:
`prontas · serão salvas ao finalizar`

O botão final faz o save automaticamente.

## Bug adicional corrigido
O áudio salvo usa a propriedade `speaking.key`, mas a validação antiga procurava
`speaking.audioKey`.

Depois de recarregar a página, isso podia fazer um Speaking já salvo voltar a ser
tratado como ausente.

A V81.13.12 reconhece os dois formatos.
