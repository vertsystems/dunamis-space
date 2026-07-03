<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatBRL } from '$lib/contratos';
	import { Card, Badge, Button, Breadcrumb, EmptyState } from '$lib/components/ui';

	let { data } = $props();
	const lim = (n: number | null) => (n == null ? '—' : n);
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
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Plano</th>
					<th class="px-4 py-3 font-semibold text-right">Valor mensal</th>
					<th class="px-4 py-3 font-semibold text-center">Posts</th>
					<th class="px-4 py-3 font-semibold text-center">Stories</th>
					<th class="px-4 py-3 font-semibold text-center">Reels</th>
					<th class="px-4 py-3 font-semibold">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.planos as p (p.id)}
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
				{:else}
					<tr><td colspan="6" class="px-2"><EmptyState icon="tag" title="Nenhum plano ainda" description="Crie os planos oferecidos pela agência." /></td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
