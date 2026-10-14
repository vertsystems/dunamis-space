import { describe, expect, it } from 'vitest';
import {
	bandeira,
	diasEntre,
	duracao,
	resumirHistorico,
	faixaDe,
	haQuanto,
	intervalo,
	linhasDosSites,
	faixaHorario,
	gradeHorarios,
	paginasComBaixoAcesso,
	enderecoDaPagina,
	enderecoDoSite,
	nomeDoSite,
	lerPeriodo,
	serieDiaria,
	serieRecente,
	limparDominio,
	nomePais,
	numero,
	porcentagem,
	ranking,
	snippet,
	visitasPorPais
} from './painel';

describe('período', () => {
	it('sem período (ou um estranho) abre em "desde o começo"', () => {
		expect(lerPeriodo(null)).toBe('tudo');
		expect(lerPeriodo('xyz')).toBe('tudo');
		expect(lerPeriodo('7d')).toBe('7d');
	});
	it('intervalos inclusivos terminando hoje', () => {
		expect(intervalo('7d', '2026-10-10')).toEqual({ de: '2026-10-04', ate: '2026-10-10' });
		expect(intervalo('30d', '2026-10-10')).toEqual({ de: '2026-09-11', ate: '2026-10-10' });
		expect(intervalo('12m', '2026-10-10')).toEqual({ de: '2025-10-11', ate: '2026-10-10' });
		expect(intervalo('tudo', '2026-10-10').de).toBe('2000-01-01');
	});
	it('hora e 24 horas cobrem hoje e ontem (as 24 horas atravessam a meia-noite)', () => {
		expect(lerPeriodo('1h')).toBe('1h');
		expect(intervalo('24h', '2026-10-10')).toEqual({ de: '2026-10-09', ate: '2026-10-10' });
	});
	it('série diária: pelo menos 30 dias; os de antes do primeiro registro, sem dados', () => {
		const s = serieDiaria([{ dia: '2026-10-08', visitas: 3, visualizacoes: 5 }], '2000-01-01', '2026-10-10');
		expect(s).toHaveLength(30);
		expect(s[0]).toEqual({ rotulo: '11/09', visitas: 0, visualizacoes: 0, semDados: true });
		expect(s.filter((p) => p.semDados)).toHaveLength(27);
		expect(s.slice(-3)).toEqual([
			{ rotulo: '08/10', visitas: 3, visualizacoes: 5 },
			{ rotulo: '09/10', visitas: 0, visualizacoes: 0 },
			{ rotulo: '10/10', visitas: 0, visualizacoes: 0 }
		]);
	});
	it('série diária: com mais de 30 dias de registro, começa no primeiro', () => {
		const s = serieDiaria([{ dia: '2026-08-01', visitas: 1, visualizacoes: 1 }], '2000-01-01', '2026-10-10');
		expect(s[0]).toEqual({ rotulo: '01/08', visitas: 1, visualizacoes: 1 });
		expect(s.some((p) => p.semDados)).toBe(false);
	});
	it('série diária: o período escolhido manda (7 dias são 7 dias)', () => {
		const s = serieDiaria([{ dia: '2026-10-08', visitas: 3, visualizacoes: 5 }], '2026-10-04', '2026-10-10');
		expect(s).toHaveLength(7);
		expect(s.filter((p) => p.semDados).map((p) => p.rotulo)).toEqual(['04/10', '05/10', '06/10', '07/10']);
	});
	it('série recente no horário de Brasília', () => {
		expect(serieRecente([{ momento: '2026-10-11T01:35:00+00:00', visitas: 2, visualizacoes: 3 }])).toEqual([
			{ rotulo: '22:35', visitas: 2, visualizacoes: 3 }
		]);
	});
	it('diasEntre lista todos os dias, inclusive os sem visita', () => {
		expect(diasEntre('2026-09-29', '2026-10-02')).toEqual(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02']);
	});
});

describe('visitasPorPais', () => {
	it('soma o script e o histórico; "(not set)" e zeros ficam fora', () => {
		const m = visitasPorPais(
			[
				{ valor: 'BR', visitas: 10, visualizacoes: 30 },
				{ valor: '', visitas: 4, visualizacoes: 4 },
				{ valor: 'IE', visitas: 0, visualizacoes: 2 }
			],
			[
				{ pais: 'BR', usuarios: 109087 },
				{ pais: 'us', usuarios: 2273 },
				{ pais: null, usuarios: 7 }
			]
		);
		expect([...m.entries()]).toEqual([
			['BR', 109097],
			['US', 2273]
		]);
	});
	it('ranking em ordem, com a fatia de cada um', () => {
		const r = ranking(new Map([['US', 25], ['BR', 75]]));
		expect(r.map((x) => x.iso)).toEqual(['BR', 'US']);
		expect(r[0].fatia).toBeCloseTo(0.75);
	});
});

describe('faixaDe', () => {
	it('potências de 10', () => {
		expect([0, 1, 9, 10, 99, 100, 999, 1000, 9999, 10000, 109087].map(faixaDe)).toEqual([
			-1, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4
		]);
	});
});

describe('resumirHistorico', () => {
	const l = (inicio: string, fim: string, pais: string | null, usuarios: number) => ({ inicio, fim, pais, usuarios });
	it('um ano inteiro', () => {
		expect(resumirHistorico([l('2025-01-01', '2025-12-31', 'BR', 100), l('2025-01-01', '2025-12-31', null, 3)])).toEqual({
			usuarios: 103,
			paises: 1,
			rotulo: '2025',
			anos: '2025'
		});
	});
	it('dois períodos somam, e o país repetido conta uma vez', () => {
		const r = resumirHistorico([
			l('2026-01-01', '2026-10-10', 'BR', 50),
			l('2025-01-01', '2025-12-31', 'BR', 100),
			l('2026-01-01', '2026-10-10', 'PT', 2)
		]);
		expect(r.usuarios).toBe(152);
		expect(r.paises).toBe(2);
		expect(r.rotulo).toBe('2025 e jan/2026 a out/2026');
		expect(r.anos).toBe('2025–2026');
	});
	it('país com 0 usuários não conta como alcançado', () => {
		expect(resumirHistorico([l('2026-01-01', '2026-10-10', 'TM', 0), l('2026-01-01', '2026-10-10', 'BR', 5)]).paises).toBe(1);
	});
	it('sem histórico', () => {
		expect(resumirHistorico([])).toEqual({ usuarios: 0, paises: 0, rotulo: '', anos: '' });
	});
});

describe('duracao', () => {
	it('segundos, minutos e horas', () => {
		expect([0, 45, 60, 72, 3600, 3720].map(duracao)).toEqual(['0 s', '45 s', '1 min', '1 min 12 s', '1 h', '1 h 2 min']);
	});
});

describe('formatação', () => {
	it('país em português, bandeira, número e porcentagem', () => {
		expect(nomePais('BR')).toBe('Brasil');
		expect(nomePais('ie')).toBe('Irlanda');
		expect(bandeira('BR')).toBe('🇧🇷');
		expect(bandeira('')).toBe('');
		expect(numero(109087)).toBe('109.087');
		expect(porcentagem(0.9661)).toBe('96,6%');
		expect(porcentagem(0.00004)).toBe('<0,1%');
	});
});

describe('gradeHorarios', () => {
	it('monta 7 × 24, acha o pico e o dia mais movimentado', () => {
		const g = gradeHorarios([
			{ dow: 2, hora: 20, visitas: 23 },
			{ dow: 2, hora: 21, visitas: 5 },
			{ dow: 6, hora: 10, visitas: 9 },
			{ dow: 9, hora: 10, visitas: 99 } // fora da grade: ignorado
		]);
		expect(g.grade).toHaveLength(7);
		expect(g.grade[2][20]).toBe(23);
		expect(g.maior).toBe(23);
		expect(g.pico).toEqual({ dow: 2, hora: 20, visitas: 23 });
		expect(g.melhorDia).toEqual({ dow: 2, visitas: 28 });
		expect(g.total).toBe(37);
	});
	it('sem dados', () => {
		const g = gradeHorarios([]);
		expect(g.pico).toBeNull();
		expect(g.melhorDia).toBeNull();
	});
	it('faixa de cor em proporção ao pico', () => {
		expect([0, 1, 5, 12, 23].map((v) => faixaHorario(v, 23))).toEqual([0, 1, 2, 3, 5]);
		expect(faixaHorario(3, 0)).toBe(0);
	});
});

describe('paginasComBaixoAcesso', () => {
	const site = (id: string, nome: string, ativo = true, criado = '2026-09-01T00:00:00Z') => ({
		id, nome, dominio: 'x.com', chave: id, ativo, ultima_visita: null, created_at: criado
	});
	it('ativas com menos de 20 visitas em 30 dias, da menor para a maior; pausadas fora', () => {
		const r = paginasComBaixoAcesso(
			[site('a', 'A'), site('b', 'B'), site('c', 'C', false), site('d', 'D', true, '2026-10-10T00:00:00Z')],
			[{ site_id: 'a', visitas: 12 }, { site_id: 'b', visitas: 40 }],
			new Date('2026-10-12T12:00:00Z')
		);
		expect(r.map((p) => [p.site.nome, p.visitas, p.diasNoAr])).toEqual([
			['D', 0, 2],
			['A', 12, 41]
		]);
	});
});

describe('linhasDosSites', () => {
	const site = (id: string, nome: string) => ({ id, nome, dominio: nome, chave: id, ativo: true, ultima_visita: null, created_at: '' });
	it('em ordem de páginas vistas, com médias e o total', () => {
		const { linhas, total } = linhasDosSites(
			[site('a', 'Casa do Tita'), site('b', 'Lojas Mari'), site('c', 'Sem visita')],
			[
				{ site_id: 'a', visitas: 10, visualizacoes: 15, segundos: 300, cliques: 2 },
				{ site_id: 'b', visitas: 40, visualizacoes: 50, segundos: 400, cliques: 9 }
			]
		);
		expect(linhas.map((l) => l.site.nome)).toEqual(['Lojas Mari', 'Casa do Tita', 'Sem visita']);
		expect(linhas[0]).toMatchObject({ paginasPorVisita: 1.25, tempoMedio: 10 });
		expect(linhas[2]).toMatchObject({ visitas: 0, paginasPorVisita: 0, tempoMedio: 0 });
		expect(total).toEqual({ visitas: 50, visualizacoes: 65, cliques: 11, paginasPorVisita: 1.3, tempoMedio: 14 });
	});
});

describe('sites', () => {
	it('domínio limpo para comparar', () => {
		expect(limparDominio('https://www.LojasMari.com.br/ofertas?x=1')).toBe('lojasmari.com.br');
		expect(limparDominio('loja.exemplo.com:8080')).toBe('loja.exemplo.com');
		expect(limparDominio('  ')).toBe('');
	});
	it('endereço e nome do site: manual, título ou endereço', () => {
		const base = { nome: 'dnms.fun/lojasmari', dominio: 'dnms.fun', caminho: 'lojasmari', titulo: null, nome_manual: false };
		expect(enderecoDoSite(base)).toBe('dnms.fun/lojasmari');
		expect(enderecoDoSite({ dominio: 'ninasantana.com', caminho: '' })).toBe('ninasantana.com');
		expect(nomeDoSite(base)).toBe('dnms.fun/lojasmari');
		expect(nomeDoSite({ ...base, titulo: 'Lojas Mari® | PageLinks – DCo™' })).toBe('Lojas Mari® | PageLinks – DCo™');
		expect(nomeDoSite({ ...base, titulo: 'Lojas Mari® | PageLinks', nome: 'Lojas Mari DCo™', nome_manual: true })).toBe('Lojas Mari DCo™');
	});
	it('endereço da página: domínio + caminho, a raiz sem barra', () => {
		expect(enderecoDaPagina({ dominio: 'dnms.fun' }, '/lojasmari')).toBe('dnms.fun/lojasmari');
		expect(enderecoDaPagina({ dominio: 'ninasantana.com' }, '/')).toBe('ninasantana.com');
		expect(enderecoDaPagina(undefined, '/x')).toBe('/x');
	});
	it('código único, só com a origem do sistema', () => {
		expect(snippet('https://dspace.verts.me')).toBe('<script defer src="https://dspace.verts.me/dm.js"></script>');
	});
	it('há quanto tempo', () => {
		const agora = new Date('2026-10-10T12:00:00Z');
		expect(haQuanto(null, agora)).toBe('');
		expect(haQuanto('2026-10-10T11:59:30Z', agora)).toBe('agora há pouco');
		expect(haQuanto('2026-10-10T11:20:00Z', agora)).toBe('há 40 min');
		expect(haQuanto('2026-10-10T07:00:00Z', agora)).toBe('há 5 h');
		expect(haQuanto('2026-10-09T10:00:00Z', agora)).toBe('ontem');
		expect(haQuanto('2026-10-05T12:00:00Z', agora)).toBe('há 5 dias');
	});
});
