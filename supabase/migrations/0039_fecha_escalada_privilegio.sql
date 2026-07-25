-- ============================================================================
-- 0039 — Fecha a escalada de privilégio pelo /perfil
-- ----------------------------------------------------------------------------
-- Problema: qualquer colaborador conseguia se tornar super-admin em dois cliques.
-- A cadeia tinha cinco elos:
--   1. /perfil renderizava um checkbox para cada cargo, incluindo ceo/admin;
--   2. funcoesFromForm validava contra essa mesma lista (então ceo passava);
--   3. a action `salvar` gravava funcao/funcoes sem exigirPermissao;
--   4. o trigger colaborador_protege tem short-circuit em tem_permissao('equipe','editar');
--   5. o seed da 0034 deu nível 'excluir' em 'equipe' a TODOS os cargos,
--      então o short-circuit era sempre verdadeiro e o trigger nunca protegia.
-- Com funcoes = ['ceo'], perm_nivel_efetivo devolve 'excluir' em todos os módulos.
--
-- Os elos 1-3 foram corrigidos no código. Esta migration corrige os elos 4-5.
-- A 0034 é deixada intacta de propósito (migration já aplicada não se reescreve):
-- num ambiente novo ela roda concedendo 'excluir' e esta aqui rebaixa em seguida,
-- chegando ao mesmo estado final.
-- ============================================================================

-- ---------- Elo 5: rebaixa 'equipe' de 'excluir' para 'ver' ----------
-- Por que 'ver' e não remover a linha: mantém a tela de Equipe acessível como
-- diretório (todo mundo consulta), mas tira o 'editar' que desarmava o trigger.
-- Efeitos colaterais conferidos antes de aplicar:
--   · colaboradores_upd tem `or id = colaborador_atual()` → editar o PRÓPRIO
--     perfil continua funcionando (nome, telefone, local, avatar, tema);
--   · colaborador_atual() casa por email quando auth_user_id é null → o vínculo
--     automático do 1º login continua funcionando;
--   · colaboradores_del passa a exigir 'equipe:excluir' → só super-admin;
--   · editar OUTRO colaborador passa a ser bloqueado (que é o desejado).
-- Cargos ceo/admin não dependem desta tabela: têm short-circuit em
-- perm_nivel_efetivo, então seguem com acesso total.
update public.permissoes_cargo
	set nivel = 'ver'::perm_nivel
	where modulo = 'equipe'
		and nivel <> 'ver'::perm_nivel;

-- ---------- Elo 4: sanitiza `funcao` no INSERT do trigger ----------
-- O ramo de INSERT (autoprovisão do próprio login) já zerava super_admin,
-- funcoes e custo_hora — mas esquecia `funcao`. E perm_nivel_efetivo faz
-- fallback para `funcao` justamente quando `funcoes` está vazio, que é o estado
-- que o próprio trigger acabou de forçar. Sem isso, um POST direto no PostgREST
-- inserindo {email: <próprio email do JWT>, funcao: 'ceo'} vira super-admin com
-- super_admin ainda `false` — invisível na tela de permissões.
-- Esta é a escalada que SOBREVIVERIA à correção do seed acima.
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
		new.funcao := 'social_media'; -- <= elo que faltava
		new.custo_hora := null;
	end if;
	return new;
end;
$$;
