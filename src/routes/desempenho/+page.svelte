<script lang="ts">
	import { Card } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { formatBRL, stageDot } from '$lib/crm';

	let { data } = $props();

	const stats = $derived([
		{ label: 'Novos clientes (30d)', value: String(data.novosClientes), accent: 'text-navy', icon: 'contact' },
		{ label: 'Publicados (30d)', value: String(data.publicados), accent: 'text-brand-green', icon: 'calendar' },
		...(data.kpisCrm
			? [
					{ label: 'Negócios ganhos (mês)', value: String(data.kpisCrm.ganhosMes), accent: 'text-brand-green', icon: 'funnel' },
					{ label: 'Valor ganho (mês)', value: formatBRL(data.kpisCrm.valorGanhoMes), accent: 'text-brand-green', icon: 'dollar' },
					{ label: 'Taxa de conversão', value: `${data.kpisCrm.taxaConversao}%`, accent: 'text-navy', icon: 'chart' },
					{ label: 'Valor em aberto', value: formatBRL(data.kpisCrm.valorAberto), accent: 'text-navy', icon: 'dollar' }
				]
			: [])
	]);

	const maxCount = $derived(Math.max(1, ...data.funil.map((f) => f.count)));
	const totalFunil = $derived(data.funil.reduce((s, f) => s + f.count, 0));
</script>

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Desempenho</h1>
	<p class="text-sm text-grey">Indicadores dos últimos 30 dias e funil de vendas.</p>
</div>

<div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
	{#each stats as s (s.label)}
		<Card padding="sm">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0">
					<div class="text-xs uppercase tracking-wide text-grey font-semibold leading-tight">{s.label}</div>
					<div class="text-2xl font-bold mt-1 tabular-nums {s.accent}">{s.value}</div>
				</div>
				<span class="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] bg-bg text-slate">
					<Icon name={s.icon} size={16} />
				</span>
			</div>
		</Card>
	{/each}
</div>

<Card class="mt-6">
	<div class="flex items-center justify-between gap-2 mb-4">
		<div>
			<h2 class="text-sm font-semibold text-navy">Funil de vendas</h2>
			<p class="text-sm text-grey">Negócios em aberto por etapa</p>
		</div>
		<a class="text-sm text-brand hover:underline" href="/comercial">Abrir Comercial</a>
	</div>

	{#if data.crmPendente}
		<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
			O CRM ainda não foi ativado no banco. Aplique a migration
			<code class="font-mono">supabase/migrations/0005_crm.sql</code>.
		</div>
	{:else if !totalFunil}
		<p class="py-6 text-center text-sm text-grey">Nenhum negócio em aberto ainda. Cadastre no CRM.</p>
	{:else}
		<div class="space-y-2.5">
			{#each data.funil as f (f.nome)}
				<div class="flex items-center gap-3">
					<div class="w-24 sm:w-40 shrink-0 flex items-center gap-2 text-sm text-navy truncate">
						<span class="size-2.5 rounded-full shrink-0 {stageDot(f.cor)}"></span>
						<span class="truncate">{f.nome}</span>
					</div>
					<div class="flex-1 h-6 rounded-[var(--radius-sm)] bg-bg overflow-hidden">
						<div
							class="h-full rounded-[var(--radius-sm)] {stageDot(f.cor)} transition-all"
							style="width: {Math.round((f.count / maxCount) * 100)}%"
						></div>
					</div>
					<div class="w-24 sm:w-40 shrink-0 text-right text-sm tabular-nums text-slate">
						{f.count} · {formatBRL(f.valor)}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</Card>
