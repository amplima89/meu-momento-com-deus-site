# Memory V79.1 — Conclusão e compartilhamento

Data: 15/08/2026

## Meditação

- Adicionado botão de conclusão dentro da página de Meditação.
- A conclusão reutiliza a atividade de Meditação já cadastrada e persiste em `registros_atividades`.
- O registro é feito para a data da meditação aberta.
- O indicador de consistência é re-renderizado após a atualização.
- Quando a meditação está concluída, é exibido um card social com o Versículo do Dia e identidade Memory.
- Ações disponíveis: compartilhar pelo Web Share do aparelho, baixar PNG e copiar legenda.

## Treinos

- O modal final de treino concluído passa a incluir um card social.
- O card usa nome do treino, grupos efetivamente trabalhados, duração e sequência de treinos programados concluídos sem falhar.
- Dias de descanso não quebram nem contam a sequência; abonos preservam a sequência sem contar como treino realizado.
- A mensagem motivacional varia conforme o tamanho da sequência.

## Núcleo compartilhável

- Criado `nucleo/social-card-v79-1.js` para geração de PNG 1080x1350 com identidade Memory.
- Criado `nucleo/social-card-v79-1.css` para prévias e ações de compartilhamento.
- Nenhum conteúdo é publicado automaticamente.
- Instagram e WhatsApp são oferecidos pelo compartilhamento nativo quando instalados e suportados pelo navegador.

## Compatibilidade

- UTF-8 preservado.
- Não foram criadas novas tabelas no Supabase.
- O histórico de Atividades e Treinos existente permanece intacto.
