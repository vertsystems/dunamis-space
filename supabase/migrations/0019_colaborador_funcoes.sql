-- Colaborador pode ter mais de uma função. Array de texto (valores validados no
-- app, FUNCAO em src/lib/equipe.ts). A coluna enum `funcao` é mantida = primeira,
-- para compat. Idempotente.

alter table public.colaboradores add column if not exists funcoes text[] not null default '{}';

comment on column public.colaboradores.funcoes is
	'Funções do colaborador (multi), ex.: {ceo,financeiro}. A coluna funcao espelha a primeira.';

update public.colaboradores set funcoes = array[funcao::text]
	where coalesce(array_length(funcoes, 1), 0) = 0;
