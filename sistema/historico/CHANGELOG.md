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

## V78.3 — 15/08/2026
- Minha Jornada redesenhada como trilha de temas e linha do tempo, sem porcentagens de conclusão.
- Cards temáticos passam a mostrar quantidade real de meditações e última data registrada no assunto.
- Agrupamentos internos da meditação transformados em acordeões recolhíveis com preferência local persistida.
- Mapa de Cuidado passa a renderizar estrutura antes dos dados, evitando tela vazia em caso de atraso/falha de leitura.
- Foto cadastrada no Perfil integrada ao círculo central do Mapa de Cuidado.
- Hover/toque mantém a pessoa no centro e reage apenas no anel/badge da dimensão.
- Modo Presença passa a exibir orientações progressivas durante o cronômetro, com fase, texto, próxima orientação e progresso visual.
- Novos arquivos versionados para evitar cache de CSS/JS das versões anteriores.

## V78.4 — 15/08/2026
- Escala global de texto recalibrada: o antigo Grande passa a corresponder ao novo Padrão.
- Novos patamares para Grande e Extra grande, com ampliação real em desktop e mobile.
- Aniversariantes removido da Central de Configurações e incluído no menu Cuidado.
- Aniversário do dia integrado a Atividades > Cuidado como gesto opcional de mensagem.
- Check de aniversário registra mensagem enviada; ausência de check não reduz o progresso do dia e não exige abono.
- Script de aniversariantes movido para `modulos/memory/memory-birthdays-v78-4.js`.
- Atividades versionadas em `atividades-v78-4.js/css`.
- Treinos passam a carregar o shell V78 atual em vez de referência antiga ao shell V69.

## V78.5 — 15/08/2026
- Foto do Perfil passa a ocupar integralmente o círculo central do Mapa de Cuidado.
- Remoção de nome, “Você no centro”, textos auxiliares e badge sobre a foto.
- Estados das dimensões passam a aparecer exclusivamente no anel externo do centro.
- Centro permanece circular também no layout mobile.
- Novos arquivos versionados `memory-care-map-v78-5.js/css` para evitar cache da versão anterior.
