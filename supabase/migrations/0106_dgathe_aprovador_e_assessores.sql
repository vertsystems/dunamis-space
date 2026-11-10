-- ============================================================
-- DGathe — o agente vai até quem aprova; os assessores nas salas da diretoria
--
-- Pedidos do Bruno (10/11/2026):
--   1. Agente que precisa de aprovação (ou de resposta) vai até a pessoa, onde
--      ela estiver no escritório, e levanta a mão. Para o jogo saber quem é,
--      dgathe_agentes_agora passa a mandar, na tarefa atual, o `aprovador`:
--      quem passou a tarefa (criada_por) ou, numa subtarefa do líder, quem
--      passou a tarefa de cima. Vai para todos (é só o id): todas as telas
--      fazem a mesma conta de onde cada agente está.
--   2. A Diretoria foi esvaziada (virou a Sala 4 no mapa): o assessor vai para
--      a sala do Bruno, e a Aline ganha uma assessora na sala dela.
--   3. Os móveis da Diretoria saíram do mapa, então o id dos assentos depois
--      deles mudou: o lugar guardado de cada pessoa é limpo (cada tela escolhe
--      de novo na próxima vez que alguém ficar parado).
--
-- Para desfazer: reaplicar a função da 0103 e
--   update public.dgathe_agentes set sala = 'diretoria', cargo = 'Assessor do CEO' where id = 'assessor';
--   update public.dgathe_agentes set ativo = false where id = 'assessora';
-- ============================================================

CREATE OR REPLACE FUNCTION public.dgathe_agentes_agora()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
		-- Hora do servidor (s desde 1970): a rotina dos agentes (pausas) dá igual em todas as telas
		'agora', extract(epoch from clock_timestamp())::double precision,
		'reunioes', coalesce((
			select jsonb_agg(jsonb_build_object(
				'id', r.id,
				'sala', r.sala,
				'titulo', r.titulo,
				'participantes', to_jsonb(r.participantes),
				'criada_por', r.criada_por,
				'ate', extract(epoch from r.fim)::double precision
			) order by r.inicio)
			from public.dgathe_reunioes r
			where r.inicio <= clock_timestamp() and r.fim > clock_timestamp()
		), '[]'::jsonb),
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
					'reuniao', (
						select jsonb_build_object('id', r.id, 'sala', r.sala, 'titulo', r.titulo, 'ate', extract(epoch from r.fim)::double precision)
						from public.dgathe_reunioes r
						where a.id = any (r.participantes) and r.inicio <= clock_timestamp() and r.fim > clock_timestamp()
						order by r.inicio desc
						limit 1
					),
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
							-- Quem aprova os pedidos desta tarefa: quem a passou, ou, numa
							-- subtarefa (criada pelo líder), quem passou a tarefa de cima
							'aprovador', (
								with recursive cima as (
									select x.id, x.pai_id, x.criada_por, 0 as n from public.dgathe_tarefas x where x.id = t.id
									union all
									select p.id, p.pai_id, p.criada_por, cima.n + 1
									from public.dgathe_tarefas p join cima on p.id = cima.pai_id
									where cima.n < 10
								)
								select criada_por from cima where criada_por is not null order by n limit 1
							),
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
$function$;

-- O assessor do Bruno, na sala dele
update public.dgathe_agentes
set sala = 'sala-bruno', cargo = 'Assessor do Bruno', cadeira = 'Cadeira do assessor', atualizado_em = now()
where id = 'assessor';

-- A assessora da Aline, na sala dela
insert into public.dgathe_agentes (id, nome, cargo, sala, cadeira, pasta, autonomia, ordem, instrucoes, aparencia)
values (
	'assessora',
	'Assessora',
	'Assessora da Aline',
	'sala-aline',
	'Cadeira da assessora',
	'dunamiscompany',
	'editar',
	1,
	E'Você é a assessora da Aline Santana, CEO e diretora financeira da Dunamis Company. Pega o que ela mandar: finanças, cobrança, organização de clientes e contratos, planilhas, pesquisa, texto e rascunho de mensagem.\n'
	|| E'- Trabalhe pela pasta da Dunamis (Contex OS): siga o CLAUDE.md e as skills de lá (projeção de caixa, obrigações, planilha, contrato, quando couber), e salve cada entrega na pasta que a skill indicar.\n'
	|| E'- Dado de cliente (CPF, CNPJ, valores, contatos) não vai para ferramenta externa sem a Aline autorizar.\n'
	|| E'- No fim, diga em poucas linhas o que fez e o caminho de cada arquivo que criou ou mudou.',
	'{"personagem":"analista"}'::jsonb
)
on conflict (id) do nothing;

-- Os assentos mudaram de id: ninguém fica preso a um lugar que agora é outro
update public.dgathe_presenca set assento = null where assento is not null;
