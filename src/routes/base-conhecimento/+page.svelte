<script lang="ts">
	import { goto } from '$app/navigation';
	let { data } = $props();
	let q = $state(data.q);
</script>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
	<form class="d-flex gap-2" method="GET">
		<input class="form-control" style="max-width:260px" type="search" name="q" placeholder="Buscar por título" bind:value={q} />
		<button class="btn btn-light" type="submit">Buscar</button>
	</form>
	<a class="btn btn-primary" href="/base-conhecimento/novo">+ Novo artigo</a>
</div>

{#if data.loadError}<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr><th>Título</th><th>Categoria</th><th>Cliente</th><th>Tags</th></tr>
			</thead>
			<tbody>
				{#each data.artigos as a (a.id)}
					<tr style="cursor:pointer" onclick={() => goto(`/base-conhecimento/${a.id}`)}>
						<td><a href={`/base-conhecimento/${a.id}`}>{a.titulo}</a></td>
						<td>{a.categoria ?? '—'}</td>
						<td>{a.cliente?.nome ?? 'Geral'}</td>
						<td>
							{#each a.tags ?? [] as t (t)}
								<span class="badge text-bg-light me-1">{t}</span>
							{/each}
						</td>
					</tr>
				{:else}
					<tr><td colspan="4" class="text-center text-muted p-5">Nenhum artigo ainda. Documente processos e padrões aqui.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
