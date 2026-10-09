// Pag's Up — NF ou recibo de cada pagamento: as regras, sem I/O.
//
// Cada pagamento da Planilha Mensal pode ter UM PDF (NF ou recibo). Ele serve
// ao controle interno e ao painel público do financeiro do cliente
// (/pagamentos/<token>); a planilha .xlsx do mês não leva nada disto.
//
// O PDF não fica para sempre: MESES_DE_RETENCAO depois do envio a faxina
// diária (rota /api/pagsup/limpeza) o apaga do Storage. O pagamento continua
// dizendo que teve documento — só o arquivo some.

import type { Payment, DocTipo } from './types';

export const DOCS_BUCKET = 'pagsup-docs';

/** Quanto tempo um PDF fica guardado, contado do envio. */
export const MESES_DE_RETENCAO = 3;

export const DOC_ROTULO: Record<DocTipo, string> = { nf: 'NF', recibo: 'Recibo' };
/** Concordância: "a NF anexada", "o recibo anexado". */
export const DOC_GENERO: Record<DocTipo, 'a' | 'o'> = { nf: 'a', recibo: 'o' };

/**
 * NF ou recibo, pelo documento do prestador: CPF (11 dígitos) é pessoa física,
 * que entrega recibo; CNPJ ou cadastro sem documento, NF. É só o palpite do
 * envio — um clique troca.
 */
export function tipoSugerido(cpfOuCnpj: string | null | undefined): DocTipo {
	const digitos = (cpfOuCnpj ?? '').replace(/\D/g, '');
	return digitos.length === 11 ? 'recibo' : 'nf';
}

/** Situação do documento de um pagamento. */
export type DocStatus = 'pendente' | 'anexado' | 'arquivado';

export function statusDoc(p: Pick<Payment, 'doc'>): DocStatus {
	if (!p.doc?.tipo) return 'pendente';
	return p.doc.arquivo ? 'anexado' : 'arquivado';
}

/** Quantos pagamentos estão em cada situação. */
export function contarDocs(ps: Pick<Payment, 'doc'>[]): Record<DocStatus, number> {
	const c: Record<DocStatus, number> = { pendente: 0, anexado: 0, arquivado: 0 };
	for (const p of ps) c[statusDoc(p)]++;
	return c;
}

/** 51200 → "50 KB"; 1,5 MB para cima. */
export function formatarBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
	return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Caminho de um PDF novo no bucket. Aleatório: é ele que protege o download. */
export function novoCaminho(): string {
	return `${crypto.randomUUID()}.pdf`;
}

/**
 * Nome do arquivo baixado: "NF - Ailton Ribeiro - 02-10-2026.pdf". Quem baixa
 * vinte de uma vez precisa saber de quem é cada um sem abrir.
 */
export function nomeDeDownload(tipo: DocTipo, prestador: string, dataISO: string): string {
	const [a, m, d] = (dataISO ?? '').split('-');
	const data = a && m && d ? `${d}-${m}-${a}` : '';
	// Tira o que o Windows e o macOS recusam em nome de arquivo.
	const nome = (prestador || 'Prestador').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
	return [DOC_ROTULO[tipo], nome, data].filter(Boolean).join(' - ') + '.pdf';
}

/** URL pública do PDF; com `baixarComo`, o navegador baixa com esse nome. */
export function urlDoDocumento(supabaseUrl: string, caminho: string, baixarComo?: string): string {
	const base = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${DOCS_BUCKET}/${encodeURIComponent(caminho)}`;
	return baixarComo ? `${base}?download=${encodeURIComponent(baixarComo)}` : base;
}

// ---- Faxina --------------------------------------------------------------

/**
 * O instante antes do qual um PDF já pode ser apagado: `agora` menos N meses
 * de calendário. Em 31/05 menos 3 meses dá 28/02 (ou 29), não 03/03 — o dia é
 * limitado ao último do mês de destino.
 */
export function corteDeRetencao(agora: Date, meses = MESES_DE_RETENCAO): Date {
	const ano = agora.getUTCFullYear();
	const mes = agora.getUTCMonth() - meses;
	const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
	const d = new Date(agora);
	d.setUTCFullYear(ano, mes, Math.min(agora.getUTCDate(), ultimoDia));
	return d;
}

/** Um pagamento com PDF guardado, como a faxina o lê do banco. */
export type DocGuardado = { id: string; arquivo: string; enviadoEm: string };
/** Um objeto do bucket, como o Storage lista. */
export type ObjetoStorage = { name: string; created_at: string };

/**
 * O que a faxina faz: quais arquivos apaga do Storage e quais pagamentos
 * marca como "PDF apagado".
 *
 * Duas fontes, de propósito. Pelo banco, os PDFs enviados há mais de 3 meses.
 * Pelo bucket, os arquivos órfãos com mais de 3 meses — os que ficaram para trás
 * quando um pagamento foi excluído ou o PDF foi trocado e a remoção falhou. Um
 * arquivo que algum pagamento ainda usa dentro do prazo nunca entra.
 *
 * Data ilegível não apaga nada: errar guardando custa 70 KB; apagar a NF que o
 * financeiro ainda não baixou custa uma cobrança ao prestador.
 */
export function planoDeLimpeza(
	guardados: DocGuardado[],
	objetos: ObjetoStorage[],
	agora: Date,
	meses = MESES_DE_RETENCAO
): { remover: string[]; expirar: string[] } {
	const corte = corteDeRetencao(agora, meses).getTime();
	const antes = (iso: string) => {
		const t = Date.parse(iso);
		return Number.isFinite(t) && t < corte;
	};

	const expirados = guardados.filter((g) => antes(g.enviadoEm));
	const emUso = new Set(guardados.filter((g) => !antes(g.enviadoEm)).map((g) => g.arquivo));

	const remover = new Set(expirados.map((g) => g.arquivo).filter((a) => !emUso.has(a)));
	for (const o of objetos) {
		if (antes(o.created_at) && !emUso.has(o.name)) remover.add(o.name);
	}
	return { remover: [...remover], expirar: expirados.map((g) => g.id) };
}

// ---- Painel público do financeiro ---------------------------------------

/** Um pagamento como a função pagsup_publico o devolve (migration 0069). */
export type PagamentoPublico = {
	id: string;
	prestador: string;
	servico: string;
	regiao: string | null;
	lj: string | null;
	/** AAAA-MM-DD */
	data: string;
	valor: number;
	doc_tipo: DocTipo | null;
	doc_arquivo: string | null;
	doc_apagado_em: string | null;
};

export type PainelPublico = {
	cliente: string;
	/** Meses com pagamento (AAAA-MM), do mais recente ao mais antigo. */
	meses: string[];
	/** O mês mostrado; null quando o cliente ainda não tem pagamento. */
	mes: string | null;
	pagamentos: PagamentoPublico[];
};

/**
 * Nomes dos arquivos dentro do .zip. Dois recibos do mesmo prestador no mesmo
 * dia dariam o mesmo nome, e o segundo apagaria o primeiro ao descompactar.
 */
export function nomesUnicos(nomes: string[]): string[] {
	const vistos = new Map<string, number>();
	return nomes.map((n) => {
		const k = n.toLowerCase();
		const qtd = (vistos.get(k) ?? 0) + 1;
		vistos.set(k, qtd);
		return qtd === 1 ? n : n.replace(/\.pdf$/i, '') + ` (${qtd}).pdf`;
	});
}
