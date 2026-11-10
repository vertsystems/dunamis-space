// As contas da ponte do DGathe que dá para testar sem abrir o Claude Code:
// a pasta de trabalho, os argumentos da sessão, a instrução que vai junto e o
// formato das respostas que voltam do jogo. Quem usa é ponte/ponte.mjs.
//
// Roda direto no Node da ponte (sem build): só TypeScript que o Node sabe
// apagar, e imports só do próprio Node.

import { isAbsolute, relative, resolve } from 'node:path';

export type Autonomia = 'perguntar' | 'editar' | 'livre';

export type AgenteDaPonte = {
	id: string;
	nome: string;
	cargo: string;
	pasta: string;
	instrucoes: string;
	autonomia: Autonomia;
	modelo: string | null;
	esforco: string | null;
};

export type TarefaDaPonte = {
	id: string;
	titulo: string;
	criada_por_nome: string;
	sessao_id: string | null;
};

export type PedidoDaPonte = { tipo: 'permissao' | 'pergunta'; entrada: Record<string, unknown> | null };

/**
 * A pasta do agente, dentro da base (a pasta VERT SYS do Mac). Recusa caminho
 * absoluto e qualquer um que saia da base, mesmo que o banco tenha deixado passar.
 */
export function resolverPasta(base: string, pasta: string): string {
	const rel = (pasta ?? '').trim();
	if (!rel || isAbsolute(rel)) throw new Error(`Pasta do agente inválida: "${pasta}"`);
	const destino = resolve(base, rel);
	const r = relative(resolve(base), destino);
	if (r.startsWith('..') || isAbsolute(r)) throw new Error(`A pasta "${pasta}" sai da pasta base`);
	return destino;
}

/** O que vai junto do CLAUDE.md da pasta: quem é o agente e como trabalhar sem ninguém no terminal. */
export function preambulo(a: AgenteDaPonte, t: Pick<TarefaDaPonte, 'criada_por_nome'>): string {
	const quem = t.criada_por_nome?.trim() || 'alguém da equipe';
	const linhas = [
		'## Você está no DGathe',
		`Você é ${a.nome}, ${a.cargo} da Dunamis Company, e trabalha pelo DGathe (o escritório da Dunamis em forma de jogo, dentro do dspace). Quem passou esta tarefa: ${quem}.`,
		'- Ninguém acompanha este terminal. Seus textos e passos aparecem no painel do jogo, e a pessoa responde por lá.',
		'- Precisou de uma decisão ou de um dado que não tem? Pergunte com a ferramenta AskUserQuestion: a pergunta aparece no jogo e você espera a resposta. Não termine com pergunta solta no texto quando der para perguntar assim.',
		'- Antes de publicar, mandar algo para fora (e-mail, WhatsApp, post), gastar dinheiro ou apagar arquivo, pergunte pelo AskUserQuestion, a não ser que as instruções abaixo liberem.',
		'- Ao terminar, responda em português, em poucas linhas: o que fez, o caminho de cada arquivo criado ou alterado e o que ficou pendente.'
	];
	const proprias = a.instrucoes?.trim();
	if (proprias) linhas.push('', '## Suas instruções', proprias);
	return linhas.join('\n');
}

/** Os argumentos do Claude Code para uma rodada da tarefa. */
export function argumentosDoClaude(
	a: AgenteDaPonte,
	o: { sessao: string; retomar: boolean; nome: string; preambulo: string }
): string[] {
	const args = [
		'-p',
		'--input-format',
		'stream-json',
		'--output-format',
		'stream-json',
		'--verbose',
		// As permissões e as perguntas vêm para a ponte (e dela para o jogo)
		'--permission-prompt-tool',
		'stdio'
	];
	if (a.autonomia === 'livre') args.push('--permission-mode', 'bypassPermissions');
	else if (a.autonomia === 'perguntar')
		// O Mac do Bruno libera o terminal inteiro nas configurações; aqui ele volta a pedir
		args.push('--permission-mode', 'default', '--settings', JSON.stringify({ permissions: { ask: ['Bash', 'PowerShell'] } }));
	else args.push('--permission-mode', 'acceptEdits');
	if (o.retomar) args.push('--resume', o.sessao);
	else args.push('--session-id', o.sessao);
	args.push('--name', o.nome, '--append-system-prompt', o.preambulo);
	if (a.modelo) args.push('--model', a.modelo);
	if (a.esforco) args.push('--effort', a.esforco);
	return args;
}

/** O nome da sessão (aparece no /resume do Claude Code). */
export function nomeDaSessao(a: Pick<AgenteDaPonte, 'nome'>, t: Pick<TarefaDaPonte, 'titulo'>): string {
	const titulo = t.titulo.length > 60 ? t.titulo.slice(0, 59) + '…' : t.titulo;
	return `DGathe · ${a.nome} · ${titulo}`;
}

/** Mensagens que chegaram pelo jogo, num texto só para o agente. */
export function mensagemParaOAgente(lista: { autor_nome: string | null; conteudo: string }[]): string {
	return lista
		.map((m) => `Mensagem de ${m.autor_nome?.trim() || 'alguém da equipe'} pelo DGathe:\n\n${m.conteudo}`)
		.join('\n\n---\n\n');
}

/**
 * A resposta do jogo no formato que o Claude Code espera. Permissão: libera
 * ou nega (com o motivo, que o agente lê). Pergunta: libera a ferramenta com
 * as respostas junto (é assim que o AskUserQuestion recebe a escolha).
 */
export function respostaParaOClaude(
	p: PedidoDaPonte,
	resposta: unknown,
	quem: string | null
): { behavior: 'allow'; updatedInput: Record<string, unknown> } | { behavior: 'deny'; message: string } {
	const r = (resposta && typeof resposta === 'object' ? resposta : {}) as Record<string, unknown>;
	const entrada = p.entrada ?? {};
	const nome = quem?.trim() || 'a equipe';
	if (p.tipo === 'pergunta') {
		const bruto = r.respostas && typeof r.respostas === 'object' ? (r.respostas as Record<string, unknown>) : {};
		const respostas: Record<string, string> = {};
		for (const [k, v] of Object.entries(bruto)) {
			const t = Array.isArray(v) ? v.map(String).join(', ') : String(v ?? '');
			if (t.trim()) respostas[k] = t.trim();
		}
		if (!Object.keys(respostas).length) return { behavior: 'deny', message: `${nome} preferiu não responder pelo DGathe. Siga com o que tem ou explique o que falta no texto final.` };
		return { behavior: 'allow', updatedInput: { ...entrada, answers: respostas } };
	}
	if (r.permitir === true) return { behavior: 'allow', updatedInput: entrada };
	const motivo = typeof r.motivo === 'string' ? r.motivo.trim() : '';
	return { behavior: 'deny', message: motivo ? `${nome} negou pelo DGathe: ${motivo}` : `${nome} negou pelo DGathe.` };
}

/** "…/anthropic.claude-code-2.1.318-darwin-arm64/…" → [2, 1, 318]. */
export function versaoNoCaminho(caminho: string): number[] {
	const m = caminho.match(/(\d+)\.(\d+)\.(\d+)/);
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0];
}

/** O Claude Code mais novo entre os encontrados no Mac. */
export function maisNovo(caminhos: string[]): string | null {
	let melhor: string | null = null;
	let mv = [-1, -1, -1];
	for (const c of caminhos) {
		const v = versaoNoCaminho(c);
		const maior = v[0] !== mv[0] ? v[0] > mv[0] : v[1] !== mv[1] ? v[1] > mv[1] : v[2] > mv[2];
		if (maior) {
			melhor = c;
			mv = v;
		}
	}
	return melhor;
}
