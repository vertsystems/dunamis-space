-- ============================================================
-- DMetric — a coleta passa a usar um segredo próprio, e não a service role
--
-- A 0072 deixava dmetric_coletar só para a service role, e a rota /api/dm
-- dependia da SUPABASE_SERVICE_ROLE_KEY. Em 10/10/2026 a variável apareceu na
-- Vercel mas chegou VAZIA à função: nenhuma visita era gravada.
--
-- Agora a rota chama com a chave pública (anon), mas a função exige o segredo
-- do DMetric (env DMETRIC_SEGREDO, só na Vercel). O banco guarda apenas o
-- SHA-256 dele, em dmetric_config — sem policy nenhuma, nem o app lê. Quem
-- chamar a função direto pela API, sem o segredo, não conta nada.
--
-- O hash do segredo NÃO vem neste arquivo (o repositório não guarda segredo):
-- é gravado à parte, junto com a variável da Vercel:
--   insert into dmetric_config (chave, valor) values ('segredo_coleta', encode(sha256('<segredo>'::bytea), 'hex'))
--   on conflict (chave) do update set valor = excluded.valor;
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0073_dmetric_segredo.sql
-- ============================================================

create table if not exists public.dmetric_config (
	chave text primary key,
	valor text not null
);
alter table public.dmetric_config enable row level security;
revoke all on public.dmetric_config from anon, authenticated;

drop function if exists public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text);

create or replace function public.dmetric_coletar(
	p_segredo text,
	p_chave text,
	p_host text,
	p_caminho text,
	p_origem text,
	p_pais text,
	p_cidade text,
	p_dispositivo text,
	p_navegador text,
	p_sistema text,
	p_visitante text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_site public.dmetric_sites%rowtype;
	v_host text := lower(coalesce(p_host, ''));
	v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
	v_nova boolean;
	v_n integer;
begin
	if p_segredo is null or not exists (
		select 1 from public.dmetric_config
		where chave = 'segredo_coleta' and valor = encode(sha256(convert_to(p_segredo, 'UTF8')), 'hex')
	) then
		return false;
	end if;

	select * into v_site from public.dmetric_sites where chave = p_chave and ativo;
	if not found then
		return false;
	end if;

	v_host := regexp_replace(v_host, '^www\.', '');
	if v_site.dominio is not null and v_site.dominio <> ''
		and v_host <> v_site.dominio and v_host not like '%.' || v_site.dominio then
		return false;
	end if;

	insert into public.dmetric_vistos (site_id, dia, visitante)
		values (v_site.id, v_dia, left(p_visitante, 64))
		on conflict do nothing;
	get diagnostics v_n = row_count;
	v_nova := v_n > 0;

	insert into public.dmetric_diario as d (site_id, dia, dimensao, valor, visitas, visualizacoes)
	select v_site.id, v_dia, x.dimensao, x.valor, case when v_nova then 1 else 0 end, 1
	from (values
		('total', ''),
		('pais', upper(left(coalesce(p_pais, ''), 2))),
		('cidade', left(coalesce(p_cidade, ''), 80)),
		('pagina', left(coalesce(nullif(p_caminho, ''), '/'), 200)),
		('dispositivo', left(coalesce(p_dispositivo, ''), 30)),
		('navegador', left(coalesce(p_navegador, ''), 30)),
		('sistema', left(coalesce(p_sistema, ''), 30))
	) as x(dimensao, valor)
	-- A origem só conta na chegada (ver 0072).
	union all
	select v_site.id, v_dia, 'origem', left(coalesce(nullif(p_origem, ''), 'Direto'), 120), 1, 1
	where v_nova
	on conflict (site_id, dia, dimensao, valor) do update
		set visitas = d.visitas + excluded.visitas,
			visualizacoes = d.visualizacoes + excluded.visualizacoes;

	update public.dmetric_sites set ultima_visita = now()
		where id = v_site.id and (ultima_visita is null or ultima_visita < now() - interval '1 minute');

	if random() < 0.02 then
		delete from public.dmetric_vistos where dia < v_dia - 1;
	end if;

	return true;
end;
$$;

revoke all on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.dmetric_coletar(text, text, text, text, text, text, text, text, text, text, text)
	to anon, authenticated, service_role;

notify pgrst, 'reload schema';
