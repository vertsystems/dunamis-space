<script lang="ts">
	// Os países em ordem de visitas — a leitura do mapa sem precisar do mouse.
	// Passar o mouse numa linha, ou focar com o Tab, destaca o país no mapa (e o
	// mouse no mapa destaca a linha aqui).
	import { bandeira, nomePais, numero, porcentagem, ranking } from '$lib/dmetric/painel';

	let { valores, destaque = $bindable(null) }: { valores: Map<string, number>; destaque?: string | null } = $props();

	const linhas = $derived(ranking(valores));
	const maior = $derived(linhas[0]?.visitas ?? 1);
	let todos = $state(false);
	const visiveis = $derived(todos ? linhas : linhas.slice(0, 10));
</script>

{#if linhas.length === 0}
	<p class="py-8 text-center text-sm text-grey">Nenhum país neste período.</p>
{:else}
	<ol class="space-y-0.5">
		{#each visiveis as l, i (l.iso)}
			<li>
				<button
					type="button"
					onpointerenter={() => (destaque = l.iso)}
					onpointerleave={() => (destaque = null)}
					onfocus={() => (destaque = l.iso)}
					onblur={() => (destaque = null)}
					aria-label="{nomePais(l.iso)}: {numero(l.visitas)} {l.visitas === 1 ? 'visita' : 'visitas'}, {porcentagem(l.fatia)}"
					class="block w-full cursor-default rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 {destaque === l.iso ? 'bg-bg' : ''}"
				>
				<div class="flex items-baseline gap-2 text-xs">
					<span class="w-5 shrink-0 text-right tabular-nums text-grey">{i + 1}</span>
					<span class="min-w-0 flex-1 truncate font-medium text-navy">{bandeira(l.iso)} {nomePais(l.iso)}</span>
					<span class="font-semibold tabular-nums text-navy-900">{numero(l.visitas)}</span>
					<span class="w-12 shrink-0 text-right tabular-nums text-grey">{porcentagem(l.fatia)}</span>
				</div>
				<!-- Barra na escala do maior: a proporção entre países, sem número em cada uma. -->
				<div class="ml-7 mt-1 h-1 rounded-full bg-grey-200/70">
					<div class="h-1 rounded-full bg-[#2a78d6]" style="width: {Math.max(1.5, (l.visitas / maior) * 100)}%"></div>
				</div>
				</button>
			</li>
		{/each}
	</ol>
	{#if linhas.length > 10}
		<button type="button" onclick={() => (todos = !todos)} class="mt-2 px-2 text-xs font-medium text-brand hover:underline">
			{todos ? 'Mostrar só os 10 primeiros' : `Ver todos os ${linhas.length} países`}
		</button>
	{/if}
{/if}
