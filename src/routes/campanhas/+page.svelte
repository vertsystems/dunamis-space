<script lang="ts">
	import { goto } from '$app/navigation';
	import { Card, Button } from '$lib/components/ui';
	let { data } = $props();
	function fmt(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="flex items-center justify-between mb-4">
	<h1 class="text-lg font-semibold text-navy">Campanhas</h1>
	<Button onclick={() => goto('/campanhas/novo')}>+ Nova campanha</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Campanha</th>
					<th class="px-4 py-3 font-semibold">Cliente</th>
					<th class="px-4 py-3 font-semibold">Período</th>
				</tr>
			</thead>
			<tbody>
				{#each data.campanhas as c (c.id)}
					<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/campanhas/${c.id}`)}>
						<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/campanhas/${c.id}`}>{c.nome}</a></td>
						<td class="px-4 py-3">{c.cliente?.nome ?? '—'}</td>
						<td class="px-4 py-3 whitespace-nowrap">{fmt(c.data_inicio)} → {fmt(c.data_fim)}</td>
					</tr>
				{:else}
					<tr><td colspan="3" class="px-4 py-12 text-center text-grey">Nenhuma campanha ainda. Clique em “Nova campanha”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
