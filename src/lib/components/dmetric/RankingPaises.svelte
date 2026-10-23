<script lang="ts">
	// Os países em ordem de visitas — a leitura do mapa sem precisar do mouse.
	// Passar o mouse numa linha, ou focar com o Tab, destaca o país no mapa (e o
	// mouse no mapa destaca a linha aqui). Com `link`, clicar num país filtra o
	// painel inteiro por ele.
	import { bandeira, corDeVisitas, nomePais, numero, porcentagem, ranking } from '$lib/dmetric/painel';
	import { X } from '@lucide/svelte';

	let {
		valores,
		destaque = $bindable(null),
		link,
		ativo = null
	}: {
		valores: Map<string, number>;
		destaque?: string | null;
		/** O endereço que filtra por este país (ou tira o filtro, se é o ligado). */
		link?: (iso: string) => string;
		/** O país do filtro ligado. */
		ativo?: string | null;
	} = $props();

	const linhas = $derived(ranking(valores));
	const maior = $derived(linhas[0]?.visitas ?? 1);
</script>

{#if linhas.length === 0}
	<p class="py-8 text-center text-sm text-grey">Nenhum país neste período.</p>
{:else}
	<!-- Todos os países, com rolagem dentro do quadro. Na tela larga a lista não
	     tem altura própria (basis-0): ocupa a altura que o mapa ao lado dá à
	     linha. O esmaecido no fim avisa que ela continua para baixo. -->
	<ol
		class="-mr-2 min-h-[18rem] flex-1 basis-0 space-y-0.5 overflow-y-auto pb-6 pr-2 xl:min-h-0 [mask-image:linear-gradient(to_bottom,black_88%,transparent)] [scrollbar-color:#d3d8e0_transparent] [scrollbar-width:thin]"
	>
		{#each linhas as l, i (l.iso)}
			{@const marcado = ativo === l.iso}
			<li>
				<!-- Sempre <a> (filtra) ou <button> (só destaca no mapa): os dois já são interativos. -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<svelte:element
					this={link ? 'a' : 'button'}
					type={link ? undefined : 'button'}
					href={link?.(l.iso)}
					data-sveltekit-noscroll={link ? '' : undefined}
					onpointerenter={() => (destaque = l.iso)}
					onpointerleave={() => (destaque = null)}
					onfocus={() => (destaque = l.iso)}
					onblur={() => (destaque = null)}
					aria-label="{marcado ? 'Tirar o filtro ' : link ? 'Filtrar o painel por ' : ''}{nomePais(l.iso)}: {numero(l.visitas)} {l.visitas === 1 ? 'visita' : 'visitas'}, {porcentagem(l.fatia)}"
					class="block w-full rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 {link
						? 'cursor-pointer'
						: 'cursor-default'} {marcado ? 'bg-brand/10 ring-1 ring-brand/40' : destaque === l.iso ? 'bg-bg' : ''}"
				>
				<div class="flex items-baseline gap-2 text-xs">
					<span class="w-5 shrink-0 text-right tabular-nums text-grey">{i + 1}</span>
					<span class="min-w-0 flex-1 truncate font-medium text-navy">{bandeira(l.iso)} {nomePais(l.iso)}</span>
					<span class="font-semibold tabular-nums text-navy-900">{numero(l.visitas)}</span>
					<span class="w-12 shrink-0 text-right tabular-nums text-grey">{porcentagem(l.fatia)}</span>
					{#if marcado}<X size={12} class="shrink-0 self-center text-grey" />{/if}
				</div>
				<!-- Barra na escala do maior: a proporção entre países, sem número em cada uma. -->
				<div class="ml-7 mt-1 h-1 rounded-full bg-grey-200/70">
					<!-- Na cor da faixa do país, a mesma do mapa. -->
					<div class="h-1 rounded-full" style="width: {Math.max(1.5, (l.visitas / maior) * 100)}%; background: {corDeVisitas(l.visitas)}"></div>
				</div>
				</svelte:element>
			</li>
		{/each}
	</ol>
{/if}
