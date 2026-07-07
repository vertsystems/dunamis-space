<script lang="ts">
	import { page } from '$app/state';
	import { podeEditar } from '$lib/permissoes';
	import ColaboradorForm from '$lib/components/ColaboradorForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { form } = $props();
	const perms = $derived(page.data.permissoes);
</script>

<Breadcrumb items={[{ label: 'Equipe', href: '/equipe' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-sm font-semibold text-navy mb-4">Novo colaborador</h1>
	{#if podeEditar(perms, 'equipe')}
		<ColaboradorForm colaborador={form?.values ?? null} error={form?.error ?? null} submitLabel="Criar colaborador" />
	{:else}
		<p class="text-sm text-grey">Você não tem permissão para criar colaboradores.</p>
	{/if}
</Card>
