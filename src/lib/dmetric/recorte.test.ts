import { describe, expect, it } from 'vitest';
import { lerGrafico, serieDoPeriodo } from './painel';
import {
	anoAntes,
	buscaCom,
	buscaParaSite,
	buscaParaTodos,
	comSerieAnterior,
	datasDaJanela,
	descricaoDaComparacao,
	emBrasilia,
	filtroDaPessoa,
	filtrosParaBanco,
	graficoAnterior,
	inicioDoDia,
	janelaAnterior,
	janelaCoberta,
	janelaDoPeriodo,
	lerComparacao,
	lerFiltros,
	lerPagina,
	semFiltros,
	temFiltro,
	textoVariacao,
	variacao
} from './recorte';

const SITE = '0b1e2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const OUTRO = 'ffffffff-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

describe('filtros na URL', () => {
	it('lê só as listas conhecidas, sem valor vazio nem gigante', () => {
		const f = lerFiltros(new URLSearchParams({ origem: 'Instagram', cidade: 'São Paulo · SP', periodo: '7d', xyz: '1', pais: '', campanha: 'x'.repeat(300) }));
		expect(f).toEqual({ origem: 'Instagram', cidade: 'São Paulo · SP' });
		expect(temFiltro(f)).toBe(true);
		expect(temFiltro({})).toBe(false);
	});
	it('página com o site junto (todos os sites) ou só o caminho (página do site)', () => {
		expect(lerPagina(`${SITE}|/promo`)).toEqual({ site: SITE, caminho: '/promo' });
		expect(lerPagina('/promo')).toEqual({ site: null, caminho: '/promo' });
		// Um caminho com "|" não é confundido com o site.
		expect(lerPagina('/a|b')).toEqual({ site: null, caminho: '/a|b' });
	});
	it('para o banco: a página vira caminho + site', () => {
		expect(filtrosParaBanco({ origem: 'Instagram', pagina: `${SITE}|/` })).toEqual({ origem: 'Instagram', pagina: '/', pagina_site: SITE });
		expect(filtrosParaBanco({ pagina: '/sobre' }, SITE)).toEqual({ pagina: '/sobre', pagina_site: SITE });
		expect(filtrosParaBanco({ pagina: '/sobre' })).toEqual({ pagina: '/sobre' });
	});
	it('filtro da pessoa é todo filtro que não é só de página', () => {
		expect(filtroDaPessoa({ pagina: '/x' })).toBe(false);
		expect(filtroDaPessoa({ pagina: '/x', cidade: 'Guarujá · SP' })).toBe(true);
		expect(filtroDaPessoa({ clique: 'WhatsApp' })).toBe(true);
	});
	it('trocar e tirar mantém o resto do endereço', () => {
		const atual = new URLSearchParams('periodo=7d&origem=Instagram&site=' + SITE);
		expect(buscaCom(atual, { cidade: 'Guarujá · SP' })).toBe(`?periodo=7d&origem=Instagram&site=${SITE}&cidade=Guaruj%C3%A1+%C2%B7+SP`);
		expect(buscaCom(atual, { origem: null })).toBe(`?periodo=7d&site=${SITE}`);
		expect(semFiltros(new URLSearchParams('periodo=7d&origem=Instagram&clique=WhatsApp'))).toBe('?periodo=7d');
		expect(semFiltros(new URLSearchParams('origem=Instagram'))).toBe('?');
	});
	it('do painel para o site e de volta: a página do filtro só vai se for daquele site', () => {
		const daqui = new URLSearchParams(`periodo=30d&site=${SITE}&origem=Instagram&pagina=${SITE}|/promo`);
		expect(buscaParaSite(daqui, SITE)).toBe('?periodo=30d&origem=Instagram&pagina=%2Fpromo');
		expect(buscaParaSite(daqui, OUTRO)).toBe('?periodo=30d&origem=Instagram');
		expect(buscaParaSite(new URLSearchParams(''), SITE)).toBe('');
		expect(buscaParaTodos(new URLSearchParams('periodo=7d&pagina=/promo&comparar=ano'), SITE)).toBe(
			`?periodo=7d&comparar=ano&pagina=${encodeURIComponent(`${SITE}|/promo`)}`
		);
	});
});

describe('horário de Brasília', () => {
	it('dia e hora de um instante', () => {
		expect(emBrasilia(new Date('2026-10-23T19:45:00Z'))).toEqual({ dia: '2026-10-23', hora: 16.75 });
		expect(emBrasilia(new Date('2026-10-24T01:30:00Z'))).toEqual({ dia: '2026-10-23', hora: 22.5 });
	});
	it('meia-noite em Brasília é 03:00 UTC', () => {
		expect(inicioDoDia('2026-10-23')).toBe('2026-10-23T03:00:00.000Z');
		expect(inicioDoDia('2026-01-01')).toBe('2026-01-01T03:00:00.000Z');
	});
	it('em 2018 ainda havia horário de verão: a meia-noite era 02:00 UTC', () => {
		expect(inicioDoDia('2018-12-15')).toBe('2018-12-15T02:00:00.000Z');
	});
});

describe('comparação: as janelas', () => {
	const agora = new Date('2026-10-23T19:45:00Z'); // 16h45 em Brasília
	const hoje = '2026-10-23';
	it('sem escolha, o período anterior', () => {
		expect(lerComparacao(null)).toBe('anterior');
		expect(lerComparacao('ano')).toBe('ano');
		expect(lerComparacao('xyz')).toBe('anterior');
	});
	it('7 dias: os 7 de antes, parando na mesma hora do dia', () => {
		const j = janelaDoPeriodo('7d', hoje, agora);
		expect(j).toEqual({ desde: '2026-10-17T03:00:00.000Z', ate: '2026-10-24T03:00:00.000Z', de: '2026-10-17', ateDia: hoje, ateHora: null });
		const a = janelaAnterior(j, '7d', 'anterior', hoje, agora)!;
		expect(a).toEqual({ desde: '2026-10-10T03:00:00.000Z', ate: '2026-10-16T19:45:00.000Z', de: '2026-10-10', ateDia: '2026-10-16', ateHora: 16.75 });
		expect(datasDaJanela(a, '7d')).toBe('10/10 a 16/10/2026, até 16h45');
	});
	it('ano passado: as mesmas datas', () => {
		const j = janelaDoPeriodo('30d', hoje, agora);
		const a = janelaAnterior(j, '30d', 'ano', hoje, agora)!;
		expect([a.de, a.ateDia, a.ateHora]).toEqual(['2025-09-24', '2025-10-23', 16.75]);
		expect(anoAntes('2028-02-29')).toBe('2027-02-28');
	});
	it('24 horas: as 24 de antes; última hora, a hora de antes', () => {
		const j = janelaDoPeriodo('24h', hoje, agora);
		expect(j.desde).toBe('2026-10-22T19:45:00.000Z');
		const a = janelaAnterior(j, '24h', 'anterior', hoje, agora)!;
		expect([a.desde, a.ate]).toEqual(['2026-10-21T19:45:00.000Z', '2026-10-22T19:46:00.000Z']);
		const h = janelaAnterior(janelaDoPeriodo('1h', hoje, agora), '1h', 'anterior', hoje, agora)!;
		expect([h.desde, h.ate]).toEqual(['2026-10-23T17:45:00.000Z', '2026-10-23T18:46:00.000Z']);
		expect(datasDaJanela(h, '1h')).toBe('23/10, 14:45 a 15:46');
	});
	it('"desde o começo" e "sem comparação" não comparam', () => {
		expect(janelaAnterior(janelaDoPeriodo('tudo', hoje, agora), 'tudo', 'anterior', hoje, agora)).toBeNull();
		expect(janelaAnterior(janelaDoPeriodo('7d', hoje, agora), '7d', 'nao', hoje, agora)).toBeNull();
	});
	it('só compara com período contado inteiro', () => {
		const a = janelaAnterior(janelaDoPeriodo('7d', hoje, agora), '7d', 'anterior', hoje, agora)!;
		// O primeiro dia dos contadores começou no meio: não conta como inteiro.
		expect(janelaCoberta(a, { primeiroDia: '2026-10-10' })).toBe(false);
		expect(janelaCoberta(a, { primeiroDia: '2026-10-09' })).toBe(true);
		expect(janelaCoberta(a, { primeiroDia: null })).toBe(false);
		expect(janelaCoberta(a, { desde: '2026-10-21T18:37:22Z' })).toBe(false);
		expect(janelaCoberta(a, { desde: '2026-10-01T00:00:00Z' })).toBe(true);
		expect(janelaCoberta(a, { desde: null })).toBe(false);
	});
	it('as palavras da dica', () => {
		expect(descricaoDaComparacao('7d', 'anterior')).toBe('os 7 dias anteriores');
		expect(descricaoDaComparacao('24h', 'ano')).toBe('o mesmo período do ano passado');
	});
});

describe('variação', () => {
	it('fração contra o de antes; sem base, nada', () => {
		expect(variacao(112, 100)).toBeCloseTo(0.12);
		expect(variacao(5, 0)).toBeNull();
		expect([0.12, -0.08, 0.004, -0.004, 12.5].map(textoVariacao)).toEqual(['+12%', '−8%', '0%', '0%', '+1.250%']);
	});
});

describe('a linha tracejada', () => {
	it('mês: o anterior (janeiro volta para dezembro) ou o do ano passado', () => {
		const out = lerGrafico('2026-10', '2026-10-23');
		expect(graficoAnterior(out, 'anterior')).toEqual({ de: '2026-09-01', ate: '2026-09-30', rotulo: 'setembro de 2026' });
		expect(graficoAnterior(out, 'ano')).toEqual({ de: '2025-10-01', ate: '2025-10-31', rotulo: 'outubro de 2025' });
		expect(graficoAnterior(lerGrafico('2026-01', '2026-10-23'), 'anterior')?.de).toBe('2025-12-01');
		expect(graficoAnterior(out, 'nao')).toBeNull();
	});
	it('ano e dias do calendário', () => {
		expect(graficoAnterior(lerGrafico('2026', '2026-10-23'), 'anterior')).toEqual({ de: '2025-01-01', ate: '2025-12-31', rotulo: '2025' });
		expect(graficoAnterior(lerGrafico('2026-10-17_2026-10-23', '2026-10-23'), 'anterior')).toEqual({
			de: '2026-10-10',
			ate: '2026-10-16',
			rotulo: '10/10 a 16/10/2026'
		});
	});
	it('ponto a ponto; antes de contar fica sem linha', () => {
		const agora = serieDoPeriodo([{ dia: '2026-10-02', visitas: 5, visualizacoes: 6 }], '2026-10-01', '2026-10-03', '2026-10-03', '2026-10-01');
		const antes = serieDoPeriodo([{ dia: '2026-09-02', visitas: 3, visualizacoes: 4 }], '2026-09-01', '2026-09-03', '2026-10-03', '2026-09-02');
		const s = comSerieAnterior(agora, antes);
		expect(s.map((p) => p.anterior?.visitas ?? null)).toEqual([null, 3, 0]);
		expect(s[1].anterior?.rotulo).toBe('qua, 02/09');
		// A série de antes mais curta (setembro tem 30 dias): o dia 31 fica sem linha.
		expect(comSerieAnterior(agora, antes.slice(0, 2))[2].anterior).toBeNull();
	});
});
