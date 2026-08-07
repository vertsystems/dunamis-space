<script lang="ts">
	// Ranking do mês em versão curta, para o dashboard: quem fechou quanto, e o
	// quanto disso é da meta. Editar a meta é na tela de Metas.
	import { Card } from '$lib/components/ui';
	import { formatBRL, iniciais, type RankingLinha } from '$lib/crm';

	let {
		ranking,
		mesLabel,
		limite = 5
	}: { ranking: RankingLinha[]; mesLabel: string; limite?: number } = $props();

	// Só quem fez algo ou tem meta — a lista inteira de colaboradores aqui seria
	// uma parede de zeros.
	const linhas = $derived(
		ranking.filter((l) => l.valor_ganho > 0 || l.meta > 0).slice(0, limite)
	);
	const totalGanho = $derived(ranking.reduce((s, l) => s + l.valor_ganho, 0));
	const totalMeta = $derived(ranking.reduce((s, l) => s + l.meta, 0));
	const pctTotal = $derived(totalMeta ? Math.round((totalGanho / totalMeta) * 100) : 0);
</script>

<Card>
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<div>
			<h2 class="text-sm font-semibold text-navy">Ranking do mês</h2>
			<p class="text-xs text-grey capitalize">{mesLabel}</p>
		</div>
		<a href="/comercial/metas" class="text-xs font-medium text-brand hover:underline">Ver metas</a>
	</div>

	{#if totalMeta > 0}
		<div class="mb-3">
			<div class="mb-1 flex items-baseline justify-between text-xs">
				<span class="text-grey">Time</span>
				<span class="tabular-nums text-navy">
					<span class="font-semibold text-brand-green">{formatBRL(totalGanho)}</span>
					<span class="text-grey"> / {formatBRL(totalMeta)}</span>
				</span>
			</div>
			<div class="h-2 w-full overflow-hidden rounded-full bg-bg">
				<div
					class="h-full rounded-full transition-all duration-500"
					class:bg-brand={pctTotal < 100}
					class:bg-brand-green={pctTotal >= 100}
					style="width: {Math.min(100, pctTotal)}%"
				></div>
			</div>
		</div>
	{/if}

	{#if linhas.length}
		<div class="space-y-2.5">
			{#each linhas as l (l.colaborador_id)}
				<div class="flex items-center gap-2.5">
					<span
						class="grid size-7 shrink-0 place-items-center rounded-full bg-bg text-[0.6rem] font-semibold text-slate"
						title={l.nome}
					>
						{iniciais(l.nome)}
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-baseline justify-between gap-2 text-xs">
							<span class="truncate text-navy">{l.nome}</span>
							<span class="shrink-0 tabular-nums text-slate">{formatBRL(l.valor_ganho)}</span>
						</div>
						<div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg">
							<div
								class="h-full rounded-full"
								class:bg-brand={l.progresso < 100}
								class:bg-brand-green={l.progresso >= 100}
								style="width: {Math.min(100, l.progresso)}%"
							></div>
						</div>
					</div>
					<span class="w-10 shrink-0 text-right text-xs tabular-nums text-grey">
						{l.meta ? `${l.progresso}%` : '—'}
					</span>
				</div>
			{/each}
		</div>
	{:else}
		<p class="py-4 text-center text-sm text-grey">Nenhum fechamento e nenhuma meta neste mês.</p>
	{/if}
</Card>
