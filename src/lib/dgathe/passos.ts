// O que cada passo de um agente quer dizer, em frase curta para o jogo.
//
// A ponte (ponte/ponte.mjs) recebe do Claude Code cada ferramenta que o agente
// usa (nome + entrada) e grava aqui o rótulo ("Lendo proposta.md") e um ícone,
// que o DGathe mostra no balão e na conversa da tarefa.
//
// Este arquivo roda também direto no Node da ponte (sem build): nada de import
// e só TypeScript que o Node sabe apagar (sem enum, sem namespace).

export type Icone =
	| 'ler'
	| 'escrever'
	| 'terminal'
	| 'procurar'
	| 'web'
	| 'skill'
	| 'ajudante'
	| 'lista'
	| 'pergunta'
	| 'figma'
	| 'canva'
	| 'email'
	| 'drive'
	| 'audio'
	| 'adobe'
	| 'ferramenta';

export type Passo = { rotulo: string; icone: Icone };

type Entrada = Record<string, unknown>;

const MAX = 90;

function texto(v: unknown): string {
	return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
}

/** Corta no tamanho, com reticências. */
export function cortar(t: string, max = MAX): string {
	return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

/** Só o nome do arquivo, sem a pasta. */
function arquivo(v: unknown): string {
	const t = texto(v);
	if (!t) return 'um arquivo';
	const partes = t.split('/').filter(Boolean);
	return partes[partes.length - 1] ?? t;
}

function host(v: unknown): string {
	try {
		return new URL(texto(v)).hostname.replace(/^www\./, '');
	} catch {
		return 'uma página';
	}
}

/** Conectores do claude.ai e o que eles são no jogo. */
const CONECTORES: [RegExp, string, Icone][] = [
	[/figma/i, 'No Figma', 'figma'],
	[/canva/i, 'No Canva', 'canva'],
	[/gmail/i, 'No Gmail', 'email'],
	[/google_drive|drive/i, 'No Google Drive', 'drive'],
	[/elevenlabs/i, 'No ElevenLabs', 'audio'],
	[/adobe/i, 'Na Adobe', 'adobe'],
	[/claude_docs/i, 'Num documento', 'escrever']
];

/** "mcp__claude_ai_Figma__get_screenshot" → "get screenshot". */
function acaoDoMcp(nome: string): string {
	const partes = nome.split('__');
	return (partes[partes.length - 1] ?? '').replace(/[_-]+/g, ' ').trim();
}

/** O rótulo e o ícone de uma ferramenta usada pelo agente. */
export function passoDaFerramenta(nome: string, entrada: Entrada | null | undefined): Passo {
	const e = entrada ?? {};
	switch (nome) {
		case 'Read':
			return { rotulo: cortar(`Lendo ${arquivo(e.file_path)}`), icone: 'ler' };
		case 'Write':
			return { rotulo: cortar(`Criando ${arquivo(e.file_path)}`), icone: 'escrever' };
		case 'Edit':
		case 'MultiEdit':
			return { rotulo: cortar(`Editando ${arquivo(e.file_path)}`), icone: 'escrever' };
		case 'NotebookEdit':
			return { rotulo: cortar(`Editando ${arquivo(e.notebook_path)}`), icone: 'escrever' };
		case 'Bash':
		case 'PowerShell': {
			const d = texto(e.description);
			return { rotulo: cortar(`No terminal: ${d || texto(e.command) || 'comando'}`), icone: 'terminal' };
		}
		case 'Grep':
			return { rotulo: cortar(`Procurando "${texto(e.pattern)}"`), icone: 'procurar' };
		case 'Glob':
			return { rotulo: cortar(`Procurando arquivos ${texto(e.pattern)}`), icone: 'procurar' };
		case 'WebSearch':
			return { rotulo: cortar(`Pesquisando: ${texto(e.query)}`), icone: 'web' };
		case 'WebFetch':
			return { rotulo: cortar(`Lendo ${host(e.url)}`), icone: 'web' };
		case 'Skill':
			return { rotulo: cortar(`Usando a skill ${texto(e.skill) || texto(e.name) || ''}`.trim()), icone: 'skill' };
		case 'Task':
		case 'Agent':
			return { rotulo: cortar(`Chamou um ajudante: ${texto(e.description) || 'tarefa paralela'}`), icone: 'ajudante' };
		case 'TodoWrite':
		case 'TaskCreate':
		case 'TaskUpdate':
			return { rotulo: 'Organizando a lista do que falta', icone: 'lista' };
		case 'AskUserQuestion':
			return { rotulo: 'Fazendo uma pergunta', icone: 'pergunta' };
		case 'ToolSearch':
			return { rotulo: 'Procurando a ferramenta certa', icone: 'procurar' };
	}
	if (nome.startsWith('mcp__')) {
		const acao = acaoDoMcp(nome);
		for (const [re, onde, icone] of CONECTORES) {
			if (re.test(nome)) return { rotulo: cortar(acao ? `${onde}: ${acao}` : onde), icone };
		}
		const servidor = (nome.split('__')[1] ?? '').replace(/^claude_ai_/, '').replace(/[_-]+/g, ' ');
		return { rotulo: cortar(`${servidor || 'Conector'}: ${acao}`), icone: 'ferramenta' };
	}
	return { rotulo: cortar(`Usando ${nome}`), icone: 'ferramenta' };
}

/**
 * O que o agente quer fazer, para o cartão de permissão no jogo: o comando,
 * o arquivo (com o começo do texto novo), o endereço ou a entrada do conector.
 */
export function resumoDoPedido(nome: string, entrada: Entrada | null | undefined, max = 1200): string {
	const e = entrada ?? {};
	const corpo = (() => {
		switch (nome) {
			case 'Bash':
			case 'PowerShell':
				return String(e.command ?? '');
			case 'Write':
				return `${String(e.file_path ?? '')}\n\n${String(e.content ?? '')}`;
			case 'Edit':
			case 'MultiEdit':
				return `${String(e.file_path ?? '')}\n\n${String(e.new_string ?? '')}`;
			case 'WebFetch':
				return String(e.url ?? '');
			default:
				try {
					return JSON.stringify(e, null, 2);
				} catch {
					return '';
				}
		}
	})();
	return corpo.length > max ? corpo.slice(0, max - 1) + '…' : corpo;
}
