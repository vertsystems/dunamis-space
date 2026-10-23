<script lang="ts">
	// Mapa-múndi do DMetric: cada país pintado pela faixa de visitas (uma cor
	// por faixa, ver CORES_FAIXAS; cinza onde ainda não chegou visita).
	// Os traços vêm prontos de scripts/gen-mapa.mjs, sem biblioteca de mapa no
	// navegador. Passar o mouse mostra o país e o número. Teclado e leitor de
	// tela usam o ranking ao lado (RankingPaises), que tem os mesmos números e,
	// ao focar uma linha, destaca o país aqui. Com `onescolher`, clicar num país
	// com visitas filtra o painel por ele (pelo teclado, a mesma coisa no ranking).
	import mapa from '$lib/dmetric/mapa.generated.json';
	import { COR_SEM_VISITA, CORES_FAIXAS, FAIXAS, bandeira, corDeVisitas, nomePais, numero } from '$lib/dmetric/painel';

	let {
		valores,
		destaque = $bindable(null),
		pulsando = [],
		onescolher
	}: {
		valores: Map<string, number>;
		/** País em destaque — vem do ranking ao lado, ou vai para ele. */
		destaque?: string | null;
		/** Países com gente no site agora (AgoraNoSite): pulsam no mapa. */
		pulsando?: string[];
		/** Clique num país com visitas (filtrar o painel por ele). */
		onescolher?: (iso: string) => void;
	} = $props();

	const clicavel = (iso: string | null) => !!onescolher && !!iso && (valores.get(iso) ?? 0) > 0;
	function escolher(iso: string | null) {
		if (iso && clicavel(iso)) onescolher?.(iso);
	}

	const CENTROS = mapa.centros as unknown as Record<string, [number, number]>;
	const pulsos = $derived(pulsando.map((iso) => ({ iso, xy: CENTROS[iso] })).filter((p) => p.xy));

	const cor = (iso: string | null) => corDeVisitas(iso ? (valores.get(iso) ?? 0) : 0);

	let caixa = $state<HTMLDivElement>();
	let largura = $state(0);
	let dica = $state<{ iso: string; x: number; y: number } | null>(null);

	function noPonteiro(e: PointerEvent, iso: string | null) {
		if (!iso || !caixa) return;
		const r = caixa.getBoundingClientRect();
		dica = { iso, x: e.clientX - r.left, y: e.clientY - r.top };
		destaque = iso;
	}
	function esconder() {
		dica = null;
		destaque = null;
	}

	const tracoDestaque = $derived(destaque ? mapa.paises.find((p) => p.iso === destaque) : undefined);
	const pontoDestaque = $derived(destaque ? mapa.pontos.find((p) => p.iso === destaque) : undefined);
	/** Países pequenos demais para o traço: só aparecem como ponto se tiveram visita. */
	const pontosComVisita = $derived(mapa.pontos.filter((p) => (valores.get(p.iso) ?? 0) > 0));

	const resumo = $derived(
		`Mapa das visitas: ${valores.size} ${valores.size === 1 ? 'país alcançado' : 'países alcançados'}. Os números estão na lista de países.`
	);
</script>

<div class="relative" bind:this={caixa} bind:clientWidth={largura}>
	<svg viewBox="0 0 {mapa.largura} {mapa.altura}" class="block h-auto w-full select-none" role="img" aria-label={resumo}>
		{#each mapa.paises as p, i (p.iso ?? `sem-${i}`)}
			<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
			<path
				d={p.d}
				data-iso={p.iso}
				fill={cor(p.iso)}
				stroke="#ffffff"
				stroke-width="0.6"
				class="transition-[filter] duration-100 {p.iso ? 'hover:brightness-95' : ''} {clicavel(p.iso) ? 'cursor-pointer' : ''}"
				onpointermove={(e) => noPonteiro(e, p.iso)}
				onpointerleave={esconder}
				onclick={() => escolher(p.iso)}
			/>
		{/each}

		{#each pontosComVisita as p (p.iso)}
			<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
			<g
				onpointermove={(e) => noPonteiro(e, p.iso)}
				onpointerleave={esconder}
				onclick={() => escolher(p.iso)}
				class={clicavel(p.iso) ? 'cursor-pointer' : ''}
			>
				<!-- Alvo maior que o ponto: ninguém acerta 3 px com o mouse. -->
				<circle cx={p.x} cy={p.y} r="9" fill="transparent" />
				<circle cx={p.x} cy={p.y} r="3.2" fill={cor(p.iso)} stroke="#ffffff" stroke-width="1.2" />
			</g>
		{/each}

		<!-- Gente no site agora: um ponto verde com uma onda que se abre. -->
		{#each pulsos as p (p.iso)}
			<g pointer-events="none">
				<circle class="dm-pulso" cx={p.xy[0]} cy={p.xy[1]} r="5" fill="#17b26a" />
				<circle cx={p.xy[0]} cy={p.xy[1]} r="3.4" fill="#17b26a" stroke="#ffffff" stroke-width="1.4" />
			</g>
		{/each}

		<!-- O país em destaque ganha contorno por cima de tudo (a borda branca dos
		     vizinhos esconderia um contorno desenhado no próprio país). -->
		{#if tracoDestaque}
			<path d={tracoDestaque.d} fill="none" stroke="#0b1220" stroke-width="1.3" pointer-events="none" />
		{:else if pontoDestaque}
			<circle cx={pontoDestaque.x} cy={pontoDestaque.y} r="5" fill="none" stroke="#0b1220" stroke-width="1.3" pointer-events="none" />
		{/if}
	</svg>

	{#if dica}
		{@const n = valores.get(dica.iso) ?? 0}
		<div
			class="pointer-events-none absolute z-10 whitespace-nowrap rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 shadow-lg"
			style="left: {dica.x}px; top: {dica.y}px; transform: translate({dica.x > largura * 0.75
				? '-100%'
				: dica.x < largura * 0.2
					? '0%'
					: '-50%'}, calc(-100% - 12px));"
		>
			<p class="text-sm font-bold tabular-nums text-navy-900">
				{n ? `${numero(n)} ${n === 1 ? 'visita' : 'visitas'}` : 'Nenhuma visita ainda'}
			</p>
			<p class="text-xs text-slate">{bandeira(dica.iso)} {nomePais(dica.iso)}</p>
			{#if clicavel(dica.iso)}<p class="mt-0.5 text-[10px] text-grey">clique para filtrar o painel</p>{/if}
		</div>
	{/if}
</div>

<!-- Legenda da escala -->
<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate" aria-label="Legenda do mapa">
	<span class="font-semibold text-grey">Visitas</span>
	{#each FAIXAS as f, i (f.min)}
		<span class="inline-flex items-center gap-1.5">
			<span class="h-2.5 w-4 rounded-[2px]" style="background: {CORES_FAIXAS[i]}"></span>{f.rotulo}
		</span>
	{/each}
	<span class="inline-flex items-center gap-1.5">
		<span class="h-2.5 w-4 rounded-[2px]" style="background: {COR_SEM_VISITA}"></span>sem visitas
	</span>
</div>

<style>
	.dm-pulso {
		transform-box: fill-box;
		transform-origin: center;
		animation: dm-pulso 2s ease-out infinite;
	}
	@keyframes dm-pulso {
		from {
			transform: scale(0.6);
			opacity: 0.6;
		}
		to {
			transform: scale(3.2);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dm-pulso {
			animation: none;
			opacity: 0.35;
		}
	}
</style>
