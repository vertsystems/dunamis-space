<script lang="ts">
	// Horários de pico: dia da semana × hora do dia (Brasília), pintado pela
	// quantidade de visitas que chegaram em cada horário no período. Serve para
	// escolher quando postar e quando deixar anúncio no ar.
	import { DIAS_SEMANA, faixaHorario, gradeHorarios, numero } from '$lib/dmetric/painel';

	let { porHora }: { porHora: { dow: number; hora: number; visitas: number }[] } = $props();

	const g = $derived(gradeHorarios(porHora));

	// Escala sequencial de um tom só (azul): 0 = nenhuma visita; 1–5 até o pico.
	const CORES = ['#eef1f5', '#cde2fb', '#9ec5f4', '#5598e7', '#256abf', '#104281'];
	const CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

	let caixa = $state<HTMLDivElement>();
	let dica = $state<{ dow: number; hora: number; x: number; y: number } | null>(null);

	function mostrar(e: PointerEvent, dow: number, hora: number) {
		if (!caixa) return;
		const alvo = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const r = caixa.getBoundingClientRect();
		dica = { dow, hora, x: alvo.left + alvo.width / 2 - r.left, y: alvo.top - r.top };
	}

	const faixa = (h: number) => `${h}h–${(h + 1) % 24}h`;
	const resumo = $derived(
		g.pico
			? `Horários de pico: o mais movimentado é ${DIAS_SEMANA[g.pico.dow].toLowerCase()} às ${g.pico.hora}h.`
			: 'Horários de pico: sem visitas no período.'
	);
</script>

{#if !g.total}
	<p class="py-6 text-center text-xs text-grey">
		Os horários aparecem aqui conforme o script registra visitas (as de antes de 12/10/2026 não guardaram a hora).
	</p>
{:else}
	<div class="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate">
		{#if g.pico}
			<p>
				Pico: <b class="font-semibold text-navy">{DIAS_SEMANA[g.pico.dow].toLowerCase()}, {faixa(g.pico.hora)}</b>
				<span class="text-grey">({numero(g.pico.visitas)} {g.pico.visitas === 1 ? 'visita' : 'visitas'})</span>
			</p>
		{/if}
		{#if g.melhorDia}
			<p>
				Dia mais movimentado: <b class="font-semibold text-navy">{DIAS_SEMANA[g.melhorDia.dow].toLowerCase()}</b>
				<span class="text-grey">({numero(g.melhorDia.visitas)})</span>
			</p>
		{/if}
	</div>

	<div class="relative overflow-x-auto" bind:this={caixa} role="img" aria-label={resumo}>
		<div class="grid min-w-[640px] gap-[3px]" style="grid-template-columns: 2.25rem repeat(24, minmax(0, 1fr));">
			<!-- Horas, de 3 em 3 -->
			<span></span>
			{#each Array(24) as _, h (h)}
				<span class="text-center text-[9px] tabular-nums text-grey">{h % 3 === 0 ? `${h}h` : ''}</span>
			{/each}

			{#each g.grade as linha, dow (dow)}
				<span class="self-center pr-1 text-[10px] font-medium text-slate">{CURTO[dow]}</span>
				{#each linha as v, hora (hora)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="h-[18px] rounded-[3px] transition-[filter] hover:brightness-90"
						style="background: {CORES[faixaHorario(v, g.maior)]}"
						onpointerenter={(e) => mostrar(e, dow, hora)}
						onpointerleave={() => (dica = null)}
					></div>
				{/each}
			{/each}
		</div>

		{#if dica}
			{@const v = g.grade[dica.dow][dica.hora]}
			<div
				class="pointer-events-none absolute z-10 whitespace-nowrap rounded-[var(--radius)] border border-grey-200 bg-surface px-3 py-2 shadow-lg"
				style="left: {dica.x}px; top: {dica.y}px; transform: translate(-50%, calc(-100% - 6px));"
			>
				<p class="text-sm font-bold tabular-nums text-navy-900">{numero(v)} {v === 1 ? 'visita' : 'visitas'}</p>
				<p class="text-xs text-slate">{DIAS_SEMANA[dica.dow]} · {faixa(dica.hora)}</p>
			</div>
		{/if}
	</div>

	<div class="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-grey" aria-hidden="true">
		Menos
		{#each CORES.slice(1) as c (c)}<span class="size-2.5 rounded-[2px]" style="background: {c}"></span>{/each}
		Mais
	</div>
{/if}
