<script lang="ts">
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import { Button } from '$lib/components/ui';
	import Dashboard from '$lib/components/leadgrap/Dashboard.svelte';
	import LeadsTable from '$lib/components/leadgrap/LeadsTable.svelte';
	import Kanban from '$lib/components/leadgrap/Kanban.svelte';
	import Captura from '$lib/components/leadgrap/Captura.svelte';
	import Historico from '$lib/components/leadgrap/Historico.svelte';
	import Templates from '$lib/components/leadgrap/Templates.svelte';
	import Atividade from '$lib/components/leadgrap/Atividade.svelte';
	import { LayoutDashboard, List, Columns3, Radar, History, MessageSquare, Activity } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type ModuleId = 'dashboard' | 'leads' | 'kanban' | 'captura' | 'historico' | 'templates' | 'atividade';
	let active = $state<ModuleId>('dashboard');

	const NAV = [
		{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ id: 'leads', label: 'Leads', icon: List },
		{ id: 'kanban', label: 'Kanban', icon: Columns3 },
		{ id: 'captura', label: 'Captura', icon: Radar },
		{ id: 'historico', label: 'Histórico', icon: History },
		{ id: 'templates', label: 'Modelos', icon: MessageSquare },
		{ id: 'atividade', label: 'Atividade', icon: Activity }
	] as const;

	const TITULOS: Record<ModuleId, { titulo: string; desc: string }> = {
		dashboard: { titulo: 'Dashboard', desc: 'Visão geral do seu funil de prospecção.' },
		leads: { titulo: 'Leads capturados', desc: 'Filtre, contate e organize seus leads.' },
		kanban: { titulo: 'Kanban', desc: 'Arraste os cards entre as colunas do funil.' },
		captura: { titulo: 'Captura de leads', desc: 'Traga negócios do Google Maps por nicho e região.' },
		historico: { titulo: 'Histórico de capturas', desc: 'Resultado de cada busca executada.' },
		templates: { titulo: 'Modelos de mensagem', desc: 'Textos de WhatsApp e e-mail com variáveis.' },
		atividade: { titulo: 'Atividade recente', desc: 'Tudo que aconteceu no funil, mais recente primeiro.' }
	};

	$effect(() => {
		if (data.supabase) leadgrap.init(data.supabase, (data.perfil?.id as string | undefined) ?? null);
	});
</script>

<svelte:head><title>LeadGrap | Dunamis Space</title></svelte:head>

<div class="leadgrap-root">
	<header class="mb-5">
		<h1 class="text-xl font-bold text-navy">{TITULOS[active].titulo}</h1>
		<p class="mt-0.5 text-sm text-grey">{TITULOS[active].desc}</p>
	</header>

	<div class="module-area">
		{#if leadgrap.loading}
			<div class="flex flex-col items-center justify-center py-24 text-grey">
				<span class="size-8 animate-spin rounded-full border-2 border-grey-200 border-t-brand"></span>
				<p class="mt-3 text-sm">Carregando dados…</p>
			</div>
		{:else if leadgrap.error}
			<div class="flex flex-col items-center justify-center py-24 text-center">
				<p class="mb-3 text-brand-danger">{leadgrap.error}</p>
				<Button variant="secondary" onclick={() => leadgrap.reloadAll()}>Tentar novamente</Button>
			</div>
		{:else if active === 'dashboard'}
			<Dashboard onIrParaLeads={() => (active = 'leads')} />
		{:else if active === 'leads'}
			<LeadsTable />
		{:else if active === 'kanban'}
			<Kanban />
		{:else if active === 'captura'}
			<Captura />
		{:else if active === 'historico'}
			<Historico />
		{:else if active === 'templates'}
			<Templates />
		{:else}
			<Atividade />
		{/if}
	</div>

	<nav class="leadgrap-dock" aria-label="Módulos do LeadGrap">
		{#each NAV as item (item.id)}
			{@const Ico = item.icon}
			<button class:is-active={active === item.id} onclick={() => (active = item.id)}>
				<Ico size={19} />
				<span>{item.label}</span>
			</button>
		{/each}
	</nav>
</div>

<style>
	.module-area {
		padding-bottom: 6rem;
	}
	.leadgrap-dock {
		position: fixed;
		bottom: 1.4rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 25;
		display: flex;
		gap: 0.2rem;
		padding: 0.4rem;
		background: rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(20px) saturate(180%);
		-webkit-backdrop-filter: blur(20px) saturate(180%);
		border: 1px solid rgba(255, 255, 255, 0.65);
		border-radius: 20px;
		box-shadow:
			0 14px 34px -10px rgba(16, 24, 40, 0.2),
			0 2px 6px rgba(16, 24, 40, 0.06);
		max-width: calc(100vw - 1.5rem);
		overflow-x: auto;
	}
	.leadgrap-dock button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.1rem;
		border-radius: 14px;
		border: none;
		background: transparent;
		color: #5b6576;
		font-weight: 600;
		font-size: 0.85rem;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background-color 0.18s ease,
			color 0.18s ease,
			box-shadow 0.18s ease;
	}
	.leadgrap-dock button:hover {
		background: rgba(16, 24, 40, 0.05);
		color: #1c2534;
	}
	.leadgrap-dock button.is-active {
		background: var(--color-brand, #3b6ef6);
		color: #fff;
		box-shadow: 0 4px 12px -2px rgba(59, 110, 246, 0.5);
	}
	@media (max-width: 720px) {
		.leadgrap-dock button span {
			display: none;
		}
		.leadgrap-dock button {
			padding: 0.6rem 0.85rem;
		}
	}
</style>
