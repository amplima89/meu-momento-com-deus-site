-- LIFE STYLE — Governança de temas multiusuário
-- Execute uma única vez no SQL Editor do Supabase.
-- Não apaga dados existentes.

begin;

create table if not exists public.mmcd_administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table if not exists public.mmcd_configuracoes_sistema (
  chave text primary key,
  valor jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users(id) on delete set null
);

alter table public.mmcd_administradores enable row level security;
alter table public.mmcd_configuracoes_sistema enable row level security;

grant select on public.mmcd_administradores to authenticated;
grant select, insert, update, delete on public.mmcd_configuracoes_sistema to authenticated;

drop policy if exists mmcd_admin_ver_proprio_acesso on public.mmcd_administradores;
create policy mmcd_admin_ver_proprio_acesso
  on public.mmcd_administradores
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists mmcd_temas_leitura_autenticados on public.mmcd_configuracoes_sistema;
create policy mmcd_temas_leitura_autenticados
  on public.mmcd_configuracoes_sistema
  for select
  to authenticated
  using (true);

drop policy if exists mmcd_temas_escrita_admin on public.mmcd_configuracoes_sistema;
create policy mmcd_temas_escrita_admin
  on public.mmcd_configuracoes_sistema
  for all
  to authenticated
  using (
    exists (
      select 1 from public.mmcd_administradores a
      where a.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.mmcd_administradores a
      where a.user_id = (select auth.uid())
    )
  );

-- A primeira conta que abrir Configurações após esta migração assume a administração.
-- Depois disso, nenhuma outra conta consegue se promover por esta função.
create or replace function public.mmcd_claim_first_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;

  -- Evita que duas contas assumam a administração ao mesmo tempo na primeira execução.
  perform pg_advisory_xact_lock(hashtext('mmcd_first_admin'));

  if exists (select 1 from public.mmcd_administradores where user_id = uid) then
    return true;
  end if;

  if not exists (select 1 from public.mmcd_administradores) then
    insert into public.mmcd_administradores(user_id)
    values (uid)
    on conflict (user_id) do nothing;
  end if;

  return exists (select 1 from public.mmcd_administradores where user_id = uid);
end;
$$;

revoke all on function public.mmcd_claim_first_admin() from public;
grant execute on function public.mmcd_claim_first_admin() to authenticated;

commit;
