import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export type Fornecedor = {
	id: string;
	nome: string;
	tipo: string;
	especialidade: string | null;
	email: string | null;
	telefone: string | null;
	custo_referencia: number | null;
	avaliacao: number | null;
	ativo: boolean;
	observacoes: string | null;
	site: string | null;
	instagram: string | null;
};

const TIPOS = ['freelancer', 'fornecedor', 'parceiro'];

const COLUNAS =
	'id, nome, tipo, especialidade, email, telefone, custo_referencia, avaliacao, ativo, observacoes, site, instagram';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const tipoParam = url.searchParams.get('tipo');
	const filtroTipo = TIPOS.includes(tipoParam ?? '') ? tipoParam : null;
	const q = (url.searchParams.get('q') ?? '').trim();

	let query = supabase.from('adm_fornecedores').select(COLUNAS).order('nome', { ascending: true });
	if (filtroTipo) query = query.eq('tipo', filtroTipo);
	if (q) query = query.ilike('nome', `%${q}%`);

	const { data, error } = await query;

	const pendente =
		!!error && /adm_|does not exist|column|schema cache|relation/i.test(error?.message ?? '');

	return {
		itens: pendente ? [] : ((data ?? []) as Fornecedor[]),
		pendente,
		loadError: pendente ? null : (error?.message ?? null),
		filtroTipo,
		q
	};
};

// ------------------------------------------------------------
// Helpers de action
// ------------------------------------------------------------
function idDe(fd: FormData, campo = 'id'): string | null {
	const v = fd.get(campo);
	return typeof v === 'string' && v ? v : null;
}

function fornecedorFromForm(fd: FormData) {
	const str = (k: string) => {
		const v = fd.get(k);
		const s = typeof v === 'string' ? v.trim() : '';
		return s === '' ? null : s;
	};

	const tipoRaw = str('tipo');
	const tipo = tipoRaw && TIPOS.includes(tipoRaw) ? tipoRaw : 'freelancer';

	const custoRaw = str('custo_referencia');
	let custo_referencia: number | null = null;
	if (custoRaw !== null) {
		const n = Number(custoRaw.replace(/\./g, '').replace(',', '.'));
		custo_referencia = Number.isFinite(n) ? n : null;
	}

	const avRaw = str('avaliacao');
	let avaliacao: number | null = null;
	if (avRaw !== null) {
		const n = parseInt(avRaw, 10);
		avaliacao = Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
	}

	return {
		nome: str('nome') ?? '',
		tipo,
		especialidade: str('especialidade'),
		email: str('email'),
		telefone: str('telefone'),
		custo_referencia,
		avaliacao,
		ativo: fd.get('ativo') != null,
		observacoes: str('observacoes'),
		site: str('site'),
		instagram: str('instagram')
	};
}

export const actions: Actions = {
	criar: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const v = fornecedorFromForm(fd);
		if (!v.nome) return fail(400, { error: 'O nome é obrigatório.' });
		const { error } = await supabase.from('adm_fornecedores').insert(v);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	atualizar: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Fornecedor inválido.' });
		const v = fornecedorFromForm(fd);
		if (!v.nome) return fail(400, { error: 'O nome é obrigatório.' });
		const { error } = await supabase
			.from('adm_fornecedores')
			.update({ ...v, updated_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	excluir: async ({ request, locals: { supabase } }) => {
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Fornecedor inválido.' });
		const { error } = await supabase.from('adm_fornecedores').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
