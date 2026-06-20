<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		TRANSACAO_TIPO,
		TRANSACAO_STATUS,
		statusStyle,
		statusLabel,
		formatBRL
	} from '$lib/financeiro';

	let { data } = $props();
	let tipo = $state(data.tipo);
	let status = $state(data.status);

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="row g-3 mb-2">
	<div class="col-md-4">
		<div class="stat-card">
			<div class="stat-label">Receitas</div>
			<div class="stat-value" style="color:#1e7e34;">{formatBRL(data.receitas)}</div>
		</div>
	</div>
	<div class="col-md-4">
		<div class="stat-card">
			<div class="stat-label">Despesas</div>
			<div class="stat-value" style="color:#b3000a;">{formatBRL(data.despesas)}</div>
		</div>
	</div>
	<div class="col-md-4">
		<div class="stat-card">
			<div class="stat-label">Saldo</div>
			<div class="stat-value" style={`color:${data.saldo >= 0 ? '#1e7e34' : '#b3000a'};`}>
				{formatBRL(data.saldo)}
			</div>
		</div>
	</div>
</div>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
	<form class="d-flex gap-2" method="GET">
		<select class="form-select" style="max-width:205px" name="tipo" bind:value={tipo}>
			<option value="">Todos os tipos</option>
			{#each TRANSACAO_TIPO as t (t.value)}
				<option value={t.value}>{t.label}</option>
			{/each}
		</select>
		<select class="form-select" style="max-width:205px" name="status" bind:value={status}>
			<option value="">Todos os status</option>
			{#each TRANSACAO_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</select>
		<button class="btn btn-light" type="submit">Filtrar</button>
	</form>
	<div class="d-flex gap-2">
		<a class="btn btn-light" href="/financeiro/lucro">Lucro por cliente</a>
		<a class="btn btn-primary" href="/financeiro/novo">+ Nova transação</a>
	</div>
</div>

{#if data.loadError}
	<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr>
					<th>Competência</th>
					<th>Descrição</th>
					<th>Categoria</th>
					<th>Cliente</th>
					<th>Status</th>
					<th class="text-end">Valor</th>
				</tr>
			</thead>
			<tbody>
				{#each data.transacoes as t (t.id)}
					{@const st = statusStyle(t.status)}
					{@const receita = t.tipo === 'receita'}
					<tr style="cursor:pointer" onclick={() => goto(`/financeiro/${t.id}`)}>
						<td>{fmtData(t.data_competencia)}</td>
						<td><a href={`/financeiro/${t.id}`}>{t.descricao ?? '—'}</a></td>
						<td>{t.categoria ?? '—'}</td>
						<td>{t.cliente?.nome ?? '—'}</td>
						<td>
							<span class="badge" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>
								{statusLabel(t.status)}
							</span>
						</td>
						<td class="text-end" style={`color:${receita ? '#1e7e34' : '#b3000a'};font-weight:500;`}>
							{receita ? '+' : '−'}{formatBRL(t.valor)}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="text-center text-muted p-5">
							Nenhuma transação ainda. Clique em “Nova transação” para começar.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
