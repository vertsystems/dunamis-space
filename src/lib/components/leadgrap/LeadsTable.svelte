<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { Card, Badge, Button, Input, Select, EmptyState } from '$lib/components/ui';
	import type { BadgeTone } from '$lib/components/ui';
	import {
		Search,
		Upload,
		Download,
		Globe,
		AtSign,
		MessageCircle,
		Pencil,
		Trash2,
		Star
	} from '@lucide/svelte';
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import { toast } from '$lib/toast.svelte';
	import CategoryAvatar from './CategoryAvatar.svelte';
	import LeadDetailModal from './LeadDetailModal.svelte';
	import ContactDialog from './ContactDialog.svelte';
	import { parseLeadsCsv, downloadLeadsCsv } from '$lib/leadgrap/csv';
	import {
		STAGES,
		STAGE_LABEL,
		STAGE_TONE,
		TIER_TONE,
		leadScore,
		parseTags,
		whatsappLink,
		followupInfo,
		formatDate,
		type LeadDTO,
		type LeadStage
	} from '$lib/leadgrap/types';

	const PAGE_SIZE = 10;

	let search = $state('');
	let stageFilter = $state('all');
	let categoryFilter = $state('all');
	let contactFilter = $state('all'); // all | email | no-email
	let websiteFilter = $state('all'); // all | with | without
	let scoreFilter = $state('all'); // all | quente | morno | frio
	let assignedFilter = $state('all'); // all | unassigned | <id>
	let minRating = $state(0);
	let sortBy = $state('recent');
	let page = $state(1);
	let selected = new SvelteSet<string>();
	let editing = $state<LeadDTO | null>(null);
	let contacting = $state<LeadDTO | null>(null);
	let importing = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	const SORT_OPTIONS = [
		{ v: 'recent', l: 'Mais recentes' },
		{ v: 'score', l: 'Melhor score' },
		{ v: 'rating', l: 'Maior nota' },
		{ v: 'reviews', l: 'Mais avaliações' },
		{ v: 'followup', l: 'Próximo follow-up' }
	];

	const categories = $derived(
		Array.from(new Set(leadgrap.leads.map((l) => l.category).filter(Boolean) as string[])).sort(
			(a, b) => a.localeCompare(b, 'pt-BR')
		)
	);

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		let list = leadgrap.leads.filter((l) => {
			if (q) {
				const hit =
					l.name.toLowerCase().includes(q) ||
					(l.category?.toLowerCase().includes(q) ?? false) ||
					(l.phone?.toLowerCase().includes(q) ?? false) ||
					(l.email?.toLowerCase().includes(q) ?? false);
				if (!hit) return false;
			}
			if (stageFilter !== 'all' && l.stage !== stageFilter) return false;
			if (categoryFilter !== 'all' && l.category !== categoryFilter) return false;
			if (contactFilter === 'email' && !l.email) return false;
			if (contactFilter === 'no-email' && l.email) return false;
			if (websiteFilter === 'with' && !l.hasWebsite) return false;
			if (websiteFilter === 'without' && l.hasWebsite) return false;
			if (minRating > 0 && (l.rating ?? 0) < minRating) return false;
			if (scoreFilter !== 'all' && leadScore(l).tier !== scoreFilter) return false;
			if (assignedFilter === 'unassigned' && l.assignedToId) return false;
			if (assignedFilter !== 'all' && assignedFilter !== 'unassigned' && l.assignedToId !== assignedFilter)
				return false;
			return true;
		});
		const recent = (a: LeadDTO, b: LeadDTO) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		list = [...list].sort((a, b) => {
			if (sortBy === 'score') return leadScore(b).score - leadScore(a).score || recent(a, b);
			if (sortBy === 'rating') return (b.rating ?? -1) - (a.rating ?? -1) || recent(a, b);
			if (sortBy === 'reviews') return (b.reviewCount ?? -1) - (a.reviewCount ?? -1) || recent(a, b);
			if (sortBy === 'followup') {
				const av = a.nextContactAt ? new Date(a.nextContactAt).getTime() : Infinity;
				const bv = b.nextContactAt ? new Date(b.nextContactAt).getTime() : Infinity;
				return av - bv || recent(a, b);
			}
			return recent(a, b);
		});
		return list;
	});

	const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
	const pageItems = $derived(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
	const hasActiveFilters = $derived(
		search !== '' ||
			stageFilter !== 'all' ||
			categoryFilter !== 'all' ||
			contactFilter !== 'all' ||
			websiteFilter !== 'all' ||
			scoreFilter !== 'all' ||
			assignedFilter !== 'all' ||
			minRating > 0
	);

	// Reset de página quando os filtros/ordenação mudam.
	const filterKey = $derived(
		`${search}|${stageFilter}|${categoryFilter}|${contactFilter}|${websiteFilter}|${scoreFilter}|${assignedFilter}|${minRating}|${sortBy}`
	);
	let ultimoFilterKey = filterKey;
	$effect(() => {
		if (filterKey !== ultimoFilterKey) {
			ultimoFilterKey = filterKey;
			page = 1;
		}
		if (page > totalPages) page = totalPages;
	});

	// Remove da seleção ids que não existem mais.
	$effect(() => {
		const existentes = new Set(leadgrap.leads.map((l) => l.id));
		for (const id of selected) if (!existentes.has(id)) selected.delete(id);
	});

	const pageAllSelected = $derived(pageItems.length > 0 && pageItems.every((l) => selected.has(l.id)));

	function togglePageAll() {
		if (pageAllSelected) for (const l of pageItems) selected.delete(l.id);
		else for (const l of pageItems) selected.add(l.id);
	}

	function limparFiltros() {
		search = '';
		stageFilter = 'all';
		categoryFilter = 'all';
		contactFilter = 'all';
		websiteFilter = 'all';
		scoreFilter = 'all';
		assignedFilter = 'all';
		minRating = 0;
	}

	async function moverSelecionados(stage: string) {
		if (!stage) return;
		await leadgrap.bulkStage([...selected], stage as LeadStage);
		selected.clear();
	}
	async function atribuirSelecionados(value: string) {
		await leadgrap.bulkAssign([...selected], value === 'unassign' ? null : value);
		selected.clear();
	}
	async function excluirSelecionados() {
		if (!confirm(`Excluir ${selected.size} lead(s) selecionado(s)?`)) return;
		await leadgrap.removeLeads([...selected]);
		selected.clear();
	}
	async function excluirUm(id: string) {
		if (!confirm('Excluir este lead?')) return;
		await leadgrap.removeLead(id);
	}

	async function importar(file: File) {
		importing = true;
		try {
			const rows = parseLeadsCsv(await file.text());
			if (!rows.length) {
				toast.error("Nenhum lead válido encontrado. Verifique se há uma coluna 'Nome'.");
				return;
			}
			const { created, skipped } = await leadgrap.importLeads(rows);
			toast.success(`Importação concluída: ${created} novos, ${skipped} já existiam.`);
		} finally {
			importing = false;
			if (fileInput) fileInput.value = '';
		}
	}

	function dominio(url: string | null): string | null {
		if (!url) return null;
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}
</script>

{#if leadgrap.leads.length === 0}
	<Card>
		<EmptyState
			icon="map"
			title="Nenhum lead ainda"
			description="Use a Captura para trazer leads do Google Maps ou importe um CSV."
		/>
	</Card>
{:else}
	<Card padding="none">
		<!-- Cabeçalho + ações -->
		<div class="flex flex-wrap items-center justify-between gap-3 border-b border-grey-200 p-4">
			<div class="flex items-center gap-2">
				<h2 class="text-sm font-semibold text-navy">Leads capturados</h2>
				<Badge tone="brand">{filtered.length} lead{filtered.length === 1 ? '' : 's'}</Badge>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				{#if selected.size > 0}
					<span class="text-xs font-medium text-grey">{selected.size} selec.</span>
					<Select value="" onchange={(e) => moverSelecionados((e.currentTarget as HTMLSelectElement).value)}>
						<option value="">Mover para…</option>
						{#each STAGES as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
					</Select>
					<Select value="" onchange={(e) => atribuirSelecionados((e.currentTarget as HTMLSelectElement).value)}>
						<option value="">Atribuir a…</option>
						<option value="unassign">Remover responsável</option>
						{#each leadgrap.colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
					</Select>
					<Button variant="danger" size="sm" onclick={excluirSelecionados}>Excluir</Button>
				{/if}
				<input
					bind:this={fileInput}
					type="file"
					accept=".csv"
					class="hidden"
					onchange={(e) => {
						const f = e.currentTarget.files?.[0];
						if (f) importar(f);
					}}
				/>
				<Button variant="secondary" size="sm" disabled={importing} onclick={() => fileInput?.click()}>
					<Upload size={15} /> {importing ? 'Importando…' : 'Importar'}
				</Button>
				<Button variant="secondary" size="sm" disabled={filtered.length === 0} onclick={() => downloadLeadsCsv(filtered)}>
					<Download size={15} /> Exportar CSV
				</Button>
			</div>
		</div>

		<!-- Filtros -->
		<div class="flex flex-wrap items-center gap-2 border-b border-grey-200 p-4">
			<div class="relative min-w-[200px] flex-1">
				<Search size={15} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
				<input
					class="h-10 w-full rounded-[var(--radius)] border border-grey-200 bg-surface pl-9 pr-3 text-sm text-navy-900 outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
					placeholder="Buscar por nome, categoria, telefone…"
					bind:value={search}
				/>
			</div>
			<Select bind:value={stageFilter}>
				<option value="all">Todos os estágios</option>
				{#each STAGES as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</Select>
			<Select bind:value={categoryFilter}>
				<option value="all">Todas as categorias</option>
				{#each categories as c (c)}<option value={c}>{c}</option>{/each}
			</Select>
			<Select bind:value={assignedFilter}>
				<option value="all">Todos os responsáveis</option>
				<option value="unassigned">Não atribuído</option>
				{#each leadgrap.colaboradores as c (c.id)}<option value={c.id}>{c.nome}</option>{/each}
			</Select>
			<Select bind:value={contactFilter}>
				<option value="all">E-mail: todos</option>
				<option value="email">Com e-mail</option>
				<option value="no-email">Sem e-mail</option>
			</Select>
			<Select bind:value={websiteFilter}>
				<option value="all">Site: todos</option>
				<option value="with">Com site</option>
				<option value="without">Sem site</option>
			</Select>
			<Select value={String(minRating)} onchange={(e) => (minRating = Number((e.currentTarget as HTMLSelectElement).value))}>
				<option value="0">Nota: qualquer</option>
				<option value="3">≥ 3,0</option>
				<option value="4">≥ 4,0</option>
				<option value="4.5">≥ 4,5</option>
			</Select>
			<Select bind:value={scoreFilter}>
				<option value="all">Score: todos</option>
				<option value="quente">🔥 Quente</option>
				<option value="morno">Morno</option>
				<option value="frio">Frio</option>
			</Select>
			<Select bind:value={sortBy} wrapperClass="ml-auto">
				{#each SORT_OPTIONS as o (o.v)}<option value={o.v}>{o.l}</option>{/each}
			</Select>
			{#if hasActiveFilters}
				<Button variant="ghost" size="sm" onclick={limparFiltros}>Limpar filtros</Button>
			{/if}
		</div>

		<!-- Tabela -->
		<div class="overflow-x-auto">
			<table class="w-full min-w-[1000px] text-sm">
				<thead>
					<tr class="border-b border-grey-200 text-left text-xs text-grey">
						<th class="w-10 p-3">
							<input type="checkbox" checked={pageAllSelected} onchange={togglePageAll} aria-label="Selecionar página" />
						</th>
						<th class="p-3 font-medium">Lead</th>
						<th class="p-3 font-medium">Nota</th>
						<th class="p-3 font-medium">Telefone</th>
						<th class="p-3 font-medium">E-mail</th>
						<th class="p-3 font-medium">Follow-up</th>
						<th class="p-3 font-medium">Estágio</th>
						<th class="p-3 text-right font-medium">Ações</th>
					</tr>
				</thead>
				<tbody>
					{#each pageItems as l (l.id)}
						{@const sc = leadScore(l)}
						<tr class="border-b border-grey-100 hover:bg-bg/50">
							<td class="p-3 align-top">
								<input type="checkbox" checked={selected.has(l.id)} onchange={() => (selected.has(l.id) ? selected.delete(l.id) : selected.add(l.id))} aria-label="Selecionar lead" />
							</td>
							<td class="p-3 align-top">
								<div class="flex items-start gap-2.5">
									<CategoryAvatar category={l.category} />
									<div class="min-w-0">
										<div class="flex items-center gap-1.5">
											<button class="truncate text-left font-medium text-navy hover:text-brand" onclick={() => (editing = l)}>{l.name}</button>
											<Badge tone={TIER_TONE[sc.tier] as BadgeTone}>{sc.tier === 'quente' ? '🔥' : sc.score}</Badge>
										</div>
										<p class="truncate text-xs text-grey">{dominio(l.website) ?? l.category ?? l.phone ?? '—'}</p>
										<p class="text-xs text-grey">👤 {l.assignedToName ?? 'Não atribuído'}</p>
										{#if parseTags(l.tags).length}
											<div class="mt-1 flex flex-wrap gap-1">
												{#each parseTags(l.tags) as t (t)}<Badge tone="brand">{t}</Badge>{/each}
											</div>
										{/if}
									</div>
								</div>
							</td>
							<td class="p-3 align-top">
								{#if l.rating != null}
									<div class="flex items-center gap-1 text-navy"><Star size={12} class="text-warning" /> {l.rating.toFixed(1)}</div>
									<span class="text-xs text-grey">({l.reviewCount ?? 0})</span>
								{:else}<span class="text-grey">—</span>{/if}
							</td>
							<td class="p-3 align-top">
								{#if l.phone}
									<div class="text-navy">{l.phone}</div>
									<a href={whatsappLink(l.phone)} target="_blank" rel="noopener" class="text-xs text-brand hover:underline">WhatsApp</a>
								{:else}<span class="text-grey">—</span>{/if}
							</td>
							<td class="p-3 align-top">
								{#if l.email}<a href={`mailto:${l.email}`} class="block max-w-[170px] truncate text-brand hover:underline">{l.email}</a>{:else}<span class="text-grey">—</span>{/if}
							</td>
							<td class="p-3 align-top">
								{#if l.nextContactAt}
									{@const f = followupInfo(l.nextContactAt)}
									<Badge tone={f.tone as BadgeTone}>{f.label}</Badge>
								{:else}<span class="text-xs text-grey">{formatDate(l.createdAt)}</span>{/if}
							</td>
							<td class="p-3 align-top">
								<div class="flex flex-col items-start gap-1">
									<Badge tone={STAGE_TONE[l.stage] as BadgeTone}>{STAGE_LABEL[l.stage]}</Badge>
									<Badge tone={l.hasWebsite ? 'success' : 'danger'}>{l.hasWebsite ? 'Tem site' : 'Sem site'}</Badge>
								</div>
							</td>
							<td class="p-3 align-top">
								<div class="flex items-center justify-end gap-1">
									{#if l.website}<a href={l.website} target="_blank" rel="noopener" class="grid size-8 place-items-center rounded-md text-success hover:bg-bg" title="Site"><Globe size={15} /></a>{/if}
									{#if l.instagram}<a href={l.instagram} target="_blank" rel="noopener" class="grid size-8 place-items-center rounded-md text-brand hover:bg-bg" title="Instagram"><AtSign size={15} /></a>{/if}
									<button class="grid size-8 place-items-center rounded-md text-slate hover:bg-bg hover:text-navy" title="Mensagem" onclick={() => (contacting = l)}><MessageCircle size={15} /></button>
									<button class="grid size-8 place-items-center rounded-md text-slate hover:bg-bg hover:text-navy" title="Editar" onclick={() => (editing = l)}><Pencil size={15} /></button>
									<button class="grid size-8 place-items-center rounded-md text-slate hover:bg-brand-danger/10 hover:text-brand-danger" title="Excluir" onclick={() => excluirUm(l.id)}><Trash2 size={15} /></button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="8" class="p-8 text-center text-grey">
								Nenhum lead corresponde aos filtros.
								<button class="ml-1 text-brand hover:underline" onclick={limparFiltros}>Limpar filtros</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Paginação -->
		{#if totalPages > 1}
			<div class="flex items-center justify-between p-4 text-sm text-grey">
				<span>Página {page} de {totalPages}</span>
				<div class="flex gap-2">
					<Button variant="secondary" size="sm" disabled={page <= 1} onclick={() => (page -= 1)}>Anterior</Button>
					<Button variant="secondary" size="sm" disabled={page >= totalPages} onclick={() => (page += 1)}>Próxima</Button>
				</div>
			</div>
		{/if}
	</Card>
{/if}

{#if editing}
	<LeadDetailModal
		lead={editing}
		onClose={() => (editing = null)}
		onSaved={(l) => (editing = l)}
	/>
{/if}

{#if contacting}
	<ContactDialog
		lead={contacting}
		onClose={() => (contacting = null)}
		onContacted={() => (contacting = null)}
	/>
{/if}
