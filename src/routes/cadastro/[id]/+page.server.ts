import { error } from '@sveltejs/kit';
import { acoesDeItem, acoesNaPagina } from '$lib/server/crud';
// `vault` renomeado: no load abaixo essa palavra já é o cofre carregado.
import {
	clientes,
	vault as recursoVault,
	clienteServicos as recursoServicos,
	clienteServicoAcessos as recursoServicoAcessos
} from '$lib/server/recursos';
import { carregarCalendario } from '$lib/server/calendario';
import { podeVer } from '$lib/permissoes';
import { sel } from '$lib/server/query';
import { podeVerValores } from '$lib/valores';
import type { VaultItem } from '$lib/vault';
import type { ServicoAcesso, ServicoItem, ServicosData } from '$lib/servicos';
import type { Actions, PageServerLoad } from './$types';

type SupabaseClient = Parameters<PageServerLoad>[0]['locals']['supabase'];

/** Tabela ainda não criada = migration 0051 pendente (não é erro do usuário). */
const VAULT_PENDENTE_RX = /cliente_vault|does not exist|schema cache|relation/i;

/** Mesma ideia para os Serviços & Ferramentas (migration 0061). */
const SERVICOS_PENDENTE_RX = /cliente_servico|does not exist|schema cache|relation/i;

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

/**
 * Serviços & Ferramentas deste cliente, cada um com os logins pendurados nele.
 *
 * Os logins vêm no mesmo select (embed), mas obedecem ao RLS da própria tabela:
 * quem não tem o módulo 'vault' recebe a ficha do serviço com a lista de acessos
 * VAZIA. Ainda assim não pedimos o embed nesse caso — dado que não vai ser usado
 * não precisa cruzar a rede.
 */
async function carregarServicos(
	supabase: SupabaseClient,
	clienteId: string,
	podeAcessos: boolean,
	podeValores: boolean
): Promise<ServicosData> {
	const campos =
		'id, nome, categoria, url, fornecedor, suporte_contato, custo_mensal, responsavel_id, observacoes, posicao, updated_at';
	const embed = ', cliente_servico_acessos(id, servico_id, rotulo, login, senha, url, observacoes, posicao)';

	let q = supabase
		.from('cliente_servicos')
		.select(podeAcessos ? campos + embed : campos)
		.eq('cliente_id', clienteId)
		.order('posicao', { ascending: true })
		.order('nome', { ascending: true });
	if (podeAcessos) {
		q = q.order('posicao', { referencedTable: 'cliente_servico_acessos', ascending: true });
	}

	const { data, error: e } = await q;
	if (e) {
		const pendente = SERVICOS_PENDENTE_RX.test(e.message ?? '');
		return {
			itens: [],
			pendente,
			erro: pendente ? null : e.message,
			podeVerAcessos: podeAcessos
		};
	}

	// O select é montado como string (com ou sem o embed), então o supabase-js não
	// consegue inferir a linha: tipamos aqui, uma vez.
	const linhas = (data ?? []) as unknown as Record<string, unknown>[];
	const itens: ServicoItem[] = linhas.map((s) => ({
		id: s.id as string,
		nome: s.nome as string,
		categoria: (s.categoria as string | null) ?? null,
		url: (s.url as string | null) ?? null,
		fornecedor: (s.fornecedor as string | null) ?? null,
		suporte_contato: (s.suporte_contato as string | null) ?? null,
		// O custo nem chega ao navegador de quem não pode ver valores.
		custo_mensal: podeValores ? ((s.custo_mensal as number | null) ?? null) : null,
		responsavel_id: (s.responsavel_id as string | null) ?? null,
		observacoes: (s.observacoes as string | null) ?? null,
		posicao: (s.posicao as number) ?? 0,
		updated_at: (s.updated_at as string | null) ?? null,
		acessos: ((s.cliente_servico_acessos as ServicoAcesso[] | null) ?? []).map((a) => ({
			id: a.id,
			servico_id: a.servico_id,
			rotulo: a.rotulo,
			login: a.login ?? null,
			senha: a.senha ?? null,
			url: a.url ?? null,
			observacoes: a.observacoes ?? null,
			posicao: a.posicao ?? 0
		}))
	}));

	return {
		itens,
		pendente: false,
		erro: null,
		podeVerAcessos: podeAcessos
	};
}

export const load: PageServerLoad = async ({ params, url, locals: { supabase, permissoes } }) => {
	// O cofre só é consultado por quem tem o módulo; sem permissão, nem as senhas
	// nem os logins saem do servidor.
	const podeVault = podeVer(permissoes, 'vault');
	const podeServicos = podeVer(permissoes, 'servicos');
	const [{ data: cliente, error: e }, calendario, vault, servicos] = await Promise.all([
		supabase.from('clientes').select('*').eq('id', params.id).single(),
		carregarCalendario(supabase, url, { clienteFixo: params.id }),
		podeVault ? carregarVault(supabase, params.id) : Promise.resolve(null),
		podeServicos
			? carregarServicos(supabase, params.id, podeVault, podeVerValores(permissoes))
			: Promise.resolve(null)
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
		vault,
		servicos
	};
};

const cofre = acoesNaPagina(recursoVault);
const servicos = acoesNaPagina(recursoServicos);
const servicoAcessos = acoesNaPagina(recursoServicoAcessos);

export const actions: Actions = {
	// O cadastro do cliente: mesmas regras da tela /clientes/[id].
	...acoesDeItem(clientes),

	// O cofre de acessos deste cliente, editado sem sair da tela.
	vault_criar: cofre.criar,
	vault_atualizar: cofre.atualizar,
	vault_excluir: cofre.excluir,

	// Serviços & Ferramentas do cliente: a ficha…
	servico_criar: servicos.criar,
	servico_atualizar: servicos.atualizar,
	servico_excluir: servicos.excluir,

	// …e os logins de cada unidade dentro dela (permissão do cofre).
	servico_acesso_criar: servicoAcessos.criar,
	servico_acesso_atualizar: servicoAcessos.atualizar,
	servico_acesso_excluir: servicoAcessos.excluir
};
