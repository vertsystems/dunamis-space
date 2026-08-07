<script lang="ts">
	// O funil em quadro (arrastar entre etapas) ou em lista — a mesma carteira,
	// duas leituras. O botão de alternar guarda a escolha só na sessão da tela.
	import { Select } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import CrmPipeline from '$lib/components/crm/CrmPipeline.svelte';
	import CrmTabela from '$lib/components/crm/CrmTabela.svelte';
	import { usarComercial } from '$lib/comercial.svelte';

	const loja = usarComercial();

	type Modo = 'quadro' | 'lista';
	let modo = $state<Modo>('quadro');
	const MODOS: { v: Modo; label: string; icon: string }[] = [
		{ v: 'quadro', label: 'Quadro', icon: 'funnel' },
		{ v: 'lista', label: 'Lista', icon: 'clipboard' }
	];
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<div class="inline-flex rounded-[var(--radius)] bg-bg p-0.5">
		{#each MODOS as m (m.v)}
			<button
				class="inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-0.15rem)] px-3 py-1.5 text-xs font-semibold transition-colors"
				class:bg-surface={modo === m.v}
				class:text-navy={modo === m.v}
				class:shadow-xs={modo === m.v}
				class:text-grey={modo !== m.v}
				aria-pressed={modo === m.v}
				onclick={() => (modo = m.v)}
			>
				<Icon name={m.icon} size={14} />
				{m.label}
			</button>
		{/each}
	</div>

	{#if loja.dados.pipelines.length > 1 && modo === 'quadro'}
		<Select bind:value={loja.pipelineAtivo} aria-label="Funil" wrapperClass="w-44">
			{#each loja.dados.pipelines as p (p.id)}<option value={p.id}>{p.nome}</option>{/each}
		</Select>
	{/if}
</div>

{#if modo === 'quadro'}
	<CrmPipeline
		stages={loja.stagesDoPipeline}
		negocios={loja.negocios}
		onOpen={(id) => loja.abrirNegocio(id)}
		onMove={(id, stage, ids) => loja.mover(id, stage, ids)}
		onGanho={(id) => loja.mudarStatus(id, 'ganho')}
		onPerdido={(id) => loja.abrirPerda(id)}
		onNovo={(stageId) => loja.abrirNovoNegocio(stageId)}
	/>
{:else}
	<CrmTabela
		negocios={loja.negocios}
		stages={loja.dados.stages}
		colaboradores={loja.dados.colaboradores}
		onOpen={(id) => loja.abrirNegocio(id)}
	/>
{/if}
