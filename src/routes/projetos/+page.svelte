<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { PROJETO_STATUS, projetoStatusTone, projetoStatusLabel } from '$lib/projetos';
	import { urlAbsoluta, urlCurta } from '$lib/vault';
	import { paraTexto } from '$lib/richtext';
	import { ExternalLink } from '@lucide/svelte';
	import { iniciais } from '$lib/crm';
	import { Card, Badge, Button, Input, Select, EmptyState, Modal } from '$lib/components/ui';
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	import MarcaIcon from '$lib/components/MarcaIcon.svelte';
	import { toast } from '$lib/toast.svelte';
	import { podeEditar } from '$lib/permissoes';

	let { data, form } = $props();

	const perms = $derived(page.data.permissoes);
	// O form vem de actions de outras rotas (/projetos/novo, /[id]?/update) → tipagem solta.
	const res = $derived(form as { values?: Record<string, any>; error?: string } | null);

	type Projeto = (typeof data.projetos)[number];

	// Filtros: espelham a URL, e o back/forward do navegador re-sincroniza.
	let status = $state(data.status);
	let q = $state(data.q);
	$effect(() => {
		status = data.status;
		q = data.q;
	});

	// Cor determinística a partir do nome — mesma paleta do resto do sistema.
	const AVATAR_CORES = ['bg-navy', 'bg-brand', 'bg-brand-green', 'bg-brand-danger', 'bg-slate'];
	function corAvatar(nome: string): string {
		let h = 0;
		for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
		return AVATAR_CORES[h % AVATAR_CORES.length];
	}

	/** Primeira linha das anotações, em texto puro — a descrição é HTML. */
	function resumo(descricao: string | null): string {
		const t = paraTexto(descricao)?.replace(/\s+/g, ' ').trim();
		return t ? (t.length > 120 ? t.slice(0, 120) + '…' : t) : 'Sem anotações ainda.';
	}

	function fmtQuando(s: string | null): string {
		return s ? new Date(s).toLocaleDateString('pt-BR') : '—';
	}

	let novoAberto = $state(false);
	let editando = $state<Projeto | null>(null);

	function aposCriar() {
		novoAberto = false;
		toast.success('Projeto criado');
		invalidateAll();
	}
	function aposEditar() {
		editando = null;
		toast.success('Projeto salvo');
		invalidateAll();
	}
</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-base font-semibold text-navy">Projetos</h1>
		<p class="text-sm text-grey">Onde cada projeto está hospedado, em que banco e com que acessos</p>
	</div>
	<div class="flex flex-wrap items-end gap-2">
		<!-- Um formulário só: buscar e filtrar mandam tudo junto, senão filtrar
		     apagaria a busca (e vice-versa). -->
		<form class="flex flex-wrap items-end gap-2" method="GET">
			<Input
				type="search"
				name="q"
				placeholder="Buscar por nome"
				aria-label="Buscar projeto por nome"
				bind:value={q}
				wrapperClass="w-52"
			/>
			<Select name="status" bind:value={status} aria-label="Filtrar por status" wrapperClass="w-44">
				<option value="">Todos os status</option>
				{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</Select>
			<Button variant="secondary" type="submit">Filtrar</Button>
		</form>
		{#if podeEditar(perms, 'projetos')}
			<Button onclick={() => (novoAberto = true)}>+ Novo projeto</Button>
		{/if}
	</div>
</div>

{#if data.loadError}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
		Erro ao carregar: {data.loadError}
	</div>
{/if}

{#if data.projetos.length}
	<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each data.projetos as p (p.id)}
			<Card class="flex flex-col gap-3 transition-shadow hover:shadow-md">
				<div class="flex items-start gap-3">
					<span
						class="grid size-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-sm {corAvatar(
							p.nome
						)}">{iniciais(p.nome)}</span
					>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
							<a
								href={`/projetos/${p.id}`}
								class="truncate font-semibold text-navy no-underline hover:text-brand">{p.nome}</a
							>
							<Badge tone={projetoStatusTone(p.status)}>{projetoStatusLabel(p.status)}</Badge>
						</div>
						{#if p.url}
							<a
								href={urlAbsoluta(p.url)}
								target="_blank"
								rel="noopener"
								class="mt-0.5 inline-flex items-center gap-1 text-xs text-brand no-underline hover:underline"
								title={p.url}
							>
								<MarcaIcon texto={p.url} size={12} />{urlCurta(p.url)}<ExternalLink size={11} />
							</a>
						{:else}
							<p class="mt-0.5 text-xs text-grey">Atualizado em {fmtQuando(p.updated_at)}</p>
						{/if}
					</div>
				</div>

				<!-- O cartão mostra o começo das anotações: é o que diferencia um
				     projeto do outro quando os nomes são parecidos. -->
				<p class="line-clamp-2 text-sm text-slate">{resumo(p.descricao)}</p>

				<!-- Rodapé colado embaixo: cartões da mesma linha têm alturas diferentes. -->
				<div
					class="mt-auto flex items-center justify-between gap-2 border-t border-grey-200/60 pt-2.5"
				>
					<div class="flex items-center gap-1">
						{#if p.responsavel}
							{#if p.responsavel.avatar_url}
								<img
									src={p.responsavel.avatar_url}
									alt={p.responsavel.nome}
									title={p.responsavel.nome}
									class="size-6 rounded-full object-cover shadow-sm"
								/>
							{:else}
								<span
									title={p.responsavel.nome}
									class="grid size-6 place-items-center rounded-full text-[0.6rem] font-semibold text-white {corAvatar(
										p.responsavel.nome
									)}">{iniciais(p.responsavel.nome)}</span
								>
							{/if}
						{/if}
					</div>
					<div class="flex items-center gap-3">
						{#if podeEditar(perms, 'projetos')}
							<button
								type="button"
								class="text-sm text-slate hover:text-navy"
								onclick={() => (editando = p)}>Editar</button
							>
						{/if}
						<a
							class="text-sm font-medium text-brand no-underline hover:underline"
							href={`/projetos/${p.id}`}>Abrir</a
						>
					</div>
				</div>
			</Card>
		{/each}
	</div>
{:else}
	<Card>
		<EmptyState
			icon="folder"
			title="Nenhum projeto encontrado"
			description="Cada projeto ganha aqui a sua página, com as anotações técnicas e o cofre de acessos."
		/>
	</Card>
{/if}

<Modal open={novoAberto} title="Novo projeto" size="xl" onClose={() => (novoAberto = false)}>
	<ProjetoForm
		action="/projetos/novo"
		submitLabel="Criar projeto"
		colaboradores={data.colaboradores}
		projeto={res?.values ?? null}
		error={res?.error ?? null}
		onCancel={() => (novoAberto = false)}
		onDone={aposCriar}
	/>
</Modal>

<Modal open={!!editando} title="Editar projeto" size="xl" onClose={() => (editando = null)}>
	{#if editando}
		<ProjetoForm
			action={`/projetos/${editando.id}?/update`}
			submitLabel="Salvar alterações"
			colaboradores={data.colaboradores}
			projeto={res?.values ?? editando}
			error={res?.error ?? null}
			onCancel={() => (editando = null)}
			onDone={aposEditar}
		/>
	{/if}
</Modal>
