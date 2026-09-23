// Pag's Up — geração das planilhas de pagamento (.xlsx) via ExcelJS.
// Portado 1:1 do app React (mesma formatação/cores). Download nativo, sem
// depender de file-saver.

import ExcelJS from 'exceljs';
import { hojeISO } from '$lib/datas';
import { LOJAS, SERVICE_CATEGORIES, type Provider } from './types';
import {
	EXEMPLOS_MODELO,
	formataDocumento,
	lerPrestadores,
	type ResultadoLeitura
} from './importacao';

export interface ScheduleExportItem {
	providerName: string;
	region: string;
	cpf: string;
	/** Descrição do serviço = observação ou o tipo de serviço do prestador. */
	description: string;
	pix: string;
	price: number | '';
}
export interface ScheduleExportGroup {
	serviceType: string;
	items: ScheduleExportItem[];
}

export interface NegExportItem {
	company: string;
	service: string;
	supplier: string;
	pix: string;
	region: string;
	dueDate: string;
	price: number | '';
}

/** Laranja escuro das faixas da Planilha Mensal (mesma família do laranja do total). */
const LARANJA_ESCURO = 'FFC2410C';

/** Cinza escuro da faixa do mês de referência. */
const CINZA_ESCURO = 'FF374151';

/**
 * Mês corrente no fuso de São Paulo, no mesmo formato que a Planilha Mensal
 * recebe de fora ("agosto de 2026" + "2026"). Passa por hojeISO porque
 * `new Date().getMonth()` erra o mês na virada quando o relógio é UTC.
 */
function mesVigente(agora: Date = new Date()): { mesLabel: string; ano: string } {
	const [ano, mm] = hojeISO(agora).split('-');
	const mesLabel = new Date(Number(ano), Number(mm) - 1, 1).toLocaleDateString('pt-BR', {
		month: 'long',
		year: 'numeric'
	});
	return { mesLabel, ano };
}

const BORDER_THIN = {
	bottom: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
	top: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
	left: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } },
	right: { style: 'thin' as const, color: { argb: 'FFCCCCCC' } }
};

/** Dispara o download do blob no navegador (substitui file-saver). */
function download(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Planilha semanal do Cronograma (carro de som, locução, etc.). */
export async function exportScheduleXlsx(
	groups: ScheduleExportGroup[],
	opts: { sendToFinanceDate: string; paymentDate: string }
): Promise<void> {
	const grandTotal = groups
		.flatMap((g) => g.items)
		.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Pag's Up";
	workbook.created = new Date();

	const ws = workbook.addWorksheet('Cronograma');
	ws.views = [{ showGridLines: false }];

	ws.getColumn(1).width = 38;
	ws.getColumn(2).width = 20;
	ws.getColumn(3).width = 22;
	ws.getColumn(4).width = 48;
	ws.getColumn(5).width = 16;
	ws.getColumn(6).width = 32;
	ws.getColumn(7).width = 20;

	let startRow = 1;

	const titleRow = ws.addRow(['Pgmtos Marketing LM']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	titleRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	titleRow.height = 46;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	if (opts.sendToFinanceDate.trim() || opts.paymentDate.trim()) {
		const infoEmissao = opts.sendToFinanceDate.trim() || '-';
		const infoPagm = opts.paymentDate.trim() || '-';

		const row = ws.addRow(['Data de emissão:', infoEmissao, '', '', 'Data pgmto:', infoPagm, '']);
		ws.mergeCells(`B${startRow}:D${startRow}`);
		ws.mergeCells(`F${startRow}:G${startRow}`);

		row.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
		row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
		row.getCell(2).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
		row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
		row.getCell(4).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
		row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
		row.getCell(5).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
		row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
		row.eachCell((cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
			cell.border = BORDER_THIN;
		});
		row.height = 35;
		startRow++;

		ws.addRow([]);
		ws.getRow(startRow).height = 17;
		startRow++;
	}

	const headerRow = ws.addRow([
		'Prestador de serviços',
		'Região',
		'CPF/CNPJ',
		'Descrição do serviço',
		'Dt Pagm.',
		'Chave Pix',
		'Valor'
	]);
	headerRow.eachCell((cell) => {
		cell.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
		cell.alignment = { vertical: 'middle', horizontal: 'center' };
		cell.border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	});
	headerRow.height = 37;
	startRow++;

	for (const group of groups) {
		const spacerRow = ws.addRow(['', '', '', '', '', '', '']);
		ws.mergeCells(`A${startRow}:G${startRow}`);
		spacerRow.height = 24;
		startRow++;

		const catRow = ws.addRow([group.serviceType.toUpperCase()]);
		ws.mergeCells(`A${startRow}:G${startRow}`);
		catRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
		catRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
		catRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
		catRow.getCell(1).border = BORDER_THIN;
		catRow.height = 24;
		startRow++;

		group.items.forEach((item, index) => {
			const row = ws.addRow([
				item.providerName,
				item.region || '-',
				item.cpf || '-',
				item.description,
				opts.paymentDate.trim(),
				item.pix || '-',
				item.price === '' ? 'A definir' : Number(item.price)
			]);
			const rowBgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
			row.eachCell((cell, colNumber) => {
				cell.font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
				cell.border = BORDER_THIN;
				if (colNumber === 7) {
					if (item.price !== '') cell.numFmt = '"R$" #,##0.00';
					cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
				} else if (colNumber === 5) {
					cell.alignment = { vertical: 'middle', horizontal: 'center' };
				} else {
					cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
				}
			});
			row.height = 22;
			startRow++;
		});
	}

	const resumoSpacer = ws.addRow(['', '', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	resumoSpacer.height = 17;
	startRow++;

	const resumoTitle = ws.addRow(['RESUMO DOS PAGAMENTOS']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	resumoTitle.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	resumoTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	resumoTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	resumoTitle.getCell(1).border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	resumoTitle.height = 22;
	startRow++;

	for (const group of groups) {
		const subtotal = group.items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
		const row = ws.addRow(['', '', '', '', '', 'Total ' + group.serviceType, subtotal]);
		ws.mergeCells(`A${startRow}:E${startRow}`);
		row.getCell(6).font = { name: 'Arial', bold: true, size: 15, color: { argb: 'FF374151' } };
		row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
		row.getCell(7).numFmt = '"R$" #,##0.00';
		row.getCell(7).font = { name: 'Arial', bold: true, size: 15, color: { argb: 'FF111827' } };
		row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
		row.eachCell((cell) => {
			cell.border = BORDER_THIN;
		});
		row.height = 35;
		startRow++;
	}

	const totalSpacer = ws.addRow(['', '', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	for (let i = 1; i <= 7; i++) {
		totalSpacer.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
	}
	totalSpacer.height = 28;
	startRow++;

	const grandRow = ws.addRow(['', '', '', '', '', 'TOTAL DE PAGAMENTOS', grandTotal]);
	ws.mergeCells(`A${startRow}:E${startRow}`);
	grandRow.getCell(6).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF111827' } };
	grandRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
	grandRow.getCell(7).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFF97316' } };
	grandRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(7).numFmt = '"R$" #,##0.00';
	grandRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
	grandRow.eachCell((cell) => {
		cell.border = BORDER_THIN;
	});
	grandRow.height = 46;

	const buffer = await workbook.xlsx.writeBuffer();
	download(new Blob([buffer]), 'Pgmto Semanal Marketing Lojas Mari.xlsx');
}

/**
 * Planilha mensal das Negociações (rádios, agências, serviços fixos).
 *
 * A lista de negociações é fixa e não zera de um mês para o outro, então a
 * planilha é sempre do MÊS VIGENTE — o mês é calculado aqui (fuso de SP), não
 * pedido a quem exporta, para não haver como gerar o mês errado.
 */
export async function exportNegociacoesXlsx(
	items: NegExportItem[],
	opts: { paymentDate: string }
): Promise<void> {
	const grandTotal = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
	const { mesLabel, ano } = mesVigente();
	const mesTitulo = `${mesPorExtenso(mesLabel)} ${ano}`.trim();

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Pag's Up";
	workbook.created = new Date();

	const ws = workbook.addWorksheet(nomeAbaMes('Negociações', mesLabel, ano, 'Negociações'));
	ws.views = [{ showGridLines: false }];

	ws.getColumn(1).width = 32;
	ws.getColumn(2).width = 38;
	ws.getColumn(3).width = 38;
	ws.getColumn(4).width = 32;
	ws.getColumn(5).width = 28;
	ws.getColumn(6).width = 15;
	ws.getColumn(7).width = 20;

	let startRow = 1;

	const titleRow = ws.addRow([`Pgmtos Mensais e Negociações LM | ${mesTitulo.toUpperCase()}`]);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	titleRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	titleRow.height = 46;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	// Mês de referência sempre presente (mesma faixa da Planilha Mensal); a data
	// de pagamento é opcional e divide a linha quando existe.
	const infoRow = ws.addRow([
		'Mês de referência:',
		mesTitulo,
		'',
		opts.paymentDate.trim() ? 'Data pgmto (Todos):' : '',
		'',
		opts.paymentDate.trim(),
		''
	]);
	ws.mergeCells(`B${startRow}:C${startRow}`);
	ws.mergeCells(`D${startRow}:E${startRow}`);
	ws.mergeCells(`F${startRow}:G${startRow}`);
	infoRow.eachCell((cell) => {
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
		cell.border = BORDER_THIN;
	});
	for (let col = 1; col <= 3; col++) {
		infoRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA_ESCURO } };
		infoRow.getCell(col).border = BORDER_THIN;
	}
	infoRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	infoRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	infoRow.getCell(2).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	infoRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
	infoRow.getCell(4).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
	infoRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	infoRow.getCell(6).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
	infoRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
	infoRow.height = 35;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	const headerRow = ws.addRow([
		'Empresa/Prestador',
		'Serviço',
		'Fornecedor',
		'Chave Pix',
		'Região',
		'DDV',
		'Valor'
	]);
	headerRow.eachCell((cell) => {
		cell.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
		cell.alignment = { vertical: 'middle', horizontal: 'center' };
		cell.border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	});
	headerRow.height = 37;
	startRow++;

	const spacerRow = ws.addRow(['', '', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	spacerRow.height = 24;
	startRow++;

	const catRow = ws.addRow([`NEGOCIAÇÕES MENSAIS — ${mesTitulo.toUpperCase()}`]);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	catRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
	catRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
	catRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	catRow.getCell(1).border = BORDER_THIN;
	catRow.height = 24;
	startRow++;

	items.forEach((item, index) => {
		const row = ws.addRow([
			item.company,
			item.service,
			item.supplier,
			item.pix || '-',
			item.region || '-',
			item.dueDate || '-',
			item.price === '' ? 'A definir' : Number(item.price)
		]);
		const rowBgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
		row.eachCell((cell, colNumber) => {
			cell.font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
			cell.border = BORDER_THIN;
			if (colNumber === 7) {
				if (item.price !== '') cell.numFmt = '"R$" #,##0.00';
				cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
			} else if (colNumber === 6) {
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
			} else {
				cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
			}
		});
		row.height = 22;
		startRow++;
	});

	const resumoSpacer = ws.addRow(['', '', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	resumoSpacer.height = 17;
	startRow++;

	const resumoTitle = ws.addRow(['RESUMO DOS PAGAMENTOS MENSAIS']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	resumoTitle.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	resumoTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	resumoTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	resumoTitle.getCell(1).border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	resumoTitle.height = 22;
	startRow++;

	const totalSpacer = ws.addRow(['', '', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	for (let i = 1; i <= 7; i++) {
		totalSpacer.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
	}
	totalSpacer.height = 28;
	startRow++;

	const grandRow = ws.addRow(['', '', '', '', 'TOTAL NEGOCIAÇÕES', '', grandTotal]);
	ws.mergeCells(`A${startRow}:D${startRow}`);
	ws.mergeCells(`E${startRow}:F${startRow}`);
	grandRow.getCell(1).border = BORDER_THIN;
	grandRow.getCell(5).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF111827' } };
	grandRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
	grandRow.getCell(7).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFF97316' } };
	grandRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(7).numFmt = '"R$" #,##0.00';
	grandRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
	grandRow.eachCell((cell) => {
		cell.border = BORDER_THIN;
	});
	grandRow.height = 46;

	const buffer = await workbook.xlsx.writeBuffer();
	download(new Blob([buffer]), `Negociacoes Mensais Lojas Mari — ${mesTitulo}.xlsx`);
}

// ---- Planilha Mensal (prestação de contas do mês) -------------------------

export interface MonthlyExportItem {
	providerName: string;
	/** Cliente do pagamento (Lojas Mari, Rede Bazzar…). */
	cliente: string;
	region: string;
	/** Sigla da unidade onde o trabalho foi feito (CDP, ADB, PIT…). */
	lj: string;
	date: string;
	notes: string;
	value: number;
}

export interface MonthlyExportGroup {
	/** Categoria do serviço: Carros e Veículos de Som, Locução Loja, Influenciadores… */
	categoria: string;
	itens: MonthlyExportItem[];
}

/**
 * Fechamento do mês, dividido por categoria de serviço — a mesma leitura da
 * planilha semanal, e com a mesma identidade visual (faixa preta, blocos,
 * zebrado, resumo e total em laranja).
 *
 * O cliente vira COLUNA em vez de bloco: agrupando por categoria, sem essa
 * coluna não daria para saber de quem é cada pagamento (a LJ só cobre as
 * unidades da Lojas Mari).
 */
/**
 * Nome da aba com o mês e o ano — quem abre a planilha vê de que mês ela é já
 * pela guia, sem precisar rolar até o cabeçalho.
 *
 * O mesLabel chega como "agosto de 2026"; com prefixo "Planilha" isso vira
 * "Planilha Agosto 2026". O Excel recusa aba com mais de 31 caracteres ou com
 * : \ / ? * [ ], então o nome é higienizado antes de entrar.
 */
function nomeAbaMes(prefixo: string, mesLabel: string, ano: string, fallback: string): string {
	const nome = [prefixo, mesPorExtenso(mesLabel), ano].filter(Boolean).join(' ');
	return nome.replace(/[:\\/?*[\]]/g, '-').slice(0, 31) || fallback;
}

/** "agosto de 2026" -> "Agosto". */
function mesPorExtenso(mesLabel: string): string {
	const mes = (mesLabel ?? '').replace(/\s+de\s+\d{4}\s*$/i, '').trim();
	return mes ? mes.charAt(0).toUpperCase() + mes.slice(1) : '';
}

export async function exportMonthlyXlsx(
	groups: MonthlyExportGroup[],
	opts: { mesLabel: string; ano: string; emitidoEm?: string }
): Promise<void> {
	const grandTotal = groups
		.flatMap((g) => g.itens)
		.reduce((sum, i) => sum + (Number(i.value) || 0), 0);

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Pag's Up";
	workbook.created = new Date();

	const ws = workbook.addWorksheet(
		nomeAbaMes('Planilha', opts.mesLabel, opts.ano, 'Planilha Mensal')
	);
	ws.views = [{ showGridLines: false }];

	ws.getColumn(1).width = 38; // Prestador
	ws.getColumn(2).width = 24; // Cliente
	ws.getColumn(3).width = 24; // Região
	ws.getColumn(4).width = 10; // LJ
	ws.getColumn(5).width = 16; // Dt pagto
	ws.getColumn(6).width = 36; // Observações
	ws.getColumn(7).width = 20; // Valor

	let startRow = 1;

	const titleRow = ws.addRow([`LOJAS MARI | INVESTIMENTOS MARKETING | ${opts.ano}`]);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	titleRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	titleRow.height = 46;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	const infoRow = ws.addRow([
		'Mês de referência:',
		opts.mesLabel,
		'',
		'Emitido em:',
		'',
		opts.emitidoEm ?? '',
		''
	]);
	ws.mergeCells(`B${startRow}:C${startRow}`);
	// "Emitido em:" ocupava só a coluna da LJ (width 10) e saía cortado; agora
	// pega D:E, e o valor vai para F:G.
	ws.mergeCells(`D${startRow}:E${startRow}`);
	ws.mergeCells(`F${startRow}:G${startRow}`);
	infoRow.eachCell((cell) => {
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
		cell.border = BORDER_THIN;
	});
	// O mês de referência sai em faixa cinza escura com letra branca (A até C, que
	// é o rótulo mais o valor mesclado) — o "Emitido em:" fica no cinza claro.
	for (let col = 1; col <= 3; col++) {
		infoRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA_ESCURO } };
		infoRow.getCell(col).border = BORDER_THIN;
	}
	infoRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	infoRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	infoRow.getCell(2).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	infoRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
	infoRow.getCell(4).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
	infoRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	infoRow.getCell(6).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
	infoRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
	infoRow.height = 35;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	const headerRow = ws.addRow([
		'Prestador de serviços',
		'Cliente',
		'Região',
		'LJ',
		'Dt Pagm.',
		'Observações',
		'Valor'
	]);
	headerRow.eachCell((cell) => {
		cell.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LARANJA_ESCURO } };
		cell.alignment = { vertical: 'middle', horizontal: 'center' };
		cell.border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	});
	headerRow.height = 37;
	startRow++;

	for (const group of groups) {
		const spacerRow = ws.addRow(['', '', '', '', '', '', '']);
		ws.mergeCells(`A${startRow}:G${startRow}`);
		spacerRow.height = 24;
		startRow++;

		const catRow = ws.addRow([group.categoria.toUpperCase()]);
		ws.mergeCells(`A${startRow}:G${startRow}`);
		catRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
		catRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
		catRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
		catRow.getCell(1).border = BORDER_THIN;
		catRow.height = 24;
		startRow++;

		group.itens.forEach((item, index) => {
			const row = ws.addRow([
				item.providerName,
				item.cliente || '-',
				item.region || '-',
				item.lj || '-',
				item.date,
				item.notes || '-',
				Number(item.value) || 0
			]);
			const rowBgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
			row.eachCell((cell, colNumber) => {
				cell.font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
				cell.border = BORDER_THIN;
				if (colNumber === 7) {
					cell.numFmt = '"R$" #,##0.00';
					cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
				} else if (colNumber === 4 || colNumber === 5) {
					// LJ e data centralizadas: são colunas curtas.
					cell.alignment = { vertical: 'middle', horizontal: 'center' };
					if (colNumber === 4) cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF374151' } };
				} else {
					cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
				}
			});
			row.height = 22;
			startRow++;
		});
	}

	const resumoSpacer = ws.addRow(['', '', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	resumoSpacer.height = 17;
	startRow++;

	const resumoTitle = ws.addRow(['RESUMO DOS PAGAMENTOS']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	resumoTitle.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	resumoTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LARANJA_ESCURO } };
	resumoTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	resumoTitle.getCell(1).border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	resumoTitle.height = 22;
	startRow++;

	for (const group of groups) {
		const subtotal = group.itens.reduce((sum, i) => sum + (Number(i.value) || 0), 0);
		const row = ws.addRow(['', '', '', '', '', 'Total ' + group.categoria, subtotal]);
		ws.mergeCells(`A${startRow}:E${startRow}`);
		row.getCell(6).font = { name: 'Arial', bold: true, size: 15, color: { argb: 'FF374151' } };
		row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
		row.getCell(7).numFmt = '"R$" #,##0.00';
		row.getCell(7).font = { name: 'Arial', bold: true, size: 15, color: { argb: 'FF111827' } };
		row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
		row.eachCell((cell) => {
			cell.border = BORDER_THIN;
		});
		row.height = 35;
		startRow++;
	}

	const totalSpacer = ws.addRow(['', '', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	for (let i = 1; i <= 7; i++) {
		totalSpacer.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
	}
	totalSpacer.height = 28;
	startRow++;

	const grandRow = ws.addRow(['', '', '', '', '', 'TOTAL DO MÊS', grandTotal]);
	ws.mergeCells(`A${startRow}:E${startRow}`);
	grandRow.getCell(6).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF111827' } };
	grandRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
	grandRow.getCell(7).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFF97316' } };
	grandRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(7).numFmt = '"R$" #,##0.00';
	grandRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
	grandRow.eachCell((cell) => {
		cell.border = BORDER_THIN;
	});
	grandRow.height = 46;

	const buffer = await workbook.xlsx.writeBuffer();
	download(new Blob([buffer]), `Investimentos Marketing — ${opts.mesLabel}.xlsx`);
}

// ---------------------------------------------------------------------------
// Cadastro de prestadores: catálogo, planilha modelo e leitura do que sobe.
// ---------------------------------------------------------------------------

/** Azul-petróleo do cabeçalho do catálogo — separa da semanal (navy) e da mensal (laranja). */
const AZUL_PETROLEO = 'FF155E75';

export interface ProviderExportItem {
	name: string;
	/** O que a pessoa faz; vazio = a própria categoria já descreve. */
	especialidade: string;
	region: string;
	cpf: string;
	pix: string;
	whatsapp: string;
	lj: string;
	defaultPrice: number;
}
export interface ProviderExportGroup {
	categoria: string;
	itens: ProviderExportItem[];
}

/** Colunas do catálogo e da planilha modelo — a ordem é a mesma nas duas. */
const COLS_PRESTADOR = [
	{ titulo: 'Nome', largura: 34 },
	{ titulo: 'Serviço', largura: 26 },
	{ titulo: 'Região', largura: 22 },
	{ titulo: 'Descrição', largura: 26 },
	{ titulo: 'CPF / CNPJ', largura: 22 },
	{ titulo: 'Chave PIX', largura: 30 },
	{ titulo: 'WhatsApp', largura: 20 },
	{ titulo: 'LJ', largura: 9 },
	{ titulo: 'Valor Padrão', largura: 16 }
] as const;

/** Última coluna em letra ('I' para 9 colunas) — para os merges das faixas. */
const FIM_COL = String.fromCharCode(64 + COLS_PRESTADOR.length);

/** Aba com o nome por extenso de cada sigla de LJ; o catálogo só mostra a sigla. */
function abaUnidades(workbook: ExcelJS.Workbook) {
	const ws = workbook.addWorksheet('Unidades (LJ)');
	ws.views = [{ showGridLines: false }];
	ws.getColumn(1).width = 12;
	ws.getColumn(2).width = 52;

	const titulo = ws.addRow(['UNIDADES (LJ)']);
	ws.mergeCells('A1:B1');
	titulo.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	titulo.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	titulo.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	titulo.height = 34;

	const cab = ws.addRow(['Sigla', 'Unidade']);
	cab.eachCell((cell) => {
		cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA_ESCURO } };
		cell.alignment = { vertical: 'middle', horizontal: 'center' };
		cell.border = BORDER_THIN;
	});
	cab.height = 24;

	LOJAS.forEach((l, i) => {
		const row = ws.addRow([l.sigla, l.nome]);
		row.eachCell((cell, col) => {
			cell.font = { name: 'Arial', size: 11, color: { argb: 'FF374151' }, bold: col === 1 };
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB' }
			};
			cell.border = BORDER_THIN;
			cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'center' : 'left', indent: col === 1 ? 0 : 1 };
		});
		row.height = 20;
	});
}

/**
 * Catálogo de prestadores cadastrados (.xlsx), agrupado por categoria.
 *
 * É o cadastro inteiro do cliente, não o cronograma: serve para conferir dados
 * fora do sistema e para reimportar depois de editar em massa — por isso os
 * títulos das colunas são exatamente os que a importação reconhece.
 */
export async function exportPrestadoresXlsx(
	groups: ProviderExportGroup[],
	opts: { cliente: string; emitidoEm?: string }
): Promise<void> {
	const total = groups.reduce((n, g) => n + g.itens.length, 0);

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Pag's Up";
	workbook.created = new Date();

	const ws = workbook.addWorksheet('Prestadores');
	ws.views = [{ showGridLines: false }];
	COLS_PRESTADOR.forEach((c, i) => (ws.getColumn(i + 1).width = c.largura));

	let startRow = 1;

	const titleRow = ws.addRow([`CADASTRO DE PRESTADORES${opts.cliente ? ` | ${opts.cliente.toUpperCase()}` : ''}`]);
	ws.mergeCells(`A${startRow}:${FIM_COL}${startRow}`);
	titleRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	titleRow.height = 46;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	const infoRow = ws.addRow([
		'Prestadores cadastrados:',
		'',
		`${total}`,
		'',
		'Emitido em:',
		'',
		opts.emitidoEm ?? '',
		'',
		''
	]);
	ws.mergeCells(`A${startRow}:B${startRow}`);
	ws.mergeCells(`C${startRow}:D${startRow}`);
	ws.mergeCells(`E${startRow}:F${startRow}`);
	ws.mergeCells(`G${startRow}:${FIM_COL}${startRow}`);
	infoRow.eachCell((cell) => {
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
		cell.border = BORDER_THIN;
	});
	// A contagem sai em faixa escura com letra branca (rótulo + número), igual ao
	// mês de referência da Planilha Mensal; a data fica no cinza claro.
	for (let col = 1; col <= 4; col++) {
		infoRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA_ESCURO } };
		infoRow.getCell(col).border = BORDER_THIN;
		infoRow.getCell(col).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	}
	infoRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	infoRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
	infoRow.getCell(5).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
	infoRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	infoRow.getCell(7).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
	infoRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };
	infoRow.height = 35;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	const headerRow = ws.addRow(COLS_PRESTADOR.map((c) => c.titulo));
	headerRow.eachCell((cell) => {
		cell.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_PETROLEO } };
		cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
		cell.border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	});
	headerRow.height = 37;
	// Congela tudo até o cabeçalho: com 77 prestadores, rolar a lista perdia de
	// vista qual coluna era qual.
	ws.views = [{ state: 'frozen', ySplit: startRow, showGridLines: false }];
	const linhaCabecalho = startRow;
	startRow++;

	for (const group of groups) {
		const spacerRow = ws.addRow([]);
		ws.mergeCells(`A${startRow}:${FIM_COL}${startRow}`);
		spacerRow.height = 24;
		startRow++;

		const catRow = ws.addRow([`${group.categoria.toUpperCase()}  (${group.itens.length})`]);
		ws.mergeCells(`A${startRow}:${FIM_COL}${startRow}`);
		catRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
		catRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
		catRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
		catRow.getCell(1).border = BORDER_THIN;
		catRow.height = 24;
		startRow++;

		group.itens.forEach((item, index) => {
			const row = ws.addRow([
				item.name,
				group.categoria,
				item.region || '-',
				item.especialidade || '-',
				formataDocumento(item.cpf) || '-',
				item.pix || '-',
				item.whatsapp || '-',
				item.lj || '-',
				item.defaultPrice > 0 ? item.defaultPrice : ''
			]);
			const rowBgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
			row.eachCell((cell, colNumber) => {
				cell.font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
				cell.border = BORDER_THIN;
				if (colNumber === 9) {
					if (item.defaultPrice > 0) cell.numFmt = '"R$" #,##0.00';
					cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
				} else if (colNumber === 8) {
					cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF374151' } };
					cell.alignment = { vertical: 'middle', horizontal: 'center' };
				} else {
					cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
				}
			});
			row.height = 22;
			startRow++;
		});
	}

	// Filtro no cabeçalho: com a lista toda numa aba, procurar por região ou LJ
	// sem sair do Excel é o uso mais óbvio do arquivo. A faixa termina na última
	// linha de prestador — incluir o resumo encheria os menus de filtro com
	// "Total Gráficas" e afins.
	if (total) ws.autoFilter = { from: `A${linhaCabecalho}`, to: `${FIM_COL}${startRow - 1}` };

	const resumoSpacer = ws.addRow([]);
	ws.mergeCells(`A${startRow}:${FIM_COL}${startRow}`);
	resumoSpacer.height = 17;
	startRow++;

	const resumoTitle = ws.addRow(['RESUMO POR CATEGORIA']);
	ws.mergeCells(`A${startRow}:${FIM_COL}${startRow}`);
	resumoTitle.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	resumoTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_PETROLEO } };
	resumoTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	resumoTitle.getCell(1).border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	resumoTitle.height = 22;
	startRow++;

	// Subcabeçalho: sem ele, a coluna do valor médio ficava sem nome e precisava de
	// uma legenda com seta embaixo, que ninguém liga à coluna certa.
	const subRow = ws.addRow(['', '', '', '', '', 'Categoria', 'Prestadores', '', 'Valor médio']);
	ws.mergeCells(`A${startRow}:E${startRow}`);
	ws.mergeCells(`G${startRow}:H${startRow}`);
	for (const col of [6, 7, 9]) {
		subRow.getCell(col).font = { name: 'Arial', bold: true, size: 10, color: { argb: 'FF6B7280' } };
		subRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
		subRow.getCell(col).border = BORDER_THIN;
		subRow.getCell(col).alignment = {
			vertical: 'middle',
			horizontal: col === 7 ? 'center' : 'right',
			indent: col === 7 ? 0 : 1
		};
	}
	subRow.height = 20;
	startRow++;

	for (const group of groups) {
		// Média e não soma: `defaultPrice` é preço de referência de cada prestador,
		// somar não significaria nada.
		const comPreco = group.itens.filter((i) => i.defaultPrice > 0);
		const media = comPreco.length
			? comPreco.reduce((s, i) => s + i.defaultPrice, 0) / comPreco.length
			: 0;
		const row = ws.addRow([
			'', '', '', '', '',
			group.categoria,
			`${group.itens.length} ${group.itens.length === 1 ? 'prestador' : 'prestadores'}`,
			'',
			media > 0 ? media : ''
		]);
		ws.mergeCells(`A${startRow}:E${startRow}`);
		ws.mergeCells(`G${startRow}:H${startRow}`);
		row.getCell(6).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF374151' } };
		row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
		row.getCell(7).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
		row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
		if (media > 0) row.getCell(9).numFmt = '"R$" #,##0.00';
		row.getCell(9).font = { name: 'Arial', size: 12, color: { argb: 'FF6B7280' } };
		row.getCell(9).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
		row.eachCell((cell) => (cell.border = BORDER_THIN));
		row.height = 28;
		startRow++;
	}

	const totalSpacer = ws.addRow([]);
	ws.mergeCells(`A${startRow}:${FIM_COL}${startRow}`);
	for (let i = 1; i <= COLS_PRESTADOR.length; i++) {
		totalSpacer.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
	}
	totalSpacer.height = 28;
	startRow++;

	const grandRow = ws.addRow([
		'', '', '', '', '',
		'TOTAL DE PRESTADORES',
		`${total}`,
		'',
		''
	]);
	ws.mergeCells(`A${startRow}:E${startRow}`);
	ws.mergeCells(`G${startRow}:${FIM_COL}${startRow}`);
	grandRow.getCell(6).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF111827' } };
	grandRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
	grandRow.getCell(7).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFF97316' } };
	grandRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	grandRow.eachCell((cell) => (cell.border = BORDER_THIN));
	grandRow.height = 46;

	abaUnidades(workbook);

	const buffer = await workbook.xlsx.writeBuffer();
	const sufixo = opts.cliente ? ` — ${opts.cliente}` : '';
	download(new Blob([buffer]), `Prestadores${sufixo}.xlsx`);
}

/**
 * As linhas de exemplo, na ordem das colunas. Vêm do importacao.ts, que é quem
 * as descarta na volta — escrever aqui um exemplo que o leitor não reconhece
 * cadastraria "João Silva" de verdade.
 */
const LINHAS_EXEMPLO = EXEMPLOS_MODELO.map((ex) => [
	ex.name,
	ex.service,
	ex.region,
	ex.especialidade ?? '',
	ex.cpf ?? '',
	ex.pix ?? '',
	ex.whatsapp ?? '',
	ex.lj ?? '',
	ex.defaultPrice
]);

/**
 * Planilha modelo para cadastrar prestadores em massa.
 *
 * Os títulos das colunas são os mesmos do catálogo, porque é o mesmo leitor que
 * recebe os dois: quem exporta, edita e devolve o arquivo não precisa saber
 * disso. As duas linhas de exemplo ficam em itálico cinza e são descartadas na
 * importação — dava para apagá-las e esquecer, e aí "João Silva" virava
 * prestador de verdade.
 */
export async function exportModeloPrestadoresXlsx(
	categorias: string[] = [...SERVICE_CATEGORIES]
): Promise<void> {
	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Pag's Up";
	workbook.created = new Date();

	// Aba de apoio para as listas de validação. Vem antes para poder ser
	// referenciada, e fica oculta: não é para preencher nada nela.
	const listas = workbook.addWorksheet('Listas');
	listas.state = 'veryHidden';
	listas.getColumn(1).width = 30;
	listas.getColumn(2).width = 10;
	listas.addRow(['Serviço', 'LJ']);
	const maxLista = Math.max(categorias.length, LOJAS.length);
	for (let i = 0; i < maxLista; i++) {
		listas.addRow([categorias[i] ?? null, LOJAS[i]?.sigla ?? null]);
	}

	const ws = workbook.addWorksheet('Prestadores');
	ws.views = [{ showGridLines: false }];
	COLS_PRESTADOR.forEach((c, i) => (ws.getColumn(i + 1).width = c.largura));

	let startRow = 1;

	const titleRow = ws.addRow(['PLANILHA MODELO | CADASTRO DE PRESTADORES']);
	ws.mergeCells(`A${startRow}:${FIM_COL}${startRow}`);
	titleRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	titleRow.height = 46;
	startRow++;

	const ajudaRow = ws.addRow([
		'Preencha uma linha por prestador. Só o Nome é obrigatório. Apague as duas linhas de exemplo (em itálico) — ou deixe, que o sistema as ignora.'
	]);
	ws.mergeCells(`A${startRow}:${FIM_COL}${startRow}`);
	ajudaRow.getCell(1).font = { name: 'Arial', size: 11, color: { argb: 'FF374151' } };
	ajudaRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
	ajudaRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	ajudaRow.getCell(1).border = BORDER_THIN;
	ajudaRow.height = 30;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 14;
	startRow++;

	const headerRow = ws.addRow(COLS_PRESTADOR.map((c) => (c.titulo === 'Nome' ? 'Nome *' : c.titulo)));
	headerRow.eachCell((cell) => {
		cell.font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_PETROLEO } };
		cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
		cell.border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	});
	headerRow.height = 37;
	ws.views = [{ state: 'frozen', ySplit: startRow, showGridLines: false }];
	startRow++;

	for (const exemplo of LINHAS_EXEMPLO) {
		const row = ws.addRow(exemplo);
		row.eachCell((cell, colNumber) => {
			cell.font = { name: 'Arial', italic: true, size: 12, color: { argb: 'FF9CA3AF' } };
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
			cell.border = BORDER_THIN;
			if (colNumber === 9) {
				cell.numFmt = '"R$" #,##0.00';
				cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
			} else if (colNumber === 8) {
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
			} else {
				cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
			}
		});
		row.height = 22;
		startRow++;
	}

	// Linhas em branco já formatadas e com as listas de Serviço e LJ prontas:
	// digitar categoria à mão era a forma mais fácil de criar "Influenciador"
	// como categoria nova sem querer.
	const PRIMEIRA_VAZIA = startRow;
	const ULTIMA_VAZIA = startRow + 199;
	for (let n = PRIMEIRA_VAZIA; n <= ULTIMA_VAZIA; n++) {
		const row = ws.addRow([]);
		for (let col = 1; col <= COLS_PRESTADOR.length; col++) {
			const cell = row.getCell(col);
			cell.font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: (n - PRIMEIRA_VAZIA) % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB' }
			};
			cell.border = BORDER_THIN;
			if (col === 9) {
				cell.numFmt = '"R$" #,##0.00';
				cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
			} else if (col === 8) {
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
			} else {
				cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
			}
		}
		row.height = 22;
	}

	// Validação em toda a faixa útil, exemplos incluídos.
	const deValidacao = PRIMEIRA_VAZIA - LINHAS_EXEMPLO.length;
	for (let n = deValidacao; n <= ULTIMA_VAZIA; n++) {
		ws.getCell(`B${n}`).dataValidation = {
			type: 'list',
			allowBlank: true,
			formulae: [`Listas!$A$2:$A$${categorias.length + 1}`],
			showErrorMessage: true,
			errorStyle: 'warning',
			errorTitle: 'Categoria fora da lista',
			error: 'Escolha uma das categorias da lista. Se insistir, ela será criada como categoria nova.'
		};
		ws.getCell(`H${n}`).dataValidation = {
			type: 'list',
			allowBlank: true,
			formulae: [`Listas!$B$2:$B$${LOJAS.length + 1}`],
			showErrorMessage: true,
			errorStyle: 'stop',
			errorTitle: 'LJ inválida',
			error: 'Use uma das siglas da lista (ver a aba "Como preencher").'
		};
	}

	abaComoPreencher(workbook, categorias);
	abaUnidades(workbook);

	const buffer = await workbook.xlsx.writeBuffer();
	download(new Blob([buffer]), 'Planilha Modelo — Prestadores.xlsx');
}

/** Aba de instruções da planilha modelo: o que cada coluna espera. */
function abaComoPreencher(workbook: ExcelJS.Workbook, categorias: string[]) {
	const ws = workbook.addWorksheet('Como preencher');
	ws.views = [{ showGridLines: false }];
	ws.getColumn(1).width = 18;
	ws.getColumn(2).width = 13;
	ws.getColumn(3).width = 72;

	const titulo = ws.addRow(['COMO PREENCHER']);
	ws.mergeCells('A1:C1');
	titulo.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	titulo.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	titulo.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	titulo.height = 40;

	const cab = ws.addRow(['Coluna', 'Obrigatória', 'O que escrever']);
	cab.eachCell((cell) => {
		cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_PETROLEO } };
		cell.alignment = { vertical: 'middle', horizontal: 'center' };
		cell.border = BORDER_THIN;
	});
	cab.height = 26;

	const LINHAS: [string, string, string][] = [
		['Nome', 'Sim', 'Nome do prestador ou razão social. Nome repetido não entra duas vezes: se já existir no cadastro, a linha é marcada como duplicada.'],
		['Serviço', 'Não', `A categoria que agrupa o prestador. Escolha da lista: ${categorias.join(', ')}. Em branco vira "Outros Serviços".`],
		['Região', 'Não', 'Cidade e estado onde atende. Ex.: Sorocaba SP.'],
		['Descrição', 'Não', 'O que a pessoa faz dentro da categoria. Ex.: Pintura Facial. É o que aparece na etiqueta da tela.'],
		['CPF / CNPJ', 'Não', 'Com ou sem pontuação — o sistema guarda só os números.'],
		['Chave PIX', 'Não', 'Telefone, e-mail, CPF/CNPJ ou chave aleatória.'],
		['WhatsApp', 'Não', 'Celular com DDD. Ex.: (15) 99999-9999.'],
		['LJ', 'Não', 'Sigla da unidade onde o trabalho é feito (ver a aba "Unidades (LJ)"). Sigla que não existe entra em branco.'],
		['Valor Padrão', 'Não', 'Valor de referência do serviço. Aceita 350, 350,00 ou R$ 350,00.']
	];

	LINHAS.forEach(([coluna, obrig, texto], i) => {
		const row = ws.addRow([coluna, obrig, texto]);
		row.eachCell((cell, col) => {
			cell.font = {
				name: 'Arial',
				size: 11,
				bold: col === 1,
				color: { argb: col === 2 && obrig === 'Sim' ? 'FFC2410C' : 'FF374151' }
			};
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB' }
			};
			cell.border = BORDER_THIN;
			cell.alignment = {
				vertical: 'middle',
				horizontal: col === 2 ? 'center' : 'left',
				indent: col === 2 ? 0 : 1,
				wrapText: col === 3
			};
		});
		row.height = 34;
	});

	ws.addRow([]);
	const nota = ws.addRow([
		'',
		'',
		'Pode apagar as colunas que não vai usar, menos a de Nome. A ordem das colunas não importa — o sistema acha cada uma pelo título.'
	]);
	nota.getCell(3).font = { name: 'Arial', italic: true, size: 10, color: { argb: 'FF6B7280' } };
	nota.getCell(3).alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
	nota.height = 30;
}

/**
 * Linhas que são faixa visual, não dado: as que têm uma célula mesclada larga
 * começando na coluna A. É o que descreve o título, o separador, a faixa de
 * categoria e as linhas de total do nosso próprio catálogo — sem isso,
 * reimportar o arquivo baixado criava prestadores chamados "CARROS E VEÍCULOS
 * DE SOM (2)" e "RESUMO POR CATEGORIA".
 *
 * A regra vale para qualquer planilha, não só a nossa: título mesclado em cima
 * da tabela é o formato mais comum de arquivo montado à mão.
 */
function linhasDeFaixa(ws: ExcelJS.Worksheet): Set<number> {
	const faixas = new Set<number>();
	// `ws.model.merges` só existe depois do load; o `_merges` cobre o caso de a
	// versão do exceljs não expor o model.
	const cru = (ws as unknown as { model?: { merges?: string[] } }).model?.merges;
	const ranges: string[] = Array.isArray(cru)
		? cru
		: Object.values(
				(ws as unknown as { _merges?: Record<string, { range?: string }> })._merges ?? {}
			)
				.map((m) => m?.range ?? '')
				.filter(Boolean);

	for (const range of ranges) {
		const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range.replace(/\$/g, ''));
		if (!m) continue;
		const letraParaNum = (s: string) =>
			[...s].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
		const c1 = letraParaNum(m[1]);
		const c2 = letraParaNum(m[3]);
		if (c1 !== 1 || c2 - c1 + 1 < 3) continue;
		for (let r = Number(m[2]); r <= Number(m[4]); r++) faixas.add(r);
	}
	return faixas;
}

/**
 * Lê o .xlsx enviado e devolve os prestadores reconhecidos (ver importacao.ts).
 *
 * Procura a tabela em todas as abas em vez de assumir a primeira: o arquivo pode
 * ser a nossa planilha modelo (onde a aba de dados vem depois da de listas) ou
 * uma pasta de trabalho com a tabela na terceira aba.
 */
export async function lerPlanilhaPrestadores(
	arquivo: ArrayBuffer,
	existentes: Pick<Provider, 'name' | 'cpf'>[] = []
): Promise<ResultadoLeitura> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(arquivo);

	let melhor: ResultadoLeitura = { linhas: [], faltando: ['Nome'], colunas: 0 };

	workbook.eachSheet((ws) => {
		if (ws.state === 'hidden' || ws.state === 'veryHidden') return;

		const faixas = linhasDeFaixa(ws);
		const matriz: unknown[][] = [];
		ws.eachRow({ includeEmpty: true }, (row) => {
			// row.values é 1-based com o índice 0 vazio; o slice alinha com as colunas.
			const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
			matriz[row.number - 1] = faixas.has(row.number) ? [] : [...vals];
		});
		for (let i = 0; i < matriz.length; i++) matriz[i] ??= [];

		const lido = lerPrestadores(matriz, existentes);
		// Ganha a aba com o cabeçalho mais completo e, no empate, a que rendeu mais
		// linhas aproveitáveis. A aba "Como preencher" perde pelo cabeçalho: as
		// colunas dela ("Coluna", "Obrigatória") não são de prestador.
		const util = (r: ResultadoLeitura) => r.linhas.filter((l) => !l.erro).length;
		const melhorQue =
			lido.colunas > melhor.colunas ||
			(lido.colunas === melhor.colunas && util(lido) > util(melhor));
		if (melhorQue) melhor = lido;
	});

	return melhor;
}
