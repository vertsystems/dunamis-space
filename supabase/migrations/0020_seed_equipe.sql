-- Perfis da equipe (colaboradores). O LOGIN (auth.users) é criado à parte no
-- painel do Supabase; no primeiro login o app liga o auth_user_id pelo e-mail.
-- Pré-cadastrar aqui garante que cada um já entra com o cargo certo.
-- Idempotente: reexecutar apenas atualiza nome/cargos.

insert into public.colaboradores (nome, email, funcao, funcoes, ativo) values
	('Aline', 'aline@dunamiscompany.com.br', 'ceo',         array['ceo'],                     true),
	('Davi',  'davi@dunamiscompany.com.br',  'social_media', array['social_media'],            true),
	('Júlia', 'julia@dunamiscompany.com.br', 'financeiro',   array['financeiro', 'videomaker'], true)
on conflict (email) do update set
	nome    = excluded.nome,
	funcao  = excluded.funcao,
	funcoes = excluded.funcoes,
	ativo   = excluded.ativo,
	updated_at = now();
