# Memory V81.17 — Varredura e limpeza estrutural segura

## Escopo auditado
- Site: `meu-momento-com-deus-site`
- Gerador local: `Meu Momento com Deus`
- Arquivos antes: **627**
- Arquivos depois da limpeza do snapshot: **382**
- Tamanho antes: **15.76 MB**
- Tamanho depois: **8.07 MB**

## Removido
- módulo **Séries & filmes** do Memory (`series.html` e `modulos/series`);
- link Séries & filmes das Configurações e registro da rota no shell;
- serviço `series_ingles_auto.py`;
- prompt `07_series_filmes_no_ingles.md`;
- pasta de legendas local;
- snapshots antigos de prompt em `registros/prompts` (a pasta permanece e será recriada pelo gerador);
- corretores antigos de inglês que rodavam fora da correção final sob demanda;
- runners/protocolos antigos de correção;
- `__pycache__` e `.pyc`;
- **97** arquivos JS/CSS versionados antigos sem referência ativa, totalizando **3.89 MB**.

## Corrigido
- prompt diário de inglês alinhado ao fluxo atual: Conversa + Leitura + Prática em contexto + uma correção final;
- removidos do prompt ativo: séries/filmes, revisão 1–3–7, writing separado, speaking separado, comprehension escondida e drills antigos;
- eliminado carregamento duplicado do contexto V81.13 no `carregador_prompt.py`;
- eliminada a injeção automática de cenas;
- automação diária não tenta mais rodar corretores antigos antes de gerar o devocional;
- Dashboard e Evolução do inglês usam Conversa + Prática como evidência ativa;
- `ingles.js` deixa de iniciar o workflow legado de writing/speaking oculto;
- rótulo estático atualizado para **Prática em contexto**.

## O que foi preservado por segurança
- páginas de redirecionamento antigas (podem existir em favoritos/links);
- histórico de atualizações e logs operacionais;
- `corretor_atividade_ingles_v81_13.py`, pois o corretor final atual ainda reutiliza funções dele;
- `corretor_final_ingles_v81_13_17.py` e protocolo V81.13.17;
- todos os módulos atualmente referenciados pelas páginas do Memory.

## Proteção da logo
O ZIP enviado não continha os binários em `assets/imagens`, embora as páginas apontem para eles.
A V81.17 inclui uma cópia exata da marca oficial conhecida e seus ícones PWA.

Hashes principais esperados:
- `memory-mark-official-v81-11-3.png`: `11889b6e4aacb1b6c46b077139ca17abeee8f5e05215439da55447577e8d5b68`
- `memory-icon-official-v81-11-3.png`: `f0cfb24420f2f63a3c876c167c659d145a08370cc40edf92e7efcd62a7bb5242`

O instalador não remove nem reescreve os guards atuais da marca e valida esses hashes antes de publicar.
