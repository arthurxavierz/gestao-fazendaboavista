-- =====================================================================
-- FAZENDA BOA VISTA - POLÍTICAS DE ACESSO (RLS) - Execute no SQL Editor (2º de 3)
--
-- Arquitetura de segurança:
--   * O backend Node/Express acessa o banco com a SERVICE ROLE KEY
--     (que ignora RLS) e aplica as permissões por perfil na aplicação.
--   * O RLS abaixo BLOQUEIA qualquer acesso direto ao banco feito com
--     a chave anônima (anon) ou por usuários autenticados sem passar
--     pelo backend. Assim, mesmo que alguém obtenha a anon key do
--     frontend, não consegue ler nem alterar dados.
-- =====================================================================

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public'
  loop
    execute format('alter table %I enable row level security', t);
    -- nenhuma policy criada = nenhum acesso para anon/authenticated.
  end loop;
end $$;

-- Exceção mínima: o usuário autenticado pode ler o PRÓPRIO registro
-- em "usuarios" (útil se um dia o frontend consultar o Supabase direto).
create policy usuarios_le_proprio on usuarios
  for select to authenticated
  using (id = auth.uid());

-- =====================================================================
-- STORAGE: bucket de anexos
-- Crie o bucket "anexos" (público para leitura) em Storage > New bucket,
-- ou execute:
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('anexos','anexos', true)
on conflict (id) do nothing;

-- Upload apenas via backend (service role). Leitura pública dos arquivos:
create policy anexos_leitura_publica on storage.objects
  for select using (bucket_id = 'anexos');
