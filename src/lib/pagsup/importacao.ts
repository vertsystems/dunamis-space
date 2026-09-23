// Pag's Up — leitura da planilha de prestadores enviada de fora.
//
// A parte que lê o .xlsx mora no excel.ts (é ela que carrega o exceljs); aqui
// fica só a tradução de "matriz de células" para prestadores, que é onde estão
// as decisões: qual coluna é qual, o que é obrigatório e o que já existe.
//
// O arquivo que chega é preenchido à mão, então nada aqui assume boa vontade:
// cabeçalho em qualquer ordem, com ou sem acento, valor escrito "R$ 1.200,50",
// linhas em branco no meio e o nome do prestador repetido são todos esperados.

import { LOJAS, SERVICE_CATEGORIES, type Provider } from './types';

/** Célula crua vinda do exceljs — o que interessa é virar texto. */
export type Celula = unknown;

/** Campos que a planilha preenche (o resto é do sistema). */
export type PrestadorImportado = Omit<Provider, 'id' | 'clientId'>;

/** Uma linha lida, já com o veredicto de importar ou não. */
export type LinhaImportada = {
	/** Número da linha no arquivo, para a pessoa achar o que corrigir. */
	linha: number;
	dados: PrestadorImportado;
	/** Motivo de não entrar. Ausente = entra. */
	erro?: string;
	/** Aceita, mas com um detalhe que vale avisar (LJ desconhecida, etc.). */
	aviso?: string;
	/** Já existe no cadastro (ou repetida no próprio arquivo). */
	duplicada?: boolean;
};

export type ResultadoLeitura = {
	linhas: LinhaImportada[];
	/** Colunas obrigatórias que não foram encontradas no cabeçalho. */
	faltando: string[];
	/** Colunas conhecidas no cabeçalho — usado para escolher a aba certa. */
	colunas: number;
};

/** Sem acento, sem espaço dobrado e em minúsculas — para comparar cabeçalhos e nomes. */
export function chave(v: unknown): string {
	return texto(v)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Texto de uma célula do exceljs. Além de string e número, uma célula pode
 * chegar como objeto: fórmula (`{ result }`), rich text (`{ richText }`),
 * hyperlink (`{ text }`) ou erro (`{ error }`) — copiar e colar de outra
 * planilha produz os três primeiros com facilidade.
 */
export function texto(v: unknown): string {
	if (v === null || v === undefined) return '';
	if (typeof v === 'string') return v.trim();
	if (typeof v === 'number' || typeof v === 'boolean') return String(v);
	if (v instanceof Date) return v.toISOString().slice(0, 10);
	if (typeof v === 'object') {
		const o = v as Record<string, unknown>;
		if (Array.isArray(o.richText)) {
			return o.richText.map((p) => texto((p as { text?: unknown }).text)).join('').trim();
		}
		if ('result' in o) return texto(o.result);
		if ('text' in o) return texto(o.text);
		if ('hyperlink' in o) return texto(o.hyperlink);
		if ('error' in o) return '';
	}
	return String(v).trim();
}

/**
 * Número escrito por gente: "R$ 1.200,50", "1200.50", "1.200" ou já numérico.
 *
 * O ponto é ambíguo — separa milhar em "1.200" e decimal em "1200.50" — então a
 * regra é: se existe vírgula, ela é o decimal e o ponto é milhar; sem vírgula,
 * um ponto só com 1 ou 2 dígitos depois é decimal, e o resto é milhar. Sem isso,
 * quem digita "1.200" recebia R$ 1,20 no cadastro.
 */
export function valor(v: unknown): number {
	if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
	const bruto = texto(v).replace(/[^\d.,-]/g, '');
	if (!bruto) return 0;
	let limpo: string;
	if (bruto.includes(',')) {
		limpo = bruto.replace(/\./g, '').replace(',', '.');
	} else {
		const partes = bruto.split('.');
		const decimal = partes.length > 1 && partes[partes.length - 1].length <= 2;
		limpo = decimal ? `${partes.slice(0, -1).join('')}.${partes[partes.length - 1]}` : partes.join('');
	}
	const n = Number(limpo);
	return Number.isFinite(n) ? n : 0;
}

/** Só os dígitos/letras do documento, igual ao cleanDoc do store. */
function documento(v: unknown): string {
	return texto(v).replace(/[.\-/\\ ]/g, '');
}

/**
 * CPF/CNPJ com a pontuação de volta, para mostrar. O cadastro guarda só os
 * dígitos (ver cleanDoc), e "12345678000190" numa planilha impressa é ilegível.
 * O que não tiver 11 nem 14 dígitos sai como está — meio documento digitado
 * errado não pode virar uma máscara que finge estar certa.
 */
export function formataDocumento(v: string | undefined | null): string {
	const d = documento(v);
	if (/^\d{11}$/.test(d)) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
	if (/^\d{14}$/.test(d))
		return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
	return d;
}

/**
 * Nomes aceitos para cada coluna. O primeiro de cada lista é o que a planilha
 * modelo escreve; os outros existem porque o arquivo pode ter vindo de uma
 * exportação nossa (que usa "Prestador"), de um CRM ou da cabeça de alguém.
 */
const COLUNAS = {
	name: ['nome', 'prestador', 'prestador de servicos', 'nome do prestador', 'razao social'],
	service: ['servico', 'categoria', 'tipo de servico', 'servico (categoria)'],
	region: ['regiao', 'cidade', 'cidade / regiao', 'cidade/regiao', 'local'],
	especialidade: ['descricao', 'especialidade', 'descricao do servico', 'observacao', 'observacoes'],
	cpf: ['cpf / cnpj', 'cpf/cnpj', 'cpf', 'cnpj', 'documento', 'cpf ou cnpj'],
	pix: ['chave pix', 'pix', 'chave'],
	whatsapp: ['whatsapp', 'telefone', 'celular', 'contato', 'fone', 'zap'],
	lj: ['lj', 'lj (loja)', 'loja', 'unidade', 'sigla'],
	defaultPrice: ['valor padrao', 'valor', 'preco', 'preco padrao', 'valor do servico']
} as const;

type Campo = keyof typeof COLUNAS;

/**
 * Chave de um título de coluna: a `chave` normal, sem as marcas de "campo
 * obrigatório" e sem o parêntese explicativo. A planilha modelo escreve
 * "Nome *", e sem isto o leitor não achava a própria coluna que ele gerou.
 */
function chaveCabecalho(v: unknown): string {
	return chave(v)
		.replace(/\s*\([^)]*\)\s*$/, '')
		.replace(/[*:†]+$/, '')
		.trim();
}

/** Coluna (índice) de cada campo, a partir da linha de cabeçalho. */
export function mapearColunas(cabecalho: Celula[]): Partial<Record<Campo, number>> {
	const mapa: Partial<Record<Campo, number>> = {};
	cabecalho.forEach((celula, i) => {
		const k = chaveCabecalho(celula);
		if (!k) return;
		for (const campo of Object.keys(COLUNAS) as Campo[]) {
			// `in` porque um cabeçalho com duas colunas iguais ("Valor" e "Valor
			// Padrão") deve ficar com a primeira, não com a última.
			if (campo in mapa) continue;
			if ((COLUNAS[campo] as readonly string[]).includes(k)) {
				mapa[campo] = i;
				return;
			}
		}
	});
	return mapa;
}

/**
 * Quantas colunas conhecidas a linha tem, e quantas células preenchidas — as
 * duas medidas que dizem se ela é o cabeçalho da tabela.
 */
function forca(linha: Celula[]): { reconhecidas: number; preenchidas: number } {
	const mapa = mapearColunas(linha);
	return {
		reconhecidas: Object.keys(mapa).length,
		preenchidas: linha.filter((c) => texto(c)).length
	};
}

/**
 * True para a linha que é de fato o cabeçalho da tabela.
 *
 * Exigir só uma coluna "Nome" não bastava: na aba "Como preencher" da planilha
 * modelo, a linha que explica a coluna Nome (`Nome | Sim | Nome do prestador...`)
 * passava por cabeçalho, e as explicações seguintes ("Serviço", "Região", ...)
 * entravam como prestadores. Por isso pede-se Nome MAIS uma segunda coluna
 * conhecida — ou que tudo que está preenchido na linha seja coluna conhecida,
 * que é o caso da planilha mínima, só com a coluna Nome.
 */
function ehCabecalho(linha: Celula[]): boolean {
	const mapa = mapearColunas(linha);
	if (mapa.name === undefined) return false;
	const { reconhecidas, preenchidas } = forca(linha);
	return reconhecidas >= 2 || reconhecidas === preenchidas;
}

/**
 * Acha a linha de cabeçalho. Não é sempre a primeira: a planilha modelo tem
 * faixa de título e instruções em cima, e um arquivo salvo do Excel costuma
 * trazer linhas soltas antes da tabela.
 */
export function acharCabecalho(matriz: Celula[][]): number {
	for (let i = 0; i < Math.min(matriz.length, 30); i++) {
		if (ehCabecalho(matriz[i] ?? [])) return i;
	}
	return -1;
}

/** Categoria oficial quando o que foi digitado é uma delas escrita de outro jeito. */
function categoria(bruto: string): string {
	if (!bruto) return 'Outros Serviços';
	const k = chave(bruto);
	return SERVICE_CATEGORIES.find((c) => chave(c) === k) ?? bruto;
}

/** Sigla de loja válida (aceita minúscula), ou null quando não é nenhuma. */
function loja(bruto: string): string | null {
	if (!bruto) return null;
	const k = chave(bruto);
	return LOJAS.find((l) => chave(l.sigla) === k || chave(l.nome) === k)?.sigla ?? null;
}

/**
 * As linhas de exemplo da planilha modelo — definidas aqui, e não no excel.ts,
 * porque quem escreve o modelo e quem o descarta na volta precisam concordar.
 * Ver exportModeloPrestadoresXlsx, que monta o arquivo a partir desta lista.
 */
export const EXEMPLOS_MODELO: PrestadorImportado[] = [
	{
		name: 'João Silva',
		service: 'Carros e Veículos de Som',
		region: 'Sorocaba SP',
		especialidade: 'Carro de som 4 horas',
		cpf: '123.456.789-00',
		pix: '(15) 99999-9999',
		whatsapp: '(15) 99999-9999',
		lj: 'PIE',
		defaultPrice: 350
	},
	{
		name: 'Maria Souza',
		service: 'Influenciadores',
		region: 'Guarujá SP',
		especialidade: 'Stories + reels',
		cpf: '12.345.678/0001-90',
		pix: 'maria@email.com',
		whatsapp: '(13) 98888-7777',
		lj: 'ENS',
		defaultPrice: 800
	}
];

/**
 * True para uma linha que é exemplo do modelo esquecido no arquivo.
 *
 * Exige nome E documento iguais aos do modelo: só pelo nome, um prestador que
 * de fato se chame João Silva seria recusado sem explicação. O CPF de exemplo
 * (123.456.789-00) é que torna o par inconfundível. A conferência antes de
 * gravar continua sendo a proteção principal — isto é conveniência.
 */
function ehExemploDoModelo(nome: string, doc: string): boolean {
	const k = chave(nome);
	return EXEMPLOS_MODELO.some((ex) => chave(ex.name) === k && documento(ex.cpf) === doc);
}

/**
 * Traduz a matriz de células em prestadores, marcando o que não entra e o que
 * já existe. Nada é gravado aqui — a tela mostra este resultado antes de
 * confirmar, para ninguém descobrir depois que importou 40 linhas erradas.
 *
 * @param existentes prestadores já cadastrados no cliente selecionado.
 */
export function lerPrestadores(
	matriz: Celula[][],
	existentes: Pick<Provider, 'name' | 'cpf'>[] = []
): ResultadoLeitura {
	const iCab = acharCabecalho(matriz);
	if (iCab < 0) return { linhas: [], faltando: ['Nome'], colunas: 0 };

	const col = mapearColunas(matriz[iCab]);
	const colunas = Object.keys(col).length;

	// Um nome ou documento já visto é duplicata — venha do cadastro ou de uma
	// linha anterior do próprio arquivo (planilha montada a partir de duas).
	const nomesVistos = new Set(existentes.map((p) => chave(p.name)).filter(Boolean));
	const docsVistos = new Set(existentes.map((p) => documento(p.cpf)).filter(Boolean));

	const celula = (linha: Celula[], campo: Campo): unknown =>
		col[campo] === undefined ? '' : linha[col[campo]!];

	const linhas: LinhaImportada[] = [];

	for (let i = iCab + 1; i < matriz.length; i++) {
		const bruta = matriz[i] ?? [];
		// `linha` é 1-based como o Excel mostra na lateral.
		const linha = i + 1;

		// Linha inteiramente vazia é separador visual, não erro de preenchimento.
		if (bruta.every((c) => !texto(c))) continue;

		const nome = texto(celula(bruta, 'name'));
		const doc = documento(celula(bruta, 'cpf'));
		const ljBruta = texto(celula(bruta, 'lj'));
		const ljValida = loja(ljBruta);

		const dados: PrestadorImportado = {
			name: nome,
			service: categoria(texto(celula(bruta, 'service'))),
			region: texto(celula(bruta, 'region')),
			defaultPrice: valor(celula(bruta, 'defaultPrice')),
			especialidade: texto(celula(bruta, 'especialidade')),
			cpf: doc,
			pix: texto(celula(bruta, 'pix')),
			whatsapp: texto(celula(bruta, 'whatsapp')),
			lj: ljValida ?? ''
		};

		if (!nome) {
			linhas.push({ linha, dados, erro: 'Sem nome' });
			continue;
		}
		if (ehExemploDoModelo(nome, doc)) {
			linhas.push({ linha, dados, erro: 'Linha de exemplo da planilha modelo' });
			continue;
		}

		const dupNome = nomesVistos.has(chave(nome));
		const dupDoc = !!doc && docsVistos.has(doc);
		if (dupNome || dupDoc) {
			linhas.push({
				linha,
				dados,
				duplicada: true,
				erro: dupDoc && !dupNome ? 'CPF/CNPJ já cadastrado' : 'Já cadastrado'
			});
			continue;
		}

		nomesVistos.add(chave(nome));
		if (doc) docsVistos.add(doc);

		const avisos: string[] = [];
		if (ljBruta && !ljValida) avisos.push(`LJ "${ljBruta}" não existe — ficou em branco`);
		if (!dados.region) avisos.push('Sem região');

		linhas.push({ linha, dados, aviso: avisos.join(' · ') || undefined });
	}

	return { linhas, faltando: [], colunas };
}

/** Resumo dos números para o texto da tela e do toast. */
export function resumir(linhas: LinhaImportada[]) {
	const novos = linhas.filter((l) => !l.erro);
	return {
		novos,
		total: linhas.length,
		duplicadas: linhas.filter((l) => l.duplicada).length,
		invalidas: linhas.filter((l) => l.erro && !l.duplicada).length,
		avisos: novos.filter((l) => l.aviso).length
	};
}
