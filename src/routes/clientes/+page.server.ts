import { fail } from '@sveltejs/kit';
import { CLIENTE_STATUS, type ClienteStatus } from '$lib/clientes';
import type { Actions, PageServerLoad } from './$types';

/** PostgREST tipa relações to-one como array; extrai o objeto único. */
function um<T>(v: T | T[] | null | undefined): T | null {
	return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	let query = supabase
		.from('clientes')
		.select('id, nome, status, segmento, mrr, contato_email, responsavel:colaboradores(nome)')
		.order('created_at', { ascending: false });

	if (q) query = query.ilike('nome', `%${q}%`);

	const { data, error } = await query;

	const clientes = (data ?? []).map((c) => ({
		id: c.id as string,
		nome: c.nome as string,
		status: c.status as string,
		segmento: c.segmento as string | null,
		mrr: c.mrr as number | null,
		contato_email: c.contato_email as string | null,
		responsavel_nome: um<{ nome: string }>(c.responsavel)?.nome ?? null
	}));

	return {
		clientes,
		q,
		loadError: error?.message ?? null
	};
};

const STATUS_VALIDOS = new Set<string>(CLIENTE_STATUS.map((s) => s.value));

export const actions: Actions = {
	// Move um cliente entre colunas do quadro (muda o status).
	move: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = fd.get('id');
		const status = fd.get('status');
		if (typeof id !== 'string' || typeof status !== 'string' || !STATUS_VALIDOS.has(status)) {
			return fail(400, { error: 'Dados inválidos' });
		}
		const { error } = await supabase
			.from('clientes')
			.update({ status: status as ClienteStatus })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	}
};
