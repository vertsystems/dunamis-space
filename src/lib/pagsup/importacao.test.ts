// A planilha de prestadores é preenchida à mão, fora do sistema. Estes testes
// cobrem o que chega torto na prática: cabeçalho em outra ordem, valor escrito
// como gente escreve, prestador repetido e as linhas de exemplo do modelo.
import { describe, it, expect } from 'vitest';
import {
	acharCabecalho,
	EXEMPLOS_MODELO,
	lerPrestadores,
	mapearColunas,
	resumir,
	valor
} from './importacao';

const CABECALHO = [
	'Nome',
	'Serviço',
	'Região',
	'Descrição',
	'CPF / CNPJ',
	'Chave PIX',
	'WhatsApp',
	'LJ',
	'Valor Padrão'
];

const linha = (...c: unknown[]) => c;

describe("Pag's Up — leitura da planilha de prestadores", () => {
	it('lê uma linha completa', () => {
		const { linhas } = lerPrestadores([
			CABECALHO,
			linha('Gráfica Sorocaba', 'Gráficas', 'Sorocaba SP', 'Banners', '123.456.789-00', 'graf@x.com', '(15) 99999-9999', 'PIE', 'R$ 350,00')
		]);
		expect(linhas).toHaveLength(1);
		expect(linhas[0].erro).toBeUndefined();
		expect(linhas[0].dados).toEqual({
			name: 'Gráfica Sorocaba',
			service: 'Gráficas',
			region: 'Sorocaba SP',
			especialidade: 'Banners',
			cpf: '12345678900',
			pix: 'graf@x.com',
			whatsapp: '(15) 99999-9999',
			lj: 'PIE',
			defaultPrice: 350
		});
	});

	it('acha as colunas fora de ordem e com o título escrito de outro jeito', () => {
		const mapa = mapearColunas(['CIDADE', 'prestador', 'cpf/cnpj', 'Valor']);
		expect(mapa).toEqual({ region: 0, name: 1, cpf: 2, defaultPrice: 3 });
	});

	it('acha o cabeçalho abaixo do título e das instruções da planilha modelo', () => {
		const matriz = [
			['PLANILHA MODELO | CADASTRO DE PRESTADORES'],
			['Preencha uma linha por prestador.'],
			[],
			CABECALHO,
			linha('Ana Lima')
		];
		expect(acharCabecalho(matriz)).toBe(3);
		expect(lerPrestadores(matriz).linhas.map((l) => l.dados.name)).toEqual(['Ana Lima']);
	});

	it('avisa quando não há coluna de nome em lugar nenhum', () => {
		const r = lerPrestadores([['Cidade', 'Valor'], ['Sorocaba', 100]]);
		expect(r.faltando).toEqual(['Nome']);
		expect(r.linhas).toEqual([]);
	});

	it('usa a numeração de linha do Excel para a pessoa achar o que corrigir', () => {
		const { linhas } = lerPrestadores([CABECALHO, linha('Ana'), linha('Bruno')]);
		expect(linhas.map((l) => l.linha)).toEqual([2, 3]);
	});

	it('pula linha em branco no meio sem chamar de erro', () => {
		const { linhas } = lerPrestadores([CABECALHO, linha('Ana'), [], linha('', '', ''), linha('Bruno')]);
		expect(linhas.map((l) => l.dados.name)).toEqual(['Ana', 'Bruno']);
	});

	it('recusa a linha sem nome quando há outros dados nela', () => {
		const { linhas } = lerPrestadores([CABECALHO, linha('', 'Gráficas', 'Sorocaba')]);
		expect(linhas[0].erro).toBe('Sem nome');
	});

	it('descarta os exemplos que vêm na planilha modelo', () => {
		// Dava para baixar o modelo, preencher abaixo e esquecer de apagar os dois
		// exemplos — e "João Silva" entrava como prestador de verdade.
		const exemplos = EXEMPLOS_MODELO.map((ex) =>
			linha(ex.name, ex.service, ex.region, ex.especialidade, ex.cpf, ex.pix, ex.whatsapp, ex.lj, ex.defaultPrice)
		);
		const { linhas } = lerPrestadores([CABECALHO, ...exemplos, linha('Prestador Real', 'Gráficas')]);
		expect(linhas.filter((l) => !l.erro).map((l) => l.dados.name)).toEqual(['Prestador Real']);
		expect(linhas[0].erro).toBe('Linha de exemplo da planilha modelo');
	});

	it('cadastra quem de fato se chama como o exemplo, se o CPF for outro', () => {
		// Descartar pelo nome sozinho recusaria um João Silva de verdade, sem dizer
		// por quê. O par nome + CPF de exemplo é que identifica o modelo intocado.
		const { linhas } = lerPrestadores([
			CABECALHO,
			linha('João Silva', 'Gráficas', 'Ibiúna SP', '', '987.654.321-00')
		]);
		expect(linhas[0].erro).toBeUndefined();
		expect(linhas[0].dados.name).toBe('João Silva');
	});

	it('marca quem já está cadastrado, comparando sem acento nem caixa', () => {
		const { linhas } = lerPrestadores(
			[CABECALHO, linha('LOCUÇÃO SOROCABA'), linha('Gente Nova')],
			[{ name: 'Locuçao Sorocaba', cpf: '' }]
		);
		expect(linhas[0].duplicada).toBe(true);
		expect(linhas[0].erro).toBe('Já cadastrado');
		expect(linhas[1].duplicada).toBeUndefined();
	});

	it('marca duplicata por CPF mesmo com o nome escrito diferente', () => {
		const { linhas } = lerPrestadores(
			[CABECALHO, linha('J. Silva ME', '', '', '', '123.456.789-00')],
			[{ name: 'João Silva', cpf: '12345678900' }]
		);
		expect(linhas[0].erro).toBe('CPF/CNPJ já cadastrado');
	});

	it('não importa o mesmo prestador duas vezes quando ele se repete no arquivo', () => {
		const { linhas } = lerPrestadores([CABECALHO, linha('Ana Lima'), linha('ana lima')]);
		expect(linhas[0].erro).toBeUndefined();
		expect(linhas[1].duplicada).toBe(true);
	});

	it('normaliza a categoria escrita sem acento e sem a caixa certa', () => {
		const { linhas } = lerPrestadores([CABECALHO, linha('Ana', 'carros e veiculos de som')]);
		expect(linhas[0].dados.service).toBe('Carros e Veículos de Som');
	});

	it('categoria em branco vira Outros Serviços, e uma nova é mantida', () => {
		const { linhas } = lerPrestadores([CABECALHO, linha('Ana'), linha('Bruno', 'Drone')]);
		expect(linhas[0].dados.service).toBe('Outros Serviços');
		expect(linhas[1].dados.service).toBe('Drone');
	});

	it('LJ inexistente entra em branco, com aviso, em vez de barrar a linha', () => {
		const { linhas } = lerPrestadores([
			CABECALHO,
			linha('Ana', 'Gráficas', 'Sorocaba', '', '', '', '', 'XPTO')
		]);
		expect(linhas[0].erro).toBeUndefined();
		expect(linhas[0].dados.lj).toBe('');
		expect(linhas[0].aviso).toContain('XPTO');
	});

	it('aceita a LJ em minúscula e a unidade escrita por extenso', () => {
		const { linhas } = lerPrestadores([
			CABECALHO,
			linha('Ana', '', '', '', '', '', '', 'pie'),
			linha('Bruno', '', '', '', '', '', '', 'Lojas Mari – Ibiúna')
		]);
		expect(linhas.map((l) => l.dados.lj)).toEqual(['PIE', 'IBI']);
	});

	it('avisa a falta de região sem impedir o cadastro', () => {
		const { linhas } = lerPrestadores([CABECALHO, linha('Ana', 'Gráficas')]);
		expect(linhas[0].erro).toBeUndefined();
		expect(linhas[0].aviso).toBe('Sem região');
	});

	it('lê célula de fórmula e de texto formatado', () => {
		// Copiar e colar de outra planilha traz os dois formatos.
		const { linhas } = lerPrestadores([
			CABECALHO,
			linha({ formula: 'A1', result: 'Ana Lima' }, { richText: [{ text: 'Grá' }, { text: 'ficas' }] })
		]);
		expect(linhas[0].dados.name).toBe('Ana Lima');
		expect(linhas[0].dados.service).toBe('Gráficas');
	});

	it('resume os números que a tela de conferência mostra', () => {
		const { linhas } = lerPrestadores(
			[
				CABECALHO,
				linha('Nova Gráfica', 'Gráficas', 'Sorocaba'),
				linha('Sem Região', 'Gráficas'),
				linha('', 'Gráficas', 'Sorocaba'),
				linha('Ja Existe')
			],
			[{ name: 'Já Existe', cpf: '' }]
		);
		const r = resumir(linhas);
		expect(r).toMatchObject({ total: 4, duplicadas: 1, invalidas: 1, avisos: 1 });
		expect(r.novos.map((l) => l.dados.name)).toEqual(['Nova Gráfica', 'Sem Região']);
	});
});

describe("Pag's Up — valor escrito à mão na planilha", () => {
	it.each([
		['R$ 350,00', 350],
		['1.200,50', 1200.5],
		['1200.50', 1200.5],
		// Sem isso, "1.200" era lido como 1,20 — um zero a menos no cadastro.
		['1.200', 1200],
		['1.200.000', 1200000],
		['350', 350],
		[350, 350],
		[1200.5, 1200.5],
		['', 0],
		['a definir', 0],
		[null, 0],
		[undefined, 0]
	])('%s → %s', (entrada, esperado) => {
		expect(valor(entrada)).toBe(esperado);
	});
});
