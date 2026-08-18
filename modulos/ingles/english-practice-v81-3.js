"use strict";

window.MMCDEnglishPractice = (() => {
  const KEY = "ingles_pratica_v2";
  const SCHEMA = 3;
  const QUESTIONS_PER_ROUND = 18;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  const normalize = value => String(value || "")
    .toLocaleLowerCase("en-US")
    .replace(/[’]/g, "'")
    .replace(/[.!?,;:]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const toast = message => window.MMCDUI?.toast?.(message);

  const C = (id,prompt,options,answer,hint,explain,topic="") => ({
    id,kind:"choice",prompt,options,answer,hint,explain,topic
  });

  const I = (id,prompt,answers,model,hint,explain,topic="") => ({
    id,kind:"input",prompt,answers:Array.isArray(answers)?answers:[answers],model,hint,explain,topic
  });

  const LESSONS = [
    {
      id:"1b-there-is-are",classLabel:"Class 1B",title:"There is / There are",
      purpose:"descrever existência, quantidade e situações ao seu redor",
      rule:"Use there is com singular e there are com plural. Em perguntas, inverta is/are.",
      keywords:["there is","there are","is there","are there"],
      core:[
        C("1b-1","There ___ three reasons to change the plan.",["is","are","has"],"are","Observe o substantivo plural: three reasons.","Three reasons é plural, então usamos there are.","There is / are"),
        I("1b-2","Passe para a negativa: There is a problem with the report.",["there isn't a problem with the report","there is not a problem with the report"],"There isn't a problem with the report.","Negue o verbo be.","There is → there isn't / there is not.","There is / are"),
        I("1b-3","Transforme em pergunta: There are two meetings today.",["are there two meetings today"],"Are there two meetings today?","Leve are para a frente.","Pergunta: Are there + plural...?","There is / are"),
        I("1b-4","Corrija: There is many people waiting.",["there are many people waiting"],"There are many people waiting.","Many people é plural.","Com plural, use there are.","There is / are"),
        I("1b-5","Traduza: Há uma boa oportunidade aqui.",["there is a good opportunity here"],"There is a good opportunity here.","Comece com There is.","Singular: there is a good opportunity.","There is / are"),
        I("1b-6","Traduza: Há algumas mudanças que precisamos fazer.",["there are some changes we need to make","there are some changes that we need to make"],"There are some changes we need to make.","Changes é plural.","Plural: there are some changes...","There is / are")
      ]
    },
    {
      id:"2b-possessives",classLabel:"Class 2B",title:"Possessives",
      purpose:"indicar posse com possessive adjectives e possessive pronouns",
      rule:"My/your/his/her/our/their vêm antes de substantivos. Mine/yours/his/hers/ours/theirs substituem o substantivo.",
      keywords:["my / mine","your / yours","her / hers","our / ours"],
      core:[
        C("2b-1","This is ___ responsibility, not mine.",["your","yours","you"],"your","Há um substantivo depois da lacuna: responsibility.","Antes de substantivo, use possessive adjective: your responsibility.","Possessives"),
        C("2b-2","This notebook is ___.",["my","mine","me"],"mine","Não há substantivo depois da lacuna.","Mine substitui 'my notebook'.","Possessives"),
        I("2b-3","Reescreva: This laptop belongs to her.",["this laptop is hers"],"This laptop is hers.","Use um possessive pronoun.","Her laptop → hers.","Possessives"),
        I("2b-4","Corrija: This is mine car.",["this is my car"],"This is my car.","Car vem depois da palavra de posse.","Antes do substantivo, use my, não mine.","Possessives"),
        I("2b-5","Complete: We finished ___ part, and they finished ___.",["we finished our part and they finished theirs"],"We finished our part, and they finished theirs.","Primeiro há substantivo; depois ele é omitido.","Our part / theirs.","Possessives"),
        I("2b-6","Traduza: A decisão é nossa.",["the decision is ours"],"The decision is ours.","Não repita o substantivo depois de 'our'.","Ours funciona sozinho.","Possessives")
      ]
    },
    {
      id:"2c-do-does-did",classLabel:"Class 2C",title:"Do, Does, Did",
      purpose:"formular perguntas e negativas no presente e no passado",
      rule:"Do/does trabalham no presente; did no passado. Depois do auxiliar, o verbo principal fica na forma base.",
      keywords:["do","does","did","don't / doesn't / didn't"],
      core:[
        C("2c-1","Which sentence is correct?",["Does she works with you?","Does she work with you?","Do she work with you?"],"Does she work with you?","Depois de does, o verbo volta à forma base.","Does + she + work.","Do / Does / Did"),
        I("2c-2","Passe para a negativa: He needs more time.",["he doesn't need more time","he does not need more time"],"He doesn't need more time.","Use doesn't + verbo base.","Needs perde o -s depois de doesn't.","Do / Does / Did"),
        I("2c-3","Transforme em pergunta: They finished the project yesterday.",["did they finish the project yesterday"],"Did they finish the project yesterday?","Yesterday pede passado.","Did + subject + base verb.","Do / Does / Did"),
        I("2c-4","Corrija: I didn't went to the meeting.",["i didn't go to the meeting","i did not go to the meeting"],"I didn't go to the meeting.","Depois de didn't, use a forma base.","Went volta para go.","Do / Does / Did"),
        I("2c-5","Monte uma pergunta natural para saber se ela gosta do trabalho.",["does she like the job","does she like her job","does she like this job"],"Does she like the job?","Presente + she.","Does she + like...?","Do / Does / Did"),
        I("2c-6","Traduza: Você viu o e-mail ontem?",["did you see the email yesterday","did you see the e-mail yesterday"],"Did you see the email yesterday?","Use did por causa de yesterday.","Did + you + see.","Do / Does / Did")
      ]
    },
    {
      id:"2d-wh-questions",classLabel:"Class 2D",title:"WH Questions",
      purpose:"perguntar por lugar, motivo, tempo, pessoa, escolha e maneira",
      rule:"WH word + auxiliar + sujeito + verbo. Se who for o sujeito, muitas vezes não usamos do/does/did.",
      keywords:["what","where","when","why","who","how"],
      core:[
        I("2d-1","Monte: why / you / did / change / the plan",["why did you change the plan"],"Why did you change the plan?","No passado, use did antes do sujeito.","Why + did + you + change.","WH Questions"),
        I("2d-2","Monte: where / she / does / work",["where does she work"],"Where does she work?","Com she no presente, use does.","Where + does + she + work.","WH Questions"),
        C("2d-3","___ called you after the meeting?",["Who","Where","Why"],"Who","A pergunta procura a pessoa que realizou a ação.","Who pode ocupar o lugar do sujeito.","WH Questions"),
        I("2d-4","Faça uma pergunta para descobrir quando o projeto começou.",["when did the project start"],"When did the project start?","Started volta para start depois de did.","When + did + subject + base verb.","WH Questions"),
        I("2d-5","Faça uma pergunta para descobrir como ela resolveu o problema.",["how did she solve the problem"],"How did she solve the problem?","Use how para maneira.","How + did + she + solve.","WH Questions"),
        I("2d-6","Corrija: Why you didn't call me?",["why didn't you call me","why did you not call me"],"Why didn't you call me?","O auxiliar vem antes do sujeito.","Why + didn't + you + call.","WH Questions")
      ]
    },
    {
      id:"3a-adjectives",classLabel:"Class 3A",title:"Adjectives",
      purpose:"descrever pessoas, coisas e situações com mais precisão",
      rule:"Adjetivos em inglês normalmente vêm antes do substantivo e não variam em gênero ou número.",
      keywords:["clear","difficult","important","useful"],
      core:[
        C("3a-1","Choose the natural phrase.",["a report clear","a clear report","a clearly report"],"a clear report","O adjetivo vem antes do substantivo.","A clear report.","Adjectives"),
        I("3a-2","Corrija: They are importants decisions.",["they are important decisions"],"They are important decisions.","Adjetivos não recebem plural.","Important permanece igual.","Adjectives"),
        I("3a-3","Reescreva usando 'difficult': The task is not easy.",["the task is difficult"],"The task is difficult.","Use adjective depois de be.","The task is difficult.","Adjectives"),
        I("3a-4","Traduza: Foi uma conversa importante.",["it was an important conversation"],"It was an important conversation.","Adjetivo antes de conversation.","An important conversation.","Adjectives"),
        C("3a-5","She gave me a very ___ explanation.",["help","helpful","helpfully"],"helpful","Precisamos de um adjetivo antes de explanation.","Helpful é adjetivo.","Adjectives"),
        I("3a-6","Corrija: This solution is more simple.",["this solution is simpler"],"This solution is simpler.","Para short adjectives, prefira comparative form.","Simple → simpler.","Adjectives")
      ]
    },
    {
      id:"3b-degree-adjectives",classLabel:"Class 3B",title:"Comparatives & Superlatives",
      purpose:"comparar resultados, pessoas, opções e situações",
      rule:"Use -er/-est em muitos adjetivos curtos; more/most em muitos adjetivos longos. Use than em comparações.",
      keywords:["better","more important","the best","than"],
      core:[
        C("3b-1","This option is ___ than the first one.",["better","best","more good"],"better","Good é irregular.","Good → better → best.","Comparatives"),
        I("3b-2","Complete: This task is ___ (difficult) than yesterday's.",["this task is more difficult than yesterday's","this task is more difficult than yesterdays"],"This task is more difficult than yesterday's.","Difficult normalmente usa more.","More difficult than.","Comparatives"),
        I("3b-3","Corrija: She is the more experienced person here.",["she is the most experienced person here"],"She is the most experienced person here.","Há comparação com todo o grupo.","Use the most para superlativo.","Comparatives"),
        I("3b-4","Traduza: Este relatório é mais claro que o anterior.",["this report is clearer than the previous one","this report is clearer than the last one"],"This report is clearer than the previous one.","Clear é curto.","Clearer than.","Comparatives"),
        C("3b-5","Which is correct?",["This is the best result so far.","This is the better result so far.","This is best result so far."],"This is the best result so far.","Superlative pede the.","The best result.","Comparatives"),
        I("3b-6","Use as...as: The two plans are equally effective.",["the two plans are as effective as each other","both plans are as effective as each other"],"The two plans are as effective as each other.","Use as + adjective + as.","As effective as.","Comparatives")
      ]
    },
    {
      id:"3c-articles",classLabel:"Class 3C",title:"Articles",
      purpose:"usar a, an e the com mais naturalidade",
      rule:"A/an apresentam algo não específico no singular; the aponta para algo específico ou já conhecido.",
      keywords:["a","an","the","zero article"],
      core:[
        C("3c-1","I need ___ answer before noon.",["a","an","the"],"an","Answer começa com som de vogal.","An answer.","Articles"),
        C("3c-2","We discussed ___ problem you mentioned yesterday.",["a","an","the"],"the","O problema já foi identificado: you mentioned yesterday.","Use the para algo específico.","Articles"),
        I("3c-3","Corrija: She is a excellent manager.",["she is an excellent manager"],"She is an excellent manager.","Excellent começa com som de vogal.","An excellent manager.","Articles"),
        I("3c-4","Complete naturalmente: I bought ___ new book and ___ book is very useful.",["i bought a new book and the book is very useful"],"I bought a new book and the book is very useful.","Primeira menção: a; segunda: the.","A new book → the book.","Articles"),
        C("3c-5","Choose the natural sentence.",["I go to the work every day.","I go to work every day.","I go to a work every day."],"I go to work every day.","Work, nesse uso geral, não leva artigo.","Go to work.","Articles"),
        I("3c-6","Traduza: O relatório está na mesa.",["the report is on the table"],"The report is on the table.","Ambos são específicos no contexto.","The report / the table.","Articles")
      ]
    },
    {
      id:"3d-prepositions",classLabel:"Class 3D",title:"Prepositions",
      purpose:"falar de tempo, lugar e relações com mais precisão",
      rule:"At costuma indicar horários/pontos; on dias/superfícies; in períodos/áreas; outras preposições dependem da expressão.",
      keywords:["at","on","in","for","from","to"],
      core:[
        C("3d-1","The meeting starts ___ 9:00.",["at","on","in"],"at","Horário específico.","At 9:00.","Prepositions"),
        C("3d-2","I usually train ___ Monday.",["at","on","in"],"on","Dias da semana usam on.","On Monday.","Prepositions"),
        I("3d-3","Corrija: I live at Brazil.",["i live in brazil"],"I live in Brazil.","Países usam in.","In Brazil.","Prepositions"),
        I("3d-4","Complete: We worked ___ the project ___ two weeks.",["we worked on the project for two weeks"],"We worked on the project for two weeks.","Work on a project; duração com for.","On the project / for two weeks.","Prepositions"),
        I("3d-5","Traduza: O documento está sobre a mesa.",["the document is on the table"],"The document is on the table.","Superfície: on.","On the table.","Prepositions"),
        I("3d-6","Corrija: She arrived in 8:30.",["she arrived at 8:30","she arrived at 830"],"She arrived at 8:30.","Horário: at.","At 8:30.","Prepositions")
      ]
    },
    {
      id:"4a-modal-verbs",classLabel:"Class 4A",title:"Modal Verbs",
      purpose:"expressar capacidade, conselho, obrigação e possibilidade",
      rule:"Can, could, should e must vêm seguidos pelo verbo base, sem to e sem -s.",
      keywords:["can","could","should","must"],
      core:[
        I("4a-1","Corrija: She can works from home.",["she can work from home"],"She can work from home.","Depois de modal, verbo base.","Can work.","Modal Verbs"),
        C("4a-2","You look exhausted. You ___ take a break.",["should","should to","mustn't"],"should","A frase expressa conselho.","Should + base verb.","Modal Verbs"),
        I("4a-3","Transforme em pergunta educada: Explain that again.",["could you explain that again","can you explain that again"],"Could you explain that again?","Use could you para um pedido educado.","Could you + base verb.","Modal Verbs"),
        I("4a-4","Passe para a negativa: We must change the deadline.",["we must not change the deadline","we mustn't change the deadline"],"We must not change the deadline.","Negue o próprio modal.","Must not / mustn't.","Modal Verbs"),
        I("4a-5","Traduza: Eu consigo terminar isso hoje.",["i can finish this today"],"I can finish this today.","Capacidade: can.","Can + finish.","Modal Verbs"),
        I("4a-6","Corrija: He should to talk to his manager.",["he should talk to his manager"],"He should talk to his manager.","Should não usa to.","Should talk.","Modal Verbs")
      ]
    },
    {
      id:"4b-regular-verbs",classLabel:"Class 4B",title:"Regular Verbs",
      purpose:"usar o passado de verbos regulares com segurança",
      rule:"Muitos verbos formam o passado com -ed; algumas grafias mudam, como study → studied e plan → planned.",
      keywords:["worked","studied","planned","watched"],
      core:[
        I("4b-1","Complete no passado: We ___ (plan) the meeting carefully.",["we planned the meeting carefully"],"We planned the meeting carefully.","Plan dobra o n.","Planned.","Regular Verbs"),
        C("4b-2","Yesterday she ___ English for two hours.",["studied","studyed","studies"],"studied","Consoante + y: y → ied.","Studied.","Regular Verbs"),
        I("4b-3","Passe para a negativa: I worked late yesterday.",["i didn't work late yesterday","i did not work late yesterday"],"I didn't work late yesterday.","Com did, volte para base verb.","Didn't work.","Regular Verbs"),
        I("4b-4","Transforme em pergunta: They watched the presentation.",["did they watch the presentation"],"Did they watch the presentation?","Use did + base verb.","Did they watch...?","Regular Verbs"),
        I("4b-5","Corrija: We stoped the process.",["we stopped the process"],"We stopped the process.","Stop dobra o p.","Stopped.","Regular Verbs"),
        I("4b-6","Traduza: Ela ajudou a equipe ontem.",["she helped the team yesterday"],"She helped the team yesterday.","Help é regular.","Helped.","Regular Verbs")
      ]
    },
    {
      id:"4c-irregular-verbs",classLabel:"Class 4C",title:"Irregular Verbs",
      purpose:"usar formas passadas irregulares em contextos reais",
      rule:"Verbos irregulares precisam ser reconhecidos e reutilizados: go→went, see→saw, make→made, take→took.",
      keywords:["went","saw","made","took","found","thought"],
      core:[
        C("4c-1","We ___ a better solution yesterday.",["found","finded","find"],"found","Find é irregular.","Find → found.","Irregular Verbs"),
        I("4c-2","Complete: She ___ (make) a difficult decision.",["she made a difficult decision"],"She made a difficult decision.","Make → made.","Use made.","Irregular Verbs"),
        I("4c-3","Transforme em pergunta: You took the car.",["did you take the car"],"Did you take the car?","Depois de did, took volta para take.","Did you take...?","Irregular Verbs"),
        I("4c-4","Corrija: I goed home early.",["i went home early"],"I went home early.","Go é irregular.","Go → went.","Irregular Verbs"),
        I("4c-5","Traduza: Nós vimos o problema imediatamente.",["we saw the problem immediately"],"We saw the problem immediately.","See → saw.","Use saw.","Irregular Verbs"),
        I("4c-6","Complete: I ___ (think) about it last night.",["i thought about it last night"],"I thought about it last night.","Think é irregular.","Think → thought.","Irregular Verbs")
      ]
    },
    {
      id:"4d-simple-present",classLabel:"Class 4D",title:"Simple Present",
      purpose:"falar de rotina, hábitos, fatos e responsabilidades",
      rule:"I/you/we/they usam verbo base. He/she/it normalmente recebe -s/-es. Do/does formam perguntas e negativas.",
      keywords:["work / works","do / does","usually","every day"],
      core:[
        C("4d-1","She usually ___ the report before lunch.",["reviews","review","reviewed"],"reviews","She pede terceira pessoa.","She reviews.","Simple Present"),
        I("4d-2","Passe para a negativa: He works from home on Fridays.",["he doesn't work from home on fridays","he does not work from home on fridays"],"He doesn't work from home on Fridays.","Doesn't + base verb.","Works volta para work.","Simple Present"),
        I("4d-3","Transforme em pergunta: You need more information.",["do you need more information"],"Do you need more information?","Com you, use do.","Do you need...?","Simple Present"),
        I("4d-4","Corrija: My manager don't agree with this.",["my manager doesn't agree with this","my manager does not agree with this"],"My manager doesn't agree with this.","Manager = he/she/it.","Use doesn't.","Simple Present"),
        I("4d-5","Traduza: Eu normalmente treino depois do trabalho.",["i usually train after work","i normally train after work"],"I usually train after work.","Advérbio antes do verbo principal.","Usually train.","Simple Present"),
        I("4d-6","Traduza: Ela lê os dados e depois toma uma decisão.",["she reads the data and then makes a decision","she reads the data and makes a decision"],"She reads the data and then makes a decision.","Terceira pessoa em ambos os verbos.","Reads / makes.","Simple Present")
      ]
    },
    {
      id:"5a-present-continuous",classLabel:"Class 5A",title:"Present Continuous",
      purpose:"falar do que está acontecendo agora ou neste período",
      rule:"Am/is/are + verbo-ing. Perguntas invertem o verbo be; negativas negam o verbo be.",
      keywords:["am working","is changing","are studying","now"],
      core:[
        C("5a-1","We ___ preparing the presentation right now.",["are","do","did"],"are","Right now indica ação em andamento.","We are preparing.","Present Continuous"),
        I("5a-2","Passe para a negativa: She is training.",["she isn't training","she is not training"],"She isn't training.","Negue is.","Isn't training.","Present Continuous"),
        I("5a-3","Transforme em pergunta: They are waiting outside.",["are they waiting outside"],"Are they waiting outside?","Leve are para a frente.","Are they waiting...?","Present Continuous"),
        I("5a-4","Corrija: I am study English now.",["i am studying english now"],"I am studying English now.","Depois de am, use -ing.","Am studying.","Present Continuous"),
        I("5a-5","Traduza: Estamos tentando resolver o problema.",["we are trying to solve the problem","we're trying to solve the problem"],"We are trying to solve the problem.","We are + trying.","Present Continuous"),
        I("5a-6","Escolha e escreva a forma natural: 'Ela está mudando a estratégia agora.'",["she is changing the strategy now","she's changing the strategy now"],"She is changing the strategy now.","Ação em andamento: is changing.","Present Continuous")
      ]
    },
    {
      id:"5b-simple-past",classLabel:"Class 5B",title:"Simple Past",
      purpose:"contar ações concluídas no passado",
      rule:"Na afirmativa use o passado. Em perguntas e negativas com did, o verbo volta à forma base.",
      keywords:["yesterday","last week","did","didn't"],
      core:[
        C("5b-1","I ___ the report yesterday.",["finished","finish","finishes"],"finished","Yesterday pede passado.","Finished.","Simple Past"),
        I("5b-2","Passe para a negativa: She ate at home.",["she didn't eat at home","she did not eat at home"],"She didn't eat at home.","Did + base verb.","Ate volta para eat.","Simple Past"),
        I("5b-3","Transforme em pergunta: They found the mistake.",["did they find the mistake"],"Did they find the mistake?","Use did + find.","Found volta para find.","Simple Past"),
        I("5b-4","Corrija: Did you finished the task?",["did you finish the task"],"Did you finish the task?","Depois de did, verbo base.","Did you finish...?","Simple Past"),
        I("5b-5","Traduza: Eu dormi mal ontem à noite.",["i slept badly last night","i didn't sleep well last night"],"I slept badly last night.","Sleep → slept.","Simple Past"),
        I("5b-6","Traduza: Nós resolvemos o problema antes da reunião.",["we solved the problem before the meeting"],"We solved the problem before the meeting.","Ação concluída.","Solved.","Simple Past")
      ]
    },
    {
      id:"5c-past-continuous",classLabel:"Class 5C",title:"Past Continuous",
      purpose:"descrever ações em andamento em um momento do passado",
      rule:"Was/were + verbo-ing. É comum combinar com Simple Past para uma ação que interrompe outra.",
      keywords:["was working","were talking","when","while"],
      core:[
        C("5c-1","At 8 p.m., I ___ working.",["was","did","am"],"was","Momento específico no passado.","I was working.","Past Continuous"),
        I("5c-2","Complete: They ___ (talk) when I arrived.",["they were talking when i arrived"],"They were talking when I arrived.","Ação em andamento + interrupção.","Were talking / arrived.","Past Continuous"),
        I("5c-3","Passe para a negativa: She was sleeping.",["she wasn't sleeping","she was not sleeping"],"She wasn't sleeping.","Negue was.","Wasn't sleeping.","Past Continuous"),
        I("5c-4","Transforme em pergunta: You were driving.",["were you driving"],"Were you driving?","Leve were para a frente.","Were you driving?","Past Continuous"),
        I("5c-5","Corrija: I was work when you called.",["i was working when you called"],"I was working when you called.","Was + -ing.","Was working.","Past Continuous"),
        I("5c-6","Traduza: Enquanto eu estudava, ela estava preparando o jantar.",["while i was studying she was preparing dinner","while i was studying she was making dinner"],"While I was studying, she was preparing dinner.","Duas ações simultâneas.","Was studying / was preparing.","Past Continuous")
      ]
    },
    {
      id:"5d-simple-future",classLabel:"Class 5D",title:"Simple Future",
      purpose:"falar de decisões, previsões e ações futuras com will",
      rule:"Will + verbo base. Na negativa, will not/won't. Em perguntas, will vai antes do sujeito.",
      keywords:["will","won't","tomorrow","next week"],
      core:[
        C("5d-1","She will ___ more next week.",["study","studies","studied"],"study","Depois de will, verbo base.","Will study.","Simple Future"),
        I("5d-2","Passe para a negativa: We will work Saturday.",["we won't work saturday","we will not work saturday"],"We won't work Saturday.","Will not / won't.","Won't work.","Simple Future"),
        I("5d-3","Transforme em pergunta: You will call me tomorrow.",["will you call me tomorrow"],"Will you call me tomorrow?","Will vem antes do sujeito.","Will you call...?","Simple Future"),
        I("5d-4","Corrija: He will to change the plan.",["he will change the plan"],"He will change the plan.","Will não usa to.","Will change.","Simple Future"),
        I("5d-5","Traduza: Eu vou terminar isso amanhã.",["i will finish this tomorrow","i'll finish this tomorrow"],"I will finish this tomorrow.","Will + finish.","Simple Future"),
        I("5d-6","Traduza: Acho que eles vão melhorar com a prática.",["i think they will improve with practice","i think they'll improve with practice"],"I think they will improve with practice.","Previsão: will improve.","Simple Future")
      ]
    }
  ];

  // Mistura de estruturas da própria apostila. Não é uma etapa visual de "revisão";
  // ela aparece dentro da prática para evitar treino isolado e fácil demais.
  const MIXED = [
    I("mix-01","Corrija: Does your team needs more time?",["does your team need more time"],"Does your team need more time?","Depois de does, verbo base.","Does + team + need.","Mixed"),
    I("mix-02","Traduza: Por que você mudou de ideia ontem?",["why did you change your mind yesterday"],"Why did you change your mind yesterday?","Why + did + base verb.","Did you change.","Mixed"),
    I("mix-03","Corrija: She can to finish the task today.",["she can finish the task today"],"She can finish the task today.","Modal não usa to.","Can finish.","Mixed"),
    I("mix-04","Complete: While we ___ (talk), the manager arrived.",["while we were talking the manager arrived"],"While we were talking, the manager arrived.","Ação em andamento no passado.","Were talking + arrived.","Mixed"),
    I("mix-05","Traduza: Esta opção é melhor que a anterior.",["this option is better than the previous one","this option is better than the last one"],"This option is better than the previous one.","Good → better.","Better than.","Mixed"),
    I("mix-06","Corrija: There is two important reasons.",["there are two important reasons"],"There are two important reasons.","Two reasons é plural.","There are.","Mixed"),
    I("mix-07","Transforme em pergunta: She is working from home today.",["is she working from home today"],"Is she working from home today?","Present Continuous inverte o be.","Is she working...?","Mixed"),
    I("mix-08","Corrija: I didn't saw the message.",["i didn't see the message","i did not see the message"],"I didn't see the message.","Depois de didn't, base verb.","Saw volta para see.","Mixed"),
    I("mix-09","Traduza: Nós normalmente começamos às oito, mas hoje estamos começando mais tarde.",["we usually start at eight but today we are starting later","we usually start at 8 but today we are starting later"],"We usually start at eight, but today we are starting later.","Contraste rotina x agora.","Simple Present + Present Continuous.","Mixed"),
    I("mix-10","Corrija: This are my responsibility.",["this is my responsibility"],"This is my responsibility.","This é singular.","This is.","Mixed"),
    I("mix-11","Faça uma pergunta para saber onde eles estavam trabalhando.",["where were they working"],"Where were they working?","WH + were + subject + -ing.","Where were they working?","Mixed"),
    I("mix-12","Traduza: Ela deveria falar com o gerente antes de decidir.",["she should talk to the manager before deciding","she should speak to the manager before deciding"],"She should talk to the manager before deciding.","Should + base verb.","Should talk.","Mixed"),
    I("mix-13","Corrija: I am agree with you.",["i agree with you"],"I agree with you.","Agree normalmente não usa be.","I agree.","Mixed"),
    I("mix-14","Traduza: Você terminou o relatório ou ainda está trabalhando nele?",["did you finish the report or are you still working on it"],"Did you finish the report, or are you still working on it?","Misture passado concluído e ação atual.","Did you finish / are you working.","Mixed"),
    I("mix-15","Corrija: He is more tall than me.",["he is taller than me","he is taller than i am"],"He is taller than me.","Tall usa -er.","Taller than.","Mixed"),
    I("mix-16","Traduza: Há algumas coisas que precisamos discutir antes da reunião.",["there are some things we need to discuss before the meeting","there are some things that we need to discuss before the meeting"],"There are some things we need to discuss before the meeting.","Plural + oração.","There are some things...","Mixed"),
    I("mix-17","Complete: I ___ (think) about the problem when you called.",["i was thinking about the problem when you called"],"I was thinking about the problem when you called.","Ação em andamento interrompida.","Was thinking / called.","Mixed"),
    I("mix-18","Corrija: She doesn't works here anymore.",["she doesn't work here anymore","she does not work here anymore"],"She doesn't work here anymore.","Doesn't + base verb.","Work, não works.","Mixed"),
    I("mix-19","Traduza: Qual foi a decisão mais importante que você tomou ontem?",["what was the most important decision you made yesterday"],"What was the most important decision you made yesterday?","WH + superlative + Simple Past.","The most important / made.","Mixed"),
    I("mix-20","Complete naturalmente: I bought ___ new laptop, and ___ laptop is already helping me.",["i bought a new laptop and the laptop is already helping me"],"I bought a new laptop, and the laptop is already helping me.","Primeira menção a; depois the.","A / the.","Mixed"),
    I("mix-21","Corrija: We will probably to finish before six.",["we will probably finish before six"],"We will probably finish before six.","Will + base verb.","Will probably finish.","Mixed"),
    I("mix-22","Traduza: O documento está na mesa ao lado do computador.",["the document is on the table next to the computer"],"The document is on the table next to the computer.","Preposições de lugar.","On / next to.","Mixed"),
    I("mix-23","Faça uma pergunta para descobrir quem fez essa alteração.",["who made this change","who made that change"],"Who made this change?","Who é o sujeito; não use did aqui.","Who made...?","Mixed"),
    I("mix-24","Corrija: Yesterday we are discussing the new process.",["yesterday we discussed the new process","yesterday we were discussing the new process"],"Yesterday we discussed the new process.","Escolha um tempo passado coerente.","Simple Past para ação concluída; Past Continuous se o contexto exigir andamento.","Mixed")
  ];

  // Conteúdo adicional do Memory para a ponte B1/B2. A apostila continua sendo a base;
  // estes desafios entram progressivamente conforme as rodadas são concluídas.
  const BRIDGE_B1 = [
    I("b1-01","Complete com Present Perfect: I ___ (finish) the report, so we can send it now.",["i have finished the report","i've finished the report"],"I have finished the report, so we can send it now.","Resultado passado relevante agora.","Have finished.","Ponte B1/B2"),
    I("b1-02","Corrija: I have seen him yesterday.",["i saw him yesterday"],"I saw him yesterday.","Yesterday pede Simple Past.","Use saw, não have seen.","Ponte B1/B2"),
    I("b1-03","Complete a condição: If we leave now, we ___ arrive on time.",["if we leave now we will arrive on time","if we leave now we'll arrive on time"],"If we leave now, we will arrive on time.","First conditional: if + present, will + base.","Will arrive.","Ponte B1/B2"),
    I("b1-04","Traduza: Se ela estudar mais, vai melhorar rapidamente.",["if she studies more she will improve quickly","if she studies more she'll improve quickly"],"If she studies more, she will improve quickly.","If + Simple Present / will.","Studies / will improve.","Ponte B1/B2"),
    I("b1-05","Una com who: I work with a woman. She speaks three languages.",["i work with a woman who speaks three languages"],"I work with a woman who speaks three languages.","Who retoma pessoa.","A woman who speaks...","Ponte B1/B2"),
    I("b1-06","Una com that: We need a system. It works on mobile.",["we need a system that works on mobile"],"We need a system that works on mobile.","That pode retomar coisa.","A system that works...","Ponte B1/B2"),
    I("b1-07","Passe para a passiva: The team completed the project.",["the project was completed by the team","the project was completed"],"The project was completed by the team.","Objeto vira sujeito + be + participle.","Was completed.","Ponte B1/B2"),
    I("b1-08","Corrija: The report was send yesterday.",["the report was sent yesterday"],"The report was sent yesterday.","Passive usa past participle.","Send → sent.","Ponte B1/B2")
  ];

  const BRIDGE_B2 = [
    I("b2-01","Reescreva usando although: The task was difficult. We finished it on time.",["although the task was difficult we finished it on time"],"Although the task was difficult, we finished it on time.","Although introduz contraste.","Although + clause.","Ponte B1/B2"),
    I("b2-02","Reescreva: 'I need more time,' she said. Use reported speech.",["she said that she needed more time","she said she needed more time"],"She said that she needed more time.","Reported speech normalmente recua o tempo.","Need → needed.","Ponte B1/B2"),
    I("b2-03","Complete: By the time I arrived, they ___ already ___ (leave).",["by the time i arrived they had already left"],"By the time I arrived, they had already left.","Uma ação ocorreu antes de outra no passado.","Had left.","Ponte B1/B2"),
    I("b2-04","Reescreva com unless: If we don't change the process, the problem will continue.",["unless we change the process the problem will continue"],"Unless we change the process, the problem will continue.","Unless = if not.","Unless + present.","Ponte B1/B2"),
    I("b2-05","Corrija: The person which called me was very helpful.",["the person who called me was very helpful","the person that called me was very helpful"],"The person who called me was very helpful.","Para pessoas, prefira who.","Person who...","Ponte B1/B2"),
    I("b2-06","Reescreva de forma mais natural: I started working here three years ago and I still work here.",["i have worked here for three years","i've worked here for three years","i have been working here for three years","i've been working here for three years"],"I have been working here for three years.","Ação iniciada no passado e ainda válida.","Present Perfect / Present Perfect Continuous.","Ponte B1/B2")
  ];

  function hashSeed(text) {
    let h = 2166136261;
    for (const ch of String(text)) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h,16777619);
    }
    return h >>> 0;
  }

  function seededRandom(seed) {
    let x = seed || 123456789;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return ((x >>> 0) / 4294967296);
    };
  }

  function sample(items,count,seedText) {
    const copy=[...items];
    const rnd=seededRandom(hashSeed(seedText));
    for(let i=copy.length-1;i>0;i--) {
      const j=Math.floor(rnd()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy.slice(0,Math.min(count,copy.length));
  }

  function lessonById(id) {
    return LESSONS.find(item=>item.id===id) || LESSONS[0];
  }

  function migrateStore(value) {
    const store=value && typeof value==="object" ? structuredClone(value) : {};
    store.sessions=Array.isArray(store.sessions)?store.sessions:[];
    store.schemaVersion=SCHEMA;

    for(const session of store.sessions) {
      session.rounds=Array.isArray(session.rounds)?session.rounds:[];

      if(session.completed && !session.rounds.length) {
        session.rounds.push({
          roundNo:0,
          completed:true,
          legacy:true,
          score:Number.isFinite(Number(session.score)) ? Number(session.score) : 100,
          completedAt:session.completedAt || session.updatedAt || session.createdAt || new Date().toISOString()
        });
      }

      // Respostas antigas não são reutilizadas. Isso elimina o comportamento
      // em que uma prática reabria já mostrando a resposta/correção.
      delete session.answers;
    }

    return store;
  }

  async function loadStore(db,userId) {
    const {data,error}=await db.from("configuracoes_usuario")
      .select("valor").eq("user_id",userId).eq("chave",KEY).maybeSingle();
    if(error) throw error;
    return migrateStore(data?.valor);
  }

  async function saveStore(db,userId,store) {
    const payload={
      user_id:userId,
      chave:KEY,
      valor:{schemaVersion:SCHEMA,sessions:store.sessions,updatedAt:new Date().toISOString()}
    };
    const {error}=await db.from("configuracoes_usuario").upsert(payload,{onConflict:"user_id,chave"});
    if(error) throw error;
  }

  function completedRounds(store) {
    return store.sessions.reduce((sum,session)=>{
      const rounds=Array.isArray(session.rounds)?session.rounds:[];
      return sum+rounds.filter(r=>r?.completed).length;
    },0);
  }

  function ensureSession(store,date) {
    let session=store.sessions.find(item=>item?.date===date);
    if(session) {
      session.rounds=Array.isArray(session.rounds)?session.rounds:[];
      session.lessonId=lessonById(session.lessonId).id;
      session.lessonTitle=lessonById(session.lessonId).title;
      return session;
    }

    const completedDays=store.sessions.filter(item=>item?.completed).length;
    const lesson=LESSONS[completedDays % LESSONS.length];

    session={
      id:crypto.randomUUID?crypto.randomUUID():`practice-${Date.now()}`,
      date,
      lessonId:lesson.id,
      lessonTitle:lesson.title,
      classLabel:lesson.classLabel,
      rounds:[],
      completed:false,
      score:null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    store.sessions.push(session);
    return session;
  }

  function difficulty(totalRounds) {
    if(totalRounds>=14) return {level:4,label:"Ponte B2",bridge:[...BRIDGE_B1,...BRIDGE_B2]};
    if(totalRounds>=7) return {level:3,label:"B1 alto",bridge:BRIDGE_B1};
    if(totalRounds>=3) return {level:2,label:"B1 em construção",bridge:BRIDGE_B1.slice(0,4)};
    return {level:1,label:"Base forte",bridge:[]};
  }

  function buildRound(lesson,date,roundNo,totalRounds) {
    const diff=difficulty(totalRounds);
    const core=sample(lesson.core,6,`${date}|${lesson.id}|${roundNo}|core`);
    const mixed=sample(MIXED,6,`${date}|${lesson.id}|${roundNo}|mixed`);

    let challengePool=[...MIXED.filter(q=>!mixed.some(m=>m.id===q.id))];
    if(diff.bridge.length) challengePool=[...diff.bridge,...challengePool];

    const challenge=sample(challengePool,6,`${date}|${lesson.id}|${roundNo}|challenge|${diff.level}`);

    return {
      roundNo,
      difficulty:diff,
      questions:[
        ...core.map(q=>({...q,block:1})),
        ...mixed.map(q=>({...q,block:2})),
        ...challenge.map(q=>({...q,block:3}))
      ]
    };
  }

  function isCorrect(question,answer) {
    const candidate=normalize(answer);
    if(!candidate) return false;
    if(question.kind==="choice") return candidate===normalize(question.answer);
    return (question.answers||[]).some(value=>candidate===normalize(value));
  }

  function updateSummary(lesson) {
    const focus=document.querySelector("#english-summary-focus");
    const verbs=document.querySelector("#english-summary-verbs");
    if(focus) focus.textContent=`${lesson.classLabel} · ${lesson.title}`;
    if(verbs) verbs.textContent="18 questões · 3 blocos";
  }

  function blockHeader(block,difficultyLabel) {
    if(block===1) return `<div class="english-practice-block-title"><b>1</b><div><strong>Estrutura</strong><span>6 exercícios do foco atual</span></div></div>`;
    if(block===2) return `<div class="english-practice-block-title"><b>2</b><div><strong>Aplicação</strong><span>6 exercícios misturando estruturas da apostila</span></div></div>`;
    return `<div class="english-practice-block-title"><b>3</b><div><strong>Desafio</strong><span>6 exercícios · intensidade ${esc(difficultyLabel)}</span></div></div>`;
  }

  function questionHtml(question,index,state,difficultyLabel) {
    const current=state[index] || {};
    const solved=Boolean(current.correct || current.revealed);
    const cls=current.correct?"is-correct":current.attempts?"is-wrong":"";
    const selected=current.lastAnswer || "";

    const input=question.kind==="choice"
      ? `<div class="english-practice-options">${question.options.map(option=>`
          <button type="button"
            class="english-practice-option ${selected===option?"is-selected":""}"
            data-practice-choice="${index}"
            data-practice-value="${esc(option)}"
            ${solved?"disabled":""}>${esc(option)}</button>`).join("")}</div>`
      : `<div class="english-practice-input-row">
          <input type="text" data-practice-input="${index}" value="${esc(solved?"":selected)}"
            placeholder="Escreva sua resposta em inglês" ${solved?"disabled":""}>
          <button type="button" class="btn" data-practice-check="${index}" ${solved?"disabled":""}>Verificar</button>
        </div>`;

    let feedback="";
    if(current.correct) {
      feedback=`<div class="english-practice-feedback is-correct">
        <span>✓ Correto${current.attempts===1?" de primeira":""}</span>
        <p>${esc(question.explain)}</p>
      </div>`;
    } else if(current.revealed) {
      feedback=`<div class="english-practice-feedback is-assisted">
        <span>Resposta consultada</span>
        <p><strong>${esc(question.model || question.answer)}</strong><br>${esc(question.explain)}</p>
      </div>`;
    } else if(current.attempts) {
      feedback=`<div class="english-practice-feedback is-wrong">
        <span>Ainda não.</span>
        <p>${esc(question.hint || "Revise a estrutura e tente novamente.")}</p>
        ${current.attempts>=2?`<button type="button" class="english-answer-reveal" data-practice-reveal="${index}">Ver resposta</button>`:""}
      </div>`;
    }

    return `<article class="english-practice-question ${cls}" data-practice-question="${index}">
      <div class="english-practice-question__number">${index+1}</div>
      <div class="english-practice-question__body">
        <strong>${esc(question.prompt)}</strong>
        ${input}
        ${feedback}
      </div>
    </article>`;
  }

  function progressStats(round,state) {
    let solved=0,firstTry=0,corrected=0,assisted=0;
    for(let i=0;i<round.questions.length;i++) {
      const item=state[i]||{};
      if(item.correct || item.revealed) solved++;
      if(item.correct && item.attempts===1) firstTry++;
      else if(item.correct) corrected++;
      if(item.revealed) assisted++;
    }
    return {solved,firstTry,corrected,assisted};
  }

  function masteryScore(stats,total) {
    if(!total) return 0;
    const points=stats.firstTry + stats.corrected*0.8 + stats.assisted*0.45;
    return Math.round(points*100/total);
  }

  function renderHost(host,lesson,session,round,state,totalRounds) {
    const stats=progressStats(round,state);
    const finished=stats.solved===round.questions.length;
    const score=masteryScore(stats,round.questions.length);
    const sections=[];

    round.questions.forEach((q,index)=>{
      if(index===0 || q.block!==round.questions[index-1]?.block) {
        sections.push(blockHeader(q.block,round.difficulty.label));
      }
      sections.push(questionHtml(q,index,state,round.difficulty.label));
    });

    host.innerHTML=`
      <div class="english-practice-head">
        <div>
          <p class="eyebrow">3 · Prática intensiva</p>
          <h2>${esc(lesson.title)} <span class="english-practice-mix">+ mix</span></h2>
          <p class="muted">${esc(lesson.purpose)}. O tema do dia é o foco, mas a prática não fica presa nele.</p>
        </div>
        <div class="english-practice-progress">
          <span>Rodada ${round.roundNo+1} · ${QUESTIONS_PER_ROUND} questões</span>
          <strong>${stats.solved}/${QUESTIONS_PER_ROUND} resolvidas</strong>
          <small>Intensidade: ${esc(round.difficulty.label)}</small>
        </div>
      </div>

      <div class="english-practice-rule">
        <span>Foco central</span>
        <p>${esc(lesson.rule)}</p>
        <small>As respostas e os modelos só aparecem depois da sua tentativa. Após 2 erros, você pode optar por consultar a resposta.</small>
      </div>

      <div class="english-practice-load">
        <div><strong>6</strong><span>foco atual</span></div>
        <div><strong>6</strong><span>aplicação mista</span></div>
        <div><strong>6</strong><span>desafio</span></div>
        <div><strong>${totalRounds}</strong><span>rodadas históricas</span></div>
      </div>

      <div class="english-verb-bank">
        <div class="english-verb-bank__head"><span>Estruturas-chave</span><small>use como referência, não como resposta</small></div>
        <div class="english-verb-bank__grid">${lesson.keywords.map(item=>`<div><strong>${esc(item)}</strong></div>`).join("")}</div>
      </div>

      <div class="english-practice-list">${sections.join("")}</div>

      <div class="english-practice-finish">
        <div>
          <strong>${finished?`Rodada pronta · domínio ${score}%`:`Faltam ${QUESTIONS_PER_ROUND-stats.solved} exercícios.`}</strong>
          <span>${stats.firstTry} de primeira · ${stats.corrected} corrigidos · ${stats.assisted} com resposta consultada.</span>
        </div>
        <button type="button" class="btn primary" data-finish-practice ${finished?"":"disabled"}>
          ${finished?"Concluir rodada":"Concluir rodada"}
        </button>
      </div>`;
  }

  async function render({host,data,db,usuario}) {
    if(!host || !db || !usuario?.id) return;
    const date=String(data || new Date().toISOString().slice(0,10));

    try {
      const store=await loadStore(db,usuario.id);
      const session=ensureSession(store,date);
      const lesson=lessonById(session.lessonId);
      updateSummary(lesson);

      const totalRounds=completedRounds(store);
      const roundNo=session.rounds.filter(r=>r?.completed).length;
      const round=buildRound(lesson,date,roundNo,totalRounds);

      // Estado visual/feedback é propositalmente local. Reabrir a página não
      // pré-seleciona respostas antigas nem revela modelos.
      const state={};

      const paint=()=>renderHost(host,lesson,session,round,state,completedRounds(store));
      paint();

      async function record(index,answer) {
        const question=round.questions[index];
        if(!question) return;

        const clean=String(answer||"").trim();
        if(!clean) {
          toast("Responda antes de verificar.");
          return;
        }

        const current=state[index] || {attempts:0,correct:false,revealed:false,lastAnswer:""};
        if(current.correct || current.revealed) return;

        current.attempts+=1;
        current.lastAnswer=clean;
        current.correct=isCorrect(question,clean);
        state[index]=current;

        paint();

        if(current.correct) toast(current.attempts===1?"Correto de primeira.":"Correto. Você ajustou a estrutura.");
        else toast(current.attempts>=2?"Ainda não. Se quiser, a resposta pode ser consultada.":"Ainda não. Use a dica e tente novamente.");
      }

      host.onclick=async event=>{
        const choice=event.target.closest("[data-practice-choice]");
        if(choice) {
          await record(Number(choice.dataset.practiceChoice),choice.dataset.practiceValue);
          return;
        }

        const check=event.target.closest("[data-practice-check]");
        if(check) {
          const index=Number(check.dataset.practiceCheck);
          const input=host.querySelector(`[data-practice-input="${index}"]`);
          await record(index,input?.value||"");
          return;
        }

        const reveal=event.target.closest("[data-practice-reveal]");
        if(reveal) {
          const index=Number(reveal.dataset.practiceReveal);
          const current=state[index] || {attempts:2,correct:false,revealed:false,lastAnswer:""};
          current.revealed=true;
          state[index]=current;
          paint();
          return;
        }

        const finish=event.target.closest("[data-finish-practice]");
        if(finish && !finish.disabled) {
          const stats=progressStats(round,state);
          if(stats.solved<round.questions.length) {
            toast("Resolva todos os exercícios primeiro.");
            return;
          }

          const score=masteryScore(stats,round.questions.length);
          session.rounds.push({
            roundNo:round.roundNo,
            completed:true,
            score,
            firstTry:stats.firstTry,
            corrected:stats.corrected,
            assisted:stats.assisted,
            difficulty:round.difficulty.label,
            questionIds:round.questions.map(q=>q.id),
            completedAt:new Date().toISOString()
          });

          session.completed=true;
          session.score=Math.round(session.rounds.reduce((s,r)=>s+Number(r.score||0),0)/session.rounds.length);
          session.completedAt=new Date().toISOString();
          session.updatedAt=session.completedAt;

          await saveStore(db,usuario.id,store);

          const nextRoundNo=session.rounds.filter(r=>r?.completed).length;
          const nextRound=buildRound(lesson,date,nextRoundNo,completedRounds(store));
          const nextState={};

          host.innerHTML=`
            <div class="english-practice-complete">
              <p class="eyebrow">Rodada concluída</p>
              <h2>${score}% de domínio</h2>
              <p>${stats.firstTry} acertos de primeira · ${stats.corrected} corrigidos · ${stats.assisted} com consulta.</p>
              <div class="english-practice-complete__actions">
                <button type="button" class="btn primary" data-new-practice-round>Nova rodada · +18 exercícios</button>
                <button type="button" class="btn" data-practice-stop>Encerrar por hoje</button>
              </div>
            </div>`;

          host.onclick=event2=>{
            if(event2.target.closest("[data-new-practice-round]")) {
              Object.keys(state).forEach(k=>delete state[k]);
              Object.assign(round,nextRound);
              renderHost(host,lesson,session,round,nextState,completedRounds(store));

              // Reinstala os eventos completos renderizando a prática novamente.
              // O refresh é local e não muda a etapa do dia.
              window.MMCDEnglishPractice.render({host,data:date,db,usuario});
              return;
            }
            if(event2.target.closest("[data-practice-stop]")) {
              toast("Prática salva. Amanhã o foco avança para outra estrutura.");
              document.querySelector("#english-practice-host")?.scrollIntoView({behavior:"smooth",block:"start"});
            }
          };
        }
      };

      host.addEventListener("keydown",event=>{
        if(event.key!=="Enter" || !event.target.matches("[data-practice-input]")) return;
        event.preventDefault();
        const index=Number(event.target.dataset.practiceInput);
        record(index,event.target.value||"");
      },{once:false});

    } catch(error) {
      console.error("Prática de inglês:",error);
      host.innerHTML=`<div class="measure-empty">${esc(error.message||"Não foi possível carregar a prática intensiva.")}</div>`;
    }
  }

  return {render};
})();
