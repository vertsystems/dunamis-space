<script lang="ts">
	// Página do site: os países de onde vieram as visitas e, dentro de cada um,
	// todas as cidades (agruparLugares). Os países começam fechados: clicar num
	// país abre as cidades dele (e o nome fica preso no topo da rolagem enquanto
	// elas passam). A busca acha a cidade em qualquer país e abre o país dela.
	// Com `link`, clicar numa cidade (ou no funil do país) filtra o painel.
	import { agruparLugares, bandeira, nomePais, numero, porcentagem, type Lugares } from '$lib/dmetric/painel';
	import { ChevronDown, Funnel, Search, X } from '@lucide/svelte';

	let {
		lugares,
		link,
		pais = null,
		cidade = null
	}: {
		lugares: Lugares;
		/** O endereço que filtra pelo país ou pela cidade (ou tira o filtro, se é o ligado). */
		link?: (d: 'pais' | 'cidade', valor: string) => string;
		/** O país e a cidade dos filtros ligados. */
		pais?: string | null;
		cidade?: string | null;
	} = $props();

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
			<!-- Com filtro de cidade, o país dela já vem aberto (é a única coisa na lista). -->
			{@const aberto = !!termo || (abertos[chave] ?? (!!cidade && g.cidades.some((c) => c.cidade === cidade)))}
			{#if !termo || doPais || cidades.length}
				<section class="mb-1">
					<div class="sticky top-0 z-10 flex items-center rounded-[var(--radius-sm)] bg-surface/95 backdrop-blur {g.pais && g.pais === pais ? 'ring-1 ring-brand/40' : ''}">
					<button
						type="button"
						onclick={() => (abertos[chave] = !aberto)}
						aria-expanded={aberto}
						class="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs transition-colors hover:bg-bg"
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
					{#if link && g.pais}
						{@const ligado = g.pais === pais}
						<a
							href={link('pais', g.pais)}
							data-sveltekit-noscroll
							aria-label={ligado ? `Tirar o filtro ${nomePais(g.pais)}` : `Filtrar o painel por ${nomePais(g.pais)}`}
							title={ligado ? 'Tirar o filtro' : 'Filtrar o painel por este país'}
							class="mr-1 grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 {ligado
								? 'text-brand'
								: 'text-grey hover:text-navy'}"
						>
							{#if ligado}<X size={13} />{:else}<Funnel size={13} />{/if}
						</a>
					{/if}
					</div>
					{#if aberto}
						<ol class="mb-1 border-l border-grey-200 pl-3 ml-4">
							{#each cidades as c, i (c.cidade)}
								{@const ligada = c.cidade === cidade}
								<li>
									<svelte:element
										this={link ? 'a' : 'div'}
										href={link?.('cidade', c.cidade)}
										data-sveltekit-noscroll={link ? '' : undefined}
										aria-label={link ? (ligada ? `Tirar o filtro ${c.cidade}` : `Filtrar o painel por ${c.cidade}: ${numero(c.visitas)} visitas`) : undefined}
										class="flex items-baseline gap-2 rounded-[var(--radius-sm)] py-1 pl-1 pr-2 text-xs {ligada ? 'bg-brand/10 ring-1 ring-brand/40' : ''} {link
											? 'transition-colors hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30'
											: ''}"
									>
										<span class="w-6 shrink-0 text-right tabular-nums text-grey">{i + 1}</span>
										<span class="min-w-0 flex-1 truncate text-navy {ligada ? 'font-semibold' : ''}" title={c.cidade}>{c.cidade}</span>
										<span class="font-semibold tabular-nums text-navy-900">{numero(c.visitas)}</span>
										{#if ligada}<X size={12} class="shrink-0 self-center text-grey" />{/if}
									</svelte:element>
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
