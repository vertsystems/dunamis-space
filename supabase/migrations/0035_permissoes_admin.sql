-- ============================================================
-- RLS das tabelas de permissão para a tela de administração.
-- Só quem tem o módulo 'permissoes' em nível editar (ou seja, super-admin:
-- cargo ceo/admin ou flag super_admin) enxerga e altera a configuração.
-- O app "normal" continua lendo suas permissões pela função security definer
-- perm_niveis (que ignora RLS) — estas policies afetam só o acesso direto.
-- Idempotente.
-- ============================================================

drop policy if exists permissoes_cargo_admin on public.permissoes_cargo;
create policy permissoes_cargo_admin on public.permissoes_cargo
	for all to authenticated
	using (public.tem_permissao('permissoes', 'editar'))
	with check (public.tem_permissao('permissoes', 'editar'));

drop policy if exists permissoes_colaborador_admin on public.permissoes_colaborador;
create policy permissoes_colaborador_admin on public.permissoes_colaborador
	for all to authenticated
	using (public.tem_permissao('permissoes', 'editar'))
	with check (public.tem_permissao('permissoes', 'editar'));
