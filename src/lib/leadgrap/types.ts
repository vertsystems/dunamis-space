// LeadGrap — tipos e regras de negócio (portado do app Next.js para o dunamisspace).
// CRM de prospecção: leads capturados do Google Maps, funil, atividades e templates.

export type LeadStage = 'NOVO' | 'CONTATADO' | 'EM_NEGOCIACAO' | 'CONVERTIDO' | 'PERDIDO';

export type LeadDTO = {
	id: string;
	name: string;
	address: string | null;
	phone: string | null;
	website: string | null;
	hasWebsite: boolean;
	email: string | null;
	instagram: string | null;
	facebook: string | null;
	category: string | null;
	rating: number | null;
	reviewCount: number | null;
	googleUrl: string | null;
	searchQuery: string | null;
	stage: LeadStage;
	notes: string | null;
	tags: string | null;
	estimatedValue: number | null;
	nextContactAt: string | null;
	/** Responsável — id do colaborador (auth do dunamisspace). */
	assignedToId: string | null;
	assignedToName: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ActivityDTO = {
	id: string;
	leadId: string;
	leadName: string;
	message: string;
	createdAt: string;
	userName: string | null;
};

export type ScrapeJobDTO = {
	id: string;
	query: string;
	status: string; // queued | running | done | error | cancelled
	found: number;
	saved: number;
	error: string | null;
	log: string | null;
	createdAt: string;
	updatedAt: string;
};

export type MessageTemplateDTO = {
	id: string;
	name: string;
	channel: 'whatsapp' | 'email';
	subject: string | null;
	body: string;
	createdAt: string;
	updatedAt: string;
};

/** Colaborador (responsável atribuível). Vem de `colaboradores` ativos. */
export type Colaborador = {
	id: string;
	nome: string;
	avatarUrl: string | null;
	funcao: string | null;
};

export const STAGES: { value: LeadStage; label: string }[] = [
	{ value: 'NOVO', label: 'Novo' },
	{ value: 'CONTATADO', label: 'Contatado' },
	{ value: 'EM_NEGOCIACAO', label: 'Em negociação' },
	{ value: 'CONVERTIDO', label: 'Convertido' },
	{ value: 'PERDIDO', label: 'Perdido' }
];

export const STAGE_LABEL: Record<LeadStage, string> = {
	NOVO: 'Novo',
	CONTATADO: 'Contatado',
	EM_NEGOCIACAO: 'Em negociação',
	CONVERTIDO: 'Convertido',
	PERDIDO: 'Perdido'
};

/** Tom de Badge (design system) por estágio. */
export const STAGE_TONE: Record<LeadStage, string> = {
	NOVO: 'neutral',
	CONTATADO: 'info',
	EM_NEGOCIACAO: 'warning',
	CONVERTIDO: 'success',
	PERDIDO: 'danger'
};

/** Cor sólida (dot/barra) por estágio — usa tokens do design system. */
export const STAGE_COLOR: Record<LeadStage, string> = {
	NOVO: 'var(--color-grey)',
	CONTATADO: 'var(--color-info, #2f6fed)',
	EM_NEGOCIACAO: 'var(--color-warning, #f5a524)',
	CONVERTIDO: 'var(--color-success, #17b26a)',
	PERDIDO: 'var(--color-brand-danger, #f04438)'
};

export function whatsappLink(phone: string, message?: string): string {
	const digits = phone.replace(/\D/g, '');
	const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
	const base = `https://wa.me/${withCountry}`;
	return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function parseTags(tags: string | null): string[] {
	if (!tags) return [];
	return tags
		.split(',')
		.map((t) => t.trim())
		.filter(Boolean);
}

export function serializeTags(tags: string[]): string | null {
	const clean = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
	return clean.length ? clean.join(', ') : null;
}

export type LeadScore = {
	score: number; // 0–100
	tier: 'quente' | 'morno' | 'frio';
	reasons: string[];
};

/**
 * Score heurístico de oportunidade para prospecção.
 * Prioriza negócios estabelecidos (boa nota, muitas avaliações) que ainda
 * não têm site — quem mais tende a fechar um serviço/produto digital.
 */
export function leadScore(lead: LeadDTO): LeadScore {
	let score = 0;
	const reasons: string[] = [];

	if (!lead.hasWebsite) {
		score += 40;
		reasons.push('Sem site (oportunidade)');
	}
	if (lead.rating != null) {
		if (lead.rating >= 4.5) {
			score += 20;
			reasons.push('Nota alta (≥ 4,5)');
		} else if (lead.rating >= 4) {
			score += 12;
			reasons.push('Boa nota (≥ 4,0)');
		}
	}
	if (lead.reviewCount != null) {
		if (lead.reviewCount >= 300) {
			score += 25;
			reasons.push('Negócio consolidado (300+ avaliações)');
		} else if (lead.reviewCount >= 50) {
			score += 15;
			reasons.push('Bem avaliado (50+ avaliações)');
		} else if (lead.reviewCount >= 10) {
			score += 6;
		}
	}
	if (lead.phone) {
		score += 8;
		reasons.push('Telefone disponível');
	}
	if (lead.email) {
		score += 7;
		reasons.push('E-mail disponível');
	}

	score = Math.min(100, score);
	const tier: LeadScore['tier'] = score >= 65 ? 'quente' : score >= 40 ? 'morno' : 'frio';
	return { score, tier, reasons };
}

export const TIER_TONE: Record<LeadScore['tier'], string> = {
	quente: 'danger',
	morno: 'warning',
	frio: 'neutral'
};

// ---- Templates de mensagem ----

export const TEMPLATE_VARIABLES = [
	{ key: 'nome', label: 'Nome do lead' },
	{ key: 'categoria', label: 'Categoria' },
	{ key: 'cidade', label: 'Cidade (do endereço)' },
	{ key: 'telefone', label: 'Telefone' }
] as const;

function cityFromAddress(address: string | null): string {
	if (!address) return '';
	// Endereço do Google Maps: "Rua X, 10 - Bairro, Cidade - UF, CEP"
	const parts = address.split(',').map((p) => p.trim());
	const cityPart = parts.find((p) => / - [A-Z]{2}\b/.test(p));
	if (cityPart) return cityPart.split(' - ')[0].trim();
	return parts[parts.length - 2] ?? '';
}

/** Substitui {{variavel}} pelos dados do lead. */
export function renderTemplate(body: string, lead: LeadDTO): string {
	const values: Record<string, string> = {
		nome: lead.name,
		categoria: lead.category ?? '',
		cidade: cityFromAddress(lead.address),
		telefone: lead.phone ?? ''
	};
	return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
}

// ---- Helpers de formatação/UI ----

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatDate(iso: string): string {
	const d = new Date(iso);
	return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatCurrency(v: number): string {
	return v.toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
		maximumFractionDigits: 0
	});
}

export function pct(part: number, total: number): number {
	return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function iniciais(nome: string): string {
	const p = nome.trim().split(/\s+/);
	return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export type FollowupInfo = { label: string; tone: string };

/** Rótulo + tom para o follow-up (nextContactAt) na tabela/kanban/dashboard. */
export function followupInfo(iso: string): FollowupInfo {
	const alvo = new Date(iso);
	alvo.setHours(0, 0, 0, 0);
	const hoje = new Date();
	hoje.setHours(0, 0, 0, 0);
	const diff = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
	const dm = alvo.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
	if (diff < 0) return { label: `Atrasado · ${dm}`, tone: 'danger' };
	if (diff === 0) return { label: 'Hoje', tone: 'warning' };
	if (diff <= 3) return { label: `Em ${diff}d · ${dm}`, tone: 'warning' };
	return { label: dm, tone: 'neutral' };
}

/** Converte ISO para valor de <input type="date"> (YYYY-MM-DD). */
export function toDateInput(iso: string | null): string {
	if (!iso) return '';
	return new Date(iso).toISOString().slice(0, 10);
}
