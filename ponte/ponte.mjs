#!/usr/bin/env node
// A ponte do DGathe: liga as tarefas passadas no jogo (dspace.verts.me) ao
// Claude Code do Mac. Roda o tempo todo pelo launchd (ponte/instalar.mjs).
//
// Folga de 15 s (pedido do Bruno em 10/11/2026, "para o banco respirar"): tarefa
// nova, tarefa retomada e mensagem no meio do trabalho só entram depois de 15 s.
// No jogo o agente já aparece trabalhando nesse meio-tempo. Resposta a pedido de
// permissão e a pergunta vai na hora: o agente está parado esperando.
//
// A cada 2 s (com sessão aberta) ou 5 s (sem nenhuma):
//   - pega a próxima tarefa da fila (uma por agente, até DGATHE_MAX juntas) e
//     abre uma sessão do Claude Code na pasta do agente, sem terminal: cada
//     passo chega como JSON e vira uma linha da conversa no jogo
//   - entrega as mensagens novas de quem está no jogo (no meio do trabalho)
//   - leva as respostas dos pedidos de permissão e das perguntas de volta para
//     a sessão, que fica esperando enquanto ninguém responde
//   - interrompe a sessão quando alguém clica em Parar (parar a tarefa do
//     líder para também as subtarefas abertas: o banco marca, a ponte corta)
//   - devolve ao líder o retorno da equipe (conferirEquipes)
// A cada 20 s grava o sinal de vida (o jogo mostra se a ponte está ligada).
// A cada minuto confere o fechamento semanal (conferirFechamentos).
//
// Equipes (versão 1.1, docs/dgathe/contrato-equipes.md): o líder de uma equipe
// roda `node "$DGATHE_EQUIPE" delegar <agente>` dentro da sessão e isso cria
// uma subtarefa (pai_id = a tarefa dele), que entra na fila normal. Quando a
// rodada do líder termina com subtarefa aberta ou ainda não relatada, a tarefa
// dele fica `aguardando` (sem sessão). Quando a última subtarefa fecha, a ponte
// grava na tarefa do líder a mensagem "Retorno da equipe" (autor 'Equipe') e a
// devolve para a fila: ele retoma a mesma conversa e revisa, manda corrigir ou
// fecha. Toda sexta às 17h de Brasília a ponte cria, uma vez por semana, a
// tarefa de fechamento semanal de cada líder ativo (dgathe_fechamentos guarda
// o que já foi criado, então reiniciar ou rodar duas pontes não duplica).
//
// Uso:
//   node ponte/ponte.mjs              roda (é o que o launchd chama)
//   node ponte/ponte.mjs --conferir   mostra a configuração e testa o banco e o Claude Code
//   node ponte/ponte.mjs --fechamento <agente> [--sexta AAAA-MM-DD]
//                                     cria o fechamento semanal daquele líder e sai
//
// Configuração em ~/.config/dunamisspace/ponte.env (fora do Drive):
//   DGATHE_PG_SENHA     senha do usuário dgathe_ponte no banco (criada pelo instalar.mjs)
//   DGATHE_PONTE_ID     nome desta ponte (padrão: mac-<nome do computador>)
//   DGATHE_BASE         pasta base das pastas dos agentes (padrão: a VERT SYS)
//   DGATHE_MAX          quantas tarefas ao mesmo tempo (padrão: 3)
//   DGATHE_ESPERA       segundos de folga antes de agir numa tarefa ou mensagem nova (padrão: 15)
//   DGATHE_PATH         PATH das sessões (o do terminal do Bruno)
//   DGATHE_CLAUDE       caminho do Claude Code (padrão: o mais novo instalado)
//   DGATHE_FECHAMENTO   0 desliga o fechamento semanal automático (padrão: ligado;
//                       o instalar.mjs não guarda esta chave ao reescrever o arquivo)

import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir, hostname, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
	argumentosDoClaude,
	maisNovo,
	mensagemParaOAgente,
	modeloDaSessao,
	nomeDaSessao,
	preambulo,
	resolverPasta,
	respostaParaOClaude,
	tokensDoContexto
} from '../src/lib/dgathe/ponte.ts';
import { cortar, passoDaFerramenta, resumoDoPedido } from '../src/lib/dgathe/passos.ts';
import {
	AUTOR_DA_EQUIPE,
	dataDaSexta,
	fimDaRodada,
	mensagemDaEquipe,
	pedidoDoFechamento,
	periodoDaSexta,
	periodoDoFechamento,
	proximoFechamento
} from '../src/lib/dgathe/equipe.ts';
import { lerUsoDoClaude } from './uso.mjs';

const VERSAO = '1.4';
const AQUI = dirname(fileURLToPath(import.meta.url));
const ARQUIVO_ENV = join(homedir(), '.config/dunamisspace/ponte.env');

/** Quanto tempo um pedido espera resposta antes de a ponte negar sozinha. */
const ESPERA_MAXIMA_MS = 6 * 60 * 60 * 1000;
const PULSO_MS = 20_000;

// ------------------------------------------------------------ configuração

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
const ID = cfg.DGATHE_PONTE_ID || `mac-${hostname().split('.')[0].toLowerCase()}`;
const BASE = cfg.DGATHE_BASE || resolve(AQUI, '../../..');
const MAX = Math.max(1, Math.min(8, Number(cfg.DGATHE_MAX) || 3));
const ESPERA = Math.max(0, Math.min(300, Number(cfg.DGATHE_ESPERA ?? 15)));
const FECHAMENTO = cfg.DGATHE_FECHAMENTO !== '0';
/** A linha de comando que o líder roda dentro da sessão (vai no ambiente como DGATHE_EQUIPE). */
const CLI_DA_EQUIPE = join(AQUI, 'equipe.mjs');
const ABERTOS = `('fila', 'trabalhando', 'esperando')`;

function log(...partes) {
	const h = new Date().toLocaleString('pt-BR', { hour12: false });
	console.log(`[${h}]`, ...partes);
}

/** O Claude Code mais novo do Mac: o instalador oficial, a extensão do VS Code ou o app. */
function acharClaude() {
	if (cfg.DGATHE_CLAUDE && existsSync(cfg.DGATHE_CLAUDE)) return cfg.DGATHE_CLAUDE;
	const local = join(homedir(), '.local/bin/claude');
	if (existsSync(local)) return local;
	const candidatos = [];
	const ext = join(homedir(), '.vscode/extensions');
	try {
		for (const d of readdirSync(ext)) {
			if (!d.startsWith('anthropic.claude-code-')) continue;
			const c = join(ext, d, 'resources/native-binary/claude');
			if (existsSync(c)) candidatos.push(c);
		}
	} catch {}
	const app = join(homedir(), 'Library/Application Support/Claude/claude-code');
	try {
		for (const v of readdirSync(app)) {
			for (const h of readdirSync(join(app, v))) {
				const c = join(app, v, h, 'claude.app/Contents/MacOS/claude');
				if (existsSync(c)) candidatos.push(c);
			}
		}
	} catch {}
	return maisNovo(candidatos);
}

function versaoDoClaude(caminho) {
	try {
		return execFileSync(caminho, ['--version'], { encoding: 'utf8', timeout: 20_000, env: ambiente() }).trim();
	} catch {
		return null;
	}
}

/** O ambiente das sessões: o do Mac, sem as variáveis de uma sessão do Claude Code e sem a senha da ponte. */
function ambiente(extra = {}) {
	const env = {};
	for (const [k, v] of Object.entries(process.env)) {
		if (k.startsWith('CLAUDE') || k.startsWith('DGATHE_') || k === 'AI_AGENT') continue;
		env[k] = v;
	}
	env.PATH = cfg.DGATHE_PATH || process.env.PATH || '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin';
	env.LANG = env.LANG || 'pt_BR.UTF-8';
	env.HOME = env.HOME || homedir();
	return { ...env, ...extra };
}

// ------------------------------------------------------------------ banco

const CONEXAO = {
	host: cfg.DGATHE_PG_HOST || 'db.rboenllphxqecjroolzo.supabase.co',
	port: 5432,
	user: 'dgathe_ponte',
	password: cfg.DGATHE_PG_SENHA,
	database: 'postgres',
	ssl: { rejectUnauthorized: false }
};
const db = new pg.Pool({
	...CONEXAO,
	// 6 (era 4): entram as transações do fim da rodada, do retorno da equipe e do fechamento
	max: 6,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 15_000
});
db.on('error', (e) => log('banco:', e.message));

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function q(sql, params = []) {
	return (await db.query(sql, params)).rows;
}

/** Para as gravações que não podem se perder (o fim da tarefa): tenta de novo por até ~2 min. */
async function qInsistente(sql, params) {
	for (let i = 0; ; i++) {
		try {
			return await q(sql, params);
		} catch (e) {
			if (i >= 12) throw e;
			await dormir(2000 + i * 1000);
		}
	}
}

/**
 * Erro de conexão (vale tentar de novo): queda de rede, banco reiniciando,
 * conflito de trava. Erro de regra (constraint, trigger, SQL errado) não.
 */
function erroPassageiro(e) {
	const c = e?.code;
	if (!c) return true;
	if (/^E[A-Z]+$/.test(c)) return true; // ECONNRESET, ETIMEDOUT, ENOTFOUND…
	return /^(08|53|57P)/.test(c) || c === '40001' || c === '40P01';
}

/**
 * Uma transação num cliente só do pool: begin, fn(cliente), commit; erro →
 * rollback. Com `insistir`, erro de conexão tenta de novo por até ~2 min (o
 * fim da rodada não pode se perder), como o qInsistente.
 */
async function emTransacao(fn, { insistir = false } = {}) {
	for (let i = 0; ; i++) {
		let c;
		try {
			c = await db.connect();
		} catch (e) {
			if (!insistir || i >= 12) throw e;
			await dormir(2000 + i * 1000);
			continue;
		}
		try {
			await c.query('begin');
			const r = await fn(c);
			await c.query('commit');
			c.release();
			return r;
		} catch (e) {
			await c.query('rollback').catch(() => {});
			const passageiro = erroPassageiro(e);
			// Cliente com a conexão quebrada não volta para o pool
			c.release(passageiro ? true : undefined);
			if (!insistir || !passageiro || i >= 12) throw e;
			await dormir(2000 + i * 1000);
		}
	}
}

/** Uma consulta dentro de uma transação, devolvendo as linhas. */
async function qc(c, sql, params = []) {
	return (await c.query(sql, params)).rows;
}

// ---------------------------------------------------------------- sessão

class Sessao {
	constructor(tarefa, agente, aoTerminar) {
		this.tarefa = tarefa;
		this.agente = agente;
		this.aoTerminar = aoTerminar;
		this.id = tarefa.id;
		this.curto = tarefa.id.slice(0, 8);
		/** Pedidos abertos: id no banco → { requestId, tipo, entrada, desde } */
		this.pedidos = new Map();
		this.fila = Promise.resolve();
		this.stderr = '';
		this.ultimoResultado = null;
		this.aguardandoResultado = false;
		this.encerrando = false;
		this.cancelando = false;
		this.desligada = false;
		this.saiu = false;
		this.fimTimer = null;
		/**
		 * Mapa dos Bandoletes (migration 0109): tokens em contexto na última
		 * chamada ao modelo e o modelo da sessão. Vão para o banco junto das
		 * gravações que já acontecem (passo, texto, fim), sem escrita a mais.
		 */
		this.tokens = null;
		this.modelo = null;
	}

	/** Gravações em ordem (passo, texto, pedido), sem travar a leitura da sessão. */
	escrever(fn) {
		this.fila = this.fila.then(fn).catch((e) => log(`tarefa ${this.curto}: gravação falhou:`, e.message));
		return this.fila;
	}

	enviar(obj) {
		if (this.saiu || !this.proc?.stdin.writable) return false;
		this.proc.stdin.write(JSON.stringify(obj) + '\n');
		return true;
	}

	mandarTexto(texto) {
		if (!this.enviar({ type: 'user', message: { role: 'user', content: texto } })) return false;
		this.aguardandoResultado = true;
		return true;
	}

	async iniciar() {
		const claude = acharClaude();
		if (!claude) throw new Error('O Claude Code não foi encontrado neste Mac.');
		const cwd = resolverPasta(BASE, this.agente.pasta);
		if (!existsSync(cwd)) throw new Error(`A pasta "${this.agente.pasta}" não existe neste Mac.`);

		const retomar = !!this.tarefa.sessao_id;
		this.sessao = this.tarefa.sessao_id ?? randomUUID();
		const pendentes = await q(
			`select id, conteudo, autor_nome from public.dgathe_mensagens where tarefa_id = $1 and not entregue order by id`,
			[this.id]
		);
		const extra = pendentes.length ? mensagemParaOAgente(pendentes) : '';
		const primeira = retomar ? extra || 'Continue de onde parou.' : extra ? `${this.tarefa.pedido}\n\n---\n\n${extra}` : this.tarefa.pedido;
		const comRetorno = pendentes.some((m) => m.autor_nome === AUTOR_DA_EQUIPE);

		const args = argumentosDoClaude(this.agente, {
			sessao: this.sessao,
			retomar,
			nome: nomeDaSessao(this.agente, this.tarefa),
			preambulo: preambulo(this.agente, this.tarefa, await this.contextoDaEquipe())
		});
		this.proc = spawn(claude, args, {
			cwd,
			env: ambiente({ DGATHE_TAREFA: this.id, DGATHE_AGENTE: this.agente.id, DGATHE_EQUIPE: CLI_DA_EQUIPE }),
			stdio: ['pipe', 'pipe', 'pipe']
		});
		// Enquanto a tarefa roda, o Mac não dorme sozinho (tampa fechada na bateria ainda dorme)
		try {
			spawn('/usr/bin/caffeinate', ['-i', '-w', String(this.proc.pid)], { stdio: 'ignore', detached: false }).on('error', () => {});
		} catch {}
		this.proc.stdin.on('error', () => {});
		this.proc.stderr.on('data', (b) => (this.stderr = (this.stderr + String(b)).slice(-4000)));
		this.proc.on('error', (e) => {
			this.stderr += `\n${e.message}`;
		});
		this.proc.on('exit', (codigo, sinal) => this.aoSair(codigo, sinal));
		createInterface({ input: this.proc.stdout }).on('line', (l) => this.aoLinha(l));

		this.enviar({ type: 'control_request', request_id: `ini-${this.curto}`, request: { subtype: 'initialize' } });
		if (!this.mandarTexto(primeira)) throw new Error(`O Claude Code não abriu. ${this.stderr.trim().slice(-300)}`);
		if (pendentes.length) {
			await q(`update public.dgathe_mensagens set entregue = true where id = any($1::bigint[])`, [pendentes.map((m) => m.id)]);
		}
		await q(
			`update public.dgathe_tarefas set sessao_id = $2, atividade = $3, atualizada_em = now() where id = $1`,
			[this.id, this.sessao, comRetorno ? 'Lendo o retorno da equipe' : retomar ? 'Retomando a conversa' : 'Começando']
		);
		this.escrever(() =>
			q(`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, detalhe) values ($1, 'aviso', $2, $3)`, [
				this.id,
				retomar ? 'Retomou a conversa' : 'Começou',
				{ ponte: ID, retomar }
			])
		);
		log(`tarefa ${this.curto} (${this.agente.id}): ${retomar ? 'retomou' : 'começou'} em ${this.agente.pasta}${comRetorno ? ' com o retorno da equipe' : ''}`);
	}

	/**
	 * Para o preâmbulo: quem é da equipe agora e, numa subtarefa, o projeto e o
	 * líder. Falhou a leitura: a sessão começa sem isso (nunca deixa de começar).
	 */
	async contextoDaEquipe() {
		if (!this.agente.equipe) return undefined;
		try {
			const membros = await q(
				`select id, nome, cargo, lider from public.dgathe_agentes where equipe = $1 and ativo order by ordem, nome`,
				[this.agente.equipe]
			);
			let pai = null;
			if (this.tarefa.pai_id) {
				const [p] = await q(
					`select p.titulo, a.nome from public.dgathe_tarefas p join public.dgathe_agentes a on a.id = p.agente_id where p.id = $1`,
					[this.tarefa.pai_id]
				);
				if (p) pai = { titulo: p.titulo, lider: p.nome };
			}
			return { membros, pai };
		} catch (e) {
			log(`tarefa ${this.curto}: não li a equipe (${e.message}); segue sem a lista`);
			return undefined;
		}
	}

	aoLinha(linha) {
		let d;
		try {
			d = JSON.parse(linha);
		} catch {
			return;
		}
		switch (d.type) {
			case 'system':
				if (d.subtype === 'init') this.modelo = modeloDaSessao(d.model) ?? this.modelo;
				break;
			case 'assistant': {
				clearTimeout(this.fimTimer);
				// Só a conversa principal: subagente do Claude Code (Task) tem contexto próprio
				if (!d.parent_tool_use_id) {
					this.tokens = tokensDoContexto(d.message?.usage) ?? this.tokens;
					if (!this.modelo) this.modelo = modeloDaSessao(d.message?.model);
				}
				for (const c of d.message?.content ?? []) {
					if (c.type === 'tool_use') this.registrarPasso(c.name, c.input);
					else if (c.type === 'text' && c.text?.trim()) this.registrarTexto(c.text);
				}
				break;
			}
			case 'control_request':
				this.aoPedido(d);
				break;
			case 'control_cancel_request':
				this.aoCancelarPedido(d.request_id);
				break;
			case 'result':
				this.aoResultado(d);
				break;
		}
	}

	registrarPasso(ferramenta, entrada) {
		const p = passoDaFerramenta(ferramenta, entrada);
		this.escrever(async () => {
			await q(`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, detalhe) values ($1, 'passo', $2, $3)`, [
				this.id,
				p.rotulo,
				{ ferramenta, icone: p.icone }
			]);
			await q(
				`update public.dgathe_tarefas set atividade = $2, passos = passos + 1, tokens = coalesce($3::int, tokens), modelo = coalesce($4, modelo), atualizada_em = now() where id = $1`,
				[this.id, p.rotulo, this.tokens, this.modelo]
			);
		});
	}

	registrarTexto(texto) {
		this.escrever(async () => {
			await q(`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo) values ($1, 'texto', $2)`, [this.id, texto.slice(0, 40000)]);
			await q(
				`update public.dgathe_tarefas set atividade = 'Escrevendo', tokens = coalesce($2::int, tokens), modelo = coalesce($3, modelo), atualizada_em = now() where id = $1`,
				[this.id, this.tokens, this.modelo]
			);
		});
	}

	aoPedido(d) {
		const r = d.request ?? {};
		if (r.subtype !== 'can_use_tool') {
			this.enviar({ type: 'control_response', response: { subtype: 'error', request_id: d.request_id, error: 'A ponte do DGathe não trata este pedido.' } });
			return;
		}
		const entrada = r.input ?? {};
		const tipo = r.tool_name === 'AskUserQuestion' ? 'pergunta' : 'permissao';
		const resumo =
			tipo === 'pergunta'
				? (Array.isArray(entrada.questions) ? entrada.questions.map((x) => x?.question).filter(Boolean).join(' / ') : 'Pergunta')
				: resumoDoPedido(r.tool_name, entrada);
		// Arquivo grande (Write) fica só na memória: o banco guarda o resumo
		const paraOBanco = JSON.stringify(entrada).length > 8000 ? null : entrada;
		const atividade = tipo === 'pergunta' ? 'Esperando a sua resposta' : cortar(`Pedindo licença: ${passoDaFerramenta(r.tool_name, entrada).rotulo}`);
		this.escrever(async () => {
			const [linha] = await q(
				`insert into public.dgathe_pedidos (tarefa_id, tipo, ferramenta, resumo, entrada) values ($1, $2, $3, $4, $5) returning id`,
				[this.id, tipo, r.tool_name ?? '?', cortar(resumo, 4000), paraOBanco]
			);
			this.pedidos.set(linha.id, { requestId: d.request_id, tipo, entrada, desde: Date.now() });
			await q(
				`update public.dgathe_tarefas set status = 'esperando', atividade = $2, atualizada_em = now() where id = $1 and status in ('trabalhando', 'esperando')`,
				[this.id, atividade]
			);
			log(`tarefa ${this.curto}: ${tipo === 'pergunta' ? 'perguntou' : `pediu licença para ${r.tool_name}`}`);
		});
	}

	aoCancelarPedido(requestId) {
		for (const [id, p] of this.pedidos) {
			if (p.requestId !== requestId) continue;
			this.pedidos.delete(id);
			this.escrever(() => q(`update public.dgathe_pedidos set cancelado = true where id = $1 and resposta is null`, [id]));
		}
	}

	aoResultado(d) {
		this.ultimoResultado = d;
		this.aguardandoResultado = false;
		const texto = typeof d.result === 'string' ? d.result.slice(0, 40000) : null;
		this.escrever(async () => {
			await q(`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, detalhe) values ($1, 'resultado', '', $2)`, [
				this.id,
				{ duracao_ms: d.duration_ms ?? null, turnos: d.num_turns ?? null, erro: !!d.is_error, subtipo: d.subtype ?? null }
			]);
			if (texto && !d.is_error) await q(`update public.dgathe_tarefas set resultado = $2, atualizada_em = now() where id = $1`, [this.id, texto]);
		});
		clearTimeout(this.fimTimer);
		this.fimTimer = setTimeout(() => this.talvezEncerrar(), 1500);
	}

	/**
	 * Terminou a rodada: se chegou mensagem nova, continua; se tem mensagem ainda
	 * na folga de 15 s, espera por ela; senão fecha a sessão.
	 */
	async talvezEncerrar() {
		if (this.encerrando || this.saiu || this.aguardandoResultado) return;
		if (!this.cancelando && !this.desligada) {
			const r = await this.entregarMensagens();
			if (r.entregou) return;
			if (r.espera !== null) {
				clearTimeout(this.fimTimer);
				this.fimTimer = setTimeout(() => this.talvezEncerrar(), r.espera);
				return;
			}
		}
		this.encerrando = true;
		this.proc.stdin.end();
	}

	/**
	 * Mensagens novas do jogo: entram na sessão como se fossem digitadas, depois
	 * da folga de ESPERA s. `espera` = quanto falta para a próxima amadurecer.
	 */
	async entregarMensagens() {
		const nada = { entregou: false, espera: null };
		// Sessão ainda abrindo: o iniciar() já leva as mensagens que chegaram antes
		if (!this.proc || this.encerrando || this.cancelando || this.desligada || this.saiu) return nada;
		const pendentes = await q(
			`select id, conteudo, autor_nome, extract(epoch from now() - criada_em)::float8 as idade
			from public.dgathe_mensagens where tarefa_id = $1 and not entregue order by id`,
			[this.id]
		);
		if (!pendentes.length) return nada;
		const novas = pendentes.filter((m) => m.idade >= ESPERA);
		const verdes = pendentes.filter((m) => m.idade < ESPERA);
		const espera = verdes.length ? Math.ceil((ESPERA - Math.max(...verdes.map((m) => m.idade))) * 1000) + 300 : null;
		if (!novas.length) return { entregou: false, espera };
		clearTimeout(this.fimTimer);
		if (!this.mandarTexto(mensagemParaOAgente(novas))) return nada;
		await q(`update public.dgathe_mensagens set entregue = true where id = any($1::bigint[])`, [novas.map((m) => m.id)]);
		const atividade = novas.some((m) => m.autor_nome === AUTOR_DA_EQUIPE) ? 'Lendo o retorno da equipe' : 'Lendo a sua mensagem';
		await q(`update public.dgathe_tarefas set atividade = $2, atualizada_em = now() where id = $1`, [this.id, atividade]);
		log(`tarefa ${this.curto}: entregou ${novas.length} mensagem(ns)`);
		return { entregou: true, espera };
	}

	/** Respostas que chegaram do jogo voltam para a sessão. */
	async verificarPedidos() {
		if (!this.pedidos.size || this.saiu) return;
		const ids = [...this.pedidos.keys()];
		const respondidos = await q(
			`select id, resposta, respondido_por_nome from public.dgathe_pedidos where id = any($1::uuid[]) and resposta is not null`,
			[ids]
		);
		for (const r of respondidos) {
			const p = this.pedidos.get(r.id);
			if (!p) continue;
			this.pedidos.delete(r.id);
			const resposta = respostaParaOClaude({ tipo: p.tipo, entrada: p.entrada }, r.resposta, r.respondido_por_nome);
			this.enviar({ type: 'control_response', response: { subtype: 'success', request_id: p.requestId, response: resposta } });
			const quem = r.respondido_por_nome?.split(/\s+/)[0] || 'Alguém';
			const aviso = p.tipo === 'pergunta' ? `${quem} respondeu` : resposta.behavior === 'allow' ? `${quem} liberou` : `${quem} negou`;
			this.escrever(() =>
				q(`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, detalhe) values ($1, 'aviso', $2, $3)`, [this.id, aviso, { pedido: r.id }])
			);
		}
		// Ninguém respondeu em 6 h: nega, para a sessão não ficar presa para sempre
		for (const [id, p] of this.pedidos) {
			if (Date.now() - p.desde < ESPERA_MAXIMA_MS) continue;
			this.pedidos.delete(id);
			this.enviar({
				type: 'control_response',
				response: { subtype: 'success', request_id: p.requestId, response: { behavior: 'deny', message: 'Ninguém respondeu pelo DGathe em 6 horas. Termine com o que tem e diga o que ficou pendente.' } }
			});
			this.escrever(() => q(`update public.dgathe_pedidos set cancelado = true where id = $1 and resposta is null`, [id]));
		}
		if (!this.pedidos.size) {
			await q(
				`update public.dgathe_tarefas set status = 'trabalhando', atividade = 'Continuando', atualizada_em = now() where id = $1 and status = 'esperando'`,
				[this.id]
			);
		}
	}

	cancelar() {
		if (this.cancelando || this.saiu) return;
		this.cancelando = true;
		log(`tarefa ${this.curto}: parando a pedido do jogo`);
		this.interromper();
	}

	desligar() {
		if (this.saiu) return;
		this.desligada = true;
		this.interromper();
	}

	interromper() {
		this.enviar({ type: 'control_request', request_id: `parar-${Date.now()}`, request: { subtype: 'interrupt' } });
		setTimeout(() => {
			this.encerrando = true;
			try {
				this.proc.stdin.end();
			} catch {}
		}, 1500);
		setTimeout(() => {
			if (!this.saiu) this.proc.kill('SIGTERM');
		}, 12_000);
	}

	async aoSair(codigo, sinal) {
		if (this.saiu) return;
		this.saiu = true;
		clearTimeout(this.fimTimer);
		await this.fila;
		const r = this.ultimoResultado;
		let status;
		let erro = null;
		let atividade;
		if (this.desligada) {
			status = 'falhou';
			// Subtarefa: o líder recebe o aviso no retorno da equipe e decide se pede de novo
			erro = this.tarefa.pai_id
				? 'A ponte foi desligada no meio do trabalho. O líder recebe este aviso e decide se pede de novo.'
				: 'A ponte foi desligada no meio do trabalho. Mande uma mensagem para o Bandolete continuar de onde parou.';
			atividade = 'Parou: a ponte foi desligada';
		} else if (this.cancelando) {
			status = 'cancelada';
			atividade = 'Parada a pedido';
		} else if (r && !r.is_error) {
			status = 'concluida';
			atividade = 'Terminou';
		} else {
			status = 'falhou';
			const doClaude = r && typeof r.result === 'string' && r.result.trim() ? r.result.trim() : '';
			const saida = this.stderr.trim().split('\n').slice(-3).join(' ');
			erro = cortar(doClaude || `O Claude Code fechou sem terminar (código ${codigo ?? '?'}${sinal ? `, ${sinal}` : ''}). ${saida}`.trim(), 2000);
			atividade = 'Parou com erro';
		}
		let fim = { status, atividade, abertas: 0 };
		try {
			fim = await this.gravarFim(status, erro, atividade);
		} catch (e) {
			log(`tarefa ${this.curto}: não consegui gravar o fim:`, e.message);
		}
		if (fim.status === 'aguardando') log(`tarefa ${this.curto}: esperando a equipe (${fim.abertas} subtarefa(s) aberta(s))`);
		else log(`tarefa ${this.curto}: ${fim.status}${erro ? ` (${erro.slice(0, 160)})` : ''}`);
		this.aoTerminar(this);
	}

	/**
	 * O fim da rodada numa transação que trava a linha da tarefa, para não
	 * correr com dgathe_mandar_mensagem nem com o `equipe.mjs delegar` (os dois
	 * travam a mesma linha): Parar vence; mensagem que chegou enquanto fechava
	 * devolve para a fila (retoma a conversa); equipe com subtarefa aberta ou
	 * não relatada deixa a tarefa `aguardando` (contrato, seção 2.3).
	 */
	gravarFim(base, erro, atividadeDaBase) {
		return emTransacao(
			async (c) => {
				await qc(c, `update public.dgathe_pedidos set cancelado = true where tarefa_id = $1 and resposta is null and not cancelado`, [this.id]);
				await qc(c, `select id from public.dgathe_tarefas where id = $1 for update`, [this.id]);
				const [x] = await qc(
					c,
					`select exists (select 1 from public.dgathe_mensagens m where m.tarefa_id = $1 and not m.entregue) as pendente,
						exists (select 1 from public.dgathe_tarefas s where s.pai_id = $1
							and (s.status in ${ABERTOS} or s.relatada_em is null)) as equipe,
						(select count(*)::int from public.dgathe_tarefas s where s.pai_id = $1 and s.status in ${ABERTOS}) as abertas`,
					[this.id]
				);
				const f = fimDaRodada({ base, atividade: atividadeDaBase, mensagemPendente: x.pendente, pendenciaDeEquipe: x.equipe });
				await qc(
					c,
					`update public.dgathe_tarefas
					set status = $2, erro = $3, atividade = $4, cancelar = false,
						terminada_em = case when $5::boolean then now() else null end,
						tokens = coalesce($6::int, tokens), modelo = coalesce($7, modelo), atualizada_em = now()
					where id = $1`,
					[this.id, f.status, erro, f.atividade, f.terminada, this.tokens, this.modelo]
				);
				return { ...f, abertas: x.abertas };
			},
			{ insistir: true }
		);
	}

	/** Nem chegou a abrir a sessão (pasta errada, Claude Code sumiu...). */
	async falharAoIniciar(e) {
		if (this.saiu) return;
		this.saiu = true;
		if (this.proc && this.proc.exitCode === null) this.proc.kill('SIGTERM');
		log(`tarefa ${this.curto}: não começou: ${e.message}`);
		try {
			await qInsistente(
				`update public.dgathe_tarefas set status = 'falhou', erro = $2, atividade = 'Não conseguiu começar', terminada_em = now(), atualizada_em = now() where id = $1`,
				[this.id, cortar(e.message, 2000)]
			);
		} catch {}
		this.aoTerminar(this);
	}
}

// ---------------------------------------------------------------- laço

const sessoes = new Map();
let desligando = false;
let claudeVersao = null;

async function pegarTarefa() {
	const ocupados = [...sessoes.values()].map((s) => s.agente.id);
	const [t] = await q(
		`with proxima as (
			select t.id from public.dgathe_tarefas t
			join public.dgathe_agentes a on a.id = t.agente_id and a.ativo
			where t.status = 'fila'
				-- Folga: só o que está na fila há ESPERA s (atualizada_em = quando entrou na fila)
				and t.atualizada_em <= now() - make_interval(secs => $3::float8)
				and not (t.agente_id = any($2::text[]))
				and not exists (
					select 1 from public.dgathe_tarefas o
					where o.agente_id = t.agente_id and o.status in ('trabalhando', 'esperando')
				)
			order by t.criada_em
			limit 1
			for update of t skip locked
		)
		update public.dgathe_tarefas t
		set status = 'trabalhando', ponte = $1, iniciada_em = coalesce(t.iniciada_em, now()), atividade = 'Começando', erro = null, cancelar = false,
			-- Cada sessão aberta é uma rodada (as subtarefas guardam em qual rodada do líder nasceram)
			rodada = t.rodada + 1, atualizada_em = now()
		from proxima where t.id = proxima.id
		returning t.*`,
		[ID, ocupados, ESPERA]
	);
	if (!t) return null;
	const [agente] = await q(`select * from public.dgathe_agentes where id = $1`, [t.agente_id]);
	return agente ? { tarefa: t, agente } : null;
}

// ------------------------------------------------------------ equipes

let conferindoEquipes = false;

/**
 * O retorno da equipe (contrato, seção 2.4), a cada ciclo: (a) subtarefa na
 * fila de agente desativado é cancelada (senão o líder espera para sempre);
 * (b) acha as tarefas-pai sem subtarefa aberta e com retorno a receber; (c)
 * para cada uma, numa transação, grava a mensagem "Retorno da equipe", marca
 * as subtarefas como relatadas e devolve a tarefa `aguardando` para a fila.
 */
async function conferirEquipes() {
	if (conferindoEquipes || desligando) return;
	conferindoEquipes = true;
	try {
		const desativadas = await q(
			`update public.dgathe_tarefas s
			set status = 'cancelada', erro = 'O Bandolete foi desativado antes de começar.',
				atividade = 'Cancelada: Bandolete desativado', terminada_em = now(), atualizada_em = now()
			from public.dgathe_agentes a
			where a.id = s.agente_id and not a.ativo and s.pai_id is not null and s.status = 'fila'
			returning s.id`
		);
		if (desativadas.length) log(`equipe: ${desativadas.length} subtarefa(s) de agente desativado cancelada(s)`);

		const pais = await q(
			`select p.id from public.dgathe_tarefas p
			where p.status in ('aguardando', 'fila', 'trabalhando', 'esperando')
				and exists (select 1 from public.dgathe_tarefas s where s.pai_id = p.id)
				and not exists (select 1 from public.dgathe_tarefas s where s.pai_id = p.id and s.status in ${ABERTOS})
				and (p.status = 'aguardando' or exists (select 1 from public.dgathe_tarefas s where s.pai_id = p.id and s.relatada_em is null))
			order by p.atualizada_em
			limit 20`
		);
		for (const { id } of pais) {
			if (desligando) break;
			try {
				const r = await entregarRetorno(id);
				if (r) log(`equipe: retorno de ${r.subtarefas} subtarefa(s) para ${id.slice(0, 8)} (${r.agente})`);
			} catch (e) {
				log(`equipe: retorno para ${id.slice(0, 8)} falhou:`, e.message);
			}
		}
	} catch (e) {
		log('equipe:', e.message);
	} finally {
		conferindoEquipes = false;
	}
}

/** O passo (c) para uma tarefa-pai. null = nada a fazer (travada por outro, mudou, ou não tem retorno). */
function entregarRetorno(paiId) {
	return emTransacao(async (c) => {
		const [p] = await qc(c, `select id, agente_id, status, rodada from public.dgathe_tarefas where id = $1 for update skip locked`, [paiId]);
		if (!p || !['aguardando', 'fila', 'trabalhando', 'esperando'].includes(p.status)) return null;
		const [x] = await qc(c, `select exists (select 1 from public.dgathe_tarefas s where s.pai_id = $1 and s.status in ${ABERTOS}) as aberta`, [paiId]);
		if (x.aberta) return null;
		const subs = await qc(
			c,
			`select s.id, s.agente_id, a.nome as agente_nome, a.cargo as agente_cargo, s.titulo, s.status, s.atividade,
				s.resultado, s.erro, s.rodada_do_pai, s.relatada_em, 0 as pedidos
			from public.dgathe_tarefas s join public.dgathe_agentes a on a.id = s.agente_id
			where s.pai_id = $1 and s.relatada_em is null and s.status in ('concluida', 'falhou', 'cancelada')
			order by s.criada_em
			for update of s`,
			[paiId]
		);
		// Só o `aguardando` sem novidade recebe o aviso vazio (para nunca ficar preso)
		if (!subs.length && p.status !== 'aguardando') return null;
		const ids = subs.map((s) => s.id);
		await qc(
			c,
			`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, autor_nome, entregue, detalhe)
			values ($1, 'mensagem', $2, $3, false, $4)`,
			[paiId, mensagemDaEquipe(subs, p.rodada), AUTOR_DA_EQUIPE, { equipe: true, rodada: p.rodada, subtarefas: ids }]
		);
		if (ids.length) await qc(c, `update public.dgathe_tarefas set relatada_em = now() where id = any($1::uuid[])`, [ids]);
		// fila: continua na fila (sem mexer na folga); trabalhando/esperando: a sessão entrega a mensagem
		await qc(
			c,
			`update public.dgathe_tarefas
			set status = 'fila', erro = null, terminada_em = null, cancelar = false,
				atividade = 'Na fila com o retorno da equipe', atualizada_em = now()
			where id = $1 and status = 'aguardando'`,
			[paiId]
		);
		return { subtarefas: ids.length, agente: p.agente_id };
	});
}

let proximaConferenciaDeFechamento = 0;

/** Uma vez por minuto: na janela de sexta 17h a segunda 17h (Brasília), cria o fechamento de cada líder que ainda não tem. */
async function conferirFechamentos() {
	if (!FECHAMENTO || desligando || Date.now() < proximaConferenciaDeFechamento) return;
	proximaConferenciaDeFechamento = Date.now() + 60_000;
	const periodo = periodoDoFechamento(new Date());
	if (!periodo) return;
	try {
		const lideres = await q(
			`select a.id, a.nome, a.equipe from public.dgathe_agentes a
			where a.lider and a.ativo and a.equipe is not null
				and not exists (select 1 from public.dgathe_fechamentos f where f.agente_id = a.id and f.sexta = $1::date)
			order by a.ordem, a.id`,
			[periodo.sexta]
		);
		for (const l of lideres) {
			const r = await criarFechamento(l, periodo);
			if (r.criada) log(`fechamento: tarefa ${r.tarefa.slice(0, 8)} para ${l.id} (sexta ${dataDaSexta(periodo.sexta)})`);
		}
	} catch (e) {
		log('fechamento:', e.message);
	}
}

/**
 * Cria o fechamento semanal de um líder (contrato, seção 5.2). A linha em
 * dgathe_fechamentos entra antes da tarefa, na mesma transação: se já existe,
 * não cria nada (reiniciar a ponte ou rodar duas nunca duplica).
 */
function criarFechamento(lider, periodo) {
	return emTransacao(async (c) => {
		const novo = await qc(
			c,
			`insert into public.dgathe_fechamentos (agente_id, sexta) values ($1, $2::date) on conflict do nothing returning agente_id`,
			[lider.id, periodo.sexta]
		);
		if (!novo.length) {
			const [f] = await qc(c, `select tarefa_id from public.dgathe_fechamentos where agente_id = $1 and sexta = $2::date`, [lider.id, periodo.sexta]);
			return { criada: false, tarefa: f?.tarefa_id ?? null };
		}
		const linhas = await qc(
			c,
			`select t.id, t.pai_id, t.agente_id, a.nome as agente_nome, t.titulo, t.status, t.criada_por_nome,
				t.criada_em, t.terminada_em, left(t.resultado, 300) as resumo, t.erro
			from public.dgathe_tarefas t join public.dgathe_agentes a on a.id = t.agente_id
			where a.equipe = $1
				and not exists (select 1 from public.dgathe_fechamentos f where f.tarefa_id = t.id)
				and ((t.criada_em >= $2 and t.criada_em < $3)
					or (t.terminada_em >= $2 and t.terminada_em < $3)
					or t.status in ('fila', 'trabalhando', 'esperando', 'aguardando'))
			order by t.criada_em
			limit 300`,
			[lider.equipe, periodo.inicio, periodo.fim]
		);
		const { titulo, pedido } = pedidoDoFechamento(periodo, lider.equipe, linhas, lider.id);
		const [t] = await qc(
			c,
			`insert into public.dgathe_tarefas (agente_id, titulo, pedido, criada_por_nome) values ($1, $2, $3, 'DGathe') returning id`,
			[lider.id, titulo, pedido]
		);
		await qc(
			c,
			`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, autor_nome, detalhe) values ($1, 'pedido', $2, 'DGathe', $3)`,
			[t.id, pedido, { fechamento: periodo.sexta }]
		);
		await qc(c, `update public.dgathe_fechamentos set tarefa_id = $3 where agente_id = $1 and sexta = $2::date`, [lider.id, periodo.sexta, t.id]);
		return { criada: true, tarefa: t.id };
	});
}

async function ciclo() {
	try {
		if (sessoes.size) {
			const ids = [...sessoes.keys()];
			const paradas = await q(`select id from public.dgathe_tarefas where id = any($1::uuid[]) and cancelar`, [ids]);
			for (const r of paradas) sessoes.get(r.id)?.cancelar();
			for (const s of sessoes.values()) {
				if (s.saiu) continue;
				await s.entregarMensagens().catch((e) => log(`tarefa ${s.curto}: mensagens:`, e.message));
				await s.verificarPedidos().catch((e) => log(`tarefa ${s.curto}: pedidos:`, e.message));
			}
		}
		await conferirEquipes();
		await conferirFechamentos();
		await abrirReunioes().catch((e) => log('reuniões:', e.message));
		while (!desligando && sessoes.size < MAX) {
			const achou = await pegarTarefa();
			if (!achou) break;
			const s = new Sessao(achou.tarefa, achou.agente, (fim) => {
				sessoes.delete(fim.id);
				// Acabou uma sessão: o retorno da equipe e a próxima da fila, já
				agendarCiclo(500);
			});
			sessoes.set(s.id, s);
			s.iniciar().catch((e) => s.falharAoIniciar(e));
		}
	} catch (e) {
		log('ciclo:', e.message);
	}
}

// --------------------------------------------------------- consumo e reuniões

const USO_MS = 60_000;
let usoFalhou = false;

/**
 * O consumo do plano do Claude (janela de 5 h, semana, Fable) para o medidor do
 * jogo: pergunta ao Claude Code (get_usage, sem chamar o modelo, não gasta
 * limite) e grava em dgathe_uso (migration 0103). A cada minuto.
 */
async function atualizarUso() {
	const claude = acharClaude();
	if (!claude) return;
	try {
		const u = await lerUsoDoClaude({ claude, env: ambiente(), cwd: tmpdir() });
		if (!u) return;
		await q(
			`insert into public.dgathe_uso (ponte, plano, sessao_pct, sessao_zera, semanal_pct, semanal_zera, modelos, lido_em)
			values ($1, $2, $3, $4, $5, $6, $7, now())
			on conflict (ponte) do update set plano = excluded.plano, sessao_pct = excluded.sessao_pct,
				sessao_zera = excluded.sessao_zera, semanal_pct = excluded.semanal_pct,
				semanal_zera = excluded.semanal_zera, modelos = excluded.modelos, lido_em = now()`,
			[ID, u.plano, u.sessao?.pct ?? null, u.sessao?.zera ?? null, u.semanal?.pct ?? null, u.semanal?.zera ?? null, JSON.stringify(u.modelos)]
		);
		if (usoFalhou) log('consumo: voltou a ler');
		usoFalhou = false;
	} catch (e) {
		// Uma linha no log quando começa a falhar, não uma por minuto
		if (!usoFalhou) log('consumo:', e.message);
		usoFalhou = true;
	}
}

/**
 * Reunião de alinhamento (pedido do Bruno em 10/11/2026): quando um líder
 * distribui uma rodada do projeto para 2 ou mais especialistas, todos vão
 * para a Sala de Reunião por 2 min e depois para os postos. Uma por rodada
 * (índice único em tarefa_id + rodada), aberta pelo que a ponte vê no banco.
 */
async function abrirReunioes() {
	await q(
		`insert into public.dgathe_reunioes (sala, titulo, participantes, tarefa_id, rodada, criada_por, fim)
		select 'reuniao', left('Alinhamento: ' || p.titulo, 120),
			array[p.agente_id] || array_agg(distinct s.agente_id), p.id, s.rodada_do_pai, l.nome,
			now() + interval '2 minutes'
		from public.dgathe_tarefas s
		join public.dgathe_tarefas p on p.id = s.pai_id
		join public.dgathe_agentes l on l.id = p.agente_id
		where s.criada_em > now() - interval '90 seconds' and s.rodada_do_pai is not null
		group by p.id, p.titulo, p.agente_id, s.rodada_do_pai, l.nome
		having count(distinct s.agente_id) >= 2
		on conflict (tarefa_id, rodada) where tarefa_id is not null do nothing`
	);
}

// ------------------------------------------------- avisos do banco (LISTEN)
//
// A migration 0104 avisa a ponte pelo canal 'dgathe_ponte' quando é com ela:
// tarefa nova ou de volta à fila, pedido de parar, mensagem para entregar,
// resposta a um pedido. A ponte age na hora (respeitando a folga de 15 s para
// tarefa e mensagem nova) e a leitura periódica vira reserva, bem mais
// espaçada: banco mais leve. Sem conseguir ouvir, volta aos 2/5 s de antes.

let ouvindo = false;
let ouvinte = null;
let cicloTimer = null;
let proximoCiclo = Infinity;
let cicloRodando = false;
let cicloDeNovo = false;

/** Marca o próximo ciclo; se já houver um marcado para antes, fica o de antes. */
function agendarCiclo(ms) {
	if (desligando) return;
	const quando = Date.now() + Math.max(0, ms);
	if (cicloTimer && quando >= proximoCiclo) return;
	clearTimeout(cicloTimer);
	proximoCiclo = quando;
	cicloTimer = setTimeout(() => {
		cicloTimer = null;
		proximoCiclo = Infinity;
		void rodarCiclo();
	}, quando - Date.now());
}

/** Um ciclo por vez; pedido no meio de outro roda logo depois dele. */
async function rodarCiclo() {
	if (cicloRodando) {
		cicloDeNovo = true;
		return;
	}
	cicloRodando = true;
	try {
		await ciclo();
	} finally {
		cicloRodando = false;
		if (cicloDeNovo) {
			cicloDeNovo = false;
			agendarCiclo(0);
		} else {
			// Ouvindo o banco, a leitura é só reserva
			agendarCiclo(ouvindo ? (sessoes.size ? 10_000 : 30_000) : sessoes.size ? 2000 : 5000);
		}
	}
}

async function ouvirBanco(espera = 5000) {
	if (desligando) return;
	const c = new pg.Client(CONEXAO);
	let caiu = false;
	const cair = (motivo) => {
		if (caiu || desligando) return;
		caiu = true;
		ouvindo = false;
		ouvinte = null;
		log(`avisos do banco: ${motivo}; volto a ouvir em ${Math.round(espera / 1000)} s (até lá, leitura a cada 2-5 s)`);
		c.end().catch(() => {});
		agendarCiclo(0);
		setTimeout(() => void ouvirBanco(Math.min(espera * 2, 60_000)), espera);
	};
	c.on('error', (e) => cair(e.message));
	c.on('end', () => cair('conexão encerrada'));
	c.on('notification', (n) => {
		let d = {};
		try {
			d = JSON.parse(n.payload ?? '{}');
		} catch {}
		// Tarefa nova e mensagem nova só valem depois da folga; parar e resposta, na hora
		const comFolga = d.t === 'dgathe_tarefas' || d.t === 'dgathe_mensagens';
		agendarCiclo(comFolga ? ESPERA * 1000 + 500 : 0);
		// Parar e resposta podem chegar juntos com a folga de outra coisa: este ciclo vai já
		if (!comFolga) agendarCiclo(0);
	});
	try {
		await c.connect();
		await c.query('LISTEN dgathe_ponte');
		ouvinte = c;
		ouvindo = true;
		if (espera > 5000) log('avisos do banco: ouvindo de novo');
		agendarCiclo(0);
	} catch (e) {
		cair(e.message);
	}
}

async function pulso() {
	try {
		await q(
			`insert into public.dgathe_ponte (id, visto_em, versao, claude, trabalhando) values ($1, now(), $2, $3, $4)
			on conflict (id) do update set visto_em = now(), versao = excluded.versao, claude = excluded.claude, trabalhando = excluded.trabalhando`,
			[ID, VERSAO, claudeVersao, sessoes.size]
		);
	} catch (e) {
		log('sinal de vida:', e.message);
	}
}

/**
 * Ao ligar: o que esta ponte deixou pela metade (Mac reiniciou, ponte caiu)
 * fica marcado (contrato, seção 2.6). Pedido de parar vira `cancelada`; quem
 * tem equipe com pendência fica `aguardando` (retoma sozinho com o retorno);
 * o resto vira `falhou`. A pendência é lida no estado de antes do update,
 * então a subtarefa que estava rodando e virou `falhou` agora ainda conta.
 * `aguardando` não tem sessão: nunca entra aqui.
 */
async function recuperar() {
	const linhas = await qInsistente(
		`with alvo as (
			select t.id, t.cancelar, t.pai_id is not null as subtarefa,
				exists (select 1 from public.dgathe_tarefas s where s.pai_id = t.id
					and (s.status in ${ABERTOS} or s.relatada_em is null)) as equipe
			from public.dgathe_tarefas t
			where t.ponte = $1 and t.status in ('trabalhando', 'esperando')
		)
		update public.dgathe_tarefas t
		set status = case when a.cancelar then 'cancelada' when a.equipe then 'aguardando' else 'falhou' end,
			erro = case when a.cancelar then null
				when a.equipe then 'A ponte reiniciou no meio da rodada. Ele retoma sozinho quando a equipe terminar.'
				when a.subtarefa then 'A ponte reiniciou no meio do trabalho. O líder recebe este aviso e decide se pede de novo.'
				else 'A ponte reiniciou no meio do trabalho. Mande uma mensagem para o Bandolete continuar de onde parou.' end,
			atividade = case when a.cancelar then 'Parada a pedido' when a.equipe then 'Esperando a equipe' else 'Parou: a ponte reiniciou' end,
			terminada_em = case when not a.cancelar and a.equipe then null else now() end,
			cancelar = false, atualizada_em = now()
		from alvo a
		where t.id = a.id
		returning t.id, t.status`,
		[ID]
	);
	if (linhas.length) {
		await qInsistente(`update public.dgathe_pedidos set cancelado = true where tarefa_id = any($1::uuid[]) and resposta is null`, [linhas.map((l) => l.id)]);
		const esperando = linhas.filter((l) => l.status === 'aguardando').length;
		log(`${linhas.length} tarefa(s) ficaram pela metade e foram marcadas${esperando ? ` (${esperando} esperando a equipe)` : ''}`);
	}
}

/**
 * A migration 0102 (equipes) está aplicada? Sem ela esta ponte quebra no
 * primeiro fim de rodada. 'sim' | 'nao' | 'erro' (banco fora do ar: não dá para saber).
 */
async function temEquipesNoBanco() {
	try {
		await q(`select pai_id, criada_por_agente, rodada, rodada_do_pai, relatada_em from public.dgathe_tarefas limit 0`);
		await q(`select equipe, lider from public.dgathe_agentes limit 0`);
		await q(`select agente_id, sexta, tarefa_id from public.dgathe_fechamentos limit 0`);
		return 'sim';
	} catch (e) {
		// 42703 = coluna não existe; 42P01 = tabela não existe; 42501 = sem permissão (grant da 0102)
		return ['42703', '42P01', '42501'].includes(e?.code) ? 'nao' : 'erro';
	}
}

async function desligar(sinal) {
	if (desligando) return;
	desligando = true;
	clearTimeout(cicloTimer);
	ouvinte?.end().catch(() => {});
	log(`desligando (${sinal})…`);
	for (const s of sessoes.values()) s.desligar();
	const limite = Date.now() + 15_000;
	while (sessoes.size && Date.now() < limite) await new Promise((r) => setTimeout(r, 300));
	try {
		await q(`update public.dgathe_ponte set visto_em = now() - interval '1 hour', trabalhando = 0 where id = $1`, [ID]);
	} catch {}
	await db.end().catch(() => {});
	process.exit(0);
}

async function conferir() {
	const claude = acharClaude();
	console.log('Ponte:', ID, `(versão ${VERSAO})`);
	console.log('Configuração:', existsSync(ARQUIVO_ENV) ? ARQUIVO_ENV : `${ARQUIVO_ENV} (não existe)`);
	console.log('Pasta base:', BASE, existsSync(BASE) ? '' : '(NÃO EXISTE)');
	console.log('Tarefas ao mesmo tempo:', MAX);
	console.log('Claude Code:', claude ?? 'NÃO ENCONTRADO', claude ? `→ ${versaoDoClaude(claude) ?? 'não respondeu'}` : '');
	console.log('Linha de comando da equipe:', CLI_DA_EQUIPE, existsSync(CLI_DA_EQUIPE) ? '' : '(NÃO EXISTE)');
	try {
		const [r] = await q(
			`select (select count(*) from public.dgathe_agentes where ativo) as agentes, (select count(*) from public.dgathe_tarefas where status = 'fila') as fila`
		);
		console.log(`Banco: ok (${r.agentes} agente(s) ativo(s), ${r.fila} tarefa(s) na fila)`);
		if ((await temEquipesNoBanco()) === 'sim') {
			console.log('Migration 0102 (equipes): aplicada');
			const equipes = await q(
				`select equipe, count(*)::int as n, min(nome) filter (where lider) as lider
				from public.dgathe_agentes where ativo and equipe is not null group by equipe order by equipe`
			);
			console.log(
				'Equipes:',
				equipes.length ? equipes.map((e) => `${e.equipe}: ${e.n} agente(s), ${e.lider ? `líder ${e.lider}` : 'sem líder ativo'}`).join(' · ') : 'nenhuma'
			);
			const [a] = await q(`select count(*)::int as n from public.dgathe_tarefas where status = 'aguardando'`);
			console.log(`Esperando a equipe: ${a.n} tarefa(s)`);
		} else {
			console.log('Migration 0102 (equipes): NÃO APLICADA → aplique supabase/migrations/0102_dgathe_equipes.sql antes de ligar esta ponte');
			process.exitCode = 1;
		}
	} catch (e) {
		console.log('Banco: FALHOU →', e.message);
		process.exitCode = 1;
	}
	const proxima = proximoFechamento(new Date());
	console.log(
		'Fechamento semanal:',
		FECHAMENTO
			? `ligado (sexta 17h de Brasília; o próximo sai em ${proxima.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })})`
			: 'DESLIGADO (DGATHE_FECHAMENTO=0)'
	);
	await db.end();
}

/** `--fechamento <agente> [--sexta AAAA-MM-DD]`: cria o fechamento de um líder e sai (contrato, seção 5.4). */
async function fechamentoManual() {
	const argv = process.argv.slice(2);
	const valor = (flag) => {
		const i = argv.indexOf(flag);
		return i >= 0 ? argv[i + 1] : undefined;
	};
	const agente = valor('--fechamento');
	const sexta = valor('--sexta');
	try {
		if (!agente || agente.startsWith('--')) {
			console.error('Uso: node ponte/ponte.mjs --fechamento <agente> [--sexta AAAA-MM-DD]');
			return 2;
		}
		let periodo;
		if (argv.includes('--sexta')) {
			try {
				periodo = periodoDaSexta(sexta ?? '');
			} catch {
				console.error('--sexta precisa ser uma sexta-feira no formato AAAA-MM-DD.');
				return 2;
			}
		} else {
			periodo = periodoDoFechamento(new Date());
			if (!periodo) {
				console.error('Sem --sexta e fora da janela (sexta 17h a segunda 17h, Brasília).');
				return 2;
			}
		}
		if (!cfg.DGATHE_PG_SENHA) {
			console.error(`Sem senha do banco em ${ARQUIVO_ENV}. Rode: node ponte/instalar.mjs`);
			return 1;
		}
		const [lider] = await q(
			`select id, nome, equipe from public.dgathe_agentes where id = $1 and lider and ativo and equipe is not null`,
			[agente]
		);
		if (!lider) {
			console.error(`${agente} não é líder ativo.`);
			return 3;
		}
		const r = await criarFechamento(lider, periodo);
		const quando = dataDaSexta(periodo.sexta);
		const tarefa = r.tarefa ? r.tarefa.slice(0, 8) : 'apagada';
		if (r.criada) console.log(`Fechamento criado para ${lider.nome} (sexta ${quando}): tarefa ${tarefa}`);
		else console.log(`Já existe o fechamento de ${lider.nome} da sexta ${quando} (tarefa ${tarefa}).`);
		return 0;
	} catch (e) {
		console.error('Não deu:', e.message);
		return 1;
	} finally {
		await db.end().catch(() => {});
	}
}

async function principal() {
	if (process.argv.includes('--conferir')) return conferir();
	if (process.argv.includes('--fechamento')) {
		process.exitCode = await fechamentoManual();
		return;
	}
	if (!cfg.DGATHE_PG_SENHA) {
		log(`Sem senha do banco em ${ARQUIVO_ENV}. Rode: node ponte/instalar.mjs`);
		process.exit(1);
	}
	const claude = acharClaude();
	claudeVersao = claude ? versaoDoClaude(claude) : null;
	log(`ponte ${ID} ligada · versão ${VERSAO} · base ${BASE} · até ${MAX} tarefa(s) · folga de ${ESPERA} s · Claude Code ${claudeVersao ?? 'não encontrado'}`);
	// Sem a migration 0102 esta versão quebra no primeiro fim de rodada: espera
	// em vez de sair (o launchd religaria em laço) e sem sinal de vida, para o
	// jogo mostrar que a ponte não está pegando tarefa
	for (let ultimo = null; ; ) {
		const r = await temEquipesNoBanco();
		if (r === 'sim') break;
		if (r !== ultimo)
			log(
				r === 'nao'
					? 'a migration 0102 (equipes) não está aplicada: esperando por ela (confiro a cada minuto)'
					: 'não consegui falar com o banco para conferir a migration 0102: tento de novo em 1 minuto'
			);
		ultimo = r;
		await dormir(60_000);
	}
	await recuperar();
	await pulso();
	setInterval(pulso, PULSO_MS);
	void atualizarUso();
	setInterval(() => void atualizarUso(), USO_MS);
	void ouvirBanco();
	process.on('SIGTERM', () => desligar('SIGTERM'));
	process.on('SIGINT', () => desligar('SIGINT'));
	void rodarCiclo();
}

// Para testar as transações sem ligar o laço (um script importa este arquivo
// com DGATHE_PONTE_COMO_MODULO=1 e um DGATHE_PONTE_ID próprio). O launchd nunca
// passa essa variável, então rodar a ponte continua igual.
export { Sessao, conferirEquipes, conferirFechamentos, entregarRetorno, criarFechamento, recuperar, temEquipesNoBanco, db };

if (process.env.DGATHE_PONTE_COMO_MODULO !== '1') {
	principal().catch((e) => {
		log('falhou ao ligar:', e.message);
		process.exit(1);
	});
}
