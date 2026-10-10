<script lang="ts">
	// Uma lista "top" de uma dimensão (páginas, origens, cidades, aparelhos…).
	import { numero, type ItemDimensao } from '$lib/dmetric/painel';
	import { Card } from '$lib/components/ui';

	let {
		titulo,
		itens,
		medida = 'visitas',
		rotular = (v: string) => v || '(não identificado)'
	}: {
		titulo: string;
		itens: ItemDimensao[] | undefined;
		/** Páginas contam páginas vistas; o resto, visitas (pessoas por dia). */
		medida?: 'visitas' | 'visualizacoes';
		rotular?: (valor: string) => string;
	} = $props();

	const linhas = $derived((itens ?? []).filter((i) => i[medida] > 0).sort((a, b) => b[medida] - a[medida]));
	const maior = $derived(linhas[0]?.[medida] ?? 1);
	let todos = $state(false);
	const visiveis = $derived(todos ? linhas : linhas.slice(0, 7));
</script>

<Card padding="sm">
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<h3 class="text-sm font-semibold text-navy">{titulo}</h3>
		<span class="text-[10px] font-semibold uppercase tracking-wider text-grey">
			{medida === 'visitas' ? 'Visitas' : 'Páginas vistas'}
		</span>
	</div>
	{#if linhas.length === 0}
		<p class="py-4 text-center text-xs text-grey">Nada ainda neste período.</p>
	{:else}
		<ul class="space-y-1">
			{#each visiveis as l (l.valor)}
				<li class="relative overflow-hidden rounded-[var(--radius-sm)] px-2 py-1">
					<!-- Fundo proporcional ao maior da lista. -->
					<div class="absolute inset-y-0 left-0 rounded-[var(--radius-sm)] bg-[#2a78d6]/10" style="width: {(l[medida] / maior) * 100}%"></div>
					<div class="relative flex items-baseline gap-2 text-xs">
						<span class="min-w-0 flex-1 truncate text-navy" title={rotular(l.valor)}>{rotular(l.valor)}</span>
						<span class="font-semibold tabular-nums text-navy-900">{numero(l[medida])}</span>
					</div>
				</li>
			{/each}
		</ul>
		{#if linhas.length > 7}
			<button type="button" onclick={() => (todos = !todos)} class="mt-2 px-2 text-xs font-medium text-brand hover:underline">
				{todos ? 'Mostrar menos' : `Ver todos (${linhas.length})`}
			</button>
		{/if}
	{/if}
</Card>
