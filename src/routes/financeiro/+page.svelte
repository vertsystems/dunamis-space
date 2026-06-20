<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		TRANSACAO_TIPO,
		TRANSACAO_STATUS,
		statusTone,
		statusLabel,
		formatBRL
	} from '$lib/financeiro';
	import { Card, Badge, Button, Select } from '$lib/components/ui';

	let { data } = $props();
	let tipo = $state(data.tipo);
	let status = $state(data.status);

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
	<Card>
		<div class="text-xs uppercase tracking-wide text-grey font-semibold">Receitas</div>
		<div class="text-3xl font-bold mt-1 text-brand-green">{formatBRL(data.receitas)}</div>
	</Card>
	<Card>
		<div class="text-xs uppercase tracking-wide text-grey font-semibold">Despesas</div>
		<div class="text-3xl font-bold mt-1 text-brand-danger">{formatBRL(data.despesas)}</div>
	</Card>
	<Card>
		<div class="text-xs uppercase tracking-wide text-grey font-semibold">Saldo</div>
		<div class="text-3xl font-bold mt-1 {data.saldo >= 0 ? 'text-brand-green' : 'text-brand-danger'}">
			{formatBRL(data.saldo)}
		</div>
	</Card>
</div>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex flex-wrap items-end gap-2" method="GET">
		<Select name="tipo" bind:value={tipo} wrapperClass="w-44">
			<option value="">Todos os tipos</option>
			{#each TRANSACAO_TIPO as t (t.value)}
				<option value={t.value}>{t.label}</option>
			{/each}
		</Select>
		<Select name="status" bind:value={status} wrapperClass="w-44">
			<option value="">Todos os status</option>
			{#each TRANSACAO_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</Select>
		<Button variant="secondary" type="submit">Filtrar</Button>
	</form>
	<div class="flex gap-2">
		<Button variant="secondary" onclick={() => goto('/financeiro/lucro')}>Lucro por cliente</Button>
		<Button onclick={() => goto('/financeiro/novo')}>+ Nova transação</Button>
	</div>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Competência</th>
					<th class="px-4 py-3 font-semibold">Descrição</th>
					<th class="px-4 py-3 font-semibold">Categoria</th>
					<th class="px-4 py-3 font-semibold">Cliente</th>
					<th class="px-4 py-3 font-semibold">Status</th>
					<th class="px-4 py-3 font-semibold text-right">Valor</th>
				</tr>
			</thead>
			<tbody>
				{#each data.transacoes as t (t.id)}
					{@const receita = t.tipo === 'receita'}
					<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/financeiro/${t.id}`)}>
						<td class="px-4 py-3 whitespace-nowrap">{fmtData(t.data_competencia)}</td>
						<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/financeiro/${t.id}`}>{t.descricao ?? '—'}</a></td>
						<td class="px-4 py-3">{t.categoria ?? '—'}</td>
						<td class="px-4 py-3">{t.cliente?.nome ?? '—'}</td>
						<td class="px-4 py-3"><Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge></td>
						<td class="px-4 py-3 text-right tabular-nums font-medium {receita ? 'text-brand-green' : 'text-brand-danger'}">
							{receita ? '+' : '−'}{formatBRL(t.valor)}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-4 py-12 text-center text-grey">
							Nenhuma transação ainda. Clique em “Nova transação” para começar.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
