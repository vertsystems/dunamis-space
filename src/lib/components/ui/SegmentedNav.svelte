<script lang="ts" module>
	export type Segment = { label: string; href: string };
</script>

<script lang="ts">
	let { items, current }: { items: Segment[]; current: string } = $props();
</script>

<div class="inline-flex rounded-[var(--radius)] border border-grey-200 bg-surface p-0.5">
	{#each items as it (it.href)}
		{#if it.label === current}
			<span class="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] bg-brand text-white">{it.label}</span>
		{:else}
			<a href={it.href} class="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] text-slate hover:bg-bg">{it.label}</a>
		{/if}
	{/each}
</div>
