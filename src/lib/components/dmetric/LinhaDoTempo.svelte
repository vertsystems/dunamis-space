<script lang="ts">
	// Visitas por dia no período. Uma série só (o título do card já diz qual),
	// com a mira: o ponteiro acha o dia mais perto e a dica mostra o número.
	import { diasEntre, numero } from '$lib/dmetric/painel';

	let {
		pontos,
		de,
		ate
	}: { pontos: { dia: string; visitas: number; visualizacoes: number }[]; de: string; ate: string } = $props();

	// "Desde o começo" começa no primeiro dia com visita, não em 2000.
	const inicio = $derived(de < (pontos[0]?.dia ?? ate) ? (pontos[0]?.dia ?? ate) : de);
	const serie = $derived.by(() => {
		const porDia = new Map(pontos.map((p) => [p.dia, p]));
		return diasEntre(inicio, ate).map((dia) => porDia.get(dia) ?? { dia, visitas: 0, visualizacoes: 0 });
	});

	let largura = $state(0);
	const ALTURA = 190;
	const M = { t: 14, r: 12, b: 26, l: 40 };

	/** Teto "redondo" do eixo: 7 → 10, 34 → 40, 1.234 → 1.500. */
	function teto(v: number): number {
		if (v <= 5) return 5;
		const p = 10 ** Math.floor(Math.log10(v));
		for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
		return 10 * p;
	}
	const maxY = $derived(teto(Math.max(0, ...serie.map((s) => s.visitas))));
	const x = (i: number) => M.l + (serie.length < 2 ? 0.5 : i / (serie.length - 1)) * (largura - M.l - M.r);
	const y = (v: number) => M.t + (1 - v / maxY) * (ALTURA - M.t - M.b);

	const linha = $derived(serie.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.visitas).toFixed(1)}`).join(''));
	const area = $derived(
		serie.length ? `${linha}L${x(serie.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z` : ''
	);

	const fmt = (dia: string) => {
		const [, m, d] = dia.split('-');
		return `${d}/${m}`;
	};
	const marcasX = $derived(
		serie.length <= 1 ? [0] : [0, Math.round((serie.length - 1) / 2), serie.length - 1]
	);

	let mira = $state<number | null>(null);
	function mover(e: PointerEvent) {
		const r = (e.currentTarget as SVGElement).getBoundingClientRect();
		const px = e.clientX - r.left;
		const t = (px - M.l) / Math.max(1, largura - M.l - M.r);
		mira = Math.min(serie.length - 1, Math.max(0, Math.round(t * (serie.length - 1))));
	}
</script>

<div class="relative" bind:clientWidth={largura}>
	{#if largura > 0}
		<svg
			width={largura}
			height={ALTURA}
			class="block"
			role="img"
			aria-label="Visitas por dia, de {fmt(inicio)} a {fmt(ate)}"
			onpointermove={mover}
			onpointerleave={() => (mira = null)}
		>
			{#each [0, maxY / 2, maxY] as g (g)}
				<line x1={M.l} x2={largura - M.r} y1={y(g)} y2={y(g)} stroke="#e6e9f1" stroke-width="1" />
				<text x={M.l - 8} y={y(g) + 3.5} text-anchor="end" class="fill-grey text-[10px] tabular-nums">{numero(g)}</text>
			{/each}
			{#each marcasX as i (i)}
				<text
					x={x(i)}
					y={ALTURA - 8}
					text-anchor={i === 0 ? 'start' : i === serie.length - 1 ? 'end' : 'middle'}
					class="fill-grey text-[10px] tabular-nums">{serie[i] ? fmt(serie[i].dia) : ''}</text
				>
			{/each}
			<path d={area} fill="#2a78d6" fill-opacity="0.10" />
			<path d={linha} fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
			{#if mira !== null && serie[mira]}
				<line x1={x(mira)} x2={x(mira)} y1={M.t} y2={y(0)} stroke="#98a2b3" stroke-width="1" />
				<circle cx={x(mira)} cy={y(serie[mira].visitas)} r="4" fill="#2a78d6" stroke="#ffffff" stroke-width="2" />
			{/if}
		</svg>
		{#if mira !== null && serie[mira]}
			{@const s = serie[mira]}
			<div
				class="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 shadow-lg"
				style="left: {x(mira)}px; transform: translateX({x(mira) > largura * 0.7 ? 'calc(-100% - 10px)' : '10px'});"
			>
				<p class="text-sm font-bold tabular-nums text-navy-900">{numero(s.visitas)} {s.visitas === 1 ? 'visita' : 'visitas'}</p>
				<p class="text-xs tabular-nums text-slate">{numero(s.visualizacoes)} páginas vistas · {fmt(s.dia)}</p>
			</div>
		{/if}
	{/if}
</div>
