<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends HTMLSelectAttributes {
		label?: string;
		wrapperClass?: string;
		children: Snippet;
	}

	let { label, id, name, wrapperClass = '', value = $bindable(), children, ...rest }: Props = $props();
	const fieldId = $derived(id ?? name);
</script>

<div class={wrapperClass}>
	{#if label}
		<label for={fieldId} class="block text-sm font-medium text-navy mb-1.5">{label}</label>
	{/if}
	<select
		id={fieldId}
		{name}
		bind:value
		class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 disabled:opacity-60 disabled:bg-bg"
		{...rest}
	>
		{@render children()}
	</select>
</div>
