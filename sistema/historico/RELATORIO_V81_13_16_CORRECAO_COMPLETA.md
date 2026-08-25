# V81.13.16 — Correção completa + treino contextual

## Inclui a V81.13.15
A IA continua recebendo e lendo o texto completo da Leitura:
- readingText;
- vocabulário;
- estruturas;
- resumo;
- ideia central;
- eventuais problemas do texto-fonte.

## Resposta original
O resultado da IA não é mais responsável por repetir a resposta do usuário.

A resposta mostrada em `Sua resposta` vem diretamente da requisição salva no Memory.
Assim, mesmo que a IA omita `userAnswer` no JSON, o resultado mantém:
- pergunta;
- resposta original;
- correção necessária;
- versão mais natural;
- explicação curta.

## Plano de prática
Depois da correção, a IA gera no máximo 3 prioridades baseadas nos erros reais do dia.

Cada prioridade possui:
- ponto de melhoria;
- motivo;
- chunks/padrões úteis;
- pergunta aberta nova;
- orientação do que tentar usar.

Não são permitidos:
- múltipla escolha;
- completar lacunas;
- drills mecânicos de corrigir frases isoladas.

O objetivo é praticar os mesmos padrões em situações novas e naturais.
