<script lang="ts">
	import { formatBRL } from '$lib/clientes';
	import { diasAte, formatDateBR, prazoContratoLabel } from '$lib/alertas';

	let { data } = $props();

	const stats = $derived([
		{ label: 'Receita recorrente (MRR)', value: formatBRL(data.recorrente) },
		{ label: 'Lucro (receitas − despesas)', value: formatBRL(data.lucro) },
		{ label: 'Clientes ativos', value: String(data.ativos) },
		{ label: 'Tarefas atrasadas', value: String(data.atrasadas) }
	]);

	const { contratos, tarefas, semInteracao } = $derived(data.alertas);
	const totalAlertas = $derived(contratos.length + tarefas.length + semInteracao.length);
</script>

<div class="row g-3">
	{#each stats as s (s.label)}
		<div class="col-6 col-lg-3">
			<div class="stat-card">
				<div class="stat-label">{s.label}</div>
				<div class="stat-value">{s.value}</div>
			</div>
		</div>
	{/each}
</div>

<div class="card card-body mt-4">
	<div class="d-flex justify-content-between align-items-center mb-4">
		<h2 class="h5 mb-0">Alertas inteligentes</h2>
		<span class="badge {totalAlertas ? 'text-bg-danger' : 'text-bg-success'}">
			{totalAlertas ? `${totalAlertas} ${totalAlertas === 1 ? 'alerta' : 'alertas'}` : 'Tudo em dia'}
		</span>
	</div>

	{#if totalAlertas === 0}
		<p class="text-muted mb-0">✅ Nenhum alerta no momento. Contratos, tarefas e contatos com clientes estão em dia.</p>
	{:else}
		<div class="row g-4">
			<!-- Contratos vencendo -->
			<div class="col-md-4">
				<h3 class="alert-head">
					<span class="alert-dot" style="background:#a8350a"></span>
					Contratos vencendo <span class="text-muted">({contratos.length})</span>
				</h3>
				{#if contratos.length}
					<ul class="alert-list">
						{#each contratos as c (c.id)}
							{@const dias = diasAte(c.data_fim)}
							<li>
								<a href={`/contratos/${c.id}`}>{c.cliente_nome ?? 'Contrato'}</a>
								<span class="alert-meta" class:is-overdue={dias !== null && dias < 0}>
									{prazoContratoLabel(dias)} · {formatDateBR(c.data_fim)}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-muted small">Nenhum contrato vencendo.</p>
				{/if}
			</div>

			<!-- Tarefas atrasadas -->
			<div class="col-md-4">
				<h3 class="alert-head">
					<span class="alert-dot" style="background:#de4908"></span>
					Tarefas atrasadas <span class="text-muted">({data.atrasadas})</span>
				</h3>
				{#if tarefas.length}
					<ul class="alert-list">
						{#each tarefas as t (t.id)}
							{@const dias = diasAte(t.prazo)}
							<li>
								<a href={`/tarefas?projeto=${t.projeto_id ?? ''}`}>{t.titulo}</a>
								<span class="alert-meta is-overdue">
									{prazoContratoLabel(dias)}{t.cliente_nome ? ' · ' + t.cliente_nome : ''}
								</span>
							</li>
						{/each}
					</ul>
					{#if data.atrasadas > tarefas.length}
						<p class="small"><a href="/tarefas">+ ver todas no Kanban</a></p>
					{/if}
				{:else}
					<p class="text-muted small">Nenhuma tarefa atrasada.</p>
				{/if}
			</div>

			<!-- Clientes sem contato -->
			<div class="col-md-4">
				<h3 class="alert-head">
					<span class="alert-dot" style="background:#f6aa19"></span>
					Clientes sem contato <span class="text-muted">({semInteracao.length})</span>
				</h3>
				{#if semInteracao.length}
					<ul class="alert-list">
						{#each semInteracao as c (c.id)}
							<li>
								<a href={`/clientes/${c.id}`}>{c.nome}</a>
								<span class="alert-meta">
									{c.ultima ? `último contato ${formatDateBR(c.ultima)}` : 'sem interações'}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-muted small">Todos os clientes ativos tiveram contato recente.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.alert-head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.95rem;
		margin-bottom: 0.75rem;
	}
	.alert-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		display: inline-block;
	}
	.alert-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.alert-list li {
		padding: 0.4rem 0;
		border-bottom: 1px solid #e3e6e6;
		font-size: 0.9rem;
	}
	.alert-list li:last-child {
		border-bottom: none;
	}
	.alert-meta {
		display: block;
		font-size: 0.78rem;
		color: #888;
	}
	.alert-meta.is-overdue {
		color: #a8350a;
	}
</style>
