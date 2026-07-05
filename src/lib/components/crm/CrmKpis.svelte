<script lang="ts">
	import { Card } from '$lib/components/ui';
	import { formatBRL } from '$lib/crm';

	let {
		kpis
	}: {
		kpis: {
			abertos_qtd: number;
			valor_aberto: number;
			valor_ponderado: number;
			ganhos_mes: number;
			valor_ganho_mes: number;
			taxa_conversao: number;
			atividades_atrasadas: number;
		};
	} = $props();

	const cards = $derived([
		{ label: 'Negócios abertos', value: String(kpis.abertos_qtd), accent: 'text-navy' },
		{ label: 'Valor em aberto', value: formatBRL(kpis.valor_aberto), accent: 'text-navy' },
		{
			label: 'Previsão ponderada',
			value: formatBRL(kpis.valor_ponderado),
			accent: 'text-slate'
		},
		{ label: 'Ganhos no mês', value: formatBRL(kpis.valor_ganho_mes), accent: 'text-brand-green' },
		{ label: 'Taxa de conversão', value: `${kpis.taxa_conversao}%`, accent: 'text-navy' },
		{
			label: 'Atividades atrasadas',
			value: String(kpis.atividades_atrasadas),
			accent: kpis.atividades_atrasadas ? 'text-brand-danger' : 'text-brand-green'
		}
	]);
</script>

<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
	{#each cards as s (s.label)}
		<Card padding="sm">
			<div class="text-xs uppercase tracking-wide text-grey font-semibold leading-tight">
				{s.label}
			</div>
			<div class="text-base font-semibold mt-1 tabular-nums {s.accent}">{s.value}</div>
		</Card>
	{/each}
</div>
