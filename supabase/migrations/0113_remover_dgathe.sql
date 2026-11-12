-- ============================================================
-- DGathe: sai do banco por inteiro
--
-- Pedido do Bruno (12/11/2026): o DGathe saiu do ar. Dava muito trabalho e
-- tomava tempo demais. Esta migration tira tudo o que a 0096 até a 0112
-- puseram no banco, e ele volta a ser o que era antes da 0096.
--
-- Nenhuma delas trocou função, tabela ou regra que já existia. Só acrescentaram
-- coisas, então aqui nada é restaurado: só sai. Sai, nesta ordem:
--   1. as 3 regras do DGathe em realtime.messages (presença, trajetos e avisos)
--      e os avisos 'mudou' que o banco mandou no canal dgathe:agentes
--   2. as permissões dos módulos 'dgathe' e 'dgathe_agentes' (por cargo e por
--      pessoa; hoje são 8 linhas de 'dgathe' em permissoes_cargo)
--   3. os 6 gatilhos e as 17 funções dgathe_*
--   4. as 9 tabelas dgathe_*, e com elas os índices, as travas, as regras da
--      ponte, os grants, a sequência de dgathe_mensagens e os 52 Bandoletes
--   5. a coluna colaboradores.dgathe_avatar e a trava dela
--   6. o usuário dgathe_ponte (a ponte já foi desligada e saiu do launchd)
--
-- Antes de aplicar, o deploy que tira o DGathe do código tem que estar no ar:
-- o site antigo chama dgathe_pulso a cada 30 s em qualquer tela do dspace.
--
-- Tudo o que existia ficou guardado em VERT SYS/#off/dgathe/banco/: as 17
-- migrations, o esquema-vivo.sql e os dados em JSON Lines. Idempotente.
--   PGPASSWORD='***' node scripts/run_migration.mjs supabase/migrations/0113_remover_dgathe.sql
-- Conferência depois de aplicar (tudo tem que dar zero):
--   VERT SYS/#off/dgathe/banco/conferir-remocao.sql
--
-- Para desfazer: reaplicar 0096 a 0112 e os dados de VERT SYS/#off/dgathe/banco/
--   (passo a passo no LEIA-ME.md de lá; scripts/restaurar.mjs faz as duas coisas)
-- ============================================================

-- ------------------------------------------------------------ 1. Realtime

drop policy if exists "dgathe: recebe presença e trajetos" on realtime.messages;
drop policy if exists "dgathe: envia presença e trajetos" on realtime.messages;
drop policy if exists "dgathe: recebe avisos dos agentes" on realtime.messages;

-- Os avisos do gatilho dgathe_avisar (cada um leva só o id da tarefa). Sumiriam
-- sozinhos quando o Supabase apaga as partições antigas; aqui saem já.
delete from realtime.messages where topic like 'dgathe:%';

-- ------------------------------------------------------------ 2. permissões

delete from public.permissoes_colaborador where modulo in ('dgathe', 'dgathe_agentes');
delete from public.permissoes_cargo where modulo in ('dgathe', 'dgathe_agentes');

-- ------------------------------------------------------------ 3. gatilhos e funções

drop trigger if exists dgathe_avisa on public.dgathe_tarefas;
drop trigger if exists dgathe_avisa on public.dgathe_mensagens;
drop trigger if exists dgathe_avisa on public.dgathe_pedidos;
drop trigger if exists dgathe_avisa on public.dgathe_reunioes;
drop trigger if exists dgathe_avisa on public.dgathe_agentes;
drop trigger if exists dgathe_subtarefa_valida on public.dgathe_tarefas;

drop function if exists public.dgathe_avisar();
drop function if exists public.dgathe_subtarefa_valida();
drop function if exists public.dgathe_pulso(real, real, real, real, bigint, boolean, text);
drop function if exists public.dgathe_pulso(real, real, real, real, bigint);  -- a da 0098, caso tenha sobrado
drop function if exists public.dgathe_saiu();
drop function if exists public.dgathe_quem();
drop function if exists public.dgathe_agentes_agora();
drop function if exists public.dgathe_tarefas_do_agente(text, int);
drop function if exists public.dgathe_tarefa(uuid, bigint);
drop function if exists public.dgathe_titulo(text);
drop function if exists public.dgathe_passar_tarefa(text, text);
drop function if exists public.dgathe_mandar_mensagem(uuid, text);
drop function if exists public.dgathe_responder(uuid, jsonb);
drop function if exists public.dgathe_parar(uuid);
drop function if exists public.dgathe_uso();
drop function if exists public.dgathe_chamar_reuniao(text, text[], int);
drop function if exists public.dgathe_encerrar_reuniao(uuid);
drop function if exists public.dgathe_mapa(int);

-- ------------------------------------------------------------ 4. tabelas

-- Filhas antes das mães. Índices, travas, regras, grants e a sequência de
-- dgathe_mensagens.id saem junto com cada tabela.
drop table if exists public.dgathe_reunioes;
drop table if exists public.dgathe_fechamentos;
drop table if exists public.dgathe_pedidos;
drop table if exists public.dgathe_mensagens;
drop table if exists public.dgathe_tarefas;
drop table if exists public.dgathe_uso;
drop table if exists public.dgathe_ponte;
drop table if exists public.dgathe_agentes;
drop table if exists public.dgathe_presenca;

-- ------------------------------------------------------------ 5. colaboradores

-- O comentário da coluna sai junto com ela
alter table public.colaboradores
	drop constraint if exists colaboradores_dgathe_avatar_valido,
	drop column if exists dgathe_avatar;

-- ------------------------------------------------------------ 6. o usuário da ponte

-- Sem as tabelas, sobra a ele só o uso do schema public (0101). Tirado isso,
-- o usuário sai.
do $$
begin
	if exists (select 1 from pg_roles where rolname = 'dgathe_ponte') then
		revoke all on schema public from dgathe_ponte;
	end if;
end $$;
drop role if exists dgathe_ponte;

-- ------------------------------------------------------------
-- Desfazer: reaplicar 0096 a 0112 e depois os dados guardados
--   1. node scripts/run_migration.mjs em cada uma, da 0096 até a 0112
--   2. os dados de VERT SYS/#off/dgathe/banco/dados/, na ordem do LEIA-ME.md
--   3. node ponte/instalar.mjs, para o dgathe_ponte voltar a ter senha
--   Ensaio sem gravar nada (transação desfeita no fim):
--     node "VERT SYS/#off/dgathe/banco/scripts/restaurar.mjs" --remover-antes
-- ------------------------------------------------------------
