<script lang="ts">
	// Metas do mês: adicionar, marcar concluída, avançar de um em um (quando o
	// alvo é maior que 1), renomear em linha e excluir.
	import { organyze } from '$lib/organyze/store.svelte';
	import { metaConcluida, metaPct } from '$lib/organyze/types';
	import type { Meta } from '$lib/organyze/types';
	import { Button } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { Check, Minus, Pencil, Plus, Trash2 } from '@lucide/svelte';

	let novoTitulo = $state('');
	let novoAlvo = $state(1);

	let editId = $state<string | null>(null);
	let eTitulo = $state('');
	let eAlvo = $state(1);
	let eUnidade = $state('');

	function adicionar() {
		if (organyze.addMeta(novoTitulo, novoAlvo)) {
			novoTitulo = '';
			novoAlvo = 1;
		}
	}
	function abrirEdicao(m: Meta) {
		editId = m.id;
		eTitulo = m.titulo;
		eAlvo = m.alvo;
		eUnidade = m.unidade;
	}
	function salvarEdicao() {
		if (editId) organyze.editMeta(editId, { titulo: eTitulo, alvo: eAlvo, unidade: eUnidade });
		editId = null;
	}
</script>

<!-- Adicionar meta -->
<div class="flex flex-wrap gap-2">
	<input
		class="h-11 min-w-[12rem] flex-1 rounded-[var(--radius)] border border-grey-200 bg-surface px-4 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
		placeholder="Nova meta do mês…"
		bind:value={novoTitulo}
		onkeydown={(e) => e.key === 'Enter' && adicionar()}
	/>
	<div class="flex items-center gap-1.5 rounded-[var(--radius)] border border-grey-200 bg-surface px-3">
		<span class="text-xs font-medium text-grey">Alvo</span>
		<input
			type="number"
			min="1"
			bind:value={novoAlvo}
			class="h-11 w-14 bg-transparent text-sm text-navy outline-none"
		/>
	</div>
	<Button onclick={adicionar} disabled={!novoTitulo.trim()}>
		<Plus size={18} /> Adicionar
	</Button>
</div>

{#if organyze.loadingMetas}
	<div class="flex justify-center py-16 text-grey">
		<span class="size-7 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
	</div>
{:else if organyze.metas.length === 0}
	<div
		class="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-grey-200 py-16 text-center"
	>
		<div class="grid size-12 place-items-center rounded-full bg-bg text-grey mb-3">
			<Icon name="chart" size={22} />
		</div>
		<p class="text-sm font-medium text-navy">Nenhuma meta neste mês</p>
		<p class="text-xs text-grey mt-1">Adicione a primeira meta acima.</p>
	</div>
{:else}
	<ul class="space-y-2">
		{#each organyze.metas as m (m.id)}
			{@const feita = metaConcluida(m)}
			<li
				class="group rounded-[var(--radius-lg)] border border-grey-200 bg-surface px-4 py-3 shadow-xs transition-colors hover:border-grey"
			>
				{#if editId === m.id}
					<!-- Edição inline -->
					<div class="flex flex-wrap items-center gap-2">
						<input
							class="h-9 min-w-[10rem] flex-1 rounded-[var(--radius)] border border-brand bg-surface px-3 text-sm text-navy-900 outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
							bind:value={eTitulo}
							onkeydown={(e) => e.key === 'Enter' && salvarEdicao()}
						/>
						<div class="flex items-center gap-1.5 rounded-[var(--radius)] border border-grey-200 px-2">
							<span class="text-[11px] text-grey">Alvo</span>
							<input
								type="number"
								min="1"
								bind:value={eAlvo}
								class="h-9 w-12 bg-transparent text-sm text-navy outline-none"
							/>
						</div>
						<input
							class="h-9 w-24 rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-sm text-navy outline-none focus-visible:border-brand"
							placeholder="unidade"
							bind:value={eUnidade}
						/>
						<Button size="sm" onclick={salvarEdicao}>Salvar</Button>
						<button class="text-xs font-medium text-grey hover:text-navy" onclick={() => (editId = null)}>
							Cancelar
						</button>
					</div>
				{:else}
					<div class="flex items-center gap-3">
						<!-- Toggle concluída -->
						<button
							class="grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors"
							class:border-grey-200={!feita}
							class:border-brand-green={feita}
							class:bg-brand-green={feita}
							class:text-white={feita}
							aria-label={feita ? 'Reabrir meta' : 'Concluir meta'}
							onclick={() => organyze.toggleMeta(m.id)}
						>
							{#if feita}<Check size={14} strokeWidth={3} />{/if}
						</button>

						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<span
									class="truncate text-sm font-medium"
									class:text-navy={!feita}
									class:text-grey={feita}
									class:line-through={feita}>{m.titulo}</span
								>
								<span class="shrink-0 text-xs tabular-nums text-grey">
									{m.atual}/{m.alvo}{m.unidade ? ` ${m.unidade}` : ''}
								</span>
							</div>
							<div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg">
								<div
									class="h-full rounded-full transition-all duration-300"
									style="width: {metaPct(m)}%; background: {feita
										? 'var(--color-brand-green)'
										: 'var(--color-brand)'}"
								></div>
							</div>
						</div>

						<!-- Controles -->
						<div class="flex shrink-0 items-center gap-1">
							<!-- +/- de progresso só quando o alvo é maior que 1 (senão o
							     círculo de concluir já resolve a meta binária). -->
							{#if m.alvo > 1}
								<button
									class="grid size-7 place-items-center rounded-md border border-grey-200 text-grey hover:bg-bg hover:text-navy transition-colors disabled:opacity-40"
									aria-label="Diminuir"
									disabled={m.atual <= 0}
									onclick={() => organyze.incMeta(m.id, -1)}
								>
									<Minus size={14} />
								</button>
								<button
									class="grid size-7 place-items-center rounded-md border border-grey-200 text-grey hover:bg-bg hover:text-navy transition-colors disabled:opacity-40"
									aria-label="Aumentar"
									disabled={m.atual >= m.alvo}
									onclick={() => organyze.incMeta(m.id, 1)}
								>
									<Plus size={14} />
								</button>
							{/if}
							<button
								class="grid size-7 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-bg hover:text-navy group-hover:opacity-100"
								aria-label="Editar meta"
								onclick={() => abrirEdicao(m)}
							>
								<Pencil size={14} />
							</button>
							<button
								class="grid size-7 place-items-center rounded-md text-grey opacity-0 transition-all hover:bg-brand-danger/10 hover:text-brand-danger group-hover:opacity-100"
								aria-label="Excluir meta"
								onclick={() => organyze.removeMeta(m.id)}
							>
								<Trash2 size={14} />
							</button>
						</div>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
