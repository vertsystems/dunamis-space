-- ============================================================
-- DGathe — equipes de agentes: o gerente distribui, a equipe executa
--
-- Pedido do Bruno (10/11/2026): implantar no DGathe o departamento de
-- Desenvolvimento & IA do manual (docs/dgathe/manual-departamento-dev-ia.pdf),
-- com o gerente Lewis e 10 especialistas. O CEO pede ao gerente, o gerente
-- planeja e passa só para quem precisa, a equipe executa, o QA testa e o
-- gerente valida e presta contas.
--
-- Como funciona:
--   1. Cada agente ganha equipe e lider. Só o líder delega, e só para os
--      ativos da própria equipe (o trigger dgathe_subtarefa_valida garante).
--   2. Dentro da sessão, o líder roda ponte/equipe.mjs delegar: cria uma
--      subtarefa (pai_id = a tarefa dele), que entra na fila normal.
--   3. A rodada do líder termina com subtarefa aberta: a tarefa dele fica
--      'aguardando' (sem sessão), ele espera sentado na mesa dele.
--   4. A última subtarefa fecha: a ponte grava o "Retorno da equipe" na
--      tarefa-pai (relatada_em marca o que já foi entregue) e devolve à fila.
--   5. Toda sexta às 17h (Brasília) a ponte cria o fechamento semanal de
--      cada líder; dgathe_fechamentos garante um só por semana.
--
-- Contrato completo (nomes, estados, limites): docs/dgathe/contrato-equipes.md
--
-- Limite conhecido: qualquer sessão do Mac consegue ler o ponte.env e usar o
-- usuário dgathe_ponte direto. As regras de delegação (trigger e equipe.mjs)
-- protegem contra erro e laço, não contra um agente mal-intencionado. A
-- auditoria disso fica para o Blade (Segurança da Informação) depois.
--
-- Para desfazer (nesta ordem; antes, nenhuma tarefa pode estar 'aguardando'):
--   update public.dgathe_tarefas set status = 'falhou', terminada_em = now()
--     where status = 'aguardando';
--   rodar de novo as seções "leitura" e "escrita" da 0101 (volta as 5 funções)
--   drop trigger if exists dgathe_subtarefa_valida on public.dgathe_tarefas;
--   drop function if exists public.dgathe_subtarefa_valida();
--   drop table if exists public.dgathe_fechamentos;
--   revoke insert on public.dgathe_tarefas from dgathe_ponte;
--   drop index if exists public.dgathe_agentes_um_lider, public.dgathe_tarefas_pai, public.dgathe_tarefas_aguardando;
--   alter table public.dgathe_tarefas drop column if exists pai_id, drop column if exists criada_por_agente,
--     drop column if exists rodada, drop column if exists rodada_do_pai, drop column if exists relatada_em;
--   alter table public.dgathe_agentes drop column if exists equipe, drop column if exists lider;
--   alter table public.dgathe_tarefas drop constraint if exists dgathe_tarefas_status_check;
--   alter table public.dgathe_tarefas add constraint dgathe_tarefas_status_check
--     check (status in ('fila', 'trabalhando', 'esperando', 'concluida', 'falhou', 'cancelada'));
-- ============================================================

-- ---------------------------------------------------------------- agentes

-- A equipe (ex.: 'dev') e quem lidera. Só líder delega.
alter table public.dgathe_agentes
	add column if not exists equipe text,
	add column if not exists lider boolean not null default false;
alter table public.dgathe_agentes drop constraint if exists dgathe_agentes_equipe_check;
alter table public.dgathe_agentes add constraint dgathe_agentes_equipe_check
	check (equipe is null or equipe ~ '^[a-z0-9][a-z0-9-]{1,29}$');
alter table public.dgathe_agentes drop constraint if exists dgathe_agentes_lider_check;
alter table public.dgathe_agentes add constraint dgathe_agentes_lider_check
	check (not lider or equipe is not null);
-- Um líder ativo por equipe (o sincronizador grava os líderes por último)
create unique index if not exists dgathe_agentes_um_lider on public.dgathe_agentes (equipe) where lider and ativo;

comment on column public.dgathe_agentes.equipe is 'DGathe: equipe do agente (ex.: dev). null = sem equipe (o assessor).';
comment on column public.dgathe_agentes.lider is 'DGathe: líder da equipe. Só ele delega (ponte/equipe.mjs), e só para os ativos da mesma equipe.';

-- ---------------------------------------------------------------- tarefas

-- Subtarefa (pai_id), quem delegou, as rodadas e o retorno ao líder
alter table public.dgathe_tarefas
	add column if not exists pai_id uuid references public.dgathe_tarefas (id) on delete cascade,
	add column if not exists criada_por_agente text references public.dgathe_agentes (id) on delete set null,
	-- Quantas vezes a ponte abriu uma sessão para esta tarefa (começo e cada retomada)
	add column if not exists rodada int not null default 0,
	-- Subtarefa: em qual rodada do pai ela nasceu (conta as rodadas de delegação)
	add column if not exists rodada_do_pai int,
	-- Subtarefa: quando o resultado dela foi entregue ao líder (null = ainda não)
	add column if not exists relatada_em timestamptz;

-- 'aguardando' = a rodada do líder acabou e a equipe ainda trabalha (sem sessão)
alter table public.dgathe_tarefas drop constraint if exists dgathe_tarefas_status_check;
alter table public.dgathe_tarefas add constraint dgathe_tarefas_status_check
	check (status in ('fila', 'trabalhando', 'esperando', 'aguardando', 'concluida', 'falhou', 'cancelada'));
-- Subtarefa sempre com a rodada do pai. O "is not null" é de propósito: sem ele,
-- rodada_do_pai nula dá NULL na conta e o check deixa passar.
alter table public.dgathe_tarefas drop constraint if exists dgathe_tarefas_subtarefa_check;
alter table public.dgathe_tarefas add constraint dgathe_tarefas_subtarefa_check
	check ((pai_id is null and rodada_do_pai is null)
		or (pai_id is not null and pai_id <> id and rodada_do_pai is not null and rodada_do_pai >= 1));

create index if not exists dgathe_tarefas_pai on public.dgathe_tarefas (pai_id, criada_em) where pai_id is not null;
create index if not exists dgathe_tarefas_aguardando on public.dgathe_tarefas (atualizada_em) where status = 'aguardando';

comment on table public.dgathe_tarefas is 'DGathe: tarefas passadas aos agentes. Executadas pela ponte do Mac (ponte/ponte.mjs). Ciclo: fila → trabalhando ⇄ esperando → concluida | falhou | cancelada | aguardando (esperando a equipe) → fila. Subtarefa = pai_id preenchido (o líder delegou).';
comment on column public.dgathe_tarefas.status is 'fila → trabalhando ⇄ esperando (pedido aberto) → concluida | falhou | cancelada | aguardando (esperando a equipe) → fila. Mensagem numa tarefa terminada ou aguardando põe de volta na fila (retoma a conversa).';
comment on column public.dgathe_tarefas.pai_id is 'Subtarefa: a tarefa do líder que a criou. Profundidade 1 (subtarefa não cria subtarefa).';
comment on column public.dgathe_tarefas.criada_por_agente is 'Subtarefa: o agente (líder) que delegou.';
comment on column public.dgathe_tarefas.rodada is 'Quantas sessões a ponte já abriu para esta tarefa (sobe 1 cada vez que sai da fila).';
comment on column public.dgathe_tarefas.rodada_do_pai is 'Subtarefa: a rodada do pai em que nasceu. Valores distintos = rodadas de delegação usadas (máximo 6).';
comment on column public.dgathe_tarefas.relatada_em is 'Subtarefa: quando o resultado dela chegou ao líder no "Retorno da equipe" (null = ainda não).';

-- -------------------------------------------- trava estrutural das subtarefas

-- Garante o que a tela e a ponte supõem, mesmo se alguém inserir direto pelo
-- SQL. Os limites (12 abertas, 6 rodadas) ficam no ponte/equipe.mjs, que trava
-- a linha do pai antes de inserir.
create or replace function public.dgathe_subtarefa_valida()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	v_pai record;
	v_lider record;
	v_destino record;
begin
	select id, agente_id, pai_id into v_pai from public.dgathe_tarefas where id = new.pai_id;
	if v_pai.id is null then raise exception 'DGathe: a tarefa-pai não existe'; end if;
	if v_pai.pai_id is not null then raise exception 'DGathe: subtarefa não cria subtarefa'; end if;
	if v_pai.agente_id = new.agente_id then raise exception 'DGathe: o líder não delega para si mesmo'; end if;
	select equipe, lider into v_lider from public.dgathe_agentes where id = v_pai.agente_id;
	if not coalesce(v_lider.lider, false) then raise exception 'DGathe: só o líder da equipe delega'; end if;
	select equipe, ativo into v_destino from public.dgathe_agentes where id = new.agente_id;
	if v_destino.equipe is distinct from v_lider.equipe then raise exception 'DGathe: o agente não é da equipe do líder'; end if;
	if tg_op = 'INSERT' and not coalesce(v_destino.ativo, false) then raise exception 'DGathe: o agente está desativado'; end if;
	return new;
end;
$$;
drop trigger if exists dgathe_subtarefa_valida on public.dgathe_tarefas;
create trigger dgathe_subtarefa_valida
	before insert or update of pai_id, agente_id on public.dgathe_tarefas
	for each row when (new.pai_id is not null)
	execute function public.dgathe_subtarefa_valida();
-- Função de trigger não se chama pela API; tira o execute que o Supabase dá por padrão
revoke execute on function public.dgathe_subtarefa_valida() from public, anon, authenticated;

-- ------------------------------------------------ fechamentos semanais

-- Um fechamento por líder por semana. A chave é a sexta-feira de referência:
-- a ponte grava aqui ANTES de criar a tarefa, na mesma transação, então
-- reiniciar a ponte (ou rodar duas) nunca cria dois.
create table if not exists public.dgathe_fechamentos (
	agente_id text not null references public.dgathe_agentes (id) on delete cascade,
	sexta date not null check (extract(isodow from sexta) = 5),
	tarefa_id uuid references public.dgathe_tarefas (id) on delete set null,
	criado_em timestamptz not null default now(),
	primary key (agente_id, sexta)
);
alter table public.dgathe_fechamentos enable row level security;
revoke all on public.dgathe_fechamentos from anon, authenticated;
comment on table public.dgathe_fechamentos is 'DGathe: fechamento semanal já criado para cada líder (a ponte cria toda sexta às 17h de Brasília).';

-- ------------------------------------------------- o que a ponte passa a poder

-- O ponte/equipe.mjs e a ponte entram com o usuário dgathe_ponte. Ele já lê
-- dgathe_agentes e lê/atualiza dgathe_tarefas; falta CRIAR tarefa (subtarefa e
-- fechamento) e cuidar dos fechamentos. Apagar, continua sem poder.
grant insert on public.dgathe_tarefas to dgathe_ponte;   -- a policy "for all" da 0101 já cobre o insert
grant select, insert, update on public.dgathe_fechamentos to dgathe_ponte;
drop policy if exists "dgathe: a ponte registra os fechamentos" on public.dgathe_fechamentos;
create policy "dgathe: a ponte registra os fechamentos" on public.dgathe_fechamentos
	for all to dgathe_ponte using (true) with check (true);

-- ---------------------------------------------------------------- leitura

-- Os agentes e o que cada um está fazendo agora, mais o estado da ponte. O
-- DGathe lê a cada 3 s. Quem só tem o módulo 'dgathe' vê se o agente está
-- livre ou trabalhando (e a equipe dele), sem o título nem a atividade.
-- A tarefa "de agora" segue a prioridade esperando → trabalhando → aguardando
-- → fila; em 'aguardando', desde = há quanto tempo espera a equipe.
create or replace function public.dgathe_agentes_agora()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_detalhe boolean;
	v_pode text;
begin
	if not public.tem_permissao('dgathe', 'ver') then
		return null;
	end if;
	v_detalhe := public.tem_permissao('dgathe_agentes', 'ver');
	v_pode := case
		when public.tem_permissao('dgathe_agentes', 'editar') then 'editar'
		when v_detalhe then 'ver'
		else 'nenhum' end;
	return jsonb_build_object(
		'pode', v_pode,
		'ponte', (
			select jsonb_build_object(
				'id', p.id,
				'visto_ha', extract(epoch from clock_timestamp() - p.visto_em)::real,
				'trabalhando', p.trabalhando
			)
			from public.dgathe_ponte p
			order by p.visto_em desc
			limit 1
		),
		'agentes', coalesce((
			select jsonb_agg(
				jsonb_build_object(
					'id', a.id,
					'nome', a.nome,
					'cargo', a.cargo,
					'sala', a.sala,
					'cadeira', a.cadeira,
					'aparencia', a.aparencia,
					'ordem', a.ordem,
					'equipe', a.equipe,
					'lider', a.lider,
					'na_fila', (select count(*) from public.dgathe_tarefas f where f.agente_id = a.id and f.status = 'fila'),
					'pedidos', (
						select count(*) from public.dgathe_pedidos q
						join public.dgathe_tarefas t on t.id = q.tarefa_id
						where t.agente_id = a.id and q.resposta is null and not q.cancelado
							and t.status in ('trabalhando', 'esperando')
					),
					'tarefa', (
						select jsonb_build_object(
							'id', case when v_detalhe then t.id end,
							'status', t.status,
							'titulo', case when v_detalhe then t.titulo end,
							'atividade', case when v_detalhe then t.atividade end,
							'desde', extract(epoch from clock_timestamp() - case when t.status = 'aguardando' then t.atualizada_em else coalesce(t.iniciada_em, t.criada_em) end)::real,
							'pai_id', case when v_detalhe then t.pai_id end,
							'subtarefas_abertas', case when v_detalhe then (
								select count(*) from public.dgathe_tarefas s
								where s.pai_id = t.id and s.status in ('fila', 'trabalhando', 'esperando')
							) end
						)
						from public.dgathe_tarefas t
						where t.agente_id = a.id and t.status in ('fila', 'trabalhando', 'esperando', 'aguardando')
						order by case t.status when 'esperando' then 0 when 'trabalhando' then 1 when 'aguardando' then 2 else 3 end, t.criada_em
						limit 1
					)
				)
				order by a.ordem, a.nome
			)
			from public.dgathe_agentes a
			where a.ativo
		), '[]'::jsonb)
	);
end;
$$;

-- As últimas tarefas de um agente (painel do agente no jogo). Cada uma diz se
-- é subtarefa (pai_id, criada_por_agente) e quantas subtarefas tem.
create or replace function public.dgathe_tarefas_do_agente(p_agente text, p_limite int default 12)
returns jsonb
language sql
volatile
security definer
set search_path = public
as $$
	select case when public.tem_permissao('dgathe_agentes', 'ver') then coalesce((
		select jsonb_agg(
			jsonb_build_object(
				'id', t.id,
				'titulo', t.titulo,
				'status', t.status,
				'criada_por_nome', t.criada_por_nome,
				'atividade', t.atividade,
				'resumo', left(t.resultado, 600),
				'erro', t.erro,
				'passos', t.passos,
				'criada_ha', extract(epoch from clock_timestamp() - t.criada_em)::real,
				'duracao', extract(epoch from coalesce(t.terminada_em, clock_timestamp()) - coalesce(t.iniciada_em, t.criada_em))::real,
				'pai_id', t.pai_id,
				'criada_por_agente', t.criada_por_agente,
				'subtarefas', (select count(*) from public.dgathe_tarefas s where s.pai_id = t.id)
			)
			order by t.criada_em desc
		)
		from (
			select * from public.dgathe_tarefas
			where agente_id = p_agente
			order by criada_em desc
			limit greatest(1, least(coalesce(p_limite, 12), 50))
		) t
	), '[]'::jsonb) end;
$$;

-- Uma tarefa inteira, com a conversa a partir de p_depois (o jogo lê só o que
-- chegou desde a última leitura) e os pedidos. Subtarefa traz o pai (de quem
-- veio); tarefa do líder traz a lista das subtarefas (a equipe nesta tarefa).
create or replace function public.dgathe_tarefa(p_id uuid, p_depois bigint default 0)
returns jsonb
language sql
volatile
security definer
set search_path = public
as $$
	select case when public.tem_permissao('dgathe_agentes', 'ver') then (
		select jsonb_build_object(
			'tarefa', jsonb_build_object(
				'id', t.id,
				'agente_id', t.agente_id,
				'titulo', t.titulo,
				'pedido', t.pedido,
				'status', t.status,
				'criada_por_nome', t.criada_por_nome,
				'atividade', t.atividade,
				'resultado', t.resultado,
				'erro', t.erro,
				'passos', t.passos,
				'cancelar', t.cancelar,
				'criada_ha', extract(epoch from clock_timestamp() - t.criada_em)::real,
				'duracao', extract(epoch from coalesce(t.terminada_em, clock_timestamp()) - coalesce(t.iniciada_em, t.criada_em))::real,
				'pai_id', t.pai_id,
				'criada_por_agente', t.criada_por_agente,
				'rodada', t.rodada,
				'rodada_do_pai', t.rodada_do_pai
			),
			'pai', (
				select jsonb_build_object('id', p.id, 'titulo', p.titulo, 'status', p.status, 'agente_id', p.agente_id, 'agente_nome', pa.nome)
				from public.dgathe_tarefas p join public.dgathe_agentes pa on pa.id = p.agente_id
				where p.id = t.pai_id
			),
			'subtarefas', coalesce((
				select jsonb_agg(jsonb_build_object(
					'id', s.id, 'agente_id', s.agente_id, 'agente_nome', sa.nome, 'agente_cargo', sa.cargo,
					'titulo', s.titulo, 'status', s.status, 'atividade', s.atividade,
					'resumo', left(s.resultado, 300), 'erro', s.erro, 'passos', s.passos,
					'pedidos', (select count(*) from public.dgathe_pedidos q
						where q.tarefa_id = s.id and q.resposta is null and not q.cancelado and s.status in ('trabalhando', 'esperando')),
					'rodada_do_pai', s.rodada_do_pai,
					'relatada', s.relatada_em is not null,
					'criada_ha', extract(epoch from clock_timestamp() - s.criada_em)::real,
					'duracao', extract(epoch from coalesce(s.terminada_em, clock_timestamp()) - coalesce(s.iniciada_em, s.criada_em))::real
				) order by s.criada_em)
				from public.dgathe_tarefas s join public.dgathe_agentes sa on sa.id = s.agente_id
				where s.pai_id = t.id
			), '[]'::jsonb),
			'mensagens', coalesce((
				select jsonb_agg(jsonb_build_object(
					'id', m.id,
					'tipo', m.tipo,
					'conteudo', m.conteudo,
					'detalhe', m.detalhe,
					'autor_nome', m.autor_nome,
					'entregue', m.entregue,
					'ha', extract(epoch from clock_timestamp() - m.criada_em)::real
				) order by m.id)
				from (
					select * from public.dgathe_mensagens
					where tarefa_id = t.id and id > coalesce(p_depois, 0)
					order by id
					limit 300
				) m
			), '[]'::jsonb),
			'pedidos', coalesce((
				select jsonb_agg(jsonb_build_object(
					'id', q.id,
					'tipo', q.tipo,
					'ferramenta', q.ferramenta,
					'resumo', q.resumo,
					'entrada', q.entrada,
					'resposta', q.resposta,
					'respondido_por_nome', q.respondido_por_nome,
					'cancelado', q.cancelado,
					'ha', extract(epoch from clock_timestamp() - q.criado_em)::real
				) order by q.criado_em)
				from (
					select * from public.dgathe_pedidos where tarefa_id = t.id order by criado_em desc limit 30
				) q
			), '[]'::jsonb)
		)
		from public.dgathe_tarefas t
		where t.id = p_id
	) end;
$$;

-- ---------------------------------------------------------------- escrita

-- Mensagem numa tarefa. Trabalhando: a ponte entrega no meio. Terminada ou
-- 'aguardando': volta para a fila NA HORA e a ponte retoma a mesma conversa (o
-- líder lê, responde e, com a equipe ainda trabalhando, volta a aguardar).
-- Subtarefa terminada reaberta com o projeto ainda aberto volta a ser "não
-- relatada", para o retorno dela chegar de novo ao líder.
create or replace function public.dgathe_mandar_mensagem(p_tarefa uuid, p_texto text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_eu uuid := public.colaborador_atual();
	v_nome text;
	v_texto text := btrim(coalesce(p_texto, ''));
	v_status text;
	v_pai uuid;
begin
	if v_eu is null or not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para falar com os agentes';
	end if;
	if length(v_texto) = 0 or length(v_texto) > 20000 then
		raise exception 'A mensagem precisa ter entre 1 e 20.000 caracteres';
	end if;
	select status, pai_id into v_status, v_pai from public.dgathe_tarefas where id = p_tarefa for update;
	if v_status is null then
		raise exception 'Tarefa não encontrada';
	end if;
	select nome into v_nome from public.colaboradores where id = v_eu;
	insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, colaborador_id, autor_nome, entregue)
	values (p_tarefa, 'mensagem', v_texto, v_eu, v_nome, false);
	if v_status in ('concluida', 'falhou', 'cancelada', 'aguardando') then
		update public.dgathe_tarefas
		set status = 'fila', cancelar = false, erro = null, terminada_em = null,
			atividade = 'Na fila para continuar', atualizada_em = now(),
			relatada_em = case
				when v_pai is not null and exists (
					select 1 from public.dgathe_tarefas p
					where p.id = v_pai and p.status in ('fila', 'trabalhando', 'esperando', 'aguardando')
				) then null
				else relatada_em end
		where id = p_tarefa;
	end if;
end;
$$;

-- Parar: na fila ou 'aguardando' (sem sessão), cancela na hora; trabalhando,
-- a ponte interrompe. Parar uma tarefa aberta para também as subtarefas
-- abertas dela (fila: cancela na hora; rodando: cancelar = true).
create or replace function public.dgathe_parar(p_tarefa uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_achou boolean;
begin
	if not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para parar os agentes';
	end if;
	update public.dgathe_tarefas
	set status = case when status in ('fila', 'aguardando') then 'cancelada' else status end,
		terminada_em = case when status in ('fila', 'aguardando') then now() else terminada_em end,
		atividade = case when status = 'fila' then 'Cancelada antes de começar'
			when status = 'aguardando' then 'Parada a pedido' else atividade end,
		cancelar = status in ('trabalhando', 'esperando'),
		atualizada_em = now()
	where id = p_tarefa and status in ('fila', 'trabalhando', 'esperando', 'aguardando')
	returning true into v_achou;
	-- Parar o projeto para também a equipe
	if v_achou then
		update public.dgathe_tarefas
		set status = case when status = 'fila' then 'cancelada' else status end,
			terminada_em = case when status = 'fila' then now() else terminada_em end,
			atividade = case when status = 'fila' then 'Parada junto com o projeto' else atividade end,
			cancelar = status in ('trabalhando', 'esperando'),
			atualizada_em = now()
		where pai_id = p_tarefa and status in ('fila', 'trabalhando', 'esperando');
	end if;
end;
$$;

-- Os mesmos da 0101 (create or replace mantém, mas reaplicar não custa)
revoke execute on function public.dgathe_agentes_agora() from public, anon;
revoke execute on function public.dgathe_tarefas_do_agente(text, int) from public, anon;
revoke execute on function public.dgathe_tarefa(uuid, bigint) from public, anon;
revoke execute on function public.dgathe_mandar_mensagem(uuid, text) from public, anon;
revoke execute on function public.dgathe_parar(uuid) from public, anon;
grant execute on function public.dgathe_agentes_agora() to authenticated;
grant execute on function public.dgathe_tarefas_do_agente(text, int) to authenticated;
grant execute on function public.dgathe_tarefa(uuid, bigint) to authenticated;
grant execute on function public.dgathe_mandar_mensagem(uuid, text) to authenticated;
grant execute on function public.dgathe_parar(uuid) to authenticated;
