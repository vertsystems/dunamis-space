<script lang="ts">
	import { Card, Input, Button, EmptyState } from '$lib/components/ui';
	import { formatBRL, iniciais, type RankingLinha } from '$lib/crm';

	let {
		ranking,
		mesLabel,
		metasPendente = false,
		onSetMeta
	}: {
		ranking: RankingLinha[];
		mesLabel: string;
		metasPendente?: boolean;
		onSetMeta: (colaboradorId: string, valor: number) => void;
	} = $props();

	let editId = $state<string | null>(null);
	let editValor = $state('');

	function abrirEdicao(l: RankingLinha) {
		editId = l.colaborador_id;
		editValor = l.meta ? String(l.meta) : '';
	}
	function salvar(id: string) {
		onSetMeta(id, Number(editValor) || 0);
		editId = null;
	}

	const totalGanho = $derived(ranking.reduce((s, l) => s + l.valor_ganho, 0));
	const totalMeta = $derived(ranking.reduce((s, l) => s + l.meta, 0));
</script>

{#if metasPendente}
	<div class="rounded-[var(--radius-lg)] bg-brand-amber/15 px-5 py-4 text-sm text-brand-brown">
		<p class="font-semibold mb-1">Metas ainda não ativadas.</p>
		<p>
			Aplique a migration <code class="font-mono">supabase/migrations/0007_crm_metas.sql</code> no SQL
			Editor do Supabase para definir metas por vendedor.
		</p>
	</div>
{:else}
	<Card padding="none" class="overflow-hidden">
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-grey-200 px-5 py-4">
			<div>
				<h2 class="text-base font-semibold text-navy">Ranking & metas</h2>
				<p class="text-xs text-grey">Fechados no mês vs meta · {mesLabel}</p>
			</div>
			<div class="text-right">
				<div class="text-lg font-bold text-brand-green tabular-nums">{formatBRL(totalGanho)}</div>
				<div class="text-xs text-grey">de {formatBRL(totalMeta)} em metas</div>
			</div>
		</div>

		{#if ranking.length}
			<div class="divide-y divide-grey-200/60">
				{#each ranking as l, i (l.colaborador_id)}
					<div class="flex items-center gap-3 px-5 py-3.5">
						<div
							class="w-5 shrink-0 text-center text-sm font-bold tabular-nums {i < 3
								? 'text-brand'
								: 'text-grey'}"
						>
							{i + 1}
						</div>
						<span
							class="grid size-8 shrink-0 place-items-center rounded-full bg-navy text-[0.6rem] font-bold text-white"
							>{iniciais(l.nome)}</span
						>
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<span class="truncate font-medium text-navy">{l.nome}</span>
								<span class="shrink-0 text-sm font-semibold text-navy tabular-nums"
									>{formatBRL(l.valor_ganho)}</span
								>
							</div>
							<div class="mt-1.5 flex items-center gap-2">
								<div class="h-2 flex-1 overflow-hidden rounded-full bg-bg">
									<div
										class="h-full rounded-full {l.progresso >= 100 ? 'bg-brand-green' : 'bg-brand'}"
										style="width: {Math.min(l.progresso, 100)}%"
									></div>
								</div>
								<span
									class="shrink-0 text-xs tabular-nums {l.progresso >= 100
										? 'font-semibold text-brand-green'
										: 'text-grey'}">{l.meta ? `${l.progresso}%` : '—'}</span
								>
							</div>
							<div class="mt-1 flex items-center justify-between gap-2 text-xs text-grey">
								<span
									>{l.ganhos_qtd} negócio{l.ganhos_qtd === 1 ? '' : 's'} ganho{l.ganhos_qtd === 1
										? ''
										: 's'}</span
								>
								{#if editId === l.colaborador_id}
									<span class="flex items-center gap-1">
										<Input
											type="number"
											step="0.01"
											min="0"
											bind:value={editValor}
											placeholder="Meta R$"
											wrapperClass="w-28"
										/>
										<Button size="sm" onclick={() => salvar(l.colaborador_id)}>Salvar</Button>
										<Button size="sm" variant="ghost" onclick={() => (editId = null)}>Cancelar</Button>
									</span>
								{:else}
									<button
										type="button"
										class="text-brand hover:underline"
										onclick={() => abrirEdicao(l)}
									>
										Meta: {l.meta ? formatBRL(l.meta) : 'definir'}
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<EmptyState
				icon="chart"
				title="Sem vendedores"
				description="Cadastre colaboradores para acompanhar metas e ranking."
			/>
		{/if}
	</Card>
{/if}
