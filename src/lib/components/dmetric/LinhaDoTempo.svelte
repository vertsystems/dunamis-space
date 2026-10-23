<script lang="ts">
	// Visitas no período, por dia ou por horário. Uma série só (o título do card
	// já diz qual), com a mira: o ponteiro acha o ponto mais perto e a dica
	// mostra o número. Os pontos chegam prontos (serieDoPeriodo / serieRecente).
	//
	// Dias `semDados` (antes de o script começar a contar) não são zero: ficam
	// numa faixa hachurada, sem linha. Dias `futuro` (do período que ainda não
	// chegaram) ficam em branco: a linha para em hoje.
	//
	// Comparando, cada ponto traz o `anterior` (o de mesma posição no período de
	// comparação): uma linha cinza tracejada, que segue mesmo nos dias que ainda
	// não chegaram — é o que o período de antes fez neles. Com duas linhas, a
	// legenda embaixo diz qual é qual.
	import { numero, type PontoSerie } from '$lib/dmetric/painel';

	let {
		serie,
		legenda = null,
		textoSemDados = null
	}: {
		serie: PontoSerie[];
		/** Os nomes das duas linhas ("outubro de 2026", "setembro de 2026"). */
		legenda?: { atual: string; anterior: string } | null;
		/** A frase da faixa hachurada, no lugar de "o DMetric começou a contar em…". */
		textoSemDados?: string | null;
	} = $props();

	const uid = $props.id();
	let largura = $state(0);
	const ALTURA = 190;
	const M = { t: 14, r: 14, b: 26, l: 40 };

	/** Teto "redondo" do eixo: 7 → 10, 34 → 40, 1.234 → 1.500. */
	function teto(v: number): number {
		if (v <= 5) return 5;
		const p = 10 ** Math.floor(Math.log10(v));
		for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
		return 10 * p;
	}
	const maxY = $derived(teto(Math.max(0, ...serie.map((s) => Math.max(s.visitas, s.anterior?.visitas ?? 0)))));
	const x = (i: number) => M.l + (serie.length < 2 ? 0.5 : i / (serie.length - 1)) * (largura - M.l - M.r);
	const y = (v: number) => M.t + (1 - v / maxY) * (ALTURA - M.t - M.b);

	// O trecho contado: do primeiro dia que não é "sem dados" até o último que já passou.
	const inicio = $derived(serie.findIndex((s) => !s.semDados && !s.futuro));
	const fim = $derived(serie.findLastIndex((s) => !s.semDados && !s.futuro));
	const contados = $derived(inicio >= 0 ? serie.slice(inicio, fim + 1) : []);

	const linha = $derived(
		contados.map((s, k) => `${k ? 'L' : 'M'}${x(inicio + k).toFixed(1)},${y(s.visitas).toFixed(1)}`).join('')
	);
	const area = $derived(contados.length ? `${linha}L${x(fim).toFixed(1)},${y(0)}L${x(inicio).toFixed(1)},${y(0)}Z` : '');

	// A linha de antes: um trecho por sequência de pontos com dados.
	const comAnterior = $derived(serie.some((s) => s.anterior));
	const linhaAnterior = $derived(
		serie
			.map((s, i) =>
				s.anterior ? `${serie[i - 1]?.anterior ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.anterior.visitas).toFixed(1)}` : ''
			)
			.join('')
	);
	// Um ponto de antes isolado (sem vizinho) não forma traço: vira marca.
	const soltosAnterior = $derived(
		serie.map((s, i) => (s.anterior && !serie[i - 1]?.anterior && !serie[i + 1]?.anterior ? i : -1)).filter((i) => i >= 0)
	);

	// A faixa "sem dados" vai do começo até o primeiro dia contado (ou até o
	// último dia sem dados, se o período inteiro é de antes do script).
	const ultimoSemDados = $derived(serie.findLastIndex((s) => s.semDados));
	const fimFaixa = $derived(ultimoSemDados < 0 ? M.l : inicio > 0 ? x(inicio) : x(ultimoSemDados));
	const primeiroContado = $derived(inicio >= 0 ? serie[inicio] : undefined);

	// Embaixo do gráfico. Com `eixo` (o gráfico por dia), os rótulos de cada
	// ponto, pulando de tantos em tantos para não encostar um no outro; sem ele
	// (as séries de horas), 6 marcas na tela larga e 3 na estreita.
	const marcasX = $derived.by(() => {
		if (!serie.length) return [];
		if (serie.some((s) => s.eixo !== undefined)) {
			const comRotulo = serie.map((s, i) => (s.eixo ? i : -1)).filter((i) => i >= 0);
			const passo = Math.max(1, (largura - M.l - M.r) / Math.max(1, serie.length - 1));
			const minimo = serie.length <= 31 ? 20 : 30;
			// Dias do mês: de k em k (1, 3, 5… ou 1, 6, 11…); meses: todos que couberem.
			if (serie.length <= 31) {
				const k = Math.ceil(minimo / passo);
				return comRotulo.filter((i) => i % k === 0 || (serie[i].hoje && i % k !== 1 && (i + 1) % k !== 0));
			}
			const fora: number[] = [];
			for (const i of comRotulo) if (!fora.length || (i - fora[fora.length - 1]) * passo >= minimo) fora.push(i);
			return fora;
		}
		const n = Math.min(serie.length, largura >= 640 ? 6 : 3);
		if (n < 2) return [0];
		return [...new Set(Array.from({ length: n }, (_, k) => Math.round((k * (serie.length - 1)) / (n - 1))))];
	});
	const ancora = (i: number) =>
		serie[i]?.eixo !== undefined ? 'middle' : i === 0 ? 'start' : i === serie.length - 1 ? 'end' : 'middle';

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
			aria-label="Visitas de {serie[0]?.rotulo ?? ''} a {serie.at(-1)?.rotulo ?? ''}{ultimoSemDados >= 0 && primeiroContado
				? `; o DMetric começou a contar em ${primeiroContado.rotulo}`
				: ''}"
			onpointermove={mover}
			onpointerleave={() => (mira = null)}
		>
			<defs>
				<pattern id="sem-dados-{uid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<line x1="0" y1="0" x2="0" y2="6" stroke="#e6e9f1" stroke-width="2" />
				</pattern>
			</defs>

			{#if ultimoSemDados >= 0}
				{@const meio = (M.l + fimFaixa) / 2}
				<rect x={M.l} y={M.t} width={Math.max(0, fimFaixa - M.l)} height={y(0) - M.t} fill="url(#sem-dados-{uid})" />
				{#if fimFaixa - M.l > 190}
					<text x={meio} y={(M.t + y(0)) / 2} text-anchor="middle" class="fill-grey text-[11px]">
						<tspan x={meio} class="font-semibold">Sem dados</tspan>
						<tspan x={meio} dy="15">
							{textoSemDados ??
								(primeiroContado ? `o DMetric começou a contar em ${primeiroContado.rotulo.slice(5)}` : 'o DMetric ainda não contava')}
						</tspan>
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
					text-anchor={ancora(i)}
					class="text-[10px] tabular-nums {serie[i]?.hoje
						? 'fill-navy-900 font-bold'
						: serie[i]?.futuro
							? 'fill-grey/60'
							: 'fill-grey'}">{serie[i]?.eixo ?? serie[i]?.rotulo ?? ''}</text
				>
			{/each}
			{#if comAnterior}
				<path d={linhaAnterior} fill="none" stroke="#98a2b3" stroke-width="1.5" stroke-dasharray="4 4" stroke-linejoin="round" stroke-linecap="round" />
				{#each soltosAnterior as i (i)}
					<circle cx={x(i)} cy={y(serie[i].anterior?.visitas ?? 0)} r="3" fill="#98a2b3" />
				{/each}
			{/if}
			<path d={area} fill="#2a78d6" fill-opacity="0.10" />
			<path d={linha} fill="none" stroke="#2a78d6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
			<!-- Um ponto só não forma linha: o dia aparece como marca. -->
			{#if contados.length === 1}
				<circle cx={x(inicio)} cy={y(contados[0].visitas)} r="4" fill="#2a78d6" />
			{/if}
			{#if mira !== null && serie[mira]}
				<line x1={x(mira)} x2={x(mira)} y1={M.t} y2={y(0)} stroke="#98a2b3" stroke-width="1" />
				{#if serie[mira].anterior}
					<circle cx={x(mira)} cy={y(serie[mira].anterior?.visitas ?? 0)} r="3.5" fill="#98a2b3" stroke="#ffffff" stroke-width="2" />
				{/if}
				{#if !serie[mira].semDados && !serie[mira].futuro}
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
				{:else if s.futuro}
					<p class="text-sm font-bold text-navy-900">Ainda não chegou</p>
					<p class="text-xs tabular-nums text-slate">{s.rotulo}</p>
				{:else}
					<p class="text-sm font-bold tabular-nums text-navy-900">{numero(s.visitas)} {s.visitas === 1 ? 'visita' : 'visitas'}</p>
					<p class="text-xs tabular-nums text-slate">{numero(s.visualizacoes)} páginas vistas · {s.rotulo}{s.hoje ? ' (hoje, até agora)' : ''}</p>
				{/if}
				{#if s.anterior}
					<p class="mt-1 flex items-center gap-1.5 border-t border-grey-200 pt-1 text-xs tabular-nums text-slate">
						<svg width="14" height="2" aria-hidden="true"><line x1="0" y1="1" x2="14" y2="1" stroke="#98a2b3" stroke-width="2" stroke-dasharray="3 2" /></svg>
						antes: <span class="font-semibold text-navy-900">{numero(s.anterior.visitas)}</span>
						{s.anterior.visitas === 1 ? 'visita' : 'visitas'} · {s.anterior.rotulo}
					</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>

{#if comAnterior && legenda}
	<!-- Duas linhas: a legenda diz qual é qual (a cor nunca fala sozinha). -->
	<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate" aria-label="Legenda do gráfico">
		<span class="inline-flex items-center gap-1.5">
			<svg width="18" height="2" aria-hidden="true"><line x1="0" y1="1" x2="18" y2="1" stroke="#2a78d6" stroke-width="2" /></svg>
			{legenda.atual}
		</span>
		<span class="inline-flex items-center gap-1.5">
			<svg width="18" height="2" aria-hidden="true"><line x1="0" y1="1" x2="18" y2="1" stroke="#98a2b3" stroke-width="2" stroke-dasharray="4 3" /></svg>
			{legenda.anterior}
		</span>
	</div>
{/if}
