import { describe, expect, it } from 'vitest';
import {
	argumentosDoClaude,
	maisNovo,
	mensagemParaOAgente,
	nomeDaSessao,
	PEDIR_LICENCA_NA_EQUIPE,
	preambulo,
	resolverPasta,
	respostaParaOClaude,
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
	it('agente de equipe com editar pede licença para publicar e mexer na ponte; o assessor não muda', () => {
		const dev = argumentosDoClaude(agente({ id: 'smith', equipe: 'dev', autonomia: 'editar' }), o);
		expect(valor(dev, '--permission-mode')).toBe('acceptEdits');
		const ask: string[] = JSON.parse(valor(dev, '--settings')).permissions.ask;
		expect(ask).toEqual(PEDIR_LICENCA_NA_EQUIPE);
		for (const r of ['Bash(git push:*)', 'Bash(npx -y vercel@latest:*)', 'Bash(node dunamisspace/ponte/instalar.mjs)']) expect(ask).toContain(r);
		// O --status é leitura e continua sem pedir
		expect(ask.some((r) => r.includes('--status'))).toBe(false);
		// Sem equipe (o assessor) e com equipe vazia: igual a antes
		expect(argumentosDoClaude(agente(), o)).not.toContain('--settings');
		expect(argumentosDoClaude(agente({ equipe: '  ' }), o)).not.toContain('--settings');
		// perguntar já pede para todo o terminal; livre é decisão do CEO
		expect(JSON.parse(valor(argumentosDoClaude(agente({ equipe: 'dev', autonomia: 'perguntar' }), o), '--settings')).permissions.ask).toEqual(['Bash', 'PowerShell']);
		expect(argumentosDoClaude(agente({ equipe: 'dev', autonomia: 'livre' }), o)).not.toContain('--settings');
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
			'- Antes de publicar, mandar algo para fora (e-mail, WhatsApp, post), gastar dinheiro ou apagar arquivo, pergunte pelo AskUserQuestion, a não ser que as instruções abaixo liberem.',
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
