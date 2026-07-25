import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { um } from '$lib/db';
import { nomesDeCampanha } from '$lib/server/conteudo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const status = url.searchParams.get('status') ?? '';
	const tipo = url.searchParams.get('tipo') ?? '';

	let query = supabase
		.from('conteudos')
		.select(
			'id, titulo, tipo, tipos, status, data_publicacao, cliente_id, projeto_id, responsavel_id, campanha, arte_url, legenda, redes, publicado_manual, cliente:clientes(nome)'
		)
		.order('data_publicacao', { ascending: false, nullsFirst: false });

	if (status) query = query.eq('status', status);
	if (tipo) query = query.eq('tipo', tipo);

	const [{ data, error }, { data: clientes }, { data: projetos }, { data: colaboradores }, campanhas] =
		await Promise.all([
			query,
			clientesLite(supabase),
			supabase.from('projetos').select('id, nome').order('created_at', { ascending: false }),
			colaboradoresAtivos(supabase),
			nomesDeCampanha(supabase)
		]);

	const conteudos = (data ?? []).map((c) => ({ ...c, cliente: um(c.cliente) }));
	return {
		conteudos,
		clientes: clientes ?? [],
		projetos: projetos ?? [],
		colaboradores: colaboradores ?? [],
		campanhas,
		status,
		tipo,
		loadError: error?.message ?? null
	};
};
