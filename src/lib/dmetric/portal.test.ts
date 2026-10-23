import { describe, expect, it } from 'vitest';
import { CONVERSAO_VAZIA } from './resultados';
import {
	lerPeriodoPortal,
	linkDaMensagem,
	linkDoPortal,
	mensagemDoRelatorio,
	nomeDoMes,
	novoToken,
	periodoPedido,
	type DadosDoRelatorio
} from './portal';

describe('o link do cliente', () => {
	it('token de 24 caracteres seguros para URL, diferente a cada vez', () => {
		const a = novoToken();
		expect(a).toMatch(/^[A-Za-z0-9_-]{24}$/);
		expect(novoToken()).not.toBe(a);
	});
	it('o endereço, com ou sem o mês', () => {
		expect(linkDoPortal('https://dspace.verts.me', 'abc')).toBe('https://dspace.verts.me/relatorio/abc');
		expect(linkDoPortal('https://dspace.verts.me', 'abc', '2026-10')).toBe('https://dspace.verts.me/relatorio/abc?mes=2026-10');
	});
	it('período desconhecido vira "o cliente escolhe"', () => {
		expect(lerPeriodoPortal('mes_passado')).toBe('mes_passado');
		expect(lerPeriodoPortal('xyz')).toBe('livre');
	});
	it('o período pedido na URL', () => {
		const hoje = '2026-10-23';
		const p = (s: string) => periodoPedido(new URLSearchParams(s), hoje);
		expect(p('mes=2026-09')).toEqual({ de: '2026-09-01', ate: '2026-09-30', id: 'mes:2026-09' });
		// O mês de hoje vai só até hoje; mês do futuro não vale.
		expect(p('mes=2026-10')).toEqual({ de: '2026-10-01', ate: '2026-10-23', id: 'mes:2026-10' });
		expect(p('mes=2026-11')).toBeNull();
		expect(p('p=7d')).toEqual({ de: '2026-10-17', ate: hoje, id: '7d' });
		expect(p('p=mes_passado')).toEqual({ de: '2026-09-01', ate: '2026-09-30', id: 'mes_passado' });
		expect(p('p=este_mes')).toEqual({ de: '2026-10-01', ate: hoje, id: 'este_mes' });
		expect(p('')).toBeNull();
	});
});

describe('a mensagem do mês', () => {
	const base: DadosDoRelatorio = {
		portal_id: 'p1',
		token: 'abc',
		contato: 'Mariana',
		whatsapp: '5513999998888',
		periodo: 'livre',
		site: { id: 's1', nome: 'dnms.fun/lojasmari', nome_manual: false, titulo: 'Lojas Mari', dominio: 'dnms.fun', caminho: 'lojasmari' },
		primeiro_dia: '2026-08-10',
		numeros: { visitas: 2439, visualizacoes: 2744, segundos: 40000, cliques: 600 },
		anterior: { visitas: 2177, visualizacoes: 2500, segundos: 35000, cliques: 500 },
		origens: [
			{ valor: 'Instagram', visitas: 1500 },
			{ valor: 'Facebook', visitas: 700 }
		],
		conversao: { ...CONVERSAO_VAZIA, visitas: 2400, clicaram: 500, converteram: 154, metas: [{ valor: 'WhatsApp', cliques: 180, visitas: 120 }, { valor: 'Mapa', cliques: 40, visitas: 34 }] }
	};
	it('tudo o que tem número entra, com o link no fim', () => {
		const m = mensagemDoRelatorio(base, '2026-10', 'https://dspace.verts.me/relatorio/abc?mes=2026-10', { nome: 'Jornal de Ofertas', cliques: 63 });
		expect(m).toBe(
			[
				'Olá, Mariana!',
				'Aqui está o resumo de outubro da sua página Lojas Mari:',
				'',
				'• 2.439 visitas (+12% em relação a setembro)',
				'• 2.744 páginas vistas',
				'• 154 visitas viraram contato (WhatsApp, Mapa): 6,4% das visitas',
				'• Quem mais trouxe gente: Instagram (61,5% das visitas)',
				'• Botão mais clicado: Jornal de Ofertas (63 cliques)',
				'',
				'Veja o relatório completo: https://dspace.verts.me/relatorio/abc?mes=2026-10',
				'',
				'Dunamis Company'
			].join('\n')
		);
	});
	it('sem o mês anterior contado inteiro, sem variação; sem resultado, os cliques', () => {
		const m = mensagemDoRelatorio(
			{ ...base, contato: null, primeiro_dia: '2026-09-15', site: { ...base.site, dominio: 'ninasantana.com', caminho: '', titulo: 'Nina' }, conversao: CONVERSAO_VAZIA },
			'2026-10',
			'L'
		);
		expect(m.split('\n').slice(0, 5)).toEqual([
			'Olá!',
			'Aqui está o resumo de outubro do seu site Nina:',
			'',
			'• 2.439 visitas',
			'• 2.744 páginas vistas'
		]);
		expect(m).toContain('• 600 cliques em WhatsApp, links e botões');
		expect(m).not.toContain('Botão mais clicado');
	});
	it('o mês por extenso e o link do WhatsApp', () => {
		expect(nomeDoMes('2026-01-01')).toBe('janeiro');
		expect(linkDaMensagem('5513999998888', 'Olá!\nTudo bem?')).toBe('https://wa.me/5513999998888?text=Ol%C3%A1!%0ATudo%20bem%3F');
	});
});
