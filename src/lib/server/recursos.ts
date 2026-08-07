/**
 * Os recursos do CRUD, cada um descrito uma única vez.
 *
 * Quem quiser saber em que tabela um módulo grava, que permissão exige, o que
 * ele valida e para onde vai depois de salvar, lê daqui — e não de dois
 * `+page.server.ts` que podiam (e podiam mesmo) divergir entre si.
 *
 * As rotas ficam com o que é só delas: os `load` (cada tela busca coisas
 * diferentes) e as actions fora do CRUD (ex.: `enviarAprovacao` do conteúdo).
 */
import type { Recurso, RecursoDePagina } from './crud';

import { clienteFromForm, erroDeMigration } from '$lib/clientes';
import { acessoFromForm, ferramentaFromForm, fornecedorFromForm } from '$lib/adm';
import { vaultFromForm } from '$lib/vault';
import { projetoFromForm } from '$lib/projetos';
import { processoFromForm } from '$lib/processos';
import { contratoFromForm, planoFromForm } from '$lib/contratos';
import { colaboradorFromForm } from '$lib/equipe';
import { transacaoFromForm } from '$lib/financeiro';
import { kbFromForm } from '$lib/kb';
import { conteudoFromForm } from '$lib/conteudo';

/** Só existe para o TypeScript inferir o formato de `values` no `validar`. */
function recurso<V extends Record<string, unknown>>(r: Recurso<V>): Recurso<V> {
	return r;
}

export const clientes = recurso({
	tabela: 'clientes',
	modulo: 'clientes',
	fromForm: clienteFromForm,
	validar: (v) => (!v.nome ? 'O nome é obrigatório.' : null),
	traduzirErro: erroDeMigration,
	camposDeValor: ['mrr'],
	tocarUpdatedAt: true,
	aposCriar: (id) => `/clientes/${id}`,
	// O cliente vive dentro do Cadastro; excluído, volta-se para a lista de lá.
	aposExcluir: '/cadastro'
});

export const projetos = recurso({
	tabela: 'projetos',
	modulo: 'projetos',
	fromForm: projetoFromForm,
	validar: (v) => {
		if (!v.cliente_id) return 'Selecione um cliente.';
		if (!v.nome) return 'O nome é obrigatório.';
		return null;
	},
	aposCriar: (id) => `/projetos/${id}`,
	aposExcluir: '/projetos'
});

export const processos = recurso({
	tabela: 'processos',
	modulo: 'processos',
	fromForm: processoFromForm,
	validar: (v) => (!v.nome ? 'Informe o nome do processo.' : null),
	// A tabela não tem trigger de updated_at.
	tocarUpdatedAt: true,
	aposCriar: (id) => `/processos/${id}`,
	aposExcluir: '/processos'
});

export const contratos = recurso({
	tabela: 'contratos',
	modulo: 'contratos',
	fromForm: contratoFromForm,
	validar: (v) => (!v.cliente_id ? 'Selecione um cliente.' : null),
	camposDeValor: ['valor_mensal'],
	aposCriar: (id) => `/contratos/${id}`,
	aposExcluir: '/contratos'
});

export const planos = recurso({
	tabela: 'planos',
	// Planos são parte do módulo de contratos, inclusive na permissão.
	modulo: 'contratos',
	fromForm: planoFromForm,
	validar: (v) => (!v.nome ? 'O nome é obrigatório.' : null),
	camposDeValor: ['valor_mensal'],
	// Plano não tem tela própria: criado, volta-se para a lista.
	aposCriar: () => '/contratos/planos',
	aposExcluir: '/contratos/planos'
});

export const equipe = recurso({
	tabela: 'colaboradores',
	modulo: 'equipe',
	fromForm: colaboradorFromForm,
	validar: (v) => {
		if (!v.nome) return 'O nome é obrigatório.';
		if (!v.email) return 'O e-mail é obrigatório.';
		return null;
	},
	aposCriar: () => '/equipe',
	aposExcluir: '/equipe'
});

export const financeiro = recurso({
	tabela: 'transacoes',
	modulo: 'financeiro',
	fromForm: transacaoFromForm,
	// Antes só o criar validava o valor; o editar aceitava salvar sem ele.
	validar: (v) => (!v.valor && v.valor !== 0 ? 'Informe o valor.' : null),
	aposCriar: (id) => `/financeiro/${id}`,
	aposExcluir: '/financeiro'
});

export const baseConhecimento = recurso({
	tabela: 'kb_artigos',
	modulo: 'base_conhecimento',
	fromForm: kbFromForm,
	validar: (v) => (!v.titulo ? 'O título é obrigatório.' : null),
	aposCriar: (id) => `/base-conhecimento/${id}`,
	aposExcluir: '/base-conhecimento'
});

export const conteudo = recurso({
	tabela: 'conteudos',
	modulo: 'conteudo',
	fromForm: conteudoFromForm,
	validar: (v) => (!v.cliente_id ? 'Selecione um cliente.' : null),
	aposCriar: (id) => `/conteudo/${id}`,
	// Conteúdo excluído: o lugar de voltar é o calendário, não a lista.
	aposExcluir: '/calendario'
});

// ---------------------------------------------------------------------------
// Recursos que se editam sem sair da lista
// ---------------------------------------------------------------------------

/** Idem, e ainda fixa os nomes das chaves devolvidas à página. */
function naPagina<
	V extends Record<string, unknown>,
	KE extends string = 'error',
	KS extends string = 'saved',
	KD extends string = 'deleted'
>(r: RecursoDePagina<V, KE, KS, KD>): RecursoDePagina<V, KE, KS, KD> {
	return r;
}

export const fornecedores = naPagina({
	tabela: 'adm_fornecedores',
	modulo: 'fornecedores',
	fromForm: fornecedorFromForm,
	validar: (v) => (!v.nome ? 'O nome é obrigatório.' : null),
	idInvalido: 'Fornecedor inválido.',
	tocarUpdatedAt: true
});

export const ferramentas = naPagina({
	tabela: 'adm_ferramentas',
	modulo: 'ferramentas',
	fromForm: ferramentaFromForm,
	validar: (v) => (!v.nome ? 'O nome da ferramenta é obrigatório.' : null),
	idInvalido: 'Ferramenta inválida.',
	tocarUpdatedAt: true
});

export const acessos = naPagina({
	tabela: 'adm_acessos',
	// Acessos da agência moram na tela de Ferramentas & Contas e seguem a
	// permissão dela — não confundir com o cofre do cliente (módulo 'vault').
	modulo: 'ferramentas',
	fromForm: acessoFromForm,
	validar: (v) => (!v.plataforma ? 'A plataforma é obrigatória.' : null),
	idInvalido: 'Acesso inválido.',
	tocarUpdatedAt: true
});

export const vault = naPagina({
	tabela: 'cliente_vault',
	modulo: 'vault',
	fromForm: vaultFromForm,
	validar: (v) => (!v.titulo ? 'O nome do acesso é obrigatório.' : null),
	idInvalido: 'Acesso inválido.',
	tocarUpdatedAt: true,
	// A tela do cliente também salva o próprio cliente: sem chaves separadas, o
	// erro do cofre apareceria no formulário do cadastro.
	chaves: { erro: 'vaultError', salvo: 'vaultSaved', excluido: 'vaultDeleted' },
	extrasAoCriar: async ({ params, locals }) => {
		// Novo acesso entra no fim da lista daquele cliente.
		const { data: ultimo } = await locals.supabase
			.from('cliente_vault')
			.select('posicao')
			.eq('cliente_id', params.id as string)
			.order('posicao', { ascending: false })
			.limit(1)
			.maybeSingle();
		return {
			cliente_id: params.id as string,
			posicao: ((ultimo?.posicao as number | undefined) ?? -1) + 1
		};
	}
});
