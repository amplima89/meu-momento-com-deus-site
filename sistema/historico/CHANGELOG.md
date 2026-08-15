# Histórico técnico do Memory

## V77 — 15/08/2026
- Limpeza inicial de backups, caches e arquivos legados.
- Criação do histórico de melhorias visível no site.
- Correção de referências de ícones inexistentes.
- Redirecionamento de URLs antigas para módulos atuais.
- Organização de documentos históricos em `sistema/historico`.
- Padronização do pacote de atualização via BAT.

## V77.2 — 15/08/2026
- Reorganização estrutural da pasta do site.
- Criação de `nucleo/` para arquivos técnicos compartilhados.
- Criação de `modulos/` com separação por assunto.
- Criação de `assets/imagens/` para identidade visual.
- Remoção de CSS, JavaScript, PNG e PowerShell da raiz.
- Manutenção dos HTMLs públicos na raiz para preservar as URLs existentes.
- Publicador PowerShell movido para `sistema/publicacao/` com BAT único na raiz.

## V78 — 15/08/2026
- Home raiz e página institucional adaptativas aos temas sem perder a identidade visual do Memory.
- Cuidado transformado em menu principal expansível e independente de Configurações.
- Padronização dos cards Consistência, Progresso até a meta e Última meditação.
- Mapa de Cuidado redesenhado como núcleo simbólico interativo.
- Estados visuais de presença, atenção e pouca evidência no próprio símbolo.
- Painel lateral do Mapa com sinais recentes, observações, evidências e próxima ação.
- Meditação reorganizada como jornada temática com contexto, progresso e próximo passo.
- Temas iniciais: Ansiedade, Perdão, Disciplina, Propósito, Relacionamentos, Fé, Gratidão, Identidade e Obediência.
- Preservação das funções existentes de narração, destaques e navegação por data na Meditação.


## V78.1 — 15/08/2026
- Correção do Mapa de Cuidado para preservar os seis cards.
- A interação simbólica passou a ocorrer somente na bola central.
- Painel lateral e leitura de sinais mantidos.

## V78.2 — 15/08/2026
- Agrupamento visual dos títulos internos da meditação em Preparação, Palavra e reflexão, Resposta a Deus e Levar para o dia.
- Jornada temática movida para uma aba/subtópico da área de Meditação.
- Remoção das porcentagens e contagens de “percorridas” inferidas por registros externos.
- Temas passam a mostrar somente o número de meditações publicadas classificadas naquele assunto.
- Histórico de cada tema com datas, foco resumido e navegação para a meditação do dia.
- Botão “Voltar para Minha Jornada” após abrir um dia pelo histórico.
- Menu Cuidado passa a aceitar recolhimento manual e duplo clique no desktop.
## V78.2.1 — 15/08/2026
- Correção do parser do instalador PowerShell da V78.2.
- Remoção do escape incompatível na validação do atributo `data-meditation-view="journey"`.
- BAT disponibilizado diretamente na raiz do ZIP, eliminando a pasta duplicada após a extração.
- A revisão inclui integralmente todas as melhorias funcionais da V78.2.

