-- ============================================================
-- Dunamis Space — Perfis na tela de login
-- A tela de login mostra uma bolinha por colaborador; clicar escolhe o perfil e
-- abre o campo de senha. Como o login é PÚBLICO e a RLS de `colaboradores` só
-- libera leitura a autenticados, a lista vem desta função security definer.
--
-- ATENÇÃO — o que fica público: nome, foto e e-mail de quem está ativo. Foi uma
-- escolha explícita (03/08/2026): o e-mail é o que o Supabase Auth precisa para
-- autenticar, e o app não tem service_role key para resolvê-lo no servidor. A
-- senha continua sendo exigida normalmente — a lista não dá acesso a nada.
-- Para deixar de expor, some um colaborador da lista marcando ativo = false.
--
-- Idempotente. Rodar no SQL Editor do Supabase ou:
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0045_login_perfis.sql
-- ============================================================

create or replace function public.login_perfis()
returns table (id uuid, nome text, email text, avatar_url text, funcao text)
language sql
stable
security definer
set search_path = public
as $$
	select c.id,
		c.nome,
		c.email,
		c.avatar_url,
		-- Cargo principal, só para a bandeirinha embaixo da foto.
		case when coalesce(array_length(c.funcoes, 1), 0) > 0
			then c.funcoes[1] else c.funcao::text end
	from public.colaboradores c
	where c.ativo
		and c.email is not null
	order by c.nome;
$$;

-- A tela de login roda sem sessão: precisa valer para anon (e para authenticated,
-- que é quem chama ao trocar de conta).
revoke execute on function public.login_perfis() from public;
grant execute on function public.login_perfis() to anon, authenticated;
