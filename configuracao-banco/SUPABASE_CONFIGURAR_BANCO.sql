-- MEU MOMENTO COM DEUS
-- Execute uma única vez no SQL Editor do Supabase.
-- Este script não apaga dados. Ele garante os índices usados pelo upsert
-- e permite que cada usuário autenticado leia e altere somente os próprios dados.

begin;

create unique index if not exists ux_registros_atividades_usuario_atividade_data
    on public.registros_atividades (user_id, atividade_id, data_registro);

create unique index if not exists ux_registros_diarios_usuario_data
    on public.registros_diarios (user_id, data_registro);

create unique index if not exists ux_configuracoes_usuario_chave
    on public.configuracoes_usuario (user_id, chave);

create unique index if not exists ux_meditacoes_usuario_data
    on public.meditacoes (user_id, data_meditacao);

create unique index if not exists ux_livros_um_atual_por_usuario
    on public.livros (user_id)
    where livro_atual is true;

create unique index if not exists ux_categorias_usuario_nome
    on public.categorias (user_id, lower(nome));

do $$
declare
    tabela text;
begin
    foreach tabela in array array[
        'categorias',
        'atividades',
        'registros_atividades',
        'livros',
        'metas',
        'registros_diarios',
        'configuracoes_usuario',
        'ingles_configuracao',
        'marcacoes_ingles',
        'meditacoes'
    ]
    loop
        execute format('alter table public.%I enable row level security', tabela);
        execute format('drop policy if exists mmcd_usuario_dono on public.%I', tabela);
        execute format(
            'create policy mmcd_usuario_dono on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
            tabela
        );
    end loop;
end $$;

commit;
