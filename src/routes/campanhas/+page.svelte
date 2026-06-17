<script lang="ts">
	import { goto } from '$app/navigation';
	let { data } = $props();
	function fmt(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="level mb-4">
	<div class="level-left"><h1 class="title is-5 mb-0">Campanhas</h1></div>
	<div class="level-right"><a class="button is-primary" href="/campanhas/novo">+ Nova campanha</a></div>
</div>

{#if data.loadError}<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead><tr><th>Campanha</th><th>Cliente</th><th>Período</th></tr></thead>
		<tbody>
			{#each data.campanhas as c (c.id)}
				<tr style="cursor:pointer" onclick={() => goto(`/campanhas/${c.id}`)}>
					<td><a href={`/campanhas/${c.id}`}>{c.nome}</a></td>
					<td>{c.cliente?.nome ?? '—'}</td>
					<td>{fmt(c.data_inicio)} → {fmt(c.data_fim)}</td>
				</tr>
			{:else}
				<tr><td colspan="3" class="has-text-centered has-text-grey p-5">Nenhuma campanha ainda. Clique em “Nova campanha”.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
