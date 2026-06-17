<script lang="ts">
	import { formatBRL } from '$lib/contratos';

	let { data } = $props();
	const lim = (n: number | null) => (n == null ? '—' : n);
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/contratos">Contratos</a></li>
		<li class="is-active"><a href="#" aria-current="page">Planos</a></li>
	</ul>
</nav>

<div class="level mb-4">
	<div class="level-left"><h1 class="title is-5 mb-0">Planos</h1></div>
	<div class="level-right">
		<a class="button is-primary" href="/contratos/planos/novo">+ Novo plano</a>
	</div>
</div>

{#if data.loadError}
	<div class="notification is-danger is-light">Erro ao carregar: {data.loadError}</div>
{/if}

<div class="box p-0">
	<table class="table is-fullwidth is-hoverable mb-0">
		<thead>
			<tr>
				<th>Plano</th>
				<th class="has-text-right">Valor mensal</th>
				<th class="has-text-centered">Posts</th>
				<th class="has-text-centered">Stories</th>
				<th class="has-text-centered">Reels</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			{#each data.planos as p (p.id)}
				<tr style="cursor:pointer" onclick={() => (window.location.href = `/contratos/planos/${p.id}`)}>
					<td><a href={`/contratos/planos/${p.id}`}>{p.nome}</a></td>
					<td class="has-text-right">{formatBRL(p.valor_mensal)}</td>
					<td class="has-text-centered">{lim(p.limite_posts)}</td>
					<td class="has-text-centered">{lim(p.limite_stories)}</td>
					<td class="has-text-centered">{lim(p.limite_reels)}</td>
					<td>
						{#if p.ativo}
							<span class="tag" style="background:#e6f4ea;color:#1e7e34;font-weight:500;">Ativo</span>
						{:else}
							<span class="tag" style="background:#eeeeee;color:#555;font-weight:500;">Inativo</span>
						{/if}
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" class="has-text-centered has-text-grey p-5">
						Nenhum plano cadastrado. Crie Starter, Gold e Premium para usar nos contratos.
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
