import { um } from '$lib/db';
import { acoesNaPagina } from '$lib/server/crud';
import { acessos as recursoAcessos, ferramentas as recursoFerramentas } from '$lib/server/recursos';
import type { Actions, PageServerLoad } from './$types';

/** Erro típico de tabela/coluna inexistente → migration 0006 ainda não aplicada. */
const PENDENTE_RX = /adm_|does not exist|column|schema cache|relation/i;

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const [ferrRes, acessosRes, colabRes] = await Promise.all([
		supabase
			.from('adm_ferramentas')
			.select(
				'id, nome, categoria, url, custo_mensal, ciclo, proxima_renovacao, responsavel_id, ativo, observacoes, responsavel:colaboradores(nome)'
			)
			.order('nome', { ascending: true }),
		// Sem cliente_id: esta tela é só das contas da agência. Acesso de cliente
		// mora no Vault, dentro da área do cliente (ver 0051/0052).
		supabase
			.from('adm_acessos')
			.select(
				'id, plataforma, login, url, local_senha, responsavel_id, observacoes, responsavel:colaboradores(nome)'
			)
			.order('plataforma', { ascending: true }),
		// Sem filtro de ativo: um responsável desativado precisa continuar aparecendo
		// no dropdown de itens existentes, senão a edição apagaria a atribuição.
		supabase.from('colaboradores').select('id, nome, avatar_url, funcao, funcoes').order('nome')
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
		const resp = um<{ nome: string }>(a.responsavel);
		return {
			id: a.id as string,
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
		colaboradores: (colabRes.data ?? []) as { id: string; nome: string }[]
	};
};

// Duas listas na mesma tela: cada uma com suas três actions, nomeadas com o
// prefixo que o formulário usa no `action`.
const ferramenta = acoesNaPagina(recursoFerramentas);
const acesso = acoesNaPagina(recursoAcessos);

export const actions: Actions = {
	ferramenta_criar: ferramenta.criar,
	ferramenta_atualizar: ferramenta.atualizar,
	ferramenta_excluir: ferramenta.excluir,

	acesso_criar: acesso.criar,
	acesso_atualizar: acesso.atualizar,
	acesso_excluir: acesso.excluir
};
