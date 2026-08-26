/**
 * Fábrica das actions de criar / editar / excluir.
 *
 * Por que existe: nove módulos (clientes, projetos, contratos, planos, equipe,
 * financeiro, conteúdo, base de conhecimento, processos) escreviam a MESMA
 * sequência em dois arquivos cada — `novo/+page.server.ts` e `[id]/+page.server.ts`:
 *
 *     exigirPermissao → xFromForm(formData) → validar → insert/update
 *     → fail(400) na validação, fail(500) no Postgres, redirect no sucesso
 *
 * Eram ~18 arquivos repetindo a mesma coisa com variações mínimas. O custo não
 * era o volume, era a divergência: o `financeiro` validava o valor ao criar mas
 * não ao editar, uns traduziam o erro do Postgres e outros mostravam o texto
 * cru, e o `preservarValores` (que impede quem não vê valores de zerá-los ao
 * salvar) precisava ser lembrado manualmente em cada update — esquecer era um
 * bug de dados silencioso.
 *
 * Aqui cada recurso é descrito UMA vez (ver `recursos.ts`) e as duas rotas só
 * pedem as actions prontas.
 */
import { fail, redirect } from '@sveltejs/kit';
import { exigirPermissao } from './permissao';
import { podeVerValores, preservarValores } from '$lib/valores';

type Valores = Record<string, unknown>;

/** Descrição de um recurso do CRUD. */
export type Recurso<V extends Valores = Valores> = {
	/** Tabela no Postgres. */
	tabela: string;
	/** Módulo de permissão (RBAC) — 'editar' para gravar, 'excluir' para apagar. */
	modulo: string;
	/** Normaliza o FormData no objeto que vai ao banco. */
	fromForm: (fd: FormData) => V;
	/** Devolve a mensagem do primeiro problema, ou null se estiver tudo certo. */
	validar?: (v: V) => string | null;
	/** Traduz o erro cru do Postgres (ex.: migration faltando). */
	traduzirErro?: (msg: string) => string | null;
	/**
	 * Colunas de valor sigiloso. Saem do UPDATE de quem não tem o módulo
	 * 'valores', para o campo mascarado do formulário não zerar o número real.
	 */
	camposDeValor?: (keyof V)[];
	/** Grava `updated_at` no update (tabelas sem trigger no banco). */
	tocarUpdatedAt?: boolean;
	/** Para onde ir depois de criar. Recebe o id da linha nova. */
	aposCriar: (id: string) => string;
	/** Para onde ir depois de excluir. */
	aposExcluir: string;
};

/** O mínimo de um RequestEvent que estas actions usam. */
type Evento = {
	request: Request;
	locals: App.Locals;
	params: Partial<Record<string, string>>;
};

/** Mensagem que a tela mostra: a traduzida, se houver, senão a do Postgres. */
function mensagem(r: Recurso<never>, msg: string): string {
	return r.traduzirErro?.(msg) ?? msg;
}

/** Action `default` de `<modulo>/novo`: insere e redireciona. */
export function acaoCriar<V extends Valores>(r: Recurso<V>) {
	return async ({ request, locals }: Evento) => {
		exigirPermissao(locals, r.modulo, 'editar');
		const values = r.fromForm(await request.formData());
		const problema = r.validar?.(values);
		if (problema) return fail(400, { error: problema, values });

		const { data, error } = await locals.supabase
			.from(r.tabela)
			.insert(values)
			.select('id')
			.single();
		if (error) return fail(500, { error: mensagem(r as never, error.message), values });

		redirect(303, r.aposCriar(data.id as string));
	};
}

/** Actions `update` e `delete` de `<modulo>/[id]`. */
export function acoesDeItem<V extends Valores>(r: Recurso<V>) {
	return {
		update: async ({ request, params, locals }: Evento) => {
			exigirPermissao(locals, r.modulo, 'editar');
			const values = r.fromForm(await request.formData());
			const problema = r.validar?.(values);
			if (problema) return fail(400, { error: problema, values });

			// Sem permissão de valores, as colunas sigilosas somem do payload —
			// ausente do UPDATE = coluna intocada no banco.
			let patch: Valores = r.camposDeValor?.length
				? preservarValores(values, podeVerValores(locals.permissoes), ...r.camposDeValor)
				: values;
			if (r.tocarUpdatedAt) patch = { ...patch, updated_at: new Date().toISOString() };

			const { error } = await locals.supabase
				.from(r.tabela)
				.update(patch)
				.eq('id', params.id as string);
			if (error) return fail(500, { error: mensagem(r as never, error.message), values });
			return { saved: true };
		},

		delete: async ({ params, locals }: Evento) => {
			exigirPermissao(locals, r.modulo, 'excluir');
			const { error } = await locals.supabase
				.from(r.tabela)
				.delete()
				.eq('id', params.id as string);
			if (error) return fail(500, { error: mensagem(r as never, error.message) });
			redirect(303, r.aposExcluir);
		}
	};
}

// ---------------------------------------------------------------------------
// CRUD que vive numa tela só (fornecedores, ferramentas, acessos, cofre)
// ---------------------------------------------------------------------------
//
// Aqui não há rota `[id]`: a lista, o modal de criar e o de editar são a mesma
// página, o id viaja num <input hidden> e ninguém redireciona depois de salvar
// — a tela só invalida os dados. São outras três actions, com a mesma espinha.

/**
 * Recurso editado sem sair da lista.
 *
 * Os três parâmetros de chave existem só para o TypeScript: são os nomes que a
 * action devolve, e sem eles o `form` da página vira um objeto de chaves
 * desconhecidas — a tela perde a checagem justamente onde ela mais serve.
 */
export type RecursoDePagina<
	V extends Valores = Valores,
	KE extends string = 'error',
	KS extends string = 'saved',
	KD extends string = 'deleted'
> = {
	tabela: string;
	modulo: string;
	fromForm: (fd: FormData) => V;
	validar?: (v: V) => string | null;
	/** O que dizer quando o formulário não mandou o id. */
	idInvalido: string;
	/** Grava `updated_at` no update (tabelas sem trigger no banco). */
	tocarUpdatedAt?: boolean;
	/**
	 * Nomes das chaves devolvidas à página. O padrão serve a quem tem um CRUD
	 * só; telas com dois (o cliente e o cofre dele) precisam separar, senão o
	 * erro de um aparece no formulário do outro.
	 */
	chaves?: { erro?: KE; salvo?: KS; excluido?: KD };
	/** Colunas calculadas no insert (ex.: o cliente dono e a posição na lista). */
	extrasAoCriar?: (ev: Evento) => Valores | Promise<Valores>;
};

/** Id vindo do próprio formulário (não da URL). */
function idDoForm(fd: FormData): string | null {
	const v = fd.get('id');
	return typeof v === 'string' && v ? v : null;
}

/** Actions `criar`, `atualizar` e `excluir` de um CRUD que não muda de rota. */
export function acoesNaPagina<
	V extends Valores,
	KE extends string = 'error',
	KS extends string = 'saved',
	KD extends string = 'deleted'
>(r: RecursoDePagina<V, KE, KS, KD>) {
	const kErro = (r.chaves?.erro ?? 'error') as KE;
	const kSalvo = (r.chaves?.salvo ?? 'saved') as KS;
	const kExcluido = (r.chaves?.excluido ?? 'deleted') as KD;
	const agora = () => (r.tocarUpdatedAt ? { updated_at: new Date().toISOString() } : {});

	/** Falha com a chave de erro do recurso — devolvendo o que o usuário digitou. */
	const falhar = (status: number, msg: string, values?: V) =>
		fail(status, { [kErro]: msg, values } as Record<KE, string> & { values?: V });

	return {
		criar: async (ev: Evento) => {
			exigirPermissao(ev.locals, r.modulo, 'editar');
			const values = r.fromForm(await ev.request.formData());
			const problema = r.validar?.(values);
			if (problema) return falhar(400, problema, values);

			const extras = (await r.extrasAoCriar?.(ev)) ?? {};
			const { error } = await ev.locals.supabase.from(r.tabela).insert({ ...values, ...extras });
			if (error) return falhar(500, error.message, values);
			return { [kSalvo]: true } as Record<KS, true>;
		},

		atualizar: async (ev: Evento) => {
			exigirPermissao(ev.locals, r.modulo, 'editar');
			const fd = await ev.request.formData();
			const id = idDoForm(fd);
			if (!id) return falhar(400, r.idInvalido);
			const values = r.fromForm(fd);
			const problema = r.validar?.(values);
			if (problema) return falhar(400, problema, values);

			const { error } = await ev.locals.supabase
				.from(r.tabela)
				.update({ ...values, ...agora() })
				.eq('id', id);
			if (error) return falhar(500, error.message, values);
			return { [kSalvo]: true } as Record<KS, true>;
		},

		excluir: async (ev: Evento) => {
			exigirPermissao(ev.locals, r.modulo, 'excluir');
			const id = idDoForm(await ev.request.formData());
			if (!id) return falhar(400, r.idInvalido);
			const { error } = await ev.locals.supabase.from(r.tabela).delete().eq('id', id);
			if (error) return falhar(500, error.message);
			return { [kExcluido]: true } as Record<KD, true>;
		}
	};
}
