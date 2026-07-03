<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, Button, EmptyState, DataTable } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	let { data } = $props();
	function fmt(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}

	type Campanha = (typeof data.campanhas)[number];
	const columns: ColumnDef<Campanha>[] = [
		{ id: 'campanha', accessorFn: (c) => c.nome ?? '', meta: { label: 'Campanha' } },
		{ id: 'cliente', accessorFn: (c) => c.cliente?.nome ?? '', meta: { label: 'Cliente' } },
		{ id: 'periodo', accessorFn: (c) => c.data_inicio ?? '', meta: { label: 'Período' } }
	];
</script>

<div class="flex items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl font-bold text-navy">Campanhas</h1>
		<p class="text-sm text-grey">Campanhas e promoções por cliente.</p>
	</div>
	<Button onclick={() => goto('/campanhas/novo')}>+ Nova campanha</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.campanhas} initialSort={[{ id: 'campanha', desc: false }]}>
		{#snippet row(r)}
			{@const c = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/campanhas/${c.id}`)}>
				<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/campanhas/${c.id}`}>{c.nome}</a></td>
				<td class="px-4 py-3">{c.cliente?.nome ?? '—'}</td>
				<td class="px-4 py-3 whitespace-nowrap">{fmt(c.data_inicio)} → {fmt(c.data_fim)}</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="3" class="px-2"><EmptyState icon="tag" title="Nenhuma campanha ainda" description="Crie campanhas e promoções." /></td></tr>
		{/snippet}
	</DataTable>
</Card>
