<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	let {
		icon = 'folder',
		title,
		description = '',
		children
	}: {
		icon?: string;
		title: string;
		description?: string;
		/** ação opcional (ex.: botão) */
		children?: Snippet;
	} = $props();
</script>

<div class="flex flex-col items-center justify-center text-center px-6 py-14">
	<div class="grid size-14 place-items-center rounded-[var(--radius-xl)] bg-bg text-grey mb-4">
		<Icon name={icon} size={26} />
	</div>
	<h3 class="text-sm font-semibold text-navy">{title}</h3>
	{#if description}
		<p class="mt-1 text-sm text-grey max-w-sm">{description}</p>
	{/if}
	{#if children}
		<div class="mt-5">{@render children()}</div>
	{/if}
</div>
