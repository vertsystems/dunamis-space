import { describe, expect, it } from 'vitest';
import { gerarPdfErros, montarRelatorio, nomeDoArquivo, paraWinAnsi, pistas, type DadosRelatorio } from './relatorioErros';
import type { LinhaErro } from './saude';

const erro = (tipo: LinhaErro['tipo'], mensagem: string, ocorrencias: number, origem = ''): LinhaErro => ({
	site_id: 's',
	tipo,
	mensagem,
	pagina: '/',
	origem,
	ocorrencias,
	ultimo: '2026-10-13',
	ultimo_em: '2026-10-13T23:59:00Z'
});

const dados = (erros: LinhaErro[]): DadosRelatorio => ({
	site: { nome: 'Arsenal do Social Media | +100 conteúdos editáveis no Canva · Aline Santana', endereco: 'ninasantana.com' },
	erros,
	paginas: 732,
	nota: 92,
	horas: 72,
	geradoEm: new Date('2026-10-14T16:59:00Z')
});

const ERROS = [
	erro('recurso', 'https://ninasantana.com/assets/img/pack-white-720.webp', 1),
	erro('recurso', 'https://ninasantana.com/assets/video/hero-720-av1.mp4', 13),
	erro('js', "TypeError: Cannot read properties of null (reading 'addEventListener')", 4, 'ninasantana.com')
];

describe('montarRelatorio', () => {
	it('resumo, explicação, erros do mais frequente ao menos, e o pedido para a IA', () => {
		const b = montarRelatorio(dados(ERROS));
		const texto = b.map((x) => ('rotulo' in x ? `${x.rotulo} ${x.texto}` : 'texto' in x ? x.texto : '')).join('\n');
		expect(texto).toContain('Relatório de erros da página');
		expect(texto).toContain('Gerado em 14/10/2026 às 13:59 (horário de Brasília)');
		expect(texto).toContain('últimas 72 horas (de 11/10/2026 às 13:59 a 14/10/2026 às 13:59)');
		expect(texto).toContain('Erros diferentes: 3 (1 erro de JavaScript, 2 arquivos que não carregaram)');
		expect(texto).toContain('Ocorrências somadas: 18');
		const titulos = b.filter((x) => x.tipo === 'erro').map((x) => ('texto' in x ? x.texto : ''));
		expect(titulos).toEqual([
			'1. Arquivo não carregou – 13 ocorrências',
			'2. Erro de JavaScript – 4 ocorrências',
			'3. Arquivo não carregou – 1 ocorrência'
		]);
		expect(texto).toContain('Última vez: 13/10/2026 às 20:59');
		expect(b.at(-2)).toEqual({ tipo: 'secao', texto: 'Pedido para a IA' });
	});
	it('pista repetida aponta para o primeiro erro que a teve', () => {
		const b = montarRelatorio(dados([erro('recurso', 'https://ninasantana.com/a.png', 5), erro('recurso', 'https://ninasantana.com/b.png', 3)]));
		const pistasDo2 = b.slice(b.findIndex((x) => x.tipo === 'erro' && x.texto.startsWith('2.'))).filter((x) => x.tipo === 'campo' && x.rotulo === 'Pista:');
		expect(pistasDo2).toEqual([{ tipo: 'campo', rotulo: 'Pista:', texto: 'a mesma do erro 1.' }]);
	});
	it('sem erros, diz que não há', () => {
		const b = montarRelatorio(dados([]));
		expect(b.some((x) => x.tipo === 'paragrafo' && x.texto === 'Nenhum erro nas últimas 72 horas.')).toBe(true);
	});
});

describe('pistas', () => {
	it('vídeo AV1, arquivo do próprio site e falha única', () => {
		expect(pistas(ERROS[1], 'ninasantana.com').join(' ')).toMatch(/AV1\/HEVC.*H\.264/);
		const img = pistas(ERROS[0], 'ninasantana.com').join(' ');
		expect(img).toMatch(/próprio site/);
		expect(img).toMatch(/uma vez só/);
	});
	it('JavaScript: script de outro domínio e elemento que não existe', () => {
		const p = pistas(erro('js', 'TypeError: x is null', 2, 'cdn.terceiro.com'), 'ninasantana.com').join(' ');
		expect(p).toMatch(/cdn\.terceiro\.com/);
		expect(p).toMatch(/elemento ou variável que não existe/);
	});
});

describe('paraWinAnsi e nomeDoArquivo', () => {
	it('acentos ficam; seta e emoji viram o parecido ou saem', () => {
		expect(paraWinAnsi('Relatório · ação → feito ✅ – ok™')).toBe('Relatório · ação -> feito  – ok™');
	});
	it('nome do arquivo com o endereço e o dia de Brasília', () => {
		expect(nomeDoArquivo('dnms.fun/lojasmari', new Date('2026-10-15T01:00:00Z'))).toBe('erros-dnms.fun-lojasmari-2026-10-14.pdf');
	});
});

describe('gerarPdfErros', () => {
	it('um PDF de verdade, leve (bem abaixo de 30 KB), mesmo com muitos erros', async () => {
		const muitos = Array.from({ length: 60 }, (_, i) => erro(i % 3 ? 'recurso' : 'js', `https://ninasantana.com/assets/img/arquivo-numero-${i}-com-nome-bem-comprido-720.webp`, 60 - i));
		const bytes = await gerarPdfErros(dados(muitos));
		expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
		expect(bytes.length).toBeLessThan(30 * 1024);
		// O caso de hoje (3 erros): poucos KB.
		const hoje = await gerarPdfErros(dados(ERROS));
		console.log('tamanho: 60 erros', bytes.length, 'bytes; 3 erros', hoje.length, 'bytes');
		expect(hoje.length).toBeLessThan(12 * 1024);
	});
});
