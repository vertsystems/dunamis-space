<script lang="ts">
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

<div class="columns mb-2">
	<div class="column is-4">
		<div class="stat-card">
			<div class="stat-label">Receitas</div>
			<div class="stat-value" style="color:#1e7e34;">{formatBRL(data.receitas)}</div>
		</div>
	</div>
	<div class="column is-4">
		<div class="stat-card">
			<div class="stat-label">Despesas</div>
			<div class="stat-value" style="color:#b3000a;">{formatBRL(data.despesas)}</div>
		</div>
	</div>
	<div class="column is-4">
		<div class="stat-card">
			<div class="stat-label">Saldo</div>
			<div class="stat-value" style={`color:${data.saldo >= 0 ? '#1e7e34' : '#b3000a'};`}>
				{formatBRL(data.saldo)}
			</div>
		</div>
	</div>
</div>

<div class="level mb-4">
	<div class="level-left">
		<form class="level-item" method="GET" style="gap:.5rem; display:flex;">
			<div class="control">
				<div class="select">
					<select name="tipo" bind:value={tipo}>
						<option value="">Todos os tipos</option>
						{#each TRANSACAO_TIPO as t (t.value)}
							<option value={t.value}>{t.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="control">
				<div class="select">
					<select name="status" bind:value={status}>
						<option value="">Todos os status</option>
						{#each TRANSACAO_STATUS as s (s.value)}
							<option value={s.value}>{s.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="control"><button class="button" type="submit">Filtrar</button></div>
		</form>
	</div>
	<div class="level-right">
		<div class="buttons">
			<a class="button is-light" href="/financeiro/lucro">Lucro por cliente</a>
			<a class="button is-primary" href="/financeiro/novo">+ Nova transação</a>
		</div>
	</div>
</div>

{#if data.loadError}
	<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead>
			<tr>
				<th>Competência</th>
				<th>Descrição</th>
				<th>Categoria</th>
				<th>Cliente</th>
				<th>Status</th>
				<th class="has-text-right">Valor</th>
			</tr>
		</thead>
		<tbody>
			{#each data.transacoes as t (t.id)}
				{@const st = statusStyle(t.status)}
				{@const receita = t.tipo === 'receita'}
				<tr style="cursor:pointer" onclick={() => (window.location.href = `/financeiro/${t.id}`)}>
					<td>{fmtData(t.data_competencia)}</td>
					<td><a href={`/financeiro/${t.id}`}>{t.descricao ?? '—'}</a></td>
					<td>{t.categoria ?? '—'}</td>
					<td>{t.cliente?.nome ?? '—'}</td>
					<td>
						<span class="tag" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>
							{statusLabel(t.status)}
						</span>
					</td>
					<td class="has-text-right" style={`color:${receita ? '#1e7e34' : '#b3000a'};font-weight:500;`}>
						{receita ? '+' : '−'}{formatBRL(t.valor)}
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" class="has-text-centered has-text-grey p-5">
						Nenhuma transação ainda. Clique em “Nova transação” para começar.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
