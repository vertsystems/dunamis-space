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

<div class="columns is-multiline">
	{#each stats as s (s.label)}
		<div class="column is-3">
			<div class="stat-card">
				<div class="stat-label">{s.label}</div>
				<div class="stat-value">{s.value}</div>
			</div>
		</div>
	{/each}
</div>

<div class="box mt-4">
	<div class="level mb-4">
		<div class="level-left">
			<h2 class="title is-5 mb-0">Alertas inteligentes</h2>
		</div>
		<div class="level-right">
			<span class="tag {totalAlertas ? 'is-danger' : 'is-success'} is-light">
				{totalAlertas ? `${totalAlertas} ${totalAlertas === 1 ? 'alerta' : 'alertas'}` : 'Tudo em dia'}
			</span>
		</div>
	</div>

	{#if totalAlertas === 0}
		<p class="has-text-grey">✅ Nenhum alerta no momento. Contratos, tarefas e contatos com clientes estão em dia.</p>
	{:else}
		<div class="columns">
			<!-- Contratos vencendo -->
			<div class="column">
				<h3 class="alert-head">
					<span class="alert-dot" style="background:#f20009"></span>
					Contratos vencendo <span class="has-text-grey">({contratos.length})</span>
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
					<p class="has-text-grey is-size-7">Nenhum contrato vencendo.</p>
				{/if}
			</div>

			<!-- Tarefas atrasadas -->
			<div class="column">
				<h3 class="alert-head">
					<span class="alert-dot" style="background:#ff6f00"></span>
					Tarefas atrasadas <span class="has-text-grey">({data.atrasadas})</span>
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
						<p class="is-size-7"><a href="/tarefas">+ ver todas no Kanban</a></p>
					{/if}
				{:else}
					<p class="has-text-grey is-size-7">Nenhuma tarefa atrasada.</p>
				{/if}
			</div>

			<!-- Clientes sem contato -->
			<div class="column">
				<h3 class="alert-head">
					<span class="alert-dot" style="background:#ffc527"></span>
					Clientes sem contato <span class="has-text-grey">({semInteracao.length})</span>
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
					<p class="has-text-grey is-size-7">Todos os clientes ativos tiveram contato recente.</p>
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
	}
	.alert-list li {
		padding: 0.4rem 0;
		border-bottom: 1px solid #eee;
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
		color: #f20009;
	}
</style>
