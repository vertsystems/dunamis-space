<script lang="ts">
	// Os botões de uma página do PageLinks e o que cada um rende: cliques, taxa de
	// clique (sobre as páginas vistas) e a posição na página. Os números vêm do
	// próprio PageLinks (src/lib/server/pagelinks.ts) e chegam depois da página —
	// enquanto isso, um esqueleto no lugar.
	import { Card } from '$lib/components/ui';
	import { numero, porcentagem } from '$lib/dmetric/painel';
	import { nomeDoBotao, ordenarBotoes, resumoDosBotoes, tipoDoBotao, type BotoesPageLinks } from '$lib/dmetric/botoes';
	import { ChevronDown, MousePointerClick } from '@lucide/svelte';

	let {
		dados,
		visualizacoes,
		filtrado = false
	}: {
		dados: Promise<BotoesPageLinks | null> | BotoesPageLinks | null;
		/** Páginas vistas no período: a base da taxa de clique. */
		visualizacoes: number;
		/** Com filtro, a taxa não fecha: os cliques do PageLinks não sabem de quem são. */
		filtrado?: boolean;
	} = $props();

	let ordem = $state<'pagina' | 'cliques'>('pagina');
	let abertos = $state<Record<string, boolean>>({});
	const comTaxa = $derived(!filtrado && visualizacoes > 0);
</script>

{#await dados}
	<Card class="mb-5">
		<h2 class="mb-3 flex items-center gap-1.5 text-base font-bold text-navy"><MousePointerClick size={17} /> Botões da página</h2>
		<div class="space-y-2" aria-hidden="true">
			{#each [0, 1, 2] as i (i)}<div class="h-8 animate-pulse rounded-[var(--radius-sm)] bg-bg"></div>{/each}
		</div>
		<p class="sr-only">Carregando os botões da página…</p>
	</Card>
{:then d}
	{#if d && d.botoes.length}
		{@const r = resumoDosBotoes(d.botoes)}
		{@const maior = Math.max(1, ...d.botoes.map((b) => b.cliques))}
		<Card class="mb-5">
			<div class="mb-1 flex flex-wrap items-start justify-between gap-2">
				<div class="min-w-0">
					<h2 class="flex items-center gap-1.5 text-base font-bold text-navy"><MousePointerClick size={17} /> Botões da página</h2>
					<p class="mt-0.5 text-[11px] text-grey">
						{numero(r.total)} {r.total === 1 ? 'clique' : 'cliques'} contados pelo PageLinks{d.semOrigem
							? ` · ${numero(d.semOrigem)} de robôs fora da conta`
							: ''}
					</p>
				</div>
				<div class="inline-flex rounded-full bg-bg p-0.5" role="group" aria-label="Ordem dos botões">
					{#each [['pagina', 'Ordem da página'], ['cliques', 'Mais clicados']] as const as [id, rotulo] (id)}
						<button
							type="button"
							aria-pressed={ordem === id}
							onclick={() => (ordem = id)}
							class="rounded-full px-3 py-1 text-xs font-medium transition-colors {ordem === id ? 'bg-surface text-navy shadow-sm' : 'text-grey hover:text-navy'}"
						>
							{rotulo}
						</button>
					{/each}
				</div>
			</div>

			{#if r.campeao}
				<p class="mb-3 text-xs text-slate">
					O mais clicado é <span class="font-semibold text-navy">{nomeDoBotao(r.campeao)}</span>{r.campeao.posicao
						? `, o ${r.campeao.posicao}º da página`
						: ''}.
					{#if r.primeiros !== null}
						Os três primeiros botões levam <span class="font-semibold text-navy">{porcentagem(r.primeiros)}</span> dos cliques.
					{/if}
				</p>
			{/if}

			<ol class="space-y-1">
				{#each ordenarBotoes(d.botoes, ordem) as b (b.id)}
					{@const temItens = b.itens.length > 0}
					{@const aberto = !!abertos[b.id]}
					<li class="rounded-[var(--radius-sm)] {b.noAr ? '' : 'opacity-60'}">
						<!-- Com itens é <button> (abre a lista); sem, só texto. -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<svelte:element
							this={temItens ? 'button' : 'div'}
							type={temItens ? 'button' : undefined}
							onclick={temItens ? () => (abertos[b.id] = !aberto) : undefined}
							aria-expanded={temItens ? aberto : undefined}
							class="relative flex w-full items-center gap-3 overflow-hidden rounded-[var(--radius-sm)] px-2 py-1.5 text-left {temItens
								? 'transition-colors hover:bg-bg'
								: ''}"
						>
							<!-- A barra no fundo: a proporção do maior. -->
							<span class="pointer-events-none absolute inset-y-0 left-0 rounded-[var(--radius-sm)] bg-[#2a78d6]/10" style="width: {(b.cliques / maior) * 100}%"></span>
							<span class="relative grid size-6 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-bold tabular-nums text-navy shadow-xs" title={b.posicao ? `${b.posicao}º botão da página` : 'Fora da página agora'}>
								{b.posicao ?? '–'}
							</span>
							{#if b.imagem}
								<!-- A arte do botão costuma ser um banner largo: a miniatura segue o formato. -->
								<img src={b.imagem} alt="" class="relative h-7 w-20 shrink-0 rounded-[var(--radius-sm)] bg-grey-200 object-cover" loading="lazy" decoding="async" />
							{/if}
							<span class="relative min-w-0 flex-1">
								<span class="block truncate text-xs font-semibold text-navy" title={nomeDoBotao(b)}>{nomeDoBotao(b)}</span>
								<span class="block truncate text-[10px] text-grey">{tipoDoBotao(b.tipo)}{b.noAr ? '' : ' · fora da página agora'}</span>
							</span>
							<span class="relative text-right">
								<span class="block text-xs font-bold tabular-nums text-navy-900">{numero(b.cliques)}</span>
								{#if comTaxa}<span class="block text-[10px] tabular-nums text-grey">{porcentagem(b.cliques / visualizacoes)} das vistas</span>{/if}
							</span>
							{#if temItens}<ChevronDown size={14} class="relative shrink-0 text-grey transition-transform {aberto ? 'rotate-180' : ''}" />{/if}
						</svelte:element>
						{#if temItens && aberto}
							{@const maiorItem = Math.max(1, ...b.itens.map((i) => i.cliques))}
							<ul class="mb-1 ml-11 mt-1 space-y-0.5 border-l border-grey-200 pl-3">
								{#each [...b.itens].sort((x, y) => y.cliques - x.cliques) as it (it.nome)}
									<li class="flex items-center gap-2 py-0.5 text-xs">
										{#if it.imagem}<img src={it.imagem} alt="" class="h-6 w-14 rounded-[var(--radius-sm)] bg-grey-200 object-cover" loading="lazy" decoding="async" />{/if}
										<span class="min-w-0 flex-1 truncate text-navy">{it.nome}</span>
										<span class="h-1 w-16 rounded-full bg-grey-200/70"><span class="block h-1 rounded-full bg-[#2a78d6]" style="width: {(it.cliques / maiorItem) * 100}%"></span></span>
										<span class="w-8 text-right font-semibold tabular-nums text-navy-900">{numero(it.cliques)}</span>
									</li>
								{/each}
								{#if b.semItem > 0}
									<li class="py-0.5 text-[11px] leading-snug text-grey">
										+ {numero(b.semItem)} {b.semItem === 1 ? 'clique' : 'cliques'} de antes de o PageLinks guardar qual foi (desde 23/10/2026 ele guarda)
									</li>
								{/if}
							</ul>
						{/if}
					</li>
				{/each}
			</ol>
			{#if filtrado}
				<p class="mt-3 text-[11px] leading-snug text-grey">Os cliques dos botões vêm do PageLinks, que não sabe quem clicou: eles não passam pelos filtros.</p>
			{:else if comTaxa}
				<p class="mt-3 text-[11px] leading-snug text-grey">Taxa de clique: cliques no botão sobre as {numero(visualizacoes)} páginas vistas do período.</p>
			{/if}
		</Card>
	{/if}
{/await}
