<script lang="ts" module>
	export type DropdownItem = {
		label: string;
		icon?: string;
		onSelect: () => void;
		danger?: boolean;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '$lib/components/Icon.svelte';

	let {
		items,
		align = 'right',
		trigger
	}: {
		items: DropdownItem[];
		align?: 'left' | 'right';
		/** recebe uma função para abrir/fechar o menu */
		trigger: Snippet<[() => void]>;
	} = $props();

	let open = $state(false);
	let root: HTMLElement | undefined = $state();

	function onDocClick(e: MouseEvent) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<svelte:document onclick={onDocClick} onkeydown={onKey} />

<div class="relative inline-block" bind:this={root}>
	{@render trigger(() => (open = !open))}
	{#if open}
		<div
			class="absolute z-40 mt-1.5 min-w-44 rounded-[var(--radius-lg)] border border-grey-200 bg-surface shadow-lg p-1 {align ===
			'right'
				? 'right-0'
				: 'left-0'}"
			transition:scale={{ start: 0.95, opacity: 0, duration: 130, easing: cubicOut }}
			role="menu"
		>
			{#each items as it (it.label)}
				<button
					type="button"
					role="menuitem"
					onclick={() => {
						it.onSelect();
						open = false;
					}}
					class="flex w-full items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm text-left transition-colors {it.danger
						? 'text-brand-danger hover:bg-brand-danger/10'
						: 'text-navy hover:bg-bg'}"
				>
					{#if it.icon}<Icon name={it.icon} size={15} />{/if}
					{it.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
