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

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/clientes">Clientes</a></li>
		<li class="breadcrumb-item active" aria-current="page">{data.cliente.nome}</li>
	</ol>
</nav>

<div class="d-flex align-items-center gap-3 mb-4">
	<h1 class="h5 mb-0">{data.cliente.nome}</h1>
	<span class="badge" style={`background:${st.bg}; color:${st.fg}; font-weight:500;`}>
		{statusLabel(data.cliente.status)}
	</span>
</div>

{#if form?.saved}
	<div class="alert alert-success">Cliente salvo com sucesso.</div>
{/if}

<div class="card card-body">
	<ClienteForm
		{cliente}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</div>

<Comentarios entidadeTipo="cliente" entidadeId={data.cliente.id} />

<div class="card card-body">
	<h2 class="h6 text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Tem certeza? Esta ação remove o cliente e seus dados vinculados.</p>
			<div class="d-flex gap-2">
				<button class="btn btn-danger" type="submit">Sim, excluir</button>
				<button class="btn btn-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-outline-danger" onclick={() => (confirmDelete = true)}>Excluir cliente</button>
	{/if}
</div>
