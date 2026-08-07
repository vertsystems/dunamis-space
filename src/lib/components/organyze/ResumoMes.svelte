<script lang="ts">
	// Painel do mês: quanto das metas saiu do papel e quanto dos hábitos foi
	// cumprido. Tudo é calculado a partir do store — o painel não guarda estado.
	import { organyze } from '$lib/organyze/store.svelte';
	import { metaConcluida, metaPct } from '$lib/organyze/types';
	import { diasDecorridos } from '$lib/organyze/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { CircleCheck, Repeat, Target, TrendingUp } from '@lucide/svelte';

	const totalMetas = $derived(organyze.metas.length);
	const metasFeitas = $derived(organyze.metas.filter((m) => metaConcluida(m)).length);
	const pctGeral = $derived(totalMetas ? Math.round((metasFeitas / totalMetas) * 100) : 0);
	// Progresso médio das metas (considera o avanço parcial de cada uma, não só as 100%).
	const progressoMedio = $derived(
		totalMetas ? Math.round(organyze.metas.reduce((s, m) => s + metaPct(m), 0) / totalMetas) : 0
	);

	const decorridos = $derived(diasDecorridos(organyze.mesMeta));

	const totalHabitos = $derived(organyze.habitos.length);
	const habitFeitos = $derived(
		organyze.habitos.reduce((s, h) => s + Object.values(h.dias).filter((v) => v === 'feito').length, 0)
	);
	const habitFalhas = $derived(
		organyze.habitos.reduce((s, h) => s + Object.values(h.dias).filter((v) => v === 'falhou').length, 0)
	);
	// Taxa de acerto: dos dias marcados, quantos foram "feito".
	const habitCheckins = $derived(habitFeitos + habitFalhas);
	const taxaAcerto = $derived(habitCheckins ? Math.round((habitFeitos / habitCheckins) * 100) : 0);
	// Aderência: feitos sobre o total possível (dias decorridos × nº de hábitos).
	const possiveis = $derived(decorridos * totalHabitos);
	const aderencia = $derived(possiveis ? Math.round((habitFeitos / possiveis) * 100) : 0);

	const habitStats = $derived(
		organyze.habitos.map((h) => {
			const feitos = Object.values(h.dias).filter((v) => v === 'feito').length;
			return {
				id: h.id,
				nome: h.nome,
				feitos,
				pct: decorridos ? Math.round((feitos / decorridos) * 100) : 0
			};
		})
	);
</script>

{#snippet ring(pct: number, cor: string)}
	<div class="relative grid size-24 shrink-0 place-items-center">
		<svg viewBox="0 0 80 80" class="size-24 -rotate-90">
			<circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-bg)" stroke-width="9" />
			<circle
				cx="40"
				cy="40"
				r="34"
				fill="none"
				stroke={cor}
				stroke-width="9"
				stroke-linecap="round"
				stroke-dasharray={2 * Math.PI * 34}
				stroke-dashoffset={2 * Math.PI * 34 * (1 - pct / 100)}
				class="transition-all duration-500"
			/>
		</svg>
		<span class="absolute text-xl font-bold tabular-nums text-navy">{pct}%</span>
	</div>
{/snippet}

<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-5 shadow-xs">
	<h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-navy">
		<Icon name="chart" size={17} /> Resumo do mês
	</h3>

	<!-- KPIs -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<div class="rounded-[var(--radius)] bg-bg p-3">
			<div class="flex items-center gap-1.5 text-grey">
				<Target size={14} /><span class="text-xs font-medium">Metas concluídas</span>
			</div>
			<div class="mt-1 text-2xl font-bold tabular-nums text-navy">
				{metasFeitas}<span class="text-base font-semibold text-grey">/{totalMetas}</span>
			</div>
		</div>
		<div class="rounded-[var(--radius)] bg-bg p-3">
			<div class="flex items-center gap-1.5 text-grey">
				<TrendingUp size={14} /><span class="text-xs font-medium">Progresso médio</span>
			</div>
			<div class="mt-1 text-2xl font-bold tabular-nums text-navy">{progressoMedio}%</div>
		</div>
		<div class="rounded-[var(--radius)] bg-bg p-3">
			<div class="flex items-center gap-1.5 text-grey">
				<Repeat size={14} /><span class="text-xs font-medium">Hábitos feitos</span>
			</div>
			<div class="mt-1 text-2xl font-bold tabular-nums text-navy">{habitFeitos}</div>
		</div>
		<div class="rounded-[var(--radius)] bg-bg p-3">
			<div class="flex items-center gap-1.5 text-grey">
				<CircleCheck size={14} /><span class="text-xs font-medium">Aderência</span>
			</div>
			<div class="mt-1 text-2xl font-bold tabular-nums text-navy">{aderencia}%</div>
		</div>
	</div>

	<!-- Anéis de progresso -->
	<div class="mt-4 grid gap-3 sm:grid-cols-2">
		<div class="flex items-center gap-4 rounded-[var(--radius)] bg-bg/60 p-4">
			{@render ring(
				pctGeral,
				totalMetas > 0 && metasFeitas === totalMetas
					? 'var(--color-brand-green)'
					: 'var(--color-brand)'
			)}
			<div class="min-w-0">
				<div class="text-sm font-semibold text-navy">Metas concluídas</div>
				<div class="mt-0.5 text-xs text-grey">
					{#if totalMetas}{metasFeitas} de {totalMetas} · progresso médio {progressoMedio}%{:else}Nenhuma meta neste mês{/if}
				</div>
			</div>
		</div>
		<div class="flex items-center gap-4 rounded-[var(--radius)] bg-bg/60 p-4">
			{@render ring(aderencia, 'var(--color-brand)')}
			<div class="min-w-0">
				<div class="text-sm font-semibold text-navy">Aderência aos hábitos</div>
				<div class="mt-0.5 text-xs text-grey">
					{#if totalHabitos}{habitFeitos} de {possiveis} dias possíveis · {taxaAcerto}% de acerto{:else}Nenhum hábito neste mês{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Por hábito -->
	{#if habitStats.length}
		<div class="mt-4">
			<div class="mb-2 text-xs font-semibold uppercase tracking-wide text-grey">Por hábito</div>
			<div class="space-y-2">
				{#each habitStats as h (h.id)}
					<div class="flex items-center gap-3 text-xs">
						<span class="w-32 shrink-0 truncate text-navy" title={h.nome}>{h.nome}</span>
						<div class="h-2 flex-1 overflow-hidden rounded-full bg-bg">
							<div
								class="h-full rounded-full bg-brand transition-all duration-500"
								style="width: {h.pct}%"
							></div>
						</div>
						<span class="w-14 shrink-0 text-right tabular-nums text-grey">
							{h.feitos}/{decorridos}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
