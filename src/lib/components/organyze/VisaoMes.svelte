<script lang="ts">
	// Modo Mês: grade de segunda a domingo cobrindo o mês, com até quatro
	// tarefas por dia e um "+N mais" que leva ao dia.
	import { organyze, toISODate, inicioSemana, inicioMes } from '$lib/organyze/store.svelte';
	import { CATEGORIA_COR, CATEGORIA_LABEL } from '$lib/organyze/types';
	import type { Tarefa } from '$lib/organyze/types';
	import { DOW } from '$lib/organyze/ui';
	import { Check } from '@lucide/svelte';

	let {
		hoje,
		onAbrir,
		onAbrirDia
	}: { hoje: string; onAbrir: (t: Tarefa) => void; onAbrirDia: (iso: string) => void } = $props();

	const semanas = $derived.by(() => {
		const mesFoco = Number(organyze.dia.split('-')[1]);
		const [y, m, d] = inicioSemana(inicioMes(organyze.dia)).split('-').map(Number);
		const cells = Array.from({ length: 42 }, (_, i) => {
			const dt = new Date(y, m - 1, d + i);
			const iso = toISODate(dt);
			return {
				iso,
				dia: dt.getDate(),
				noMes: dt.getMonth() + 1 === mesFoco,
				tarefas: organyze.tarefas.filter((t) => t.data === iso)
			};
		});
		const semanas = [];
		for (let i = 0; i < 42; i += 7) semanas.push(cells.slice(i, i + 7));
		return semanas.filter((w) => w.some((c) => c.noMes));
	});
</script>

<div class="overflow-hidden rounded-[var(--radius-lg)] border border-grey-200 bg-surface shadow-xs">
	<div class="grid grid-cols-7 border-b border-grey-200 bg-bg">
		{#each DOW as d (d)}
			<div class="px-1 py-2 text-center text-[11px] font-semibold uppercase text-grey">{d}</div>
		{/each}
	</div>
	{#each semanas as semana, i (i)}
		<div class="grid grid-cols-7">
			{#each semana as cell (cell.iso)}
				<div
					class="flex min-h-[132px] flex-col gap-1 border-b border-grey-200 p-1.5 [&:not(:nth-child(7n))]:border-r"
					class:bg-bg={!cell.noMes}
				>
					<div class="flex items-center justify-between">
						<button
							class="text-xs font-semibold"
							class:grid={cell.iso === hoje}
							class:size-5={cell.iso === hoje}
							class:place-items-center={cell.iso === hoje}
							class:rounded-full={cell.iso === hoje}
							class:bg-brand={cell.iso === hoje}
							class:text-white={cell.iso === hoje}
							class:text-navy={cell.iso !== hoje && cell.noMes}
							class:text-grey={cell.iso !== hoje && !cell.noMes}
							title="Abrir dia"
							onclick={() => onAbrirDia(cell.iso)}
						>
							{cell.dia}
						</button>
					</div>
					<div class="flex flex-col gap-0.5">
						{#each cell.tarefas.slice(0, 4) as t (t.id)}
							<div
								class="flex items-center gap-1 rounded border-l-2 pl-1 pr-1 py-0.5 transition-colors hover:bg-surface"
								style:border-left-color={CATEGORIA_COR[t.categoria]}
								title={CATEGORIA_LABEL[t.categoria]}
							>
								<!-- Bolinha de concluído -->
								<button
									class="grid size-3 shrink-0 place-items-center rounded-[4px] border transition-colors"
									class:border-grey-200={t.status !== 'concluida'}
									class:border-brand={t.status === 'concluida'}
									class:bg-brand={t.status === 'concluida'}
									class:text-white={t.status === 'concluida'}
									aria-label={t.status === 'concluida' ? 'Reabrir tarefa' : 'Concluir tarefa'}
									onclick={() => organyze.toggle(t.id)}
								>
									{#if t.status === 'concluida'}<Check size={8} strokeWidth={3} />{/if}
								</button>
								<button
									class="flex min-w-0 flex-1 items-center text-left"
									title={t.titulo}
									onclick={() => onAbrir(t)}
								>
									<span
										class="truncate text-[11px] leading-tight"
										class:text-grey={t.status === 'concluida'}
										class:line-through={t.status === 'concluida'}
										class:text-navy={t.status !== 'concluida'}>{t.titulo}</span
									>
								</button>
							</div>
						{/each}
						{#if cell.tarefas.length > 4}
							<button
								class="px-1 text-left text-[10px] font-medium text-grey hover:text-brand"
								onclick={() => onAbrirDia(cell.iso)}
							>
								+{cell.tarefas.length - 4} mais
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/each}
</div>
