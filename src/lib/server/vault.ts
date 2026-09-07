/**
 * Leitura do cofre de acessos, compartilhada pelas duas telas que o mostram: a
 * do cliente (`cliente_vault`, migration 0051) e a do projeto (`projeto_vault`,
 * 0064). As tabelas têm as mesmas colunas e mudam só o dono, então a consulta é
 * uma só — duplicá-la faria as duas telas divergirem na primeira coluna nova.
 *
 * Só deve ser chamada para quem tem o módulo 'vault': sem permissão, nem os
 * logins nem as senhas devem sair do servidor.
 */
import type { VaultItem } from '$lib/vault';

type Supa = App.Locals['supabase'];

/** Cofre carregado, no formato que o VaultCard espera. */
export type Cofre = { itens: VaultItem[]; pendente: boolean; erro: string | null };

const COLUNAS =
	'id, titulo, categoria, url, login, senha, observacoes, responsavel_id, posicao, updated_at';

/** Tabela ainda não criada = migration do cofre pendente (não é erro do usuário). */
const PENDENTE_RX = /cliente_vault|projeto_vault|does not exist|schema cache|relation/i;

export async function carregarVault(
	supabase: Supa,
	tabela: 'cliente_vault' | 'projeto_vault',
	dono: 'cliente_id' | 'projeto_id',
	donoId: string
): Promise<Cofre> {
	const { data, error } = await supabase
		.from(tabela)
		.select(COLUNAS)
		.eq(dono, donoId)
		.order('posicao', { ascending: true })
		.order('titulo', { ascending: true });

	if (error) {
		const pendente = PENDENTE_RX.test(error.message ?? '');
		return { itens: [], pendente, erro: pendente ? null : error.message };
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
		})),
		pendente: false,
		erro: null
	};
}
