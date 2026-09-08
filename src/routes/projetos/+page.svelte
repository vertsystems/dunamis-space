<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { PROJETO_STATUS, projetoStatusTone, projetoStatusLabel } from '$lib/projetos';
	import { urlAbsoluta, urlCurta } from '$lib/vault';
	import { marcaDe } from '$lib/marcas';
	import { paraTexto } from '$lib/richtext';
	import { ExternalLink, LayoutGrid, List } from '@lucide/svelte';
	import { iniciais } from '$lib/crm';
	import { Card, Badge, Button, Input, Select, EmptyState, Modal, DataTable } from '$lib/components/ui';
	import type { ColumnDef } from '$lib/components/ui';
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
	let status = $state(untrack(() => data.status));
	let q = $state(untrack(() => data.q));
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

	/**
	 * As tecnologias que o projeto cita nos campos de "onde está", sem repetir.
	 *
	 * Devolve os TEXTOS dos campos, não as marcas: quem desenha é o MarcaIcon,
	 * que já sabe achar a marca no texto — assim existe um lugar só decidindo o
	 * que vira logo.
	 *
	 * A marca da URL fica de fora porque ela já aparece colada no link logo
	 * acima; sem isso, um projeto em playarkania.vercel.app hospedado na Vercel
	 * mostraria o mesmo logo duas vezes na mesma linha.
	 */
	function tecnologias(p: Projeto): string[] {
		const vistos = new Set<string>();
		const daUrl = marcaDe(p.url);
		if (daUrl) vistos.add(daUrl.slug);

		const textos: string[] = [];
		for (const valor of [p.repositorio, p.hospedagem, p.banco_dados]) {
			const m = marcaDe(valor);
			if (!m || vistos.has(m.slug)) continue;
			vistos.add(m.slug);
			textos.push(valor as string);
		}
		return textos;
	}

	/** Primeira linha das anotações, em texto puro — a descrição é HTML. */
	function resumo(descricao: string | null): string {
		const t = paraTexto(descricao)?.replace(/\s+/g, ' ').trim();
		return t ? (t.length > 120 ? t.slice(0, 120) + '…' : t) : 'Sem anotações ainda.';
	}

	function fmtQuando(s: string | null): string {
		return s ? new Date(s).toLocaleDateString('pt-BR') : '—';
	}

	// --- Grade × lista ---
	// A visão viaja na URL, como os filtros: o link fica compartilhável e o
	// back/forward do navegador volta para a visão anterior. Trocar de visão
	// preserva busca e status (e o <form> devolve a visão no hidden abaixo).
	const VISOES = [
		{ key: 'grade' as const, label: 'Grade', icon: LayoutGrid },
		{ key: 'lista' as const, label: 'Lista', icon: List }
	];
	function hrefVisao(v: 'grade' | 'lista'): string {
		const p = new URLSearchParams(page.url.searchParams);
		// 'grade' é o padrão: sai da URL em vez de sujá-la com o óbvio.
		if (v === 'grade') p.delete('visao');
		else p.set('visao', v);
		const busca = p.toString();
		return busca ? `?${busca}` : '/projetos';
	}

	const colunas: ColumnDef<Projeto>[] = [
		{ id: 'nome', accessorFn: (p) => p.nome ?? '', meta: { label: 'Projeto' } },
		{ id: 'status', accessorFn: (p) => projetoStatusLabel(p.status), meta: { label: 'Status' } },
		{ id: 'url', accessorFn: (p) => p.url ?? '', meta: { label: 'Onde está' } },
		{
			id: 'responsavel',
			accessorFn: (p) => p.responsavel?.nome ?? '',
			meta: { label: 'Responsável' }
		},
		{ id: 'updated_at', accessorFn: (p) => p.updated_at ?? '', meta: { label: 'Atualizado' } },
		{ id: 'acoes', accessorFn: () => '', enableSorting: false, meta: { label: '', thClass: 'text-right' } }
	];

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
			<!-- Filtrar não pode jogar quem está na lista de volta para a grade. -->
			{#if data.visao === 'lista'}<input type="hidden" name="visao" value="lista" />{/if}
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
		<div
			class="inline-flex gap-0.5 rounded-[var(--radius)] bg-bg p-1"
			role="group"
			aria-label="Modo de visualização"
		>
			{#each VISOES as v (v.key)}
				{@const Icone = v.icon}
				{@const ativa = data.visao === v.key}
				<a
					href={hrefVisao(v.key)}
					title={v.label}
					aria-label={`Ver em ${v.label.toLowerCase()}`}
					aria-current={ativa ? 'true' : undefined}
					class="grid size-9 place-items-center rounded-[var(--radius-sm)] no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 {ativa
						? 'bg-surface text-navy shadow-sm'
						: 'text-slate hover:text-navy'}"
				>
					<Icone size={16} />
				</a>
			{/each}
		</div>
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

{#if data.projetos.length && data.visao === 'lista'}
	<!-- Sem initialSort: a lista chega na mesma ordem da grade (mais recentes
	     primeiro). Quem quiser outra ordem clica no cabeçalho. -->
	<Card padding="none" class="overflow-hidden">
		<DataTable columns={colunas} data={data.projetos}>
			{#snippet row(r)}
				{@const p = r.original}
				{@const tecs = tecnologias(p)}
				<tr class="border-b border-grey-200/60 last:border-0 hover:bg-bg">
					<td class="px-4 py-3">
						<div class="flex items-center gap-2.5">
							<span
								class="grid size-8 shrink-0 place-items-center rounded-full text-[0.65rem] font-bold text-white shadow-sm {corAvatar(
									p.nome
								)}">{iniciais(p.nome)}</span
							>
							<a
								href={`/projetos/${p.id}`}
								class="font-medium text-navy no-underline hover:text-brand">{p.nome}</a
							>
						</div>
					</td>
					<td class="px-4 py-3">
						<Badge tone={projetoStatusTone(p.status)}>{projetoStatusLabel(p.status)}</Badge>
					</td>
					<td class="px-4 py-3">
						{#if p.url}
							<a
								href={urlAbsoluta(p.url)}
								target="_blank"
								rel="noopener"
								class="inline-flex items-center gap-1 text-brand no-underline hover:underline"
								title={p.url}
							>
								<MarcaIcon texto={p.url} size={12} />{urlCurta(p.url)}<ExternalLink size={11} />
							</a>
						{:else}
							<span class="text-grey">—</span>
						{/if}
						{#if tecs.length}
							<div class="mt-1 flex flex-wrap items-center gap-1.5">
								{#each tecs as texto (texto)}<MarcaIcon {texto} size={14} />{/each}
							</div>
						{/if}
					</td>
					<td class="px-4 py-3">
						{#if p.responsavel}
							<div class="flex items-center gap-2">
								{#if p.responsavel.avatar_url}
									<img
										src={p.responsavel.avatar_url}
										alt=""
										class="size-6 rounded-full object-cover shadow-sm"
									/>
								{:else}
									<span
										class="grid size-6 place-items-center rounded-full text-[0.6rem] font-semibold text-white {corAvatar(
											p.responsavel.nome
										)}">{iniciais(p.responsavel.nome)}</span
									>
								{/if}
								<span class="text-slate">{p.responsavel.nome}</span>
							</div>
						{:else}
							<span class="text-grey">—</span>
						{/if}
					</td>
					<td class="px-4 py-3 tabular-nums text-slate">{fmtQuando(p.updated_at)}</td>
					<td class="px-4 py-3">
						<div class="flex items-center justify-end gap-3">
							{#if podeEditar(perms, 'projetos')}
								<button
									type="button"
									class="text-slate hover:text-navy"
									onclick={() => (editando = p)}>Editar</button
								>
							{/if}
							<a
								class="font-medium text-brand no-underline hover:underline"
								href={`/projetos/${p.id}`}>Abrir</a
							>
						</div>
					</td>
				</tr>
			{/snippet}
		</DataTable>
	</Card>
{:else if data.projetos.length}
	<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each data.projetos as p (p.id)}
			{@const tecs = tecnologias(p)}
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
						{#if tecs.length}
							<div class="mt-1.5 flex flex-wrap items-center gap-2">
								{#each tecs as texto (texto)}<MarcaIcon {texto} size={16} />{/each}
							</div>
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
