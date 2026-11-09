-- ============================================================
-- DGathe — quem está no escritório, em tempo real
--
-- Quem abre o DGathe aparece para os outros: cada navegador entra no canal
-- privado 'dgathe:escritorio' do Supabase Realtime, anuncia onde está parado
-- (presence) e manda o trajeto quando anda (broadcast). Nada disso é gravado em
-- tabela: o Realtime só consulta estas duas regras para deixar entrar.
--
-- Canal PRIVADO: só recebe e envia quem tem o módulo 'dgathe' (hoje ceo/admin;
-- para mais alguém, liberar na tela de Permissões). Um canal público deixaria
-- qualquer um com a chave pública do site ver quem está online e "andar" no
-- escritório.
--
-- Sem esta migration o DGathe continua funcionando, só que cada um sozinho: o
-- canal recusa a entrada e o indicador do topo fica cinza.
--
-- Só acrescenta regras. Para desfazer:
--   drop policy "dgathe: recebe presença e trajetos" on realtime.messages;
--   drop policy "dgathe: envia presença e trajetos" on realtime.messages;
-- ============================================================

drop policy if exists "dgathe: recebe presença e trajetos" on realtime.messages;
create policy "dgathe: recebe presença e trajetos"
	on realtime.messages
	for select
	to authenticated
	using (
		realtime.topic() = 'dgathe:escritorio'
		and realtime.messages.extension in ('presence', 'broadcast')
		and (select public.tem_permissao('dgathe', 'ver'))
	);

drop policy if exists "dgathe: envia presença e trajetos" on realtime.messages;
create policy "dgathe: envia presença e trajetos"
	on realtime.messages
	for insert
	to authenticated
	with check (
		realtime.topic() = 'dgathe:escritorio'
		and realtime.messages.extension in ('presence', 'broadcast')
		and (select public.tem_permissao('dgathe', 'ver'))
	);

-- Conferência depois de aplicar (deve listar as duas regras):
--   select policyname, cmd from pg_policies
--   where schemaname = 'realtime' and tablename = 'messages' and policyname like 'dgathe:%';
