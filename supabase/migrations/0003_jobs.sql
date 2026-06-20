-- 0003_jobs.sql — Fila de tarefas em segundo plano (background jobs)
-- Relatórios pesados, sync com APIs de anúncios, envio de e-mails etc. não
-- devem travar a tela: enfileiram aqui e um worker processa fora do request.
-- O navegador acompanha por Realtime e mostra um toast quando termina.

create table if not exists public.jobs (
	id uuid primary key default gen_random_uuid(),
	tipo text not null,
	payload jsonb not null default '{}'::jsonb,
	status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed')),
	resultado jsonb,
	erro text,
	tentativas int not null default 0,
	criado_por uuid references public.colaboradores(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status, created_at);

alter table public.jobs enable row level security;

-- Single-tenant interno: usuários autenticados têm acesso total.
drop policy if exists jobs_authenticated_all on public.jobs;
create policy jobs_authenticated_all on public.jobs
	for all to authenticated using (true) with check (true);

-- Realtime: o navegador é notificado quando o status do job muda.
-- (Ignore o erro se a tabela já estiver na publicação.)
alter publication supabase_realtime add table public.jobs;
