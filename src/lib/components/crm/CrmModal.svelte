<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '$lib/components/Icon.svelte';

	let {
		open = false,
		title = '',
		onClose,
		children
	}: {
		open?: boolean;
		title?: string;
		onClose: () => void;
		children: Snippet;
	} = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={open ? onKey : undefined} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-900/30 backdrop-blur-[3px] p-4 pt-[8vh]"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		transition:fade={{ duration: 160 }}
	>
		<div
			class="w-full max-w-lg rounded-[var(--radius-xl)] bg-surface border border-grey-200 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:scale={{ start: 0.96, opacity: 0, duration: 200, easing: cubicOut }}
		>
			<div class="flex items-center justify-between gap-3 border-b border-grey-200 px-5 py-4">
				<h2 class="text-sm font-semibold text-navy">{title}</h2>
				<button
					type="button"
					class="grid size-8 place-items-center rounded-[var(--radius)] text-grey transition-colors hover:bg-bg hover:text-navy"
					onclick={onClose}
					aria-label="Fechar"
				>
					<Icon name="x" size={18} />
				</button>
			</div>
			<div class="p-5">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
