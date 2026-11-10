import { describe, expect, it } from 'vitest';
import { duracao, estadoDe, haQuanto, lerAgentes, lugaresDosAgentes, type Agente } from './agentes';
import { alvos } from './movimento';
import { APARENCIA_PADRAO } from './aparencia';
import { blocos, pedacos } from './texto';
import type { Pessoa } from './presenca';

const agente = (id: string, extra: Partial<Agente> = {}): Agente => ({
	id,
	nome: id,
	cargo: 'Gerente',
	sala: 'design',
	cadeira: 'Cadeira do gerente',
	aparencia: APARENCIA_PADRAO,
	ordem: 0,
	naFila: 0,
	pedidos: 0,
	tarefa: null,
	estado: 'livre',
	...extra
});

describe('lerAgentes', () => {
	it('lê o que o banco manda e calcula o estado', () => {
		const l = lerAgentes({
			pode: 'editar',
			ponte: { id: 'mac-bruno', visto_ha: 12, trabalhando: 1 },
			agentes: [
				{ id: 'assessor', nome: 'Assessor', cargo: 'Assessor do CEO', sala: 'diretoria', cadeira: 'Cadeira do assessor', ordem: 0, na_fila: 0, pedidos: 1, tarefa: { id: 't1', status: 'trabalhando', titulo: 'X', atividade: 'Lendo', desde: 30 } },
				{ id: 'sem-sala', nome: 'Y', sala: 'nao-existe' },
				{ id: 'livre', nome: 'Livre', sala: 'design', tarefa: null }
			]
		})!;
		expect(l.pode).toBe('editar');
		expect(l.ponte).toEqual({ ligada: true, vistaHa: 12, trabalhando: 1 });
		expect(l.agentes.map((a) => a.id)).toEqual(['assessor', 'livre']);
		// Pedido aberto vence o "trabalhando" da tarefa
		expect(l.agentes[0].estado).toBe('esperando');
		expect(l.agentes[1].estado).toBe('livre');
	});
	it('tarefa começando: trabalhando, com o que ele está fazendo', () => {
		const ag = (visto: number) =>
			lerAgentes({ ponte: { visto_ha: visto }, agentes: [{ id: 'x', nome: 'X', sala: 'design', tarefa: { id: 't', status: 'fila', titulo: 'T', atividade: null, desde: 2 } }] })!.agentes[0];
		expect(ag(5)).toMatchObject({ estado: 'trabalhando', tarefa: { atividade: 'Lendo o pedido' } });
		expect(ag(500)).toMatchObject({ estado: 'fila', tarefa: { atividade: null } });
	});
	it('ponte sem sinal recente está desligada; sem ponte nenhuma, também', () => {
		expect(lerAgentes({ ponte: { visto_ha: 400 }, agentes: [] })!.ponte.ligada).toBe(false);
		expect(lerAgentes({ ponte: null, agentes: [] })!.ponte).toEqual({ ligada: false, vistaHa: null, trabalhando: 0 });
		expect(lerAgentes({ agentes: [] })!.pode).toBe('nenhum');
		expect(lerAgentes(null)).toBeNull();
	});
	it('estado por status', () => {
		const t = (status: 'fila' | 'trabalhando' | 'esperando') => ({ id: null, status, titulo: null, atividade: null, desde: 0 });
		expect(estadoDe(null, 0)).toBe('livre');
		expect(estadoDe(t('fila'), 0)).toBe('fila');
		// Com a ponte ligada, a fila já aparece como trabalho (a espera de 15 s é só da ponte)
		expect(estadoDe(t('fila'), 0, true)).toBe('trabalhando');
		expect(estadoDe(t('trabalhando'), 0)).toBe('trabalhando');
		expect(estadoDe(t('esperando'), 0)).toBe('esperando');
	});
});

describe('lugaresDosAgentes', () => {
	it('trabalhando senta na cadeira dele; livre vai para a copa', () => {
		const { lugar, reservados } = lugaresDosAgentes([
			agente('design', { estado: 'trabalhando' }),
			agente('assessor', { sala: 'diretoria', cadeira: 'Cadeira do assessor', estado: 'esperando' }),
			agente('trafego', { sala: 'trafego' })
		]);
		expect(lugar.get('design')!.nome).toBe('Cadeira do gerente');
		expect(lugar.get('design')!.sala).toBe('design');
		expect(lugar.get('assessor')!.nome).toBe('Cadeira do assessor');
		expect(lugar.get('trafego')!.sala).toBe('copa');
		// A cadeira do Tráfego fica reservada mesmo com ele na copa
		expect([...reservados].some((id) => id.startsWith('trafego:'))).toBe(true);
	});
	it('copa lotada: o resto espera em pé, ninguém no mesmo lugar', () => {
		const lista = Array.from({ length: 9 }, (_, i) => agente(`a${i}`, { ordem: i }));
		const { lugar } = lugaresDosAgentes(lista);
		const ids = lista.map((a) => lugar.get(a.id)!.id);
		expect(new Set(ids).size).toBe(9);
		expect(lista.every((a) => lugar.get(a.id)!.sala === 'copa')).toBe(true);
		expect(lista.some((a) => !lugar.get(a.id)!.sentado)).toBe(true);
	});
	it('dois agentes na mesma sala não dividem a cadeira', () => {
		const { lugar } = lugaresDosAgentes([agente('x', { estado: 'trabalhando' }), agente('y', { estado: 'trabalhando' })]);
		expect(lugar.get('x')!.id).not.toBe(lugar.get('y')!.id);
		expect(lugar.get('y')!.sala).toBe('design');
	});
	it('quem está parado não senta na cadeira de um agente', () => {
		const { reservados } = lugaresDosAgentes([agente('design')]);
		const p: Pessoa = {
			id: 'davi', nome: 'Davi', cargo: 'SM', foto: null, cor: null, x: 0, y: 0, dirX: 1, dirY: 1, mov: 0,
			aparencia: APARENCIA_PADRAO, situacao: 'inativo', assento: [...reservados][0], ceo: false, paradoDesde: 1, paradoHa: 10
		};
		const alvo = alvos([p], { agentes: reservados }).get('davi')!;
		expect(reservados.has(alvo.assento!.id)).toBe(false);
	});
});

describe('tempo', () => {
	it('há quanto e duração', () => {
		expect(haQuanto(10)).toBe('agora');
		expect(haQuanto(150)).toBe('há 3 min');
		expect(haQuanto(7200)).toBe('há 2 h');
		expect(duracao(42)).toBe('42 s');
		expect(duracao(185)).toBe('3 min');
		expect(duracao(4800)).toBe('1 h 20 min');
	});
});

describe('texto dos agentes', () => {
	it('negrito e código na frase', () => {
		expect(pedacos('Salvei **a proposta** em `propostas/x.md`.')).toEqual([
			{ t: 'Salvei ' },
			{ t: 'a proposta', negrito: true },
			{ t: ' em ' },
			{ t: 'propostas/x.md', codigo: true },
			{ t: '.' }
		]);
	});
	it('parágrafo, título, lista, código e tabela', () => {
		const b = blocos('# Feito\n\nLinha um\ncontinua.\n\n- item a\n2. item b\n\n```\nnpm test\n```\n| a | b |\n|---|---|\n| 1 | 2 |');
		expect(b.map((x) => x.tipo)).toEqual(['titulo', 'p', 'item', 'item', 'codigo', 'codigo']);
		expect(b[1]).toEqual({ tipo: 'p', partes: [{ t: 'Linha um continua.' }] });
		expect(b[3]).toMatchObject({ tipo: 'item', numero: '2' });
		expect(b[4]).toEqual({ tipo: 'codigo', texto: 'npm test' });
		expect(b[5]).toEqual({ tipo: 'codigo', texto: '| a | b |\n| 1 | 2 |' });
	});
	it('HTML do agente fica como texto', () => {
		expect(blocos('<script>alert(1)</script>')).toEqual([{ tipo: 'p', partes: [{ t: '<script>alert(1)</script>' }] }]);
	});
});
