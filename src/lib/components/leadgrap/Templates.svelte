<script lang="ts">
	import { Card, Button, Badge, Modal, Input, Select, Textarea, EmptyState } from '$lib/components/ui';
	import { Plus, Pencil, Trash2 } from '@lucide/svelte';
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import { TEMPLATE_VARIABLES, type MessageTemplateDTO } from '$lib/leadgrap/types';

	let modalAberto = $state(false);
	let editId = $state<string | null>(null);
	let nome = $state('');
	let canal = $state<'whatsapp' | 'email'>('whatsapp');
	let assunto = $state('');
	let corpo = $state('');

	const variaveis = TEMPLATE_VARIABLES.map((v) => `{{${v.key}}}`).join(', ');

	function novo() {
		editId = null;
		nome = '';
		canal = 'whatsapp';
		assunto = '';
		corpo = '';
		modalAberto = true;
	}
	function editar(t: MessageTemplateDTO) {
		editId = t.id;
		nome = t.name;
		canal = t.channel;
		assunto = t.subject ?? '';
		corpo = t.body;
		modalAberto = true;
	}
	async function salvar() {
		if (!nome.trim() || !corpo.trim()) return;
		const input = {
			name: nome.trim(),
			channel: canal,
			subject: canal === 'email' && assunto.trim() ? assunto.trim() : null,
			body: corpo
		};
		if (editId) await leadgrap.editTemplate(editId, input);
		else await leadgrap.addTemplate(input);
		modalAberto = false;
	}
	async function excluir(id: string) {
		if (confirm('Excluir este modelo?')) await leadgrap.removeTemplate(id);
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<p class="text-sm text-grey">Variáveis disponíveis: <span class="text-navy">{variaveis}</span></p>
		<Button size="sm" onclick={novo}><Plus size={15} /> Novo modelo</Button>
	</div>

	{#if leadgrap.templates.length === 0}
		<Card>
			<EmptyState icon="message" title="Nenhum modelo ainda" description="Crie modelos de WhatsApp e e-mail para agilizar o contato." />
		</Card>
	{:else}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			{#each leadgrap.templates as t (t.id)}
				<Card>
					<div class="mb-2 flex items-start justify-between gap-2">
						<div class="min-w-0">
							<div class="flex items-center gap-2">
								<h3 class="truncate text-sm font-semibold text-navy">{t.name}</h3>
								<Badge tone={t.channel === 'whatsapp' ? 'success' : 'info'}>{t.channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'}</Badge>
							</div>
							{#if t.subject}<p class="mt-0.5 text-xs text-grey">Assunto: {t.subject}</p>{/if}
						</div>
						<div class="flex shrink-0 gap-1">
							<button class="grid size-8 place-items-center rounded-md text-slate hover:bg-bg hover:text-navy" title="Editar" onclick={() => editar(t)}><Pencil size={15} /></button>
							<button class="grid size-8 place-items-center rounded-md text-slate hover:bg-brand-danger/10 hover:text-brand-danger" title="Excluir" onclick={() => excluir(t.id)}><Trash2 size={15} /></button>
						</div>
					</div>
					<p class="whitespace-pre-wrap text-sm text-slate">{t.body}</p>
				</Card>
			{/each}
		</div>
	{/if}
</div>

{#if modalAberto}
	<Modal open title={editId ? 'Editar modelo' : 'Novo modelo'} size="md" onClose={() => (modalAberto = false)}>
		<div class="space-y-4">
			<Input label="Nome" bind:value={nome} placeholder="Ex.: Primeiro contato" />
			<Select label="Canal" bind:value={canal}>
				<option value="whatsapp">WhatsApp</option>
				<option value="email">E-mail</option>
			</Select>
			{#if canal === 'email'}
				<Input label="Assunto" bind:value={assunto} placeholder="Assunto do e-mail" />
			{/if}
			<Textarea label="Mensagem" bind:value={corpo} rows={6} placeholder={`Use variáveis: ${variaveis}`} />
			<div class="flex justify-end gap-2 border-t border-grey-200 pt-4">
				<Button variant="ghost" size="sm" onclick={() => (modalAberto = false)}>Cancelar</Button>
				<Button size="sm" disabled={!nome.trim() || !corpo.trim()} onclick={salvar}>Salvar</Button>
			</div>
		</div>
	</Modal>
{/if}
