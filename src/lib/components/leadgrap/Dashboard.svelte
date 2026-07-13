<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';
	import type { BadgeTone } from '$lib/components/ui';
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import {
		STAGES,
		STAGE_COLOR,
		STAGE_LABEL,
		formatCurrency,
		followupInfo,
		pct,
		type LeadStage
	} from '$lib/leadgrap/types';

	let { onIrParaLeads }: { onIrParaLeads?: () => void } = $props();

	const leads = $derived(leadgrap.leads);
	const total = $derived(leads.length);
	const withEmail = $derived(leads.filter((l) => l.email).length);
	const withoutWebsite = $derived(leads.filter((l) => !l.hasWebsite).length);

	const byStage = $derived(
		STAGES.map((s) => ({
			stage: s.value,
			label: s.label,
			count: leads.filter((l) => l.stage === s.value).length
		}))
	);
	const converted = $derived(byStage.find((s) => s.stage === 'CONVERTIDO')?.count ?? 0);
	const conversionRate = $derived(pct(converted, total));
	const pipelineValue = $derived(
		leads
			.filter((l) => l.stage === 'EM_NEGOCIACAO' || l.stage === 'CONVERTIDO')
			.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)
	);

	const byCategory = $derived.by(() => {
		const m = new Map<string, number>();
		for (const l of leads) if (l.category) m.set(l.category, (m.get(l.category) ?? 0) + 1);
		return [...m.entries()]
			.map(([category, count]) => ({ category, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 8);
	});
	const maxCategory = $derived(Math.max(1, ...byCategory.map((c) => c.count)));

	const followups = $derived.by(() => {
		const endOfToday = new Date();
		endOfToday.setHours(23, 59, 59, 999);
		return leads
			.filter(
				(l) =>
					l.nextContactAt &&
					new Date(l.nextContactAt) <= endOfToday &&
					l.stage !== 'CONVERTIDO' &&
					l.stage !== 'PERDIDO'
			)
			.sort((a, b) => new Date(a.nextContactAt!).getTime() - new Date(b.nextContactAt!).getTime())
			.slice(0, 15);
	});

	const recentJobs = $derived(leadgrap.scrapeJobs.slice(0, 5));

	const KPIS = $derived([
		{ label: 'Total de leads', value: String(total), hint: '', color: 'var(--color-brand)' },
		{ label: 'Com e-mail', value: `${pct(withEmail, total)}%`, hint: `${withEmail} leads`, color: 'var(--color-success, #17b26a)' },
		{ label: 'Sem site (oportunidades)', value: String(withoutWebsite), hint: `${pct(withoutWebsite, total)}% do total`, color: 'var(--color-warning, #f5a524)' },
		{ label: 'Taxa de conversão', value: `${conversionRate}%`, hint: `${converted} convertidos`, color: 'var(--color-brand-danger, #f04438)' }
	]);
</script>

<div class="space-y-5">
	<!-- KPIs -->
	<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
		{#each KPIS as k (k.label)}
			<Card>
				<div class="h-1 rounded-full" style="background: {k.color}"></div>
				<p class="mt-3 text-xs text-grey">{k.label}</p>
				<p class="mt-1 text-3xl font-bold text-navy">{k.value}</p>
				{#if k.hint}<p class="mt-0.5 text-xs text-grey">{k.hint}</p>{/if}
			</Card>
		{/each}
	</div>

	<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
		<!-- Funil -->
		<Card>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-sm font-semibold text-navy">Funil por estágio</h3>
				<span class="text-xs text-grey">Pipeline: <strong class="text-navy">{formatCurrency(pipelineValue)}</strong></span>
			</div>
			<div class="space-y-3">
				{#each byStage as s (s.stage)}
					<div>
						<div class="mb-1 flex items-center justify-between text-xs">
							<span class="flex items-center gap-1.5 text-navy">
								<span class="size-2 rounded-full" style="background: {STAGE_COLOR[s.stage as LeadStage]}"></span>
								{s.label}
							</span>
							<span class="text-grey">{s.count}</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-bg">
							<div class="h-full rounded-full transition-all duration-500" style="width: {pct(s.count, total)}%; background: {STAGE_COLOR[s.stage as LeadStage]}"></div>
						</div>
					</div>
				{/each}
			</div>
		</Card>

		<!-- Top categorias -->
		<Card>
			<h3 class="mb-4 text-sm font-semibold text-navy">Top categorias</h3>
			{#if byCategory.length === 0}
				<p class="text-sm text-grey">Sem dados ainda.</p>
			{:else}
				<div class="space-y-2.5">
					{#each byCategory as c (c.category)}
						<div class="flex items-center gap-3 text-xs">
							<span class="w-28 shrink-0 truncate text-navy" title={c.category}>{c.category}</span>
							<div class="h-2 flex-1 overflow-hidden rounded-full bg-bg">
								<div class="h-full rounded-full bg-brand" style="width: {pct(c.count, maxCategory)}%"></div>
							</div>
							<span class="w-6 text-right text-grey">{c.count}</span>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	</div>

	<!-- Follow-ups -->
	<Card>
		<div class="mb-3 flex items-center gap-2">
			<h3 class="text-sm font-semibold text-navy">Follow-ups</h3>
			<Badge tone="warning">{followups.length}</Badge>
		</div>
		{#if followups.length === 0}
			<p class="text-sm text-grey">Nenhum follow-up pendente para hoje. 🎉</p>
		{:else}
			<ul class="divide-y divide-grey-100">
				{#each followups as l (l.id)}
					{@const f = followupInfo(l.nextContactAt!)}
					<li class="flex items-center justify-between gap-3 py-2 text-sm">
						<button class="min-w-0 truncate text-left text-navy hover:text-brand" onclick={onIrParaLeads}>
							{l.name}{#if l.category}<span class="text-grey"> · {l.category}</span>{/if}
						</button>
						<div class="flex shrink-0 items-center gap-2">
							{#if l.assignedToName}<span class="text-xs text-grey">{l.assignedToName}</span>{/if}
							<Badge tone={f.tone as BadgeTone}>{f.label}</Badge>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>

	<!-- Capturas recentes -->
	<Card>
		<h3 class="mb-3 text-sm font-semibold text-navy">Capturas recentes</h3>
		{#if recentJobs.length === 0}
			<p class="text-sm text-grey">Nenhuma captura ainda.</p>
		{:else}
			<ul class="space-y-2">
				{#each recentJobs as j (j.id)}
					<li class="flex items-center justify-between gap-3 text-sm">
						<span class="min-w-0 truncate text-navy">{j.query}</span>
						<Badge tone="neutral">{j.saved} leads</Badge>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</div>
