import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
	const { data, error: e } = await supabase.rpc('aprovacao_por_token', { p_token: params.token });
	const row = Array.isArray(data) ? data[0] : data;
	if (e || !row) throw error(404, 'Link de aprovação inválido ou expirado.');
	return { aprovacao: row };
};

export const actions: Actions = {
	responder: async ({ request, params, locals: { supabase } }) => {
		const fd = await request.formData();
		const status = fd.get('status');
		const comentario = fd.get('comentario');
		if (status !== 'aprovado' && status !== 'alteracao_solicitada') {
			return fail(400, { error: 'Ação inválida.' });
		}
		const { error: e } = await supabase.rpc('responder_aprovacao', {
			p_token: params.token,
			p_status: status,
			p_comentario: typeof comentario === 'string' && comentario.trim() ? comentario.trim() : null
		});
		if (e) return fail(500, { error: e.message });
		return { done: true, status };
	}
};
