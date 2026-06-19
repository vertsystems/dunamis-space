<script lang="ts">
	import { DTOOLS_FERRAMENTAS } from '$lib/dtools';
</script>

<div class="card card-body">
	<h1 class="h5">DTools — Ferramentas Dunamis</h1>
	<p class="text-muted">Central de ferramentas internas da Dunamis integradas ao sistema.</p>

	{#if DTOOLS_FERRAMENTAS.length}
		<div class="row g-3">
			{#each DTOOLS_FERRAMENTAS as f (f.href)}
				<div class="col-md-4">
					<a class="tool-card" href={f.href}>
						<span class="tool-ico">{f.icon}</span>
						<div>
							<strong>{f.label}</strong>
							{#if f.descricao}<p class="small text-muted mb-0">{f.descricao}</p>{/if}
						</div>
					</a>
				</div>
			{/each}
		</div>
	{:else}
		<div class="alert alert-secondary mb-0">
			<strong>Nenhuma ferramenta configurada ainda.</strong>
			<p class="mt-1 mb-0">
				Este é o espaço reservado para as ferramentas da Dunamis. Conforme forem definidas, elas
				aparecerão aqui e no menu lateral de DTools.
			</p>
		</div>
	{/if}
</div>

<style>
	.tool-card {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 1rem;
		border: 1px solid var(--ds-grey);
		border-radius: 12px;
		background: #fff;
		color: var(--ds-dark);
		height: 100%;
		text-decoration: none;
	}
	.tool-card:hover {
		border-color: var(--ds-red);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
	}
	.tool-ico {
		font-size: 1.5rem;
		line-height: 1;
	}
</style>
