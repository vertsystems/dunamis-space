<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		/** classe no wrapper (ex.: col-span do grid) */
		wrapperClass?: string;
		/** Mensagem de erro do campo — vira texto anunciado + aria-invalid/aria-describedby. */
		erro?: string | null;
	}

	let {
		label,
		id,
		name,
		wrapperClass = '',
		erro = null,
		value = $bindable(),
		...rest
	}: Props = $props();
	const fieldId = $derived(id ?? name);
	// Só sobrescreve os atributos ARIA quando há erro (senão o spread do caller vale).
	const a11yErro = $derived(
		erro ? { 'aria-invalid': 'true' as const, 'aria-describedby': `${fieldId}-erro` } : {}
	);
</script>

<div class={wrapperClass}>
	{#if label}
		<label for={fieldId} class="block text-sm font-medium text-navy mb-1.5">{label}</label>
	{/if}
	<input
		id={fieldId}
		{name}
		bind:value
		class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 disabled:opacity-60 disabled:bg-bg"
		{...rest}
		{...a11yErro}
	/>
	{#if erro}
		<p id="{fieldId}-erro" role="alert" class="mt-1.5 text-xs text-brand-danger">{erro}</p>
	{/if}
</div>
