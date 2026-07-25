<script lang="ts">
	import { Badge, Card, Select, EmptyState } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import {
		atividadeTipo,
		formatDataHora,
		vencimentoDe,
		vencimentoTone,
		type Atividade,
		type Colaborador,
		type Vencimento
	} from '$lib/crm';

	let {
		atividades = [],
		colaboradores = [],
		onToggle,
		onOpenNegocio,
		onOpenContato
	}: {
		atividades?: Atividade[];
		colaboradores?: Colaborador[];
		onToggle: (id: string, concluida: boolean) => void;
		onOpenNegocio: (id: string) => void;
		onOpenContato: (id: string) => void;
	} = $props();

	let respFiltro = $state('');
	let mostrarConcluidas = $state(false);

	const GRUPOS: { chave: Vencimento; label: string }[] = [
		{ chave: 'atrasada', label: 'Atrasadas' },
		{ chave: 'hoje', label: 'Hoje' },
		{ chave: 'em_breve', label: 'Esta semana' },
		{ chave: 'futura', label: 'Depois' },
		{ chave: 'sem_data', label: 'Sem data' }
	];

	const pendentes = $derived(
		atividades.filter((a) => !a.concluida && (!respFiltro || a.responsavel_id === respFiltro))
	);
	const concluidas = $derived(
		atividades
			.filter((a) => a.concluida && (!respFiltro || a.responsavel_id === respFiltro))
			.sort((a, b) => (b.concluida_em ?? '').localeCompare(a.concluida_em ?? ''))
			.slice(0, 30)
	);

	function doGrupo(chave: Vencimento): Atividade[] {
		return pendentes
			.filter((a) => vencimentoDe(a.data_hora) === chave)
			.sort((a, b) => (a.data_hora ?? '~').localeCompare(b.data_hora ?? '~'));
	}
</script>

<div class="flex flex-wrap items-center gap-2 mb-4">
	<Select bind:value={respFiltro} wrapperClass="w-48" aria-label="Responsável">
		<option value="">Todos os responsáveis</option>
		{#each colaboradores as col (col.id)}
			<option value={col.id}>{col.nome}</option>
		{/each}
	</Select>
	<span class="text-sm text-grey">{pendentes.length} pendente(s)</span>
	<button
		type="button"
		class="ml-auto text-sm text-brand hover:underline"
		onclick={() => (mostrarConcluidas = !mostrarConcluidas)}
	>
		{mostrarConcluidas ? 'Ocultar concluídas' : `Ver concluídas (${concluidas.length})`}
	</button>
</div>

{#snippet linha(a: Atividade)}
	{@const t = atividadeTipo(a.tipo)}
	<div class="flex items-start gap-3 px-3 py-2.5 border-b border-grey-200/60 last:border-0 hover:bg-bg">
		<button
			type="button"
			class="relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors after:absolute after:-inset-3 after:content-[''] {a.concluida
				? 'bg-brand-green border-brand-green text-white'
				: 'border-grey-200 text-transparent hover:border-brand-green'}"
			aria-label={a.concluida ? 'Reabrir' : 'Concluir'}
			onclick={() => onToggle(a.id, !a.concluida)}
		>
			<Icon name="check" size={13} />
		</button>
		<span class="mt-0.5 text-slate shrink-0" title={t.label}><Icon name={t.icon} size={15} /></span>
		<div class="min-w-0 flex-1">
			<div class="text-sm text-navy {a.concluida ? 'line-through text-grey' : ''}">
				{a.titulo || t.label}
			</div>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-grey mt-0.5">
				{#if a.negocio_id && a.negocio_titulo}
					<button type="button" class="text-brand hover:underline" onclick={() => onOpenNegocio(a.negocio_id!)}>
						{a.negocio_titulo}
					</button>
				{/if}
				{#if a.contato_id && a.contato_nome}
					<button type="button" class="hover:text-navy hover:underline" onclick={() => onOpenContato(a.contato_id!)}>
						{a.contato_nome}
					</button>
				{/if}
				{#if a.responsavel_nome}<span>· {a.responsavel_nome}</span>{/if}
			</div>
		</div>
		{#if a.data_hora}
			<Badge tone={a.concluida ? 'neutral' : vencimentoTone(vencimentoDe(a.data_hora))}>
				{formatDataHora(a.data_hora)}
			</Badge>
		{/if}
	</div>
{/snippet}

<div class="space-y-4">
	{#each GRUPOS as g (g.chave)}
		{@const itens = doGrupo(g.chave)}
		{#if itens.length}
			<div>
				<div class="flex items-center gap-2 mb-1.5 px-1">
					<h3 class="text-xs uppercase tracking-wide font-semibold text-grey">{g.label}</h3>
					<span class="text-xs text-grey">({itens.length})</span>
				</div>
				<Card padding="none" class="overflow-hidden">
					{#each itens as a (a.id)}{@render linha(a)}{/each}
				</Card>
			</div>
		{/if}
	{/each}

	{#if !pendentes.length}
		<Card padding="none">
			<EmptyState icon="check" title="Tudo em dia" description="Nenhuma atividade pendente." />
		</Card>
	{/if}

	{#if mostrarConcluidas && concluidas.length}
		<div>
			<div class="flex items-center gap-2 mb-1.5 px-1">
				<h3 class="text-xs uppercase tracking-wide font-semibold text-grey">Concluídas</h3>
			</div>
			<Card padding="none" class="overflow-hidden">
				{#each concluidas as a (a.id)}{@render linha(a)}{/each}
			</Card>
		</div>
	{/if}
</div>
