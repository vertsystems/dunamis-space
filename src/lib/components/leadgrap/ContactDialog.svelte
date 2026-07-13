<script lang="ts">
	import { Modal, Button, Select, Input, Textarea } from '$lib/components/ui';
	import { MessageCircle, Mail } from '@lucide/svelte';
	import { leadgrap } from '$lib/leadgrap/store.svelte';
	import { whatsappLink, renderTemplate, type LeadDTO } from '$lib/leadgrap/types';

	let {
		lead,
		onClose,
		onContacted
	}: { lead: LeadDTO; onClose: () => void; onContacted: (lead: LeadDTO) => void } = $props();

	let channel = $state<'whatsapp' | 'email'>(lead.phone ? 'whatsapp' : 'email');
	let templateId = $state('');
	let subject = $state('');
	let message = $state('');

	const channelTemplates = $derived(leadgrap.templates.filter((t) => t.channel === channel));

	// Ao trocar de canal, aplica o 1º modelo do canal (renderizado com os dados do lead).
	let ultimoCanal = '';
	$effect(() => {
		if (channel === ultimoCanal) return;
		ultimoCanal = channel;
		const t = channelTemplates[0];
		if (t) {
			templateId = t.id;
			message = renderTemplate(t.body, lead);
			subject = t.subject ? renderTemplate(t.subject, lead) : '';
		} else {
			templateId = '';
			message = '';
			subject = '';
		}
	});

	function aplicarTemplate(id: string) {
		templateId = id;
		const t = channelTemplates.find((x) => x.id === id);
		if (t) {
			message = renderTemplate(t.body, lead);
			subject = t.subject ? renderTemplate(t.subject, lead) : '';
		}
	}

	const canSend = $derived(
		message.trim().length > 0 && (channel === 'whatsapp' ? !!lead.phone : !!lead.email)
	);

	async function enviar() {
		if (channel === 'whatsapp') {
			if (!lead.phone) return;
			window.open(whatsappLink(lead.phone, message), '_blank', 'noopener');
		} else {
			if (!lead.email) return;
			const params = new URLSearchParams({ subject, body: message });
			window.open(`mailto:${lead.email}?${params.toString()}`, '_blank');
		}
		const updated = await leadgrap.registerContact(lead.id, channel);
		if (updated) onContacted(updated);
		onClose();
	}
</script>

<Modal open title={`Contatar ${lead.name}`} subtitle="Registra a ação no histórico e move o lead para “Contatado”." size="md" onClose={onClose}>
	<div class="space-y-4">
		<!-- Canal -->
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				class="flex items-center justify-center gap-2 rounded-[var(--radius)] border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
				class:border-brand={channel === 'whatsapp'}
				class:bg-brand={channel === 'whatsapp'}
				class:text-white={channel === 'whatsapp'}
				class:border-grey-200={channel !== 'whatsapp'}
				class:text-slate={channel !== 'whatsapp'}
				disabled={!lead.phone}
				onclick={() => (channel = 'whatsapp')}
			>
				<MessageCircle size={16} /> WhatsApp {#if !lead.phone}(sem telefone){/if}
			</button>
			<button
				type="button"
				class="flex items-center justify-center gap-2 rounded-[var(--radius)] border px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
				class:border-brand={channel === 'email'}
				class:bg-brand={channel === 'email'}
				class:text-white={channel === 'email'}
				class:border-grey-200={channel !== 'email'}
				class:text-slate={channel !== 'email'}
				disabled={!lead.email}
				onclick={() => (channel = 'email')}
			>
				<Mail size={16} /> E-mail {#if !lead.email}(sem e-mail){/if}
			</button>
		</div>

		<!-- Modelo -->
		<Select
			label="Modelo"
			value={templateId}
			onchange={(e) => aplicarTemplate((e.currentTarget as HTMLSelectElement).value)}
		>
			{#if channelTemplates.length === 0}
				<option value="">Nenhum modelo — escreva abaixo</option>
			{:else}
				<option value="">Sem modelo</option>
				{#each channelTemplates as t (t.id)}
					<option value={t.id}>{t.name}</option>
				{/each}
			{/if}
		</Select>

		{#if channel === 'email'}
			<Input label="Assunto" bind:value={subject} placeholder="Assunto do e-mail" />
		{/if}

		<Textarea label="Mensagem" bind:value={message} rows={6} placeholder="Escreva a mensagem…" />

		<div class="flex items-center justify-end gap-2 border-t border-grey-200 pt-4">
			<Button variant="ghost" size="sm" onclick={onClose}>Cancelar</Button>
			<Button size="sm" disabled={!canSend} onclick={enviar}>
				{channel === 'whatsapp' ? 'Abrir WhatsApp' : 'Abrir e-mail'}
			</Button>
		</div>
	</div>
</Modal>
