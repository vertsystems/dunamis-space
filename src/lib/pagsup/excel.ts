// Pag's Up — geração das planilhas de pagamento (.xlsx) via ExcelJS.
// Portado 1:1 do app React (mesma formatação/cores). Download nativo, sem
// depender de file-saver.

import ExcelJS from 'exceljs';
import { hojeISO } from '$lib/datas';

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
	/** Categoria do serviço: Carro de Som, Locução Loja, Influenciadores… */
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
