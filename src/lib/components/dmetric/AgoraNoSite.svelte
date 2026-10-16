<script lang="ts">
	// "Agora no site": quantas pessoas abriram uma página nos últimos 15 minutos.
	// Atualiza sozinho a cada 30 segundos, sem recarregar o painel, e devolve os
	// países (`paises`) para o mapa pulsar onde tem gente agora.
	import { MINUTOS_AGORA, numero, type AgoraDados } from '$lib/dmetric/painel';

	let {
		inicial,
		site,
		nomePagina,
		paises = $bindable([])
	}: {
		inicial: AgoraDados;
		site: string | null;
		/** Título (ou endereço) de uma página, para a lista da legenda. */
		nomePagina: (siteId: string, caminho: string) => string;
		paises?: string[];
	} = $props();

	// O que o servidor mandou vale até a primeira atualização; ao navegar (outro
	// site no filtro), `inicial` muda e a atualização antiga é descartada.
	let atualizado = $state<AgoraDados | null>(null);
	const agora = $derived(atualizado ?? inicial);
	$effect(() => {
		void inicial;
		atualizado = null;
	});
	$effect(() => {
		paises = agora.paises.map((p) => p.pais);
	});

	$effect(() => {
		const url = `/dtools/dmetric/agora${site ? `?site=${site}` : ''}`;
		const t = setInterval(async () => {
			try {
				const r = await fetch(url);
				if (r.ok) atualizado = await r.json();
			} catch {
				/* sem rede: tenta de novo daqui a 30 s */
			}
		}, 30_000);
		return () => clearInterval(t);
	});

	const vivo = $derived(agora.pessoas > 0);
</script>

<div class="group relative">
	<button
		type="button"
		class="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/30 {vivo
			? 'border-brand-green/40 bg-brand-green/10 text-[#107d4a]'
			: 'border-grey-200 bg-surface text-grey'}"
		aria-describedby="dm-agora-legenda"
	>
		<span class="relative flex size-2">
			{#if vivo}<span class="absolute inline-flex size-full animate-ping rounded-full bg-brand-green opacity-60 motion-reduce:animate-none"></span>{/if}
			<span class="relative inline-flex size-2 rounded-full {vivo ? 'bg-brand-green' : 'bg-grey/50'}"></span>
		</span>
		{#if vivo}
			<span class="tabular-nums">{numero(agora.pessoas)}</span>
			{agora.pessoas === 1 ? 'pessoa no site agora' : 'pessoas no site agora'}
		{:else}
			Ninguém no site agora
		{/if}
	</button>

	<!-- Legenda: onde estão (página) e de onde (cidade). -->
	<div
		id="dm-agora-legenda"
		role="tooltip"
		class="pointer-events-none absolute left-0 top-full z-30 mt-2 w-72 rounded-[var(--radius)] border border-grey-200 bg-surface p-3 text-xs opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
	>
		<p class="mb-2 text-[10px] font-bold uppercase tracking-wider text-grey">Abriram uma página nos últimos {MINUTOS_AGORA} minutos</p>
		{#if !vivo}
			<p class="text-slate">Ninguém por enquanto. Atualiza sozinho a cada 30 segundos.</p>
		{:else}
			<p class="mb-1 font-semibold text-navy">Páginas</p>
			<ul class="mb-2 space-y-0.5">
				{#each agora.paginas.slice(0, 5) as p (`${p.site_id}|${p.caminho}`)}
					<li class="flex justify-between gap-3 text-slate">
						<span class="truncate">{nomePagina(p.site_id, p.caminho)}</span>
						<span class="font-semibold tabular-nums text-navy-900">{p.pessoas}</span>
					</li>
				{/each}
			</ul>
			{#if agora.cidades.length}
				<p class="mb-1 font-semibold text-navy">Cidades</p>
				<ul class="space-y-0.5">
					{#each agora.cidades.slice(0, 5) as c (c.cidade)}
						<li class="flex justify-between gap-3 text-slate">
							<span class="truncate">{c.cidade}</span>
							<span class="font-semibold tabular-nums text-navy-900">{c.pessoas}</span>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</div>
