import { describe, expect, it } from 'vitest';
import {
	duracaoAgora,
	duracaoCurta,
	estadoDoNo,
	estadoDoProjeto,
	lerFluxo,
	montarProjetos,
	nomeDoModelo,
	resumoDoMapa,
	tokensCurtos,
	type NoDoFluxo
} from './fluxo';

/** Uma linha como dgathe_mapa devolve (migration 0109). */
function linha(id: string, extra: Record<string, unknown> = {}) {
	return {
		id,
		pai_id: null,
		agente_id: 'lewis',
		agente_nome: 'Lewis',
		agente_cargo: 'Gerente',
		titulo: `Tarefa ${id}`,
		status: 'trabalhando',
		atividade: null,
		criada_por_nome: 'Bruno Santana',
		resumo: null,
		erro: null,
		passos: 3,
		tokens: 1000,
		modelo: 'claude-opus-5-5',
		pedidos: 0,
		duracao: 60,
		criada_ha: 60,
		terminada_ha: null,
		...extra
	};
}
const ler = (...linhas: Record<string, unknown>[]) => lerFluxo({ tarefas: linhas }) as NoDoFluxo[];

describe('lerFluxo', () => {
	it('lê a árvore e deixa de fora o que não reconhece', () => {
		const nos = ler(linha('a'), linha('b', { status: 'inventado' }), linha('', {}), linha('c', { agente_id: '' }));
		expect(nos.map((n) => n.id)).toEqual(['a']);
		expect(nos[0]).toMatchObject({ agenteNome: 'Lewis', tokens: 1000, modelo: 'claude-opus-5-5', passos: 3, criadaPor: 'Bruno Santana' });
	});
	it('sem permissão ou resposta estranha: null', () => {
		expect(lerFluxo(null)).toBeNull();
		expect(lerFluxo({})).toBeNull();
		expect(lerFluxo('x')).toBeNull();
	});
	it('tokens zerados ou ausentes viram null; número em texto vale', () => {
		const [a, b, c] = ler(linha('a', { tokens: 0 }), linha('b', { tokens: null }), linha('c', { tokens: '2500', duracao: '12.5' }));
		expect(a.tokens).toBeNull();
		expect(b.tokens).toBeNull();
		expect(c.tokens).toBe(2500);
		expect(c.duracao).toBe(12.5);
	});
});

describe('estadoDoNo', () => {
	it('quem espera resposta vem antes de tudo', () => {
		expect(estadoDoNo({ status: 'esperando', pedidos: 0 })).toBe('precisa');
		expect(estadoDoNo({ status: 'trabalhando', pedidos: 1 })).toBe('precisa');
		expect(estadoDoNo({ status: 'concluida', pedidos: 1 })).toBe('concluida');
	});
	it('cada status no seu ponto', () => {
		expect(estadoDoNo({ status: 'trabalhando', pedidos: 0 })).toBe('trabalhando');
		expect(estadoDoNo({ status: 'aguardando', pedidos: 0 })).toBe('aguardando');
		expect(estadoDoNo({ status: 'fila', pedidos: 0 })).toBe('fila');
		expect(estadoDoNo({ status: 'falhou', pedidos: 0 })).toBe('falhou');
		expect(estadoDoNo({ status: 'cancelada', pedidos: 0 })).toBe('parada');
	});
});

describe('montarProjetos', () => {
	const nos = ler(
		linha('velho', { status: 'concluida', terminada_ha: 7000, criada_ha: 7200 }),
		linha('recente', { status: 'concluida', terminada_ha: 100, criada_ha: 400 }),
		linha('lider', { status: 'aguardando', criada_ha: 700 }),
		linha('steve', { pai_id: 'lider', agente_id: 'steve', agente_nome: 'Steve', criada_ha: 450 }),
		linha('shakira', { pai_id: 'lider', agente_id: 'shakira', agente_nome: 'Shakira', criada_ha: 500, status: 'concluida', terminada_ha: 20 }),
		linha('wagner', { agente_id: 'assessor', agente_nome: 'Wagner', criada_ha: 30 }),
		linha('orfa', { pai_id: 'sumiu', agente_id: 'jackie', criada_ha: 10, status: 'fila' })
	);
	const { abertos, terminados } = montarProjetos(nos);

	it('separa abertos e terminados, a equipe embaixo do líder na ordem em que foi chamada', () => {
		expect(abertos.map((p) => p.raiz.id)).toEqual(['orfa', 'wagner', 'lider']);
		expect(abertos[2].equipe.map((n) => n.id)).toEqual(['shakira', 'steve']);
		expect(terminados.map((p) => p.raiz.id)).toEqual(['recente', 'velho']);
	});
	it('líder terminado com alguém da equipe ainda rodando continua aberto', () => {
		const r = montarProjetos(ler(linha('l', { status: 'concluida', terminada_ha: 5 }), linha('s', { pai_id: 'l', agente_id: 'steve' })));
		expect(r.abertos.map((p) => p.raiz.id)).toEqual(['l']);
	});
	it('quem precisa de você sobe para o topo', () => {
		const r = montarProjetos(
			ler(
				linha('a', { criada_ha: 5 }),
				linha('b', { status: 'aguardando', criada_ha: 900 }),
				linha('b1', { pai_id: 'b', agente_id: 'steve', status: 'esperando' })
			)
		);
		expect(r.abertos.map((p) => p.raiz.id)).toEqual(['b', 'a']);
		expect(estadoDoProjeto(r.abertos[0])).toBe('precisa');
	});
});

describe('textos dos cartões', () => {
	it('duração curta como no Claude Code', () => {
		expect(duracaoCurta(0)).toBe('0s');
		expect(duracaoCurta(42.9)).toBe('42s');
		expect(duracaoCurta(447)).toBe('7m 27s');
		expect(duracaoCurta(3900)).toBe('1h 05m');
		expect(duracaoCurta(2 * 86400 + 3 * 3600 + 60)).toBe('2d 3h');
	});
	it('o relógio só corre enquanto a tarefa está viva', () => {
		expect(duracaoAgora({ status: 'trabalhando', duracao: 100 }, 5)).toBe(105);
		expect(duracaoAgora({ status: 'aguardando', duracao: 100 }, 5)).toBe(105);
		expect(duracaoAgora({ status: 'concluida', duracao: 100 }, 5)).toBe(100);
		expect(duracaoAgora({ status: 'fila', duracao: 100 }, 5)).toBe(100);
	});
	it('tokens em português', () => {
		expect(tokensCurtos(820)).toBe('820');
		expect(tokensCurtos(197_300)).toBe('197,3 mil');
		expect(tokensCurtos(381_649)).toBe('381,6 mil');
		expect(tokensCurtos(999_960)).toBe('1,0 mi');
		expect(tokensCurtos(1_234_000)).toBe('1,2 mi');
	});
	it('nome do modelo', () => {
		expect(nomeDoModelo('claude-opus-5-5')).toBe('Opus 5.5');
		expect(nomeDoModelo('claude-opus-5-5[1m]')).toBe('Opus 5.5');
		expect(nomeDoModelo('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5');
		expect(nomeDoModelo('claude-fable-5-1')).toBe('Fable 5.1');
		expect(nomeDoModelo('claude-opus-4-20250514')).toBe('Opus 4');
		expect(nomeDoModelo('claude-3-5-haiku-20241022')).toBe('Haiku 3.5');
		expect(nomeDoModelo('modelo-x')).toBe('modelo-x');
		expect(nomeDoModelo(null)).toBeNull();
	});
	it('resumo do topo conta cada Bandolete uma vez', () => {
		const { abertos } = montarProjetos(
			ler(
				linha('l', { status: 'aguardando' }),
				linha('s1', { pai_id: 'l', agente_id: 'steve' }),
				linha('s2', { pai_id: 'l', agente_id: 'shakira', status: 'esperando' }),
				linha('s3', { pai_id: 'l', agente_id: 'jackie', status: 'concluida' }),
				linha('w', { agente_id: 'assessor' })
			)
		);
		expect(resumoDoMapa(abertos)).toBe('4 Bandoletes · 2 trabalhando · 1 precisa de você');
		expect(resumoDoMapa([])).toBe('Nenhum Bandolete trabalhando agora');
	});
});
