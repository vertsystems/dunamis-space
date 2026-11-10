import { describe, expect, it } from 'vitest';
import { argumentosDoClaude, maisNovo, mensagemParaOAgente, nomeDaSessao, preambulo, resolverPasta, respostaParaOClaude, type AgenteDaPonte } from './ponte';
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
