import { error, fail, redirect } from '@sveltejs/kit';
import { clienteFromForm, erroDeMigration } from '$lib/clientes';
import { str } from '$lib/form';
import { carregarCalendario } from '$lib/server/calendario';
import { exigirPermissao } from '$lib/server/permissao';
import { podeVer } from '$lib/permissoes';
import { sel } from '$lib/server/query';
import { podeVerValores, preservarValores } from '$lib/valores';
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

/** Campos do formulário do cofre (compartilhados por criar e atualizar). */
function vaultFromForm(fd: FormData) {
	return {
		titulo: str(fd, 'titulo'),
		categoria: str(fd, 'categoria'),
		url: str(fd, 'url'),
		login: str(fd, 'login'),
		senha: str(fd, 'senha'),
		observacoes: str(fd, 'observacoes'),
		responsavel_id: str(fd, 'responsavel_id')
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

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'clientes', 'editar');
		const { supabase } = locals;
		const values = clienteFromForm(await request.formData());
		if (!values.nome) return fail(400, { error: 'O nome é obrigatório.', values });
		// Quem não vê o MRR também não o altera: o campo sai do update e a coluna
		// fica como está no banco.
		const patch = preservarValores(values, podeVerValores(locals.permissoes), 'mrr');
		const { error: e } = await supabase
			.from('clientes')
			.update({ ...patch, updated_at: new Date().toISOString() })
			.eq('id', params.id);
		if (e) {
			return fail(500, { error: erroDeMigration(e.message) ?? e.message, values });
		}
		return { saved: true };
	},
	delete: async ({ params, locals }) => {
		exigirPermissao(locals, 'clientes', 'excluir');
		const { supabase } = locals;
		const { error: e } = await supabase.from('clientes').delete().eq('id', params.id);
		if (e) return fail(500, { error: e.message });
		throw redirect(303, '/cadastro');
	},

	// ---------------- Vault (acessos do cliente) ----------------
	vault_criar: async ({ request, params, locals }) => {
		exigirPermissao(locals, 'vault', 'editar');
		const fd = await request.formData();
		const values = vaultFromForm(fd);
		if (!values.titulo) return fail(400, { vaultError: 'O nome do acesso é obrigatório.', values });

		// Novo entra no fim da lista do cliente.
		const { data: ultimo } = await locals.supabase
			.from('cliente_vault')
			.select('posicao')
			.eq('cliente_id', params.id)
			.order('posicao', { ascending: false })
			.limit(1)
			.maybeSingle();

		const { error: e } = await locals.supabase.from('cliente_vault').insert({
			...values,
			cliente_id: params.id,
			posicao: ((ultimo?.posicao as number | undefined) ?? -1) + 1
		});
		if (e) return fail(500, { vaultError: e.message, values });
		return { vaultSaved: true };
	},

	vault_atualizar: async ({ request, locals }) => {
		exigirPermissao(locals, 'vault', 'editar');
		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { vaultError: 'Acesso inválido.' });
		const values = vaultFromForm(fd);
		if (!values.titulo) return fail(400, { vaultError: 'O nome do acesso é obrigatório.', values });

		const { error: e } = await locals.supabase
			.from('cliente_vault')
			.update({ ...values, updated_at: new Date().toISOString() })
			.eq('id', id);
		if (e) return fail(500, { vaultError: e.message, values });
		return { vaultSaved: true };
	},

	vault_excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'vault', 'excluir');
		const fd = await request.formData();
		const id = str(fd, 'id');
		if (!id) return fail(400, { vaultError: 'Acesso inválido.' });
		const { error: e } = await locals.supabase.from('cliente_vault').delete().eq('id', id);
		if (e) return fail(500, { vaultError: e.message });
		return { vaultDeleted: true };
	}
};
