<script lang="ts">
	import { goto } from '$app/navigation';
	import { PROJETO_STATUS, projetoStatusTone, projetoStatusLabel, projetoTipoLabel } from '$lib/projetos';
	import { Card, Badge, Button, Select, EmptyState, DataTable } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';

	let { data } = $props();
	let status = $state(data.status);
	// Re-sincroniza o filtro com a URL (back/forward do navegador).
	$effect(() => {
		status = data.status;
	});

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}

	type Projeto = (typeof data.projetos)[number];
	const columns: ColumnDef<Projeto>[] = [
		{ id: 'projeto', accessorFn: (p) => p.nome ?? '', meta: { label: 'Projeto' } },
		{ id: 'cliente', accessorFn: (p) => p.cliente?.nome ?? '', meta: { label: 'Cliente' } },
		{ id: 'tipo', accessorFn: (p) => projetoTipoLabel(p.tipo), meta: { label: 'Tipo' } },
		{ id: 'responsavel', accessorFn: (p) => p.responsavel?.nome ?? '', meta: { label: 'Responsável' } },
		{ id: 'prazo', accessorFn: (p) => p.prazo ?? '', meta: { label: 'Prazo' } },
		{ id: 'status', accessorFn: (p) => projetoStatusLabel(p.status), meta: { label: 'Status' } }
	];
</script>

<div class="mb-4">
	<h1 class="text-xl font-bold text-navy">Projetos</h1>
	<p class="text-sm text-grey">Projetos e jobs dos clientes.</p>
</div>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<form class="flex items-end gap-2" method="GET">
		<Select name="status" bind:value={status} wrapperClass="w-48">
			<option value="">Todos os status</option>
			{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
		</Select>
		<Button variant="secondary" type="submit">Filtrar</Button>
	</form>
	<Button onclick={() => goto('/projetos/novo')}>+ Novo projeto</Button>
</div>

{#if data.loadError}<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.projetos} initialSort={[{ id: 'projeto', desc: false }]}>
		{#snippet row(r)}
			{@const p = r.original}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => goto(`/projetos/${p.id}`)}>
				<td class="px-4 py-3"><a class="text-brand hover:underline" href={`/projetos/${p.id}`}>{p.nome}</a></td>
				<td class="px-4 py-3">{p.cliente?.nome ?? '—'}</td>
				<td class="px-4 py-3">{projetoTipoLabel(p.tipo)}</td>
				<td class="px-4 py-3">{p.responsavel?.nome ?? '—'}</td>
				<td class="px-4 py-3 whitespace-nowrap">{fmtData(p.prazo)}</td>
				<td class="px-4 py-3"><Badge tone={projetoStatusTone(p.status)}>{projetoStatusLabel(p.status)}</Badge></td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="6" class="px-2"><EmptyState icon="folder" title="Nenhum projeto ainda" description="Crie projetos e jobs para os clientes." /></td></tr>
		{/snippet}
	</DataTable>
</Card>
