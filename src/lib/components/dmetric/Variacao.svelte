<script lang="ts">
	// Quanto um número mudou contra o período de comparação: "▲ +12%" em verde,
	// "▼ −8%" em vermelho, com a seta (nunca só a cor). A dica diz o número de
	// antes e de quando ele é.
	import { textoVariacao, variacao } from '$lib/dmetric/recorte';
	import { Minus, TrendingDown, TrendingUp } from '@lucide/svelte';

	let {
		atual,
		anterior,
		dica
	}: {
		atual: number;
		anterior: number;
		/** "Antes: 1.149 visitas · os 7 dias anteriores (10/10 a 16/10/2026)". */
		dica: string;
	} = $props();

	const v = $derived(variacao(atual, anterior));
	const p = $derived(v === null ? 0 : Math.round(v * 100));
</script>

{#if v !== null}
	<span
		title={dica}
		aria-label="{textoVariacao(v)} — {dica}"
		class="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums {p > 0
			? 'bg-[#e7f6ee] text-[#107d4a]'
			: p < 0
				? 'bg-[#fdecea] text-[#b42318]'
				: 'bg-bg text-grey'}"
	>
		{#if p > 0}<TrendingUp size={12} />{:else if p < 0}<TrendingDown size={12} />{:else}<Minus size={12} />{/if}
		{textoVariacao(v)}
	</span>
{:else if atual > 0}
	<!-- Antes era zero: não há porcentagem que diga isso direito. -->
	<span title={dica} class="shrink-0 text-[11px] font-medium text-grey">antes, 0</span>
{/if}
