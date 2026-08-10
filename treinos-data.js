"use strict";

window.MMCD_TREINO_PLANO_PADRAO = {
  schemaVersion: 1,
  programa: {
    id: "plano-treino-fase-1",
    nome: "Plano de treino — Fase 1",
    objetivo: "Força + condicionamento + definição corporal",
    dataInicio: "",
    dataFim: "",
    status: "ativo",
    observacoes: "Plano inicial. O período e a composição podem ser ajustados em Configurações > Plano de treino."
  },
  treinos: [
    {
      id: "segunda-futebol",
      diaSemana: 1,
      diaNome: "Segunda-feira",
      nome: "Futebol",
      tituloCurto: "FUTEBOL",
      tipo: "futebol",
      objetivo: "Condicionamento para o futebol",
      intensidade: 5,
      aquecimento: [
        "2 min caminhada/trote",
        "2 × 10 agachamentos livres",
        "2 × 8 avanços alternados",
        "2 × 20 segundos de skipping",
        "3 acelerações progressivas"
      ]
    },
    {
      id: "terca-superior-a",
      diaSemana: 2,
      diaNome: "Terça-feira",
      nome: "Superior A",
      tituloCurto: "SUPERIOR A",
      tipo: "musculacao",
      objetivo: "Costas + braços + core",
      intensidade: 5,
      exercicios: [
        {id:"remada-baixa-crossover",nome:"Remada baixa no crossover",equipamento:"Crossover",grupo:"Costas",series:4,reps:"8–10",registro:"peso_reps",descanso:"90 s"},
        {id:"puxada-alta-crossover",nome:"Puxada alta no crossover",equipamento:"Crossover",grupo:"Costas",series:4,reps:"8–10",registro:"peso_reps",descanso:"90 s"},
        {id:"remada-unilateral-crossover",nome:"Remada unilateral no crossover",equipamento:"Crossover",grupo:"Costas",series:3,reps:"10 cada lado",registro:"peso_reps",descanso:"75–90 s"},
        {id:"rosca-biceps-crossover-a",nome:"Rosca de bíceps no crossover",equipamento:"Crossover",grupo:"Bíceps",series:4,reps:"10–12",registro:"peso_reps",descanso:"60–75 s"},
        {id:"triceps-polia-a",nome:"Tríceps na polia",equipamento:"Polia",grupo:"Tríceps",series:4,reps:"10–12",registro:"peso_reps",descanso:"60–75 s"},
        {id:"face-pull",nome:"Face Pull",equipamento:"Crossover",grupo:"Ombros / costas",series:3,reps:"12–15",registro:"peso_reps",descanso:"60 s",observacao:"Executar somente se não provocar desconforto no ombro."},
        {id:"pallof-press-a",nome:"Pallof Press",equipamento:"Crossover",grupo:"Core",series:4,reps:"10 cada lado",registro:"peso_reps",descanso:"45–60 s"},
        {id:"prancha-a",nome:"Prancha",equipamento:"Peso corporal",grupo:"Core",series:3,reps:"45–60 s",registro:"tempo",segundos:45,descanso:"45–60 s"}
      ]
    },
    {
      id: "quarta-pernas-forca",
      diaSemana: 3,
      diaNome: "Quarta-feira",
      nome: "Pernas — Força",
      tituloCurto: "PERNAS — FORÇA",
      tipo: "musculacao",
      objetivo: "Força máxima das pernas",
      intensidade: 5,
      exercicios: [
        {id:"leg-press-forca",nome:"Leg Press",equipamento:"Leg Press",grupo:"Pernas",series:5,reps:"5",registro:"peso_reps",descanso:"2–3 min"},
        {id:"afundo-bulgaro-smith",nome:"Afundo Búlgaro no Smith",equipamento:"Smith",grupo:"Pernas",series:4,reps:"6 por perna",registro:"peso_reps",descanso:"~2 min"},
        {id:"cadeira-flexora-forca",nome:"Cadeira Flexora",equipamento:"Cadeira Flexora",grupo:"Posterior",series:4,reps:"6–8",registro:"peso_reps",descanso:"90 s"},
        {id:"cadeira-extensora-forca",nome:"Cadeira Extensora",equipamento:"Cadeira Extensora",grupo:"Quadríceps",series:4,reps:"8",registro:"peso_reps",descanso:"75–90 s"},
        {id:"cadeira-adutora-forca",nome:"Cadeira Adutora",equipamento:"Cadeira Adutora",grupo:"Adutores",series:4,reps:"10",registro:"peso_reps",descanso:"60–75 s"},
        {id:"cadeira-abdutora-forca",nome:"Cadeira Abdutora",equipamento:"Cadeira Abdutora",grupo:"Abdutores",series:4,reps:"12",registro:"peso_reps",descanso:"60–75 s"},
        {id:"panturrilha-leg-press",nome:"Panturrilha no Leg Press",equipamento:"Leg Press",grupo:"Panturrilha",series:4,reps:"10–12",registro:"peso_reps",descanso:"60–75 s",observacao:"Executar somente se não provocar desconforto na canela."}
      ],
      observacao:"Não incluir levantamento terra nem terra romeno nesta fase."
    },
    {
      id: "quinta-motor-hiit",
      diaSemana: 4,
      diaNome: "Quinta-feira",
      nome: "Motor — HIIT",
      tituloCurto: "MOTOR — HIIT",
      tipo: "cardio",
      objetivo: "Condicionamento cardiovascular e capacidade de recuperação",
      intensidade: 5,
      equipamento:"Bicicleta",
      protocolo: [
        "Aquecimento — 8 min de bicicleta",
        "Bloco 1 — 4 ciclos: 4 min forte + 3 min leve",
        "5 min leves",
        "Bloco 2 — 8 ciclos: 15 s muito forte + 45 s leve",
        "Volta à calma — 8 min leves"
      ],
      exercicios: [
        {id:"pallof-press-hiit",nome:"Pallof Press",equipamento:"Crossover",grupo:"Core",series:3,reps:"12 cada lado",registro:"peso_reps",descanso:"45–60 s"},
        {id:"prancha-hiit",nome:"Prancha",equipamento:"Peso corporal",grupo:"Core",series:3,reps:"60 s",registro:"tempo",segundos:60,descanso:"45 s"},
        {id:"prancha-lateral-hiit",nome:"Prancha lateral",equipamento:"Peso corporal",grupo:"Core",series:3,reps:"40 s cada lado",registro:"tempo",segundos:40,descanso:"45 s"}
      ]
    },
    {
      id: "sexta-pernas-unilateral",
      diaSemana: 5,
      diaNome: "Sexta-feira",
      nome: "Pernas — Unilateral + Resistência",
      tituloCurto: "PERNAS — UNILATERAL + RESISTÊNCIA",
      tipo: "musculacao",
      objetivo: "Força unilateral + resistência muscular",
      intensidade: 5,
      exercicios: [
        {id:"leg-press-unilateral",nome:"Leg Press Unilateral",equipamento:"Leg Press",grupo:"Pernas",series:4,reps:"8 por perna",registro:"peso_reps",descanso:"90 s"},
        {id:"avanco-reverso-smith",nome:"Avanço Reverso no Smith",equipamento:"Smith",grupo:"Pernas",series:4,reps:"8 por perna",registro:"peso_reps",descanso:"90 s"},
        {id:"cadeira-flexora-resistencia",nome:"Cadeira Flexora",equipamento:"Cadeira Flexora",grupo:"Posterior",series:4,reps:"10",registro:"peso_reps",descanso:"75 s",observacao:"3 segundos na fase de retorno."},
        {id:"cadeira-extensora-resistencia",nome:"Cadeira Extensora",equipamento:"Cadeira Extensora",grupo:"Quadríceps",series:4,reps:"12",registro:"peso_reps",descanso:"60–75 s"},
        {id:"cadeira-adutora-resistencia",nome:"Cadeira Adutora",equipamento:"Cadeira Adutora",grupo:"Adutores",series:3,reps:"15",registro:"peso_reps",descanso:"60 s"},
        {id:"cadeira-abdutora-resistencia",nome:"Cadeira Abdutora",equipamento:"Cadeira Abdutora",grupo:"Abdutores",series:3,reps:"15",registro:"peso_reps",descanso:"60 s"},
        {id:"finisher-bike-sexta",nome:"Finisher — Bike",equipamento:"Bicicleta",grupo:"Condicionamento",series:1,reps:"10 ciclos: 20 s forte + 40 s leve",registro:"protocolo"}
      ]
    },
    {
      id: "sabado-superior-b",
      diaSemana: 6,
      diaNome: "Sábado",
      nome: "Superior B",
      tituloCurto: "SUPERIOR B",
      tipo: "musculacao",
      objetivo: "Peito + costas + braços + definição superior",
      intensidade: 5,
      exercicios: [
        {id:"supino-inclinado-smith",nome:"Supino Inclinado no Smith",equipamento:"Smith",grupo:"Peito",series:4,reps:"8–10",registro:"peso_reps",descanso:"90 s",observacao:"Executar somente sem dor no ombro."},
        {id:"remada-crossover-b",nome:"Remada no crossover",equipamento:"Crossover",grupo:"Costas",series:4,reps:"8–10",registro:"peso_reps",descanso:"90 s"},
        {id:"puxada-alta-crossover-b",nome:"Puxada alta no crossover",equipamento:"Crossover",grupo:"Costas",series:4,reps:"10",registro:"peso_reps",descanso:"75–90 s"},
        {id:"supino-reto-smith",nome:"Supino reto no Smith",equipamento:"Smith",grupo:"Peito",series:3,reps:"10",registro:"peso_reps",descanso:"90 s",observacao:"Executar somente sem dor no ombro."},
        {id:"rosca-biceps-crossover-b",nome:"Rosca de bíceps no crossover",equipamento:"Crossover",grupo:"Bíceps",series:3,reps:"12",registro:"peso_reps",descanso:"60–75 s"},
        {id:"triceps-polia-b",nome:"Tríceps na polia",equipamento:"Polia",grupo:"Tríceps",series:3,reps:"12",registro:"peso_reps",descanso:"60–75 s"},
        {id:"remada-unilateral-crossover-b",nome:"Remada unilateral no crossover",equipamento:"Crossover",grupo:"Costas",series:3,reps:"12 cada lado",registro:"peso_reps",descanso:"75 s"},
        {id:"bike-final-sabado",nome:"Bike — Final",equipamento:"Bicicleta",grupo:"Condicionamento",series:1,reps:"20 min moderado/forte",registro:"protocolo"}
      ]
    },
    {
      id: "domingo-descanso",
      diaSemana: 0,
      diaNome: "Domingo",
      nome: "Descanso",
      tituloCurto: "DESCANSO",
      tipo: "descanso",
      objetivo: "Recuperação",
      intensidade: 0
    }
  ]
};