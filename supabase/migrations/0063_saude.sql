-- ============================================================
-- Painel de Saúde: uma função que devolve, de uma vez, quanto o sistema ocupa
-- e quando cada módulo recebeu informação pela última vez.
--
-- Por que uma função e não 42 consultas do app: contar linha e ler data máxima
-- de 42 tabelas custaria 42 idas ao banco a cada abertura da tela. Aqui é uma
-- ida só, e o laço roda dentro do Postgres, ao lado dos dados.
--
-- SECURITY DEFINER porque ela precisa enxergar o TOTAL de cada tabela (o RLS
-- esconderia linhas de quem não tem o módulo, e um painel de saúde com números
-- pela metade mente). Em troca, ela devolve só CONTAGEM e DATA — nenhum dado
-- de dentro das tabelas — e checa a permissão do módulo 'administrativo' na
-- primeira linha: quem não pode abrir a Visão Geral não chama isto.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='<senha-postgres>' node scripts/run_migration.mjs supabase/migrations/0063_saude.sql
-- ============================================================

create or replace function public.saude_resumo()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	r record;
	v_linhas bigint;
	v_ultimo timestamptz;
	itens jsonb := '[]'::jsonb;
begin
	if not public.tem_permissao('administrativo', 'ver') then
		raise exception 'Sem permissão para ver a saúde do sistema.' using errcode = '42501';
	end if;

	for r in
		select c.oid, c.relname,
			exists (
				select 1 from pg_attribute a
				where a.attrelid = c.oid and a.attname = 'created_at'
				  and a.attnum > 0 and not a.attisdropped
			) as tem_data
		from pg_class c
		join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public' and c.relkind = 'r'
		order by c.relname
	loop
		if r.tem_data then
			execute format('select count(*), max(created_at) from public.%I', r.relname)
				into v_linhas, v_ultimo;
		else
			execute format('select count(*), null::timestamptz from public.%I', r.relname)
				into v_linhas, v_ultimo;
		end if;

		itens := itens || jsonb_build_object(
			'tabela', r.relname,
			'linhas', v_linhas,
			'ultimo', v_ultimo,
			'bytes', pg_total_relation_size(r.oid)
		);
	end loop;

	return jsonb_build_object(
		'gerado_em', now(),
		'banco_bytes', pg_database_size(current_database()),
		'dados_bytes', (
			select coalesce(sum(pg_total_relation_size(c.oid)), 0)
			from pg_class c join pg_namespace n on n.oid = c.relnamespace
			where n.nspname = 'public' and c.relkind = 'r'
		),
		'arquivos_qtd', (select count(*) from storage.objects),
		'arquivos_bytes', (
			select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects
		),
		'usuarios', (select count(*) from auth.users),
		'tabelas', itens
	);
end;
$$;

revoke all on function public.saude_resumo() from public;
grant execute on function public.saude_resumo() to authenticated;

comment on function public.saude_resumo() is
	'Painel de Saúde (/administrativo/saude): tamanho do banco e, por tabela, quantas linhas e a data da última. Só contagens — nenhum dado das tabelas sai daqui.';
