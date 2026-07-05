<script lang="ts">
	import { Card, Badge } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { diasAte, formatDateBR } from '$lib/alertas';
	import { prioridadeTone, prioridadeLabel } from '$lib/tarefas';
	import { atividadeTipo, formatDataHora, vencimentoDe, vencimentoTone } from '$lib/crm';

	let { data } = $props();

	const GRUPOS_T = [
		{ chave: 'atrasada', label: 'Atrasadas', tone: 'danger' as const },
		{ chave: 'hoje', label: 'Hoje', tone: 'warning' as const },
		{ chave: 'proxima', label: 'Em breve', tone: 'info' as const },
		{ chave: 'sem', label: 'Sem prazo', tone: 'neutral' as const }
	];
	function grupoTarefa(prazo: string | null): string {
		const d = diasAte(prazo);
		if (d === null) return 'sem';
		if (d < 0) return 'atrasada';
		if (d === 0) return 'hoje';
		return 'proxima';
	}
	const tarefasDo = $derived((k: string) => data.tarefas.filter((t) => grupoTarefa(t.prazo) === k));

	const GRUPOS_A = [
		{ chave: 'atrasada', label: 'Atrasadas' },
		{ chave: 'hoje', label: 'Hoje' },
		{ chave: 'em_breve', label: 'Esta semana' },
		{ chave: 'futura', label: 'Depois' },
		{ chave: 'sem_data', label: 'Sem data' }
	];
	const ativDo = $derived((k: string) => data.atividades.filter((a) => vencimentoDe(a.data_hora) === k));
</script>

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Meu Dia{data.nome ? ` · ${data.nome}` : ''}</h1>
	<p class="text-sm text-grey">Suas tarefas e atividades em aberto, priorizadas pelo prazo.</p>
</div>

{#if data.semColaborador}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
		Seu login ainda não está vinculado a um colaborador — mostrando itens de toda a equipe. Vincule em
		<a class="underline" href="/equipe">Equipe</a> para ver só o que é seu.
	</div>
{/if}

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
	<!-- Tarefas -->
	<Card padding="none" class="overflow-hidden">
		<div class="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-grey-200">
			<h2 class="font-semibold text-navy flex items-center gap-2"><Icon name="check" size={16} /> Tarefas</h2>
			<a class="text-xs text-brand hover:underline" href="/tarefas">Ver Kanban</a>
		</div>
		<div class="p-3">
			{#if !data.tarefas.length}
				<p class="px-2 py-8 text-center text-sm text-grey">Nenhuma tarefa em aberto. 🎉</p>
			{:else}
				{#each GRUPOS_T as g (g.chave)}
					{@const itens = tarefasDo(g.chave)}
					{#if itens.length}
						<div class="mb-2 last:mb-0">
							<div class="flex items-center gap-2 px-2 mb-1">
								<span class="text-xs uppercase tracking-wide font-semibold text-grey">{g.label}</span>
								<Badge tone={g.tone}>{itens.length}</Badge>
							</div>
							{#each itens as t (t.id)}
								<div class="flex items-start justify-between gap-2 px-2 py-2 rounded-[var(--radius)] hover:bg-bg">
									<div class="min-w-0">
										<div class="text-sm text-navy">{t.titulo}</div>
										<div class="text-xs text-grey truncate">
											{t.projeto_nome ?? 'Sem projeto'}{t.prazo ? ` · ${formatDateBR(t.prazo)}` : ''}
										</div>
									</div>
									<Badge tone={prioridadeTone(t.prioridade)}>{prioridadeLabel(t.prioridade)}</Badge>
								</div>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</Card>

	<!-- Atividades do CRM -->
	<Card padding="none" class="overflow-hidden">
		<div class="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-grey-200">
			<h2 class="font-semibold text-navy flex items-center gap-2"><Icon name="funnel" size={16} /> Atividades do CRM</h2>
			<a class="text-xs text-brand hover:underline" href="/crm">Abrir CRM</a>
		</div>
		<div class="p-3">
			{#if !data.atividades.length}
				<p class="px-2 py-8 text-center text-sm text-grey">Nenhuma atividade pendente.</p>
			{:else}
				{#each GRUPOS_A as g (g.chave)}
					{@const itens = ativDo(g.chave)}
					{#if itens.length}
						<div class="mb-2 last:mb-0">
							<div class="flex items-center gap-2 px-2 mb-1">
								<span class="text-xs uppercase tracking-wide font-semibold text-grey">{g.label}</span>
								<span class="text-xs text-grey">({itens.length})</span>
							</div>
							{#each itens as a (a.id)}
								{@const tp = atividadeTipo(a.tipo)}
								<div class="flex items-start gap-2.5 px-2 py-2 rounded-[var(--radius)] hover:bg-bg">
									<span class="mt-0.5 text-slate shrink-0" title={tp.label}><Icon name={tp.icon} size={15} /></span>
									<div class="min-w-0 flex-1">
										<div class="text-sm text-navy">{a.titulo || tp.label}</div>
										<div class="text-xs text-grey truncate">
											{a.negocio_titulo ?? a.contato_nome ?? '—'}
										</div>
									</div>
									{#if a.data_hora}
										<Badge tone={vencimentoTone(vencimentoDe(a.data_hora))}>{formatDataHora(a.data_hora)}</Badge>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</Card>
</div>
