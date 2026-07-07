-- Organyze: cada tarefa pertence a um "lado" — Empresa ou Vida Pessoal.
-- Default 'empresa' para as tarefas existentes. Idempotente.

alter table public.organyze_tarefas
	add column if not exists categoria text not null default 'empresa';

do $$ begin
	alter table public.organyze_tarefas
		add constraint organyze_tarefas_categoria_chk check (categoria in ('empresa', 'pessoal'));
exception when duplicate_object then null; end $$;

comment on column public.organyze_tarefas.categoria is
	'Lado da tarefa no Organyze: empresa | pessoal.';
