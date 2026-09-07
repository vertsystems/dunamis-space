import { error } from '@sveltejs/kit';
import { acoesDeItem, acoesNaPagina } from '$lib/server/crud';
// `vault` renomeado: no load abaixo essa palavra já é o cofre carregado.
import { clientes, vault as recursoVault } from '$lib/server/recursos';
import { carregarCalendario } from '$lib/server/calendario';
import { carregarVault } from '$lib/server/vault';
import { podeVer } from '$lib/permissoes';
import { sel } from '$lib/server/query';
import { podeVerValores } from '$lib/valores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals: { supabase, permissoes } }) => {
	// O cofre só é consultado por quem tem o módulo; sem permissão, nem as senhas
	// nem os logins saem do servidor.
	const podeVault = podeVer(permissoes, 'vault');
	const [{ data: cliente, error: e }, calendario, vault] = await Promise.all([
		supabase.from('clientes').select('*').eq('id', params.id).single(),
		carregarCalendario(supabase, url, { clienteFixo: params.id }),
		podeVault ? carregarVault(supabase, params.id) : Promise.resolve(null)
	]);

	if (e || !cliente) throw error(404, 'Cliente não encontrado');

	// Responsáveis (multi): busca os colaboradores preservando a ordem do array.
	const ids: string[] = cliente.responsaveis_ids?.length
		? cliente.responsaveis_ids
		: cliente.responsavel_id
			? [cliente.responsavel_id]
			: [];
	let responsaveis: { id: string; nome: string; avatar_url: string | null; funcoes: string[] }[] = [];
	if (ids.length) {
		const rs = await sel(
			supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').in('id', ids),
			'cadastro/[id]: responsáveis do cliente'
		);
		responsaveis = ids
			.map((id) => rs.find((r) => r.id === id))
			.filter((r): r is NonNullable<typeof r> => !!r)
			.map((r) => ({
				id: r.id,
				nome: r.nome,
				avatar_url: r.avatar_url ?? null,
				funcoes: r.funcoes?.length ? r.funcoes : r.funcao ? [r.funcao] : []
			}));
	}

	return {
		// O mrr nem chega ao navegador de quem não pode ver valores; o formulário
		// de edição preserva o que está no banco (ver a action update). A flag
		// `podeValores` para a UI vem do +layout.server.ts.
		cliente: {
			...cliente,
			mrr: podeVerValores(permissoes) ? cliente.mrr : null,
			responsaveis
		},
		calendario,
		vault
	};
};

const cofre = acoesNaPagina(recursoVault);

export const actions: Actions = {
	// O cadastro do cliente: mesmas regras da tela /clientes/[id].
	...acoesDeItem(clientes),

	// O cofre de acessos deste cliente, editado sem sair da tela.
	vault_criar: cofre.criar,
	vault_atualizar: cofre.atualizar,
	vault_excluir: cofre.excluir
};
