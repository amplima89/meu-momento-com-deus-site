# V81.14 — Conforto Visual

## Objetivo
Criar um modo de interface para reduzir fadiga visual causada por brilho,
contraste extremo, branco/preto puros e excesso de neon.

Não é um modo médico para astigmatismo e não substitui correção oftalmológica.

## Modos
### Automático — padrão
- 07:00–18:30: Escuro suave.
- 18:30–07:00: Noturno suave.
- Atualiza sozinho quando o horário muda.

### Escuro suave
- fundo: `#0B1220`
- cards: `#131D2B`
- superfície 2: `#1B2738`
- texto: `#E6EBF2`
- secundário: `#A8B3C3`
- violeta: `#9B8BEF`
- ciano: `#69C6E6`

### Noturno automático
- fundo: `#10151E`
- cards: `#171F2A`
- texto: `#D7DCE3`
- violeta reduzido: `#9183D2`
- ciano reduzido: `#72B4C9`

### Leitura clara
- fundo: `#F3F1EC`
- cards: `#FAF9F6`
- texto: `#253041`
- secundário: `#5D6877`
- violeta: `#6F5EB4`
- azul/ciano: `#287D9A`

### Original
Restaura a aparência original do Memory.

## Leitura
Nos modos de conforto:
- line-height aumentado;
- texto evita branco puro;
- cinzas secundários ficam mais legíveis;
- brilho e sombras são reduzidos;
- Bíblia, Devocional e Inglês aceitam A / A+ / A++.

## Persistência
A preferência é salva no navegador e permanece entre páginas.

## Segurança
A V81.14:
- não mexe na logo;
- não substitui CSS existentes;
- injeta apenas uma camada global incremental;
- não altera Devocional, Treinos, Inglês, Financeiro ou Atividades.
