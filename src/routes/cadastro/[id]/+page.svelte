<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import CalendarioConteudos from '$lib/components/CalendarioConteudos.svelte';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Card, Badge, Button, Breadcrumb, Modal } from '$lib/components/ui';
	import { statusTone, statusLabel, formatBRL } from '$lib/clientes';
	import { iniciais } from '$lib/crm';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	const c = $derived(data.cliente);

	// Cor determinística do avatar a partir do nome.
	const AVATAR_CORES = ['bg-navy', 'bg-brand', 'bg-brand-green', 'bg-brand-danger', 'bg-slate'];
	function corAvatar(nome: string): string {
		let h = 0;
		for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
		return AVATAR_CORES[h % AVATAR_CORES.length];
	}

	function fmtData(s: string | null): string | null {
		if (!s) return null;
		const [a, m, d] = s.slice(0, 10).split('-');
		return d && m && a ? `${d}/${m}/${a}` : s;
	}

	// --- Dados de identidade (só os preenchidos) ---
	const dados = $derived(
		[
			{ label: 'Razão social', value: c.razao_social },
			{ label: 'CNPJ / CPF', value: c.cnpj_cpf },
			{ label: 'Cliente desde', value: fmtData(c.data_inicio) },
			{ label: 'MRR', value: c.mrr != null ? formatBRL(c.mrr) : null },
			{ label: 'Plano', value: c.plano_ref },
			{ label: 'Forma de pagamento', value: c.forma_pagamento },
			{ label: 'Dia de vencimento', value: c.dia_vencimento != null ? String(c.dia_vencimento) : null },
			{ label: 'Cidade / UF', value: c.cidade ? `${c.cidade}${c.estado ? ' / ' + c.estado : ''}` : null }
		].filter((d) => d.value != null && d.value !== '')
	);
	const temContato = $derived(!!(c.contato_nome || c.contato_email || c.contato_whatsapp || c.contato_financeiro));

	// --- Edição em modal ---
	let editAberto = $state(false);
	function aposEditar() {
		editAberto = false;
		toast.success('Cliente salvo');
		invalidateAll();
	}
	let confirmDelete = $state(false);
	let excluindo = $state(false);
</script>

<Breadcrumb items={[{ label: 'Clientes', href: '/cadastro' }, { label: c.nome }]} />

<!-- Header estilo perfil: avatar (iniciais) + nome + status + responsável -->
<Card>
	<div class="flex flex-wrap items-start gap-4">
		<span
			class="grid size-16 shrink-0 place-items-center rounded-full text-lg font-semibold text-white shadow-sm {corAvatar(c.nome)}"
		>{iniciais(c.nome)}</span>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-lg font-semibold text-navy">{c.nome}</h1>
				<Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
			</div>
			{#if c.segmento}
				<p class="mt-0.5 text-sm text-grey">{c.segmento}</p>
			{/if}
			{#if c.responsavel_nome}
				<div class="mt-2 flex items-center gap-2">
					<span class="text-xs text-grey">Resp.:</span>
					{#if c.responsavel_avatar}
						<img src={c.responsavel_avatar} alt={c.responsavel_nome} class="size-6 shrink-0 rounded-full object-cover shadow-sm" />
					{:else}
						<span class="grid size-6 shrink-0 place-items-center rounded-full text-[0.6rem] font-semibold text-white {corAvatar(c.responsavel_nome)}">{iniciais(c.responsavel_nome)}</span>
					{/if}
					<span class="text-sm font-medium text-navy">{c.responsavel_nome}</span>
					<CargoBadge funcao={c.responsavel_funcao} />
				</div>
			{/if}
		</div>
		<Button variant="secondary" onclick={() => (editAberto = true)}>
			<Icon name="edit" size={15} /> Editar
		</Button>
	</div>
</Card>

{#if temContato}
	<Card class="mt-4">
		<h2 class="mb-3 text-sm font-semibold text-navy">Contato</h2>
		<div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
			{#if c.contato_nome}
				<div class="flex items-center gap-2 text-sm"><Icon name="users" size={15} /><span class="text-navy">{c.contato_nome}</span></div>
			{/if}
			{#if c.contato_email}
				<a href={`mailto:${c.contato_email}`} class="flex items-center gap-2 text-sm text-brand hover:underline"><Icon name="mail" size={15} />{c.contato_email}</a>
			{/if}
			{#if c.contato_whatsapp}
				<a href={`https://wa.me/${c.contato_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener" class="flex items-center gap-2 text-sm text-brand hover:underline"><Icon name="phone" size={15} />{c.contato_whatsapp}</a>
			{/if}
			{#if c.contato_financeiro}
				<div class="flex items-center gap-2 text-sm"><Icon name="dollar" size={15} /><span class="text-navy">{c.contato_financeiro}</span></div>
			{/if}
		</div>
	</Card>
{/if}

{#if dados.length}
	<Card class="mt-4">
		<h2 class="mb-3 text-sm font-semibold text-navy">Identidade</h2>
		<dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each dados as d (d.label)}
				<div>
					<dt class="text-xs text-grey">{d.label}</dt>
					<dd class="text-sm font-medium text-navy">{d.value}</dd>
				</div>
			{/each}
		</dl>
	</Card>
{/if}

<!-- Calendário de posts do cliente (mesmo do marketing, filtrado a este cliente) -->
<div class="mt-6">
	<h2 class="mb-3 text-sm font-semibold text-navy">Calendário de posts</h2>
	<CalendarioConteudos
		data={data.calendario}
		{form}
		clienteFixo={c.id}
		basePath={`/cadastro/${c.id}`}
		mostrarCabecalho={false}
	/>
</div>

<!-- Zona de perigo -->
<Card class="mt-4">
	<h2 class="mb-3 text-sm font-semibold text-brand-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete">
			<p class="mb-3 text-sm text-slate">Excluir este cliente? Esta ação não pode ser desfeita.</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit" loading={excluindo} onclick={() => (excluindo = true)}>Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir cliente</Button>
	{/if}
</Card>

<Modal open={editAberto} title="Editar cliente" size="lg" onClose={() => (editAberto = false)}>
	<ClienteForm
		action="?/update"
		submitLabel="Salvar alterações"
		colaboradores={data.calendario.colaboradores}
		cliente={form?.values ?? c}
		error={form?.error ?? null}
		onCancel={() => (editAberto = false)}
		onDone={aposEditar}
	/>
</Modal>
