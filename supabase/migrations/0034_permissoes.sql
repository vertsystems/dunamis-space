-- ============================================================
-- Permissões por módulo (RBAC híbrido: cargo + exceção por usuário)
-- ------------------------------------------------------------
-- Nível hierárquico por módulo: nenhum < ver < editar < excluir.
--   ver     -> abre o módulo e lê (SELECT)
--   editar  -> também cria/edita (INSERT/UPDATE)
--   excluir -> também apaga (DELETE)
--
-- Permissão efetiva de um usuário para um módulo:
--   1) super-admin (cargo ceo/admin OU flag super_admin) => excluir em tudo.
--   2) senão: coalesce(exceção_do_colaborador, maior_nível_entre_os_cargos, nenhum).
--      A exceção por colaborador vence o cargo (inclusive para bloquear = nenhum).
--
-- Esta migration NÃO muda comportamento: a RLS coringa (using(true)) continua
-- até 0035. O seed libera tudo para todos os cargos (rollout "travar depois").
-- Idempotente.
-- ============================================================

-- Enum ordenado (comparações >=, max() respeitam a ordem de declaração).
do $$ begin
	create type perm_nivel as enum ('nenhum', 'ver', 'editar', 'excluir');
exception when duplicate_object then null; end $$;

-- Flag de super-admin manual (além de ceo/admin, que são fixos no código SQL).
alter table public.colaboradores
	add column if not exists super_admin boolean not null default false;

-- Padrão por cargo.
create table if not exists public.permissoes_cargo (
	funcao colaborador_funcao not null,
	modulo text not null,
	nivel  perm_nivel not null default 'nenhum',
	primary key (funcao, modulo)
);

-- Exceções por colaborador (override que vence o cargo).
create table if not exists public.permissoes_colaborador (
	colaborador_id uuid not null references public.colaboradores (id) on delete cascade,
	modulo text not null,
	nivel  perm_nivel not null,
	primary key (colaborador_id, modulo)
);

-- ---------- Funções (security definer: leem as tabelas de permissão sem RLS) ----------

-- id do colaborador do usuário logado (auth.uid()); fallback pelo e-mail do JWT.
create or replace function public.colaborador_atual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
	select id from public.colaboradores
	where auth_user_id = auth.uid()
		or (auth_user_id is null and email = (auth.jwt() ->> 'email'))
	order by (auth_user_id = auth.uid()) desc nulls last
	limit 1;
$$;

-- Nível efetivo do usuário logado para um módulo.
create or replace function public.perm_nivel_efetivo(p_modulo text)
returns perm_nivel
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_id uuid;
	v_super boolean;
	v_cargos text[];
	v_override perm_nivel;
	v_cargo perm_nivel;
begin
	select id, super_admin,
		case when coalesce(array_length(funcoes, 1), 0) > 0
			then funcoes else array[funcao::text] end
	into v_id, v_super, v_cargos
	from public.colaboradores
	where id = public.colaborador_atual();

	if v_id is null then
		return 'nenhum';
	end if;

	-- Super-admin: ceo/admin (fixo) ou flag manual => acesso total.
	if v_super or v_cargos && array['ceo', 'admin'] then
		return 'excluir';
	end if;

	-- Exceção do colaborador vence o cargo (inclusive p/ bloquear).
	select nivel into v_override
	from public.permissoes_colaborador
	where colaborador_id = v_id and modulo = p_modulo;
	if found then
		return v_override;
	end if;

	-- Maior nível entre os cargos do colaborador.
	select max(nivel) into v_cargo
	from public.permissoes_cargo
	where modulo = p_modulo and funcao::text = any(v_cargos);

	return coalesce(v_cargo, 'nenhum');
end;
$$;

-- Booleano p/ policies de RLS: o usuário tem pelo menos p_min no módulo?
create or replace function public.tem_permissao(p_modulo text, p_min perm_nivel)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select public.perm_nivel_efetivo(p_modulo) >= p_min;
$$;

-- Mapa {modulo: nivel} para o app (chamado via rpc pelo hooks/layout).
create or replace function public.perm_niveis(p_modulos text[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
	select coalesce(
		jsonb_object_agg(m, public.perm_nivel_efetivo(m)::text),
		'{}'::jsonb
	)
	from unnest(p_modulos) as m;
$$;

grant execute on function public.perm_niveis(text[]) to authenticated;
grant execute on function public.perm_nivel_efetivo(text) to authenticated;
grant execute on function public.tem_permissao(text, perm_nivel) to authenticated;
grant execute on function public.colaborador_atual() to authenticated;

-- ---------- Seed (rollout "todos liberados") ----------
-- Todos os cargos ganham 'excluir' em todos os módulos de negócio.
-- O módulo 'permissoes' (tela de administração) fica de fora: só super-admin,
-- via o short-circuit ceo/admin acima.
insert into public.permissoes_cargo (funcao, modulo, nivel)
select f.funcao, m.modulo, 'excluir'::perm_nivel
from unnest(enum_range(null::colaborador_funcao)) as f(funcao)
cross join unnest(array[
	'administrativo', 'clientes', 'fornecedores', 'onboarding', 'equipe',
	'ferramentas', 'base_conhecimento', 'sos', 'crm', 'financeiro',
	'calendario', 'tarefas', 'conteudo', 'campanhas', 'processos',
	'contratos', 'projetos', 'pagsup'
]) as m(modulo)
on conflict (funcao, modulo) do nothing;
