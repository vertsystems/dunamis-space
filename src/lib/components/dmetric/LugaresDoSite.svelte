<script lang="ts">
	// Página do site: os países de onde vieram as visitas e, dentro de cada um,
	// todas as cidades (agruparLugares). Os países começam fechados: clicar num
	// país abre as cidades dele (e o nome fica preso no topo da rolagem enquanto
	// elas passam). A busca acha a cidade em qualquer país e abre o país dela.
	import { agruparLugares, bandeira, nomePais, numero, porcentagem, type Lugares } from '$lib/dmetric/painel';
	import { ChevronDown, Search } from '@lucide/svelte';

	let { lugares }: { lugares: Lugares } = $props();

	const grupos = $derived(agruparLugares(lugares));
	let busca = $state('');
	let abertos = $state<Record<string, boolean>>({});

	const sem = (t: string) =>
		t
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase();
	const termo = $derived(sem(busca.trim()));
	const achadas = $derived(
		termo ? lugares.cidades.filter((c) => sem(c.cidade).includes(termo) || (c.pais && sem(nomePais(c.pais)).includes(termo))).length : 0
	);
</script>

{#if !grupos.length}
	<p class="py-8 text-center text-xs text-grey">Os países e as cidades aparecem aqui quando o site recebe visitas no período.</p>
{:else}
	<div class="relative mb-2">
		<Search size={13} class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-grey" />
		<input
			type="search"
			bind:value={busca}
			placeholder="Buscar cidade ou país"
			aria-label="Buscar cidade ou país"
			class="h-8 w-full rounded-[var(--radius)] border border-grey-200 bg-surface pl-8 pr-3 text-xs text-navy-900 transition-colors placeholder:text-grey hover:border-grey focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
		/>
	</div>
	{#if termo}
		<p class="mb-1 px-1 text-[11px] text-grey">{achadas} {achadas === 1 ? 'cidade encontrada' : 'cidades encontradas'}</p>
	{/if}

	<div
		class="-mr-2 min-h-[20rem] flex-1 basis-0 overflow-y-auto pr-2 [scrollbar-color:#d3d8e0_transparent] [scrollbar-width:thin] lg:min-h-0"
	>
		{#each grupos as g (g.pais ?? 'sem-pais')}
			{@const chave = g.pais ?? 'sem-pais'}
			{@const doPais = termo && g.pais && sem(nomePais(g.pais)).includes(termo)}
			{@const cidades = termo && !doPais ? g.cidades.filter((c) => sem(c.cidade).includes(termo)) : g.cidades}
			{@const aberto = !!termo || !!abertos[chave]}
			{#if !termo || doPais || cidades.length}
				<section class="mb-1">
					<button
						type="button"
						onclick={() => (abertos[chave] = !abertos[chave])}
						aria-expanded={aberto}
						class="sticky top-0 z-10 flex w-full items-center gap-2 rounded-[var(--radius-sm)] bg-surface/95 px-2 py-1.5 text-left text-xs backdrop-blur transition-colors hover:bg-bg"
					>
						<span class="w-5 shrink-0 text-center text-sm leading-none">{g.pais ? bandeira(g.pais) : '🌐'}</span>
						<span class="min-w-0 flex-1 truncate font-semibold text-navy">
							{g.pais ? nomePais(g.pais) : 'País não identificado'}
							<span class="font-normal text-grey">
								· {g.cidades.length
									? `${numero(g.cidades.length)} ${g.cidades.length === 1 ? 'cidade' : 'cidades'}`
									: 'sem cidade registrada'}
							</span>
						</span>
						<span class="font-bold tabular-nums text-navy-900">{numero(g.visitas)}</span>
						<!-- O grupo sem país não tem fatia: as visitas dele já estão dentro dos países. -->
						<span class="w-12 shrink-0 text-right tabular-nums text-grey">{g.pais ? porcentagem(g.fatia) : ''}</span>
						<ChevronDown size={14} class="shrink-0 text-grey transition-transform {aberto ? 'rotate-180' : ''}" />
					</button>
					{#if aberto}
						<ol class="mb-1 border-l border-grey-200 pl-3 ml-4">
							{#each cidades as c, i (c.cidade)}
								<li class="flex items-baseline gap-2 py-1 pl-1 pr-2 text-xs">
									<span class="w-6 shrink-0 text-right tabular-nums text-grey">{i + 1}</span>
									<span class="min-w-0 flex-1 truncate text-navy" title={c.cidade}>{c.cidade}</span>
									<span class="font-semibold tabular-nums text-navy-900">{numero(c.visitas)}</span>
								</li>
							{/each}
							{#if g.semCidade && !termo}
								<li class="py-1 pl-9 text-[11px] text-grey">
									{numero(g.semCidade)}
									{g.semCidade === 1 ? 'visita sem cidade registrada' : 'visitas sem cidade registrada'}
								</li>
							{/if}
							{#if !g.pais && !termo}
								<li class="py-1 pl-9 pr-2 text-[11px] leading-snug text-grey">
									Cidades de visitas antigas em que não deu para ter certeza do país. As visitas novas já guardam o país de cada cidade.
								</li>
							{/if}
						</ol>
					{/if}
				</section>
			{/if}
		{/each}
	</div>
{/if}
