<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { CONTRATO_STATUS, contratoStatusTone, contratoStatusLabel, formatBRL } from '$lib/contratos';
	import { Card, Badge, Button, Select, EmptyState, DataTable, Modal } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	import ContratoForm from '$lib/components/ContratoForm.svelte';
	import { toast } from '$lib/toast.svelte';
	import { page } from '$app/state';
	import { podeEditar } from '$lib/permissoes';

	let { data, form } = $props();
	const perms = $derived(page.data.permissoes);
	// O form vem de actions de outras rotas (/contratos/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);
	let status = $state(data.status);
	// Re-sincroniza o filtro com a URL (back/forward do navegador).
	$effect(() => {
		status = data.status;
	});

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}

	type Contrato = (typeof data.contratos)[number];
	const columns: ColumnDef<Contrato>[] = [
		{ id: 'cliente', accessorFn: (c) => c.cliente?.nome ?? '', meta: { label: 'Cliente' } },
		{ id: 'plano', accessorFn: (c) => c.plano?.nome ?? '', meta: { label: 'Plano' } },
		{
			id: 'valor',
			accessorFn: (c) => c.valor_mensal ?? 0,
			meta: { label: 'Valor mensal', thClass: 'text-right' }
		},
		{ id: 'vigencia', accessorFn: (c) => c.data_inicio ?? '', meta: { label: 'Vigência' } },
		{
			id: 'renovacao',
			accessorFn: (c) => (c.renovacao_automatica ? 'Automática' : 'Manual'),
			meta: { label: 'Renovação' }
		},
		{ id: 'status', accessorFn: (c) => c.status ?? '', meta: { label: 'Status' } },
		{ id: 'acoes', accessorFn: () => '', meta: { label: '' } }
	];

	let novoAberto = $state(false);
	let editando = $state<Contrato | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Contrato criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Contrato salvo');
		invalidateAll();
	}
</script>

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Contratos</h1>
	<p class="text-sm text-grey">Contratos ativos, suspensos e encerrados dos clientes.</p>
</div>

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
		{#if podeEditar(perms, 'contratos')}
			<Button onclick={() => (novoAberto = true)}>+ Novo contrato</Button>
		{/if}
	</div>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
		Erro ao carregar: {data.loadError}
	</div>
{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.contratos} initialSort={[{ id: 'cliente', desc: false }]}>
		{#snippet row(r)}
			{@const c = r.original}
			<tr
				class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
				onclick={() => podeEditar(perms, 'contratos') && (editando = c)}
			>
				<td class="px-4 py-3 font-medium text-navy">{c.cliente?.nome ?? '—'}</td>
				<td class="px-4 py-3">{c.plano?.nome ?? '—'}</td>
				<td class="px-4 py-3 text-right tabular-nums">{formatBRL(c.valor_mensal)}</td>
				<td class="px-4 py-3 whitespace-nowrap">{fmtData(c.data_inicio)} → {fmtData(c.data_fim)}</td>
				<td class="px-4 py-3">{c.renovacao_automatica ? 'Automática' : 'Manual'}</td>
				<td class="px-4 py-3"><Badge tone={contratoStatusTone(c.status)}>{contratoStatusLabel(c.status)}</Badge></td>
				<td class="px-4 py-3 text-right">
					<a class="text-sm text-brand hover:underline" href={`/contratos/${c.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="7" class="px-2"><EmptyState icon="file" title="Nenhum contrato ainda" description="Cadastre os contratos dos clientes." /></td></tr>
		{/snippet}
	</DataTable>
</Card>

<Modal open={novoAberto} title="Novo contrato" size="lg" onClose={() => (novoAberto = false)}>
	<ContratoForm
		action="/contratos/novo"
		submitLabel="Criar contrato"
		clientes={data.clientes}
		planos={data.planos}
		contrato={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar contrato" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<ContratoForm
			action={`/contratos/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			clientes={data.clientes}
			planos={data.planos}
			contrato={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
