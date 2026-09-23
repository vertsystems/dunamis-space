// As planilhas de prestadores geradas aqui precisam voltar pela importação:
// quem baixa o cadastro, corrige no Excel e devolve o arquivo é o caminho mais
// natural do recurso, e ele já quebrou de duas formas.
//
// 1) As faixas de categoria e o resumo do catálogo entravam como prestadores
//    chamados "CARROS E VEÍCULOS DE SOM (2)" e "RESUMO POR CATEGORIA".
// 2) Na planilha modelo, a aba "Como preencher" ganhava da aba de dados e as
//    descrições das colunas ("Serviço", "Região", ...) viravam prestadores.
import { describe, it, expect, beforeAll } from 'vitest';

// O excel.ts baixa o arquivo pelo DOM (ver download()); no teste, o Blob é
// capturado em vez de virar download.
const gerados: Record<string, Buffer> = {};

beforeAll(() => {
	const g = globalThis as Record<string, unknown>;
	let ultimo: { __buf: Buffer } | null = null;
	g.Blob = class {
		__buf: Buffer;
		constructor(partes: ArrayBuffer[]) {
			this.__buf = Buffer.from(partes[0]);
		}
	};
	g.URL = Object.assign(globalThis.URL, {
		createObjectURL: (b: { __buf: Buffer }) => {
			ultimo = b;
			return 'blob:x';
		},
		revokeObjectURL: () => {}
	});
	g.document = {
		createElement: () => ({
			href: '',
			download: '',
			click() {
				if (ultimo) gerados[(this as { download: string }).download] = ultimo.__buf;
			},
			remove() {}
		}),
		body: { appendChild: () => {} }
	};
});

/** O Buffer do node como ArrayBuffer, que é o que o leitor recebe do <input>. */
const comoArrayBuffer = (b: Buffer): ArrayBuffer =>
	b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

const PRESTADORES = [
	{
		name: 'Carro de Som Sorocaba',
		especialidade: '',
		region: 'Sorocaba SP',
		cpf: '12345678900',
		pix: '(15) 99999-1111',
		whatsapp: '(15) 99999-1111',
		lj: 'PIE',
		defaultPrice: 350
	},
	{
		name: 'Som na Estrada Eventos e Publicidade ME',
		especialidade: 'Carro de som 8h',
		region: 'Ibiúna SP',
		cpf: '12345678000190',
		pix: 'contato@somnaestrada.com.br',
		whatsapp: '(15) 98888-2222',
		lj: 'IBI',
		defaultPrice: 1200.5
	},
	{
		name: 'Ana Locuções',
		especialidade: 'Locução institucional',
		region: 'Guarujá SP',
		cpf: '',
		pix: 'ana@loc.com',
		whatsapp: '(13) 97777-3333',
		lj: 'ENS',
		defaultPrice: 0
	}
];

describe("Pag's Up — ida e volta das planilhas de prestadores", () => {
	beforeAll(async () => {
		const { exportPrestadoresXlsx, exportModeloPrestadoresXlsx } = await import('./excel');
		await exportPrestadoresXlsx(
			[
				{ categoria: 'Carros e Veículos de Som', itens: PRESTADORES.slice(0, 2) },
				{ categoria: 'Locução Loja', itens: PRESTADORES.slice(2) }
			],
			{ cliente: 'Lojas Mari', emitidoEm: '23/09/2026' }
		);
		await exportModeloPrestadoresXlsx(['Carros e Veículos de Som', 'Locução Loja', 'Gráficas']);
	});

	it('gera os dois arquivos com o nome esperado', () => {
		expect(Object.keys(gerados).sort()).toEqual([
			'Planilha Modelo — Prestadores.xlsx',
			'Prestadores — Lojas Mari.xlsx'
		]);
	});

	it('relê o catálogo trazendo só os prestadores, sem as faixas nem o resumo', async () => {
		const { lerPlanilhaPrestadores } = await import('./excel');
		const r = await lerPlanilhaPrestadores(
			comoArrayBuffer(gerados['Prestadores — Lojas Mari.xlsx'])
		);
		expect(r.faltando).toEqual([]);
		expect(r.linhas.filter((l) => !l.erro).map((l) => l.dados.name)).toEqual(
			PRESTADORES.map((p) => p.name)
		);
	});

	it('preserva os dados de cada prestador na volta', async () => {
		const { lerPlanilhaPrestadores } = await import('./excel');
		const r = await lerPlanilhaPrestadores(
			comoArrayBuffer(gerados['Prestadores — Lojas Mari.xlsx'])
		);
		// O CPF sai pontuado na planilha e volta só com os dígitos, como o
		// cadastro guarda. Sem valor e sem CPF continuam vazios, não "-".
		expect(r.linhas.find((l) => l.dados.name === 'Ana Locuções')!.dados).toMatchObject({
			service: 'Locução Loja',
			region: 'Guarujá SP',
			especialidade: 'Locução institucional',
			lj: 'ENS',
			cpf: '',
			defaultPrice: 0
		});
		expect(
			r.linhas.find((l) => l.dados.name.startsWith('Som na Estrada'))!.dados
		).toMatchObject({ cpf: '12345678000190', defaultPrice: 1200.5, lj: 'IBI' });
	});

	it('lê a planilha modelo pela aba de dados, não pela de instruções', async () => {
		const { lerPlanilhaPrestadores } = await import('./excel');
		const r = await lerPlanilhaPrestadores(
			comoArrayBuffer(gerados['Planilha Modelo — Prestadores.xlsx'])
		);
		expect(r.faltando).toEqual([]);
		// O modelo em branco não cadastra ninguém: só traz os dois exemplos, e
		// marcados como exemplo.
		expect(r.linhas.filter((l) => !l.erro)).toEqual([]);
		expect(r.linhas.map((l) => l.erro)).toEqual([
			'Linha de exemplo da planilha modelo',
			'Linha de exemplo da planilha modelo'
		]);
	});
});
