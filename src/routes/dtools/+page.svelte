<script lang="ts">
	import { DTOOLS_FERRAMENTAS } from '$lib/dtools';
</script>

<div class="box">
	<h1 class="title is-5">DTools — Ferramentas Dunamis</h1>
	<p class="subtitle is-6 has-text-grey">
		Central de ferramentas internas da Dunamis integradas ao sistema.
	</p>

	{#if DTOOLS_FERRAMENTAS.length}
		<div class="columns is-multiline">
			{#each DTOOLS_FERRAMENTAS as f (f.href)}
				<div class="column is-4">
					<a class="tool-card" href={f.href}>
						<span class="tool-ico">{f.icon}</span>
						<div>
							<strong>{f.label}</strong>
							{#if f.descricao}<p class="is-size-7 has-text-grey">{f.descricao}</p>{/if}
						</div>
					</a>
				</div>
			{/each}
		</div>
	{:else}
		<div class="notification is-light">
			<strong>Nenhuma ferramenta configurada ainda.</strong>
			<p class="mt-1">
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
