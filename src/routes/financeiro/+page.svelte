<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import {
		TRANSACAO_TIPO,
		TRANSACAO_STATUS,
		statusTone,
		statusLabel,
		formatBRL
	} from '$lib/financeiro';
	import { Card, Badge, Button, Select, EmptyState, DataTable, Modal } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
	import TransacaoForm from '$lib/components/TransacaoForm.svelte';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	// O form vem de actions de outras rotas (/financeiro/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	type Transacao = (typeof data.transacoes)[number];
	const columns: ColumnDef<Transacao>[] = [
		{ id: 'competencia', accessorFn: (t) => t.data_competencia ?? '', meta: { label: 'Competência' } },
		{ id: 'descricao', accessorFn: (t) => t.descricao ?? '', meta: { label: 'Descrição' } },
		{ id: 'categoria', accessorFn: (t) => t.categoria ?? '', meta: { label: 'Categoria' } },
		{ id: 'cliente', accessorFn: (t) => t.cliente?.nome ?? '', meta: { label: 'Cliente' } },
		{ id: 'status', accessorFn: (t) => statusLabel(t.status), meta: { label: 'Status' } },
		{
			id: 'valor',
			accessorFn: (t) => (t.tipo === 'receita' ? 1 : -1) * Number(t.valor ?? 0),
			meta: { label: 'Valor', thClass: 'text-right' }
		},
		{ id: 'acoes', accessorFn: () => '', meta: { label: '' } }
	];
	let tipo = $state(data.tipo);
	let status = $state(data.status);
	// Re-sincroniza os filtros com a URL (back/forward do navegador).
	$effect(() => {
		tipo = data.tipo;
		status = data.status;
	});

	let novoAberto = $state(false);
	let editando = $state<Transacao | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Transação criada');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Transação salva');
		invalidateAll();
	}

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="mb-4">
	<h1 class="text-xl font-bold text-navy">Financeiro</h1>
	<p class="text-sm text-grey">Receitas, despesas e saldo do período.</p>
</div>

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
		<Button onclick={() => (novoAberto = true)}>+ Nova transação</Button>
	</div>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<Card padding="none" class="overflow-hidden">
	<DataTable {columns} data={data.transacoes} initialSort={[{ id: 'competencia', desc: true }]}>
		{#snippet row(r)}
			{@const t = r.original}
			{@const receita = t.tipo === 'receita'}
			<tr class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg" onclick={() => (editando = t)}>
				<td class="px-4 py-3 whitespace-nowrap">{fmtData(t.data_competencia)}</td>
				<td class="px-4 py-3 font-medium text-navy">{t.descricao ?? '—'}</td>
				<td class="px-4 py-3">{t.categoria ?? '—'}</td>
				<td class="px-4 py-3">{t.cliente?.nome ?? '—'}</td>
				<td class="px-4 py-3"><Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge></td>
				<td class="px-4 py-3 text-right tabular-nums font-medium {receita ? 'text-brand-green' : 'text-brand-danger'}">
					{receita ? '+' : '−'}{formatBRL(t.valor)}
				</td>
				<td class="px-4 py-3 text-right">
					<a class="text-sm text-brand hover:underline" href={`/financeiro/${t.id}`} onclick={(e) => e.stopPropagation()}>Abrir</a>
				</td>
			</tr>
		{/snippet}
		{#snippet empty()}
			<tr><td colspan="7" class="px-2"><EmptyState icon="dollar" title="Nenhuma transação ainda" description="Registre receitas e despesas para acompanhar o caixa." /></td></tr>
		{/snippet}
	</DataTable>
</Card>

<Modal open={novoAberto} title="Nova transação" size="lg" onClose={() => (novoAberto = false)}>
	<TransacaoForm
		action="/financeiro/novo"
		submitLabel="Criar transação"
		clientes={data.clientes}
		transacao={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar transação" size="lg" onClose={() => (editando = null)}>
	{#if editando}
		<TransacaoForm
			action={`/financeiro/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			clientes={data.clientes}
			transacao={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
