"use strict";

window.MMCD_TREINO_PLANO_PADRAO = {
  schemaVersion: 3,
  programa: {
    id: "pai-atleta-hardcore-fase-1",
    nome: "Projeto Pai Atleta — Hardcore | Fase 1",
    objetivo: "Físico atlético + definição superior + pernas fortes + condicionamento para futebol",
    dataInicio: "2026-08-12",
    dataFim: "",
    status: "ativo",
    observacoes: "Frequência: 6 dias por semana. Domingo: recuperação. Duração esperada: 60–80 min. Regra de intensidade: RIR 1–2 nos exercícios principais; finalizadores podem chegar muito próximo do limite. Hardcore = carga séria, execução séria, descanso controlado e progressão registrada."
  },
  treinos: [
    {
      id: "segunda-futebol",
      diaSemana: 1,
      diaNome: "Segunda-feira",
      nome: "Futebol",
      tituloCurto: "FUTEBOL",
      tipo: "futebol",
      objetivo: "Estímulo esportivo máximo da semana",
      intensidade: 5,
      orientacao: "Aquecimento de 10–12 min antes do jogo. Depois, registrar duração e percepção de intensidade, fôlego, explosão, pernas e recuperação entre esforços.",
      aquecimentoSchemaVersion: 2,
      aquecimento: [
        {id:"futebol-caminhada-trote",nome:"Trote leve",prescricao:"2 min",texto:"2 minutos de trote leve",guiaId:"futebol-caminhada-trote"},
        {id:"futebol-agachamento-livre",nome:"Agachamento livre",prescricao:"2 × 10",texto:"2 × 10 agachamentos livres",guiaId:"futebol-agachamento-livre"},
        {id:"futebol-avanco-alternado",nome:"Avanço alternado",prescricao:"2 × 8 por perna",texto:"2 × 8 avanços por perna",guiaId:"futebol-avanco-alternado"},
        {id:"futebol-mobilidade-quadril",nome:"Mobilidade de quadril",prescricao:"10 movimentos por lado",texto:"10 movimentos de mobilidade de quadril por lado",guiaId:"futebol-mobilidade-quadril"},
        {id:"futebol-mobilidade-tornozelo",nome:"Mobilidade de tornozelo",prescricao:"10 movimentos por lado",texto:"10 movimentos de mobilidade de tornozelo por lado",guiaId:"futebol-mobilidade-tornozelo"},
        {id:"futebol-skipping",nome:"Skipping",prescricao:"2 × 20 s",texto:"2 × 20 segundos de skipping",guiaId:"futebol-skipping"},
        {id:"futebol-aceleracao-progressiva",nome:"Acelerações progressivas",prescricao:"3 repetições · 50% / 70% / 85–90%",texto:"3 acelerações progressivas: 50%, 70% e 85–90%",guiaId:"futebol-aceleracao-progressiva"}
      ]
    },
    {
      id: "terca-superior-a",
      diaSemana: 2,
      diaNome: "Terça-feira",
      nome: "Superior A",
      tituloCurto: "SUPERIOR A",
      tipo: "musculacao",
      objetivo: "Costas + peito + ombros + braços + core",
      intensidade: 5,
      orientacao: "RIR 1–2 nos exercícios principais. Respeitar os descansos e manter execução controlada.",
      exercicios: [
        {id:"remada-baixa-crossover",nome:"Remada baixa no crossover",equipamento:"Crossover",grupo:"Costas",series:4,reps:"6–8",registro:"peso_reps",descanso:"90–120 s",observacao:"BLOCO A — FORÇA · RIR 1–2."},
        {id:"supino-inclinado-smith",nome:"Supino inclinado no Smith — 45°",equipamento:"Smith",grupo:"Peito",series:4,reps:"6–8",registro:"peso_reps",descanso:"90–120 s",observacao:"BLOCO A — FORÇA · RIR 1–2.",guiaId:"supino-inclinado-smith"},
        {id:"puxada-alta-ajoelhado-crossover",nome:"Puxada alta ajoelhado no crossover",equipamento:"Crossover",grupo:"Costas",series:4,reps:"8–10",registro:"peso_reps",descanso:"60–90 s",observacao:"BLOCO B — VOLUME."},
        {id:"crucifixo-crossover",nome:"Crucifixo no crossover",equipamento:"Crossover",grupo:"Peito",series:3,reps:"10–12",registro:"peso_reps",descanso:"60–90 s",observacao:"BLOCO B — VOLUME."},
        {id:"elevacao-lateral-unilateral-crossover",nome:"Elevação lateral unilateral no crossover",equipamento:"Crossover",grupo:"Ombros",series:4,reps:"12–15 por braço",registro:"peso_reps",descanso:"45–60 s",observacao:"BLOCO C — OMBRO ATLÉTICO."},
        {id:"face-pull",nome:"Face Pull",equipamento:"Crossover",grupo:"Ombros / costas",series:3,reps:"12–15",registro:"peso_reps",descanso:"45–60 s",observacao:"BLOCO C — OMBRO ATLÉTICO."},
        {id:"rosca-biceps-crossover-a",nome:"Rosca no crossover",equipamento:"Crossover",grupo:"Bíceps",series:3,reps:"10–12",registro:"peso_reps",descanso:"60 s após o bi-set",observacao:"BLOCO D — BRAÇOS · Bi-set com Tríceps na polia."},
        {id:"triceps-polia-a",nome:"Tríceps na polia",equipamento:"Polia",grupo:"Tríceps",series:3,reps:"10–12",registro:"peso_reps",descanso:"60 s após o bi-set",observacao:"BLOCO D — BRAÇOS · Bi-set com Rosca no crossover."},
        {id:"pallof-press-a",nome:"Pallof Press",equipamento:"Crossover",grupo:"Core",series:3,reps:"12 por lado",registro:"peso_reps",descanso:"45–60 s"},
        {id:"prancha-a",nome:"Prancha",equipamento:"Peso corporal",grupo:"Core",series:3,reps:"45–60 s",registro:"tempo",segundos:45,descanso:"45–60 s"}
      ]
    },
    {
      id: "quarta-pernas-forca",
      diaSemana: 3,
      diaNome: "Quarta-feira",
      nome: "Pernas — Força Bruta",
      tituloCurto: "PERNAS — FORÇA BRUTA",
      tipo: "musculacao",
      objetivo: "Principal treino de força da semana",
      intensidade: 5,
      orientacao: "RIR 1–2. Carga pesada, técnica sólida e descanso completo nos movimentos principais.",
      exercicios: [
        {id:"leg-press-forca",nome:"Leg Press",equipamento:"Leg Press",grupo:"Pernas",series:5,reps:"5",registro:"peso_reps",descanso:"2–3 min",observacao:"Carga pesada. Só aumentar quando completar 5 / 5 / 5 / 5 / 5 com boa execução."},
        {id:"agachamento-smith-forca",nome:"Agachamento no Smith",equipamento:"Smith",grupo:"Pernas",series:4,reps:"6",registro:"peso_reps",descanso:"2 min",observacao:"Descida controlada e subida forte."},
        {id:"afundo-com-halter",nome:"Afundo com halter",equipamento:"Halteres",grupo:"Pernas",series:3,reps:"8 por perna",registro:"peso_reps",descanso:"90 s",guiaId:"afundo-com-halter",observacao:"Passada firme, tronco estável e joelho acompanhando a linha do pé."},
        {id:"cadeira-flexora-forca",nome:"Cadeira Flexora",equipamento:"Cadeira Flexora",grupo:"Posterior",series:4,reps:"8",registro:"peso_reps",descanso:"90 s",observacao:"Descida controlada."},
        {id:"cadeira-extensora-forca",nome:"Cadeira Extensora",equipamento:"Cadeira Extensora",grupo:"Quadríceps",series:4,reps:"8–10",registro:"peso_reps",descanso:"75–90 s",observacao:"Subida forte."},
        {id:"cadeira-adutora-forca",nome:"Cadeira Adutora",equipamento:"Cadeira Adutora",grupo:"Adutores",series:3,reps:"12",registro:"peso_reps",descanso:"60–75 s"},
        {id:"cadeira-abdutora-forca",nome:"Cadeira Abdutora",equipamento:"Cadeira Abdutora",grupo:"Abdutores",series:3,reps:"15",registro:"peso_reps",descanso:"60–75 s"},
        {id:"panturrilha-leg-press",nome:"Panturrilha no Leg Press",equipamento:"Leg Press",grupo:"Panturrilha",series:4,reps:"12",registro:"peso_reps",descanso:"60–75 s",observacao:"Segurar aproximadamente 1 segundo no ponto alto."},
        {id:"cardio-bike-quarta",nome:"Cardio — Bike pós-treino",equipamento:"Bicicleta",grupo:"Condicionamento",series:1,reps:"15 min · RPE 6–7/10",registro:"protocolo",descanso:"—",guiaId:"bike-estacionaria",observacao:"Ritmo contínuo moderado após o treino de força. O objetivo é somar condicionamento sem transformar a quarta em outro treino de HIIT."}
      ]
    },
    {
      id: "quinta-motor-hiit",
      diaSemana: 4,
      diaNome: "Quinta-feira",
      nome: "Motor",
      tituloCurto: "MOTOR",
      tipo: "cardio",
      objetivo: "Acelerar → recuperar → acelerar novamente",
      intensidade: 5,
      equipamento: "Bicicleta",
      orientacao: "O objetivo é condicionamento, não hipertrofia. No bloco forte, trabalhar em RPE aproximado de 8,5–9/10.",
      protocolo: [
        "Aquecimento — 8 min progressivos",
        "Bloco A — 4 ciclos: 4 min forte (RPE 8,5–9/10) + 3 min leve",
        "Recuperação — 5 min leves",
        "Bloco B — 8 ciclos: 15 s muito forte + 45 s leve",
        "Volta à calma — 8 min leves"
      ],
      exercicios: [
        {id:"wood-chop-crossover",nome:"Wood Chop no crossover",equipamento:"Crossover",grupo:"Core",series:3,reps:"12 por lado",registro:"peso_reps",descanso:"45–60 s"},
        {id:"pallof-press-hiit",nome:"Pallof Press",equipamento:"Crossover",grupo:"Core",series:3,reps:"12 por lado",registro:"peso_reps",descanso:"45–60 s"},
        {id:"prancha-lateral-hiit",nome:"Prancha lateral",equipamento:"Peso corporal",grupo:"Core",series:3,reps:"40 s por lado",registro:"tempo",segundos:40,descanso:"45 s"}
      ]
    },
    {
      id: "sexta-superior-b",
      diaSemana: 5,
      diaNome: "Sexta-feira",
      nome: "Superior B — Shape",
      tituloCurto: "SUPERIOR B — SHAPE",
      tipo: "musculacao",
      objetivo: "Peito cheio + costas largas + ombros aparentes + braços definidos",
      intensidade: 5,
      orientacao: "RIR 1–2 nos exercícios principais. Nos finalizadores de braços, chegar muito próximo da falha com técnica.",
      exercicios: [
        {id:"supino-reto-smith",nome:"Supino reto no Smith",equipamento:"Smith",grupo:"Peito",series:4,reps:"8–10",registro:"peso_reps",descanso:"90 s",guiaId:"supino-reto-smith"},
        {id:"remada-crossover-b",nome:"Remada no crossover",equipamento:"Crossover",grupo:"Costas",series:4,reps:"8–10",registro:"peso_reps",descanso:"90 s"},
        {id:"supino-inclinado-smith",nome:"Supino inclinado 45°",equipamento:"Smith",grupo:"Peito",series:3,reps:"10–12",registro:"peso_reps",descanso:"90 s",guiaId:"supino-inclinado-smith"},
        {id:"puxada-alta-crossover-b",nome:"Puxada alta no crossover",equipamento:"Crossover",grupo:"Costas",series:3,reps:"10–12",registro:"peso_reps",descanso:"75–90 s"},
        {id:"elevacao-lateral-crossover",nome:"Elevação lateral no crossover",equipamento:"Crossover",grupo:"Ombros",series:4,reps:"12–15",registro:"peso_reps",descanso:"45–60 s",observacao:"Última série: reduzir a carga aproximadamente 30% e fazer +8–12 repetições."},
        {id:"face-pull",nome:"Face Pull",equipamento:"Crossover",grupo:"Ombros / costas",series:3,reps:"15",registro:"peso_reps",descanso:"45–60 s"},
        {id:"rosca-biceps-crossover-b",nome:"Rosca na polia",equipamento:"Crossover",grupo:"Bíceps",series:4,reps:"10–12",registro:"peso_reps",descanso:"45–60 s após o bi-set",observacao:"Bi-set com Tríceps. Na última série, reduzir a carga e continuar até muito próximo da falha."},
        {id:"triceps-polia-b",nome:"Tríceps na polia",equipamento:"Polia",grupo:"Tríceps",series:4,reps:"10–12",registro:"peso_reps",descanso:"45–60 s após o bi-set",observacao:"Bi-set com Rosca. Na última série, reduzir a carga e continuar até muito próximo da falha."},
        {id:"cardio-bike-sexta",nome:"Cardio — Bike pós-treino",equipamento:"Bicicleta",grupo:"Condicionamento",series:1,reps:"20 min · RPE 6–7/10",registro:"protocolo",descanso:"—",guiaId:"bike-estacionaria",observacao:"Ritmo contínuo moderado ao final do Superior B. Manter cadência estável; não é um segundo HIIT da semana."}
      ]
    },
    {
      id: "sabado-pernas-atleta",
      diaSemana: 6,
      diaNome: "Sábado",
      nome: "Pernas — Atleta + Resistência",
      tituloCurto: "PERNAS — ATLETA + RESISTÊNCIA",
      tipo: "musculacao",
      objetivo: "Unilateral + volume + resistência muscular + condicionamento",
      intensidade: 5,
      orientacao: "Quarta é força. Sábado é unilateral, volume, resistência muscular e condicionamento.",
      exercicios: [
        {id:"leg-press-unilateral",nome:"Leg Press Unilateral",equipamento:"Leg Press",grupo:"Pernas",series:4,reps:"10 por perna",registro:"peso_reps",descanso:"60–90 s"},
        {id:"avanco-reverso-smith",nome:"Avanço Reverso no Smith",equipamento:"Smith",grupo:"Pernas",series:4,reps:"8 por perna",registro:"peso_reps",descanso:"60–90 s"},
        {id:"cadeira-flexora-resistencia",nome:"Cadeira Flexora",equipamento:"Cadeira Flexora",grupo:"Posterior",series:4,reps:"10–12",registro:"peso_reps",descanso:"75 s",observacao:"Tempo: 1 segundo para subir e 3 segundos para voltar."},
        {id:"cadeira-extensora-resistencia",nome:"Cadeira Extensora",equipamento:"Cadeira Extensora",grupo:"Quadríceps",series:3,reps:"12–15",registro:"peso_reps",descanso:"60–75 s",observacao:"Subida explosiva e descida controlada."},
        {id:"cadeira-adutora-resistencia",nome:"Cadeira Adutora",equipamento:"Cadeira Adutora",grupo:"Adutores",series:3,reps:"15",registro:"peso_reps",descanso:"60 s"},
        {id:"cadeira-abdutora-resistencia",nome:"Cadeira Abdutora",equipamento:"Cadeira Abdutora",grupo:"Abdutores",series:3,reps:"15–20",registro:"peso_reps",descanso:"60 s"},
        {id:"panturrilha-leg-press",nome:"Panturrilha no Leg Press",equipamento:"Leg Press",grupo:"Panturrilha",series:4,reps:"15",registro:"peso_reps",descanso:"60–75 s"},
        {id:"leg-press-finisher-sabado",nome:"Finisher — Leg Press",equipamento:"Leg Press",grupo:"Pernas",series:3,reps:"15",registro:"peso_reps",descanso:"60 s",observacao:"Carga moderada. O estímulo aqui é resistência muscular."},
        {id:"finisher-bike-sabado",nome:"Finisher final — Bike",equipamento:"Bicicleta",grupo:"Condicionamento",series:1,reps:"8 ciclos: 20 s forte + 40 s leve · depois 5 min leves",registro:"protocolo",observacao:"Encerrar com 5 minutos bem leves."}
      ]
    },
    {
      id: "domingo-descanso",
      diaSemana: 0,
      diaNome: "Domingo",
      nome: "Recuperação",
      tituloCurto: "RECUPERAÇÃO",
      tipo: "descanso",
      objetivo: "Chegar na segunda capaz de jogar futebol com intensidade",
      intensidade: 0,
      orientacao: "Sem treino obrigatório. Caminhada leve, mobilidade e alongamentos leves são opcionais."
    }
  ]
};
