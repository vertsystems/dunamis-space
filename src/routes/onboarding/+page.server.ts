import { fail } from '@sveltejs/kit';
import { ONBOARDING_PADRAO } from '$lib/adm';
import type { Actions, PageServerLoad } from './$types';

const str = (fd: FormData, k: string): string | null => {
	const v = fd.get(k);
	const s = typeof v === 'string' ? v.trim() : '';
	return s === '' ? null : s;
};

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const { data: clientes } = await supabase
		.from('clientes')
		.select('id, nome, status')
		.order('nome', { ascending: true });

	const { data, error } = await supabase
		.from('adm_onboarding_itens')
		.select('id, cliente_id, texto, concluido, ordem')
		.order('cliente_id', { ascending: true })
		.order('ordem', { ascending: true });

	const pendente =
		!!error && /adm_|does not exist|column|schema cache|relation/i.test(error?.message ?? '');

	return {
		clientes: clientes ?? [],
		itens: data ?? [],
		pendente,
		loadError: pendente ? null : (error?.message ?? null)
	};
};

export const actions: Actions = {
	iniciar: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const cliente_id = str(fd, 'cliente_id');
		if (!cliente_id) return fail(400, { error: 'Cliente obrigatório.' });

		// Só cria se ainda não houver itens para esse cliente.
		const { count, error: countError } = await supabase
			.from('adm_onboarding_itens')
			.select('id', { count: 'exact', head: true })
			.eq('cliente_id', cliente_id);
		if (countError) return fail(500, { error: countError.message });
		if ((count ?? 0) > 0) return fail(400, { error: 'Este cliente já possui onboarding.' });

		const rows = ONBOARDING_PADRAO.map((texto, i) => ({
			cliente_id,
			texto,
			ordem: i,
			concluido: false
		}));
		const { error } = await supabase.from('adm_onboarding_itens').insert(rows);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	item_toggle: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'Item inválido.' });
		const concluido = fd.get('concluido') === 'true';

		const { error } = await supabase
			.from('adm_onboarding_itens')
			.update({
				concluido,
				concluido_em: concluido ? new Date().toISOString() : null,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	item_add: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const cliente_id = str(fd, 'cliente_id');
		const texto = str(fd, 'texto');
		if (!cliente_id) return fail(400, { error: 'Cliente obrigatório.' });
		if (!texto) return fail(400, { error: 'Descreva o item.' });

		const { data: last } = await supabase
			.from('adm_onboarding_itens')
			.select('ordem')
			.eq('cliente_id', cliente_id)
			.order('ordem', { ascending: false })
			.limit(1)
			.maybeSingle();
		const ordem = (last?.ordem ?? -1) + 1;

		const { error } = await supabase
			.from('adm_onboarding_itens')
			.insert({ cliente_id, texto, ordem, concluido: false });
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	item_excluir: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { error: 'Item inválido.' });
		const { error } = await supabase.from('adm_onboarding_itens').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
