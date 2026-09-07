/**
 * Leitura do cofre de acessos do cliente (`cliente_vault`, migration 0051).
 *
 * Mora aqui, e não dentro do `+page.server.ts` do cadastro, para a consulta ter
 * um lugar só quando o cofre ganhar coluna nova. (Existiu por algumas horas um
 * cofre por projeto que dividia esta função; ele saiu na 0066 — no projeto, as
 * credenciais vão na própria descrição.)
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

/** Tabela ainda não criada = migration 0051 pendente (não é erro do usuário). */
const PENDENTE_RX = /cliente_vault|does not exist|schema cache|relation/i;

export async function carregarVault(supabase: Supa, clienteId: string): Promise<Cofre> {
	const { data, error } = await supabase
		.from('cliente_vault')
		.select(COLUNAS)
		.eq('cliente_id', clienteId)
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
