import { describe, expect, it } from 'vitest';
import {
	argumentosDoClaude,
	maisNovo,
	mensagemParaOAgente,
	modeloDaSessao,
	nomeDaSessao,
	pastasDaBase,
	LIBERADO_SEM_PEDIR,
	PEDIR_LICENCA,
	preambulo,
	resolverPasta,
	respostaParaOClaude,
	tituloDoClaudeMd,
	tokensDoContexto,
	type AgenteDaPonte
} from './ponte';
import { passoDaFerramenta, resumoDoPedido } from './passos';

const agente = (extra: Partial<AgenteDaPonte> = {}): AgenteDaPonte => ({
	id: 'assessor',
	nome: 'Assessor',
	cargo: 'Assessor do CEO',
	pasta: 'dunamiscompany',
	instrucoes: 'Seja breve.',
	autonomia: 'editar',
	modelo: null,
	esforco: null,
	...extra
});

const BASE = '/Users/bruno/Drive/VERT SYS';

describe('resolverPasta', () => {
	it('monta a pasta dentro da base', () => {
		expect(resolverPasta(BASE, 'dunamiscompany')).toBe(`${BASE}/dunamiscompany`);
		expect(resolverPasta(BASE, 'dunamiscompany/dunamisspace/')).toBe(`${BASE}/dunamiscompany/dunamisspace`);
	});
	it('recusa sair da base, caminho absoluto e vazio', () => {
		expect(() => resolverPasta(BASE, '../outra')).toThrow();
		expect(() => resolverPasta(BASE, 'dunamiscompany/../../x')).toThrow();
		expect(() => resolverPasta(BASE, '/etc')).toThrow();
		expect(() => resolverPasta(BASE, '  ')).toThrow();
	});
});

describe('argumentosDoClaude', () => {
	const o = { sessao: '11111111-2222-3333-4444-555555555555', retomar: false, nome: 'DGathe · Assessor · x', preambulo: 'P' };
	const valor = (args: string[], flag: string) => args[args.indexOf(flag) + 1];

	it('manda as permissões para a ponte e fixa a sessão', () => {
		const a = argumentosDoClaude(agente(), o);
		expect(valor(a, '--permission-prompt-tool')).toBe('stdio');
		expect(valor(a, '--input-format')).toBe('stream-json');
		expect(valor(a, '--session-id')).toBe(o.sessao);
		expect(a).not.toContain('--resume');
		expect(valor(a, '--append-system-prompt')).toBe('P');
	});
	it('retoma a mesma conversa', () => {
		const a = argumentosDoClaude(agente(), { ...o, retomar: true });
		expect(valor(a, '--resume')).toBe(o.sessao);
		expect(a).not.toContain('--session-id');
	});
	it('troca o modo de permissão conforme a autonomia', () => {
		expect(valor(argumentosDoClaude(agente({ autonomia: 'editar' }), o), '--permission-mode')).toBe('acceptEdits');
		expect(valor(argumentosDoClaude(agente({ autonomia: 'livre' }), o), '--permission-mode')).toBe('bypassPermissions');
		const p = argumentosDoClaude(agente({ autonomia: 'perguntar' }), o);
		expect(valor(p, '--permission-mode')).toBe('default');
		// O terminal volta a pedir licença, mesmo liberado nas configurações do Mac
		expect(JSON.parse(valor(p, '--settings')).permissions.ask).toContain('Bash');
	});
	it('autonomia máxima (11/11/2026): editar libera commit, push, edição e as ferramentas ligadas; só a ponte e o que fala para fora pedem', () => {
		for (const a of [agente({ id: 'smith', equipe: 'dev', autonomia: 'editar' }), agente({ id: 'sun', equipe: 'diretoria', autonomia: 'editar' }), agente()]) {
			const args = argumentosDoClaude(a, o);
			expect(valor(args, '--permission-mode')).toBe('acceptEdits');
			const { allow, ask } = JSON.parse(valor(args, '--settings')).permissions as { allow: string[]; ask: string[] };
			expect(allow).toEqual(LIBERADO_SEM_PEDIR);
			expect(ask).toEqual(PEDIR_LICENCA);
		}
		// Publicar não pede mais licença
		expect(PEDIR_LICENCA.some((r) => /git push|vercel/.test(r))).toBe(false);
		// A ponte continua pedindo; o --status é leitura e continua livre
		expect(PEDIR_LICENCA).toContain('Bash(node dunamisspace/ponte/instalar.mjs)');
		expect(PEDIR_LICENCA.some((r) => r.includes('--status'))).toBe(false);
		// Mandar e-mail e compartilhar arquivo pedem; ler o Gmail e o Drive não
		for (const r of ['mcp__claude_ai_Gmail__send_message', 'mcp__claude_ai_Google_Drive__share_file']) expect(PEDIR_LICENCA).toContain(r);
		for (const r of ['mcp__claude_ai_Gmail', 'mcp__claude_ai_Google_Drive', 'Write', 'WebFetch']) expect(LIBERADO_SEM_PEDIR).toContain(r);
		// Toda regra de pedir dentro de um servidor liberado é de uma ferramenta só
		for (const r of PEDIR_LICENCA.filter((x) => x.startsWith('mcp__'))) expect(r.split('__')).toHaveLength(3);
		// perguntar já pede para todo o terminal; livre é decisão do CEO
		expect(JSON.parse(valor(argumentosDoClaude(agente({ equipe: 'dev', autonomia: 'perguntar' }), o), '--settings')).permissions.ask).toEqual(['Bash', 'PowerShell']);
		expect(argumentosDoClaude(agente({ equipe: 'dev', autonomia: 'livre' }), o)).not.toContain('--settings');
	});
	it('a VERT SYS inteira entra como diretório extra, logo antes de outra opção (11/11/2026)', () => {
		const a = argumentosDoClaude(agente(), { ...o, base: BASE });
		expect(valor(a, '--add-dir')).toBe(BASE);
		expect(a[a.indexOf('--add-dir') + 2]).toMatch(/^--/);
		expect(argumentosDoClaude(agente(), o)).not.toContain('--add-dir');
	});
	it('só passa modelo e esforço quando o agente tem', () => {
		expect(argumentosDoClaude(agente(), o)).not.toContain('--model');
		const a = argumentosDoClaude(agente({ modelo: 'sonnet', esforco: 'medium' }), o);
		expect(valor(a, '--model')).toBe('sonnet');
		expect(valor(a, '--effort')).toBe('medium');
	});
});

describe('preambulo e mensagens', () => {
	it('diz quem é o agente, quem pediu e junta as instruções dele', () => {
		const p = preambulo(agente(), { criada_por_nome: 'Bruno Santana' });
		expect(p).toContain('Você é Assessor, Assessor do CEO');
		expect(p).toContain('Bruno Santana');
		expect(p).toContain('AskUserQuestion');
		expect(p).toContain('## Suas instruções\nSeja breve.');
		expect(preambulo(agente({ instrucoes: '  ' }), { criada_por_nome: '' })).not.toContain('Suas instruções');
	});
	it('junta as mensagens do jogo com o nome de quem mandou', () => {
		const t = mensagemParaOAgente([
			{ autor_nome: 'Bruno', conteudo: 'Use o laranja.' },
			{ autor_nome: null, conteudo: 'E o logo novo.' }
		]);
		expect(t).toContain('Mensagem de Bruno pelo DGathe:\n\nUse o laranja.');
		expect(t).toContain('Mensagem de alguém da equipe pelo DGathe');
	});
	it('nome da sessão curto', () => {
		expect(nomeDaSessao(agente(), { titulo: 'x'.repeat(100) }).length).toBeLessThan(90);
	});
	it('o retorno da equipe passa como está, sem o "Mensagem de"', () => {
		const t = mensagemParaOAgente([
			{ autor_nome: 'Equipe', conteudo: 'Retorno da equipe (rodada 1): 1 subtarefa terminou.' },
			{ autor_nome: 'Bruno', conteudo: 'E capricha.' }
		]);
		expect(t).toBe('Retorno da equipe (rodada 1): 1 subtarefa terminou.\n\n---\n\nMensagem de Bruno pelo DGathe:\n\nE capricha.');
	});
});

describe('preambulo das equipes', () => {
	const membros = [
		{ id: 'lewis', nome: 'Lewis', cargo: 'Gerente de Desenvolvimento e IA', lider: true },
		{ id: 'clovis', nome: 'Clovis', cargo: 'Analista de Sistemas', lider: false },
		{ id: 'shakira', nome: 'Shakira', cargo: 'Designer UX/UI', lider: false }
	];
	const lewis = agente({ id: 'lewis', nome: 'Lewis', cargo: 'Gerente de Desenvolvimento e IA', equipe: 'dev', lider: true, instrucoes: 'Manual do Lewis.' });
	const clovis = agente({ id: 'clovis', nome: 'Clovis', cargo: 'Analista de Sistemas', equipe: 'dev', lider: false, instrucoes: 'Manual do Clovis.' });

	it('sem equipe, igual ao de antes das equipes (o assessor não muda; desde 10/11/2026, com o nome Bandoletes)', () => {
		const antes = [
			'## Você está no DGathe',
			'Você é Assessor, Assessor do CEO da Dunamis Company, e trabalha pelo DGathe (o escritório da Dunamis em forma de jogo, dentro do dspace). Quem passou esta tarefa: Bruno Santana.',
			'- Na Dunamis, os agentes de IA do DGathe, como você, são chamados de Bandoletes: use esse nome ao falar de você ou dos colegas com a equipe.',
			'- Ninguém acompanha este terminal. Seus textos e passos aparecem no painel do jogo, e a pessoa responde por lá.',
			'- Precisou de uma decisão ou de um dado que não tem? Pergunte com a ferramenta AskUserQuestion: a pergunta aparece no jogo e você espera a resposta. Não termine com pergunta solta no texto quando der para perguntar assim.',
			'- Autonomia máxima: faça o trabalho inteiro sem pedir licença, inclusive commit e push nos sistemas. Pergunte pelo AskUserQuestion só antes de gastar dinheiro, falar em nome da Dunamis ou de um cliente para fora (e-mail, WhatsApp, post), mexer em dinheiro, apagar o que não tem volta (dado do banco de produção, limpeza ampla), mexer em senha ou acesso, criar ou mudar Bandolete, ou numa dúvida de verdade (do negócio, que só o CEO resolve, ou técnica difícil, em que errar custa caro).',
			'- Ao terminar, responda em português, em poucas linhas: o que fez, o caminho de cada arquivo criado ou alterado e o que ficou pendente.',
			'',
			'## Suas instruções',
			'Seja breve.'
		].join('\n');
		expect(preambulo(agente(), { criada_por_nome: 'Bruno Santana' })).toBe(antes);
		// Mesmo com o contexto e equipe nula
		expect(preambulo(agente({ equipe: null, lider: false }), { criada_por_nome: 'Bruno Santana', pai_id: null }, { membros, pai: null })).toBe(antes);
	});

	it('líder: como delegar, os limites e a equipe sem ele mesmo, antes das instruções', () => {
		const p = preambulo(lewis, { criada_por_nome: 'Bruno Santana', pai_id: null }, { membros, pai: null });
		expect(p).toContain('\n\n## Você lidera a equipe "dev"\nVocê coordena: planeja, distribui para os especialistas certos, revisa e presta contas ao CEO. Quem executa é a equipe.');
		// O comando com o PEDIDO na coluna 1 (senão o heredoc não fecha)
		expect(p).toContain(`\nnode "$DGATHE_EQUIPE" delegar <id> --titulo "Título curto" <<'PEDIDO'\nObjetivo, contexto, arquivos e pastas, critérios de aceitação e o que entregar.\nPEDIDO\n`);
		expect(p).toContain('Não fique esperando nem consultando em laço');
		expect(p).toContain('node "$DGATHE_EQUIPE" estado mostra as subtarefas desta tarefa');
		expect(p).toContain('- Limites: 12 subtarefas abertas por vez e 6 rodadas de delegação por tarefa.');
		expect(p).toContain('Sua equipe agora:\n- clovis: Clovis, Analista de Sistemas\n- shakira: Shakira, Designer UX/UI\n\n## Suas instruções\nManual do Lewis.');
		expect(p).not.toContain('- lewis: Lewis');
		expect(p.indexOf('## Você lidera')).toBeGreaterThan(p.indexOf('- Ao terminar'));
	});

	it('líder sem a leitura da equipe: sai sem a lista', () => {
		const p = preambulo(lewis, { criada_por_nome: 'Bruno Santana' });
		expect(p).toContain('## Você lidera a equipe "dev"');
		expect(p).not.toContain('Sua equipe agora');
	});

	it('especialista numa subtarefa: veio de Lewis, dentro do projeto, entrega para ele', () => {
		const p = preambulo(clovis, { criada_por_nome: 'Lewis', pai_id: 'p1' }, { membros, pai: { titulo: 'Agenda de reuniões no dspace', lider: 'Lewis' } });
		expect(p).toContain(
			[
				'## Você é da equipe "dev"',
				'Esta tarefa veio de Lewis, líder da equipe, dentro do projeto "Agenda de reuniões no dspace".',
				'- O seu texto final volta para Lewis, que revisa antes de levar ao CEO. Entregue o que fez, as evidências (testes e comandos rodados com o resultado, caminhos dos arquivos) e o que ficou pendente.',
				'- Você não delega. Se precisar de outro especialista, diga no texto final quem e para quê: Lewis decide.',
				'- Perguntas e pedidos de licença continuam indo ao CEO pelo jogo (AskUserQuestion).',
				'',
				'## Suas instruções',
				'Manual do Clovis.'
			].join('\n')
		);
		expect(p).not.toContain('delegar <id>');
	});

	it('especialista numa subtarefa sem a leitura do projeto: o líder genérico', () => {
		const p = preambulo(clovis, { criada_por_nome: 'Lewis', pai_id: 'p1' });
		expect(p).toContain('Esta tarefa veio do líder da equipe.');
		expect(p).toContain('O seu texto final volta para o líder, que revisa');
	});

	it('especialista com tarefa direta do CEO', () => {
		const p = preambulo(clovis, { criada_por_nome: 'Bruno Santana', pai_id: null }, { membros, pai: null });
		expect(p).toContain(
			'## Você é da equipe "dev"\nEsta tarefa veio direto de Bruno Santana. Se ela pedir outro especialista, diga no texto final: quem distribui o trabalho é Lewis, líder da equipe.\n\n## Suas instruções'
		);
		expect(preambulo(clovis, { criada_por_nome: '' })).toContain(
			'Esta tarefa veio direto de alguém da equipe. Se ela pedir outro especialista, diga no texto final: quem distribui o trabalho é o líder da equipe.'
		);
	});
});

describe('respostaParaOClaude', () => {
	const entrada = { command: 'npm test' };
	it('libera a permissão com a mesma entrada', () => {
		expect(respostaParaOClaude({ tipo: 'permissao', entrada }, { permitir: true }, 'Bruno')).toEqual({ behavior: 'allow', updatedInput: entrada });
	});
	it('nega com o motivo e o nome', () => {
		const r = respostaParaOClaude({ tipo: 'permissao', entrada }, { permitir: false, motivo: 'agora não' }, 'Aline');
		expect(r).toEqual({ behavior: 'deny', message: 'Aline negou pelo DGathe: agora não' });
		expect(respostaParaOClaude({ tipo: 'permissao', entrada }, {}, null).behavior).toBe('deny');
	});
	it('pergunta: junta as respostas (várias escolhas viram texto)', () => {
		const q = { questions: [{ question: 'Qual cor?' }] };
		const r = respostaParaOClaude({ tipo: 'pergunta', entrada: q }, { respostas: { 'Qual cor?': ['Azul', 'Verde'] } }, 'Bruno');
		expect(r).toEqual({ behavior: 'allow', updatedInput: { ...q, answers: { 'Qual cor?': 'Azul, Verde' } } });
		expect(respostaParaOClaude({ tipo: 'pergunta', entrada: q }, { respostas: { 'Qual cor?': '  ' } }, 'Bruno').behavior).toBe('deny');
	});
});

describe('maisNovo', () => {
	it('escolhe a versão mais alta, não a última da lista', () => {
		expect(
			maisNovo([
				'/x/anthropic.claude-code-2.1.318-darwin-arm64/claude',
				'/y/claude-code/2.1.321/abc/claude',
				'/x/anthropic.claude-code-2.1.99-darwin-arm64/claude'
			])
		).toBe('/y/claude-code/2.1.321/abc/claude');
		expect(maisNovo([])).toBeNull();
	});
});

describe('passoDaFerramenta', () => {
	it('frases curtas por ferramenta', () => {
		expect(passoDaFerramenta('Read', { file_path: '/a/b/proposta.md' })).toEqual({ rotulo: 'Lendo proposta.md', icone: 'ler' });
		expect(passoDaFerramenta('Edit', { file_path: 'src/mapa.ts' }).rotulo).toBe('Editando mapa.ts');
		expect(passoDaFerramenta('Bash', { command: 'npm test', description: 'Roda os testes' }).rotulo).toBe('No terminal: Roda os testes');
		expect(passoDaFerramenta('Bash', { command: 'ls -la' }).rotulo).toBe('No terminal: ls -la');
		expect(passoDaFerramenta('WebFetch', { url: 'https://www.dunamis.com.br/x' }).rotulo).toBe('Lendo dunamis.com.br');
		expect(passoDaFerramenta('Skill', { skill: 'carrossel' }).rotulo).toBe('Usando a skill carrossel');
		expect(passoDaFerramenta('AskUserQuestion', {}).icone).toBe('pergunta');
	});
	it('o líder falando com a equipe sai em português', () => {
		const d = passoDaFerramenta('Bash', { command: 'node "$DGATHE_EQUIPE" delegar clovis --titulo "Levantar requisitos" <<\'PEDIDO\'\nx\nPEDIDO', description: 'Run delegation command' });
		expect(d).toEqual({ rotulo: 'Passando para clovis: Levantar requisitos', icone: 'ajudante' });
		expect(passoDaFerramenta('Bash', { command: 'node "$DGATHE_EQUIPE" estado', description: 'Check status' }).rotulo).toBe('Conferindo como a equipe está');
		expect(passoDaFerramenta('Bash', { command: 'node "$DGATHE_EQUIPE" equipe' }).rotulo).toBe('Vendo quem da equipe está livre');
		expect(passoDaFerramenta('Bash', { command: 'ls', description: 'Lista' }).rotulo).toBe('No terminal: Lista');
	});
	it('conectores pelo nome do serviço', () => {
		expect(passoDaFerramenta('mcp__claude_ai_Figma__get_screenshot', {})).toEqual({ rotulo: 'No Figma: get screenshot', icone: 'figma' });
		expect(passoDaFerramenta('mcp__claude_ai_Gmail__send_message', {}).icone).toBe('email');
		expect(passoDaFerramenta('mcp__meu-servidor__fazer_coisa', {}).rotulo).toBe('meu servidor: fazer coisa');
	});
	it('corta frase longa e aguenta entrada vazia', () => {
		expect(passoDaFerramenta('Bash', { command: 'x'.repeat(300) }).rotulo.length).toBeLessThanOrEqual(90);
		expect(passoDaFerramenta('Read', null).rotulo).toBe('Lendo um arquivo');
		expect(passoDaFerramenta('Desconhecida', {}).rotulo).toBe('Usando Desconhecida');
	});
	it('resumo do pedido mostra o comando ou o arquivo', () => {
		expect(resumoDoPedido('Bash', { command: 'git push' })).toBe('git push');
		expect(resumoDoPedido('Write', { file_path: 'a.md', content: 'oi' })).toBe('a.md\n\noi');
		expect(resumoDoPedido('Bash', { command: 'y'.repeat(5000) }).length).toBeLessThanOrEqual(1200);
	});
});

describe('tokens e modelo da sessão (mapa dos Bandoletes)', () => {
	it('soma entrada, cache e saída como o Claude Code', () => {
		expect(
			tokensDoContexto({ input_tokens: 12, cache_read_input_tokens: 180_000, cache_creation_input_tokens: 1_200, output_tokens: 340 })
		).toBe(181_552);
	});
	it('sem usage, campo estranho ou tudo zero não apaga o último valor', () => {
		expect(tokensDoContexto(undefined)).toBeNull();
		expect(tokensDoContexto('x')).toBeNull();
		expect(tokensDoContexto({ input_tokens: 0, output_tokens: 0 })).toBeNull();
		expect(tokensDoContexto({ input_tokens: -5, output_tokens: 'muito' })).toBeNull();
		expect(tokensDoContexto({ input_tokens: 10 })).toBe(10);
	});
	it('o modelo vem do início da sessão; mensagem sintética fica de fora', () => {
		expect(modeloDaSessao('claude-opus-5-5')).toBe('claude-opus-5-5');
		expect(modeloDaSessao('claude-opus-5-5[1m]')).toBe('claude-opus-5-5[1m]');
		expect(modeloDaSessao('<synthetic>')).toBeNull();
		expect(modeloDaSessao('')).toBeNull();
		expect(modeloDaSessao(42)).toBeNull();
		expect(modeloDaSessao('a'.repeat(80))).toBeNull();
	});
});

describe('a VERT SYS no preâmbulo (11/11/2026)', () => {
	const base = { caminho: BASE, pastas: [{ pasta: 'dunamiscompany', titulo: 'Dunamis Company — Contex OS' }, { pasta: 'designapps', titulo: null }] };
	it('diz onde está, como andar e lista as pastas, antes das instruções', () => {
		const p = preambulo(agente(), { criada_por_nome: 'Bruno Santana' }, undefined, base);
		expect(p).toContain(`## A pasta VERT SYS\nVocê enxerga e edita a pasta VERT SYS inteira (${BASE})`);
		expect(p).toContain('A sua pasta de trabalho continua sendo dunamiscompany.');
		expect(p).toContain('leia o CLAUDE.md e a _memoria/ da pasta dele');
		expect(p).toContain('As pastas de agora:\n- dunamiscompany: Dunamis Company — Contex OS\n- designapps: sem CLAUDE.md\n\n## Suas instruções');
	});
	it('sem a base, o preâmbulo fica como antes', () => {
		expect(preambulo(agente(), { criada_por_nome: 'Bruno Santana' })).not.toContain('VERT SYS');
	});
	it('título do CLAUDE.md e as pastas que entram', () => {
		expect(tituloDoClaudeMd('# Lojas Mari — Contex OS\n\ntexto')).toBe('Lojas Mari — Contex OS');
		expect(tituloDoClaudeMd('intro\n## sub\n#   Título  \n')).toBe('Título');
		expect(tituloDoClaudeMd('# \n')).toBeNull();
		expect(tituloDoClaudeMd(null)).toBeNull();
		expect(tituloDoClaudeMd('# ' + 'x'.repeat(150))?.length).toBe(100);
		expect(pastasDaBase(['vertsystems', '#off', '.vscode', 'alinesantana', 'dunamiscompany'])).toEqual(['alinesantana', 'dunamiscompany', 'vertsystems']);
	});
});

describe('preâmbulo da diretoria (11/11/2026)', () => {
	const sun = agente({ id: 'sun', nome: 'Sun', cargo: 'Diretor Estratégico', equipe: 'diretoria', lider: false, instrucoes: 'Manual do Sun.' });
	const ctx = {
		membros: [
			{ id: 'sun', nome: 'Sun', cargo: 'Diretor Estratégico', lider: false },
			{ id: 'pep', nome: 'Pep', cargo: 'Diretor Tático', lider: false }
		],
		pai: null,
		gerentes: [{ id: 'lewis', nome: 'Lewis', cargo: 'Gerente de Desenvolvimento e IA', equipe: 'dev' }]
	};
	it('o diretor aprende a delegar aos gerentes e vê quem são', () => {
		const p = preambulo(sun, { criada_por_nome: 'Bruno Santana', pai_id: null }, ctx);
		expect(p).toContain('## Você é da Diretoria');
		expect(p).toContain(`\nnode "$DGATHE_EQUIPE" delegar <id-do-gerente> --titulo "Título curto" <<'PEDIDO'\nObjetivo, contexto, arquivos e pastas, critérios de aceitação e o que entregar.\nPEDIDO\n`);
		expect(p).toContain('Gerentes agora:\n- lewis: Lewis, Gerente de Desenvolvimento e IA (equipe dev)\nOs outros diretores:\n- pep: Pep, Diretor Tático\n\n## Suas instruções\nManual do Sun.');
		expect(p).not.toContain('Você é da equipe "diretoria"');
		expect(p).not.toContain('- sun: Sun');
	});
	it('sem gerente ativo, diz o que fazer', () => {
		expect(preambulo(sun, { criada_por_nome: 'Bruno Santana', pai_id: null }, { ...ctx, gerentes: [] })).toContain('- (nenhum gerente ativo');
	});
	it('o gerente que recebeu de um diretor sabe para quem volta', () => {
		const lewis = agente({ id: 'lewis', nome: 'Lewis', cargo: 'Gerente de Desenvolvimento e IA', equipe: 'dev', lider: true });
		const p = preambulo(
			lewis,
			{ criada_por_nome: 'Sun', pai_id: 'p1' },
			{ membros: [{ id: 'lewis', nome: 'Lewis', cargo: 'Gerente', lider: true }], pai: { titulo: 'Plano do trimestre', lider: 'Sun', diretor: true } }
		);
		expect(p).toContain(
			'## Você lidera a equipe "dev"\nEsta tarefa veio de Sun, da Diretoria, dentro do pedido "Plano do trimestre". Distribua para a sua equipe como sempre; o seu texto final volta para Sun, que revisa antes de levar ao CEO.\nVocê coordena: planeja, distribui para os especialistas certos, revisa e presta contas a Sun.'
		);
		// Tarefa direta do CEO: igual a antes
		expect(preambulo(lewis, { criada_por_nome: 'Bruno Santana', pai_id: null }, { membros: [], pai: null })).toContain('presta contas ao CEO');
	});
});
