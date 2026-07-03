<script lang="ts" module>
	export type Segment = { label: string; href: string };
</script>

<script lang="ts">
	let { items, current }: { items: Segment[]; current: string } = $props();
</script>

<div class="inline-flex gap-0.5 rounded-[var(--radius)] bg-bg p-1">
	{#each items as it (it.href)}
		{#if it.label === current}
			<span
				class="px-3.5 py-1.5 text-sm font-semibold rounded-[var(--radius-sm)] bg-surface text-navy shadow-sm"
				>{it.label}</span
			>
		{:else}
			<a
				href={it.href}
				class="px-3.5 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] text-slate transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
				>{it.label}</a
			>
		{/if}
	{/each}
</div>
