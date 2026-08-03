import { colaboradoresAtivos } from '$lib/server/lookups';
import { ocultarValores, podeVerValores } from '$lib/valores';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, permissoes }, url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	let query = supabase
		.from('clientes')
		.select(
			'id, nome, status, razao_social, cnpj_cpf, segmento, responsavel_id, responsaveis_ids, data_inicio, contato_nome, contato_email, contato_whatsapp, contato_financeiro, contato_financeiro_email, contato_financeiro_whatsapp, contato_operacao, contato_operacao_email, contato_operacao_whatsapp, endereco, cidade, estado, cep, plano_ref, forma_pagamento, mrr, dia_vencimento, observacoes'
		)
		.order('nome', { ascending: true });

	if (q) query = query.ilike('nome', `%${q}%`);

	const [{ data, error }, { data: colaboradores }] = await Promise.all([
		query,
		colaboradoresAtivos(supabase)
	]);

	// Degradação: a migration 0006 pode não ter sido aplicada (colunas novas).
	const pendente =
		!!error && /adm_|does not exist|column|schema cache|relation/i.test(error?.message ?? '');

	const podeValores = podeVerValores(permissoes);

	return {
		// O mrr sai da resposta para quem não pode ver valores — a máscara na tela
		// não bastaria, o número viajaria no __data.json da navegação. A flag
		// `podeValores` para a UI vem do +layout.server.ts.
		clientes: pendente ? [] : ocultarValores(data ?? [], podeValores, 'mrr'),
		colaboradores: colaboradores ?? [],
		q,
		pendente,
		loadError: pendente ? null : (error?.message ?? null)
	};
};
