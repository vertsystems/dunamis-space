import { um } from '$lib/db';
import { str } from '$lib/form';
import { fail } from '@sveltejs/kit';
import { exigirPermissao } from '$lib/server/permissao';
import type { Actions, PageServerLoad } from './$types';

/** Erro típico de tabela/coluna inexistente → migration 0006 ainda não aplicada. */
const PENDENTE_RX = /adm_|does not exist|column|schema cache|relation/i;

// ------------------------------------------------------------
// Helpers de FormData
// ------------------------------------------------------------
function num(fd: FormData, k: string): number | null {
	const raw = str(fd, k);
	if (raw === null) return null;
	const n = Number(raw.replace(/\./g, '').replace(',', '.'));
	return Number.isNaN(n) ? null : n;
}
function bool(fd: FormData, k: string): boolean {
	const v = fd.get(k);
	return v === 'on' || v === 'true';
}
function idDe(fd: FormData): string | null {
	const v = fd.get('id');
	return typeof v === 'string' && v ? v : null;
}

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [ferrRes, acessosRes, colabRes, clientesRes] = await Promise.all([
		supabase
			.from('adm_ferramentas')
			.select(
				'id, nome, categoria, url, custo_mensal, ciclo, proxima_renovacao, responsavel_id, ativo, observacoes, responsavel:colaboradores(nome)'
			)
			.order('nome', { ascending: true }),
		supabase
			.from('adm_acessos')
			.select(
				'id, cliente_id, plataforma, login, url, local_senha, responsavel_id, observacoes, cliente:clientes(nome), responsavel:colaboradores(nome)'
			)
			.order('plataforma', { ascending: true }),
		// Sem filtro de ativo: um responsável desativado precisa continuar aparecendo
		// no dropdown de itens existentes, senão a edição apagaria a atribuição.
		supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').order('nome'),
		supabase.from('clientes').select('id, nome').order('nome')
	]);

	const errFerr = ferrRes.error;
	const errAcessos = acessosRes.error;
	const pendente =
		(!!errFerr && PENDENTE_RX.test(errFerr.message ?? '')) ||
		(!!errAcessos && PENDENTE_RX.test(errAcessos.message ?? ''));
	const loadError = pendente ? null : (errFerr?.message ?? errAcessos?.message ?? null);

	const ferramentas = (ferrRes.data ?? []).map((f) => {
		const resp = um<{ nome: string }>(f.responsavel);
		return {
			id: f.id as string,
			nome: f.nome as string,
			categoria: (f.categoria as string | null) ?? null,
			url: (f.url as string | null) ?? null,
			custo_mensal: Number(f.custo_mensal ?? 0),
			ciclo: (f.ciclo as string | null) ?? 'mensal',
			proxima_renovacao: (f.proxima_renovacao as string | null) ?? null,
			responsavel_id: (f.responsavel_id as string | null) ?? null,
			responsavel_nome: resp?.nome ?? null,
			ativo: f.ativo !== false,
			observacoes: (f.observacoes as string | null) ?? null
		};
	});

	const acessos = (acessosRes.data ?? []).map((a) => {
		const cli = um<{ nome: string }>(a.cliente);
		const resp = um<{ nome: string }>(a.responsavel);
		return {
			id: a.id as string,
			cliente_id: (a.cliente_id as string | null) ?? null,
			cliente_nome: cli?.nome ?? null,
			plataforma: a.plataforma as string,
			login: (a.login as string | null) ?? null,
			url: (a.url as string | null) ?? null,
			local_senha: (a.local_senha as string | null) ?? null,
			responsavel_id: (a.responsavel_id as string | null) ?? null,
			responsavel_nome: resp?.nome ?? null,
			observacoes: (a.observacoes as string | null) ?? null
		};
	});

	return {
		pendente,
		loadError,
		ferramentas,
		acessos,
		colaboradores: (colabRes.data ?? []) as { id: string; nome: string }[],
		clientes: (clientesRes.data ?? []) as { id: string; nome: string }[]
	};
};

export const actions: Actions = {
	// ---------------- Ferramentas ----------------
	ferramenta_criar: async ({ request, locals }) => {
		exigirPermissao(locals, 'ferramentas', 'editar');
		const fd = await request.formData();
		const nome = str(fd, 'nome');
		if (!nome) return fail(400, { error: 'O nome da ferramenta é obrigatório.' });
		const { error } = await locals.supabase.from('adm_ferramentas').insert({
			nome,
			categoria: str(fd, 'categoria'),
			url: str(fd, 'url'),
			custo_mensal: num(fd, 'custo_mensal') ?? 0,
			ciclo: str(fd, 'ciclo') ?? 'mensal',
			proxima_renovacao: str(fd, 'proxima_renovacao'),
			responsavel_id: str(fd, 'responsavel_id'),
			ativo: bool(fd, 'ativo'),
			observacoes: str(fd, 'observacoes')
		});
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	ferramenta_atualizar: async ({ request, locals }) => {
		exigirPermissao(locals, 'ferramentas', 'editar');
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Ferramenta inválida.' });
		const nome = str(fd, 'nome');
		if (!nome) return fail(400, { error: 'O nome da ferramenta é obrigatório.' });
		const { error } = await locals.supabase
			.from('adm_ferramentas')
			.update({
				nome,
				categoria: str(fd, 'categoria'),
				url: str(fd, 'url'),
				custo_mensal: num(fd, 'custo_mensal') ?? 0,
				ciclo: str(fd, 'ciclo') ?? 'mensal',
				proxima_renovacao: str(fd, 'proxima_renovacao'),
				responsavel_id: str(fd, 'responsavel_id'),
				ativo: bool(fd, 'ativo'),
				observacoes: str(fd, 'observacoes'),
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	ferramenta_excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'ferramentas', 'excluir');
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Ferramenta inválida.' });
		const { error } = await locals.supabase.from('adm_ferramentas').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	},

	// ---------------- Acessos ----------------
	acesso_criar: async ({ request, locals }) => {
		exigirPermissao(locals, 'ferramentas', 'editar');
		const fd = await request.formData();
		const plataforma = str(fd, 'plataforma');
		if (!plataforma) return fail(400, { error: 'A plataforma é obrigatória.' });
		const { error } = await locals.supabase.from('adm_acessos').insert({
			plataforma,
			cliente_id: str(fd, 'cliente_id'),
			login: str(fd, 'login'),
			url: str(fd, 'url'),
			local_senha: str(fd, 'local_senha'),
			responsavel_id: str(fd, 'responsavel_id'),
			observacoes: str(fd, 'observacoes')
		});
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	acesso_atualizar: async ({ request, locals }) => {
		exigirPermissao(locals, 'ferramentas', 'editar');
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Acesso inválido.' });
		const plataforma = str(fd, 'plataforma');
		if (!plataforma) return fail(400, { error: 'A plataforma é obrigatória.' });
		const { error } = await locals.supabase
			.from('adm_acessos')
			.update({
				plataforma,
				cliente_id: str(fd, 'cliente_id'),
				login: str(fd, 'login'),
				url: str(fd, 'url'),
				local_senha: str(fd, 'local_senha'),
				responsavel_id: str(fd, 'responsavel_id'),
				observacoes: str(fd, 'observacoes'),
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { saved: true };
	},

	acesso_excluir: async ({ request, locals }) => {
		exigirPermissao(locals, 'ferramentas', 'excluir');
		const fd = await request.formData();
		const id = idDe(fd);
		if (!id) return fail(400, { error: 'Acesso inválido.' });
		const { error } = await locals.supabase.from('adm_acessos').delete().eq('id', id);
		if (error) return fail(500, { error: error.message });
		return { deleted: true };
	}
};
