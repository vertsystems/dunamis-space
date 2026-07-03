<script lang="ts" module>
	export type Tab = { value: string; label: string };
</script>

<script lang="ts">
	let {
		items,
		value = $bindable(),
		class: extra = ''
	}: { items: Tab[]; value: string; class?: string } = $props();
</script>

<div class="inline-flex gap-0.5 rounded-[var(--radius)] bg-bg p-1 {extra}">
	{#each items as it (it.value)}
		<button
			type="button"
			onclick={() => (value = it.value)}
			class="px-3.5 py-1.5 text-sm rounded-[var(--radius-sm)] transition-all duration-150 {value ===
			it.value
				? 'bg-surface text-navy font-semibold shadow-sm'
				: 'text-slate font-medium hover:text-navy'}"
		>
			{it.label}
		</button>
	{/each}
</div>
