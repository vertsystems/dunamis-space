<script lang="ts">
	import { enhance } from '$app/forms';
	import ClienteForm from '$lib/components/ClienteForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';
	import { statusStyle, statusLabel } from '$lib/clientes';

	let { data, form } = $props();

	// Após salvar com sucesso, usa os valores atualizados; senão, os do banco.
	let cliente = $derived(form?.values ?? data.cliente);
	let confirmDelete = $state(false);
	const st = $derived(statusStyle(data.cliente.status));
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/clientes">Clientes</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.cliente.nome}</a></li>
	</ul>
</nav>

<div class="level mb-4">
	<div class="level-left">
		<div class="level-item">
			<h1 class="title is-5 mb-0">{data.cliente.nome}</h1>
		</div>
		<div class="level-item">
			<span class="tag" style={`background:${st.bg}; color:${st.fg}; font-weight:500;`}>
				{statusLabel(data.cliente.status)}
			</span>
		</div>
	</div>
</div>

{#if form?.saved}
	<div class="notification is-success is-light">Cliente salvo com sucesso.</div>
{/if}

<div class="box">
	<ClienteForm
		{cliente}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</div>

<Comentarios entidadeTipo="cliente" entidadeId={data.cliente.id} />

<div class="box">
	<h2 class="title is-6 has-text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Tem certeza? Esta ação remove o cliente e seus dados vinculados.</p>
			<div class="field is-grouped">
				<div class="control">
					<button class="button is-danger" type="submit">Sim, excluir</button>
				</div>
				<div class="control">
					<button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>
						Cancelar
					</button>
				</div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>
			Excluir cliente
		</button>
	{/if}
</div>
