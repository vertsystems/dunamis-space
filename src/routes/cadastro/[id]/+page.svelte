<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Card, Badge, Button, Breadcrumb, Modal, toneClasses } from '$lib/components/ui';
	import { statusTone, statusLabel, formatBRL } from '$lib/clientes';
	import { iniciais } from '$lib/crm';
	import { SEMANA, MESES, chaveDia, celulasMes } from '$lib/calendario';
	import { conteudoStatusTone, conteudoStatusLabel, conteudoTipoLabel } from '$lib/conteudo';
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
			{ label: 'Segmento', value: c.segmento },
			{ label: 'Responsável', value: c.responsavel_nome },
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

	// --- Calendário de posts do cliente ---
	const cal = $derived(data.calendario);
	const celulas = $derived(celulasMes(cal.ano, cal.mes));
	const porDia = $derived.by(() => {
		const map = new Map<string, NonNullable<typeof cal>['conteudos']>();
		for (const ct of cal.conteudos) {
			if (!ct.data_publicacao) continue;
			const k = chaveDia(new Date(ct.data_publicacao));
			const arr = map.get(k) ?? [];
			arr.push(ct);
			map.set(k, arr);
		}
		return map;
	});
	const hojeKey = chaveDia(new Date());
	function horaCurta(iso: string | null) {
		return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
	}
</script>

<Breadcrumb items={[{ label: 'Clientes', href: '/cadastro' }, { label: c.nome }]} />

<!-- Header estilo perfil: avatar (iniciais) + nome + status + ações -->
<Card>
	<div class="flex flex-wrap items-center gap-4">
		<span
			class="grid size-16 shrink-0 place-items-center rounded-full text-lg font-semibold text-white shadow-sm {corAvatar(c.nome)}"
		>{iniciais(c.nome)}</span>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-lg font-semibold text-navy">{c.nome}</h1>
				<Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
			</div>
			<p class="mt-0.5 text-sm text-grey">
				{[c.segmento, c.responsavel_nome && `Resp.: ${c.responsavel_nome}`].filter(Boolean).join(' · ') || 'Perfil do cliente'}
			</p>
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

<!-- Calendário de posts do cliente -->
<Card class="mt-4">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h2 class="text-sm font-semibold text-navy">Calendário de posts</h2>
			<p class="text-xs text-grey">Publicações programadas deste cliente.</p>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold capitalize text-navy tabular-nums whitespace-nowrap">{MESES[cal.mes]} {cal.ano}</span>
			<div class="flex gap-1">
				<Button size="sm" variant="secondary" onclick={() => goto(`?cal=${cal.prev}`)} aria-label="Mês anterior">‹</Button>
				{#if cal.atual !== cal.inicioMes}
					<Button size="sm" variant="secondary" onclick={() => goto(`?cal=${cal.inicioMes}`)}>Hoje</Button>
				{/if}
				<Button size="sm" variant="secondary" onclick={() => goto(`?cal=${cal.next}`)} aria-label="Próximo mês">›</Button>
			</div>
		</div>
	</div>

	<div class="mb-1.5 grid grid-cols-7 gap-1.5">
		{#each SEMANA as dia (dia)}
			<div class="text-center text-xs font-semibold uppercase tracking-wide text-grey">{dia}</div>
		{/each}
	</div>
	<div class="grid grid-cols-7 gap-1.5">
		{#each celulas as d (d.toISOString())}
			{@const k = chaveDia(d)}
			{@const itens = porDia.get(k) ?? []}
			{@const foraDoMes = d.getMonth() !== cal.mes}
			<div
				class="flex min-h-24 flex-col gap-1 overflow-hidden rounded-[var(--radius-sm)] border p-1.5 {foraDoMes
					? 'border-grey-200/60 bg-bg'
					: 'border-grey-200 bg-surface'} {k === hojeKey ? 'ring-1 ring-brand' : ''}"
			>
				<span class="text-xs font-semibold leading-none {foraDoMes ? 'text-grey-200' : 'text-slate'}">{d.getDate()}</span>
				{#each itens as ct (ct.id)}
					<a
						class="block truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[0.72rem] font-medium no-underline {toneClasses[conteudoStatusTone(ct.status)]}"
						href={`/conteudo/${ct.id}`}
						title={`${conteudoTipoLabel(ct.tipo)} · ${conteudoStatusLabel(ct.status)}`}
					>
						<span class="mr-1 tabular-nums opacity-70">{horaCurta(ct.data_publicacao)}</span>{ct.titulo ?? conteudoTipoLabel(ct.tipo)}
					</a>
				{/each}
			</div>
		{/each}
	</div>

	<div class="mt-3 flex items-center gap-2 text-xs text-grey">
		<span class="flex items-center gap-1.5"><span class="size-3 rounded ring-1 ring-brand"></span> Hoje</span>
	</div>
</Card>

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
		colaboradores={data.colaboradores}
		cliente={form?.values ?? c}
		error={form?.error ?? null}
		onCancel={() => (editAberto = false)}
		onDone={aposEditar}
	/>
</Modal>
