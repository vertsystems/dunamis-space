<script lang="ts">
	// O que está programado num dia — abre ao clicar no quadrado do calendário.
	import { Button, Modal, toneClasses } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { diaLongo } from '$lib/calendario';
	import {
		conteudoTipoLabel,
		conteudoStatusLabel,
		conteudoStatusTone,
		conteudoStatusFundo
	} from '$lib/conteudo';

	let {
		/** Chave do dia aberto (AAAA-MM-DD); null fecha. */
		dia = $bindable(null),
		conteudos = [],
		mostrarCliente = false,
		onEditar,
		onNovo
	}: {
		dia: string | null;
		conteudos?: Record<string, any>[];
		mostrarCliente?: boolean;
		onEditar: (c: Record<string, any>) => void;
		onNovo: () => void;
	} = $props();

	const tiposDe = (c: Record<string, any>) =>
		c.tipos?.length ? c.tipos : c.tipo ? [c.tipo] : [];
</script>

<Modal open={!!dia} title={dia ? diaLongo(dia) : ''} size="md" onClose={() => (dia = null)}>
	<div class="flex flex-col gap-3">
		{#if conteudos.length === 0}
			<p class="text-sm text-grey">Nada programado neste dia.</p>
		{:else}
			<div class="flex flex-col gap-1.5">
				{#each conteudos as c (c.id)}
					<button
						type="button"
						onclick={() => onEditar(c)}
						class="flex w-full flex-col gap-1 rounded-[var(--radius)] border px-3 py-2 text-left transition-colors {conteudoStatusFundo(
							c.status
						)}"
					>
						<span class="flex items-center gap-2">
							<span class="shrink-0 tabular-nums text-xs text-brand">{c.hora}</span>
							<span class="truncate font-medium text-navy">{c.titulo ?? conteudoTipoLabel(c.tipo)}</span>
						</span>
						<span class="flex flex-wrap items-center gap-1">
							<span
								class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.7rem] font-medium {toneClasses[
									conteudoStatusTone(c.status)
								]}">{conteudoStatusLabel(c.status)}</span
							>
							{#each tiposDe(c) as tp (tp)}
								<span
									class="inline-flex items-center rounded-full bg-bg px-1.5 py-0.5 text-[0.7rem] font-medium text-slate"
									>{conteudoTipoLabel(tp)}</span
								>
							{/each}
							{#if mostrarCliente && c.cliente_nome}
								<span class="inline-flex items-center gap-0.5 text-[0.7rem] text-grey">
									<Icon name="building" size={11} />{c.cliente_nome}
								</span>
							{/if}
						</span>
					</button>
				{/each}
			</div>
		{/if}
		<Button onclick={onNovo}><Icon name="plus" size={15} /> Novo post</Button>
	</div>
</Modal>
