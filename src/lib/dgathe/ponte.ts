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
export type GerenteDoPreambulo = { id: string; nome: string; cargo: string; equipe: string };
/**
 * O que a ponte lê da equipe antes de abrir a sessão. Falhou a leitura: vem
 * undefined e o preâmbulo sai sem a lista. `pai.lider` é quem delegou (o líder,
 * ou o diretor quando `pai.diretor`); `gerentes` só vem para um diretor.
 */
export type ContextoDaEquipe = {
	membros: MembroDoPreambulo[];
	pai: { titulo: string; lider: string; diretor?: boolean } | null;
	gerentes?: GerenteDoPreambulo[];
};

/** Uma pasta da VERT SYS e o título do CLAUDE.md dela (null = sem CLAUDE.md ou sem título). */
export type PastaDaBase = { pasta: string; titulo: string | null };
/** A VERT SYS inteira, que todo Bandolete enxerga desde 11/11/2026 (--add-dir). */
export type BaseDoPreambulo = { caminho: string; pastas: PastaDaBase[] };

/** A equipe dos diretores (igual a EQUIPE_DIRETORIA em equipe.ts: este arquivo não importa outro .ts). */
const EQUIPE_DIRETORIA = 'diretoria';

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
export function preambulo(
	a: AgenteDaPonte,
	t: Pick<TarefaDaPonte, 'criada_por_nome' | 'pai_id'>,
	ctx?: ContextoDaEquipe,
	base?: BaseDoPreambulo
): string {
	const quem = t.criada_por_nome?.trim() || 'alguém da equipe';
	const linhas = [
		'## Você está no DGathe',
		`Você é ${a.nome}, ${a.cargo} da Dunamis Company, e trabalha pelo DGathe (o escritório da Dunamis em forma de jogo, dentro do dspace). Quem passou esta tarefa: ${quem}.`,
		'- Na Dunamis, os agentes de IA do DGathe, como você, são chamados de Bandoletes: use esse nome ao falar de você ou dos colegas com a equipe.',
		'- Ninguém acompanha este terminal. Seus textos e passos aparecem no painel do jogo, e a pessoa responde por lá.',
		'- Precisou de uma decisão ou de um dado que não tem? Pergunte com a ferramenta AskUserQuestion: a pergunta aparece no jogo e você espera a resposta. Não termine com pergunta solta no texto quando der para perguntar assim.',
		'- Autonomia máxima: faça o trabalho inteiro sem pedir licença, inclusive commit e push nos sistemas. Pergunte pelo AskUserQuestion só antes de gastar dinheiro, falar em nome da Dunamis ou de um cliente para fora (e-mail, WhatsApp, post), mexer em dinheiro, apagar o que não tem volta (dado do banco de produção, limpeza ampla), mexer em senha ou acesso, criar ou mudar Bandolete, ou numa dúvida que só o CEO resolve.',
		'- Ao terminar, responda em português, em poucas linhas: o que fez, o caminho de cada arquivo criado ou alterado e o que ficou pendente.'
	];
	if (base) linhas.push('', ...secaoDaBase(a, base));
	const equipe = a.equipe?.trim();
	if (equipe === EQUIPE_DIRETORIA) linhas.push('', ...secaoDoDiretor(a, ctx));
	else if (equipe) linhas.push('', ...(a.lider ? secaoDoLider(a, equipe, t, ctx) : secaoDoEspecialista(equipe, t, quem, ctx)));
	const proprias = a.instrucoes?.trim();
	if (proprias) linhas.push('', '## Suas instruções', proprias);
	return linhas.join('\n');
}

/**
 * A VERT SYS inteira (pedido do Bruno em 11/11/2026: os Bandoletes enxergam
 * todos os projetos). A sessão continua na pasta do agente, com o CLAUDE.md e
 * as skills de lá; a base entra pelo --add-dir e esta seção ensina a andar nela.
 */
export function secaoDaBase(a: Pick<AgenteDaPonte, 'pasta'>, base: BaseDoPreambulo): string[] {
	const linhas = [
		'## A pasta VERT SYS',
		`Você enxerga e edita a pasta VERT SYS inteira (${base.caminho}), onde ficam os projetos do grupo: a Dunamis, as marcas, os sistemas e uma pasta para cada cliente. A sua pasta de trabalho continua sendo ${a.pasta}.`,
		'- Antes de mexer no projeto de um cliente ou de outra marca, leia o CLAUDE.md e a _memoria/ da pasta dele e siga as regras e a identidade de lá. Nunca misture marca, tom, dado ou arquivo de um cliente com o de outro.',
		'- Skill própria de outra pasta fica em <pasta>/.claude/skills/<nome>/SKILL.md: quando o pedido for daquele projeto, leia e siga a de lá.',
		'- Os sistemas têm repositório git próprio (dspace, PageLinks, MariHub e os outros): commit e push liberados, depois de conferir. As pastas do Contex OS (a dunamiscompany e as de cliente e de marca) não se commitam nem sobem: o repositório delas é público, e o git recusa.'
	];
	if (base.pastas.length) {
		linhas.push('As pastas de agora:');
		for (const p of base.pastas) linhas.push(`- ${p.pasta}: ${p.titulo ?? 'sem CLAUDE.md'}`);
	}
	return linhas;
}

/**
 * O título de uma pasta para a lista: a primeira linha "# …" do CLAUDE.md dela,
 * sem o "# ". Sem título (ou só espaço): null.
 */
export function tituloDoClaudeMd(texto: string | null | undefined): string | null {
	for (const linha of String(texto ?? '').split(/\r?\n/)) {
		const m = linha.match(/^#\s+(.+?)\s*$/);
		if (m) return m[1].length > 100 ? m[1].slice(0, 99) + '…' : m[1];
	}
	return null;
}

/** As pastas da VERT SYS que entram na lista: sem as escondidas e as arquivadas ("#off"), em ordem alfabética. */
export function pastasDaBase(nomes: string[]): string[] {
	return nomes.filter((n) => n && !n.startsWith('.') && !n.startsWith('#')).sort((x, y) => x.localeCompare(y, 'pt-BR'));
}

/**
 * Diretor (equipe "diretoria", pedido do Bruno em 11/11/2026): coordena a
 * operação e passa trabalho aos gerentes, que redistribuem para a equipe deles.
 */
function secaoDoDiretor(a: AgenteDaPonte, ctx?: ContextoDaEquipe): string[] {
	const linhas = [
		'## Você é da Diretoria',
		'Você é um dos três diretores da Dunamis, logo abaixo dos CEOs (Bruno e Aline). A diretoria coordena a operação inteira: o Estratégico decide o rumo, o Tático transforma em plano e o Operacional faz acontecer.',
		'- Para passar trabalho a um setor, delegue ao gerente dele (o pedido vai pelo stdin; a linha PEDIDO que fecha começa na coluna 1):',
		'```bash',
		`node "$DGATHE_EQUIPE" delegar <id-do-gerente> --titulo "Título curto" <<'PEDIDO'`,
		'Objetivo, contexto, arquivos e pastas, critérios de aceitação e o que entregar.',
		'PEDIDO',
		'```',
		'- O gerente distribui para a equipe dele, revisa e devolve para você. Você não passa trabalho direto a um especialista, a um assessor nem a outro diretor.',
		'- Pode delegar para vários gerentes na mesma rodada. Depois, encerre a rodada com um texto curto dizendo o que passou e o que espera. Não fique esperando nem consultando em laço: quando todos terminarem, o retorno chega aqui, nesta mesma conversa, e você continua.',
		'- node "$DGATHE_EQUIPE" estado mostra o que você passou (estado <número> mostra um inteiro). node "$DGATHE_EQUIPE" equipe mostra os gerentes e o que cada um faz agora.',
		'- Limites: 12 pedidos abertos por vez e 6 rodadas de delegação por tarefa. Você só delega da tarefa que recebeu dos CEOs.',
		'- Perguntas e pedidos de licença de quem trabalha no seu pedido vão direto ao CEO pelo jogo: você não precisa repassar.',
		'- No retorno: confira as evidências, mande corrigir com nova delegação ou feche com o seu relatório.'
	];
	if (ctx) {
		const gerentes = ctx.gerentes ?? [];
		linhas.push('Gerentes agora:');
		if (gerentes.length) for (const g of gerentes) linhas.push(`- ${g.id}: ${g.nome}, ${g.cargo} (equipe ${g.equipe})`);
		else linhas.push('- (nenhum gerente ativo: faça você mesmo ou diga ao CEO o que precisa)');
		const outros = ctx.membros.filter((m) => m.id !== a.id);
		if (outros.length) {
			linhas.push('Os outros diretores:');
			for (const m of outros) linhas.push(`- ${m.id}: ${m.nome}, ${m.cargo}`);
		}
	}
	return linhas;
}

function secaoDoLider(a: AgenteDaPonte, equipe: string, t: Pick<TarefaDaPonte, 'pai_id'>, ctx?: ContextoDaEquipe): string[] {
	// Gerente com uma tarefa que veio de um diretor: o retorno volta para ele
	const diretor = t.pai_id && ctx?.pai?.diretor ? ctx.pai.lider?.trim() || 'o diretor' : null;
	const projeto = diretor && ctx?.pai?.titulo?.trim() ? `, dentro do pedido "${ctx.pai.titulo.trim()}"` : '';
	const linhas = [
		`## Você lidera a equipe "${equipe}"`,
		...(diretor
			? [
					`Esta tarefa veio de ${diretor}, da Diretoria${projeto}. Distribua para a sua equipe como sempre; o seu texto final volta para ${diretor}, que revisa antes de levar ao CEO.`
				]
			: []),
		`Você coordena: planeja, distribui para os especialistas certos, revisa e presta contas ${diretor ? `a ${diretor}` : 'ao CEO'}. Quem executa é a equipe.`,
		// O PEDIDO que fecha o texto tem que começar na coluna 1, senão o terminal não acha o fim
		'- Para passar trabalho a um especialista (o pedido vai pelo stdin; a linha PEDIDO que fecha começa na coluna 1):',
		'```bash',
		`node "$DGATHE_EQUIPE" delegar <id> --titulo "Título curto" <<'PEDIDO'`,
		'Objetivo, contexto, arquivos e pastas, critérios de aceitação e o que entregar.',
		'PEDIDO',
		'```',
		'- Pode delegar para vários na mesma rodada: eles trabalham em paralelo. Depois, encerre a rodada com um texto curto dizendo o que distribuiu e o que espera. Não fique esperando nem consultando em laço: quando todas as subtarefas abertas terminarem, o retorno de cada uma chega aqui, nesta mesma conversa, e você continua.',
		'- node "$DGATHE_EQUIPE" estado mostra as subtarefas desta tarefa (estado <número> mostra uma inteira). node "$DGATHE_EQUIPE" equipe mostra quem está livre.',
		'- Limites: 12 subtarefas abertas por vez e 6 rodadas de delegação por tarefa. A equipe não delega adiante e você não delega para si.',
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
 * Autonomia máxima (decisão do Bruno em 11/11/2026: "commit e push tá liberado,
 * sem ficar me pedindo toda hora"). Com autonomia `editar`, o Bandolete não pede
 * licença para editar em qualquer pasta (inclusive fora da VERT SYS, como os
 * Downloads), buscar e ler na web, commitar e publicar (o terminal inteiro já é
 * liberado nas configurações do Mac) nem para usar o Gmail, o Drive, o Claude
 * Docs, o Figma e o Canva ligados à conta.
 */
export const LIBERADO_SEM_PEDIR = [
	'Write',
	'Edit',
	'NotebookEdit',
	'WebFetch',
	'WebSearch',
	'mcp__claude_ai_Gmail',
	'mcp__claude_ai_Google_Drive',
	'mcp__claude_ai_Claude_Docs',
	'mcp__claude_ai_Figma',
	'mcp__claude_ai_Canva'
];

/**
 * O que continua pedindo licença no jogo, mesmo liberado acima: o instalador da
 * ponte, que derruba todas as sessões (o `--status` continua livre), e, nas
 * ferramentas ligadas, o que fala para fora em nome da Dunamis (mandar,
 * responder ou encaminhar e-mail; compartilhar no Drive), apaga (lixeira do
 * Gmail e do Drive) ou gera com IA, que gasta crédito. O "ask" vence o "allow"
 * e pega também o comando depois de `cd … &&` (testado em 10/11/2026 com o
 * Claude Code 2.1.321). O ElevenLabs e o Adobe ficam fora do liberado: cada uso
 * pede licença, porque quase tudo neles gasta crédito. É trava contra engano,
 * não contra má-fé.
 */
export const PEDIR_LICENCA = [
	'Bash(node ponte/instalar.mjs)',
	'Bash(node dunamisspace/ponte/instalar.mjs)',
	'Bash(node ponte/instalar.mjs --parar:*)',
	'Bash(node dunamisspace/ponte/instalar.mjs --parar:*)',
	'Bash(node ponte/instalar.mjs --senha-nova:*)',
	'Bash(node dunamisspace/ponte/instalar.mjs --senha-nova:*)',
	'Bash(node ponte/instalar.mjs --sem-launchd:*)',
	'Bash(node dunamisspace/ponte/instalar.mjs --sem-launchd:*)',
	'mcp__claude_ai_Gmail__send_message',
	'mcp__claude_ai_Gmail__reply',
	'mcp__claude_ai_Gmail__forward',
	'mcp__claude_ai_Gmail__trash_message',
	'mcp__claude_ai_Gmail__trash_thread',
	'mcp__claude_ai_Google_Drive__share_file',
	'mcp__claude_ai_Google_Drive__trash_file',
	'mcp__claude_ai_Figma__generate_image',
	'mcp__claude_ai_Figma__generate_vector_illustration',
	'mcp__claude_ai_Figma__weave_run_model',
	'mcp__claude_ai_Figma__weave_run_tool',
	'mcp__claude_ai_Canva__generate-image',
	'mcp__claude_ai_Canva__generate-design',
	'mcp__claude_ai_Canva__generate-design-structured',
	'mcp__claude_ai_Canva__create-video'
];

/** Os argumentos do Claude Code para uma rodada da tarefa. */
export function argumentosDoClaude(
	a: AgenteDaPonte,
	o: { sessao: string; retomar: boolean; nome: string; preambulo: string; base?: string }
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
		// Autonomia máxima (11/11/2026), para todo Bandolete com editar, com equipe ou não
		args.push('--settings', JSON.stringify({ permissions: { allow: LIBERADO_SEM_PEDIR, ask: PEDIR_LICENCA } }));
	}
	if (o.retomar) args.push('--resume', o.sessao);
	else args.push('--session-id', o.sessao);
	// A VERT SYS inteira (11/11/2026): lê e edita qualquer projeto, com a mesma
	// autonomia. Logo antes de outra opção: --add-dir aceita vários caminhos
	if (o.base) args.push('--add-dir', o.base);
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

/**
 * Tokens em contexto numa chamada ao modelo (o `usage` de cada mensagem do
 * assistente no stream-json): a entrada nova, a lida do cache, a escrita no
 * cache e a saída. É o número que o Claude Code mostra ao lado de cada agente,
 * e o mapa dos Bandoletes mostra o mesmo (migration 0109). Sem `usage` ou tudo
 * zero (mensagem sintética): null, para não apagar o último valor bom.
 */
export function tokensDoContexto(usage: unknown): number | null {
	if (!usage || typeof usage !== 'object') return null;
	const u = usage as Record<string, unknown>;
	const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
	const total = n(u.input_tokens) + n(u.cache_read_input_tokens) + n(u.cache_creation_input_tokens) + n(u.output_tokens);
	return total > 0 ? Math.min(Math.round(total), 2_000_000_000) : null;
}

/**
 * O modelo que a sessão usou: o `model` do aviso de início (system/init) ou de
 * uma mensagem do assistente. "<synthetic>" é mensagem que o próprio Claude
 * Code escreve, sem modelo nenhum.
 */
export function modeloDaSessao(valor: unknown): string | null {
	if (typeof valor !== 'string') return null;
	const m = valor.trim();
	if (!m || m.startsWith('<') || !/^[A-Za-z0-9.:_\[\]/-]{2,60}$/.test(m)) return null;
	return m;
}
