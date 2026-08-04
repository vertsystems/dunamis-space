// Pag's Up — geração das planilhas de pagamento (.xlsx) via ExcelJS.
// Portado 1:1 do app React (mesma formatação/cores). Download nativo, sem
// depender de file-saver.

import ExcelJS from 'exceljs';

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

/** Planilha mensal das Negociações (rádios, agências, serviços fixos). */
export async function exportNegociacoesXlsx(
	items: NegExportItem[],
	opts: { paymentDate: string }
): Promise<void> {
	const grandTotal = items.reduce((sum, i) => sum + (Number(i.price) || 0), 0);

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Pag's Up";
	workbook.created = new Date();

	const ws = workbook.addWorksheet('Negociações');
	ws.views = [{ showGridLines: false }];

	ws.getColumn(1).width = 32;
	ws.getColumn(2).width = 38;
	ws.getColumn(3).width = 38;
	ws.getColumn(4).width = 32;
	ws.getColumn(5).width = 28;
	ws.getColumn(6).width = 15;
	ws.getColumn(7).width = 20;

	let startRow = 1;

	const titleRow = ws.addRow(['Pgmtos Mensais e Negociações LM']);
	ws.mergeCells(`A${startRow}:G${startRow}`);
	titleRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	titleRow.height = 46;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	if (opts.paymentDate.trim()) {
		const infoPagm = opts.paymentDate.trim() || '-';
		const row = ws.addRow(['Data pgmto (Todos):', infoPagm, '', '', '', '', '']);
		ws.mergeCells(`B${startRow}:G${startRow}`);
		row.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
		row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
		row.getCell(2).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
		row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
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

	const catRow = ws.addRow(['NEGOCIAÇÕES MENSAIS']);
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
	download(new Blob([buffer]), 'Negociacoes Mensais Lojas Mari.xlsx');
}

// ---- Planilha Mensal (prestação de contas do mês) -------------------------

export interface MonthlyExportItem {
	providerName: string;
	service: string;
	region: string;
	date: string;
	notes: string;
	value: number;
}

export interface MonthlyExportGroup {
	loja: string;
	itens: MonthlyExportItem[];
}

/**
 * Fechamento do mês: mesma identidade visual da planilha semanal (faixa preta,
 * blocos, zebrado, resumo e total em laranja), mas agrupada por LOJA — é assim
 * que a prestação de contas é lida no fim do mês.
 */
export async function exportMonthlyXlsx(
	groups: MonthlyExportGroup[],
	opts: { mesLabel: string; emitidoEm?: string }
): Promise<void> {
	const grandTotal = groups
		.flatMap((g) => g.itens)
		.reduce((sum, i) => sum + (Number(i.value) || 0), 0);

	const workbook = new ExcelJS.Workbook();
	workbook.creator = "Pag's Up";
	workbook.created = new Date();

	const ws = workbook.addWorksheet('Planilha Mensal');
	ws.views = [{ showGridLines: false }];

	ws.getColumn(1).width = 38; // Prestador
	ws.getColumn(2).width = 24; // Serviço
	ws.getColumn(3).width = 24; // Região
	ws.getColumn(4).width = 16; // Dt pagto
	ws.getColumn(5).width = 40; // Observações
	ws.getColumn(6).width = 20; // Valor

	let startRow = 1;

	const titleRow = ws.addRow(['Pgmtos Mensais Marketing LM']);
	ws.mergeCells(`A${startRow}:F${startRow}`);
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
		opts.emitidoEm ?? '',
		''
	]);
	ws.mergeCells(`B${startRow}:C${startRow}`);
	ws.mergeCells(`E${startRow}:F${startRow}`);
	infoRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
	infoRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	infoRow.getCell(2).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
	infoRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
	infoRow.getCell(4).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
	infoRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
	infoRow.getCell(5).font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
	infoRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
	infoRow.eachCell((cell) => {
		cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
		cell.border = BORDER_THIN;
	});
	infoRow.height = 35;
	startRow++;

	ws.addRow([]);
	ws.getRow(startRow).height = 17;
	startRow++;

	const headerRow = ws.addRow([
		'Prestador de serviços',
		'Serviço',
		'Região',
		'Dt Pagm.',
		'Observações',
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
		const spacerRow = ws.addRow(['', '', '', '', '', '']);
		ws.mergeCells(`A${startRow}:F${startRow}`);
		spacerRow.height = 24;
		startRow++;

		// Aqui o bloco é a LOJA (na semanal é a categoria de serviço).
		const lojaRow = ws.addRow([group.loja.toUpperCase()]);
		ws.mergeCells(`A${startRow}:F${startRow}`);
		lojaRow.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FF111827' } };
		lojaRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
		lojaRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
		lojaRow.getCell(1).border = BORDER_THIN;
		lojaRow.height = 24;
		startRow++;

		group.itens.forEach((item, index) => {
			const row = ws.addRow([
				item.providerName,
				item.service || '-',
				item.region || '-',
				item.date,
				item.notes || '-',
				Number(item.value) || 0
			]);
			const rowBgColor = index % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
			row.eachCell((cell, colNumber) => {
				cell.font = { name: 'Arial', size: 12, color: { argb: 'FF374151' } };
				cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
				cell.border = BORDER_THIN;
				if (colNumber === 6) {
					cell.numFmt = '"R$" #,##0.00';
					cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
				} else if (colNumber === 4) {
					cell.alignment = { vertical: 'middle', horizontal: 'center' };
				} else {
					cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
				}
			});
			row.height = 22;
			startRow++;
		});
	}

	const resumoSpacer = ws.addRow(['', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:F${startRow}`);
	resumoSpacer.height = 17;
	startRow++;

	const resumoTitle = ws.addRow(['RESUMO POR LOJA']);
	ws.mergeCells(`A${startRow}:F${startRow}`);
	resumoTitle.getCell(1).font = { name: 'Arial', bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
	resumoTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
	resumoTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
	resumoTitle.getCell(1).border = { ...BORDER_THIN, bottom: { style: 'medium', color: { argb: 'FFCCCCCC' } } };
	resumoTitle.height = 22;
	startRow++;

	for (const group of groups) {
		const subtotal = group.itens.reduce((sum, i) => sum + (Number(i.value) || 0), 0);
		const row = ws.addRow(['', '', '', '', 'Total ' + group.loja, subtotal]);
		ws.mergeCells(`A${startRow}:D${startRow}`);
		row.getCell(5).font = { name: 'Arial', bold: true, size: 15, color: { argb: 'FF374151' } };
		row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
		row.getCell(6).numFmt = '"R$" #,##0.00';
		row.getCell(6).font = { name: 'Arial', bold: true, size: 15, color: { argb: 'FF111827' } };
		row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
		row.eachCell((cell) => {
			cell.border = BORDER_THIN;
		});
		row.height = 35;
		startRow++;
	}

	const totalSpacer = ws.addRow(['', '', '', '', '', '']);
	ws.mergeCells(`A${startRow}:F${startRow}`);
	for (let i = 1; i <= 6; i++) {
		totalSpacer.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCCCCC' } };
	}
	totalSpacer.height = 28;
	startRow++;

	const grandRow = ws.addRow(['', '', '', '', 'TOTAL DO MÊS', grandTotal]);
	ws.mergeCells(`A${startRow}:D${startRow}`);
	grandRow.getCell(5).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FF111827' } };
	grandRow.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
	grandRow.getCell(6).font = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFF97316' } };
	grandRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
	grandRow.getCell(6).numFmt = '"R$" #,##0.00';
	grandRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
	grandRow.eachCell((cell) => {
		cell.border = BORDER_THIN;
	});
	grandRow.height = 46;

	const buffer = await workbook.xlsx.writeBuffer();
	download(new Blob([buffer]), `Pgmto Mensal Marketing — ${opts.mesLabel}.xlsx`);
}
