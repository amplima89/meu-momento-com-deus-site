# Memory V78.3 — Refinamento da experiência

Data: 15/08/2026

## Escopo

1. Redesenho visual da aba Minha Jornada para uma leitura de trilha espiritual, sem porcentagens ou inferência de conclusão.
2. Agrupamentos internos da meditação convertidos em acordeões recolhíveis.
3. Correção estrutural do Mapa de Cuidado para nunca depender do carregamento de dados para renderizar os cards.
4. Foto de Perfil utilizada no círculo central do Mapa, preservando a ideia de “você no centro”.
5. Modo Presença com orientações progressivas durante o tempo de oração.

## Arquivos principais

- `meditacao.html`
- `nucleo/app.js`
- `modulos/meditacao/meditacao-jornada-v78-3.css`
- `modulos/meditacao/meditacao-jornada-v78-3.js`
- `mapa-cuidado.html`
- `modulos/memory/memory-care-map-v78-3.css`
- `modulos/memory/memory-care-map-v78-3.js`
- `oracoes.html`
- `modulos/memory/memory-presence-v78-3.css`
- `modulos/memory/memory-prayers-v78-3.js`
- `atualizacoes.html`
- `sistema/historico/CHANGELOG.md`

## Regra de resiliência do Mapa

A estrutura visual dos seis cards e do centro deve aparecer antes da leitura do Supabase. Sinais recentes são hidratados em segundo plano; caso falhem, a tela permanece funcional com estado de pouca evidência/indisponibilidade temporária.
