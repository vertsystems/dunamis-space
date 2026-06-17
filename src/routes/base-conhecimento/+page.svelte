<script lang="ts">
	import { goto } from '$app/navigation';
	let { data } = $props();
	let q = $state(data.q);
</script>

<div class="level mb-4">
	<div class="level-left">
		<form class="level-item" method="GET" style="gap:.5rem; display:flex;">
			<div class="control"><input class="input" type="search" name="q" placeholder="Buscar por título" bind:value={q} /></div>
			<div class="control"><button class="button" type="submit">Buscar</button></div>
		</form>
	</div>
	<div class="level-right"><a class="button is-primary" href="/base-conhecimento/novo">+ Novo artigo</a></div>
</div>

{#if data.loadError}<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
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
							<span class="tag is-light mr-1">{t}</span>
						{/each}
					</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="has-text-centered has-text-grey p-5">Nenhum artigo ainda. Documente processos e padrões aqui.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
