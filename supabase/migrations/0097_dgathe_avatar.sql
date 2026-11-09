-- ============================================================
-- DGathe — o avatar de cada pessoa
--
-- Cada colaborador monta o próprio bonequinho no Meu Perfil (personagem, pele,
-- cabelo, roupa, sapato, óculos) e ele aparece assim no DGathe, para si e para
-- os outros. Guarda só ids do catálogo e uma cor, num JSON pequeno; quem lê é
-- lerAparencia() em src/lib/dgathe/aparencia.ts, que ignora o que não conhece.
--
-- Vazio (null) = o bonequinho padrão na cor de tema, como era antes.
--
-- Quem pode gravar: a própria pessoa, pela mesma regra que já deixa mudar
-- nome, foto e cor de tema (colaboradores_upd + o trigger colaborador_protege
-- da 0039, que só congela cargo, admin, e-mail e afins).
--
-- Para desfazer:
--   alter table public.colaboradores drop column dgathe_avatar;
-- ============================================================

alter table public.colaboradores add column if not exists dgathe_avatar jsonb;

alter table public.colaboradores drop constraint if exists colaboradores_dgathe_avatar_valido;
alter table public.colaboradores add constraint colaboradores_dgathe_avatar_valido
	check (
		dgathe_avatar is null
		or (jsonb_typeof(dgathe_avatar) = 'object' and pg_column_size(dgathe_avatar) <= 1024)
	);

comment on column public.colaboradores.dgathe_avatar is
	'Aparência do avatar no DGathe (ids do catálogo em src/lib/dgathe/aparencia.ts). Null = padrão.';
