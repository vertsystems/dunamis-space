import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export type SosChamado = {
	id: string;
	titulo: string;
	descricao: string | null;
	autor_nome: string | null;
	autor_email: string | null;
	rota: string | null;
	status: 'aberto' | 'em_andamento' | 'resolvido';
	created_at: string;
};

const STATUS = ['aberto', 'em_andamento', 'resolvido'];
const COLUNAS = 'id, titulo, descricao, autor_nome, autor_email, rota, status, created_at';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const statusParam = url.searchParams.get('status');
	const filtro = STATUS.includes(statusParam ?? '') ? statusParam : null;

	let query = supabase
		.from('sos_chamados')
		.select(COLUNAS)
		.order('created_at', { ascending: false });
	if (filtro) query = query.eq('status', filtro);

	const { data, error } = await query;

	// Degrada bem se a migration 0010 ainda não tiver rodado.
	const pendente =
		!!error && /sos_chamados|does not exist|schema cache|relation/i.test(error?.message ?? '');
	const itens = pendente ? [] : ((data ?? []) as SosChamado[]);

	let abertos = 0;
	if (!pendente) {
		const { count } = await supabase
			.from('sos_chamados')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'aberto');
		abertos = count ?? 0;
	}

	return {
		itens,
		abertos,
		filtro,
		pendente,
		loadError: pendente ? null : (error?.message ?? null)
	};
};

function idDe(fd: FormData): string | null {
	const v = fd.get('id');
	return typeof v === 'string' && v ? v : null;
}

export const actions: Actions = {
	status: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = idDe(fd);
		const status = (fd.get('status') as string) ?? '';
		if (!id || !STATUS.includes(status)) return fail(400, { error: 'Dados inválidos.' });
		const { error } = await supabase.from('sos_chamados').update({ status }).eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { ok: true };
	},

	excluir: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Chamado inválido.' });
		const { error } = await supabase.from('sos_chamados').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
