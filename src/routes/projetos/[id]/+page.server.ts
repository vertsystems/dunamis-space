import { error } from '@sveltejs/kit';
import { acoesDeItem, acoesNaPagina } from '$lib/server/crud';
// `vaultProjeto` renomeado: no load abaixo `vault` já é o cofre carregado.
import { projetos, vaultProjeto as recursoVault } from '$lib/server/recursos';
import { colaboradoresAtivos, clientesLite } from '$lib/server/lookups';
import { carregarVault } from '$lib/server/vault';
import { um } from '$lib/db';
import { podeVer } from '$lib/permissoes';
import { podeVerValores } from '$lib/valores';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, permissoes } }) => {
	// O cofre só é consultado por quem tem o módulo; sem permissão, nem as senhas
	// nem os logins saem do servidor. Mesma regra da área do cliente.
	const podeVault = podeVer(permissoes, 'vault');
	const [{ data: projeto, error: e }, { data: clientes }, { data: colaboradores }, vault] =
		await Promise.all([
			supabase
				.from('projetos')
				.select('*, cliente:clientes(id, nome, logo_url)')
				.eq('id', params.id)
				.single(),
			clientesLite(supabase),
			colaboradoresAtivos(supabase),
			podeVault
				? carregarVault(supabase, 'projeto_vault', 'projeto_id', params.id)
				: Promise.resolve(null)
		]);

	if (e || !projeto) throw error(404, 'Projeto não encontrado');

	// O responsável vem do mesmo lookup que alimenta o formulário — sem uma
	// segunda consulta só para exibir nome e avatar no cabeçalho.
	const responsavel =
		(colaboradores ?? []).find((c) => c.id === projeto.responsavel_id) ?? null;

	return {
		// O valor nem chega ao navegador de quem não pode ver valores; o formulário
		// de edição preserva o que está no banco (ver `camposDeValor` do recurso).
		projeto: {
			...projeto,
			// O join to-one às vezes chega como array (ver `um`).
			cliente: um(projeto.cliente),
			valor: podeVerValores(permissoes) ? projeto.valor : null,
			responsavel
		},
		clientes: clientes ?? [],
		colaboradores: colaboradores ?? [],
		vault
	};
};

const cofre = acoesNaPagina(recursoVault);

export const actions: Actions = {
	// O cadastro do projeto.
	...acoesDeItem(projetos),

	// O cofre de acessos deste projeto, editado sem sair da tela.
	vault_criar: cofre.criar,
	vault_atualizar: cofre.atualizar,
	vault_excluir: cofre.excluir
};
