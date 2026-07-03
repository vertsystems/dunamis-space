<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { toast } from '$lib/toast.svelte';
	import CrmKpis from '$lib/components/crm/CrmKpis.svelte';
	import CrmPipeline from '$lib/components/crm/CrmPipeline.svelte';
	import CrmTabela from '$lib/components/crm/CrmTabela.svelte';
	import CrmContatos from '$lib/components/crm/CrmContatos.svelte';
	import CrmAtividades from '$lib/components/crm/CrmAtividades.svelte';
	import CrmDrawer from '$lib/components/crm/CrmDrawer.svelte';
	import CrmModal from '$lib/components/crm/CrmModal.svelte';
	import CrmNegocioForm from '$lib/components/crm/CrmNegocioForm.svelte';
	import CrmContatoForm from '$lib/components/crm/CrmContatoForm.svelte';
	import { computeKpis } from '$lib/crm';
	import type { Negocio, Atividade } from '$lib/crm';

	let { data } = $props();

	// Cópias locais reativas (para updates otimistas); re-sincronizam a cada reload do load.
	let negocios = $state<Negocio[]>(data.negocios.map((n) => ({ ...n })));
	let atividades = $state<Atividade[]>(data.atividades.map((a) => ({ ...a })));
	$effect(() => {
		negocios = data.negocios.map((n) => ({ ...n }));
	});
	$effect(() => {
		atividades = data.atividades.map((a) => ({ ...a }));
	});

	// Funil ativo (troca client-side; tudo já vem carregado).
	let pipelineAtivo = $state<string | null>(data.pipelineAtivoId);
	// Só re-sincroniza se a seleção sumiu (1º load ou funil removido); preserva a escolha entre reloads.
	$effect(() => {
		if (!pipelineAtivo || !data.pipelines.some((p) => p.id === pipelineAtivo)) {
			pipelineAtivo = data.pipelineAtivoId;
		}
	});
	const stagesDoPipeline = $derived(data.stages.filter((s) => s.pipeline_id === pipelineAtivo));
	const contatosLite = $derived(data.contatos.map((c) => ({ id: c.id, nome: c.nome, empresa: c.empresa })));

	// KPIs derivados no cliente -> sempre consistentes com quadro/lista (inclusive otimista).
	const kpis = $derived(computeKpis(negocios, atividades, data.stages));

	// ---------------- Visão ----------------
	const VIEWS = [
		{ id: 'pipeline', label: 'Pipeline' },
		{ id: 'negocios', label: 'Negócios' },
		{ id: 'contatos', label: 'Contatos' },
		{ id: 'atividades', label: 'Atividades' }
	] as const;
	type View = (typeof VIEWS)[number]['id'];
	let view = $state<View>('pipeline');

	// ---------------- Drawer ----------------
	let drawerAberto = $state(false);
	let drawerTipo = $state<'negocio' | 'contato'>('negocio');
	let drawerId = $state<string | null>(null);
	function abrirNegocio(id: string) {
		drawerTipo = 'negocio';
		drawerId = id;
		drawerAberto = true;
	}
	function abrirContato(id: string) {
		drawerTipo = 'contato';
		drawerId = id;
		drawerAberto = true;
	}

	// ---------------- Modais de criação ----------------
	let novoNegocio = $state(false);
	let novoNegocioStage = $state<string | null>(null);
	let novoContato = $state(false);
	function abrirNovoNegocio(stageId: string | null = null) {
		novoNegocioStage = stageId;
		novoNegocio = true;
	}

	// ---------------- Ações otimistas (fetch p/ form actions) ----------------
	async function postar(action: string, fd: FormData) {
		const res = await fetch(action, {
			method: 'POST',
			body: fd,
			headers: { 'x-sveltekit-action': 'true' }
		});
		return deserialize(await res.text());
	}

	async function mover(id: string, stageId: string, orderedIds: string[]) {
		const anterior = negocios;
		const ordemMap = new Map(orderedIds.map((nid, i) => [nid, i]));
		negocios = negocios.map((n) => {
			if (n.id === id) return { ...n, stage_id: stageId, ordem: ordemMap.get(n.id) ?? n.ordem };
			if (ordemMap.has(n.id)) return { ...n, ordem: ordemMap.get(n.id)! };
			return n;
		});
		const fd = new FormData();
		fd.set('id', id);
		fd.set('stage_id', stageId);
		fd.set('ids', orderedIds.join(','));
		try {
			const r = await postar('?/negocio_mover', fd);
			if (r.type !== 'success') throw new Error();
		} catch {
			negocios = anterior;
			toast.error('Não foi possível mover o negócio.');
		}
	}

	async function mudarStatus(id: string, status: 'ganho' | 'perdido') {
		const anterior = negocios;
		negocios = negocios.map((n) => (n.id === id ? { ...n, status } : n));
		const fd = new FormData();
		fd.set('id', id);
		fd.set('status', status);
		try {
			const r = await postar('?/negocio_status', fd);
			if (r.type !== 'success') throw new Error();
			toast.success(status === 'ganho' ? 'Negócio ganho! 🎉' : 'Negócio marcado como perdido.');
			await invalidateAll();
		} catch {
			negocios = anterior;
			toast.error('Não foi possível atualizar o negócio.');
		}
	}

	async function concluirAtividade(id: string, concluida: boolean) {
		const anterior = atividades;
		atividades = atividades.map((a) =>
			a.id === id
				? { ...a, concluida, concluida_em: concluida ? new Date().toISOString() : null }
				: a
		);
		const fd = new FormData();
		fd.set('id', id);
		fd.set('concluida', String(concluida));
		try {
			const r = await postar('?/atividade_concluir', fd);
			if (r.type !== 'success') throw new Error();
		} catch {
			atividades = anterior;
			toast.error('Não foi possível atualizar a atividade.');
		}
	}

	// Botão de criação contextual por visão.
	const podeCriarContato = $derived(view === 'contatos');
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-4">
	<div>
		<h1 class="text-xl font-bold text-navy flex items-center gap-2">
			<Icon name="funnel" size={20} /> CRM Master
		</h1>
		<p class="text-sm text-grey">Leads, negócios, pipeline e atividades — tudo em um só lugar.</p>
	</div>
	<div class="flex items-center gap-2">
		{#if data.pipelines.length > 1 && view === 'pipeline'}
			<select
				class="h-9 rounded-[var(--radius)] border border-grey-200 bg-surface px-2 text-sm text-navy"
				bind:value={pipelineAtivo}
				aria-label="Funil"
			>
				{#each data.pipelines as p (p.id)}<option value={p.id}>{p.nome}</option>{/each}
			</select>
		{/if}
		{#if !data.crmPendente}
			{#if podeCriarContato}
				<Button onclick={() => (novoContato = true)}><Icon name="plus" size={15} /> Novo contato</Button>
			{:else}
				<Button onclick={() => abrirNovoNegocio()}><Icon name="plus" size={15} /> Novo negócio</Button>
			{/if}
		{/if}
	</div>
</div>

{#if data.crmPendente}
	<div class="rounded-[var(--radius-lg)] bg-brand-amber/15 px-5 py-4 text-sm text-brand-brown">
		<p class="font-semibold mb-1">CRM Master ainda não ativado.</p>
		<p>
			Aplique a migration <code class="font-mono">supabase/migrations/0005_crm.sql</code> no SQL Editor
			do Supabase (ou via <code class="font-mono">run_migration.mjs</code>) para criar as tabelas do CRM.
		</p>
	</div>
{:else}
	{#if data.loadError}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			Erro ao carregar: {data.loadError}
		</div>
	{/if}

	<div class="mb-4"><CrmKpis {kpis} /></div>

	<div class="inline-flex rounded-[var(--radius)] border border-grey-200 bg-surface p-0.5 mb-4">
		{#each VIEWS as v (v.id)}
			<button
				type="button"
				class="px-3 py-1.5 text-sm font-medium rounded-[var(--radius-sm)] {view === v.id
					? 'bg-brand text-white'
					: 'text-slate hover:bg-bg'}"
				onclick={() => (view = v.id)}
			>
				{v.label}
			</button>
		{/each}
	</div>

	{#if view === 'pipeline'}
		<CrmPipeline
			stages={stagesDoPipeline}
			{negocios}
			onOpen={abrirNegocio}
			onMove={mover}
			onGanho={(id) => mudarStatus(id, 'ganho')}
			onPerdido={(id) => mudarStatus(id, 'perdido')}
			onNovo={(stageId) => abrirNovoNegocio(stageId)}
		/>
	{:else if view === 'negocios'}
		<CrmTabela {negocios} stages={data.stages} colaboradores={data.colaboradores} onOpen={abrirNegocio} />
	{:else if view === 'contatos'}
		<CrmContatos contatos={data.contatos} onOpen={abrirContato} />
	{:else if view === 'atividades'}
		<CrmAtividades
			{atividades}
			colaboradores={data.colaboradores}
			onToggle={concluirAtividade}
			onOpenNegocio={abrirNegocio}
			onOpenContato={abrirContato}
		/>
	{/if}
{/if}

<!-- Drawer de detalhe -->
<CrmDrawer
	open={drawerAberto}
	tipo={drawerTipo}
	id={drawerId}
	{negocios}
	contatos={data.contatos}
	{atividades}
	stages={data.stages}
	colaboradores={data.colaboradores}
	clientes={data.clientes}
	pipelineAtivoId={pipelineAtivo}
	onClose={() => (drawerAberto = false)}
	onToggleAtividade={concluirAtividade}
	onOpenNegocio={abrirNegocio}
	onOpenContato={abrirContato}
/>

<!-- Modal: novo negócio -->
<CrmModal open={novoNegocio} title="Novo negócio" onClose={() => (novoNegocio = false)}>
	<CrmNegocioForm
		stages={stagesDoPipeline}
		initialStageId={novoNegocioStage}
		contatos={contatosLite}
		colaboradores={data.colaboradores}
		pipelineId={pipelineAtivo}
		action="?/negocio_criar"
		submitLabel="Criar negócio"
		onSuccess={() => (novoNegocio = false)}
		onCancel={() => (novoNegocio = false)}
	/>
</CrmModal>

<!-- Modal: novo contato -->
<CrmModal open={novoContato} title="Novo contato" onClose={() => (novoContato = false)}>
	<CrmContatoForm
		colaboradores={data.colaboradores}
		clientes={data.clientes}
		action="?/contato_criar"
		submitLabel="Criar contato"
		onSuccess={() => (novoContato = false)}
		onCancel={() => (novoContato = false)}
	/>
</CrmModal>
