<script lang="ts">
	import { goto } from '$app/navigation';
	import { PROJETO_STATUS, projetoStatusStyle, projetoStatusLabel, projetoTipoLabel } from '$lib/projetos';

	let { data } = $props();
	let status = $state(data.status);

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="level mb-4">
	<div class="level-left">
		<form class="level-item" method="GET" style="gap:.5rem; display:flex;">
			<div class="control">
				<div class="select">
					<select name="status" bind:value={status}>
						<option value="">Todos os status</option>
						{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
					</select>
				</div>
			</div>
			<div class="control"><button class="button" type="submit">Filtrar</button></div>
		</form>
	</div>
	<div class="level-right">
		<a class="button is-primary" href="/projetos/novo">+ Novo projeto</a>
	</div>
</div>

{#if data.loadError}<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead>
			<tr><th>Projeto</th><th>Cliente</th><th>Tipo</th><th>Responsável</th><th>Prazo</th><th>Status</th></tr>
		</thead>
		<tbody>
			{#each data.projetos as p (p.id)}
				{@const st = projetoStatusStyle(p.status)}
				<tr style="cursor:pointer" onclick={() => goto(`/projetos/${p.id}`)}>
					<td><a href={`/projetos/${p.id}`}>{p.nome}</a></td>
					<td>{p.cliente?.nome ?? '—'}</td>
					<td>{projetoTipoLabel(p.tipo)}</td>
					<td>{p.responsavel?.nome ?? '—'}</td>
					<td>{fmtData(p.prazo)}</td>
					<td><span class="tag" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>{projetoStatusLabel(p.status)}</span></td>
				</tr>
			{:else}
				<tr><td colspan="6" class="has-text-centered has-text-grey p-5">Nenhum projeto ainda. Clique em “Novo projeto”.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
