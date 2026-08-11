-- ============================================================
-- Clientes — vários endereços, cada um com apelido
--
-- Um cliente com quatro lojas cabia num campo só de endereço: ou se escolhia
-- uma unidade e as outras sumiam, ou tudo virava um texto corrido impossível de
-- ler. Agora a lista mora em `enderecos` (jsonb), cada item no formato
--   { apelido, endereco, cidade, estado, cep }
--
-- As colunas endereco/cidade/estado/cep continuam existindo e passam a espelhar
-- o PRIMEIRO endereço da lista — mesma solução de responsavel_id x
-- responsaveis_ids: o que já lê a coluna antiga segue funcionando.
--
-- jsonb em vez de tabela filha porque o formulário do cliente grava tudo num
-- insert/update só (ver src/lib/server/crud.ts) e nada consulta endereço de
-- forma relacional.
--
-- Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0056_cliente_enderecos.sql
-- ============================================================

alter table public.clientes
	add column if not exists enderecos jsonb not null default '[]'::jsonb;

comment on column public.clientes.enderecos is
	'Lista de endereços do cliente: [{apelido, endereco, cidade, estado, cep}]. As colunas endereco/cidade/estado/cep espelham o primeiro item.';

-- O endereço único que já estava cadastrado vira o primeiro da lista. Só mexe
-- em quem ainda não tem lista, então rodar de novo não duplica nada.
update public.clientes
set enderecos = jsonb_build_array(
		jsonb_build_object(
			'apelido', 'Principal',
			'endereco', coalesce(endereco, ''),
			'cidade', coalesce(cidade, ''),
			'estado', coalesce(estado, ''),
			'cep', coalesce(cep, '')
		)
	)
where enderecos = '[]'::jsonb
	and (
		coalesce(endereco, '') <> ''
		or coalesce(cidade, '') <> ''
		or coalesce(estado, '') <> ''
		or coalesce(cep, '') <> ''
	);

notify pgrst, 'reload schema';
