<script lang="ts">
	// Modo Semana: sete cartões (um por dia), cada um com as tarefas separadas
	// por lado. Clicar no cabeçalho do dia abre aquele dia no modo Dia.
	import { organyze, toISODate, inicioSemana } from '$lib/organyze/store.svelte';
	import { CATEGORIAS, CATEGORIA_COR, CATEGORIA_LABEL, corPrioridadeEfetiva, prazoOrdem, urgencia } from '$lib/organyze/types';
	import type { Tarefa } from '$lib/organyze/types';
	import { fmtDiaMes } from '$lib/organyze/ui';
	import { Check } from '@lucide/svelte';

	let {
		hoje,
		onAbrir,
		onAbrirDia
	}: { hoje: string; onAbrir: (t: Tarefa) => void; onAbrirDia: (iso: string) => void } = $props();

	const ordAtivas = (arr: Tarefa[]) =>
		[...arr].sort((a, b) => prazoOrdem(a) - prazoOrdem(b) || a.posicao - b.posicao);

	const dias = $derived.by(() => {
		const [y, m, d] = inicioSemana(organyze.dia).split('-').map(Number);
		return Array.from({ length: 7 }, (_, i) => {
			const dt = new Date(y, m - 1, d + i);
			const iso = toISODate(dt);
			return { iso, dt, tarefas: ordAtivas(organyze.tarefas.filter((t) => t.data === iso)) };
		});
	});
</script>

{#snippet linha(t: Tarefa)}
	{@const u = urgencia(t.prazo, hoje)}
	<li class="flex items-center gap-2.5 px-4 py-2 hover:bg-bg transition-colors">
		<!-- Bolinha de concluído -->
		<button
			class="grid size-4 shrink-0 place-items-center rounded-md border-2 transition-colors"
			class:border-grey-200={t.status !== 'concluida'}
			class:border-brand={t.status === 'concluida'}
			class:bg-brand={t.status === 'concluida'}
			class:text-white={t.status === 'concluida'}
			aria-label={t.status === 'concluida' ? 'Reabrir tarefa' : 'Concluir tarefa'}
			onclick={() => organyze.toggle(t.id)}
		>
			{#if t.status === 'concluida'}<Check size={11} strokeWidth={3} />{/if}
		</button>
		<button class="flex min-w-0 flex-1 items-center gap-2.5 text-left" onclick={() => onAbrir(t)}>
			<span
				class="size-2 shrink-0 rounded-full"
				style="background: {corPrioridadeEfetiva(t.prioridade, t.prazo, hoje)}"
			></span>
			<span
				class="flex-1 truncate text-sm"
				class:text-grey={t.status === 'concluida'}
				class:line-through={t.status === 'concluida'}
				class:text-navy={t.status !== 'concluida'}>{t.titulo}</span
			>
			{#if u && u.status !== 'futura'}
				<span class="shrink-0 text-[11px] font-semibold" style="color: {u.cor}">{u.label}</span>
			{/if}
		</button>
	</li>
{/snippet}

<div class="space-y-2">
	{#each dias as d (d.iso)}
		<div class="overflow-hidden rounded-[var(--radius-lg)] border border-grey-200 bg-surface shadow-xs">
			<button
				class="flex w-full items-center justify-between px-4 py-2.5 hover:bg-bg transition-colors"
				onclick={() => onAbrirDia(d.iso)}
			>
				<span class="flex items-baseline gap-2">
					<span
						class="text-sm font-semibold capitalize"
						class:text-brand={d.iso === hoje}
						class:text-navy={d.iso !== hoje}
					>
						{d.dt.toLocaleDateString('pt-BR', { weekday: 'long' })}
					</span>
					<span class="text-xs text-grey">{fmtDiaMes(d.iso)}</span>
				</span>
				<span class="text-xs text-grey tabular-nums">
					{d.tarefas.filter((t) => t.status === 'concluida').length}/{d.tarefas.length}
				</span>
			</button>
			{#if d.tarefas.length}
				<div class="border-t border-grey-200">
					{#each CATEGORIAS as cat (cat)}
						{@const lista = d.tarefas.filter((t) => t.categoria === cat)}
						{#if lista.length}
							<div class="flex items-center gap-1.5 bg-bg/40 px-4 pb-1 pt-2">
								<span class="size-1.5 rounded-full" style:background={CATEGORIA_COR[cat]}></span>
								<span class="text-[10px] font-bold uppercase tracking-wide" style:color={CATEGORIA_COR[cat]}>
									{CATEGORIA_LABEL[cat]}
								</span>
							</div>
							<ul class="divide-y divide-grey-200">
								{#each lista as t (t.id)}
									{@render linha(t)}
								{/each}
							</ul>
						{/if}
					{/each}
				</div>
			{:else}
				<div class="border-t border-grey-200 px-4 py-3 text-xs text-grey/70">Sem tarefas</div>
			{/if}
		</div>
	{/each}
</div>
