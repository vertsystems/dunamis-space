import { describe, it, expect } from 'vitest';
import { corAvatar, diasDecorridos, fmtDiaMes, iniciais, mesAtual, parseISO, situacaoStyle } from './ui';

describe('iniciais', () => {
	it('usa o primeiro e o último nome', () => {
		expect(iniciais('Ana Maria Silva')).toBe('AS');
		expect(iniciais('Bruno')).toBe('B');
		expect(iniciais('  joão  pedro  ')).toBe('JP');
	});

	it('não quebra com nome vazio', () => {
		expect(iniciais('')).toBe('');
	});
});

describe('corAvatar', () => {
	it('é estável: o mesmo id devolve sempre a mesma cor', () => {
		expect(corAvatar('abc-123')).toBe(corAvatar('abc-123'));
	});

	it('separa ids diferentes', () => {
		expect(corAvatar('abc-123')).not.toBe(corAvatar('abc-124'));
	});
});

describe('fmtDiaMes / parseISO', () => {
	it('formata como dia/mês', () => {
		expect(fmtDiaMes('2026-08-07')).toBe('07/08');
	});

	it('parseISO monta a data LOCAL (o fuso não pode voltar um dia)', () => {
		const d = parseISO('2026-08-07');
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(7);
		expect(d.getDate()).toBe(7);
	});
});

describe('mesAtual', () => {
	it('formata AAAA-MM com zero à esquerda', () => {
		expect(mesAtual(new Date(2026, 0, 15))).toBe('2026-01');
		expect(mesAtual(new Date(2026, 11, 1))).toBe('2026-12');
	});
});

describe('diasDecorridos', () => {
	const agora = new Date(2026, 7, 7); // 7 de agosto de 2026

	it('no mês corrente conta até hoje', () => {
		expect(diasDecorridos('2026-08', agora)).toBe(7);
	});

	it('mês passado conta inteiro', () => {
		expect(diasDecorridos('2026-07', agora)).toBe(31);
		expect(diasDecorridos('2026-02', agora)).toBe(28);
	});

	it('mês futuro conta zero — senão a aderência nasceria em 0% de fracasso', () => {
		expect(diasDecorridos('2026-09', agora)).toBe(0);
		expect(diasDecorridos('2027-01', agora)).toBe(0);
	});
});

describe('situacaoStyle', () => {
	it('marca a selecionada com o anel interno', () => {
		expect(situacaoStyle('em_execucao', true)).toContain('inset');
		expect(situacaoStyle('em_execucao', false)).not.toContain('inset');
	});
});
