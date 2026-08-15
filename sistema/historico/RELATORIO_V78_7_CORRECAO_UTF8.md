# Memory V78.7 — Correção global de UTF-8 e textos

Data: 15/08/2026

## Problema identificado
A V78.6 atualizava referências do shell lendo e regravando HTMLs com `Get-Content`/`Set-Content` do Windows PowerShell 5.1. Em arquivos UTF-8 sem BOM, isso podia interpretar bytes como ANSI e produzir mojibake, por exemplo `Configurações` → `ConfiguraÃ§Ãµes`.

## Correção
- Restauração de todos os HTMLs da raiz a partir da base limpa V78.6.
- Normalização dos HTMLs para UTF-8.
- Novo cache-busting `v=20260815-v78-7` para o shell compartilhado.
- Instalador sem transformação textual dos HTMLs: os arquivos corrigidos são copiados diretamente.
- Validação pós-instalação contra sequências típicas de mojibake.

## Proteção futura
Atualizações futuras que precisarem editar texto devem usar APIs .NET com `System.Text.Encoding.UTF8` explícito ou gerar os arquivos já corrigidos no pacote, evitando `Get-Content`/`Set-Content` sem encoding explícito.

## Escopo
Nenhum dado do Supabase é alterado.
