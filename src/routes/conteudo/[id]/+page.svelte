<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';
	import { aprovacaoStatusTone, aprovacaoStatusLabel } from '$lib/conteudo';
	import { Card, Badge, Button, Input, Breadcrumb } from '$lib/components/ui';

	let { data, form } = $props();
	let conteudo = $derived(form?.values ?? data.conteudo);
	let confirmDelete = $state(false);
	let copiado = $state(false);

	const aprovacao = $derived(data.aprovacao);
	const linkAprovacao = $derived(
		aprovacao ? `${page.url.origin}/aprovar/${aprovacao.token_publico}` : ''
	);

	async function copiar() {
		await navigator.clipboard.writeText(linkAprovacao);
		copiado = true;
		setTimeout(() => (copiado = false), 2000);
	}
</script>

<Breadcrumb items={[{ label: 'Conteúdo', href: '/conteudo' }, { label: data.conteudo.titulo ?? 'Conteúdo' }]} />

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Conteúdo salvo com sucesso.</div>
{/if}

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">{data.conteudo.titulo ?? 'Conteúdo'}</h1>
	<ConteudoForm
		{conteudo}
		clientes={data.clientes}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</Card>

<Comentarios entidadeTipo="conteudo" entidadeId={data.conteudo.id} />

<Card class="mt-6">
	<h2 class="text-base font-semibold text-navy mb-3">Aprovação do cliente</h2>
	{#if aprovacao}
		<p class="mb-2 flex items-center gap-2 text-sm">
			Status:
			<Badge tone={aprovacaoStatusTone(aprovacao.status)}>{aprovacaoStatusLabel(aprovacao.status)}</Badge>
		</p>
		<div class="flex gap-2">
			<Input readonly value={linkAprovacao} wrapperClass="flex-1" />
			<Button variant="secondary" onclick={copiar}>{copiado ? 'Copiado!' : 'Copiar link'}</Button>
		</div>
		<p class="text-xs text-grey mt-1">Envie este link para o cliente aprovar ou pedir alteração (não precisa de login).</p>
		{#if aprovacao.comentario_cliente}
			<div class="mt-2 rounded-[var(--radius)] bg-bg px-4 py-3 text-sm text-slate"><strong>Comentário do cliente:</strong> {aprovacao.comentario_cliente}</div>
		{/if}
	{:else}
		<p class="mb-3 text-slate">Gere um link público para o cliente aprovar este conteúdo.</p>
		<form method="POST" action="?/enviarAprovacao" use:enhance>
			<Button type="submit">Gerar link de aprovação</Button>
		</form>
	{/if}
</Card>

<Card class="mt-6">
	<h2 class="text-base font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">Excluir este conteúdo?</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir conteúdo</Button>
	{/if}
</Card>
