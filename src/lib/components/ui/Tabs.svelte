<script lang="ts" module>
	export type Tab = { value: string; label: string };
</script>

<script lang="ts">
	// Segmented control acessível (teclado + roving focus) sobre Bits UI.
	import { Tabs } from 'bits-ui';

	let {
		items,
		value = $bindable(),
		class: extra = ''
	}: { items: Tab[]; value: string; class?: string } = $props();
</script>

<Tabs.Root bind:value class="inline-block {extra}">
	<Tabs.List class="inline-flex gap-0.5 rounded-[var(--radius)] bg-bg p-1">
		{#each items as it (it.value)}
			<Tabs.Trigger
				value={it.value}
				class="cursor-pointer rounded-[var(--radius-sm)] px-3.5 py-1.5 text-sm font-medium text-slate transition-all duration-150 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 data-[state=active]:bg-surface data-[state=active]:font-semibold data-[state=active]:text-navy data-[state=active]:shadow-sm"
			>
				{it.label}
			</Tabs.Trigger>
		{/each}
	</Tabs.List>
</Tabs.Root>
