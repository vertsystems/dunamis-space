<script lang="ts">
	import { formatBRL } from '$lib/clientes';
	import { stageDot, iniciais } from '$lib/crm';
	import { diasAte, formatDateBR, prazoContratoLabel } from '$lib/alertas';
	import { Card, Badge, Skeleton } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	const stats = $derived([
		{ label: 'Clientes ativos', value: String(data.ativos), accent: 'text-navy', icon: 'contact' },
		{ label: 'Negócios em aberto', value: String(data.negociosAbertos), accent: 'text-navy', icon: 'funnel' },
		{
			label: 'Tarefas atrasadas',
			value: String(data.atrasadas),
			accent: data.atrasadas > 0 ? 'text-brand-danger' : 'text-brand-green',
			icon: 'check'
		},
		{ label: 'Publicações da semana', value: String(data.publicacoesSemana), accent: 'text-navy', icon: 'edit' }
	]);

	const maxFunil = $derived(Math.max(1, ...data.pipeline.funil.map((f) => f.count)));
	const totalFunil = $derived(data.pipeline.funil.reduce((s, f) => s + f.count, 0));

	const TAREFA_TILES = [
		{ chave: 'backlog', label: 'A fazer' },
		{ chave: 'fazendo', label: 'Fazendo' },
		{ chave: 'em_aprovacao', label: 'Em aprovação' }
	] as const;

	function quandoPub(v: string | null): string {
		if (!v) return '—';
		return new Date(v).toLocaleString('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Cor determinística do avatar a partir do nome (variação visual consistente).
	const AVATAR_CORES = ['bg-navy', 'bg-brand', 'bg-brand-green', 'bg-brand-danger', 'bg-slate'];
	function corAvatar(nome: string): string {
		let h = 0;
		for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
		return AVATAR_CORES[h % AVATAR_CORES.length];
	}
</script>

<div class="mb-4">
	<h1 class="text-base font-semibold text-navy">Visão Geral</h1>
	<p class="text-sm text-grey">Resumo rápido do que precisa da sua atenção.</p>
</div>

<!-- Faixa de indicadores (operacional) -->
<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
	{#each stats as s (s.label)}
		<Card>
			<div class="flex items-start justify-between gap-3">
				<div>
					<div class="text-xs uppercase tracking-wide text-grey font-semibold">{s.label}</div>
					<div class="text-3xl font-bold mt-1 tabular-nums {s.accent}">{s.value}</div>
				</div>
				<span class="grid size-10 place-items-center rounded-[var(--radius)] bg-bg text-slate">
					<Icon name={s.icon} size={20} />
				</span>
			</div>
		</Card>
	{/each}
</div>

<!-- Clientes (bolinhas com iniciais) -->
<Card class="mt-6">
	<div class="flex items-center justify-between gap-2 mb-4">
		<h2 class="text-sm font-semibold text-navy flex items-center gap-2">
			<Icon name="contact" size={17} /> Clientes
			<span class="text-sm font-normal text-grey">({data.clientes.length})</span>
		</h2>
		<a class="text-sm text-brand hover:underline" href="/cadastro">Ver todos</a>
	</div>

	{#if data.clientes.length}
		<div class="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-2 gap-y-4">
			{#each data.clientes as c (c.id)}
				<a
					href={`/cadastro/${c.id}`}
					class="group flex flex-col items-center gap-1.5 text-center"
					title={c.nome}
				>
					<span
						class="grid size-12 place-items-center rounded-full text-sm font-bold text-white shadow-sm transition group-hover:scale-105 group-hover:shadow-md {corAvatar(c.nome)}"
						>{iniciais(c.nome)}</span
					>
					<span class="w-full text-[0.7rem] leading-tight text-slate line-clamp-2">{c.nome}</span>
				</a>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-grey">Nenhum cliente ativo ainda.</p>
	{/if}
</Card>

<!-- Blocos temáticos -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 items-start">
	<!-- Pipeline de vendas -->
	<Card>
		<h2 class="text-sm font-semibold text-navy flex items-center gap-2 mb-4"><Icon name="funnel" size={17} /> Pipeline de vendas</h2>

		{#if data.pipeline.crmPendente}
			<div class="rounded-[var(--radius)] bg-brand-amber/15 px-4 py-3 text-sm text-brand-brown">
				CRM ainda não ativado no banco.
			</div>
		{:else}
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-xs uppercase tracking-wide font-semibold text-grey">Resumo</h3>
				<a class="text-xs text-brand hover:underline" href="/crm">Abrir CRM</a>
			</div>
			<div class="grid grid-cols-3 gap-2 mb-4">
				<div class="rounded-[var(--radius)] bg-bg p-3">
					<div class="text-xs uppercase tracking-wide text-grey font-semibold">Em aberto</div>
					<div class="text-base font-semibold text-navy tabular-nums mt-0.5">{formatBRL(data.pipeline.valorAberto)}</div>
				</div>
				<div class="rounded-[var(--radius)] bg-bg p-3">
					<div class="text-xs uppercase tracking-wide text-grey font-semibold">Ganhos no mês</div>
					<div class="text-base font-semibold text-brand-green tabular-nums mt-0.5">{data.pipeline.ganhosMes}</div>
				</div>
				<div class="rounded-[var(--radius)] bg-bg p-3">
					<div class="text-xs uppercase tracking-wide text-grey font-semibold">Conversão</div>
					<div class="text-base font-semibold text-navy tabular-nums mt-0.5">{data.pipeline.taxaConversao}%</div>
				</div>
			</div>

			{#if totalFunil}
				<div class="space-y-2">
					{#each data.pipeline.funil as f (f.nome)}
						<div class="flex items-center gap-2">
							<div class="w-28 shrink-0 flex items-center gap-1.5 text-xs text-slate truncate">
								<span class="size-2 rounded-full shrink-0 {stageDot(f.cor)}"></span>
								<span class="truncate">{f.nome}</span>
							</div>
							<div class="flex-1 h-4 rounded-[var(--radius-sm)] bg-bg overflow-hidden">
								<div class="h-full {stageDot(f.cor)}" style="width: {Math.round((f.count / maxFunil) * 100)}%"></div>
							</div>
							<div class="w-6 shrink-0 text-right text-xs tabular-nums text-slate">{f.count}</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-grey">Nenhum negócio em aberto ainda.</p>
			{/if}
		{/if}
	</Card>

	<!-- Operação -->
	<Card>
		<h2 class="text-sm font-semibold text-navy flex items-center gap-2 mb-4"><Icon name="check" size={17} /> Operação</h2>

		<div class="flex items-center justify-between mb-2">
			<h3 class="text-xs uppercase tracking-wide font-semibold text-grey">Tarefas</h3>
			<a class="text-xs text-brand hover:underline" href="/tarefas">Kanban</a>
		</div>
		<div class="grid grid-cols-3 gap-2">
			{#each TAREFA_TILES as t (t.chave)}
				<div class="rounded-[var(--radius)] bg-bg p-3 text-center">
					<div class="text-base font-semibold text-navy tabular-nums">{data.operacao.tarefas[t.chave]}</div>
					<div class="text-xs uppercase tracking-wide text-grey font-semibold mt-0.5">{t.label}</div>
				</div>
			{/each}
		</div>
		{#if data.atrasadas > 0}
			<p class="text-xs text-brand-danger mt-2">{data.atrasadas} tarefa(s) atrasada(s)</p>
		{/if}

		<div class="border-t border-grey-200 mt-4 pt-4">
			<div class="flex items-center justify-between mb-2">
				<h3 class="text-xs uppercase tracking-wide font-semibold text-grey">Conteúdo</h3>
				<a class="text-xs text-brand hover:underline" href="/conteudo">Ver</a>
			</div>
			{#if data.operacao.conteudoEmAprovacao > 0}
				<a href="/conteudo/aprovacoes" class="inline-flex items-center gap-1.5 mb-2">
					<Badge tone="warning">{data.operacao.conteudoEmAprovacao} aprovação(ões) pendente(s)</Badge>
				</a>
			{/if}
			{#if data.operacao.publicacoes.length}
				<div class="text-xs uppercase tracking-wide font-semibold text-grey mb-1">Publicações da semana</div>
				<ul class="divide-y divide-grey-200/60">
					{#each data.operacao.publicacoes as p (p.id)}
						<li class="py-1.5 text-sm">
							<a class="text-brand hover:underline" href={`/conteudo/${p.id}`}>{p.titulo}</a>
							<span class="block text-xs text-grey">{quandoPub(p.data_publicacao)}{p.cliente_nome ? ` · ${p.cliente_nome}` : ''}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-grey">Nenhuma publicação programada para os próximos 7 dias.</p>
			{/if}
		</div>
	</Card>
</div>

<!-- Alertas inteligentes — streamed (skeleton enquanto carrega) -->
<Card class="mt-6">
	{#await data.alertas}
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-sm font-semibold text-navy">Alertas inteligentes</h2>
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
			<h2 class="text-sm font-semibold text-navy">Alertas inteligentes</h2>
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
						<span class="size-2.5 rounded-full bg-brand-danger"></span>
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

				<!-- Clientes sem interação -->
				<section>
					<h3 class="flex items-center gap-2 font-semibold text-sm mb-3">
						<span class="size-2.5 rounded-full bg-brand-amber"></span>
						Clientes sem interação <span class="text-grey font-normal">({alertas.semInteracao.length})</span>
					</h3>
					{#if alertas.semInteracao.length}
						<ul class="divide-y divide-grey-200/60">
							{#each alertas.semInteracao as c (c.id)}
								<li class="py-1.5 text-sm">
									<a class="text-brand hover:underline" href={`/clientes/${c.id}`}>{c.nome}</a>
									<span class="block text-xs text-grey">
										{c.ultima ? `última interação ${formatDateBR(c.ultima)}` : 'nenhuma interação registrada'}
									</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-grey text-sm">Todos os clientes ativos tiveram interação recente.</p>
					{/if}
				</section>
			</div>
		{/if}
	{:catch}
		<p class="text-brand-danger">Não foi possível carregar os alertas. Tente atualizar a página.</p>
	{/await}
</Card>
