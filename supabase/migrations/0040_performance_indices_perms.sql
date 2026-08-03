-- ============================================================================
-- 0040 — Performance: índices que faltavam + perm_niveis em uma query só
-- ============================================================================

-- ---------- 1) perm_niveis: 19 chamadas viravam ~40-70 scans por request ----------
-- `jsonb_object_agg(m, perm_nivel_efetivo(m))` sobre 19 módulos chamava a função
-- uma vez POR MÓDULO, e cada chamada re-executava colaborador_atual() + um select
-- em colaboradores + até dois selects nas tabelas de permissão. Isso roda em toda
-- navegação (hooks.server.ts), então era o caminho mais quente do sistema.
--
-- Reescrito como uma query única: resolve o colaborador UMA vez num CTE e faz
-- left join sobre os módulos pedidos. `perm_nivel_efetivo` continua existindo
-- inalterada — as policies de RLS dependem dela e já usam o padrão `(select ...)`,
-- que o Postgres avalia uma vez por statement.
create or replace function public.perm_niveis(p_modulos text[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	with eu as (
		select c.id,
			c.super_admin,
			case when coalesce(array_length(c.funcoes, 1), 0) > 0
				then c.funcoes else array[c.funcao::text] end as cargos
		from public.colaboradores c
		where c.id = public.colaborador_atual()
	),
	modulos as (
		select m from unnest(p_modulos) as m
	),
	resolvido as (
		select mo.m,
			case
				-- Sem colaborador vinculado: nada liberado.
				when eu.id is null then 'nenhum'
				-- Super-admin (flag manual ou cargo ceo/admin): acesso total.
				when eu.super_admin or eu.cargos && array['ceo', 'admin'] then 'excluir'
				-- Exceção por pessoa vence o cargo (inclusive para bloquear).
				when ex.nivel is not null then ex.nivel::text
				else coalesce(pc.nivel::text, 'nenhum')
			end as nivel
		from modulos mo
		left join eu on true
		left join public.permissoes_colaborador ex
			on ex.colaborador_id = eu.id and ex.modulo = mo.m
		left join lateral (
			select max(p.nivel) as nivel
			from public.permissoes_cargo p
			where p.modulo = mo.m and p.funcao::text = any(eu.cargos)
		) pc on true
	)
	select coalesce(jsonb_object_agg(m, nivel), '{}'::jsonb) from resolvido;
$$;

grant execute on function public.perm_niveis(text[]) to authenticated;

-- ---------- 2) Higiene: revoke antes do grant ----------
-- O Postgres concede EXECUTE a PUBLIC por padrão em funções novas, então os
-- `grant ... to authenticated` não restringiam nada. Sem impacto prático hoje
-- (sem JWT, colaborador_atual() é null e tudo devolve 'nenhum'), mas é o que
-- faz a restrição pretendida valer de fato.
revoke execute on function public.perm_niveis(text[]) from public;
revoke execute on function public.perm_nivel_efetivo(text) from public;
revoke execute on function public.tem_permissao(text, perm_nivel) from public;
revoke execute on function public.colaborador_atual() from public;
grant execute on function public.perm_nivel_efetivo(text) to authenticated;
grant execute on function public.tem_permissao(text, perm_nivel) to authenticated;
grant execute on function public.colaborador_atual() to authenticated;

-- ---------- 3) Índices ----------
-- Os dois primeiros são os que valem HOJE; o resto é seguro barato contra o
-- crescimento e contra cascatas de delete lentas.

-- O caminho mais quente do sistema: colaborador_atual() filtra por esta coluna,
-- e ela é chamada 1x por statement em TODA policy de RLS.
create index if not exists idx_colaboradores_auth_user_id
	on public.colaboradores (auth_user_id);

-- Rota pública (portal de aprovação) fazendo seq scan por token.
create unique index if not exists idx_aprovacoes_token_publico
	on public.aprovacoes (token_publico);

-- Contagem de pendentes no +layout.server.ts → roda em todo SSR.
create index if not exists idx_aprovacoes_status on public.aprovacoes (status);

create index if not exists idx_contratos_status_data_fim on public.contratos (status, data_fim);
create index if not exists idx_transacoes_status on public.transacoes (status);
create index if not exists idx_crm_atividades_responsavel on public.crm_atividades (responsavel_id);

-- "Última interação por cliente" faz top-1 por cliente; sem o desc havia sort.
create index if not exists idx_cliente_interacoes_cliente_data
	on public.cliente_interacoes (cliente_id, data desc);

-- NOTA (aplicada em 03/08/2026): os índices de `tarefas`, `campanhas`,
-- `campanha_produtos`, `campanha_materiais` e `tarefa_checklist` saíram daqui.
-- Esta migration ficou pendente até depois da 0042, que apagou essas tabelas —
-- criar índice em tabela inexistente aborta o arquivo inteiro no meio.

-- Chaves estrangeiras sem índice (importa para embeds e para on delete cascade).
create index if not exists idx_kb_artigos_cliente on public.kb_artigos (cliente_id);
create index if not exists idx_notificacoes_colaborador on public.notificacoes (colaborador_id);
create index if not exists idx_contratos_plano on public.contratos (plano_id);
create index if not exists idx_transacoes_contrato on public.transacoes (contrato_id);
create index if not exists idx_conteudos_projeto on public.conteudos (projeto_id);
create index if not exists idx_conteudos_responsavel on public.conteudos (responsavel_id);
create index if not exists idx_projetos_responsavel on public.projetos (responsavel_id);
