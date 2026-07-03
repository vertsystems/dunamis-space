<script lang="ts">
	import { goto } from '$app/navigation';
	import { funcaoLabel } from '$lib/equipe';
	import { formatBRL } from '$lib/clientes';
	import { Card, Badge, Button, EmptyState, DataTable } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';

	let { data } = $props();

	type Colaborador = (typeof data.colaboradores)[number];
	const columns: ColumnDef<Colaborador>[] = [
		{ id: 'nome', accessorFn: (c) => c.nome ?? '', meta: { label: 'Nome' } },
		{ id: 'email', accessorFn: (c) => c.email ?? '', meta: { label: 'E-mail' } },
		{ id: 'funcao', accessorFn: (c) => funcaoLabel(c.funcao), meta: { label: 'Função' } },
		{ id: 'custo_hora', accessorFn: (c) => c.custo_hora ?? 0, meta: { label: 'Custo/hora', thClass: 'text-right' } },
		{ id: 'status', accessorFn: (c) => (c.ativo ? 'Ativo' : 'Inativo'), meta: { label: 'Status' } }
	];
</script>

<div class="flex items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl font-bold text-navy">Equipe</h1>
		<p class="text-sm text-grey">Time da agência e custos por hora.</p>
	</div>
	<Button onclick={() => goto('/equipe/novo')}>+ Novo colaborador</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.colaboradores} initialSort={[{ id: 'nome', desc: false }]}>
		{#snippet row(r)}
			{@const c = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/equipe/${c.id}`)}>
				<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/equipe/${c.id}`}>{c.nome}</a></td>
				<td class="px-4 py-3">{c.email}</td>
				<td class="px-4 py-3">{funcaoLabel(c.funcao)}</td>
				<td class="px-4 py-3 text-right tabular-nums">{c.custo_hora != null ? formatBRL(c.custo_hora) : '—'}</td>
				<td class="px-4 py-3"><Badge tone={c.ativo ? 'success' : 'neutral'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="5" class="px-2"><EmptyState icon="users" title="Nenhum colaborador ainda" description="Cadastre o time da agência." /></td></tr>
		{/snippet}
	</DataTable>
</Card>
