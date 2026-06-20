<script lang="ts" module>
	export type Crumb = { label: string; href?: string };
</script>

<script lang="ts">
	let { items }: { items: Crumb[] } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="flex flex-wrap items-center gap-1.5 text-sm text-grey">
		{#each items as item, i (i)}
			<li class="flex items-center gap-1.5">
				{#if item.href && i < items.length - 1}
					<a class="text-brand hover:underline" href={item.href}>{item.label}</a>
				{:else}
					<span aria-current="page" class="text-navy font-medium">{item.label}</span>
				{/if}
				{#if i < items.length - 1}<span class="text-grey-200">/</span>{/if}
			</li>
		{/each}
	</ol>
</nav>
