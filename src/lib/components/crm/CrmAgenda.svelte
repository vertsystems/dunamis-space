<script lang="ts">
	// A semana que vem pela frente: o que está marcado em cada dia e, no topo,
	// o que já passou da data. Marcar como feita não sai da tela.
	import { Card, Badge } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { atividadeTipo, formatDataHora, type Agenda, type Atividade } from '$lib/crm';

	let {
		agenda,
		onToggle,
		onAbrirNegocio,
		onAbrirContato,
		/** Abre a lista completa (com filtros e concluídas). */
		onVerTodas
	}: {
		agenda: Agenda;
		onToggle: (id: string, concluida: boolean) => void;
		onAbrirNegocio: (id: string) => void;
		onAbrirContato: (id: string) => void;
		onVerTodas?: () => void;
	} = $props();

	const totalNaSemana = $derived(agenda.dias.reduce((s, d) => s + d.atividades.length, 0));
</script>

{#snippet linha(a: Atividade, atrasada: boolean)}
	{@const t = atividadeTipo(a.tipo)}
	<div class="flex items-start gap-2.5 px-5 py-2">
		<button
			type="button"
			class="mt-0.5 grid size-4 shrink-0 place-items-center rounded border-2 border-grey-200 transition-colors hover:border-brand"
			aria-label="Concluir atividade"
			onclick={() => onToggle(a.id, true)}
		></button>
		<div class="min-w-0 flex-1">
			<div class="flex items-baseline gap-1.5">
				<Icon name={t.icon} size={12} />
				<span class="truncate text-sm text-navy">{a.titulo ?? t.label}</span>
			</div>
			<div class="truncate text-xs text-grey">
				{#if a.data_hora}<span class:text-brand-danger={atrasada}>{formatDataHora(a.data_hora)}</span
					>{/if}
				{#if a.negocio_id}
					· <button class="hover:text-brand hover:underline" onclick={() => onAbrirNegocio(a.negocio_id!)}
						>{a.negocio_titulo ?? 'negócio'}</button
					>
				{:else if a.contato_id}
					· <button class="hover:text-brand hover:underline" onclick={() => onAbrirContato(a.contato_id!)}
						>{a.contato_nome ?? 'contato'}</button
					>
				{/if}
				{#if a.responsavel_nome}· {a.responsavel_nome}{/if}
			</div>
		</div>
	</div>
{/snippet}

<Card padding="none" class="flex flex-col overflow-hidden">
	<div class="flex items-center justify-between gap-2 border-b border-grey-200 px-5 py-3.5">
		<div>
			<h2 class="text-sm font-semibold text-navy">Agenda</h2>
			<p class="text-xs text-grey">
				Próximos 7 dias
				{#if onVerTodas}
					· <button class="font-medium text-brand hover:underline" onclick={onVerTodas}>
						ver todas
					</button>
				{/if}
			</p>
		</div>
		{#if agenda.atrasadas.length}
			<Badge tone="danger">{agenda.atrasadas.length} atrasada{agenda.atrasadas.length > 1 ? 's' : ''}</Badge>
		{:else}
			<Badge tone="success">em dia</Badge>
		{/if}
	</div>

	<div class="max-h-96 overflow-y-auto">
		{#if agenda.atrasadas.length}
			<div class="bg-brand-danger/5 px-5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-danger">
				Atrasadas
			</div>
			<div class="divide-y divide-grey-200/60">
				{#each agenda.atrasadas as a (a.id)}
					{@render linha(a, true)}
				{/each}
			</div>
		{/if}

		{#each agenda.dias as d (d.iso)}
			{#if d.atividades.length}
				<div
					class="bg-bg/60 px-5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide"
					class:text-brand={d.hoje}
					class:text-grey={!d.hoje}
				>
					{d.rotulo}
				</div>
				<div class="divide-y divide-grey-200/60">
					{#each d.atividades as a (a.id)}
						{@render linha(a, false)}
					{/each}
				</div>
			{/if}
		{/each}

		{#if !agenda.atrasadas.length && totalNaSemana === 0}
			<p class="px-5 py-8 text-center text-sm text-grey">
				Nada marcado para os próximos dias.
				{#if agenda.sem_data}
					<span class="mt-1 block text-xs">
						{agenda.sem_data} atividade{agenda.sem_data > 1 ? 's' : ''} sem data definida.
					</span>
				{/if}
			</p>
		{/if}
	</div>
</Card>
