<script lang="ts">
	import { goto } from '$app/navigation';
	let { data } = $props();
	function fmt(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="d-flex justify-content-between align-items-center mb-4">
	<h1 class="h5 mb-0">Campanhas</h1>
	<a class="btn btn-primary" href="/campanhas/novo">+ Nova campanha</a>
</div>

{#if data.loadError}<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead><tr><th>Campanha</th><th>Cliente</th><th>Período</th></tr></thead>
			<tbody>
				{#each data.campanhas as c (c.id)}
					<tr style="cursor:pointer" onclick={() => goto(`/campanhas/${c.id}`)}>
						<td><a href={`/campanhas/${c.id}`}>{c.nome}</a></td>
						<td>{c.cliente?.nome ?? '—'}</td>
						<td>{fmt(c.data_inicio)} → {fmt(c.data_fim)}</td>
					</tr>
				{:else}
					<tr><td colspan="3" class="text-center text-muted p-5">Nenhuma campanha ainda. Clique em “Nova campanha”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
