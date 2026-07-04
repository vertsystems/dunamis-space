import { fail, redirect } from '@sveltejs/kit';
import { conteudoFromForm } from '$lib/conteudo';
import type { Actions, PageServerLoad } from './$types';

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

export const load: PageServerLoad = async ({ url, locals: { supabase } }) => {
	const [{ data: clientes }, { data: projetos }, { data: colaboradores }] = await Promise.all([
		supabase.from('clientes').select('id, nome').order('nome'),
		supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
		supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
	]);

	// Pré-preenchimento vindo do calendário da campanha (?cliente=<id>&data=AAAA-MM-DD).
	const cliente = url.searchParams.get('cliente');
	const dataDia = url.searchParams.get('data');
	const prefill =
		cliente || (dataDia && DATA_RE.test(dataDia))
			? {
					cliente_id: cliente || null,
					// datetime-local (hora local); ConteudoForm converte p/ UTC no submit. 09:00 como padrão.
					data_publicacao: dataDia && DATA_RE.test(dataDia) ? `${dataDia}T09:00:00` : null
				}
			: null;

	return {
		clientes: clientes ?? [],
		projetos: projetos ?? [],
		colaboradores: colaboradores ?? [],
		prefill
	};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const values = conteudoFromForm(await request.formData());
		if (!values.cliente_id) return fail(400, { error: 'Selecione um cliente.', values });
		const { data, error } = await supabase.from('conteudos').insert(values).select('id').single();
		if (error) return fail(500, { error: error.message, values });
		throw redirect(303, `/conteudo/${data.id}`);
	}
};
