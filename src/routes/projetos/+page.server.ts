import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { ocultarValores, podeVerValores } from '$lib/valores';
import { um } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, permissoes }, url }) => {
	const status = url.searchParams.get('status') ?? '';
	const cliente = url.searchParams.get('cliente') ?? '';
	const q = url.searchParams.get('q')?.trim() ?? '';

	let query = supabase
		.from('projetos')
		.select(
			'id, nome, tipo, status, cliente_id, responsavel_id, data_inicio, prazo, valor, recorrente, descricao, cliente:clientes(nome, logo_url), responsavel:colaboradores(nome, avatar_url)'
		)
		.order('created_at', { ascending: false });

	if (status) query = query.eq('status', status);
	if (cliente) query = query.eq('cliente_id', cliente);
	if (q) query = query.ilike('nome', `%${q}%`);

	const [{ data, error }, { data: clientes }, { data: colaboradores }] = await Promise.all([
		query,
		clientesLite(supabase),
		colaboradoresAtivos(supabase)
	]);

	const projetos = (data ?? []).map((p) => ({
		...p,
		cliente: um(p.cliente),
		responsavel: um(p.responsavel)
	}));

	return {
		// O valor sai da resposta para quem não pode ver valores — a máscara na tela
		// não bastaria, o número viajaria no __data.json da navegação.
		projetos: ocultarValores(projetos, podeVerValores(permissoes), 'valor'),
		status,
		cliente,
		q,
		clientes: clientes ?? [],
		colaboradores: colaboradores ?? [],
		loadError: error?.message ?? null
	};
};
