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
//   - interrompe a sessão quando alguém clica em Parar
// A cada 20 s grava o sinal de vida (o jogo mostra se a ponte está ligada).
//
// Uso:
//   node ponte/ponte.mjs              roda (é o que o launchd chama)
//   node ponte/ponte.mjs --conferir   mostra a configuração e testa o banco e o Claude Code
//
// Configuração em ~/.config/dunamisspace/ponte.env (fora do Drive):
//   DGATHE_PG_SENHA   senha do usuário dgathe_ponte no banco (criada pelo instalar.mjs)
//   DGATHE_PONTE_ID   nome desta ponte (padrão: mac-<nome do computador>)
//   DGATHE_BASE       pasta base das pastas dos agentes (padrão: a VERT SYS)
//   DGATHE_MAX        quantas tarefas ao mesmo tempo (padrão: 3)
//   DGATHE_ESPERA     segundos de folga antes de agir numa tarefa ou mensagem nova (padrão: 15)
//   DGATHE_PATH       PATH das sessões (o do terminal do Bruno)
//   DGATHE_CLAUDE     caminho do Claude Code (padrão: o mais novo instalado)

import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
	argumentosDoClaude,
	maisNovo,
	mensagemParaOAgente,
	nomeDaSessao,
	preambulo,
	resolverPasta,
	respostaParaOClaude
} from '../src/lib/dgathe/ponte.ts';
import { cortar, passoDaFerramenta, resumoDoPedido } from '../src/lib/dgathe/passos.ts';

const VERSAO = '1.0';
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

const db = new pg.Pool({
	host: cfg.DGATHE_PG_HOST || 'db.rboenllphxqecjroolzo.supabase.co',
	port: 5432,
	user: 'dgathe_ponte',
	password: cfg.DGATHE_PG_SENHA,
	database: 'postgres',
	ssl: { rejectUnauthorized: false },
	max: 4,
	idleTimeoutMillis: 30_000,
	connectionTimeoutMillis: 15_000
});
db.on('error', (e) => log('banco:', e.message));

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
			await new Promise((r) => setTimeout(r, 2000 + i * 1000));
		}
	}
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

		const args = argumentosDoClaude(this.agente, {
			sessao: this.sessao,
			retomar,
			nome: nomeDaSessao(this.agente, this.tarefa),
			preambulo: preambulo(this.agente, this.tarefa)
		});
		this.proc = spawn(claude, args, {
			cwd,
			env: ambiente({ DGATHE_TAREFA: this.id, DGATHE_AGENTE: this.agente.id }),
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
			[this.id, this.sessao, retomar ? 'Retomando a conversa' : 'Começando']
		);
		this.escrever(() =>
			q(`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo, detalhe) values ($1, 'aviso', $2, $3)`, [
				this.id,
				retomar ? 'Retomou a conversa' : 'Começou',
				{ ponte: ID, retomar }
			])
		);
		log(`tarefa ${this.curto} (${this.agente.id}): ${retomar ? 'retomou' : 'começou'} em ${this.agente.pasta}`);
	}

	aoLinha(linha) {
		let d;
		try {
			d = JSON.parse(linha);
		} catch {
			return;
		}
		switch (d.type) {
			case 'assistant': {
				clearTimeout(this.fimTimer);
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
			await q(`update public.dgathe_tarefas set atividade = $2, passos = passos + 1, atualizada_em = now() where id = $1`, [this.id, p.rotulo]);
		});
	}

	registrarTexto(texto) {
		this.escrever(async () => {
			await q(`insert into public.dgathe_mensagens (tarefa_id, tipo, conteudo) values ($1, 'texto', $2)`, [this.id, texto.slice(0, 40000)]);
			await q(`update public.dgathe_tarefas set atividade = 'Escrevendo', atualizada_em = now() where id = $1`, [this.id]);
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
		await q(`update public.dgathe_tarefas set atividade = 'Lendo a sua mensagem', atualizada_em = now() where id = $1`, [this.id]);
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
			erro = 'A ponte foi desligada no meio do trabalho. Mande uma mensagem para o agente continuar de onde parou.';
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
		try {
			await qInsistente(`update public.dgathe_pedidos set cancelado = true where tarefa_id = $1 and resposta is null and not cancelado`, [this.id]);
			// Mensagem que chegou enquanto fechava: volta para a fila e retoma a conversa
			await qInsistente(
				`update public.dgathe_tarefas t set
					status = case when $2 <> 'cancelada' and exists (select 1 from public.dgathe_mensagens m where m.tarefa_id = t.id and not m.entregue) then 'fila' else $2 end,
					erro = $3, atividade = $4, cancelar = false, terminada_em = now(), atualizada_em = now()
				where id = $1`,
				[this.id, status, erro, atividade]
			);
		} catch (e) {
			log(`tarefa ${this.curto}: não consegui gravar o fim:`, e.message);
		}
		log(`tarefa ${this.curto}: ${status}${erro ? ` (${erro.slice(0, 160)})` : ''}`);
		this.aoTerminar(this);
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
		set status = 'trabalhando', ponte = $1, iniciada_em = coalesce(t.iniciada_em, now()), atividade = 'Começando', erro = null, cancelar = false, atualizada_em = now()
		from proxima where t.id = proxima.id
		returning t.*`,
		[ID, ocupados, ESPERA]
	);
	if (!t) return null;
	const [agente] = await q(`select * from public.dgathe_agentes where id = $1`, [t.agente_id]);
	return agente ? { tarefa: t, agente } : null;
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
		while (!desligando && sessoes.size < MAX) {
			const achou = await pegarTarefa();
			if (!achou) break;
			const s = new Sessao(achou.tarefa, achou.agente, (fim) => sessoes.delete(fim.id));
			sessoes.set(s.id, s);
			s.iniciar().catch((e) => s.falharAoIniciar(e));
		}
	} catch (e) {
		log('ciclo:', e.message);
	} finally {
		// Com a folga de 15 s, olhar a fila a cada 5 s não atrasa ninguém
		if (!desligando) setTimeout(ciclo, sessoes.size ? 2000 : 5000);
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

/** Ao ligar: o que esta ponte deixou pela metade (Mac reiniciou, ponte caiu) fica marcado. */
async function recuperar() {
	const linhas = await qInsistente(
		`update public.dgathe_tarefas
		set status = 'falhou', erro = 'A ponte reiniciou no meio do trabalho. Mande uma mensagem para o agente continuar de onde parou.',
			atividade = 'Parou: a ponte reiniciou', cancelar = false, terminada_em = now(), atualizada_em = now()
		where ponte = $1 and status in ('trabalhando', 'esperando')
		returning id`,
		[ID]
	);
	if (linhas.length) {
		await qInsistente(`update public.dgathe_pedidos set cancelado = true where tarefa_id = any($1::uuid[]) and resposta is null`, [linhas.map((l) => l.id)]);
		log(`${linhas.length} tarefa(s) ficaram pela metade e foram marcadas`);
	}
}

async function desligar(sinal) {
	if (desligando) return;
	desligando = true;
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
	try {
		const [r] = await q(
			`select (select count(*) from public.dgathe_agentes where ativo) as agentes, (select count(*) from public.dgathe_tarefas where status = 'fila') as fila`
		);
		console.log(`Banco: ok (${r.agentes} agente(s) ativo(s), ${r.fila} tarefa(s) na fila)`);
	} catch (e) {
		console.log('Banco: FALHOU →', e.message);
		process.exitCode = 1;
	}
	await db.end();
}

async function principal() {
	if (process.argv.includes('--conferir')) return conferir();
	if (!cfg.DGATHE_PG_SENHA) {
		log(`Sem senha do banco em ${ARQUIVO_ENV}. Rode: node ponte/instalar.mjs`);
		process.exit(1);
	}
	const claude = acharClaude();
	claudeVersao = claude ? versaoDoClaude(claude) : null;
	log(`ponte ${ID} ligada · base ${BASE} · até ${MAX} tarefa(s) · folga de ${ESPERA} s · Claude Code ${claudeVersao ?? 'não encontrado'}`);
	await recuperar();
	await pulso();
	setInterval(pulso, PULSO_MS);
	process.on('SIGTERM', () => desligar('SIGTERM'));
	process.on('SIGINT', () => desligar('SIGINT'));
	ciclo();
}

principal().catch((e) => {
	log('falhou ao ligar:', e.message);
	process.exit(1);
});
