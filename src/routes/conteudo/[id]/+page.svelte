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
		pendente: { label: 'Aguardando cliente', cls: 'is-warning' },
		aprovado: { label: 'Aprovado', cls: 'is-success' },
		alteracao_solicitada: { label: 'Alteração solicitada', cls: 'is-danger' }
	};

	async function copiar() {
		await navigator.clipboard.writeText(linkAprovacao);
		copiado = true;
		setTimeout(() => (copiado = false), 2000);
	}
</script>

<nav class="breadcrumb mb-4" aria-label="breadcrumbs">
	<ul>
		<li><a href="/conteudo">Conteúdo</a></li>
		<li class="is-active"><a href="#" aria-current="page">{data.conteudo.titulo ?? 'Conteúdo'}</a></li>
	</ul>
</nav>

{#if form?.saved}<div class="notification is-success is-light">Conteúdo salvo com sucesso.</div>{/if}

<div class="box">
	<h1 class="title is-5">{data.conteudo.titulo ?? 'Conteúdo'}</h1>
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

<div class="box">
	<h2 class="title is-6">Aprovação do cliente</h2>
	{#if aprovacao}
		<p class="mb-2">
			Status:
			<span class="tag {aprovStatus[aprovacao.status]?.cls ?? 'is-light'}">
				{aprovStatus[aprovacao.status]?.label ?? aprovacao.status}
			</span>
		</p>
		<div class="field has-addons">
			<div class="control is-expanded"><input class="input" readonly value={linkAprovacao} /></div>
			<div class="control"><button class="button is-light" onclick={copiar}>{copiado ? 'Copiado!' : 'Copiar link'}</button></div>
		</div>
		<p class="help">Envie este link para o cliente aprovar ou pedir alteração (não precisa de login).</p>
		{#if aprovacao.comentario_cliente}
			<div class="notification is-light mt-2"><strong>Comentário do cliente:</strong> {aprovacao.comentario_cliente}</div>
		{/if}
	{:else}
		<p class="mb-3 has-text-grey">Gere um link público para o cliente aprovar este conteúdo.</p>
		<form method="POST" action="?/enviarAprovacao" use:enhance>
			<button class="button is-primary" type="submit">Gerar link de aprovação</button>
		</form>
	{/if}
</div>

<div class="box">
	<h2 class="title is-6 has-text-danger">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3">Excluir este conteúdo?</p>
			<div class="field is-grouped">
				<div class="control"><button class="button is-danger" type="submit">Sim, excluir</button></div>
				<div class="control"><button class="button is-light" type="button" onclick={() => (confirmDelete = false)}>Cancelar</button></div>
			</div>
		</form>
	{:else}
		<button class="button is-danger is-outlined" onclick={() => (confirmDelete = true)}>Excluir conteúdo</button>
	{/if}
</div>
