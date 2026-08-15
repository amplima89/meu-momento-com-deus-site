# Memory — estrutura do site

A partir da V77.2 a raiz contém apenas páginas públicas e arquivos essenciais.

- `nucleo/`: autenticação, tema, Supabase, shell e estilos compartilhados.
- `modulos/`: código separado por assunto (Bíblia, Inglês, Treinos, Memory, etc.).
- `assets/imagens/`: imagens e identidade visual.
- `dados/`: dados estáticos usados pelo site.
- `configuracao-banco/`: scripts SQL e configuração do banco.
- `sistema/`: histórico, documentação e publicação.

Os HTMLs públicos permanecem na raiz para preservar as URLs já usadas pelo site.
