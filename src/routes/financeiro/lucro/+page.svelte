<script lang="ts">
	import { formatBRL } from '$lib/financeiro';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data } = $props();
</script>

<Breadcrumb items={[{ label: 'Financeiro', href: '/financeiro' }, { label: 'Lucro por cliente' }]} />

<h1 class="text-lg font-semibold text-navy">Lucro por cliente</h1>
<p class="text-slate mb-4">Receitas menos despesas alocadas a cada cliente.</p>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Cliente</th>
					<th class="px-4 py-3 font-semibold text-right">Receitas</th>
					<th class="px-4 py-3 font-semibold text-right">Despesas</th>
					<th class="px-4 py-3 font-semibold text-right">Lucro</th>
				</tr>
			</thead>
			<tbody>
				{#each data.linhas as l (l.cliente_id)}
					<tr class="border-b border-grey-200/60 last:border-0 hover:bg-bg">
						<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/clientes/${l.cliente_id}`}>{l.nome}</a></td>
						<td class="px-4 py-3 text-right tabular-nums text-brand-green">{formatBRL(l.receitas)}</td>
						<td class="px-4 py-3 text-right tabular-nums text-brand-danger">{formatBRL(l.despesas)}</td>
						<td class="px-4 py-3 text-right tabular-nums font-semibold {Number(l.lucro) >= 0 ? 'text-brand-green' : 'text-brand-danger'}">
							{formatBRL(l.lucro)}
						</td>
					</tr>
				{:else}
					<tr><td colspan="4" class="px-4 py-12 text-center text-grey">Sem dados ainda.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
