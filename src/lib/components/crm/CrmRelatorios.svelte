<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { formatBRL, type MotivoPerdaLinha, type OrigemLinha } from '$lib/crm';

	let { motivos, origens }: { motivos: MotivoPerdaLinha[]; origens: OrigemLinha[] } = $props();

	const maxMotivo = $derived(Math.max(1, ...motivos.map((m) => m.qtd)));
	const totalPerdidos = $derived(motivos.reduce((s, m) => s + m.qtd, 0));
</script>

<div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
	<!-- Motivos de perda -->
	<Card>
		<div class="mb-4 flex items-center justify-between gap-2">
			<h2 class="text-base font-semibold text-navy">Por que perdemos</h2>
			<span class="text-xs text-grey">{totalPerdidos} perdido{totalPerdidos === 1 ? '' : 's'}</span>
		</div>
		{#if motivos.length}
			<div class="space-y-3">
				{#each motivos as m (m.motivo)}
					<div>
						<div class="mb-1 flex items-center justify-between gap-2 text-sm">
							<span class="truncate text-navy">{m.motivo}</span>
							<span class="shrink-0 text-grey tabular-nums">{m.qtd} · {formatBRL(m.valor)}</span>
						</div>
						<div class="h-2.5 overflow-hidden rounded-full bg-bg">
							<div
								class="h-full rounded-full bg-brand-danger"
								style="width: {Math.round((m.qtd / maxMotivo) * 100)}%"
							></div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-grey">Nenhum negócio perdido ainda. 🎯</p>
		{/if}
	</Card>

	<!-- Origem dos leads -->
	<Card padding="none" class="overflow-hidden">
		<div class="border-b border-grey-200 px-5 py-4">
			<h2 class="text-base font-semibold text-navy">Origem dos leads</h2>
			<p class="text-xs text-grey">Conversão por canal de entrada</p>
		</div>
		{#if origens.length}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
							<th class="px-5 py-2.5 font-semibold">Origem</th>
							<th class="px-3 py-2.5 text-right font-semibold">Leads</th>
							<th class="px-3 py-2.5 text-right font-semibold">Neg.</th>
							<th class="px-3 py-2.5 text-right font-semibold">Ganhos</th>
							<th class="px-5 py-2.5 text-right font-semibold">Valor</th>
							<th class="px-5 py-2.5 text-right font-semibold">Conv.</th>
						</tr>
					</thead>
					<tbody>
						{#each origens as o (o.origem)}
							<tr class="border-b border-grey-200/60 last:border-0">
								<td class="px-5 py-2.5 text-navy">{o.origem}</td>
								<td class="px-3 py-2.5 text-right text-slate tabular-nums">{o.leads}</td>
								<td class="px-3 py-2.5 text-right text-slate tabular-nums">{o.negocios}</td>
								<td class="px-3 py-2.5 text-right text-brand-green tabular-nums">{o.ganhos}</td>
								<td class="px-5 py-2.5 text-right text-navy tabular-nums">{formatBRL(o.valor_ganho)}</td>
								<td
									class="px-5 py-2.5 text-right font-semibold tabular-nums {o.conversao >= 50
										? 'text-brand-green'
										: 'text-slate'}">{o.conversao}%</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="py-6 text-center text-sm text-grey">Sem dados de origem ainda.</p>
		{/if}
	</Card>
</div>
