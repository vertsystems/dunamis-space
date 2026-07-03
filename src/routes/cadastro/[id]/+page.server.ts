import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data: cliente, error: e } = await supabase
		.from('clientes')
		.select('*')
		.eq('id', params.id)
		.single();

	if (e || !cliente) throw error(404, 'Cliente não encontrado');

	return { cliente };
};

/** Extrai string não-vazia do FormData (ou null). */
function str(fd: FormData, k: string): string | null {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
}

/** Converte número pt-BR (1.234,56) para Number (NaN → null). */
function num(s: string | null): number | null {
	if (s === null) return null;
	const n = Number(s.replace(/\./g, '').replace(',', '.'));
	return Number.isNaN(n) ? null : n;
}

/** Erro de coluna inexistente → migration 0006 ainda não aplicada. */
const PENDENTE_RX = /does not exist|column|schema cache|relation/i;

export const actions: Actions = {
	update: async ({ request, params, locals: { supabase } }) => {
		const fd = await request.formData();
		const diaRaw = str(fd, 'dia_vencimento');

		// Somente campos administrativos / de referência (status, segmento e
		// responsável são gerenciados no Comercial e não são tocados aqui).
		const values = {
			razao_social: str(fd, 'razao_social'),
			cnpj_cpf: str(fd, 'cnpj_cpf'),
			endereco: str(fd, 'endereco'),
			cidade: str(fd, 'cidade'),
			estado: str(fd, 'estado'),
			cep: str(fd, 'cep'),
			contato_financeiro: str(fd, 'contato_financeiro'),
			plano_ref: str(fd, 'plano_ref'),
			forma_pagamento: str(fd, 'forma_pagamento'),
			mrr: num(str(fd, 'mrr')),
			dia_vencimento: diaRaw !== null && !Number.isNaN(Number(diaRaw)) ? Number(diaRaw) : null,
			observacoes: str(fd, 'observacoes'),
			updated_at: new Date().toISOString()
		};

		const { error: e } = await supabase.from('clientes').update(values).eq('id', params.id);
		if (e) {
			const msg = PENDENTE_RX.test(e.message)
				? 'Módulo ainda não ativado. Aplique a migration 0006_administrativo.sql no Supabase.'
				: e.message;
			return fail(500, { error: msg, values });
		}

		return { saved: true };
	}
};
