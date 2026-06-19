<script lang="ts">
	import { goto } from '$app/navigation';
	import { CLIENTE_STATUS, statusStyle, statusLabel, formatBRL } from '$lib/clientes';

	let { data } = $props();

	let q = $state(data.q);
	let status = $state(data.status);
</script>

<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
	<form class="d-flex gap-2 flex-wrap" method="GET">
		<input class="form-control" style="max-width:220px" type="search" name="q" placeholder="Buscar por nome" bind:value={q} />
		<select class="form-select" style="max-width:190px" name="status" bind:value={status}>
			<option value="">Todos os status</option>
			{#each CLIENTE_STATUS as s (s.value)}
				<option value={s.value}>{s.label}</option>
			{/each}
		</select>
		<button class="btn btn-light" type="submit">Filtrar</button>
	</form>
	<a class="btn btn-primary" href="/clientes/novo">+ Novo cliente</a>
</div>

{#if data.loadError}
	<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr>
					<th>Nome</th>
					<th>Status</th>
					<th>Segmento</th>
					<th>Responsável</th>
					<th class="text-end">MRR</th>
				</tr>
			</thead>
			<tbody>
				{#each data.clientes as c (c.id)}
					{@const st = statusStyle(c.status)}
					<tr style="cursor:pointer" onclick={() => goto(`/clientes/${c.id}`)}>
						<td>
							<a href={`/clientes/${c.id}`}>{c.nome}</a>
							{#if c.contato_email}<br /><small class="text-muted">{c.contato_email}</small>{/if}
						</td>
						<td>
							<span class="badge" style={`background:${st.bg}; color:${st.fg}; font-weight:500;`}>
								{statusLabel(c.status)}
							</span>
						</td>
						<td>{c.segmento ?? '—'}</td>
						<td>{c.responsavel?.nome ?? '—'}</td>
						<td class="text-end">{formatBRL(c.mrr)}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="text-center text-muted p-5">
							Nenhum cliente ainda. Clique em “Novo cliente” para começar.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
