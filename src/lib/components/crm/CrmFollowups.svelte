<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';
	import { formatBRL, type FollowupLinha } from '$lib/crm';

	let {
		followups,
		onOpen
	}: { followups: FollowupLinha[]; onOpen: (id: string) => void } = $props();
</script>

<Card padding="none" class="flex flex-col overflow-hidden">
	<div class="flex items-center justify-between gap-2 border-b border-grey-200 px-5 py-3.5">
		<div>
			<h2 class="text-base font-semibold text-navy">Follow-ups pendentes</h2>
			<p class="text-xs text-grey">Negócios que precisam de atenção</p>
		</div>
		<Badge tone={followups.length ? 'danger' : 'success'}>
			{followups.length ? followups.length : 'em dia'}
		</Badge>
	</div>

	{#if followups.length}
		<div class="max-h-72 divide-y divide-grey-200/60 overflow-y-auto">
			{#each followups as f (f.id)}
				<button
					type="button"
					class="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-bg"
					onclick={() => onOpen(f.id)}
				>
					<div class="min-w-0 flex-1">
						<div class="truncate font-medium text-navy">{f.titulo}</div>
						<div class="truncate text-xs text-grey">
							{f.contato ?? '—'}{f.responsavel_nome ? ` · ${f.responsavel_nome}` : ''}
						</div>
					</div>
					<div class="shrink-0 text-right">
						{#if f.situacao === 'atrasada'}
							<Badge tone="danger">{f.dias && f.dias > 0 ? `${f.dias}d atrás` : 'hoje'}</Badge>
						{:else}
							<Badge tone="warning">sem follow-up</Badge>
						{/if}
						{#if f.valor > 0}
							<div class="mt-0.5 text-xs text-slate tabular-nums">{formatBRL(f.valor)}</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<p class="px-5 py-8 text-center text-sm text-grey">
			Tudo em dia — nenhum follow-up pendente. 🎯
		</p>
	{/if}
</Card>
