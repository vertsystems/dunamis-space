// O painel de saúde responde "o que está vivo aqui?". Errar a conta de dias ou
// somar as tabelas erradas faria um módulo abandonado parecer ativo — que é
// justamente a informação que a tela existe para dar.
import { describe, it, expect } from 'vitest';
import { montarLinhas, ordenar, quandoFoi, diasDesde, formatarBytes } from './saude';
import type { ResumoSaude } from './saude';

const AGORA = new Date('2026-08-26T12:00:00Z');

function resumo(tabelas: { tabela: string; linhas: number; ultimo: string | null }[]): ResumoSaude {
	return {
		gerado_em: AGORA.toISOString(),
		banco_bytes: 1,
		dados_bytes: 1,
		arquivos_qtd: 0,
		arquivos_bytes: 0,
		usuarios: 4,
		tabelas: tabelas.map((t) => ({ ...t, bytes: 0 }))
	};
}

describe('montarLinhas', () => {
	it('soma as tabelas de um módulo e usa a data mais recente delas', () => {
		// Ponto = ponto_registros + ponto_ajustes.
		const linhas = montarLinhas(
			resumo([
				{ tabela: 'ponto_registros', linhas: 46, ultimo: '2026-08-26T09:00:00Z' },
				{ tabela: 'ponto_ajustes', linhas: 2, ultimo: '2026-07-01T09:00:00Z' }
			]),
			AGORA
		);
		const ponto = linhas.find((l) => l.label === 'Ponto');
		expect(ponto?.linhas).toBe(48);
		expect(ponto?.dias).toBe(0);
		expect(ponto?.situacao).toBe('ativo');
	});

	it('sem nenhuma linha, o módulo é "sem uso" — não "parado"', () => {
		const linhas = montarLinhas(resumo([{ tabela: 'transacoes', linhas: 0, ultimo: null }]), AGORA);
		expect(linhas.find((l) => l.label === 'Financeiro')?.situacao).toBe('vazio');
	});

	it('com registros mas parado há mais de 30 dias, é "parado"', () => {
		const linhas = montarLinhas(
			resumo([{ tabela: 'crm_negocios', linhas: 11, ultimo: '2026-07-14T12:00:00Z' }]),
			AGORA
		);
		const crm = linhas.find((l) => l.label === 'Negócios (funil)');
		expect(crm?.dias).toBe(43);
		expect(crm?.situacao).toBe('parado');
	});

	it('30 dias ainda é ativo; 31 já não é', () => {
		const em = (dias: number) =>
			montarLinhas(
				resumo([
					{
						tabela: 'conteudos',
						linhas: 5,
						ultimo: new Date(AGORA.getTime() - dias * 86400000).toISOString()
					}
				]),
				AGORA
			).find((l) => l.label === 'Conteúdo (calendário)')?.situacao;
		expect(em(30)).toBe('ativo');
		expect(em(31)).toBe('parado');
	});

	it('tabela sem coluna de data conta as linhas e não vira "parado"', () => {
		// organyze_tarefas não tem created_at.
		const linhas = montarLinhas(
			resumo([{ tabela: 'organyze_tarefas', linhas: 99, ultimo: null }]),
			AGORA
		);
		const org = linhas.find((l) => l.label === 'Organyze (tarefas pessoais)');
		expect(org?.linhas).toBe(99);
		expect(org?.situacao).toBe('ativo');
	});
});

describe('ordenar', () => {
	it('põe ativo antes de parado, e parado antes de vazio', () => {
		const linhas = montarLinhas(
			resumo([
				{ tabela: 'transacoes', linhas: 0, ultimo: null },
				{ tabela: 'crm_negocios', linhas: 11, ultimo: '2026-06-01T12:00:00Z' },
				{ tabela: 'conteudos', linhas: 123, ultimo: '2026-08-25T12:00:00Z' }
			]),
			AGORA
		).filter((l) => ['Financeiro', 'Negócios (funil)', 'Conteúdo (calendário)'].includes(l.label));
		expect(ordenar(linhas).map((l) => l.situacao)).toEqual(['ativo', 'parado', 'vazio']);
	});
});

describe('quandoFoi', () => {
	it('fala como gente', () => {
		expect(quandoFoi(0)).toBe('hoje');
		expect(quandoFoi(1)).toBe('ontem');
		expect(quandoFoi(12)).toBe('há 12 dias');
		expect(quandoFoi(45)).toBe('há 1 mês');
		expect(quandoFoi(90)).toBe('há 3 meses');
		expect(quandoFoi(400)).toBe('há mais de um ano');
		expect(quandoFoi(null)).toBe('—');
	});
});

describe('diasDesde', () => {
	it('conta a partir de agora e aguenta data inválida', () => {
		expect(diasDesde('2026-08-24T12:00:00Z', AGORA)).toBe(2);
		expect(diasDesde(null, AGORA)).toBe(null);
		expect(diasDesde('nada disso', AGORA)).toBe(null);
	});
});

describe('formatarBytes', () => {
	it('escolhe a unidade que cabe', () => {
		expect(formatarBytes(512)).toBe('512 B');
		expect(formatarBytes(74 * 1024)).toBe('74 kB');
		expect(formatarBytes(2.8 * 1024 * 1024)).toBe('2.8 MB');
	});
});
