-- ============================================================
-- DGathe — avisos na hora, em vez de ler a cada poucos segundos
--
-- Pedido do Bruno (10/11/2026): o jogo e a ponte mais rápidos e o banco mais
-- leve, sem sair do online (a folga de 15 s antes de agir continua).
--
-- Um gatilho nas tabelas do DGathe avisa duas pontas quando algo muda:
--   1. A PONTE (pg_notify no canal 'dgathe_ponte', que ela ouve com LISTEN):
--      só o que é com ela: tarefa nova ou de volta à fila, pedido de parar,
--      mensagem nova para entregar, resposta a um pedido. Ela age na hora e a
--      leitura periódica vira reserva (bem mais espaçada).
--   2. O JOGO (Supabase Realtime, broadcast no canal PRIVADO 'dgathe:agentes'):
--      um "mudou" com o id da tarefa e nada mais. O navegador relê pelas
--      funções de sempre (que conferem permissão), então o aviso não vaza
--      conteúdo. Recebe quem tem o módulo 'dgathe'; ninguém manda (não há
--      policy de insert: só o banco manda, pela realtime.send).
-- O aviso nunca derruba a gravação: erro no envio é engolido.
--
-- Para desfazer:
--   drop trigger if exists dgathe_avisa on public.dgathe_tarefas;
--   drop trigger if exists dgathe_avisa on public.dgathe_mensagens;
--   drop trigger if exists dgathe_avisa on public.dgathe_pedidos;
--   drop trigger if exists dgathe_avisa on public.dgathe_reunioes;
--   drop trigger if exists dgathe_avisa on public.dgathe_agentes;
--   drop function if exists public.dgathe_avisar();
--   drop policy if exists "dgathe: recebe avisos dos agentes" on realtime.messages;
-- ============================================================

create or replace function public.dgathe_avisar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_tarefa uuid;
	v_ponte boolean := false;
begin
	if tg_table_name = 'dgathe_tarefas' then
		v_tarefa := new.id;
		v_ponte := (tg_op = 'INSERT' and new.status = 'fila')
			or (tg_op = 'UPDATE' and (
				(new.status = 'fila' and old.status is distinct from 'fila')
				or (new.cancelar and not coalesce(old.cancelar, false))
			));
	elsif tg_table_name = 'dgathe_mensagens' then
		v_tarefa := new.tarefa_id;
		v_ponte := not new.entregue;
	elsif tg_table_name = 'dgathe_pedidos' then
		v_tarefa := new.tarefa_id;
		v_ponte := tg_op = 'UPDATE' and new.resposta is not null and old.resposta is null;
	elsif tg_table_name = 'dgathe_reunioes' then
		v_tarefa := new.tarefa_id;
	end if;

	if v_ponte then
		perform pg_notify('dgathe_ponte', json_build_object('t', tg_table_name, 'tarefa', v_tarefa)::text);
	end if;
	begin
		perform realtime.send(jsonb_build_object('tarefa', v_tarefa), 'mudou', 'dgathe:agentes', true);
	exception when others then
		null;
	end;
	return null;
end;
$$;
revoke execute on function public.dgathe_avisar() from public, anon, authenticated;

drop trigger if exists dgathe_avisa on public.dgathe_tarefas;
create trigger dgathe_avisa after insert or update on public.dgathe_tarefas
	for each row execute function public.dgathe_avisar();
drop trigger if exists dgathe_avisa on public.dgathe_mensagens;
create trigger dgathe_avisa after insert on public.dgathe_mensagens
	for each row execute function public.dgathe_avisar();
drop trigger if exists dgathe_avisa on public.dgathe_pedidos;
create trigger dgathe_avisa after insert or update on public.dgathe_pedidos
	for each row execute function public.dgathe_avisar();
drop trigger if exists dgathe_avisa on public.dgathe_reunioes;
create trigger dgathe_avisa after insert or update on public.dgathe_reunioes
	for each row execute function public.dgathe_avisar();
drop trigger if exists dgathe_avisa on public.dgathe_agentes;
create trigger dgathe_avisa after insert or update on public.dgathe_agentes
	for each row execute function public.dgathe_avisar();

-- Quem vê o escritório recebe os avisos; ninguém manda (sem policy de insert)
drop policy if exists "dgathe: recebe avisos dos agentes" on realtime.messages;
create policy "dgathe: recebe avisos dos agentes"
	on realtime.messages
	for select
	to authenticated
	using (
		realtime.topic() = 'dgathe:agentes'
		and extension = 'broadcast'
		and (select public.tem_permissao('dgathe', 'ver'))
	);
