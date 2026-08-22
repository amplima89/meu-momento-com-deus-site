# V81.11.3 — Restauração global da logo oficial

## Sintoma
Em algumas telas a logo oficial deixou de carregar e o shell exibiu apenas o fallback `M`.

## Correção
- restaura a arte oficial exata, sem redesenho;
- cria novos nomes canônicos V81.11.3 para quebrar cache do iPhone/PWA;
- preserva aliases antigos para compatibilidade;
- restaura ícones PWA;
- corrige referências em HTML, JS, CSS, JSON e webmanifest;
- instala um `MemoryLogoGuard` que observa elementos criados dinamicamente pelo shell;
- se um shell antigo vier do cache e tentar usar uma referência velha, o guard força a logo canônica;
- o fallback `M` é ocultado assim que a imagem oficial carrega.

## Integridade
SHA-256 da marca oficial:
`11889b6e4aacb1b6c46b077139ca17abeee8f5e05215439da55447577e8d5b68`

SHA-256 do ícone oficial:
`f0cfb24420f2f63a3c876c167c659d145a08370cc40edf92e7efcd62a7bb5242`

Nenhum desenho da marca foi recriado.
