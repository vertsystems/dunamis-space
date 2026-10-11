<script lang="ts">
	// As cidades com mais visitas, no mesmo formato do ranking de países. Só do
	// script do DMetric: o histórico importado do GA não traz cidade.
	import { corDeVisitas, numero, porcentagem, type ItemDimensao } from '$lib/dmetric/painel';

	let { itens }: { itens: ItemDimensao[] | undefined } = $props();

	const linhas = $derived(
		(itens ?? []).filter((i) => i.valor && i.visitas > 0).sort((a, b) => b.visitas - a.visitas)
	);
	const total = $derived(linhas.reduce((s, l) => s + l.visitas, 0) || 1);
	const maior = $derived(linhas[0]?.visitas ?? 1);
</script>

{#if linhas.length === 0}
	<p class="py-8 text-center text-xs text-grey">
		As cidades aparecem aqui quando o script do DMetric registra visitas — o histórico do GA não traz cidade.
	</p>
{:else}
	<!-- Todas, com rolagem dentro do quadro, na altura do mapa (ver RankingPaises). -->
	<ol
		class="-mr-2 min-h-[18rem] flex-1 basis-0 space-y-0.5 overflow-y-auto pb-6 pr-2 xl:min-h-0 [mask-image:linear-gradient(to_bottom,black_88%,transparent)] [scrollbar-color:#d3d8e0_transparent] [scrollbar-width:thin]"
	>
		{#each linhas as l, i (l.valor)}
			<li class="px-2 py-1.5">
				<div class="flex items-baseline gap-2 text-xs">
					<span class="w-5 shrink-0 text-right tabular-nums text-grey">{i + 1}</span>
					<span class="min-w-0 flex-1 truncate font-medium text-navy" title={l.valor}>{l.valor}</span>
					<span class="font-semibold tabular-nums text-navy-900">{numero(l.visitas)}</span>
					<span class="w-12 shrink-0 text-right tabular-nums text-grey">{porcentagem(l.visitas / total)}</span>
				</div>
				<div class="ml-7 mt-1 h-1 rounded-full bg-grey-200/70">
					<div class="h-1 rounded-full" style="width: {Math.max(1.5, (l.visitas / maior) * 100)}%; background: {corDeVisitas(l.visitas)}"></div>
				</div>
			</li>
		{/each}
	</ol>
{/if}
