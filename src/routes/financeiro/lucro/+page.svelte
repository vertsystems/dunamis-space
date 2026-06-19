<script lang="ts">
	import { formatBRL } from '$lib/financeiro';
	let { data } = $props();
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/financeiro">Financeiro</a></li>
		<li class="breadcrumb-item active" aria-current="page">Lucro por cliente</li>
	</ol>
</nav>

<h1 class="h5">Lucro por cliente</h1>
<p class="text-muted">Receitas menos despesas alocadas a cada cliente.</p>

{#if data.loadError}
	<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr>
					<th>Cliente</th>
					<th class="text-end">Receitas</th>
					<th class="text-end">Despesas</th>
					<th class="text-end">Lucro</th>
				</tr>
			</thead>
			<tbody>
				{#each data.linhas as l (l.cliente_id)}
					<tr>
						<td><a href={`/clientes/${l.cliente_id}`}>{l.nome}</a></td>
						<td class="text-end" style="color:#1e7e34;">{formatBRL(l.receitas)}</td>
						<td class="text-end" style="color:#b3000a;">{formatBRL(l.despesas)}</td>
						<td class="text-end" style={`font-weight:600;color:${Number(l.lucro) >= 0 ? '#1e7e34' : '#b3000a'};`}>
							{formatBRL(l.lucro)}
						</td>
					</tr>
				{:else}
					<tr><td colspan="4" class="text-center text-muted p-5">Sem dados ainda.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
