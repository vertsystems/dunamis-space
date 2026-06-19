<script lang="ts">
	import { goto } from '$app/navigation';
	import { funcaoLabel } from '$lib/equipe';
	import { formatBRL } from '$lib/clientes';

	let { data } = $props();
</script>

<div class="d-flex justify-content-between align-items-center mb-4">
	<h1 class="h5 mb-0">Equipe</h1>
	<a class="btn btn-primary" href="/equipe/novo">+ Novo colaborador</a>
</div>

{#if data.loadError}<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr><th>Nome</th><th>E-mail</th><th>Função</th><th class="text-end">Custo/hora</th><th>Status</th></tr>
			</thead>
			<tbody>
				{#each data.colaboradores as c (c.id)}
					<tr style="cursor:pointer" onclick={() => goto(`/equipe/${c.id}`)}>
						<td><a href={`/equipe/${c.id}`}>{c.nome}</a></td>
						<td>{c.email}</td>
						<td>{funcaoLabel(c.funcao)}</td>
						<td class="text-end">{c.custo_hora != null ? formatBRL(c.custo_hora) : '—'}</td>
						<td>
							{#if c.ativo}
								<span class="badge" style="background:#e6f4ea;color:#1e7e34;font-weight:500;">Ativo</span>
							{:else}
								<span class="badge" style="background:#eeeeee;color:#555;font-weight:500;">Inativo</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="text-center text-muted p-5">Nenhum colaborador ainda. Clique em “Novo colaborador”.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
