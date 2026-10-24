<script lang="ts">
	// A barra do recorte, acima dos números: os filtros ligados (clicar no × tira
	// um) e com o que comparar. Com filtro, ela fica presa no topo ao rolar — o
	// filtro nasce de um clique lá embaixo, numa lista, e vale para a tela toda.
	import { page } from '$app/state';
	import {
		COMPARACOES,
		DIMENSOES_FILTRO,
		ROTULO_FILTRO,
		buscaCom,
		semFiltros,
		type Comparacao,
		type DimensaoFiltro,
		type Filtros
	} from '$lib/dmetric/recorte';
	import { Funnel, GitCompareArrows, MousePointerClick, X } from '@lucide/svelte';

	let {
		filtros,
		rotular = (_d: DimensaoFiltro, v: string) => v,
		comparacao,
		podeComparar = true,
		oncomparar,
		nota = null
	}: {
		filtros: Filtros;
		/** Como o valor aparece na etiqueta (o título da página, o nome do país…). */
		rotular?: (d: DimensaoFiltro, v: string) => string;
		comparacao: Comparacao;
		/** "Desde o começo" não tem período anterior. */
		podeComparar?: boolean;
		oncomparar: (c: Comparacao) => void;
		/** Até onde o filtro vai para trás, ou por que ainda não dá para comparar. */
		nota?: string | null;
	} = $props();


	const ligados = $derived(
		DIMENSOES_FILTRO.filter((d) => filtros[d]).map((d) => ({
			d,
			rotulo: ROTULO_FILTRO[d],
			valor: rotular(d, filtros[d]!),
			tirar: buscaCom(page.url.searchParams, { [d]: null })
		}))
	);
	const filtrado = $derived(ligados.length > 0);
</script>

<div class="{nota ? 'mb-1.5' : 'mb-4'} {filtrado ? 'sticky z-20' : ''}" style={filtrado ? 'top: calc(var(--ds-topbar-full) + 8px)' : undefined}>
	<div
		class="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[var(--radius)] border px-3 py-2 {filtrado
			? 'border-brand/30 bg-surface/95 shadow-sm backdrop-blur'
			: 'border-grey-200 bg-surface'}"
	>
		{#if filtrado}
			<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand">
				<Funnel size={13} />Filtrando
			</span>
			{#each ligados as f (f.d)}
				<a
					href={f.tirar}
					data-sveltekit-noscroll
					aria-label="Tirar o filtro {f.rotulo}: {f.valor}"
					title="Tirar este filtro"
					class="group inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-brand/10 py-1 pl-2.5 pr-1.5 text-xs text-navy transition-colors hover:bg-brand/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
				>
					<span class="shrink-0 text-slate">{f.rotulo}:</span>
					<span class="truncate font-semibold">{f.valor}</span>
					<X size={13} class="shrink-0 text-grey transition-colors group-hover:text-navy" />
				</a>
			{/each}
			{#if ligados.length > 1}
				<a href={semFiltros(page.url.searchParams)} data-sveltekit-noscroll class="px-1 text-xs font-medium text-brand hover:underline">
					Limpar filtros
				</a>
			{/if}
		{:else}
			<span class="inline-flex min-w-0 items-center gap-1.5 text-[11px] text-grey">
				<MousePointerClick size={13} class="shrink-0" />
				<span class="truncate">Clique numa origem, cidade, página ou clique das listas para filtrar a tela toda.</span>
			</span>
		{/if}

		<label class="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-grey">
			<GitCompareArrows size={14} />
			<span class="hidden sm:inline">Comparar com</span>
			<select
				aria-label="Comparar com"
				disabled={!podeComparar}
				title={podeComparar ? undefined : '“Desde o começo” não tem período anterior'}
				value={podeComparar ? comparacao : 'nao'}
				onchange={(e) => oncomparar(e.currentTarget.value as Comparacao)}
				class="h-7 rounded-[var(--radius-sm)] border border-grey-200 bg-surface px-2 text-xs font-medium text-navy transition-colors hover:border-grey focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{#each COMPARACOES as c (c.id)}<option value={c.id}>{c.rotulo}</option>{/each}
			</select>
		</label>
	</div>
</div>
{#if nota}
	<p class="mb-4 px-1 text-[11px] leading-snug text-grey">{nota}</p>
{/if}
