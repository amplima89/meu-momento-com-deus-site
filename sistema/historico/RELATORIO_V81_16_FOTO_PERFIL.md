# V81.16 — Foto de perfil sem distorção

## Problema
A foto de perfil podia parecer esticada, borrada ou excessivamente comprimida.

## Correção de exibição
A camada V81.16:
- preserva proporção com `object-fit: cover`;
- evita esticar a imagem;
- mantém o enquadramento central levemente elevado;
- força interpolação normal do navegador;
- remove transformações indevidas apenas em imagens identificadas como avatar/perfil;
- aplica a correção também a elementos criados depois do carregamento da página.

## Upload futuro
A V81.16 também observa somente inputs identificados como:
- perfil;
- profile;
- avatar;
- foto-perfil.

Quando uma nova foto é escolhida:
- respeita orientação;
- recorta em quadrado sem deformar;
- usa até 1200x1200;
- JPEG qualidade 94%;
- smoothing de alta qualidade;
- não aumenta artificialmente imagens pequenas.

O arquivo preparado é entregue ao fluxo de upload que o Memory já utiliza.

## Importante
Uma foto que já tenha sido salva anteriormente em resolução muito baixa não recupera
detalhes perdidos apenas com CSS.

Depois de instalar a V81.16, é recomendado reenviar UMA VEZ a foto original em boa resolução.

## Segurança
A versão é incremental:
- não altera logo;
- não altera paletas;
- não altera cards;
- não altera Devocional, Inglês, Treinos, Atividades ou Financeiro;
- só atua em imagens/inputs identificados como perfil/avatar.
