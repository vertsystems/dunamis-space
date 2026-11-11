#!/usr/bin/env node
// A linha de comando da equipe do DGathe. Roda DENTRO da sessão de um agente
// (a ponte põe o caminho dela em DGATHE_EQUIPE): o líder de uma equipe passa
// trabalho aos especialistas e acompanha o que cada um faz.
//
//   node "$DGATHE_EQUIPE" delegar <agente> --titulo "…" <<'PEDIDO'
//   …o pedido…
//   PEDIDO
//   node "$DGATHE_EQUIPE" estado [<número>|<id>]
//   node "$DGATHE_EQUIPE" equipe
//   node "$DGATHE_EQUIPE" ajuda
//
// Delegar cria uma subtarefa (pai_id = a tarefa do líder, que vem em
// DGATHE_TAREFA) que entra na fila normal da ponte, com a folga de 15 s. Quando
// a rodada do líder termina, a ponte deixa a tarefa dele esperando a equipe e,
// quando a última subtarefa fecha, devolve o retorno de cada uma na mesma
// conversa (ponte/ponte.mjs). Contrato: docs/dgathe/contrato-equipes.md, seção 3.
//
// Toda decisão e todo texto vêm de src/lib/dgathe/equipe.ts (testado no
// vitest); aqui só argumentos, stdin, banco e impressão. Entra no banco com o
// usuário da ponte (dgathe_ponte, senha em ~/.config/dunamisspace/ponte.env).
// As regras protegem contra erro e laço, não contra um agente mal-intencionado:
// qualquer sessão do Mac consegue ler aquele arquivo.
//
// Saídas: 0 deu certo · 1 erro inesperado (banco fora do ar…) · 2 uso errado · 3 recusado.
// Para testar fora de uma sessão: --tarefa <uuid> e --como <agente>.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import {
	EQUIPE_DIRETORIA,
	acharSubtarefa,
	contarAbertas,
	lerArgumentos,
	normalizarTitulo,
	rodadaAtual,
	rodadasUsadas,
	textoDaDiretoria,
	textoDaEquipe,
	textoDaSubtarefa,
	textoDeAjuda,
	textoDelegada,
	textoDoEstado,
	verificarDelegacao,
	verificarPedido
} from '../src/lib/dgathe/equipe.ts';

const ARQUIVO_ENV = join(homedir(), '.config/dunamisspace/ponte.env');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Quanto espera o pedido chegar pelo stdin antes de desistir. */
const ESPERA_DO_STDIN_MS = 5000;

/** Mesmo leitor da ponte (ponte.mjs). */
function lerEnv(arquivo) {
	const r = {};
	if (!existsSync(arquivo)) return r;
	for (const linha of readFileSync(arquivo, 'utf8').split('\n')) {
		const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		if (!m) continue;
		r[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
	}
	return r;
}

const cfg = { ...lerEnv(ARQUIVO_ENV), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('DGATHE_'))) };
const ESPERA = Math.max(0, Math.min(300, Number(cfg.DGATHE_ESPERA ?? 15)));

class Saida extends Error {
	constructor(codigo, texto) {
		super(texto);
		this.codigo = codigo;
	}
}
const recusado = (texto) => new Saida(3, `Recusado: ${texto}`);
const usoErrado = (texto) => new Saida(2, `${texto}\nVeja como usar: node "$DGATHE_EQUIPE" ajuda`);

/** O pedido pelo stdin: TTY ou nada em 5 s → null. */
function lerStdin() {
	return new Promise((resolve) => {
		if (process.stdin.isTTY) return resolve(null);
		const partes = [];
		let chegou = false;
		let acabou = false;
		const fim = (v) => {
			if (acabou) return;
			acabou = true;
			clearTimeout(relogio);
			resolve(v);
		};
		const relogio = setTimeout(() => {
			if (chegou) return;
			process.stdin.destroy();
			fim(null);
		}, ESPERA_DO_STDIN_MS);
		process.stdin.on('data', (b) => {
			chegou = true;
			partes.push(b);
		});
		process.stdin.on('end', () => fim(Buffer.concat(partes).toString('utf8')));
		process.stdin.on('error', () => fim(partes.length ? Buffer.concat(partes).toString('utf8') : null));
	});
}

function conectar() {
	if (!cfg.DGATHE_PG_SENHA) throw new Saida(1, `Não deu: sem a senha do banco em ${ARQUIVO_ENV} (a ponte está instalada neste Mac?).`);
	return new pg.Client({
		host: cfg.DGATHE_PG_HOST || 'db.rboenllphxqecjroolzo.supabase.co',
		port: 5432,
		user: 'dgathe_ponte',
		password: cfg.DGATHE_PG_SENHA,
		database: 'postgres',
		ssl: { rejectUnauthorized: false },
		connectionTimeoutMillis: 15_000
	});
}

/** De onde vêm a tarefa e o agente: --tarefa/--como vencem o ambiente da sessão. */
function quemEOnde(a, { precisaTarefa }) {
	const tarefa = (a.tarefa ?? process.env.DGATHE_TAREFA ?? '').trim();
	const como = (a.como ?? process.env.DGATHE_AGENTE ?? '').trim();
	if (!como) throw usoErrado('Este comando roda dentro de uma tarefa do DGathe: falta DGATHE_AGENTE (ou --como <agente>).');
	if (precisaTarefa) {
		if (!tarefa) throw usoErrado('Este comando roda dentro de uma tarefa do DGathe: falta DGATHE_TAREFA (ou --tarefa <uuid>).');
		if (!UUID.test(tarefa)) throw usoErrado(`"${tarefa}" não é o id (uuid) de uma tarefa.`);
	}
	return { tarefa, como };
}

const SELECT_AGENTE = `select id, nome, cargo, equipe, lider, ativo from public.dgathe_agentes`;

// ------------------------------------------------------------ delegar

async function delegar(a) {
	const { tarefa: tarefaId, como } = quemEOnde(a, { precisaTarefa: true });
	let pedido = a.pedido;
	if (pedido === null) pedido = await lerStdin();
	pedido = String(pedido ?? '').trim();
	const semPedido = verificarPedido(pedido);
	if (semPedido) throw new Saida(semPedido.saida, `Recusado: ${semPedido.mensagem}`);
	const destinoId = a.alvo.trim().toLowerCase();
	const titulo = normalizarTitulo(a.titulo, pedido);

	const c = conectar();
	await c.connect();
	try {
		await c.query('begin');
		// A trava no pai serializa delegações em paralelo e o fim da rodada da ponte
		const {
			rows: [tarefa]
		} = await c.query(`select id, agente_id, status, pai_id, rodada, cancelar, titulo from public.dgathe_tarefas where id = $1 for update`, [tarefaId]);
		const { rows: agentes } = await c.query(`${SELECT_AGENTE} where id = any($1::text[])`, [[como, destinoId]]);
		const eu = agentes.find((x) => x.id === como) ?? null;
		const destino = agentes.find((x) => x.id === destinoId) ?? null;
		const { rows: subs } = await c.query(`select status, rodada_do_pai from public.dgathe_tarefas where pai_id = $1`, [tarefaId]);
		// Subtarefa: a tarefa de cima diz se veio de um diretor (o gerente pode redistribuir)
		let acima = null;
		if (tarefa?.pai_id) {
			const {
				rows: [x]
			} = await c.query(
				`select t.pai_id, a.equipe from public.dgathe_tarefas t join public.dgathe_agentes a on a.id = t.agente_id where t.id = $1`,
				[tarefa.pai_id]
			);
			acima = x ?? null;
		}
		const r = verificarDelegacao({ tarefa: tarefa ?? null, eu, destinoId: a.alvo, destino, subtarefas: subs, pedido, tarefaId, acima });
		if (r) {
			await c.query('rollback');
			throw new Saida(r.saida, `Recusado: ${r.mensagem}`);
		}
		const rodada = rodadaAtual(tarefa);
		const {
			rows: [sub]
		} = await c.query(
			`insert into public.dgathe_tarefas (agente_id, titulo, pedido, criada_por, criada_por_nome, pai_id, criada_por_agente, rodada_do_pai)
			values ($1, $2, $3, null, $4, $5, $6, $7) returning id`,
			[destino.id, titulo, pedido, eu.nome, tarefa.id, eu.id, rodada]
		);
		await c.query(
			`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, autor_nome, detalhe) values ($1, 'pedido', $2, $3, $4)`,
			[sub.id, pedido, eu.nome, { de_agente: eu.id, pai: tarefa.id }]
		);
		await c.query(
			`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, detalhe) values ($1, 'aviso', $2, $3)`,
			[tarefa.id, `Passou para ${destino.nome}: ${titulo}`, { subtarefa: sub.id, agente: destino.id }]
		);
		await c.query('commit');
		return textoDelegada({
			destino,
			titulo,
			id: sub.id,
			rodada,
			rodadasUsadas: rodadasUsadas([...subs, { rodada_do_pai: rodada }]),
			abertas: contarAbertas(subs) + 1,
			espera: ESPERA
		});
	} catch (e) {
		await c.query('rollback').catch(() => {});
		// A trava do banco (trigger dgathe_subtarefa_valida) fala com "DGathe: …"
		if (!(e instanceof Saida) && /^DGathe:/.test(e?.message ?? '')) throw recusado(e.message.replace(/^DGathe:\s*/, ''));
		throw e;
	} finally {
		await c.end().catch(() => {});
	}
}

// ------------------------------------------------------------ estado

async function estado(a) {
	const { tarefa: tarefaId, como } = quemEOnde(a, { precisaTarefa: true });
	const c = conectar();
	await c.connect();
	try {
		const {
			rows: [tarefa]
		} = await c.query(`select id, agente_id, rodada from public.dgathe_tarefas where id = $1`, [tarefaId]);
		if (!tarefa || tarefa.agente_id !== como) throw recusado(`A tarefa ${tarefaId.slice(0, 8)} não existe ou não é sua.`);
		const { rows: subs } = await c.query(
			`select s.id, s.agente_id, a.nome as agente_nome, a.cargo as agente_cargo, s.titulo, s.status, s.atividade,
				s.resultado, s.erro, s.pedido, s.rodada_do_pai, s.relatada_em,
				(select count(*)::int from public.dgathe_pedidos q
					where q.tarefa_id = s.id and q.resposta is null and not q.cancelado and s.status in ('trabalhando', 'esperando')) as pedidos
			from public.dgathe_tarefas s join public.dgathe_agentes a on a.id = s.agente_id
			where s.pai_id = $1
			order by s.criada_em`,
			[tarefaId]
		);
		if (a.alvo === null) return textoDoEstado(tarefa, subs);
		const s = acharSubtarefa(subs, a.alvo);
		if (!s) throw recusado(`Não achei a subtarefa "${a.alvo}" nesta tarefa.`);
		return textoDaSubtarefa(subs.indexOf(s) + 1, s);
	} finally {
		await c.end().catch(() => {});
	}
}

// ------------------------------------------------------------ equipe

async function equipe(a) {
	const { como } = quemEOnde(a, { precisaTarefa: false });
	const c = conectar();
	await c.connect();
	try {
		const {
			rows: [eu]
		} = await c.query(`${SELECT_AGENTE} where id = $1`, [como]);
		if (!eu?.equipe) throw recusado('Você não está em nenhuma equipe.');
		// O "agora" de cada um com a mesma prioridade da dgathe_agentes_agora
		const colunas = `a.id, a.nome, a.cargo, a.lider, a.equipe,
				(select jsonb_build_object('status', t.status, 'titulo', t.titulo, 'atividade', t.atividade)
					from public.dgathe_tarefas t
					where t.agente_id = a.id and t.status in ('fila', 'trabalhando', 'esperando', 'aguardando')
					order by case t.status when 'esperando' then 0 when 'trabalhando' then 1 when 'aguardando' then 2 else 3 end, t.criada_em
					limit 1) as agora,
				(select count(*)::int from public.dgathe_tarefas t where t.agente_id = a.id and t.status = 'fila') as fila,
				(select count(*)::int from public.dgathe_agentes m where m.equipe = a.equipe and m.ativo) as membros`;
		const membro = (m) => ({
			id: m.id,
			nome: m.nome,
			cargo: m.cargo,
			lider: m.lider,
			equipe: m.equipe,
			membros: m.membros,
			agora: m.agora,
			naFila: Math.max(0, m.fila - (m.agora?.status === 'fila' ? 1 : 0))
		});
		const { rows } = await c.query(`select ${colunas} from public.dgathe_agentes a where a.equipe = $1 and a.ativo order by a.ordem, a.nome`, [
			eu.equipe
		]);
		if (eu.equipe === EQUIPE_DIRETORIA) {
			// O diretor vê os gerentes (quem recebe o trabalho dele) e os outros diretores
			const { rows: gerentes } = await c.query(
				`select ${colunas} from public.dgathe_agentes a where a.lider and a.ativo and a.equipe is not null and a.equipe <> $1 order by a.ordem, a.nome`,
				[EQUIPE_DIRETORIA]
			);
			return textoDaDiretoria(gerentes.map(membro), rows.map(membro), eu.id);
		}
		return textoDaEquipe(eu.equipe, rows.map(membro), eu.id);
	} finally {
		await c.end().catch(() => {});
	}
}

// ------------------------------------------------------------ principal

async function principal() {
	const a = lerArgumentos(process.argv.slice(2));
	if ('erro' in a) throw usoErrado(a.erro);
	if (a.comando === 'ajuda') return textoDeAjuda();
	if (a.comando === 'delegar') return delegar(a);
	if (a.comando === 'estado') return estado(a);
	return equipe(a);
}

// process.exitCode em vez de process.exit: no macOS a saída por pipe é
// assíncrona e o exit cortaria o texto que o líder vai ler
try {
	process.stdout.write((await principal()) + '\n');
	process.exitCode = 0;
} catch (e) {
	if (e instanceof Saida) {
		process.stderr.write(e.message + '\n');
		process.exitCode = e.codigo;
	} else {
		process.stderr.write(`Não deu: ${e?.message ?? e}\n`);
		process.exitCode = 1;
	}
}
