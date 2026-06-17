<script lang="ts">
	import {
		CONTEUDO_STATUS,
		CONTEUDO_TIPO,
		conteudoStatusStyle,
		conteudoStatusLabel,
		conteudoTipoLabel
	} from '$lib/conteudo';

	let { data } = $props();
	let status = $state(data.status);
	let tipo = $state(data.tipo);

	function fmt(d: string | null) {
		return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
	}
</script>

<div class="level mb-4">
	<div class="level-left">
		<form class="level-item" method="GET" style="gap:.5rem; display:flex;">
			<div class="control">
				<div class="select">
					<select name="status" bind:value={status}>
						<option value="">Todos os status</option>
						{#each CONTEUDO_STATUS as s (s.value)}<option value={s.value}>{s.label}</option>{/each}
					</select>
				</div>
			</div>
			<div class="control">
				<div class="select">
					<select name="tipo" bind:value={tipo}>
						<option value="">Todos os tipos</option>
						{#each CONTEUDO_TIPO as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
					</select>
				</div>
			</div>
			<div class="control"><button class="button" type="submit">Filtrar</button></div>
		</form>
	</div>
	<div class="level-right">
		<a class="button is-primary" href="/conteudo/novo">+ Novo conteúdo</a>
	</div>
</div>

{#if data.loadError}<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead>
			<tr><th>Publicação</th><th>Título</th><th>Cliente</th><th>Tipo</th><th>Status</th></tr>
		</thead>
		<tbody>
			{#each data.conteudos as c (c.id)}
				{@const st = conteudoStatusStyle(c.status)}
				<tr style="cursor:pointer" onclick={() => (window.location.href = `/conteudo/${c.id}`)}>
					<td>{fmt(c.data_publicacao)}</td>
					<td><a href={`/conteudo/${c.id}`}>{c.titulo ?? '(sem título)'}</a></td>
					<td>{c.cliente?.nome ?? '—'}</td>
					<td>{conteudoTipoLabel(c.tipo)}</td>
					<td><span class="tag" style={`background:${st.bg};color:${st.fg};font-weight:500;`}>{conteudoStatusLabel(c.status)}</span></td>
				</tr>
			{:else}
				<tr><td colspan="5" class="has-text-centered has-text-grey p-5">Nenhum conteúdo ainda. Clique em “Novo conteúdo”.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
