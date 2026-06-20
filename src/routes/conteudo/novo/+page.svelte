<script lang="ts">
	import ConteudoForm from '$lib/components/ConteudoForm.svelte';
	import { Card, Breadcrumb } from '$lib/components/ui';
	let { data, form } = $props();
</script>

<Breadcrumb items={[{ label: 'Conteúdo', href: '/conteudo' }, { label: 'Novo' }]} />

<Card>
	<h1 class="text-lg font-semibold text-navy mb-4">Novo conteúdo</h1>
	<ConteudoForm
		conteudo={form?.values ?? null}
		clientes={data.clientes}
		projetos={data.projetos}
		colaboradores={data.colaboradores}
		error={form?.error ?? null}
		submitLabel="Criar conteúdo"
	/>
</Card>
