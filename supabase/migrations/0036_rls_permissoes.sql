-- ============================================================
-- RLS por módulo — substitui as policies coringa (using(true)) por policies
-- que consultam a permissão efetiva (tem_permissao). SELECT exige 'ver',
-- INSERT/UPDATE exigem 'editar', DELETE exige 'excluir'.
--
-- Como o seed (0034) libera tudo para todos os cargos, NÃO muda comportamento
-- hoje — o reforço passa a valer de verdade quando o admin restringir na tela.
--
-- As chamadas de tem_permissao ficam em subselect ((select ...)) para o planner
-- avaliar uma vez por query (padrão de performance de RLS do Supabase).
--
-- Mantêm a policy atual (fora do controle por módulo): organyze_*, rotina_*,
-- notificacoes, comentarios, aprovacoes (portal público via RPC) e jobs.
-- Idempotente.
-- ============================================================

do $$
declare
	r record;
	pol record;
begin
	for r in
		select * from (values
			('clientes', 'clientes'),
			('cliente_interacoes', 'clientes'),
			('adm_fornecedores', 'fornecedores'),
			('adm_ferramentas', 'ferramentas'),
			('adm_acessos', 'ferramentas'),
			('adm_onboarding_itens', 'onboarding'),
			('kb_artigos', 'base_conhecimento'),
			('sos_chamados', 'sos'),
			('crm_pipelines', 'crm'),
			('crm_stages', 'crm'),
			('crm_contatos', 'crm'),
			('crm_negocios', 'crm'),
			('crm_atividades', 'crm'),
			('crm_metas', 'crm'),
			('transacoes', 'financeiro'),
			('tarefas', 'tarefas'),
			('tarefa_checklist', 'tarefas'),
			('conteudos', 'conteudo'),
			('campanhas', 'campanhas'),
			('campanha_produtos', 'campanhas'),
			('campanha_materiais', 'campanhas'),
			('processos', 'processos'),
			('contratos', 'contratos'),
			('planos', 'contratos'),
			('projetos', 'projetos'),
			('projeto_templates', 'projetos'),
			('pagsup_clientes', 'pagsup'),
			('pagsup_prestadores', 'pagsup'),
			('pagsup_cronograma', 'pagsup'),
			('pagsup_negociacoes', 'pagsup'),
			('pagsup_negociacoes_agendadas', 'pagsup')
		) as t(tabela, modulo)
	loop
		-- Remove todas as policies existentes da tabela (auth_all, *_authenticated_all…).
		for pol in
			select policyname from pg_policies where schemaname = 'public' and tablename = r.tabela
		loop
			execute format('drop policy %I on public.%I', pol.policyname, r.tabela);
		end loop;

		execute format('alter table public.%I enable row level security', r.tabela);

		execute format(
			'create policy %I on public.%I for select to authenticated using ((select public.tem_permissao(%L, %L)))',
			r.tabela || '_perm_sel', r.tabela, r.modulo, 'ver');
		execute format(
			'create policy %I on public.%I for insert to authenticated with check ((select public.tem_permissao(%L, %L)))',
			r.tabela || '_perm_ins', r.tabela, r.modulo, 'editar');
		execute format(
			'create policy %I on public.%I for update to authenticated using ((select public.tem_permissao(%L, %L))) with check ((select public.tem_permissao(%L, %L)))',
			r.tabela || '_perm_upd', r.tabela, r.modulo, 'editar', r.modulo, 'editar');
		execute format(
			'create policy %I on public.%I for delete to authenticated using ((select public.tem_permissao(%L, %L)))',
			r.tabela || '_perm_del', r.tabela, r.modulo, 'excluir');
	end loop;
end $$;

-- ---------- colaboradores: caso especial ----------
-- Leitura liberada a todos os autenticados (dados de referência usados em
-- seletores de responsável por todo o app). Escrita só para admins (equipe),
-- MAS com autosserviço do /perfil: cada um cria/vincula e edita a própria linha.
-- Um trigger protege colunas sensíveis (cargo, super_admin, custo_hora) contra
-- autoescalada por quem não é admin de equipe.
do $$
declare pol record;
begin
	for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'colaboradores'
	loop
		execute format('drop policy %I on public.colaboradores', pol.policyname);
	end loop;
end $$;

create policy colaboradores_sel on public.colaboradores
	for select to authenticated using (true);

create policy colaboradores_ins on public.colaboradores
	for insert to authenticated
	with check (
		(select public.tem_permissao('equipe', 'editar'))
		or email = (auth.jwt() ->> 'email')
	);

create policy colaboradores_upd on public.colaboradores
	for update to authenticated
	using (
		(select public.tem_permissao('equipe', 'editar'))
		or id = public.colaborador_atual()
	)
	with check (
		(select public.tem_permissao('equipe', 'editar'))
		or id = public.colaborador_atual()
	);

create policy colaboradores_del on public.colaboradores
	for delete to authenticated
	using ((select public.tem_permissao('equipe', 'excluir')));

-- Protege colunas sensíveis para quem não é admin de equipe.
create or replace function public.colaborador_protege()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if public.tem_permissao('equipe', 'editar') then
		return new; -- admin de equipe: sem restrição de colunas
	end if;

	if tg_op = 'UPDATE' then
		if new.id is distinct from public.colaborador_atual() then
			raise exception 'Sem permissão para editar este colaborador.';
		end if;
		-- Mantém os campos sensíveis inalterados (só nome/telefone/local/avatar/tema
		-- e afins podem mudar via autosserviço).
		new.funcoes := old.funcoes;
		new.funcao := old.funcao;
		new.super_admin := old.super_admin;
		new.custo_hora := old.custo_hora;
		new.email := old.email;
		new.ativo := old.ativo;
		if old.auth_user_id is not null then
			new.auth_user_id := old.auth_user_id;
		end if;
	else -- INSERT (autoprovisão do próprio login)
		if new.email is distinct from (auth.jwt() ->> 'email') then
			raise exception 'Sem permissão para criar colaborador.';
		end if;
		new.super_admin := false;
		new.funcoes := '{}';
		new.custo_hora := null;
	end if;
	return new;
end;
$$;

drop trigger if exists colaborador_protege_trg on public.colaboradores;
create trigger colaborador_protege_trg
	before insert or update on public.colaboradores
	for each row execute function public.colaborador_protege();

-- View de lucro por cliente deriva de transacoes: roda com as permissões de
-- quem consulta (senão vazaria financeiro ignorando a RLS).
do $$
begin
	execute 'alter view public.v_lucro_cliente set (security_invoker = true)';
exception when others then null;
end $$;
