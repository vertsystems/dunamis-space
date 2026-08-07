<script lang="ts">
	// O que entrou e o que saiu nos últimos 30 dias. Diferente do KPI do mês,
	// que zera no dia 1º — aqui a semana passada continua visível.
	import { Card, Badge } from '$lib/components/ui';
	import { formatBRL, formatData, type Fechamentos } from '$lib/crm';

	let {
		fechamentos: f,
		onAbrir
	}: { fechamentos: Fechamentos; onAbrir: (id: string) => void } = $props();
</script>

<Card padding="none" class="flex flex-col overflow-hidden">
	<div class="border-b border-grey-200 px-5 py-3.5">
		<h2 class="text-sm font-semibold text-navy">Fechamentos</h2>
		<p class="text-xs text-grey">Últimos {f.dias} dias</p>
		<div class="mt-2.5 flex gap-4">
			<div>
				<div class="text-[0.6rem] font-semibold uppercase tracking-wide text-grey">Ganhos</div>
				<div class="text-sm font-semibold tabular-nums text-brand-green">
					{formatBRL(f.ganhos_valor)}
					<span class="text-xs font-normal text-grey">({f.ganhos_qtd})</span>
				</div>
			</div>
			<div>
				<div class="text-[0.6rem] font-semibold uppercase tracking-wide text-grey">Perdidos</div>
				<div class="text-sm font-semibold tabular-nums text-brand-danger">
					{formatBRL(f.perdidos_valor)}
					<span class="text-xs font-normal text-grey">({f.perdidos_qtd})</span>
				</div>
			</div>
		</div>
	</div>

	{#if f.recentes.length}
		<div class="max-h-64 divide-y divide-grey-200/60 overflow-y-auto">
			{#each f.recentes as l (l.id)}
				<button
					type="button"
					class="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-bg"
					onclick={() => onAbrir(l.id)}
				>
					<div class="min-w-0 flex-1">
						<div class="truncate text-sm font-medium text-navy">{l.titulo}</div>
						<div class="truncate text-xs text-grey">
							{formatData(l.quando)}{l.contato ? ` · ${l.contato}` : ''}{l.motivo_perda
								? ` · ${l.motivo_perda}`
								: ''}
						</div>
					</div>
					<div class="shrink-0 text-right">
						<Badge tone={l.status === 'ganho' ? 'success' : 'danger'}>
							{l.status === 'ganho' ? 'ganho' : 'perdido'}
						</Badge>
						{#if l.valor > 0}
							<div class="mt-0.5 text-xs tabular-nums text-slate">{formatBRL(l.valor)}</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<p class="px-5 py-8 text-center text-sm text-grey">
			Nenhum negócio fechado nos últimos {f.dias} dias.
		</p>
	{/if}
</Card>
