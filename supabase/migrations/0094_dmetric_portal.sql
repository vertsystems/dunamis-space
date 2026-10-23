-- ============================================================
-- DMetric — portal do cliente e relatório mensal pelo WhatsApp
--
-- O cliente vê os números do site dele num link sem login
-- (dspace.verts.me/relatorio/<token>), com a marca da Dunamis. O link pode ter
-- senha, pode travar o período (o mês passado, os últimos 30 dias…) e pode ser
-- desligado a qualquer hora. Todo dia 1º, o DMetric prepara a mensagem do mês
-- de cada cliente que recebe relatório; alguém da Dunamis revisa e manda pelo
-- WhatsApp (o link wa.me abre a conversa com a mensagem pronta — o app não
-- tem API de WhatsApp, e o link do portal vai no lugar do PDF).
--
--   1. dmetric_portais: um link por cliente (ou mais). O token é sorteado no
--      app (24 caracteres). A senha fica só como hash bcrypt (pgcrypto), numa
--      coluna que o app não lê: quem gerencia vê "com senha", nunca o hash.
--      Senha errada 10 vezes em 15 minutos trava o link por 15 minutos.
--   2. dmetric_portal_dados: o que a página pública mostra. Security definer,
--      para quem não tem login: confere o token, se está ligado e a senha (ou
--      a prova de que a senha já foi digitada, que o app guarda num cookie), e
--      só então devolve os números do site dono do link.
--   3. dmetric_relatorios: a fila do mês, uma mensagem por link, com o estado
--      (pendente, enviado, ignorado). dmetric_relatorios_dados entrega os
--      números do mês ao cron (/api/dmetric/relatorios) e
--      dmetric_relatorios_criar grava as mensagens; os dois só com o segredo
--      do DMetric.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0094_dmetric_portal.sql
-- ============================================================

-- ---------- 1. Os links do cliente ----------
create table if not exists public.dmetric_portais (
	id uuid primary key default gen_random_uuid(),
	site_id uuid not null references public.dmetric_sites (id) on delete cascade,
	-- O segredo do endereço: /relatorio/<token>.
	token text not null unique check (token ~ '^[A-Za-z0-9_-]{20,64}$'),
	-- O nome de quem recebe, para a saudação do relatório ("Olá, Mariana!"). Vazio: "Olá!".
	contato text,
	-- Hash bcrypt da senha (pgcrypto); null = sem senha. O app não lê esta coluna.
	senha_hash text,
	com_senha boolean generated always as (senha_hash is not null) stored,
	-- 'livre' = o cliente escolhe o período; os outros travam.
	periodo text not null default 'livre' check (periodo in ('livre', 'mes_passado', 'este_mes', '30d', '7d')),
	ativo boolean not null default true,
	-- Relatório mensal pelo WhatsApp: o número do cliente (55 + DDD + número) e se recebe.
	whatsapp text check (whatsapp is null or whatsapp ~ '^55[0-9]{10,11}$'),
	relatorio_mensal boolean not null default false,
	-- Senha errada: quantas e desde quando (a trava de 15 minutos).
	falhas integer not null default 0,
	falhas_desde timestamptz,
	acessos integer not null default 0,
	ultimo_acesso timestamptz,
	criado_em timestamptz not null default now()
);
create index if not exists idx_dmetric_portais_site on public.dmetric_portais (site_id);

alter table public.dmetric_portais enable row level security;
drop policy if exists dmetric_portais_ver on public.dmetric_portais;
create policy dmetric_portais_ver on public.dmetric_portais
	for select to authenticated using ((select public.tem_permissao('dmetric', 'ver')));
drop policy if exists dmetric_portais_editar on public.dmetric_portais;
create policy dmetric_portais_editar on public.dmetric_portais
	for all to authenticated
	using ((select public.tem_permissao('dmetric', 'editar')))
	with check ((select public.tem_permissao('dmetric', 'editar')));
-- O hash da senha não sai do banco: o app lê e grava as outras colunas, e a senha
-- só muda por dmetric_portal_senha.
revoke all on public.dmetric_portais from anon, authenticated;
grant select (id, site_id, token, contato, com_senha, periodo, ativo, whatsapp, relatorio_mensal, acessos, ultimo_acesso, criado_em)
	on public.dmetric_portais to authenticated;
grant insert (site_id, token, contato, periodo, whatsapp, relatorio_mensal) on public.dmetric_portais to authenticated;
grant update (contato, periodo, ativo, whatsapp, relatorio_mensal) on public.dmetric_portais to authenticated;
grant delete on public.dmetric_portais to authenticated;

-- A senha do link: vazia tira a senha. Quem não pode editar o DMetric, não troca.
create or replace function public.dmetric_portal_senha(p_id uuid, p_senha text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
	if not public.tem_permissao('dmetric', 'editar') then
		raise exception 'sem permissão';
	end if;
	update public.dmetric_portais
		set senha_hash = case when coalesce(p_senha, '') = '' then null else extensions.crypt(p_senha, extensions.gen_salt('bf', 8)) end,
			falhas = 0, falhas_desde = null
		where id = p_id;
	return found;
end;
$$;
revoke all on function public.dmetric_portal_senha(uuid, text) from public, anon;
grant execute on function public.dmetric_portal_senha(uuid, text) to authenticated;

-- O período de um link: o travado, ou o pedido (ao alcance de um ano), ou 30 dias.
create or replace function public.dmetric_portal_periodo(p_periodo text, p_de date, p_ate date)
returns table (de date, ate date)
language sql
stable
as $$
	with h as (select (now() at time zone 'America/Sao_Paulo')::date as hoje)
	select
		case
			when p_periodo = 'mes_passado' then (date_trunc('month', h.hoje) - interval '1 month')::date
			when p_periodo = 'este_mes' then date_trunc('month', h.hoje)::date
			when p_periodo = '7d' then h.hoje - 6
			when p_periodo = 'livre' and p_de is not null and p_ate is not null and p_de <= p_ate
				and p_ate <= h.hoje and p_ate - p_de <= 366 then p_de
			else h.hoje - 29
		end,
		case
			when p_periodo = 'mes_passado' then (date_trunc('month', h.hoje) - interval '1 day')::date
			when p_periodo = 'livre' and p_de is not null and p_ate is not null and p_de <= p_ate
				and p_ate <= h.hoje and p_ate - p_de <= 366 then p_ate
			else h.hoje
		end
	from h;
$$;

-- ---------- 2. O que a página pública mostra ----------
-- p_prova: o app guarda num cookie a prova de que a senha já foi digitada (devolvida
-- aqui na primeira vez); ela muda se a senha mudar. Erros: 'nao_existe' (token errado
-- ou link desligado — a mesma resposta, sem dizer qual), 'senha', 'travado'.
create or replace function public.dmetric_portal_dados(p_token text, p_senha text, p_prova text, p_de date, p_ate date)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
	v_portal public.dmetric_portais%rowtype;
	v_site public.dmetric_sites%rowtype;
	v_prova text;
	v_de date;
	v_ate date;
	v_dias integer;
	v_primeiro date;
	v_metas text[];
begin
	select * into v_portal from public.dmetric_portais where token = p_token and ativo;
	if not found then
		return jsonb_build_object('erro', 'nao_existe');
	end if;
	select * into v_site from public.dmetric_sites where id = v_portal.site_id;
	if not found then
		return jsonb_build_object('erro', 'nao_existe');
	end if;

	if v_portal.senha_hash is not null then
		v_prova := encode(extensions.digest(v_portal.senha_hash || '|' || v_portal.token, 'sha256'), 'hex');
		if coalesce(p_prova, '') <> v_prova then
			if v_portal.falhas >= 10 and v_portal.falhas_desde > now() - interval '15 minutes' then
				return jsonb_build_object('erro', 'travado');
			end if;
			if coalesce(p_senha, '') = '' or extensions.crypt(p_senha, v_portal.senha_hash) <> v_portal.senha_hash then
				if coalesce(p_senha, '') <> '' then
					update public.dmetric_portais
						set falhas = case when falhas_desde is null or falhas_desde < now() - interval '15 minutes' then 1 else falhas + 1 end,
							falhas_desde = case when falhas_desde is null or falhas_desde < now() - interval '15 minutes' then now() else falhas_desde end
						where id = v_portal.id;
				end if;
				return jsonb_build_object('erro', 'senha', 'tentou', coalesce(p_senha, '') <> '');
			end if;
			update public.dmetric_portais set falhas = 0, falhas_desde = null where id = v_portal.id;
		end if;
	end if;

	select de, ate into v_de, v_ate from public.dmetric_portal_periodo(v_portal.periodo, p_de, p_ate);
	v_dias := v_ate - v_de + 1;
	v_primeiro := public.dmetric_primeiro_dia(v_site.id);
	select coalesce(array_agg(valor order by criado_em), public.dmetric_metas_padrao()) into v_metas
		from public.dmetric_metas where site_id = v_site.id;
	if cardinality(v_metas) = 0 then
		v_metas := public.dmetric_metas_padrao();
	end if;

	update public.dmetric_portais set acessos = acessos + 1, ultimo_acesso = now() where id = v_portal.id;

	return jsonb_build_object(
		'prova', v_prova,
		'periodo', v_portal.periodo,
		'travado', v_portal.periodo <> 'livre',
		'de', v_de,
		'ate', v_ate,
		'primeiro_dia', v_primeiro,
		'site', jsonb_build_object('id', v_site.id, 'nome', v_site.nome, 'nome_manual', v_site.nome_manual,
			'titulo', v_site.titulo, 'dominio', v_site.dominio, 'caminho', v_site.caminho),
		'painel', public.dmetric_painel(v_site.id, v_de, v_ate),
		'por_dia', coalesce((
			select jsonb_agg(jsonb_build_object('dia', dia, 'visitas', visitas, 'visualizacoes', visualizacoes) order by dia)
			from public.dmetric_por_dia(v_site.id, v_de, v_ate)
		), '[]'::jsonb),
		'lugares', public.dmetric_lugares(v_site.id, v_de, v_ate),
		'titulos', coalesce((
			select jsonb_agg(jsonb_build_object('caminho', caminho, 'titulo', titulo))
			from public.dmetric_paginas where site_id = v_site.id
		), '[]'::jsonb),
		'metas', to_jsonb(v_metas),
		'conversao', public.dmetric_conversao(v_site.id,
			(v_de::timestamp at time zone 'America/Sao_Paulo'),
			((v_ate + 1)::timestamp at time zone 'America/Sao_Paulo'), '{}'::jsonb),
		-- O período de antes, do mesmo tamanho (o mês anterior, quando é um mês), para a variação.
		'anterior', case
			when v_portal.periodo = 'mes_passado' or (v_de = date_trunc('month', v_de)::date and v_ate = (date_trunc('month', v_de) + interval '1 month - 1 day')::date)
				then public.dmetric_resumo(v_site.id, (v_de - interval '1 month')::date, v_de - 1)
			else public.dmetric_resumo(v_site.id, v_de - v_dias, v_de - 1)
		end,
		'anterior_de', case
			when v_portal.periodo = 'mes_passado' or (v_de = date_trunc('month', v_de)::date and v_ate = (date_trunc('month', v_de) + interval '1 month - 1 day')::date)
				then (v_de - interval '1 month')::date
			else v_de - v_dias
		end
	);
end;
$$;
revoke all on function public.dmetric_portal_dados(text, text, text, date, date) from public;
grant execute on function public.dmetric_portal_dados(text, text, text, date, date) to anon, authenticated;

-- ---------- 3. O relatório do mês ----------
create table if not exists public.dmetric_relatorios (
	id uuid primary key default gen_random_uuid(),
	portal_id uuid not null references public.dmetric_portais (id) on delete cascade,
	-- O primeiro dia do mês do relatório.
	mes date not null check (mes = date_trunc('month', mes)::date),
	mensagem text not null,
	status text not null default 'pendente' check (status in ('pendente', 'enviado', 'ignorado')),
	criado_em timestamptz not null default now(),
	enviado_em timestamptz,
	enviado_por uuid references auth.users (id) on delete set null,
	unique (portal_id, mes)
);
alter table public.dmetric_relatorios enable row level security;
drop policy if exists dmetric_relatorios_ver on public.dmetric_relatorios;
create policy dmetric_relatorios_ver on public.dmetric_relatorios
	for select to authenticated using ((select public.tem_permissao('dmetric', 'ver')));
drop policy if exists dmetric_relatorios_editar on public.dmetric_relatorios;
create policy dmetric_relatorios_editar on public.dmetric_relatorios
	for all to authenticated
	using ((select public.tem_permissao('dmetric', 'editar')))
	with check ((select public.tem_permissao('dmetric', 'editar')));

-- Os números do mês de cada link que recebe relatório (ligado, com WhatsApp).
create or replace function public.dmetric_relatorios_dados(p_segredo text, p_mes date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_de date := date_trunc('month', p_mes)::date;
	v_ate date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date;
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return null;
	end if;
	return coalesce((
		select jsonb_agg(jsonb_build_object(
			'portal_id', p.id,
			'token', p.token,
			'contato', p.contato,
			'whatsapp', p.whatsapp,
			'periodo', p.periodo,
			'site', jsonb_build_object('id', s.id, 'nome', s.nome, 'nome_manual', s.nome_manual, 'titulo', s.titulo,
				'dominio', s.dominio, 'caminho', s.caminho),
			'primeiro_dia', public.dmetric_primeiro_dia(s.id),
			'numeros', public.dmetric_resumo(s.id, v_de, v_ate),
			'anterior', public.dmetric_resumo(s.id, (v_de - interval '1 month')::date, v_de - 1),
			'origens', coalesce((
				select jsonb_agg(jsonb_build_object('valor', valor, 'visitas', n) order by n desc)
				from (
					select valor, sum(visitas)::int as n from public.dmetric_diario
					where site_id = s.id and dimensao = 'origem' and dia between v_de and v_ate and valor <> ''
					group by valor order by 2 desc limit 3
				) t
			), '[]'::jsonb),
			'conversao', public.dmetric_conversao(s.id,
				(v_de::timestamp at time zone 'America/Sao_Paulo'),
				((v_ate + 1)::timestamp at time zone 'America/Sao_Paulo'), '{}'::jsonb)
		) order by s.nome)
		from public.dmetric_portais p
		join public.dmetric_sites s on s.id = p.site_id
		where p.ativo and p.relatorio_mensal and p.whatsapp is not null
	), '[]'::jsonb);
end;
$$;
revoke all on function public.dmetric_relatorios_dados(text, date) from public;
grant execute on function public.dmetric_relatorios_dados(text, date) to anon, authenticated, service_role;

-- Grava as mensagens do mês (a que já existe para o link e o mês fica como está:
-- pode já ter sido revisada ou enviada).
create or replace function public.dmetric_relatorios_criar(p_segredo text, p_itens jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	v_n integer;
begin
	if not public.dmetric_segredo_ok(p_segredo) then
		return -1;
	end if;
	insert into public.dmetric_relatorios (portal_id, mes, mensagem)
	select (i ->> 'portal_id')::uuid, date_trunc('month', (i ->> 'mes')::date)::date, left(i ->> 'mensagem', 4000)
	from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) i
	where coalesce(i ->> 'mensagem', '') <> ''
		and exists (select 1 from public.dmetric_portais p where p.id = (i ->> 'portal_id')::uuid)
	on conflict (portal_id, mes) do nothing;
	get diagnostics v_n = row_count;
	return v_n;
end;
$$;
revoke all on function public.dmetric_relatorios_criar(text, jsonb) from public;
grant execute on function public.dmetric_relatorios_criar(text, jsonb) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
