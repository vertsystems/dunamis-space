<script lang="ts">
	// As cidades com mais visitas, no mesmo formato do ranking de países. Só do
	// script do DMetric: o histórico importado do GA não traz cidade. Com `link`,
	// clicar numa cidade filtra o painel inteiro por ela.
	import { corDeVisitas, numero, porcentagem, type ItemDimensao, type TotalDimensao } from '$lib/dmetric/painel';
	import { X } from '@lucide/svelte';

	let {
		itens,
		total: totalDaLista,
		link,
		ativa = null
	}: {
		itens: ItemDimensao[] | undefined;
		total?: TotalDimensao;
		/** O endereço que filtra por esta cidade (ou tira o filtro, se é a ligada). */
		link?: (cidade: string) => string;
		/** A cidade do filtro ligado. */
		ativa?: string | null;
	} = $props();

	const linhas = $derived(
		(itens ?? []).filter((i) => i.valor && i.visitas > 0).sort((a, b) => b.visitas - a.visitas)
	);
	// A lista vem cortada (as 100 primeiras): a porcentagem é sobre todas as cidades.
	const total = $derived(totalDaLista?.visitas || linhas.reduce((s, l) => s + l.visitas, 0) || 1);
	const fora = $derived(Math.max(0, (totalDaLista?.n ?? 0) - linhas.length));
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
			{@const marcada = ativa === l.valor}
			<li>
				<svelte:element
					this={link ? 'a' : 'div'}
					href={link?.(l.valor)}
					data-sveltekit-noscroll={link ? '' : undefined}
					aria-label={link ? (marcada ? `Tirar o filtro ${l.valor}` : `Filtrar o painel por ${l.valor}: ${numero(l.visitas)} visitas`) : undefined}
					class="block rounded-[var(--radius-sm)] px-2 py-1.5 {marcada ? 'bg-brand/10 ring-1 ring-brand/40' : ''} {link
						? 'transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'
						: ''}"
				>
					<div class="flex items-baseline gap-2 text-xs">
						<span class="w-5 shrink-0 text-right tabular-nums text-grey">{i + 1}</span>
						<span class="min-w-0 flex-1 truncate font-medium text-navy" title={l.valor}>{l.valor}</span>
						<span class="font-semibold tabular-nums text-navy-900">{numero(l.visitas)}</span>
						<span class="w-12 shrink-0 text-right tabular-nums text-grey">{porcentagem(l.visitas / total)}</span>
						{#if marcada}<X size={12} class="shrink-0 self-center text-grey" />{/if}
					</div>
					<div class="ml-7 mt-1 h-1 rounded-full bg-grey-200/70">
						<div class="h-1 rounded-full" style="width: {Math.max(1.5, (l.visitas / maior) * 100)}%; background: {corDeVisitas(l.visitas)}"></div>
					</div>
				</svelte:element>
			</li>
		{/each}
		{#if fora}
			<li class="px-2 pb-1 pt-2 text-[11px] text-grey">
				e mais {numero(fora)} {fora === 1 ? 'cidade' : 'cidades'} com menos visitas
			</li>
		{/if}
	</ol>
{/if}
