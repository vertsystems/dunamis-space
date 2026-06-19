<script lang="ts">
	import { goto } from '$app/navigation';
	import { formatBRL } from '$lib/contratos';

	let { data } = $props();
	const lim = (n: number | null) => (n == null ? '—' : n);
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/contratos">Contratos</a></li>
		<li class="breadcrumb-item active" aria-current="page">Planos</li>
	</ol>
</nav>

<div class="d-flex justify-content-between align-items-center mb-4">
	<h1 class="h5 mb-0">Planos</h1>
	<a class="btn btn-primary" href="/contratos/planos/novo">+ Novo plano</a>
</div>

{#if data.loadError}
	<div class="alert alert-danger">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="card">
	<div class="table-responsive">
		<table class="table table-hover align-middle mb-0">
			<thead>
				<tr>
					<th>Plano</th>
					<th class="text-end">Valor mensal</th>
					<th class="text-center">Posts</th>
					<th class="text-center">Stories</th>
					<th class="text-center">Reels</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.planos as p (p.id)}
					<tr style="cursor:pointer" onclick={() => goto(`/contratos/planos/${p.id}`)}>
						<td><a href={`/contratos/planos/${p.id}`}>{p.nome}</a></td>
						<td class="text-end">{formatBRL(p.valor_mensal)}</td>
						<td class="text-center">{lim(p.limite_posts)}</td>
						<td class="text-center">{lim(p.limite_stories)}</td>
						<td class="text-center">{lim(p.limite_reels)}</td>
						<td>
							{#if p.ativo}
								<span class="badge" style="background:#e6f4ea;color:#1e7e34;font-weight:500;">Ativo</span>
							{:else}
								<span class="badge" style="background:#eeeeee;color:#555;font-weight:500;">Inativo</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="text-center text-muted p-5">
							Nenhum plano cadastrado. Crie Starter, Gold e Premium para usar nos contratos.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
