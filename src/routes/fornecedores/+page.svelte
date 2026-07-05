<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button, Card, Badge, Input, Select, Textarea, Checkbox, EmptyState, DataTable } from '$lib/components/ui';
	import type { BadgeTone, ColumnDef } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/toast.svelte';
	import { formatBRL } from '$lib/clientes';
	import CrmModal from '$lib/components/crm/CrmModal.svelte';
	import type { Fornecedor } from './+page.server';

	let { data } = $props();

	const tipoTone: Record<string, BadgeTone> = {
		freelancer: 'neutral',
		fornecedor: 'info',
		parceiro: 'brand'
	};
	const tipoLabel: Record<string, string> = {
		freelancer: 'Freelancer',
		fornecedor: 'Fornecedor',
		parceiro: 'Parceiro'
	};

	// ---------------- Modal (criar / editar) ----------------
	let modalAberto = $state(false);
	let editando = $state<Fornecedor | null>(null);
	let ativoChecked = $state(true);
	let saving = $state(false);
	let deleting = $state(false);

	function abrirNovo() {
		editando = null;
		ativoChecked = true;
		modalAberto = true;
	}
	function abrirEdicao(f: Fornecedor) {
		editando = f;
		ativoChecked = f.ativo;
		modalAberto = true;
	}
	function fechar() {
		modalAberto = false;
	}

	function custoValor(f: Fornecedor | null): string {
		return f?.custo_referencia != null
			? f.custo_referencia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
			: '';
	}

	function contato(f: Fornecedor): string {
		return [f.email, f.telefone].filter(Boolean).join(' · ');
	}

	const columns: ColumnDef<Fornecedor>[] = [
		{ id: 'nome', accessorFn: (f) => f.nome ?? '', meta: { label: 'Nome' } },
		{ id: 'tipo', accessorFn: (f) => tipoLabel[f.tipo] ?? f.tipo, meta: { label: 'Tipo' } },
		{ id: 'especialidade', accessorFn: (f) => f.especialidade ?? '', meta: { label: 'Especialidade' } },
		{ id: 'contato', accessorFn: (f) => contato(f), meta: { label: 'Contato' } },
		{
			id: 'custo',
			accessorFn: (f) => f.custo_referencia ?? 0,
			meta: { label: 'Custo ref.', thClass: 'text-right' }
		},
		{ id: 'avaliacao', accessorFn: (f) => f.avaliacao ?? 0, meta: { label: 'Avaliação' } }
	];
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-base font-semibold text-navy">Fornecedores / Freelancers</h1>
		<p class="text-sm text-grey">Parceiros, freelancers e fornecedores da agência.</p>
	</div>
	{#if !data.pendente}
		<Button onclick={abrirNovo}><Icon name="plus" size={15} /> Novo fornecedor</Button>
	{/if}
</div>

{#if data.pendente}
	<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
		Módulo ainda não ativado. Aplique a migration
		<code class="font-mono">supabase/migrations/0006_administrativo.sql</code> no SQL Editor do Supabase.
	</div>
{:else}
	{#if data.loadError}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			Erro ao carregar: {data.loadError}
		</div>
	{/if}

	<form method="GET" class="mb-4 flex flex-wrap items-end gap-2">
		<Select label="Tipo" name="tipo" value={data.filtroTipo ?? ''} wrapperClass="w-44">
			<option value="">Todos os tipos</option>
			<option value="freelancer">Freelancer</option>
			<option value="fornecedor">Fornecedor</option>
			<option value="parceiro">Parceiro</option>
		</Select>
		<Input label="Buscar" name="q" placeholder="Nome…" value={data.q ?? ''} wrapperClass="w-56" />
		<Button type="submit" variant="secondary"><Icon name="search" size={15} /> Filtrar</Button>
		{#if data.filtroTipo || data.q}
			<Button type="button" variant="ghost" onclick={() => goto('/fornecedores')}>Limpar</Button>
		{/if}
	</form>

	<Card padding="none" class="overflow-hidden">
		<DataTable {columns} data={data.itens} initialSort={[{ id: 'nome', desc: false }]}>
			{#snippet row(r)}
				{@const f = r.original}
				<tr
					class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
					onclick={() => abrirEdicao(f)}
				>
					<td class="px-4 py-3">
						<span class="font-medium text-navy">{f.nome}</span>
						{#if !f.ativo}
							<span class="ml-2 text-xs text-grey">(inativo)</span>
						{/if}
					</td>
					<td class="px-4 py-3">
						<Badge tone={tipoTone[f.tipo] ?? 'neutral'}>{tipoLabel[f.tipo] ?? f.tipo}</Badge>
					</td>
					<td class="px-4 py-3 text-slate">{f.especialidade ?? '—'}</td>
					<td class="px-4 py-3 text-slate">{contato(f) || '—'}</td>
					<td class="px-4 py-3 text-right tabular-nums text-navy">
						{f.custo_referencia != null ? formatBRL(f.custo_referencia) : '—'}
					</td>
					<td class="px-4 py-3 tabular-nums text-slate">
						{f.avaliacao != null ? `★ ${f.avaliacao}/5` : '—'}
					</td>
				</tr>
			{/snippet}
			{#snippet empty()}
				<tr><td colspan="6" class="px-2"><EmptyState icon="building" title="Nenhum fornecedor" description="Cadastre freelancers, fornecedores e parceiros." /></td></tr>
			{/snippet}
		</DataTable>
	</Card>
{/if}

<CrmModal
	open={modalAberto && !data.pendente}
	title={editando ? 'Editar fornecedor' : 'Novo fornecedor'}
	onClose={fechar}
>
	{#key editando?.id ?? 'novo'}
		<form
			method="POST"
			action={editando ? '?/atualizar' : '?/criar'}
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					await update();
					saving = false;
					if (result.type === 'success') {
						toast.success(editando ? 'Fornecedor atualizado.' : 'Fornecedor criado.');
						fechar();
					} else if (result.type === 'failure') {
						toast.error((result.data as { error?: string })?.error ?? 'Erro ao salvar.');
					}
				};
			}}
			class="grid grid-cols-1 sm:grid-cols-2 gap-3"
		>
			{#if editando}<input type="hidden" name="id" value={editando.id} />{/if}

			<Input
				label="Nome *"
				name="nome"
				required
				value={editando?.nome ?? ''}
				placeholder="Nome do fornecedor"
				wrapperClass="sm:col-span-2"
			/>

			<Select label="Tipo" name="tipo" value={editando?.tipo ?? 'freelancer'}>
				<option value="freelancer">Freelancer</option>
				<option value="fornecedor">Fornecedor</option>
				<option value="parceiro">Parceiro</option>
			</Select>

			<Input
				label="Especialidade"
				name="especialidade"
				value={editando?.especialidade ?? ''}
				placeholder="Ex.: Edição de vídeo"
			/>

			<Input label="E-mail" name="email" type="email" value={editando?.email ?? ''} />

			<Input label="Telefone" name="telefone" value={editando?.telefone ?? ''} />

			<Input
				label="Custo de referência (R$)"
				name="custo_referencia"
				inputmode="decimal"
				placeholder="0,00"
				value={custoValor(editando)}
			/>

			<Select
				label="Avaliação"
				name="avaliacao"
				value={editando?.avaliacao != null ? String(editando.avaliacao) : ''}
			>
				<option value="">Sem avaliação</option>
				{#each [1, 2, 3, 4, 5] as n (n)}
					<option value={String(n)}>{'★'.repeat(n)} ({n}/5)</option>
				{/each}
			</Select>

			<div class="sm:col-span-2 pt-1">
				<Checkbox label="Ativo" name="ativo" bind:checked={ativoChecked} />
			</div>

			<Textarea
				label="Observações"
				name="observacoes"
				rows={3}
				value={editando?.observacoes ?? ''}
				wrapperClass="sm:col-span-2"
			/>

			<div class="sm:col-span-2 flex items-center justify-between gap-2 pt-2">
				<div class="flex items-center gap-2">
					<Button type="submit" loading={saving}>Salvar</Button>
					<Button type="button" variant="secondary" onclick={fechar}>Cancelar</Button>
				</div>
			</div>
		</form>

		{#if editando}
			<form
				method="POST"
				action="?/excluir"
				class="mt-3 border-t border-grey-200 pt-3"
				use:enhance={({ cancel }) => {
					if (!confirm('Excluir este fornecedor? Esta ação não pode ser desfeita.')) {
						cancel();
						return;
					}
					deleting = true;
					return async ({ result, update }) => {
						await update();
						deleting = false;
						if (result.type === 'success') {
							toast.success('Fornecedor excluído.');
							fechar();
						} else if (result.type === 'failure') {
							toast.error((result.data as { error?: string })?.error ?? 'Erro ao excluir.');
						}
					};
				}}
			>
				<input type="hidden" name="id" value={editando.id} />
				<Button type="submit" variant="danger" loading={deleting}>
					<Icon name="trash" size={15} /> Excluir
				</Button>
			</form>
		{/if}
	{/key}
</CrmModal>
