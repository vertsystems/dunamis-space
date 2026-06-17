<script lang="ts">
	import { CLIENTE_STATUS, statusStyle, statusLabel, formatBRL } from '$lib/clientes';

	let { data } = $props();

	let q = $state(data.q);
	let status = $state(data.status);
</script>

<div class="level mb-4">
	<div class="level-left">
		<form class="level-item" method="GET" style="gap:.5rem; display:flex; flex-wrap:wrap;">
			<div class="control">
				<input class="input" type="search" name="q" placeholder="Buscar por nome" bind:value={q} />
			</div>
			<div class="control">
				<div class="select">
					<select name="status" bind:value={status}>
						<option value="">Todos os status</option>
						{#each CLIENTE_STATUS as s (s.value)}
							<option value={s.value}>{s.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="control">
				<button class="button" type="submit">Filtrar</button>
			</div>
		</form>
	</div>
	<div class="level-right">
		<a class="button is-primary" href="/clientes/novo">+ Novo cliente</a>
	</div>
</div>

{#if data.loadError}
	<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead>
			<tr>
				<th>Nome</th>
				<th>Status</th>
				<th>Segmento</th>
				<th>Responsável</th>
				<th class="has-text-right">MRR</th>
			</tr>
		</thead>
		<tbody>
			{#each data.clientes as c (c.id)}
				{@const st = statusStyle(c.status)}
				<tr style="cursor:pointer" onclick={() => (window.location.href = `/clientes/${c.id}`)}>
					<td>
						<a href={`/clientes/${c.id}`}>{c.nome}</a>
						{#if c.contato_email}<br /><small class="has-text-grey">{c.contato_email}</small>{/if}
					</td>
					<td>
						<span
							class="tag"
							style={`background:${st.bg}; color:${st.fg}; font-weight:500;`}
						>
							{statusLabel(c.status)}
						</span>
					</td>
					<td>{c.segmento ?? '—'}</td>
					<td>{c.responsavel?.nome ?? '—'}</td>
					<td class="has-text-right">{formatBRL(c.mrr)}</td>
				</tr>
			{:else}
				<tr>
					<td colspan="5" class="has-text-centered has-text-grey p-5">
						Nenhum cliente ainda. Clique em “Novo cliente” para começar.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
