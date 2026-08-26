import { error } from '@sveltejs/kit';
import { acoesDeItem, acoesNaPagina } from '$lib/server/crud';
// `vault` renomeado: no load abaixo essa palavra já é o cofre carregado.
import { clientes, vault as recursoVault } from '$lib/server/recursos';
import { carregarCalendario } from '$lib/server/calendario';
import { podeVer } from '$lib/permissoes';
import { sel } from '$lib/server/query';
import { podeVerValores } from '$lib/valores';
import type { VaultItem } from '$lib/vault';
import type { Actions, PageServerLoad } from './$types';

type SupabaseClient = Parameters<PageServerLoad>[0]['locals']['supabase'];

/** Tabela ainda não criada = migration 0051 pendente (não é erro do usuário). */
const VAULT_PENDENTE_RX = /cliente_vault|does not exist|schema cache|relation/i;

/** Acessos do cofre deste cliente. Só chamado para quem tem o módulo 'vault'. */
async function carregarVault(supabase: SupabaseClient, clienteId: string) {
	const { data, error: e } = await supabase
		.from('cliente_vault')
		.select(
			'id, titulo, categoria, url, login, senha, observacoes, responsavel_id, posicao, updated_at'
		)
		.eq('cliente_id', clienteId)
		.order('posicao', { ascending: true })
		.order('titulo', { ascending: true });

	if (e) {
		const pendente = VAULT_PENDENTE_RX.test(e.message ?? '');
		return { itens: [] as VaultItem[], pendente, erro: pendente ? null : e.message };
	}
	return {
		itens: (data ?? []).map((v) => ({
			id: v.id as string,
			titulo: v.titulo as string,
			categoria: (v.categoria as string | null) ?? null,
			url: (v.url as string | null) ?? null,
			login: (v.login as string | null) ?? null,
			senha: (v.senha as string | null) ?? null,
			observacoes: (v.observacoes as string | null) ?? null,
			responsavel_id: (v.responsavel_id as string | null) ?? null,
			posicao: (v.posicao as number) ?? 0,
			updated_at: (v.updated_at as string | null) ?? null
		})) as VaultItem[],
		pendente: false,
		erro: null
	};
}

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
