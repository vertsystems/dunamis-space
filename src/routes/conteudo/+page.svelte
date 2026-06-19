<script lang="ts">
	import {
		CONTEUDO_STATUS,
		CONTEUDO_TIPO,
		conteudoStatusStyle,
		conteudoStatusLabel,
		conteudoTipoLabel
	} from '$lib/conteudo';
	import { goto } from '$app/navigation';

	let { data } = $props();
	let status = $state(data.status);
	let tipo = $state(data.tipo);

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
	}
</script>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
	<div class="d-flex align-items-center flex-wrap gap-2">
		<div class="btn-group">
			<span class="btn btn-primary">Lista</span>
			<a class="btn btn-outline-secondary" href="/conteudo/calendario">Calendário</a>
			<a class="btn btn-outline-secondary" href="/conteudo/aprovacoes">Aprovações</a>
		</div>
		<form class="d-flex gap-2 flex-wrap" method="GET">
			<select class="form-select" style="max-width:170px" name="status" bind:value={status}>
				<option value="">Todos os status</option>
				{#each CONTEUDO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
			</select>
			<select class="form-select" style="max-width:160px" name="tipo" bind:value={tipo}>
				<option value="">Todos os tipos</option>
				{#each CONTEUDO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
			</select>
			<button class="btn btn-light" type="submit">Filtrar</button>
		</form>
	</div>
	<a class="btn btn-primary" href="/conteudo/novo">+ Novo conteúdo</a>
</div>

{#if data.loadError}<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr><th>Publicação</th><th>Título</th><th>Cliente</th><th>Tipo</th><th>Status</th></tr>
			</thead>
			<tbody>
				{#each data.conteudos as c (c.id)}
					{@const st = conteudoStatusStyle(c.status)}
					<tr style="cursor:pointer" onclick={() => goto(`/conteudo/${c.id}`)}>
						<td>{fmt(c.data_publicacao)}</td>
						<td><a href={`/conteudo/${c.id}`}>{c.titulo ?? '(sem título)'}</a></td>
						<td>{c.cliente?.nome ?? '—'}</td>
						<td>{conteudoTipoLabel(c.tipo)}</td>
						<td><span class="badge" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>{conteudoStatusLabel(c.status)}</span></td>
					</tr>
				{:else}
					<tr><td colspan="5" class="text-center text-muted p-5">Nenhum conteúdo ainda. Clique em “Novo conteúdo”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
