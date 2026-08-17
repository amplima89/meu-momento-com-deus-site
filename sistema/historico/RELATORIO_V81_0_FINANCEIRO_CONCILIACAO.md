# V81.0 — Financeiro + Conciliação

## Segurança
- A página Financeiro exige a senha informada pelo usuário.
- A senha não é gravada em texto puro no JavaScript; a interface compara SHA-256.
- Os dados normalizados do módulo são criptografados com AES-GCM.
- A chave é derivada com PBKDF2/SHA-256 e 150.000 iterações, usando o usuário autenticado como parte do salt.
- O arquivo XLS/XLSX original é lido no navegador e não é enviado ao GitHub nem salvo no Supabase.
- O Supabase recebe somente o estado normalizado já criptografado.

## Módulo
- Visão geral: entradas, despesas, resultado, pendências e taxa de conciliação.
- Contas: planejamento por período e valor realizado.
- Cartões: faturas importadas, compras classificadas e pagamento conciliado.
- Conciliação: fila de pendências, sugestões, correspondências exatas, reapertura e aprendizado de regras.
- Evolução: comparação mensal de entradas e despesas conciliadas.

## Importação
- XLS e XLSX via SheetJS no navegador.
- Detecção automática de fatura e extrato.
- Proteção contra arquivo duplicado por SHA-256.
- Fatura: separa compras de pagamentos internos.
- Extrato: identifica débitos/créditos e busca pagamento da fatura por valor.

## Regras iniciais
Inclui reconhecimento para padrões observados nos arquivos usados no desenho da solução, como POSTO LINC, WELLHUB, CASHBARBER, ZURICH, SAAE, CPFL, CLARO CELULAR, NETTOP e pagamento de salário.
