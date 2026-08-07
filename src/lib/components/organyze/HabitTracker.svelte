<script lang="ts">
	// Hábitos do mês: um cartão por hábito com a grade de dias. Clicar num dia
	// alterna vazio → feito → não feito.
	import { organyze } from '$lib/organyze/store.svelte';
	import { diasNoMes } from '$lib/organyze/types';
	import { mesAtual } from '$lib/organyze/ui';
	import { Button } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { Pencil, Plus, Trash2 } from '@lucide/svelte';

	let novoHabito = $state('');
	let editId = $state<string | null>(null);
	let eNome = $state('');

	const diasDoMes = $derived(Array.from({ length: diasNoMes(organyze.mesMeta) }, (_, i) => i + 1));
	// Destaque do dia de hoje — só quando o mês exibido é o corrente.
	const hojeDia = $derived(organyze.mesMeta === mesAtual() ? new Date().getDate() : null);

	function adicionar() {
		if (organyze.addHabito(novoHabito)) novoHabito = '';
	}
	function abrirEdicao(id: string, nome: string) {
		editId = id;
		eNome = nome;
	}
	function salvar() {
		if (editId) organyze.editHabito(editId, eNome);
		editId = null;
	}
</script>

<div class="pt-2">
	<div class="mb-3 flex items-center gap-2 border-t border-grey-200 pt-5">
		<Icon name="clipboard" size={18} class="text-brand" />
		<h2 class="text-base font-bold text-navy">Habit Tracker</h2>
		<span class="text-xs text-grey capitalize">— {organyze.mesMetaLabel}</span>
	</div>

	<!-- Adicionar hábito -->
	<div class="mb-3 flex gap-2">
		<input
			class="h-10 w-full max-w-sm rounded-[var(--radius)] border border-grey-200 bg-surface px-3.5 text-sm text-navy-900 shadow-xs placeholder:text-grey/90 transition-colors hover:border-grey focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25"
			placeholder="Novo hábito (ex.: Bíblia, Água, Treino)…"
			bind:value={novoHabito}
			onkeydown={(e) => e.key === 'Enter' && adicionar()}
		/>
		<Button onclick={adicionar} disabled={!novoHabito.trim()}>
			<Plus size={18} /> Adicionar
		</Button>
	</div>

	{#if organyze.loadingHabitos}
		<div class="flex justify-center py-12 text-grey">
			<span class="size-7 rounded-full border-2 border-grey-200 border-t-brand animate-spin"></span>
		</div>
	{:else if organyze.habitos.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-grey-200 py-12 text-center"
		>
			<div class="grid size-11 place-items-center rounded-full bg-bg text-grey mb-3">
				<Icon name="check" size={20} />
			</div>
			<p class="text-sm font-medium text-navy">Nenhum hábito neste mês</p>
			<p class="text-xs text-grey mt-1">Adicione o primeiro hábito acima.</p>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each organyze.habitos as h (h.id)}
				{@const feitos = Object.values(h.dias).filter((v) => v === 'feito').length}
				<div class="rounded-[var(--radius-lg)] border border-grey-200 bg-surface p-3 shadow-xs">
					<!-- Cabeçalho do hábito -->
					<div class="mb-2 flex items-center gap-1.5">
						{#if editId === h.id}
							<input
								class="h-7 min-w-0 flex-1 rounded-md border border-brand bg-surface px-2 text-sm font-semibold text-navy outline-none"
								bind:value={eNome}
								onkeydown={(e) => {
									if (e.key === 'Enter') salvar();
									if (e.key === 'Escape') editId = null;
								}}
								onblur={salvar}
							/>
						{:else}
							<h3 class="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-wide text-navy">
								{h.nome}
							</h3>
							<span
								class="shrink-0 rounded-full bg-brand-green/12 px-1.5 py-0.5 text-[10px] font-semibold text-brand-green tabular-nums"
								title="Dias feitos"
							>
								{feitos}
							</span>
							<button
								class="grid size-6 shrink-0 place-items-center rounded text-grey hover:bg-bg hover:text-navy transition-colors"
								aria-label="Renomear hábito"
								onclick={() => abrirEdicao(h.id, h.nome)}
							>
								<Pencil size={13} />
							</button>
							<button
								class="grid size-6 shrink-0 place-items-center rounded text-grey hover:bg-brand-danger/10 hover:text-brand-danger transition-colors"
								aria-label="Excluir hábito"
								onclick={() => organyze.removeHabito(h.id)}
							>
								<Trash2 size={13} />
							</button>
						{/if}
					</div>

					<!-- Grade de dias -->
					<div class="grid grid-cols-7 gap-1">
						{#each diasDoMes as d (d)}
							{@const st = h.dias[String(d)]}
							<button
								class="relative grid aspect-square place-items-center rounded-md border text-[11px] font-semibold tabular-nums transition-colors"
								class:border-grey-200={!st}
								class:bg-surface={!st}
								class:text-slate={!st}
								class:hover:bg-bg={!st}
								class:border-transparent={!!st}
								class:bg-brand-green={st === 'feito'}
								class:bg-brand-danger={st === 'falhou'}
								class:text-white={!!st}
								class:ring-2={hojeDia === d}
								class:ring-brand={hojeDia === d}
								class:ring-offset-1={hojeDia === d}
								title={`Dia ${d}${st ? ` — ${st === 'feito' ? 'feito' : 'não feito'}` : ''}`}
								onclick={() => organyze.marcarDia(h.id, d)}
							>
								{d}
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-grey">
			<span class="inline-flex items-center gap-1.5">
				<span class="size-3 rounded bg-brand-green"></span> Feito
			</span>
			<span class="inline-flex items-center gap-1.5">
				<span class="size-3 rounded bg-brand-danger"></span> Não feito
			</span>
			<span>Clique num dia para alternar (vazio → feito → não feito).</span>
		</p>
	{/if}
</div>
