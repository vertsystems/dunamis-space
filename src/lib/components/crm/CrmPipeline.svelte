<script lang="ts">
	import { Badge } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import {
		formatBRL,
		stageDot,
		iniciais,
		vencimentoDe,
		vencimentoTone,
		formatDataHora,
		type Negocio,
		type Stage
	} from '$lib/crm';

	let {
		stages = [],
		negocios = [],
		onOpen,
		onMove,
		onGanho,
		onPerdido,
		onNovo
	}: {
		stages?: Stage[];
		negocios?: Negocio[];
		onOpen: (id: string) => void;
		onMove: (id: string, stageId: string, orderedIds: string[]) => void;
		onGanho: (id: string) => void;
		onPerdido: (id: string) => void;
		onNovo: (stageId: string) => void;
	} = $props();

	// Só negócios abertos entram no quadro.
	const abertos = $derived(negocios.filter((n) => n.status === 'aberto'));

	function daColuna(stageId: string): Negocio[] {
		return abertos.filter((n) => n.stage_id === stageId).sort((a, b) => a.ordem - b.ordem);
	}
	function somaColuna(stageId: string): number {
		return daColuna(stageId).reduce((s, n) => s + n.valor, 0);
	}

	let dragId: string | null = $state(null);
	let overCol: string | null = $state(null);
	// Id do card sobre o qual vamos inserir (antes dele); null = inserir no fim da coluna.
	let overId: string | null = $state(null);

	function resetDrag() {
		dragId = null;
		overCol = null;
		overId = null;
	}

	function onDrop(stageId: string) {
		const id = dragId;
		const alvoCol = overCol;
		const before = overId;
		resetDrag();
		if (!id || alvoCol !== stageId) return;

		// Insere por ID (robusto a deslocamento de índice ao remover o card arrastado).
		const lista = daColuna(stageId).filter((n) => n.id !== id);
		let pos = before && before !== id ? lista.findIndex((n) => n.id === before) : lista.length;
		if (pos < 0) pos = lista.length;
		const ordered = [
			...lista.slice(0, pos).map((n) => n.id),
			id,
			...lista.slice(pos).map((n) => n.id)
		];
		onMove(id, stageId, ordered);
	}
</script>

{#if !stages.length}
	<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
		Nenhum funil configurado ainda. Aplique a migration <code class="font-mono">0005_crm.sql</code>.
	</div>
{:else}
	<div class="flex gap-3 overflow-x-auto pb-2 items-start">
		{#each stages as col (col.id)}
			{@const lista = daColuna(col.id)}
			<div
				class="w-72 shrink-0 rounded-[var(--radius-lg)] bg-bg p-2.5 transition-colors {overCol ===
				col.id
					? 'outline-2 outline-dashed outline-brand'
					: ''}"
				role="list"
				ondragover={(e) => {
					e.preventDefault();
					overCol = col.id;
					overId = null;
				}}
				ondragleave={(e) => {
					if (e.currentTarget === e.target && overCol === col.id) {
						overCol = null;
						overId = null;
					}
				}}
				ondrop={() => onDrop(col.id)}
			>
				<div class="flex items-center justify-between gap-2 mb-2.5 px-1">
					<div class="flex items-center gap-2 font-semibold text-navy text-sm min-w-0">
						<span class="size-2.5 rounded-full shrink-0 {stageDot(col.cor)}"></span>
						<span class="truncate">{col.nome}</span>
						<span class="rounded-full bg-surface px-1.5 text-xs text-grey font-normal shrink-0">
							{lista.length}
						</span>
					</div>
					<button
						type="button"
						class="grid size-6 place-items-center rounded-md text-grey hover:bg-surface hover:text-brand shrink-0"
						title="Novo negócio nesta etapa"
						aria-label="Novo negócio nesta etapa"
						onclick={() => onNovo(col.id)}
					>
						<Icon name="plus" size={15} />
					</button>
				</div>
				{#if somaColuna(col.id) > 0}
					<div class="px-1 mb-2 text-xs text-grey tabular-nums">{formatBRL(somaColuna(col.id))}</div>
				{/if}

				{#each lista as n (n.id)}
					{@const venc = vencimentoDe(n.prox_atividade)}
					<div
						class="group bg-surface border border-grey-200 rounded-[var(--radius)] px-3 py-2.5 mb-2 cursor-grab active:cursor-grabbing hover:border-grey {dragId ===
						n.id
							? 'opacity-40'
							: ''} {overCol === col.id && overId === n.id
							? 'border-t-2 border-t-brand'
							: ''}"
						draggable="true"
						role="listitem"
						ondragstart={() => (dragId = n.id)}
						ondragend={resetDrag}
						ondragover={(e) => {
							e.preventDefault();
							e.stopPropagation();
							overCol = col.id;
							overId = n.id;
						}}
					>
						<button
							type="button"
							class="block w-full text-left font-medium text-navy hover:text-brand"
							onclick={() => onOpen(n.id)}
						>
							{n.titulo}
						</button>
						{#if n.contato_nome || n.contato_empresa}
							<div class="text-xs text-grey truncate mt-0.5">
								{n.contato_empresa ?? n.contato_nome}
							</div>
						{/if}
						<div class="flex items-center justify-between gap-2 mt-2">
							{#if n.valor > 0}
								<span class="text-sm font-semibold text-navy tabular-nums">{formatBRL(n.valor)}</span>
							{:else}
								<span class="text-xs text-grey">Sem valor</span>
							{/if}
							{#if n.responsavel_nome}
								<span
									class="grid size-6 place-items-center rounded-full bg-navy text-white text-[0.6rem] font-bold shrink-0"
									title={n.responsavel_nome}
								>
									{iniciais(n.responsavel_nome)}
								</span>
							{/if}
						</div>
						{#if n.prox_atividade}
							<div class="mt-2">
								<Badge tone={vencimentoTone(venc)}>
									<Icon name="clock" size={11} />
									{formatDataHora(n.prox_atividade)}
								</Badge>
							</div>
						{/if}
						<div
							class="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
						>
							<button
								type="button"
								class="flex-1 flex items-center justify-center gap-1 rounded-md bg-brand-green/10 text-brand-green py-1 text-xs font-semibold hover:bg-brand-green/20"
								onclick={() => onGanho(n.id)}
							>
								<Icon name="check" size={13} /> Ganho
							</button>
							<button
								type="button"
								class="flex-1 flex items-center justify-center gap-1 rounded-md bg-brand-danger/10 text-brand-danger py-1 text-xs font-semibold hover:bg-brand-danger/20"
								onclick={() => onPerdido(n.id)}
							>
								<Icon name="x" size={13} /> Perdido
							</button>
						</div>
					</div>
				{/each}

				{#if overCol === col.id && overId === null && lista.length}
					<div class="h-0.5 rounded bg-brand mx-1 mb-1"></div>
				{/if}

				{#if !lista.length}
					<p class="px-1 py-6 text-center text-xs text-grey">Arraste um negócio para cá</p>
				{/if}
			</div>
		{/each}
	</div>
{/if}
