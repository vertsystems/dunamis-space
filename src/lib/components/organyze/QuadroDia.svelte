<script lang="ts">
	// Modo Dia: dois lados (Empresa / Vida Pessoal), cada um com as três seções
	// de situação, e o arrastar-e-soltar que reordena e move entre elas.
	import { organyze } from '$lib/organyze/store.svelte';
	import { CATEGORIAS, CATEGORIA_COR, CATEGORIA_LABEL, STATUS_ORDEM } from '$lib/organyze/types';
	import type { Categoria, Status, Tarefa } from '$lib/organyze/types';
	import { SECAO_META } from '$lib/organyze/ui';
	import TarefaCard from './TarefaCard.svelte';
	import { Check } from '@lucide/svelte';

	let { hoje, onAbrir }: { hoje: string; onAbrir: (t: Tarefa) => void } = $props();

	let dragId = $state<string | null>(null);
	// Destino da solta: lado (coluna) + seção + índice de inserção (onde o slot abre).
	let dropCat = $state<Categoria | null>(null);
	let dropStatus = $state<Status | null>(null);
	let dropIndex = $state<number | null>(null);

	// Agrupa por lado (categoria) e status. Ordena pela POSIÇÃO manual (o usuário
	// reordena arrastando para cima/baixo, e a ordem "gruda"). O prazo continua
	// visível como etiqueta/urgência, mas não manda mais na ordem.
	function gruposLado(cat: Categoria): Record<Status, Tarefa[]> {
		const by = (s: Status) =>
			organyze.tarefasDia
				.filter((t) => t.status === s && t.categoria === cat)
				.sort((a, b) => a.posicao - b.posicao);
		return {
			em_execucao: by('em_execucao'),
			nao_iniciado: by('nao_iniciado'),
			concluida: by('concluida')
		} as Record<Status, Tarefa[]>;
	}
	const totalLado = (cat: Categoria) => organyze.tarefasDia.filter((t) => t.categoria === cat).length;

	function limparDrag() {
		dragId = null;
		dropCat = null;
		dropStatus = null;
		dropIndex = null;
	}

	/**
	 * Calcula onde o slot deve abrir na seção (lado `cat`, status `s`): percorre os
	 * cards reais (`[data-card]`, que exclui o arrastado) e acha o índice de inserção
	 * pelo ponto médio de cada um. O placeholder tem pointer-events:none e não conta
	 * como card, então o ponteiro nunca "escapa" e não há tremor.
	 */
	function calcDrop(e: DragEvent, cat: Categoria, s: Status) {
		e.preventDefault();
		if (!dragId) return;
		const alvo = e.currentTarget as HTMLElement;
		const cards = [...alvo.querySelectorAll<HTMLElement>('[data-card]')];
		let idx = cards.length;
		for (let i = 0; i < cards.length; i++) {
			const r = cards[i].getBoundingClientRect();
			if (e.clientY < r.top + r.height / 2) {
				idx = i;
				break;
			}
		}
		dropCat = cat;
		dropStatus = s;
		dropIndex = idx;
	}

	/** Some com o indicador ao sair de fato da seção (não ao trocar de card interno). */
	function aoSairSecao(e: DragEvent, cat: Categoria, s: Status) {
		if (dropCat !== cat || dropStatus !== s) return;
		const para = e.relatedTarget;
		if (para instanceof Node && (e.currentTarget as HTMLElement).contains(para)) return;
		dropCat = null;
		dropStatus = null;
		dropIndex = null;
	}

	function soltar(cat: Categoria, s: Status) {
		const from = dragId;
		const idx = dropCat === cat && dropStatus === s ? dropIndex : null;
		limparDrag();
		if (!from) return;
		// Lista completa (todos os lados/seções, na ordem visível) reinserindo o
		// arrastado na posição `idx` do grupo de destino. O lado do arrastado passa a
		// ser `cat` (arrastar entre colunas troca de lado).
		const lista: { id: string; status: Status; categoria: Categoria }[] = [];
		for (const c of CATEGORIAS) {
			const g = gruposLado(c);
			for (const st of STATUS_ORDEM) {
				const cards = g[st].filter((t) => t.id !== from);
				if (c === cat && st === s) {
					const at = idx == null ? cards.length : Math.min(idx, cards.length);
					cards.forEach((t, i) => {
						if (i === at) lista.push({ id: from, status: s, categoria: cat });
						lista.push({ id: t.id, status: st, categoria: c });
					});
					if (at >= cards.length) lista.push({ id: from, status: s, categoria: cat });
				} else {
					cards.forEach((t) => lista.push({ id: t.id, status: st, categoria: c }));
				}
			}
		}
		organyze.aplicarQuadro(lista);
	}
</script>

<!-- Slot de encaixe (placeholder) exibido no destino da solta. -->
{#snippet slot()}
	<li
		class="slot-encaixe pointer-events-none flex h-14 items-center justify-center rounded-[var(--radius)] border-2 border-dashed border-brand bg-brand-50 text-xs font-semibold text-brand"
	>
		Soltar aqui
	</li>
{/snippet}

{#if organyze.total === 0}
	<div
		class="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-grey-200 py-16 text-center"
	>
		<div class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
			<Check size={22} />
		</div>
		<p class="text-sm font-medium text-navy">
			Nenhuma tarefa {organyze.ehHoje ? 'para hoje' : 'nesse dia'}
		</p>
		<p class="text-xs text-grey mt-1">Adicione a primeira tarefa acima.</p>
	</div>
{:else}
	<div class="grid gap-4 md:grid-cols-2">
		{#each CATEGORIAS as cat (cat)}
			{@const g = gruposLado(cat)}
			<div class="space-y-2">
				<!-- Cabeçalho do lado (Empresa / Vida Pessoal) -->
				<div
					class="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2"
					style:background="color-mix(in srgb, {CATEGORIA_COR[cat]} 10%, transparent)"
				>
					<span class="size-2.5 rounded-full" style:background={CATEGORIA_COR[cat]}></span>
					<h2 class="text-sm font-bold" style:color={CATEGORIA_COR[cat]}>{CATEGORIA_LABEL[cat]}</h2>
					<span class="text-xs tabular-nums text-grey">({totalLado(cat)})</span>
				</div>

				{#each STATUS_ORDEM as s (s)}
					<section
						class="space-y-2 rounded-[var(--radius-lg)] p-1 transition-colors"
						class:bg-brand-50={dropCat === cat && dropStatus === s}
						ondragover={(e) => calcDrop(e, cat, s)}
						ondragleave={(e) => aoSairSecao(e, cat, s)}
						ondrop={() => soltar(cat, s)}
						role="list"
					>
						<div class="flex items-center gap-2 px-2 pt-1">
							<span class="size-2 rounded-full" style="background: {SECAO_META[s].cor}"></span>
							<h3 class="text-xs font-semibold uppercase tracking-wider text-grey">
								{SECAO_META[s].label}
								<span class="text-grey/70 tabular-nums">({g[s].length})</span>
							</h3>
							{#if s === 'concluida' && g[s].length}
								<button
									class="ml-auto text-xs font-semibold text-grey hover:text-brand-danger transition-colors"
									onclick={() => organyze.limparConcluidas(cat)}
								>
									Limpar
								</button>
							{/if}
						</div>

						{#if g[s].length}
							<ul class="space-y-2">
								{#each g[s] as t, i (t.id)}
									{#if dropCat === cat && dropStatus === s && dropIndex === i}
										{@render slot()}
									{/if}
									<TarefaCard
										tarefa={t}
										{hoje}
										arrastando={dragId === t.id}
										aoFundo={dragId !== null && dragId !== t.id}
										onDragStart={() => (dragId = t.id)}
										onDragEnd={limparDrag}
										onAbrir={() => onAbrir(t)}
									/>
								{/each}
								{#if dropCat === cat && dropStatus === s && (dropIndex ?? -1) >= g[s].length}
									{@render slot()}
								{/if}
							</ul>
						{:else}
							<div
								class="rounded-[var(--radius)] border border-dashed py-4 text-center text-[11px] transition-colors"
								class:border-brand={dropCat === cat && dropStatus === s}
								class:text-brand={dropCat === cat && dropStatus === s}
								class:border-grey-200={!(dropCat === cat && dropStatus === s)}
								class:text-grey={!(dropCat === cat && dropStatus === s)}
							>
								{dropCat === cat && dropStatus === s ? 'Solte aqui' : 'Arraste tarefas para cá'}
							</div>
						{/if}
					</section>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<style>
	/* Slot de encaixe surge abrindo o espaço no destino da solta.
	   Via classe, não `style="animation:…"`: o Svelte prefixa o nome do keyframe
	   ao compilar e não reescreve estilos inline — pelo atributo, a animação
	   silenciosamente não rodava. */
	.slot-encaixe {
		animation: slotIn 160ms ease-out;
	}
	@keyframes slotIn {
		from {
			opacity: 0;
			height: 0;
			margin-top: -0.5rem;
		}
		to {
			opacity: 1;
			height: 3.5rem;
		}
	}
</style>
