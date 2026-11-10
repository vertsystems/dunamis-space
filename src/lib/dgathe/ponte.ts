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
	/** Equipe do agente (ex.: 'dev'); null = fora de equipe, como o assessor. Migration 0102. */
	equipe?: string | null;
	/** Só o líder delega (docs/dgathe/contrato-equipes.md). */
	lider?: boolean;
};

export type TarefaDaPonte = {
	id: string;
	titulo: string;
	criada_por_nome: string;
	sessao_id: string | null;
	/** Subtarefa: a tarefa do líder que a criou. */
	pai_id?: string | null;
};

export type MembroDoPreambulo = { id: string; nome: string; cargo: string; lider: boolean };
/** O que a ponte lê da equipe antes de abrir a sessão. Falhou a leitura: vem undefined e o preâmbulo sai sem a lista. */
export type ContextoDaEquipe = { membros: MembroDoPreambulo[]; pai: { titulo: string; lider: string } | null };

/** Quem escreve a mensagem de retorno das subtarefas (igual a AUTOR_DA_EQUIPE em equipe.ts). */
const AUTOR_DA_EQUIPE = 'Equipe';

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

/**
 * O que vai junto do CLAUDE.md da pasta: quem é o agente e como trabalhar sem
 * ninguém no terminal. Agente de equipe ganha uma seção antes das instruções
 * dele: o líder aprende a delegar; o especialista, a quem entregar.
 */
export function preambulo(a: AgenteDaPonte, t: Pick<TarefaDaPonte, 'criada_por_nome' | 'pai_id'>, ctx?: ContextoDaEquipe): string {
	const quem = t.criada_por_nome?.trim() || 'alguém da equipe';
	const linhas = [
		'## Você está no DGathe',
		`Você é ${a.nome}, ${a.cargo} da Dunamis Company, e trabalha pelo DGathe (o escritório da Dunamis em forma de jogo, dentro do dspace). Quem passou esta tarefa: ${quem}.`,
		'- Ninguém acompanha este terminal. Seus textos e passos aparecem no painel do jogo, e a pessoa responde por lá.',
		'- Precisou de uma decisão ou de um dado que não tem? Pergunte com a ferramenta AskUserQuestion: a pergunta aparece no jogo e você espera a resposta. Não termine com pergunta solta no texto quando der para perguntar assim.',
		'- Antes de publicar, mandar algo para fora (e-mail, WhatsApp, post), gastar dinheiro ou apagar arquivo, pergunte pelo AskUserQuestion, a não ser que as instruções abaixo liberem.',
		'- Ao terminar, responda em português, em poucas linhas: o que fez, o caminho de cada arquivo criado ou alterado e o que ficou pendente.'
	];
	const equipe = a.equipe?.trim();
	if (equipe) linhas.push('', ...(a.lider ? secaoDoLider(a, equipe, ctx) : secaoDoEspecialista(equipe, t, quem, ctx)));
	const proprias = a.instrucoes?.trim();
	if (proprias) linhas.push('', '## Suas instruções', proprias);
	return linhas.join('\n');
}

function secaoDoLider(a: AgenteDaPonte, equipe: string, ctx?: ContextoDaEquipe): string[] {
	const linhas = [
		`## Você lidera a equipe "${equipe}"`,
		'Você coordena: planeja, distribui para os especialistas certos, revisa e presta contas ao CEO. Quem executa é a equipe.',
		// O PEDIDO que fecha o texto tem que começar na coluna 1, senão o terminal não acha o fim
		'- Para passar trabalho a um especialista (o pedido vai pelo stdin; a linha PEDIDO que fecha começa na coluna 1):',
		'```bash',
		`node "$DGATHE_EQUIPE" delegar <id> --titulo "Título curto" <<'PEDIDO'`,
		'Objetivo, contexto, arquivos e pastas, critérios de aceitação e o que entregar.',
		'PEDIDO',
		'```',
		'- Pode delegar para vários na mesma rodada: eles trabalham em paralelo. Depois, encerre a rodada com um texto curto dizendo o que distribuiu e o que espera. Não fique esperando nem consultando em laço: quando todas as subtarefas abertas terminarem, o retorno de cada uma chega aqui, nesta mesma conversa, e você continua.',
		'- node "$DGATHE_EQUIPE" estado mostra as subtarefas desta tarefa (estado <número> mostra uma inteira). node "$DGATHE_EQUIPE" equipe mostra quem está livre.',
		'- Limites: 12 subtarefas abertas por vez e 6 rodadas de delegação por tarefa. Subtarefa não cria subtarefa e você não delega para si.',
		'- Perguntas e pedidos de licença dos especialistas vão direto ao CEO pelo jogo: você não precisa repassar.',
		'- No retorno: confira as evidências, mande corrigir com nova delegação ou feche com o relatório que as suas instruções pedem.'
	];
	if (ctx) {
		const outros = ctx.membros.filter((m) => m.id !== a.id);
		linhas.push('Sua equipe agora:');
		if (outros.length) for (const m of outros) linhas.push(`- ${m.id}: ${m.nome}, ${m.cargo}`);
		else linhas.push('- (ninguém ativo além de você)');
	}
	return linhas;
}

function secaoDoEspecialista(equipe: string, t: Pick<TarefaDaPonte, 'pai_id'>, quem: string, ctx?: ContextoDaEquipe): string[] {
	const titulo = `## Você é da equipe "${equipe}"`;
	if (t.pai_id) {
		// Subtarefa: o líder vem da tarefa-pai; sem ela, da lista da equipe
		const lider = ctx?.pai?.lider?.trim() || ctx?.membros.find((m) => m.lider)?.nome || null;
		const projeto = ctx?.pai?.titulo?.trim() ? `, dentro do projeto "${ctx.pai.titulo.trim()}"` : '';
		return [
			titulo,
			lider ? `Esta tarefa veio de ${lider}, líder da equipe${projeto}.` : `Esta tarefa veio do líder da equipe${projeto}.`,
			`- O seu texto final volta para ${lider ?? 'o líder'}, que revisa antes de levar ao CEO. Entregue o que fez, as evidências (testes e comandos rodados com o resultado, caminhos dos arquivos) e o que ficou pendente.`,
			`- Você não delega. Se precisar de outro especialista, diga no texto final quem e para quê: ${lider ?? 'o líder'} decide.`,
			'- Perguntas e pedidos de licença continuam indo ao CEO pelo jogo (AskUserQuestion).'
		];
	}
	const lider = ctx?.membros.find((m) => m.lider)?.nome;
	return [
		titulo,
		`Esta tarefa veio direto de ${quem}. Se ela pedir outro especialista, diga no texto final: quem distribui o trabalho é ${lider ? `${lider}, líder da equipe` : 'o líder da equipe'}.`
	];
}

/**
 * O que um agente de equipe com autonomia `editar` só roda com licença no
 * jogo. O Mac do Bruno libera o terminal inteiro, e o departamento só pode
 * publicar com a aprovação do CEO (decisão 10; ponto P2 de
 * docs/dgathe/cargos-dev-ia.md): push (no dspace é deploy; os repositórios são
 * públicos), a CLI da Vercel (deploy, rollback, variáveis) e o instalador da
 * ponte, que derruba todas as sessões (o `--status` continua livre). O "ask"
 * vence o "allow" das configurações do Mac e pega também o comando depois de
 * `cd … &&` (testado em 10/11/2026 com o Claude Code 2.1.321). É trava contra
 * engano, não contra má-fé: `git -C pasta push` ou um script escapam.
 */
export const PEDIR_LICENCA_NA_EQUIPE = [
	'Bash(git push)',
	'Bash(git push:*)',
	'Bash(npx vercel:*)',
	'Bash(npx -y vercel:*)',
	'Bash(npx vercel@latest:*)',
	'Bash(npx -y vercel@latest:*)',
	'Bash(vercel:*)',
	'Bash(node ponte/instalar.mjs)',
	'Bash(node dunamisspace/ponte/instalar.mjs)',
	'Bash(node ponte/instalar.mjs --parar:*)',
	'Bash(node dunamisspace/ponte/instalar.mjs --parar:*)',
	'Bash(node ponte/instalar.mjs --senha-nova:*)',
	'Bash(node dunamisspace/ponte/instalar.mjs --senha-nova:*)',
	'Bash(node ponte/instalar.mjs --sem-launchd:*)',
	'Bash(node dunamisspace/ponte/instalar.mjs --sem-launchd:*)'
];

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
	else {
		args.push('--permission-mode', 'acceptEdits');
		// Agente de equipe: publicar e mexer na ponte voltam a pedir licença (o assessor não muda)
		if (a.equipe?.trim()) args.push('--settings', JSON.stringify({ permissions: { ask: PEDIR_LICENCA_NA_EQUIPE } }));
	}
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

/**
 * Mensagens que chegaram pelo jogo, num texto só para o agente. O retorno da
 * equipe (autor 'Equipe', gravado pela ponte) já vem com cabeçalho próprio e
 * passa como está.
 */
export function mensagemParaOAgente(lista: { autor_nome: string | null; conteudo: string }[]): string {
	return lista
		.map((m) =>
			m.autor_nome === AUTOR_DA_EQUIPE ? m.conteudo : `Mensagem de ${m.autor_nome?.trim() || 'alguém da equipe'} pelo DGathe:\n\n${m.conteudo}`
		)
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
