// LeadGrap — exportação/importação de leads em CSV (compatível com Excel PT-BR).
import type { LeadDTO } from './types';
import { STAGE_LABEL } from './types';

// ---- Exportação ----

function escapeCell(value: unknown): string {
	if (value == null) return '';
	const s = String(value);
	if (/["\n\r,;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

const EXPORT_HEADERS = [
	'Nome',
	'Categoria',
	'Telefone',
	'Email',
	'Instagram',
	'Facebook',
	'Site',
	'Tem site',
	'Endereço',
	'Nota',
	'Avaliações',
	'Estágio',
	'Google Maps',
	'Anotações',
	'Capturado em'
];

/** Gera o conteúdo CSV (com BOM, delimitador ';', CRLF) dos leads dados. */
export function leadsToCsv(leads: LeadDTO[]): string {
	const linhas = [EXPORT_HEADERS.join(';')];
	for (const l of leads) {
		linhas.push(
			[
				l.name,
				l.category ?? '',
				l.phone ?? '',
				l.email ?? '',
				l.instagram ?? '',
				l.facebook ?? '',
				l.website ?? '',
				l.hasWebsite ? 'Sim' : 'Não',
				l.address ?? '',
				l.rating ?? '',
				l.reviewCount ?? '',
				STAGE_LABEL[l.stage],
				l.googleUrl ?? '',
				l.notes ?? '',
				new Date(l.createdAt).toLocaleString('pt-BR')
			]
				.map(escapeCell)
				.join(';')
		);
	}
	return '﻿' + linhas.join('\r\n');
}

/** Dispara o download do CSV dos leads (respeita a lista passada, ex.: filtrados). */
export function downloadLeadsCsv(leads: LeadDTO[]): void {
	const csv = leadsToCsv(leads);
	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

// ---- Importação ----

export type ParsedLeadRow = {
	name: string;
	phone: string | null;
	email: string | null;
	website: string | null;
	category: string | null;
	address: string | null;
	instagram: string | null;
	facebook: string | null;
	rating: number | null;
	reviewCount: number | null;
	tags: string | null;
};

/** Parser CSV que respeita aspas e quebras de linha dentro de células. */
function parseCsv(text: string, delimiter: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let inQuotes = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					cell += '"';
					i++;
				} else inQuotes = false;
			} else cell += c;
		} else if (c === '"') {
			inQuotes = true;
		} else if (c === delimiter) {
			row.push(cell);
			cell = '';
		} else if (c === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
		} else if (c === '\r') {
			// ignora (CRLF)
		} else {
			cell += c;
		}
	}
	if (cell.length > 0 || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}
	return rows;
}

function normalizarHeader(h: string): string {
	return h
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

const ALIASES: Record<string, string[]> = {
	name: ['nome', 'name', 'empresa'],
	phone: ['telefone', 'phone', 'fone', 'celular', 'whatsapp'],
	email: ['email', 'e-mail'],
	website: ['website', 'site', 'url'],
	category: ['categoria', 'category'],
	address: ['endereco', 'address'],
	instagram: ['instagram'],
	facebook: ['facebook'],
	rating: ['nota', 'rating'],
	reviewCount: ['avaliacoes', 'reviews'],
	tags: ['tags', 'etiquetas']
};

function toNumber(v: string): number | null {
	if (!v) return null;
	const n = Number(v.replace(/\./g, '').replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

/**
 * Faz o parse de um CSV de leads. Detecta delimitador (';' ou ','),
 * remove BOM, mapeia cabeçalhos por aliases. Só entram linhas com nome.
 */
export function parseLeadsCsv(text: string): ParsedLeadRow[] {
	let content = text;
	if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
	const firstLine = content.split(/\r?\n/, 1)[0] ?? '';
	const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

	const rows = parseCsv(content, delimiter).filter((r) => r.some((c) => c.trim() !== ''));
	if (rows.length < 2) return [];

	const headers = rows[0].map(normalizarHeader);
	const colOf: Record<string, number> = {};
	for (const [field, aliases] of Object.entries(ALIASES)) {
		const idx = headers.findIndex((h) => aliases.includes(h));
		if (idx >= 0) colOf[field] = idx;
	}

	const out: ParsedLeadRow[] = [];
	for (let i = 1; i < rows.length; i++) {
		const r = rows[i];
		const get = (f: string): string => (colOf[f] != null ? (r[colOf[f]] ?? '').trim() : '');
		const name = get('name');
		if (!name) continue;
		out.push({
			name,
			phone: get('phone') || null,
			email: get('email') || null,
			website: get('website') || null,
			category: get('category') || null,
			address: get('address') || null,
			instagram: get('instagram') || null,
			facebook: get('facebook') || null,
			rating: toNumber(get('rating')),
			reviewCount: toNumber(get('reviewCount')),
			tags: get('tags') || null
		});
	}
	return out;
}
