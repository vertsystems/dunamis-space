-- ============================================================
-- DGathe — agentes, tarefas e a ponte com o Claude Code do Mac
--
-- Pedido do Bruno (09/11/2026): passar tarefa para os agentes pelo jogo, sem
-- precisar abrir o chat, e ver no escritório o que cada um está fazendo.
--
-- Como funciona:
--   1. No DGathe, quem pode (módulo 'dgathe_agentes', nível editar) passa a
--      tarefa: dgathe_passar_tarefa() grava em dgathe_tarefas, na fila.
--   2. A ponte (ponte/ponte.mjs, launchd no Mac) lê a fila a cada 2-4 s,
--      abre uma sessão do Claude Code na pasta do agente e grava cada passo
--      em dgathe_mensagens.
--   3. Quando o agente pede permissão ou faz uma pergunta, a ponte grava em
--      dgathe_pedidos e espera: no jogo o boneco levanta a mão e a pessoa
--      responde por dgathe_responder().
--   4. Mensagem nova numa tarefa (dgathe_mandar_mensagem) entra no meio do
--      trabalho ou, se ele já terminou, retoma a mesma conversa.
--
-- As tabelas ficam fechadas (RLS sem policy para anon/authenticated): o app
-- usa só as funções abaixo. A ponte entra no banco com um usuário próprio,
-- dgathe_ponte, que só enxerga estas cinco tabelas. A senha dele é criada pelo
-- ponte/instalar.mjs e fica fora do Drive (~/.config/dunamisspace/ponte.env).
--
-- Quem vê o quê:
--   - 'dgathe' ver: vê os agentes no mapa e se estão livres ou trabalhando
--   - 'dgathe_agentes' ver: vê também o que cada um está fazendo e a conversa
--   - 'dgathe_agentes' editar: passa tarefa, manda mensagem, responde e para
--   (ceo/admin têm tudo; o módulo nasce sem seed, igual ao 'dgathe')
--
-- Para desfazer:
--   drop function if exists public.dgathe_parar(uuid);
--   drop function if exists public.dgathe_responder(uuid, jsonb);
--   drop function if exists public.dgathe_mandar_mensagem(uuid, text);
--   drop function if exists public.dgathe_passar_tarefa(text, text);
--   drop function if exists public.dgathe_tarefa(uuid, bigint);
--   drop function if exists public.dgathe_tarefas_do_agente(text, int);
--   drop function if exists public.dgathe_agentes_agora();
--   drop table if exists public.dgathe_ponte, public.dgathe_pedidos,
--     public.dgathe_mensagens, public.dgathe_tarefas, public.dgathe_agentes;
--   drop role if exists dgathe_ponte;
-- ============================================================

-- ---------------------------------------------------------------- tabelas

create table if not exists public.dgathe_agentes (
	id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
	nome text not null check (length(btrim(nome)) between 1 and 40),
	cargo text not null default 'Agente' check (length(cargo) <= 60),
	-- Sala do mapa (mapa.ts) e o nome do móvel onde ele senta para trabalhar.
	-- Nome, e não o id do assento: os ids mudam quando o mapa ganha móvel.
	sala text not null,
	cadeira text not null default 'Cadeira do gerente',
	-- Pasta de trabalho, relativa à pasta VERT SYS do Mac. A ponte recusa
	-- qualquer caminho que saia dela.
	pasta text not null default 'dunamiscompany' check (pasta !~ '(^|/)\.\.(/|$)' and pasta !~ '^/'),
	-- O "treinamento": função, regras e o que pode ou não fazer. Vai junto do
	-- CLAUDE.md da pasta, como instrução extra da sessão.
	instrucoes text not null default '' check (length(instrucoes) <= 20000),
	-- perguntar = pede licença para editar e rodar comando; editar = edita e
	-- roda comando à vontade, pede para o resto (e-mail, Figma, internet...);
	-- livre = não pede nada (perguntas continuam chegando ao jogo).
	autonomia text not null default 'editar' check (autonomia in ('perguntar', 'editar', 'livre')),
	modelo text check (modelo is null or modelo ~ '^[a-z0-9.\[\]-]{2,40}$'),
	esforco text check (esforco is null or esforco in ('low', 'medium', 'high', 'xhigh', 'max')),
	aparencia jsonb check (aparencia is null or pg_column_size(aparencia) <= 1024),
	ativo boolean not null default true,
	ordem int not null default 0,
	criado_em timestamptz not null default now(),
	atualizado_em timestamptz not null default now()
);

create table if not exists public.dgathe_tarefas (
	id uuid primary key default gen_random_uuid(),
	agente_id text not null references public.dgathe_agentes (id) on delete cascade,
	titulo text not null,
	pedido text not null check (length(pedido) between 1 and 20000),
	criada_por uuid references public.colaboradores (id) on delete set null,
	criada_por_nome text not null default '',
	-- fila → trabalhando ⇄ esperando (pedido aberto) → concluida | falhou | cancelada.
	-- Mensagem numa tarefa terminada põe de volta na fila (retoma a conversa).
	status text not null default 'fila'
		check (status in ('fila', 'trabalhando', 'esperando', 'concluida', 'falhou', 'cancelada')),
	-- Sessão do Claude Code (para retomar com --resume)
	sessao_id uuid,
	atividade text,
	resultado text,
	erro text,
	passos int not null default 0,
	-- Pedido de parar: a ponte interrompe a sessão e marca cancelada
	cancelar boolean not null default false,
	-- Qual ponte pegou (id do Mac)
	ponte text,
	criada_em timestamptz not null default now(),
	iniciada_em timestamptz,
	terminada_em timestamptz,
	atualizada_em timestamptz not null default now()
);
create index if not exists dgathe_tarefas_fila on public.dgathe_tarefas (criada_em) where status = 'fila';
create index if not exists dgathe_tarefas_agente on public.dgathe_tarefas (agente_id, criada_em desc);

create table if not exists public.dgathe_mensagens (
	id bigint generated always as identity primary key,
	tarefa_id uuid not null references public.dgathe_tarefas (id) on delete cascade,
	-- pedido/mensagem = de uma pessoa; texto = o agente escreveu; passo = o
	-- agente usou uma ferramenta; resultado = terminou a rodada; aviso = da ponte
	tipo text not null check (tipo in ('pedido', 'mensagem', 'texto', 'passo', 'resultado', 'aviso')),
	conteudo text not null default '' check (length(conteudo) <= 40000),
	detalhe jsonb,
	colaborador_id uuid references public.colaboradores (id) on delete set null,
	autor_nome text,
	-- Mensagem de pessoa: false até a ponte entregar ao agente
	entregue boolean not null default true,
	criada_em timestamptz not null default now()
);
create index if not exists dgathe_mensagens_tarefa on public.dgathe_mensagens (tarefa_id, id);
create index if not exists dgathe_mensagens_pendentes on public.dgathe_mensagens (tarefa_id) where not entregue;

create table if not exists public.dgathe_pedidos (
	id uuid primary key default gen_random_uuid(),
	tarefa_id uuid not null references public.dgathe_tarefas (id) on delete cascade,
	-- permissao = quer usar uma ferramenta; pergunta = AskUserQuestion
	tipo text not null check (tipo in ('permissao', 'pergunta')),
	ferramenta text not null,
	resumo text not null default '',
	entrada jsonb,
	-- permissao: {"permitir": bool, "motivo": text}; pergunta: {"respostas": {pergunta: resposta}}
	resposta jsonb,
	respondido_por uuid references public.colaboradores (id) on delete set null,
	respondido_por_nome text,
	respondido_em timestamptz,
	-- A sessão desistiu do pedido (parou, caiu, o Claude cancelou)
	cancelado boolean not null default false,
	criado_em timestamptz not null default now()
);
create index if not exists dgathe_pedidos_abertos on public.dgathe_pedidos (tarefa_id) where resposta is null and not cancelado;

-- Sinal de vida de cada ponte (hoje só o Mac do Bruno)
create table if not exists public.dgathe_ponte (
	id text primary key,
	visto_em timestamptz not null default now(),
	versao text,
	claude text,
	trabalhando int not null default 0
);

alter table public.dgathe_agentes enable row level security;
alter table public.dgathe_tarefas enable row level security;
alter table public.dgathe_mensagens enable row level security;
alter table public.dgathe_pedidos enable row level security;
alter table public.dgathe_ponte enable row level security;
revoke all on public.dgathe_agentes, public.dgathe_tarefas, public.dgathe_mensagens, public.dgathe_pedidos, public.dgathe_ponte
	from anon, authenticated;

comment on table public.dgathe_agentes is 'DGathe: os agentes do escritório (quem são, onde sentam, pasta e instruções). Leitura pelo app só por dgathe_agentes_agora.';
comment on table public.dgathe_tarefas is 'DGathe: tarefas passadas aos agentes. Executadas pela ponte do Mac (ponte/ponte.mjs).';
comment on table public.dgathe_mensagens is 'DGathe: a conversa de cada tarefa (pedido, mensagens, passos e textos do agente).';
comment on table public.dgathe_pedidos is 'DGathe: permissões e perguntas dos agentes esperando resposta no jogo.';
comment on table public.dgathe_ponte is 'DGathe: sinal de vida da ponte (Mac que roda as sessões do Claude Code).';

-- ------------------------------------------------- a ponte entra com usuário próprio

do $$ begin
	create role dgathe_ponte nologin;
exception when duplicate_object then null; end $$;

grant usage on schema public to dgathe_ponte;
grant select on public.dgathe_agentes to dgathe_ponte;
grant select, update on public.dgathe_tarefas to dgathe_ponte;
grant select, insert, update on public.dgathe_mensagens to dgathe_ponte;
grant select, insert, update on public.dgathe_pedidos to dgathe_ponte;
grant select, insert, update on public.dgathe_ponte to dgathe_ponte;
grant usage on sequence public.dgathe_mensagens_id_seq to dgathe_ponte;

drop policy if exists "dgathe: a ponte lê os agentes" on public.dgathe_agentes;
create policy "dgathe: a ponte lê os agentes" on public.dgathe_agentes for select to dgathe_ponte using (true);
drop policy if exists "dgathe: a ponte cuida das tarefas" on public.dgathe_tarefas;
create policy "dgathe: a ponte cuida das tarefas" on public.dgathe_tarefas for all to dgathe_ponte using (true) with check (true);
drop policy if exists "dgathe: a ponte grava a conversa" on public.dgathe_mensagens;
create policy "dgathe: a ponte grava a conversa" on public.dgathe_mensagens for all to dgathe_ponte using (true) with check (true);
drop policy if exists "dgathe: a ponte abre pedidos" on public.dgathe_pedidos;
create policy "dgathe: a ponte abre pedidos" on public.dgathe_pedidos for all to dgathe_ponte using (true) with check (true);
drop policy if exists "dgathe: a ponte dá sinal de vida" on public.dgathe_ponte;
create policy "dgathe: a ponte dá sinal de vida" on public.dgathe_ponte for all to dgathe_ponte using (true) with check (true);

-- ---------------------------------------------------------------- leitura

-- Os agentes e o que cada um está fazendo agora, mais o estado da ponte. O
-- DGathe lê a cada 3 s. Quem só tem o módulo 'dgathe' vê se o agente está
-- livre ou trabalhando, sem o título nem a atividade da tarefa.
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
							'desde', extract(epoch from clock_timestamp() - coalesce(t.iniciada_em, t.criada_em))::real
						)
						from public.dgathe_tarefas t
						where t.agente_id = a.id and t.status in ('fila', 'trabalhando', 'esperando')
						order by (t.status = 'fila'), t.criada_em
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

-- As últimas tarefas de um agente (painel do agente no jogo).
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
				'duracao', extract(epoch from coalesce(t.terminada_em, clock_timestamp()) - coalesce(t.iniciada_em, t.criada_em))::real
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
-- chegou desde a última leitura) e os pedidos.
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
				'duracao', extract(epoch from coalesce(t.terminada_em, clock_timestamp()) - coalesce(t.iniciada_em, t.criada_em))::real
			),
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

-- Título curto a partir do pedido: a primeira linha, até 80 caracteres.
create or replace function public.dgathe_titulo(p_texto text)
returns text
language sql
immutable
set search_path = public
as $$
	select case
		when length(l) > 80 then left(l, 79) || '…'
		when l = '' then 'Tarefa'
		else l end
	from (select btrim(regexp_replace(split_part(btrim(p_texto), E'\n', 1), '\s+', ' ', 'g')) as l) x;
$$;

create or replace function public.dgathe_passar_tarefa(p_agente text, p_pedido text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_eu uuid := public.colaborador_atual();
	v_nome text;
	v_id uuid;
	v_texto text := btrim(coalesce(p_pedido, ''));
begin
	if v_eu is null or not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para passar tarefa aos agentes';
	end if;
	if length(v_texto) = 0 or length(v_texto) > 20000 then
		raise exception 'A tarefa precisa ter entre 1 e 20.000 caracteres';
	end if;
	if not exists (select 1 from public.dgathe_agentes where id = p_agente and ativo) then
		raise exception 'Agente não encontrado';
	end if;
	select nome into v_nome from public.colaboradores where id = v_eu;
	insert into public.dgathe_tarefas (agente_id, titulo, pedido, criada_por, criada_por_nome)
	values (p_agente, public.dgathe_titulo(v_texto), v_texto, v_eu, coalesce(v_nome, ''))
	returning id into v_id;
	insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, colaborador_id, autor_nome)
	values (v_id, 'pedido', v_texto, v_eu, v_nome);
	return v_id;
end;
$$;

-- Mensagem numa tarefa. Trabalhando: a ponte entrega no meio. Terminada: volta
-- para a fila e a ponte retoma a mesma conversa.
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
begin
	if v_eu is null or not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para falar com os agentes';
	end if;
	if length(v_texto) = 0 or length(v_texto) > 20000 then
		raise exception 'A mensagem precisa ter entre 1 e 20.000 caracteres';
	end if;
	select status into v_status from public.dgathe_tarefas where id = p_tarefa for update;
	if v_status is null then
		raise exception 'Tarefa não encontrada';
	end if;
	select nome into v_nome from public.colaboradores where id = v_eu;
	insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, colaborador_id, autor_nome, entregue)
	values (p_tarefa, 'mensagem', v_texto, v_eu, v_nome, false);
	if v_status in ('concluida', 'falhou', 'cancelada') then
		update public.dgathe_tarefas
		set status = 'fila', cancelar = false, erro = null, terminada_em = null,
			atividade = 'Na fila para continuar', atualizada_em = now()
		where id = p_tarefa;
	end if;
end;
$$;

-- Resposta a um pedido de permissão ou a uma pergunta.
create or replace function public.dgathe_responder(p_pedido uuid, p_resposta jsonb)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
	v_eu uuid := public.colaborador_atual();
	v_nome text;
	v_tipo text;
	v_ok boolean;
begin
	if v_eu is null or not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para responder aos agentes';
	end if;
	if p_resposta is null or pg_column_size(p_resposta) > 20000 then
		raise exception 'Resposta inválida';
	end if;
	select tipo into v_tipo from public.dgathe_pedidos where id = p_pedido;
	if v_tipo = 'permissao' and jsonb_typeof(p_resposta -> 'permitir') is distinct from 'boolean' then
		raise exception 'Resposta de permissão precisa de "permitir"';
	end if;
	if v_tipo = 'pergunta' and jsonb_typeof(p_resposta -> 'respostas') is distinct from 'object' then
		raise exception 'Resposta de pergunta precisa de "respostas"';
	end if;
	select nome into v_nome from public.colaboradores where id = v_eu;
	update public.dgathe_pedidos
	set resposta = p_resposta, respondido_por = v_eu, respondido_por_nome = v_nome, respondido_em = now()
	where id = p_pedido and resposta is null and not cancelado
	returning true into v_ok;
	return coalesce(v_ok, false);
end;
$$;

-- Parar: na fila, cancela na hora; trabalhando, a ponte interrompe.
create or replace function public.dgathe_parar(p_tarefa uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
	if not public.tem_permissao('dgathe_agentes', 'editar') then
		raise exception 'Sem permissão para parar os agentes';
	end if;
	update public.dgathe_tarefas
	set status = case when status = 'fila' then 'cancelada' else status end,
		terminada_em = case when status = 'fila' then now() else terminada_em end,
		atividade = case when status = 'fila' then 'Cancelada antes de começar' else atividade end,
		cancelar = status in ('trabalhando', 'esperando'),
		atualizada_em = now()
	where id = p_tarefa and status in ('fila', 'trabalhando', 'esperando');
end;
$$;

revoke execute on function public.dgathe_agentes_agora() from public, anon;
revoke execute on function public.dgathe_tarefas_do_agente(text, int) from public, anon;
revoke execute on function public.dgathe_tarefa(uuid, bigint) from public, anon;
revoke execute on function public.dgathe_passar_tarefa(text, text) from public, anon;
revoke execute on function public.dgathe_mandar_mensagem(uuid, text) from public, anon;
revoke execute on function public.dgathe_responder(uuid, jsonb) from public, anon;
revoke execute on function public.dgathe_parar(uuid) from public, anon;
grant execute on function public.dgathe_agentes_agora() to authenticated;
grant execute on function public.dgathe_tarefas_do_agente(text, int) to authenticated;
grant execute on function public.dgathe_tarefa(uuid, bigint) to authenticated;
grant execute on function public.dgathe_passar_tarefa(text, text) to authenticated;
grant execute on function public.dgathe_mandar_mensagem(uuid, text) to authenticated;
grant execute on function public.dgathe_responder(uuid, jsonb) to authenticated;
grant execute on function public.dgathe_parar(uuid) to authenticated;

-- ---------------------------------------------------------------- o primeiro agente

-- Para testar a ponte de ponta a ponta. Os agentes de cada setor (e o
-- treinamento deles) vêm depois, com o Bruno.
insert into public.dgathe_agentes (id, nome, cargo, sala, cadeira, pasta, autonomia, ordem, instrucoes, aparencia)
values (
	'assessor',
	'Assessor',
	'Assessor do CEO',
	'diretoria',
	'Cadeira do assessor',
	'dunamiscompany',
	'editar',
	0,
	E'Você é o assessor do Bruno, CEO da Dunamis Company. Pega o que ele mandar: pesquisa, texto, organização de arquivos, análise, rascunho de proposta ou de mensagem.\n'
	|| E'- Trabalhe pela pasta da Dunamis (Contex OS): siga o CLAUDE.md e as skills de lá, e salve cada entrega na pasta que a skill indicar.\n'
	|| E'- No fim, diga em poucas linhas o que fez e o caminho de cada arquivo que criou ou mudou.',
	'{"corpo":"masculino","pele":"clara","cabelo":"social","corCabelo":"castanho","roupa":"blazer","corRoupa":"#7c5cd6","sapato":"social","oculos":"grau"}'::jsonb
)
on conflict (id) do nothing;
