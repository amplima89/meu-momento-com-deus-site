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

## V78.6 — 15/08/2026
- Navegação central atualizada para `nucleo/shell-v78-6.js` em todas as páginas, com nova chave de cache.
- Aniversariantes permanece no submenu Cuidado ao navegar entre todas as páginas do módulo.
- Aniversariantes removido definitivamente da Central de Configurações.
- Defesa de compatibilidade recria o link de Aniversariantes caso uma estrutura antiga de menu seja carregada.
- Configurações recebe proteção adicional contra card legado de Aniversariantes.
## V78.7 — 15/08/2026
- Correção global de acentuação/mojibake introduzida pelo instalador V78.6 no Windows PowerShell 5.1.
- Restauração dos HTMLs da raiz a partir da base limpa em UTF-8.
- Remoção do padrão de regravação de HTML com `Get-Content`/`Set-Content` sem encoding explícito.
- Validação automática de caracteres quebrados após a instalação.
- Navegação V78.6 preservada com cache-busting V78.7.
- Nenhum dado do Supabase é alterado.
## V79 — 15/08/2026
- Nova área Estatísticas > Treinos para evolução do ritmo percebido (1 Travado a 5 Excelente).
- Médias de 7/30 dias, comparação com período anterior, gráfico semanal, distribuição de notas, percentual 4–5 e histórico por treino.
- Check-out de treino com seleção em rascunho e persistência somente após “Salvar avaliação”.
- Recuperação de histórico por identidade canônica de exercício, reduzindo perda de “último treino” quando IDs mudam.
- Unificação segura e automática de duplicidades exatas do plano sem excluir sessões históricas.
- Leg Press unilateral com ilustrações locais e coaching específico unilateral.
- Engine de Treino Guiado para Cardio/HIIT e protocolos temporizados, com ciclos, transições automáticas, progresso, incentivos contextuais, pausa e encerramento.
- Detecção de suporte a áudio/vibração; controles indisponíveis são desativados e explicados.
- Seletor de data do Plano Semanal ampliado e responsivo.
- Estado de abono reforçado em verde, sem aparência de pendência e fora da consistência.
- Harmonização V79 de temas, especialmente Claro e Rosa, e refinamento dos indicadores do dashboard.
- Shell físico V79 para navegação consistente e cache-busting.
- Limpeza de versões intermediárias de Jornada, Mapa de Cuidado e Atividades que não tinham referências ativas.
- Instalador V79 preserva UTF-8 por cópia binária/direta, sem Get-Content/Set-Content sobre HTMLs.

## V79.1 — 15/08/2026
- Botão “Concluir meditação” dentro da própria página, sincronizado com a atividade de Meditação no Supabase.
- Consistência de meditação atualizada imediatamente após a conclusão.
- Card compartilhável pós-meditação com versículo do dia, identidade Memory, PNG, legenda e Web Share.
- Compartilhamento nativo compatível com Instagram/WhatsApp quando disponíveis no aparelho, sem publicação automática.
- Card compartilhável pós-treino com treino realizado, grupos trabalhados, duração, sequência de treinos concluídos e mensagem motivacional.
- Motor comum `MemorySocialCard` para geração de cards sociais em PNG, reutilizável por outros módulos.

## V79.2 — 15/08/2026
- Leg Press unilateral padronizado com referência fotográfica de início/fim no mesmo formato visual dos demais exercícios.
- Abono habilitado também nas metas semanais flexíveis, com motivo, remoção e estado verde.
- Abonos semanais passam a reduzir o denominador válido sem contar como conclusão nem falha.
- Card de treino concluído permanece acessível após o fechamento e também no histórico do dia.
- Compartilhamento de qualquer treino concluído passa a usar a data correta da sessão selecionada.
- Card social destaca “Treino concluído” e dias de constância.


## V79.3 — 15/08/2026
- Abono de treino preserva explicitamente a constância sem ser contado como treino realizado.
- Cálculo do card social passa a rastrear quantos abonos existem dentro da sequência atual.
- Card de treino concluído ganha terceiro indicador de Abono quando aplicável.
- Legenda compartilhável informa que o abono preservou a sequência.
- Regra de constância passa a reconhecer metas ativas claramente ligadas ao treino ao verificar abono.


## V79.4 — 16/08/2026
- Nova área Cuidado > Boas Ações com persistência no Supabase, edição, exclusão e relatório mensal reflexivo.
- Bíblia passa a separar Livro atual, Livro mais avançado e Última leitura.
- Mensagem principal de Sua Caminhada prioriza o livro atual identificado pelas conclusões mais recentes.
- Check por versículo registra leitura/citação na igreja sem afetar capítulo concluído ou percentual da Bíblia.
- Medições corporais ampliadas para ombros, bíceps relaxado/contraído bilateral e coxa superior/média/inferior bilateral.
- Body Scan passa de 13 para 20 campos corporais e mantém compatibilidade de leitura com registros antigos.
- V79.4 inclui cumulativamente as correções V79.3 de constância protegida por abono e card social.


## V79.5 — 16/08/2026
- Entrada decimal mobile aceita vírgula e ponto para peso e medidas.
- Peso mantém até duas casas decimais.
- Comparação ganha Body Scan colorido por região: verde, vermelho e neutro.
- Resumo visual da evolução corporal incluído.


## V79.6 — 16/08/2026
- Histórico de medições ganha botão Editar.
- Edição carrega data, medidas e observação no formulário.
- Salvar alterações atualiza o mesmo ID e não cria duplicata.
- Cancelamento de edição sem perda do registro original.
- Mantidas as correções de decimal mobile e Body Scan da V79.5.


## V79.7 — 16/08/2026
- Cuidado reposicionado imediatamente após Bíblia na navegação principal.
- Nova área Cuidado > Testemunhos.
- Testemunhos podem ser privados, públicos identificados ou públicos anônimos.
- Modo anônimo não inclui nome, usuário, foto ou link de perfil no conteúdo compartilhado.
- Registros podem ser editados, excluídos e ter a privacidade alterada.
- Compartilhamento nativo disponível para testemunhos públicos.


## V79.8 — 16/08/2026
- Mapa de Cuidado passa a ler Boas Ações, Testemunhos, Orações, Círculo de Cuidado e Aniversários.
- MemoryCare centraliza as relações entre fontes de Cuidado e dimensões do mapa.
- Toda escrita via MemoryCare dispara `memory:care-changed`, revisão em localStorage e BroadcastChannel.
- Aniversários também notificam o mapa mesmo usando MemoryConfig diretamente.
- Mapa recalcula automaticamente quando o Cuidado muda, inclusive entre abas.
- Testemunhos: Espiritual + Memórias.
- Boas Ações: Relacionamentos + Memórias; categoria Trabalho também alimenta Desenvolvimento.
- Orações por pessoas alimentam Relacionamentos; atividade de oração alimenta Espiritual; respostas continuam compondo Memórias.


## V79.9 — 16/08/2026
- Registro rápido movido do painel inicial para Cuidado > Registro rápido.
- Clicar em Cuidado abre diretamente o Mapa de Cuidado.
- Submenu de Cuidado: Mapa primeiro; demais itens em ordem alfabética.
- Registro rápido passa a usar MemoryCare.write e notificar o mapa em salvar, editar e excluir.
- Categorias do Registro rápido passam a alimentar dimensões específicas do Mapa de Cuidado.
- O painel continua lendo o Registro rápido para sequência, mas deixa de renderizar o card.


## V80.0 — 16/08/2026
- Identidade oficial atualizada para a paleta #A78BFA + #60D5FF.
- Fundo oficial passa a usar azul-marinho profundo #000717.
- Tema `memory-original` renomeado visualmente para Memory Oficial.
- Botões, estados ativos, navegação e detalhes de marca passam a usar o gradiente oficial violeta → ciano.
- Página institucional do Memory atualizada para a mesma identidade.
- Na Meditação, o agrupador visual “Continuidade” passa a ser “Complementos”.
- O ID interno `continuidade` foi mantido para preservar compatibilidade com preferências locais e CSS existentes.


## V80.1 — 16/08/2026
- Marca oficial extraída diretamente da identidade visual aprovada.
- Hero institucional deixa de usar o SVG reconstruído que deformava o símbolo.
- Sidebar, topbar e demais referências passam a usar `memory-mark-official-v80-1.png`.
- `memory-mark-v62.png` é mantido como alias retrocompatível.
- Imagens da marca usam `object-fit: contain`.
- Favicon usa `memory-icon-official-v80-1.png`.


## V80.2 — 16/08/2026
- Removido definitivamente o quinto agrupador visual Continuidade/Complementos.
- A meditação passa a ter apenas Preparação, Palavra e reflexão, Resposta a Deus e Levar para o dia.
- Cercas ` ```markdown `, ` ```md ` e ` ``` ` são eliminadas da renderização.
- Seções legítimas não reconhecidas continuam visíveis sem criar um grupo artificial.


## V80.3 — 16/08/2026
- Terminologia visual passa de Meditação para Devocional.
- Identificadores técnicos `meditacao` são preservados.
- Card lê a paleta do tema ativo via variáveis CSS.
- Logo oficial V80.1 usada no preview e PNG.
- Removidos “Jornada / Com Deus” e “Feito / Hoje”.
- Novos selos: “Devocional concluído” e “Guardado no Memory”.


## V80.4 — 16/08/2026
- “Círculo de Cuidado” passa a ser exibido como “Relacionamentos”.
- Caminho técnico `circulo-cuidado.html` e chave de banco são preservados.
- `registro-rapido.html` passa a ser incluído explicitamente no pacote.
- Dependências do Registro rápido (`core`, JS e CSS) também são publicadas.
- Mapa de Cuidado continua integrado ao Registro rápido.
- Validação passa a confirmar que `registro-rapido.html` existe e é rastreado pelo Git após a publicação.


## V80.5 — 16/08/2026
- Registro rápido removido visualmente de Missões.
- Dados `diario_rapido_v1` continuam sendo lidos para integrações e análises existentes.
- Cuidado mantém Mapa de Cuidado como primeiro item.
- Demais itens de Cuidado ordenados alfabeticamente:
  Aniversariantes, Boas Ações, Minhas Orações, Registro rápido, Relacionamentos e Testemunhos.


## V80.5.1 — 16/08/2026
- Corrigida a validação do instalador V80.5.
- A falha anterior era do próprio validador: ele procurava um comentário específico no JavaScript.
- Agora a validação verifica o comportamento real:
  - não existe chamada ativa `criarPainelDiarioRapido();`;
  - existe remoção defensiva de `#quick-journal-card`;
  - `painel.html` aponta para o dashboard correto.
- Nenhuma regra funcional de Cuidado foi revertida.


## V80.5.2 — 16/08/2026
- Pacote corrigido com nome e banner próprios para evitar execução acidental da V80.5 antiga.
- Validação do instalador verifica comportamento real, não comentários de código.
- Mantém Registro rápido fora de Missões e Cuidado na ordem definida.


## V80.6 — 16/08/2026
- Cuidado volta a funcionar como grupo/accordion real.
- Nome Cuidado abre o Mapa de Cuidado.
- Seta independente expande/recolhe o submenu.
- Estado aberto/fechado persiste no localStorage.
- Mobile usa a seta para abrir a lista de itens de Cuidado.


## V80.6.1 — 16/08/2026
- Corrigido o agrupamento do Cuidado.
- O card inteiro Cuidado passa a abrir/recolher quando o usuário já está em uma página de Cuidado.
- Estado `memory:sidebar:care-open=0` passa a ser respeitado mesmo quando a página ativa pertence a Cuidado.
- Ao acessar Cuidado vindo de outra área, o sistema abre Mapa de Cuidado e expande o grupo.
- Removido o botão separado de disclosure da V80.6.
