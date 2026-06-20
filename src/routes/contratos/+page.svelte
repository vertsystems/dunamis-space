<script lang="ts">
	import { goto } from '$app/navigation';
	import { CONTRATO_STATUS, contratoStatusTone, contratoStatusLabel, formatBRL } from '$lib/contratos';
	import { Card, Badge, Button, Select } from '$lib/components/ui';

	let { data } = $props();
	let status = $state(data.status);

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex items-end gap-2" method="GET">
		<Select name="status" bind:value={status} wrapperClass="w-48">
			<option value="">Todos os status</option>
			{#each CONTRATO_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</Select>
		<Button variant="secondary" type="submit">Filtrar</Button>
	</form>
	<div class="flex gap-2">
		<Button variant="secondary" onclick={() => goto('/contratos/planos')}>Gerenciar planos</Button>
		<Button onclick={() => goto('/contratos/novo')}>+ Novo contrato</Button>
	</div>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
		Erro ao carregar: {data.loadError}
	</div>
{/if}

<Card padding="none" class="overflow-hidden">
	<div class="overflow-x-auto">
		<table class="w-full text-sm">
			<thead>
				<tr class="border-b border-grey-200 text-left text-xs uppercase tracking-wide text-grey">
					<th class="px-4 py-3 font-semibold">Cliente</th>
					<th class="px-4 py-3 font-semibold">Plano</th>
					<th class="px-4 py-3 font-semibold text-right">Valor mensal</th>
					<th class="px-4 py-3 font-semibold">Vigência</th>
					<th class="px-4 py-3 font-semibold">Renovação</th>
					<th class="px-4 py-3 font-semibold">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.contratos as c (c.id)}
					<tr
						class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
						onclick={() => goto(`/contratos/${c.id}`)}
					>
						<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/contratos/${c.id}`}>{c.cliente?.nome ?? '—'}</a></td>
						<td class="px-4 py-3">{c.plano?.nome ?? '—'}</td>
						<td class="px-4 py-3 text-right tabular-nums">{formatBRL(c.valor_mensal)}</td>
						<td class="px-4 py-3 whitespace-nowrap">{fmtData(c.data_inicio)} → {fmtData(c.data_fim)}</td>
						<td class="px-4 py-3">{c.renovacao_automatica ? 'Automática' : 'Manual'}</td>
						<td class="px-4 py-3"><Badge tone={contratoStatusTone(c.status)}>{contratoStatusLabel(c.status)}</Badge></td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-4 py-12 text-center text-grey">
							Nenhum contrato ainda. Cadastre os planos e crie o primeiro contrato.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
