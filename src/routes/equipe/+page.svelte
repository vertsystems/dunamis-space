<script lang="ts">
	import { funcaoLabel } from '$lib/equipe';
	import { formatBRL } from '$lib/clientes';

	let { data } = $props();
</script>

<div class="level mb-4">
	<div class="level-left"><h1 class="title is-5 mb-0">Equipe</h1></div>
	<div class="level-right"><a class="button is-primary" href="/equipe/novo">+ Novo colaborador</a></div>
</div>

{#if data.loadError}<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead>
			<tr><th>Nome</th><th>E-mail</th><th>Função</th><th class="has-text-right">Custo/hora</th><th>Status</th></tr>
		</thead>
		<tbody>
			{#each data.colaboradores as c (c.id)}
				<tr style="cursor:pointer" onclick={() => (window.location.href = `/equipe/${c.id}`)}>
					<td><a href={`/equipe/${c.id}`}>{c.nome}</a></td>
					<td>{c.email}</td>
					<td>{funcaoLabel(c.funcao)}</td>
					<td class="has-text-right">{c.custo_hora != null ? formatBRL(c.custo_hora) : '—'}</td>
					<td>
						{#if c.ativo}
							<span class="tag" style="background:#e6f4ea;color:#1e7e34;font-weight:500;">Ativo</span>
						{:else}
							<span class="tag" style="background:#eeeeee;color:#555;font-weight:500;">Inativo</span>
						{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="has-text-centered has-text-grey p-5">Nenhum colaborador ainda. Clique em “Novo colaborador”.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
