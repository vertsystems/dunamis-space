<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { podeEditar, podeExcluir } from '$lib/permissoes';
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';
	import VaultCard from '$lib/components/VaultCard.svelte';
	import CargoBadge from '$lib/components/CargoBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { Card, Badge, Button, Breadcrumb, Modal } from '$lib/components/ui';
	import {
		projetoStatusTone,
		projetoStatusLabel,
		projetoTipoLabel,
		formatBRL
	} from '$lib/projetos';
	import { VALOR_MASCARA } from '$lib/valores';
	import { iniciais } from '$lib/crm';
	import { toast } from '$lib/toast.svelte';

	let { data, form } = $props();
	const p = $derived(data.projeto);
	const perms = $derived(page.data.permissoes);

	// Cor determinística do avatar a partir do nome (mesma paleta da área do cliente).
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

	/** Dias até o prazo — negativo é atraso. Null quando não há prazo. */
	const diasAteOPrazo = $derived.by(() => {
		if (!p.prazo || p.status === 'finalizado') return null;
		const hoje = new Date();
		hoje.setHours(0, 0, 0, 0);
		const prazo = new Date(p.prazo + 'T00:00:00');
		return Math.round((prazo.getTime() - hoje.getTime()) / 86_400_000);
	});

	// Só os campos preenchidos entram na ficha — linha vazia é ruído.
	const dados = $derived(
		[
			{ label: 'Tipo', value: projetoTipoLabel(p.tipo) },
			{ label: 'Cobrança', value: p.recorrente ? 'Recorrente' : 'Pontual' },
			// Sem permissão a linha aparece mascarada em vez de sumir: some seria
			// dizer "este projeto não tem valor", o que nem sempre é verdade.
			{
				label: 'Valor',
				value: data.podeValores ? (p.valor != null ? formatBRL(p.valor) : null) : VALOR_MASCARA
			},
			{ label: 'Início', value: fmtData(p.data_inicio) },
			{ label: 'Prazo', value: fmtData(p.prazo) }
		].filter((d) => d.value != null && d.value !== '')
	);

	// --- Edição em modal (mesmo padrão do resto do sistema) ---
	let editAberto = $state(false);
	function aposEditar() {
		editAberto = false;
		toast.success('Projeto salvo');
		invalidateAll();
	}
	let confirmDelete = $state(false);
	let excluindo = $state(false);
</script>

<Breadcrumb items={[{ label: 'Projetos', href: '/projetos' }, { label: p.nome }]} />

<!-- Header: identidade do projeto + cliente dono + responsável -->
<Card>
	<div class="flex flex-wrap items-start gap-4">
		{#if p.cliente?.logo_url}
			<img
				src={p.cliente.logo_url}
				alt={p.cliente.nome}
				class="size-16 shrink-0 rounded-full object-cover shadow-sm"
			/>
		{:else}
			<span
				class="grid size-16 shrink-0 place-items-center rounded-full text-lg font-semibold text-white shadow-sm {corAvatar(
					p.nome
				)}">{iniciais(p.nome)}</span
			>
		{/if}
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="text-[1.3rem] font-semibold text-navy">{p.nome}</h1>
				<Badge tone={projetoStatusTone(p.status)}>{projetoStatusLabel(p.status)}</Badge>
				{#if diasAteOPrazo != null && diasAteOPrazo < 0}
					<Badge tone="danger">Atrasado {-diasAteOPrazo}d</Badge>
				{:else if diasAteOPrazo != null && diasAteOPrazo <= 7}
					<Badge tone="warning">
						{diasAteOPrazo === 0 ? 'Vence hoje' : `Faltam ${diasAteOPrazo}d`}
					</Badge>
				{/if}
			</div>
			{#if p.cliente}
				<a
					href={`/cadastro/${p.cliente.id}`}
					class="mt-0.5 inline-flex items-center gap-1.5 text-sm text-grey no-underline hover:text-brand"
				>
					<Icon name="file" size={14} />{p.cliente.nome}
				</a>
			{/if}
			{#if p.responsavel}
				<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 origin-left scale-[0.8]">
					<span class="text-xs text-grey">Resp.:</span>
					<span class="flex items-center gap-1.5">
						{#if p.responsavel.avatar_url}
							<img
								src={p.responsavel.avatar_url}
								alt={p.responsavel.nome}
								class="size-6 shrink-0 rounded-full object-cover shadow-sm"
							/>
						{:else}
							<span
								class="grid size-6 shrink-0 place-items-center rounded-full text-[0.6rem] font-semibold text-white {corAvatar(
									p.responsavel.nome
								)}">{iniciais(p.responsavel.nome)}</span
							>
						{/if}
						<span class="text-sm font-medium text-navy">{p.responsavel.nome}</span>
						{#each p.responsavel.funcoes ?? [] as f (f)}<CargoBadge funcao={f} />{/each}
					</span>
				</div>
			{/if}
		</div>
		{#if podeEditar(perms, 'projetos')}
			<Button variant="secondary" onclick={() => (editAberto = true)}>
				<Icon name="edit" size={15} /> Editar
			</Button>
		{/if}
	</div>
</Card>

{#if dados.length}
	<Card class="mt-4">
		<h2 class="mb-3 text-sm font-semibold text-navy">Ficha do projeto</h2>
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

{#if p.descricao}
	<Card class="mt-4">
		<h2 class="mb-3 text-sm font-semibold text-navy">Descrição</h2>
		<p class="whitespace-pre-wrap text-sm text-slate">{p.descricao}</p>
	</Card>
{/if}

<!-- Vault: acessos deste projeto. `data.vault` só vem preenchido para quem tem o
     módulo 'vault' — sem permissão a seção nem existe. -->
{#if data.vault}
	<VaultCard vault={data.vault} colaboradores={data.colaboradores} {form} dono="projeto" />
{/if}

<Comentarios entidadeTipo="projeto" entidadeId={p.id} />

<!-- Zona de perigo -->
{#if podeExcluir(perms, 'projetos')}
	<Card class="mt-4">
		<h2 class="mb-3 text-sm font-semibold text-brand-danger">Zona de perigo</h2>
		{#if confirmDelete}
			<form method="POST" action="?/delete">
				<p class="mb-3 text-sm text-slate">
					Excluir este projeto? Os acessos guardados no cofre dele somem junto, e os conteúdos
					vinculados perdem a ligação.
				</p>
				<div class="flex gap-2">
					<Button variant="danger" type="submit" loading={excluindo} onclick={() => (excluindo = true)}>
						Sim, excluir
					</Button>
					<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
				</div>
			</form>
		{:else}
			<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir projeto</Button>
		{/if}
	</Card>
{/if}

<Modal open={editAberto} title="Editar projeto" size="lg" onClose={() => (editAberto = false)}>
	<ProjetoForm
		action="?/update"
		submitLabel="Salvar alterações"
		clientes={data.clientes}
		colaboradores={data.colaboradores}
		projeto={form?.values ?? p}
		error={form?.error ?? null}
		onCancel={() => (editAberto = false)}
		onDone={aposEditar}
	/>
</Modal>
