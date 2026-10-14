<script lang="ts">
	// Visitas no período, por dia ou por horário. Uma série só (o título do card
	// já diz qual), com a mira: o ponteiro acha o ponto mais perto e a dica
	// mostra o número. Os pontos chegam prontos (serieDiaria / serieRecente).
	//
	// Dias `semDados` (antes de o script começar a contar) não são zero: ficam
	// numa faixa hachurada, sem linha, e a linha começa no primeiro dia contado.
	import { numero, type PontoSerie } from '$lib/dmetric/painel';

	let { serie }: { serie: PontoSerie[] } = $props();

	const uid = $props.id();
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

	/** O primeiro ponto contado de verdade; antes dele, só a faixa "sem dados". */
	const inicio = $derived(Math.max(0, serie.findIndex((s) => !s.semDados)));
	const temDados = $derived(serie.some((s) => !s.semDados));
	const contados = $derived(temDados ? serie.slice(inicio) : []);

	const linha = $derived(
		contados.map((s, k) => `${k ? 'L' : 'M'}${x(inicio + k).toFixed(1)},${y(s.visitas).toFixed(1)}`).join('')
	);
	const area = $derived(
		contados.length ? `${linha}L${x(serie.length - 1).toFixed(1)},${y(0)}L${x(inicio).toFixed(1)},${y(0)}Z` : ''
	);
	// A faixa vai do começo até o primeiro dia contado, onde a linha começa.
	const fimFaixa = $derived(inicio > 0 ? (temDados ? x(inicio) : largura - M.r) : M.l);

	// Datas no eixo: até 8 pontos, todas (na tela larga); senão 6 na tela larga
	// e 3 na estreita, sem repetir.
	const marcasX = $derived.by(() => {
		if (serie.length <= 8 && largura >= 640) return serie.map((_, i) => i);
		const n = Math.min(serie.length, largura >= 640 ? 6 : 3);
		if (n < 2) return [0];
		return [...new Set(Array.from({ length: n }, (_, k) => Math.round((k * (serie.length - 1)) / (n - 1))))];
	});

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
			aria-label="Visitas de {serie[0]?.rotulo ?? ''} a {serie.at(-1)?.rotulo ?? ''}{inicio > 0 && temDados
				? `; o DMetric começou a contar em ${serie[inicio].rotulo}`
				: ''}"
			onpointermove={mover}
			onpointerleave={() => (mira = null)}
		>
			<defs>
				<pattern id="sem-dados-{uid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<line x1="0" y1="0" x2="0" y2="6" stroke="#e6e9f1" stroke-width="2" />
				</pattern>
			</defs>

			{#if inicio > 0}
				<rect x={M.l} y={M.t} width={Math.max(0, fimFaixa - M.l)} height={y(0) - M.t} fill="url(#sem-dados-{uid})" />
				{#if fimFaixa - M.l > 190}
					<text x={(M.l + fimFaixa) / 2} y={(M.t + y(0)) / 2} text-anchor="middle" class="fill-grey text-[11px]">
						<tspan x={(M.l + fimFaixa) / 2} class="font-semibold">Sem dados</tspan>
						{#if temDados}
							<tspan x={(M.l + fimFaixa) / 2} dy="15">o DMetric começou a contar em {serie[inicio].rotulo}</tspan>
						{/if}
					</text>
				{/if}
			{/if}

			{#each [0, maxY / 2, maxY] as g (g)}
				<line x1={M.l} x2={largura - M.r} y1={y(g)} y2={y(g)} stroke="#e6e9f1" stroke-width="1" />
				<text x={M.l - 8} y={y(g) + 3.5} text-anchor="end" class="fill-grey text-[10px] tabular-nums">{numero(g)}</text>
			{/each}
			{#each marcasX as i (i)}
				<text
					x={x(i)}
					y={ALTURA - 8}
					text-anchor={i === 0 ? 'start' : i === serie.length - 1 ? 'end' : 'middle'}
					class="fill-grey text-[10px] tabular-nums">{serie[i]?.rotulo ?? ''}</text
				>
			{/each}
			<path d={area} fill="#2a78d6" fill-opacity="0.10" />
			<path d={linha} fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
			<!-- Um ponto só não forma linha: o dia aparece como marca. -->
			{#if contados.length === 1}
				<circle cx={x(inicio)} cy={y(contados[0].visitas)} r="4" fill="#2a78d6" />
			{/if}
			{#if mira !== null && serie[mira]}
				<line x1={x(mira)} x2={x(mira)} y1={M.t} y2={y(0)} stroke="#98a2b3" stroke-width="1" />
				{#if !serie[mira].semDados}
					<circle cx={x(mira)} cy={y(serie[mira].visitas)} r="4" fill="#2a78d6" stroke="#ffffff" stroke-width="2" />
				{/if}
			{/if}
		</svg>
		{#if mira !== null && serie[mira]}
			{@const s = serie[mira]}
			<div
				class="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 shadow-lg"
				style="left: {x(mira)}px; transform: translateX({x(mira) > largura * 0.7 ? 'calc(-100% - 10px)' : '10px'});"
			>
				{#if s.semDados}
					<p class="text-sm font-bold text-navy-900">Sem dados</p>
					<p class="text-xs tabular-nums text-slate">{s.rotulo} · antes de o DMetric começar a contar</p>
				{:else}
					<p class="text-sm font-bold tabular-nums text-navy-900">{numero(s.visitas)} {s.visitas === 1 ? 'visita' : 'visitas'}</p>
					<p class="text-xs tabular-nums text-slate">{numero(s.visualizacoes)} páginas vistas · {s.rotulo}</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>
