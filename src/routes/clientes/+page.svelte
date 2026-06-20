<script lang="ts">
	import { goto } from '$app/navigation';
	import { CLIENTE_STATUS, statusTone, statusLabel, formatBRL } from '$lib/clientes';
	import { Card, Badge, Button, Input, Select } from '$lib/components/ui';

	let { data } = $props();

	let q = $state(data.q);
	let status = $state(data.status);
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex flex-wrap items-end gap-2" method="GET">
		<Input type="search" name="q" placeholder="Buscar por nome" bind:value={q} wrapperClass="w-56" />
		<Select name="status" bind:value={status} wrapperClass="w-48">
			<option value="">Todos os status</option>
			{#each CLIENTE_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</Select>
		<Button variant="secondary" type="submit">Filtrar</Button>
	</form>
	<Button onclick={() => goto('/clientes/novo')}>+ Novo cliente</Button>
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
					<th class="px-4 py-3 font-semibold">Nome</th>
					<th class="px-4 py-3 font-semibold">Status</th>
					<th class="px-4 py-3 font-semibold">Segmento</th>
					<th class="px-4 py-3 font-semibold">Responsável</th>
					<th class="px-4 py-3 font-semibold text-right">MRR</th>
				</tr>
			</thead>
			<tbody>
				{#each data.clientes as c (c.id)}
					<tr
						class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
						onclick={() => goto(`/clientes/${c.id}`)}
					>
						<td class="px-4 py-3">
							<a class="text-brand hover:underline" href={`/clientes/${c.id}`}>{c.nome}</a>
							{#if c.contato_email}<div class="text-xs text-grey">{c.contato_email}</div>{/if}
						</td>
						<td class="px-4 py-3">
							<Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
						</td>
						<td class="px-4 py-3">{c.segmento ?? '—'}</td>
						<td class="px-4 py-3">{c.responsavel?.nome ?? '—'}</td>
						<td class="px-4 py-3 text-right tabular-nums">{formatBRL(c.mrr)}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-4 py-12 text-center text-grey">
							Nenhum cliente ainda. Clique em “Novo cliente” para começar.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Card>
