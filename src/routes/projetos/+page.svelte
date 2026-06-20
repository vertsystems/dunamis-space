<script lang="ts">
	import { goto } from '$app/navigation';
	import { PROJETO_STATUS, projetoStatusStyle, projetoStatusLabel, projetoTipoLabel } from '$lib/projetos';

	let { data } = $props();
	let status = $state(data.status);

	function fmtData(d: string | null) {
		return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
	}
</script>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
	<form class="d-flex gap-2" method="GET">
		<select class="form-select" style="max-width:190px" name="status" bind:value={status}>
			<option value="">Todos os status</option>
			{#each PROJETO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
		</select>
		<button class="btn btn-light" type="submit">Filtrar</button>
	</form>
	<a class="btn btn-primary" href="/projetos/novo">+ Novo projeto</a>
</div>

{#if data.loadError}<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
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
						<td><span class="badge" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>{projetoStatusLabel(p.status)}</span></td>
					</tr>
				{:else}
					<tr><td colspan="6" class="text-center text-muted p-5">Nenhum projeto ainda. Clique em “Novo projeto”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
