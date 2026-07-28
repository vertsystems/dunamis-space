<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { podeEditar, podeExcluir } from '$lib/permissoes';
	import ColaboradorForm from '$lib/components/ColaboradorForm.svelte';
	import { Card, Button, Breadcrumb } from '$lib/components/ui';

	let { data, form } = $props();
	const perms = $derived(page.data.permissoes);
	let colaborador = $derived(form?.values ?? data.colaborador);
	let confirmDelete = $state(false);
</script>

<Breadcrumb items={[{ label: 'Equipe', href: '/equipe' }, { label: data.colaborador.nome }]} />

{#if form?.saved}
	<div class="mb-4 rounded-[var(--radius)] bg-brand-green/10 px-4 py-3 text-sm text-brand-green">Colaborador salvo com sucesso.</div>
{/if}

<Card>
	<h1 class="text-sm font-semibold text-navy mb-4">{data.colaborador.nome}</h1>
	{#if podeEditar(perms, 'equipe')}
		<ColaboradorForm {colaborador} error={form?.error ?? null} submitLabel="Salvar alterações" action="?/update" />
	{:else}
		<p class="text-sm text-grey">Você não tem permissão para editar colaboradores.</p>
	{/if}
</Card>

{#if podeExcluir(perms, 'equipe')}
<Card class="mt-6">
	<h2 class="text-sm font-semibold text-brand-danger mb-3">Zona de perigo</h2>
	{#if confirmDelete}
		<form method="POST" action="?/delete" use:enhance>
			<p class="mb-3 text-sm text-slate">Excluir este colaborador? Ele será desvinculado dos clientes, projetos e conteúdos.</p>
			<div class="flex gap-2">
				<Button variant="danger" type="submit">Sim, excluir</Button>
				<Button variant="secondary" onclick={() => (confirmDelete = false)}>Cancelar</Button>
			</div>
		</form>
	{:else}
		<Button variant="danger" onclick={() => (confirmDelete = true)}>Excluir colaborador</Button>
	{/if}
</Card>
{/if}
