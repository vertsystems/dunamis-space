import { FORNECEDOR_TIPOS as TIPOS } from '$lib/adm';
import { acoesNaPagina } from '$lib/server/crud';
import { fornecedores } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

export type Fornecedor = {
	id: string;
	nome: string;
	tipo: string;
	especialidade: string | null;
	cidade: string | null;
	email: string | null;
	telefone: string | null;
	custo_referencia: number | null;
	avaliacao: number | null;
	ativo: boolean;
	observacoes: string | null;
	site: string | null;
	instagram: string | null;
};

// `*` em vez da lista de colunas: `cidade` só existe depois da migration 0054, e
// pedir coluna por nome faz o PostgREST recusar a QUERY INTEIRA enquanto o banco
// não tem a coluna — a tela cairia no aviso de "módulo não ativado". Tabela
// pequena, o `*` sai barato.
const COLUNAS = '*';

/**
 * Valor pronto para entrar num `or(...)` do PostgREST.
 *
 * Ali os termos são separados por vírgula, então uma busca por "Registro, SP"
 * quebraria a sintaxe do filtro e derrubaria a query. As aspas resolvem — desde
 * que as aspas e barras do próprio texto venham escapadas.
 */
function comoTermo(q: string): string {
	return `"%${q.replace(/["\\]/g, (c) => `\\${c}`)}%"`;
}

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const tipoParam = url.searchParams.get('tipo');
	const filtroTipo = TIPOS.includes(tipoParam ?? '') ? tipoParam : null;
	const q = (url.searchParams.get('q') ?? '').trim();

	let query = supabase.from('adm_fornecedores').select(COLUNAS).order('nome', { ascending: true });
	if (filtroTipo) query = query.eq('tipo', filtroTipo);
	// Busca por nome OU cidade: quem procura "quem atende em Sorocaba" digita a
	// cidade no mesmo campo em que digitaria o nome.
	if (q) query = query.or(`nome.ilike.${comoTermo(q)},cidade.ilike.${comoTermo(q)}`);

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
