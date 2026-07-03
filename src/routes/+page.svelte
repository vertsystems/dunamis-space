<script lang="ts">
	import { diasAte, formatDateBR, prazoContratoLabel } from '$lib/alertas';
	import { Card, Badge, Skeleton } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	const stats = $derived([
		{ label: 'Clientes ativos', value: String(data.ativos), accent: 'text-navy', icon: 'contact' },
		{
			label: 'Tarefas atrasadas',
			value: String(data.atrasadas),
			accent: data.atrasadas > 0 ? 'text-brand-danger' : 'text-brand-green',
			icon: 'check'
		}
	]);
</script>

<div class="mb-4">
	<h1 class="text-xl font-bold text-navy">Visão Geral</h1>
	<p class="text-sm text-grey">Resumo rápido do que precisa da sua atenção.</p>
</div>

<!-- KPIs — só o que importa de cara -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
	{#each stats as s (s.label)}
		<Card>
			<div class="flex items-start justify-between gap-3">
				<div>
					<div class="text-xs uppercase tracking-wide text-grey font-semibold">{s.label}</div>
					<div class="text-3xl font-bold mt-1 {s.accent}">{s.value}</div>
				</div>
				<span class="grid size-10 place-items-center rounded-[var(--radius)] bg-bg text-slate">
					<Icon name={s.icon} size={20} />
				</span>
			</div>
		</Card>
	{/each}
</div>

<!-- Alertas inteligentes — streamed (skeleton enquanto carrega) -->
<Card class="mt-6">
	{#await data.alertas}
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-semibold text-navy">Alertas inteligentes</h2>
			<Skeleton class="h-5 w-20" rounded="full" />
		</div>
		<div class="grid md:grid-cols-3 gap-6">
			{#each Array(3) as _, i (i)}
				<div class="space-y-3">
					<Skeleton class="h-4 w-40" />
					<Skeleton class="h-3 w-full" />
					<Skeleton class="h-3 w-5/6" />
					<Skeleton class="h-3 w-2/3" />
				</div>
			{/each}
		</div>
	{:then alertas}
		{@const total = alertas.contratos.length + alertas.tarefas.length + alertas.semInteracao.length}
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-semibold text-navy">Alertas inteligentes</h2>
			<Badge tone={total ? 'danger' : 'success'}>
				{total ? `${total} ${total === 1 ? 'alerta' : 'alertas'}` : 'Tudo em dia'}
			</Badge>
		</div>

		{#if total === 0}
			<p class="text-slate">✅ Nenhum alerta no momento. Contratos, tarefas e contatos com clientes estão em dia.</p>
		{:else}
			<div class="grid md:grid-cols-3 gap-6">
				<!-- Contratos vencendo -->
				<section>
					<h3 class="flex items-center gap-2 font-semibold text-sm mb-3">
						<span class="size-2.5 rounded-full bg-brand-danger"></span>
						Contratos vencendo <span class="text-grey font-normal">({alertas.contratos.length})</span>
					</h3>
					{#if alertas.contratos.length}
						<ul class="divide-y divide-grey-200/60">
							{#each alertas.contratos as c (c.id)}
								{@const dias = diasAte(c.data_fim)}
								<li class="py-1.5 text-sm">
									<a class="text-brand hover:underline" href={`/contratos/${c.id}`}>{c.cliente_nome ?? 'Contrato'}</a>
									<span class="block text-xs {dias !== null && dias < 0 ? 'text-brand-danger' : 'text-grey'}">
										{prazoContratoLabel(dias)} · {formatDateBR(c.data_fim)}
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-grey text-sm">Nenhum contrato vencendo.</p>
					{/if}
				</section>

				<!-- Tarefas atrasadas -->
				<section>
					<h3 class="flex items-center gap-2 font-semibold text-sm mb-3">
						<span class="size-2.5 rounded-full bg-brand"></span>
						Tarefas atrasadas <span class="text-grey font-normal">({data.atrasadas})</span>
					</h3>
					{#if alertas.tarefas.length}
						<ul class="divide-y divide-grey-200/60">
							{#each alertas.tarefas as t (t.id)}
								{@const dias = diasAte(t.prazo)}
								<li class="py-1.5 text-sm">
									<a class="text-brand hover:underline" href={`/tarefas?projeto=${t.projeto_id ?? ''}`}>{t.titulo}</a>
									<span class="block text-xs text-brand-danger">
										{prazoContratoLabel(dias)}{t.cliente_nome ? ' · ' + t.cliente_nome : ''}
									</span>
								</li>
							{/each}
						</ul>
						{#if data.atrasadas > alertas.tarefas.length}
							<p class="text-sm mt-2"><a class="text-brand hover:underline" href="/tarefas">+ ver todas no Kanban</a></p>
						{/if}
					{:else}
						<p class="text-grey text-sm">Nenhuma tarefa atrasada.</p>
					{/if}
				</section>

				<!-- Clientes sem contato -->
				<section>
					<h3 class="flex items-center gap-2 font-semibold text-sm mb-3">
						<span class="size-2.5 rounded-full bg-brand-amber"></span>
						Clientes sem contato <span class="text-grey font-normal">({alertas.semInteracao.length})</span>
					</h3>
					{#if alertas.semInteracao.length}
						<ul class="divide-y divide-grey-200/60">
							{#each alertas.semInteracao as c (c.id)}
								<li class="py-1.5 text-sm">
									<a class="text-brand hover:underline" href={`/clientes/${c.id}`}>{c.nome}</a>
									<span class="block text-xs text-grey">
										{c.ultima ? `último contato ${formatDateBR(c.ultima)}` : 'sem interações'}
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-grey text-sm">Todos os clientes ativos tiveram contato recente.</p>
					{/if}
				</section>
			</div>
		{/if}
	{:catch}
		<p class="text-brand-danger">Não foi possível carregar os alertas. Tente atualizar a página.</p>
	{/await}
</Card>
