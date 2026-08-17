# V81.0.3 — Instalador do Financeiro corrigido

## Causa
A V81.0.2 continha uma montagem inválida no PowerShell:

`',`r`n '`

Esse trecho apareceu dentro do array de arquivos esperados e também dentro
de uma chamada `Copy-Item`, causando erro de parser antes mesmo da instalação.

## Correção
- instalador PowerShell reescrito de forma limpa;
- lista de arquivos esperados usa um item por linha;
- relatórios históricos são copiados com `Get-ChildItem`;
- nenhuma sequência `` `r`n `` é usada fora de strings válidas;
- mantida a correção V81.0.2 de abertura do Financeiro no PC;
- cache do JS/CSS atualizado para V81.0.3.

Senha do Financeiro: 240617.
