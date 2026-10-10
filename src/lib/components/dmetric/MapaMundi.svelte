<script lang="ts" module>
	// Os pontinhos de cada país viram UM traço SVG (um <path> por país, e não um
	// <circle> por ponto: são ~6 mil). Cada ponto é um risco de comprimento zero
	// com ponta redonda ("M x y h0" + stroke-linecap round): um terço do texto de
	// um círculo desenhado com arcos. Feito uma vez, no carregamento do módulo.
	import mapa from '$lib/dmetric/mapa.generated.json';

	/** Diâmetro do pontinho, perto da metade da distância entre eles. */
	const DIAMETRO = 2.3;
	const ponto = (x: number, y: number) => `M${+x.toFixed(2)} ${+y.toFixed(2)}h0`;

	const PONTOS_POR_PAIS: [string, string][] = Object.entries(mapa.grade as Record<string, string>).map(
		([iso, codigo]) => {
			let idx = 0;
			const d = codigo
				.split(',')
				.map((parte, k) => {
					idx = k ? idx + parseInt(parte, 36) : parseInt(parte, 36);
					const i = idx % mapa.colunas;
					const j = Math.floor(idx / mapa.colunas);
					return ponto(i * mapa.passo + mapa.passo / 2, j * mapa.passo + mapa.passo / 2);
				})
				.join('');
			return [iso, d];
		}
	);
	const TEM_PONTO = new Set(PONTOS_POR_PAIS.map(([iso]) => iso));
	const CENTROS = mapa.centros as unknown as Record<string, [number, number]>;
	const PEQUENOS = new Map(mapa.pontos.map((p) => [p.iso, [p.x, p.y] as [number, number]]));
</script>

<script lang="ts">
	// Mapa-múndi do DMetric, em pontinhos: cinza onde ainda não chegou visita,
	// azul onde chegou (mais escuro, mais visitas). Os países com mais visitas
	// ganham marcador e etiqueta. Passar o mouse mostra o país e o número.
	// Teclado e leitor de tela usam o ranking ao lado (RankingPaises), que tem os
	// mesmos números e, ao focar uma linha, destaca o país aqui.
	import { FAIXAS, bandeira, faixaDe, nomePais, numero } from '$lib/dmetric/painel';

	let {
		valores,
		destaque = $bindable(null)
	}: {
		valores: Map<string, number>;
		/** País em destaque — vem do ranking ao lado, ou vai para ele. */
		destaque?: string | null;
	} = $props();

	// Escala sequencial de um tom só (azul): mais visitas, mais escuro.
	const RAMPA = ['#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#104281'];
	const SEM_VISITA = '#c9ced6';
	const DESTAQUE = '#0b1220';

	const corDe = (iso: string) => {
		if (iso === destaque) return DESTAQUE;
		const f = faixaDe(valores.get(iso) ?? 0);
		return f < 0 ? SEM_VISITA : RAMPA[f];
	};

	/** País com visita mas pequeno demais para um pontinho da grade: um ponto no centro. */
	const pontosAvulsos = $derived(
		[...valores.keys()]
			.filter((iso) => !TEM_PONTO.has(iso))
			.map((iso) => ({ iso, xy: CENTROS[iso] ?? PEQUENOS.get(iso) }))
			.filter((p): p is { iso: string; xy: [number, number] } => !!p.xy)
	);

	// ---- Marcadores e etiquetas -------------------------------------------------
	const MAX_ETIQUETAS = 6;
	const FONTE = 12;
	const ALTURA_ETQ = 22;
	const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

	/**
	 * Etiquetas dos países com mais visitas, sem uma cobrir a outra nem sair do
	 * quadro: tenta em cima do marcador, depois embaixo, à direita e à esquerda;
	 * se nenhuma cabe, o país fica só com o marcador (o número está no ranking).
	 */
	const etiquetas = $derived.by(() => {
		const postas: { iso: string; mx: number; my: number; x: number; y: number; w: number; nome: string; valor: string }[] = [];
		const topo = [...valores.entries()]
			.filter(([iso]) => CENTROS[iso] ?? PEQUENOS.get(iso))
			.sort((a, b) => b[1] - a[1])
			.slice(0, MAX_ETIQUETAS);
		const cabe = (x: number, y: number, w: number) =>
			postas.every((o) => x + w + 4 < o.x || o.x + o.w + 4 < x || y + ALTURA_ETQ + 4 < o.y || o.y + ALTURA_ETQ + 4 < y) &&
			// Também não pode cobrir o marcador de outra etiqueta.
			postas.every((o) => !(o.mx > x - 6 && o.mx < x + w + 6 && o.my > y - 6 && o.my < y + ALTURA_ETQ + 6));
		for (const [iso, n] of topo) {
			const [mx, my] = (CENTROS[iso] ?? PEQUENOS.get(iso))!;
			const nome = nomePais(iso);
			const valor = compacto.format(n);
			// Largura estimada: ~0,6 da fonte por letra, mais o respiro da pílula.
			const w = Math.round((nome.length + valor.length + 1) * FONTE * 0.6 + 20);
			const tentativas: [number, number][] = [
				[mx - w / 2, my - 12 - ALTURA_ETQ],
				[mx - w / 2, my + 12],
				[mx + 12, my - ALTURA_ETQ / 2],
				[mx - 12 - w, my - ALTURA_ETQ / 2]
			];
			for (const [tx, ty] of tentativas) {
				// Dentro do quadro, sempre.
				const x = Math.min(Math.max(tx, 4), mapa.largura - w - 4);
				const y = Math.min(Math.max(ty, 4), mapa.altura - ALTURA_ETQ - 4);
				if (cabe(x, y, w)) {
					postas.push({ iso, mx, my, x, y, w, nome, valor });
					break;
				}
			}
		}
		return postas;
	});

	// ---- Dica do mouse ---------------------------------------------------------
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

	const resumo = $derived(
		`Mapa das visitas: ${valores.size} ${valores.size === 1 ? 'país alcançado' : 'países alcançados'}. Os números estão na lista de países.`
	);
</script>

<div class="relative" bind:this={caixa} bind:clientWidth={largura}>
	<svg viewBox="0 0 {mapa.largura} {mapa.altura}" class="block h-auto w-full select-none" role="img" aria-label={resumo}>
		<defs>
			<filter id="dm-sombra" x="-20%" y="-40%" width="140%" height="180%">
				<feDropShadow dx="0" dy="1" stdDeviation="1.6" flood-color="#0b1220" flood-opacity="0.14" />
			</filter>
		</defs>

		<!-- Os pontinhos (sem mouse: quem recebe o mouse é a camada invisível abaixo). -->
		<g pointer-events="none">
			{#each PONTOS_POR_PAIS as [iso, d] (iso)}
				<path {d} fill="none" stroke={corDe(iso)} stroke-width={DIAMETRO} stroke-linecap="round" class="transition-[stroke] duration-150" />
			{/each}
			{#each pontosAvulsos as p (p.iso)}
				<circle cx={p.xy[0]} cy={p.xy[1]} r="2.6" fill={corDe(p.iso)} stroke="#ffffff" stroke-width="0.8" />
			{/each}
		</g>

		<!-- Marcadores dos países com etiqueta -->
		<g pointer-events="none">
			{#each etiquetas as e (e.iso)}
				<circle cx={e.mx} cy={e.my} r="9" fill="#2a78d6" fill-opacity="0.18" />
				<circle cx={e.mx} cy={e.my} r="4.5" fill="#2a78d6" stroke="#ffffff" stroke-width="1.6" />
			{/each}
		</g>

		<!-- Área invisível de cada país, para o mouse achar o país entre os pontos. -->
		{#each mapa.paises as p, i (p.iso ?? `sem-${i}`)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<path d={p.d} data-iso={p.iso} fill="transparent" onpointermove={(e) => noPonteiro(e, p.iso)} onpointerleave={esconder} />
		{/each}
		{#each pontosAvulsos as p (p.iso)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<circle cx={p.xy[0]} cy={p.xy[1]} r="9" fill="transparent" onpointermove={(e) => noPonteiro(e, p.iso)} onpointerleave={esconder} />
		{/each}

		<!-- Etiquetas por cima de tudo. Num quadro estreito (celular) a letra
		     ficaria minúscula: lá elas saem, e o ranking dá os números. -->
		{#if largura >= 520}
			<g pointer-events="none">
				{#each etiquetas as e (e.iso)}
					<rect x={e.x} y={e.y} width={e.w} height={ALTURA_ETQ} rx="7" fill="#ffffff" stroke="#e6e9f1" filter="url(#dm-sombra)" />
					<text x={e.x + e.w / 2} y={e.y + ALTURA_ETQ / 2 + FONTE * 0.36} text-anchor="middle" font-size={FONTE}>
						<tspan font-weight="600" fill="#0b1220">{e.nome}</tspan>
						<tspan fill="#5b6576" dx="4">{e.valor}</tspan>
					</text>
				{/each}
			</g>
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
		</div>
	{/if}
</div>

<!-- Legenda da escala, nos mesmos pontinhos do mapa -->
<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate" aria-label="Legenda do mapa">
	<span class="font-semibold text-grey">Visitas</span>
	{#each FAIXAS as f, i (f.min)}
		<span class="inline-flex items-center gap-1.5">
			<span class="size-2.5 rounded-full" style="background: {RAMPA[i]}"></span>{f.rotulo}
		</span>
	{/each}
	<span class="inline-flex items-center gap-1.5">
		<span class="size-2.5 rounded-full" style="background: {SEM_VISITA}"></span>sem visitas
	</span>
</div>
