-- ============================================================
-- Dunamis Space — LeadGrap (DTools)
-- CRM de prospecção: leads capturados do Google Maps, kanban de
-- funil, atividades, templates de mensagem e histórico de capturas.
--
-- A captura (scraping via Playwright) continua rodando no app
-- LeadGrap local, que passa a GRAVAR nestas tabelas do Supabase.
-- A dunamisspace gerencia e visualiza tudo.
--
-- Auth/usuários NÃO são portados: reaproveitamos `colaboradores`
-- (atribuição de lead e autor de atividade => colaborador_id).
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0038_leadgrap.sql
-- ============================================================

-- ---------- Leads ----------
create table if not exists public.leadgrap_leads (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	address text,
	phone text,
	website text,
	has_website boolean not null default false,
	email text,
	instagram text,
	facebook text,
	category text,
	rating numeric(3, 2),               -- nota do Google (0–5)
	review_count int,
	google_url text,                    -- URL do card no Google Maps (dedupe)
	place_id text,
	search_query text,                  -- termo que originou o lead
	stage text not null default 'NOVO'
		check (stage in ('NOVO', 'CONTATADO', 'EM_NEGOCIACAO', 'CONVERTIDO', 'PERDIDO')),
	notes text,
	tags text,                          -- lista separada por vírgula (compat. LeadDTO)
	estimated_value numeric(12, 2),
	next_contact_at timestamptz,        -- follow-up agendado
	colaborador_id uuid references public.colaboradores (id) on delete set null, -- responsável
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists leadgrap_leads_stage_idx on public.leadgrap_leads (stage);
create index if not exists leadgrap_leads_colaborador_idx on public.leadgrap_leads (colaborador_id);
-- Dedupe por card do Google Maps (nulls são distintos no Postgres — leads sem URL não colidem).
create unique index if not exists leadgrap_leads_google_url_key on public.leadgrap_leads (google_url)
	where google_url is not null;

-- ---------- Atividades (histórico por lead + feed global) ----------
create table if not exists public.leadgrap_atividades (
	id uuid primary key default gen_random_uuid(),
	lead_id uuid not null references public.leadgrap_leads (id) on delete cascade,
	colaborador_id uuid references public.colaboradores (id) on delete set null, -- autor
	message text not null,
	created_at timestamptz not null default now()
);
create index if not exists leadgrap_atividades_lead_idx on public.leadgrap_atividades (lead_id);
create index if not exists leadgrap_atividades_created_idx on public.leadgrap_atividades (created_at desc);

-- ---------- Templates de mensagem ----------
create table if not exists public.leadgrap_templates (
	id uuid primary key default gen_random_uuid(),
	name text not null,
	channel text not null default 'whatsapp' check (channel in ('whatsapp', 'email')),
	subject text,
	body text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

-- ---------- Histórico de capturas (jobs de scraping) ----------
create table if not exists public.leadgrap_scrape_jobs (
	id uuid primary key default gen_random_uuid(),
	query text not null,
	status text not null default 'queued', -- queued | running | done | error | cancelled
	found int not null default 0,
	saved int not null default 0,
	max_results int not null default 30, -- parâmetros lidos pelo app local que executa a captura
	enrich boolean not null default true,
	error text,
	log text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);
create index if not exists leadgrap_scrape_jobs_created_idx on public.leadgrap_scrape_jobs (created_at desc);

-- ============================================================
-- Triggers de updated_at + RLS (autenticados têm acesso total)
-- ============================================================
do $$
declare t text;
begin
	foreach t in array array[
		'leadgrap_leads', 'leadgrap_templates', 'leadgrap_scrape_jobs'
	]
	loop
		execute format('drop trigger if exists trg_%1$s_updated on public.%1$I;', t);
		execute format(
			'create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at();',
			t
		);
	end loop;

	-- RLS em todas as tabelas do módulo (inclui atividades, sem updated_at).
	foreach t in array array[
		'leadgrap_leads', 'leadgrap_atividades', 'leadgrap_templates', 'leadgrap_scrape_jobs'
	]
	loop
		execute format('alter table public.%I enable row level security;', t);
		execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
		execute format(
			'create policy %I on public.%I for all to authenticated using (true) with check (true);',
			t || '_authenticated_all', t
		);
	end loop;
end $$;

-- ============================================================
-- Seed: templates padrão (só se ainda não houver nenhum).
-- ============================================================
insert into public.leadgrap_templates (name, channel, subject, body)
select * from (values
	(
		'Primeiro contato (WhatsApp)', 'whatsapp', null,
		E'Olá! Falo com a {{nome}}? 😊\n\nVi vocês no Google e queria apresentar uma solução que pode ajudar {{categoria}} como a de vocês a atrair mais clientes. Posso te enviar alguns detalhes?'
	),
	(
		'Apresentação (E-mail)', 'email', 'Uma ideia para a {{nome}}',
		E'Olá, equipe da {{nome}},\n\nEncontrei o negócio de vocês em {{cidade}} e acredito que temos como ajudar vocês a crescer. Podemos conversar rapidamente esta semana?\n\nAbraço!'
	)
) as t(name, channel, subject, body)
where not exists (select 1 from public.leadgrap_templates);
