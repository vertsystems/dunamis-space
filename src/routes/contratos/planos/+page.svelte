<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatBRL } from '$lib/contratos';
	import { Card, Badge, Button, Breadcrumb, EmptyState, DataTable } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';

	let { data } = $props();
	const lim = (n: number | null) => (n == null ? '—' : n);

	type Plano = (typeof data.planos)[number];
	const columns: ColumnDef<Plano>[] = [
		{ id: 'nome', accessorFn: (p) => p.nome ?? '', meta: { label: 'Plano' } },
		{ id: 'valor', accessorFn: (p) => p.valor_mensal ?? 0, meta: { label: 'Valor mensal', thClass: 'text-right' } },
		{ id: 'posts', accessorFn: (p) => p.limite_posts ?? 0, meta: { label: 'Posts', thClass: 'text-center' } },
		{ id: 'stories', accessorFn: (p) => p.limite_stories ?? 0, meta: { label: 'Stories', thClass: 'text-center' } },
		{ id: 'reels', accessorFn: (p) => p.limite_reels ?? 0, meta: { label: 'Reels', thClass: 'text-center' } },
		{ id: 'status', accessorFn: (p) => (p.ativo ? 1 : 0), meta: { label: 'Status' } }
	];
</script>

<Breadcrumb items={[{ label: 'Contratos', href: '/contratos' }, { label: 'Planos' }]} />

<div class="flex items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl font-bold text-navy">Planos</h1>
		<p class="text-sm text-grey">Planos de serviço oferecidos aos clientes.</p>
	</div>
	<Button onclick={() => goto('/contratos/planos/novo')}>+ Novo plano</Button>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.planos} initialSort={[{ id: 'nome', desc: false }]}>
		{#snippet row(r)}
			{@const p = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/contratos/planos/${p.id}`)}>
				<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/contratos/planos/${p.id}`}>{p.nome}</a></td>
				<td class="px-4 py-3 text-right tabular-nums">{formatBRL(p.valor_mensal)}</td>
				<td class="px-4 py-3 text-center">{lim(p.limite_posts)}</td>
				<td class="px-4 py-3 text-center">{lim(p.limite_stories)}</td>
				<td class="px-4 py-3 text-center">{lim(p.limite_reels)}</td>
				<td class="px-4 py-3">
					<Badge tone={p.ativo ? 'success' : 'neutral'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="6" class="px-2"><EmptyState icon="tag" title="Nenhum plano ainda" description="Crie os planos oferecidos pela agência." /></td></tr>
		{/snippet}
	</DataTable>
</Card>
