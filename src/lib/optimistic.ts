import type { SubmitFunction } from '@sveltejs/kit';

/**
 * `use:enhance` otimista: aplica a alteração na tela imediatamente e desfaz
 * se o servidor falhar. `apply(formData)` deve mutar o estado local e
 * retornar uma função de rollback. Em caso de sucesso, reconcilia com o
 * servidor via `update()` (substitui itens temporários pelos reais).
 */
export function optimistic(opts: {
	apply: (formData: FormData) => () => void;
	onError?: (msg: string) => void;
	/** Por padrão limpa o formulário após sucesso (útil em "adicionar"). */
	resetOnSuccess?: boolean;
}): SubmitFunction {
	return ({ formData }) => {
		const rollback = opts.apply(formData);
		return async ({ result, update }) => {
			if (result.type === 'failure') {
				rollback();
				const data = (result.data ?? {}) as Record<string, unknown>;
				const msg = (data.error ?? data.produtoError ?? data.materialError) as string | undefined;
				opts.onError?.(msg ?? 'Não foi possível salvar. Tente novamente.');
				return;
			}
			if (result.type === 'error') {
				rollback();
				opts.onError?.(result.error?.message ?? 'Erro inesperado.');
				return;
			}
			// success / redirect
			await update({ reset: opts.resetOnSuccess ?? false });
		};
	};
}

/** Gera um id temporário para itens otimistas (substituído pelo id real). */
export function tempId(): string {
	return 'tmp-' + Math.random().toString(36).slice(2, 10);
}
