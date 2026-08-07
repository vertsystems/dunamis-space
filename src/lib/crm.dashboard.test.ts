// Os dois blocos novos do dashboard comercial. Ambos dependem de "quando" —
// e é aí que dá errado: fuso, virada de dia e o que conta como atrasado.
import { describe, it, expect } from 'vitest';
import { computeAgenda, computeFechamentos, type Atividade, type Negocio } from './crm';

const AGORA = new Date(2026, 7, 7, 14, 0); // 07/08/2026, 14h

function negocio(p: Partial<Negocio>): Negocio {
	return {
		id: 'n1',
		titulo: 'Negócio',
		valor: 1000,
		status: 'aberto',
		stage_id: 's1',
		pipeline_id: 'p1',
		ordem: 0,
		previsao_fechamento: null,
		motivo_perda: null,
		observacoes: null,
		ganho_em: null,
		perdido_em: null,
		created_at: '2026-07-01T00:00:00Z',
		contato_id: null,
		contato_nome: null,
		contato_empresa: null,
		responsavel_id: null,
		responsavel_nome: null,
		prox_atividade: null,
		...p
	};
}

function atividade(p: Partial<Atividade>): Atividade {
	return {
		id: 'a1',
		tipo: 'tarefa',
		titulo: 'Ligar',
		descricao: null,
		data_hora: null,
		concluida: false,
		concluida_em: null,
		created_at: '2026-08-01T00:00:00Z',
		negocio_id: null,
		negocio_titulo: null,
		contato_id: null,
		contato_nome: null,
		responsavel_id: null,
		responsavel_nome: null,
		...p
	};
}

describe('computeFechamentos', () => {
	it('soma ganhos e perdas da janela e ignora o que está aberto', () => {
		const f = computeFechamentos(
			[
				negocio({ id: 'g1', status: 'ganho', valor: 5000, ganho_em: '2026-08-05T10:00:00Z' }),
				negocio({ id: 'g2', status: 'ganho', valor: 2000, ganho_em: '2026-07-30T10:00:00Z' }),
				negocio({ id: 'p1', status: 'perdido', valor: 900, perdido_em: '2026-08-01T10:00:00Z' }),
				negocio({ id: 'ab', status: 'aberto', valor: 9999 })
			],
			AGORA
		);
		expect(f.ganhos_qtd).toBe(2);
		expect(f.ganhos_valor).toBe(7000);
		expect(f.perdidos_qtd).toBe(1);
		expect(f.perdidos_valor).toBe(900);
	});

	it('corta o que fechou antes da janela', () => {
		const f = computeFechamentos(
			[negocio({ id: 'velho', status: 'ganho', valor: 5000, ganho_em: '2026-05-01T10:00:00Z' })],
			AGORA
		);
		expect(f.ganhos_qtd).toBe(0);
		expect(f.recentes).toHaveLength(0);
	});

	it('lista os mais recentes primeiro e respeita o limite', () => {
		const negocios = Array.from({ length: 12 }, (_, i) =>
			negocio({
				id: `n${i}`,
				status: 'ganho',
				ganho_em: new Date(2026, 7, 1 + (i % 6), 9).toISOString()
			})
		);
		const f = computeFechamentos(negocios, AGORA, 30, 8);
		expect(f.recentes).toHaveLength(8);
		const datas = f.recentes.map((l) => l.quando);
		expect([...datas].sort().reverse()).toEqual(datas);
	});

	it('um negócio marcado ganho mas sem data não entra (não dá para situar no tempo)', () => {
		const f = computeFechamentos([negocio({ status: 'ganho', ganho_em: null })], AGORA);
		expect(f.ganhos_qtd).toBe(0);
	});
});

describe('computeAgenda', () => {
	it('separa atrasadas, hoje e os próximos dias', () => {
		const a = computeAgenda(
			[
				atividade({ id: 'atrasada', data_hora: new Date(2026, 7, 5, 9).toISOString() }),
				atividade({ id: 'hoje', data_hora: new Date(2026, 7, 7, 16).toISOString() }),
				atividade({ id: 'amanha', data_hora: new Date(2026, 7, 8, 9).toISOString() }),
				atividade({ id: 'longe', data_hora: new Date(2026, 8, 20, 9).toISOString() })
			],
			AGORA
		);
		expect(a.atrasadas.map((x) => x.id)).toEqual(['atrasada']);
		expect(a.dias[0].rotulo).toBe('Hoje');
		expect(a.dias[0].atividades.map((x) => x.id)).toEqual(['hoje']);
		expect(a.dias[1].rotulo).toBe('Amanhã');
		expect(a.dias[1].atividades.map((x) => x.id)).toEqual(['amanha']);
		// Fora da janela de 7 dias não aparece em nenhum grupo.
		expect(a.dias.flatMap((d) => d.atividades).map((x) => x.id)).not.toContain('longe');
	});

	it('hora já passada no dia de hoje NÃO conta como atrasada', () => {
		// Uma reunião das 9h continua sendo "de hoje" às 14h — tratá-la como
		// atrasada tirava do dia o compromisso que ainda ia acontecer.
		const a = computeAgenda(
			[atividade({ id: 'manha', data_hora: new Date(2026, 7, 7, 9).toISOString() })],
			AGORA
		);
		expect(a.atrasadas).toHaveLength(0);
		expect(a.dias[0].atividades.map((x) => x.id)).toEqual(['manha']);
	});

	it('ignora concluídas e conta as sem data', () => {
		const a = computeAgenda(
			[
				atividade({ id: 'feita', concluida: true, data_hora: new Date(2026, 7, 7, 9).toISOString() }),
				atividade({ id: 'sem1' }),
				atividade({ id: 'sem2', data_hora: 'data inválida' })
			],
			AGORA
		);
		expect(a.atrasadas).toHaveLength(0);
		expect(a.dias.flatMap((d) => d.atividades)).toHaveLength(0);
		expect(a.sem_data).toBe(2);
	});

	it('ordena por horário dentro do dia', () => {
		const a = computeAgenda(
			[
				atividade({ id: 'tarde', data_hora: new Date(2026, 7, 7, 17).toISOString() }),
				atividade({ id: 'cedo', data_hora: new Date(2026, 7, 7, 15).toISOString() })
			],
			AGORA
		);
		expect(a.dias[0].atividades.map((x) => x.id)).toEqual(['cedo', 'tarde']);
	});
});
