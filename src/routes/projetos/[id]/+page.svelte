<script lang="ts">
	import { enhance } from '$app/forms';
	import ProjetoForm from '$lib/components/ProjetoForm.svelte';
	import Comentarios from '$lib/components/Comentarios.svelte';
	import { Card, Button, Breadcrumb } from '$lib/components/ui';

	let { data, form } = $props();
	let projeto = $derived(form?.values ?? data.projeto);
	let confirmDelete = $state(false);
</script>

<Breadcrumb items={[{ label: 'Projetos', href: '/projetos' }, { label: data.projeto.nome }]} />

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Projeto salvo com sucesso.</div>
{/if}

<Card>
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-lg font-semibold text-navy">{data.projeto.nome}</h1>
		<Button size="sm" variant="secondary" onclick={() => location.assign(`/tarefas?projeto=${data.projeto.id}`)}>Ver tarefas</Button>
	</div>
	<ProjetoForm
		{projeto}
		clientes={data.clientes}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Salvar alterações"
		action="?/update"
	/>
</Card>

<Comentarios entidadeTipo="projeto" entidadeId={data.projeto.id} />

<Card class="mt-6">
	<h2 class="text-base font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">Excluir este projeto? As tarefas vinculadas também serão removidas.</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir projeto</Button>
	{/if}
</Card>
