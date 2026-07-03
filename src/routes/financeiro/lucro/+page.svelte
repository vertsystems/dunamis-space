<script lang="ts">
	import { formatBRL } from '$lib/financeiro';
	import { Card, Breadcrumb, EmptyState, DataTable } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	let { data } = $props();

	type Linha = (typeof data.linhas)[number];
	const columns: ColumnDef<Linha>[] = [
		{ id: 'nome', accessorFn: (l) => l.nome ?? '', meta: { label: 'Cliente' } },
		{ id: 'receitas', accessorFn: (l) => Number(l.receitas ?? 0), meta: { label: 'Receitas', thClass: 'text-right' } },
		{ id: 'despesas', accessorFn: (l) => Number(l.despesas ?? 0), meta: { label: 'Despesas', thClass: 'text-right' } },
		{ id: 'lucro', accessorFn: (l) => Number(l.lucro ?? 0), meta: { label: 'Lucro', thClass: 'text-right' } }
	];
</script>

<Breadcrumb items={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Lucro por cliente' }]} />

<h1 class="text-xl font-bold text-navy">Lucro por cliente</h1>
<p class="text-sm text-grey mb-4">Receitas menos despesas alocadas a cada cliente.</p>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.linhas} initialSort={[{ id: 'lucro', desc: true }]}>
		{#snippet row(r)}
			{@const l = r.original}
			<tr class="border-b border-grey-200/60 last:border-0 hover:bg-bg">
				<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/clientes/${l.cliente_id}`}>{l.nome}</a></td>
				<td class="px-4 py-3 text-right tabular-nums text-brand-green">{formatBRL(l.receitas)}</td>
				<td class="px-4 py-3 text-right tabular-nums text-brand-danger">{formatBRL(l.despesas)}</td>
				<td class="px-4 py-3 text-right tabular-nums font-semibold {Number(l.lucro) >= 0 ? 'text-brand-green' : 'text-brand-danger'}">
					{formatBRL(l.lucro)}
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="4" class="px-2"><EmptyState icon="chart" title="Sem dados ainda" description="Cadastre transações vinculadas a clientes para ver o lucro." /></td></tr>
		{/snippet}
	</DataTable>
</Card>
