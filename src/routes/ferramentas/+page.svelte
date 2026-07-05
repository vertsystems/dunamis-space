<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button, Card, Badge, Input, Select, Textarea, Checkbox, EmptyState, DataTable } from '$lib/components/ui';
	import type { BadgeTone, ColumnDef } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import ResponsavelPicker from '$lib/components/ResponsavelPicker.svelte';
	import CrmModal from '$lib/components/crm/CrmModal.svelte';
	import { toast } from '$lib/toast.svelte';
	import { formatBRL } from '$lib/clientes';

	let { data } = $props();

	type Ferramenta = (typeof data.ferramentas)[number];
	type Acesso = (typeof data.acessos)[number];

	const ferramentaCols: ColumnDef<Ferramenta>[] = [
		{ id: 'nome', accessorFn: (f) => f.nome, meta: { label: 'Nome' } },
		{ id: 'categoria', accessorFn: (f) => f.categoria ?? '', meta: { label: 'Categoria' } },
		{ id: 'ciclo', accessorFn: (f) => f.ciclo, meta: { label: 'Ciclo' } },
		{ id: 'custo', accessorFn: (f) => f.custo_mensal, meta: { label: 'Custo/mês', thClass: 'text-right' } },
		{ id: 'renovacao', accessorFn: (f) => f.proxima_renovacao ?? '', meta: { label: 'Próx. renovação' } },
		{ id: 'responsavel', accessorFn: (f) => f.responsavel_nome ?? '', meta: { label: 'Responsável' } }
	];

	const acessoCols: ColumnDef<Acesso>[] = [
		{ id: 'plataforma', accessorFn: (a) => a.plataforma, meta: { label: 'Plataforma' } },
		{ id: 'cliente', accessorFn: (a) => (a.cliente_id ? (a.cliente_nome ?? '') : 'Agência'), meta: { label: 'Cliente' } },
		{ id: 'login', accessorFn: (a) => a.login ?? '', meta: { label: 'Login' } },
		{ id: 'local_senha', accessorFn: (a) => a.local_senha ?? '', meta: { label: 'Onde está a senha' } },
		{ id: 'responsavel', accessorFn: (a) => a.responsavel_nome ?? '', meta: { label: 'Responsável' } }
	];

	const CICLOS = [
		{ value: 'mensal', label: 'Mensal' },
		{ value: 'anual', label: 'Anual' },
		{ value: 'unico', label: 'Único' }
	] as const;

	function cicloLabel(c: string): string {
		return CICLOS.find((x) => x.value === c)?.label ?? c;
	}
	function cicloTone(c: string): BadgeTone {
		if (c === 'anual') return 'brand';
		if (c === 'unico') return 'neutral';
		return 'info';
	}
	/** Data pura YYYY-MM-DD → dd/mm/aaaa. */
	function fmtData(v: string): string {
		return new Date(v + 'T00:00:00').toLocaleDateString('pt-BR');
	}

	// Custo mensal estimado (soma das ferramentas ativas).
	const totalMensal = $derived(
		data.pendente ? 0 : data.ferramentas.filter((f) => f.ativo).reduce((s, f) => s + f.custo_mensal, 0)
	);

	// ---------------- Modais ----------------
	let modalFerramenta = $state(false);
	let ferramentaEdit = $state<Ferramenta | null>(null);
	let savingFerr = $state(false);

	let modalAcesso = $state(false);
	let acessoEdit = $state<Acesso | null>(null);
	let savingAcesso = $state(false);

	function novaFerramenta() {
		ferramentaEdit = null;
		modalFerramenta = true;
	}
	function editarFerramenta(f: Ferramenta) {
		ferramentaEdit = f;
		modalFerramenta = true;
	}
	function novoAcesso() {
		acessoEdit = null;
		modalAcesso = true;
	}
	function editarAcesso(a: Acesso) {
		acessoEdit = a;
		modalAcesso = true;
	}

	function erroDe(d: unknown): string | undefined {
		return (d as { error?: string } | null)?.error;
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-base font-semibold text-navy">Ferramentas &amp; Contas</h1>
		<p class="text-sm text-grey">Assinaturas, custos e registro de acessos da agência.</p>
	</div>
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

	<!-- (a) Ferramentas & Assinaturas -->
	<section class="mb-6">
		<div class="flex flex-wrap items-end justify-between gap-3 mb-3">
			<div>
				<h2 class="text-sm font-semibold text-navy">Ferramentas &amp; Assinaturas</h2>
				<p class="text-sm text-grey">
					{data.ferramentas.length} ferramenta{data.ferramentas.length === 1 ? '' : 's'} ·
					<span class="tabular-nums">{formatBRL(totalMensal)}</span>/mês
				</p>
			</div>
			<Button size="sm" onclick={novaFerramenta}>+ Nova ferramenta</Button>
		</div>

		<Card padding="none" class="overflow-hidden">
			<DataTable columns={ferramentaCols} data={data.ferramentas} initialSort={[{ id: 'nome', desc: false }]}>
				{#snippet row(r)}
					{@const f = r.original}
					<tr
						class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
						onclick={() => editarFerramenta(f)}
					>
						<td class="px-4 py-3">
							<div class="font-medium text-navy">{f.nome}</div>
							{#if !f.ativo}<span class="text-xs text-grey">inativa</span>{/if}
						</td>
						<td class="px-4 py-3 text-slate">{f.categoria ?? '—'}</td>
						<td class="px-4 py-3"><Badge tone={cicloTone(f.ciclo)}>{cicloLabel(f.ciclo)}</Badge></td>
						<td class="px-4 py-3 text-right tabular-nums text-navy">{formatBRL(f.custo_mensal)}</td>
						<td class="px-4 py-3 text-slate">{f.proxima_renovacao ? fmtData(f.proxima_renovacao) : '—'}</td>
						<td class="px-4 py-3 text-slate">{f.responsavel_nome ?? '—'}</td>
					</tr>
				{/snippet}
				{#snippet empty()}
					<tr><td colspan="6" class="px-2"><EmptyState icon="key" title="Nenhuma ferramenta" description="Cadastre ferramentas e assinaturas da agência." /></td></tr>
				{/snippet}
			</DataTable>
		</Card>
	</section>

	<!-- (b) Acessos / Contas -->
	<section class="mb-6">
		<div class="flex flex-wrap items-end justify-between gap-3 mb-3">
			<div>
				<h2 class="text-sm font-semibold text-navy">Acessos / Contas</h2>
				<p class="text-sm text-grey">Onde ficam os logins da agência e dos clientes.</p>
			</div>
			<Button size="sm" onclick={novoAcesso}>+ Novo acesso</Button>
		</div>

		<p class="mb-3 rounded-[var(--radius)] bg-brand-amber/15 p-2 text-xs text-brand-brown">
			Registro de acessos — NÃO guarde senhas aqui. Anote onde a senha está (cofre/pessoa).
		</p>

		<Card padding="none" class="overflow-hidden">
			<DataTable columns={acessoCols} data={data.acessos} initialSort={[{ id: 'plataforma', desc: false }]}>
				{#snippet row(r)}
					{@const a = r.original}
					<tr
						class="cursor-pointer border-b border-grey-200/60 last:border-0 hover:bg-bg"
						onclick={() => editarAcesso(a)}
					>
						<td class="px-4 py-3 font-medium text-navy">{a.plataforma}</td>
						<td class="px-4 py-3">
							{#if a.cliente_id}
								<span class="text-slate">{a.cliente_nome ?? '—'}</span>
							{:else}
								<Badge tone="neutral">Agência</Badge>
							{/if}
						</td>
						<td class="px-4 py-3 text-slate">{a.login ?? '—'}</td>
						<td class="px-4 py-3">
							{#if a.local_senha}
								<span class="inline-flex items-center gap-1 text-slate">
									<Icon name="key" size={14} />{a.local_senha}
								</span>
							{:else}
								<span class="text-grey">—</span>
							{/if}
						</td>
						<td class="px-4 py-3 text-slate">{a.responsavel_nome ?? '—'}</td>
					</tr>
				{/snippet}
				{#snippet empty()}
					<tr><td colspan="5" class="px-2"><EmptyState icon="key" title="Nenhum acesso registrado" description="Registre os acessos e contas por cliente." /></td></tr>
				{/snippet}
			</DataTable>
		</Card>
	</section>
{/if}

<!-- ================= Modais ================= -->
<CrmModal
	open={modalFerramenta}
	title={ferramentaEdit ? 'Editar ferramenta' : 'Nova ferramenta'}
	onClose={() => (modalFerramenta = false)}
>
	{@render formFerramenta()}
</CrmModal>

<CrmModal
	open={modalAcesso}
	title={acessoEdit ? 'Editar acesso' : 'Novo acesso'}
	onClose={() => (modalAcesso = false)}
>
	{@render formAcesso()}
</CrmModal>

{#snippet formFerramenta()}
	{@const f = ferramentaEdit}
	{@const custoStr = f && f.custo_mensal ? f.custo_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
	<form
		method="POST"
		action={f ? '?/ferramenta_atualizar' : '?/ferramenta_criar'}
		use:enhance={() => {
			savingFerr = true;
			return async ({ result, update }) => {
				await update();
				savingFerr = false;
				if (result.type === 'success') {
					modalFerramenta = false;
					toast.success('Ferramenta salva.');
				} else if (result.type === 'failure') {
					toast.error(erroDe(result.data) ?? 'Erro ao salvar.');
				}
			};
		}}
		class="grid grid-cols-1 gap-3 md:grid-cols-12"
	>
		{#if f}<input type="hidden" name="id" value={f.id} />{/if}

		<Input label="Nome *" name="nome" required value={f?.nome ?? ''} wrapperClass="md:col-span-12" />
		<Input label="Categoria" name="categoria" value={f?.categoria ?? ''} placeholder="Ex.: Design, E-mail" wrapperClass="md:col-span-6" />
		<Input label="URL" name="url" value={f?.url ?? ''} placeholder="https://" wrapperClass="md:col-span-6" />

		<Input label="Custo mensal (R$)" name="custo_mensal" value={custoStr} inputmode="decimal" placeholder="0,00" wrapperClass="md:col-span-4" />
		<Select label="Ciclo" name="ciclo" value={f?.ciclo ?? 'mensal'} wrapperClass="md:col-span-4">
			{#each CICLOS as c (c.value)}<option value={c.value}>{c.label}</option>{/each}
		</Select>
		<Input label="Próxima renovação" name="proxima_renovacao" type="date" value={f?.proxima_renovacao ?? ''} wrapperClass="md:col-span-4" />

		<ResponsavelPicker colaboradores={data.colaboradores} value={f?.responsavel_id ?? null} wrapperClass="md:col-span-12" />
		<div class="flex items-end pb-2 md:col-span-6">
			<Checkbox label="Ativa" name="ativo" checked={f ? f.ativo : true} />
		</div>

		<Textarea label="Observações" name="observacoes" value={f?.observacoes ?? ''} rows={2} wrapperClass="md:col-span-12" />

		<div class="flex items-center gap-2 pt-1 md:col-span-12">
			<Button type="submit" loading={savingFerr}>Salvar</Button>
			<Button variant="secondary" type="button" onclick={() => (modalFerramenta = false)}>Cancelar</Button>
		</div>
	</form>

	{#if f}
		<form
			method="POST"
			action="?/ferramenta_excluir"
			use:enhance={({ cancel }) => {
				if (!confirm('Excluir esta ferramenta? Esta ação não pode ser desfeita.')) {
					cancel();
					return;
				}
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						modalFerramenta = false;
						toast.success('Ferramenta excluída.');
					} else if (result.type === 'failure') {
						toast.error(erroDe(result.data) ?? 'Erro ao excluir.');
					}
				};
			}}
			class="mt-3 border-t border-grey-200 pt-3"
		>
			<input type="hidden" name="id" value={f.id} />
			<Button variant="danger" size="sm" type="submit">Excluir ferramenta</Button>
		</form>
	{/if}
{/snippet}

{#snippet formAcesso()}
	{@const a = acessoEdit}
	<form
		method="POST"
		action={a ? '?/acesso_atualizar' : '?/acesso_criar'}
		use:enhance={() => {
			savingAcesso = true;
			return async ({ result, update }) => {
				await update();
				savingAcesso = false;
				if (result.type === 'success') {
					modalAcesso = false;
					toast.success('Acesso salvo.');
				} else if (result.type === 'failure') {
					toast.error(erroDe(result.data) ?? 'Erro ao salvar.');
				}
			};
		}}
		class="grid grid-cols-1 gap-3 md:grid-cols-12"
	>
		{#if a}<input type="hidden" name="id" value={a.id} />{/if}

		<Input label="Plataforma *" name="plataforma" required value={a?.plataforma ?? ''} placeholder="Ex.: Meta Ads, Google" wrapperClass="md:col-span-6" />
		<Select label="Cliente" name="cliente_id" value={a?.cliente_id ?? ''} wrapperClass="md:col-span-6">
			<option value="">— Agência —</option>
			{#each data.clientes as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
		</Select>

		<Input label="Login (usuário/e-mail)" name="login" value={a?.login ?? ''} placeholder="Não coloque a senha" wrapperClass="md:col-span-6" />
		<Input label="URL" name="url" value={a?.url ?? ''} placeholder="https://" wrapperClass="md:col-span-6" />

		<Input label="Onde está a senha" name="local_senha" value={a?.local_senha ?? ''} placeholder="Ex.: 1Password, com o João" wrapperClass="md:col-span-6" />
		<ResponsavelPicker colaboradores={data.colaboradores} value={a?.responsavel_id ?? null} wrapperClass="md:col-span-12" />

		<Textarea label="Observações" name="observacoes" value={a?.observacoes ?? ''} rows={2} wrapperClass="md:col-span-12" />

		<div class="flex items-center gap-2 pt-1 md:col-span-12">
			<Button type="submit" loading={savingAcesso}>Salvar</Button>
			<Button variant="secondary" type="button" onclick={() => (modalAcesso = false)}>Cancelar</Button>
		</div>
	</form>

	{#if a}
		<form
			method="POST"
			action="?/acesso_excluir"
			use:enhance={({ cancel }) => {
				if (!confirm('Excluir este acesso? Esta ação não pode ser desfeita.')) {
					cancel();
					return;
				}
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						modalAcesso = false;
						toast.success('Acesso excluído.');
					} else if (result.type === 'failure') {
						toast.error(erroDe(result.data) ?? 'Erro ao excluir.');
					}
				};
			}}
			class="mt-3 border-t border-grey-200 pt-3"
		>
			<input type="hidden" name="id" value={a.id} />
			<Button variant="danger" size="sm" type="submit">Excluir acesso</Button>
		</form>
	{/if}
{/snippet}
