import { FORNECEDOR_TIPOS as TIPOS } from '$lib/adm';
import { acoesNaPagina } from '$lib/server/crud';
import { fornecedores } from '$lib/server/recursos';
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

export const actions: Actions = acoesNaPagina(fornecedores);
