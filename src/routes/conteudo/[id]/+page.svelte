<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';

	let { data, form } = $props();
	let conteudo = $derived(form?.values ?? data.conteudo);
	let confirmDelete = $state(false);
	let copiado = $state(false);

	const aprovacao = $derived(data.aprovacao);
	const linkAprovacao = $derived(
		aprovacao ? `${page.url.origin}/aprovar/${aprovacao.token_publico}` : ''
	);

	const aprovStatus: Record<string, { label: string; cls: string }> = {
		pendente: { label: 'Aguardando cliente', cls: 'text-bg-warning' },
		aprovado: { label: 'Aprovado', cls: 'text-bg-success' },
		alteracao_solicitada: { label: 'Alteração solicitada', cls: 'text-bg-danger' }
	};

	async function copiar() {
		await navigator.clipboard.writeText(linkAprovacao);
		copiado = true;
		setTimeout(() => (copiado = false), 2000);
	}
</script>

<nav aria-label="breadcrumb" class="mb-4">
	<ol class="breadcrumb">
		<li class="breadcrumb-item"><a href="/conteudo">Conteúdo</a></li>
		<li class="breadcrumb-item active" aria-current="page">{data.conteudo.titulo ?? 'Conteúdo'}</li>
	</ol>
</nav>

{#if form?.saved}<div class="alert alert-success">Conteúdo salvo com sucesso.</div>{/if}

<div class="card card-body">
	<h1 class="h5">{data.conteudo.titulo ?? 'Conteúdo'}</h1>
	<ConteudoForm
		{conteudo}
		clientes={data.clientes}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</div>

<Comentarios entidadeTipo="conteudo" entidadeId={data.conteudo.id} />

<div class="card card-body">
	<h2 class="h6">Aprovação do cliente</h2>
	{#if aprovacao}
		<p class="mb-2">
			Status:
			<span class="badge {aprovStatus[aprovacao.status]?.cls ?? 'text-bg-light'}">
				{aprovStatus[aprovacao.status]?.label ?? aprovacao.status}
			</span>
		</p>
		<div class="input-group">
			<input class="form-control" readonly value={linkAprovacao} />
			<button class="btn btn-light" onclick={copiar}>{copiado ? 'Copiado!' : 'Copiar link'}</button>
		</div>
		<p class="form-text">Envie este link para o cliente aprovar ou pedir alteração (não precisa de login).</p>
		{#if aprovacao.comentario_cliente}
			<div class="alert alert-secondary mt-2"><strong>Comentário do cliente:</strong> {aprovacao.comentario_cliente}</div>
		{/if}
	{:else}
		<p class="mb-3 text-muted">Gere um link público para o cliente aprovar este conteúdo.</p>
		<form method="POST" action="?/enviarAprovacao" use:enhance>
			<button class="btn btn-primary" type="submit">Gerar link de aprovação</button>
		</form>
	{/if}
</div>

<div class="card card-body">
	<h2 class="h6 text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este conteúdo?</p>
			<div class="d-flex gap-2">
				<button class="btn btn-danger" type="submit">Sim, excluir</button>
				<button class="btn btn-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button>
			</div>
		</form>
	{:else}
		<button class="btn btn-outline-danger" onclick={() => (confirmDelete = true)}>Excluir conteúdo</button>
	{/if}
</div>
