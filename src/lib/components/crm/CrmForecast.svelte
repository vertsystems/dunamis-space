<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { formatBRL, stageDot, type Forecast } from '$lib/crm';

	let { forecast }: { forecast: Forecast } = $props();

	const maxPond = $derived(Math.max(1, ...forecast.por_stage.map((s) => s.ponderado)));
	const temNegocios = $derived(forecast.por_stage.some((s) => s.qtd > 0));
</script>

<Card>
	<div class="mb-3 flex items-start justify-between gap-2">
		<div>
			<h2 class="text-sm font-semibold text-navy">Previsão de receita</h2>
			<p class="text-xs text-grey">Ponderada pela probabilidade das etapas</p>
		</div>
		<div class="text-right">
			<div class="text-2xl font-bold text-brand tabular-nums">
				{formatBRL(forecast.total_ponderado)}
			</div>
			<div class="text-xs text-grey">de {formatBRL(forecast.total_aberto)} em aberto</div>
		</div>
	</div>

	{#if forecast.mes_valor > 0}
		<div class="mb-3 rounded-[var(--radius)] bg-bg px-3 py-2 text-xs text-slate">
			Previsto fechar este mês:
			<span class="font-semibold text-navy">{formatBRL(forecast.mes_valor)}</span>
			<span class="text-grey">(ponderado {formatBRL(forecast.mes_ponderado)})</span>
		</div>
	{/if}

	{#if temNegocios}
		<div class="space-y-2">
			{#each forecast.por_stage as s (s.stage_id)}
				<div class="flex items-center gap-2 text-xs">
					<span class="flex w-32 shrink-0 items-center gap-1.5 truncate text-slate">
						<span class="size-2 shrink-0 rounded-full {stageDot(s.cor)}"></span>
						<span class="truncate">{s.nome}</span>
						<span class="text-grey">{s.prob}%</span>
					</span>
					<div class="h-3 flex-1 overflow-hidden rounded-[var(--radius-sm)] bg-bg">
						<div
							class="h-full {stageDot(s.cor)}"
							style="width: {Math.round((s.ponderado / maxPond) * 100)}%"
						></div>
					</div>
					<span class="w-24 shrink-0 text-right text-navy tabular-nums">{formatBRL(s.ponderado)}</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="py-4 text-center text-sm text-grey">Nenhum negócio em aberto neste funil.</p>
	{/if}
</Card>
