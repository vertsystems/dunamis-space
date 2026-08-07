<script lang="ts">
	// Casca dos formulários de criar/editar do sistema.
	//
	// Por que existe: o mesmo bloco — <form method="POST"> + use:enhance com o
	// `saving`, o alerta de erro e o rodapé "Salvar / Cancelar" — estava copiado
	// LITERALMENTE em 10 formulários (ClienteForm, ColaboradorForm, ConteudoForm,
	// ContratoForm, KbForm, PlanoForm, ProcessoForm, ProjetoForm, TransacaoForm,
	// VaultForm). São ~35 linhas cada, e qualquer ajuste no comportamento de envio
	// (tratar `result.type === 'failure'`, desabilitar o botão, mudar o alerta)
	// exigia caçar as dez cópias — com o erro típico de esquecer uma.
	//
	// Cada formulário passa só os CAMPOS (o snippet `children`); o resto vem daqui.
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Button from './Button.svelte';
	import type { Snippet } from 'svelte';

	let {
		action = '',
		error = null,
		submitLabel = 'Salvar',
		/** Modo página: para onde o Cancelar navega quando não há `onCancel`. */
		cancelHref = '',
		/** Modo modal: chamado ao cancelar (em vez de navegar). */
		onCancel,
		/** Modo modal: chamado ao salvar com sucesso (em vez de recarregar). */
		onDone,
		/** Ajusta o FormData antes do envio (ex.: combinar data + hora em UTC). */
		prepararEnvio,
		/** Espaçamento do rodapé — alguns formulários respiram mais. */
		footerClass = 'mt-4',
		children,
		/** Botões extras no rodapé, alinhados à direita (ex.: excluir). */
		acoes
	}: {
		action?: string;
		error?: string | null;
		submitLabel?: string;
		cancelHref?: string;
		onCancel?: () => void;
		onDone?: () => void;
		prepararEnvio?: (formData: FormData) => void;
		footerClass?: string;
		children: Snippet;
		acoes?: Snippet;
	} = $props();

	let saving = $state(false);
</script>

<form
	method="POST"
	{action}
	use:enhance={({ formData }) => {
		prepararEnvio?.(formData);
		saving = true;
		return async ({ result, update }) => {
			// Em modal não há para onde navegar: quem abriu decide o que fazer
			// (fechar, avisar, invalidar) — por isso o onDone curto-circuita.
			if (onDone && (result.type === 'success' || result.type === 'redirect')) {
				saving = false;
				onDone();
				return;
			}
			await update();
			saving = false;
		};
	}}
>
	{#if error}
		<div
			role="alert"
			class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger"
		>
			{error}
		</div>
	{/if}

	{@render children()}

	<div class="flex items-center gap-2 {footerClass}">
		<Button type="submit" loading={saving}>{submitLabel}</Button>
		<Button variant="secondary" onclick={() => (onCancel ? onCancel() : goto(cancelHref))}>
			Cancelar
		</Button>
		{#if acoes}
			<div class="ml-auto flex items-center gap-2">{@render acoes()}</div>
		{/if}
	</div>
</form>
