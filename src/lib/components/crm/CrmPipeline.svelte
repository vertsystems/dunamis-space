<script lang="ts">
	// Quadro do funil no formato do Pipedrive: coluna estreita com faixa colorida
	// e o total da etapa no topo, e cards de três linhas (negócio, quem, quanto).
	//
	// O card era alto — trazia o valor em corpo grande, uma etiqueta inteira para
	// a próxima atividade e dois botões de largura total. Cabiam três ou quatro
	// por tela; agora cabem o dobro, que é o ponto de um kanban: ver a coluna
	// inteira sem rolar. O que saiu do corpo do card virou sinal compacto: a
	// atividade é o pontinho colorido (com a data no title) e ganho/perdido são
	// dois ícones que só aparecem no hover, sobrepostos, sem ocupar altura.
	import Icon from '$lib/components/Icon.svelte';
	import {
		formatBRL,
		stageDot,
		iniciais,
		vencimentoDe,
		formatDataHora,
		type Negocio,
		type Stage,
		type Vencimento
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

	/**
	 * Semáforo da próxima atividade — o "rotting" do Pipedrive.
	 * Sem atividade agendada é o caso que mais importa: é o negócio que ninguém
	 * está tocando, e por isso ganha um ponto vazado em vez de nenhum ponto.
	 */
	const PONTO: Record<Vencimento, { classe: string; rotulo: string }> = {
		atrasada: { classe: 'bg-brand-danger', rotulo: 'Follow-up atrasado' },
		hoje: { classe: 'bg-brand-amber', rotulo: 'Follow-up hoje' },
		em_breve: { classe: 'bg-brand-green', rotulo: 'Follow-up esta semana' },
		futura: { classe: 'bg-brand-green/50', rotulo: 'Follow-up agendado' },
		sem_data: { classe: 'border border-grey-200 bg-transparent', rotulo: 'Sem follow-up agendado' }
	};

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
	<div
		class="grid items-start gap-1.5 overflow-x-auto pb-2 pt-1"
		style="grid-template-columns: repeat({stages.length}, minmax(175px, 1fr))"
	>
		{#each stages as col (col.id)}
			{@const lista = daColuna(col.id)}
			{@const soma = somaColuna(col.id)}
			<div
				class="min-w-0 rounded-[var(--radius)] bg-bg/70 p-1.5 transition-colors {overCol === col.id
					? 'outline-2 outline-dashed outline-brand [outline-offset:-2px]'
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
				<!-- Cabeçalho da etapa: faixa de cor + nome + total -->
				<div class="mb-1.5 px-0.5">
					<div class="h-1 rounded-full {stageDot(col.cor)}"></div>
					<div class="mt-1.5 flex items-center gap-1">
						<span
							class="min-w-0 flex-1 truncate text-[0.62rem] font-bold uppercase tracking-wide text-slate"
							title={col.nome}
						>
							{col.nome}
						</span>
						<span class="shrink-0 text-[0.62rem] tabular-nums text-grey">{lista.length}</span>
						<button
							type="button"
							class="grid size-5 shrink-0 place-items-center rounded text-grey transition-colors hover:bg-surface hover:text-brand"
							title="Novo negócio nesta etapa"
							aria-label="Novo negócio nesta etapa"
							onclick={() => onNovo(col.id)}
						>
							<Icon name="plus" size={13} />
						</button>
					</div>
					<div class="text-[0.68rem] font-semibold tabular-nums text-navy">
						{soma > 0 ? formatBRL(soma) : '—'}
					</div>
				</div>

				{#each lista as n (n.id)}
					{@const ponto = PONTO[vencimentoDe(n.prox_atividade)]}
					<div
						class="group relative mb-1 cursor-grab rounded-[var(--radius-sm)] border border-grey-200 bg-surface px-2 py-1.5 shadow-xs transition-colors hover:border-grey active:cursor-grabbing {dragId ===
						n.id
							? 'opacity-40'
							: ''} {overCol === col.id && overId === n.id ? 'border-t-2 border-t-brand' : ''}"
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
						<!-- Sem reserva de espaço à direita: os botões de ganho/perdido têm
						     fundo próprio e cobrem o fim do título só enquanto o mouse está
						     no card. Reservar a faixa o tempo todo truncava o título à toa. -->
						<button
							type="button"
							class="block w-full truncate text-left text-[0.8rem] font-medium leading-tight text-navy hover:text-brand"
							title={n.titulo}
							onclick={() => onOpen(n.id)}
						>
							{n.titulo}
						</button>

						{#if n.contato_nome || n.contato_empresa}
							<div class="mt-0.5 truncate text-[0.68rem] leading-tight text-grey">
								{n.contato_empresa ?? n.contato_nome}
							</div>
						{/if}

						<div class="mt-1 flex items-center gap-1.5">
							<span
								class="size-2 shrink-0 rounded-full {ponto.classe}"
								title={n.prox_atividade
									? `${ponto.rotulo} · ${formatDataHora(n.prox_atividade)}`
									: ponto.rotulo}
							></span>
							<span class="min-w-0 flex-1 truncate text-[0.72rem] font-semibold tabular-nums text-navy">
								{n.valor > 0 ? formatBRL(n.valor) : ''}
							</span>
							{#if n.responsavel_nome}
								<span
									class="grid size-5 shrink-0 place-items-center rounded-full bg-navy text-[0.55rem] font-bold text-white"
									title={n.responsavel_nome}
								>
									{iniciais(n.responsavel_nome)}
								</span>
							{/if}
						</div>

						<!-- Ganho/perdido sobrepostos: aparecem no hover e não somam altura. -->
						<div
							class="absolute right-1 top-1 flex gap-0.5 rounded bg-surface pl-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
						>
							<button
								type="button"
								class="grid size-5 place-items-center rounded bg-brand-green/15 text-brand-green transition-colors hover:bg-brand-green hover:text-white"
								title="Marcar como ganho"
								aria-label="Marcar como ganho"
								onclick={() => onGanho(n.id)}
							>
								<Icon name="check" size={12} />
							</button>
							<button
								type="button"
								class="grid size-5 place-items-center rounded bg-brand-danger/15 text-brand-danger transition-colors hover:bg-brand-danger hover:text-white"
								title="Marcar como perdido"
								aria-label="Marcar como perdido"
								onclick={() => onPerdido(n.id)}
							>
								<Icon name="x" size={12} />
							</button>
						</div>
					</div>
				{/each}

				{#if overCol === col.id && overId === null && lista.length}
					<div class="mx-1 mb-1 h-0.5 rounded bg-brand"></div>
				{/if}

				{#if !lista.length}
					<p class="px-1 py-5 text-center text-[0.68rem] text-grey">Arraste um negócio para cá</p>
				{/if}
			</div>
		{/each}
	</div>
{/if}
