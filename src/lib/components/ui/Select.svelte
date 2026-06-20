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
		<label for={fieldId} class="block text-sm font-medium text-navy mb-1">{label}</label>
	{/if}
	<select
		id={fieldId}
		{name}
		bind:value
		class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface px-3 text-sm text-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60"
		{...rest}
	>
		{@render children()}
	</select>
</div>
