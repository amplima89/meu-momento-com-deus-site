# V81.9 — Cérebros de consistência + acordeão do Devocional

## Consistência
As barras dos últimos 30 dias foram substituídas por pequenos ícones de cérebro.

Estados:
- concluído: gradiente Memory violeta → azul → ciano;
- não concluído: cinza;
- dia não programado: cinza escuro com baixa opacidade.

O percentual, sequência atual e recorde continuam usando a mesma regra anterior.
A alteração é apenas da representação visual.

## Quatro guias do Devocional
As quatro etapas passam a funcionar como um acordeão exclusivo.

Regra:
- no máximo uma guia fica aberta;
- ao abrir uma nova, a anterior fecha automaticamente;
- clicar na guia já aberta permite recolhê-la;
- a última guia aberta é lembrada no navegador;
- se não houver preferência, a primeira etapa começa aberta.

## Preservado
O `app-v81-9.js` foi criado sobre o `app-v81-6.js`, preservando:
- sincronização dos destaques PC ↔ celular;
- confirmação real no Supabase;
- botão Sincronizar agora;
- recarga dos destaques ao voltar para o aplicativo;
- tratamento assíncrono da abertura do Devocional.
