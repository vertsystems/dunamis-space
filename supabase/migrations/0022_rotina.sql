-- ============================================================
-- Dunamis Space — Mapa de Rotina
-- Rotina semanal por cargo (o que acompanhar em cada dia). Exibido no Meu Dia:
-- o dia de hoje vira um checklist marcável (conclusões por pessoa/dia, zeram
-- naturalmente a cada dia). dia_semana: 0=Domingo … 6=Sábado.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0022_rotina.sql
-- ============================================================

create table if not exists public.rotina_itens (
	id uuid primary key default gen_random_uuid(),
	cargo text not null default 'social_media',
	dia_semana int not null check (dia_semana between 0 and 6),
	titulo text not null,
	ordem int not null default 0,
	created_at timestamptz not null default now()
);
create index if not exists rotina_itens_cargo_dia_idx on public.rotina_itens (cargo, dia_semana, ordem);

create table if not exists public.rotina_conclusoes (
	id uuid primary key default gen_random_uuid(),
	item_id uuid not null references public.rotina_itens (id) on delete cascade,
	colaborador_id uuid not null references public.colaboradores (id) on delete cascade,
	data date not null,
	created_at timestamptz not null default now(),
	unique (item_id, colaborador_id, data)
);
create index if not exists rotina_conclusoes_lookup_idx on public.rotina_conclusoes (colaborador_id, data);

-- RLS: single-tenant (qualquer autenticado), igual ao restante do schema.
alter table public.rotina_itens enable row level security;
alter table public.rotina_conclusoes enable row level security;
drop policy if exists "auth_all" on public.rotina_itens;
create policy "auth_all" on public.rotina_itens for all to authenticated using (true) with check (true);
drop policy if exists "auth_all" on public.rotina_conclusoes;
create policy "auth_all" on public.rotina_conclusoes for all to authenticated using (true) with check (true);

-- Seed: rotina do Social Media (planilha "Mapa de Rotina · Gestor de Mídias Digitais").
-- Só insere se ainda não houver rotina para esse cargo.
insert into public.rotina_itens (cargo, dia_semana, titulo, ordem)
select 'social_media', d, t, o from (values
	-- Segunda (1)
	(1, 'Repost Influencers & Demandas urgentes', 0),
	(1, 'Olhar Checklist da Semana, fazer Planejamento & Cobranças da Semana', 1),
	(1, 'Programação/Revisão Clientes', 2),
	(1, 'Enviar conteúdo para portais de Mídias Sociais Contratados (Lojas Mari)', 3),
	(1, 'Tráfego Clientes p/ 6 dias', 4),
	(1, 'Repost intencional de clientes', 5),
	-- Terça (2)
	(2, 'Repost Influencers & Demandas urgentes', 0),
	(2, 'Executar Checklist', 1),
	(2, 'Google Meu Negócio & Reclame Aqui', 2),
	(2, 'Análise e Resposta de Comentários (Instagram & TikTok)', 3),
	(2, 'Tráfego Clientes p/ 5 dias', 4),
	-- Quarta (3)
	(3, 'Repost Influencers & Demandas urgentes', 0),
	(3, 'Executar Checklist & Fazer últimas cobranças', 1),
	(3, 'Programação/Revisão Clientes', 2),
	(3, 'Repost intencional de clientes', 3),
	(3, 'Tráfego Clientes p/ 4 dias', 4),
	-- Quinta (4)
	(4, 'Repost Influencers & Demandas urgentes', 0),
	(4, 'Executar Checklist', 1),
	(4, 'Google Meu Negócio & Reclame Aqui', 2),
	(4, 'Análise e Resposta de Comentários (Instagram & TikTok)', 3),
	(4, 'Tráfego Clientes p/ 3 dias', 4),
	-- Sexta (5)
	(5, 'Repost Influencers & Demandas urgentes', 0),
	(5, 'Apagar incêndios', 1),
	(5, 'Programação/Revisão Clientes', 2),
	(5, 'Repost intencional de clientes', 3),
	(5, 'Acompanhamento de Tendências da Semana', 4),
	-- Sábado (6)
	(6, 'Postar Shows & Repostar Influencers', 0),
	(6, 'Criar Checklist de Pendências e Demandas da Semana', 1),
	(6, 'Apagar os destaques de ofertas da Semana', 2),
	(6, 'Atualizar páginas de link', 3),
	(6, 'Enviar Cronograma de Repost Influencers', 4)
) as seed(d, t, o)
where not exists (select 1 from public.rotina_itens where cargo = 'social_media');
