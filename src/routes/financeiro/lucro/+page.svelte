<script lang="ts">
	import { formatBRL } from '$lib/financeiro';
	let { data } = $props();
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/financeiro">Financeiro</a></li>
		<li class="is-active"><a href="#" aria-current="page">Lucro por cliente</a></li>
	</ul>
</nav>

<h1 class="title is-5">Lucro por cliente</h1>
<p class="subtitle is-6 has-text-grey">Receitas menos despesas alocadas a cada cliente.</p>

{#if data.loadError}
	<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead>
			<tr>
				<th>Cliente</th>
				<th class="has-text-right">Receitas</th>
				<th class="has-text-right">Despesas</th>
				<th class="has-text-right">Lucro</th>
			</tr>
		</thead>
		<tbody>
			{#each data.linhas as l (l.cliente_id)}
				<tr>
					<td><a href={`/clientes/${l.cliente_id}`}>{l.nome}</a></td>
					<td class="has-text-right" style="color:#1e7e34;">{formatBRL(l.receitas)}</td>
					<td class="has-text-right" style="color:#b3000a;">{formatBRL(l.despesas)}</td>
					<td class="has-text-right" style={`font-weight:600;color:${Number(l.lucro) >= 0 ? '#1e7e34' : '#b3000a'};`}>
						{formatBRL(l.lucro)}
					</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="has-text-centered has-text-grey p-5">Sem dados ainda.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
