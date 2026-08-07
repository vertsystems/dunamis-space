<script lang="ts">
	// O funil desenhado como funil: cada etapa com a largura proporcional ao
	// número de negócios, para a estrangulada aparecer de relance.
	import { Card } from '$lib/components/ui';
	import { formatBRL, stageDot, type ForecastStage } from '$lib/crm';

	let { etapas }: { etapas: ForecastStage[] } = $props();

	const maxQtd = $derived(Math.max(1, ...etapas.map((e) => e.qtd)));
	const total = $derived(etapas.reduce((s, e) => s + e.qtd, 0));
</script>

<Card>
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<div>
			<h2 class="text-sm font-semibold text-navy">Funil</h2>
			<p class="text-xs text-grey">Negócios abertos em cada etapa</p>
		</div>
		<span class="text-xs text-grey tabular-nums">{total} em aberto</span>
	</div>

	{#if total === 0}
		<p class="py-6 text-center text-sm text-grey">Nenhum negócio em aberto neste funil.</p>
	{:else}
		<div class="space-y-1.5">
			{#each etapas as e (e.stage_id)}
				{@const largura = Math.max(6, Math.round((e.qtd / maxQtd) * 100))}
				<div class="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-1 py-1">
					<span class="flex w-32 shrink-0 items-center gap-1.5 truncate text-xs text-slate">
						<span class="size-2 shrink-0 rounded-full {stageDot(e.cor)}"></span>
						<span class="truncate">{e.nome}</span>
					</span>
					<span class="flex h-6 flex-1 items-center">
						<span
							class="flex h-6 items-center justify-end rounded-[var(--radius-sm)] px-2 text-[0.65rem] font-semibold text-white {stageDot(
								e.cor
							)}"
							style="width: {largura}%"
						>
							{e.qtd}
						</span>
					</span>
					<span class="w-24 shrink-0 text-right text-xs tabular-nums text-navy">
						{formatBRL(e.valor)}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</Card>
