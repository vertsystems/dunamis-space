-- ============================================================
-- 0026: Organyze — tarefas por colaborador + prioridade + etiquetas + ordem
--
-- Muda o modelo: em vez de "tarefas do usuário logado" (auth.uid()), o app passa
-- a ter uma tela de seleção de perfil (fotos dos colaboradores). Ao escolher uma
-- pessoa, vê-se as tarefas DAQUELE colaborador. É um quadro de equipe compartilhado
-- (sem senha por perfil): por isso a RLS libera para qualquer usuário autenticado.
--
-- Idempotente: pode ser reaplicada sem erro.
-- ============================================================

-- Novas colunas.
alter table public.organyze_tarefas
	add column if not exists colaborador_id uuid references public.colaboradores (id) on delete cascade;

alter table public.organyze_tarefas
	add column if not exists prioridade text not null default 'media';

alter table public.organyze_tarefas
	add column if not exists etiquetas text[] not null default '{}';

-- Valida os valores de prioridade no banco (alta/media/baixa).
do $$
begin
	if not exists (
		select 1 from pg_constraint where conname = 'organyze_prioridade_check'
	) then
		alter table public.organyze_tarefas
			add constraint organyze_prioridade_check
			check (prioridade in ('alta', 'media', 'baixa'));
	end if;
end $$;

-- user_id deixa de ser obrigatório (agora a chave lógica é colaborador_id).
-- Mantido apenas como auditoria de quem criou (default auth.uid()).
alter table public.organyze_tarefas alter column user_id drop not null;

-- Índice para o filtro principal (tarefas de um colaborador num dia).
create index if not exists organyze_tarefas_colab_data_idx
	on public.organyze_tarefas (colaborador_id, data, posicao);

-- ---------- RLS: quadro de equipe compartilhado ----------
-- Qualquer usuário autenticado pode ver/gerenciar as tarefas de qualquer perfil
-- (a "conta" é escolhida na tela de seleção, sem autenticação por perfil).
drop policy if exists organyze_tarefas_select on public.organyze_tarefas;
create policy organyze_tarefas_select on public.organyze_tarefas
	for select to authenticated using (true);

drop policy if exists organyze_tarefas_insert on public.organyze_tarefas;
create policy organyze_tarefas_insert on public.organyze_tarefas
	for insert to authenticated with check (true);

drop policy if exists organyze_tarefas_update on public.organyze_tarefas;
create policy organyze_tarefas_update on public.organyze_tarefas
	for update to authenticated using (true) with check (true);

drop policy if exists organyze_tarefas_delete on public.organyze_tarefas;
create policy organyze_tarefas_delete on public.organyze_tarefas
	for delete to authenticated using (true);
