<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children: Snippet;
	}

	let { padding = 'md', class: extra = '', children }: Props = $props();

	const pad = $derived({ none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }[padding]);
</script>

<div class="bg-surface border border-grey-200 rounded-[var(--radius-lg)] {pad} {extra}">
	{@render children()}
</div>
