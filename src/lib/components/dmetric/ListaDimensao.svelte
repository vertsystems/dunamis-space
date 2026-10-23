<script lang="ts">
	// Uma lista "top" de uma dimensão (páginas, origens, cidades, aparelhos…).
	// Com `link`, cada item filtra o painel inteiro por ele (e o item do filtro
	// ligado fica marcado, com o × para tirar).
	import { numero, type ItemDimensao } from '$lib/dmetric/painel';
	import { Card } from '$lib/components/ui';
	import { X } from '@lucide/svelte';

	let {
		titulo,
		itens,
		medida = 'visitas',
		rotuloMedida = medida === 'visitas' ? 'Visitas' : 'Páginas vistas',
		vazio = 'Nada ainda neste período.',
		rotular = (v: string) => v || '(não identificado)',
		detalhe,
		total,
		link,
		ativo
	}: {
		titulo: string;
		itens: ItemDimensao[] | undefined;
		/** Páginas contam páginas vistas; o resto, visitas (pessoas por dia). */
		medida?: 'visitas' | 'visualizacoes';
		/** Cabeçalho da coluna de números (cliques usam "Cliques"). */
		rotuloMedida?: string;
		vazio?: string;
		rotular?: (valor: string, item: ItemDimensao) => string;
		/** Segunda linha, menor (ex.: o endereço da página embaixo do título). */
		detalhe?: (item: ItemDimensao) => string | null;
		/** Quantos itens a lista tem de verdade (PainelDados.totais): ela vem cortada nos primeiros. */
		total?: number;
		/** O endereço que filtra por este item (ou tira o filtro, se é o ligado); null = não filtra. */
		link?: (item: ItemDimensao) => string | null;
		/** O item é o do filtro ligado? */
		ativo?: (item: ItemDimensao) => boolean;
	} = $props();

	const linhas = $derived((itens ?? []).filter((i) => i[medida] > 0).sort((a, b) => b[medida] - a[medida]));
	const maior = $derived(linhas[0]?.[medida] ?? 1);
	let todos = $state(false);
	const visiveis = $derived(todos ? linhas : linhas.slice(0, 7));
	// Itens que existem mas não vieram (ficaram depois do corte, com menos visitas).
	const fora = $derived(Math.max(0, (total ?? 0) - linhas.length));
</script>

<Card padding="sm">
	<div class="mb-3 flex items-baseline justify-between gap-2">
		<h3 class="text-sm font-semibold text-navy">{titulo}</h3>
		<span class="text-[10px] font-semibold uppercase tracking-wider text-grey">{rotuloMedida}</span>
	</div>
	{#if linhas.length === 0}
		<p class="py-4 text-center text-xs text-grey">{vazio}</p>
	{:else}
		<ul class="space-y-1">
			<!-- A chave leva o site: "/" de dois sites são páginas diferentes. -->
			{#each visiveis as l (`${l.site_id ?? ''}|${l.valor}`)}
				{@const nome = rotular(l.valor, l)}
				{@const sub = detalhe?.(l)}
				{@const href = l.valor ? link?.(l) : null}
				{@const marcado = !!ativo?.(l)}
				<li class="relative overflow-hidden rounded-[var(--radius-sm)] {marcado ? 'ring-1 ring-brand/40' : ''}">
					<!-- Fundo proporcional ao maior da lista. -->
					<div class="pointer-events-none absolute inset-y-0 left-0 rounded-[var(--radius-sm)] {marcado ? 'bg-brand/20' : 'bg-[#2a78d6]/10'}" style="width: {(l[medida] / maior) * 100}%"></div>
					<svelte:element
						this={href ? 'a' : 'div'}
						href={href ?? undefined}
						data-sveltekit-noscroll={href ? '' : undefined}
						aria-label={href ? (marcado ? `Tirar o filtro ${nome}` : `Filtrar o painel por ${nome}: ${numero(l[medida])}`) : undefined}
						class="relative flex items-baseline gap-2 px-2 py-1 text-xs {href
							? 'rounded-[var(--radius-sm)] transition-colors hover:bg-[#2a78d6]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'
							: ''}"
					>
						<span class="min-w-0 flex-1 truncate text-navy {marcado ? 'font-semibold' : ''}" title={sub ? `${nome} — ${sub}` : nome}>
							{nome}
							{#if sub}<span class="block truncate text-[10px] font-normal text-grey">{sub}</span>{/if}
						</span>
						<span class="font-semibold tabular-nums text-navy-900">{numero(l[medida])}</span>
						{#if marcado}<X size={12} class="shrink-0 self-center text-grey" />{/if}
					</svelte:element>
				</li>
			{/each}
		</ul>
		{#if linhas.length > 7}
			<button type="button" onclick={() => (todos = !todos)} class="mt-2 px-2 text-xs font-medium text-brand hover:underline">
				{todos ? 'Mostrar menos' : fora ? `Ver os ${linhas.length} primeiros` : `Ver todos (${linhas.length})`}
			</button>
		{/if}
		{#if fora && (todos || linhas.length <= 7)}
			<p class="mt-1 px-2 text-[11px] text-grey">e mais {numero(fora)} com menos {rotuloMedida.toLowerCase()}</p>
		{/if}
	{/if}
</Card>
