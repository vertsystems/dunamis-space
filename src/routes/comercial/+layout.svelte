<script lang="ts">
	// Moldura do módulo Comercial: o que é igual nas cinco telas — o título, o
	// botão de criar, o drawer de detalhe e os modais. As telas ficam só com o
	// próprio conteúdo e conversam com o estado pelo `usarComercial()`.
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { Button, Dropdown, Modal } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import CrmDrawer from '$lib/components/crm/CrmDrawer.svelte';
	import CrmNegocioForm from '$lib/components/crm/CrmNegocioForm.svelte';
	import CrmContatoForm from '$lib/components/crm/CrmContatoForm.svelte';
	import { MOTIVOS_PERDA } from '$lib/crm';
	import { ACTIONS, criarComercial, type DadosComercial } from '$lib/comercial.svelte';
	import { podeEditar, podeExcluir } from '$lib/permissoes';

	let { children, data } = $props();

	// A leitura inicial é de propósito: o store nasce com o primeiro `data` e o
	// efeito abaixo reaplica os seguintes. O untrack deixa isso explícito (sem
	// ele, o compilador avisa que só o valor inicial foi capturado).
	const loja = untrack(() => criarComercial(data as DadosComercial));
	// Reaplica o que vier do servidor a cada `invalidateAll`.
	$effect(() => loja.sincronizar(data as DadosComercial));

	const perms = $derived(page.data.permissoes);
	const editar = $derived(podeEditar(perms, 'crm'));

	// Cada tela se identifica pelo título — a sidebar já diz onde estamos.
	const TITULOS: Record<string, { titulo: string; sub: string; icone: string }> = {
		'/comercial': {
			titulo: 'Dashboard comercial',
			sub: 'O funil, as metas e o que precisa de atenção hoje.',
			icone: 'chart'
		},
		'/comercial/kanban': {
			titulo: 'Kanban',
			sub: 'Arraste os negócios entre as etapas do funil.',
			icone: 'funnel'
		},
		'/comercial/contatos': {
			titulo: 'Contatos',
			sub: 'Leads e clientes em prospecção.',
			icone: 'contact'
		},
		'/comercial/metas': {
			titulo: 'Metas',
			sub: 'Meta do mês por vendedor e quanto já foi fechado.',
			icone: 'target'
		},
		'/comercial/relatorios': {
			titulo: 'Relatórios',
			sub: 'De onde vêm os leads e por que os negócios se perdem.',
			icone: 'clipboard'
		}
	};
	const cabecalho = $derived(TITULOS[page.url.pathname] ?? TITULOS['/comercial']);

</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="flex items-center gap-2 text-base font-semibold text-navy">
			<Icon name={cabecalho.icone} size={20} />
			{cabecalho.titulo}
		</h1>
		<p class="text-sm text-grey">{cabecalho.sub}</p>
	</div>
	{#if !loja.dados.crmPendente && editar}
		<Dropdown
			align="end"
			triggerClass="inline-flex size-10 items-center justify-center rounded-[var(--radius)] bg-brand text-white shadow-[0_2px_10px_-2px_color-mix(in_srgb,var(--color-brand)_55%,transparent)] transition-all hover:brightness-[1.07] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
			items={[
				{ label: 'Novo negócio', icon: 'funnel', onSelect: () => loja.abrirNovoNegocio() },
				{ label: 'Novo contato', icon: 'contact', onSelect: () => (loja.novoContato = true) }
			]}
		>
			{#snippet trigger()}<Icon name="plus" size={18} />{/snippet}
		</Dropdown>
	{/if}
</div>

{#if loja.dados.crmPendente}
	<div class="rounded-[var(--radius-lg)] bg-brand-amber/15 px-5 py-4 text-sm text-brand-brown">
		<p class="mb-1 font-semibold">CRM ainda não ativado.</p>
		<p>
			Aplique a migration <code class="font-mono">supabase/migrations/0005_crm.sql</code> no SQL Editor
			do Supabase (ou via <code class="font-mono">run_migration.mjs</code>) para criar as tabelas do CRM.
		</p>
	</div>
{:else}
	{#if loja.dados.loadError}
		<div class="mb-4 rounded-[var(--radius)] bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
			Erro ao carregar: {loja.dados.loadError}
		</div>
	{/if}

	{@render children()}
{/if}

<!-- Detalhe do negócio/contato -->
<CrmDrawer
	open={loja.drawerAberto}
	tipo={loja.drawerTipo}
	id={loja.drawerId}
	negocios={loja.negocios}
	contatos={loja.dados.contatos}
	atividades={loja.atividades}
	stages={loja.dados.stages}
	colaboradores={loja.dados.colaboradores}
	clientes={loja.dados.clientes}
	pipelineAtivoId={loja.pipelineAtivo}
	podeEditar={editar}
	podeExcluir={podeExcluir(perms, 'crm')}
	onClose={() => (loja.drawerAberto = false)}
	onToggleAtividade={(id, feita) => loja.concluirAtividade(id, feita)}
	onOpenNegocio={(id) => loja.abrirNegocio(id)}
	onOpenContato={(id) => loja.abrirContato(id)}
/>

<Modal open={loja.novoNegocio} title="Novo negócio" onClose={() => (loja.novoNegocio = false)}>
	<CrmNegocioForm
		stages={loja.stagesDoPipeline}
		initialStageId={loja.novoNegocioStage}
		contatos={loja.contatosLite}
		colaboradores={loja.dados.colaboradores}
		pipelineId={loja.pipelineAtivo}
		action="{ACTIONS}?/negocio_criar"
		submitLabel="Criar negócio"
		onSuccess={() => (loja.novoNegocio = false)}
		onCancel={() => (loja.novoNegocio = false)}
	/>
</Modal>

<Modal open={loja.novoContato} title="Novo contato" onClose={() => (loja.novoContato = false)}>
	<CrmContatoForm
		colaboradores={loja.dados.colaboradores}
		clientes={loja.dados.clientes}
		action="{ACTIONS}?/contato_criar"
		submitLabel="Criar contato"
		onSuccess={() => (loja.novoContato = false)}
		onCancel={() => (loja.novoContato = false)}
	/>
</Modal>

<Modal
	open={loja.perdaAberta}
	title="Marcar como perdido"
	onClose={() => (loja.perdaAberta = false)}
>
	<p class="mb-3 text-sm text-slate">
		Qual o motivo da perda? <span class="text-grey">(opcional)</span>
	</p>
	<div class="flex flex-wrap gap-2">
		{#each MOTIVOS_PERDA as m (m)}
			<button
				type="button"
				class="rounded-full border px-3 py-1.5 text-sm transition-colors {loja.perdaMotivo === m
					? 'border-brand bg-brand/10 font-medium text-brand'
					: 'border-grey-200 text-slate hover:border-grey'}"
				onclick={() => (loja.perdaMotivo = loja.perdaMotivo === m ? '' : m)}
			>
				{m}
			</button>
		{/each}
	</div>
	<div class="mt-5 flex justify-end gap-2">
		<Button variant="secondary" onclick={() => (loja.perdaAberta = false)}>Cancelar</Button>
		<Button variant="danger" onclick={() => loja.confirmarPerda()}>Confirmar perda</Button>
	</div>
</Modal>
